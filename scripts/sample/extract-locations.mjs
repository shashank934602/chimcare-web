// Pulls a random cross-state sample of real location pages out of WordPress and parses each body
// into the sections it actually contains. SELECT only; WordPress is never written to.
//
// The sample is random on purpose: the template has to hold for pages nobody picked.
//
//   node scripts/sample/extract-locations.mjs [--n 12] [--seed 42] [--states WA,MA,CA,OR,IL,GA,OH,WI]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (n, d) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : d);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(ROOT, 'data/sample/location-sample.jsonl');
const N = Number(opt('--n', '12'));
const SEED = Number(opt('--seed', '42'));
const STATES = opt('--states', 'wa,ma,ca,or,il,ga,oh,wi,nh,ri').split(',').map((s) => s.trim().toLowerCase());

const DB = { host: '127.0.0.1', user: 'root', database: 'chimcare_local' };
const q = (sql) => {
  const out = execFileSync('mysql', ['-h', DB.host, '-u', DB.user, `--database=${DB.database}`, '-N', '-B', '--raw', '-e', sql], { maxBuffer: 1 << 30, encoding: 'utf8' });
  const t = out.trim();
  return t && t !== 'NULL' ? JSON.parse(t) : [];
};

// A deterministic shuffle, so --seed reproduces the same sample.
let s = SEED >>> 0;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);

const like = STATES.map((st) => `post_name LIKE '%-${st}'`).join(' OR ');
console.log(`picking ${N} random published location pages across ${STATES.join(', ').toUpperCase()} …`);

// Candidate pool: published job_listings in those states with a body worth rendering.
const pool = q(`SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', ID, 'slug', post_name, 'len', LENGTH(post_content))), JSON_ARRAY())
  FROM (SELECT ID, post_name, post_content FROM wp_posts
        WHERE post_type='job_listing' AND post_status='publish' AND (${like})
          AND LENGTH(post_content) > 3000
        ORDER BY ID LIMIT 40000) t`);
console.log(`  pool: ${pool.length} pages`);

const shuffled = pool.map((p) => ({ p, k: rnd() })).sort((a, b) => a.k - b.k).map((x) => x.p);
// Spread across states rather than taking whatever the shuffle clusters on.
const picked = [];
const perState = new Map();
for (const row of shuffled) {
  const st = row.slug.slice(-2);
  const seen = perState.get(st) ?? 0;
  if (seen >= Math.ceil(N / Math.min(STATES.length, N))) continue;
  perState.set(st, seen + 1);
  picked.push(row);
  if (picked.length >= N) break;
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const out = [];
for (const row of picked) {
  const [p] = q(`SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
      'wp_post_id', p.ID, 'post_title', p.post_title, 'post_name', p.post_name,
      'post_modified', p.post_modified, 'post_content', p.post_content,
      'yoast_title', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_yoast_wpseo_title' LIMIT 1),
      'yoast_metadesc', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_yoast_wpseo_metadesc' LIMIT 1),
      'thumbnail_id', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_thumbnail_id' LIMIT 1),
      'phone', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_phone' LIMIT 1),
      'location', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_job_location' LIMIT 1)
    )), JSON_ARRAY()) FROM wp_posts p WHERE p.ID=${row.id}`);
  if (!p) continue;
  const slug = p.post_name;
  const st = slug.slice(-2).toUpperCase();
  // service and city come from the slug's own shape; neither is guessed
  const m = /^(.*?)-in-(.+)-[a-z]{2}$/.exec(slug) ?? /^(.*?)-(.+)-[a-z]{2}$/.exec(slug);
  out.push({
    id: `L${String(out.length + 1).padStart(2, '0')}`,
    url: `/location/${slug}/`,
    slug,
    state: st,
    serviceSlug: m ? m[1] : null,
    citySlug: m ? m[2] : null,
    wp_post_id: p.wp_post_id,
    post_title: p.post_title,
    post_modified: p.post_modified,
    post_content: p.post_content,
    yoast_title: p.yoast_title ?? null,
    yoast_metadesc: p.yoast_metadesc ?? null,
    thumbnail_id: p.thumbnail_id ? Number(p.thumbnail_id) : null,
    phone: p.phone ?? null,
    location: p.location ?? null,
    content_sha256: crypto.createHash('sha256').update(p.post_content ?? '', 'utf8').digest('hex'),
    content_length: (p.post_content ?? '').length,
  });
  console.log(`  ${out.at(-1).id} ${st}  ${slug}  (${out.at(-1).content_length.toLocaleString()} bytes)`);
}

fs.writeFileSync(OUT, out.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`\nwrote ${path.relative(ROOT, OUT)} — ${out.length} pages across ${new Set(out.map((r) => r.state)).size} states. SELECT only.`);
