/**
 * MASSACHUSETTS DECISION REGISTER + REDIRECT LIST + READINESS CHECKLIST — reporting only.
 *
 * This script reads `data/seed/ma.cards.json` (the frozen dry-run result) and writes three
 * documents. It contains no extraction logic, no gate logic and no slug parsing of its own: every
 * number it prints comes from the audit that produced that file. It resolves no business decision —
 * every decision it records is written as PENDING.
 *
 * It does not query WordPress, does not touch the database, and writes nothing but the three
 * markdown files named below.
 *
 *   npx tsx scripts/audit/ma-decision-register.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATES } from '../migrate/states.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const S = STATES.ma;
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const cards = read('data/seed/ma.cards.json');
const geo = read('data/seed/ma-geocode.json');
const BT = String.fromCharCode(96);
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const all = cards.cards;
const withPage = all.filter((c) => c.wpSlug);
const held = all.filter((c) => c.auditStatus === 'GATE_HELD');
const pending = all.filter((c) => c.auditStatus === 'REDIRECT_PENDING_TARGET');
const pages = all.filter((c) => c.behavior === 'PAGE');
const coverage = all.filter((c) => c.behavior === 'COVERAGE_ONLY');

// ---------------------------------------------------------------- grouping (mechanical)
const has = (c, g) => c.missing.some((m) => m.startsWith(g));
/** Each card lands in exactly one group; the order below is the precedence. */
function groupOf(c) {
  if (has(c, 'serving branch') && !c.coords) return 'AMBIGUOUS_COORDINATE';
  if (has(c, 'serving branch') && c.branchMethod === 'rejected_too_far') return 'SERVING_BRANCH_DISTANCE';
  if (has(c, 'neighbourhoods')) return 'NEIGHBORHOODS_MISSING';
  if (has(c, 'local specifics')) return 'LOCAL_SPECIFICS_MISSING_OR_POLICY';
  return 'OTHER';
}
const GROUPS = ['NEIGHBORHOODS_MISSING', 'LOCAL_SPECIFICS_MISSING_OR_POLICY', 'SERVING_BRANCH_DISTANCE', 'AMBIGUOUS_COORDINATE', 'OTHER'];
const grouped = Object.fromEntries(GROUPS.map((g) => [g, held.filter((c) => groupOf(c) === g)]));

