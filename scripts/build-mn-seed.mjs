// Builds data/seed/minnesota.generated.json from the real Minnesota sources:
//
//   ../Chimcare-Migration/output/job_listings.jsonl   every legacy job_listing row (streamed; only *-mn slugs kept)
//   ../chimcare-rebuild-main/site/data/branches.json  the 14 Minnesota branch addresses
//   ../chimcare-rebuild-main/site/data/keep-pages.json / redirects.json / gone.json   URL fates
//   ../chimcare-rebuild-main/site/data/pricing.json   headline prices
//   ../chimcare-rebuild-main/site/data/content/hubs/state-mn.md   state hub copy
//
// Idempotent: same inputs → same file. `--dry-run` prints the counts and writes nothing.
// Coverage cities have no coordinates in any source; they are geocoded once through Nominatim and
// cached in data/seed/mn-geocode.json (`--no-geocode` uses the cache only). The serving branch of a
// coverage city is the NEAREST branch — a heuristic, flagged as `branchAssignment: "nearest"` until
// the business confirms territories.
//
//   node scripts/build-mn-seed.mjs [--dry-run] [--no-geocode] [--jsonl <path>] [--rebuild <dir>]

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const JSONL = path.resolve(ROOT, opt('--jsonl', '../Chimcare-Migration/output/job_listings.jsonl'));
const REBUILD = path.resolve(ROOT, opt('--rebuild', '../chimcare-rebuild-main'));
const OUT = path.join(ROOT, 'data/seed/minnesota.generated.json');
const GEOCACHE = path.join(ROOT, 'data/seed/mn-geocode.json');
const DRY = flag('--dry-run');
const GEOCODE = !flag('--no-geocode');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const lastSeg = (p) => p.replace(/\/+$/, '').split('/').pop();
const CITY_RE = /^chimney-sweep-(fireplace|repair)-in-(.+)-mn$/;
const SUFFIX_RE = /-in-(.+)-mn$/;

// ---- 1. legacy rows ---------------------------------------------------------------------------

async function readMinnesotaRows() {
  const rows = new Map();
  const rl = readline.createInterface({ input: fs.createReadStream(JSONL), crlfDelay: Infinity });
  for await (const line of rl) {
    const m = /"post_name": "([^"]*)"/.exec(line.slice(0, 4000));
    if (!m || !/-mn(-\d+)?$/.test(m[1])) continue;
    const d = JSON.parse(line);
    const md = typeof d.metadata === 'string' ? JSON.parse(d.metadata) : d.metadata ?? {};
    const html = d.content?.cleaned_html ?? '';
    const rec = {
      id: Number(d.id),
      slug: d.post_name,
      status: d.post_status,
      title: d.post_title,
      seoTitle: md.seo?.title ?? null,
      metadesc: md.seo?.metadesc ?? null,
      redirectInfo: md.seo?.redirect_info ?? null,
      phone: md.contact?.phone ?? null,
      locText: md.location?.job_location_text ?? null,
      geo: md.location?.geolocation ?? null,
    };
    if (CITY_RE.test(rec.slug)) rec.html = html;
    rows.set(rec.slug, rec);
  }
  return rows;
}

// ---- helpers ----------------------------------------------------------------------------------

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;/g, "'")
    .trim();
