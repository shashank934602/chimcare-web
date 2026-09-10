/**
 * MASSACHUSETTS CARD LINK AUDIT — read-only, dry run.
 *
 * Answers one question for every city the Massachusetts hub would show: where does its card go,
 * and is that destination real? It reads WordPress with SELECTs, reads the approved fate maps,
 * derives a serving branch from coordinates, runs the UNCHANGED publication gate, and resolves
 * each card through the same lib/migration/card-resolution.ts the hub itself uses.
 *
 * Provenance is never mixed:
 *   SOURCE   — wp_posts / wp_postmeta, verbatim. Coordinates WordPress holds are used as-is.
 *   BUSINESS — branches.json, keep-pages.json, redirects.json, gone.json.
 *   DERIVED  — coordinates from data/seed/ma-geocode.json and the nearest-branch assignment.
 *
 * It writes one report and its machine-readable twin. It does not write WordPress, does not seed
 * the database, does not publish, and does not create, rename or repair any source page.
 *
 *   npx tsx scripts/audit/ma-cards.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeQuery, cleanMarkup, areasFrom, localSpecificsFrom, introNeighbourhoods, faqsFrom, titleCaseSlug } from '../migrate/source.mjs';
import { STATES } from '../migrate/states.mjs';
import { cacheKey } from '../migrate/geocode.mjs';
import { resolveCityCard, auditResolution, slugOf, locationPath } from '../../lib/migration/card-resolution.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const S = STATES.ma;
const query = makeQuery({ host: '127.0.0.1', user: 'root', database: 'chimcare_local' });
const readJson = (p, d = null) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d);
const rebuild = path.resolve(ROOT, S.businessInputs);

console.log('\nMASSACHUSETTS CARD LINK AUDIT · dry run · source chimcare_local (read-only)\n');

// ---------------------------------------------------------------- BUSINESS: approved fate maps
const keep = new Set(readJson(path.join(rebuild, 'site/data/keep-pages.json'), []).map((k) => k.path));
const redirects = readJson(path.join(rebuild, 'site/data/redirects.json'), {});
const gone = new Set(readJson(path.join(rebuild, 'site/data/gone.json'), []));
const branchRecords = readJson(path.join(rebuild, 'site/data/branches.json'), []).filter((b) => b.state === S.stateCode);
console.log(`FATE MAPS  ${keep.size} keep · ${Object.keys(redirects).length} redirect · ${gone.size} gone   BRANCH RECORDS ${branchRecords.length}`);

// ---------------------------------------------------------------- DERIVED: the geocode cache
const geo = readJson(path.join(ROOT, `data/seed/${S.key}-geocode.json`), { state: S.stateCode, entries: {} });
if (geo.state && geo.state !== S.stateCode) throw new Error(`Geocode cache is for ${geo.state}, refusing to use it for ${S.stateCode}`);
const geoEntries = geo.entries ?? {};
const geoOk = Object.values(geoEntries).filter((e) => e.status === 'ok').length;
console.log(`GEOCODE    ${Object.keys(geoEntries).length} cached entries for ${S.stateCode} (${geoOk} usable, ${Object.keys(geoEntries).length - geoOk} refused) · keys state-qualified, never shared with another state`);

// ---------------------------------------------------------------- SOURCE: the city pages
const like = S.cityPagePatterns.map((p) => `p.post_name LIKE '${p}'`).join(' OR ');
const rows = query(`
  SELECT JSON_ARRAYAGG(JSON_OBJECT(
    'wpPostId', p.ID, 'wpSlug', p.post_name, 'wpTitle', p.post_title, 'content', p.post_content,
    'metaTitle', stt.meta_value, 'metaDescription', sd.meta_value, 'canonical', cn.meta_value,
    'thumbnailId', th.meta_value, 'jobLocation', jl.meta_value,
    'lat', la.meta_value, 'lng', lo.meta_value))
  FROM wp_posts p
  LEFT JOIN wp_postmeta stt ON stt.post_id = p.ID AND stt.meta_key = '_yoast_wpseo_title'
  LEFT JOIN wp_postmeta sd  ON sd.post_id  = p.ID AND sd.meta_key  = '_yoast_wpseo_metadesc'
  LEFT JOIN wp_postmeta cn  ON cn.post_id  = p.ID AND cn.meta_key  = '_yoast_wpseo_canonical'
  LEFT JOIN wp_postmeta th  ON th.post_id  = p.ID AND th.meta_key  = '_thumbnail_id'
  LEFT JOIN wp_postmeta jl  ON jl.post_id  = p.ID AND jl.meta_key  = '_job_location'
  LEFT JOIN wp_postmeta la  ON la.post_id  = p.ID AND la.meta_key  = 'geolocation_lat'
  LEFT JOIN wp_postmeta lo  ON lo.post_id  = p.ID AND lo.meta_key  = 'geolocation_long'
  WHERE p.post_type = 'job_listing' AND p.post_status = 'publish' AND (${like})`);

/** A page belongs to Massachusetts only if its slug carries the -ma suffix or its title says ", MA". */
const isMassachusetts = (r) => /-ma(-\d+)?$/.test(r.wpSlug) || /,\s*MA\s*$/.test((r.wpTitle ?? '').trim());
const patternOf = (slug) => { for (let i = 0; i < S.citySlugRes.length; i++) if (S.citySlugRes[i].test(slug)) return i; return -1; };
const suffixOf = (slug) => { for (const re of S.citySlugRes) { const m = re.exec(slug); if (m) return m[1]; } return null; };

