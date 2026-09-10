=== schema.ts (     263 lines) ===
11:  pgEnum,
12:  pgSchema,
18:export const site = pgSchema('site');
=== client.ts ===
// One Drizzle handle for the whole process.
//
//   DATABASE_URL set   → Supabase Postgres through the pooler (transaction mode → prepare:false).
//   DATABASE_URL unset → embedded PGlite (Postgres compiled to WASM), migrated and seeded on first use.
//
// Both run the same schema, the same migrations and the same queries, so switching is a config change.

import path from 'node:path';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS_FOLDER = path.join(process.cwd(), 'lib', 'db', 'migrations');

declare global {
  // Survives Next.js dev-server module reloads so PGlite is only instantiated once per process.
  var __chimcareDb: Promise<Db> | undefined;
}

export function getDb(): Promise<Db> {
  if (!globalThis.__chimcareDb) globalThis.__chimcareDb = open();
  return globalThis.__chimcareDb;
}

async function open(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    const client = postgres(url, { prepare: false, max: 10 });
    return drizzle(client, { schema }) as unknown as Db;
  }

  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const dataDir = process.env.PGLITE_DATA_DIR;
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle(client, { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: MIGRATIONS_FOLDER });
  const { seedIfEmpty } = await import('./seed');
  await seedIfEmpty(db);
  return db;
}