'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

import Button from '@components/Button';
import CategoryBadge from '@components/CategoryBadge';
import CategoryTile from '@components/CategoryTile';
import Modal from '@components/Modal';

import type { CategoryWithUsage } from '@/@types/expense';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  category: CategoryWithUsage | null;
  /** All categories belonging to the user — used to populate the reassign list. */
  allCategories: CategoryWithUsage[];
  onConfirm: (reassignToId?: number) => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

const DeleteCategoryModal = ({
  isOpen,
  category,
  allCategories,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteCategoryModalProps) => {
  const t = useTranslations('settings.deleteCategory');
  const tCommon = useTranslations('common');
  const [reassignToId, setReassignToId] = useState<number | null>(null);

  // Reset selection whenever the modal opens against a new category.
  // Done as a render-phase comparison to avoid the `setState in useEffect`
  // cascade flagged by React 19.
  const trackingKey = isOpen ? (category?.id ?? null) : null;
  const [prevTrackingKey, setPrevTrackingKey] = useState(trackingKey);
  if (prevTrackingKey !== trackingKey) {
    setPrevTrackingKey(trackingKey);
    setReassignToId(null);
  }

  if (!category) return null;

  const hasUsage = category.usage_count > 0;
  const candidates = allCategories.filter((c) => c.id !== category.id);
  const canConfirm = hasUsage ? reassignToId !== null : true;
  const confirmLabel = hasUsage ? t('reassignAndDelete') : t('delete');

  return (
    <Modal isOpen={isOpen} onClose={isDeleting ? () => {} : onCancel} showCloseButton={false}>
      <div className="text-center">
        <div className="bg-danger/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <AlertTriangle className="text-danger h-6 w-6" aria-hidden="true" />
        </div>

        <div className="mt-4">
          <h3 className="text-text-primary text-lg font-semibold">{t('title', { name: category.name })}</h3>
        </div>

        {hasUsage ? (
          <div className="mt-3 space-y-3">
            <p className="text-text-secondary text-sm">
              {t.rich('usedInReassign', {
                count: category.usage_count,
                b: (chunks) => <span className="font-semibold">{chunks}</span>,
              })}
            </p>

            <div className="border-border-subtle bg-background-secondary mt-2 max-h-56 overflow-y-auto rounded-lg border p-2 text-start">
              {candidates.length === 0 ? (
                <p className="text-text-muted px-2 py-3 text-center text-xs">{t('noOtherCategories')}</p>
              ) : (
                <ul className="space-y-1">
                  {candidates.map((c) => {
                    const selected = reassignToId === c.id;
                    return (
                      <li key={c.id}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors ${
                            selected ? 'bg-background-elevated' : 'hover:bg-background-elevated'
                          }`}
                        >
                          <input
                            type="radio"
                            name="reassignTarget"
                            value={c.id}
                            checked={selected}
                            onChange={() => setReassignToId(c.id)}
                            className="sr-only"
                          />
                          <CategoryTile category={c} emphasis className="flex-1" />
                          <span className="text-text-muted shrink-0 text-xs">
                            {t('categoryUsage', { count: c.usage_count })}
                          </span>
                          {selected && (
                            <span className="text-blue text-xs font-semibold" aria-hidden="true">
                              <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {reassignToId !== null && (
              <p className="text-text-secondary flex flex-wrap items-center justify-center gap-1.5 text-xs">
                <CategoryBadge category={category} />
                <ArrowRight className="text-text-muted h-3 w-3 rtl:-scale-x-100" aria-hidden="true" />
                {(() => {
                  const target = candidates.find((c) => c.id === reassignToId);
                  return target ? <CategoryBadge category={target} /> : null;
                })()}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-text-secondary text-sm">{t('notUsed')}</p>
            <p className="text-text-secondary text-sm font-medium">{tCommon('actionUndone')}</p>
          </div>
        )}

        {/* No rtl override: Cancel is coded first, so a plain flex row under RTL
            already puts Cancel on the right and Confirm/primary on the left. */}
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isDeleting} className="flex-1">
            {tCommon('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(reassignToId ?? undefined)}
            disabled={isDeleting || !canConfirm}
            className="bg-danger hover:bg-danger-hover flex-1"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span>{tCommon('deleting')}</span>
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteCategoryModal;
