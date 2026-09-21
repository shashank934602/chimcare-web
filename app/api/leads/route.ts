import { NextResponse } from 'next/server';
import { classifyZip } from '@/lib/content/coverage';
import { insertLead, listLeads } from '@/lib/data/leads';
import { validateLead } from '@/lib/leads/validate';

export const dynamic = 'force-dynamic';

/**
 * POST /api/leads — a service request from outside the service area.
 *
 * The ZIP is re-classified here, server-side. The client is told nothing it can use to choose its
 * own table: if this ZIP turns out to be one we serve (the visitor edited it after the hero checked,
 * or someone posted straight to this endpoint), no lead is written and the response says so, so the
 * caller can send them to booking instead of quietly selling a real customer to a competitor.
 */
export async function POST(req: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, errors: { form: 'Invalid request.' } }, { status: 400 });
  }
  const { errors, value } = validateLead(raw);
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
  if (coverage.served) {
    // Not an error, and not a lead: we cover this ZIP after all. The caller keeps what the visitor
    // typed and opens the booking sheet — nothing is lost and nothing is re-keyed.
    const href = coverage.lookup.match === 'none' ? null : coverage.lookup.href;
    return NextResponse.json({ ok: true, served: true, href }, { status: 200 });
  }

  const lead = await insertLead(
    { ...value, sourceUrl: value.sourceUrl ?? req.headers.get('referer') ?? undefined },
    coverage,
  );
  return NextResponse.json({ ok: true, served: false, reference: lead.reference }, { status: 201 });
}

/** GET /api/leads — the last 100 leads. Open in development; needs ADMIN_TOKEN in production. */
export async function GET(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (process.env.NODE_ENV === 'production' && (!token || new URL(req.url).searchParams.get('token') !== token)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  return NextResponse.json({ ok: true, leads: await listLeads() });
}
