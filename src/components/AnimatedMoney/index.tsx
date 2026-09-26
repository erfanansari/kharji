'use client';

import { useLocale } from 'next-intl';

import NumberFlow from '@number-flow/react';

import { usePrivacy } from '@features/privacy/PrivacyProvider';

import MaskedAmount from '@components/MaskedAmount';

import { getCurrency } from '@/constants/currencies';
import { formatMoney } from '@/features/ExchangeRate/utils/currency';
import { formatNumber } from '@/utils/format';

interface AnimatedMoneyProps {
  amount: number;
  currency: string;
  /** Compact notation (1.2K, 3.4M) — mirrors formatMoney's compact mode. */
  compact?: boolean;
  className?: string;
  /**
   * Whether this figure reveals the user's own position, and so should be
   * withheld in privacy mode. False for published values that are identical for
   * everyone — the USD/Toman rate being the only one today.
   */
  sensitive?: boolean;
}

/**
 * Animated counterpart of formatMoney (src/features/ExchangeRate/utils/currency.ts):
 * same Intl options and symbol placement. Animates ONLY when the value changes
 * while mounted (NumberFlow's default) — page loads render statically; the roll
 * is feedback for user actions (filters, mutations, currency switches).
 *
 * fa-IR renders statically instead: number-flow's core parses each formatted digit
 * via `parseInt(char)`, which only understands ASCII 0-9 — fa-IR's Persian digit
 * glyphs parse to NaN there, dropping the digits entirely. Falling back to plain
 * formatMoney output keeps the (correct, Persian-digit) text and just loses the roll.
 */
const AnimatedMoney = ({ amount, currency, compact = true, className, sensitive = true }: AnimatedMoneyProps) => {
  const locale = useLocale();
  const { hidden } = usePrivacy();
  const def = getCurrency(currency);

  const figure =
    locale === 'fa' ? (
      <span className={className}>{formatMoney(amount, currency, { compact, locale: 'fa' })}</span>
    ) : (
      <NumberFlow
        value={amount}
        locales="en-US"
        format={
          compact
            ? { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 2 }
            : { minimumFractionDigits: 0, maximumFractionDigits: def.decimals }
        }
        prefix={def.symbolPosition === 'prefix' ? def.symbol : undefined}
        suffix={def.symbolPosition === 'suffix' ? ` ${def.symbol}` : undefined}
        className={className}
      />
    );

  if (sensitive && hidden) {
    return <MaskedAmount currency={currency} className={className} peek={figure} />;
  }

  // The exact, uncompacted value on hover. Owned here rather than passed in by
  // every caller, so privacy mode has one place to withhold it instead of
  // thirteen — a `title` surviving the mask would give the amount straight back.
  return <span title={formatMoney(amount, currency, { locale: locale as 'en' | 'fa' })}>{figure}</span>;
};

/** Animated plain integer (e.g. filtered result counts). fa falls back to static — see AnimatedMoney. */
export const AnimatedCount = ({ value, className }: { value: number; className?: string }) => {
  const locale = useLocale();
  if (locale === 'fa') {
    return <span className={className}>{formatNumber(value, 'fa')}</span>;
  }
  return <NumberFlow value={value} locales="en-US" className={className} />;
};

export default AnimatedMoney;
