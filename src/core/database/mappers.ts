import type { Asset, AssetValuation } from '@/@types/asset';
import type { Debt, DebtSettledFrom } from '@/@types/debt';
import type { Category, Expense, ExpensePaidFrom, Tag } from '@/@types/expense';
import type { Income } from '@/@types/income';
import type { ExpenseRepeat } from '@/@types/recurring';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

export function mapRowToIncome(row: DbRow): Income {
  return {
    id: row.id as number,
    userId: row.userId as number,
    amount: row.amount as number,
    currency: row.currency as string,
    entryRate: row.entryRate as number,
    month: row.month as number,
    year: row.year as number,
    incomeType: row.incomeType as Income['incomeType'],
    source: row.source as string | null,
    notes: row.notes as string | null,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export function mapRowToAsset(row: DbRow): Asset {
  return {
    id: row.id as number,
    userId: row.userId as number,
    category: row.category as Asset['category'],
    name: row.name as string,
    quantity: row.quantity as number,
    unit: row.unit as string | null,
    unitValue: row.unitValue as number | null,
    amount: row.amount as number,
    currency: row.currency as string,
    entryRate: row.entryRate as number,
    linkedItem: (row.linkedItem as string | null) ?? null,
    notes: row.notes as string | null,
    lastValuedAt: row.lastValuedAt as string,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export function mapRowToDebt(row: DbRow, settledFrom?: DebtSettledFrom): Debt {
  return {
    id: row.id as number,
    userId: row.userId as number,
    direction: row.direction as Debt['direction'],
    counterparty: row.counterparty as string,
    amount: row.amount as number,
    currency: row.currency as string,
    entryRate: row.entryRate as number,
    incurredAt: row.incurredAt as string,
    dueDate: (row.dueDate as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    settledAt: (row.settledAt as string | null) ?? null,
    settledAssetId: (row.settledAssetId as number | null) ?? null,
    settledDelta: (row.settledDelta as number | null) ?? null,
    settledCurrency: (row.settledCurrency as string | null) ?? null,
    settledFrom: settledFrom ?? null,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export function mapRowToAssetValuation(row: DbRow): AssetValuation {
  return {
    id: row.id as number,
    assetId: row.assetId as number,
    quantity: row.quantity as number,
    unitValue: row.unitValue as number | null,
    amount: row.amount as number,
    currency: row.currency as string,
    entryRate: row.entryRate as number,
    valuedAt: row.valuedAt as string,
    source: (row.source as string | null) ?? null,
    createdAt: row.createdAt as string,
  };
}

export function mapRowToExpense(
  row: DbRow,
  category: Category,
  tags?: Tag[],
  repeat?: ExpenseRepeat,
  paidFrom?: ExpensePaidFrom
): Expense {
  return {
    id: row.id as number,
    date: row.date as string,
    category,
    description: row.description as string,
    amount: row.amount as number,
    currency: row.currency as string,
    entryRate: row.entryRate as number,
    recurringId: (row.recurringId as number | null) ?? null,
    repeat: repeat ?? null,
    paidFromAssetId: (row.paidFromAssetId as number | null) ?? null,
    paidFromDelta: (row.paidFromDelta as number | null) ?? null,
    paidFromCurrency: (row.paidFromCurrency as string | null) ?? null,
    paidFrom: paidFrom ?? null,
    created_at: row.created_at as string,
    tags: tags ?? [],
  };
}
