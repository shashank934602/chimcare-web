// Step 0 extraction regression: checks data/seed/minnesota.generated.json against the sealed
// Minnesota baseline recorded in reports/PROJECT_CONTEXT_HANDOFF.md §4.
//
// The sealed baseline is an INPUT here, never an output. This script never edits it. A mismatch is
// reported and exits non-zero; it is not reconciled.
//
//   node scripts/regression/step0-extraction-regression.mjs

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const FILE = path.join(ROOT, 'data/seed/minnesota.generated.json');

// reports/PROJECT_CONTEXT_HANDOFF.md §4 — "VERIFIED, do not change"
const SEALED = {
  cities: 150,
  branchCities: 14,
  coverageCitiesWithPage: 120,
  citiesWithoutSourcePage: 16,
  branches: 14,
  migratedCityPages: 134,
  urls: 20479,
  urls200: 2864,
  urls308: 6803,
  urls404: 10812,
  legacyNotMigrated: 9568,
  gone: 1219,
};

const g = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const cities = g.cities, pages = g.pages;

const actual = {
  cities: cities.length,
  branchCities: cities.filter((c) => c.kind === 'branch').length,
  coverageCitiesWithPage: cities.filter((c) => c.kind === 'coverage' && !c.noCityPage).length,
  citiesWithoutSourcePage: cities.filter((c) => c.noCityPage).length,
  branches: g.branches.length,
  migratedCityPages: pages.filter((p) => p.kind === 'city' && p.status === 'published').length,
  urls: pages.length,
  urls308: pages.filter((p) => p.fate === 'redirect').length,
  gone: pages.filter((p) => p.fate === 'gone').length,
  legacyNotMigrated: pages.filter((p) => p.kind === 'legacy' && p.status === 'published').length,
};
// 200 = published service pages + published city pages that clear the gate; the gate runs in
// data/seed/minnesota.ts, so the counts the app will serve are derived there, not here.
actual.urls200 = null;
actual.urls404 = null;

const rows = [];
let fail = 0;
for (const [k, want] of Object.entries(SEALED)) {
  const got = actual[k];
  if (got === null || got === undefined) { rows.push([k, want, 'not measured here', '—']); continue; }
  const ok = got === want;
  if (!ok) fail++;
  rows.push([k, want, got, ok ? 'PASS' : `DIFF ${got - want > 0 ? '+' : ''}${got - want}`]);
}

const w = (s, n) => String(s).padEnd(n);
console.log(`${w('check', 26)}${w('sealed', 10)}${w('actual', 18)}result`);
for (const r of rows) console.log(`${w(r[0], 26)}${w(r[1], 10)}${w(r[2], 18)}${r[3]}`);

// Byte identity of the generated artefact, with the one non-deterministic field removed.
const stable = JSON.stringify({ ...g, generatedAt: undefined });
console.log(`\nsha256(generated, generatedAt excluded) = ${crypto.createHash('sha256').update(stable).digest('hex')}`);
console.log(`sha256(file as written)                 = ${crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex')}`);
console.log(`generatedAt                             = ${g.generatedAt ?? '(absent)'}`);
console.log(`\n${fail === 0 ? 'EXTRACTION REGRESSION: PASS' : `EXTRACTION REGRESSION: ${fail} MISMATCH(ES) — do not reconcile, log an issue`}`);
process.exit(fail === 0 ? 0 : 1);
