import { z } from 'zod';

import client from '@core/client';
import type { MutationKeyGenerator } from '@core/client/@types';

type RequestData = { id: number };

const responseSchema = z.object({ message: z.string() });
type Response = z.infer<typeof responseSchema>;

const keyGenerator: MutationKeyGenerator = () => ['debts', 'unsettle'];

client.registerEndpoint<RequestData, Response>(keyGenerator, {
  url: (data) => `/api/debts/${data.id}/settle`,
  method: 'DELETE',
  type: 'mutation',
  responseSchema,
  omitFromBody: ['id'],
});

export { keyGenerator as unsettleDebtKeyGenerator };
export type { RequestData as UnsettleDebtRequestData };
