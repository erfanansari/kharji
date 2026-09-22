'use client';

import { useTranslations } from 'next-intl';

import type { ExpenseSummary } from '@api/getExpenseListQuery';

import AnimatedMoney from '@components/AnimatedMoney';

import { useCurrency } from '@hooks/use-currency';

interface ExpensesTotalProps {
  summary: ExpenseSummary;
}

const ExpensesTotal = ({ summary }: ExpensesTotalProps) => {
  const t = useTranslations('pages.expenses.stats');
  const { primaryCurrency, secondaryCurrency, sumTo, formatFull } = useCurrency();
  const showSecondary = !!secondaryCurrency && secondaryCurrency !== primaryCurrency;
  const totalPrimary = sumTo(summary.items, primaryCurrency);
  const totalSecondary = showSecondary ? sumTo(summary.items, secondaryCurrency) : 0;

  return (
    <div className="border-border-subtle bg-background-secondary/55 flex min-w-0 flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="border-primary min-w-0 border-s-2 ps-3">
        <p className="text-text-primary text-sm font-semibold">{t('total')}</p>
        <p className="text-text-muted mt-0.5 text-xs">{t('ledgerCount', { count: summary.count })}</p>
      </div>

      <div className="min-w-0 text-start sm:text-end">
        {summary.count === 0 ? (
          <p className="text-text-muted text-2xl font-semibold tabular-nums">—</p>
        ) : (
          <>
            <p
              className="text-text-primary truncate text-2xl font-semibold tabular-nums"
              title={formatFull(totalPrimary, primaryCurrency)}
            >
              <AnimatedMoney amount={totalPrimary} currency={primaryCurrency} compact={false} />
            </p>
            {showSecondary && secondaryCurrency && (
              <p
                className="text-text-muted mt-0.5 truncate text-xs font-medium tabular-nums"
                title={formatFull(totalSecondary, secondaryCurrency)}
              >
                <AnimatedMoney amount={totalSecondary} currency={secondaryCurrency} compact={false} />
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExpensesTotal;
