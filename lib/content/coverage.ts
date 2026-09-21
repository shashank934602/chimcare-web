import { lookupZip, type ZipLookupResult } from './zip-lookup';

/**
 * The answer to one question: is this ZIP ours to serve, or is it a lead to sell?
 *
 * `served: true`  → the request becomes a real booking (site.bookings) and reaches the adapter.
 * `served: false` → the request becomes a lead (site.leads). No adapter, no schedule.
 */
export type Coverage = {
  served: boolean;
  /**
   * Is this a real US ZIP at all? `false` only when the ZIP directory positively says it is not —
   * never merely because we could not check. A `false` here is not "outside the service area", it
   * is "nowhere", and nothing should be stored for it, least of all a lead someone will pay for.
   */
  usZip: boolean;
  /** Why, so an admin row can be explained later without re-running the lookup. */
  reason: 'city_page' | 'served_state' | 'outside_service_area' | 'not_a_us_zip';
  lookup: ZipLookupResult;
  /** Where the ZIP actually is, when the ZIP directory could say. Never guessed. */
  zipCity?: string;
  zipState?: string;
};

/**
 * THE COVERAGE RULE. One function, deliberately — every fork between "we serve you" and "we sell
 * this lead" goes through here, so the rule can be changed in one place.
 *
 * Today it is page-existence: `lookupZip` answers "do we publish a page that covers this ZIP", and
 * both a city match and a served-state match count as served. That is a proxy, not a territory —
 * a ZIP twenty minutes from a real branch that simply has no page yet would classify as a lead and
 * be sold off. Branch territories are not confirmed (branch assignment is still a nearest-branch
 * heuristic), so when the business supplies real service radii or a ZIP allowlist, replace the body
 * of this function and nothing else has to change.
 *
 * Never call `lookupZip` directly to decide coverage. Call this.
 */
export async function classifyZip(zip: string): Promise<Coverage> {
  if (!/^\d{5}$/.test(zip)) {
    // Not five digits: not a US ZIP, and not evidence that we serve anything.
    return { served: false, usZip: false, reason: 'not_a_us_zip', lookup: { match: 'none', usZip: false } };
  }
  const lookup = await lookupZip(zip);
  if (lookup.match === 'city') return { served: true, usZip: true, reason: 'city_page', lookup };
  if (lookup.match === 'state') return { served: true, usZip: true, reason: 'served_state', lookup };
  // Only a positive `false` from the directory rejects. An unanswered lookup leaves it undefined,
  // and an unproven ZIP is accepted rather than turning a real visitor away over our own outage.
  if (lookup.usZip === false) {
    return { served: false, usZip: false, reason: 'not_a_us_zip', lookup };
  }
  return {
    served: false,
    usZip: true,
    reason: 'outside_service_area',
    lookup,
    zipCity: lookup.zipCity,
    zipState: lookup.zipState,
  };
}
