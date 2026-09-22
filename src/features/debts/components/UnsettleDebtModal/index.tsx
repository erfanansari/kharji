'use client';

import { useTranslations } from 'next-intl';

import { unsettleDebtKeyGenerator } from '@api/unsettleDebtMutation';
import type { UnsettleDebtRequestData } from '@api/unsettleDebtMutation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import type { Debt } from '@types';

import Button from '@components/Button';
import Modal from '@components/Modal';

import { useCurrency } from '@hooks/use-currency';

import { useToast } from '@stores/toast';

import { ensureError } from '@utils';

import { invalidateDebtSettlement } from '../../invalidate';

interface UnsettleDebtModalProps {
  debt: Debt | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Confirm-only. When the settlement moved an account, the copy names that
 * account and the amount going back into it, because by the time someone
 * un-settles a debt they will not remember which account settled it.
 */
const UnsettleDebtModal = ({ debt, isOpen, onClose }: UnsettleDebtModalProps) => {
  const t = useTranslations('pages.debts.unsettle');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { formatFull } = useCurrency();

  const unsettleMutation = useMutation<unknown, Error, UnsettleDebtRequestData>({
    mutationKey: unsettleDebtKeyGenerator(),
  });

  if (!debt) return null;

  const movedAccount = debt.settledFrom !== null && debt.settledDelta !== null && debt.settledCurrency !== null;

  const handleConfirm = async () => {
    try {
      await unsettleMutation.mutateAsync({ id: debt.id });
      await invalidateDebtSettlement(queryClient);
      showToast(t('done'), 'info');
      onClose();
    } catch (err) {
      showToast(ensureError(err).message, 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('title')}>
      <div className="space-y-4 p-6">
        <p className="text-text-secondary text-sm">
          {movedAccount
            ? t('descriptionWithAccount', {
                // The stored delta is signed; the user cares about the size of
                // the movement, not which way the SQL subtracted it.
                amount: formatFull(Math.abs(debt.settledDelta ?? 0), debt.settledCurrency ?? debt.currency),
                account: debt.settledFrom?.name ?? '',
              })
            : t('description')}
        </p>

        <div className="flex gap-2 pt-1">
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={unsettleMutation.isPending}
            className="flex-1 justify-center"
          >
            {unsettleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('confirm')}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={unsettleMutation.isPending}>
            {tCommon('cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UnsettleDebtModal;
