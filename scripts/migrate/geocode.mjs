/**
 * STATE-QUALIFIED GEOCODER — derives coordinates for cities WordPress has none for.
 *
 * This is a DATA-PRODUCTION step, kept deliberately separate from the migration agent. Everything
 * it writes is DERIVED and says so; nothing it writes is ever mistaken for WordPress source.
 *
 * Why it exists in its own file, keyed by state:
 *   `data/seed/mn-geocode.json` is keyed by BARE city name. Six Massachusetts cities share a name
 *   with a Minnesota city already in that cache — Andover, Carver, Hanover, Lexington, Northfield
 *   and Plymouth — so reusing it would silently place Lexington, MA in Anoka County, Minnesota.
 *   Keys here are therefore state-qualified ("MA:lexington") and each entry records the state it
 *   was resolved in. A cache written for one state can never satisfy a lookup for another.
 *
 * It refuses rather than guesses. A result is rejected — coordinates left null, city left for
 * review — when it lands outside the state, when it is an administrative area rather than a
 * populated place (this is how Minnesota ended up with "Carver County" instead of Carver), or when
 * two distinct same-named places in the state make the answer ambiguous.
 *
 * WordPress is read with SELECTs only and is never written to. Coordinates WordPress already holds
 * are preserved and never overwritten, re-derived or re-queried.
 *
 *   node scripts/migrate/geocode.mjs --state ma [--dry-run] [--limit N] [--refresh]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { makeQuery, titleCaseSlug } from './source.mjs';
import { STATES } from './states.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : d);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const S = STATES[opt('--state', 'ma')];
if (!S) throw new Error(`Unknown state. Known: ${Object.keys(STATES).join(', ')}`);
const DRY = flag('--dry-run');
const REFRESH = flag('--refresh');
const LIMIT = Number(opt('--limit', '0')) || Infinity;
const CACHE = path.join(ROOT, `data/seed/${S.key}-geocode.json`);
const RUN_ID = `${S.key}-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(3).toString('hex')}`;

// Nominatim's own classification of what a result IS. Only populated places qualify; counties,
// states and regions are rejected outright rather than used as a city coordinate.
const PLACE_TYPES = new Set(['town', 'city', 'village', 'hamlet', 'municipality', 'suburb', 'neighbourhood', 'borough']);
const USER_AGENT = 'chimcare-migration-audit/1.0 (read-only migration data production)';
const RATE_MS = 1100; // Nominatim usage policy: at most one request per second
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const readJson = (p, d = null) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d);
/** State-qualified, case- and punctuation-stable. "St. Anthony" and "st anthony" are one key. */
export const cacheKey = (state, city) => `${state}:${city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

console.log(`\nGEOCODE · state ${S.stateCode} · ${DRY ? 'DRY RUN' : 'LIVE'} · run ${RUN_ID}\n`);

// ---------------------------------------------------------------- the cities that need a coordinate
const query = makeQuery({ host: '127.0.0.1', user: 'root', database: 'chimcare_local' });
const like = S.cityPagePatterns.map((p) => `p.post_name LIKE '${p}'`).join(' OR ');
const rows = query(`
  SELECT JSON_ARRAYAGG(JSON_OBJECT(
    'wpPostId', p.ID, 'wpSlug', p.post_name, 'wpTitle', p.post_title,
    'lat', la.meta_value, 'lng', lo.meta_value))
  FROM wp_posts p
  LEFT JOIN wp_postmeta la ON la.post_id = p.ID AND la.meta_key = 'geolocation_lat'
  LEFT JOIN wp_postmeta lo ON lo.post_id = p.ID AND lo.meta_key = 'geolocation_long'
  WHERE p.post_type = 'job_listing' AND p.post_status = 'publish' AND (${like})`);

const isState = (r) => new RegExp(`-${S.key}(-\\d+)?$`).test(r.wpSlug) || new RegExp(`,\\s*${S.stateCode}\\s*$`).test((r.wpTitle ?? '').trim());
const suffixOf = (slug) => { for (const re of S.citySlugRes) { const m = re.exec(slug); if (m) return m[1]; } return null; };
const cityNameOf = (r, suffix) => new RegExp(`in (.*),\\s*${S.stateCode}$`).exec(r.wpTitle ?? '')?.[1]?.trim() ?? titleCaseSlug(suffix);

/** One entry per distinct city; a city with WordPress coordinates on ANY of its pages keeps them. */
const cities = new Map();
for (const r of rows) {
  if (!isState(r)) continue;
  const suffix = suffixOf(r.wpSlug);
  if (!suffix) continue;
  const name = cityNameOf(r, suffix);
  const key = cacheKey(S.stateCode, name);
  const wpLat = r.lat && String(r.lat).trim() ? Number(r.lat) : null;
  const wpLng = r.lng && String(r.lng).trim() ? Number(r.lng) : null;
  const prev = cities.get(key);
  if (!prev) cities.set(key, { key, name, suffix, wpPostId: r.wpPostId, wpSlug: r.wpSlug, wpLat, wpLng });
  else if (prev.wpLat == null && wpLat != null) Object.assign(prev, { wpLat, wpLng, wpPostId: r.wpPostId, wpSlug: r.wpSlug });
}
const all = [...cities.values()].sort((a, b) => a.name.localeCompare(b.name));
const fromWordPress = all.filter((c) => c.wpLat != null);
const needGeocode = all.filter((c) => c.wpLat == null);
console.log(`CITIES     ${all.length} distinct ${S.stateCode} cities · ${fromWordPress.length} already carry WordPress coordinates (preserved, never re-derived) · ${needGeocode.length} need a derived coordinate`);

// ---------------------------------------------------------------- geocode, validate, or refuse
const cache = readJson(CACHE, { schema: 1, state: S.stateCode, entries: {} });
if (cache.state && cache.state !== S.stateCode) throw new Error(`Cache ${CACHE} belongs to ${cache.state}, refusing to write ${S.stateCode} into it`);
cache.entries ??= {};

async function nominatim(name) {
  // limit=3 so a second same-named place in the same state can be detected as ambiguity instead of
  // being silently shadowed by whichever result ranked first.
  const q = `${name}, ${S.stateName}, USA`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&addressdetails=1&countrycodes=us&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } });
  if (!res.ok) return { query: q, error: `HTTP ${res.status}` };
  return { query: q, hits: await res.json() };
}

/** Decide what a Nominatim response means. Returns a status and, only when sound, coordinates. */
export function evaluate(hits, stateName) {
  if (!hits?.length) return { status: 'no_result', detail: 'Nominatim returned nothing for this query.' };
  const inState = hits.filter((h) => (h.address?.state ?? '') === stateName);
  if (!inState.length) {
    return { status: 'wrong_state', detail: `No result is in ${stateName}. Best match was "${hits[0].display_name}".` };
  }
  const places = inState.filter((h) => PLACE_TYPES.has(h.addresstype));
  if (!places.length) {
    return { status: 'not_a_place', detail: `Only administrative areas matched, not a populated place: "${inState[0].display_name}" (${inState[0].addresstype}).` };
  }
  // Two distinct populated places of the same name in the same state: the answer is not determined
  // by the data, so no coordinate is taken.
  const distinct = new Map();
  for (const p of places) distinct.set(`${p.osm_type}/${p.osm_id}`, p);
  if (distinct.size > 1) {
    const names = [...distinct.values()].map((p) => p.display_name);
    const sameName = [...distinct.values()].filter((p) => p.name?.toLowerCase() === places[0].name?.toLowerCase());
    if (sameName.length > 1) {
      return { status: 'ambiguous', detail: `${sameName.length} distinct places share this name in ${stateName}: ${names.slice(0, 3).join(' | ')}. Not guessed.` };
    }
  }
  const hit = places[0];
  return {
    status: 'ok',
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    display: hit.display_name,
    addressType: hit.addresstype,
    osm: `${hit.osm_type}/${hit.osm_id}`,
    county: hit.address?.county ?? null,
    confidence: typeof hit.importance === 'number' ? Number(hit.importance.toFixed(6)) : null,
  };
}

let queried = 0, resolved = 0, refused = 0, reused = 0;
const refusals = [];
for (const c of needGeocode) {
  if (queried >= LIMIT) break;
  const existing = cache.entries[c.key];
  if (existing && !REFRESH) { reused++; if (existing.status === 'ok') resolved++; else { refused++; refusals.push({ city: c.name, status: existing.status, detail: existing.detail }); } continue; }
  if (DRY) { queried++; continue; }

  await sleep(RATE_MS);
  const r = await nominatim(c.name);
  queried++;
  const verdict = r.error ? { status: 'error', detail: r.error } : evaluate(r.hits, S.stateName);
  cache.entries[c.key] = {
    city: c.name,
    state: S.stateCode,
    stateName: S.stateName,
    sourceWpId: c.wpPostId,
    sourceWpSlug: c.wpSlug,
    geocodeInput: r.query,
    provenance: 'DERIVED',
    geocoder: 'nominatim/openstreetmap',
    lat: verdict.lat ?? null,
    lng: verdict.lng ?? null,
    status: verdict.status,
    detail: verdict.detail ?? null,
    display: verdict.display ?? null,
    addressType: verdict.addressType ?? null,
    county: verdict.county ?? null,
    osm: verdict.osm ?? null,
    confidence: verdict.confidence ?? null,
    runId: RUN_ID,
    resolvedAt: new Date().toISOString(),
  };
  if (verdict.status === 'ok') { resolved++; } else { refused++; refusals.push({ city: c.name, status: verdict.status, detail: verdict.detail }); }
  if (queried % 25 === 0) console.log(`           …${queried}/${Math.min(needGeocode.length, LIMIT)} queried · ${resolved} resolved · ${refused} refused`);
}

console.log(`\nRESULT     ${queried} queried · ${reused} reused from cache · ${resolved} resolved · ${refused} refused`);
if (refusals.length) {
  const byStatus = refusals.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {});
  console.log('REFUSED    ' + Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(' · ') + '   (coordinates left null; these cities stay in review)');
  for (const r of refusals.slice(0, 12)) console.log(`             ${r.city}: ${r.detail}`);
}

if (!DRY) {
  cache.schema = 1;
  cache.state = S.stateCode;
  cache.stateName = S.stateName;
  cache.provenance = 'DERIVED — coordinates computed by this script, never WordPress source. Keys are state-qualified.';
  cache.lastRunId = RUN_ID;
  cache.lastRunAt = new Date().toISOString();
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1) + '\n');
  console.log(`\nWrote ${path.relative(ROOT, CACHE)} — ${Object.keys(cache.entries).length} entries, all state-qualified to ${S.stateCode}.\n`);
} else {
  console.log('\nDry run: nothing written.\n');
}
