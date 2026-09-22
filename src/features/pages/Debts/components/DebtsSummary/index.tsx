import { useTranslations } from 'next-intl';

import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';

import AnimatedMoney from '@components/AnimatedMoney';
import { ZERO_CAPTION_CLASS, ZERO_VALUE_CLASS } from '@components/StatZeroState';

import { useCurrency } from '@hooks/use-currency';
import type { MoneyItem } from '@hooks/use-currency';

import type { Debt } from '@/@types/debt';

import type { DebtsSummaryProps } from '../../@types';

/** A debt converts at the date it was incurred, like every other money record. */
const toItem = (debt: Debt): MoneyItem => ({
  amount: debt.amount,
  currency: debt.currency,
  date: debt.incurredAt,
  entryRate: debt.entryRate,
});

/**
 * Computed client-side from the cached list rather than read off /api/summary.
 *
 * Every debt row is already a `MoneyItem`, so `sumTo` converts each one at its
 * own date — the same helper the assets and income pages use. That is what
 * makes these three figures agree with the Overview's net worth by
 * construction rather than by two sums happening to match.
 */
const DebtsSummary = ({ debts }: DebtsSummaryProps) => {
  const t = useTranslations('pages.debts.stats');
  const tZero = useTranslations('onboarding.zeroCaptions');
  const { primaryCurrency, secondaryCurrency, sumTo, formatFull } = useCurrency();
  const showSecondary = !!secondaryCurrency && secondaryCurrency !== primaryCurrency;

  // Outstanding only — a settled debt has already done whatever it was going
  // to do, and including it here would contradict the summary endpoint.
  const outstanding = debts.filter((d) => d.settledAt === null);
  const receivables = outstanding.filter((d) => d.direction === 'receivable').map(toItem);
  const payables = outstanding.filter((d) => d.direction === 'payable').map(toItem);

  const owedToMe = {
    p: sumTo(receivables, primaryCurrency),
    s: showSecondary ? sumTo(receivables, secondaryCurrency || primaryCurrency) : 0,
  };
  const iOwe = {
    p: sumTo(payables, primaryCurrency),
    s: showSecondary ? sumTo(payables, secondaryCurrency || primaryCurrency) : 0,
  };
  const net = { p: owedToMe.p - iOwe.p, s: owedToMe.s - iOwe.s };

  const hasOutstanding = outstanding.length > 0;

  const renderPair = (p: number, s: number, primaryClass: string) =>
    hasOutstanding ? (
      <>
        <p className={primaryClass} title={formatFull(p, primaryCurrency)}>
          <AnimatedMoney amount={p} currency={primaryCurrency} />
        </p>
        {showSecondary && secondaryCurrency && (
          <p className="text-text-muted text-xs" title={formatFull(s, secondaryCurrency)}>
            <AnimatedMoney amount={s} currency={secondaryCurrency} />
          </p>
        )}
      </>
    ) : (
      <p className={ZERO_VALUE_CLASS}>—</p>
    );

  const captionClass = hasOutstanding ? 'text-text-secondary mt-1.5 text-sm font-medium' : ZERO_CAPTION_CLASS;
  const netClass = net.p < 0 ? 'text-danger' : 'text-success';

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
      {/* Owed to me */}
      <div className="border-border-subtle bg-background relative min-w-0 rounded-xl border p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="border-border-subtle bg-background-secondary rounded-lg border p-2.5">
            <ArrowDownLeft className="text-success h-5 w-5" />
          </div>
        </div>
        <p className="text-text-muted mb-2 text-xs font-medium tracking-wider uppercase">{t('owedToMe')}</p>
        {renderPair(owedToMe.p, owedToMe.s, 'text-success text-2xl font-semibold tabular-nums')}
        {!hasOutstanding && <p className={captionClass}>{tZero('debtsOwedToMe')}</p>}
      </div>

      {/* I owe */}
      <div className="border-border-subtle bg-background relative min-w-0 rounded-xl border p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="border-border-subtle bg-background-secondary rounded-lg border p-2.5">
            <ArrowUpRight className="text-danger h-5 w-5" />
          </div>
        </div>
        <p className="text-text-muted mb-2 text-xs font-medium tracking-wider uppercase">{t('iOwe')}</p>
        {renderPair(iOwe.p, iOwe.s, 'text-danger text-2xl font-semibold tabular-nums')}
        {!hasOutstanding && <p className={captionClass}>{tZero('debtsIOwe')}</p>}
      </div>

      {/* Net position */}
      <div className="border-border-subtle bg-background relative min-w-0 rounded-xl border p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="border-border-subtle bg-background-secondary rounded-lg border p-2.5">
            <Scale className="text-text-secondary h-5 w-5" />
          </div>
        </div>
        <p className="text-text-muted mb-2 text-xs font-medium tracking-wider uppercase">{t('net')}</p>
        {renderPair(net.p, net.s, `${netClass} text-2xl font-semibold tabular-nums`)}
        {!hasOutstanding && <p className={captionClass}>{tZero('debtsNet')}</p>}
      </div>
    </div>
  );
};

export default DebtsSummary;
