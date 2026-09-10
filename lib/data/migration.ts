import { cache } from 'react';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { branches, cities, pages, states, type Branch, type City } from '@/lib/db/schema';

export type MigrationRow = { city: City; branch: Branch | null; pageSlug: string | null; pageStatus: string | null };

/**
 * Every migrated city with its serving branch and whether a page row exists for it. Ordered by
 * migration status so the rows needing review come first.
 */
export const getMigrationRows = cache(async (stateSlug: string): Promise<MigrationRow[]> => {
  const db = await getDb();
  const [state] = await db.select().from(states).where(eq(states.slug, stateSlug));
  if (!state) return [];
  const rows = await db
    .select({ city: cities, branch: branches, pageSlug: pages.slug, pageStatus: pages.status })
    .from(cities)
    .leftJoin(branches, eq(cities.branchId, branches.id))
    .leftJoin(pages, eq(pages.slug, cities.slug))
    .where(eq(cities.stateId, state.id))
    .orderBy(asc(cities.name));
  return rows.map((r) => ({ city: r.city, branch: r.branch, pageSlug: r.pageSlug, pageStatus: r.pageStatus }));
});
