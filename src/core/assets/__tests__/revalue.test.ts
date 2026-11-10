import { planRevalue } from '../revalue';

const TODAY = '2026-11-10';
const LATEST = { USD: 100_000, GOLD_SEKKEH: 150_000_000 };

const asset = (over: Partial<Parameters<typeof planRevalue>[0][number]>) => ({
  id: 1,
  name: 'Asset',
  currency: 'IRT',
  linkedItem: null,
  quantity: 1,
  amount: 1_000_000,
  unitValue: null,
  entryRate: 1,
  lastValuedAt: '2026-08-01T10:00:00.000Z',
  ...over,
});

describe('planRevalue', () => {
  it('re-dates a manually valued pivot-currency asset so its converted value follows today', () => {
    const { changes, skipped } = planRevalue([asset({ name: 'Car', amount: 2_800_000_000 })], LATEST, TODAY);

    expect(skipped).toEqual([]);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ kind: 'date', previousValuedAt: '2026-08-01' });
    // The amount in its own currency is the user's truth — never touched.
    expect(changes[0].next).toEqual(changes[0].old);
  });

  it('leaves a pivot-currency asset alone once it is dated today', () => {
    const { changes, skipped } = planRevalue([asset({ lastValuedAt: `${TODAY}T08:00:00.000Z` })], LATEST, TODAY);

    expect(changes).toEqual([]);
    expect(skipped).toEqual([{ id: 1, name: 'Asset', reason: 'unchanged' }]);
  });

  it('re-snapshots only the rate of an unlinked foreign-currency asset', () => {
    const { changes } = planRevalue([asset({ currency: 'USD', amount: 5000, entryRate: 80_000 })], LATEST, TODAY);

    expect(changes[0]).toMatchObject({
      kind: 'rate',
      old: { amount: 5000, entryRate: 80_000 },
      next: { amount: 5000, entryRate: 100_000 },
    });
  });

  it('reprices a linked asset from the tracked item', () => {
    const { changes } = planRevalue(
      [asset({ linkedItem: 'GOLD_SEKKEH', quantity: 2, amount: 200_000_000, unitValue: 100_000_000 })],
      LATEST,
      TODAY
    );

    expect(changes[0]).toMatchObject({
      kind: 'price',
      next: { amount: 300_000_000, unitValue: 150_000_000, entryRate: 1 },
    });
  });

  it('reports foreign and linked assets that are already current as unchanged', () => {
    const { changes, skipped } = planRevalue(
      [
        asset({ id: 1, currency: 'USD', amount: 5000, entryRate: 100_000 }),
        asset({ id: 2, linkedItem: 'GOLD_SEKKEH', quantity: 2, amount: 300_000_000, unitValue: 150_000_000 }),
      ],
      LATEST,
      TODAY
    );

    expect(changes).toEqual([]);
    expect(skipped.map((s) => s.reason)).toEqual(['unchanged', 'unchanged']);
  });

  it('skips with a reason when a rate, price or quantity is missing', () => {
    const { changes, skipped } = planRevalue(
      [
        asset({ id: 1, currency: 'EUR', amount: 10, entryRate: 90_000 }),
        asset({ id: 2, linkedItem: 'GOLD_BAHAR', quantity: 1 }),
        asset({ id: 3, linkedItem: 'GOLD_SEKKEH', quantity: 0 }),
      ],
      LATEST,
      TODAY
    );

    expect(changes).toEqual([]);
    expect(skipped.map((s) => s.reason)).toEqual(['no-rate', 'no-price', 'no-quantity']);
  });
});
