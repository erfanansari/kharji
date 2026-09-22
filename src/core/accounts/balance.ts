/**
 * The arithmetic behind paying an expense out of an account.
 *
 * Pure — no clock, no I/O, no database. That is deliberate twice over: it makes
 * the maths unit-testable the way `src/core/recurring/schedule.ts` is, and it
 * lets the *client* import the same functions for the expense form's live
 * before→after preview. The preview and the server therefore agree by
 * construction rather than by two people writing the same formula twice.
 *
 * ── Why the applied delta gets stored on the expense row ───────────────────
 * Reversing a deduction (editing or deleting the expense) must add back the
 * exact number that was subtracted. Recomputing it at reversal time would use
 * whatever exchange rate is current *then*, leaving the balance permanently off
 * by the drift — and drift compounds silently across every edit. So the caller
 * persists `paidFromDelta` and `paidFromCurrency`, and reversal is plain
 * addition of a stored number.
 *
 * That only works if the number is representable. Hence `roundToCurrency` on
 * every boundary: a balance always sits on its currency's grid, so
 * apply-then-reverse returns the original bits rather than accumulating binary
 * float dust. The tests assert this with `toBe`, not `toBeCloseTo`.
 */
import { getCurrency } from '@/constants/currencies';

/** Snap a value onto a currency's representable grid (IRT: 0dp, USD: 2dp). */
export function roundToCurrency(value: number, currency: string): number {
  const { decimals } = getCurrency(currency);
  const factor = 10 ** decimals;
  // Scale-round-unscale rather than toFixed: toFixed returns a string and its
  // half-away-from-zero behaviour on binary floats is inconsistent across
  // engines. Math.round on a scaled integer is what the SQL side mirrors.
  return Math.round(value * factor) / factor;
}

/** The number of fraction digits a currency is stored at — used to build the
 *  `ROUND(x, ?)` argument on the SQL side so both halves round identically. */
export function currencyDecimals(currency: string): number {
  return getCurrency(currency).decimals;
}

/** A stored monetary record: an amount in its own currency, plus the frozen
 *  pivot rate captured when it was written. */
export interface MoneyRecord {
  amount: number;
  currency: string;
  /** Pivot units per 1 unit of `currency`, snapshotted at entry time. */
  entryRate: number;
}

/**
 * How much to remove from an account, expressed in the ACCOUNT's currency.
 *
 * `accountRate` is pivot-units-per-1-unit of `accountCurrency` (1 for the pivot
 * itself); the caller resolves it. Returns null when it is missing or unusable.
 *
 * Same-currency is **identity**. It is tempting to let the general formula
 * handle it, but `amount * entryRate / accountRate` does not return `amount`
 * whenever the record's frozen `entryRate` has drifted from the rate now in
 * effect — and a frozen rate drifting is the normal case, not the exception.
 * A USD expense paid from a USD account must move the balance by exactly the
 * amount typed. `use-currency.ts#convertItem` and `core/net-worth/history.ts`
 * both carry the same warning; this is the third place it matters.
 */
export function fundingDelta(expense: MoneyRecord, accountCurrency: string, accountRate: number | null): number | null {
  if (accountCurrency === expense.currency) {
    return roundToCurrency(expense.amount, accountCurrency);
  }
  if (accountRate === null || !Number.isFinite(accountRate) || accountRate <= 0) return null;

  const pivot = expense.amount * expense.entryRate;
  return roundToCurrency(pivot / accountRate, accountCurrency);
}

/** Money leaves the account. Never clamps — an overdraft is a signal worth
 *  showing, not an error worth blocking (see `wouldOverdraw`). */
export function applyDelta(balance: number, delta: number, currency: string): number {
  return roundToCurrency(balance - delta, currency);
}

/** Money returns to the account. The exact inverse of `applyDelta`. */
export function reverseDelta(balance: number, delta: number, currency: string): number {
  return roundToCurrency(balance + delta, currency);
}

/** Whether applying would take the account below zero. Warn, never block. */
export function wouldOverdraw(balance: number, delta: number): boolean {
  return balance - delta < 0;
}

/** The balance movement actually recorded against a record — an expense's
 *  funding, or a debt's settlement. */
export interface FundingState {
  assetId: number;
  /**
   * In `currency`. Positive = money left the account, negative = money
   * arrived. Expenses only ever store a positive delta; a settled receivable
   * stores a negative one (see src/core/debts/balance.ts). Nothing downstream
   * clamps or takes an absolute value, which is what lets reversal and resync
   * serve both directions.
   */
  delta: number;
  /** The account's currency when the delta was applied. */
  currency: string;
}

/** One signed balance change. Positive = money leaves the account. */
export interface FundingOp {
  assetId: number;
  delta: number;
}

/**
 * The minimal set of balance changes taking an expense from `before` to
 * `after`.
 *
 * Same-account edits net into ONE op — changing 500,000 to 700,000 emits a
 * single −200,000 rather than a credit-back followed by a re-debit. That keeps
 * the valuation history readable (one snapshot per user action, not two) and
 * halves the statements in the batch. An account switch genuinely is two
 * movements, so it emits two, which the caller must commit together.
 *
 * Zero-deltas are dropped: a no-op edit must not write a snapshot row claiming
 * something happened.
 */
export function resyncOps(before: FundingState | null, after: FundingState | null): FundingOp[] {
  if (!after) return before ? [{ assetId: before.assetId, delta: -before.delta }] : [];
  if (!before) return [{ assetId: after.assetId, delta: after.delta }];

  if (before.assetId === after.assetId) {
    const delta = roundToCurrency(after.delta - before.delta, after.currency);
    return delta === 0 ? [] : [{ assetId: after.assetId, delta }];
  }

  return [
    { assetId: before.assetId, delta: -before.delta },
    { assetId: after.assetId, delta: after.delta },
  ];
}