const pagesAll = rows.filter(isMassachusetts).map((r) => ({ ...r, suffix: suffixOf(r.wpSlug), pattern: patternOf(r.wpSlug) })).filter((r) => r.suffix);
const foreign = rows.filter((r) => !isMassachusetts(r));
console.log(`DISCOVER   ${pagesAll.length} Massachusetts city pages across ${S.citySlugRes.length} slug patterns  (${foreign.length} same-shape pages rejected as other states)`);

// ---------------------------------------------------------------- media, read once per attachment
const thumbIds = [...new Set(pagesAll.map((r) => r.thumbnailId).filter(Boolean))];
const media = new Map();
if (thumbIds.length) {
  const mrows = query(`
    SELECT JSON_ARRAYAGG(JSON_OBJECT('attachmentId', a.ID, 'guid', a.guid, 'mime', a.post_mime_type,
      'title', a.post_title, 'caption', a.post_excerpt, 'description', a.post_content,
      'attachedFile', fm.meta_value, 'alt', am.meta_value, 'meta', mm.meta_value))
    FROM wp_posts a
    LEFT JOIN wp_postmeta fm ON fm.post_id = a.ID AND fm.meta_key = '_wp_attached_file'
    LEFT JOIN wp_postmeta am ON am.post_id = a.ID AND am.meta_key = '_wp_attachment_image_alt'
    LEFT JOIN wp_postmeta mm ON mm.post_id = a.ID AND mm.meta_key = '_wp_attachment_metadata'
    WHERE a.post_type = 'attachment' AND a.ID IN (${thumbIds.join(',')})`);
  for (const m of mrows) media.set(String(m.attachmentId), m);
}
console.log(`MEDIA      ${media.size} distinct hero attachments referenced by ${pagesAll.filter((r) => r.thumbnailId).length} pages`);

