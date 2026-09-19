import type { ExpenseFilters, ExpenseSummary } from '@api/getExpenseListQuery';

import type { Expense } from '@types';

export interface ExpensesTableProps {
  expenses: Expense[];
  summary: ExpenseSummary;
  isLoading: boolean;
  error: Error | null;
  filters: ExpenseFilters;
  descInput: string;
  onDescInputChange: (value: string) => void;
  onFiltersChange: (updater: (prev: ExpenseFilters) => ExpenseFilters) => void;
  onRowClick: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  deletingId: number | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}
