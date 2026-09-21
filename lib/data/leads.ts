import { desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { leads, type Lead, type NewLead } from '@/lib/db/schema';
import { reference } from '@/lib/reference';
import type { LeadSubmission } from '@/lib/leads/validate';
import type { Coverage } from '@/lib/content/coverage';

/**
 * Stores an out-of-area request. The only place leads are written.
 *
 * `coverage` must be the server's own classification — never a claim from the request body, or a
 * crafted POST could file a real customer as a sellable lead, or the reverse.
 */
export async function insertLead(
  input: LeadSubmission,
  coverage: Coverage,
  opts: { divertedFromBooking?: boolean } = {},
): Promise<Lead> {
  const row: NewLead = {
    reference: reference('CHM-L'),
    name: input.name,
    phone: input.phone,
    email: input.email,
    zip: input.zip,
    zipCity: coverage.zipCity ?? null,
    zipState: coverage.zipState ?? null,
    serviceKey: input.service ?? null,
    serviceLabel: input.serviceLabel ?? null,
    message: input.message ?? null,
    pageSlug: input.pageSlug ?? null,
    pageKind: input.pageKind ?? null,
    sourceUrl: input.sourceUrl ?? null,
    divertedFromBooking: opts.divertedFromBooking ?? false,
  };
  const db = await getDb();
  const [saved] = await db.insert(leads).values(row).returning();
  return saved;
}

export async function listLeads(limit = 100): Promise<Lead[]> {
  const db = await getDb();
  return db.select().from(leads).orderBy(desc(leads.id)).limit(limit);
}
