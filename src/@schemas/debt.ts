import { z } from 'zod';

import type { DebtDirection } from '@/@types/debt';
import { DEBT_DIRECTION_VALUES } from '@/constants/debts';

import { currencyCodeSchema } from './expense';
import type { Translator } from './fallback-translator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The plain object shape, without the cross-field refinement.
 *
 * Kept separate for the same reason `createExpenseObjectSchema` is: Zod refuses
 * `.partial()` on a schema carrying refinements, and the update mutation needs
 * exactly that. Prefer `createDebtSchema` for validation; reach for this only
 * when transforming the shape.
 */
export function createDebtObjectSchema(t: Translator) {
  return z.object({
    direction: z.enum(DEBT_DIRECTION_VALUES as unknown as [DebtDirection, ...DebtDirection[]]),
    counterparty: z.string().min(1, t('zod.debt.counterpartyRequired')),
    // `.positive()`, not `.min(0)` as the asset schema uses: a zero debt is not
    // a debt, and settling one would write a valuation snapshot claiming a
    // movement of nothing.
    amount: z.number().positive(t('zod.debt.amountPositive')),
    currency: currencyCodeSchema,
    incurredAt: z.string().regex(ISO_DATE, t('zod.debt.dateInvalid')),
    dueDate: z.string().regex(ISO_DATE, t('zod.debt.dueInvalid')).nullish(),
    note: z.string().nullish(),
  });
}

export function createDebtSchema(t: Translator) {
  return createDebtObjectSchema(t).refine((v) => !v.dueDate || v.dueDate >= v.incurredAt, {
    message: t('zod.debt.dueBeforeIncurred'),
    path: ['dueDate'],
  });
}

/**
 * The settle action's body. Both fields optional: the common case is a bare
 * POST meaning "mark it settled, move nothing".
 */
export function createSettleDebtSchema(t: Translator) {
  return z.object({
    /** null or omitted = bookkeeping only, move no balance. */
    settledAssetId: z.number().int().positive(t('zod.debt.accountInvalid')).nullish(),
    /** Defaults to now, server-side. */
    settledAt: z.string().nullish(),
  });
}

export type CreateDebtSchema = z.infer<ReturnType<typeof createDebtObjectSchema>>;
export type SettleDebtSchema = z.infer<ReturnType<typeof createSettleDebtSchema>>;
