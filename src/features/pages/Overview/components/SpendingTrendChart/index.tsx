import { useMemo, useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { parseISO } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import DateRangeSelector, {
  type DateRange,
  filterExpensesByDateRange,
  getChartGranularity,
} from '@features/expenses/components/DateRangeSelector';
import { usePrivacy } from '@features/privacy/PrivacyProvider';

import Button from '@components/Button';
import ChartTooltip from '@components/ChartTooltip';
import EmptyState from '@components/EmptyState';

import { useCurrency } from '@hooks/use-currency';
import type { MoneyItem } from '@hooks/use-currency';
import { useLocalePreferences } from '@hooks/use-locale-preferences';
import { useMoneyText } from '@hooks/use-money-text';

import { useDrawerStore } from '@stores/drawer';

import {
  formatAxisNumber,
  formatChartAxisDate,
  formatChartTooltipDate,
  getMonthBucketKey,
  getWeekBucketKey,
  resolveCalendar,
} from '@utils';

import type { SpendingTrendChartProps } from '../../@types';

// ─── Custom recharts tooltip ────────────────────────────────────────────────────
// Chart values are already in the primary currency; the tooltip sums the
// bucket's records per-record at each record's own date (matches the cards).
function SpendingTooltip({
  active,
  payload,
  label,
  granularity,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: { date?: string; items?: MoneyItem[] } }>;
  label?: string | number;
  granularity: 'daily' | 'weekly' | 'monthly';
}) {
  const locale = useLocale() as 'en' | 'fa';
  const { prefs } = useLocalePreferences();
  const calendar = resolveCalendar(prefs.calendar, locale);
  const { sumDisplay } = useMoneyText();
  if (!active || !payload?.length) return null;
  const { primary, secondary } = sumDisplay(payload[0].payload?.items ?? [], { compact: true });
  return (
    <ChartTooltip
      primary={primary}
      secondary={secondary ?? undefined}
      accent={
        label != null
          ? { text: formatChartTooltipDate(String(label), granularity, locale, calendar), tone: 'blue' }
          : undefined
      }
    />
  );
}

const SpendingTrendChart = ({ expenses }: SpendingTrendChartProps) => {
  // Customs
  const t = useTranslations('pages.overview.spendingTrend');
  const tOnboarding = useTranslations('onboarding.emptyStates');
  const locale = useLocale() as 'en' | 'fa';
  const { prefs: localePrefs } = useLocalePreferences();
  const calendar = resolveCalendar(localePrefs.calendar, locale);
  const openExpenseDrawer = useDrawerStore((state) => state.openExpenseDrawer);
  const { sumTo, primaryCurrency } = useCurrency();
  const { hidden } = usePrivacy();
  // States
  const [dateRange, setDateRange] = useState<DateRange>('30D');

  // Memos
  const filteredExpenses = useMemo(
    () => filterExpensesByDateRange(expenses, dateRange, calendar),
    [expenses, dateRange, calendar]
  );
  const granularity = useMemo(() => getChartGranularity(dateRange, calendar), [dateRange, calendar]);

  const spendingTrend = useMemo(() => {
    if (filteredExpenses.length === 0) return [];

    const aggregated = new Map<string, { items: MoneyItem[] }>();

    filteredExpenses.forEach((exp) => {
      const date = new Date(`${exp.date}T00:00:00`);
      const item: MoneyItem = { amount: exp.amount, currency: exp.currency, date: exp.date, entryRate: exp.entryRate };
      let key: string;

      switch (granularity) {
        case 'weekly':
          key = getWeekBucketKey(date, calendar);
          break;
        case 'monthly':
          key = getMonthBucketKey(date, calendar);
          break;
        case 'daily':
        default:
          key = exp.date;
          break;
      }

      const existing = aggregated.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        aggregated.set(key, { items: [item] });
      }
    });

    // `amount` is the bucket total in the primary currency, so the Y axis that
    // formats it speaks the same currency as the tooltip above it.
    return Array.from(aggregated.entries())
      .map(([date, data]) => ({ date, items: data.items, amount: sumTo(data.items, primaryCurrency) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredExpenses, granularity, calendar, sumTo, primaryCurrency]);

  return (
    <div className="border-border-subtle bg-background relative flex h-full flex-col rounded-xl border p-5 shadow-sm sm:p-6 lg:col-span-2">
      <div className="mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="border-border-subtle bg-background-secondary rounded-lg border p-2.5">
            <TrendingUp className="text-blue h-5 w-5" />
          </div>
          <h2 className="text-text-primary text-lg font-semibold">{t('cardTitle')}</h2>
        </div>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {spendingTrend.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title={tOnboarding('spendingTrend.title')}
          description={expenses.length === 0 ? tOnboarding('spendingTrend.description') : t('noDataInRange')}
          action={
            expenses.length === 0 ? (
              <Button variant="outline" onClick={() => openExpenseDrawer()}>
                {tOnboarding('addExpense')}
              </Button>
            ) : undefined
          }
          className="min-h-[320px]"
        />
      ) : (
        <div className="min-h-[320px] flex-1" dir="ltr">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart
              data={spendingTrend}
              // Farsi's compact notation spells out "میلیون"/"میلیارد" in full
              // instead of abbreviating to a single letter ("M"/"B"), so the
              // Y-axis needs extra breathing room to avoid clipping the widest tick.
              margin={{ left: locale === 'fa' ? 12 : 0, right: 20, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-blue)" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="var(--color-blue)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="var(--color-blue)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" opacity={0.5} vertical={false} />
              <XAxis
                dataKey="date"
                stroke="var(--color-border-subtle)"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: 'var(--color-border-subtle)' }}
                tickLine={{ stroke: 'var(--color-border-subtle)' }}
                tickMargin={8}
                height={28}
                minTickGap={40}
                interval="preserveStartEnd"
                tickFormatter={(value: string) =>
                  formatChartAxisDate(parseISO(value), granularity === 'monthly' ? 'month' : 'day', locale, calendar)
                }
              />
              <YAxis
                stroke="var(--color-border-subtle)"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: 'var(--color-border-subtle)' }}
                tickLine={{ stroke: 'var(--color-border-subtle)' }}
                width="auto"
                tickFormatter={(value: number) => (hidden ? '' : formatAxisNumber(value, locale))}
              />
              <RechartsTooltip
                content={(props) => <SpendingTooltip {...props} granularity={granularity} />}
                cursor={{ stroke: 'var(--color-blue)', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--color-blue)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAmount)"
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SpendingTrendChart;
