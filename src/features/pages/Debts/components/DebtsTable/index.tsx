import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import { HandCoins } from 'lucide-react';

import { ApiError } from '@core/errors';

import Button from '@components/Button';
import DataTable from '@components/DataTable';
import EmptyState from '@components/EmptyState';
import ErrorState from '@components/ErrorState';
import Pulse from '@components/Skeleton';

import { useDrawerStore } from '@stores/drawer';

import type { Debt, DebtDirection } from '@/@types/debt';

import type { DebtsTableProps } from '../../@types';
import { buildDebtColumns, buildDebtMobileCard, buildDebtRowActions, DEBT_TABLE_MIN_WIDTH } from '../../constants';

function DebtsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Pulse className="mb-4 h-6 w-24 rounded-md" />
        <div className="border-border-subtle bg-background overflow-hidden rounded-xl border shadow-sm">
          <div className="bg-background-secondary px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between">
              <Pulse className="h-3 w-20" />
              <Pulse className="hidden h-3 w-14 sm:block" />
              <Pulse className="hidden h-3 w-14 sm:block" />
              <Pulse className="h-3 w-16" />
              <Pulse className="hidden h-3 w-12 sm:block" />
            </div>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border-border-subtle border-t px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between">
                <Pulse className="h-4 w-28" />
                <Pulse className="hidden h-4 w-20 sm:block" />
                <Pulse className="hidden h-4 w-20 sm:block" />
                <div className="flex flex-col items-end gap-1">
                  <Pulse className="h-4 w-24" />
                  <Pulse className="h-3 w-20" />
                </div>
                <div className="hidden items-center justify-center gap-1 sm:flex">
                  <Pulse className="h-8 w-8 rounded-lg" />
                  <Pulse className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Outstanding first, then soonest due (undated last), then newest incurred. */
function sortDebts(list: Debt[]): Debt[] {
  return [...list].sort((a, b) => {
    const aOpen = a.settledAt === null ? 0 : 1;
    const bOpen = b.settledAt === null ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    if (a.dueDate !== b.dueDate) {
      if (a.dueDate === null) return 1;
      if (b.dueDate === null) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    }
    return b.incurredAt.localeCompare(a.incurredAt);
  });
}

const DebtsTable = ({
  debts,
  isLoading,
  error,
  onSettle,
  onUnsettle,
  onEdit,
  onDelete,
  onRetry,
  deletingId,
  settlingId,
}: DebtsTableProps) => {
  const tTables = useTranslations('tables');
  const tOnboarding = useTranslations('onboarding.emptyStates');
  const t = useTranslations('pages.debts');
  const openDebtDrawer = useDrawerStore((state) => state.openDebtDrawer);

  // Memos
  const columns = useMemo(
    () => buildDebtColumns(tTables, onSettle, onUnsettle, onEdit, onDelete, deletingId, settlingId),
    [tTables, onSettle, onUnsettle, onEdit, onDelete, deletingId, settlingId]
  );
  const mobileCard = useMemo(() => buildDebtMobileCard(tTables), [tTables]);
  const rowActions = useMemo(
    () => buildDebtRowActions(tTables, onSettle, onUnsettle, onEdit, onDelete, deletingId, settlingId),
    [tTables, onSettle, onUnsettle, onEdit, onDelete, deletingId, settlingId]
  );

  if (isLoading) return <DebtsSkeleton />;

  if (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    return (
      <div className="border-border-subtle bg-background relative overflow-hidden rounded-xl border shadow-sm">
        <ErrorState title={t('loadError')} description={error.message} onRetry={onRetry} />
      </div>
    );
  }

  if (debts.length === 0) {
    return (
      <div className="border-border-subtle bg-background relative rounded-xl border shadow-sm">
        <EmptyState
          icon={HandCoins}
          title={tOnboarding('debtsPayable.title')}
          description={tOnboarding('debtsPayable.description')}
          className="py-16"
          action={
            <Button variant="outline" onClick={() => openDebtDrawer()}>
              {tOnboarding('addDebt')}
            </Button>
          }
        />
      </div>
    );
  }

  // Two grouped tables rather than tabs: «طلب و بدهی» is one question with two
  // halves, and the net figure above only makes sense next to both. This is
  // the same grouped-<h2>-per-DataTable shape the Income page uses per year.
  interface Group {
    direction: DebtDirection;
    heading: string;
    rows: Debt[];
  }
  const allGroups: Group[] = [
    {
      direction: 'payable',
      heading: t('payableHeading'),
      rows: sortDebts(debts.filter((d) => d.direction === 'payable')),
    },
    {
      direction: 'receivable',
      heading: t('receivableHeading'),
      rows: sortDebts(debts.filter((d) => d.direction === 'receivable')),
    },
  ];
  const groups = allGroups.filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-6">
      {groups.map(({ direction, heading, rows }) => {
        const outstanding = rows.filter((d) => d.settledAt === null);
        return (
          <div key={direction}>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-text-primary text-lg font-semibold">{heading}</h2>
              {/* Per-currency subtotal would be misleading across mixed
                  currencies, so the group header just counts what is open. */}
              <span className="text-text-muted text-xs tabular-nums">
                {outstanding.length}/{rows.length}
              </span>
            </div>
            <DataTable
              data={rows}
              columns={columns}
              minWidth={DEBT_TABLE_MIN_WIDTH}
              getRowId={(row) => String(row.id)}
              mobileCard={mobileCard}
              rowActions={rowActions}
              rowActionTitle={(row) => row.counterparty}
            />
          </div>
        );
      })}
    </div>
  );
};

export default DebtsTable;
