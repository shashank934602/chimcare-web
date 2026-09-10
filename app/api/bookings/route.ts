import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { bookings } from '@/lib/db/schema';
import { getBookingAdapter } from '@/lib/booking/adapter';
import { validateBooking } from '@/lib/booking/validate';

export const dynamic = 'force-dynamic';

function reference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `CHM-${s}`;
}

/** POST /api/bookings — validate → store → hand to the adapter (mock now, Workiz later). */
export async function POST(req: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, errors: { form: 'Invalid request.' } }, { status: 400 });
  }
  const { errors, value } = validateBooking(raw);
  if (!value) return NextResponse.json({ ok: false, errors }, { status: 422 });

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
    const { eq } = await import('drizzle-orm');
    await db.update(bookings).set({ status, externalId: result.externalId }).where(eq(bookings.id, row.id));
  } catch (e) {
    console.error('[booking] adapter failed', e);
    const { eq } = await import('drizzle-orm');
    await db.update(bookings).set({ status: 'failed' }).where(eq(bookings.id, row.id));
    status = 'failed';
  }
  return NextResponse.json({ ok: true, reference: ref, status }, { status: 201 });
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
