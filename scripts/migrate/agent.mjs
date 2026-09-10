// The migration agent: an automation of the workflow proven by the Minnesota pilot.
//
//   FETCH EXACTLY → STORE EXACTLY → MAP → RENDER → VALIDATE → PUBLISH IF VALID → FLAG IF INCOMPLETE
//
// It copies WordPress and nothing else. It will not write or rewrite copy, paraphrase, fix grammar,
// invent an FAQ, a service area, local SEO or metadata, guess a territory, replace, rename, re-encode
// or optimise an image, change alt text, repair a source defect, alter a source URL, or write to
// WordPress. Where the source has nothing, the field stays empty and the page is flagged.
//
// Publication is decided only by the existing distinctness gate. A page that fails it is still
// migrated, still stored, still rendered through the same template, and reported as needs_review.
//
// Idempotent. Every page is identified by its WordPress post id, and every payload by checksum:
// a second run over unchanged source re-downloads nothing, rewrites nothing and duplicates nothing.
//
//   node scripts/migrate/agent.mjs --state mn [--dry-run|--apply] [--base http://localhost:3000]
//                                  [--regress data/seed/minnesota.generated.json] [--report out.json]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  makeQuery, fetchCityPages, fetchGeo, fetchHeroAttachments, parseAttachmentMeta, ensureAsset,
  cleanMarkup, areasFrom, localSpecificsFrom, introNeighbourhoods, legacyPricingCopyFrom, faqsFrom,
  hashJson, sha256,
} from './source.mjs';
import { validateAll, CHECKS } from './validate.mjs';
import { STATES, FLAG_CATEGORY } from './states.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : d);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const APPLY = flag('--apply');
const DRY = !APPLY; // dry run is the default: fetch, validate, report, change nothing
const BASE = opt('--base', 'http://localhost:3000').replace(/\/$/, '');
const STATE = STATES[opt('--state', 'mn')];
if (!STATE) throw new Error(`Unknown state "${opt('--state', 'mn')}". Known: ${Object.keys(STATES).join(', ')}`);
const REGRESS = opt('--regress', null);
const REPORT = opt('--report', null);
const SKIP_RENDER = flag('--no-render');

const DB = { host: opt('--host', '127.0.0.1'), user: opt('--user', 'root'), database: opt('--db', 'chimcare_local') };
const MEDIA_DIR = path.join(ROOT, 'public/uploads');
const DATASET = path.join(ROOT, `data/seed/${STATE.key}.migration.json`);
const LEDGER = path.join(ROOT, `data/seed/${STATE.key}.ledger.json`);
const GEOCACHE = path.join(ROOT, 'data/seed/mn-geocode.json');

