'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { ArrowLeftRight, Calendar, Coins, Edit2, Landmark, Repeat, Tag as TagIcon, Trash2, X } from 'lucide-react';
import { Drawer } from 'vaul';

import { formatMoney } from '@features/ExchangeRate/utils/currency';
import { useRecurrenceSummary } from '@features/expenses/utils/use-recurrence-summary';

import CategoryBadge from '@components/CategoryBadge';
import Money from '@components/Money';

import { useAppDate } from '@hooks/use-app-date';
import { useCurrency } from '@hooks/use-currency';
import { useLocalePreferences } from '@hooks/use-locale-preferences';

import { formatAppDateTime, resolveCalendar } from '@utils';

import { type Expense } from '@/@types/expense';

interface ExpenseDetailsDrawerProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  /** Closes the drawer, then opens the expense form. */
  onEdit?: (expense: Expense) => void;
  /** Closes the drawer, then opens the delete confirmation. */
  onDelete?: (expense: Expense) => void;
}

interface MetaCellProps {
  icon: React.ReactNode;
  label: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}

// Compact metadata cell — used inside the 2-column grid below the hero.
const MetaCell = ({ icon, label, primary, secondary }: MetaCellProps) => (
  <div className="border-border-subtle bg-background-secondary/60 flex flex-col gap-1 rounded-xl border p-4">
    <div className="text-text-muted flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
      {label}
    </div>
    <div className="text-text-primary text-sm font-semibold tabular-nums">{primary}</div>
    {secondary && <div className="text-text-muted text-xs tabular-nums">{secondary}</div>}
  </div>
);

type ConvertFn = (amount: number, from: string, to: string, date?: string) => number | null;

/**
 * The exchange rate to surface for an expense: the rate between the two
 * currencies the drawer displays (primary vs. secondary), or — when no distinct
 * secondary — between the entry currency and the primary. Computed at the
 * expense's own date so it matches the secondary amount shown in the hero.
 * "Auto direction": the stronger unit is the base, so the rate always reads ≥ 1.
 * Returns null when everything is one currency (no meaningful rate).
 */
function expenseRate(
  expense: Expense,
  primaryCurrency: string,
  secondaryCurrency: string | null,
  convert: ConvertFn
): { base: string; quote: string; rate: number } | null {
  const other = secondaryCurrency && secondaryCurrency !== primaryCurrency ? secondaryCurrency : null;
  const counterpart = other ?? (expense.currency !== primaryCurrency ? expense.currency : null);
  if (!counterpart || counterpart === primaryCurrency) return null;

  const rate = convert(1, primaryCurrency, counterpart, expense.date);
  if (rate === null) return null;

  // Flip so the base is the stronger unit (rate ≥ 1) for readability.
  if (rate < 1) {
    const inv = convert(1, counterpart, primaryCurrency, expense.date);
    if (inv === null) return null;
    return { base: counterpart, quote: primaryCurrency, rate: inv };
  }
  return { base: primaryCurrency, quote: counterpart, rate };
}

