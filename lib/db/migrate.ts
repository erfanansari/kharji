import { config } from 'dotenv';
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function migrate() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!
  });

  try {
    console.log('Running database migration...');

    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');

    // Execute the entire schema at once
    await client.executeMultiple(schema);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.close();
  }
}

migrate();
