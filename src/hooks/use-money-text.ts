'use client';

import { useMemo } from 'react';

import { useLocale } from 'next-intl';

import { maskMoney } from '@features/ExchangeRate/utils/currency';
import { usePrivacy } from '@features/privacy/PrivacyProvider';

import type { MoneyDisplay, MoneyItem } from '@hooks/use-currency';
import { useCurrency } from '@hooks/use-currency';

interface FormatOpts {
  compact?: boolean;
}

/**
 * Privacy-aware money formatting for the places that need a plain string rather
 * than a component — chart axis ticks, chart tooltips, and sentences that
 * interpolate an amount.
 *
 * Deliberately a layer ON TOP of useCurrency rather than a change to it:
 * useCurrency is also what exports and any future server-side formatting reach
 * for, and a mask baked in down there would quietly put dots in a downloaded
 * spreadsheet.
 */
export function useMoneyText() {
  const { format, formatFull, display, sumDisplay, primaryCurrency, secondaryCurrency } = useCurrency();
  const { hidden } = usePrivacy();
  const locale = useLocale() as 'en' | 'fa';

  return useMemo(() => {
    const maskedPair = (): MoneyDisplay => ({
      primary: maskMoney(primaryCurrency, { locale }),
      secondary:
        secondaryCurrency && secondaryCurrency !== primaryCurrency
          ? maskMoney(secondaryCurrency, { locale, dots: 4 })
          : null,
    });

    return {
      format: (value: number, currency: string, opts?: FormatOpts): string =>
        hidden ? maskMoney(currency, { locale }) : format(value, currency, opts),
      formatFull: (value: number, currency: string): string =>
        hidden ? maskMoney(currency, { locale }) : formatFull(value, currency),
      display: (amount: number, currency: string, date?: string, opts?: FormatOpts): MoneyDisplay =>
        hidden ? maskedPair() : display(amount, currency, date, opts),
      sumDisplay: (items: MoneyItem[], opts?: FormatOpts): MoneyDisplay =>
        hidden ? maskedPair() : sumDisplay(items, opts),
    };
  }, [hidden, locale, format, formatFull, display, sumDisplay, primaryCurrency, secondaryCurrency]);
}
