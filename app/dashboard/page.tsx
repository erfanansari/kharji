'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { DateRangeSelector, type DateRange, filterExpensesByDateRange } from '@/components/date-range-selector';
import { type Expense } from '@/lib/types/expense';
import { TrendingUp, TrendingDown, DollarSign, Hash, BarChart3, Plus, MoreVertical, Minus } from 'lucide-react';
import { formatNumber, getCategoryLabel } from '@/lib/utils';

// Exchange Rate Card Component
function ExchangeRateCard() {
  const [rateData, setRateData] = useState<{ usd?: { value: string; change: number }; _meta?: { fetchedAt: string } } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const response = await fetch('/api/exchange-rate');
        if (response.ok) {
          const data = await response.json();
          setRateData(data);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRate();
  }, []);

  if (isLoading || !rateData?.usd) {
    return (
      <div className="bg-zinc-900 rounded-xl p-4 sm:p-6 border border-zinc-800 min-w-0">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
          </div>
          <MoreVertical className="h-4 w-4 text-zinc-400 cursor-pointer" />
        </div>
        <h3 className="text-xs sm:text-sm text-zinc-400 mb-2 sm:mb-3">Exchange Rate</h3>
        <p className="text-xs sm:text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  const { value, change } = rateData.usd;
  const rate = parseInt(value, 10);
  const isZero = change === 0;

  const lastUpdate = rateData._meta?.fetchedAt
    ? (() => {
        const date = new Date(rateData._meta.fetchedAt);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        return `${displayHours}:${displayMinutes} ${ampm}`;
      })()
    : '';

  return (
    <div className="bg-zinc-900 rounded-xl p-4 sm:p-6 border border-zinc-800 min-w-0">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
        </div>
        <MoreVertical className="h-4 w-4 text-zinc-400 cursor-pointer" />
      </div>
      <h3 className="text-xs sm:text-sm text-zinc-400 mb-2 sm:mb-3">Exchange Rate</h3>
      <div className="space-y-2 sm:space-y-3">
        <p className="text-xl sm:text-2xl font-bold text-emerald-400">
          ${formatNumber(rate)} Toman
        </p>
        <div className="flex items-center">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isZero
              ? 'bg-zinc-800 text-zinc-400'
              : change > 0
              ? 'bg-green-900/30 text-green-400'
              : 'bg-red-900/30 text-red-400'
          }`}>
            {isZero ? (
              <>
                <Minus className="h-3 w-3" />
                <span>No change</span>
              </>
            ) : (
              <>
                {change > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{change > 0 ? '+' : ''}{formatNumber(Math.abs(change))}</span>
              </>
            )}
          </div>
        </div>
        {lastUpdate && (
          <div className="flex flex-col text-xs">
            <span className="text-zinc-500">Updated</span>
            <span className="text-white">{lastUpdate}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const COLORS = ['#ef4444', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#22c55e', '#eab308', '#6366f1', '#64748b'];

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('ALL_TIME');

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const response = await fetch('/api/expenses');
        if (response.ok) {
          const data = await response.json();
          setExpenses(Array.isArray(data) ? data : (data.expenses || []));
        }
      } catch (error) {
        console.error('Failed to fetch expenses:', error);
      }
    };
    fetchExpenses();
  }, []);

  const filteredExpenses = useMemo(() => {
    return filterExpensesByDateRange(expenses, dateRange);
  }, [expenses, dateRange]);

  // Calculate real metrics from expenses
  const totalToman = filteredExpenses.reduce((sum, exp) => sum + exp.price_toman, 0);
  const totalUsd = filteredExpenses.reduce((sum, exp) => sum + exp.price_usd, 0);
  const transactionCount = filteredExpenses.length;

  // Calculate expenses this month vs last month for trend
  const thisMonthExpenses = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return filteredExpenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= startOfMonth;
    });
  }, [filteredExpenses]);

  const lastMonthExpenses = useMemo(() => {
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    return filteredExpenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= startOfLastMonth && expDate <= endOfLastMonth;
    });
  }, [filteredExpenses]);

  const thisMonthTotal = thisMonthExpenses.reduce((sum, exp) => sum + exp.price_usd, 0);
  const lastMonthTotal = lastMonthExpenses.reduce((sum, exp) => sum + exp.price_usd, 0);
  const monthOverMonthChange = lastMonthTotal > 0
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
    : 0;

  // Calculate category breakdown for cashflow
  const categoryData = useMemo(() => {
    const categoryTotals = filteredExpenses.reduce((acc, exp) => {
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

    return categoryTotals.sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <a
                  href="/transactions"
                  className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Add Transaction</span>
                  <span className="sm:hidden">Add</span>
                </a>
                <DateRangeSelector value={dateRange} onChange={setDateRange} />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Total Expenses */}
            <div className="bg-zinc-900 rounded-xl p-4 sm:p-6 border border-zinc-800 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-400" />
                </div>
                <MoreVertical className="h-4 w-4 text-zinc-400 cursor-pointer" />
              </div>
              <h3 className="text-xs sm:text-sm text-zinc-400 mb-2 sm:mb-3">Total Expenses / کل هزینه‌ها</h3>
              <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {formatNumber(totalToman)}
              </p>
              <p className="text-sm sm:text-base text-white mb-1 sm:mb-2" dir="rtl">تومان</p>
              <p className="text-xs text-zinc-400">
                ${totalUsd.toFixed(2)} USD
              </p>
            </div>

            {/* Transaction Count */}
            <div className="bg-zinc-900 rounded-xl p-4 sm:p-6 border border-zinc-800 min-w-0">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Hash className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                </div>
                <MoreVertical className="h-4 w-4 text-zinc-400 cursor-pointer" />
              </div>
              <h3 className="text-xs sm:text-sm text-zinc-400 mb-2 sm:mb-3">Number of Transactions / تعداد تراکنش</h3>
              <p className="text-2xl sm:text-3xl font-bold text-white">{transactionCount}</p>
            </div>

            {/* Average Daily Spending */}
            <div className="bg-zinc-900 rounded-xl p-4 sm:p-6 border border-zinc-800 min-w-0">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                </div>
                <MoreVertical className="h-4 w-4 text-zinc-400 cursor-pointer" />
              </div>
              <h3 className="text-xs sm:text-sm text-zinc-400 mb-2 sm:mb-3">Average Daily Spending / میانگین هزینه روزانه</h3>
              {(() => {
                const dates = filteredExpenses.map(exp => new Date(exp.date).getTime());
                const firstDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                firstDate.setHours(0, 0, 0, 0);
                const totalDays = Math.ceil((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const avgDailyToman = totalDays > 0 ? totalToman / totalDays : 0;
                const avgDailyUsd = totalDays > 0 ? totalUsd / totalDays : 0;
                return (
                  <>
                    <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
                      {formatNumber(avgDailyToman)}
                    </p>
                    <p className="text-sm sm:text-base text-white mb-1 sm:mb-2" dir="rtl">تومان</p>
                    <p className="text-xs text-zinc-400 mb-2">
                      ${avgDailyUsd.toFixed(2)} USD
                    </p>
                  </>
                );
              })()}
              {lastMonthTotal > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {monthOverMonthChange >= 0 ? (
                    <>
                      <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                      <span className="text-sm text-green-400">{Math.abs(monthOverMonthChange).toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-sm text-red-400">{Math.abs(monthOverMonthChange).toFixed(1)}%</span>
                    </>
                  )}
                  <span className="text-xs text-zinc-500 ml-1">vs last month</span>
                </div>
              )}
            </div>

            {/* Exchange Rate */}
            <ExchangeRateCard />

          </div>

          {/* Expenses by Category - Full Width */}
          {categoryData.length > 0 && (
            <div className="bg-zinc-900 rounded-xl p-4 sm:p-6 border border-zinc-800 overflow-x-hidden">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-semibold">Expenses by Category</h2>
              </div>

              <div className="space-y-2">
                {categoryData.map((cat, index) => (
                  <div key={cat.category} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-zinc-800/50 rounded-lg min-w-0">
                    <div
                      className="w-1.5 sm:w-2 h-6 sm:h-8 rounded shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs sm:text-sm font-medium truncate">{cat.name}</span>
                          <span className="text-[10px] sm:text-xs text-zinc-400 truncate" dir="rtl">{cat.nameFa}</span>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-xs sm:text-sm font-bold whitespace-nowrap" dir="rtl">
                            {formatNumber(cat.value)} تومان
                          </span>
                          <span className="text-[10px] sm:text-xs text-zinc-400 whitespace-nowrap">
                            ${cat.usdValue.toFixed(2)} USD
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-700 rounded-full h-1 sm:h-1.5">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${totalToman > 0 ? (cat.value / totalToman) * 100 : 0}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

