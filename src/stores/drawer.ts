import { useStore } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import type { Asset, Debt, Expense, Income } from '@types';

interface DrawerSlice<T> {
  open: boolean;
  dirty: boolean;
  editing?: T;
}

const closedSlice = { open: false, dirty: false, editing: undefined };

interface DrawerState {
  expense: DrawerSlice<Expense>;
  income: DrawerSlice<Income>;
  asset: DrawerSlice<Asset>;
  debt: DrawerSlice<Debt>;
  openExpenseDrawer: (expense?: Expense) => void;
  closeExpenseDrawer: () => void;
  setExpenseDirty: (dirty: boolean) => void;
  openIncomeDrawer: (income?: Income) => void;
  closeIncomeDrawer: () => void;
  setIncomeDirty: (dirty: boolean) => void;
  openAssetDrawer: (asset?: Asset) => void;
  closeAssetDrawer: () => void;
  setAssetDirty: (dirty: boolean) => void;
  openDebtDrawer: (debt?: Debt) => void;
  closeDebtDrawer: () => void;
  setDebtDirty: (dirty: boolean) => void;
  feedbackOpen: boolean;
  openFeedbackModal: () => void;
  closeFeedbackModal: () => void;
}

const drawerStore = createStore<DrawerState>()(
  devtools((set) => ({
    expense: { ...closedSlice },
    income: { ...closedSlice },
    asset: { ...closedSlice },
    debt: { ...closedSlice },
    feedbackOpen: false,

    openFeedbackModal: () => set({ feedbackOpen: true }, undefined, 'openFeedbackModal'),
    closeFeedbackModal: () => set({ feedbackOpen: false }, undefined, 'closeFeedbackModal'),

    openExpenseDrawer: (expense) =>
      set({ expense: { open: true, dirty: false, editing: expense } }, undefined, 'openExpenseDrawer'),
    closeExpenseDrawer: () => set({ expense: { ...closedSlice } }, undefined, 'closeExpenseDrawer'),
    setExpenseDirty: (dirty) =>
      set((state) => ({ expense: { ...state.expense, dirty } }), undefined, 'setExpenseDirty'),

    openIncomeDrawer: (income) =>
      set({ income: { open: true, dirty: false, editing: income } }, undefined, 'openIncomeDrawer'),
    closeIncomeDrawer: () => set({ income: { ...closedSlice } }, undefined, 'closeIncomeDrawer'),
    setIncomeDirty: (dirty) => set((state) => ({ income: { ...state.income, dirty } }), undefined, 'setIncomeDirty'),

    openAssetDrawer: (asset) =>
      set({ asset: { open: true, dirty: false, editing: asset } }, undefined, 'openAssetDrawer'),
    closeAssetDrawer: () => set({ asset: { ...closedSlice } }, undefined, 'closeAssetDrawer'),
    setAssetDirty: (dirty) => set((state) => ({ asset: { ...state.asset, dirty } }), undefined, 'setAssetDirty'),

    openDebtDrawer: (debt) => set({ debt: { open: true, dirty: false, editing: debt } }, undefined, 'openDebtDrawer'),
    closeDebtDrawer: () => set({ debt: { ...closedSlice } }, undefined, 'closeDebtDrawer'),
    setDebtDirty: (dirty) => set((state) => ({ debt: { ...state.debt, dirty } }), undefined, 'setDebtDirty'),
  }))
);

export const useDrawerStore = <T>(selector: (state: DrawerState) => T): T => useStore(drawerStore, selector);

export default drawerStore;