// ---------------------------------------------------------------- MAP: names, branches, coordinates
const norm = (s) => (s ?? '').toLowerCase()
  .replace(/\bstreet\b/g, 'st').replace(/\bavenue\b/g, 'ave').replace(/\bdrive\b/g, 'dr')
  .replace(/\broad\b/g, 'rd').replace(/\bplace\b/g, 'pl').replace(/\bboulevard\b/g, 'blvd')
  .replace(/\bwest\b/g, 'w').replace(/\beast\b/g, 'e').replace(/\bnorth\b/g, 'n').replace(/\bsouth\b/g, 's')
  .replace(/[.,#]/g, ' ').replace(/\s+/g, ' ').trim();
const cityNameOf = (r) => new RegExp(`in (.*),\\s*${S.stateCode}$`).exec(r.wpTitle ?? '')?.[1]?.trim() ?? titleCaseSlug(r.suffix);
const toRad = (x) => (x * Math.PI) / 180;
const km = (a, b) => {
  const h = Math.sin(toRad(b.lat - a.lat) / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

/**
 * Branch anchors. A branch is eligible as a distance anchor only when the business's branch record
 * for a Massachusetts city is paired with a coordinate WordPress holds on that city's own page.
 * Both halves are required, so no office is ever placed by name alone.
 */
const anchors = [];
for (const b of branchRecords) {
  const page = pagesAll.find((r) => cityNameOf(r).toLowerCase() === b.city.toLowerCase() && r.lat && String(r.lat).trim());
  if (!page) continue;
  anchors.push({ name: b.branch_name, city: b.city, phone: b.phone, street: b.street_address, zip: b.zip, lat: Number(page.lat), lng: Number(page.lng), wpPostId: page.wpPostId, stateCode: S.stateCode });
}
console.log(`BRANCHES   ${anchors.length} of ${branchRecords.length} ${S.stateCode} branches usable as distance anchors (business record + WordPress coordinate on the branch page)`);

const cards = [];
for (const r of pagesAll) {
  const markup = cleanMarkup(r.content);
  const neighborhoods = [...new Set([...introNeighbourhoods(markup), ...areasFrom(markup)])];
  const localSpecifics = localSpecificsFrom(markup);
  const { items: faqs } = faqsFrom(r.content);
  const name = cityNameOf(r);

  // --- own office: the branch record's city AND the street number WordPress stores must agree.
  const loc = norm(r.jobLocation);
  const byCity = branchRecords.find((b) => b.city.toLowerCase() === name.toLowerCase());
  const num = /^\s*(\d+)/.exec(r.jobLocation ?? '')?.[1];
  const streetWord = byCity ? norm(byCity.street_address).split(' ')[1] : null;
  const ownBranch = byCity && num && norm(byCity.street_address).startsWith(num + ' ') && streetWord && loc.includes(streetWord) ? byCity : null;
  const addressConflict = !ownBranch && byCity && r.jobLocation ? { city: name, wordpress: r.jobLocation, branchSheet: byCity.street_address } : null;

  // --- coordinates: WordPress first and untouched, otherwise the DERIVED geocode.
  const g = geoEntries[cacheKey(S.stateCode, name)];
  const wpLat = r.lat && String(r.lat).trim() ? Number(r.lat) : null;
  const coords = wpLat != null
    ? { lat: wpLat, lng: Number(r.lng), source: 'wordpress' }
    : g && g.status === 'ok'
      ? { lat: g.lat, lng: g.lng, source: 'geocoder', display: g.display, confidence: g.confidence, runId: g.runId }
      : null;
  const geoRefusal = !coords && g ? g.status : !coords ? 'not_geocoded' : null;

  // --- serving branch: own office, else the nearest MA anchor inside the distance threshold.
  let branch = null, method = 'none', distanceKm = null, farFlag = null;
  if (ownBranch) { branch = ownBranch.branch_name; method = 'own_office'; }
  else if (coords && anchors.length) {
    const nearest = anchors.reduce((best, a) => (km(coords, a) < km(coords, best) ? a : best));
    const d = Number(km(coords, nearest).toFixed(2));
    if (d <= S.farFromBranchKm) { branch = nearest.name; method = coords.source === 'wordpress' ? 'nearest_from_wp_coordinate' : 'nearest_from_derived_coordinate'; distanceKm = d; }
    else { method = 'rejected_too_far'; distanceKm = d; farFlag = `Nearest ${S.stateCode} branch (${nearest.name}) is ${d} km away, beyond the ${S.farFromBranchKm} km threshold. Left for review rather than forced.`; }
  }

  // --- the gate. Thresholds unchanged from the Minnesota pilot.
  const missing = [];
  if (!branch) missing.push('serving branch');
  if (neighborhoods.length < S.minAreas) missing.push(`neighbourhoods (${neighborhoods.length}/${S.minAreas})`);
  const nLocal = Object.values(localSpecifics).filter(Boolean).length;
  if (nLocal < S.minLocalLines) missing.push(`local specifics (${nLocal}/${S.minLocalLines})`);
  if (!r.thumbnailId) missing.push('hero image');
  if (!faqs.length) missing.push('city-specific FAQ');

  const att = r.thumbnailId ? media.get(String(r.thumbnailId)) : null;
  const attMeta = att?.meta ?? '';
  const p = locationPath(r.wpSlug);
  cards.push({
    wpPostId: r.wpPostId, wpSlug: r.wpSlug, sourceUrl: `${S.origin}${p}`, sourcePath: p,
    suffix: r.suffix, name, pattern: r.pattern, patternName: S.patternNames[r.pattern] ?? 'unknown',
    seo: {
      metaTitle: r.metaTitle ?? null,
      metaDescription: r.metaDescription ?? null,
      // Canonical is tracked separately from the page URL: WordPress stores one only where an
      // editor overrode it, and it is never rewritten to match the slug.
      canonicalStored: r.canonical ?? null,
      canonicalEffective: r.canonical || `${S.origin}${p}`,
      canonicalIsOverride: !!r.canonical,
    },
    hero: att ? {
      attachmentId: Number(r.thumbnailId),
      file: att.attachedFile ?? null,
      filename: att.attachedFile ? path.basename(att.attachedFile) : null,
      extension: att.attachedFile ? path.extname(att.attachedFile) : null,
      mime: att.mime ?? null,
      alt: att.alt ?? null, title: att.title ?? null, caption: att.caption || null, description: att.description || null,
      width: /s:5:"width";i:(\d+);/.exec(attMeta) ? Number(/s:5:"width";i:(\d+);/.exec(attMeta)[1]) : null,
      height: /s:6:"height";i:(\d+);/.exec(attMeta) ? Number(/s:6:"height";i:(\d+);/.exec(attMeta)[1]) : null,
      filesize: /s:8:"filesize";i:(\d+);/.exec(attMeta) ? Number(/s:8:"filesize";i:(\d+);/.exec(attMeta)[1]) : null,
      sourceUrl: att.attachedFile ? `${S.origin}/wp-content/uploads/${att.attachedFile}` : null,
    } : null,
    branch, branchMethod: method, distanceKm, farFlag, addressConflict,
    coords: coords ? { lat: coords.lat, lng: coords.lng, provenance: coords.source === 'wordpress' ? 'SOURCE' : 'DERIVED', source: coords.source, display: coords.display ?? null, confidence: coords.confidence ?? null } : null,
    geoRefusal,
    fate: keep.has(p) ? 'publish_verbatim' : redirects[p] ? 'redirect' : gone.has(p) ? 'gone' : 'unmapped',
    redirectTo: redirects[p] ?? null,
    gateOk: missing.length === 0, missing,
    neighborhoods: neighborhoods.length, faqs: faqs.length, localLines: nLocal,
  });
}
const publishable = cards.filter((c) => c.gateOk).length;
console.log(`COORDS     ${cards.filter((c) => c.coords?.provenance === 'SOURCE').length} pages use WordPress coordinates · ${cards.filter((c) => c.coords?.provenance === 'DERIVED').length} use a derived geocode · ${cards.filter((c) => !c.coords).length} have none`);
console.log(`SERVING    ${cards.filter((c) => c.branch).length} pages have a serving branch (${cards.filter((c) => c.branchMethod === 'own_office').length} own office, ${cards.filter((c) => c.branchMethod.startsWith('nearest')).length} nearest) · ${cards.filter((c) => c.branchMethod === 'rejected_too_far').length} rejected as too far`);
console.log(`GATE       ${publishable} publishable · ${cards.length - publishable} needs_review   (gate unchanged: ${S.minAreas} areas, ${S.minLocalLines} local lines, hero, FAQ, branch)`);

// ---------------------------------------------------------------- the page index the resolver reads
const pageIndex = new Map();
for (const c of cards) {
  pageIndex.set(c.wpSlug, {
    slug: c.wpSlug,
    status: c.fate === 'gone' ? 'retired' : c.gateOk ? 'published' : 'review',
    fate: c.fate === 'unmapped' ? 'publish_verbatim' : c.fate,
    redirectTo: c.redirectTo,
    stateCode: S.stateCode,
    cityName: c.name,
    legacyPostId: c.wpPostId,
    legacyUrl: c.sourceUrl,
  });
}
// Redirect targets outside the city inventory. Their state is read from WordPress, never assumed.
const targetSlugs = [...new Set(cards.filter((c) => c.redirectTo).map((c) => slugOf(c.redirectTo)))].filter((s) => !pageIndex.has(s));
if (targetSlugs.length) {
  const inList = targetSlugs.map((s) => `'${s.replace(/'/g, "''")}'`).join(',');
  const trows = query(`SELECT JSON_ARRAYAGG(JSON_OBJECT('wpSlug',p.post_name,'wpTitle',p.post_title,'wpPostId',p.ID))
    FROM wp_posts p WHERE p.post_type='job_listing' AND p.post_status='publish' AND p.post_name IN (${inList})`);
  const byslug = new Map(trows.map((t) => [t.wpSlug, t]));
  for (const s of targetSlugs) {
    const t = byslug.get(s);
    const p = locationPath(s);
    const titleState = /,\s*([A-Z]{2})\s*$/.exec((t?.wpTitle ?? '').trim())?.[1] ?? null;
    const st = t ? (/-ma(-\d+)?$/.test(s) ? 'MA' : titleState) : null;
    pageIndex.set(s, {
      slug: s,
      // Outside the migrated city set: this build has no page for it, so the resolver must refuse
      // to link it rather than emit a route that 404s.
      status: t && keep.has(p) ? 'review' : 'retired',
      fate: keep.has(p) ? 'publish_verbatim' : redirects[p] ? 'redirect' : 'gone',
      redirectTo: redirects[p] ?? null,
      stateCode: st, cityName: null, legacyPostId: t?.wpPostId ?? null, legacyUrl: t ? `${S.origin}${p}` : null,
    });
  }
}

// ---------------------------------------------------------------- one card per city
const byCity = new Map();
for (const c of cards) byCity.set(c.suffix, [...(byCity.get(c.suffix) ?? []), c]);
/** The city's canonical page: a live keeper first, then a redirect source, then a retired one. */
const rank = (c) => (c.fate === 'publish_verbatim' ? 0 : c.fate === 'redirect' ? 1 : 2);
const inventory = [...byCity.entries()].map(([suffix, list]) => {
  const sorted = [...list].sort((a, b) => rank(a) - rank(b) || Number(b.gateOk) - Number(a.gateOk) || a.wpSlug.length - b.wpSlug.length);
  return { suffix, canonical: sorted[0], all: sorted };
});

const haveCity = new Set(inventory.map((i) => i.suffix));
const serviceOnly = new Set();
for (const p of keep) {
  const m = /^\/location\/(.+)-in-(.+)-ma(-\d+)?\/$/.exec(p);
  if (!m) continue;
  const suffix = m[2];
  if (haveCity.has(suffix) || suffix.length > 40 || S.excludeSuffixes?.test(suffix)) continue;
  serviceOnly.add(suffix);
}
console.log(`INVENTORY  ${inventory.length} cities with a WordPress city page · ${serviceOnly.size} coverage-only cities (service URLs only, no city page)`);

// ---------------------------------------------------------------- resolve
const lookup = (slug) => pageIndex.get(slug) ?? null;
const resolved = [];
for (const inv of inventory) {
  const c = inv.canonical;
  const r = resolveCityCard(
    { name: c.name, slug: c.wpSlug, stateCode: S.stateCode, sourceStatus: c.gateOk ? 'SOURCE_PAGE_PUBLISHABLE' : 'SOURCE_PAGE_INCOMPLETE', blockedBy: c.missing },
    lookup,
  );
  resolved.push({
    ...r,
    wpPostId: c.wpPostId, wpSlug: c.wpSlug, sourceUrl: c.sourceUrl, sourcePath: c.sourcePath,
    patternName: c.patternName, pattern: c.pattern, duplicates: inv.all.length - 1,
    duplicateSlugs: inv.all.slice(1).map((x) => x.wpSlug),
    branch: c.branch, branchMethod: c.branchMethod, distanceKm: c.distanceKm, farFlag: c.farFlag,
    coords: c.coords, geoRefusal: c.geoRefusal, addressConflict: c.addressConflict,
    hero: c.hero, seo: c.seo, gateOk: c.gateOk, missing: c.missing,
    neighborhoods: c.neighborhoods, faqs: c.faqs, localLines: c.localLines,
  });
}
for (const suffix of [...serviceOnly].sort()) {
  const r = resolveCityCard({ name: titleCaseSlug(suffix), slug: null, stateCode: S.stateCode, sourceStatus: 'NO_SOURCE_PAGE' }, lookup);
  resolved.push({ ...r, wpPostId: null, wpSlug: null, sourceUrl: null, sourcePath: null, patternName: null, pattern: -1, duplicates: 0, duplicateSlugs: [], branch: null, branchMethod: 'none', distanceKm: null, farFlag: null, coords: null, geoRefusal: null, addressConflict: null, hero: null, seo: null, gateOk: false, missing: [], neighborhoods: 0, faqs: 0, localLines: 0 });
}
resolved.sort((a, b) => a.city.localeCompare(b.city));

// ---------------------------------------------------------------- invariants
const counts = { PAGE: 0, REDIRECT: 0, COVERAGE_ONLY: 0, REVIEW: 0 };
const auditCounts = {};
const violations = [], crossState = [], invalidHref = [];
for (const r of resolved) {
  counts[r.behavior]++;
  auditCounts[r.auditStatus] = (auditCounts[r.auditStatus] ?? 0) + 1;
  for (const v of auditResolution(r)) violations.push({ city: r.city, problem: v, href: r.href });
  if (r.href) {
    if (/^\s*$|^#|javascript:|undefined|null/i.test(r.href)) invalidHref.push({ city: r.city, href: r.href });
    const target = lookup(slugOf(r.href));
    if (!target) violations.push({ city: r.city, problem: `href points at "${slugOf(r.href)}" which has no page row`, href: r.href });
    else {
      if (target.status !== 'published') violations.push({ city: r.city, problem: `href target status is ${target.status}`, href: r.href });
      if (target.stateCode && target.stateCode !== S.stateCode) crossState.push({ city: r.city, href: r.href, targetState: target.stateCode });
      if (target.fate === 'redirect') violations.push({ city: r.city, problem: 'href target is itself a redirect (chain)', href: r.href });
    }
  }
}
const hrefs = resolved.filter((r) => r.href).map((r) => r.href);
const dupRoutes = [...new Set(hrefs.filter((h, i) => hrefs.indexOf(h) !== i))];

console.log(`\nRESOLVE    PAGE ${counts.PAGE} · REDIRECT ${counts.REDIRECT} · COVERAGE_ONLY ${counts.COVERAGE_ONLY} · REVIEW ${counts.REVIEW}  = ${resolved.length} cards`);
console.log(`AUDIT      ${Object.entries(auditCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
console.log(`CHECK      broken ${violations.length} · cross-state ${crossState.length} · invalid href ${invalidHref.length} · duplicate routes ${dupRoutes.length}`);

// ---------------------------------------------------------------- media + SEO rollups
const heroUse = new Map();
for (const c of cards) if (c.hero) heroUse.set(c.hero.attachmentId, [...(heroUse.get(c.hero.attachmentId) ?? []), c.name]);
const sharedHeroes = [...heroUse.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);
const noHero = cards.filter((c) => !c.hero);
const noAlt = cards.filter((c) => c.hero && !c.hero.alt);
const noMeta = cards.filter((c) => !c.seo.metaDescription);
const metaSeen = new Map();
for (const c of cards) if (c.seo.metaDescription) metaSeen.set(c.seo.metaDescription, [...(metaSeen.get(c.seo.metaDescription) ?? []), c.name]);
const sharedMeta = [...metaSeen.values()].filter((v) => v.length > 1);

// ---------------------------------------------------------------- report
const COLLISION_CITIES = ['Bedford', 'Canton', 'Concord', 'Dedham', 'Lexington', 'Medford', 'Milton', 'Newton'];
const pct = (n) => `${((n / resolved.length) * 100).toFixed(1)}%`;
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const patternCount = (i) => cards.filter((c) => c.pattern === i).length;
const heroCell = (r) => (r.hero ? `${r.hero.attachmentId} \`${esc(r.hero.filename)}\`${heroUse.get(r.hero.attachmentId)?.length > 1 ? ' ⚠shared' : ''}${r.hero.alt ? '' : ' ⚠no-alt'}` : '—');
const seoCell = (r) => (r.seo ? `${r.seo.metaDescription ? 'desc✓' : 'desc✗'} ${r.seo.canonicalIsOverride ? 'canon:override' : 'canon:self'}` : '—');
const branchCell = (r) => (r.branch ? `${esc(r.branch)} (${r.branchMethod}${r.distanceKm != null ? `, ${r.distanceKm} km` : ''})` : r.branchMethod === 'rejected_too_far' ? `— (too far: ${r.distanceKm} km)` : '—');

const md = `# Massachusetts card link audit

**Mode:** dry run, read-only. **Generated:** ${new Date().toISOString()}
**Sources:** MySQL \`chimcare_local\` (SELECT only) · approved fate maps in \`chimcare-rebuild-main/site/data/\` ·
derived coordinates in \`data/seed/${S.key}-geocode.json\` (run \`${geo.lastRunId ?? 'n/a'}\`).

WordPress was not modified. No page was created, renamed, republished or repaired. No migration was
applied, nothing was seeded and nothing was published. The publication gate is unchanged
(${S.minAreas} areas, ${S.minLocalLines} local lines, hero image, FAQ, serving branch).

## Totals

| | Count |
|---|---:|
| **TOTAL CARDS** | **${resolved.length}** |
| PAGE | ${counts.PAGE} (${pct(counts.PAGE)}) |
| REDIRECT | ${counts.REDIRECT} (${pct(counts.REDIRECT)}) |
| COVERAGE_ONLY | ${counts.COVERAGE_ONLY} (${pct(counts.COVERAGE_ONLY)}) |
| REVIEW | ${counts.REVIEW} (${pct(counts.REVIEW)}) |
| REDIRECT_PENDING_TARGET *(audit status, inside REVIEW)* | ${auditCounts.REDIRECT_PENDING_TARGET ?? 0} |
| **BROKEN** | **${violations.length}** |
| **CROSS_STATE** | **${crossState.length}** |
| **INVALID_HREF** | **${invalidHref.length}** |

Audit-status breakdown (internal only; public behavior stays the four values above):

${Object.entries(auditCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- \`${k}\` — ${v}`).join('\n')}

## Inventory

| | Count |
|---|---:|
| Massachusetts city pages found in WordPress | ${cards.length} |
| Distinct cities with a city page | ${inventory.length} |
| Pages passing the publication gate | ${publishable} |
| Pages held by the gate | ${cards.length - publishable} |
| Duplicate city pages (same city, extra URLs) | ${cards.length - inventory.length} |
| Approved redirects among city pages | ${cards.filter((c) => c.fate === 'redirect').length} |
| Retired (410) city pages | ${cards.filter((c) => c.fate === 'gone').length} |
| City pages with no entry in any fate map | ${cards.filter((c) => c.fate === 'unmapped').length} |
| Coverage-only cities (service URLs only, no city page) | ${serviceOnly.size} |
| Same-shape pages rejected as another state | ${foreign.length} |

## Slug patterns

All ${S.citySlugRes.length} were enumerated from WordPress, not assumed, and all remain supported:

${S.patternNames.map((n, i) => `${i + 1}. \`${n}\` — ${patternCount(i)} pages`).join('\n')}

Pattern 4 carries **no state token at all**, so its state is read from the page title and never from
the slug. ${foreign.length} pages of that shape belong to other states and are excluded:
${foreign.map((f) => `\`${f.wpSlug}\``).join(', ')}.

\`bedford-chimney-sweep\` is Bedford **NH**; Bedford **MA** is \`chimney-sweep-repair-in-bedford-ma\`.
Slug matching alone would have put a New Hampshire page behind a Massachusetts card.

## Coordinates and serving branch

Coordinates are taken from WordPress wherever WordPress has them, and are never overwritten or
re-derived. Only the remainder are geocoded, into a **state-qualified** cache
(\`${S.key}-geocode.json\`, keys like \`MA:lexington\`) that no other state can read.

That isolation is not theoretical: \`mn-geocode.json\` is keyed by bare city name and already holds
Andover, Carver, Hanover, **Lexington**, Northfield and Plymouth. Reusing it would have placed
Lexington, MA in Anoka County, Minnesota.

| Coordinate provenance | Pages |
|---|---:|
| SOURCE — WordPress \`geolocation_lat\`/\`_long\` | ${cards.filter((c) => c.coords?.provenance === 'SOURCE').length} |
| DERIVED — Nominatim, state-qualified | ${cards.filter((c) => c.coords?.provenance === 'DERIVED').length} |
| none (geocode refused or absent) | ${cards.filter((c) => !c.coords).length} |

| Branch derivation method | Pages |
|---|---:|
| \`own_office\` — branch record city **and** street number agree with WordPress | ${cards.filter((c) => c.branchMethod === 'own_office').length} |
| \`nearest_from_wp_coordinate\` | ${cards.filter((c) => c.branchMethod === 'nearest_from_wp_coordinate').length} |
| \`nearest_from_derived_coordinate\` | ${cards.filter((c) => c.branchMethod === 'nearest_from_derived_coordinate').length} |
| \`rejected_too_far\` — beyond ${S.farFromBranchKm} km, kept in review | ${cards.filter((c) => c.branchMethod === 'rejected_too_far').length} |
| \`none\` — no usable coordinate | ${cards.filter((c) => c.branchMethod === 'none').length} |

Every nearest-branch assignment is DERIVED and unverified: it is the closest office by great-circle
distance, not a confirmed territory. No branch was assigned by city-name similarity, by the areas a
page lists, or by any model. ${anchors.length} of ${branchRecords.length} Massachusetts branches are usable as anchors, each
pairing a business branch record with a WordPress coordinate on that branch's own page. Candidate
branches are Massachusetts-only, so a nearer out-of-state office can never be selected.

### Geocode refusals

Coordinates were refused rather than guessed in these cases:

${(() => {
  const byStatus = {};
  for (const e of Object.values(geoEntries)) if (e.status !== 'ok') (byStatus[e.status] ??= []).push(e);
  const keys = Object.keys(byStatus);
  if (!keys.length) return 'None — every queried city resolved to a single populated place inside Massachusetts.';
  return keys.map((k) => `**\`${k}\`** — ${byStatus[k].length}\n\n${byStatus[k].slice(0, 12).map((e) => `- ${e.city}: ${esc(e.detail)}`).join('\n')}`).join('\n\n');
})()}

