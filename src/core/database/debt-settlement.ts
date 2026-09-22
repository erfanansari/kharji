/**
 * Settling a debt through an account.
 *
 * The same shape as `expense-funding.ts` — a *planner* plus *statement
 * builders*, never self-transacting — because the caller has to commit the
 * debt-row write and the balance write in one `db.batch(..., 'write')`. A debt
 * that disagrees with the balance it moved is the failure mode this API exists
 * to make unrepresentable.
 *
 * The balance statements themselves live in `account-balance.ts` and are
 * shared with the expense path; everything here is the debt-shaped API over
 * them, binding `source: 'debt'` so the valuation history stays readable.
 *
 * ── Two different rates, deliberately ─────────────────────────────────────
 * A debt's own `entryRate` is frozen at `incurredAt` (the bill you are
 * recording is one you already received). The SETTLEMENT leg uses today's
 * rate, like every other account movement — see the rate-policy block in
 * `account-balance.ts`. Two events, two dates, two rates; that is correct and
 * not an oversight.
 */
import type { InStatement, InValue } from '@libsql/client';

import { currencyDecimals } from '@core/accounts/balance';
import type { FundingState, MoneyRecord } from '@core/accounts/balance';
import { debtSettlementDelta, settlementWouldOverdraw } from '@core/debts/balance';
import { getEntryRate } from '@core/rates';

import type { DebtDirection, DebtSettledFrom } from '@/@types/debt';
import { isSpendableAssetCategory } from '@/constants/assets';

import { db } from './client';

export interface SettlementPlanOk {
  ok: true;
  assetId: number;
  name: string;
  /** The account's currency at plan time — persisted alongside the delta. */
  currency: string;
  decimals: number;
  /** Today's pivot-per-unit for `currency`; also written to assets.entryRate. */
  rate: number;
  /** SIGNED, in `currency`. Positive = money leaves the account. */
  delta: number;
  balanceBefore: number;
  balanceAfter: number;
  overdraws: boolean;
}

export type SettlementPlanErrorReason = 'not-found' | 'not-spendable' | 'no-rate';
export interface SettlementPlanError {
  ok: false;
  reason: SettlementPlanErrorReason;
}

export type SettlementPlan = SettlementPlanOk | SettlementPlanError;

/**
 * How each planning failure surfaces on the route.
 *
 * The three failure modes are identical to the expense path's, but the
 * messages are NOT shared: "…can pay for an expense" would be a lie here, and
 * a user-visible string that describes the wrong feature is worse than a
 * duplicated object literal.
 */
export const SETTLEMENT_ERROR_STATUS: Record<SettlementPlanErrorReason, number> = {
  'not-found': 404,
  'not-spendable': 400,
  'no-rate': 422,
};

export const SETTLEMENT_ERROR_MESSAGE: Record<SettlementPlanErrorReason, string> = {
  'not-found': 'Account not found',
  'not-spendable': 'Only cash and bank accounts can settle a debt',
  'no-rate': 'No exchange rate available for that account',
};

/**
 * Resolve an account and work out what settling this debt through it would
 * move. Reads only — nothing is written until the caller commits.
 */
export async function planSettlement(args: {
  userId: number;
  assetId: number;
  direction: DebtDirection;
  debt: MoneyRecord;
}): Promise<SettlementPlan> {
  const { userId, assetId, direction, debt } = args;

  const result = await db.execute({
    sql: 'SELECT id, name, category, amount, currency FROM assets WHERE id = ? AND userId = ?',
    args: [assetId, userId],
  });
  const asset = result.rows[0];
  if (!asset) return { ok: false, reason: 'not-found' };

  // Money is handed over in cash or moved through a bank; you do not repay a
  // loan "from" your apartment. See SPENDABLE_ASSET_CATEGORIES.
  if (!isSpendableAssetCategory(asset.category as string)) return { ok: false, reason: 'not-spendable' };

  const currency = asset.currency as string;
  const rate = await getEntryRate(currency);
  if (rate === null) return { ok: false, reason: 'no-rate' };

  const delta = debtSettlementDelta(direction, debt, currency, rate);
  if (delta === null) return { ok: false, reason: 'no-rate' };

  const balanceBefore = asset.amount as number;

  return {
    ok: true,
    assetId,
    name: asset.name as string,
    currency,
    decimals: currencyDecimals(currency),
    rate,
    delta,
    balanceBefore,
    balanceAfter: balanceBefore - delta,
    overdraws: settlementWouldOverdraw(balanceBefore, delta),
  };
}

