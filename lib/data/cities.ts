import { cache } from 'react';
import { and, asc, eq, or } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { branches, cities, faqs, states } from '@/lib/db/schema';

/** Everything the city and service templates need about one city. */
export const getCityBundle = cache(async (cityId: number) => {
  const db = await getDb();
  const [row] = await db
    .select({ city: cities, state: states, branch: branches })
    .from(cities)
    .innerJoin(states, eq(cities.stateId, states.id))
    .leftJoin(branches, eq(cities.branchId, branches.id))
    .where(eq(cities.id, cityId));
  if (!row) return null;
  const cityFaqs = await db
    .select()
    .from(faqs)
    .where(or(and(eq(faqs.scope, 'city'), eq(faqs.scopeId, cityId)), eq(faqs.scope, 'global')))
    .orderBy(asc(faqs.sort));
  return { ...row, faqs: cityFaqs };
});

/** A city by slug regardless of publication status — used by the migration review views. */
export const getCityIdBySlug = cache(async (slug: string) => {
  const db = await getDb();
  const [row] = await db.select({ id: cities.id }).from(cities).where(eq(cities.slug, slug));
  return row?.id ?? null;
});
