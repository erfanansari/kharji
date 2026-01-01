'use client';

import { useState, useEffect, useMemo } from 'react';
import { ExpenseForm } from '@/components/expense-form';
import { ExpenseList } from '@/components/expense-list';
import { ExpenseStats } from '@/components/expense-stats';
import { ExpenseCharts } from '@/components/expense-charts';
import { ExchangeRateIndicator } from '@/components/exchange-rate-indicator';
import { DateRangeSelector, type DateRange, filterExpensesByDateRange, getChartGranularity } from '@/components/date-range-selector';
import { type Expense } from '@/lib/types/expense';

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange>('ALL_TIME');

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/expenses');
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [refreshTrigger]);

  const handleExpenseChange = () => {
    setRefreshTrigger(prev => prev + 1);
    setEditingExpense(undefined);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingExpense(undefined);
  };

  // Filter expenses based on selected date range
  const filteredExpenses = useMemo(() => {
    return filterExpensesByDateRange(expenses, dateRange);
  }, [expenses, dateRange]);

  // Get chart granularity based on date range
  const chartGranularity = useMemo(() => {
    return getChartGranularity(dateRange);
  }, [dateRange]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Kharji / <span className="text-zinc-600 dark:text-zinc-50">خرجی</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Track your personal expenses / هزینه‌های شخصی خود را ردیابی کنید
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:gap-3">
            <ExchangeRateIndicator />
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        {/* Statistics Cards */}
        {!isLoading && <ExpenseStats expenses={filteredExpenses} />}

        {/* Add New Expense Form */}
        <div className="mt-4 sm:mt-6">
          <ExpenseForm
            onExpenseAdded={handleExpenseChange}
            editingExpense={editingExpense}
            onCancelEdit={handleCancelEdit}
          />
        </div>

        {/* Charts */}
        {!isLoading && filteredExpenses.length > 0 && (
          <div className="mt-4 sm:mt-6">
            <ExpenseCharts expenses={filteredExpenses} granularity={chartGranularity} />
          </div>
        )}

        {/* Expense Table */}
        <div className="mt-4 sm:mt-6">
          <ExpenseList
            refreshTrigger={refreshTrigger}
            onDelete={handleExpenseChange}
            onEdit={handleEdit}
          />
        </div>
      </main>
    </div>
  );
}
