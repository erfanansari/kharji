'use client';

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { PieChartIcon, BarChart3, TrendingUp } from 'lucide-react';
import { type Expense } from '@/lib/types/expense';
import { formatNumber, getCategoryLabel } from '@/lib/utils';

interface ExpenseChartsProps {
  expenses: Expense[];
}

const COLORS = ['#7c6aef', '#4ecdc4', '#f7b731', '#c56cf0', '#5ac8fa', '#ff6b6b', '#a3de83', '#ff9ff3'];

// Custom tooltip component - defined outside render to avoid React warnings
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { nameFa?: string; usdValue?: number } }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    // Display stored USD values directly from aggregated data
    const usdValue = data.payload.usdValue || 0;
    return (
      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-lg shadow-lg">
        <p className="text-zinc-900 dark:text-zinc-100 font-medium" dir="rtl">
          {formatNumber(data.value)} تومان
        </p>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm">
          ${usdValue.toFixed(2)} USD
        </p>
        {data.payload.nameFa && (
          <p className="text-zinc-600 dark:text-zinc-400 text-sm" dir="rtl">
            {data.payload.nameFa}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function ExpenseCharts({ expenses }: ExpenseChartsProps) {
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

  // Calculate daily totals for area chart - sum both currencies separately
  const dailyTotals = expenses.reduce((acc, exp) => {
    const existing = acc.find(item => item.date === exp.date);
    if (existing) {
      existing.amount += exp.price_toman;
      existing.usdValue += exp.price_usd;
    } else {
      acc.push({ date: exp.date, amount: exp.price_toman, usdValue: exp.price_usd });
    }
    return acc;
  }, [] as Array<{ date: string; amount: number; usdValue: number }>);

  dailyTotals.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Pie Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            By Category / بر اساس دسته‌بندی
          </h3>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
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
        <div className="mt-4 grid grid-cols-2 gap-2">
          {categoryTotals.map((cat, index) => (
            <div key={cat.category} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                {cat.name} / {cat.nameFa}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Category Comparison / مقایسه دسته‌بندی
          </h3>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryTotals} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis
                type="number"
                tickFormatter={(value: number) => `${Math.round(value / 1_000_000)}M`}
                stroke="#666"
                tick={{ fill: '#999', fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="nameFa"
                width={80}
                stroke="#666"
                tick={{ fill: '#999', fontSize: 12 }}
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

      {/* Area Chart - Daily Spending */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-6 lg:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Daily Spending Trend / روند هزینه روزانه
          </h3>
        </div>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTotals} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c6aef" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7c6aef" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
              <XAxis
                dataKey="date"
                stroke="#666"
                tick={{ fill: '#999', fontSize: 12 }}
                tickFormatter={(value: string) => value.slice(5)}
              />
              <YAxis
                stroke="#666"
                tick={{ fill: '#999', fontSize: 12 }}
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
