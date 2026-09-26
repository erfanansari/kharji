'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

import { usePrivacy } from '@features/privacy/PrivacyProvider';

import AnimatedMoney from '@components/AnimatedMoney';
import ChartTooltip from '@components/ChartTooltip';
import EmptyState from '@components/EmptyState';
import ErrorState from '@components/ErrorState';
import Select from '@components/Select';
import Pulse from '@components/Skeleton';

import { useCurrency } from '@hooks/use-currency';
import type { MoneyItem } from '@hooks/use-currency';
import { useLocalePreferences } from '@hooks/use-locale-preferences';
import { useMoneyText } from '@hooks/use-money-text';
import { type NetWorthRange, useNetWorthHistory } from '@hooks/use-net-worth-history';

import { formatAxisNumber, formatChartAxisDate, formatChartTooltipDate, resolveCalendar } from '@utils';

const RANGE_KEYS: { value: NetWorthRange; key: 'range1M' | 'range3M' | 'range6M' | 'range1Y' | 'rangeAll' }[] = [
  { value: '1M', key: 'range1M' },
  { value: '3M', key: 'range3M' },
  { value: '6M', key: 'range6M' },
  { value: '1Y', key: 'range1Y' },
  { value: 'ALL', key: 'rangeAll' },
];

// ─── Custom tooltip ──────────────────────────────────────────────────────────
// A point carries the valuations that were current on its date. Summing them
// per-record — each at its OWN valuation date — is the same path the assets
// page uses, which is what keeps the two totals equal.
function NetWorthTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload: { date: string; items: MoneyItem[] };
  }>;
}) {
  const locale = useLocale() as 'en' | 'fa';
  const { prefs } = useLocalePreferences();
  const calendar = resolveCalendar(prefs.calendar, locale);
  const { sumDisplay } = useMoneyText();
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const { primary, secondary } = sumDisplay(point.items ?? [], { compact: true });
  return (
    <ChartTooltip
      primary={primary}
      secondary={secondary ?? undefined}
      accent={{ text: formatChartTooltipDate(point.date, 'daily', locale, calendar), tone: 'success' }}
    />
  );
}

// ─── Delta badge ─────────────────────────────────────────────────────────────
// Shows only the absolute change over the range. A percentage would conflate
// asset contributions with performance — snapshots can't tell them apart.
function DeltaBadge({ data }: { data: Array<{ value: number }> }) {
  const { primaryCurrency } = useCurrency();
  const { delta, isPositive } = useMemo(() => {
    if (data.length < 2) return { delta: 0, isPositive: true };
    const d = data[data.length - 1].value - data[0].value;
    return { delta: d, isPositive: d >= 0 };
  }, [data]);

  if (data.length < 2) return null;

  const sign = isPositive ? '+' : '-';
  const color = isPositive ? 'text-success' : 'text-danger';

  return (
    <span className={`text-sm font-medium ${color}`}>
      {sign}
      <AnimatedMoney amount={Math.abs(delta)} currency={primaryCurrency} />
    </span>
  );
}

