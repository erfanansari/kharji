import type { Debt } from '@types';

export interface DebtFormProps {
  onDebtAdded: () => void;
  editingDebt?: Debt;
  onCancelEdit?: () => void;
  setIsDirty?: (dirty: boolean) => void;
}
