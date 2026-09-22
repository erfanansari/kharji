/**
 * Moving a spendable account's balance, and snapshotting it.
 *
 * This file is named after the invariant rather than after any one caller,
 * because two different features now move balances — an expense paid out of an
 * account (`expense-funding.ts`) and a debt settled through one
 * (`debt-settlement.ts`) — and both must move them the same way. What it
 * exposes is *statement builders* rather than self-transacting functions,
 * because callers need to commit the record write and the balance write in one
 * `db.batch(..., 'write')`. A record that disagrees with the balance it moved
 * is the one failure mode worth designing the API around.
 *
 * ── The invariant this file must never break ───────────────────────────────
 * `assets.amount` is the denormalized current balance. Migration 020 exists
 * because it once drifted from the valuation history, so every write here:
 *
 *   1. moves `assets.amount` **relatively** (`amount = ROUND(amount - ?, ?)`),
 *      never read-modify-write, so two movements landing on one account in the
 *      same materializer run compose instead of losing an update; and
 *   2. appends an `assetValuations` row **selected back out of the row it just
 *      wrote**, so `assets.amount == newest valuation.amount` and
 *      `assets.lastValuedAt == newest valuation.valuedAt` hold by construction
 *      rather than by two code paths agreeing.
 *
 * ── Sign convention ───────────────────────────────────────────────────────
 * The SQL always SUBTRACTS the delta, so the sign *is* the direction:
 *
 *     positive delta  →  money leaves the account (an expense, a debt paid)
 *     negative delta  →  money arrives           (a reversal, a debt collected)
 *
 * Nothing here clamps or takes an absolute value, which is what lets the
 * reversal and resync machinery serve both directions with no extra SQL.
 *
 * ── Rate policy ───────────────────────────────────────────────────────────
 * The account leg always uses **today's** rate (`getEntryRate`), on every path
 * including the materializer's backdated catch-ups. Pinning it to the record's
 * date would make the delta's pivot value line up exactly with the record's —
 * prettier — but the same write re-snapshots `assets.entryRate`, and that rate
 * has to agree with `assets.lastValuedAt`, which is *now*. A past-dated rate
 * beside a present-dated `lastValuedAt` is precisely the drift 020 repaired.
 */
import type { InStatement } from '@libsql/client';

import { currencyDecimals, resyncOps } from '@core/accounts/balance';
import type { FundingState } from '@core/accounts/balance';
import { getEntryRate } from '@core/rates';

import { db } from './client';

/**
 * What caused a valuation snapshot, written to `assetValuations.source`.
 *
 * Migration 021 added the column precisely so a cash account's history could
 * be read as a transaction ledger; leaving a new mover unlabelled would make
 * history that cannot be reconstructed later. See 022_debts.sql.
 */
export type BalanceSource = 'expense' | 'debt';

/** One balance movement. Positive delta = money leaves the account. */
export interface BalanceStatementOp {
  assetId: number;
  delta: number;
  decimals: number;
  /** Written to `assets.entryRate` so it stays consistent with lastValuedAt. */
  entryRate: number;
}

/**
 * The statements that move balances and snapshot them.
 *
 * Callers MUST run these inside one `db.batch(..., 'write')` together with the
 * record write they belong to. `valuedAt` is a single timestamp bound to every
 * op, so an account switch produces two snapshots sharing one moment.
 *
 * Both statements are scoped `WHERE id = ? AND userId = ?`. If the asset was
 * deleted between planning and committing, the UPDATE matches nothing and the
 * INSERT…SELECT selects nothing — under-applied, never phantom.
 */
export function buildBalanceStatements(
  userId: number,
  ops: BalanceStatementOp[],
  valuedAt: string,
  source: BalanceSource
): InStatement[] {
  const statements: InStatement[] = [];

  for (const op of ops) {
    statements.push({
      // SQLite evaluates every SET right-hand side against the pre-update row,
      // so `amount - ?` inside the CASE still refers to the old balance.
      //
      // unitValue is recomputed only for unlinked assets that actually carry
      // one: a linked asset's unitValue is owned by the price feed (see
      // /api/assets/revalue), and an account with a null unitValue should keep
      // it null rather than acquire a meaningless price-per-unit.
      sql: `UPDATE assets
               SET amount       = ROUND(amount - ?, ?),
                   unitValue    = CASE
                                    WHEN linkedItem IS NULL AND unitValue IS NOT NULL AND quantity > 0
                                    THEN ROUND((amount - ?) / quantity, ?)
                                    ELSE unitValue
                                  END,
                   entryRate    = ?,
                   lastValuedAt = ?,
                   updatedAt    = CURRENT_TIMESTAMP
             WHERE id = ? AND userId = ?`,
      args: [op.delta, op.decimals, op.delta, op.decimals, op.entryRate, valuedAt, op.assetId, userId],
    });

    statements.push({
      // Selected back out of the row the previous statement just wrote, in the
      // same transaction — that is what makes the snapshot unable to disagree
      // with the balance. Do not "simplify" this to VALUES with JS-computed
      // numbers; that is exactly the shape migration 020 had to repair.
      sql: `INSERT INTO assetValuations (assetId, quantity, unitValue, amount, currency, entryRate, valuedAt, source)
            SELECT id, quantity, unitValue, amount, currency, entryRate, lastValuedAt, ?
              FROM assets WHERE id = ? AND userId = ?`,
      args: [source, op.assetId, userId],
    });
  }

  return statements;
}