/**
 * Mark the debt settled, recording what was actually moved.
 *
 * `settledAt IS NULL` does double duty: it is the once-only guard the funding
 * path uses, and it is the double-settle lock — settling twice would move the
 * balance twice, and this makes the second attempt a no-op even under a race.
 * The route additionally returns 409 so a double-click is legible rather than
 * silently swallowed.
 *
 * `plan` is null for a bookkeeping-only settlement, which is the default and
 * the common case: the three settlement columns stay NULL and no balance moves.
 * The EXISTS guard refuses to claim a movement against an account that
 * vanished between planning and committing.
 */
export function buildSettleStatement(
  userId: number,
  debtId: number,
  settledAt: string,
  plan: SettlementPlanOk | null
): InStatement {
  if (!plan) {
    return {
      sql: `UPDATE debts SET settledAt = ?, updatedAt = CURRENT_TIMESTAMP
             WHERE id = ? AND userId = ? AND settledAt IS NULL`,
      args: [settledAt, debtId, userId],
    };
  }

  return {
    sql: `UPDATE debts
             SET settledAt = ?, settledAssetId = ?, settledDelta = ?, settledCurrency = ?,
                 updatedAt = CURRENT_TIMESTAMP
           WHERE id = ? AND userId = ? AND settledAt IS NULL
             AND EXISTS (SELECT 1 FROM assets WHERE id = ? AND userId = ?)`,
    args: [settledAt, plan.assetId, plan.delta, plan.currency, debtId, userId, plan.assetId, userId],
  };
}

/** Clear the settlement. Symmetric guard: only a settled debt can un-settle. */
export function buildUnsettleStatement(userId: number, debtId: number): InStatement {
  return {
    sql: `UPDATE debts
             SET settledAt = NULL, settledAssetId = NULL, settledDelta = NULL, settledCurrency = NULL,
                 updatedAt = CURRENT_TIMESTAMP
           WHERE id = ? AND userId = ? AND settledAt IS NOT NULL`,
    args: [debtId, userId],
  };
}

/**
 * The settlement recorded on a debt row, or null if there is nothing to
 * reverse. All three columns must be present — identical semantics to
 * `readFunding`, since a bookkeeping-only settlement moved no balance and so
 * has nothing to give back.
 */
export function readSettlement(row: Record<string, unknown>): FundingState | null {
  const assetId = row.settledAssetId as number | null;
  const delta = row.settledDelta as number | null;
  const currency = row.settledCurrency as string | null;
  if (assetId === null || assetId === undefined) return null;
  if (delta === null || delta === undefined) return null;
  if (currency === null || currency === undefined) return null;
  return { assetId, delta, currency };
}

/** Map of debtId -> the account it settled through, for joining into lists. */
export async function fetchSettledFromForDebts(debtIds: InValue[]): Promise<Record<number, DebtSettledFrom>> {
  const map: Record<number, DebtSettledFrom> = {};
  if (debtIds.length === 0) return map;

  const placeholders = debtIds.map(() => '?').join(',');
  const result = await db.execute({
    sql: `SELECT d.id AS debtId, a.id AS assetId, a.name, a.category, a.currency
            FROM debts d
            JOIN assets a ON d.settledAssetId = a.id
           WHERE d.id IN (${placeholders})`,
    args: debtIds,
  });

  for (const row of result.rows) {
    map[row.debtId as number] = {
      id: row.assetId as number,
      name: row.name as string,
      category: row.category as string,
      currency: row.currency as string,
    };
  }
  return map;
}

/** Clear every debt reference to an account about to be deleted.
 *
 *  Spread into `buildAccountCleanupStatements` rather than called separately,
 *  so `DELETE /api/assets/[id]` stays the single place an account is torn
 *  down. `PRAGMA foreign_keys` defaults OFF and nothing turns it on, so the
 *  `ON DELETE SET NULL` in migration 022 may never fire — this is the real
 *  mechanism. Balances are deliberately NOT restored: that money genuinely
 *  moved, and the debt genuinely was settled. */
export function buildDebtAccountCleanupStatements(userId: number, assetId: number): InStatement[] {
  return [
    {
      sql: `UPDATE debts SET settledAssetId = NULL, settledDelta = NULL, settledCurrency = NULL
             WHERE settledAssetId = ? AND userId = ?`,
      args: [assetId, userId],
    },
  ];
}
