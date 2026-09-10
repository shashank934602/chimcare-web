// Minnesota legacy URL audit — REPORT ONLY.
//
// Reads the WordPress dumps (SELECT-only, produced separately), the agent dataset, the pilot URL
// universe and the business fate maps, and emits one record for every Minnesota legacy URL.
//
// This script changes nothing: no writes to WordPress, no writes to any seed or ledger, no
// publication, no reseal of the regression baseline. It writes exactly two files, both reports.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const REBUILD = path.resolve(ROOT, '../chimcare-rebuild-main');
const DUMPS = process.env.WP_DUMPS;

const readJson = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d);
const NA = 'NOT_APPLICABLE';
const MISSING = 'SOURCE_MISSING';

// ---- 1. load WordPress dumps ------------------------------------------------------------------

function loadTsv(file, cols) {
  const out = [];
  const text = fs.readFileSync(path.join(DUMPS, file), 'utf8');
  for (const line of text.split('\n')) {
    if (!line) continue;
    const parts = line.split('\t');
    const row = {};
    cols.forEach((c, i) => { row[c] = parts[i] === 'NULL' || parts[i] === undefined ? null : parts[i]; });
    out.push(row);
  }
  return out;
}

const wpPosts = loadTsv('wp_posts.tsv', ['id', 'type', 'status', 'slug', 'title', 'parent', 'date', 'modified']);
const wpMetaRows = loadTsv('wp_meta.tsv', ['postId', 'key', 'value']);
const wpTaxRows = loadTsv('wp_tax.tsv', ['objectId', 'taxonomy', 'termName', 'termSlug']);

const postById = new Map();
const postBySlug = new Map();          // published job_listing only — the live URL space
const allPostsBySlug = new Map();
for (const p of wpPosts) {
  postById.set(p.id, p);
  if (!allPostsBySlug.has(p.slug)) allPostsBySlug.set(p.slug, p);
  if (p.type === 'job_listing' && p.status === 'publish' && !postBySlug.has(p.slug)) postBySlug.set(p.slug, p);
}

const metaByPost = new Map();
for (const m of wpMetaRows) {
  let bag = metaByPost.get(m.postId);
  if (!bag) { bag = {}; metaByPost.set(m.postId, bag); }
  // WordPress resolves duplicate keys by lowest meta_id; the dump is in meta_id order, so keep first.
  if (!(m.key in bag)) bag[m.key] = m.value;
}
const meta = (id, key) => (id && metaByPost.get(String(id)) ? metaByPost.get(String(id))[key] ?? null : null);

const taxByPost = new Map();
for (const t of wpTaxRows) {
  let bag = taxByPost.get(t.objectId);
  if (!bag) { bag = []; taxByPost.set(t.objectId, bag); }
  bag.push(t);
}

// ---- 2. load datasets and business fate maps ---------------------------------------------------

const pilot = readJson(path.join(ROOT, 'data/seed/minnesota.generated.json'));
const agent = readJson(path.join(ROOT, 'data/seed/mn.migration.json'));
const services = readJson(path.join(ROOT, 'data/seed/services.json'), null);

const lastSeg = (p) => String(p).replace(/\/+$/, '').split('/').pop();

const keepAll = readJson(path.join(REBUILD, 'site/data/keep-pages.json'), []);
const keepMn = new Map(keepAll.filter((k) => k.state === 'mn').map((k) => [lastSeg(k.path), k]));
const redirectsRaw = readJson(path.join(REBUILD, 'site/data/redirects.json'), {});
const redirectMnEntries = Object.entries(redirectsRaw).filter(([a]) => /-mn(-\d+)?\/?$/.test(a));
const redirectMn = new Map(redirectMnEntries.map(([a, b]) => [lastSeg(a), b]));
const goneRaw = readJson(path.join(REBUILD, 'site/data/gone.json'), []);
const goneMn = new Set(goneRaw.filter((g) => /-mn(-\d+)?\/?$/.test(g)).map(lastSeg));

// How many distinct source paths collapsed onto each last segment — the P12 mechanism, measured.
const redirectKeyCollisions = new Map();
for (const [a] of redirectMnEntries) {
  const k = lastSeg(a);
  let bag = redirectKeyCollisions.get(k);
  if (!bag) { bag = []; redirectKeyCollisions.set(k, bag); }
  bag.push(a);
}

const cityBySlug = new Map(agent.cities.map((c) => [c.slug, c]));
const branchBySlug = new Map(agent.branches.map((b) => [b.slug, b]));

