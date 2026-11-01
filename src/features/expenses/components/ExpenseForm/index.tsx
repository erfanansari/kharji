'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { createExpenseKeyGenerator } from '@api/createExpenseMutation';
import { ASSETS_SCOPE, getAssetListKeyGenerator } from '@api/getAssetListQuery';
import { EXPENSES_SCOPE } from '@api/getExpenseListQuery';
import { NET_WORTH_SCOPE } from '@api/getNetWorthHistoryQuery';
import { SUMMARY_SCOPE } from '@api/getSummaryQuery';
import { updateExpenseKeyGenerator } from '@api/updateExpenseMutation';
import type { UpdateExpenseRequestData } from '@api/updateExpenseMutation';
import { PIVOT_CURRENCY } from '@constants/currencies';
import { zodResolver } from '@hookform/resolvers/zod';
import { numberToWords } from '@persian-tools/persian-tools';
import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Coins, FileText, Landmark, Layers, Loader2, Plus, Tag as TagIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';

import { type Tag } from '@types';

import { createExpenseSchema } from '@schemas';
import type { CreateExpenseSchema } from '@schemas';

import Button from '@components/Button';
import Form from '@components/Form';
import FormDatePicker from '@components/Form/components/FormDatePicker';
import FormMoneyInput from '@components/Form/components/FormMoneyInput';
import Tooltip from '@components/Tooltip';

import { useCurrency } from '@hooks/use-currency';

import { useToast } from '@stores/toast';

import { ensureError } from '@utils';

import type { Asset } from '@/@types/asset';
import { isSpendableAssetCategory } from '@/constants/assets';

import AccountSelect from '../AccountSelect';
import AccountBalancePreview from '../AccountSelect/Preview';
import { useLastAccount } from '../AccountSelect/use-last-account';
import CategorySelect from '../CategorySelect';
import RepeatField from '../RepeatField';
import TagInput from '../TagInput';

import type { ExpenseFormProps } from './@types';

// Assets and net worth are invalidated too: an expense paid from an account
// moves that account's balance and writes a valuation, so leaving those caches
// alone would show a stale balance on the assets page and a chart missing its
// newest point. Cheap when nothing was funded, wrong when something was.
const invalidateExpenseData = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: EXPENSES_SCOPE }),
    queryClient.invalidateQueries({ queryKey: SUMMARY_SCOPE }),
    queryClient.invalidateQueries({ queryKey: ASSETS_SCOPE }),
    queryClient.invalidateQueries({ queryKey: NET_WORTH_SCOPE }),
  ]);

