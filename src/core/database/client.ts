import { databaseConfig } from '@configs/database.config';
import { createClient } from '@libsql/client';

// A local SQLite file (`file:./local.db`, see `pnpm db:setup`) needs no token.
const isLocalFile = databaseConfig.url?.startsWith('file:') ?? false;

if (!databaseConfig.url || (!isLocalFile && !databaseConfig.authToken)) {
  throw new Error('Missing Turso environment variables');
}

export const db = createClient({
  url: databaseConfig.url,
  authToken: databaseConfig.authToken,
});