// The 16 cities the business serves that WordPress has no city page for. They live in the pilot
// dataset only; they get city rows and NO page row, so they own no city URL of their own. Their
// live service URLs still resolve, which is why they must be resolvable here.
const noSourceCities = (pilot.cities || []).filter((c) => !cityBySlug.has(c.slug));
const noSourceBySlug = new Map(noSourceCities.map((c) => [c.slug, c]));
const isNoSource = (slug) => noSourceBySlug.has(slug);

// ---- 3. the publishability gate, re-run exactly as the seed runs it -----------------------------

function gateFor(c) {
  const missing = [];
  if (!c.derived.branch) missing.push('serving branch');
  if (c.source.neighborhoods.length < 4) missing.push(`areas (${c.source.neighborhoods.length}/4)`);
  const specifics = Object.values(c.source.localSpecifics || {}).filter(Boolean).length;
  if (specifics < 2) missing.push(`local specifics (${specifics}/2)`);
  if (!c.source.hero?.imageKey) missing.push('hero image');
  if (c.source.faqs.length < 1) missing.push('city-specific FAQ');
  return { ok: missing.length === 0, missing };
}
const gateByCity = new Map(agent.cities.map((c) => [c.slug, gateFor(c)]));

// ---- 4. build one record per legacy URL ---------------------------------------------------------

const SERVICE_KEYS = new Set((services?.services || []).map((s) => s.key));

function seoFor(wpId) {
  if (!wpId) return { record: 'NO_WP_POST', title: NA, metaDescription: NA, canonical: NA, robots: NA,
    ogTitle: NA, ogDescription: NA, ogImage: NA, twitterTitle: NA, twitterDescription: NA };
  const t = meta(wpId, '_yoast_wpseo_title');
  const d = meta(wpId, '_yoast_wpseo_metadesc');
  const c = meta(wpId, '_yoast_wpseo_canonical');
  const ni = meta(wpId, '_yoast_wpseo_meta-robots-noindex');
  const nf = meta(wpId, '_yoast_wpseo_meta-robots-nofollow');
  return {
    record: t || d || c ? 'SOURCE_PRESENT' : 'SOURCE_MISSING',
    title: t ?? MISSING,
    metaDescription: d ?? MISSING,
    canonical: c ?? MISSING,
    robots: ni || nf ? `noindex=${ni ?? '0'};nofollow=${nf ?? '0'}` : MISSING,
    // Yoast stores no OG or Twitter columns anywhere in this database; it templates them at
    // request time. Recorded as absent from source, never generated here.
    ogTitle: MISSING, ogDescription: MISSING, ogImage: MISSING,
    twitterTitle: MISSING, twitterDescription: MISSING,
  };
}

function mediaFor(city, wpId) {
  const h = city?.source?.hero;
  if (h) {
    return { state: 'MIGRATED', attachmentId: h.attachmentId, filename: h.filename, extension: h.extension,
      mime: h.mime, filesize: h.filesize, width: h.width, height: h.height, title: h.title,
      alt: h.alt ?? MISSING, caption: h.caption ?? MISSING, description: h.description ?? MISSING,
      sourceUrl: h.sourceUrl, imageKey: h.imageKey, sha256: h.sha256, usedByPages: h.usedByPages,
      onDisk: fs.existsSync(path.join(ROOT, 'public', h.imageKey)) };
  }
  const thumb = meta(wpId, '_thumbnail_id');
  if (thumb) {
    const att = postById.get(String(thumb));
    return { state: 'SOURCE_ONLY_NOT_MIGRATED', attachmentId: Number(thumb),
      filename: meta(thumb, '_wp_attached_file') ? lastSeg(meta(thumb, '_wp_attached_file')) : MISSING,
      extension: MISSING, mime: MISSING, filesize: MISSING, width: MISSING, height: MISSING,
      title: att?.title ?? MISSING, alt: meta(thumb, '_wp_attachment_image_alt') ?? MISSING,
      caption: MISSING, description: MISSING,
      sourceUrl: meta(thumb, '_wp_attached_file') ? `https://www.chimcare.com/wp-content/uploads/${meta(thumb, '_wp_attached_file')}` : MISSING,
      imageKey: null, sha256: MISSING, usedByPages: null, onDisk: false };
  }
  return { state: 'NOT_PRESENT', attachmentId: null, filename: NA, extension: NA, mime: NA, filesize: NA,
    width: NA, height: NA, title: NA, alt: NA, caption: NA, description: NA, sourceUrl: NA,
    imageKey: null, sha256: NA, usedByPages: null, onDisk: false };
}

