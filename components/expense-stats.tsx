'use client';

import { TrendingUp, Hash, BarChart3 } from 'lucide-react';
import { type Expense } from '@/lib/types/expense';
import { formatNumber } from '@/lib/utils';

interface ExpenseStatsProps {
  expenses: Expense[];
}

export function ExpenseStats({ expenses }: ExpenseStatsProps) {
  const totalToman = expenses.reduce((sum, exp) => sum + exp.price_toman, 0);
  const totalUsd = expenses.reduce((sum, exp) => sum + exp.price_usd, 0);
  const avgToman = expenses.length > 0 ? totalToman / expenses.length : 0;
  const avgUsd = expenses.length > 0 ? totalUsd / expenses.length : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Expenses */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Total Expenses / کل هزینه‌ها
          </h3>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50" dir="rtl">
            {formatNumber(totalToman)} تومان
          </p>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            ${totalUsd.toFixed(2)} USD
          </p>
        </div>
      </div>

      {/* Number of Transactions */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Number of Transactions / تعداد تراکنش
          </h3>
        </div>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {expenses.length}
        </p>
      </div>

      {/* Average Expense */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Average Expense / میانگین هزینه
          </h3>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50" dir="rtl">
            {formatNumber(avgToman)} تومان
          </p>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            ${avgUsd.toFixed(2)} USD
          </p>
        </div>
      </div>
    </div>
  );
}
