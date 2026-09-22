'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { getAssetListKeyGenerator } from '@api/getAssetListQuery';
import { settleDebtKeyGenerator } from '@api/settleDebtMutation';
import type { SettleDebtRequestData } from '@api/settleDebtMutation';
import { SPENDABLE_ASSET_CATEGORIES } from '@constants/assets';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, Loader2 } from 'lucide-react';

import type { Asset, Debt } from '@types';

import AccountSelect, { NO_ACCOUNT_VALUE } from '@features/expenses/components/AccountSelect';
import AccountBalancePreview from '@features/expenses/components/AccountSelect/Preview';

import Button from '@components/Button';
import Modal from '@components/Modal';
import Money from '@components/Money';

import { useCurrency } from '@hooks/use-currency';

import { useToast } from '@stores/toast';

import { ensureError } from '@utils';

import { invalidateDebtSettlement } from '../../invalidate';

interface SettleDebtModalProps {
  debt: Debt | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * A Modal, not a drawer: this is a confirmation carrying one optional choice,
 * which is the shape RevalueModal already established.
 *
 * The account defaults to "don't track" so a pure bookkeeping settlement — the
 * common case, and literally what was asked for («فقط جهت حساب کتاب») — is one
 * click. Picking an account is the opt-in, not the default.
 */
const SettleDebtModal = ({ debt, isOpen, onClose }: SettleDebtModalProps) => {
  const t = useTranslations('pages.debts.settle');
  const tForms = useTranslations('forms.debt');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { formatFull } = useCurrency();

  const [accountId, setAccountId] = useState<number | null>(null);

  const { data: assets = [] } = useQuery<Asset[]>({ queryKey: getAssetListKeyGenerator() });
  const hasAccounts = assets.some((a) =>
    (SPENDABLE_ASSET_CATEGORIES as readonly string[]).includes(a.category as string)
  );

  const settleMutation = useMutation<unknown, Error, SettleDebtRequestData>({
    mutationKey: settleDebtKeyGenerator(),
  });

  if (!debt) return null;

  const isPayable = debt.direction === 'payable';

  // The picker is reset on the way OUT, not on the way in. The modal only ever
  // opens from a closed state, so clearing it in every close path (confirm, X,
  // Escape, backdrop) means a choice made for one debt can never carry into
  // the next — without an effect that sets state on open.
  const handleClose = () => {
    setAccountId(null);
    onClose();
  };

  const handleConfirm = async () => {
    try {
      await settleMutation.mutateAsync({ id: debt.id, settledAssetId: accountId });
      await invalidateDebtSettlement(queryClient);
      showToast(t('done'), 'success');
      handleClose();
    } catch (err) {
      showToast(ensureError(err).message, 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('title')}>
      <div className="space-y-4 p-6">
        <p className="text-text-secondary text-sm">
          {t('description', {
            amount: formatFull(debt.amount, debt.currency),
            counterparty: debt.counterparty,
          })}
        </p>

        <div className="border-border-subtle bg-background-secondary flex items-center justify-between rounded-lg border p-3">
          <span className="text-text-primary text-sm font-medium">{debt.counterparty}</span>
          <Money
            amount={debt.amount}
            currency={debt.currency}
            date={debt.incurredAt}
            entryRate={debt.entryRate}
            primaryClassName={isPayable ? 'text-danger font-semibold' : 'text-success font-semibold'}
          />
        </div>

        {/* Hidden entirely when the user has no cash or bank assets — a dead
            control teaching a concept they have not opted into is worse than
            no control. Same gate ExpenseForm uses for paidFrom. */}
        {hasAccounts && (
          <div className="space-y-1">
            <label htmlFor="settleAccount" className="text-text-secondary flex items-center gap-2 text-sm font-medium">
              <Landmark className="text-text-muted h-4 w-4" />
              {isPayable ? tForms('settleFrom') : tForms('settleTo')}
            </label>
            <AccountSelect
              inputId="settleAccount"
              value={accountId}
              onChange={(id) => setAccountId(id === NO_ACCOUNT_VALUE ? null : id)}
            />
            <AccountBalancePreview
              assetId={accountId}
              amount={debt.amount}
              currency={debt.currency}
              // The whole point of Phase 0.2: collecting a receivable makes the
              // balance go UP, and the preview has to say so.
              flow={isPayable ? 'out' : 'in'}
            />
            <p className="text-text-muted text-xs">{t('accountHint')}</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={settleMutation.isPending}
            className="flex-1 justify-center"
          >
            {settleMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('confirming')}
              </>
            ) : (
              t('confirm')
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SettleDebtModal;
