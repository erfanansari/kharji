'use client';

import { Calendar } from 'lucide-react';

export type DateRange = '7D' | '30D' | 'THIS_MONTH' | 'LAST_MONTH' | 'YTD' | 'ALL_TIME';

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const options: { value: DateRange; label: string; labelFa: string }[] = [
    { value: '7D', label: '7 Days', labelFa: '۷ روز' },
    { value: '30D', label: '30 Days', labelFa: '۳۰ روز' },
    { value: 'THIS_MONTH', label: 'This Month', labelFa: 'این ماه' },
    { value: 'LAST_MONTH', label: 'Last Month', labelFa: 'ماه گذشته' },
    { value: 'YTD', label: 'Year to Date', labelFa: 'از ابتدای سال' },
    { value: 'ALL_TIME', label: 'All Time', labelFa: 'همه' },
  ];

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DateRange)}
        className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} / {option.labelFa}
          </option>
        ))}
      </select>
    </div>
  );
}

export function getDateRangeFilter(range: DateRange): { start: Date; end: Date } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  let start = new Date(today);

  switch (range) {
    case '7D':
      start.setDate(today.getDate() - 6); // Last 7 days including today
      break;
    case '30D':
      start.setDate(today.getDate() - 29); // Last 30 days including today
      break;
    case 'THIS_MONTH':
      start = new Date(today.getFullYear(), today.getMonth(), 1); // 1st of current month
      break;
    case 'LAST_MONTH':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1); // 1st of last month
      end.setDate(0); // Last day of previous month
      break;
    case 'YTD':
      start = new Date(today.getFullYear(), 0, 1); // Jan 1 of current year
      break;
    case 'ALL_TIME':
      return null; // No filter
    default:
      return null;
  }

  return { start, end };
}

export function filterExpensesByDateRange<T extends { date: string }>(
  expenses: T[],
  range: DateRange
): T[] {
  const filter = getDateRangeFilter(range);

  if (!filter) {
    return expenses; // ALL_TIME
  }

  const { start, end } = filter;

  return expenses.filter(exp => {
    const expDate = new Date(exp.date);
    expDate.setHours(0, 0, 0, 0);
    return expDate >= start && expDate <= end;
  });
}

export function getChartGranularity(range: DateRange): 'daily' | 'weekly' | 'monthly' {
  const filter = getDateRangeFilter(range);

  if (!filter) {
    // For ALL_TIME, we need to calculate based on actual data
    return 'monthly';
  }

  const { start, end } = filter;
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (daysDiff <= 31) {
    return 'daily';
  } else if (daysDiff <= 180) {
    return 'weekly';
  } else {
    return 'monthly';
  }
}
