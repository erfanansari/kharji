import { useMemo } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { DollarSign } from 'lucide-react';

import { ApiError } from '@core/errors';

import Button from '@components/Button';
import DataTable from '@components/DataTable';
import EmptyState from '@components/EmptyState';
import ErrorState from '@components/ErrorState';
import Pulse from '@components/Skeleton';

import { useIncomeTypeLabel } from '@hooks/use-constant-labels';

import { useDrawerStore } from '@stores/drawer';

import { formatYear } from '@utils';
import type { NumberLocale } from '@utils';

import type { IncomeTableProps } from '../../@types';
import {
  buildIncomeColumns,
  buildIncomeMobileCard,
  buildIncomeRowActions,
  INCOME_TABLE_MIN_WIDTH,
} from '../../constants';

function IncomeSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Pulse className="mb-4 h-6 w-12 rounded-md" />
        <div className="border-border-subtle bg-background overflow-hidden rounded-xl border shadow-sm">
          <div className="bg-background-secondary px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between">
              <Pulse className="h-3 w-16" />
              <Pulse className="hidden h-3 w-14 sm:block" />
              <Pulse className="hidden h-3 w-20 sm:block" />
              <Pulse className="h-3 w-16" />
              <Pulse className="hidden h-3 w-12 sm:block" />
            </div>
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border-border-subtle border-t px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <Pulse className="h-4 w-20" />
                  <Pulse className="h-3 w-16" />
                </div>
                <Pulse className="hidden h-4 w-16 sm:block" />
                <Pulse className="hidden h-4 w-24 sm:block" />
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

const IncomeTable = ({
  incomesByYear,
  sortedYears,
  isLoading,
  error,
  onEdit,
  onDelete,
  deletingId,
  onRetry,
}: IncomeTableProps) => {
  const tTables = useTranslations('tables');
  const tOnboarding = useTranslations('onboarding.emptyStates');
  const t = useTranslations('pages.income');
  const locale = useLocale() as NumberLocale;
  const incomeTypeLabel = useIncomeTypeLabel();
  const openIncomeDrawer = useDrawerStore((state) => state.openIncomeDrawer);
  // Memos
  const incomeColumns = useMemo(
    () => buildIncomeColumns(tTables, incomeTypeLabel, onEdit, onDelete, deletingId),
    [tTables, incomeTypeLabel, onEdit, onDelete, deletingId]
  );

  const incomeMobileCard = useMemo(() => buildIncomeMobileCard(incomeTypeLabel), [incomeTypeLabel]);

  const incomeRowActions = useMemo(
    () => buildIncomeRowActions(tTables, onEdit, onDelete, deletingId),
    [tTables, onEdit, onDelete, deletingId]
  );

  if (isLoading) {
    return <IncomeSkeleton />;
  }

  if (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    return (
      <div className="border-border-subtle bg-background relative overflow-hidden rounded-xl border shadow-sm">
        <ErrorState title={t('loadError')} description={error.message} onRetry={onRetry} />
      </div>
    );
  }

  if (sortedYears.length === 0) {
    return (
      <div className="border-border-subtle bg-background relative rounded-xl border shadow-sm">
        <EmptyState
          icon={DollarSign}
          title={tOnboarding('incomeTable.title')}
          description={tOnboarding('incomeTable.description')}
          className="py-16"
          action={
            <Button variant="outline" onClick={() => openIncomeDrawer()}>
              {tOnboarding('addIncome')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedYears.map((year) => (
        <div key={year}>
          <h2 className="text-text-primary mb-4 text-lg font-semibold">{formatYear(year, locale)}</h2>
          <DataTable
            data={[...incomesByYear[year]].sort((a, b) => b.year - a.year || b.month - a.month)}
            columns={incomeColumns}
            minWidth={INCOME_TABLE_MIN_WIDTH}
            getRowId={(row) => String(row.id)}
            mobileCard={incomeMobileCard}
            rowActions={incomeRowActions}
            rowActionTitle={(row) => incomeTypeLabel(row.incomeType)}
          />
        </div>
      ))}
    </div>
  );
};

export default IncomeTable;
