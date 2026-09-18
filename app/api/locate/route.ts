import { NextResponse } from 'next/server';
import { zipFromCoords, zipFromHeaders } from '@/lib/content/locate';

export const dynamic = 'force-dynamic';

/**
 * GET /api/locate               → the visitor's approximate ZIP from their connection (no prompt)
 * GET /api/locate?lat=..&lng=.. → the ZIP at the device's own position (after the browser's prompt)
 *
 * Always 200 with `{ ok: true, zip, … }` or `{ ok: false, error }`, except 400 for malformed coordinates.
 * The homepage "Check My Area" card (components/islands/HomeBehaviour.tsx) turns each error into a line
 * the visitor can act on. See lib/content/locate.ts.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const noStore = { headers: { 'Cache-Control': 'private, no-store' } };
  if (!params.has('lat') && !params.has('lng')) {
    return NextResponse.json(zipFromHeaders(req.headers), noStore);
  }
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400, ...noStore });
  }
  return NextResponse.json(await zipFromCoords(lat, lng), noStore);
}