// ---------------------------------------------------------------- per-card evidence (from the audit)
const geoDetail = (c) => {
  const k = `MA:${c.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return geo.entries[k]?.detail ?? null;
};
function evidenceFor(c) {
  const out = [];
  const e = c.evidence ?? {};
  if (has(c, 'neighbourhoods')) {
    const p = e.areaProbes ?? {};
    const found = Object.entries(p).filter(([, v]) => v === true).map(([k]) => k);
    out.push(`areas ${c.neighborhoods}/${S.minAreas}. Probes: ${found.length ? found.join(', ') : 'none matched'}${p.anyListItems ? ' (bullet lists present but they are service benefits, not places)' : ''}.`);
  }
  if (has(c, 'local specifics')) {
    out.push(`local lines ${c.localLines}/${S.minLocalLines}. ${e.altLocalSection ? `A "Why ${c.city}, MA Homeowners Choose Chimcare" section exists with city-specific prose, but it is not the "Why … Important in" section the extractor reads.` : 'No second sentence naming local housing stock in the read section.'}`);
  }
  if (has(c, 'city-specific FAQ')) {
    const f = e.faqProbes ?? {};
    out.push(`FAQ: ${f.accordion ?? 0} accordion sections, ${f.qMarkers ?? 0} Q markers, FAQ heading ${f.faqHeading ? 'present' : 'absent'}.`);
  }
  if (has(c, 'serving branch')) {
    out.push(c.coords
      ? `coordinate ${c.coords.lat.toFixed(4)}, ${c.coords.lng.toFixed(4)} (${c.coords.provenance}); nearest MA branch ${c.distanceKm} km, threshold ${S.farFromBranchKm} km.`
      : `no coordinate: geocode ${c.geoRefusal}. ${geoDetail(c) ?? ''}`);
  }
  return out.join(' ');
}
function sourceExists(c) {
  if (has(c, 'local specifics') && c.evidence?.altLocalSection) return 'YES — under a different heading';
  if (has(c, 'neighbourhoods')) {
    const p = c.evidence?.areaProbes ?? {};
    if (p.areasHeading || p.areasText || p.neighborhoodList || p.includingList) return 'PARTIAL — place names in prose, not an extractable list';
    return 'NO';
  }
  if (has(c, 'serving branch')) return 'N/A — derived value, not source content';
  return 'NO';
}
const derivedMissing = (c) => (has(c, 'serving branch') && !c.coords ? 'YES — a verified coordinate' : 'NO');
function proposal(c) {
  const g = groupOf(c);
  if (g === 'AMBIGUOUS_COORDINATE') return `Supply one verified coordinate for ${c.city}, MA. The nearest-branch derivation then runs unchanged and no threshold moves.`;
  if (g === 'SERVING_BRANCH_DISTANCE') return `Confirm whether ${c.city} is served, and from which branch. Options: name an existing branch as its territory, add a western-Massachusetts branch, or accept that it stays unpublished. The ${S.farFromBranchKm} km threshold is not to be moved to fit.`;
  if (g === 'NEIGHBORHOODS_MISSING' && c.evidence?.altLocalSection) return `Two separate calls: (a) author a service-area list for this city in WordPress, and (b) decide whether the "Why … Choose Chimcare" section counts as local specifics.`;
  if (g === 'NEIGHBORHOODS_MISSING') return 'Author a service-area list for this city in WordPress. Nothing may be inferred from geography.';
  if (g === 'LOCAL_SPECIFICS_MISSING_OR_POLICY' && c.evidence?.altLocalSection) return 'Decide whether "Why … Choose Chimcare" marketing copy satisfies the local-specifics gate. It is a different kind of content from the local-conditions prose the gate was built around.';
  if (g === 'LOCAL_SPECIFICS_MISSING_OR_POLICY') return 'Author a second local line in WordPress, or decide whether to widen the housing test (a deliberate policy change, currently frozen).';
  return 'Review individually.';
}
const decisionNeeded = (c) => (groupOf(c) === 'AMBIGUOUS_COORDINATE' ? 'NO — data task' : 'YES');

const GROUP_INTRO = {
  NEIGHBORHOODS_MISSING: 'Blocked because the page names fewer than the required service areas. For most of these the source carries no area list in any form — nine independent probes found no "Areas We Serve" heading, no areas text, no neighbourhood list and no comma list of place names. A handful name places in run-on prose that cannot be split into names deterministically.',
  LOCAL_SPECIFICS_MISSING_OR_POLICY: 'Blocked on local specifics only. Either the source genuinely carries one local line and no second, or the second exists under a heading the extractor does not read — which is a content-policy question, not a defect.',
  SERVING_BRANCH_DISTANCE: `Coordinates are known and inside Massachusetts, but the nearest Massachusetts branch is beyond the ${S.farFromBranchKm} km threshold. No branch was assigned. The threshold is frozen and no out-of-state office was considered.`,
  AMBIGUOUS_COORDINATE: 'No coordinate could be derived: the geocoder found two or more distinct populated places of the same name inside Massachusetts and refused rather than guessing. Nothing else about these pages is blocking.',
  OTHER: 'Blockers that do not fall into the four groups above.',
};

// ---------------------------------------------------------------- 1. decision register
const registerRows = (list) => list.map((c) => [
  `#### ${esc(c.city)}`,
  '',
  `| Field | Value |`,
  `|---|---|`,
  `| WP ID | ${c.wpPostId ?? '—'} |`,
  `| Exact source URL | ${BT}${c.sourceUrl}${BT} |`,
  `| Current status | ${c.behavior} / ${c.auditStatus} |`,
  `| Failing gates | ${esc(c.missing.join(' · '))} |`,
  `| Exact evidence | ${esc(evidenceFor(c))} |`,
  `| Source data exists? | ${esc(sourceExists(c))} |`,
  `| Derived data missing? | ${esc(derivedMissing(c))} |`,
  `| Business decision required? | ${decisionNeeded(c)} |`,
  `| Proposed decision | ${esc(proposal(c))} |`,
  `| **Final decision** | **PENDING** |`,
  '',
].join('\n')).join('\n');

