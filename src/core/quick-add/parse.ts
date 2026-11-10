// Quick add: turn a few pasted or typed lines into expense drafts.
//
//   ناهار ۲۵۰ هزار
//   taxi 85k yesterday
//   netflix $12 #subscription
//
// Pure — no clock, no I/O. The caller supplies "today" and the default
// currency, so the same text always parses the same way and the tests don't
// have to freeze time.
//
// The grammar is deliberately forgiving and line-based: one expense per line,
// the amount is the last number on it, and everything that isn't an amount, a
// date or a #tag is the description. A line that is *only* a date ("دیروز",
// "1405/08/19:") dates every line after it, which is how people naturally jot
// down a few days of spending at once.
import { autoConvertDigitsToEN } from '@persian-tools/persian-tools';
import { toGregorian, toJalaali } from 'jalaali-js';

import { PIVOT_CURRENCY } from '@/constants/currencies';

export interface QuickAddDraft {
  ok: true;
  /** 1-based line number in the pasted text. */
  line: number;
  raw: string;
  description: string;
  amount: number;
  currency: string;
  /** YYYY-MM-DD (Gregorian). */
  date: string;
  tags: string[];
}

export type QuickAddErrorReason = 'no-amount' | 'no-description';

export interface QuickAddError {
  ok: false;
  line: number;
  raw: string;
  reason: QuickAddErrorReason;
}

export type QuickAddLine = QuickAddDraft | QuickAddError;

export interface QuickAddOptions {
  /** YYYY-MM-DD — the user's "today". */
  today: string;
  /** Currency for amounts that don't name one. Defaults to the pivot. */
  defaultCurrency?: string;
}

const MULTIPLIER_WORDS: Record<string, number> = {
  هزار: 1e3,
  k: 1e3,
  thousand: 1e3,
  میلیون: 1e6,
  ملیون: 1e6,
  m: 1e6,
  million: 1e6,
  میلیارد: 1e9,
  b: 1e9,
  billion: 1e9,
};

// `scale` converts the written amount into `code` — rials are a tenth of a Toman.
const CURRENCY_WORDS: Record<string, { code: string; scale: number }> = {
  تومان: { code: 'IRT', scale: 1 },
  تومن: { code: 'IRT', scale: 1 },
  ت: { code: 'IRT', scale: 1 },
  toman: { code: 'IRT', scale: 1 },
  irt: { code: 'IRT', scale: 1 },
  ریال: { code: 'IRT', scale: 0.1 },
  rial: { code: 'IRT', scale: 0.1 },
  irr: { code: 'IRT', scale: 0.1 },
  دلار: { code: 'USD', scale: 1 },
  usd: { code: 'USD', scale: 1 },
  $: { code: 'USD', scale: 1 },
  یورو: { code: 'EUR', scale: 1 },
  eur: { code: 'EUR', scale: 1 },
  '€': { code: 'EUR', scale: 1 },
  پوند: { code: 'GBP', scale: 1 },
  gbp: { code: 'GBP', scale: 1 },
  '£': { code: 'GBP', scale: 1 },
  درهم: { code: 'AED', scale: 1 },
  aed: { code: 'AED', scale: 1 },
  لیر: { code: 'TRY', scale: 1 },
  try: { code: 'TRY', scale: 1 },
  '₺': { code: 'TRY', scale: 1 },
};

const RELATIVE_DAYS: Record<string, number> = {
  امروز: 0,
  today: 0,
  دیروز: -1,
  yesterday: -1,
  پریروز: -2,
};

// Index = Jalali month - 1. Spelling variants people actually type.
const JALALI_MONTHS: string[][] = [
  ['فروردین'],
  ['اردیبهشت'],
  ['خرداد'],
  ['تیر'],
  ['مرداد', 'امرداد'],
  ['شهریور'],
  ['مهر'],
  ['آبان', 'ابان'],
  ['آذر', 'اذر'],
  ['دی'],
  ['بهمن'],
  ['اسفند'],
];

const pad2 = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;

function shiftDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return toIso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Arabic letter forms → Persian, ZWNJ dropped, digits to Latin, lower-cased. */
export function normalizeText(text: string): string {
  return autoConvertDigitsToEN(text).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, '').toLowerCase();
}

/** `1405/08/19`, `2026-11-10` → ISO; a year before 1700 is read as Jalali. */
function parseNumericDate(token: string): string | null {
  const match = token.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year >= 1700) return toIso(year, month, day);
  const g = toGregorian(year, month, day);
  return toIso(g.gy, g.gm, g.gd);
}

function jalaliMonthIndex(token: string): number {
  return JALALI_MONTHS.findIndex((names) => names.includes(token));
}

/** "19 آبان" → the most recent such day that isn't in the future. */
function resolveJalaliDayMonth(day: number, monthIndex: number, today: string): string {
  const [ty, tm, td] = today.split('-').map(Number);
  const jalaliToday = toJalaali(ty, tm, td);
  const candidate = (year: number) => {
    const g = toGregorian(year, monthIndex + 1, day);
    return toIso(g.gy, g.gm, g.gd);
  };
  const thisYear = candidate(jalaliToday.jy);
  return thisYear > today ? candidate(jalaliToday.jy - 1) : thisYear;
}

interface NumberToken {
  value: number;
  currency?: { code: string; scale: number };
}

