'use client';

import { useTranslations } from 'next-intl';

import AssetForm from '@features/assets/components/AssetForm';
import DebtForm from '@features/debts/components/DebtForm';
import ExpenseForm from '@features/expenses/components/ExpenseForm';
import FeedbackModal from '@features/feedback/components/FeedbackModal';
import IncomeForm from '@features/income/components/IncomeForm';

import FormDrawer from '@components/FormDrawer';

import { useAuth } from '@hooks/use-auth';

import { useDrawerStore } from '@stores/drawer';

/** Render-only host for the global expense/income/asset/debt form drawers (state lives in the drawer store). */
const GlobalDrawers = () => {
  const t = useTranslations('forms');
  const { user } = useAuth();
  const expense = useDrawerStore((state) => state.expense);
  const income = useDrawerStore((state) => state.income);
  const asset = useDrawerStore((state) => state.asset);
  const debt = useDrawerStore((state) => state.debt);
  const closeExpenseDrawer = useDrawerStore((state) => state.closeExpenseDrawer);
  const closeIncomeDrawer = useDrawerStore((state) => state.closeIncomeDrawer);
  const closeAssetDrawer = useDrawerStore((state) => state.closeAssetDrawer);
  const closeDebtDrawer = useDrawerStore((state) => state.closeDebtDrawer);
  const setExpenseDirty = useDrawerStore((state) => state.setExpenseDirty);
  const setIncomeDirty = useDrawerStore((state) => state.setIncomeDirty);
  const setAssetDirty = useDrawerStore((state) => state.setAssetDirty);
  const setDebtDirty = useDrawerStore((state) => state.setDebtDirty);

  // The forms are meaningless (and broken) without a session — don't let
  // drawers render over auth pages.
  if (!user) return null;

  return (
    <>
      <FormDrawer
        isOpen={expense.open}
        onClose={closeExpenseDrawer}
        title={expense.editing ? t('expense.editTitle') : t('expense.addTitle')}
        isDirty={expense.dirty}
      >
        <ExpenseForm
          onExpenseAdded={closeExpenseDrawer}
          editingExpense={expense.editing}
          onCancelEdit={closeExpenseDrawer}
          setIsDirty={setExpenseDirty}
        />
      </FormDrawer>

      <FormDrawer
        isOpen={income.open}
        onClose={closeIncomeDrawer}
        title={income.editing ? t('income.editTitle') : t('income.addTitle')}
        isDirty={income.dirty}
      >
        <IncomeForm
          onIncomeAdded={closeIncomeDrawer}
          editingIncome={income.editing}
          onCancelEdit={closeIncomeDrawer}
          setIsDirty={setIncomeDirty}
        />
      </FormDrawer>

      <FormDrawer
        isOpen={asset.open}
        onClose={closeAssetDrawer}
        title={asset.editing ? t('asset.editTitle') : t('asset.addTitle')}
        isDirty={asset.dirty}
      >
        <AssetForm
          onAssetAdded={closeAssetDrawer}
          editingAsset={asset.editing}
          onCancelEdit={closeAssetDrawer}
          setIsDirty={setAssetDirty}
        />
      </FormDrawer>

      <FormDrawer
        isOpen={debt.open}
        onClose={closeDebtDrawer}
        title={debt.editing ? t('debt.editTitle') : t('debt.addTitle')}
        isDirty={debt.dirty}
      >
        <DebtForm
          onDebtAdded={closeDebtDrawer}
          editingDebt={debt.editing}
          onCancelEdit={closeDebtDrawer}
          setIsDirty={setDebtDirty}
        />
      </FormDrawer>

      <FeedbackModal />
    </>
  );
};

export default GlobalDrawers;
