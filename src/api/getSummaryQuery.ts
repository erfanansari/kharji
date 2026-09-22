import { z } from 'zod';

import client from '@core/client';
import type { QueryKeyGenerator } from '@core/client/@types';

export const SUMMARY_SCOPE = ['summary'] as const;

/** A total already converted server-side, per-record at each record's date. */
const summaryPairSchema = z.object({
  primary: z.number(),
  secondary: z.number().nullable(),
});

export type SummaryPair = z.infer<typeof summaryPairSchema>;

const responseSchema = z.object({
  primaryCurrency: z.string(),
  secondaryCurrency: z.string().nullable(),
  total_income: summaryPairSchema,
  total_expenses: summaryPairSchema,
  // The three debt-era fields are `.optional()` for ONE release, on purpose.
  // This is a PWA: a service worker can hand a user a freshly-cached client
  // while an older server is still answering, and a required key that server
  // does not send would fail the parse and blank the whole Overview. Tighten
  // these in 1.7.1, once no old server is left to talk to.
  //
  // `net_worth`'s changed MEANING needs no such hedge — an old cached client
  // simply keeps showing the gross figure until it reloads, which is
  // self-healing.
  total_assets: summaryPairSchema.optional(),
  total_payable: summaryPairSchema.optional(),
  total_receivable: summaryPairSchema.optional(),
  net_worth: summaryPairSchema,
});

type Response = z.infer<typeof responseSchema>;

const keyGenerator: QueryKeyGenerator = () => ['summary', 'overview'];

client.registerEndpoint<void, Response>(keyGenerator, {
  url: '/api/summary',
  method: 'GET',
  responseSchema,
});

export { keyGenerator as getSummaryKeyGenerator };
export type { Response as SummaryData };
