'use client';

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { PieChartIcon, BarChart3, TrendingUp } from 'lucide-react';
import { type Expense } from '@/lib/types/expense';
import { formatNumber, getCategoryLabel } from '@/lib/utils';

interface ExpenseChartsProps {
  expenses: Expense[];
  granularity?: 'daily' | 'weekly' | 'monthly';
}

const COLORS = ['#7c6aef', '#4ecdc4', '#f7b731', '#c56cf0', '#5ac8fa', '#ff6b6b', '#a3de83', '#ff9ff3'];

// Custom tooltip component - defined outside render to avoid React warnings
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { nameFa?: string; usdValue?: number } }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    // Display stored USD values directly from aggregated data
    const usdValue = data.payload.usdValue || 0;
    return (
      <div className="bg-zinc-800 border border-zinc-700 p-3 rounded-lg shadow-lg">
        <p className="text-white font-medium" dir="rtl">
          {formatNumber(data.value)} تومان
        </p>
        <p className="text-zinc-400 text-sm">
          ${usdValue.toFixed(2)} USD
        </p>
        {data.payload.nameFa && (
          <p className="text-zinc-400 text-sm" dir="rtl">
            {data.payload.nameFa}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function ExpenseCharts({ expenses, granularity = 'daily' }: ExpenseChartsProps) {
  // Calculate category totals - sum both currencies separately
  const categoryTotals = expenses.reduce((acc, exp) => {
    const existing = acc.find(item => item.category === exp.category);
    if (existing) {
      existing.value += exp.price_toman;
      existing.usdValue += exp.price_usd;
    } else {
      const labels = getCategoryLabel(exp.category);
      acc.push({
        category: exp.category,
        name: labels.en,
        nameFa: labels.fa,
        value: exp.price_toman,
        usdValue: exp.price_usd,
      });
    }
    return acc;
  }, [] as Array<{ category: string; name: string; nameFa: string; value: number; usdValue: number }>);

  categoryTotals.sort((a, b) => b.value - a.value);

  // Helper functions for date formatting
  const getWeekKey = (date: Date): string => {
    const year = date.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
  };

  const getMonthKey = (date: Date): string => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // Aggregate expenses based on granularity
  const aggregateExpenses = () => {
    if (expenses.length === 0) return [];

    const aggregated = new Map<string, { amount: number; usdValue: number }>();

    expenses.forEach(exp => {
      const date = new Date(exp.date);
      let key: string;

      switch (granularity) {
        case 'weekly':
          key = getWeekKey(date);
          break;
        case 'monthly':
          key = getMonthKey(date);
          break;
        case 'daily':
        default:
          key = exp.date;
          break;
      }

      const existing = aggregated.get(key);
      if (existing) {
        existing.amount += exp.price_toman;
        existing.usdValue += exp.price_usd;
      } else {
        aggregated.set(key, { amount: exp.price_toman, usdValue: exp.price_usd });
      }
    });

    return Array.from(aggregated.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const timeSeriesTotals = aggregateExpenses();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
      {/* Pie Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            By Category / بر اساس دسته‌بندی
          </h3>
        </div>
        <div className="h-[250px] sm:h-75">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Pie
                data={categoryTotals}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {categoryTotals.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2">
          {categoryTotals.map((cat, index) => (
            <div key={cat.category} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 truncate">
                {cat.name} / {cat.nameFa}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Category Comparison / مقایسه دسته‌بندی
          </h3>
        </div>
        <div className="h-[250px] sm:h-75">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={categoryTotals} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis
                type="number"
                tickFormatter={(value: number) => `${Math.round(value / 1_000_000)}M`}
                stroke="#71717a"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="nameFa"
                width={80}
                stroke="#71717a"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {categoryTotals.map((_, index) => (
                  <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Area Chart - Spending Trend */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 lg:col-span-2">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {granularity === 'daily' && 'Daily Spending Trend / روند هزینه روزانه'}
            {granularity === 'weekly' && 'Weekly Spending Trend / روند هزینه هفتگی'}
            {granularity === 'monthly' && 'Monthly Spending Trend / روند هزینه ماهانه'}
          </h3>
        </div>
        <div className="h-[200px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={timeSeriesTotals} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c6aef" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7c6aef" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.2} />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                tickFormatter={(value: string) => {
                  if (granularity === 'monthly') {
                    return value.slice(5); // Show MM
                  } else if (granularity === 'weekly') {
                    return value.split('-W')[1]; // Show week number
                  }
                  return value.slice(5); // Show MM-DD for daily
                }}
              />
              <YAxis
                stroke="#71717a"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                tickFormatter={(value: number) => `${Math.round(value / 1_000_000)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#7c6aef"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAmount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
