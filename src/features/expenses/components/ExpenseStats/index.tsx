'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { ArrowRight, BarChart3, Hash, TrendingUp } from 'lucide-react';

import AnimatedMoney, { AnimatedCount } from '@components/AnimatedMoney';
import StatZeroState from '@components/StatZeroState';

import { useCurrency } from '@hooks/use-currency';

import { type Expense } from '@/@types/expense';

interface ExpenseStatsProps {
  expenses: Expense[];
  totalHref: string;
}

const ExpenseStats = ({ expenses, totalHref }: ExpenseStatsProps) => {
  const t = useTranslations('pages.expenses.stats');
  const tZero = useTranslations('onboarding.zeroCaptions');
  const { primaryCurrency, secondaryCurrency, sumTo, formatFull } = useCurrency();

  // Sum each expense converted at ITS OWN date — historically accurate & stable.
  const items = expenses.map((e) => ({ amount: e.amount, currency: e.currency, date: e.date, entryRate: e.entryRate }));
  const showSecondary = !!secondaryCurrency && secondaryCurrency !== primaryCurrency;

  const totalPrimary = sumTo(items, primaryCurrency);
  const totalSecondary = showSecondary ? sumTo(items, secondaryCurrency) : 0;

  let days = 0;
  if (expenses.length > 0) {
    const dates = expenses.map((exp) => new Date(exp.date).getTime());
    const firstDate = new Date(Math.min(...dates));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    firstDate.setHours(0, 0, 0, 0);
    days = Math.max(1, Math.ceil((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }
  const div = days || 1;

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
      {/* Total Expenses */}
      <Link
        href={totalHref}
        title={t('viewExpenses')}
        className="border-border-subtle bg-background group hover:border-primary/40 focus-visible:ring-primary relative rounded-xl border p-5 text-start shadow-sm transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="border-border-subtle bg-background-secondary rounded-lg border p-2.5">
            <TrendingUp className="text-blue h-5 w-5" />
          </div>
          <ArrowRight className="text-text-muted h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
        </div>

        <div>
          <p className="text-text-muted mb-2 text-xs font-medium tracking-wider uppercase">{t('total')}</p>
          {expenses.length === 0 ? (
            <StatZeroState caption={tZero('expensesTotal')} />
          ) : (
            <p
              className="text-text-primary text-2xl font-semibold tabular-nums sm:text-3xl"
              title={formatFull(totalPrimary, primaryCurrency)}
            >
              <AnimatedMoney amount={totalPrimary} currency={primaryCurrency} />
            </p>
          )}
          {showSecondary && expenses.length > 0 && (
            <p
              className="text-text-secondary mt-1.5 text-sm font-medium"
              title={formatFull(totalSecondary, secondaryCurrency)}
            >
              <AnimatedMoney amount={totalSecondary} currency={secondaryCurrency} />
            </p>
          )}
        </div>
      </Link>

      {/* Number of Expenses */}
      <div className="border-border-subtle bg-background relative rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="border-border-subtle bg-background-secondary rounded-lg border p-2.5">
            <Hash className="text-success h-5 w-5" />
          </div>
        </div>

        <div>
          <p className="text-text-muted mb-2 text-xs font-medium tracking-wider uppercase">{t('count')}</p>
          {expenses.length === 0 ? (
            <StatZeroState caption={tZero('expensesCount')} />
          ) : (
            <>
              <p className="text-text-primary text-2xl font-semibold tabular-nums sm:text-3xl">
                <AnimatedCount value={expenses.length} />
              </p>
              <p className="text-text-secondary mt-1.5 text-sm font-medium">{t('count')}</p>
            </>
          )}
        </div>
      </div>

      {/* Average Daily Spending */}
      <div className="border-border-subtle bg-background relative rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="border-border-subtle bg-background-secondary rounded-lg border p-2.5">
            <BarChart3 className="text-text-secondary h-5 w-5" />
          </div>
        </div>

        <div>
          <p className="text-text-muted mb-2 text-xs font-medium tracking-wider uppercase">{t('dailyAverage')}</p>
          {expenses.length === 0 ? (
            <StatZeroState caption={tZero('expensesDailyAverage')} />
          ) : (
            <p
              className="text-text-primary text-2xl font-semibold tabular-nums sm:text-3xl"
              title={formatFull(totalPrimary / div, primaryCurrency)}
            >
              <AnimatedMoney amount={totalPrimary / div} currency={primaryCurrency} />
            </p>
          )}
          {showSecondary && expenses.length > 0 && (
            <p
              className="text-text-secondary mt-1.5 text-sm font-medium"
              title={formatFull(totalSecondary / div, secondaryCurrency)}
            >
              <AnimatedMoney amount={totalSecondary / div} currency={secondaryCurrency} />
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseStats;
