// Migrates and seeds the configured database.
//   npm run seed            → seed if empty
//   npm run seed -- --reset → truncate and reseed
// With DATABASE_URL unset this targets the embedded PGlite database (PGLITE_DATA_DIR for persistence).

import path from 'node:path';
import { getDb } from '../lib/db/client';
import { reset, seed, seedIfEmpty } from '../lib/db/seed';

async function main() {
  const db = await getDb();
  if (process.env.DATABASE_URL) {
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    await migrate(db as never, { migrationsFolder: path.join(process.cwd(), 'lib', 'db', 'migrations') });
  }
  if (process.argv.includes('--reset')) {
    await reset(db);
    await seed(db);
    console.log('reset + seeded');
  } else {
    await seedIfEmpty(db);
    console.log('seeded (if empty)');
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
