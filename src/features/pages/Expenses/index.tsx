'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { deleteExpenseKeyGenerator } from '@api/deleteExpenseMutation';
import type { DeleteExpenseRequestData } from '@api/deleteExpenseMutation';
import { ASSETS_SCOPE } from '@api/getAssetListQuery';
import { EXPENSES_SCOPE, getExpenseListKeyGenerator } from '@api/getExpenseListQuery';
import type { ExpenseFilters, ExpensesPage as ExpensesPageData } from '@api/getExpenseListQuery';
import { NET_WORTH_SCOPE } from '@api/getNetWorthHistoryQuery';
import { SUMMARY_SCOPE } from '@api/getSummaryQuery';
import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { type Expense } from '@types';

import ExpenseDetailsDrawer from '@features/expenses/components/ExpenseDetailsDrawer';

import Button from '@components/Button';
import DeleteConfirmModal from '@components/DeleteConfirmModal';
import PageHeader from '@components/PageHeader';

import { useDeleteConfirmation } from '@hooks/use-delete-confirmation';

import { useDrawerStore } from '@stores/drawer';
import { useToast } from '@stores/toast';

import { ensureError } from '@utils';

import ExpensesTable from './components/ExpensesTable';

const ITEMS_PER_PAGE = 20;

const ExpensesPage = () => {
  // Customs
  const t = useTranslations('pages.expenses');

  // States
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [descInput, setDescInput] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Customs
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const openExpenseDrawer = useDrawerStore((state) => state.openExpenseDrawer);

  // Queries
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } = useInfiniteQuery<
    ExpensesPageData,
    Error
  >({
    queryKey: getExpenseListKeyGenerator({ ...filters, limit: ITEMS_PER_PAGE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    placeholderData: keepPreviousData,
  });

  // Mutations
  const { mutateAsync: deleteExpenseAsync } = useMutation<void, Error, DeleteExpenseRequestData>({
    mutationKey: deleteExpenseKeyGenerator(),
  });

  const {
    itemToDelete: expenseToDelete,
    isModalOpen: isDeleteModalOpen,
    deletingId,
    openModal: openDeleteModal,
    closeModal: closeDeleteModal,
    confirmDelete,
  } = useDeleteConfirmation<Expense>({
    onDelete: async (id) => {
      await deleteExpenseAsync({ id });
      // Assets and net worth too: deleting an expense gives back whatever it
      // took out of an account, which moves that balance and writes a valuation.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: EXPENSES_SCOPE }),
        queryClient.invalidateQueries({ queryKey: SUMMARY_SCOPE }),
        queryClient.invalidateQueries({ queryKey: ASSETS_SCOPE }),
        queryClient.invalidateQueries({ queryKey: NET_WORTH_SCOPE }),
      ]);
      showToast(t('deleted'), 'info');
    },
    onError: (err) => showToast(ensureError(err).message, 'error'),
  });

  // Variables
  const expenses: Expense[] = data?.pages.flatMap((p) => p.expenses) ?? [];

  // Effects
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, description: descInput || undefined }));
    }, 300);
    return () => clearTimeout(timer);
  }, [descInput]);

  // Callbacks
  const handleRowClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedExpense(null);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
          action={
            <Button variant="primary" onClick={() => openExpenseDrawer()}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('addExpense')}</span>
            </Button>
          }
        />

        {/* Expenses Table */}
        <ExpensesTable
          expenses={expenses}
          isLoading={isLoading}
          error={error}
          filters={filters}
          descInput={descInput}
          onDescInputChange={setDescInput}
          onFiltersChange={setFilters}
          onRowClick={handleRowClick}
          onEdit={openExpenseDrawer}
          onDelete={openDeleteModal}
          deletingId={deletingId}
          hasNextPage={hasNextPage ?? false}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
          onRetry={() => refetch()}
        />

        {/* Expense Details Drawer */}
        <ExpenseDetailsDrawer
          expense={selectedExpense}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onEdit={openExpenseDrawer}
          onDelete={openDeleteModal}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          title={t('deleteTitle')}
          message={t('deleteMessage')}
          itemName={expenseToDelete?.description}
          onConfirm={confirmDelete}
          onCancel={closeDeleteModal}
          isDeleting={deletingId === expenseToDelete?.id}
        />
      </div>
    </div>
  );
};

export default ExpensesPage;
