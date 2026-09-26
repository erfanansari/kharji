'use client';

import { useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { ASSETS_SCOPE } from '@api/getAssetListQuery';
import { NET_WORTH_SCOPE } from '@api/getNetWorthHistoryQuery';
import { SUMMARY_SCOPE } from '@api/getSummaryQuery';
import { revalueAssetsKeyGenerator } from '@api/revalueAssetsMutation';
import type { RevalueAssetsRequestData, RevalueAssetsResponse } from '@api/revalueAssetsMutation';
import { PIVOT_CURRENCY } from '@constants/currencies';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

import Button from '@components/Button';
import Modal from '@components/Modal';

import { useMoneyText } from '@hooks/use-money-text';

import { useToast } from '@stores/toast';

import { ensureError } from '@utils';

interface RevalueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Skip reasons come dash-cased from the API; i18n keys are camelCase.
const REASON_KEYS = {
  manual: 'reasonManual',
  'no-rate': 'reasonNoRate',
  'no-price': 'reasonNoPrice',
  'no-quantity': 'reasonNoQuantity',
  unchanged: 'reasonUnchanged',
} as const;

const RevalueModal = ({ isOpen, onClose }: RevalueModalProps) => {
  const t = useTranslations('pages.assets.revalue');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { format } = useMoneyText();

  const { mutateAsync } = useMutation<RevalueAssetsResponse, Error, RevalueAssetsRequestData>({
    mutationKey: revalueAssetsKeyGenerator(),
  });

  const [preview, setPreview] = useState<RevalueAssetsResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  const loadPreview = useCallback(async () => {
    setPreview(null);
    setIsLoadingPreview(true);
    setPreviewFailed(false);
    try {
      setPreview(await mutateAsync({ dryRun: true }));
    } catch {
      setPreviewFailed(true);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [mutateAsync]);

  useEffect(() => {
    // Fetch the dry-run preview each time the modal opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen) loadPreview();
  }, [isOpen, loadPreview]);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const result = await mutateAsync({ dryRun: false });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ASSETS_SCOPE }),
        queryClient.invalidateQueries({ queryKey: SUMMARY_SCOPE }),
        queryClient.invalidateQueries({ queryKey: NET_WORTH_SCOPE }),
      ]);
      showToast(t('done', { count: result.changes.length }), 'success');
      onClose();
    } catch (err) {
      showToast(ensureError(err).message, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const changes = preview?.changes ?? [];
  const skipped = (preview?.skipped ?? []).filter((s) => s.reason !== 'unchanged');
  const unchangedCount = (preview?.skipped ?? []).filter((s) => s.reason === 'unchanged').length;
  const manualCount = skipped.filter((s) => s.reason === 'manual').length;

  const pivotPair = (amount: number, entryRate: number) => amount * entryRate;

  return (
    <Modal isOpen={isOpen} onClose={isApplying ? () => {} : onClose} title={t('title')}>
      <div className="space-y-4">
        {isLoadingPreview && (
          <div className="text-text-muted flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('previewLoading')}
          </div>
        )}

        {previewFailed && !isLoadingPreview && (
          <div className="space-y-3 py-4 text-center">
            <p className="text-text-secondary text-sm">{t('previewError')}</p>
            <Button variant="outline" onClick={loadPreview}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t('retry')}
            </Button>
          </div>
        )}

        {/* All current — a success state, not a list of skips. One calm line
            (plus why manual assets never auto-update) and a single close button. */}
        {preview && !isLoadingPreview && changes.length === 0 && (
          <>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="bg-success/10 rounded-full p-3">
                <CheckCircle2 className="text-success h-6 w-6" aria-hidden="true" />
              </div>
              <p className="text-text-primary text-sm font-medium">{t('empty')}</p>
              {skipped.length > 0 && (
                <div className="space-y-1 pt-1">
                  {manualCount > 0 && (
                    <p className="text-text-muted text-xs">{t('emptyManualNote', { count: manualCount })}</p>
                  )}
                  {skipped.map((item) => (
                    <p key={item.id} className="text-text-muted text-xs">
                      <span className="text-text-secondary">{item.name}</span>
                      {' — '}
                      {t(REASON_KEYS[item.reason])}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" onClick={onClose} className="w-full">
              {t('ok')}
            </Button>
          </>
        )}

        {preview && !isLoadingPreview && changes.length > 0 && (
          <>
            <p className="text-text-secondary text-sm">{t('description', { count: changes.length })}</p>
            <ul className="border-border-subtle divide-border-subtle divide-y rounded-lg border">
              {changes.map((change) => {
                const oldPivot = pivotPair(change.old.amount, change.old.entryRate);
                const newPivot = pivotPair(change.next.amount, change.next.entryRate);
                const pct = oldPivot > 0 ? ((newPivot - oldPivot) / oldPivot) * 100 : 0;
                const amountChanged = change.next.amount !== change.old.amount;
                return (
                  <li key={change.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary truncate text-sm font-medium">{change.name}</p>
                      <p className="text-text-muted flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums">
                        <span>{format(oldPivot, PIVOT_CURRENCY, { compact: true })}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 rtl:rotate-180" aria-hidden="true" />
                        <span className="text-text-secondary font-medium">
                          {format(newPivot, PIVOT_CURRENCY, { compact: true })}
                        </span>
                      </p>
                      {amountChanged && change.currency !== PIVOT_CURRENCY && (
                        <p className="text-text-muted flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums">
                          <span>{format(change.old.amount, change.currency, { compact: true })}</span>
                          <ArrowRight className="h-3 w-3 shrink-0 rtl:rotate-180" aria-hidden="true" />
                          <span>{format(change.next.amount, change.currency, { compact: true })}</span>
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                        pct >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {pct >= 0 ? '+' : ''}
                      {pct.toFixed(1)}%
                    </span>
                  </li>
                );
              })}
            </ul>

            {(skipped.length > 0 || unchangedCount > 0) && (
              <div className="space-y-1.5">
                <p className="text-text-muted text-xs font-medium tracking-wider uppercase">{t('skippedTitle')}</p>
                {unchangedCount > 0 && (
                  <p className="text-text-muted text-xs">{t('unchangedCount', { count: unchangedCount })}</p>
                )}
                {skipped.map((item) => (
                  <p key={item.id} className="text-text-muted text-xs">
                    <span className="text-text-secondary">{item.name}</span>
                    {' — '}
                    {t(REASON_KEYS[item.reason])}
                  </p>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-1 rtl:flex-row-reverse">
              <Button variant="primary" onClick={handleApply} disabled={isApplying} className="flex-1">
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                    <span>{t('applying')}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{t('apply')}</span>
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={isApplying}>
                {tCommon('cancel')}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default RevalueModal;
