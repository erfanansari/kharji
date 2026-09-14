import type { useTranslations } from 'next-intl';

import { type ColumnDef } from '@tanstack/react-table';
import { Edit2, Landmark, Repeat, Tag, Trash2 } from 'lucide-react';

import type { Expense } from '@types';

import ActionButtons from '@components/ActionButtons';
import CategoryBadge from '@components/CategoryBadge';
import Money from '@components/Money';
import type { RowAction } from '@components/RowActionSheet';

import { useAppDate } from '@hooks/use-app-date';

// The primary/secondary calendar pair depends on locale + calendar preference,
// so this needs its own component to call the hook (react-table cells are plain
// render functions, not stable components).
function ExpenseDateCell({ date }: { date: string }) {
  const appDate = useAppDate();
  const { primary, secondary } = appDate(date);
  return (
    <div className="flex flex-col">
      <span className="text-text-primary text-sm whitespace-nowrap">{primary}</span>
      {secondary && (
        <span className="text-text-muted text-xs whitespace-nowrap" dir="auto">
          {secondary}
        </span>
      )}
    </div>
  );
}

// ─── Table layout config ──────────────────────────────────────────────────────
// Centralized so column widths can be tuned in one place. Percentages must sum
// to 100; `EXPENSE_TABLE_MIN_WIDTH` is the smallest width the table is allowed
// to shrink to before triggering horizontal scroll on narrow viewports — bump
// it when a column needs more room.

export const EXPENSE_TABLE_MIN_WIDTH = 'min-w-[820px]';

export const EXPENSE_COLUMN_WIDTHS = {
  description: 'w-[24%]',
  category: 'w-[26%]',
  date: 'w-[16%]',
  amount: 'w-[24%]',
  actions: 'w-[10%]',
} as const;

// ─── Mobile card ──────────────────────────────────────────────────────────────
// Below `sm` the table becomes a list of these. Only the four things worth
// scanning survive: what it was, how much, which category, when. Tags, the
// account and the exchange rate stay in the details drawer a tap away — a card
// that reprints the whole row is just the table with extra steps.

export function buildExpenseMobileCard(t: ReturnType<typeof useTranslations<'tables'>>) {
  return function ExpenseMobileCard(expense: Expense) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-text-primary truncate text-sm font-medium">{expense.description}</span>
            {expense.recurringId !== null && (
              <Repeat className="text-text-muted h-3.5 w-3.5 shrink-0" aria-label={t('expenses.generated')} />
            )}
            {expense.paidFrom && (
              <Landmark className="text-text-muted h-3.5 w-3.5 shrink-0" aria-label={expense.paidFrom.name} />
            )}
          </span>
          <Money
            amount={expense.amount}
            currency={expense.currency}
            date={expense.date}
            entryRate={expense.entryRate}
            className="shrink-0 items-end"
            primaryClassName="text-text-primary text-sm font-semibold tabular-nums whitespace-nowrap"
            secondaryClassName="text-text-muted text-xs tabular-nums whitespace-nowrap"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <CategoryBadge category={expense.category} className="min-w-0" />
          <ExpenseDateCell date={expense.date} />
        </div>
      </div>
    );
  };
}

export function buildExpenseRowActions(
  t: ReturnType<typeof useTranslations<'tables'>>,
  handleEdit: (expense: Expense) => void,
  openDeleteModal: (expense: Expense) => void,
  deletingId: number | null
) {
  return (expense: Expense): RowAction[] => [
    { id: 'edit', icon: Edit2, label: t('edit'), onSelect: () => handleEdit(expense) },
    {
      id: 'delete',
      icon: Trash2,
      label: t('delete'),
      danger: true,
      busy: deletingId === expense.id,
      onSelect: () => openDeleteModal(expense),
    },
  ];
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function buildExpenseColumns(
  t: ReturnType<typeof useTranslations<'tables'>>,
  handleEdit: (expense: Expense) => void,
  openDeleteModal: (expense: Expense) => void,
  deletingId: number | null
): ColumnDef<Expense, unknown>[] {
  return [
    {
      id: 'description',
      accessorKey: 'description',
      header: t('expenses.description'),
      meta: { widthClass: EXPENSE_COLUMN_WIDTHS.description },
      cell: ({ row }) => {
        const expense = row.original;
        return (
          <div className="flex min-w-0 flex-col gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="text-text-primary truncate text-sm font-medium">{expense.description}</span>
              {/* Marks a row the user didn't type — posted by a recurring rule.
                  Icon-only with a tooltip so it never crowds the description. */}
              {expense.recurringId !== null && (
                <span className="inline-flex shrink-0" title={t('expenses.generated')}>
                  <Repeat className="text-text-muted h-3.5 w-3.5" aria-label={t('expenses.generated')} />
                </span>
              )}
              {/* Which account paid, as a marker rather than a column: it's
                  empty for most rows, and a sixth column would spend ~14% of
                  the table's width on it. The name lives in the tooltip and
                  the details drawer. */}
              {expense.paidFrom && (
                <span className="inline-flex shrink-0" title={expense.paidFrom.name}>
                  <Landmark className="text-text-muted h-3.5 w-3.5" aria-label={expense.paidFrom.name} />
                </span>
              )}
            </span>
            {expense.tags && expense.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {expense.tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="border-border-subtle bg-background-elevated text-text-secondary flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium"
                  >
                    <Tag className="h-3 w-3" aria-hidden="true" />
                    <span>{tag.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: t('expenses.category'),
      meta: { widthClass: EXPENSE_COLUMN_WIDTHS.category },
      cell: ({ row }) => (
        <div className="flex max-w-full min-w-0">
          <CategoryBadge category={row.original.category} className="max-w-full" />
        </div>
      ),
    },
    {
      id: 'date',
      accessorKey: 'date',
      header: t('expenses.date'),
      meta: { widthClass: EXPENSE_COLUMN_WIDTHS.date },
      cell: ({ row }) => <ExpenseDateCell date={row.original.date} />,
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: t('expenses.amount'),
      meta: { widthClass: EXPENSE_COLUMN_WIDTHS.amount, align: 'end' as const },
      cell: ({ row }) => {
        const expense = row.original;
        return (
          <Money
            amount={expense.amount}
            currency={expense.currency}
            date={expense.date}
            entryRate={expense.entryRate}
            className="items-end"
            primaryClassName="text-text-primary text-sm font-semibold whitespace-nowrap"
            secondaryClassName="text-text-muted text-xs whitespace-nowrap"
          />
        );
      },
    },
    {
      id: 'actions',
      header: t('actions'),
      meta: { widthClass: EXPENSE_COLUMN_WIDTHS.actions, align: 'center' as const },
      cell: ({ row }) => {
        const expense = row.original;
        return (
          <ActionButtons
            onEdit={() => handleEdit(expense)}
            onDelete={() => openDeleteModal(expense)}
            isDeleting={deletingId === expense.id}
          />
        );
      },
    },
  ];
}