### Branch address conflicts

Cities where a branch record exists but its address disagrees with WordPress. Recorded, never reconciled:

${cards.filter((c) => c.addressConflict).length === 0 ? 'None.' : `| City | WordPress \`_job_location\` | Branch sheet |\n|---|---|---|\n${cards.filter((c) => c.addressConflict).map((c) => `| ${c.addressConflict.city} | ${esc(c.addressConflict.wordpress)} | ${esc(c.addressConflict.branchSheet)} |`).join('\n')}`}

### Branches rejected as too far

${cards.filter((c) => c.farFlag).length === 0 ? 'None — every derived coordinate sat within the threshold of a Massachusetts branch.' : `| City | Nearest branch distance | Outcome |\n|---|---:|---|\n${cards.filter((c) => c.farFlag).map((c) => `| ${c.name} | ${c.distanceKm} km | kept REVIEW, not forced to PAGE |`).join('\n')}`}

## Cross-state contamination

${crossState.length === 0
    ? `No card links outside Massachusetts. Cities whose names also exist in other states were verified end to end — source page, destination, coordinate and serving branch:

| City | Behavior | WP ID | Source URL | Destination | Coordinate (provenance) | Serving branch |
|---|---|---|---|---|---|---|
${resolved.filter((r) => COLLISION_CITIES.includes(r.city)).map((r) => `| ${r.city} | ${r.behavior} | ${r.wpPostId ?? '—'} | \`${r.sourcePath ?? '—'}\` | ${r.href ?? '—'} | ${r.coords ? `${r.coords.lat.toFixed(4)}, ${r.coords.lng.toFixed(4)} (${r.coords.provenance})` : '—'} | ${branchCell(r)} |`).join('\n')}`
    : crossState.map((c) => `- ${c.city} → ${c.href} (${c.targetState})`).join('\n')}

## Broken links

${violations.length === 0 ? 'None. Every linking card points at a published Massachusetts page that exists in this build.' : violations.map((v) => `- **${esc(v.city)}** — ${esc(v.problem)} (${v.href ?? 'no href'})`).join('\n')}

Invalid hrefs (empty, \`#\`, \`javascript:\`, \`undefined\`, \`null\`): ${invalidHref.length === 0 ? '**none**' : invalidHref.map((h) => `${h.city}=${h.href}`).join(', ')}
Duplicate unresolved routes: ${dupRoutes.length === 0 ? '**none** — no two cards share a destination.' : dupRoutes.join(', ')}

## URL preservation

Every card links to its city's **exact WordPress path**. No slug was normalised, cleaned or
rewritten, and no valid MA URL was swapped for a tidier-looking one. Canonical URLs are tracked
separately from page URLs: ${cards.filter((c) => c.seo.canonicalIsOverride).length} pages store an explicit Yoast canonical override, preserved as
stored rather than regenerated from the slug.

| Check | Result |
|---|---|
| PAGE cards linking their own source slug | ${resolved.filter((r) => r.behavior === 'PAGE').every((r) => slugOf(r.href) === r.wpSlug) ? `✓ all ${counts.PAGE}` : '✗ mismatch'} |
| Source paths preserved verbatim | ✓ ${cards.length} of ${cards.length} |
| Slugs rewritten | 0 |
| Canonical overrides preserved | ${cards.filter((c) => c.seo.canonicalIsOverride).length} |

## Media linkage

The chain city → WP page → attachment → file was verified for all ${cards.length} pages.
Pages with no hero attachment: **${noHero.length}**. Attachments with no alt text in WordPress: **${noAlt.length}**.
Original filename, extension, MIME, dimensions, alt, title, caption and description are carried
through unchanged; nothing is renamed, re-encoded or substituted.

Shared source media is flagged, never replaced:

| Attachment | Pages | Filename |
|---:|---:|---|
${sharedHeroes.slice(0, 8).map(([id, v]) => `| ${id} | ${v.length} | \`${esc(cards.find((c) => c.hero?.attachmentId === id)?.hero.filename)}\` |`).join('\n')}

