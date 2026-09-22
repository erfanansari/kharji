import { z } from 'zod';

import client from '@core/client';
import type { MutationKeyGenerator } from '@core/client/@types';

/**
 * Settling and un-settling are two registered endpoints, not one, because
 * `EndpointOptions.method` is a static string — the same reason every other
 * pair of verbs in this directory lives in two files. See
 * `unsettleDebtMutation.ts`.
 */
type RequestData = {
  id: number;
  /** null / omitted = bookkeeping only, move no balance. */
  settledAssetId?: number | null;
};

const responseSchema = z.object({ message: z.string() });
type Response = z.infer<typeof responseSchema>;

const keyGenerator: MutationKeyGenerator = () => ['debts', 'settle'];

client.registerEndpoint<RequestData, Response>(keyGenerator, {
  url: (data) => `/api/debts/${data.id}/settle`,
  method: 'POST',
  type: 'mutation',
  responseSchema,
  omitFromBody: ['id'],
});

export { keyGenerator as settleDebtKeyGenerator };
export type { RequestData as SettleDebtRequestData };
