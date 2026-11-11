import { parseQuickAdd } from '../parse';
import type { QuickAddDraft } from '../parse';

// 2026-11-10 is 19 Aban 1405.
const TODAY = '2026-11-10';
const parse = (text: string, defaultCurrency?: string) => parseQuickAdd(text, { today: TODAY, defaultCurrency });
const one = (text: string) => parse(text)[0] as QuickAddDraft;

describe('parseQuickAdd', () => {
  it('reads a plain "description amount" line', () => {
    expect(one('taxi 85000')).toMatchObject({
      ok: true,
      description: 'taxi',
      amount: 85_000,
      currency: 'IRT',
      date: TODAY,
      tags: [],
    });
  });

  it('understands Persian digits, separators and multiplier words', () => {
    expect(one('ناهار ۲۵۰ هزار')).toMatchObject({ description: 'ناهار', amount: 250_000 });
    expect(one('اجاره ۲٫۵ میلیون تومن')).toMatchObject({ description: 'اجاره', amount: 2_500_000, currency: 'IRT' });
    expect(one('خرید ۱٬۲۵۰٬۰۰۰')).toMatchObject({ description: 'خرید', amount: 1_250_000 });
    expect(one('لپ‌تاپ 1.2 میلیارد')).toMatchObject({ amount: 1_200_000_000 });
  });

  it('understands shorthand glued to the number', () => {
    expect(one('coffee 180k')).toMatchObject({ description: 'coffee', amount: 180_000 });
    expect(one('rent 2.5m')).toMatchObject({ amount: 2_500_000 });
    expect(one('قهوه 180هزار')).toMatchObject({ description: 'قهوه', amount: 180_000 });
  });

  it('converts rials to Toman', () => {
    expect(one('کارت به کارت 1,500,000 ریال')).toMatchObject({ amount: 150_000, currency: 'IRT' });
  });

  it('picks up foreign currencies by symbol or word', () => {
    expect(one('netflix $12')).toMatchObject({ description: 'netflix', amount: 12, currency: 'USD' });
    expect(one('hosting 9.99 usd')).toMatchObject({ amount: 9.99, currency: 'USD' });
    expect(one('دامنه ۱۵ دلار')).toMatchObject({ description: 'دامنه', amount: 15, currency: 'USD' });
    expect(one('flight €240')).toMatchObject({ amount: 240, currency: 'EUR' });
  });

  it('uses the default currency only when the line names none', () => {
    expect(parse('lunch 12', 'USD')[0]).toMatchObject({ currency: 'USD' });
    expect(parse('lunch 120 هزار تومان', 'USD')[0]).toMatchObject({ currency: 'IRT', amount: 120_000 });
  });

  it('takes the last number as the amount, leaving earlier ones in the description', () => {
    expect(one('2 تا قهوه 180 هزار')).toMatchObject({ description: '2 تا قهوه', amount: 180_000 });
    expect(one('پژو 207 بنزین 300000')).toMatchObject({ description: 'پژو 207 بنزین', amount: 300_000 });
  });

  it('does not mistake a word starting with a digit for an amount', () => {
    expect(one('7up 45000')).toMatchObject({ description: '7up', amount: 45_000 });
  });

  it('collects #tags and keeps them out of the description', () => {
    expect(one('snapp 95k #work #ماهانه')).toMatchObject({ description: 'snapp', tags: ['work', 'ماهانه'] });
    expect(one('gift 500k #family_trip')).toMatchObject({ tags: ['family trip'] });
  });

  it('reads relative, ISO and Jalali dates', () => {
    expect(one('دیروز تاکسی 80 هزار')).toMatchObject({ description: 'تاکسی', date: '2026-11-09' });
    expect(one('lunch 200k yesterday')).toMatchObject({ description: 'lunch', date: '2026-11-09' });
    expect(one('پریروز شام 400 هزار')).toMatchObject({ date: '2026-11-08' });
    expect(one('2026-11-01 books 300k')).toMatchObject({ description: 'books', date: '2026-11-01' });
    expect(one('1405/08/01 کتاب 300 هزار')).toMatchObject({ description: 'کتاب', date: '2026-10-23' });
    expect(one('۱۵ آبان دکتر ۹۰۰ هزار')).toMatchObject({ description: 'دکتر', amount: 900_000, date: '2026-11-06' });
  });

  it('resolves a day-and-month that has not happened yet to last year', () => {
    // 1 Esfand is still ahead on 19 Aban 1405 → it means Esfand 1404.
    expect(one('1 اسفند عیدی 2 میلیون')).toMatchObject({ date: '2026-02-20' });
  });

  it('lets a date-only line date everything beneath it', () => {
    const lines = parse('دیروز:\nناهار 250 هزار\nتاکسی 80 هزار\n\n1405/08/15\nدکتر 900 هزار\nامروز قهوه 90 هزار');
    expect(lines.map((l) => (l as QuickAddDraft).date)).toEqual([
      '2026-11-09',
      '2026-11-09',
      '2026-11-06',
      '2026-11-10',
    ]);
  });

  it('explains lines it cannot use instead of dropping them', () => {
    const lines = parse('just a note\n250000\n\nlunch 0');
    expect(lines).toEqual([
      { ok: false, line: 1, raw: 'just a note', reason: 'no-amount' },
      { ok: false, line: 2, raw: '250000', reason: 'no-description' },
      { ok: false, line: 4, raw: 'lunch 0', reason: 'no-amount' },
    ]);
  });

  it('strips list punctuation around the description', () => {
    expect(one('- ناهار: 250 هزار')).toMatchObject({ description: 'ناهار', amount: 250_000 });
  });

  it('returns nothing for empty input', () => {
    expect(parse('  \n\n')).toEqual([]);
  });
});
