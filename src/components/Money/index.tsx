'use client';

import type { FC } from 'react';

import { usePrivacy } from '@features/privacy/PrivacyProvider';

import MaskedAmount from '@components/MaskedAmount';

import { useCurrency } from '@hooks/use-currency';

interface MoneyProps {
  /** Amount in `currency` (the currency the record was entered in). */
  amount: number;
  /** The record's entry currency code. */
  currency: string;
  /** The record's date (YYYY-MM-DD) — used to pick the historical rate. */
  date?: string;
  /** The record's frozen entryRate — makes the pivot-side value self-contained
   * (exact, independent of the shared rate table). Pass it whenever rendering
   * a stored record. */
  entryRate?: number;
  /** Wrapper className (controls alignment/spacing in context). */
  className?: string;
  /** Override the dominant primary text styles. */
  primaryClassName?: string;
  /** Override the muted secondary caption styles. */
  secondaryClassName?: string;
  /** Stack secondary beneath (default) or render inline after the primary. */
  inline?: boolean;
}

/**
 * The single primitive for rendering money everywhere in the app. Shows the
 * value in the user's primary currency (dominant) with the secondary currency as
 * a muted caption beneath — identical pattern app-wide. Secondary is hidden when
 * disabled, equal to primary, or its rate is unavailable.
 */
const Money: FC<MoneyProps> = ({
  amount,
  currency,
  date,
  entryRate,
  className = '',
  primaryClassName = 'text-text-primary font-semibold',
  secondaryClassName = 'text-text-muted text-xs',
  inline = false,
}) => {
  const { displayItem, convertItem, formatFull, primaryCurrency, secondaryCurrency } = useCurrency();
  const { hidden } = usePrivacy();
  const item = { amount, currency, date, entryRate };
  const { primary, secondary } = displayItem(item);
  const hasSecondary = !!secondary && !!secondaryCurrency && secondaryCurrency !== primaryCurrency;

  if (hidden) {
    // No title, and the real strings never rendered — a mask that only covers
    // the digits still hands them back on hover, to a screen reader, or to a
    // copy-paste.
    const masked = (
      <>
        <MaskedAmount currency={primaryCurrency} className={primaryClassName} />
        {hasSecondary && (
          <MaskedAmount
            currency={secondaryCurrency}
            dots={4}
            className={inline ? `ms-1.5 ${secondaryClassName}` : secondaryClassName}
          />
        )}
      </>
    );
    return inline ? (
      <span className={className}>{masked}</span>
    ) : (
      <span className={`flex flex-col ${className}`}>{masked}</span>
    );
  }

  // Always expose the exact full value on hover, even when shown compact.
  const pNum = convertItem(item, primaryCurrency);
  const parts = pNum === null ? [] : [formatFull(pNum, primaryCurrency)];
  if (secondary && secondaryCurrency && secondaryCurrency !== primaryCurrency) {
    const sNum = convertItem(item, secondaryCurrency);
    if (sNum !== null) parts.push(formatFull(sNum, secondaryCurrency));
  }
  const title = parts.join(' · ') || undefined;

  if (inline) {
    return (
      <span className={className} title={title}>
        <span className={primaryClassName}>{primary}</span>
        {secondary && <span className={`ms-1.5 ${secondaryClassName}`}>{secondary}</span>}
      </span>
    );
  }

  return (
    <span className={`flex flex-col ${className}`} title={title}>
      <span className={primaryClassName}>{primary}</span>
      {secondary && <span className={secondaryClassName}>{secondary}</span>}
    </span>
  );
};

export default Money;
