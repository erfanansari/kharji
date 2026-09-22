import { ASSETS_SCOPE } from '@api/getAssetListQuery';
import { DEBTS_SCOPE } from '@api/getDebtListQuery';
import { NET_WORTH_SCOPE } from '@api/getNetWorthHistoryQuery';
import { SUMMARY_SCOPE } from '@api/getSummaryQuery';
import type { QueryClient } from '@tanstack/react-query';

/**
 * After a write that only touched the debt row itself.
 *
 * The summary is included because outstanding debts are part of net worth as
 * of 1.7.0 — creating, editing or deleting one moves the Overview's headline
 * figure even when no balance was touched.
 */
export const invalidateDebtData = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: DEBTS_SCOPE }),
    queryClient.invalidateQueries({ queryKey: SUMMARY_SCOPE }),
  ]);

/**
 * After a settle, un-settle, or the deletion of a settled debt.
 *
 * Those can move an account balance, and a moved balance writes an
 * `assetValuations` row — so the assets list and the net-worth history are
 * stale too. Same reasoning as `invalidateExpenseData` in the expense form.
 * Over-invalidating here is cheap; under-invalidating shows the user a balance
 * they can prove is wrong by reloading.
 */
export const invalidateDebtSettlement = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: DEBTS_SCOPE }),
    queryClient.invalidateQueries({ queryKey: SUMMARY_SCOPE }),
    queryClient.invalidateQueries({ queryKey: ASSETS_SCOPE }),
    queryClient.invalidateQueries({ queryKey: NET_WORTH_SCOPE }),
  ]);
