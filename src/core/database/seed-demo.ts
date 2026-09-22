/* eslint-disable no-console, @typescript-eslint/no-non-null-assertion */
import type { InStatement } from '@libsql/client';
import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { pathToFileURL } from 'url';

import { DEMO_EMAIL, DEMO_PASSWORD } from '@constants';

import { hashPassword } from '@core/auth/password';

// The demo is a single shared account and its content lives in the DB as literal
// strings, so it can't switch language at render time — Kharji is Farsi-first,
// so the whole dataset is authored in Farsi.
const DEMO_NAME = 'کاربر دمو';

// ─── Deterministic PRNG (mulberry32) ────────────────────────────────────────
function mulberry32(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand = mulberry32(42);

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((rand() * (max - min) + min).toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, n);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// ─── Rolling date window ────────────────────────────────────────────────────
// The demo always shows the last WINDOW_YEARS of activity ending with the
// current month, so re-running this seed keeps the data perpetually "recent".
const WINDOW_YEARS = 5;
const NOW = new Date();
const END_YEAR = NOW.getFullYear();
const END_MONTH = NOW.getMonth() + 1; // 1-based
const START_YEAR = END_YEAR - WINDOW_YEARS;
const START_MONTH = END_MONTH;

/** All { year, month } periods from the window start through the current month. */
function buildPeriods(): { year: number; month: number }[] {
  const periods: { year: number; month: number }[] = [];
  let y = START_YEAR;
  let m = START_MONTH;
  while (y < END_YEAR || (y === END_YEAR && m <= END_MONTH)) {
    periods.push({ year: y, month: m });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return periods;
}

const PERIODS = buildPeriods();
const isCurrentMonth = (year: number, month: number) => year === END_YEAR && month === END_MONTH;

/** Clamp a day so records in the current month never land in the future. */
function clampDay(year: number, month: number, day: number): number {
  return isCurrentMonth(year, month) ? Math.min(day, NOW.getDate()) : day;
}

// ─── Historical exchange rate (USD→IRT), relative to the window start ────────
const START_RATE = 25000; // ~Toman per USD at window start
const ANNUAL_RATE_GROWTH = 1.23; // compounding devaluation (~25k → ~70k over 5y)

// Real USD rate rows already in currencyRates (ascending by date), loaded at the
// start of each seed run. Wherever this series reaches, demo entryRates use it so
// demo records convert consistently with how the app displays them; the
// fabricated curve below only covers periods older than all recorded data.
let realUsdRates: { rateDate: string; rate: number }[] = [];

function getExchangeRate(year: number, month: number): number {
  // Carry-forward lookup at mid-period, same as the app's rateOn().
  const midDate = `${year}-${pad2(month)}-15`;
  let real: number | null = null;
  for (const p of realUsdRates) {
    if (p.rateDate <= midDate) real = p.rate;
    else break;
  }
  if (real !== null) return real;

  const yearsFromStart = year - START_YEAR + (month - 1) / 12;
  const base = START_RATE * Math.pow(ANNUAL_RATE_GROWTH, yearsFromStart);
  const noise = 1 + (rand() - 0.5) * 0.1; // ±5%
  return Math.round(base * noise);
}

// ─── Tags ───────────────────────────────────────────────────────────────────
// A small, everyday set — enough to make filtering meaningful without clutter.
const TAG_NAMES = ['ضروری', 'هرماهه', 'برنامه‌ریزی‌شده', 'هوسی', 'دورهمی', 'تفریح', 'نقدی', 'آنلاین'];

// Category to tag affinity mapping (keys must match EXPENSE_CATEGORIES names).
const CATEGORY_TAG_AFFINITY: Record<string, string[]> = {
  خواربار: ['ضروری', 'هرماهه', 'برنامه‌ریزی‌شده', 'نقدی'],
  'کافه و رستوران': ['دورهمی', 'تفریح', 'هوسی', 'نقدی'],
  'حمل و نقل': ['ضروری', 'هرماهه', 'نقدی'],
  اجاره: ['ضروری', 'هرماهه', 'برنامه‌ریزی‌شده'],
  قبوض: ['ضروری', 'هرماهه', 'برنامه‌ریزی‌شده', 'آنلاین'],
  سرگرمی: ['دورهمی', 'تفریح', 'هوسی', 'آنلاین'],
};

// ─── Expense categories with frequency and price ranges ─────────────────────
interface ExpenseCategory {
  name: string;
  icon: string;
  color: string;
  minPerMonth: number;
  maxPerMonth: number;
  minUsd: number;
  maxUsd: number;
  descriptions: string[];
}

// Six everyday categories for a modest renter — legible, not overwhelming.
// USD amounts are intentionally down-to-earth (rent ~$450, groceries ~$10-55).
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    name: 'خواربار',
    icon: 'ShoppingCart',
    color: 'green',
    minPerMonth: 4,
    maxPerMonth: 7,
    minUsd: 8,
    maxUsd: 55,
    descriptions: ['خرید هفتگی', 'میوه و تره‌بار', 'نان و لبنیات', 'میوه و سبزیجات', 'خرید خونه', 'تنقلات و چای'],
  },
  {
    name: 'کافه و رستوران',
    icon: 'Coffee',
    color: 'orange',
    minPerMonth: 4,
    maxPerMonth: 8,
    minUsd: 3,
    maxUsd: 30,
    descriptions: ['کافه', 'ناهار بیرون', 'شام با دوستا', 'کباب', 'کافه با رفیق', 'شیرینی‌فروشی', 'فست‌فود'],
  },
  {
    name: 'حمل و نقل',
    icon: 'Car',
    color: 'sky',
    minPerMonth: 3,
    maxPerMonth: 6,
    minUsd: 2,
    maxUsd: 25,
    descriptions: ['بنزین', 'اسنپ', 'شارژ کارت مترو', 'تاکسی', 'پارکینگ', 'اتوبوس'],
  },
  {
    name: 'اجاره',
    icon: 'Home',
    color: 'blue',
    minPerMonth: 1,
    maxPerMonth: 1,
    minUsd: 400,
    maxUsd: 500,
    descriptions: ['اجاره ماهانه'],
  },
  {
    name: 'قبوض',
    icon: 'Zap',
    color: 'amber',
    minPerMonth: 1,
    maxPerMonth: 1,
    minUsd: 20,
    maxUsd: 70,
    descriptions: ['قبض برق', 'قبض آب', 'قبض گاز', 'قبض اینترنت', 'قبض موبایل'],
  },
  {
    name: 'سرگرمی',
    icon: 'Film',
    color: 'red',
    minPerMonth: 1,
    maxPerMonth: 3,
    minUsd: 5,
    maxUsd: 40,
    descriptions: ['سینما', 'اشتراک فیلم', 'بازی', 'کنسرت', 'کتاب', 'سفر یک‌روزه'],
  },
];

