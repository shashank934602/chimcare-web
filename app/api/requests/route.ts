import { NextResponse } from 'next/server';
import { getBookingAdapter } from '@/lib/booking/adapter';
import { classifyZip } from '@/lib/content/coverage';
import { insertBooking, markBookingSynced } from '@/lib/data/bookings';
import { insertLead } from '@/lib/data/leads';
import { reference } from '@/lib/reference';
import { validateRequest } from '@/lib/requests/validate';

export const dynamic = 'force-dynamic';

/**
 * POST /api/requests — the ZIP popup's single submit.
 *
 * One form, one endpoint, one response shape. The visitor is never told which branch they took and
 * the client never chooses it: the ZIP is classified here (lib/content/coverage.ts) and that alone
 * decides where the row lands.
 *
 *   not a US ZIP  → 422 on the `zip` field. Nothing stored: an unreal place is neither a job nor a
 *                   lead anyone can sell.
 *   served        → site.bookings, `source: 'request'`, no slot, handed to the booking adapter.
 *   not served    → site.leads, never the adapter.
 *
 * The reply says only `{ ok, reference }`. It deliberately does not leak `served`, so nothing a
 * visitor can read — or a competitor can probe — reveals the coverage map.
 */
export async function POST(req: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, errors: { form: 'Invalid request.' } }, { status: 400 });
  }
  const { errors, value } = validateRequest(raw);
  if (!value) return NextResponse.json({ ok: false, errors }, { status: 422 });

  const coverage = await classifyZip(value.zip);
  if (!coverage.usZip) {
    return NextResponse.json(
      { ok: false, errors: { zip: 'Enter a valid US ZIP code. We serve the United States only.' } },
      { status: 422 },
    );
  }

  const sourceUrl = value.sourceUrl ?? req.headers.get('referer') ?? undefined;

  if (!coverage.served) {
    const lead = await insertLead({ ...value, sourceUrl }, coverage);
    return NextResponse.json({ ok: true, reference: lead.reference }, { status: 201 });
  }

  const adapter = getBookingAdapter();
  const ref = reference();
  const row = await insertBooking({
    reference: ref,
    adapter: adapter.name,
    source: 'request', // no slot was asked for; someone calls back to schedule it
    serviceKey: value.service ?? 'quote',
    serviceLabel: value.serviceLabel ?? 'Service request',
    preferredDate: null,
    timeWindow: null,
    name: value.name,
    phone: value.phone,
    email: value.email,
    zip: value.zip,
    notes: value.message ?? null,
    pageSlug: value.pageSlug ?? null,
    pageKind: value.pageKind ?? null,
    stateCode: coverage.lookup.match === 'city' ? coverage.lookup.stateCode : null,
    cityName: coverage.lookup.match === 'city' ? coverage.lookup.cityName : null,
    sourceUrl: sourceUrl ?? null,
  });

  // Inline here as in /api/bookings; in production this hop is the BullMQ worker with retries.
  try {
    const result = await adapter.createBooking({
      service: value.service ?? 'quote',
      serviceLabel: value.serviceLabel ?? 'Service request',
      name: value.name,
      phone: value.phone,
      email: value.email,
      zip: value.zip,
      notes: value.message,
      context: { pageSlug: value.pageSlug ?? '/', pageKind: 'hub', label: 'Chimcare' },
      reference: ref,
    });
    await markBookingSynced(row.id, result.status, result.externalId);
  } catch (e) {
    console.error('[request] adapter failed', e);
    await markBookingSynced(row.id, 'failed', null);
  }
  return NextResponse.json({ ok: true, reference: ref }, { status: 201 });
}
