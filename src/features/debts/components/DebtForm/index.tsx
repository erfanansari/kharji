'use client';

import { useEffect, useMemo } from 'react';

import { useTranslations } from 'next-intl';

import { createDebtKeyGenerator } from '@api/createDebtMutation';
import { getDebtListKeyGenerator } from '@api/getDebtListQuery';
import type { GetDebtListResponse } from '@api/getDebtListQuery';
import { updateDebtKeyGenerator } from '@api/updateDebtMutation';
import type { UpdateDebtRequestData } from '@api/updateDebtMutation';
import { PIVOT_CURRENCY } from '@constants/currencies';
import { DEBT_DIRECTIONS } from '@constants/debts';
import { zodResolver } from '@hookform/resolvers/zod';
import { numberToWords } from '@persian-tools/persian-tools';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CalendarDays, Coins, FileText, Loader2, Plus, User } from 'lucide-react';
import { useForm } from 'react-hook-form';

import type { Debt } from '@types';

import { createDebtSchema } from '@schemas';
import type { CreateDebtSchema } from '@schemas';

import Button from '@components/Button';
import CategoryTile from '@components/CategoryTile';
import Form from '@components/Form';
import FormDatePicker from '@components/Form/components/FormDatePicker';
import FormInput from '@components/Form/components/FormInput';
import FormMoneyInput from '@components/Form/components/FormMoneyInput';
import Tooltip from '@components/Tooltip';

import { useDebtDirectionLabel } from '@hooks/use-constant-labels';
import { useCurrency } from '@hooks/use-currency';

import { useToast } from '@stores/toast';

import { ensureError } from '@utils';

import { invalidateDebtData } from '../../invalidate';

import type { DebtFormProps } from './@types';

const todayIso = () => new Date().toISOString().slice(0, 10);

const buildFormData = (debt: Debt): CreateDebtSchema => ({
  direction: debt.direction,
  counterparty: debt.counterparty,
  amount: debt.amount,
  currency: debt.currency,
  incurredAt: debt.incurredAt,
  dueDate: debt.dueDate,
  note: debt.note || '',
});

