import { formatAxisNumber, formatNumber, formatQuantity } from '../index';

// U+2067 RLI / U+2069 PDI — the isolate formatAxisNumber wraps fa labels in.
const RLI = '\u2067';
const PDI = '\u2069';
const stripIsolate = (s: string) => s.replaceAll(RLI, '').replaceAll(PDI, '');

describe('formatQuantity', () => {
  it('keeps fractions instead of rounding them away', () => {
    expect(formatQuantity(0.52)).toBe('0.52');
    expect(formatQuantity(0.00012345)).toBe('0.00012345');
  });

  it('does not pad whole numbers', () => {
    expect(formatQuantity(2)).toBe('2');
    expect(formatQuantity(2800)).toBe('2,800');
  });

  it('uses Persian digits and separators for fa', () => {
    expect(formatQuantity(0.52, 'fa')).toBe('۰٫۵۲');
    expect(formatQuantity(2800, 'fa')).toBe('۲٬۸۰۰');
  });
});

describe('formatNumber', () => {
  it('formats integers with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('rounds decimals', () => {
    expect(formatNumber(1234.56)).toBe('1,235');
    expect(formatNumber(99.4)).toBe('99');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('handles negative numbers', () => {
    expect(formatNumber(-1500)).toBe('-1,500');
  });

  it('formats with Persian digits and grouping for fa locale', () => {
    expect(formatNumber(1234567, 'fa')).toBe('۱٬۲۳۴٬۵۶۷');
  });
});

describe('formatAxisNumber', () => {
  it('rolls millions over to billions', () => {
    expect(formatAxisNumber(14_000_000_000)).toBe('14B');
    expect(formatAxisNumber(12_000_000_000)).toBe('12B');
  });

  it('formats thousands and millions', () => {
    expect(formatAxisNumber(900_000)).toBe('900K');
    expect(formatAxisNumber(1_500_000)).toBe('1.5M');
  });

  it('formats trillions', () => {
    expect(formatAxisNumber(2_300_000_000_000)).toBe('2.3T');
  });

  it('leaves small numbers as-is', () => {
    expect(formatAxisNumber(42)).toBe('42');
    expect(formatAxisNumber(0)).toBe('0');
  });

  it('spells out compact units in Persian for fa locale', () => {
    // Intl's fa-IR compact formatter joins the value and unit with a
    // non-breaking space ( ), not a regular space. The label is wrapped in an
    // LTR isolate — see the next test for why.
    expect(stripIsolate(formatAxisNumber(14_000_000_000, 'fa'))).toBe('۱۴ میلیارد');
    expect(stripIsolate(formatAxisNumber(900_000, 'fa'))).toBe('۹۰۰ هزار');
    expect(stripIsolate(formatAxisNumber(42, 'fa'))).toBe('۴۲');
  });

  // Measured in Chrome: an RTL base renders "۱۴ میلیارد" (number left, matching
  // the chart tooltip), an LTR base flips it to "میلیارد ۱۴". Chart ticks are SVG
  // <text> inheriting the chart body's dir="ltr", so the axis rendered mirrored
  // relative to the tooltip next to it. The isolate has to live in the text:
  // `direction: rtl` on the tick collides with Recharts' text-anchor="end" and
  // clips the label.
  it('wraps Persian labels in an RTL isolate so the number stays first', () => {
    const label = formatAxisNumber(14_000_000_000, 'fa');
    expect(label.startsWith(RLI)).toBe(true);
    expect(label.endsWith(PDI)).toBe(true);
    expect(label).toBe(`${RLI}۱۴ میلیارد${PDI}`);
  });

  it('leaves English labels free of bidi controls', () => {
    // No RTL runs to reorder, so the marks would be dead weight.
    for (const value of [14_000_000_000, 900_000, 42, 0]) {
      expect(formatAxisNumber(value, 'en')).not.toMatch(/[\u2066-\u2069\u200e\u200f]/);
    }
  });
});
