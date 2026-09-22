import { z } from 'zod';

import { createDebtSchema, fallbackT } from '@schemas';
import type { CreateDebtSchema } from '@schemas';

import client from '@core/client';
import type { MutationKeyGenerator } from '@core/client/@types';

type RequestData = CreateDebtSchema;

const responseSchema = z.object({ message: z.string(), id: z.number() });
type Response = z.infer<typeof responseSchema>;

const keyGenerator: MutationKeyGenerator = () => ['debts', 'create'];

client.registerEndpoint<RequestData, Response>(keyGenerator, {
  url: '/api/debts',
  method: 'POST',
  type: 'mutation',
  requestDataSchema: createDebtSchema(fallbackT),
  responseSchema,
});

export { keyGenerator as createDebtKeyGenerator };
export type { RequestData as CreateDebtRequestData };
