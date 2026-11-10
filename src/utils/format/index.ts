import { autoConvertDigitsToEN } from '@persian-tools/persian-tools';

export type NumberLocale = 'en' | 'fa';

function toIntlLocale(locale: NumberLocale): string {
  return locale === 'fa' ? 'fa-IR' : 'en-US';
}

// Format number with commas (or Persian grouping + digits for fa).
export function formatNumber(num: number, locale: NumberLocale = 'en'): string {
  return new Intl.NumberFormat(toIntlLocale(locale)).format(Math.round(num));
}

// Format a held quantity (0.52 BTC, 15 g, 2 coins). Unlike formatNumber it keeps
// the fraction — rounding half a bitcoin to "1" would be a lie — and trims it
// to what the number actually has, so whole counts stay "2" not "2.00".
export function formatQuantity(quantity: number, locale: NumberLocale = 'en'): string {
  return new Intl.NumberFormat(toIntlLocale(locale), { maximumFractionDigits: 8 }).format(quantity);
}

// Format a plain calendar year — Persian digits for fa, but no thousands grouping
// ("1405" not "1,405"; "2026" not "2,026"), unlike formatNumber.
export function formatYear(year: number, locale: NumberLocale = 'en'): string {
  return new Intl.NumberFormat(toIntlLocale(locale), { useGrouping: false }).format(year);
}

const AXIS_FORMATTERS: Record<NumberLocale, Intl.NumberFormat> = {
  en: new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }),
  fa: new Intl.NumberFormat('fa-IR', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }),
};

// U+2067 RIGHT-TO-LEFT ISOLATE opens a run whose base direction is forced to
// RTL whatever surrounds it; U+2069 POP DIRECTIONAL ISOLATE closes it. Both are
// invisible and zero-width.
const RLI = '⁧';
const PDI = '⁩';

/**
 * Compact tick labels for chart axes: 14B, 1.5M, 900K, 42 (fa: Persian
 * digits/words).
 *
 * The Farsi isolate is load-bearing, not cosmetic. `Intl` emits the label as
 * digits + U+00A0 + a Persian word ("۱۴ میلیارد"), and that mix reorders
 * according to the base direction it lands in. Measured in Chrome:
 *
 *   • RTL base → "۱۴ میلیارد" — number on the left.
 *   • LTR base → "میلیارد ۱۴" — number on the right.
 *
 * Chart bodies carry `dir="ltr"` because Recharts lays its axes out along that
 * direction, and the ticks are SVG <text> that inherit it. So the axis rendered
 * number-on-the-right while the tooltip beside it — plain RTL HTML — rendered
 * number-on-the-left: the same value, mirrored, side by side.
 *
 * Fixing it in the text rather than in CSS is deliberate. Setting
 * `direction: rtl` on the tick element does resolve the order, but it collides
 * with the `text-anchor: end` Recharts uses to right-align Y ticks and the
 * label renders clipped. An isolate carries its own base direction, survives
 * into SVG, and can't be overridden by an ancestor.
 *
 * `en` output is returned untouched — it has no RTL runs to reorder, so the
 * marks would be dead weight.
 */
export function formatAxisNumber(value: number, locale: NumberLocale = 'en'): string {
  const formatted = AXIS_FORMATTERS[locale].format(value);
  return locale === 'fa' ? `${RLI}${formatted}${PDI}` : formatted;
}

const SHORTHAND_MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
  t: 1_000_000_000_000,
};

// Thousands separators that pasted formatted numbers may carry: comma, Arabic
// thousands separator (٬ U+066C), Arabic comma (، U+060C), and the space family
// (\s already covers regular space, NBSP U+00A0, and the narrow NBSP U+202F
// that Intl.NumberFormat emits).
const GROUPING_CHARS = /[,٬،\s]/g;

// Live keystroke filter for amount fields: true when the string could still
// become a valid amount — digits (Latin/Persian/Arabic), grouping separators,
// decimal separators, a leading sign, and at most one trailing k/m/b/t.
// Looser than parseShorthandNumber (it accepts partial input like "3." or "-")
// so typing is never blocked mid-entry; it only rejects impossible characters.
export function isPlausibleAmountInput(raw: string): boolean {
  return /^-?[0-9۰-۹٠-٩.,٫٬،\s]*[kmbt]?$/i.test(raw);
}

// Parse shorthand notation like 4k, 3.2m, 1.5b into full numbers. Persian/Arabic
// digits (entered on an fa keyboard) are normalized to Latin first, and grouping
// separators from pasted formatted numbers ("343,433", "۳۴۳٬۴۳۳") are stripped —
// without this, parseFloat would silently truncate at the first separator.
// Trade-off: "1,2" parses as 12, not 1.2; the Persian decimal ٫ (U+066B) is the
// supported decimal separator alongside ".".
// Returns null for empty or invalid input so callers can fall back gracefully.
export function parseShorthandNumber(value: string): number | null {
  const trimmed = autoConvertDigitsToEN(value.trim()).replace(GROUPING_CHARS, '').replace(/٫/g, '.');
  if (!trimmed) return null;

  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)([kmbt])$/i);
  if (match) {
    const base = parseFloat(match[1]);
    const multiplier = SHORTHAND_MULTIPLIERS[match[2].toLowerCase()];
    return base * multiplier;
  }

  // Full-string match (not parseFloat) so junk like "12abc" is rejected
  // instead of silently truncated.
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) return null;
  const plain = parseFloat(trimmed);
  return isNaN(plain) ? null : plain;
}
