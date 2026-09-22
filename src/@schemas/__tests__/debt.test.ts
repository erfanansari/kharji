import { createDebtObjectSchema, createDebtSchema, createSettleDebtSchema } from '../debt';
import { fallbackT } from '../fallback-translator';

describe('createDebtSchema', () => {
  const schema = createDebtSchema(fallbackT);
  const validDebt = {
    direction: 'payable' as const,
    counterparty: 'Reza',
    amount: 5_000_000,
    currency: 'IRT',
    incurredAt: '2026-09-01',
  };

  it('accepts a valid debt with only the required fields', () => {
    expect(schema.safeParse(validDebt).success).toBe(true);
  });

  it('accepts every optional field', () => {
    const result = schema.safeParse({ ...validDebt, dueDate: '2026-10-01', note: 'Motorcycle repair' });
    expect(result.success).toBe(true);
  });

  it('accepts both directions', () => {
    expect(schema.safeParse({ ...validDebt, direction: 'payable' }).success).toBe(true);
    expect(schema.safeParse({ ...validDebt, direction: 'receivable' }).success).toBe(true);
  });

  it('rejects an unknown direction', () => {
    expect(schema.safeParse({ ...validDebt, direction: 'owed' }).success).toBe(false);
  });

  it('rejects an empty counterparty', () => {
    expect(schema.safeParse({ ...validDebt, counterparty: '' }).success).toBe(false);
  });

  // `.positive()`, not `.min(0)` like the asset schema: a zero debt is not a
  // debt, and settling one would write a valuation snapshot of a zero movement.
  it('rejects a zero amount', () => {
    expect(schema.safeParse({ ...validDebt, amount: 0 }).success).toBe(false);
  });

  it('rejects a negative amount', () => {
    expect(schema.safeParse({ ...validDebt, amount: -100 }).success).toBe(false);
  });

  it('rejects an unsupported currency', () => {
    expect(schema.safeParse({ ...validDebt, currency: 'XXX' }).success).toBe(false);
  });

  it('rejects a malformed incurredAt', () => {
    expect(schema.safeParse({ ...validDebt, incurredAt: '01/09/2026' }).success).toBe(false);
  });

  it('accepts a null or omitted dueDate', () => {
    expect(schema.safeParse({ ...validDebt, dueDate: null }).success).toBe(true);
    expect(schema.safeParse(validDebt).success).toBe(true);
  });

  it('rejects a malformed dueDate', () => {
    expect(schema.safeParse({ ...validDebt, dueDate: 'soon' }).success).toBe(false);
  });

  it('accepts a dueDate equal to incurredAt', () => {
    expect(schema.safeParse({ ...validDebt, dueDate: '2026-09-01' }).success).toBe(true);
  });

  it('rejects a dueDate before incurredAt, reporting it on the dueDate field', () => {
    const result = schema.safeParse({ ...validDebt, dueDate: '2026-08-31' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['dueDate']);
    }
  });

  // The reason the object/refined split exists: Zod refuses `.partial()` on a
  // schema carrying refinements, and updateDebtMutation needs exactly that.
  it('leaves the object schema partial-able for the update mutation', () => {
    const partial = createDebtObjectSchema(fallbackT).partial();
    expect(partial.safeParse({ amount: 10 }).success).toBe(true);
    expect(partial.safeParse({}).success).toBe(true);
  });
});

describe('createSettleDebtSchema', () => {
  const schema = createSettleDebtSchema(fallbackT);

  it('accepts an empty body — the bookkeeping-only default', () => {
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('accepts an account id, or an explicit null for "don\'t track"', () => {
    expect(schema.safeParse({ settledAssetId: 7 }).success).toBe(true);
    expect(schema.safeParse({ settledAssetId: null }).success).toBe(true);
  });

  it('rejects a non-positive or fractional account id', () => {
    expect(schema.safeParse({ settledAssetId: 0 }).success).toBe(false);
    expect(schema.safeParse({ settledAssetId: -3 }).success).toBe(false);
    expect(schema.safeParse({ settledAssetId: 1.5 }).success).toBe(false);
  });
});