const records = [];
for (const row of pilot.pages) {
  const slug = row.slug;
  const legacyUrl = `/location/${slug}/`;
  const wpId = row.legacyPostId ? String(row.legacyPostId) : null;
  const post = wpId ? postById.get(wpId) : null;
  const livePost = postBySlug.get(slug) || null;
  const city = row.city ? cityBySlug.get(row.city) : null;
  const noSrc = row.city && !city ? noSourceBySlug.get(row.city) : null;
  const gate = city ? gateByCity.get(city.slug) : null;
  const branchSlug = city?.derived?.branch ?? noSrc?.branch ?? null;
  const branch = branchSlug ? branchBySlug.get(branchSlug) : null;

  // --- handling: one category per URL, never collapsed -----------------------------------------
  let handling, reason, runtime, destination = null;
  if (row.fate === 'redirect') {
    handling = 'REDIRECT';
    destination = row.redirectTo;
    reason = row.source === 'duplicate-city-page' ? 'Duplicate of a branch city page; retired under the duplicate rule'
      : row.source === 'wordpress-redirect' ? 'WordPress recorded an earlier slug for this page'
      : 'Approved business redirect map';
    runtime = '308 permanent redirect';
  } else if (row.fate === 'gone') {
    handling = 'GONE';
    reason = 'Listed in the approved gone map; retired deliberately';
    runtime = '404 in app, 410 at the edge in production';
  } else if (row.kind === 'city') {
    if (gate && gate.ok) { handling = 'PAGE'; destination = legacyUrl; reason = 'Source complete; passes the distinctness gate'; runtime = '200 city page'; }
    else { handling = 'REVIEW'; reason = gate ? `Blocked by the distinctness gate: missing ${gate.missing.join(', ')}` : 'No agent record for this city'; runtime = '404 publicly; visible at /admin/preview/'; }
  } else if (row.kind === 'service') {
    destination = legacyUrl;
    if (noSrc) {
      handling = 'COVERAGE_ONLY';
      reason = 'Live service URL in a city WordPress has no city page for; the city row exists so this URL keeps resolving, and the city itself owns no URL';
      runtime = '200 service page; the city has no city page';
    } else {
      handling = 'SERVICE_PAGE';
      reason = 'Service page derived from the city record and the 92-service catalogue';
      runtime = '200 service page';
    }
  } else if (row.kind === 'legacy') {
    handling = 'LEGACY_NOT_MIGRATED';
    reason = row.city
      ? 'Live WordPress URL whose service is outside the 92-service catalogue; no page kind resolves it'
      : 'Live WordPress URL whose slug resolves to no known Minnesota city';
    runtime = '404 — the dispatcher has no branch for kind=legacy';
  } else { handling = 'OTHER'; reason = 'Unclassified'; runtime = 'UNKNOWN'; }

  // --- URL fidelity ------------------------------------------------------------------------------
  let fidelity;
  if (handling === 'PAGE' || handling === 'SERVICE_PAGE' || handling === 'COVERAGE_ONLY') fidelity = 'EXACT';
  else if (handling === 'REDIRECT') fidelity = row.source === 'duplicate-city-page' ? 'DUPLICATE_RULE' : 'APPROVED_REDIRECT';
  else if (handling === 'REVIEW') fidelity = 'REVIEW';
  else if (handling === 'GONE') fidelity = 'APPROVED_GONE';
  else if (handling === 'LEGACY_NOT_MIGRATED') fidelity = 'LIVE_SOURCE_NO_DESTINATION';
  else fidelity = 'OTHER';

  const seo = seoFor(wpId);
  const media = mediaFor(city, wpId);
  const tax = wpId ? (taxByPost.get(wpId) || []) : [];
  const region = tax.find((t) => t.taxonomy === 'job_listing_region');
  const cats = tax.filter((t) => t.taxonomy === 'job_listing_category').map((t) => t.termName);

  records.push({
    legacyUrl,
    slug,
    normalizedPath: legacyUrl,
    wp: {
      postId: wpId ? Number(wpId) : null,
      postType: post?.type ?? (wpId ? 'ID_NOT_IN_DUMP' : 'NOT_PRESENT'),
      postStatus: post?.status ?? (wpId ? 'ID_NOT_IN_DUMP' : 'NOT_PRESENT'),
      title: post?.title ?? (wpId ? 'ID_NOT_IN_DUMP' : 'NOT_PRESENT'),
      slug: post?.slug ?? (wpId ? 'ID_NOT_IN_DUMP' : 'NOT_PRESENT'),
      modified: post?.modified ?? null,
      slugMatchesLegacy: post ? post.slug === slug : (wpId ? false : NA),
      liveAtThisSlug: !!livePost,
      liveSlugPostId: livePost ? Number(livePost.id) : null,
      oldSlug: wpId ? (meta(wpId, '_wp_old_slug') ?? MISSING) : NA,
      jobLocation: wpId ? (meta(wpId, '_job_location') ?? MISSING) : NA,
    },
    taxonomy: { region: region ? region.termName : MISSING, categories: cats.length ? cats : MISSING },
    city: city ? { slug: city.slug, name: city.name, kind: city.kind,
                   sourceStatus: gate.ok ? 'SOURCE_PAGE_PUBLISHABLE' : 'SOURCE_PAGE_INCOMPLETE',
                   ownCityUrl: `/location/${city.slug}/`, hubHref: gate.ok ? `/location/${city.slug}/` : null }
               : noSrc ? { slug: noSrc.slug, name: noSrc.name, kind: noSrc.kind,
                   sourceStatus: 'NO_SOURCE_PAGE', ownCityUrl: null, hubHref: null }
               : (row.city ? { slug: row.city, name: MISSING, kind: MISSING, sourceStatus: 'NO_AGENT_RECORD', ownCityUrl: null, hubHref: null } : null),
    state: { code: 'MN', name: 'Minnesota', identifiedBy: 'SLUG_PATTERN', provenance: 'DERIVED' },
    pageType: row.kind,
    fate: row.fate,
    tier: row.tier,
    status: row.status,
    handling,
    destinationUrl: destination,
    runtimeBehavior: runtime,
    reason,
    urlFidelity: fidelity,
    sourceUrl: livePost ? `https://www.chimcare.com/location/${slug}/` : (post ? `https://www.chimcare.com/location/${post.slug}/` : 'NOT_PRESENT'),
    sourceUrlExact: livePost ? 'EXACT' : (wpId && post ? (post.slug === slug ? 'EXACT' : 'SLUG_DIFFERS') : 'NO_LIVE_SOURCE_URL'),
    sourceContent: {
      available: !!livePost,
      checksum: city?.checksums?.source ?? (livePost ? 'NOT_COMPUTED_FOR_NON_CITY_URL' : NA),
      contentChecksum: city?.checksums?.content ?? NA,
    },
    seo,
    structuredData: handling === 'PAGE' || handling === 'SERVICE_PAGE' || handling === 'COVERAGE_ONLY' ? 'DERIVED_FROM_MIGRATED_FIELDS' : NA,
    localSeo: branch ? ((city ?? noSrc)?.kind === 'branch' ? 'FULL_ADDRESS_AND_PHONE' : 'PHONE_ONLY_SERVED_FROM_BRANCH') : NA,
    media,
    cityRelationship: row.city ? (city ? 'RESOLVED' : noSrc ? 'RESOLVED_NO_SOURCE_CITY' : 'CITY_SLUG_WITH_NO_AGENT_RECORD') : 'NO_CITY_LINK',
    branchRelationship: branch ? 'RESOLVED' : (city || noSrc ? 'NO_SERVING_BRANCH' : NA),
    servingBranch: branch ? branch.name : (city || noSrc ? MISSING : NA),
    branchDerivation: city?.derived?.branchAssignment ?? noSrc?.branchAssignment ?? NA,
    branchDistanceKm: city?.derived?.distanceKm ?? NA,
    coordinates: city ? { lat: city.derived.lat, lng: city.derived.lng, provenance: city.derived.coordsSource ?? MISSING }
      : noSrc ? { lat: noSrc.lat, lng: noSrc.lng, provenance: noSrc.coordsSource ?? MISSING } : NA,
    flags: city ? city.flags.map((f) => ({ code: f.code, category: f.category, detail: f.detail })) : [],
    provenance: {
      wpFields: 'SOURCE',
      cityName: 'SOURCE',
      coordinates: city?.derived?.coordsSource === 'geocoder' ? 'DERIVED' : (city ? 'SOURCE' : NA),
      servingBranch: city ? 'DERIVED' : NA,
      tier: 'APPROVED_RULE (keep-pages.json)',
      fate: row.fate === 'redirect' || row.fate === 'gone' ? 'APPROVED_RULE (fate maps)' : 'APPROVED_RULE (keep-pages.json tier)',
      redirectTarget: row.fate === 'redirect' ? 'APPROVED_RULE' : NA,
      gateOutcome: 'DERIVED',
    },
    keepMapTier: keepMn.get(slug)?.tier ?? MISSING,
    gscClicks12m: row.gscClicks ?? 0,
    redirectKeyCollision: redirectKeyCollisions.get(slug)?.length > 1 ? redirectKeyCollisions.get(slug) : null,
    validation: null, // filled below
  });
}

