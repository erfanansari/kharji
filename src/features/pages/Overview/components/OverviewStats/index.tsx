import type { FC, ReactNode } from 'react';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import type { SummaryPair } from '@api/getSummaryQuery';
import { Banknote, TrendingDown, TrendingUp } from 'lucide-react';

import AnimatedMoney from '@components/AnimatedMoney';
import StatZeroState from '@components/StatZeroState';

import { useCurrency } from '@hooks/use-currency';

import { ROUTES } from '@/constants/routes';

import type { OverviewStatsProps } from '../../@types';

const primaryClass = 'text-text-primary text-2xl font-semibold tabular-nums sm:text-3xl';
const secondaryClass = 'text-text-secondary mt-1.5 text-sm font-medium';

interface StatCardProps {
  label: string;
  icon: ReactNode;
  pair?: SummaryPair;
  emptyCaption: string;
  primaryCurrency: string;
  secondaryCurrency: string | null;
  formatFull: (value: number, currency: string) => string;
  /**
   * Overrides the default "both totals are zero" emptiness heuristic. Needed
   * because that heuristic is wrong for net worth once debts exist: payables
   * that exactly cancel receivables, with no assets, is a meaningful zero.
   */
  isEmpty?: boolean;
  /** A context line under the figures — used to explain a changed number. */
  footnote?: ReactNode;
}

const StatCard: FC<StatCardProps> = ({
  label,
  icon,
  pair,
  emptyCaption,
  primaryCurrency,
  secondaryCurrency,
  formatFull,
  isEmpty: isEmptyOverride,
  footnote,
}) => {
  const p = pair?.primary ?? 0;
  const s = pair?.secondary ?? 0;
  // 0/0 means "nothing recorded", not "your total is zero" — show that honestly
  // instead of a broken-looking "0 IRT".
  const isEmpty = isEmptyOverride ?? (p === 0 && s === 0);
  // Net worth can be negative once debts count. Red is what a shortfall reads
  // as everywhere else in the app; only the headline figure is recoloured.
  const figureClass = p < 0 ? primaryClass.replace('text-text-primary', 'text-danger') : primaryClass;
  return (
    <div className="border-border-subtle bg-background relative min-w-0 rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="border-border-subtle bg-background-secondary rounded-lg border p-2.5">{icon}</div>
      </div>
      <p className="text-text-muted mb-2 text-xs font-medium tracking-wider uppercase">{label}</p>
      {isEmpty ? (
        <StatZeroState caption={emptyCaption} />
      ) : (
        <>
          <p className={figureClass} title={formatFull(p, primaryCurrency)}>
            <AnimatedMoney amount={p} currency={primaryCurrency} />
          </p>
          {secondaryCurrency && (
            <p className={secondaryClass} title={formatFull(s, secondaryCurrency)}>
              <AnimatedMoney amount={s} currency={secondaryCurrency} />
            </p>
          )}
          {footnote}
        </>
      )}
    </div>
  );
};

const OverviewStats = ({ summary }: OverviewStatsProps) => {
  const t = useTranslations('pages.overview.stats');
  const tZero = useTranslations('onboarding.zeroCaptions');
  const { formatFull, primaryCurrency: ctxPrimary, secondaryCurrency: ctxSecondary } = useCurrency();

  // Totals arrive already converted (per-record, historical). Fall back to the
  // context currencies while the summary is still loading.
  const primaryCurrency = summary?.primaryCurrency ?? ctxPrimary;
  const secondaryCurrency = summary?.secondaryCurrency ?? ctxSecondary;
  const shared = { primaryCurrency, secondaryCurrency, formatFull };

  // Net worth stopped meaning "gross assets" in 1.7.0. The three debt-era
  // fields are optional in the response schema for one release (a cached client
  // can outlive the server that sent it), so absence means "old server" — fall
  // back to the plain heuristic and show no footnote rather than invent zeros.
  const payable = summary?.total_payable;
  const receivable = summary?.total_receivable;
  const hasDebtFigures = !!summary?.total_assets && !!payable && !!receivable;
  const hasDebts = hasDebtFigures && (payable.primary > 0 || receivable.primary > 0);
  const netWorthIsEmpty = hasDebtFigures
    ? summary.total_assets!.primary === 0 && payable.primary === 0 && receivable.primary === 0
    : undefined;

  // Answers "why did my net worth drop?" where it gets asked, and keeps the
  // four-card grid (and OverviewSkeleton's hardcoded count) untouched.
  const netWorthFootnote =
    hasDebts && payable && receivable ? (
      <Link
        href={ROUTES.DEBTS}
        className="text-text-muted hover:text-text-primary mt-1.5 block text-xs transition-colors"
      >
        {t('netWorthDebtNote', {
          payable: formatFull(payable.primary, primaryCurrency),
          receivable: formatFull(receivable.primary, primaryCurrency),
        })}
      </Link>
    ) : null;

  return (
    <>
      <StatCard
        label={t('netWorth')}
        icon={<Banknote className="text-success h-5 w-5" />}
        pair={summary?.net_worth}
        emptyCaption={tZero('netWorth')}
        isEmpty={netWorthIsEmpty}
        footnote={netWorthFootnote}
        {...shared}
      />
      <StatCard
        label={t('totalIncome')}
        icon={<TrendingUp className="text-success h-5 w-5" />}
        pair={summary?.total_income}
        emptyCaption={tZero('income')}
        {...shared}
      />
      <StatCard
        label={t('totalExpenses')}
        icon={<TrendingDown className="text-danger h-5 w-5" />}
        pair={summary?.total_expenses}
        emptyCaption={tZero('expenses')}
        {...shared}
      />
    </>
  );
};

export default OverviewStats;
