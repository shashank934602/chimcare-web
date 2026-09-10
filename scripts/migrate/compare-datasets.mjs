// Old vs new: the pilot dataset against the agent dataset the app now consumes.
//
// Compares the two artefacts field by field across the 134 migrated city pages and reports every
// difference, harmless or not. Read-only; it changes neither dataset.
//
//   node scripts/migrate/compare-datasets.mjs [--pilot <path>] [--agent <path>] [--json out.json]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (n, d) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : d);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pilot = JSON.parse(fs.readFileSync(path.join(ROOT, opt('--pilot', 'data/seed/minnesota.generated.json')), 'utf8'));
const agent = JSON.parse(fs.readFileSync(path.join(ROOT, opt('--agent', 'data/seed/mn.migration.json')), 'utf8'));

const eq = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const differences = [];
const note = (dimension, slug, detail) => differences.push({ dimension, slug, detail });

const pilotMigrated = pilot.cities.filter((c) => !c.noCityPage);
const pilotNoSource = pilot.cities.filter((c) => c.noCityPage);
const agentCities = agent.cities;

// The gate, unchanged, applied to each dataset's own fields.
const gatePilot = (c) => !!c.branch && c.neighborhoods.length >= 4 && Object.values(c.localSpecifics).filter(Boolean).length >= 2 && !!c.hero && (c.faqs ?? []).length >= 1;
const gateAgent = (c) => !!c.derived.branch && c.source.neighborhoods.length >= 4 && Object.values(c.source.localSpecifics).filter(Boolean).length >= 2 && !!c.source.hero && c.source.faqs.length >= 1;

// ---- dimension 1: city count ------------------------------------------------------------------
const counts = { pilot: pilotMigrated.length, agent: agentCities.length };
if (counts.pilot !== counts.agent) note('city count', '—', `pilot ${counts.pilot} vs agent ${counts.agent}`);

// ---- per-city dimensions ----------------------------------------------------------------------
const byPilotSlug = new Map(pilotMigrated.map((c) => [c.slug, c]));
const seen = new Set();

for (const a of agentCities) {
  const p = byPilotSlug.get(a.slug);
  seen.add(a.slug);
  if (!p) {
    note('slugs', a.slug, 'present in agent dataset, absent from pilot');
    continue;
  }
  const checks = [
    ['WordPress post IDs', p.legacyPostId, a.source.wpPostId],
    ['slugs', p.slug, a.slug],
    ['URLs', `/location/${p.slug}/`, `/location/${a.slug}/`],
    ['source content · name', p.name, a.name],
    ['source content · kind', p.kind, a.kind],
    ['source fields · title', p.legacyTitle ?? null, a.source.wpTitle],
    ['source fields · tier', p.keepTier ?? null, a.source.tier],
    ['source fields · thumbnail id', p.legacyThumbnailId ?? null, a.source.thumbnailId],
    ['source fields · legacy pricing copy', p.legacyPricingCopy ?? [], a.source.legacyPricingCopy],
    ['SEO values · meta title', p.metaTitle ?? null, a.source.metaTitle],
    ['SEO values · meta description', p.metaDescription ?? null, a.source.metaDescription],
    ['local SEO · serving branch', p.branch ?? null, a.derived.branch],
    ['local SEO · latitude', p.lat ?? null, a.derived.lat],
    ['local SEO · longitude', p.lng ?? null, a.derived.lng],
    ['local SEO · coords source', p.coordsSource === 'nominatim' ? 'geocoder' : p.coordsSource ?? null, a.derived.coordsSource],
    ['FAQ data', (p.faqs ?? []).map((f) => [f.question, f.answer]), a.source.faqs.map((f) => [f.question, f.answer])],
    ['area data', p.neighborhoods, a.source.neighborhoods],
    ['area data · local specifics', p.localSpecifics, a.source.localSpecifics],
    ['media metadata · attachment id', p.hero?.attachmentId ?? null, a.source.hero?.attachmentId ?? null],
    ['media metadata · image key', p.hero?.imageKey ?? null, a.source.hero?.imageKey ?? null],
    ['media metadata · alt', p.hero?.alt ?? null, a.source.hero?.alt ?? null],
    ['media metadata · mime', p.hero?.mime ?? null, a.source.hero?.mime ?? null],
    ['media metadata · dimensions', [p.hero?.width ?? null, p.hero?.height ?? null], [a.source.hero?.width ?? null, a.source.hero?.height ?? null]],
    ['media metadata · filesize', p.hero?.filesize ?? null, a.source.hero?.filesize ?? null],
    ['media SHA-256', p.hero?.sha256 ?? null, a.source.hero?.sha256 ?? null],
    ['review flags', (p.reviewFlags ?? []).map((f) => f.code).sort(), a.flags.map((f) => f.code).sort()],
    ['publishable/needs_review status', gatePilot(p) ? 'publishable' : 'needs_review', gateAgent(a) ? 'publishable' : 'needs_review'],
  ];
  for (const [dimension, oldV, newV] of checks) {
    if (!eq(oldV, newV)) note(dimension, a.slug, `pilot ${JSON.stringify(oldV)?.slice(0, 90)} vs agent ${JSON.stringify(newV)?.slice(0, 90)}`);
  }
}
for (const p of pilotMigrated) if (!seen.has(p.slug)) note('slugs', p.slug, 'present in pilot, absent from agent dataset');

// ---- status totals ----------------------------------------------------------------------------
const totals = {
  pilot: { publishable: pilotMigrated.filter(gatePilot).length, needsReview: pilotMigrated.filter((c) => !gatePilot(c)).length, noSource: pilotNoSource.length },
  agent: { publishable: agentCities.filter(gateAgent).length, needsReview: agentCities.filter((c) => !gateAgent(c)).length, noSource: null },
};

// ---- report -----------------------------------------------------------------------------------
const DIMENSIONS = [
  'city count', 'WordPress post IDs', 'slugs', 'URLs', 'source content', 'source fields',
  'SEO values', 'local SEO', 'FAQ data', 'area data', 'media metadata', 'media SHA-256',
  'review flags', 'publishable/needs_review status',
];
console.log(`\nOLD  pilot  ${opt('--pilot', 'data/seed/minnesota.generated.json')}  (${pilotMigrated.length} migrated + ${pilotNoSource.length} no-source)`);
console.log(`NEW  agent  ${opt('--agent', 'data/seed/mn.migration.json')}  (${agentCities.length} migrated)\n`);
console.log('Dimension                              Result');
for (const d of DIMENSIONS) {
  const hits = differences.filter((x) => x.dimension === d || x.dimension.startsWith(d + ' ·'));
  console.log(`  ${d.padEnd(36)} ${hits.length === 0 ? 'identical' : `${hits.length} difference(s)`}`);
}
console.log(`\n  pilot: ${totals.pilot.publishable} publishable · ${totals.pilot.needsReview} needs_review · ${totals.pilot.noSource} no-source`);
console.log(`  agent: ${totals.agent.publishable} publishable · ${totals.agent.needsReview} needs_review`);

if (differences.length) {
  console.log(`\n${differences.length} difference(s):`);
  for (const d of differences.slice(0, 40)) console.log(`  ✗ [${d.dimension}] ${d.slug}: ${d.detail}`);
  if (differences.length > 40) console.log(`  … and ${differences.length - 40} more`);
} else {
  console.log('\nEvery compared dimension is identical across all 134 migrated city pages.');
}

if (args.includes('--json')) fs.writeFileSync(path.resolve(ROOT, opt('--json')), JSON.stringify({ counts, totals, differences }, null, 1) + '\n');
process.exit(differences.length ? 1 : 0);
