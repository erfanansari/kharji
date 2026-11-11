import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { backupConfig } from '@configs/backup.config';
import { gzipSync } from 'zlib';

import { pruneOldBackups, uploadBackup } from '@core/database/backup-storage';
import { db } from '@core/database/client';
import { generateSqlDump } from '@core/database/dump';
import { materializeDueExpenses } from '@core/recurring/materialize';
import { getReportData, previousMonthOf } from '@core/reports/aggregate';
import type { ReportType } from '@core/reports/aggregate';
import { dispatchReport } from '@core/reports/dispatch';

interface EligibleUser {
  userId: number;
  email: string;
  name: string | null;
  unsubscribeToken: string;
}

interface DispatchSummary {
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
  reportType?: ReportType;
  periodKey?: string;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function decideDispatch(now: Date): { reportType: ReportType; year: number; month?: number } | null {
  const day = now.getUTCDate();
  const month = now.getUTCMonth(); // 0..11
  if (day !== 1) return null;

  if (month === 0) {
    // Jan 1 → yearly for the year that just ended. Suppresses the December monthly.
    return { reportType: 'yearly', year: now.getUTCFullYear() - 1 };
  }
  // Otherwise the 1st of some month → monthly for the just-completed month.
  const prev = previousMonthOf(now);
  return { reportType: 'monthly', year: prev.year, month: prev.month };
}

async function loadEligibleUsers(reportType: ReportType): Promise<EligibleUser[]> {
  const reportColumn = reportType === 'monthly' ? 'monthlyReportEnabled' : 'yearlyReportEnabled';
  const rows = await db.execute({
    sql: `SELECT u.id AS userId, u.email, u.name, p.unsubscribeToken
          FROM users u
          JOIN userNotificationPreferences p ON p.userId = u.id
          WHERE p.emailEnabled = 1 AND p.${reportColumn} = 1`,
  });
  return rows.rows.map((r) => ({
    userId: r.userId as number,
    email: r.email as string,
    name: (r.name as string | null) ?? null,
    unsubscribeToken: r.unsubscribeToken as string,
  }));
}

async function alreadySent(userId: number, reportType: ReportType, periodKey: string): Promise<boolean> {
  const result = await db.execute({
    sql: `SELECT 1 FROM sentEmailReports
          WHERE userId = ? AND reportType = ? AND periodKey = ? AND status = 'sent'`,
    args: [userId, reportType, periodKey],
  });
  return result.rows.length > 0;
}

async function processUser(
  user: EligibleUser,
  reportType: ReportType,
  year: number,
  month: number | undefined,
  periodKey: string
): Promise<'sent' | 'skipped' | 'failed'> {
  if (await alreadySent(user.userId, reportType, periodKey)) return 'skipped';

  const data = await getReportData(user.userId, { type: reportType, year, month });

  // Don't email an empty report — no income, no expenses for the period.
  if (data.totals.income.value === 0 && data.totals.expenses.value === 0) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO sentEmailReports (userId, reportType, periodKey, status, errorMsg)
            VALUES (?, ?, ?, 'skipped', 'empty-period')`,
      args: [user.userId, reportType, periodKey],
    });
    return 'skipped';
  }

  try {
    const { resendId } = await dispatchReport({
      userId: user.userId,
      userEmail: user.email,
      userName: user.name,
      unsubscribeToken: user.unsubscribeToken,
      data,
    });
    await db.execute({
      sql: `INSERT OR IGNORE INTO sentEmailReports (userId, reportType, periodKey, resendId, status)
            VALUES (?, ?, ?, ?, 'sent')`,
      args: [user.userId, reportType, periodKey, resendId],
    });
    return 'sent';
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : String(error);
    await db.execute({
      sql: `INSERT OR IGNORE INTO sentEmailReports (userId, reportType, periodKey, status, errorMsg)
            VALUES (?, ?, ?, 'failed', ?)`,
      args: [user.userId, reportType, periodKey, message],
    });
    console.error(`[cron/reports] user ${user.userId} ${reportType} ${periodKey} failed:`, message);
    return 'failed';
  }
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Allow a ?fakeDate=YYYY-MM-DD override outside production for local testing.
  let now = new Date();
  const fakeDate = new URL(request.url).searchParams.get('fakeDate');
  if (fakeDate && process.env.NODE_ENV !== 'production') {
    const parsed = new Date(`${fakeDate}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) now = parsed;
  }

  // ── 1. Backup (runs every day) ────────────────────────────────────────────
  let backupResult: Record<string, unknown>;
  try {
    const dump = await generateSqlDump(db);
    const gzipped = gzipSync(Buffer.from(dump, 'utf-8'));
    const key = `kharji-${now.toISOString().slice(0, 10)}.sql.gz`;
    await uploadBackup(key, gzipped);
    const deleted = await pruneOldBackups(backupConfig.retentionDays);
    backupResult = { ok: true, uploaded: key, bytes: gzipped.length, deleted };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[cron/backup] failed:', message);
    backupResult = { ok: false, error: message };
  }

  // ── 2. Recurring expenses (runs every day) ────────────────────────────────
  // Posts every occurrence owed as of today, for every user. Cheap when nothing
  // is due. Failing here must not cost us the email reports below.
  let recurringResult: Record<string, unknown>;
  try {
    recurringResult = { ok: true, ...(await materializeDueExpenses()) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[cron/recurring] failed:', message);
    recurringResult = { ok: false, error: message };
  }

  // ── 3. Email reports (runs only on the 1st of each month) ─────────────────
  const dispatch = decideDispatch(now);
  if (!dispatch) {
    return NextResponse.json({
      backup: backupResult,
      recurring: recurringResult,
      reports: { skipped: true },
    });
  }

  const { reportType, year, month } = dispatch;
  const periodKey = reportType === 'monthly' && month != null ? `${year}-${pad2(month)}` : String(year);

  const users = await loadEligibleUsers(reportType);
  const summary: DispatchSummary = {
    attempted: users.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    reportType,
    periodKey,
  };

  for (const user of users) {
    try {
      const outcome = await processUser(user, reportType, year, month, periodKey);
      summary[outcome] += 1;
    } catch (error) {
      // Defensive: per-user crash shouldn't abort the batch.
      summary.failed += 1;
      console.error(`[cron/reports] user ${user.userId} crashed:`, error);
    }
  }

  return NextResponse.json({ backup: backupResult, recurring: recurringResult, reports: summary });
}

// Vercel Cron Jobs send GET requests — alias POST so both work
export const GET = POST;
