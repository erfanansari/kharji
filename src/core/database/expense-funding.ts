/**
 * Paying an expense out of an account.
 *
 * Funding is a side-effect of saving an expense, never something the user
 * manages on its own — the same shape as `expense-repeat.ts`. What it exposes
 * is a *planner* plus *statement builders* rather than self-transacting
 * functions, because the callers need to commit the expense write and the
 * balance write in one `db.batch(..., 'write')`. An expense that disagrees with
 * the balance it moved is the one failure mode worth designing the API around.
 *
 * ── Where the balance arithmetic lives ────────────────────────────────────
 * The statements that actually move `assets.amount` and snapshot it are in
 * `account-balance.ts`, because debt settlement moves balances too and both
 * must obey the same invariant (relative UPDATE + INSERT…SELECT back out of
 * the row just written — see that file's header, and migration 020). This file
 * keeps the expense-shaped API over them: the wrappers below bind
 * `source: 'expense'` so every caller here labels its valuation rows correctly
 * without having to remember to.
 */
import type { InStatement, InValue } from '@libsql/client';

import { currencyDecimals, fundingDelta, wouldOverdraw } from '@core/accounts/balance';
import type { FundingState, MoneyRecord } from '@core/accounts/balance';
import { getEntryRate } from '@core/rates';

import type { ExpensePaidFrom } from '@/@types/expense';
import { isSpendableAssetCategory } from '@/constants/assets';

import {
  buildBalanceStatements,
  buildResyncStatements as buildResyncStatementsFor,
  buildReversalStatements as buildReversalStatementsFor,
} from './account-balance';
import type { BalanceStatementOp } from './account-balance';
import { db } from './client';
import { buildDebtAccountCleanupStatements } from './debt-settlement';

export type { FundingState } from '@core/accounts/balance';
/** @deprecated Prefer `BalanceStatementOp` from `account-balance.ts`. */
export type FundingStatementOp = BalanceStatementOp;

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export interface FundingPlanOk {
  ok: true;
  assetId: number;
  name: string;
  /** The account's currency at plan time — persisted alongside the delta. */
  currency: string;
  decimals: number;
  /** Today's pivot-per-unit for `currency`; also written to assets.entryRate. */
  rate: number;
  /** Positive, expressed in `currency`. */
  delta: number;
  balanceBefore: number;
  balanceAfter: number;
  overdraws: boolean;
}

export type FundingPlanErrorReason = 'not-found' | 'not-spendable' | 'no-rate';
export interface FundingPlanError {
  ok: false;
  reason: FundingPlanErrorReason;
}

export type FundingPlan = FundingPlanOk | FundingPlanError;

/**
 * How each planning failure surfaces on the interactive routes.
 *
 * Deliberately never "save it silently unfunded": the user picked an account
 * and would otherwise believe their balance moved. The materializer takes the
 * opposite trade — see its call site — because losing an occurrence is worse
 * than posting one whose balance needs a manual nudge.
 */
export const FUNDING_ERROR_STATUS: Record<FundingPlanErrorReason, number> = {
  'not-found': 404,
  'not-spendable': 400,
  'no-rate': 422,
};

export const FUNDING_ERROR_MESSAGE: Record<FundingPlanErrorReason, string> = {
  'not-found': 'Account not found',
  'not-spendable': 'Only cash and bank assets can pay for an expense',
  'no-rate': 'No exchange rate available for that account',
};

/**
 * Resolve an account and work out what paying `expense` out of it would cost.
 * Reads only — nothing is written until the caller commits the statements.
 */
export async function planFunding(args: {
  userId: number;
  assetId: number;
  expense: MoneyRecord;
}): Promise<FundingPlan> {
  const { userId, assetId, expense } = args;

  const result = await db.execute({
    sql: 'SELECT id, name, category, amount, currency FROM assets WHERE id = ? AND userId = ?',
    args: [assetId, userId],
  });
  const asset = result.rows[0];
  if (!asset) return { ok: false, reason: 'not-found' };

  // You hand over cash and you move money out of a bank; you do not pay rent
  // "from" your apartment. See SPENDABLE_ASSET_CATEGORIES.
  if (!isSpendableAssetCategory(asset.category as string)) return { ok: false, reason: 'not-spendable' };

  const currency = asset.currency as string;
  const rate = await getEntryRate(currency);
  if (rate === null) return { ok: false, reason: 'no-rate' };

  const delta = fundingDelta(expense, currency, rate);
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
    overdraws: wouldOverdraw(balanceBefore, delta),
  };
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

/**
 * The statements that move balances and snapshot them, labelled `'expense'`.
 *
 * Callers MUST run these inside one `db.batch(..., 'write')` together with the
 * expense-row write they belong to. See `account-balance.ts` for the invariant
 * these statements exist to uphold.
 */
export function buildFundingStatements(userId: number, ops: BalanceStatementOp[], valuedAt: string): InStatement[] {
  return buildBalanceStatements(userId, ops, valuedAt, 'expense');
}

/**
 * Record on the expense what was actually deducted.
 *
 * `paidFromDelta IS NULL` makes this write once-only, and the EXISTS guard
 * refuses to claim a deduction against an account that vanished mid-flight —
 * together they keep "chosen but not applied" the only reachable partial state.
 */