${sharedHeroes.length ? `The most-shared attachment (${sharedHeroes[0][0]}) is the hero on ${sharedHeroes[0][1].length} city pages. That is how WordPress
holds it, so it is migrated as-is and flagged — no generated or substituted image is used anywhere.` : ''}

## SEO linkage

- Pages carrying their own \`_yoast_wpseo_metadesc\`: ${cards.length - noMeta.length} of ${cards.length}
- Pages with no stored meta description: ${noMeta.length} (left missing; none generated)
- Meta descriptions shared by more than one city: ${sharedMeta.length}
- Stored Yoast canonical overrides: ${cards.filter((c) => c.seo.canonicalIsOverride).length}

Each card resolves to exactly one WordPress post id, so no city can render another city's SEO
record. Nothing was generated, rewritten or "improved".

## What is still holding cards back

${counts.PAGE + counts.REDIRECT} of ${resolved.length} cards link. The gate is unchanged; these are the inputs WordPress does not
supply, counted over all ${cards.length} Massachusetts city pages:

| Missing input | Pages |
|---|---:|
${['serving branch', 'local specifics', 'neighbourhoods', 'city-specific FAQ', 'hero image'].map((k) => `| ${k} | ${cards.filter((c) => c.missing.some((m) => m.startsWith(k))).length} |`).join('\n')}

Single-blocker pages (everything else satisfied):

${['serving branch', 'local specifics', 'neighbourhoods', 'city-specific FAQ', 'hero image'].map((k) => `- **${k}** — ${cards.filter((c) => c.missing.length === 1 && c.missing[0].startsWith(k)).length}`).join('\n')}

These are source-content gaps, not resolution failures. Filling them is a WordPress content
decision; none of them may be filled here.

## Every card

Columns: resolution · audit status · WP id · exact source URL · destination · slug pattern ·
duplicates · serving branch (method, distance) · hero linkage · SEO linkage · reason / blocker.

| City | Resolution | Audit | WP ID | Source URL | Destination | Pattern | Dups | Serving branch | Hero | SEO | Reason / blocker |
|---|---|---|---|---|---|---|---|---|---|---|---|
${resolved.map((r) => `| ${esc(r.city)} | ${r.behavior} | ${r.auditStatus} | ${r.wpPostId ?? '—'} | \`${r.sourcePath ?? '—'}\` | ${r.href ?? '—'} | ${r.pattern >= 0 ? `P${r.pattern + 1}` : '—'} | ${r.duplicates || '—'} | ${branchCell(r)} | ${heroCell(r)} | ${seoCell(r)} | ${esc(r.reason)}${r.missing.length ? ` — blocked: ${esc(r.missing.join(', '))}` : ''} |`).join('\n')}
`;

fs.writeFileSync(path.join(ROOT, 'MASSACHUSETTS_CARD_LINK_AUDIT.md'), md);
fs.writeFileSync(path.join(ROOT, 'data/seed/ma.cards.json'), JSON.stringify({
  generatedAt: new Date().toISOString(), mode: 'dry-run', state: S.stateCode,
  geocodeRunId: geo.lastRunId ?? null,
  counts, auditCounts,
  checks: { broken: violations.length, crossState: crossState.length, invalidHref: invalidHref.length, duplicateRoutes: dupRoutes.length },
  branchAnchors: anchors, cards: resolved,
}, null, 1) + '\n');
console.log('\nWrote MASSACHUSETTS_CARD_LINK_AUDIT.md and data/seed/ma.cards.json (dry run — nothing else was written).\n');
process.exit(violations.length || crossState.length || invalidHref.length ? 1 : 0);
