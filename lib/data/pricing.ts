import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { prices, regions } from '@/lib/db/schema';

export type Prices = {
  sweep_inspection: number;
  inspection: number;
  gas_diagnostic: number;
  regionId: number;
  regionName: string;
  isDefault: boolean; // true → the national fallback was used (fails the Tier B distinctness gate)
};

export const getPrices = cache(async (regionId: number | null): Promise<Prices> => {
  const db = await getDb();
  const region = regionId
    ? (await db.select().from(regions).where(eq(regions.id, regionId)))[0]
    : undefined;
  const chosen = region ?? (await db.select().from(regions).where(eq(regions.isDefault, true)))[0];
  if (!chosen) throw new Error('No pricing region configured');
  const rows = await db.select().from(prices).where(eq(prices.regionId, chosen.id));
  const byKey = Object.fromEntries(rows.map((r) => [r.serviceKey, r.amountCents]));
  return {
    sweep_inspection: byKey.sweep_inspection ?? 0,
    inspection: byKey.inspection ?? 0,
    gas_diagnostic: byKey.gas_diagnostic ?? 0,
    regionId: chosen.id,
    regionName: chosen.name,
    isDefault: chosen.isDefault,
  };
});
