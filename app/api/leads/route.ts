import { NextResponse } from 'next/server';
import { listLeads } from '@/lib/data/leads';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leads — the last 100 out-of-area leads, for /admin/leads.
 * Read-only: submissions come in through POST /api/requests, which decides the table.
 * Open in development; needs ADMIN_TOKEN in production.
 */
export async function GET(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (process.env.NODE_ENV === 'production' && (!token || new URL(req.url).searchParams.get('token') !== token)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  return NextResponse.json({ ok: true, leads: await listLeads() });
}
