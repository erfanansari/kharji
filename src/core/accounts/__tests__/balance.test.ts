import { isSpendableAssetCategory, SPENDABLE_ASSET_TILE } from '@/constants/assets';

import {
  applyDelta,
  currencyDecimals,
  fundingDelta,
  type FundingState,
  type MoneyRecord,
  resyncOps,
  reverseDelta,
  roundToCurrency,
  wouldOverdraw,
} from '../balance';

const expense = (amount: number, currency: string, entryRate: number): MoneyRecord => ({
  amount,
  currency,
  entryRate,
});

const funding = (assetId: number, delta: number, currency = 'IRT'): FundingState => ({ assetId, delta, currency });

describe('fundingDelta — same currency is identity', () => {
  it('returns the amount untouched for a pivot expense from a pivot account', () => {
    expect(fundingDelta(expense(500_000, 'IRT', 1), 'IRT', 1)).toBe(500_000);
  });

  // The load-bearing one. A record's entryRate is a frozen snapshot that is
  // *expected* to drift from the current rate, so amount * entryRate /
  // accountRate would return 857.14 here. Spending $1000 from a dollar account
  // must move that account by exactly $1000, whatever the toman has done since.
  it('ignores rate drift entirely when the expense and account share a currency', () => {
    expect(fundingDelta(expense(1000, 'USD', 60_000), 'USD', 70_000)).toBe(1000);
  });

  it('does not even consult the rate — identity holds when none is available', () => {
    expect(fundingDelta(expense(1000, 'USD', 60_000), 'USD', null)).toBe(1000);
  });
});

describe('fundingDelta — across currencies', () => {
  it('converts a pivot expense into a foreign account via the pivot value', () => {
    expect(fundingDelta(expense(3_500_000, 'IRT', 1), 'USD', 70_000)).toBe(50);
  });

  it('converts a foreign expense into a pivot account', () => {
    expect(fundingDelta(expense(10, 'USD', 70_000), 'IRT', 1)).toBe(700_000);
  });

  it('converts when neither side is the pivot', () => {
    // 10 USD = 700,000 IRT of value; at 80,000 IRT per EUR that is 8.75 EUR.
    expect(fundingDelta(expense(10, 'USD', 70_000), 'EUR', 80_000)).toBe(8.75);
  });

  // Guards against someone "simplifying" this to a live rate lookup. The
  // expense's own frozen rate is what makes its value historically honest.
  it('uses the expense frozen entryRate, not the account rate, for the first leg', () => {
    expect(fundingDelta(expense(10, 'USD', 60_000), 'IRT', 1)).toBe(600_000);
    expect(fundingDelta(expense(10, 'USD', 70_000), 'IRT', 1)).toBe(700_000);
  });
});

describe('fundingDelta — rounding', () => {
  it('rounds to the ACCOUNT currency decimals, not the expense currency', () => {
    // 1000 IRT / 70,000 = 0.014285…; a dollar account holds two decimals.
    expect(fundingDelta(expense(1000, 'IRT', 1), 'USD', 70_000)).toBe(0.01);
  });

  it('rounds to a whole number for a toman account', () => {
    expect(fundingDelta(expense(1, 'USD', 70_123.4), 'IRT', 1)).toBe(70_123);
  });
});

describe('fundingDelta — unusable rates', () => {
  it.each([
    ['null', null],
    ['zero', 0],
    ['negative', -70_000],
    ['NaN', NaN],
    ['Infinity', Infinity],
  ])('returns null for a %s account rate', (_label, rate) => {
    expect(fundingDelta(expense(10, 'USD', 70_000), 'EUR', rate as number | null)).toBeNull();
  });
});

describe('applyDelta / reverseDelta', () => {
  it('allows an overdraft rather than clamping at zero', () => {
    expect(applyDelta(100, 250, 'IRT')).toBe(-150);
  });

  // This table is the entire justification for rounding on every boundary. With
  // raw float arithmetic 100.1 - 0.3 + 0.3 is 100.10000000000002, and a balance
  // that drifts a little on every edit eventually stops matching reality.
  describe.each(['IRT', 'USD'])('reversal is exact for %s', (currency) => {
    const pairs: [number, number][] = [
      [100.1, 0.3],
      [0.1, 0.2],
      [1_000_000_000.07, 0.07],
      [1234.56, 1234.56],
      [99_500_000, 500_000],
      [0, 0],
    ];

    it.each(pairs)('balance %p, delta %p round-trips exactly', (balance, delta) => {
      const start = roundToCurrency(balance, currency);
      const step = roundToCurrency(delta, currency);
      expect(reverseDelta(applyDelta(start, step, currency), step, currency)).toBe(start);
    });
  });

  it('returns to the exact starting balance after ten applies and ten reverses', () => {
    const currency = 'USD';
    const start = 1234.56;
    let balance = start;
    for (let i = 0; i < 10; i += 1) balance = applyDelta(balance, 0.07, currency);
    for (let i = 0; i < 10; i += 1) balance = reverseDelta(balance, 0.07, currency);
    expect(balance).toBe(start);
  });
});