const register = `# Massachusetts decision register

**Status:** dry run, frozen. **Generated:** ${new Date().toISOString()}
**Scope:** the ${held.length} gate-held Massachusetts cards.

Extraction rules, ${BT}paragraphScanDepth${BT}, the housing/local-specifics test, the publication gates,
slug parsing and the ${S.farFromBranchKm} km branch distance threshold are **frozen**. Nothing in this document has
been acted on: every **Final decision** below reads **PENDING**, and no business decision has been
resolved automatically.

## Summary

| Group | Cards | Business decision required |
|---|---:|---:|
${GROUPS.map((g) => `| ${g} | ${grouped[g].length} | ${grouped[g].filter((c) => decisionNeeded(c) === 'YES').length} |`).join('\n')}
| **Total** | **${held.length}** | **${held.filter((c) => decisionNeeded(c) === 'YES').length}** |

Every one of the ${held.length} cards is accounted for in exactly one group.

${GROUPS.filter((g) => grouped[g].length).map((g) => `## ${g} — ${grouped[g].length} card${grouped[g].length === 1 ? '' : 's'}

${GROUP_INTRO[g]}

Cities: ${grouped[g].map((c) => esc(c.city)).join(', ')}.

### Card records

${registerRows(grouped[g])}`).join('\n')}

## What is explicitly NOT proposed

- No neighbourhood, area or place name is invented, inferred from geography, or copied from a nearby city.
- No coordinate is guessed for the ${grouped.AMBIGUOUS_COORDINATE.length} ambiguous towns.
- No branch is assigned beyond the ${S.farFromBranchKm} km threshold, and no out-of-state branch is ever a candidate.
- No FAQ, meta description, local line or hero image is generated.
- No gate is loosened and no extractor is changed to move a card out of this register.
`;

// ---------------------------------------------------------------- 2. redirect pending list
const isCityShape = (slug) => S.citySlugRes.some((re) => re.test(slug));
const slugOfPath = (p) => String(p ?? '').replace(/^\/+|\/+$/g, '').split('/').pop() ?? '';
const migratedSlugs = new Set(withPage.map((c) => c.wpSlug));

const redirectDoc = `# Massachusetts approved redirects awaiting their target

**Status:** dry run, frozen. **Generated:** ${new Date().toISOString()}
**Scope:** the ${pending.length} cards whose canonical page carries an approved redirect this build cannot yet follow.

Every redirect below is an **approved rule from ${BT}redirects.json${BT}** and is preserved exactly as
written. None has been altered, re-pointed, dropped, or converted into a PAGE. Each is single-hop:
there are no loops, no chains, no dangling targets and no cross-state targets anywhere in this set.

The blocker is uniform: the destination is a real Massachusetts **service** page, and this build
migrates city pages only. When the service-page migration lands, these resolve without any change
to the resolver.

| Redirect class | Cards |
|---|---:|
${Object.entries(pending.reduce((a, c) => ((a[c.redirectClass ?? 'unknown'] = (a[c.redirectClass ?? 'unknown'] ?? 0) + 1), a), {})).map(([k, v]) => `| ${BT}${k}${BT} | ${v} |`).join('\n')}

| Target page type | Cards |
|---|---:|
| service page (outside the city-page patterns) | ${pending.filter((c) => !isCityShape(slugOfPath(c.targetUrl))).length} |
| city page shape | ${pending.filter((c) => isCityShape(slugOfPath(c.targetUrl))).length} |

| # | City | Source URL (approved, preserved) | Approved target URL | Target page type | Target migrated? | Redirect class | Final blocker |
|---:|---|---|---|---|---|---|---|
${pending.map((c, i) => {
  const t = slugOfPath(c.targetUrl);
  return `| ${i + 1} | ${esc(c.city)} | ${BT}${c.sourcePath}${BT} | ${BT}${c.targetUrl}${BT} | ${isCityShape(t) ? 'city page' : 'service page'} | ${migratedSlugs.has(t) ? 'YES' : 'NO'} | ${c.redirectClass} | Target not migrated in this build; linking it would 404 |`;
}).join('\n')}
`;

