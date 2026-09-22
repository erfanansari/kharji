import { applyDelta, reverseDelta } from '@core/accounts/balance';
import type { MoneyRecord } from '@core/accounts/balance';

import { debtSettlementDelta, netDebtPosition, settlementWouldOverdraw } from '../balance';

const debt = (amount: number, currency: string, entryRate: number): MoneyRecord => ({ amount, currency, entryRate });

// The SQL in account-balance.ts always SUBTRACTS the delta, so the sign of what
// this module returns IS the direction of the money. These tests exist because
// an unsigned magnitude for a receivable would debit an account on "they paid
// me back" and nothing on screen would look wrong.
describe('debtSettlementDelta — the sign is the direction', () => {
  it('is positive for a payable: money leaves the account', () => {
    expect(debtSettlementDelta('payable', debt(500_000, 'IRT', 1), 'IRT', 1)).toBe(500_000);
  });

  it('is NEGATIVE for a receivable: money arrives', () => {
    expect(debtSettlementDelta('receivable', debt(500_000, 'IRT', 1), 'IRT', 1)).toBe(-500_000);
  });

  it('gives a receivable exactly the negation of the same payable, in every currency shape', () => {
    const cases: [MoneyRecord, string, number][] = [
      [debt(1000, 'USD', 60_000), 'USD', 70_000], // same currency
      [debt(3_500_000, 'IRT', 1), 'USD', 70_000], // pivot debt, foreign account
      [debt(10, 'USD', 70_000), 'IRT', 1], // foreign debt, pivot account
    ];
    for (const [record, accountCurrency, rate] of cases) {
      const paid = debtSettlementDelta('payable', record, accountCurrency, rate);
      const collected = debtSettlementDelta('receivable', record, accountCurrency, rate);
      expect(paid).not.toBeNull();
      expect(collected).toBe(-(paid as number));
    }
  });
});

describe('debtSettlementDelta — inherited contract from fundingDelta', () => {
  // Same-currency is identity: a $1000 debt settled through a dollar account
  // must move it by exactly $1000 whatever the frozen entryRate has drifted to.
  it('ignores rate drift when the debt and account share a currency', () => {
    expect(debtSettlementDelta('payable', debt(1000, 'USD', 60_000), 'USD', 70_000)).toBe(1000);
    expect(debtSettlementDelta('receivable', debt(1000, 'USD', 60_000), 'USD', 70_000)).toBe(-1000);
  });

  it('does not need a rate at all for a same-currency settlement', () => {
    expect(debtSettlementDelta('receivable', debt(1000, 'USD', 60_000), 'USD', null)).toBe(-1000);
  });

  it('propagates null when the rate is missing across currencies, for either direction', () => {
    expect(debtSettlementDelta('payable', debt(10, 'USD', 70_000), 'IRT', null)).toBeNull();
    expect(debtSettlementDelta('receivable', debt(10, 'USD', 70_000), 'IRT', null)).toBeNull();
  });
});

describe('settlementWouldOverdraw', () => {
  it('warns when paying a debt would take the account below zero', () => {
    expect(settlementWouldOverdraw(100, 150)).toBe(true);
  });

  it('does not warn when there is enough', () => {
    expect(settlementWouldOverdraw(150, 100)).toBe(false);
    expect(settlementWouldOverdraw(100, 100)).toBe(false);
  });

  it('can never warn for an inflow, whatever the balance', () => {
    expect(settlementWouldOverdraw(0, -500)).toBe(false);
    // The case a naive `balance - delta < 0` gets wrong: an already-negative
    // balance being repaired by a credit must not be flagged as an overdraft.
    expect(settlementWouldOverdraw(-200, -50)).toBe(false);
  });
});

describe('netDebtPosition', () => {
  it('is receivable minus payable', () => {
    expect(netDebtPosition(300, 150, 'USD')).toBe(150);
    expect(netDebtPosition(100, 400, 'USD')).toBe(-300);
  });

  it('snaps onto the currency grid rather than leaking float dust', () => {
    // 0.3 - 0.1 === 0.19999999999999998 in IEEE 754.
    expect(netDebtPosition(0.3, 0.1, 'USD')).toBe(0.2);
  });

  it('rounds toman to whole units', () => {
    expect(netDebtPosition(1000.6, 0, 'IRT')).toBe(1001);
  });
});

// Reversal has to return the ORIGINAL bits, not something close to them, for
// both signs and on a 2dp currency — asserted with toBe, not toBeCloseTo, the
// same standard the expense balance tests hold themselves to.
describe('apply → reverse round trip, both signs', () => {
  it.each([
    ['payable, toman', 12_345_678, 500_000, 'IRT'],
    ['receivable, toman', 12_345_678, -500_000, 'IRT'],
    ['payable, USD (2dp)', 1234.56, 99.99, 'USD'],
    ['receivable, USD (2dp)', 1234.56, -99.99, 'USD'],
    ['payable, awkward cents', 0.3, 0.1, 'USD'],
    ['receivable, awkward cents', 0.3, -0.1, 'USD'],
  ])('%s returns the original balance exactly', (_label, balance, delta, currency) => {
    const moved = applyDelta(balance, delta, currency);
    expect(reverseDelta(moved, delta, currency)).toBe(balance);
  });

  it('moves a balance down for a payable and up for a receivable', () => {
    expect(applyDelta(1000, 200, 'IRT')).toBe(800);
    expect(applyDelta(1000, -200, 'IRT')).toBe(1200);
  });
});
