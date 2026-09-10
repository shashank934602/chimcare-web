// Loads the Minnesota dataset (data/seed/minnesota.ts, built from the real sources by
// scripts/build-mn-seed.mjs). Idempotent: `seedIfEmpty` only runs when site.states is empty;
// `seed` (used by scripts/seed.ts --reset) truncates first.
//
// In production this file is replaced by scripts/seed from the extraction DB (mig.*) — see architecture §6.

import { count, sql } from 'drizzle-orm';
import type { Db } from './client';
import * as t from './schema';
import { stateSeed, regionSeed, branchSeed, citySeed, pageSeed } from '@/data/seed/minnesota';
import { serviceCategorySeed, serviceSeed } from '@/data/seed/services';
import { masterSeed } from '@/data/seed/masters';

const LEGACY_ORIGIN = 'https://www.chimcare.com';
const BATCH = 500;

export async function seedIfEmpty(db: Db) {
  const [{ n }] = await db.select({ n: count() }).from(t.states);
  if (Number(n) === 0) await seed(db);
}

export async function reset(db: Db) {
  await db.execute(sql`
    TRUNCATE site.pages, site.faqs, site.prices, site.services, site.service_categories,
             site.cities, site.branches, site.regions, site.states, site.masters
    RESTART IDENTITY CASCADE`);
}

export async function seed(db: Db) {
  // --- state ---------------------------------------------------------------------------------
  const [state] = await db.insert(t.states).values(stateSeed).returning();

  // --- regions + prices ----------------------------------------------------------------------
  const regionIds = new Map<string, number>();
  for (const r of regionSeed) {
    const [row] = await db.insert(t.regions).values({ name: r.name, isDefault: r.isDefault }).returning();
    regionIds.set(r.key, row.id);
    await db.insert(t.prices).values(
      Object.entries(r.prices).map(([serviceKey, amountCents]) => ({ regionId: row.id, serviceKey, amountCents })),
    );
  }

  // --- branches ------------------------------------------------------------------------------
  const branchIds = new Map<string, number>();
  for (const { region, ...b } of branchSeed) {
    const [row] = await db
      .insert(t.branches)
      .values({ ...b, stateId: state.id, regionId: regionIds.get(region)! })
      .returning();
    branchIds.set(b.slug, row.id);
  }

  // --- cities + city-scoped FAQs -------------------------------------------------------------
  const cityIds = new Map<string, number>();
  for (const c of citySeed) {
    const [row] = await db
      .insert(t.cities)
      .values({
        slug: c.slug,
        name: c.name,
        stateId: state.id,
        kind: c.kind,
        branchId: c.branch ? branchIds.get(c.branch) ?? null : null,
        regionId: regionIds.get(c.region)!,
        lat: c.lat,
        lng: c.lng,
        neighborhoods: c.neighborhoods,
        localSpecifics: c.localSpecifics,
        heroImageKey: c.heroImageKey,
        heroImageAlt: c.heroImageAlt,
        tier: c.tier,
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription,
        legacyPostId: c.legacyPostId,
        sourceStatus: c.sourceStatus,
        reviewFlags: c.reviewFlags,
        legacyPricingCopy: c.legacyPricingCopy,
        legacyThumbnailId: c.legacyThumbnailId,
      })
      .returning();
    cityIds.set(c.slug, row.id);
    if (c.faqs.length) {
      await db.insert(t.faqs).values(c.faqs.map((f, i) => ({ scope: 'city' as const, scopeId: row.id, question: f.question, answer: f.answer, sort: i })));
    }
  }

  // --- service catalogue ---------------------------------------------------------------------
  const categoryIds = new Map<string, number>();
  for (const c of serviceCategorySeed) {
    const [row] = await db.insert(t.serviceCategories).values(c).returning();
    categoryIds.set(c.key, row.id);
  }
  const serviceRows = await db
    .insert(t.services)
    .values(
      serviceSeed.map((s) => ({
        key: s.key,
        name: s.name,
        categoryId: categoryIds.get(s.category)!,
        sort: s.sort,
        nameTemplate: '{{service.name}} in {{city.name}}, {{state.code}}',
        cardCopyTemplate: s.cardCopyTemplate,
      })),
    )
    .returning();
  const serviceIds = new Map(serviceRows.map((s) => [s.key, s.id]));

  // --- masters -------------------------------------------------------------------------------
  await db.insert(t.masters).values(Object.entries(masterSeed).map(([key, body]) => ({ key, body })));

  // --- pages: one row per legacy URL under /location/ ----------------------------------------
  const now = new Date();
  const pageRows: t.NewPage[] = pageSeed.map((p) => ({
    kind: p.kind,
    slug: p.slug,
    cityId: p.city ? cityIds.get(p.city) ?? null : null,
    serviceId: p.service ? serviceIds.get(p.service) ?? null : null,
    tier: p.tier,
    fate: p.fate,
    status: p.status,
    redirectTo: p.redirectTo,
    legacyPostId: p.legacyPostId,
    legacyUrl: `${LEGACY_ORIGIN}/location/${p.slug}/`,
    gscClicks12m: p.gscClicks,
    publishedAt: p.status === 'published' ? now : null,
  }));
  for (let i = 0; i < pageRows.length; i += BATCH) await db.insert(t.pages).values(pageRows.slice(i, i + BATCH));
}
