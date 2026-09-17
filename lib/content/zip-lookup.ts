import { getMigratedStates } from '@/lib/data/migrated-locations';

export type ZipLookupResult =
  | { match: 'city'; cityName: string; stateCode: string; href: string; addressLine: string | null }
  | { match: 'state'; stateName: string; href: string }
  | { match: 'none' };

/**
 * USPS ZIP3-prefix ranges for the states this deployment actually serves — real, long-standing postal
 * allocation (not derived from our own data), used only as a coarse "we operate in your state"
 * fallback when no exact city address matches. It never invents a specific city or address; the
 * message it backs only ever claims the state, and links to that state's real hub page.
 */
const STATE_ZIP3_RANGES: Record<string, Array<[number, number]>> = {
  MA: [[10, 27], [55, 55]],
  AZ: [[850, 865]],
  IL: [[600, 629]],
  MN: [[550, 567]],
  OH: [[430, 459]],
  GA: [[300, 319], [398, 399]],
  WI: [[530, 549]],
};

function zip3InState(zip3: number, stateCode: string): boolean {
  const ranges = STATE_ZIP3_RANGES[stateCode];
  return ranges?.some(([lo, hi]) => zip3 >= lo && zip3 <= hi) ?? false;
}

/** Pulls the 5-digit ZIP out of the "Town, ST ZIP" address line — the format splitAddress()
 * (lib/data/migrated-locations.ts) produces. Coverage cities carry no address and are skipped. */
function zipFromAddressLines(lines: string[]): string | null {
  const last = lines[lines.length - 1];
  return last?.match(/\b(\d{5})\b/)?.[1] ?? null;
}

/** Most migrated cities carry no street address (only branch cities do) — "Brookline" or "44 more
 * cities" of a coverage page has just a name. `St`/`Saint`, `Ft`/`Fort` and stray punctuation are the
 * only variants actually seen between the two naming sources this compares (ours vs. the ZIP
 * directory below), so this is a normalizer for those, not a general fuzzy match. */
function normalizeCityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.’']/g, '')
    .replace(/\bst\b\.?/g, 'saint')
    .replace(/\bft\b\.?/g, 'fort')
    .replace(/\s+/g, ' ')
    .trim();
}

const resolvedZipCache = new Map<string, { city: string; stateCode: string } | null>();

/** Resolves a ZIP to a city/state via Zippopotam.us — a free, keyless, public ZIP directory — used
 * only to find which of OUR OWN real pages a ZIP falls in when we hold no street address for it
 * ourselves. This never asserts a city on its own; the result still has to match one of our real
 * migrated cities (below) before it's shown as a city match. */
async function resolveZipCity(zip: string): Promise<{ city: string; stateCode: string } | null> {
  if (resolvedZipCache.has(zip)) return resolvedZipCache.get(zip) ?? null;
  let result: { city: string; stateCode: string } | null = null;
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = (await res.json()) as { places?: Array<{ 'place name': string; 'state abbreviation': string }> };
      const place = data.places?.[0];
      if (place) result = { city: place['place name'], stateCode: place['state abbreviation'] };
    }
  } catch {
    result = null;
  }
  resolvedZipCache.set(zip, result);
  return result;
}

/** Matches a 5-digit ZIP to the nearest real page this site can send a visitor to:
 *   1. An exact branch address carrying that ZIP (most precise — comes with a real street address).
 *   2. Otherwise, the ZIP directory's city/state for that ZIP, matched by name against our own real
 *      migrated cities — catches the hundreds of coverage-city pages that have no address on file.
 *   3. Otherwise, the state hub, when the directory confirms a state we serve but not that exact city.
 *   4. If the directory itself is unreachable, the coarse ZIP3 postal range as a last resort.
 * Never a fabricated "we serve you" for a ZIP outside every state this deployment actually covers. */
export async function lookupZip(zip: string): Promise<ZipLookupResult> {
  const states = getMigratedStates();

  for (const state of states) {
    for (const city of state.cities) {
      if (zipFromAddressLines(city.addressLines) === zip) {
        return { match: 'city', cityName: city.name, stateCode: state.code, href: city.href, addressLine: city.addressLines[0] ?? null };
      }
    }
  }

  const resolved = await resolveZipCity(zip);
  if (resolved) {
    const state = states.find((s) => s.code === resolved.stateCode);
    if (!state) return { match: 'none' };
    const city = state.cities.find((c) => normalizeCityName(c.name) === normalizeCityName(resolved.city));
    if (city) {
      return { match: 'city', cityName: city.name, stateCode: state.code, href: city.href, addressLine: zipFromAddressLines(city.addressLines) ? (city.addressLines[0] ?? null) : null };
    }
    return { match: 'state', stateName: state.name, href: `/locations/${state.slug}/` };
  }

  const zip3 = Number(zip.slice(0, 3));
  for (const state of states) {
    if (zip3InState(zip3, state.code)) {
      return { match: 'state', stateName: state.name, href: `/locations/${state.slug}/` };
    }
  }

  return { match: 'none' };
}
