import { cache } from 'react';
import { getDb } from '@/lib/db/client';
import { masters } from '@/lib/db/schema';

export const getMasters = cache(async (): Promise<Record<string, unknown>> => {
  const db = await getDb();
  const rows = await db.select().from(masters);
  return Object.fromEntries(rows.map((r) => [r.key, r.body]));
});
