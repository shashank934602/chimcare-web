#!/usr/bin/env node
// Writes data/migrated-geocode.json: one map pin per city in the migrated route store.
//
//   node scripts/geocode-migrated-locations.mjs [--dry-run]
//
// The route store carries no coordinates, so the state hubs' map would have no pins. Each city is
// geocoded once through Nominatim (1 request/second, as its usage policy asks) and cached; cities
// already in the file are skipped, so re-running only fetches what is new. A published street
// address is tried first, then "City, ST" — and for a slug like `north-minneapolis` the base town
// ("Minneapolis, MN"), because Nominatim knows no such place. A city nothing resolves is left out
// and simply gets no pin.

import fs from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { placeFromSlug } from '../lib/content/place-from-slug.mjs';

const DRY = process.argv.includes('--dry-run');
const ROOT = process.cwd();
const STORE = path.join(ROOT, 'data/routes.sqlite');
const OUT = path.join(ROOT, 'data/migrated-geocode.json');
const UA = 'chimcare-web/1.0 (https://chimcare-web.vercel.app)';

const db = new DatabaseSync(STORE, { readOnly: true });
const rows = db.prepare('SELECT slug, payload FROM routes').all();

/** city key `st/city-slug` → { name, st, addresses } */
const cities = new Map();
for (const { slug, payload } of rows) {
  const route = JSON.parse(inflateSync(payload).toString('utf8'));
  // Every URL shape, the same reading the hubs use (lib/content/place-from-slug.mjs).
  const place = placeFromSlug(slug, route.title);
  if (!place) continue;
  const key = `${place.code.toLowerCase()}/${place.citySlug}`;
  const entry = cities.get(key) ?? { name: place.city, st: place.code, addresses: new Set() };
  if (route.jobLocation) entry.addresses.add(String(route.jobLocation));
  cities.set(key, entry);
}

const cache = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const todo = [...cities].filter(([key]) => !cache[key]);
console.log(`${cities.size} cities, ${cities.size - todo.length} cached, ${todo.length} to geocode${DRY ? ' (dry run)' : ''}`);
if (DRY) process.exit(0);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function search(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  await sleep(1100);
  if (!res.ok) return null;
  const [hit] = await res.json();
  return hit ? { lat: Number(Number(hit.lat).toFixed(5)), lng: Number(Number(hit.lon).toFixed(5)) } : null;
}

const cleanAddress = (a) => a.replace(/\s*United States\s*$/i, '').replace(/\s*,\s*/g, ', ').replace(/,?\s*(Suite|Ste|STE)\b[^,]*/g, '').trim();
const baseTown = (name) => name.replace(/^(north|south|east|west|northeast|northwest|southeast|southwest|central|ne|nw|se|sw)\s+/i, '');

for (const [key, c] of todo) {
  const queries = [...[...c.addresses].map(cleanAddress), `${c.name}, ${c.st}`, `${baseTown(c.name)}, ${c.st}`];
  let hit = null;
  let used = null;
  // A query with nothing before the state (", CA" from an address that is only a state) matches the
  // middle of the state, not the town: skip it.
  for (const q of [...new Set(queries)].filter((q) => /[a-z0-9]/i.test(q.replace(/,?\s*[A-Z]{2}(\s+\d{5})?\s*$/, '')))) {
    hit = await search(q);
    if (hit) { used = q; break; }
  }
  if (hit) {
    cache[key] = { ...hit, query: used };
    console.log(`  ${key} → ${hit.lat},${hit.lng}  (${used})`);
  } else {
    console.log(`  ${key} → not found`);
  }
}

const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(OUT, JSON.stringify(sorted, null, 2) + '\n');
console.log(`wrote ${Object.keys(sorted).length} entries to ${path.relative(ROOT, OUT)}`);
