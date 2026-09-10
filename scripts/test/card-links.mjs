/**
 * Card-link invariants.
 *
 * Two suites, one contract:
 *   1. UNIT   — resolveCityCard() against hand-built fixtures, including the traps that make a hub
 *               rot silently: a redirect chain, a redirect loop, a target in another state, a
 *               target that is not published, a city with no source page.
 *   2. DATA   — every Massachusetts card in data/seed/ma.cards.json (produced by the dry-run audit)
 *               must satisfy the invariants: a valid behavior, a real route where it links, no
 *               null/#/undefined href, no cross-state link, no duplicate unresolved route.
 *
 * Run: npx tsx scripts/test/card-links.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveCityCard, auditResolution, slugOf } from '../../lib/migration/card-resolution.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let pass = 0;
const failures = [];
const ok = (name, cond, detail = '') => (cond ? pass++ : failures.push(`${name}${detail ? ` — ${detail}` : ''}`));
const eq = (name, actual, expected) => ok(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

// ---------------------------------------------------------------------------- 1. unit fixtures
const page = (o) => ({ status: 'published', fate: 'publish_verbatim', redirectTo: null, stateCode: 'MA', cityName: null, legacyPostId: 1, legacyUrl: null, ...o });
const INDEX = {
  'live-ma': page({ slug: 'live-ma', cityName: 'Live' }),
  'held-ma': page({ slug: 'held-ma', status: 'review' }),
  'retired-ma': page({ slug: 'retired-ma', status: 'retired', fate: 'gone' }),
  'dup-ma': page({ slug: 'dup-ma', fate: 'redirect', redirectTo: '/location/live-ma/' }),
  'hop1-ma': page({ slug: 'hop1-ma', fate: 'redirect', redirectTo: '/location/hop2-ma/' }),
  'hop2-ma': page({ slug: 'hop2-ma', fate: 'redirect', redirectTo: '/location/live-ma/' }),
  'loopa-ma': page({ slug: 'loopa-ma', fate: 'redirect', redirectTo: '/location/loopb-ma/' }),
  'loopb-ma': page({ slug: 'loopb-ma', fate: 'redirect', redirectTo: '/location/loopa-ma/' }),
  'to-nh': page({ slug: 'to-nh', fate: 'redirect', redirectTo: '/location/bedford-chimney-sweep/' }),
  'bedford-chimney-sweep': page({ slug: 'bedford-chimney-sweep', stateCode: 'NH', cityName: 'Bedford' }),
  'to-held': page({ slug: 'to-held', fate: 'redirect', redirectTo: '/location/held-ma/' }),
  'to-missing': page({ slug: 'to-missing', fate: 'redirect', redirectTo: '/location/not-in-build-ma/' }),
  'dangling': page({ slug: 'dangling', fate: 'redirect', redirectTo: null }),
};
const lookup = (s) => INDEX[s] ?? null;
const city = (slug, extra = {}) => ({ name: 'Test', slug, stateCode: 'MA', sourceStatus: 'SOURCE_PAGE_PUBLISHABLE', ...extra });

const r1 = resolveCityCard(city('live-ma'), lookup);
eq('published page → PAGE', r1.behavior, 'PAGE');
eq('published page → href', r1.href, '/location/live-ma/');

const r2 = resolveCityCard(city('held-ma', { sourceStatus: 'SOURCE_PAGE_INCOMPLETE', blockedBy: ['hero image'] }), lookup);
eq('gate-held page → REVIEW', r2.behavior, 'REVIEW');
eq('gate-held page → no href', r2.href, null);
ok('gate-held page names its blocker', r2.reason.includes('hero image'), r2.reason);

const r3 = resolveCityCard(city('dup-ma'), lookup);
eq('approved duplicate → REDIRECT', r3.behavior, 'REDIRECT');
eq('approved duplicate → canonical href', r3.href, '/location/live-ma/');

const r4 = resolveCityCard(city('hop1-ma'), lookup);
eq('redirect chain → collapses to final target', r4.href, '/location/live-ma/');
eq('redirect chain → REDIRECT', r4.behavior, 'REDIRECT');

const r5 = resolveCityCard(city('loopa-ma'), lookup);
eq('redirect loop → REVIEW', r5.behavior, 'REVIEW');
eq('redirect loop → no href', r5.href, null);
ok('redirect loop is named as such', /loop/i.test(r5.reason), r5.reason);

const r6 = resolveCityCard(city('to-nh'), lookup);
eq('cross-state target → REVIEW', r6.behavior, 'REVIEW');
eq('cross-state target → no href', r6.href, null);
ok('cross-state refusal names the state', r6.reason.includes('NH'), r6.reason);

const r7 = resolveCityCard(city('to-held'), lookup);
eq('unpublished target → REVIEW', r7.behavior, 'REVIEW');
eq('unpublished target → no href', r7.href, null);

const r8 = resolveCityCard(city('to-missing'), lookup);
eq('target absent from build → REVIEW', r8.behavior, 'REVIEW');
ok('absent target would have 404ed', /404/.test(r8.reason), r8.reason);

const r9 = resolveCityCard(city(null, { sourceStatus: 'NO_SOURCE_PAGE' }), lookup);
eq('no WordPress page → COVERAGE_ONLY', r9.behavior, 'COVERAGE_ONLY');
eq('no WordPress page → no href', r9.href, null);
ok('no page → nothing invented', /no URL is invented/.test(r9.reason), r9.reason);

const r10 = resolveCityCard(city('dangling'), lookup);
eq('redirect with no target → REVIEW', r10.behavior, 'REVIEW');
eq('redirect with no target → no href', r10.href, null);

const r11 = resolveCityCard(city('retired-ma'), lookup);
eq('retired (410) page → REVIEW', r11.behavior, 'REVIEW');
eq('retired page → no href', r11.href, null);

// A Massachusetts city must never resolve onto a same-named page in another state.
const r12 = resolveCityCard(city('bedford-chimney-sweep'), lookup);
eq('MA city pointing at an NH page → REVIEW', r12.behavior, 'REVIEW');
eq('MA city pointing at an NH page → no href', r12.href, null);

for (const [name, r] of [['PAGE', r1], ['REVIEW', r2], ['REDIRECT', r3], ['COVERAGE_ONLY', r9]]) {
  ok(`${name} resolution passes its own invariants`, auditResolution(r).length === 0, auditResolution(r).join('; '));
}

console.log(`\nUNIT     ${pass} assertions passed, ${failures.length} failed`);

// ---------------------------------------------------------------------------- 2. Massachusetts data
const dataFile = path.join(ROOT, 'data/seed/ma.cards.json');
if (!fs.existsSync(dataFile)) {
  console.log('DATA     skipped — run `npx tsx scripts/audit/ma-cards.mjs` first to produce data/seed/ma.cards.json');
} else {
  const { counts, cards } = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const BEHAVIORS = new Set(['PAGE', 'REDIRECT', 'COVERAGE_ONLY', 'REVIEW']);
  const before = failures.length;
  const routes = new Map();

  for (const c of cards) {
    ok(`[${c.city}] behavior is one of the four`, BEHAVIORS.has(c.behavior), c.behavior);
    ok(`[${c.city}] state is MA`, c.state === 'MA', c.state);
    for (const v of auditResolution(c)) failures.push(`[${c.city}] ${v}`);
    if (c.href) {
      ok(`[${c.city}] href is a location route`, /^\/location\/[a-z0-9][a-z0-9-]*\/$/.test(c.href), c.href);
      ok(`[${c.city}] href has no placeholder`, !/undefined|null|#/.test(c.href), c.href);
      const prev = routes.get(c.href);
      ok(`[${c.city}] route is not claimed by another city`, !prev, prev ? `also used by ${prev}` : '');
      routes.set(c.href, c.city);
      ok(`[${c.city}] PAGE links its own slug`, c.behavior !== 'PAGE' || slugOf(c.href) === c.wpSlug, `${c.href} vs ${c.wpSlug}`);
    } else {
      ok(`[${c.city}] non-linking card is REVIEW or COVERAGE_ONLY`, c.behavior === 'REVIEW' || c.behavior === 'COVERAGE_ONLY', c.behavior);
    }
    ok(`[${c.city}] COVERAGE_ONLY has no source page`, c.behavior !== 'COVERAGE_ONLY' || c.wpPostId === null, String(c.wpPostId));
    ok(`[${c.city}] linked card carries a WordPress post id`, c.behavior !== 'PAGE' || Number.isInteger(c.wpPostId), String(c.wpPostId));
  }

  const tally = cards.reduce((a, c) => ((a[c.behavior] = (a[c.behavior] ?? 0) + 1), a), {});
  for (const k of BEHAVIORS) eq(`reported count for ${k} matches the cards`, tally[k] ?? 0, counts[k] ?? 0);

  console.log(`DATA     ${cards.length} Massachusetts cards checked, ${failures.length - before} failed`);
  console.log(`         PAGE ${counts.PAGE} · REDIRECT ${counts.REDIRECT} · COVERAGE_ONLY ${counts.COVERAGE_ONLY} · REVIEW ${counts.REVIEW} · BROKEN 0`);
}

console.log(`\n${failures.length ? 'FAIL' : 'PASS'}     ${pass} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 30)) console.log(`  ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
