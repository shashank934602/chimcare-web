#!/usr/bin/env node
// Smoke test: does the site actually work, end to end, right now?
//
//   node scripts/smoke.mjs                              # http://localhost:3200
//   node scripts/smoke.mjs https://chimcare-web.vercel.app
//   node scripts/smoke.mjs http://localhost:3000 --sample 50 --write
//
// It checks five things, in the order that matters:
//   1. every page type answers                     (a 500 anywhere is the end of the test)
//   2. the routing rules hold                      (redirects redirect, unknown slugs 404)
//   3. a sample of real migrated pages is sound    (heading, title, canonical, JSON-LD, no slot leaks)
//   4. the APIs answer, including the failure path (422 on a bad booking, not a 500)
//   5. what a search engine would see              (robots, sitemap) — reported, never failed on
//
// WHY IT EXISTS. The pipeline's own gates pass on things a visitor would call broken: a page that
// renders 200 with a whole section missing, or a title reading "Round Lake Beach ,IL". Those were
// both found by looking at pages, not by the gates. This is the cheap version of looking.
//
// `--write` allows the one destructive check (POST a booking and read it back). It is off by default
// so that running this against production does not create rows in the client's database.

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const base = (process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:3200').replace(/\/$/, '');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const SAMPLE = Number(arg('sample', 25));
const WRITE = process.argv.includes('--write');
const TOKEN = process.env.ADMIN_TOKEN || 'verify-local';

let pass = 0;
const failures = [];
const ok = (name, good, detail = '') => {
  if (good) {
    pass += 1;
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
  process.stdout.write(good ? '.' : 'F');
};

const get = async (p, init) => {
  const url = p.startsWith('http') ? p : base + p;
  const response = await fetch(url, { redirect: 'manual', ...init });
  const body = response.status < 400 || response.status === 422 ? await response.text() : '';
  return { status: response.status, location: response.headers.get('location'), body };
};

// --- 1. every page type answers -----------------------------------------------------------------
const CHROME = ['/', '/about-us/', '/contact-us/', '/chimcare-services/', '/locations/', '/locations/mn/'];

// --- 2. routing rules ---------------------------------------------------------------------------
const ROUTING = [
  { path: '/services/', expect: 308, to: '/chimcare-services/', why: 'the old services URL redirects' },
  { path: '/location/definitely-not-a-real-page-xyz/', expect: 404, why: 'an unknown slug is a 404' },
];

// --- 3. what a migrated page must have ----------------------------------------------------------
function pageProblems(html, slug) {
  const problems = [];
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '';
  const text = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  if (h1s.length !== 1) problems.push(`${h1s.length} h1 tags`);
  else if (!text(h1s[0][1])) problems.push('empty h1');
  if (!title.trim()) problems.push('no title');
  // The title faults this project has actually shipped: a space before the comma, no space after it,
  // and a missing city leaving ", ST" dangling. See P-080.
  if (/\s,/.test(title)) problems.push(`title has a space before a comma: ${title.slice(0, 60)}`);
  if (/,[A-Z]{2}\b/.test(title)) problems.push(`title missing a space after the comma: ${title.slice(0, 60)}`);
  if (/\bin\s*,/.test(title)) problems.push(`title names no city: ${title.slice(0, 60)}`);
  if (/\{\{[a-z.]+\}\}/i.test(html)) problems.push('unfilled {{slot}} on the page');
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1];
  if (!canonical) problems.push('no canonical');
  else if (!canonical.endsWith(`/location/${slug}/`)) problems.push(`canonical points elsewhere: ${canonical}`);
  if (!/application\/ld\+json/i.test(html)) problems.push('no JSON-LD');
  if (!/<img\b/i.test(html)) problems.push('no images at all');
  return problems;
}

function sampleSlugs(n) {
  try {
    const db = new DatabaseSync(path.join(process.cwd(), 'data/routes.sqlite'), { readOnly: true });
    const rows = db.prepare('SELECT slug FROM routes ORDER BY RANDOM() LIMIT ?').all(n);
    db.close();
    return rows.map((r) => r.slug);
  } catch {
    return []; // no local store (testing a remote host from elsewhere): the page checks are skipped
  }
}

async function main() {
  console.log(`smoke test · ${base}${WRITE ? ' · with write checks' : ''}\n`);

  process.stdout.write('  pages       ');
  for (const p of CHROME) {
    const r = await get(p);
    ok(`page ${p}`, r.status === 200, `HTTP ${r.status}`);
  }
  console.log();

  process.stdout.write('  routing     ');
  for (const rule of ROUTING) {
    const r = await get(rule.path);
    const good = r.status === rule.expect && (!rule.to || (r.location ?? '').endsWith(rule.to));
    ok(rule.why, good, `HTTP ${r.status}${r.location ? ` → ${r.location}` : ''}`);
  }
  console.log();

  const slugs = sampleSlugs(SAMPLE);
  process.stdout.write(`  pages (${slugs.length})  `);
  let cards = 0;
  for (const slug of slugs) {
    const r = await get(`/location/${slug}/`);
    if (r.status !== 200) {
      ok(`/location/${slug}/`, false, `HTTP ${r.status}`);
      continue;
    }
    cards += (r.body.match(/svc-card/g) || []).length ? 1 : 0;
    const problems = pageProblems(r.body, slug);
    ok(`/location/${slug}/`, problems.length === 0, problems.join('; '));
  }
  console.log(slugs.length ? `\n              ${cards}/${slugs.length} of them show service cards` : '  (no local route store — skipped)');

  process.stdout.write('  apis        ');
  const health = await get('/api/health/');
  ok('health', health.status === 200 && /"ok":\s*true/.test(health.body), `HTTP ${health.status}`);
  // A served ZIP must resolve to somewhere we can send the visitor. Some ZIPs answer with the city
  // page and some only with the state hub (measured: 19 of 24 give a city), and both are valid
  // answers — what would be broken is `match: none` or a reply with no link in it.
  const zip = await get('/api/zip-lookup/?zip=02101');
  let zipOk = false;
  try {
    const parsed = JSON.parse(zip.body);
    zipOk = zip.status === 200 && ['city', 'state'].includes(parsed.match) && Boolean(parsed.href);
  } catch { /* falls through to a failure with the body in the message */ }
  ok('zip lookup resolves a served ZIP', zipOk, `HTTP ${zip.status} ${zip.body.slice(0, 80)}`);
  const unserved = await get('/api/zip-lookup/?zip=99999');
  ok('an unserved ZIP answers cleanly', unserved.status === 200, `HTTP ${unserved.status}`);
  const locate = await get('/api/locate/');
  ok('locate answers', locate.status === 200, `HTTP ${locate.status}`);
  const bad = await get('/api/bookings/', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'nonsense' }),
  });
  ok('a bad booking is rejected, not a 500', bad.status === 422, `HTTP ${bad.status}`);
  if (WRITE) {
    const good = await get('/api/bookings/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        service: 'Chimney Inspection', zip: '55415', name: 'Smoke Test', phone: '612-555-0100',
        email: 'smoke@example.com', address: '1 Test St', when: 'asap', notes: 'automated smoke test',
      }),
    });
    ok('a valid booking is accepted', good.status === 201 && /reference/.test(good.body), `HTTP ${good.status}`);
  }
  console.log();

  // --- 5. what a crawler sees: reported, never failed on. Blocking Google is correct until cutover.
  const robots = await get('/robots.txt');
  const blocked = /Disallow:\s*\/\s*$/m.test(robots.body);
  const sitemap = await get('/sitemap.xml');
  console.log(`\n  search engines: robots ${blocked ? 'BLOCKS everything' : 'allows crawling'} · sitemap.xml ${sitemap.status === 200 ? 'present' : `absent (HTTP ${sitemap.status})`}`);
  if (blocked) console.log('  → correct while this is a preview URL; must flip at cutover, with a sitemap.');

  console.log(`\n  ${pass} passed, ${failures.length} failed`);
  for (const f of failures.slice(0, 20)) console.log(`    FAIL  ${f}`);
  if (failures.length > 20) console.log(`    … and ${failures.length - 20} more`);
  process.exit(failures.length ? 1 : 0);
}

main().catch((error) => {
  console.error('\nsmoke test could not run:', error.message);
  process.exit(2);
});
