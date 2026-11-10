'use client';

import { useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { createExpenseKeyGenerator } from '@api/createExpenseMutation';
import type { CreateExpenseRequestData } from '@api/createExpenseMutation';
import { createTagKeyGenerator } from '@api/createTagMutation';
import type { CreateTagRequestData } from '@api/createTagMutation';
import { getAllExpensesKeyGenerator } from '@api/getAllExpensesQuery';
import { getCategoryListKeyGenerator } from '@api/getCategoryListQuery';
import { EXPENSES_SCOPE } from '@api/getExpenseListQuery';
import { SUMMARY_SCOPE } from '@api/getSummaryQuery';
import { TAGS_SCOPE } from '@api/getTagListQuery';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Sparkles, Tag as TagIcon } from 'lucide-react';

import type { Category, Expense, Tag } from '@types';

import { parseQuickAdd } from '@core/quick-add/parse';
import type { QuickAddDraft, QuickAddErrorReason } from '@core/quick-add/parse';
import { createCategorySuggester } from '@core/quick-add/suggest-category';

import Button from '@components/Button';
import Modal from '@components/Modal';

import { useAppDate } from '@hooks/use-app-date';
import { useCurrency } from '@hooks/use-currency';
import { useMoneyText } from '@hooks/use-money-text';

import { useDrawerStore } from '@stores/drawer';
import { useToast } from '@stores/toast';

import { ensureError, todayInTimeZone } from '@utils';

import CategorySelect from '../CategorySelect';

const REASON_KEYS: Record<QuickAddErrorReason, 'reasonNoAmount' | 'reasonNoDescription'> = {
  'no-amount': 'reasonNoAmount',
  'no-description': 'reasonNoDescription',
};

/**
 * Type or paste a few lines, get reviewed expenses. The text box is the whole
 * input — the list underneath re-parses on every keystroke, so fixing a line
 * means editing it, not hunting for a per-row form.
 */