/** `250`, `1,250,000`, `2.5m`, `85k`, `$12`, `250هزار`, `12دلار`. */
function parseNumberToken(token: string): NumberToken | null {
  const match = token.match(/^([$€£₺])?(\d[\d,٬]*(?:[.٫]\d+)?)(.*)$/);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;

  let value = parseFloat(digits.replace(/[,٬]/g, '').replace('٫', '.'));
  if (!Number.isFinite(value)) return null;

  let currency = prefix ? CURRENCY_WORDS[prefix] : undefined;
  if (suffix) {
    // A glued suffix must be a unit we know — otherwise this is a word that
    // merely starts with a digit ("7up", "206 صندوق‌دار") and not an amount.
    if (MULTIPLIER_WORDS[suffix]) value *= MULTIPLIER_WORDS[suffix];
    else if (CURRENCY_WORDS[suffix]) currency = CURRENCY_WORDS[suffix];
    else return null;
  }
  return { value, currency };
}

interface ParsedLine {
  description: string;
  amount: number | null;
  currency: string | null;
  date: string | null;
  tags: string[];
}

function parseLine(raw: string, today: string): ParsedLine {
  // Tokens keep their original spelling for the description; matching happens
  // on the normalized twin at the same index.
  const original = raw.trim().split(/\s+/).filter(Boolean);
  const tokens = original.map((t) => normalizeText(t).replace(/^[:،,؛;]+|[:،,؛;]+$/g, ''));
  const used = new Array<boolean>(tokens.length).fill(false);

  const tags: string[] = [];
  let date: string | null = null;

  tokens.forEach((token, i) => {
    if (token.startsWith('#') && token.length > 1) {
      tags.push(
        original[i]
          .replace(/^#/, '')
          .replace(/[:،,؛;]+$/, '')
          .replace(/_/g, ' ')
      );
      used[i] = true;
      return;
    }
    if (date) return;

    if (token in RELATIVE_DAYS) {
      date = shiftDays(today, RELATIVE_DAYS[token]);
      used[i] = true;
      return;
    }
    const numeric = parseNumericDate(token);
    if (numeric) {
      date = numeric;
      used[i] = true;
      return;
    }
    // "19 آبان" — a day number followed by a Jalali month name.
    const monthIndex = i > 0 ? jalaliMonthIndex(token) : -1;
    if (monthIndex >= 0 && /^\d{1,2}$/.test(tokens[i - 1]) && !used[i - 1]) {
      const day = Number(tokens[i - 1]);
      if (day >= 1 && day <= 31) {
        date = resolveJalaliDayMonth(day, monthIndex, today);
        used[i] = used[i - 1] = true;
      }
    }
  });

  // The amount is the LAST number on the line: "2 تا قهوه 180 هزار" is 180k.
  let amount: number | null = null;
  let currency: string | null = null;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (used[i]) continue;
    const number = parseNumberToken(tokens[i]);
    if (!number) continue;

    let value = number.value;
    let unit = number.currency;
    used[i] = true;

    // A standalone currency symbol/word right before the number: "$ 12".
    if (!unit && i > 0 && !used[i - 1] && /^[$€£₺]$/.test(tokens[i - 1])) {
      unit = CURRENCY_WORDS[tokens[i - 1]];
      used[i - 1] = true;
    }
    // Then up to two trailing unit words: "250 هزار تومن", "2.5 میلیون".
    for (let j = i + 1; j <= i + 2 && j < tokens.length && !used[j]; j++) {
      if (MULTIPLIER_WORDS[tokens[j]] && tokens[j].length > 1) value *= MULTIPLIER_WORDS[tokens[j]];
      else if (CURRENCY_WORDS[tokens[j]] && !unit) unit = CURRENCY_WORDS[tokens[j]];
      else break;
      used[j] = true;
    }

    amount = value * (unit?.scale ?? 1);
    currency = unit?.code ?? null;
    break;
  }

  const description = original
    .filter((_, i) => !used[i])
    .join(' ')
    .replace(/^[\s\-–—:،,؛;.]+|[\s\-–—:،,؛;]+$/g, '');

  return { description, amount, currency, date, tags };
}

/** Parse pasted text into one draft (or one explained failure) per non-empty line. */
export function parseQuickAdd(text: string, options: QuickAddOptions): QuickAddLine[] {
  const defaultCurrency = options.defaultCurrency ?? PIVOT_CURRENCY;
  const results: QuickAddLine[] = [];
  let currentDate = options.today;

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const raw = rawLine.trim();
    if (!raw) return;
    const line = index + 1;

    const parsed = parseLine(raw, options.today);

    // A line with nothing but a date is a heading for the lines beneath it.
    if (parsed.date && parsed.amount === null && !parsed.description && parsed.tags.length === 0) {
      currentDate = parsed.date;
      return;
    }

    if (parsed.amount === null || !(parsed.amount > 0)) {
      results.push({ ok: false, line, raw, reason: 'no-amount' });
      return;
    }
    if (!parsed.description) {
      results.push({ ok: false, line, raw, reason: 'no-description' });
      return;
    }

    results.push({
      ok: true,
      line,
      raw,
      description: parsed.description,
      amount: parsed.amount,
      currency: parsed.currency ?? defaultCurrency,
      date: parsed.date ?? currentDate,
      tags: parsed.tags,
    });
  });

  return results;
}