describe('wouldOverdraw', () => {
  it('is false when the delta exactly empties the account', () => {
    expect(wouldOverdraw(500_000, 500_000)).toBe(false);
  });

  it('is true one unit past the balance', () => {
    expect(wouldOverdraw(500_000, 500_001)).toBe(true);
  });
});

describe('resyncOps', () => {
  it('emits nothing when the expense was and stays untracked', () => {
    expect(resyncOps(null, null)).toEqual([]);
  });

  it('debits the account when funding is added', () => {
    expect(resyncOps(null, funding(7, 500_000))).toEqual([{ assetId: 7, delta: 500_000 }]);
  });

  it('credits the account back when funding is removed', () => {
    expect(resyncOps(funding(7, 500_000), null)).toEqual([{ assetId: 7, delta: -500_000 }]);
  });

  // One op, so one statement and one valuation snapshot per user action —
  // rather than a credit-back plus a re-debit, which would double the history.
  it('nets a same-account amount change into a single op', () => {
    expect(resyncOps(funding(7, 500_000), funding(7, 700_000))).toEqual([{ assetId: 7, delta: 200_000 }]);
  });

  it('drops a same-account no-op instead of writing an empty snapshot', () => {
    expect(resyncOps(funding(7, 500_000), funding(7, 500_000))).toEqual([]);
  });

  it('credits the old account and debits the new one on a switch', () => {
    expect(resyncOps(funding(7, 500_000), funding(9, 500_000))).toEqual([
      { assetId: 7, delta: -500_000 },
      { assetId: 9, delta: 500_000 },
    ]);
  });

  it('rounds the netted delta on the account currency grid', () => {
    expect(resyncOps(funding(7, 0.3, 'USD'), funding(7, 100.1, 'USD'))).toEqual([{ assetId: 7, delta: 99.8 }]);
  });
});

describe('currencyDecimals', () => {
  it('matches what the SQL ROUND() argument must be', () => {
    expect(currencyDecimals('IRT')).toBe(0);
    expect(currencyDecimals('USD')).toBe(2);
  });
});

describe('isSpendableAssetCategory', () => {
  it('accepts the two account categories', () => {
    expect(isSpendableAssetCategory('cash')).toBe(true);
    expect(isSpendableAssetCategory('bank')).toBe(true);
  });

  it.each(['crypto', 'commodity', 'vehicle', 'property', 'investment', 'nonsense'])('rejects %s', (category) => {
    expect(isSpendableAssetCategory(category)).toBe(false);
  });

  it('has a tile mapping for every spendable category', () => {
    expect(Object.keys(SPENDABLE_ASSET_TILE).sort()).toEqual(['bank', 'cash']);
  });
});

// Debts push a SIGNED delta through the same machinery as expenses: positive
// when a payable is settled (money leaves), negative when a receivable is
// collected (money arrives). Nothing in resyncOps was written with that in
// mind, so these pin the claim the whole debts feature rests on — that it is
// sign-agnostic and needs no debt-specific branch.
describe('resyncOps — signed deltas', () => {
  it('credits the account when a receivable settlement is first recorded', () => {
    expect(resyncOps(null, funding(7, -300_000))).toEqual([{ assetId: 7, delta: -300_000 }]);
  });

  it('takes a collected receivable back out when it is un-settled', () => {
    // Reversal negates the stored delta: -(-300,000) = +300,000, a debit.
    expect(resyncOps(funding(7, -300_000), null)).toEqual([{ assetId: 7, delta: 300_000 }]);
  });

  it('nets a same-account amount edit on a receivable into one movement', () => {
    // 300,000 collected, edited up to 500,000: one further credit of 200,000.
    expect(resyncOps(funding(7, -300_000), funding(7, -500_000))).toEqual([{ assetId: 7, delta: -200_000 }]);
  });

  // Flipping a SETTLED debt from payable to receivable is the awkward case:
  // it has to give back what was paid AND credit what is now received, which
  // against one account is -d - d = -2d.
  it('nets a payable → receivable flip on the same account to twice the amount, credited', () => {
    expect(resyncOps(funding(7, 500_000), funding(7, -500_000))).toEqual([{ assetId: 7, delta: -1_000_000 }]);
  });

  it('and the reverse flip debits twice the amount', () => {
    expect(resyncOps(funding(7, -500_000), funding(7, 500_000))).toEqual([{ assetId: 7, delta: 1_000_000 }]);
  });

  it('emits two signed ops when a settled receivable moves to a different account', () => {
    expect(resyncOps(funding(7, -300_000), funding(9, -300_000))).toEqual([
      { assetId: 7, delta: 300_000 },
      { assetId: 9, delta: -300_000 },
    ]);
  });

  it('emits nothing for a no-op edit, whichever sign', () => {
    expect(resyncOps(funding(7, -300_000), funding(7, -300_000))).toEqual([]);
    expect(resyncOps(funding(7, 300_000), funding(7, 300_000))).toEqual([]);
  });
});
