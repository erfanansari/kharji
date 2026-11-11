import { z } from 'zod';

import client from '@core/client';
import type { MutationKeyGenerator } from '@core/client/@types';

const requestDataSchema = z.object({ dryRun: z.boolean().optional() });
type RequestData = z.infer<typeof requestDataSchema>;

const revalueValuesSchema = z.object({
  amount: z.number(),
  unitValue: z.number().nullable(),
  entryRate: z.number(),
});

const responseSchema = z.object({
  applied: z.boolean(),
  changes: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      currency: z.string(),
      linkedItem: z.string().nullable(),
      kind: z.enum(['price', 'rate', 'date']),
      previousValuedAt: z.string(),
      old: revalueValuesSchema,
      next: revalueValuesSchema,
    })
  ),
  skipped: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      reason: z.enum(['no-rate', 'no-price', 'no-quantity', 'unchanged']),
    })
  ),
});
type Response = z.infer<typeof responseSchema>;

const keyGenerator: MutationKeyGenerator = () => ['assets', 'revalue'];

client.registerEndpoint<RequestData, Response>(keyGenerator, {
  url: '/api/assets/revalue',
  type: 'mutation',
  requestDataSchema,
  responseSchema,
});

export { keyGenerator as revalueAssetsKeyGenerator };
export type { RequestData as RevalueAssetsRequestData, Response as RevalueAssetsResponse };
