'use client';

import { useMemo, useRef } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { getCategoryListKeyGenerator } from '@api/getCategoryListQuery';
import { getTagListKeyGenerator } from '@api/getTagListQuery';
import { useQuery } from '@tanstack/react-query';
import { Calendar, FileText, Loader2, Search, SearchX, Tag as TagIcon, X } from 'lucide-react';
import type { DatePicker as ReactDatePickerType } from 'react-datepicker';
import type { MultiValue } from 'react-select';
import Select2 from 'react-select';

import type { Category } from '@types';

import { ApiError } from '@core/errors';

import Button from '@components/Button';
import CategoryBadge from '@components/CategoryBadge';
import CategoryTile from '@components/CategoryTile';
import DataTable from '@components/DataTable';
import DatePicker from '@components/DatePicker';
import EmptyState from '@components/EmptyState';
import ErrorState from '@components/ErrorState';
import Select from '@components/Select';
import Pulse from '@components/Skeleton';

import { useLocalePreferences } from '@hooks/use-locale-preferences';

import { useDrawerStore } from '@stores/drawer';

import { formatChartAxisDate, resolveCalendar } from '@utils';
import type { AppLocale } from '@utils';

import type { Tag } from '@/@types/expense';

import type { ExpensesTableProps } from '../../@types';
import {
  buildExpenseColumns,
  buildExpenseMobileCard,
  buildExpenseRowActions,
  EXPENSE_TABLE_MIN_WIDTH,
} from '../../constants';
import ExpensesTotal from '../ExpensesTotal';

// ─── TagFilterSelect ──────────────────────────────────────────────────────────

interface TagOption {
  value: number;
  label: string;
}

interface TagFilterSelectProps {
  value: Tag[];
  onChange: (tags: Tag[]) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tagSelectStyles: any = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  menuPortal: (base: any) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
  // Allow the menu to grow wider than the control so long tags never wrap.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  menu: (base: any) => ({ ...base, width: 'max-content', minWidth: '100%' }),
  input: () => ({ color: 'inherit', fontSize: 'inherit', margin: 0, padding: 0 }),
  control: () => ({ minHeight: 'unset', maxHeight: '36px', overflow: 'hidden' }),
  valueContainer: () => ({
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    overflow: 'hidden',
    flexWrap: 'nowrap',
    padding: 0,
  }),
};

