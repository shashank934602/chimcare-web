/**
 * Card link resolution — one deterministic destination for every city card on a state hub.
 *
 * A card is a promise: it names a city, so clicking it must land on THAT city's page in THAT state.
 * Before this module the hub asked one question — "is the page published?" — and rendered a dead
 * "Page in review" label for every other answer. Minnesota shipped with 150 cards and 150 dead
 * labels, and Massachusetts would have repeated it at ~220.
 *
 * The rules here are all lookups against migrated data. Nothing is guessed: where a destination
 * cannot be established from the fate maps and the migrated page rows, the card resolves to REVIEW
 * and says why, rather than pointing somewhere plausible.
 *
 * This module decides LINKS ONLY. It never decides publication — that stays with the distinctness
 * gate, which it reads and never overrides.
 */

export type CardBehavior = 'PAGE' | 'REDIRECT' | 'COVERAGE_ONLY' | 'REVIEW';

/** The page row a city resolves through, as far as link resolution cares. */
export type ResolvablePage = {
  slug: string;
  status: 'draft' | 'review' | 'published' | 'retired';
  fate: 'publish_verbatim' | 'regenerate' | 'redirect' | 'gone';
  redirectTo: string | null;
  /** State code of the city this page belongs to — the cross-state guard reads this. */
  stateCode: string | null;
  /** City name this page belongs to, for the same-city assertion. */
  cityName: string | null;
  legacyPostId: number | null;
  legacyUrl: string | null;
};

export type ResolvableCity = {
  name: string;
  slug: string | null; // null when WordPress never had a city page
  stateCode: string;
  sourceStatus: 'NO_SOURCE_PAGE' | 'SOURCE_PAGE_EXISTS' | 'SOURCE_PAGE_INCOMPLETE' | 'SOURCE_PAGE_PUBLISHABLE';
  blockedBy?: string[];
};

export type CardResolution = {
  city: string;
  state: string;
  href: string | null;
  behavior: CardBehavior;
  sourcePageId: number | null;
  sourceUrl: string | null;
  targetUrl: string | null;
  status: ResolvablePage['status'] | 'none';
  reason: string;
};

const MAX_HOPS = 10;
export const locationPath = (slug: string) => `/location/${slug}/`;
/** '/location/x/' | 'x' | 'https://host/location/x/' → 'x'. Trailing slash is preserved by callers. */
export const slugOf = (pathOrSlug: string) =>
  pathOrSlug.replace(/^https?:\/\/[^/]+/, '').replace(/^\/+|\/+$/g, '').split('/').pop() ?? '';

/**
 * Resolve one city card.
 *
 * `lookup` returns the migrated page row for a slug, or null when this build has no such page.
 * A redirect is followed to its FINAL destination so the card links straight there: a card that
 * costs the visitor a hop is a card that can silently rot into a chain.
 */
