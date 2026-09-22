import type { useTranslations } from 'next-intl';

import { type ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, Edit2, RotateCcw, Trash2 } from 'lucide-react';

import type { Debt } from '@types';

import Money from '@components/Money';
import type { RowAction } from '@components/RowActionSheet';

import { useAppDate } from '@hooks/use-app-date';

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Outstanding and past its agreed date. The one affordance this feature needs
 *  beyond bookkeeping, and it costs a string comparison. */
export function isOverdue(debt: Debt): boolean {
  return debt.settledAt === null && debt.dueDate !== null && debt.dueDate < todayIso();
}

/** Money leaves for a payable, arrives for a receivable — so the amount wears
 *  the same colours those directions wear everywhere else in the app. */
export function amountClassName(debt: Debt): string {
  if (debt.settledAt !== null) return 'text-text-muted text-sm font-medium whitespace-nowrap line-through';
  return debt.direction === 'payable'
    ? 'text-danger text-sm font-semibold whitespace-nowrap'
    : 'text-success text-sm font-semibold whitespace-nowrap';
}

// ─── Table layout config ──────────────────────────────────────────────────────
// Percentages must sum to 100; the min width is the smallest the table may
// shrink to before it scrolls horizontally.

export const DEBT_TABLE_MIN_WIDTH = 'min-w-[760px]';

export const DEBT_COLUMN_WIDTHS = {
  counterparty: 'w-[26%]',
  incurredAt: 'w-[13%]',
  dueDate: 'w-[15%]',
  amount: 'w-[24%]',
  status: 'w-[11%]',
  actions: 'w-[11%]',
} as const;

// Dates follow the user's calendar and secondary-caption preferences (Jalali for
// fa), the same as the expenses table. The hook has to live in a component —
// react-table cells are plain render functions, not stable components.
function DebtDateCell({ date }: { date: string }) {
  const appDate = useAppDate();
  const { primary, secondary } = appDate(date);
  return (
    <div className="flex flex-col">
      <span className="text-text-secondary text-sm whitespace-nowrap">{primary}</span>
      {secondary && (
        <span className="text-text-muted text-xs whitespace-nowrap" dir="auto">
          {secondary}
        </span>
      )}
    </div>
  );
}

// ─── Status ───────────────────────────────────────────────────────────────────

function StatusCell({ debt, t }: { debt: Debt; t: ReturnType<typeof useTranslations<'tables'>> }) {
  if (debt.settledAt !== null) {
    return (
      <span className="text-success inline-flex items-center gap-1.5 text-xs font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        {t('debts.settled')}
      </span>
    );
  }
  return <span className="text-text-muted text-xs">{t('debts.outstanding')}</span>;
}

function DueDateWarning({ date }: { date: string }) {
  const appDate = useAppDate();
  return <span className="text-warning text-sm font-medium whitespace-nowrap">{appDate(date).primary}</span>;
}

function DueCell({ debt, t }: { debt: Debt; t: ReturnType<typeof useTranslations<'tables'>> }) {
  if (debt.dueDate === null) {
    return <span className="text-text-muted text-xs">{t('debts.noDueDate')}</span>;
  }
  const overdue = isOverdue(debt);
  // Overdue takes over the caption slot: "how late" matters more than the
  // other calendar's rendering of the same date.
  if (!overdue) return <DebtDateCell date={debt.dueDate} />;
  return (
    <div className="flex flex-col">
      <DueDateWarning date={debt.dueDate} />
      <span className="text-warning text-xs">{t('debts.overdue')}</span>
    </div>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────
// The table is already grouped by direction under its own heading, so the card
// leads with who it is with and puts the due date and status on line two.

export function buildDebtMobileCard(t: ReturnType<typeof useTranslations<'tables'>>) {
  return function DebtMobileCard(debt: Debt) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <span className="text-text-primary truncate text-sm font-medium">{debt.counterparty}</span>
          <Money
            amount={debt.amount}
            currency={debt.currency}
            date={debt.incurredAt}
            entryRate={debt.entryRate}
            className="shrink-0 items-end"
            primaryClassName={amountClassName(debt)}
            secondaryClassName="text-text-muted text-xs tabular-nums whitespace-nowrap"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <DueCell debt={debt} t={t} />
          <StatusCell debt={debt} t={t} />
        </div>
      </div>
    );
  };
}

// ─── Row actions ──────────────────────────────────────────────────────────────

