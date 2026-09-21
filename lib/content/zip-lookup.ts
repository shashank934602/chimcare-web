import { getMigratedStates } from '@/lib/data/migrated-locations';

export type ZipLookupResult =
  | { match: 'city'; cityName: string; stateCode: string; href: string; addressLine: string | null }
  | { match: 'state'; stateName: string; href: string }
  // Not served. `zipCity`/`zipState` carry where the ZIP actually is when the directory could say —
  // a lead is worth more to a buyer with a town on it. Absent when the lookup was unreachable.
  //
  // `usZip` is the difference between "somewhere we don't cover" and "nowhere at all":
  //   false     the directory positively says no such US ZIP. Reject it.
  //   true      a real US ZIP, outside the service area. This is the saleable lead.
  //   undefined the directory never answered. Unproven, so treated as acceptable — an outage of
  //             ours must not turn a real visitor away.
  | { match: 'none'; usZip?: boolean; zipCity?: string; zipState?: string };

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
  CA: [[900, 961]],
  CO: [[800, 816]],
  CT: [[60, 69]],
  OR: [[970, 979]],
  WA: [[980, 994]],
  ID: [[832, 838]],
  IN: [[460, 479]],
  MI: [[480, 499]],
  PA: [[150, 196]],
  TN: [[370, 385]],
  UT: [[840, 847]],
  NH: [[30, 38]],
  RI: [[28, 29]],
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

/**
 * Three outcomes, and the difference between the last two matters:
 *   found       the directory knows this ZIP.
 *   not-found   the directory answered, and there is no such US ZIP. A real negative.
 *   unavailable the directory did not answer. Proves nothing either way.
 *
 * Collapsing `not-found` and `unavailable` into one null is what let `99999` through as a saleable
 * lead: both looked like "no answer", so both fell to the ZIP3 fallback and out the bottom as a
 * request from a place that does not exist.
 */
type ZipResolution =
  | { status: 'found'; city: string; stateCode: string }
  | { status: 'not-found' }
  | { status: 'unavailable' };

// Only real answers are cached. An outage must not pin a ZIP as unresolvable for the process's life.
/**
 * The ZIP directory flattens intercardinal names: it returns "Mcallen", not "McAllen". That string
 * is shown to the visitor ("we can help in Mcallen, TX") and stored on the lead a buyer reads, so
 * it is worth repairing — carefully.
 *
 * Only three rules, all safe: a letter after "Mc", after an apostrophe, and after a hyphen. "Mac"
 * is deliberately NOT handled — it would turn Macon into MacOn. Anything this cannot fix is left
 * exactly as the directory gave it rather than guessed at.
 */
function tidyPlaceName(name: string): string {
  return name
    .replace(/\bMc([a-z])/g, (_, c: string) => `Mc${c.toUpperCase()}`)
    .replace(/([A-Za-z])'([a-z])/g, (_, a: string, c: string) => `${a}'${c.toUpperCase()}`)
    .replace(/\b([A-Za-z]+)-([a-z])/g, (_, a: string, c: string) => `${a}-${c.toUpperCase()}`);
}

const resolvedZipCache = new Map<string, Exclude<ZipResolution, { status: 'unavailable' }>>();

/** Resolves a ZIP to a city/state via Zippopotam.us — a free, keyless, public ZIP directory — used
 * only to find which of OUR OWN real pages a ZIP falls in when we hold no street address for it
 * ourselves. This never asserts a city on its own; the result still has to match one of our real
 * migrated cities (below) before it's shown as a city match. The `/us/` endpoint is US-only by
 * construction, so a 404 here means "not a US ZIP", which is exactly the negative we need. */
async function resolveZipCity(zip: string): Promise<ZipResolution> {
  const cached = resolvedZipCache.get(zip);
  if (cached) return cached;
  let result: Exclude<ZipResolution, { status: 'unavailable' }>;
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal: AbortSignal.timeout(2500) });
    if (res.status === 404) {
      result = { status: 'not-found' };
    } else if (res.ok) {
      const data = (await res.json()) as { places?: Array<{ 'place name': string; 'state abbreviation': string }> };
      const place = data.places?.[0];
      // A 200 with no places is the directory failing to answer properly, not a real negative.
      if (!place) return { status: 'unavailable' };
      result = { status: 'found', city: place['place name'], stateCode: place['state abbreviation'] };
    } else {
      return { status: 'unavailable' }; // 5xx, rate limit: try again next time
    }
  } catch {
    return { status: 'unavailable' }; // timeout, DNS, offline
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
  // The directory says there is no such US ZIP. Say so, rather than treating it as a place we
  // simply don't cover: nothing downstream should accept it, least of all as a lead to sell.
  if (resolved.status === 'not-found') return { match: 'none', usZip: false };
  if (resolved.status === 'found') {
    const state = states.find((s) => s.code === resolved.stateCode);
    if (!state) return { match: 'none', usZip: true, zipCity: tidyPlaceName(resolved.city), zipState: resolved.stateCode };
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

  // Directory unavailable and no ZIP3 range matched: we cannot prove anything about this ZIP, so
  // `usZip` is left undefined rather than asserted either way.
  return { match: 'none' };
}