// ---- 5. redirect graph audit --------------------------------------------------------------------

const bySlug = new Map(records.map((r) => [r.slug, r]));
const destSlug = (u) => (u ? lastSeg(u) : null);

const redirectAudit = { total: 0, singleHop: 0, chains: [], loops: [], selfRedirects: [], dangling: [], unpublishedTarget: [], crossState: [] };
for (const r of records) {
  if (r.handling !== 'REDIRECT') continue;
  redirectAudit.total++;
  const seen = [r.slug];
  let cur = destSlug(r.destinationUrl);
  let hops = 0;
  let finalTarget = cur;
  let loop = false;
  while (cur && hops < 12) {
    if (seen.includes(cur)) { loop = true; break; }
    seen.push(cur);
    const nxt = bySlug.get(cur);
    if (!nxt || nxt.handling !== 'REDIRECT') { finalTarget = cur; break; }
    cur = destSlug(nxt.destinationUrl);
    finalTarget = cur;
    hops++;
  }
  r.redirectFinalTarget = finalTarget ? `/location/${finalTarget}/` : null;
  r.redirectHops = hops + 1;
  if (loop) { redirectAudit.loops.push({ slug: r.slug, path: seen }); r.validation = 'FAIL_REDIRECT_LOOP'; }
  if (destSlug(r.destinationUrl) === r.slug) redirectAudit.selfRedirects.push(r.slug);
  if (hops > 0 && !loop) redirectAudit.chains.push({ slug: r.slug, hops: hops + 1, path: seen });
  if (hops === 0 && !loop) redirectAudit.singleHop++;

  const target = bySlug.get(destSlug(r.destinationUrl));
  if (!target) {
    redirectAudit.dangling.push({ slug: r.slug, target: r.destinationUrl });
    r.targetState = /-mn\/?$/.test(String(r.destinationUrl)) ? 'MN' : 'NOT_MINNESOTA';
    if (r.targetState === 'NOT_MINNESOTA') redirectAudit.crossState.push({ slug: r.slug, target: r.destinationUrl });
    r.targetStatus = 'TARGET_NOT_IN_MINNESOTA_UNIVERSE';
    r.validation = r.validation || 'FAIL_DANGLING_TARGET';
  } else {
    r.targetState = 'MN';
    r.targetStatus = target.handling;
    if (target.handling === 'REVIEW' || target.status !== 'published') {
      redirectAudit.unpublishedTarget.push({ slug: r.slug, target: target.slug, targetHandling: target.handling });
      r.validation = r.validation || 'REDIRECT_PENDING_TARGET';
    }
  }
  if (!r.validation) r.validation = 'PASS';
}