interface AccountRow {
  currency: string;
  entryRate: number;
}

async function loadAccount(userId: number, assetId: number): Promise<AccountRow | null> {
  const res = await db.execute({
    sql: 'SELECT currency, entryRate FROM assets WHERE id = ? AND userId = ?',
    args: [assetId, userId],
  });
  const row = res.rows[0];
  return row ? { currency: row.currency as string, entryRate: row.entryRate as number } : null;
}

/**
 * Turn signed balance ops into statements, resolving each account's currency
 * and today's rate.
 *
 * A missing rate must never block a *credit* — refusing to give money back
 * because an API is down would be strictly worse than a slightly stale rate. So
 * the account's own stored `entryRate` is the fallback, which preserves its
 * pivot value exactly.
 */
async function opsToStatements(
  userId: number,
  ops: { assetId: number; delta: number }[],
  valuedAt: string,
  source: BalanceSource
): Promise<InStatement[]> {
  const resolved: BalanceStatementOp[] = [];

  for (const op of ops) {
    const account = await loadAccount(userId, op.assetId);
    if (!account) continue; // Deleted underneath us — nothing left to move.

    const rate = (await getEntryRate(account.currency)) ?? account.entryRate;
    resolved.push({
      assetId: op.assetId,
      delta: op.delta,
      decimals: currencyDecimals(account.currency),
      entryRate: rate,
    });
  }

  return buildBalanceStatements(userId, resolved, valuedAt, source);
}

/**
 * Statements that undo a recorded movement.
 *
 * Returns nothing when the account is gone, and nothing when its currency has
 * changed since the movement was applied — crediting a dollar figure into a
 * toman balance would silently corrupt it, so refuse and say so rather than
 * guess. This is what the stored `*Currency` column is for.
 *
 * Sign-agnostic: negating a positive delta gives money back, negating a
 * negative one takes back money that arrived.
 */
export async function buildReversalStatements(args: {
  userId: number;
  funding: FundingState | null;
  valuedAt: string;
  source: BalanceSource;
}): Promise<InStatement[]> {
  const { userId, funding, valuedAt, source } = args;
  if (!funding) return [];

  const account = await loadAccount(userId, funding.assetId);
  if (!account) return [];

  if (account.currency !== funding.currency) {
    console.warn(
      `[${source}] refusing to reverse ${funding.delta} ${funding.currency} into asset ${funding.assetId}, now held in ${account.currency}`
    );
    return [];
  }

  return opsToStatements(userId, [{ assetId: funding.assetId, delta: -funding.delta }], valuedAt, source);
}

/**
 * Statements taking a record's balance movement from `before` to `after`.
 *
 * Same-account edits net into one movement, so changing 500,000 to 700,000
 * writes a single −200,000 rather than a credit-back plus a re-debit.
 */
export async function buildResyncStatements(args: {
  userId: number;
  before: FundingState | null;
  after: FundingState | null;
  valuedAt: string;
  source: BalanceSource;
}): Promise<InStatement[]> {
  const { userId, before, after, valuedAt, source } = args;

  // A stale delta in a currency the account no longer holds can't be credited
  // back (see buildReversalStatements). Drop the credit half but keep the new
  // debit, so the edit still does the right thing going forward.
  if (before) {
    const account = await loadAccount(userId, before.assetId);
    if (!account || account.currency !== before.currency) {
      if (account && account.currency !== before.currency) {
        console.warn(
          `[${source}] skipping reversal of ${before.delta} ${before.currency} on asset ${before.assetId}, now held in ${account.currency}`
        );
      }
      return after ? opsToStatements(userId, [{ assetId: after.assetId, delta: after.delta }], valuedAt, source) : [];
    }
  }

  return opsToStatements(userId, resyncOps(before, after), valuedAt, source);
}