const DebtForm = ({ onDebtAdded, editingDebt, onCancelEdit, setIsDirty }: DebtFormProps) => {
  // Customs
  const t = useTranslations('forms');
  const tCommon = useTranslations('common');
  const tZod = useTranslations();
  const directionLabel = useDebtDirectionLabel();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { primaryCurrency } = useCurrency();

  // Past counterparties, for the datalist. Derived from the list already in
  // cache — no endpoint and no contacts table, but «فلانی» is one keystroke
  // the second time you owe them something.
  const { data: debts = [] } = useQuery<GetDebtListResponse>({ queryKey: getDebtListKeyGenerator() });
  const knownCounterparties = useMemo(
    () => Array.from(new Set(debts.map((d) => d.counterparty.trim()).filter(Boolean))).sort(),
    [debts]
  );

  // Variables
  const defaultFormData: CreateDebtSchema = useMemo(
    () => ({
      direction: 'payable',
      counterparty: '',
      amount: 0,
      currency: primaryCurrency || PIVOT_CURRENCY,
      incurredAt: todayIso(),
      dueDate: null,
      note: '',
    }),
    [primaryCurrency]
  );

  // Forms
  const methods = useForm<CreateDebtSchema>({
    resolver: zodResolver(createDebtSchema(tZod)),
    defaultValues: editingDebt ? buildFormData(editingDebt) : defaultFormData,
    mode: 'all',
  });

  const { formState, reset, watch, setValue } = methods;
  const amount = watch('amount');
  const currency = watch('currency');
  const direction = watch('direction');

  // Mutations
  const createMutation = useMutation<unknown, Error, CreateDebtSchema>({ mutationKey: createDebtKeyGenerator() });
  const updateMutation = useMutation<unknown, Error, UpdateDebtRequestData>({ mutationKey: updateDebtKeyGenerator() });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Effects — resync when the drawer switches to a different debt.
  useEffect(() => {
    if (editingDebt) reset(buildFormData(editingDebt));
  }, [editingDebt, reset]);

  useEffect(() => {
    setIsDirty?.(formState.isDirty);
  }, [formState.isDirty, setIsDirty]);

  const numberToPersianWord = useMemo(() => {
    if (currency !== PIVOT_CURRENCY || amount <= 0) return '';
    const rounded = Math.round(amount);
    return Number.isSafeInteger(rounded) ? `${numberToWords(rounded)} تومان` : '';
  }, [amount, currency]);

  const handleSubmit = async (data: CreateDebtSchema) => {
    try {
      if (editingDebt) {
        await updateMutation.mutateAsync({ id: editingDebt.id, ...data });
        await invalidateDebtData(queryClient);
        showToast(t('debt.updated'), 'success');
      } else {
        await createMutation.mutateAsync(data);
        await invalidateDebtData(queryClient);
        showToast(t('debt.added'), 'success');
      }

      reset(defaultFormData);
      onDebtAdded();
      if (editingDebt && onCancelEdit) onCancelEdit();
    } catch (err) {
      showToast(ensureError(err).message, 'error');
    }
  };

  const handleCancel = () => {
    reset(defaultFormData);
    if (onCancelEdit) onCancelEdit();
  };

  return (
    <Form methods={methods} onSubmit={handleSubmit} className="space-y-3">
      {/* Direction comes FIRST: it reframes every field below it, and picking
          it wrong silently inverts the user's net worth. */}
      <div className="space-y-1">
        <label className="text-text-secondary flex items-center gap-2 text-sm font-medium">{t('debt.direction')}</label>
        <div
          role="radiogroup"
          aria-label={t('debt.direction')}
          className="border-border-subtle bg-background-secondary flex w-full gap-1 rounded-lg border p-1"
        >
          {DEBT_DIRECTIONS.map((option) => {
            const isActive = direction === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setValue('direction', option.value, { shouldDirty: true, shouldValidate: true })}
                className={
                  isActive
                    ? 'bg-background border-border-subtle flex flex-1 items-center justify-center rounded-md border px-3 py-2 shadow-sm'
                    : 'flex flex-1 items-center justify-center rounded-md border border-transparent px-3 py-2'
                }
              >
                <CategoryTile
                  category={{ name: directionLabel(option.value), icon: option.icon, color: option.color }}
                  size="sm"
                  emphasis={isActive}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="counterparty" className="text-text-secondary flex items-center gap-2 text-sm font-medium">
          <User className="text-text-muted h-4 w-4" />
          {t('debt.counterparty')}
        </label>
        <FormInput name="counterparty" placeholder={t('debt.counterpartyPlaceholder')} list="debt-counterparties" />
        <datalist id="debt-counterparties">
          {knownCounterparties.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="space-y-1">
        <label htmlFor="amount" className="text-text-secondary flex items-center gap-2 text-sm font-medium">
          <Coins className="text-text-muted h-4 w-4" />
          {t('shared.amount')}
        </label>
        <Tooltip content={numberToPersianWord} position="top">
          <FormMoneyInput amountName="amount" currencyName="currency" />
        </Tooltip>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="incurredAt" className="text-text-secondary flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="text-text-muted h-4 w-4" />
            {t('debt.incurredAt')}
          </label>
          <FormDatePicker name="incurredAt" />
        </div>

        <div className="space-y-1">
          <label htmlFor="dueDate" className="text-text-secondary flex items-center gap-2 text-sm font-medium">
            <CalendarClock className="text-text-muted h-4 w-4" />
            {t('debt.dueDate')}
          </label>
          <FormDatePicker name="dueDate" placeholder={t('debt.dueDateNone')} isClearable />
        </div>
      </div>

      {/* No account picker here, deliberately. Offering "paid from" at creation
          implies the money is moving now, which is exactly backwards — the
          whole point of recording a debt is that it HASN'T moved yet
          («پولش رو هنوز ندادم»). An account belongs in the settle flow. */}

      <div className="space-y-1">
        <label htmlFor="note" className="text-text-secondary flex items-center gap-2 text-sm font-medium">
          <FileText className="text-text-muted h-4 w-4" />
          {t('debt.note')}
        </label>
        <FormInput name="note" placeholder={t('debt.notePlaceholder')} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('shared.saving')}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {editingDebt ? t('shared.update') : t('shared.add')}
            </>
          )}
        </Button>
        {editingDebt && onCancelEdit && (
          <Button type="button" variant="outline" onClick={handleCancel}>
            {tCommon('cancel')}
          </Button>
        )}
      </div>
    </Form>
  );
};

export default DebtForm;
