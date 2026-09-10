// Extracts the WordPress body for every published location page in a state, so the application can
// render each page from its own source instead of from master copy.
//
// SELECT only. `post_content` is stored byte-for-byte with its SHA-256; nothing is cleaned here.
// Cleaning happens at the render boundary, in lib/content/source-sections.ts.
//
//   node scripts/extract-page-source.mjs --state mn [--db chimcare_local]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (n, d) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : d);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const STATE = opt('--state', 'mn').toLowerCase();
const OUT = path.join(ROOT, `data/seed/${STATE}.page-source.jsonl`);
const DB = { host: opt('--host', '127.0.0.1'), user: opt('--user', 'root'), database: opt('--db', 'chimcare_local') };

const q = (sql) => {
  const out = execFileSync('mysql', ['-h', DB.host, '-u', DB.user, `--database=${DB.database}`, '-N', '-B', '--raw', '-e', sql], { maxBuffer: 1 << 30, encoding: 'utf8' });
  const t = out.trim();
  return t && t !== 'NULL' ? JSON.parse(t) : [];
};

console.log(`extracting published ${STATE.toUpperCase()} location bodies (SELECT only) …`);
const ids = q(`SELECT COALESCE(JSON_ARRAYAGG(ID), JSON_ARRAY()) FROM wp_posts
  WHERE post_type='job_listing' AND post_status='publish' AND post_name LIKE '%-${STATE}'`);
console.log(`  ${ids.length} pages`);

const rows = [];
const CHUNK = 200;
for (let i = 0; i < ids.length; i += CHUNK) {
  const batch = ids.slice(i, i + CHUNK);
  const got = q(`SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
      'wp_post_id', p.ID, 'slug', p.post_name, 'post_title', p.post_title,
      'post_modified', p.post_modified, 'post_content', p.post_content,
      'yoast_title', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_yoast_wpseo_title' LIMIT 1),
      'yoast_metadesc', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_yoast_wpseo_metadesc' LIMIT 1),
      'yoast_canonical', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_yoast_wpseo_canonical' LIMIT 1),
      'thumbnail_id', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_thumbnail_id' LIMIT 1),
      'phone', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_phone' LIMIT 1),
      'job_location', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_job_location' LIMIT 1)
    )), JSON_ARRAY()) FROM wp_posts p WHERE p.ID IN (${batch.join(',')})`);
  for (const r of got) {
    const content = r.post_content ?? '';
    rows.push({
      slug: r.slug,
      wpPostId: r.wp_post_id,
      postTitle: r.post_title ?? '',
      postContent: content,
      postModified: r.post_modified ?? null,
      yoastTitle: r.yoast_title ?? null,
      yoastMetadesc: r.yoast_metadesc ?? null,
      yoastCanonical: r.yoast_canonical ?? null,
      thumbnailId: r.thumbnail_id ? Number(r.thumbnail_id) : null,
      phone: r.phone ?? null,
      jobLocation: r.job_location ?? null,
      contentSha256: crypto.createHash('sha256').update(content, 'utf8').digest('hex'),
    });
  }
  process.stdout.write(`\r  extracted ${rows.length}/${ids.length}`);
}
rows.sort((a, b) => a.slug.localeCompare(b.slug));
fs.writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const bytes = rows.reduce((n, r) => n + r.postContent.length, 0);
console.log(`\nwrote ${path.relative(ROOT, OUT)} — ${rows.length} pages, ${(bytes / 1e6).toFixed(1)} MB of source. WordPress unchanged.`);