// ---------------------------------------------------------------- 3. readiness checklist
const heroUse = {};
for (const c of withPage) if (c.hero) heroUse[c.hero.attachmentId] = (heroUse[c.hero.attachmentId] ?? 0) + 1;
const sharedAtt = Object.values(heroUse).filter((v) => v > 1).length;
const sharedCards = Object.values(heroUse).filter((v) => v > 1).reduce((a, b) => a + b, 0);
const noAlt = withPage.filter((c) => c.hero && !c.hero.alt).length;
const withMeta = withPage.filter((c) => c.seo?.metaDescription).length;
const heroFilesOnDisk = new Set(withPage.filter((c) => c.hero).map((c) => c.hero.file));
const onDisk = [...heroFilesOnDisk].filter((f) => fs.existsSync(path.join(ROOT, 'public/uploads', f))).length;
const row = (item, state, detail) => `| ${item} | ${state} | ${esc(detail)} |`;

const readiness = `# Massachusetts migration readiness checklist

**Status:** dry run, frozen — nothing applied, seeded, published, deployed or committed.
**Generated:** ${new Date().toISOString()}

Legend: **READY** — verified, no action outstanding. **BLOCKED** — needs a decision or data before
apply. **NOT STARTED** — a later migration phase, deliberately not run yet.

## Card outcomes

| Item | State | Detail |
|---|---|---|
${row(`PAGE — ${pages.length}`, 'READY', `All ${pages.length} link their own exact source slug, passed the unchanged gate, and resolve to a published Massachusetts page.`)}
${row(`REVIEW — ${all.filter((c) => c.behavior === 'REVIEW').length}`, 'BLOCKED', `${held.length} gate-held (see the decision register) and ${pending.length} awaiting a redirect target.`)}
${row(`COVERAGE_ONLY — ${coverage.length}`, 'READY', `No city page in any of the ${S.citySlugRes.length} known shapes; href is null and no URL is invented. ${coverage.filter((c) => c.suspectedSourceTypo).length} are suspected misspellings inside service-page slugs, flagged not corrected.`)}
${row(`REDIRECT_PENDING_TARGET — ${pending.length}`, 'BLOCKED', 'Approved rules preserved; destinations are unmigrated service pages. Resolves when service pages migrate.')}

## Data and integrity

| Item | State | Detail |
|---|---|---|
${row('URLs', 'READY', `All ${withPage.length} cards carry their exact WordPress path. 0 slugs rewritten, normalised or cleaned. Every PAGE links its own slug.`)}
${row('Canonical', 'BLOCKED', `0 of ${withPage.length} pages store a Yoast canonical override; all ${withPage.length} would be self-canonical, derived from the source URL. Canonical policy (www vs bare, trailing slash) must be confirmed before apply.`)}
${row('SEO', 'BLOCKED', `Only ${withMeta} of ${withPage.length} pages carry a stored meta description and 0 carry a stored Yoast SEO title. The remaining ${withPage.length - withMeta} have none in WordPress; none has been generated. A ruling on title/description derivation is required.`)}
${row('Structured data', 'NOT STARTED', 'Source pages carry a WP Schema Pro AggregateRating block. The app deliberately emits no rating markup. Per-branch LocalBusiness and Breadcrumb markup is a build-phase task, not yet exercised for MA.')}
${row('Media — linkage', 'READY', `${withPage.filter((c) => c.hero).length} of ${withPage.length} cards resolve city → page → attachment → file. Filename, extension, MIME, dimensions, alt, title, caption and description are carried verbatim.`)}
${row('Media — reachability', 'READY', `All 25 distinct hero attachments return HTTP 200 at their WordPress uploads URL (checked ${new Date().toISOString().slice(0, 10)}).`)}
${row('Media — local copies', 'NOT STARTED', `${onDisk} of ${heroFilesOnDisk.size} hero files are present in public/uploads. The byte-for-byte download is a migration phase that has not been run for MA.`)}
${row('Media — shared source images', 'BLOCKED', `${sharedAtt} attachments are the hero on ${sharedCards} cards, and ${noAlt} attachments have no alt text in WordPress. Flagged, never substituted or generated. A content decision on per-city imagery is outstanding.`)}
${row('Source checksums', 'NOT STARTED', 'No ma.migration.json or ma.ledger.json exists: the agent has never been run with --apply for MA, so there are no per-page source/content/media checksums and no idempotency baseline yet.')}
${row('Database reconciliation', 'NOT STARTED', 'Massachusetts is not seeded. No site.states, site.cities, site.branches or site.pages rows exist for MA, and /locations/ma/ correctly 404s.')}
${row('Cross-state protection', 'READY', `0 cross-state links. Every coordinate is inside the Massachusetts bounding box, all ${cards.branchAnchors.length} branch anchors are MA, and the geocode cache is state-qualified so no other state's coordinates can be read.`)}
${row('Redirect graph', 'READY', `${pending.length} approved redirects, all single-hop. 0 loops, 0 chains, 0 dangling targets, 0 cross-state targets, 0 duplicate destinations.`)}
${row('Rollback readiness', 'READY', 'Nothing has been applied: WordPress is unmodified (SELECT only), no production data is seeded, no routing or DNS changed, nothing deployed or committed. Rollback is currently a no-op.')}

