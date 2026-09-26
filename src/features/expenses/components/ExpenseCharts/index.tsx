'use client';

import { useLocale, useTranslations } from 'next-intl';

import { getCategoryColor } from '@constants/categories';
import { parseISO } from 'date-fns';
import { BarChart3, PieChartIcon, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { usePrivacy } from '@features/privacy/PrivacyProvider';

import CategoryBadge from '@components/CategoryBadge';
import ChartTooltip from '@components/ChartTooltip';

import { useCurrency } from '@hooks/use-currency';
import type { MoneyItem } from '@hooks/use-currency';
import { useLocalePreferences } from '@hooks/use-locale-preferences';
import { useMoneyText } from '@hooks/use-money-text';

import {
  formatAxisNumber,
  formatChartAxisDate,
  formatChartTooltipDate,
  getMonthBucketKey,
  getWeekBucketKey,
  resolveCalendar,
} from '@utils';

import { type Expense } from '@/@types/expense';

interface ExpenseChartsProps {
  expenses: Expense[];
  granularity?: 'daily' | 'weekly' | 'monthly';
}

// Tooltip for pie / bar (category-based). Categories span all dates, so the
// primary/secondary strings are pre-summed per-record in the component.
const CategoryTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: { name?: string; primaryStr?: string; secondaryStr?: string } }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <ChartTooltip
      primary={d.primaryStr ?? ''}
      secondary={d.secondaryStr}
      accent={d.name ? { text: d.name, tone: 'blue' } : undefined}
    />
  );
};

// Tooltip for the time-series area chart (date-based). Sums the bucket's
// records per-record at each record's own date (matches the summary cards).
const AreaTooltip = ({
  active,
  payload,
  label,
  granularity,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: { items?: MoneyItem[] } }>;
  label?: string | number;
  granularity: 'daily' | 'weekly' | 'monthly';
}) => {
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
};

