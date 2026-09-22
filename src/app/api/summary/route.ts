import { NextResponse } from 'next/server';

import { withAuth } from '@core/api/utils';
import { db } from '@core/database/client';
import { getCurrencyPreferences } from '@core/database/currency-preferences';

import { PIVOT_CURRENCY, SUPPORTED_CURRENCY_CODES } from '@/constants/currencies';
import { OUTSTANDING_DEBTS_WHERE } from '@/constants/debts';

// Totals are converted PER RECORD at each record's own date (historically
// accurate and stable over time), into the user's primary & secondary currency.
interface SummaryPair {
  primary: number;
  secondary: number | null;
}

interface SummaryResponse {
  primaryCurrency: string;
  secondaryCurrency: string | null;
  total_income: SummaryPair;
  total_expenses: SummaryPair;
  /** Gross portfolio value — what `net_worth` meant before 1.7.0. */
  total_assets: SummaryPair;
  /** OUTSTANDING payables only. */
  total_payable: SummaryPair;
  /** OUTSTANDING receivables only. */
  total_receivable: SummaryPair;
  /**
   * assets − payable + receivable. MEANING CHANGED in 1.7.0: this used to be
   * gross assets, which is now `total_assets`. The assets page still shows the
   * gross figure (labelled "Total Assets"); this is the debt-adjusted one.
   */
  net_worth: SummaryPair;
}

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

/**
 * SQL expression summing each row's value converted to `currency` at the row's
 * own date. A row already denominated in `currency` contributes its amount
 * as-is — conversion into a record's own currency must be a no-op, never a
 * pivot round-trip, or rate-table gaps/drift corrupt the total (this mirrors
 * convertItem in use-currency.ts). Other rows convert their pivot value
 * (amount*entryRate) by the currency's rate on that date (carry-forward, with
 * a fallback to the earliest known rate). `currency` is validated against the
 * supported set before inlining.
 */
function sumInCurrency(currency: string, dateExpr: string): string {
  const pivot = 'amount * entryRate';
  if (currency === PIVOT_CURRENCY) return `COALESCE(SUM(${pivot}), 0)`;
  if (!SUPPORTED_CURRENCY_CODES.includes(currency)) return '0';
  return `COALESCE(SUM(CASE WHEN currency = '${currency}' THEN amount ELSE (${pivot}) / NULLIF(COALESCE(
    (SELECT cr.rate FROM currencyRates cr WHERE cr.currency='${currency}' AND cr.rateDate <= ${dateExpr} ORDER BY cr.rateDate DESC LIMIT 1),
    (SELECT cr.rate FROM currencyRates cr WHERE cr.currency='${currency}' ORDER BY cr.rateDate ASC LIMIT 1)
  ), 0) END), 0)`;
}

export const GET = withAuth(async (user) => {
  const prefs = await getCurrencyPreferences(user.userId);
  const primary = prefs.primaryCurrency;
  const secondary = prefs.secondaryCurrency && prefs.secondaryCurrency !== primary ? prefs.secondaryCurrency : null;

  // Run one query per table selecting both primary and secondary totals.
  // `extraWhere` is appended verbatim and must never carry user input — the
  // only caller passes compile-time constants (see the debt pairs below).
  const pair = async (table: string, userCol: string, dateExpr: string, extraWhere = ''): Promise<SummaryPair> => {
    const secSelect = secondary ? `, ${sumInCurrency(secondary, dateExpr)} AS s` : '';
    const res = await db.execute({
      sql: `SELECT ${sumInCurrency(primary, dateExpr)} AS p ${secSelect} FROM ${table} WHERE ${userCol} = ? ${extraWhere}`,
      args: [user.userId],
    });
    return { primary: num(res.rows[0]?.p), secondary: secondary ? num(res.rows[0]?.s) : null };
  };

  const DEBT_DATE = `substr(incurredAt, 1, 10)`;

  const [total_income, total_expenses, total_assets, total_payable, total_receivable] = await Promise.all([
    pair('incomes', 'userId', `printf('%04d-%02d-01', year, month)`),
    pair('expenses', 'user_id', `substr(date, 1, 10)`),
    pair('assets', 'userId', `substr(lastValuedAt, 1, 10)`),
    // OUTSTANDING_DEBTS_WHERE is not optional on either of these. A settled
    // debt has already moved whatever balance it was going to move (or was
    // pure bookkeeping), and counting it again is the one way this feature can
    // corrupt net worth. The direction literals are compile-time constants
    // from DEBT_DIRECTION_VALUES, not user input.
    pair('debts', 'userId', DEBT_DATE, `AND ${OUTSTANDING_DEBTS_WHERE} AND direction = 'payable'`),
    pair('debts', 'userId', DEBT_DATE, `AND ${OUTSTANDING_DEBTS_WHERE} AND direction = 'receivable'`),
  ]);

  // Signing happens here rather than in SQL so `sumInCurrency` stays a pure
  // "sum this table in this currency" helper with no notion of direction.
  const net_worth: SummaryPair = {
    primary: total_assets.primary - total_payable.primary + total_receivable.primary,
    secondary: secondary
      ? (total_assets.secondary ?? 0) - (total_payable.secondary ?? 0) + (total_receivable.secondary ?? 0)
      : null,
  };

  const response: SummaryResponse = {
    primaryCurrency: primary,
    secondaryCurrency: secondary,
    total_income,
    total_expenses,
    total_assets,
    total_payable,
    total_receivable,
    net_worth,
  };
  return NextResponse.json(response);
}, 'Summary');