export function buildDebtRowActions(
  t: ReturnType<typeof useTranslations<'tables'>>,
  onSettle: (debt: Debt) => void,
  onUnsettle: (debt: Debt) => void,
  handleEdit: (debt: Debt) => void,
  openDeleteModal: (debt: Debt) => void,
  deletingId: number | null,
  settlingId: number | null
) {
  return (debt: Debt): RowAction[] => [
    debt.settledAt === null
      ? {
          id: 'settle',
          icon: CheckCircle2,
          label: t('debts.settle'),
          busy: settlingId === debt.id,
          onSelect: () => onSettle(debt),
        }
      : {
          id: 'unsettle',
          icon: RotateCcw,
          label: t('debts.unsettle'),
          busy: settlingId === debt.id,
          onSelect: () => onUnsettle(debt),
        },
    { id: 'edit', icon: Edit2, label: t('edit'), onSelect: () => handleEdit(debt) },
    {
      id: 'delete',
      icon: Trash2,
      label: t('delete'),
      danger: true,
      busy: deletingId === debt.id,
      onSelect: () => openDeleteModal(debt),
    },
  ];
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function buildDebtColumns(
  t: ReturnType<typeof useTranslations<'tables'>>,
  onSettle: (debt: Debt) => void,
  onUnsettle: (debt: Debt) => void,
  handleEdit: (debt: Debt) => void,
  openDeleteModal: (debt: Debt) => void,
  deletingId: number | null,
  settlingId: number | null
): ColumnDef<Debt, unknown>[] {
  return [
    {
      id: 'counterparty',
      accessorKey: 'counterparty',
      header: t('debts.counterparty'),
      meta: { widthClass: DEBT_COLUMN_WIDTHS.counterparty },
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-text-primary truncate text-sm font-medium">{row.original.counterparty}</span>
          {row.original.note && <span className="text-text-muted truncate text-xs">{row.original.note}</span>}
        </div>
      ),
    },
    {
      id: 'incurredAt',
      accessorKey: 'incurredAt',
      header: t('debts.incurredAt'),
      meta: { widthClass: DEBT_COLUMN_WIDTHS.incurredAt },
      cell: ({ row }) => <DebtDateCell date={row.original.incurredAt} />,
    },
    {
      id: 'dueDate',
      accessorKey: 'dueDate',
      header: t('debts.dueDate'),
      meta: { widthClass: DEBT_COLUMN_WIDTHS.dueDate },
      cell: ({ row }) => <DueCell debt={row.original} t={t} />,
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: t('debts.amount'),
      meta: { widthClass: DEBT_COLUMN_WIDTHS.amount, align: 'end' as const },
      cell: ({ row }) => {
        const debt = row.original;
        return (
          <Money
            amount={debt.amount}
            currency={debt.currency}
            date={debt.incurredAt}
            entryRate={debt.entryRate}
            className="items-end"
            primaryClassName={amountClassName(debt)}
            secondaryClassName="text-text-muted text-xs whitespace-nowrap"
          />
        );
      },
    },
    {
      id: 'status',
      accessorKey: 'settledAt',
      header: t('debts.status'),
      meta: { widthClass: DEBT_COLUMN_WIDTHS.status },
      cell: ({ row }) => <StatusCell debt={row.original} t={t} />,
    },
    {
      id: 'actions',
      header: t('actions'),
      meta: { widthClass: DEBT_COLUMN_WIDTHS.actions, align: 'center' as const },
      cell: ({ row }) => {
        const debt = row.original;
        const settled = debt.settledAt !== null;
        return (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                settled ? onUnsettle(debt) : onSettle(debt);
              }}
              className="text-action-default hover:bg-action-save-bg-hover hover:text-action-save-text-hover rounded-lg p-2 transition-all duration-200"
              title={settled ? t('debts.unsettle') : t('debts.settle')}
              aria-label={settled ? t('debts.unsettle') : t('debts.settle')}
            >
              {settled ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(debt);
              }}
              className="text-action-default hover:bg-action-edit-bg-hover hover:text-action-edit-text-hover rounded-lg p-2 transition-all duration-200"
              title={t('edit')}
              aria-label={t('edit')}
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDeleteModal(debt);
              }}
              disabled={deletingId === debt.id}
              className="text-action-default hover:bg-action-delete-bg-hover hover:text-action-delete-text-hover rounded-lg p-2 transition-all duration-200 disabled:opacity-50"
              title={t('delete')}
              aria-label={t('delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];
}
