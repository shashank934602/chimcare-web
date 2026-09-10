import { cache } from 'react';
import { asc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { branches, cities, pages, states, type Branch, type City } from '@/lib/db/schema';
import { resolveCityCard, slugOf, type CardResolution, type ResolvablePage } from '@/lib/migration/card-resolution';

export const getStates = cache(async () => {
  const db = await getDb();
  return db.select().from(states).orderBy(asc(states.sort), asc(states.name));
});

export const getStateBySlug = cache(async (slug: string) => {
  const db = await getDb();
  const [row] = await db.select().from(states).where(eq(states.slug, slug));
  return row ?? null;
});

export type CityListing = { city: City; branch: Branch | null; published: boolean };

/** Cities in a state with their serving branch and whether their city page is published. */
export const getCitiesForState = cache(async (stateId: number): Promise<CityListing[]> => {
  const db = await getDb();
  const rows = await db
    .select({ city: cities, branch: branches, status: pages.status })
    .from(cities)
    .leftJoin(branches, eq(cities.branchId, branches.id))
    .leftJoin(pages, eq(pages.slug, cities.slug))
    .where(eq(cities.stateId, stateId))
    .orderBy(asc(cities.name));
  return rows.map((r) => ({ city: r.city, branch: r.branch, published: r.status === 'published' }));
});

export const getBranchesForState = cache(async (stateId: number) => {
  const db = await getDb();
  return db.select().from(branches).where(eq(branches.stateId, stateId)).orderBy(asc(branches.name));
});

// ---- card link resolution --------------------------------------------------------------------


export type ResolvedCityListing = CityListing & { resolution: CardResolution };

/**
 * Every city in a state with its card destination already resolved.
 *
 * The page rows are loaded by slug in two passes — the cities' own pages, then whatever those
 * redirect to — so a redirect target in another state is still fetched and can be REFUSED by the
 * cross-state guard rather than silently linked.
 */
export const getResolvedCitiesForState = cache(async (stateId: number, stateCode: string): Promise<ResolvedCityListing[]> => {
  const db = await getDb();
  const listings = await getCitiesForState(stateId);

  const index = new Map<string, ResolvablePage>();
  const loadSlugs = async (slugs: string[]) => {
    const want = slugs.filter((s) => s && !index.has(s));
    if (!want.length) return [] as ResolvablePage[];
    const rows = await db
      .select({ page: pages, cityName: cities.name, stateCode: states.code })
      .from(pages)
      .leftJoin(cities, eq(pages.cityId, cities.id))
      .leftJoin(states, eq(cities.stateId, states.id))
      .where(inArray(pages.slug, want));
    const loaded = rows.map((r) => ({
      slug: r.page.slug,
      status: r.page.status,
      fate: r.page.fate,
      redirectTo: r.page.redirectTo,
      stateCode: r.stateCode ?? null,
      cityName: r.cityName ?? null,
      legacyPostId: r.page.legacyPostId,
      legacyUrl: r.page.legacyUrl,
    }));
    for (const p of loaded) index.set(p.slug, p);
    return loaded;
  };

  let frontier = await loadSlugs(listings.map((l) => l.city.slug));
  for (let depth = 0; depth < 10 && frontier.length; depth++) {
    const next = frontier.filter((p) => p.fate === 'redirect' && p.redirectTo).map((p) => slugOf(p.redirectTo!));
    if (!next.length) break;
    frontier = await loadSlugs(next);
  }

  return listings.map((l) => ({
    ...l,
    resolution: resolveCityCard(
      { name: l.city.name, slug: l.city.slug, stateCode, sourceStatus: l.city.sourceStatus },
      (slug) => index.get(slug) ?? null,
    ),
  }));
});
