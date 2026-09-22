/**
 * The arithmetic behind settling a debt through an account.
 *
 * Pure — no clock, no I/O, no database — for the same two reasons
 * `src/core/accounts/balance.ts` is: it makes the maths unit-testable, and it
 * lets the settle modal import the very functions the server uses, so the
 * before→after preview and the written balance agree by construction.
 *
 * ── The one idea in this file ──────────────────────────────────────────────
 * `buildBalanceStatements` always writes `amount = ROUND(amount - ?, ?)`. The
 * SQL never branches on direction; the SIGN of the delta is the direction. So
 * settling a debt is not a new kind of balance movement, it is the existing
 * one with the sign chosen correctly — and `resyncOps`, `applyDelta`,
 * `reverseDelta` and the whole reversal path are already sign-agnostic.
 *
 * That makes `debtSettlementDelta` the single point of failure for the entire
 * feature. If it ever returns an unsigned magnitude for a receivable, "they
 * paid me back" will DEBIT the account, and nothing on screen will look wrong
 * until someone reconciles against a real bank statement. Hence: its own
 * module, its own tests, and exactly one place the sign is applied.
 */
import { fundingDelta, roundToCurrency } from '@core/accounts/balance';
import type { MoneyRecord } from '@core/accounts/balance';

import type { DebtDirection } from '@/@types/debt';

/**
 * The SIGNED amount a settlement moves, expressed in the ACCOUNT's currency.
 *
 * `fundingDelta` returns a positive magnitude and handles the same-currency
 * identity case (see its own comment on why that must not go through the
 * general formula). Paying a debt you owe is an outflow, so the magnitude
 * passes straight through. Collecting one owed to you is an inflow, so it
 * passes negated — and subtracting a negative credits the account.
 *
 * Returns null when the rate is missing or unusable, propagating
 * `fundingDelta`'s contract unchanged.
 */
export function debtSettlementDelta(
  direction: DebtDirection,
  debt: MoneyRecord,
  accountCurrency: string,
  accountRate: number | null
): number | null {
  const magnitude = fundingDelta(debt, accountCurrency, accountRate);
  if (magnitude === null) return null;
  return direction === 'payable' ? magnitude : -magnitude;
}

/**
 * Whether settling would take the account below zero.
 *
 * Only an OUTFLOW can overdraw. Guarding on the sign rather than deferring to
 * `wouldOverdraw` alone matters: on an already-negative balance the generic
 * check would fire for a credit that is actively *repairing* it, and warn the
 * user about the one movement that helps.
 */
export function settlementWouldOverdraw(balance: number, signedDelta: number): boolean {
  return signedDelta > 0 && balance - signedDelta < 0;
}

/**
 * The net position: what you are owed minus what you owe, both already
 * converted to the same currency by the caller.
 *
 * Rounded onto the currency's grid so the figure the "net" card shows is the
 * same one the debt-adjusted net worth is built from, rather than the two
 * drifting apart by float dust.
 */
export function netDebtPosition(receivable: number, payable: number, currency: string): number {
  return roundToCurrency(receivable - payable, currency);
}
