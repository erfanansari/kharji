import { z } from 'zod';

import { createDebtObjectSchema, fallbackT } from '@schemas';

import client from '@core/client';
import type { MutationKeyGenerator } from '@core/client/@types';

// The object schema, not the refined one: Zod refuses `.partial()` on a schema
// carrying refinements. See src/@schemas/debt.ts.
const requestDataSchema = createDebtObjectSchema(fallbackT).partial().extend({ id: z.number() });

type RequestData = z.infer<typeof requestDataSchema>;
const responseSchema = z.object({ message: z.string() });
type Response = z.infer<typeof responseSchema>;

const keyGenerator: MutationKeyGenerator = () => ['debts', 'update'];

client.registerEndpoint<RequestData, Response>(keyGenerator, {
  url: (data) => `/api/debts/${data.id}`,
  method: 'PUT',
  type: 'mutation',
  requestDataSchema,
  responseSchema,
  omitFromBody: ['id'],
});

export { keyGenerator as updateDebtKeyGenerator };
export type { RequestData as UpdateDebtRequestData };