export function buildFundingStampStatement(userId: number, expenseId: number, plan: FundingPlanOk): InStatement {
  return {
    sql: `UPDATE expenses
             SET paidFromDelta = ?, paidFromCurrency = ?
           WHERE id = ? AND user_id = ? AND paidFromDelta IS NULL
             AND EXISTS (SELECT 1 FROM assets WHERE id = ? AND userId = ?)`,
    args: [plan.delta, plan.currency, expenseId, userId, plan.assetId, userId],
  };
}

/** The funding recorded on an expense row, or null if there is none to reverse.
 *  All three columns must be present — a row mid-way through the two-phase
 *  write has nothing to reverse, because nothing was applied. */
export function readFunding(row: Record<string, unknown>): FundingState | null {
  const assetId = row.paidFromAssetId as number | null;
  const delta = row.paidFromDelta as number | null;
  const currency = row.paidFromCurrency as string | null;
  if (assetId === null || assetId === undefined) return null;
  if (delta === null || delta === undefined) return null;
  if (currency === null || currency === undefined) return null;
  return { assetId, delta, currency };
}

/**
 * Statements that give a recorded deduction back. See `account-balance.ts`;
 * this binds `source: 'expense'` and keeps the original positional signature.
 */
export async function buildReversalStatements(
  userId: number,
  funding: FundingState | null,
  valuedAt: string
): Promise<InStatement[]> {
  return buildReversalStatementsFor({ userId, funding, valuedAt, source: 'expense' });
}

/**
 * Statements taking an expense's funding from `before` to `after`.
 *
 * Takes a `FundingPlanOk` rather than a bare `FundingState` because that is
 * what the expense routes have in hand straight out of `planFunding`.
 */
export async function buildResyncStatements(args: {
  userId: number;
  before: FundingState | null;
  after: FundingPlanOk | null;
  valuedAt: string;
}): Promise<InStatement[]> {
  const { userId, before, after, valuedAt } = args;

  const afterState: FundingState | null = after
    ? { assetId: after.assetId, delta: after.delta, currency: after.currency }
    : null;

  return buildResyncStatementsFor({ userId, before, after: afterState, valuedAt, source: 'expense' });
}

/**
 * Plan and commit funding for an expense row that already exists.
 *
 * Used by POST and by the recurring materializer. Deliberately a *separate*
 * batch from the expense INSERT — see the comment at the materializer call site
 * for why folding them together would double-deduct.
 */
export async function applyFundingToExpense(args: {
  userId: number;
  expenseId: number;
  assetId: number;
  expense: MoneyRecord;
}): Promise<FundingPlan> {
  const plan = await planFunding(args);
  if (!plan.ok) return plan;

  const valuedAt = new Date().toISOString();
  await db.batch(
    [
      ...buildFundingStatements(
        args.userId,
        [{ assetId: plan.assetId, delta: plan.delta, decimals: plan.decimals, entryRate: plan.rate }],
        valuedAt
      ),
      buildFundingStampStatement(args.userId, args.expenseId, plan),
    ],
    'write'
  );

  return plan;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Map of expenseId -> the account it was paid from, for joining into lists. */
export async function fetchPaidFromForExpenses(expenseIds: InValue[]): Promise<Record<number, ExpensePaidFrom>> {
  const map: Record<number, ExpensePaidFrom> = {};
  if (expenseIds.length === 0) return map;

  const placeholders = expenseIds.map(() => '?').join(',');
  const result = await db.execute({
    sql: `SELECT e.id AS expenseId, a.id AS assetId, a.name, a.category, a.currency
            FROM expenses e
            JOIN assets a ON e.paidFromAssetId = a.id
           WHERE e.id IN (${placeholders})`,
    args: expenseIds,
  });

  for (const row of result.rows) {
    map[row.expenseId as number] = {
      id: row.assetId as number,
      name: row.name as string,
      category: row.category as string,
      currency: row.currency as string,
    };
  }
  return map;
}

/** Clear every reference to an account that is about to be deleted.
 *
 *  Not a convenience: `PRAGMA foreign_keys` defaults OFF in SQLite and nothing
 *  turns it on, so the `ON DELETE SET NULL` in migrations 021 and 022 may never
 *  fire. Balances are deliberately NOT restored — that money genuinely moved.
 *
 *  Debt settlements are cleaned up here too, rather than from a second call in
 *  `DELETE /api/assets/[id]`, so that route stays the single place accounts are
 *  torn down and no future entity can be forgotten by only half of it. */
export function buildAccountCleanupStatements(userId: number, assetId: number): InStatement[] {
  return [
    {
      sql: `UPDATE expenses SET paidFromAssetId = NULL, paidFromDelta = NULL, paidFromCurrency = NULL
             WHERE paidFromAssetId = ? AND user_id = ?`,
      args: [assetId, userId],
    },
    {
      sql: 'UPDATE recurringExpenses SET paidFromAssetId = NULL WHERE paidFromAssetId = ? AND userId = ?',
      args: [assetId, userId],
    },
    ...buildDebtAccountCleanupStatements(userId, assetId),
  ];
}