// ─── Assets ─────────────────────────────────────────────────────────────────
interface AssetDef {
  category: string;
  name: string;
  quantity: number;
  unit: string | null;
  baseUnitValueUsd: number;
  growth: number; // annual multiplier (1.05 = 5% growth)
}

// A modest renter's portfolio (~$22k net worth today), loosely echoing a
// real Persian-market mix: some cash, a savings account, a bit of gold and a
// gold coin, a little Bitcoin, and an everyday car. No property, no stock desk.
const ASSET_DEFS: AssetDef[] = [
  {
    category: 'cash',
    name: 'دلار نقدی',
    quantity: 2800,
    unit: 'USD',
    baseUnitValueUsd: 1,
    growth: 1.0,
  },
  {
    category: 'bank',
    name: 'حساب پس‌انداز',
    quantity: 1,
    unit: null,
    baseUnitValueUsd: 3000,
    growth: 1.03,
  },
  {
    category: 'commodity',
    name: 'طلا',
    quantity: 15,
    unit: 'گرم',
    baseUnitValueUsd: 50,
    growth: 1.08,
  },
  {
    category: 'commodity',
    name: 'سکه امامی',
    quantity: 2,
    unit: 'عدد',
    baseUnitValueUsd: 500,
    growth: 1.08,
  },
  {
    category: 'crypto',
    name: 'بیت‌کوین',
    quantity: 0.04,
    unit: 'BTC',
    baseUnitValueUsd: 30000,
    growth: 1.4,
  },
  {
    category: 'vehicle',
    name: 'پژو ۲۰۷',
    quantity: 1,
    unit: null,
    baseUnitValueUsd: 12000,
    growth: 0.9,
  },
];

