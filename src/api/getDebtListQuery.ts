import { z } from 'zod';

import type { Debt } from '@types';

import client from '@core/client';
import type { QueryKeyGenerator } from '@core/client/@types';

export const DEBTS_SCOPE = ['debts'] as const;

const settledFromSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string(),
  currency: z.string(),
});

export const debtSchema: z.ZodType<Debt> = z.object({
  id: z.number(),
  userId: z.number(),
  direction: z.enum(['payable', 'receivable']),
  counterparty: z.string(),
  amount: z.number(),
  currency: z.string(),
  entryRate: z.number(),
  incurredAt: z.string(),
  dueDate: z.string().nullable(),
  note: z.string().nullable(),
  settledAt: z.string().nullable(),
  settledAssetId: z.number().nullable(),
  settledDelta: z.number().nullable(),
  settledCurrency: z.string().nullable(),
  settledFrom: settledFromSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type Response = Debt[];

const keyGenerator: QueryKeyGenerator = () => ['debts', 'list'];

client.registerEndpoint<void, Response>(keyGenerator, {
  url: '/api/debts',
  method: 'GET',
  responseSchema: z.array(debtSchema),
});

export { keyGenerator as getDebtListKeyGenerator };
export type { Response as GetDebtListResponse };