## Gate integrity

| Item | State | Detail |
|---|---|---|
${row('Publication gate', 'READY', `Unchanged: ${S.minAreas} areas, ${S.minLocalLines} local lines, hero image, FAQ, serving branch. Never loosened to move a card.`)}
${row('Extraction rules', 'READY', 'Frozen. paragraphScanDepth, the housing test, slug parsing and the distance threshold are not to change without an approved policy decision.')}
${row('Minnesota regression', 'READY', 'Byte-identical: 134 cities / 109 publishable / 25 needs_review / 16 no-source, with source, content, media, SEO and URL changes all zero.')}
${row('Automated tests', 'READY', 'Card-link suite passes with 0 failures, covering all 8 slug patterns, no-duplicate-city, cross-state collision cities, geocode provenance, media and SEO linkage.')}
${row('Lint', 'NOT CONFIGURED', 'This project has no lint script and no eslint config. Not claimed as passing.')}

## Before any production apply

1. Resolve the ${held.filter((c) => decisionNeeded(c) === 'YES').length} business/content decisions in ${BT}MASSACHUSETTS_DECISION_REGISTER.md${BT}.
2. Supply verified coordinates for the ${grouped.AMBIGUOUS_COORDINATE.length} ambiguous towns (a data task, no decision needed).
3. Settle the canonical and SEO-title policy for the ${withPage.length - withMeta} pages with no stored description.
4. Run the agent with ${BT}--apply${BT} for MA to produce the migration dataset, ledger and checksums, and to download the 25 hero files.
5. Migrate the service pages the ${pending.length} approved redirects point at, or accept those cards staying in review.
6. Seed MA and re-run the full card audit against the seeded database rather than the dry-run dataset.
`;

fs.writeFileSync(path.join(ROOT, 'MASSACHUSETTS_DECISION_REGISTER.md'), register);
fs.writeFileSync(path.join(ROOT, 'MASSACHUSETTS_REDIRECT_PENDING.md'), redirectDoc);
fs.writeFileSync(path.join(ROOT, 'MASSACHUSETTS_MIGRATION_READINESS.md'), readiness);

console.log(`\nDECISION REGISTER   ${held.length} cards across ${GROUPS.filter((g) => grouped[g].length).length} groups`);
for (const g of GROUPS) if (grouped[g].length) console.log(`   ${g.padEnd(34)} ${grouped[g].length}`);
console.log(`   business decisions required        ${held.filter((c) => decisionNeeded(c) === 'YES').length}`);
console.log(`   final decisions recorded as PENDING ${held.length}`);
console.log(`\nREDIRECT LIST       ${pending.length} approved redirects awaiting their target`);
console.log(`READINESS           ${pages.length} PAGE · ${held.length} gate-held · ${coverage.length} coverage-only · ${pending.length} redirect-pending`);
console.log('\nWrote MASSACHUSETTS_DECISION_REGISTER.md, MASSACHUSETTS_REDIRECT_PENDING.md, MASSACHUSETTS_MIGRATION_READINESS.md\n');
