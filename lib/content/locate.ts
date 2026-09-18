/**
 * Finds the visitor's ZIP for the homepage "Check My Area" card, two ways:
 *
 *   - `zipFromHeaders`: from the connection. Vercel's edge adds the visitor's approximate postal code, city
 *     and region to every request (`x-vercel-ip-*`). No permission prompt, so the card can fill the ZIP in
 *     on load; it is only a guess and the card says so.
 *   - `zipFromCoords`: from the device's own position (the browser's geolocation, after the visitor asks),
 *     reverse-geocoded through OpenStreetMap's Nominatim, the same service scripts/build-mn-seed.mjs uses.
 *
 * Either way the answer is only a ZIP. Whether Chimcare serves it is still decided by lookupZip
 * (lib/content/zip-lookup.ts), exactly as for a typed ZIP.
 */

export type LocateResult =
  | { ok: true; zip: string; city: string | null; stateCode: string | null; source: 'ip' | 'gps' }
  | { ok: false; error: 'unknown' | 'outside-us' | 'not-found' | 'lookup-failed' };

const ZIP = /^\d{5}$/;

function header(headers: Headers, name: string): string | null {
  const v = headers.get(name);
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export function zipFromHeaders(headers: Headers): LocateResult {
  const country = header(headers, 'x-vercel-ip-country');
  const zip = header(headers, 'x-vercel-ip-postal-code')?.slice(0, 5) ?? null;
  if (!country || !zip) return { ok: false, error: 'unknown' };
  if (country !== 'US') return { ok: false, error: 'outside-us' };
  if (!ZIP.test(zip)) return { ok: false, error: 'unknown' };
  return { ok: true, zip, city: header(headers, 'x-vercel-ip-city'), stateCode: header(headers, 'x-vercel-ip-country-region'), source: 'ip' };
}

type NominatimReverse = {
  error?: string;
  address?: { postcode?: string; country_code?: string; city?: string; town?: string; village?: string; hamlet?: string; 'ISO3166-2-lvl4'?: string };
};

// A visitor who taps twice, or several on one block, costs one request. Keys are ~100 m cells.
const coordsCache = new Map<string, LocateResult>();

export async function zipFromCoords(lat: number, lng: number): Promise<LocateResult> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = coordsCache.get(key);
  if (cached) return cached;
  let result: LocateResult;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'chimcare-web (https://www.chimcare.com)', 'Accept-Language': 'en-US' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { ok: false, error: 'lookup-failed' }; // not cached: may work next time
    const data = (await res.json()) as NominatimReverse;
    const a = data.address;
    if (!a || data.error) result = { ok: false, error: 'not-found' };
    else if (a.country_code !== 'us') result = { ok: false, error: 'outside-us' };
    else {
      const zip = a.postcode?.match(/\d{5}/)?.[0];
      result = zip
        ? { ok: true, zip, city: a.city ?? a.town ?? a.village ?? a.hamlet ?? null, stateCode: a['ISO3166-2-lvl4']?.replace(/^US-/, '') ?? null, source: 'gps' }
        : { ok: false, error: 'not-found' };
    }
  } catch {
    return { ok: false, error: 'lookup-failed' };
  }
  if (coordsCache.size > 5000) coordsCache.clear();
  coordsCache.set(key, result);
  return result;
}
