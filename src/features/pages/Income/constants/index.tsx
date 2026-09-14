import type { useTranslations } from 'next-intl';

import { type ColumnDef } from '@tanstack/react-table';
import { Edit2, Trash2 } from 'lucide-react';

import type { Income } from '@types';

import ActionButtons from '@components/ActionButtons';
import Money from '@components/Money';
import type { RowAction } from '@components/RowActionSheet';

import { useMonthYearDisplay } from '@hooks/use-month-year-display';

// Primary is the month+year in the resolved calendar (Jalali for fa, Gregorian
// otherwise); the other calendar's equivalent is an optional secondary caption,
// gated by the user's secondary-date-captions preference — see useMonthYearDisplay.
function IncomeMonthCell({ month, year }: { month: number; year: number }) {
  const monthYearDisplay = useMonthYearDisplay();
  const { primary, secondary } = monthYearDisplay(month, year);
  return (
    <div className="flex flex-col">
      <span className="text-text-primary text-sm font-medium whitespace-nowrap">{primary}</span>
      {secondary && (
        <span className="text-text-muted text-xs whitespace-nowrap" dir="rtl">
          {secondary}
        </span>
      )}
    </div>
  );
}

// ─── Table layout config ──────────────────────────────────────────────────────
// Centralized so column widths can be tuned in one place. Percentages must sum
// to 100; `INCOME_TABLE_MIN_WIDTH` is the smallest width the table is allowed
// to shrink to before triggering horizontal scroll on narrow viewports.

export const INCOME_TABLE_MIN_WIDTH = 'min-w-[720px]';

export const INCOME_COLUMN_WIDTHS = {
  month: 'w-[18%]',
  type: 'w-[15%]',
  source: 'w-[24%]',
  amount: 'w-[32%]',
  actions: 'w-[11%]',
} as const;

// ─── Mobile card ──────────────────────────────────────────────────────────────
// The table is already grouped by year under its own heading, so the card leads
// with the month and drops the year caption's redundancy onto the second line
// alongside the source.

export function buildIncomeMobileCard(incomeTypeLabel: (value: string) => string) {
  return function IncomeMobileCard(income: Income) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <IncomeMonthCell month={income.month} year={income.year} />
          <Money
            amount={income.amount}
            currency={income.currency}
            date={`${income.year}-${String(income.month).padStart(2, '0')}-01`}
            entryRate={income.entryRate}
            className="shrink-0 items-end"
            primaryClassName="text-success text-sm font-semibold tabular-nums whitespace-nowrap"
            secondaryClassName="text-text-muted text-xs tabular-nums whitespace-nowrap"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-text-secondary truncate text-xs">{incomeTypeLabel(income.incomeType)}</span>
          {income.source && <span className="text-text-muted truncate text-xs">{income.source}</span>}
        </div>
      </div>
    );
  };
}

export function buildIncomeRowActions(
  t: ReturnType<typeof useTranslations<'tables'>>,
  handleEdit: (income: Income) => void,
  openDeleteModal: (income: Income) => void,
  deletingId: number | null
) {
  return (income: Income): RowAction[] => [
    { id: 'edit', icon: Edit2, label: t('edit'), onSelect: () => handleEdit(income) },
    {
      id: 'delete',
      icon: Trash2,
      label: t('delete'),
      danger: true,
      busy: deletingId === income.id,
      onSelect: () => openDeleteModal(income),
    },
  ];
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function buildIncomeColumns(
  t: ReturnType<typeof useTranslations<'tables'>>,
  incomeTypeLabel: (value: string) => string,
  handleEdit: (income: Income) => void,
  openDeleteModal: (income: Income) => void,
  deletingId: number | null
): ColumnDef<Income, unknown>[] {
  return [
    {
      id: 'month',
      accessorKey: 'month',
      header: t('income.month'),
      meta: { widthClass: INCOME_COLUMN_WIDTHS.month },
      cell: ({ row }) => <IncomeMonthCell month={row.original.month} year={row.original.year} />,
    },
    {
      id: 'incomeType',
      accessorKey: 'incomeType',
      header: t('income.type'),
      meta: { widthClass: INCOME_COLUMN_WIDTHS.type },
      cell: ({ row }) => (
        <span className="text-text-primary text-sm font-medium whitespace-nowrap">
          {incomeTypeLabel(row.original.incomeType)}
        </span>
      ),
    },
    {
      id: 'source',
      accessorKey: 'source',
      header: t('income.source'),
      meta: { widthClass: INCOME_COLUMN_WIDTHS.source },
      cell: ({ row }) => (
        <span className="text-text-secondary block truncate text-sm">{row.original.source || '-'}</span>
      ),
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: t('income.amount'),
      meta: { widthClass: INCOME_COLUMN_WIDTHS.amount, align: 'end' as const },
      cell: ({ row }) => {
        const income = row.original;
        return (
          <Money
            amount={income.amount}
            currency={income.currency}
            date={`${income.year}-${String(income.month).padStart(2, '0')}-01`}
            entryRate={income.entryRate}
            className="items-end"
            primaryClassName="text-success text-sm font-semibold whitespace-nowrap"
            secondaryClassName="text-text-muted text-xs whitespace-nowrap"
          />
        );
      },
    },
    {
      id: 'actions',
      header: t('actions'),
      meta: { widthClass: INCOME_COLUMN_WIDTHS.actions, align: 'center' as const },
      cell: ({ row }) => {
        const income = row.original;
        return (
          <ActionButtons
            onEdit={() => handleEdit(income)}
            onDelete={() => openDeleteModal(income)}
            isDeleting={deletingId === income.id}
          />
        );
      },
    },
  ];
}