const ExpenseDetailsDrawer = ({ expense, isOpen, onClose, onEdit, onDelete }: ExpenseDetailsDrawerProps) => {
  // Customs
  const t = useTranslations();
  const locale = useLocale() as 'en' | 'fa';
  const isRtl = locale === 'fa';
  const { prefs: localePrefs } = useLocalePreferences();
  const calendar = resolveCalendar(localePrefs.calendar, locale);
  const summarizeRepeat = useRecurrenceSummary();

  // Currency context (for the exchange-rate cell)
  const { primaryCurrency, secondaryCurrency, convert } = useCurrency();

  // References
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // States
  const [isMobile, setIsMobile] = useState(false);

  // Effects
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Callbacks
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      if (!isOpen && previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    };
  }, [isOpen, handleClose]);

  // Variables
  const appDate = useAppDate();
  const expenseDate = expense ? appDate(expense.date) : null;
  const rateInfo = expense ? expenseRate(expense, primaryCurrency, secondaryCurrency, convert) : null;

  let drawerDirection: 'bottom' | 'right' | 'left' = 'left';
  if (isMobile) drawerDirection = 'bottom';
  else if (isRtl) drawerDirection = 'right';

  return (
    <Drawer.Root
      open={isOpen && expense !== null}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      direction={drawerDirection}
      shouldScaleBackground={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className={
            isMobile
              ? 'bg-background fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] max-h-[85dvh] flex-col rounded-t-2xl shadow-2xl outline-none'
              : 'bg-background fixed start-0 top-0 bottom-0 z-50 flex w-[520px] flex-col shadow-2xl outline-none'
          }
        >
          {/* Accessibility: Title must be direct child for screen readers */}
          <Drawer.Title className="sr-only">{t('pages.expenses.details.title')}</Drawer.Title>

          {/* Header with drag handle */}
          <div className="border-border-subtle shrink-0 border-b">
            {/* Drag handle - only on mobile */}
            {isMobile && (
              <div className="bg-background-secondary flex justify-center rounded-t-2xl py-3">
                <div className="bg-border-strong h-1 w-10 rounded-full" />
              </div>
            )}

            {/* Title bar */}
            <div
              className={`bg-background-secondary flex items-center justify-between px-4 pb-4 md:px-6 md:pb-5 ${!isMobile ? 'pt-4 md:pt-5' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-text-primary text-base font-semibold sm:text-lg">
                  {t('pages.expenses.details.title')}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="text-action-default hover:bg-action-cancel-bg-hover hover:text-action-cancel-text-hover ms-3 rounded-lg p-2 transition-all duration-200"
                aria-label={t('common.closeDrawer')}
                title={t('common.closeDrawer')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 md:px-8 md:py-8">
            {expense && (
              <div className="flex flex-col gap-5">
                {/* ─── Hero: category + description + hero amount ───────── */}
                <section className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <CategoryBadge category={expense.category} size="md" />
                    <time
                      dateTime={expense.date}
                      className="text-text-muted shrink-0 text-xs tabular-nums"
                      title={expenseDate?.secondary ?? undefined}
                    >
                      {expenseDate?.primary}
                    </time>
                  </div>

                  <h3 className="text-text-primary text-xl leading-tight font-semibold break-words sm:text-2xl">
                    {expense.description}
                  </h3>

                  <Money
                    amount={expense.amount}
                    currency={expense.currency}
                    date={expense.date}
                    entryRate={expense.entryRate}
                    primaryClassName="text-text-primary text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl"
                    secondaryClassName="text-text-secondary text-base font-medium tabular-nums"
                  />
                </section>

                {/* ─── Tags row (only when present) ───────────────────── */}
                {expense.tags && expense.tags.length > 0 && (
                  <section className="flex flex-wrap gap-1.5">
                    {expense.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="border-border-subtle bg-background-elevated text-text-secondary inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium"
                      >
                        <TagIcon className="h-3 w-3" aria-hidden="true" />
                        {tag.name}
                      </span>
                    ))}
                  </section>
                )}

                {/* ─── Metadata grid: date + exchange rate ────────────── */}
                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <MetaCell
                    icon={<Calendar className="text-text-muted h-3 w-3" />}
                    label={t('pages.expenses.details.date')}
                    primary={expenseDate?.primary}
                    secondary={
                      expenseDate?.secondary && (
                        <span dir="auto" className="block">
                          {expenseDate.secondary}
                        </span>
                      )
                    }
                  />
                  <MetaCell
                    icon={<ArrowLeftRight className="text-text-muted h-3 w-3" />}
                    label={t('pages.expenses.details.enteredIn')}
                    primary={expense.currency}
                  />
                  {rateInfo && (
                    <MetaCell
                      icon={<Coins className="text-text-muted h-3 w-3" />}
                      label={t('pages.expenses.details.exchangeRate')}
                      primary={`1 ${rateInfo.base} = ${formatMoney(rateInfo.rate, rateInfo.quote, { locale })}`}
                    />
                  )}
                  {expense.paidFrom && (
                    <MetaCell
                      icon={<Landmark className="text-text-muted h-3 w-3" />}
                      label={t('pages.expenses.details.paidFrom')}
                      primary={expense.paidFrom.name}
                      // The raw stored delta in its stored currency, deliberately
                      // not <Money>: this answers "what actually left the
                      // account", and that is the number a reversal will use. A
                      // re-conversion could show a figure the balance never moved by.
                      secondary={
                        expense.paidFromDelta !== null && expense.paidFromCurrency !== null ? (
                          <span className="block tabular-nums">
                            {formatMoney(expense.paidFromDelta, expense.paidFromCurrency, { locale })}
                          </span>
                        ) : undefined
                      }
                    />
                  )}
                </section>

                {/* Explains a row the user may not remember entering, and names
                    the schedule behind it. Disappears once the repeat is
                    removed (recurringId is SET NULL). */}
                {expense.repeat && (
                  <p className="text-text-secondary border-border-subtle bg-background-secondary mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                    <Repeat className="text-text-muted h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {summarizeRepeat(expense.repeat)}
                  </p>
                )}

                {/* ─── Footer metadata ─────────────────────────────────── */}
                <p className="text-text-muted border-border-subtle/60 mt-1 border-t pt-4 text-xs">
                  {t('pages.expenses.details.created')}{' '}
                  <time dateTime={expense.created_at} className="text-text-secondary tabular-nums">
                    {formatAppDateTime(expense.created_at, { locale, calendar })}
                  </time>
                </p>
              </div>
            )}
          </div>

          {/* Actions — pinned, outside the scroll area.
              Opening this drawer used to be a dead end: on a phone the table's
              action buttons sit off-screen, so a row tap led here and there was
              nothing to do. Shown at every width, since the dead end existed on
              desktop too. */}
          {expense && (onEdit || onDelete) && (
            <div className="border-border-subtle bg-background flex shrink-0 gap-2 border-t px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8">
              {onDelete && (
                <button
                  onClick={() => {
                    handleClose();
                    onDelete(expense);
                  }}
                  className="border-button-outline-border bg-background text-button-outline-text hover:border-danger hover:text-danger flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition-colors"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {t('tables.delete')}
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => {
                    handleClose();
                    onEdit(expense);
                  }}
                  className="bg-button-primary-bg hover:bg-button-primary-bg-hover text-button-primary-text flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition-colors"
                >
                  <Edit2 className="h-4 w-4" aria-hidden="true" />
                  {t('tables.edit')}
                </button>
              )}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default ExpenseDetailsDrawer;