const ExpenseForm = ({ onExpenseAdded, editingExpense, onCancelEdit, setIsDirty }: ExpenseFormProps) => {
  // Customs
  const t = useTranslations('forms');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { primaryCurrency } = useCurrency();

  // States — TagInput works with Tag objects; tagIds are derived on submit.
  const [selectedTags, setSelectedTags] = useState<Tag[]>(editingExpense?.tags || []);

  // References — whether the account picker has been touched for the entry
  // currently in the form. An empty `paidFromAssetId` can't tell "never chosen"
  // apart from an explicit "Don't track", so without this the pre-select effect
  // re-filled the field the instant it was cleared and the option could never
  // be picked at all. Reset wherever the form goes back to a blank entry.
  const accountTouched = useRef(false);

  // Variables
  const defaultFormData: CreateExpenseSchema = useMemo(
    () => ({
      date: new Date().toISOString().split('T')[0],
      categoryId: 0,
      description: '',
      amount: 0,
      currency: primaryCurrency || PIVOT_CURRENCY,
      tagIds: [],
      repeat: null,
      paidFromAssetId: null,
    }),
    [primaryCurrency]
  );

  const editingFormData: CreateExpenseSchema | null = useMemo(
    () =>
      editingExpense
        ? {
            date: editingExpense.date,
            categoryId: editingExpense.category.id,
            description: editingExpense.description,
            amount: editingExpense.amount,
            currency: editingExpense.currency,
            tagIds: editingExpense.tags?.map((t) => t.id) || [],
            repeat: editingExpense.repeat,
            paidFromAssetId: editingExpense.paidFromAssetId ?? null,
          }
        : null,
    [editingExpense]
  );

  // Forms
  const tZod = useTranslations();
  const methods = useForm<CreateExpenseSchema>({
    resolver: zodResolver(createExpenseSchema(tZod)),
    defaultValues: editingFormData ?? defaultFormData,
    mode: 'all',
  });

  const { formState, reset, setValue, watch } = methods;
  const amount = watch('amount');
  const currency = watch('currency');
  const date = watch('date');
  const paidFromAssetId = watch('paidFromAssetId');

  // Accounts (cash + bank assets) for the "paid from" field's default.
  const { data: assets = [] } = useQuery<Asset[]>({ queryKey: getAssetListKeyGenerator() });
  const accounts = useMemo(() => assets.filter((a) => isSpendableAssetCategory(a.category)), [assets]);
  const hasAccounts = accounts.length > 0;
  const { lastAccountId, rememberAccount } = useLastAccount();

  // Mutations
  const createMutation = useMutation<unknown, Error, CreateExpenseSchema>({
    mutationKey: createExpenseKeyGenerator(),
  });
  const updateMutation = useMutation<unknown, Error, UpdateExpenseRequestData>({
    mutationKey: updateExpenseKeyGenerator(),
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Effects — resync when the drawer switches to a different expense.
  useEffect(() => {
    if (editingFormData) {
      accountTouched.current = false;
      reset(editingFormData);
      setSelectedTags(editingExpense?.tags || []);
    }
  }, [editingFormData, editingExpense, reset]);

  useEffect(() => {
    setIsDirty?.(formState.isDirty);
  }, [formState.isDirty, setIsDirty]);

  // Pre-select the account so logging an expense stays one motion. Editing is
  // excluded outright: an existing expense's account is a record of what
  // happened, and a default must never quietly rewrite it. It also stands down
  // the moment the user touches the picker — the field is a dependency of this
  // effect, so choosing "Don't track" re-runs it with an empty field, and
  // without `accountTouched` it would just put the account straight back.
  useEffect(() => {
    if (accountTouched.current || editingExpense || paidFromAssetId != null || !hasAccounts) return;

    const single = accounts.length === 1 ? accounts[0].id : null;
    const remembered = accounts.some((a) => a.id === lastAccountId) ? lastAccountId : null;
    const next = single ?? remembered;
    if (next == null) return;

    // Not dirtying the form: a default the user never chose shouldn't make the
    // drawer warn about unsaved changes on close.
    setValue('paidFromAssetId', next, { shouldDirty: false, shouldValidate: false });
  }, [editingExpense, paidFromAssetId, hasAccounts, accounts, lastAccountId, setValue]);

  // Persian words helper only applies when the entry currency is Toman.
  const numberToPersianWord = useMemo(() => {
    if (currency !== PIVOT_CURRENCY || amount <= 0) return '';
    const rounded = Math.round(amount);
    return Number.isSafeInteger(rounded) ? `${numberToWords(rounded)} تومان` : '';
  }, [amount, currency]);

  // Stable identity so TagInput's memoised react-select props survive a render,
  // and `shouldValidate: false` because tagIds carry no validation rules —
  // re-running the whole zod schema on every tag click was wasted work.
  const handleTagsChange = useCallback(
    (tags: Tag[]) => {
      setSelectedTags(tags);
      setValue(
        'tagIds',
        tags.map((tag) => tag.id),
        { shouldDirty: true, shouldValidate: false }
      );
    },
    [setValue]
  );

  const handleSubmit = async (data: CreateExpenseSchema) => {
    const dataToSubmit = { ...data, tagIds: selectedTags.map((t) => t.id) };

    try {
      if (editingExpense) {
        await updateMutation.mutateAsync({ id: editingExpense.id, ...dataToSubmit });
        await invalidateExpenseData(queryClient);
        showToast(t('expense.updated'), 'success');
      } else {
        await createMutation.mutateAsync(dataToSubmit);
        await invalidateExpenseData(queryClient);
        showToast(t('expense.added'), 'success');
      }

      // Remembered on success, not on change, so abandoning a half-filled form
      // doesn't move the default for next time.
      rememberAccount(dataToSubmit.paidFromAssetId ?? null);

      accountTouched.current = false;
      reset(defaultFormData);
      setSelectedTags([]);
      onExpenseAdded();
      if (editingExpense && onCancelEdit) onCancelEdit();
    } catch (err) {
      showToast(ensureError(err).message, 'error');
    }
  };

  const handleCancel = () => {
    accountTouched.current = false;
    reset(defaultFormData);
    if (onCancelEdit) onCancelEdit();
  };

  return (
    <Form methods={methods} onSubmit={handleSubmit} className="space-y-3">
      {/* Row 1: Category and Date */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <div className="space-y-1">
          <label htmlFor="categoryId" className="text-text-secondary flex items-center gap-2 text-sm font-medium">
            <Layers className="text-text-muted h-4 w-4" />
            {t('shared.category')}
          </label>
          <Controller
            name="categoryId"
            control={methods.control}
            render={({ field, fieldState }) => (
              <>
                <CategorySelect
                  inputId="categoryId"
                  value={field.value || null}
                  onChange={(id) => field.onChange(id ?? 0)}
                />
                {fieldState.error?.message && <p className="text-danger mt-1 text-xs">{fieldState.error.message}</p>}
              </>
            )}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="date" className="text-text-secondary flex items-center gap-2 text-sm font-medium">
            <Calendar className="text-text-muted h-4 w-4" />
            {t('shared.date')}
          </label>
          <FormDatePicker name="date" />
        </div>
      </div>

      {/* Repetition belongs to the date, so it sits directly under it. */}
      <Controller
        name="repeat"
        control={methods.control}
        render={({ field }) => <RepeatField date={date} value={field.value} onChange={field.onChange} />}
      />

      {/* Description */}
      <div className="space-y-1">
        <label htmlFor="description" className="text-text-secondary flex items-center gap-2 text-sm font-medium">
          <FileText className="text-text-muted h-4 w-4" />
          {t('shared.description')}
        </label>
        <textarea
          id="description"
          placeholder={t('expense.descriptionPlaceholder')}
          rows={2}
          {...methods.register('description')}
          className="border-border-subtle bg-background text-text-primary placeholder:text-text-muted focus:border-blue w-full resize-none rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none"
        />
        {formState.errors.description?.message && (
          <p className="text-danger mt-1 text-xs">{formState.errors.description.message}</p>
        )}
      </div>

      {/* Tags — labelled like every other field in this form. It used to be the
          one bare box with only a placeholder to name it, which is what made
          the stack read as unfinished. */}
      <div className="space-y-1">
        <label htmlFor="tags" className="text-text-secondary flex items-center gap-2 text-sm font-medium">
          <TagIcon className="text-text-muted h-4 w-4" aria-hidden="true" />
          {t('shared.tags')}
        </label>
        <TagInput selectedTags={selectedTags} onTagsChange={handleTagsChange} />
        <p className="text-text-muted text-xs">{t('expense.tagsHint')}</p>
      </div>

      {/* Amount + Currency */}
      <div className="space-y-1">
        <label htmlFor="amount" className="text-text-secondary flex items-center gap-2 text-sm font-medium">
          <Coins className="text-text-muted h-4 w-4" />
          {t('shared.amount')}
        </label>
        <Tooltip content={numberToPersianWord} position="top">
          <FormMoneyInput amountName="amount" currencyName="currency" placeholder={t('expense.amountPlaceholder')} />
        </Tooltip>
      </div>

      {/* Which account the money leaves. Sits under the amount because it's a
          property of the money, not of the category or the date. Hidden
          entirely when the user has no cash or bank assets — a dead control
          teaching a concept they haven't opted into is worse than nothing. */}
      {hasAccounts && (
        <div className="space-y-1">
          <label htmlFor="paidFromAssetId" className="text-text-secondary flex items-center gap-2 text-sm font-medium">
            <Landmark className="text-text-muted h-4 w-4" aria-hidden="true" />
            {t('expense.paidFrom')}
          </label>
          <Controller
            name="paidFromAssetId"
            control={methods.control}
            render={({ field }) => (
              <>
                <AccountSelect
                  inputId="paidFromAssetId"
                  value={field.value ?? null}
                  onChange={(assetId) => {
                    accountTouched.current = true;
                    field.onChange(assetId);
                  }}
                />
                <AccountBalancePreview assetId={field.value ?? null} amount={amount} currency={currency} />
              </>
            )}
          />
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-1 rtl:flex-row-reverse">
        <Button type="submit" disabled={isSubmitting} variant="primary" className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              <span>{t('shared.saving')}</span>
            </>
          ) : (
            <>
              {!editingExpense && <Plus className="h-4 w-4 shrink-0" />}
              <span>{editingExpense ? t('shared.update') : t('shared.add')}</span>
            </>
          )}
        </Button>
        {editingExpense && (
          <Button type="button" onClick={handleCancel} variant="outline">
            {tCommon('cancel')}
          </Button>
        )}
      </div>
    </Form>
  );
};

export default ExpenseForm;