const stripTags = (s) => decode(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
const titleCase = (slug) =>
  slug
    .split('-')
    .map((w) => (w === 'st' ? 'St.' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
const displayPhone = (p) => {
  const d = (p ?? '').replace(/\D/g, '').replace(/^1(\d{10})$/, '$1');
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : p;
};
const cents = (s) => Math.round(Number(String(s).replace(/[^0-9.]/g, '')) * 100);
const toRad = (x) => (x * Math.PI) / 180;
function km(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** "Areas We Serve Around X" / "Serving Nearby Areas" list items, minus the generic tail entries. */
function areasFromHtml(html) {
  const i = html.search(/<h2>(Areas We Serve|Serving Nearby)/);
  if (i < 0) return [];
  const block = html.slice(i, i + 2000);
  const items = [...block.matchAll(/<li>(.*?)<\/li>/g)].map((m) => stripTags(m[1]));
  return items.filter((t) => t && !/^surrounding|^nearby|^other|^greater|:|^and /i.test(t));
}

/**
 * The city's own "why it matters" prose: sentence 1 = climate line, first sentence about homes =
 * housing line. Both are taken verbatim from the page; nothing is written here.
 *
 * Two headings lead this paragraph, because the two page shapes word it differently:
 *   coverage pages  <h2>Why {service} Is Important in {City}</h2>
 *   branch pages    <h2>Why {City}, MN Homeowners Trust Chimcare</h2>
 * Only the first was matched, and branch pages were additionally skipped before this function was
 * even called, so all 14 branch cities reported zero local lines and failed the gate on prose that
 * was in WordPress the whole time. Measured on Minneapolis (post 90807), the highest-traffic city
 * page in the state.
 */
function specificsFromHtml(html) {
  const i = [/<h2>Why [^<]* Important in /, /<h2>Why [^<]*Homeowners Trust /]
    .map((re) => html.search(re))
    .filter((n) => n >= 0)
    .sort((a, b) => a - b)[0] ?? -1;
  if (i < 0) return {};
  // Take everything between this heading and the next one, then strip tags. The two page shapes wrap
  // the paragraph differently — coverage pages in <p>, branch pages in a styled <span> — and looking
  // for <p> alone either missed it or reached past it into an unrelated section.
  const after = html.slice(i);
  const end = after.slice(4).search(/<h[1-4][\s>]/);
  const block = end >= 0 ? after.slice(0, end + 4) : after.slice(0, 3000);
  const prose = block.replace(/<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>/gi, ' ').replace(/<a\b[^>]*class="cta-button"[\s\S]*?<\/a>/gi, ' ');
  if (!prose.trim()) return {};
  const sentences = stripTags(prose)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = {};
  if (sentences[0]) out.climate_line = sentences[0];
  const housing = sentences.slice(1).find((s) => /\b(homes?|housing|houses|builds?|neighborhoods?)\b/i.test(s));
  if (housing) out.housing_line = housing.replace(/[.!?]$/, '');
  return out;
}

/** The two neighbourhoods named in the branch-page intro sentence, when the page names any. */
function introNeighbourhoods(html) {
  const m = /Whether you(?:'|’|&#8217;)re in an? [^,.]*? in ([^,.]+?) or an? [^,.]*? in ([^,.]+?),/.exec(html);
  if (!m) return [];
  return [m[1], m[2]].map((s) => decode(s).replace(/^the /i, '').replace(/ (neighborhood|area)$/i, ''));
}

// ---- 2. geocoding cache -----------------------------------------------------------------------

async function geocode(cache, name) {
  if (cache[name]) return cache[name];
  if (!GEOCODE) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(`${name}, Minnesota, USA`)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'chimcare-web seed builder (local test slice)' } });
  await new Promise((r) => setTimeout(r, 1100)); // Nominatim usage policy: max 1 request/second
  if (!res.ok) return null;
  const [hit] = await res.json();
  if (!hit) return null;
  cache[name] = { lat: Number(hit.lat), lng: Number(hit.lon), source: 'nominatim', display: hit.display_name };
  return cache[name];
}

// ---- 3. build -------------------------------------------------------------------------------

async function main() {
  const rows = await readMinnesotaRows();
  const branchesJson = readJson(path.join(REBUILD, 'site/data/branches.json')).filter((b) => b.state === 'MN');
  const keep = new Map(readJson(path.join(REBUILD, 'site/data/keep-pages.json')).filter((k) => k.state === 'mn').map((k) => [lastSeg(k.path), k]));
  const redirects = new Map(Object.entries(readJson(path.join(REBUILD, 'site/data/redirects.json'))).filter(([a]) => /-mn(-\d+)?\/?$/.test(a)).map(([a, b]) => [lastSeg(a), b]));
  const gone = new Set(readJson(path.join(REBUILD, 'site/data/gone.json')).filter((g) => /-mn(-\d+)?\/?$/.test(g)).map(lastSeg));
  const pricing = readJson(path.join(REBUILD, 'site/data/pricing.json'));
  const stateMd = fs.readFileSync(path.join(REBUILD, 'site/data/content/hubs/state-mn.md'), 'utf8');
  const geocache = fs.existsSync(GEOCACHE) ? readJson(GEOCACHE) : {};
  const serviceKeys = [...fs.readFileSync(path.join(ROOT, 'data/seed/services.ts'), 'utf8').matchAll(/"key": "([^"]+)"/g)].map((m) => m[1]).filter((k) => !['sweep', 'inspection', 'repair', 'gas', 'gas-inserts', 'wood-inserts', 'caps', 'outdoor'].includes(k));

  // -- state copy (slots use the app's {{price.x}} form) --
  const slotify = (s) => s.replace(/\{\{price:sweep_with_inspection\}\}/g, '{{price.sweep_inspection}}').replace(/\{\{price:(\w+)\}\}/g, '{{price.$1}}');
  const paragraphs = stateMd.split(/\n\s*\n/).map((p) => slotify(p.replace(/\s+/g, ' ').trim())).filter(Boolean);
  const sentences = paragraphs[0].split(/(?<=\.)\s+/);
  const state = {
    code: 'MN',
    slug: 'mn',
    name: 'Minnesota',
    blurb: sentences[0],
    heroLede: sentences.slice(1).join(' '),
    introParagraphs: paragraphs.slice(1),
    branchCount: branchesJson.length,
  };

  // -- prices --
  const amount = (token) => cents(pricing[token].amount);
  const prices = { sweep_inspection: amount('price:sweep_with_inspection'), inspection: amount('price:inspection'), gas_diagnostic: amount('price:gas_diagnostic') };

  // -- city pages --
  const cityRows = [...rows.values()].filter((r) => CITY_RE.test(r.slug));
  const suffixOf = (slug) => CITY_RE.exec(slug)?.[2];
  const branchSuffixes = new Set(cityRows.filter((r) => r.slug.startsWith('chimney-sweep-fireplace-in-')).map((r) => suffixOf(r.slug)));
  const duplicates = cityRows.filter((r) => r.slug.startsWith('chimney-sweep-repair-in-') && branchSuffixes.has(suffixOf(r.slug)));
  const dupSlugs = new Set(duplicates.map((r) => r.slug));

  // -- branches: branches.json row ↔ WP branch page, matched on street number + zip --
  const branches = [];
  for (const r of cityRows.filter((r) => r.slug.startsWith('chimney-sweep-fireplace-in-'))) {
    const num = /^\s*(\d+)/.exec(r.locText ?? '')?.[1];
    const zip = /\b(55\d{3})\b/.exec(r.locText ?? '')?.[1];
    const b = branchesJson.find((b) => b.street_address.startsWith(num + ' ') && b.zip === zip);
    if (!b) throw new Error(`No branches.json row for ${r.slug} (${r.locText})`);
    const suffix = suffixOf(r.slug);
    branches.push({
      slug: suffix,
      name: /in (.*), MN$/.exec(r.title)[1],
      legacyName: b.branch_name,
      street: b.street_address,
      streetShort: b.street_address.replace(/^\d+\s+/, ''),
      city: b.city,
      zip: b.zip,
      phone: displayPhone(b.phone),
      email: b.email || null,
      lat: Number(r.geo.lat),
      lng: Number(r.geo.long),
      gbpUrl: b.gbp_url,
      gbpStatus: b.gbp_status,
      licenses: b.license_numbers ? b.license_numbers.split(/[;,]\s*/) : [],
      legacyPostId: r.id,
      legacyThumbnailId: null,
    });
  }
  const unmatched = branchesJson.filter((b) => !branches.some((x) => x.street === b.street_address));
  if (unmatched.length) throw new Error(`branches.json rows without a WP page: ${unmatched.map((b) => b.branch_name).join(', ')}`);

  // -- cities --
  const cities = [];
  for (const r of cityRows) {
    if (dupSlugs.has(r.slug)) continue;
    const suffix = suffixOf(r.slug);
    const isBranch = branchSuffixes.has(suffix);
    const name = /in (.*), MN$/.exec(r.title)?.[1] ?? titleCase(suffix);
    let coords = r.geo?.lat ? { lat: Number(r.geo.lat), lng: Number(r.geo.long), source: 'wordpress' } : await geocode(geocache, name);
    const own = isBranch ? branches.find((b) => b.slug === suffix) : null;
    const nearest = coords ? branches.reduce((best, b) => (km(coords, b) < km(coords, best) ? b : best)) : null;
    const neighborhoods = [...new Set([...introNeighbourhoods(r.html), ...areasFromHtml(r.html)])];
    cities.push({
      slug: r.slug,
      name,
      kind: isBranch ? 'branch' : 'coverage',
      branch: own?.slug ?? nearest?.slug ?? null,
      branchAssignment: own ? 'own' : nearest ? 'nearest' : 'none',
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      coordsSource: coords?.source ?? null,
      neighborhoods,
      // Branch pages carry this prose too, under their own heading — see specificsFromHtml.
      localSpecifics: specificsFromHtml(r.html),
      metaTitle: r.seoTitle,
      metaDescription: r.metadesc,
      legacyPostId: r.id,
      legacyTitle: r.title,
      keepTier: keep.get(r.slug)?.tier || null,
      gscClicks: keep.get(r.slug)?.clicks ?? 0,
      redirectInfo: r.redirectInfo?.origin ? { from: lastSeg(r.redirectInfo.origin), to: lastSeg(r.redirectInfo.target) } : null,
    });
  }
  // Cities that have live service pages but no city page of their own: a city row (so their service
  // pages can render and the hub lists them) with no page row — no URL is invented for them.
  const knownSuffixes = new Set(cities.map((c) => suffixOf(c.slug)));
  const orphanSuffixes = new Map();
  for (const [slug, k] of keep) {
    const s = SUFFIX_RE.exec(slug)?.[1];
    if (s && !knownSuffixes.has(s) && !branchSuffixes.has(s) && s.length < 40 && !/saint-paul|south-wayzata/.test(s)) orphanSuffixes.set(s, (orphanSuffixes.get(s) ?? 0) + (k.fate ? 1 : 0));
  }
  for (const [suffix] of orphanSuffixes) {
    const name = titleCase(suffix);
    const coords = await geocode(geocache, name);
    const nearest = coords ? branches.reduce((best, b) => (km(coords, b) < km(coords, best) ? b : best)) : null;
    cities.push({
      slug: `chimney-sweep-repair-in-${suffix}-mn`, // synthetic key only — no page row is created for it
      name,
      kind: 'coverage',
      branch: nearest?.slug ?? null,
      branchAssignment: nearest ? 'nearest' : 'none',
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      coordsSource: coords?.source ?? null,
      neighborhoods: [],
      localSpecifics: {},
      metaTitle: null,
      metaDescription: null,
      legacyPostId: null,
      legacyTitle: null,
      keepTier: null,
      gscClicks: 0,
      redirectInfo: null,
      noCityPage: true,
    });
  }
  cities.sort((a, b) => a.name.localeCompare(b.name));
  const cityBySuffix = new Map(cities.map((c) => [suffixOf(c.slug), c.slug]));

  // -- pages: every Minnesota URL under /location/ with its fate --
  const pages = new Map();
  const add = (p) => {
    if (!pages.has(p.slug)) pages.set(p.slug, p);
  };
  const classify = (slug) => {
    const suffix = SUFFIX_RE.exec(slug)?.[1];
    const citySlug = suffix ? cityBySuffix.get(suffix) ?? null : null;
    const serviceKey = suffix ? serviceKeys.find((k) => slug === `${k}-in-${suffix}-mn`) ?? null : null;
    return { citySlug, serviceKey };
  };
  for (const c of cities) {
    if (c.noCityPage) continue;
    add({ slug: c.slug, kind: 'city', city: c.slug, service: null, tier: c.keepTier ?? 'B', fate: c.keepTier === 'A' ? 'publish_verbatim' : 'regenerate', status: 'published', redirectTo: null, legacyPostId: c.legacyPostId, gscClicks: c.gscClicks });
    if (c.redirectInfo && !rows.has(c.redirectInfo.from)) {
      add({ slug: c.redirectInfo.from, kind: 'city', city: c.slug, service: null, tier: 'C', fate: 'redirect', status: 'retired', redirectTo: `/location/${c.redirectInfo.to}/`, legacyPostId: null, gscClicks: keep.get(c.redirectInfo.from)?.clicks ?? 0, source: 'wordpress-redirect' });
    }
  }
  for (const d of duplicates) {
    add({ slug: d.slug, kind: 'city', city: `chimney-sweep-fireplace-in-${suffixOf(d.slug)}-mn`, service: null, tier: 'C', fate: 'redirect', status: 'retired', redirectTo: `/location/chimney-sweep-fireplace-in-${suffixOf(d.slug)}-mn/`, legacyPostId: d.id, gscClicks: keep.get(d.slug)?.clicks ?? 0, source: 'duplicate-city-page' });
  }
  const universe = new Set([...rows.keys(), ...redirects.keys(), ...gone]);
  const counts = { live: 0, gone: 0, redirect: 0, keepA: 0, keepB: 0, keepC: 0, service: 0, legacy: 0, legacyNoCity: 0, cityPageRedirectIgnored: 0 };
  for (const slug of universe) {
    if (pages.has(slug)) continue;
    const { citySlug, serviceKey } = classify(slug);
    const kind = serviceKey ? 'service' : 'legacy';
    const legacyPostId = rows.get(slug)?.id ?? null;
    if (legacyPostId) counts.live++;
    if (gone.has(slug)) {
      counts.gone++;
      add({ slug, kind, city: citySlug, service: serviceKey, tier: 'C', fate: 'gone', status: 'retired', redirectTo: null, legacyPostId, gscClicks: 0 });
    } else if (redirects.has(slug)) {
      counts.redirect++;
      add({ slug, kind, city: citySlug, service: serviceKey, tier: 'C', fate: 'redirect', status: 'retired', redirectTo: redirects.get(slug), legacyPostId, gscClicks: keep.get(slug)?.clicks ?? 0 });
    } else {
      const k = keep.get(slug);
      const tier = k?.tier === 'A' || k?.tier === 'C' ? k.tier : 'B';
      counts['keep' + tier]++;
      if (kind === 'service') counts.service++;
      else counts.legacy++;
      if (!citySlug) counts.legacyNoCity++;
      add({ slug, kind, city: citySlug, service: serviceKey, tier, fate: tier === 'A' ? 'publish_verbatim' : 'regenerate', status: 'published', redirectTo: null, legacyPostId, gscClicks: k?.clicks ?? 0 });
    }
  }
  counts.cityPageRedirectIgnored = cityRows.filter((r) => redirects.has(r.slug) && !dupSlugs.has(r.slug)).length;

  const out = {
    generatedAt: DRY ? undefined : new Date().toISOString(),
    sources: { jsonl: path.relative(ROOT, JSONL), rebuild: path.relative(ROOT, REBUILD), pricing: 'site/data/pricing.json', stateCopy: 'site/data/content/hubs/state-mn.md' },
    state,
    prices,
    branches: branches.sort((a, b) => a.name.localeCompare(b.name)),
    cities,
    pages: [...pages.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
  };

  const summary = {
    legacyRowsRead: rows.size,
    branches: branches.length,
    cities: cities.length,
    branchCities: cities.filter((c) => c.kind === 'branch').length,
    coverageCities: cities.filter((c) => c.kind === 'coverage' && !c.noCityPage).length,
    citiesWithoutCityPage: cities.filter((c) => c.noCityPage).length,
    citiesGeocoded: cities.filter((c) => c.coordsSource === 'nominatim').length,
    citiesWithoutCoords: cities.filter((c) => !c.lat).length,
    duplicateCityPagesRedirected: duplicates.map((d) => d.slug),
    pages: out.pages.length,
    ...counts,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (DRY) return;
  fs.writeFileSync(GEOCACHE, JSON.stringify(geocache, null, 2) + '\n');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log(`wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB) and ${path.relative(ROOT, GEOCACHE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
