// Currency conversion + formatting — the one place money math/formatting lives.
// Replaces the old tomanToUsd/usdToToman helpers. Rates pivot through PIVOT_CURRENCY
// (see src/constants/currencies.ts); Navasan only quotes foreign→IRR, so IRR is the base.
import type { CurrencyDef } from '@/constants/currencies';
import { getCurrency, PIVOT_CURRENCY } from '@/constants/currencies';

/** A single day's rate: pivot units per 1 unit of the currency. */
export interface RatePoint {
  rateDate: string; // YYYY-MM-DD
  rate: number;
}

/**
 * Time series of rates keyed by currency code, each sorted ascending by date.
 * The pivot currency is omitted (its rate is always 1).
 */
export type RatesSeries = Record<string, RatePoint[]>;

/** Latest rate per currency (pivot omitted). */
export type LatestRates = Record<string, number>;

/**
 * Rate of `currency` against the pivot on `date`, using nearest-date
 * carry-forward (real-world FX standard): the last known rate on or before the
 * date; if the date predates all data, the earliest available rate. Returns
 * null when the currency has no rate data at all.
 */
export function rateOn(series: RatesSeries, currency: string, date?: string): number | null {
  if (currency === PIVOT_CURRENCY) return 1;
  const points = series[currency];
  if (!points || points.length === 0) return null;

  if (!date) return points[points.length - 1].rate; // no date → latest

  // points are sorted ascending; find last with rateDate <= date.
  let chosen: RatePoint | null = null;
  for (const p of points) {
    if (p.rateDate <= date) chosen = p;
    else break;
  }
  // Predates all data → fall back to the earliest known rate.
  return (chosen ?? points[0]).rate;
}

/**
 * Convert `amount` from one currency to another on a given date, pivoting
 * through the base currency. Same-currency is identity. Returns null when a
 * required rate is missing.
 */
export function convert(amount: number, from: string, to: string, series: RatesSeries, date?: string): number | null {
  if (from === to) return amount;
  const rFrom = rateOn(series, from, date);
  const rTo = rateOn(series, to, date);
  if (rFrom === null || rTo === null) return null;
  return (amount * rFrom) / rTo;
}

/** Build a single-day RatesSeries from a latest-rates map (for current-value displays). */
export function seriesFromLatest(latest: LatestRates, rateDate = ''): RatesSeries {
  const series: RatesSeries = {};
  for (const [code, rate] of Object.entries(latest)) {
    series[code] = [{ rateDate, rate }];
  }
  return series;
}

/**
 * Format an amount in a currency: localized number + symbol in the right place.
 * `compact` abbreviates large values (10.69B, $61.33K) for space-tight spots
 * like dashboard cards and charts, keeping up to 2 decimal digits of
 * precision on the compact mantissa; default is full precision with
 * separators. `locale` switches digits/grouping to Persian for the fa UI. Most
 * currency symbols (USD's $, EUR's €, standard international codes like
 * AED/CHF) are language-neutral and stay Latin either way — `symbolFa` only
 * actually differs from `symbol` for IRT, an app-invented code Farsi speakers
 * call تومان, not "IRT".
 */
export function formatMoney(
  amount: number,
  currencyCode: string,
  opts?: { compact?: boolean; locale?: 'en' | 'fa' }
): string {
  const def = getCurrency(currencyCode);
  const isFa = opts?.locale === 'fa';
  const intlLocale = isFa ? 'fa-IR' : 'en-US';
  const number = opts?.compact
    ? new Intl.NumberFormat(intlLocale, {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 2,
      }).format(amount)
    : new Intl.NumberFormat(intlLocale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: def.decimals,
      }).format(amount);

  return placeSymbol(number, def, isFa);
}

/**
 * Put the currency symbol on the correct side of an already-formatted number.
 * Shared by formatMoney and maskMoney so a masked figure sits exactly where the
 * real one did.
 */
function placeSymbol(number: string, def: CurrencyDef, isFa: boolean): string {
  const symbol = isFa ? def.symbolFa : def.symbol;
  if (def.symbolPosition === 'suffix') return `${number} ${symbol}`;

  // Prefix: native fa-IR currency formatting always isolates a Latin symbol
  // from the following Persian digit run with an LRM (U+200E) — mirror that
  // here for bidi-robustness (invisible; no effect on en). spacedSymbol adds
  // a space for plain multi-letter codes (AED, CHF), matching native
  // convention — single-glyph symbols ($, €, £, ₺, C$, A$) stay glued.
  const bidiMark = isFa ? '\u200E' : '';
  const gap = def.spacedSymbol ? ' ' : '';
  return `${bidiMark}${symbol}${gap}${number}`;
}

/** The glyph a withheld figure is drawn with. */
export const MASK_CHAR = '\u2022';

/**
 * A figure with its digits withheld (privacy mode): a fixed run of dots where
 * the number was, currency left in place so the surface still reads as money.
 * The dot count never depends on the real amount \u2014 a mask whose width tracked
 * magnitude would leak the very thing it is hiding.
 *
 * A prefix symbol gets wrapped in a bidi isolate. In the real figure the digits
 * hold the symbol on their left even inside an RTL line, because they are
 * numeric; bullets are *neutral*, so `$\u2022\u2022\u2022\u2022\u2022` has nothing strong to anchor
 * against and the run inherits the paragraph's RTL, rendering as `\u2022\u2022\u2022\u2022\u2022$`. The
 * isolate is what the digits were doing implicitly. It lives here rather than in
 * a wrapper element so that call sites which only ever get a string \u2014 chart
 * tooltips, select subtitles, sentences with an amount in them \u2014 are covered
 * too. A suffix currency needs none of this: the currency word is itself
 * strongly RTL and anchors its own run.
 */
export function maskMoney(currencyCode: string, opts?: { locale?: 'en' | 'fa'; dots?: number }): string {
  const def = getCurrency(currencyCode);
  const text = placeSymbol(MASK_CHAR.repeat(opts?.dots ?? 5), def, opts?.locale === 'fa');
  return def.symbolPosition === 'prefix' ? `\u2066${text}\u2069` : text;
}
