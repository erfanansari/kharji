'use client';

import { useMemo } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { isCalendarSensitive, MAX_RECURRENCE_INTERVAL, RECURRENCE_FREQUENCIES } from '@constants/recurring';
import { Repeat } from 'lucide-react';

import type { RepeatSchema } from '@schemas';

import { occurrenceAt } from '@core/recurring/schedule';

import DatePicker from '@components/DatePicker';
import Select from '@components/Select';

import { useAppDate } from '@hooks/use-app-date';
import { useLocalePreferences } from '@hooks/use-locale-preferences';

import { resolveCalendar } from '@utils';
import type { AppLocale } from '@utils';

/** The `none` sentinel and `custom` escape hatch aren't stored — they only exist
 * as choices in the dropdown. Everything else maps 1:1 to a frequency. */
const NONE = 'none';
const CUSTOM = 'custom';

interface RepeatFieldProps {
  /** The expense's own date — the repeat's anchor, and what the preview counts from. */
  date: string;
  value: RepeatSchema | null | undefined;
  onChange: (next: RepeatSchema | null) => void;
}

/**
 * Repetition as a property of the date, in the shape Todoist uses: one dropdown
 * that reads "doesn't repeat / every day / every week / …", with the fiddly
 * controls (interval, calendar, end date) hidden behind "custom" so the common
 * case is a single click.
 *
 * There is deliberately no separate rules list, no pause and no manager screen —
 * removing a repeat means choosing "doesn't repeat" here.
 */
const RepeatField = ({ date, value, onChange }: RepeatFieldProps) => {
  const t = useTranslations('forms.repeat');
  const locale = useLocale() as AppLocale;
  const { prefs } = useLocalePreferences();
  const appDate = useAppDate();

  const defaultCalendar = resolveCalendar(prefs.calendar, locale);

  // A repeat needs the custom controls once it stops being expressible as a
  // one-click preset — i.e. any interval but 1, or an end date.
  const isCustom = !!value && (value.intervalCount !== 1 || !!value.endDate);
  const presetValue = isCustom ? CUSTOM : value?.frequency;
  const selectValue = presetValue ?? NONE;

  const handleSelect = (next: string) => {
    if (next === NONE) return onChange(null);

    if (next === CUSTOM) {
      // Entering custom keeps whatever is already set and just reveals the
      // extra controls; the interval bump makes the switch visible.
      return onChange({
        frequency: value?.frequency ?? 'monthly',
        intervalCount: value?.intervalCount && value.intervalCount > 1 ? value.intervalCount : 2,
        calendar: value?.calendar ?? defaultCalendar,
        endDate: value?.endDate ?? null,
      });
    }

    onChange({
      frequency: next as RepeatSchema['frequency'],
      intervalCount: 1,
      calendar: value?.calendar ?? defaultCalendar,
      endDate: null,
    });
  };

  const patch = (partial: Partial<RepeatSchema>) => {
    if (!value) return;
    onChange({ ...value, ...partial });
  };

  /** The next two dates this will land on — the sanity check that makes a
   * Jalali-vs-Gregorian monthly choice legible instead of abstract. */
  const preview = useMemo(() => {
    if (!value || !date) return null;
    try {
      const rule = { ...value, anchorDate: date, endDate: value.endDate ?? null };
      return [1, 2]
        .map((n) => occurrenceAt(rule, n))
        .filter((d) => !rule.endDate || d <= rule.endDate)
        .map((d) => appDate(d).primary);
    } catch {
      // A half-typed date shouldn't put an error under the field.
      return null;
    }
  }, [value, date, appDate]);

  const showCalendar = !!value && isCalendarSensitive(value.frequency);

  return (
    <div className="space-y-2">
      <label htmlFor="repeat" className="text-text-secondary flex items-center gap-2 text-sm font-medium">
        <Repeat className="text-text-muted h-4 w-4" aria-hidden="true" />
        {t('label')}
      </label>

      <Select
        inputId="repeat"
        value={selectValue}
        onChange={handleSelect}
        options={[
          { value: NONE, label: t('none') },
          ...RECURRENCE_FREQUENCIES.map((f) => ({ value: f.value, label: t(`preset.${f.labelKey}`) })),
          { value: CUSTOM, label: t('custom') },
        ]}
      />

      {isCustom && value && (
        <div className="border-border-subtle space-y-3 rounded-lg border p-3">
          {/* "Every [N] [months]" reads as one sentence, so the controls share a row. */}
          <div className="flex items-end gap-2">
            <div className="w-20 space-y-1">
              <label htmlFor="repeatInterval" className="text-text-muted text-xs font-medium">
                {t('every')}
              </label>
              <input
                id="repeatInterval"
                type="number"
                min={1}
                max={MAX_RECURRENCE_INTERVAL}
                value={value.intervalCount}
                onChange={(e) => patch({ intervalCount: Math.max(1, Number(e.target.value) || 1) })}
                className="border-border-subtle bg-background text-text-primary focus:border-blue w-full rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label htmlFor="repeatUnit" className="text-text-muted text-xs font-medium">
                {t('unitLabel')}
              </label>
              <Select
                inputId="repeatUnit"
                value={value.frequency}
                onChange={(next) => patch({ frequency: next as RepeatSchema['frequency'] })}
                options={RECURRENCE_FREQUENCIES.map((f) => ({
                  value: f.value,
                  label: t(`unit.${f.labelKey}`, { interval: value.intervalCount }),
                }))}
              />
            </div>
          </div>

          {/* Only monthly/yearly change meaning between calendars — a week is
              seven days in both, so the control would be inert there. */}
          {showCalendar && (
            <div className="space-y-1">
              <label htmlFor="repeatCalendar" className="text-text-muted text-xs font-medium">
                {t('calendarLabel')}
              </label>
              <Select
                inputId="repeatCalendar"
                value={value.calendar}
                onChange={(next) => patch({ calendar: next as RepeatSchema['calendar'] })}
                options={[
                  { value: 'gregorian', label: t('calendarOption.gregorian') },
                  { value: 'jalali', label: t('calendarOption.jalali') },
                ]}
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="repeatEndDate" className="text-text-muted text-xs font-medium">
              {t('endDate')}
            </label>
            <DatePicker
              id="repeatEndDate"
              value={value.endDate ?? ''}
              onChange={(next) => patch({ endDate: next || null })}
              placeholder={t('noEndDate')}
              isClearable
            />
          </div>
        </div>
      )}

      {preview && preview.length > 0 && (
        <p className="text-text-muted text-xs">{t('next', { dates: preview.join(' · ') })}</p>
      )}
    </div>
  );
};

export default RepeatField;