const NetWorthChart = () => {
  const t = useTranslations('pages.assets.netWorthChart');
  const locale = useLocale() as 'en' | 'fa';
  const { prefs: localePrefs } = useLocalePreferences();
  const calendar = resolveCalendar(localePrefs.calendar, locale);
  const rangeOptions = RANGE_KEYS.map((r) => ({ value: r.value, label: t(r.key) }));
  const [range, setRange] = useState<NetWorthRange>('6M');
  const { data, isLoading, isError, error, refetch } = useNetWorthHistory(range);
  const { sumTo, primaryCurrency } = useCurrency();
  const { hidden } = usePrivacy();

  const isShortRange = range === '1M' || range === '3M';

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const node = chartContainerRef.current;
    if (!node) return;
    setChartWidth(node.clientWidth);
    const observer = new ResizeObserver((entries) => {
      setChartWidth(entries[0].contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const formatXTick = useCallback(
    (value: number) => formatChartAxisDate(new Date(value), isShortRange ? 'day' : 'month', locale, calendar),
    [isShortRange, locale, calendar]
  );

  const hasData = !isLoading && !isError && data && data.length >= 2;
  const isEmpty = !isLoading && !isError && (!data || data.length < 2);

  // Project each point to an epoch-ms timestamp so the X-axis can use a real
  // time scale; categorical positioning made clustered snapshots collapse on top
  // of each other on narrow screens.
  //
  // `value` is summed into the PRIMARY currency here rather than left in the
  // pivot: the Y axis formats whatever it is handed, so plotting pivot rials
  // while the tooltip showed pounds left the two disagreeing by a factor of the
  // exchange rate. Each valuation converts at its own date, matching the assets
  // page exactly.
  const chartData = useMemo(
    () =>
      (data ?? []).map((p) => {
        const items: MoneyItem[] = p.items.map((i) => ({
          amount: i.amount,
          currency: i.currency,
          date: i.valuedAt,
          entryRate: i.entryRate,
        }));
        return { date: p.date, items, value: sumTo(items, primaryCurrency), timestamp: parseISO(p.date).getTime() };
      }),
    [data, sumTo, primaryCurrency]
  );

  const xDomain = useMemo<[number, number] | undefined>(() => {
    if (chartData.length === 0) return undefined;
    return [chartData[0].timestamp, chartData[chartData.length - 1].timestamp];
  }, [chartData]);

  // Build tick timestamps based on range: daily for short ranges anchor on first/last
  // and intermediate ticks; monthly for long ranges. Subsampled to fit width.
  const xAxisTicks = useMemo<number[] | undefined>(() => {
    if (chartData.length === 0 || !xDomain) return undefined;

    const [startTs, endTs] = xDomain;
    const startDate = new Date(startTs);

    if (isShortRange) {
      // Let Recharts auto-place ticks for short ranges (it positions them along
      // the time scale with minTickGap, which handles overlap correctly).
      return undefined;
    }

    // Monthly ticks at the 1st of each month within the visible domain.
    const monthlyTicks: number[] = [];
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    // Skip the first month-start if it falls before the domain start.
    if (cursor.getTime() < startTs) cursor.setMonth(cursor.getMonth() + 1);
    while (cursor.getTime() <= endTs) {
      monthlyTicks.push(cursor.getTime());
      cursor.setMonth(cursor.getMonth() + 1);
    }
    if (monthlyTicks.length === 0) return undefined;

    if (chartWidth === 0) return monthlyTicks;
    // ~70px per "MMM 'yy" label keeps adjacent labels from touching.
    const LABEL_WIDTH = 70;
    const maxTicks = Math.max(2, Math.floor(chartWidth / LABEL_WIDTH));
    if (monthlyTicks.length <= maxTicks) return monthlyTicks;

    const step = Math.ceil(monthlyTicks.length / maxTicks);
    return monthlyTicks.filter((_, i) => i % step === 0);
  }, [chartData, xDomain, isShortRange, chartWidth]);

  // Card shell — always rendered so range tabs stay accessible
  const cardHeader = (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="border-border-subtle bg-background-secondary rounded-lg border p-2.5">
          <TrendingUp className="text-success h-5 w-5" />
        </div>
        <h2 className="text-text-primary text-lg font-semibold">{t('title')}</h2>
      </div>
      <Select value={range} onChange={(val) => setRange(val as NetWorthRange)} options={rangeOptions} />
    </div>
  );

  if (isLoading) {
    return (
      <div className="border-border-subtle bg-background rounded-xl border p-5 shadow-sm sm:p-6">
        {/* Header skeleton — matches actual two-row mobile / one-row desktop layout */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Pulse className="h-10 w-10 shrink-0 rounded-lg" />
            <Pulse className="h-5 w-28" />
          </div>
          <Pulse className="h-9 w-32 self-start rounded-lg sm:self-auto" />
        </div>
        <Pulse className="h-[280px] w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-border-subtle bg-background rounded-xl border p-5 shadow-sm sm:p-6">
        {cardHeader}
        <ErrorState
          title={t('loadError')}
          description={error?.message}
          onRetry={() => refetch()}
          className="min-h-[280px]"
        />
      </div>
    );
  }

  return (
    <div className="border-border-subtle bg-background rounded-xl border p-5 shadow-sm sm:p-6">
      {cardHeader}

      {/* Delta badge */}
      {hasData && (
        <div className="mb-4">
          <DeltaBadge data={chartData} />
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <EmptyState
          icon={TrendingUp}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          className="min-h-[280px]"
        />
      )}

      {/* Chart */}
      {hasData && (
        <div ref={chartContainerRef} className="h-[280px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart
              data={chartData}
              // Farsi's compact notation spells out "میلیون"/"میلیارد" in full
              // instead of abbreviating to a single letter ("M"/"B"), so the
              // Y-axis needs extra breathing room to avoid clipping the widest tick.
              margin={{ left: locale === 'fa' ? 12 : 0, right: 20, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="var(--color-success)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" opacity={0.5} vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={xDomain ?? ['dataMin', 'dataMax']}
                stroke="var(--color-border-subtle)"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: 'var(--color-border-subtle)' }}
                tickLine={{ stroke: 'var(--color-border-subtle)' }}
                tickMargin={8}
                height={28}
                minTickGap={40}
                ticks={xAxisTicks}
                tickFormatter={formatXTick}
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
                content={<NetWorthTooltip />}
                cursor={{ stroke: 'var(--color-success)', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-success)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorNetWorth)"
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

export default NetWorthChart;
