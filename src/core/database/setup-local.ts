/* eslint-disable no-console */
// One-command local database: `pnpm db:setup`.
//
// The numbered migrations describe how the *production* database evolved, and
// several of them assume state that only ever existed there — 002 adds columns
// to tables created before migrations were tracked, 005 copies out of `*_old`
// tables left behind by a half-applied run. So `pnpm migrate` cannot build a
// database from nothing, which left a new contributor with no way to run the
// app without a Turso account and a copy of the schema.
//
// This script recreates that pre-migration starting point, then replays every
// migration in order and records it in `_migrations`, so the result is the same
// schema production has and `pnpm migrate` keeps working on it afterwards.
//
// It only ever touches a local SQLite file (TURSO_DATABASE_URL=file:...), and
// refuses to run against anything else.
import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

config({ path: '.env.local' });

// The tables that existed before migration tracking began.
const PRE_MIGRATION_SCHEMA = `
  CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    price_toman REAL NOT NULL,
    price_usd REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE expense_tags (
    expense_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (expense_id, tag_id),
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
`;

// State a migration expects to find that no earlier migration leaves behind.
const BEFORE: Record<string, string> = {
  // 005 was written to resume a partial run that had already renamed these.
  '005_simplify_schema.sql': `
    ALTER TABLE incomes RENAME TO incomes_old;
    ALTER TABLE assets RENAME TO assets_old;
    ALTER TABLE asset_types RENAME TO asset_types_old;
    ALTER TABLE asset_valuations RENAME TO asset_valuations_old;
  `,
};

async function setupLocal() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url?.startsWith('file:')) {
    console.error('db:setup only builds a local SQLite database.');
    console.error('Set TURSO_DATABASE_URL=file:./local.db in .env.local and run it again.');
    process.exit(1);
  }

  const client = createClient({ url });

  try {
    const existing = await client.execute(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'expenses'`);
    if (existing.rows.length > 0) {
      console.log('This database already has tables — run `pnpm migrate` to bring it up to date.');
      return;
    }

    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      ${PRE_MIGRATION_SCHEMA}
    `);

    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (BEFORE[file]) await client.executeMultiple(BEFORE[file]);
      await client.executeMultiple(readFileSync(join(migrationsDir, file), 'utf-8'));
      await client.execute({ sql: 'INSERT INTO _migrations (name) VALUES (?)', args: [file] });
    }

    console.log(`Local database ready at ${url} (${files.length} migrations applied).`);
    console.log('Next: `pnpm db:seed-demo` for sample data, then `pnpm dev`.');
  } finally {
    client.close();
  }
}

setupLocal().catch((error) => {
  console.error('Local database setup failed:', error);
  process.exit(1);
});