// ---- 6. per-URL validation for the non-redirect categories --------------------------------------

for (const r of records) {
  if (r.validation) continue;
  const checks = [];
  if (r.handling === 'PAGE') {
    if (!r.wp.liveAtThisSlug) checks.push('source URL not live in WordPress');
    if (r.wp.postId && r.wp.slugMatchesLegacy !== true) checks.push('WP slug differs from legacy slug');
    if (r.media.state !== 'MIGRATED') checks.push('no migrated media');
    if (!r.media.onDisk) checks.push('media file not on disk');
    if (r.cityRelationship !== 'RESOLVED') checks.push('city not resolved');
    if (r.branchRelationship !== 'RESOLVED') checks.push('branch not resolved');
    r.validation = checks.length ? 'FAIL: ' + checks.join('; ') : 'PASS';
  } else if (r.handling === 'SERVICE_PAGE') {
    r.validation = r.cityRelationship === 'RESOLVED' ? 'PASS' : 'FAIL: city not resolved';
  } else if (r.handling === 'COVERAGE_ONLY') {
    r.validation = r.cityRelationship === 'RESOLVED_NO_SOURCE_CITY' ? 'PASS_COVERAGE_ONLY' : 'FAIL: no-source city not resolved';
  } else if (r.handling === 'REVIEW') {
    r.validation = 'PASS_WITHHELD'; // correctly withheld, not a failure
  } else if (r.handling === 'GONE') {
    r.validation = 'PASS_RETIRED';
  } else if (r.handling === 'LEGACY_NOT_MIGRATED') {
    r.validation = r.status === 'published' ? 'WARN_PUBLISHED_BUT_404' : 'PASS_RETIRED';
  } else {
    r.validation = 'UNCLASSIFIED';
  }
}

