import { cache } from 'react';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { pages, serviceCategories, services } from '@/lib/db/schema';

/** The dispatcher's lookup: one row per legacy URL under /location/. */
export const resolvePage = cache(async (slug: string) => {
  const db = await getDb();
  const [row] = await db.select().from(pages).where(eq(pages.slug, slug));
  return row ?? null;
});

export const getServiceForPage = cache(async (serviceId: number) => {
  const db = await getDb();
  const [row] = await db
    .select({ service: services, category: serviceCategories })
    .from(services)
    .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
    .where(eq(services.id, serviceId));
  return row ?? null;
});

/** Published sibling service pages for a city (used for "more services" links and the card grid). */
export const getPublishedServiceSlugs = cache(async (cityId: number) => {
  const db = await getDb();
  const rows = await db
    .select({ slug: pages.slug, serviceId: pages.serviceId })
    .from(pages)
    .where(and(eq(pages.cityId, cityId), eq(pages.kind, 'service'), eq(pages.status, 'published')));
  return new Map(rows.map((r) => [r.serviceId!, r.slug]));
});