const QuickAddModal = () => {
  const t = useTranslations('pages.expenses.quickAdd');
  const tCommon = useTranslations('common');
  const isOpen = useDrawerStore((state) => state.quickAddOpen);
  const close = useDrawerStore((state) => state.closeQuickAdd);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { primaryCurrency } = useCurrency();
  const { formatFull } = useMoneyText();
  const formatDate = useAppDate();

  const [text, setText] = useState('');
  // Category picked by hand, keyed by line number — wins over the suggestion.
  const [overrides, setOverrides] = useState<Record<number, number | null>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const isSaving = progress !== null;

  const { data: categories = [] } = useQuery<Category[]>({ queryKey: getCategoryListKeyGenerator(), enabled: isOpen });
  // Past expenses are what the category guess learns from.
  const { data: history = [] } = useQuery<Expense[]>({ queryKey: getAllExpensesKeyGenerator(), enabled: isOpen });

  const { mutateAsync: createExpense } = useMutation<unknown, Error, CreateExpenseRequestData>({
    mutationKey: createExpenseKeyGenerator(),
  });
  const { mutateAsync: createTag } = useMutation<Tag, Error, CreateTagRequestData>({
    mutationKey: createTagKeyGenerator(),
  });

  const lines = useMemo(
    () => parseQuickAdd(text, { today: todayInTimeZone(), defaultCurrency: primaryCurrency }),
    [text, primaryCurrency]
  );
  const suggester = useMemo(
    () =>
      createCategorySuggester(
        history.map((e) => ({ description: e.description, categoryId: e.category.id })),
        categories
      ),
    [history, categories]
  );

  const drafts = lines.filter((l): l is QuickAddDraft => l.ok);
  const categoryFor = (draft: QuickAddDraft): number | null =>
    draft.line in overrides ? overrides[draft.line] : suggester.suggest(draft.description);
  const missingCategory = drafts.filter((d) => categoryFor(d) === null).length;
  const canSave = drafts.length > 0 && missingCategory === 0 && !isSaving;

  const reset = () => {
    setText('');
    setOverrides({});
    setProgress(null);
  };

  const handleClose = () => {
    if (isSaving) return;
    close();
    reset();
  };

  const handleTextChange = (value: string) => {
    setText(value);
    // Line numbers shift as text is edited, so a hand-picked category can end
    // up on the wrong row. Keep only picks whose line still reads the same.
    setOverrides((prev) => {
      const next: Record<number, number | null> = {};
      const before = text.split(/\r?\n/);
      const after = value.split(/\r?\n/);
      for (const [key, categoryId] of Object.entries(prev)) {
        const index = Number(key) - 1;
        if (before[index] !== undefined && before[index] === after[index]) next[Number(key)] = categoryId;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    const tagIds = new Map<string, number>();
    const savedLines = new Set<number>();
    setProgress({ done: 0, total: drafts.length });

    try {
      for (const draft of drafts) {
        const ids: number[] = [];
        for (const name of draft.tags) {
          const key = name.toLowerCase();
          // The endpoint is create-or-get, so an existing tag just comes back.
          if (!tagIds.has(key)) tagIds.set(key, (await createTag({ name })).id);
          ids.push(tagIds.get(key) as number);
        }
        await createExpense({
          date: draft.date,
          categoryId: categoryFor(draft) as number,
          description: draft.description,
          amount: draft.amount,
          currency: draft.currency,
          tagIds: ids,
        });
        savedLines.add(draft.line);
        setProgress({ done: savedLines.size, total: drafts.length });
      }
      showToast(t('saved', { count: savedLines.size }), 'success');
      close();
      reset();
    } catch (err) {
      // Drop what already went in, so trying again can't add it twice.
      const remaining = text
        .split(/\r?\n/)
        .filter((_, index) => !savedLines.has(index + 1))
        .join('\n');
      setText(remaining);
      setOverrides({});
      setProgress(null);
      showToast(
        savedLines.size > 0
          ? t('partialError', { count: savedLines.size, error: ensureError(err).message })
          : ensureError(err).message,
        'error'
      );
    } finally {
      if (savedLines.size > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: EXPENSES_SCOPE }),
          queryClient.invalidateQueries({ queryKey: SUMMARY_SCOPE }),
          queryClient.invalidateQueries({ queryKey: TAGS_SCOPE }),
        ]);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('title')} className="max-w-2xl">
      <div className="space-y-4">
        <div>
          <label htmlFor="quick-add-text" className="text-text-secondary mb-1.5 block text-sm">
            {t('hint')}
          </label>
          <textarea
            id="quick-add-text"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={6}
            dir="auto"
            autoFocus
            disabled={isSaving}
            placeholder={t('placeholder')}
            className="border-input-border bg-input-bg text-text-primary placeholder:text-text-muted focus:border-input-border-focus w-full resize-y rounded-lg border px-3 py-2.5 text-sm leading-relaxed focus:outline-none disabled:opacity-60"
          />
        </div>

        {lines.length > 0 && (
          <ul
            className="border-border-subtle divide-border-subtle max-h-[38vh] divide-y overflow-y-auto rounded-lg border"
            aria-label={t('previewLabel')}
          >
            {lines.map((line) => {
              if (!line.ok) {
                return (
                  <li key={line.line} className="bg-background-secondary flex items-start gap-2.5 px-3 py-2.5">
                    <AlertTriangle className="text-warning mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-text-secondary truncate text-sm" dir="auto">
                        {line.raw}
                      </p>
                      <p className="text-text-muted text-xs">{t(REASON_KEYS[line.reason])}</p>
                    </div>
                  </li>
                );
              }

              const date = formatDate(line.date);
              const categoryId = categoryFor(line);
              const isSuggested = categoryId !== null && !(line.line in overrides);
              return (
                <li key={line.line} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-text-primary truncate text-sm font-medium" dir="auto">
                        {line.description}
                      </p>
                      <p className="text-text-primary shrink-0 text-sm font-semibold tabular-nums">
                        {formatFull(line.amount, line.currency)}
                      </p>
                    </div>
                    <div className="text-text-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <time dateTime={line.date}>{date.primary}</time>
                      {line.tags.map((tag) => (
                        <span
                          key={tag}
                          className="border-tag-border bg-tag-bg text-tag-text inline-flex items-center gap-1 rounded-full border px-1.5 py-px"
                        >
                          <TagIcon className="h-3 w-3" aria-hidden="true" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:w-56 sm:shrink-0">
                    <div className={`min-w-0 flex-1 rounded-lg ${categoryId === null ? 'ring-warning ring-1' : ''}`}>
                      <CategorySelect
                        value={categoryId}
                        onChange={(id) => setOverrides((prev) => ({ ...prev, [line.line]: id }))}
                        disabled={isSaving}
                        placeholder={t('pickCategory')}
                      />
                    </div>
                    {isSuggested && (
                      <span title={t('suggested')} className="text-accent shrink-0">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="sr-only">{t('suggested')}</span>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {missingCategory > 0 && !isSaving && (
          <p className="text-warning text-xs" role="status">
            {t('missingCategory', { count: missingCategory })}
          </p>
        )}

        <div className="flex gap-3 pt-1 rtl:flex-row-reverse">
          <Button variant="primary" onClick={handleSave} disabled={!canSave} className="flex-1">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                <span>{t('saving', { done: progress.done, total: progress.total })}</span>
              </>
            ) : (
              <span>{drafts.length > 0 ? t('save', { count: drafts.length }) : t('saveEmpty')}</span>
            )}
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            {tCommon('cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default QuickAddModal;
