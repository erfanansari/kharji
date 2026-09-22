import client from '@core/client';
import type { MutationKeyGenerator } from '@core/client/@types';

type RequestData = { id: number };

const keyGenerator: MutationKeyGenerator = () => ['debts', 'delete'];

client.registerEndpoint<RequestData, void>(keyGenerator, {
  url: (data) => `/api/debts/${data.id}`,
  method: 'DELETE',
  type: 'mutation',
  omitFromBody: ['id'],
});

export { keyGenerator as deleteDebtKeyGenerator };
export type { RequestData as DeleteDebtRequestData };