// ─── Helper: batch executor ─────────────────────────────────────────────────
async function executeBatch(client: ReturnType<typeof createClient>, statements: InStatement[], batchSize = 100) {
  for (let i = 0; i < statements.length; i += batchSize) {
    const batch = statements.slice(i, i + batchSize);
    await client.batch(batch, 'write');
  }
}

// ─── Main seed function ─────────────────────────────────────────────────────
export async function seedDemo() {
  // Reset the deterministic PRNG so repeated invocations (e.g. a warm serverless
  // lambda hit by the cron more than once) always produce the same dataset.
  rand = mulberry32(42);

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    console.log('🌱 Starting demo seed...\n');

    // Load the recorded USD rate series so getExchangeRate prefers real rates
    // over the fabricated curve (see its docs).
    const ratesResult = await client.execute(
      `SELECT rateDate, rate FROM currencyRates WHERE currency = 'USD' AND baseCurrency = 'IRT' ORDER BY rateDate ASC`
    );
    realUsdRates = ratesResult.rows.map((r) => ({ rateDate: r.rateDate as string, rate: r.rate as number }));

    // 1. Create or update demo user
    const existingUser = await client.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [DEMO_EMAIL],
    });

    let userId: number;

    const passwordHash = await hashPassword(DEMO_PASSWORD);

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id as number;
      await client.execute({
        sql: 'UPDATE users SET name = ?, emailVerified = 1 WHERE id = ?',
        args: [DEMO_NAME, userId],
      });
      console.log(`Updated existing demo user (id: ${userId})`);
    } else {
      const result = await client.execute({
        sql: 'INSERT INTO users (email, name, emailVerified, onboarded_at, checklist_dismissed_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        args: [DEMO_EMAIL, DEMO_NAME],
      });
      userId = Number(result.lastInsertRowid);
      console.log(`Created demo user (id: ${userId})`);
    }

    // Better Auth reads credential passwords from the account table
    const credentialAccount = await client.execute({
      sql: "SELECT id FROM account WHERE userId = ? AND providerId = 'credential'",
      args: [userId],
    });
    if (credentialAccount.rows.length > 0) {
      await client.execute({
        sql: "UPDATE account SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ? AND providerId = 'credential'",
        args: [passwordHash, userId],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO account (accountId, providerId, userId, password, createdAt, updatedAt)
              VALUES (?, 'credential', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [String(userId), userId, passwordHash],
      });
    }

    // 1b. Pin the demo account's stored preference to Farsi so the UI matches
    // the Farsi content below. A visitor who explicitly picked English still
    // wins (getUserLocale reads the cookie first) — this only covers the
    // no-cookie case, which is the default one.
    await client.execute({
      sql: `INSERT INTO userLocalePreferences (userId, locale, calendar, secondaryDateCaptions)
            VALUES (?, 'fa', 'auto', 1)
            ON CONFLICT(userId) DO UPDATE SET locale = 'fa', updatedAt = CURRENT_TIMESTAMP`,
      args: [userId],
    });

    // 2. Clear existing data (idempotent). Expenses must go before categories
    // because expenses.category_id has ON DELETE RESTRICT.
    console.log('Clearing existing demo data...');
    await client.batch(
      [
        {
          sql: 'DELETE FROM expense_tags WHERE expense_id IN (SELECT id FROM expenses WHERE user_id = ?)',
          args: [userId],
        },
        { sql: 'DELETE FROM expenses WHERE user_id = ?', args: [userId] },
        { sql: 'DELETE FROM categories WHERE user_id = ?', args: [userId] },
        { sql: 'DELETE FROM tags WHERE user_id = ?', args: [userId] },
        { sql: 'DELETE FROM incomes WHERE userId = ?', args: [userId] },
        {
          sql: 'DELETE FROM assetValuations WHERE assetId IN (SELECT id FROM assets WHERE userId = ?)',
          args: [userId],
        },
        { sql: 'DELETE FROM assets WHERE userId = ?', args: [userId] },
        { sql: 'DELETE FROM debts WHERE userId = ?', args: [userId] },
      ],
      'write'
    );

    // 2b. Insert categories and build a name -> id lookup. This must run
    // before expenses since expenses.category_id is a FK.
    console.log('Inserting categories...');
    const categoryStatements: InStatement[] = EXPENSE_CATEGORIES.map((cat, idx) => ({
      sql: 'INSERT INTO categories (user_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)',
      args: [userId, cat.name, cat.icon, cat.color, idx],
    }));
    await executeBatch(client, categoryStatements);

    const categoriesResult = await client.execute({
      sql: 'SELECT id, name FROM categories WHERE user_id = ?',
      args: [userId],
    });
    const categoryMap: Record<string, number> = {};
    for (const row of categoriesResult.rows) {
      categoryMap[row.name as string] = row.id as number;
    }
    console.log(`  Created ${EXPENSE_CATEGORIES.length} categories`);

    // 3. Insert tags
    console.log('Inserting tags...');
    const tagStatements: InStatement[] = TAG_NAMES.map((name) => ({
      sql: 'INSERT INTO tags (user_id, name) VALUES (?, ?)',
      args: [userId, name],
    }));
    await executeBatch(client, tagStatements);

    // Fetch tag IDs
    const tagsResult = await client.execute({
      sql: 'SELECT id, name FROM tags WHERE user_id = ?',
      args: [userId],
    });
    const tagMap: Record<string, number> = {};
    for (const row of tagsResult.rows) {
      tagMap[row.name as string] = row.id as number;
    }
    console.log(`  Created ${TAG_NAMES.length} tags`);

    // 4. Insert expenses across the rolling window (WINDOW_YEARS + 1 months)
    console.log('Inserting expenses...');
    const expenseStatements: InStatement[] = [];
    const expenseTagPairs: { expenseIndex: number; tagId: number }[] = [];
    let expenseCount = 0;

    for (const { year, month } of PERIODS) {
      for (const cat of EXPENSE_CATEGORIES) {
        // Determine how many expenses for this category this month
        let count: number;
        if (cat.minPerMonth === cat.maxPerMonth) {
          count = cat.minPerMonth;
        } else if (cat.minPerMonth === 0) {
          // Occasional: ~20-30% chance per month
          count = rand() < 0.25 ? randInt(1, 2) : 0;
        } else {
          count = randInt(cat.minPerMonth, cat.maxPerMonth);
        }

        for (let i = 0; i < count; i++) {
          const day = clampDay(year, month, randInt(1, 28)); // Avoid month-end/future edge cases
          const date = `${year}-${pad2(month)}-${pad2(day)}`;
          const amountUsd = randFloat(cat.minUsd, cat.maxUsd);
          const rate = getExchangeRate(year, month);
          const description = pick(cat.descriptions);

          // Demo records are entered in USD with the period's rate as entryRate
          // (entryRate = Toman per 1 USD), so the pivot value equals amountUsd * rate.
          expenseStatements.push({
            sql: `INSERT INTO expenses (user_id, description, amount, currency, entryRate, category_id, date, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              userId,
              description,
              amountUsd,
              'USD',
              rate,
              categoryMap[cat.name],
              date,
              `${date}T${String(randInt(8, 22)).padStart(2, '0')}:${String(randInt(0, 59)).padStart(2, '0')}:00`,
            ],
          });

          // Assign 1-3 tags based on category affinity
          const affinityTags = CATEGORY_TAG_AFFINITY[cat.name] ?? [];
          const numTags = randInt(1, Math.min(3, affinityTags.length));
          const chosenTags = pickN(affinityTags, numTags);
          for (const tagName of chosenTags) {
            if (tagMap[tagName]) {
              expenseTagPairs.push({ expenseIndex: expenseCount, tagId: tagMap[tagName] });
            }
          }

          expenseCount++;
        }
      }
    }

    await executeBatch(client, expenseStatements);
    console.log(`  Created ${expenseCount} expenses`);

    // 5. Fetch expense IDs and insert expense-tag associations
    console.log('Inserting expense-tag associations...');
    const expenseIdsResult = await client.execute({
      sql: 'SELECT id FROM expenses WHERE user_id = ? ORDER BY id ASC',
      args: [userId],
    });
    const expenseIds = expenseIdsResult.rows.map((r) => r.id as number);

    const tagAssocStatements: InStatement[] = expenseTagPairs.map((pair) => ({
      sql: 'INSERT OR IGNORE INTO expense_tags (expense_id, tag_id) VALUES (?, ?)',
      args: [expenseIds[pair.expenseIndex], pair.tagId],
    }));
    await executeBatch(client, tagAssocStatements);
    console.log(`  Created ${tagAssocStatements.length} tag associations`);

    // 6. Insert incomes
    console.log('Inserting incomes...');
    const incomeStatements: InStatement[] = [];
    let incomeCount = 0;

    for (const { year, month } of PERIODS) {
      // Modest salary with small yearly raises (a bit above monthly expenses,
      // so the renter saves a little each month).
      const baseSalary = 1000 + (year - START_YEAR) * 80;
      const rate = getExchangeRate(year, month);

      // Monthly salary (1st of the month)
      const salaryDate = `${year}-${pad2(month)}-${pad2(clampDay(year, month, 1))}T09:00:00`;
      const salaryUsd = randFloat(baseSalary - 100, baseSalary + 100);
      incomeStatements.push({
        sql: `INSERT INTO incomes (userId, amount, currency, entryRate, month, year, incomeType, source, notes, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId,
          salaryUsd,
          'USD',
          rate,
          month,
          year,
          'salary',
          'شرکت محل کار',
          'حقوق ماهانه',
          salaryDate,
          salaryDate,
        ],
      });
      incomeCount++;

      // Occasional freelance side income (~20% of months)
      if (rand() < 0.2) {
        const freelanceDate = `${year}-${pad2(month)}-${pad2(clampDay(year, month, 15))}T10:00:00`;
        const freelanceUsd = randFloat(150, 600);
        incomeStatements.push({
          sql: `INSERT INTO incomes (userId, amount, currency, entryRate, month, year, incomeType, source, notes, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            userId,
            freelanceUsd,
            'USD',
            rate,
            month,
            year,
            'freelance',
            pick(['پروژه وب‌سایت', 'مشاوره', 'کار طراحی', 'ریویو کد', 'مقاله فنی']),
            'کار فریلنسی',
            freelanceDate,
            freelanceDate,
          ],
        });
        incomeCount++;
      }

      // A gift around Nowruz (March) and year-end (December)
      if (month === 3 || month === 12) {
        const giftDate = `${year}-${pad2(month)}-${pad2(clampDay(year, month, month === 3 ? 15 : 25))}T12:00:00`;
        const giftUsd = randFloat(30, 150);
        incomeStatements.push({
          sql: `INSERT INTO incomes (userId, amount, currency, entryRate, month, year, incomeType, source, notes, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            userId,
            giftUsd,
            'USD',
            rate,
            month,
            year,
            'gift',
            'خانواده',
            month === 3 ? 'عیدی نوروز' : 'هدیه آخر سال',
            giftDate,
            giftDate,
          ],
        });
        incomeCount++;
      }
    }

    await executeBatch(client, incomeStatements);
    console.log(`  Created ${incomeCount} income entries`);

    // 7. Insert assets
    console.log('Inserting assets...');
    const assetStatements: InStatement[] = [];
    const now = NOW.toISOString();
    const createdAt = `${START_YEAR}-${pad2(START_MONTH)}-01T10:00:00`;

    // The asset row and its most recent valuation must agree — every real write
    // path (create, update, revalue) writes both from the same numbers, so a
    // demo that disagrees with itself makes the net-worth chart contradict the
    // summary cards. Captured here, replayed as the closing snapshot below.
    const finalValuation = new Map<string, { unitValue: number; amount: number; entryRate: number }>();

    for (const asset of ASSET_DEFS) {
      // Current value (after WINDOW_YEARS of growth)
      const currentUnitValue = asset.baseUnitValueUsd * Math.pow(asset.growth, WINDOW_YEARS);
      const totalValueUsd = parseFloat((asset.quantity * currentUnitValue).toFixed(2));
      const rate = getExchangeRate(END_YEAR, END_MONTH);

      finalValuation.set(asset.name, {
        unitValue: parseFloat(currentUnitValue.toFixed(2)),
        amount: totalValueUsd,
        entryRate: rate,
      });

      assetStatements.push({
        sql: `INSERT INTO assets (userId, category, name, quantity, unit, unitValue, amount, currency, entryRate, notes, lastValuedAt, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId,
          asset.category,
          asset.name,
          asset.quantity,
          asset.unit,
          parseFloat(currentUnitValue.toFixed(2)),
          totalValueUsd,
          'USD',
          rate,
          null,
          now,
          createdAt,
          now,
        ],
      });
    }

    await executeBatch(client, assetStatements);
    console.log(`  Created ${ASSET_DEFS.length} assets`);

    // 8. Insert asset valuations (semi-annual snapshots)
    console.log('Inserting asset valuations...');
    const assetIdsResult = await client.execute({
      sql: 'SELECT id, name FROM assets WHERE userId = ? ORDER BY id ASC',
      args: [userId],
    });
    const assetIdMap: Record<string, number> = {};
    for (const row of assetIdsResult.rows) {
      assetIdMap[row.name as string] = row.id as number;
    }

    const valuationStatements: InStatement[] = [];
    let valuationCount = 0;

    for (const asset of ASSET_DEFS) {
      const assetId = assetIdMap[asset.name];
      if (!assetId) continue;

      // Semi-annual snapshots (Jan & Jul) plus one for the current month.
      for (const { year, month } of PERIODS) {
        if (month !== 1 && month !== 7 && !isCurrentMonth(year, month)) continue;

        // Historic snapshots wander a little so the chart has texture; the
        // closing one is copied verbatim from the asset row instead, because
        // it is the value every summary card reads.
        const final = finalValuation.get(asset.name);
        const isClosing = isCurrentMonth(year, month) && final !== undefined;

        const yearsElapsed = year - START_YEAR + (month - 1) / 12;
        const unitValue = asset.baseUnitValueUsd * Math.pow(asset.growth, yearsElapsed);
        const noise = 1 + (rand() - 0.5) * 0.08;
        const noisyUnitValue = parseFloat((unitValue * noise).toFixed(2));

        const snapUnitValue = isClosing ? final!.unitValue : noisyUnitValue;
        const snapAmount = isClosing ? final!.amount : parseFloat((asset.quantity * noisyUnitValue).toFixed(2));
        const rate = isClosing ? final!.entryRate : getExchangeRate(year, month);
        const valuedAt = isClosing ? now : `${year}-${pad2(month)}-${pad2(clampDay(year, month, 15))}T10:00:00`;

        valuationStatements.push({
          sql: `INSERT INTO assetValuations (assetId, quantity, unitValue, amount, currency, entryRate, valuedAt, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [assetId, asset.quantity, snapUnitValue, snapAmount, 'USD', rate, valuedAt, valuedAt],
        });
        valuationCount++;
      }
    }

    await executeBatch(client, valuationStatements);
    console.log(`  Created ${valuationCount} asset valuations`);

    // 8b. Insert debts — one overdue payable, one receivable still to collect,
    //     and one settled payable, so every state of the debts page is visible.
    //
    //     The settled one is bookkeeping-only (all three settled* columns NULL)
    //     on purpose. Settling through an account would move a demo balance, and
    //     the note above the asset loop explains why a demo whose asset rows
    //     disagree with their own valuation history is worse than no demo.
    console.log('Inserting debts...');
    const dayMs = 24 * 60 * 60 * 1000;
    const isoDay = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * dayMs).toISOString().slice(0, 10);
    const debtRate = getExchangeRate(END_YEAR, END_MONTH);
    const DEBT_DEFS = [
      // I owe the mechanic, and the agreed date has passed.
      {
        direction: 'payable',
        counterparty: 'مکانیک',
        amount: 150,
        incurred: -14,
        due: -5,
        note: 'تعمیر موتور',
        settled: false,
      },
      // My brother owes me; not due yet.
      {
        direction: 'receivable',
        counterparty: 'برادرم',
        amount: 300,
        incurred: -30,
        due: 10,
        note: 'قرض',
        settled: false,
      },
      // Already sorted out.
      {
        direction: 'payable',
        counterparty: 'رضا',
        amount: 80,
        incurred: -60,
        due: -45,
        note: 'شام دورهمی',
        settled: true,
      },
    ] as const;

    const debtStatements: InStatement[] = DEBT_DEFS.map((d) => ({
      sql: `INSERT INTO debts (userId, direction, counterparty, amount, currency, entryRate, incurredAt, dueDate, note, settledAt)
            VALUES (?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?)`,
      args: [
        userId,
        d.direction,
        d.counterparty,
        d.amount,
        debtRate,
        isoDay(d.incurred),
        isoDay(d.due),
        d.note,
        d.settled ? now : null,
      ],
    }));
    await executeBatch(client, debtStatements);
    console.log(`  Created ${DEBT_DEFS.length} debts`);

    // 9. Seed fabricated USD→IRT rows ONLY for periods older than all recorded
    //    rate data. currencyRates is shared app-wide, so fabricated demo rates
    //    must never land on dates real users' conversions could pick up
    //    (that's how the migration-era chart corruption happened).
    console.log('Seeding currency rates...');
    const firstRealRateDate = realUsdRates[0]?.rateDate ?? null;
    const rateStatements: InStatement[] = [];
    const nowIso = NOW.toISOString();
    for (const { year, month } of PERIODS) {
      const rateDate = `${year}-${pad2(month)}-01`;
      if (firstRealRateDate !== null && rateDate >= firstRealRateDate) continue;
      rateStatements.push({
        sql: `INSERT OR IGNORE INTO currencyRates (currency, baseCurrency, rate, rateDate, fetchedAt)
              VALUES ('USD', 'IRT', ?, ?, ?)`,
        args: [getExchangeRate(year, month), rateDate, nowIso],
      });
    }
    // On an empty table (fresh dev DB) also add a current-dated row so
    // latest-rate lookups resolve; with any real data the cron owns "today".
    if (firstRealRateDate === null) {
      rateStatements.push({
        sql: `INSERT OR IGNORE INTO currencyRates (currency, baseCurrency, rate, rateDate, fetchedAt)
              VALUES ('USD', 'IRT', ?, ?, ?)`,
        args: [getExchangeRate(END_YEAR, END_MONTH), nowIso.slice(0, 10), nowIso],
      });
    }
    if (rateStatements.length > 0) await executeBatch(client, rateStatements);
    console.log(`  Created ${rateStatements.length} currency rate rows`);

    // Summary
    console.log('\n✅ Demo seed completed successfully!');
    console.log(`   User: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    console.log(`   Tags: ${TAG_NAMES.length}`);
    console.log(`   Expenses: ${expenseCount}`);
    console.log(`   Tag associations: ${tagAssocStatements.length}`);
    console.log(`   Incomes: ${incomeCount}`);
    console.log(`   Assets: ${ASSET_DEFS.length}`);
    console.log(`   Asset valuations: ${valuationCount}`);

    return {
      tags: TAG_NAMES.length,
      expenses: expenseCount,
      tagAssociations: tagAssocStatements.length,
      incomes: incomeCount,
      assets: ASSET_DEFS.length,
      assetValuations: valuationCount,
      window: { start: `${START_YEAR}-${pad2(START_MONTH)}`, end: `${END_YEAR}-${pad2(END_MONTH)}` },
    };
  } catch (error) {
    console.error('❌ Demo seed failed:', error);
    throw error;
  } finally {
    client.close();
  }
}

// CLI entry: only auto-run when executed directly (e.g. `pnpm db:seed-demo`),
// not when imported by the cron route.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Load env from .env.local only for local CLI runs; the cron route relies on
  // the platform-provided environment variables.
  config({ path: '.env.local' });
  seedDemo();
}