export function resolveCityCard(city: ResolvableCity, lookup: (slug: string) => ResolvablePage | null): CardResolution {
  const base = {
    city: city.name,
    state: city.stateCode,
    href: null as string | null,
    sourcePageId: null as number | null,
    sourceUrl: null as string | null,
    targetUrl: null as string | null,
  };

  // 4 — WordPress never had a city page. Nothing is invented; the card shows service coverage.
  if (!city.slug || city.sourceStatus === 'NO_SOURCE_PAGE') {
    return {
      ...base,
      behavior: 'COVERAGE_ONLY',
      status: 'none',
      reason: 'WordPress has no city page for this city. It is served as coverage; no URL is invented.',
    };
  }

  const page = lookup(city.slug);
  base.sourceUrl = locationPath(city.slug);

  if (!page) {
    return {
      ...base,
      behavior: 'REVIEW',
      status: 'none',
      reason: `The city carries slug "${city.slug}" but this build has no page row for it, so no route can be verified.`,
    };
  }
  base.sourcePageId = page.legacyPostId;

  // 2 — an approved redirect. Follow it to the end, refusing loops and dead ends.
  if (page.fate === 'redirect') {
    const seen = new Set<string>([city.slug]);
    let cur: ResolvablePage = page;
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      if (!cur.redirectTo) {
        return { ...base, behavior: 'REVIEW', status: cur.status, reason: 'The page is marked as a redirect but carries no target. No destination is guessed.' };
      }
      const nextSlug = slugOf(cur.redirectTo);
      if (seen.has(nextSlug)) {
        return { ...base, behavior: 'REVIEW', status: cur.status, targetUrl: locationPath(nextSlug), reason: `Redirect loop detected at "${nextSlug}". Not linked.` };
      }
      seen.add(nextSlug);
      const next = lookup(nextSlug);
      if (!next) {
        return { ...base, behavior: 'REVIEW', status: cur.status, targetUrl: locationPath(nextSlug), reason: `The approved redirect target "${nextSlug}" has no page in this build, so linking it would 404.` };
      }
      if (next.fate === 'redirect') { cur = next; continue; } // keep walking; the card links the end of the chain

      // Cross-state guard: a Massachusetts card may never land on another state's city.
      if (next.stateCode && next.stateCode !== city.stateCode) {
        return { ...base, behavior: 'REVIEW', status: next.status, targetUrl: locationPath(next.slug), reason: `The approved target "${next.slug}" belongs to ${next.stateCode}, not ${city.stateCode}. Refused as a cross-state link.` };
      }
      if (next.status !== 'published') {
        return { ...base, behavior: 'REVIEW', status: next.status, targetUrl: locationPath(next.slug), reason: `The approved target "${next.slug}" is not published (${next.status}), so the route does not exist.` };
      }
      return {
        ...base,
        behavior: 'REDIRECT',
        href: locationPath(next.slug),
        targetUrl: locationPath(next.slug),
        status: next.status,
        reason: `Duplicate of an approved canonical page; the fate map sends it to "${next.slug}".`,
      };
    }
    return { ...base, behavior: 'REVIEW', status: page.status, reason: `Redirect chain longer than ${MAX_HOPS} hops. Not linked.` };
  }

  if (page.fate === 'gone') {
    return { ...base, behavior: 'REVIEW', status: page.status, reason: 'The URL is retired in the approved fate map (410). It is not linked and no replacement is invented.' };
  }

  // The page belongs to another state — refuse before anything else can use it.
  if (page.stateCode && page.stateCode !== city.stateCode) {
    return { ...base, behavior: 'REVIEW', status: page.status, reason: `The page for "${city.slug}" belongs to ${page.stateCode}, not ${city.stateCode}. Refused as a cross-state link.` };
  }

  // 1 — a live, published city page.
  if (page.status === 'published') {
    return {
      ...base,
      behavior: 'PAGE',
      href: locationPath(page.slug),
      targetUrl: locationPath(page.slug),
      status: page.status,
      reason: 'Migrated WordPress city page, published at its preserved source URL.',
    };
  }

  // 3 — the page exists in WordPress and is migrated, but the gate withholds it. The card stays
  // intentional and non-linking: the public route genuinely does not exist yet.
  const blockers = city.blockedBy?.length ? ` Awaiting: ${city.blockedBy.join(', ')}.` : '';
  return {
    ...base,
    behavior: 'REVIEW',
    status: page.status,
    reason: `The WordPress page exists and is migrated, but has not passed the publication gate, so no public route exists yet.${blockers}`,
  };
}

/** Invariants every resolved card must satisfy. Returns the violations, empty when sound. */
export function auditResolution(r: CardResolution): string[] {
  const bad: string[] = [];
  const linked = r.behavior === 'PAGE' || r.behavior === 'REDIRECT';
  if (linked) {
    if (!r.href) bad.push('linking behavior with no href');
    else {
      if (r.href === '#') bad.push('href is "#"');
      if (r.href.includes('undefined')) bad.push('href contains "undefined"');
      if (r.href.includes('null')) bad.push('href contains "null"');
      if (!/^\/location\/[a-z0-9][a-z0-9-]*\/$/.test(r.href)) bad.push(`href is not a well-formed location route: ${r.href}`);
    }
  } else if (r.href !== null) {
    bad.push(`non-linking behavior (${r.behavior}) must have a null href, got ${r.href}`);
  }
  if (!r.reason) bad.push('no reason recorded');
  return bad;
}