function TagFilterSelect({ value, onChange }: TagFilterSelectProps) {
  const t = useTranslations('settings.tags');
  const { data: allTags = [] } = useQuery<Tag[]>({ queryKey: getTagListKeyGenerator() });

  const options: TagOption[] = allTags.map((t) => ({ value: t.id, label: t.name }));
  const selected: TagOption[] = value.map((t) => ({ value: t.id, label: t.name }));

  const handleChange = (newValue: MultiValue<TagOption>) => {
    const tags = newValue.map((o) => allTags.find((t) => t.id === o.value)).filter(Boolean) as Tag[];
    onChange(tags);
  };

  return (
    <Select2<TagOption, true>
      isMulti
      classNamePrefix="tf"
      value={selected}
      onChange={handleChange}
      options={options}
      placeholder={t('title')}
      isSearchable
      closeMenuOnSelect={false}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuPosition="fixed"
      unstyled
      styles={tagSelectStyles}
      components={{
        DropdownIndicator: () => null,
        IndicatorSeparator: () => null,
        ClearIndicator: () => null,
      }}
      classNames={{
        control: ({ isFocused }) =>
          `border rounded-lg px-3 py-2 text-sm transition-all cursor-pointer flex items-center bg-background ${
            isFocused ? 'border-blue ring-2 ring-blue/15' : 'border-border-subtle hover:border-border-default'
          }`,
        valueContainer: () => 'gap-1',
        placeholder: () => 'text-text-muted text-sm whitespace-nowrap',
        input: () => 'text-text-primary text-sm shrink-0 min-w-0',
        menu: () =>
          'border-border-subtle bg-background mt-1.5 rounded-xl border p-1 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18),0_4px_8px_-4px_rgba(0,0,0,0.08)] animate-dropdown-pop overflow-hidden min-w-[180px]',
        menuList: () => 'flex flex-col gap-0.5 max-h-80 overflow-y-auto',
        option: ({ isFocused, isSelected }) =>
          `flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] whitespace-nowrap text-text-secondary cursor-pointer transition-colors duration-100 ${
            isFocused ? 'bg-background-elevated text-text-primary' : ''
          } ${isSelected ? 'text-text-primary font-medium' : ''}`,
        multiValue: () =>
          'border-border-subtle bg-background-elevated text-text-secondary flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium',
        multiValueLabel: () => 'flex items-center gap-1',
        multiValueRemove: () =>
          'text-text-muted hover:text-text-primary ms-0.5 rounded p-0.5 transition-colors cursor-pointer',
        noOptionsMessage: () => 'text-text-muted px-3 py-3 text-[13px]',
      }}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatChipDate(iso: string, locale: AppLocale, calendar: ReturnType<typeof resolveCalendar>) {
  return formatChartAxisDate(new Date(`${iso}T00:00:00`), 'day', locale, calendar);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ExpensesSkeleton() {
  return (
    <div className="border-border-subtle bg-background overflow-hidden rounded-xl border shadow-sm">
      <div className="bg-background-secondary px-4 py-3.5 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Pulse className="h-3 w-24" />
          <Pulse className="hidden h-3 w-20 sm:block" />
          <Pulse className="hidden h-3 w-16 sm:block" />
          <Pulse className="h-3 w-16" />
          <Pulse className="hidden h-3 w-14 sm:block" />
        </div>
      </div>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="border-border-subtle border-t px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Pulse className="h-4 w-40" />
              <Pulse className="h-3 w-24" />
            </div>
            <div className="hidden flex-col gap-1 sm:flex">
              <Pulse className="h-4 w-20" />
              <Pulse className="h-3 w-16" />
            </div>
            <div className="hidden flex-col gap-1 sm:flex">
              <Pulse className="h-4 w-24" />
              <Pulse className="h-3 w-14" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Pulse className="h-4 w-24" />
              <Pulse className="h-3 w-16" />
            </div>
            <div className="hidden items-center justify-center gap-1 sm:flex">
              <Pulse className="h-8 w-8 rounded-lg" />
              <Pulse className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ExpensesTable = ({
  expenses,
  summary,
  isLoading,
  error,
  filters,
  descInput,
  onDescInputChange,
  onFiltersChange,
  onRowClick,
  onEdit,
  onDelete,
  deletingId,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onRetry,
}: ExpensesTableProps) => {
  // Customs
  const tTables = useTranslations('tables');
  const tOnboarding = useTranslations('onboarding.emptyStates');
  const t = useTranslations('pages.expenses');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const { prefs: localePrefs } = useLocalePreferences();
  const calendar = resolveCalendar(localePrefs.calendar, locale);

  // References
  const toPickerRef = useRef<ReactDatePickerType>(null);

  const openExpenseDrawer = useDrawerStore((state) => state.openExpenseDrawer);

  // Derived state
  const { data: allTags = [] } = useQuery<Tag[]>({ queryKey: getTagListKeyGenerator() });
  const { data: allCategories = [] } = useQuery<Category[]>({ queryKey: getCategoryListKeyGenerator() });
  const selectedTagObjects: Tag[] = useMemo(
    () => (filters.tagIds ?? []).map((id) => allTags.find((t) => t.id === id)).filter(Boolean) as Tag[],
    [filters.tagIds, allTags]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (descInput) count++;
    if (filters.categoryId) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    count += (filters.tagIds ?? []).length;
    return count;
  }, [descInput, filters]);

  const hasActiveFilter = activeFilterCount > 0;

  const selectedCategory = useMemo(
    () => (filters.categoryId ? allCategories.find((c) => c.id === filters.categoryId) : undefined),
    [filters.categoryId, allCategories]
  );

  // Memos
  const expenseColumns = useMemo(
    () => buildExpenseColumns(tTables, onEdit, onDelete, deletingId),
    [tTables, onEdit, onDelete, deletingId]
  );

  const expenseMobileCard = useMemo(() => buildExpenseMobileCard(tTables), [tTables]);

  const expenseRowActions = useMemo(
    () => buildExpenseRowActions(tTables, onEdit, onDelete, deletingId),
    [tTables, onEdit, onDelete, deletingId]
  );

  if (isLoading && expenses.length === 0) {
    return <ExpensesSkeleton />;
  }

  if (error && expenses.length === 0) {
    if (error instanceof ApiError && error.status === 401) return null;
    return (
      <div className="border-border-subtle bg-background relative overflow-hidden rounded-xl border shadow-sm">
        <ErrorState title={t('loadError')} description={error.message} onRetry={onRetry} />
      </div>
    );
  }

  const handleClearAll = () => {
    onFiltersChange(() => ({}));
    onDescInputChange('');
  };

  return (
    <DataTable
      data={expenses}
      columns={expenseColumns}
      onRowClick={onRowClick}
      getRowId={(row) => String(row.id)}
      minimal={true}
      minWidth={EXPENSE_TABLE_MIN_WIDTH}
      mobileCard={expenseMobileCard}
      rowActions={expenseRowActions}
      rowActionTitle={(expense) => expense.description}
      header={<ExpensesTotal summary={summary} />}
      filterBar={
        <div className="border-border-subtle border-b">
          {/* Row 1: Search */}
          <div className="border-border-subtle border-b px-4 pt-3 pb-2.5">
            <div className="border-border-subtle bg-background text-text-primary focus-within:border-blue flex items-center gap-2 rounded-lg border px-3 py-2 transition-all">
              <Search className="text-text-muted h-4 w-4 shrink-0" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={descInput}
                onChange={(e) => onDescInputChange(e.target.value)}
                className="placeholder:text-text-muted w-full bg-transparent text-sm outline-none"
              />
              {descInput && (
                <button
                  onClick={() => onDescInputChange('')}
                  className="text-text-muted hover:text-text-primary rounded p-0.5 transition-colors"
                  aria-label={t('clearSearchAria')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Filter controls */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            {/* Category */}
            <Select
              value={filters.categoryId ? String(filters.categoryId) : ''}
              onChange={(val) => onFiltersChange((f) => ({ ...f, categoryId: val ? Number(val) : undefined }))}
              options={[
                { value: '', label: t('allCategories') },
                ...allCategories.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
              placeholder={t('allCategories')}
              className="min-w-[130px] flex-1"
              // Picking a category, so it gets the tile. The "all categories"
              // row has no category behind it and stays plain text.
              formatOptionLabel={(option) => {
                const category = allCategories.find((c) => String(c.id) === option.value);
                return category ? <CategoryTile category={category} /> : <span>{option.label}</span>;
              }}
            />

            {/* Date range */}
            <div className="border-border-subtle bg-background focus-within:border-blue flex min-w-[200px] flex-1 items-center gap-1 rounded-lg border px-2 py-1 transition-all">
              <Calendar className="text-text-muted h-3.5 w-3.5 shrink-0" />
              <DatePicker
                value={filters.dateFrom ?? ''}
                onChange={(date) => {
                  onFiltersChange((f) => ({ ...f, dateFrom: date || undefined }));
                  if (date) setTimeout(() => toPickerRef.current?.setOpen(true), 50);
                }}
                placeholder={t('dateFrom')}
                isClearable
                // min-w bumped from 80px: Jalali dates ("۲۵ اردیبهشت ۱۴۰۵") run
                // noticeably wider than the Gregorian ISO strings this was
                // originally sized for, and were colliding with the clear
                // button at the field's minimum width. pe-5 reserves room for
                // that button on its (locale-aware) side.
                wrapperClassName="flex-1 min-w-[130px] [&_input]:border-0 [&_input]:!bg-transparent [&_input]:px-1 [&_input]:pe-5 [&_input]:py-0 [&_input]:shadow-none [&_input]:rounded-none"
              />
              <span className="text-text-muted shrink-0 text-xs rtl:-scale-x-100">→</span>
              <DatePicker
                ref={toPickerRef}
                value={filters.dateTo ?? ''}
                onChange={(date) => onFiltersChange((f) => ({ ...f, dateTo: date || undefined }))}
                placeholder={t('dateTo')}
                isClearable
                // min-w bumped from 80px: Jalali dates ("۲۵ اردیبهشت ۱۴۰۵") run
                // noticeably wider than the Gregorian ISO strings this was
                // originally sized for, and were colliding with the clear
                // button at the field's minimum width. pe-5 reserves room for
                // that button on its (locale-aware) side.
                wrapperClassName="flex-1 min-w-[130px] [&_input]:border-0 [&_input]:!bg-transparent [&_input]:px-1 [&_input]:pe-5 [&_input]:py-0 [&_input]:shadow-none [&_input]:rounded-none"
              />
            </div>

            {/* Tag filter */}
            <div className="min-w-[120px] flex-1">
              <TagFilterSelect
                value={selectedTagObjects}
                onChange={(tags) =>
                  onFiltersChange((f) => ({
                    ...f,
                    tagIds: tags.length ? tags.map((t) => t.id) : undefined,
                  }))
                }
              />
            </div>

            {/* Clear all */}
            {hasActiveFilter && (
              <button
                onClick={handleClearAll}
                className="border-border-subtle text-text-secondary hover:bg-background-elevated flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors"
                title={t('clearFiltersTitle')}
              >
                <X className="h-3.5 w-3.5" />
                <span>{t('clear')}</span>
                <span className="bg-background-elevated text-text-secondary rounded px-1 py-0.5 text-[10px] leading-none font-semibold">
                  {activeFilterCount}
                </span>
              </button>
            )}
          </div>

          {/* Row 3: Active filter chips */}
          {hasActiveFilter &&
            (selectedCategory || filters.dateFrom || filters.dateTo || selectedTagObjects.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2.5">
                {/* Category chip */}
                {selectedCategory && (
                  <span className="border-border-subtle bg-background-secondary flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                    <CategoryBadge category={selectedCategory} />
                    <button
                      onClick={() => onFiltersChange((f) => ({ ...f, categoryId: undefined }))}
                      className="text-text-muted hover:text-text-primary ms-0.5 transition-colors"
                      aria-label={t('removeCategoryFilterAria', { name: selectedCategory.name })}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {/* Date chip */}
                {(filters.dateFrom || filters.dateTo) && (
                  <span className="border-border-subtle bg-background-secondary text-text-secondary flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {filters.dateFrom ? formatChipDate(filters.dateFrom, locale, calendar) : '…'}
                    {' – '}
                    {filters.dateTo ? formatChipDate(filters.dateTo, locale, calendar) : '…'}
                    <button
                      onClick={() => onFiltersChange((f) => ({ ...f, dateFrom: undefined, dateTo: undefined }))}
                      className="text-text-muted hover:text-text-primary ms-0.5 transition-colors"
                      aria-label={t('removeDateFilterAria')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {/* Tag chips */}
                {selectedTagObjects.map((tag) => (
                  <span
                    key={tag.id}
                    className="border-border-subtle bg-background-secondary text-text-secondary flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
                  >
                    <TagIcon className="h-3 w-3 shrink-0" />
                    {tag.name}
                    <button
                      onClick={() =>
                        onFiltersChange((f) => ({
                          ...f,
                          tagIds: f.tagIds?.filter((id) => id !== tag.id),
                        }))
                      }
                      className="text-text-muted hover:text-text-primary ms-0.5 transition-colors"
                      aria-label={tTables('removeTagFilter', { name: tag.name })}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
        </div>
      }
      emptyState={
        <div className="flex flex-col items-center">
          {isLoading && <Loader2 className="text-text-muted h-6 w-6 animate-spin" />}
          {!isLoading && hasActiveFilter && (
            <EmptyState
              icon={SearchX}
              title={tOnboarding('noMatch.title')}
              description={tOnboarding('noMatch.description')}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    onDescInputChange('');
                    onFiltersChange(() => ({}));
                  }}
                >
                  {tOnboarding('noMatch.clearFilters')}
                </Button>
              }
            />
          )}
          {!isLoading && !hasActiveFilter && (
            <EmptyState
              icon={FileText}
              title={tOnboarding('expensesTable.title')}
              description={tOnboarding('expensesTable.description')}
              action={
                <Button variant="outline" onClick={() => openExpenseDrawer()}>
                  {tOnboarding('addExpense')}
                </Button>
              }
            />
          )}
        </div>
      }
      footer={
        <>
          {hasNextPage && (
            <div className="mt-4">
              <Button onClick={onLoadMore} disabled={isFetchingNextPage} variant="outline" className="w-full">
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    <span>{tCommon('loading')}</span>
                  </>
                ) : (
                  t('loadMore')
                )}
              </Button>
            </div>
          )}
          {!hasNextPage && expenses.length > 0 && (
            <div className="text-text-muted mt-6 flex items-center justify-center gap-2 py-4">
              <div className="bg-border-subtle h-px w-12" />
              <p className="text-sm">{t('endOfList')}</p>
              <div className="bg-border-subtle h-px w-12" />
            </div>
          )}
        </>
      }
    />
  );
};

export default ExpensesTable;
