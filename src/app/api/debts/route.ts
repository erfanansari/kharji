import { getTranslations } from 'next-intl/server';
import { NextResponse } from 'next/server';

import { createDebtSchema } from '@schemas';

import { getSearchParams, validateBody, withAuth } from '@core/api/utils';
import { db } from '@core/database/client';
import { fetchSettledFromForDebts } from '@core/database/debt-settlement';
import { mapRowToDebt } from '@core/database/mappers';
import { getEntryRateOn } from '@core/rates';

import { isDebtDirection } from '@/constants/debts';

/**
 * Outstanding first, then soonest due, undated last, newest incurred first.
 *
 * `dueDate IS NULL` sorts 0 before 1 in SQLite, which puts dated rows ahead of
 * undated ones — the opposite of what a bare `dueDate ASC` would do, since
 * NULLs sort first there.
 */
const DEBT_ORDER = 'ORDER BY settledAt IS NULL DESC, dueDate IS NULL, dueDate ASC, incurredAt DESC, id DESC';

export const GET = withAuth(async (user, request) => {
  const params = getSearchParams(request);
  const directionFilter = params.get('direction');
  const settledFilter = params.get('settled');

  let sql = 'SELECT * FROM debts WHERE userId = ?';
  const args: (string | number)[] = [user.userId];

  if (directionFilter && isDebtDirection(directionFilter)) {
    sql += ' AND direction = ?';
    args.push(directionFilter);
  }
  if (settledFilter === 'true') sql += ' AND settledAt IS NOT NULL';
  if (settledFilter === 'false') sql += ' AND settledAt IS NULL';

  sql += ` ${DEBT_ORDER}`;

  const result = await db.execute({ sql, args });
  const settledFrom = await fetchSettledFromForDebts(result.rows.map((r) => r.id as number));

  return NextResponse.json(result.rows.map((row) => mapRowToDebt(row, settledFrom[row.id as number])));
}, 'Debts');

export const POST = withAuth(async (user, request) => {
  const raw = await request.json();
  const t = await getTranslations();
  const result = validateBody(createDebtSchema(t), raw);
  if (result instanceof NextResponse) return result;

  const body = result.data;

  // getEntryRateOn, NOT getEntryRate: a debt is dated by the user and is
  // usually already in the past — the bill you are recording is one you
  // already received. Freezing today's rate onto a two-week-old debt would
  // make it convert differently from every other record of that date.
  //
  // The SETTLEMENT leg deliberately uses today's rate instead; see the
  // rate-policy note in src/core/database/account-balance.ts. Two events, two
  // dates, two rates.
  const entryRate = await getEntryRateOn(body.currency, body.incurredAt);
  if (entryRate === null) {
    return NextResponse.json({ error: `No exchange rate available for ${body.currency}` }, { status: 422 });
  }

  const inserted = await db.execute({
    sql: `INSERT INTO debts (userId, direction, counterparty, amount, currency, entryRate, incurredAt, dueDate, note)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    args: [
      user.userId,
      body.direction,
      body.counterparty,
      body.amount,
      body.currency,
      entryRate,
      body.incurredAt,
      body.dueDate ?? null,
      body.note ?? null,
    ],
  });

  return NextResponse.json(
    { message: 'Debt created successfully', id: inserted.rows[0].id as number },
    { status: 201 }
  );
}, 'Debts');
