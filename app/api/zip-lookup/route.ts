import { NextResponse } from 'next/server';
import { lookupZip } from '@/lib/content/zip-lookup';

export const dynamic = 'force-dynamic';

/** GET /api/zip-lookup?zip=55124 — the hero "Check My Area" card's own lookup, matched against the
 * real migrated location data (lib/data/migrated-locations.ts), same as the location hubs. */
export async function GET(req: Request) {
  const zip = new URL(req.url).searchParams.get('zip') ?? '';
  if (!/^\d{5}$/.test(zip)) {
    return NextResponse.json({ match: 'none' }, { status: 400 });
  }
  return NextResponse.json(await lookupZip(zip));
}