// ---- 7. aggregates -------------------------------------------------------------------------------

const tally = (arr, fn) => { const m = {}; for (const x of arr) { const k = fn(x); m[k] = (m[k] || 0) + 1; } return m; };
const summary = {
  totalUrls: records.length,
  uniqueUrls: new Set(records.map((r) => r.slug)).size,
  duplicateUrls: records.length - new Set(records.map((r) => r.slug)).size,
  unhandled: records.filter((r) => r.handling === 'OTHER').length,
  invalid: records.filter((r) => !/^[a-z0-9-]+$/.test(r.slug)).length,
  crossStateUrls: records.filter((r) => !/-mn(-\d+)?$/.test(r.slug)).length,
  byHandling: tally(records, (r) => r.handling),
  byFate: tally(records, (r) => r.fate),
  byPageType: tally(records, (r) => r.pageType),
  byTier: tally(records, (r) => r.tier),
  byStatus: tally(records, (r) => r.status),
  byFidelity: tally(records, (r) => r.urlFidelity),
  byValidation: tally(records, (r) => String(r.validation).split(':')[0]),
  withWpPostId: records.filter((r) => r.wp.postId).length,
  withoutWpPostId: records.filter((r) => !r.wp.postId).length,
  liveInWordPress: records.filter((r) => r.wp.liveAtThisSlug).length,
  notLiveInWordPress: records.filter((r) => !r.wp.liveAtThisSlug).length,
  redirect: { total: redirectAudit.total, singleHop: redirectAudit.singleHop,
    chains: redirectAudit.chains.length, loops: redirectAudit.loops.length,
    selfRedirects: redirectAudit.selfRedirects.length, dangling: redirectAudit.dangling.length,
    pendingTarget: redirectAudit.unpublishedTarget.length, crossState: redirectAudit.crossState.length },
};

// city-level rollup
const cityRollup = new Map();
for (const r of records) {
  const key = r.city?.slug ?? '(no city link)';
  let c = cityRollup.get(key);
  if (!c) { c = { city: key, cityName: r.city?.name ?? null, sourceStatus: r.city?.sourceStatus ?? 'NO_CITY_LINK', urls: 0, PAGE: 0, REDIRECT: 0, REVIEW: 0, GONE: 0, SERVICE_PAGE: 0, COVERAGE_ONLY: 0, LEGACY_NOT_MIGRATED: 0, OTHER: 0 }; cityRollup.set(key, c); }
  c.urls++; c[r.handling] = (c[r.handling] || 0) + 1;
}

const out = {
  generatedAt: new Date().toISOString(),
  reportOnly: true,
  wordpressAccess: 'SELECT only — no UPDATE, INSERT or DELETE was issued',
  sources: {
    urlUniverse: 'data/seed/minnesota.generated.json (pilot builder; fate maps + 2.4GB export)',
    cityDetail: 'data/seed/mn.migration.json (migration agent; WordPress SELECT + GET)',
    wordpress: 'wp_posts / wp_postmeta / wp_term_relationships dumps, SELECT only',
    fateMaps: '../chimcare-rebuild-main/site/data/{keep-pages,redirects,gone}.json',
  },
  summary,
  redirectAudit,
  cityRollup: [...cityRollup.values()].sort((a, b) => b.urls - a.urls),
  branches: agent.branches,
  noSourceCities: noSourceCities.map((c) => ({ slug: c.slug, name: c.name })),
  records,
};

const auditDir = path.join(ROOT, 'data/audits');
fs.mkdirSync(auditDir, { recursive: true });
fs.writeFileSync(path.join(auditDir, 'mn-url-audit.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote data/audits/mn-url-audit.json  records=' + records.length);
console.log(JSON.stringify(summary, null, 1));

if (import.meta.url === pathToFileURL(process.argv[1]).href) { /* entrypoint */ }
export { out };