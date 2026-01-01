'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ExpenseCharts } from '@/components/expense-charts';
import { ExpenseStats } from '@/components/expense-stats';
import { DateRangeSelector, type DateRange, filterExpensesByDateRange, getChartGranularity } from '@/components/date-range-selector';
import { type Expense } from '@/lib/types/expense';
import { BarChart3, Download, Filter } from 'lucide-react';

export default function ReportsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('ALL_TIME');

  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/expenses');
        if (response.ok) {
          const data = await response.json();
          setExpenses(Array.isArray(data) ? data : (data.expenses || []));
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpenses();
  }, []);

  const filteredExpenses = useMemo(() => {
    return filterExpensesByDateRange(expenses, dateRange);
  }, [expenses, dateRange]);

  const chartGranularity = useMemo(() => {
    return getChartGranularity(dateRange);
  }, [dateRange]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-zinc-950 text-white">
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Reports</h1>
                  <p className="text-sm text-zinc-400">Analyze your spending patterns</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </button>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Date Range Selector */}
          <div className="mb-6">
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
          </div>

          {/* Statistics */}
          {!isLoading && (
            <div className="mb-6">
              <ExpenseStats expenses={filteredExpenses} />
            </div>
          )}

          {/* Charts */}
          {!isLoading && filteredExpenses.length > 0 ? (
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <ExpenseCharts expenses={filteredExpenses} granularity={chartGranularity} />
            </div>
          ) : isLoading ? (
            <div className="bg-zinc-900 rounded-xl p-12 border border-zinc-800 text-center">
              <p className="text-zinc-400">Loading reports...</p>
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-xl p-12 border border-zinc-800 text-center">
              <p className="text-zinc-400">No data available for the selected period</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

