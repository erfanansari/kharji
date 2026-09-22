/** 'payable' = I owe it. 'receivable' = it is owed to me. */
export type DebtDirection = 'payable' | 'receivable';

export interface Debt {
  id: number;
  userId: number;
  direction: DebtDirection;
  counterparty: string;
  /** Amount in the entry currency. */
  amount: number;
  /** Entry currency code (see src/constants/currencies.ts). */
  currency: string;
  /** Rate to the pivot at `incurredAt` (frozen snapshot). */
  entryRate: number;
  /** yyyy-MM-dd — the day the debt came into being, not the day it was typed. */
  incurredAt: string;
  dueDate: string | null;
  note: string | null;
  /** ISO timestamp, or null while the debt is still outstanding. */
  settledAt: string | null;
  /**
   * The cash/bank account the settlement moved, or null for a
   * bookkeeping-only settlement (the default). Goes null — not deleted — when
   * the account is deleted, because the settlement still happened.
   */
  settledAssetId: number | null;
  /** SIGNED, in `settledCurrency`. Positive = money left the account. */
  settledDelta: number | null;
  settledCurrency: string | null;
  /** The account itself, joined for display. Null when untracked or deleted. */
  settledFrom: DebtSettledFrom | null;
  createdAt: string;
  updatedAt: string;
}

export interface DebtSettledFrom {
  id: number;
  name: string;
  category: string;
  currency: string;
}

export interface CreateDebtInput {
  direction: DebtDirection;
  counterparty: string;
  amount: number;
  currency: string;
  incurredAt: string;
  dueDate?: string | null;
  note?: string | null;
}

export type UpdateDebtInput = Partial<CreateDebtInput>;
