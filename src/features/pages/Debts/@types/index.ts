import type { Debt } from '@types';

export interface DebtsSummaryProps {
  debts: Debt[];
}

export interface DebtsTableProps {
  debts: Debt[];
  isLoading: boolean;
  error: Error | null;
  onSettle: (debt: Debt) => void;
  onUnsettle: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onRetry: () => void;
  deletingId: number | null;
  settlingId: number | null;
}