export function ExpenseCharts({ expenses, granularity = 'daily' }: ExpenseChartsProps) {
  const t = useTranslations('pages.reports.charts');
  const locale = useLocale() as 'en' | 'fa';
  const { prefs: localePrefs } = useLocalePreferences();
  const calendar = resolveCalendar(localePrefs.calendar, locale);
  const { sumTo, primaryCurrency, secondaryCurrency } = useCurrency();
  const { format: fmtMoney } = useMoneyText();
  const { hidden } = usePrivacy();
  const showSecondary = !!secondaryCurrency && secondaryCurrency !== primaryCurrency;

  // Aggregate per category. Each expense converts at its OWN date; `value` is
  // the total in the PRIMARY currency, which both sizes the segments and is
  // what the bar chart's axis formats — leaving it in the pivot made the axis
  // read in rials while every label beside it read in the user's currency.
  const catMap = new Map<number, { name: string; color: string; category: Expense['category']; items: MoneyItem[] }>();
  expenses.forEach((exp) => {
    const item: MoneyItem = { amount: exp.amount, currency: exp.currency, date: exp.date, entryRate: exp.entryRate };
    const ex = catMap.get(exp.category.id);
    if (ex) {
      ex.items.push(item);
    } else {
      catMap.set(exp.category.id, {
        name: exp.category.name,
        color: getCategoryColor(exp.category.color).fill,
        category: exp.category,
        items: [item],
      });
    }
  });

  const categoryTotals = Array.from(catMap.entries())
    .map(([categoryId, c]) => ({
      categoryId,
      name: c.name,
      color: c.color,
      category: c.category,
      value: sumTo(c.items, primaryCurrency),
      primaryStr: fmtMoney(sumTo(c.items, primaryCurrency), primaryCurrency, { compact: true }),
      secondaryStr: showSecondary
        ? fmtMoney(sumTo(c.items, secondaryCurrency || primaryCurrency), secondaryCurrency || primaryCurrency, {
            compact: true,
          })
        : undefined,
    }))
    .sort((a, b) => b.value - a.value);

  // Aggregate expenses based on granularity
  const aggregateExpenses = () => {
    if (expenses.length === 0) return [];

    const aggregated = new Map<string, { items: MoneyItem[] }>();

    expenses.forEach((exp) => {
      const date = new Date(`${exp.date.slice(0, 10)}T00:00:00`);
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

    // `amount` is the bucket total in the primary currency — same unit as the
    // Y axis that formats it and the tooltip that sits above it.
    return Array.from(aggregated.entries())
      .map(([date, data]) => ({ date, items: data.items, amount: sumTo(data.items, primaryCurrency) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const timeSeriesTotals = aggregateExpenses();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Pie Chart */}
      <div className="border-border-subtle bg-background relative rounded-xl border p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="border-border-subtle bg-background-secondary rounded-lg border p-2.5">
            <PieChartIcon className="text-blue h-5 w-5" />
          </div>
          <h3 className="text-text-primary text-lg font-semibold">{t('byCategory')}</h3>
        </div>

        <div className="h-[280px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Pie
                data={categoryTotals}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={4}
                dataKey="value"
                stroke="var(--color-background)"
                strokeWidth={2}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {categoryTotals.map((cat) => (
                  <Cell key={`cell-${cat.categoryId}`} fill={cat.color} />
                ))}
              </Pie>
              <Tooltip content={<CategoryTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend is a surface you READ, so it uses the same badge as the
            expenses table — it used to be a bare colour dot, the one place in
            the app that dropped the category icon altogether. */}
        <div className="mt-6 flex flex-wrap gap-2">
          {categoryTotals.map((cat) => (
            <CategoryBadge key={cat.categoryId} category={cat.category} size="md" className="max-w-full" />
          ))}
        </div>
      </div>

      {/* Bar Chart */}
      <div className="border-border-subtle bg-background relative flex h-full flex-col rounded-xl border p-6 shadow-sm">
        <div className="mb-6 flex shrink-0 items-center gap-3">
          <div className="border-border-subtle bg-background-secondary rounded-lg border p-2.5">
            <BarChart3 className="text-success h-5 w-5" />
          </div>
          <h3 className="text-text-primary text-lg font-semibold">{t('categoryComparison')}</h3>
        </div>

        <div className="min-h-[320px] flex-1" dir="ltr">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={categoryTotals} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis
                type="number"
                tickFormatter={(value: number) => (hidden ? '' : formatAxisNumber(value, locale))}
                stroke="var(--color-border-subtle)"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: 'var(--color-border-subtle)' }}
                tickLine={{ stroke: 'var(--color-border-subtle)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                stroke="var(--color-border-subtle)"
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: 'var(--color-border-subtle)' }}
                tickLine={{ stroke: 'var(--color-border-subtle)' }}
              />
              <Tooltip content={<CategoryTooltip />} cursor={{ fill: 'var(--color-background-secondary)' }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={800}>
                {categoryTotals.map((cat) => (
                  <Cell key={`bar-${cat.categoryId}`} fill={cat.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Area Chart - Spending Trend */}
      <div className="border-border-subtle bg-background relative rounded-xl border p-6 shadow-sm lg:col-span-2">
        <div className="mb-6 flex items-center gap-3">
          <div className="border-border-subtle bg-background-secondary rounded-lg border p-2.5">
            <TrendingUp className="text-blue h-5 w-5" />
          </div>
          <h3 className="text-text-primary text-lg font-semibold">
            {granularity === 'daily' && t('dailyTrend')}
            {granularity === 'weekly' && t('weeklyTrend')}
            {granularity === 'monthly' && t('monthlyTrend')}
          </h3>
        </div>

        <div className="h-[280px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart
              data={timeSeriesTotals}
              // Farsi's compact notation spells out "میلیون"/"میلیارد" in full
              // instead of abbreviating to a single letter ("M"/"B"), so the
              // Y-axis needs extra breathing room to avoid clipping the widest tick.
              margin={{ left: locale === 'fa' ? 12 : 0, right: 20, top: 10, bottom: 0 }}
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
              <Tooltip
                content={(props) => <AreaTooltip {...props} granularity={granularity} />}
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
      </div>
    </div>
  );
}
