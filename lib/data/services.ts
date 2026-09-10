import { cache } from 'react';
import { asc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { serviceCategories, services, type Service, type ServiceCategory } from '@/lib/db/schema';

export type Catalog = { categories: ServiceCategory[]; services: Service[] };

export const getCatalog = cache(async (): Promise<Catalog> => {
  const db = await getDb();
  const [categories, rows] = await Promise.all([
    db.select().from(serviceCategories).orderBy(asc(serviceCategories.sort)),
    db.select().from(services).orderBy(asc(services.sort)),
  ]);
  return { categories, services: rows };
});
