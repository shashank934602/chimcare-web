import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { bookings } from '@/lib/db/schema';
import { getBookingAdapter } from '@/lib/booking/adapter';
import { validateBooking } from '@/lib/booking/validate';
import { classifyZip } from '@/lib/content/coverage';
import { insertLead } from '@/lib/data/leads';
import { reference } from '@/lib/reference';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings — validate → classify the ZIP → store → hand to the adapter (mock now, Workiz later).
 *
 * The classification is the fork. A request from a ZIP we do not serve is never a booking: it is
 * written to site.leads instead, the adapter is never called, and no job is created for work nobody
 * will do. That decision is made here from the ZIP alone (lib/content/coverage.ts), never from
 * anything the client sent — the front end normally routes out-of-area requests to /api/leads, and
 * this is the backstop for when it does not.
 */
export async function POST(req: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, errors: { form: 'Invalid request.' } }, { status: 400 });
  }
  const { errors, value } = validateBooking(raw);
  if (!value) return NextResponse.json({ ok: false, errors }, { status: 422 });

  const coverage = await classifyZip(value.zip);
  // Not a US ZIP at all. Nothing is stored: an unreal place is not a lead anyone can sell, and it
  // is not a job anyone can do. Returned as a field error so the form can point at the ZIP box.
  if (!coverage.usZip) {
    return NextResponse.json(
      { ok: false, errors: { zip: 'Enter a valid US ZIP code. We serve the United States only.' } },
      { status: 422 },
    );
  }
  if (!coverage.served) {
    const lead = await insertLead(
      {
        name: value.name,
        phone: value.phone,
        email: value.email,
        zip: value.zip,
        service: value.service,
        serviceLabel: value.serviceLabel,
        message: value.notes,
        pageSlug: value.context.pageSlug,
        pageKind: value.context.pageKind,
        sourceUrl: value.sourceUrl ?? req.headers.get('referer') ?? undefined,
      },
      coverage,
      { divertedFromBooking: true },
    );
    return NextResponse.json({ ok: true, served: false, reference: lead.reference, status: 'received' }, { status: 201 });
  }

  const db = await getDb();
  const adapter = getBookingAdapter();
  const ref = reference();
  const [row] = await db
    .insert(bookings)
    .values({
      reference: ref,
      adapter: adapter.name,
      serviceKey: value.service,
      serviceLabel: value.serviceLabel,
      preferredDate: value.date,
      timeWindow: value.timeWindow,
      name: value.name,
      phone: value.phone,
      email: value.email,
      zip: value.zip,
      address: value.address ?? null,
      notes: value.notes ?? null,
      pageSlug: value.context.pageSlug,
      pageKind: value.context.pageKind,
      stateCode: value.context.stateCode ?? null,
      cityId: value.context.cityId ?? null,
      cityName: value.context.cityName ?? null,
      branchId: value.context.branchId ?? null,
      serviceId: value.context.serviceId ?? null,
      sourceUrl: value.sourceUrl ?? req.headers.get('referer'),
    })
    .returning();

  // In production this hop runs in the BullMQ worker with retries; inline here so the slice has no queue dependency.
  let status = 'received';
  try {
    const result = await adapter.createBooking({ ...value, reference: ref });
    status = result.status;
    await db.update(bookings).set({ status, externalId: result.externalId }).where(eq(bookings.id, row.id));
  } catch (e) {
    console.error('[booking] adapter failed', e);
    await db.update(bookings).set({ status: 'failed' }).where(eq(bookings.id, row.id));
    status = 'failed';
  }
  return NextResponse.json({ ok: true, served: true, reference: ref, status }, { status: 201 });
}

/** GET /api/bookings — the last 50 bookings. Open in development; needs ADMIN_TOKEN in production. */
export async function GET(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (process.env.NODE_ENV === 'production' && (!token || new URL(req.url).searchParams.get('token') !== token)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const db = await getDb();
  const rows = await db.select().from(bookings).orderBy(desc(bookings.id)).limit(50);
  return NextResponse.json({ ok: true, bookings: rows });
}
