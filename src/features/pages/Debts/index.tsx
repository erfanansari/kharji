'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { deleteDebtKeyGenerator } from '@api/deleteDebtMutation';
import type { DeleteDebtRequestData } from '@api/deleteDebtMutation';
import { getDebtListKeyGenerator } from '@api/getDebtListQuery';
import type { GetDebtListResponse } from '@api/getDebtListQuery';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import type { Debt } from '@types';

import SettleDebtModal from '@features/debts/components/SettleDebtModal';
import UnsettleDebtModal from '@features/debts/components/UnsettleDebtModal';
import { invalidateDebtSettlement } from '@features/debts/invalidate';

import Button from '@components/Button';
import DeleteConfirmModal from '@components/DeleteConfirmModal';
import PageHeader from '@components/PageHeader';
import Pulse from '@components/Skeleton';

import { useCurrency } from '@hooks/use-currency';
import { useDeleteConfirmation } from '@hooks/use-delete-confirmation';

import { useDrawerStore } from '@stores/drawer';
import { useToast } from '@stores/toast';

import { ensureError } from '@utils';

import DebtsSummary from './components/DebtsSummary';
import DebtsTable from './components/DebtsTable';

function DebtsSummarySkeleton() {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border-border-subtle bg-background rounded-xl border p-4 shadow-sm sm:p-5">
          <Pulse className="mb-3 h-9 w-9 rounded-lg sm:mb-4 sm:h-10 sm:w-10" />
          <Pulse className="mb-2 h-3 w-20 sm:mb-3 sm:w-24" />
          <Pulse className="mb-2 h-6 w-3/4 sm:h-8" />
        </div>
      ))}
    </div>
  );
}

const DebtsPage = () => {
  // Customs
  const t = useTranslations('pages.debts');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { formatFull } = useCurrency();

  // States — which debt each of the two settle-flow modals is open for.
  const [debtToSettle, setDebtToSettle] = useState<Debt | null>(null);
  const [debtToUnsettle, setDebtToUnsettle] = useState<Debt | null>(null);

  // Queries
  const {
    data: debts = [],
    isLoading,
    error,
    refetch,
  } = useQuery<GetDebtListResponse>({ queryKey: getDebtListKeyGenerator() });

  // Mutations
  const { mutateAsync: deleteDebtAsync } = useMutation<void, Error, DeleteDebtRequestData>({
    mutationKey: deleteDebtKeyGenerator(),
  });

  const openDebtDrawer = useDrawerStore((state) => state.openDebtDrawer);
  const {
    itemToDelete: debtToDelete,
    isModalOpen: isDeleteModalOpen,
    deletingId,
    openModal: openDeleteModal,
    closeModal: closeDeleteModal,
    confirmDelete,
  } = useDeleteConfirmation<Debt>({
    onDelete: async (id) => {
      await deleteDebtAsync({ id });
      // Deleting a settled debt reverses the balance it moved, so this is the
      // wide invalidation, not the debt-row-only one.
      await invalidateDebtSettlement(queryClient);
      showToast(t('deleted'), 'info');
    },
    onError: (err) => showToast(ensureError(err).message, 'error'),
  });

  // Deleting a settled debt that moved an account gives that money back — say
  // so, rather than letting a delete quietly change a balance.
  const deleteMovedAccount =
    debtToDelete?.settledFrom != null && debtToDelete.settledDelta !== null && debtToDelete.settledCurrency !== null;
  const deleteMessage =
    debtToDelete && deleteMovedAccount
      ? t('deleteMessageSettled', {
          account: debtToDelete.settledFrom?.name ?? '',
          amount: formatFull(Math.abs(debtToDelete.settledDelta ?? 0), debtToDelete.settledCurrency ?? ''),
        })
      : t('deleteMessage');

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
          action={
            <Button variant="primary" onClick={() => openDebtDrawer()}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('addDebt')}</span>
            </Button>
          }
        />

        {/* On a failed fetch with no cached data, the table below shows the error —
            don't render a summary of zeros that reads as a clean slate. */}
        {isLoading && debts.length === 0 ? (
          <DebtsSummarySkeleton />
        ) : (
          !(error && debts.length === 0) && <DebtsSummary debts={debts} />
        )}

        <DebtsTable
          debts={debts}
          isLoading={isLoading && debts.length === 0}
          error={error}
          onSettle={setDebtToSettle}
          onUnsettle={setDebtToUnsettle}
          onEdit={openDebtDrawer}
          onDelete={openDeleteModal}
          onRetry={() => refetch()}
          deletingId={deletingId}
          settlingId={null}
        />

        <SettleDebtModal debt={debtToSettle} isOpen={debtToSettle !== null} onClose={() => setDebtToSettle(null)} />
        <UnsettleDebtModal
          debt={debtToUnsettle}
          isOpen={debtToUnsettle !== null}
          onClose={() => setDebtToUnsettle(null)}
        />

        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          title={t('deleteTitle')}
          message={deleteMessage}
          itemName={debtToDelete?.counterparty}
          onConfirm={confirmDelete}
          onCancel={closeDeleteModal}
          isDeleting={deletingId === debtToDelete?.id}
        />
      </div>
    </div>
  );
};

export default DebtsPage;