const readJson = (p, fallback = null) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback);
const mkFlag = (code, detail, extra = {}) => ({ code, category: FLAG_CATEGORY[code], detail, ...extra });
const toRad = (x) => (x * Math.PI) / 180;
const km = (a, b) => {
  const h = Math.sin(toRad(b.lat - a.lat) / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

// ================================================================= FETCH EXACTLY
console.log(`\n${DRY ? 'DRY RUN' : 'APPLY'} · state ${STATE.key.toUpperCase()} · source ${DB.database} (read-only)\n`);
const query = makeQuery(DB);
const pages = fetchCityPages(query, STATE);
const geo = fetchGeo(query, pages.map((p) => p.wpPostId));
const heroRows = fetchHeroAttachments(query, STATE);
console.log(`FETCH    ${pages.length} published city pages, ${new Set(heroRows.map((h) => h.attachmentId)).size} distinct hero attachments`);

// Business-supplied inputs (not WordPress, not invented): branch list and URL fates.
const rebuild = path.resolve(ROOT, STATE.businessInputs);
const branchesJson = readJson(path.join(rebuild, 'site/data/branches.json'), []).filter((b) => b.state === STATE.stateCode);
const keep = new Map(readJson(path.join(rebuild, 'site/data/keep-pages.json'), []).filter((k) => k.state === STATE.key).map((k) => [k.path.replace(/\/+$/, '').split('/').pop(), k]));
const geocache = readJson(GEOCACHE, {});

// ================================================================= MAP (branches)
const suffixOf = (slug) => STATE.citySlugRe.exec(slug)?.[2] ?? null;
const branchSuffixes = new Set(pages.filter((p) => STATE.branchSlugRe.test(p.wpSlug)).map((p) => suffixOf(p.wpSlug)));
const branches = [];
for (const p of pages.filter((p) => STATE.branchSlugRe.test(p.wpSlug))) {
  const g = geo[p.wpPostId] ?? {};
  const loc = g._job_location ?? '';
  const num = /^\s*(\d+)/.exec(loc)?.[1];
  const zip = /\b(\d{5})\b/.exec(loc)?.[1];
  const b = branchesJson.find((x) => x.street_address.startsWith(num + ' ') && x.zip === zip);
  if (!b) {
    console.log(`  ! no branch record for ${p.wpSlug} (${loc}) — skipped, nothing invented`);
    continue;
  }
  branches.push({
    slug: suffixOf(p.wpSlug),
    name: /in (.*), \w\w$/.exec(p.wpTitle)?.[1] ?? suffixOf(p.wpSlug),
    street: b.street_address,
    streetShort: b.street_address.replace(/^\d+\s+/, ''),
    city: b.city,
    zip: b.zip,
    phone: (b.phone ?? '').replace(/\D/g, '').replace(/^1?(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3'),
    lat: Number(g.geolocation_lat),
    lng: Number(g.geolocation_long),
    wpPostId: p.wpPostId,
  });
}

// ================================================================= MAP (cities)
const heroByPage = new Map(heroRows.map((h) => [h.slug, h]));
const heroUse = new Map();
for (const h of heroRows) heroUse.set(h.attachmentId, (heroUse.get(h.attachmentId) ?? 0) + 1);

const dupSlugs = new Set(pages.filter((p) => STATE.coverageSlugRe.test(p.wpSlug) && branchSuffixes.has(suffixOf(p.wpSlug))).map((p) => p.wpSlug));
const cities = [];
const mediaLedger = {};

for (const p of pages) {
  if (dupSlugs.has(p.wpSlug)) continue; // a duplicate of a branch page; handled as a redirect, not a city
  const suffix = suffixOf(p.wpSlug);
  const isBranch = branchSuffixes.has(suffix);
  const name = /in (.*), \w\w$/.exec(p.wpTitle)?.[1] ?? suffix;
  const flags = [];
  const markup = cleanMarkup(p.content);

  // ---- SOURCE: copied, never edited ----
  const neighborhoods = [...new Set([...introNeighbourhoods(markup), ...areasFrom(markup)])];
  const localSpecifics = isBranch ? {} : localSpecificsFrom(markup);
  const legacyPricingCopy = legacyPricingCopyFrom(markup);
  const { items: faqs, unrecoverable } = faqsFrom(p.content);
  const redirect = /s:6:"origin";s:\d+:"([^"]*)";s:6:"target";s:\d+:"([^"]*)"/.exec(p.redirectInfo ?? '');

  // ---- hero: the exact attachment, downloaded unchanged ----
  const hr = heroByPage.get(p.wpSlug);
  let hero = null;
  if (hr) {
    const meta = parseAttachmentMeta(hr.meta);
    const attachedFile = hr.attachedFile ?? meta.file;
    if (attachedFile) {
      const asset = await ensureAsset({ attachedFile, filesize: meta.filesize, origin: STATE.origin, mediaDir: MEDIA_DIR, dryRun: DRY });
      if (asset.ok) {
        hero = {
          attachmentId: hr.attachmentId,
          imageKey: `uploads/${attachedFile}`,
          filename: path.basename(attachedFile),
          extension: path.extname(attachedFile),
          mime: hr.mime,
          alt: hr.alt ?? null,
          title: hr.title ?? null,
          caption: hr.caption || null,
          description: hr.description || null,
          width: meta.width,
          height: meta.height,
          filesize: meta.filesize,
          sha256: asset.sha256,
          sourceUrl: asset.url,
          guid: hr.guid ?? null,
          usedByPages: heroUse.get(hr.attachmentId) ?? 1,
        };
        mediaLedger[hr.attachmentId] = { sha256: asset.sha256, filename: hero.filename, bytes: asset.bytes, reused: !!asset.reused, downloaded: !!asset.downloaded };
      } else {
        flags.push(mkFlag('hero_image_missing', `Attachment ${hr.attachmentId} (${attachedFile}) could not be verified: ${asset.error ?? (asset.missing ? 'not present locally and this is a dry run' : 'size mismatch')}. No stand-in is used.`));
      }
    }
  }
  if (!hero && !flags.some((f) => f.code === 'hero_image_missing')) {
    flags.push(mkFlag('hero_image_missing', 'This page has no usable hero attachment in WordPress. None is substituted.'));
  }

  // ---- SOURCE_QUALITY flags: observed, never repaired ----
  if (!faqs.length) flags.push(mkFlag('faq_missing_in_source', 'No FAQ accordion in this page\'s content, so there is no FAQ to migrate.'));
  if (unrecoverable.length) flags.push(mkFlag('faq_missing_in_source', `${unrecoverable.length} accordion section(s) have no title attribute; those questions cannot be recovered and are left out.`));
  if (neighborhoods.length < STATE.minAreas) flags.push(mkFlag('insufficient_source_areas', `The page names ${neighborhoods.length} area(s); validation wants ${STATE.minAreas}. Not topped up.`));
  const specificsCount = Object.values(localSpecifics).filter(Boolean).length;
  if (specificsCount < STATE.minLocalLines) {
    flags.push(mkFlag('insufficient_source_local_copy', isBranch
      ? 'Branch pages carry no "why it matters" prose, so no local line can be taken from the source.'
      : `Only ${specificsCount} local line(s) exist in the page's own prose.`));
  }
  if (legacyPricingCopy.length) flags.push(mkFlag('legacy_pricing_conflict', 'The page states a price range that contradicts the pricing sheet. Preserved verbatim, never rendered.', { quotes: legacyPricingCopy }));
  if (hero) {
    if (hero.usedByPages > 1) flags.push(mkFlag('hero_image_not_city_specific', `Attachment ${hero.attachmentId} (${hero.filename}) is the hero on ${hero.usedByPages} city pages. Migrated as-is.`));
    const label = `${hero.title ?? ''} ${hero.alt ?? ''} ${hero.filename}`;
    const foreign = STATE.foreignStateRe.exec(label);
    if (foreign) flags.push(mkFlag('hero_image_wrong_state_label', `The attachment is labelled "${(hero.alt ?? hero.title ?? hero.filename).trim()}", naming ${foreign[1]} rather than ${STATE.stateCode}. Left exactly as WordPress holds it.`));
    if (!hero.alt) flags.push(mkFlag('hero_image_missing_alt', `Attachment ${hero.attachmentId} has no alt text in WordPress. None is written here.`));
  }
  if (STATE.slugTypos[p.wpSlug]) flags.push(mkFlag('legacy_slug_typo', STATE.slugTypos[p.wpSlug]));

  // ---- DERIVED: computed here, never mistaken for source ----
  let coords = geo[p.wpPostId]?.geolocation_lat
    ? { lat: Number(geo[p.wpPostId].geolocation_lat), lng: Number(geo[p.wpPostId].geolocation_long), source: 'wordpress' }
    : geocache[name]
      ? { lat: geocache[name].lat, lng: geocache[name].lng, source: 'geocoder' }
      : null;
  if (coords?.source === 'geocoder' && STATE.rejectedGeocodes[name]) {
    flags.push(mkFlag('geocode_rejected', STATE.rejectedGeocodes[name], { rejected: { lat: coords.lat, lng: coords.lng, display: geocache[name]?.display } }));
    coords = null;
  }
  const own = isBranch ? branches.find((b) => b.slug === suffix) : null;
  const nearest = !own && coords && branches.length ? branches.reduce((best, b) => (km(coords, b) < km(coords, best) ? b : best)) : null;
  const distanceKm = nearest && coords ? Number(km(coords, nearest).toFixed(2)) : null;
  if (nearest) {
    flags.push(mkFlag('nearest_branch_unverified', `Serving branch is DERIVED: ${nearest.name} is the closest office (${distanceKm} km). Not a confirmed territory.`));
    if (distanceKm > STATE.farFromBranchKm) flags.push(mkFlag('geocode_unverified', `Derived coordinate is ${Math.round(distanceKm)} km from the nearest branch — verify before using distance logic.`));
  }
  if (!own && !nearest) flags.push(mkFlag('no_serving_branch', 'No usable coordinate, so no branch could be derived. Needs a verified location or a manual assignment.'));
  if (STATE.officeConflicts[name]) flags.push(mkFlag('office_location_conflict', STATE.officeConflicts[name]));

  const source = {
    wpPostId: p.wpPostId,
    wpSlug: p.wpSlug,
    wpTitle: p.wpTitle,
    metaTitle: p.metaTitle ?? null,
    metaDescription: p.metaDescription ?? null,
    neighborhoods,
    localSpecifics,
    faqs,
    hero,
    legacyPricingCopy,
    thumbnailId: p.thumbnailId ? Number(p.thumbnailId) : null,
    redirectInfo: redirect ? { from: redirect[1].split('/').pop(), to: redirect[2].split('/').pop() } : null,
    tier: keep.get(p.wpSlug)?.tier || null,
    gscClicks: keep.get(p.wpSlug)?.clicks ?? 0,
  };
  const derived = { lat: coords?.lat ?? null, lng: coords?.lng ?? null, coordsSource: coords?.source ?? null, branch: own?.slug ?? nearest?.slug ?? null, branchAssignment: own ? 'own' : nearest ? 'nearest' : 'none', distanceKm };

  cities.push({
    slug: p.wpSlug,
    name,
    kind: isBranch ? 'branch' : 'coverage',
    hasSourcePage: true,
    source,
    derived,
    flags,
    checksums: {
      source: sha256(p.content + '\u0000' + (p.metaTitle ?? '') + '\u0000' + (p.metaDescription ?? '') + '\u0000' + (p.thumbnailId ?? '')),
      content: hashJson({ neighborhoods, localSpecifics, faqs, hero: hero && { attachmentId: hero.attachmentId, sha256: hero.sha256, alt: hero.alt }, metaDescription: source.metaDescription, name }),
      media: hero ? { [hero.attachmentId]: hero.sha256 } : {},
    },
  });
}
cities.sort((a, b) => a.name.localeCompare(b.name));
console.log(`MAP      ${cities.length} city pages mapped (${dupSlugs.size} duplicate page(s) excluded), ${branches.length} branches`);

// ================================================================= GATE (unchanged)
const gate = (c) => {
  const missing = [];
  if (!c.derived.branch) missing.push('serving branch');
  if (c.source.neighborhoods.length < STATE.minAreas) missing.push(`neighbourhoods (${c.source.neighborhoods.length}/${STATE.minAreas})`);
  const n = Object.values(c.source.localSpecifics).filter(Boolean).length;
  if (n < STATE.minLocalLines) missing.push(`local specifics (${n}/${STATE.minLocalLines})`);
  if (!c.source.hero) missing.push('hero image');
  if (!c.source.faqs.length) missing.push('city-specific FAQ');
  return { ok: missing.length === 0, missing };
};
const verdicts = new Map(cities.map((c) => [c.slug, gate(c)]));
const publishable = cities.filter((c) => verdicts.get(c.slug).ok);
const needsReview = cities.filter((c) => !verdicts.get(c.slug).ok);
console.log(`GATE     ${publishable.length} publishable · ${needsReview.length} needs_review  (gate unchanged)`);

// ================================================================= IDEMPOTENCY
const previous = readJson(LEDGER, null);
const prevByWpId = new Map(previous ? previous.pages.map((r) => [r.source_wp_id, r]) : []);
const changes = { source: [], content: [], media: [], seo: [], url: [] };
let unchanged = 0;
for (const c of cities) {
  const before = prevByWpId.get(c.source.wpPostId);
  if (!before) continue;
  const same = before.source_checksum === c.checksums.source && before.content_checksum === c.checksums.content;
  if (same) unchanged++;
  if (before.source_checksum !== c.checksums.source) changes.source.push(c.slug);
  if (before.content_checksum !== c.checksums.content) changes.content.push(c.slug);
  if (JSON.stringify(before.media_checksums) !== JSON.stringify(c.checksums.media)) changes.media.push(c.slug);
  if (before.url !== `/location/${c.slug}/`) changes.url.push(`${before.url} → /location/${c.slug}/`);
  if (before.meta_description !== c.source.metaDescription) changes.seo.push(c.slug);
}
const duplicateSlugs = cities.length - new Set(cities.map((c) => c.slug)).size;
const duplicateWpIds = cities.length - new Set(cities.map((c) => c.source.wpPostId)).size;
const duplicateMedia = Object.values(mediaLedger).filter((m) => m.downloaded).length - new Set(Object.keys(mediaLedger).filter((k) => mediaLedger[k].downloaded)).size;

// ================================================================= RENDER + VALIDATE
let validation = new Map();
if (!SKIP_RENDER) {
  const money = (c) => `$${Math.round(c / 100)}`;
  const pricing = readJson(path.join(rebuild, 'site/data/pricing.json'), {});
  const cents = (s) => Math.round(Number(String(s).replace(/[^0-9.]/g, '')) * 100);
  const prices = [money(cents(pricing['price:sweep_with_inspection'].amount)), money(cents(pricing['price:inspection'].amount)), money(cents(pricing['price:gas_diagnostic'].amount))];
  const seedPages = readJson(path.join(ROOT, 'data/seed/minnesota.generated.json'), { pages: [] }).pages;
  const expectations = cities.map((c) => ({
    slug: c.slug,
    name: c.name,
    kind: c.kind,
    stateCode: STATE.stateCode,
    stateName: STATE.stateName,
    stateSlug: STATE.key,
    siteUrl: (process.env.SITE_URL ?? 'https://www.chimcare.com').replace(/\/$/, ''),
    publicRoot: path.join(ROOT, 'public'),
    publicUrl: `/location/${c.slug}/`,
    previewUrl: `/admin/preview/${c.slug}/`,
    publishable: verdicts.get(c.slug).ok,
    faqs: c.source.faqs,
    hero: c.source.hero,
    neighborhoods: c.source.neighborhoods,
    metaDescription: c.source.metaDescription,
    branch: branches.find((b) => b.slug === c.derived.branch) ?? null,
    nationalPhone: STATE.nationalPhone,
    prices,
    expectedServiceCards: STATE.serviceCatalogueSize,
    expectedServiceLinks: seedPages.filter((p) => p.kind === 'service' && p.city === c.slug && p.status === 'published').length,
  }));
  console.log(`RENDER   fetching ${expectations.length} pages from ${BASE} …`);
  validation = await validateAll(BASE, expectations);
}

// ================================================================= PAGE RECORDS
const records = cities.map((c) => {
  const results = validation.get(c.slug) ?? [];
  return {
    status: verdicts.get(c.slug).ok ? 'publishable' : 'needs_review',
    source_wp_id: c.source.wpPostId,
    url: `/location/${c.slug}/`,
    source_checksum: c.checksums.source,
    content_checksum: c.checksums.content,
    media_checksums: c.checksums.media,
    validation_results: results,
    reviewFlags: c.flags,
    // kept for change detection between runs
    meta_description: c.source.metaDescription,
    blocked_by: verdicts.get(c.slug).missing,
  };
});
const validationFailures = records.flatMap((r) => r.validation_results.filter((v) => !v.ok).map((v) => ({ slug: r.url, check: v.check, detail: v.detail })));
const checkPass = Object.fromEntries(CHECKS.map((c) => [c, records.filter((r) => r.validation_results.find((v) => v.check === c)?.ok).length]));

// ================================================================= STORE (apply only)
if (APPLY) {
  fs.writeFileSync(DATASET, JSON.stringify({
    generatedAt: new Date().toISOString(),
    state: { key: STATE.key, code: STATE.stateCode, name: STATE.stateName },
    provenance: {
      SOURCE: 'city.source.* — verbatim from wp_posts/wp_postmeta, plus tier and clicks from the supplied fate maps',
      DERIVED: 'city.derived.* and every checksum — computed by this agent',
      BUSINESS_UNVERIFIED: 'flags with category BUSINESS_UNVERIFIED — a decision the business owns',
      SOURCE_QUALITY_FLAG: 'flags with category SOURCE_QUALITY_FLAG — a defect observed in WordPress, never repaired here',
    },
    branches,
    cities,
  }, null, 1) + '\n');
  fs.writeFileSync(LEDGER, JSON.stringify({ generatedAt: new Date().toISOString(), state: STATE.key, pages: records.map(({ validation_results, reviewFlags, ...rest }) => rest) }, null, 1) + '\n');
}

// ================================================================= REPORT
const byCategory = {};
for (const c of cities) for (const f of c.flags) ((byCategory[f.category] ??= {})[f.code] ??= 0, byCategory[f.category][f.code]++);
const report = {
  mode: DRY ? 'dry-run' : 'apply',
  state: STATE.key,
  pages_discovered: pages.length,
  pages_migrated: cities.length,
  pages_publishable: publishable.length,
  pages_needing_review: needsReview.length,
  pages_skipped: pages.length - cities.length,
  skipped_reason: dupSlugs.size ? `${dupSlugs.size} duplicate city page(s) of a branch city — redirected, not migrated` : 'none',
  unchanged_since_last_run: previous ? unchanged : null,
  source_changes_detected: changes.source,
  content_checksum_changes: changes.content,
  media_checksum_changes: changes.media,
  seo_differences: changes.seo,
  url_differences: changes.url,
  duplicates_created: { city_slugs: duplicateSlugs, wp_ids: duplicateWpIds, media_files: duplicateMedia },
  media: { distinct_assets: Object.keys(mediaLedger).length, reused_from_disk: Object.values(mediaLedger).filter((m) => m.reused).length, downloaded: Object.values(mediaLedger).filter((m) => m.downloaded).length },
  validation: SKIP_RENDER ? 'skipped' : { pages_checked: validation.size, checks: checkPass, failures: validationFailures.length },
  review_flags_by_category: byCategory,
  records,
};

console.log('\n──────── REPORT ────────');
console.log(`  pages discovered        ${report.pages_discovered}`);
console.log(`  pages migrated          ${report.pages_migrated}`);
console.log(`  pages publishable       ${report.pages_publishable}`);
console.log(`  pages needing review    ${report.pages_needing_review}`);
console.log(`  pages skipped           ${report.pages_skipped}  (${report.skipped_reason})`);
console.log(`  unchanged since last    ${report.unchanged_since_last_run ?? '(no previous run)'}`);
console.log(`  source changes          ${changes.source.length}`);
console.log(`  content checksum changes ${changes.content.length}`);
console.log(`  media checksum changes  ${changes.media.length}`);
console.log(`  SEO differences         ${changes.seo.length}`);
console.log(`  URL differences         ${changes.url.length}`);
console.log(`  duplicates created      slugs ${duplicateSlugs} · wp ids ${duplicateWpIds} · media ${duplicateMedia}`);
console.log(`  media                   ${report.media.distinct_assets} assets · ${report.media.reused_from_disk} reused · ${report.media.downloaded} downloaded`);
if (!SKIP_RENDER) {
  console.log(`  validation              ${validation.size} pages · ${validationFailures.length} failures`);
  for (const c of CHECKS) console.log(`      ${c.padEnd(18)} ${checkPass[c]}/${cities.length}`);
}
console.log('  review flags by provenance:');
for (const [cat, codes] of Object.entries(byCategory)) {
  console.log(`      ${cat}`);
  for (const [code, n] of Object.entries(codes).sort((a, b) => b[1] - a[1])) console.log(`        ${code.padEnd(32)} ${n}`);
}
if (validationFailures.length) {
  console.log('\n  validation failures:');
  for (const f of validationFailures.slice(0, 20)) console.log(`    ✗ [${f.check}] ${f.slug}: ${f.detail}`);
}

// ================================================================= REGRESSION
let regressionOk = true;
if (REGRESS) {
  const pilot = readJson(path.resolve(ROOT, REGRESS));
  const pilotCities = pilot.cities.filter((c) => !c.noCityPage);
  const problems = [];
  if (pilotCities.length !== cities.length) problems.push(`city count ${cities.length} vs pilot ${pilotCities.length}`);
  for (const c of cities) {
    const p = pilotCities.find((x) => x.slug === c.slug);
    if (!p) { problems.push(`${c.slug}: not in pilot dataset`); continue; }
    const cmp = [
      ['areas', JSON.stringify(c.source.neighborhoods), JSON.stringify(p.neighborhoods)],
      ['localSpecifics', JSON.stringify(c.source.localSpecifics), JSON.stringify(p.localSpecifics)],
      ['faqs', JSON.stringify(c.source.faqs.map((f) => [f.question, f.answer])), JSON.stringify((p.faqs ?? []).map((f) => [f.question, f.answer]))],
      ['heroSha', c.source.hero?.sha256 ?? null, p.hero?.sha256 ?? null],
      ['heroKey', c.source.hero?.imageKey ?? null, p.hero?.imageKey ?? null],
      ['metaDescription', c.source.metaDescription, p.metaDescription],
      ['branch', c.derived.branch, p.branch],
      ['wpPostId', c.source.wpPostId, p.legacyPostId],
    ];
    for (const [field, a, b] of cmp) if (a !== b) problems.push(`${c.slug}.${field}: agent ${String(a).slice(0, 60)} vs pilot ${String(b).slice(0, 60)}`);
  }
  const pilotPublishable = pilotCities.filter((p) => p.branch && p.neighborhoods.length >= STATE.minAreas && Object.values(p.localSpecifics).filter(Boolean).length >= STATE.minLocalLines && p.hero && (p.faqs ?? []).length).length;
  if (pilotPublishable !== publishable.length) problems.push(`publishable ${publishable.length} vs pilot ${pilotPublishable}`);
  regressionOk = problems.length === 0;
  console.log(`\n──────── REGRESSION vs ${REGRESS} ────────`);
  console.log(regressionOk
    ? `  ✓ identical: ${cities.length} cities, ${publishable.length} publishable, ${needsReview.length} needs_review, all source fields and checksums match`
    : `  ✗ ${problems.length} difference(s):`);
  for (const p of problems.slice(0, 25)) console.log(`    ${p}`);
}

if (REPORT) fs.writeFileSync(path.resolve(ROOT, REPORT), JSON.stringify(report, null, 1) + '\n');
console.log(DRY ? '\nDry run: no dataset, ledger or media was written.\n' : `\nWrote ${path.relative(ROOT, DATASET)} and ${path.relative(ROOT, LEDGER)}.\n`);
process.exit(validationFailures.length || !regressionOk ? 1 : 0);
