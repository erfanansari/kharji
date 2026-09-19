import { z } from 'zod';

import type { Expense } from '@types';

import client from '@core/client';
import type { QueryKeyGenerator } from '@core/client/@types';

export const EXPENSES_SCOPE = ['expenses'] as const;

export const tagSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.string(),
});

export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  sort_order: z.number(),
  created_at: z.string(),
});

export const paidFromSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string(),
  currency: z.string(),
});

export const expenseSchema: z.ZodType<Expense> = z.object({
  id: z.number(),
  date: z.string(),
  category: categorySchema,
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  entryRate: z.number(),
  recurringId: z.number().nullable(),
  repeat: z
    .object({
      frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
      intervalCount: z.number(),
      calendar: z.enum(['gregorian', 'jalali']),
      endDate: z.string().nullable(),
    })
    .nullable(),
  paidFromAssetId: z.number().nullable(),
  paidFromDelta: z.number().nullable(),
  paidFromCurrency: z.string().nullable(),
  paidFrom: paidFromSchema.nullable(),
  created_at: z.string(),
  tags: z.array(tagSchema).optional(),
});

export const expenseFiltersSchema = z.object({
  description: z.string().optional(),
  categoryId: z.number().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  tagIds: z.array(z.number()).optional(),
  limit: z.number().optional(),
});

export type ExpenseFilters = Omit<z.infer<typeof expenseFiltersSchema>, 'limit'>;
type RequestData = z.infer<typeof expenseFiltersSchema>;

const responseSchema = z.object({
  expenses: z.array(expenseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  summary: z
    .object({
      count: z.number(),
      items: z.array(
        z.object({
          amount: z.number(),
          currency: z.string(),
          date: z.string(),
          entryRate: z.number(),
        })
      ),
    })
    .nullable(),
});

type Response = z.infer<typeof responseSchema>;

const keyGenerator: QueryKeyGenerator<RequestData> = (data) => ['expenses', 'list', data];

client.registerEndpoint<RequestData, Response>(keyGenerator, {
  url: '/api/expenses',
  method: 'GET',
  requestDataSchema: expenseFiltersSchema,
  responseSchema,
  pageParamName: 'cursor',
});

export { keyGenerator as getExpenseListKeyGenerator };
export type ExpenseSummary = NonNullable<Response['summary']>;
export type { RequestData as GetExpenseListRequestData, Response as ExpensesPage };
