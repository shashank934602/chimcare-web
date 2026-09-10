// WordPress source for the 10 smoke URLs. SELECT ONLY.
//
// Reads the post row, its Yoast meta and its thumbnail id straight out of `chimcare_local`, and
// stores `post_content` byte-for-byte. Nothing is cleaned, normalised or repaired here: the row
// written to page-source.jsonl is what WordPress holds, and its SHA-256 is recorded so any later
// claim about "the source" can be checked against it.
//
// Defects are OBSERVED, never fixed. `source_defects` records what is wrong with the markup so the
// render boundary (lib/content/verbatim.ts) can be held to account for exactly those things.
//
//   node scripts/smoke/extract-source.mjs [--db chimcare_local] [--host 127.0.0.1] [--user root]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { makeQuery } from '../migrate/source.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : d);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const IN = path.join(ROOT, 'data/smoke-10/smoke-urls.csv');
const OUT = path.join(ROOT, 'data/smoke-10/page-source.jsonl');
const query = makeQuery({ host: opt('--host', '127.0.0.1'), user: opt('--user', 'root'), database: opt('--db', 'chimcare_local') });
const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');

function parseCsvLine(line) {
  const parts = []; let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur); return parts;
}

const rows = fs.readFileSync(IN, 'utf8').trim().split('\n').slice(1).map(parseCsvLine)
  .map((p) => ({ pilot_id: p[0], url: p[2], template: p[11] }));

/** Every defect this smoke test knows how to look for. Observed only. */
function defectsOf(content) {
  const d = [];
  const vc = content.match(/\[\/?vc_[a-z_]*(?:\s[^\]]*)?\]/gi) ?? [];
  if (vc.length) d.push({ code: 'wpbakery_shortcode_in_body', count: vc.length, sample: vc[0] });
  const other = content.match(/\[(?!\/?vc_)[a-z][a-z0-9_-]*(?:\s[^\]]*)?\]/gi) ?? [];
  if (other.length) d.push({ code: 'other_shortcode_in_body', count: other.length, sample: other[0] });
  const scripts = content.match(/<script\b/gi) ?? [];
  if (scripts.length) d.push({ code: 'script_tag_in_body', count: scripts.length });
  const handlers = content.match(/\son[a-z]+\s*=/gi) ?? [];
  if (handlers.length) d.push({ code: 'inline_event_handler', count: handlers.length });
  const jsUrls = content.match(/(?:href|src)\s*=\s*["']\s*javascript:/gi) ?? [];
  if (jsUrls.length) d.push({ code: 'javascript_url', count: jsUrls.length });
  return d;
}

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const out = [];

for (const r of rows) {
  const slug = r.url.replace(/\/+$/, '').split('/').pop();
  const isLocation = r.url.startsWith('/location/');
  // Hub URLs are WordPress pages, not job_listings, so match on the path rather than the slug alone.
  const sql = `SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
      'wp_post_id', p.ID, 'post_type', p.post_type, 'post_status', p.post_status,
      'post_title', p.post_title, 'post_name', p.post_name, 'post_modified', p.post_modified,
      'post_content', p.post_content,
      'yoast_title', (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_yoast_wpseo_title' LIMIT 1),
      'yoast_metadesc', (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_yoast_wpseo_metadesc' LIMIT 1),
      'yoast_canonical', (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_yoast_wpseo_canonical' LIMIT 1),
      'yoast_robots_noindex', (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_yoast_wpseo_meta-robots-noindex' LIMIT 1),
      'thumbnail_id', (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_thumbnail_id' LIMIT 1)
    )), JSON_ARRAY()) FROM wp_posts p
    WHERE p.post_name = '${esc(slug || 'locations')}' AND p.post_status = 'publish'
      ${isLocation ? "AND p.post_type = 'job_listing'" : "AND p.post_type IN ('page','post')"}
    LIMIT 3`;

  const found = query(sql);
  if (!found.length) {
    out.push({ pilot_id: r.pilot_id, url: r.url, template: r.template, found: false, reason: 'no published WordPress row matches this path' });
    console.log(`${r.pilot_id} —   no source row            ${r.url}`);
    continue;
  }
  const p = found[0];
  const content = p.post_content ?? '';
  const rec = {
    pilot_id: r.pilot_id,
    url: r.url,
    template: r.template,
    found: true,
    wp_post_id: p.wp_post_id,
    post_type: p.post_type,
    post_status: p.post_status,
    post_title: p.post_title,
    post_name: p.post_name,
    post_modified: p.post_modified,
    post_content: content,
    yoast_title: p.yoast_title ?? null,
    yoast_metadesc: p.yoast_metadesc ?? null,
    yoast_canonical: p.yoast_canonical ?? null,
    yoast_robots_noindex: p.yoast_robots_noindex ?? null,
    thumbnail_id: p.thumbnail_id ? Number(p.thumbnail_id) : null,
    source_url: `https://www.chimcare.com${r.url}`,
    content_sha256: sha(content),
    content_length: content.length,
    source_defects: defectsOf(content),
    extracted_at: new Date().toISOString(),
  };
  out.push(rec);
  console.log(`${r.pilot_id} #${String(p.wp_post_id).padEnd(7)} ${String(content.length).padStart(6)} bytes  defects=${rec.source_defects.map((d) => d.code).join(',') || 'none'}  ${r.url}`);
}

fs.writeFileSync(OUT, out.map((r) => JSON.stringify(r)).join('\n') + '\n');
const withSource = out.filter((r) => r.found).length;
console.log(`\nwrote ${path.relative(ROOT, OUT)} — ${withSource}/${out.length} with a WordPress source row. SELECT only; WordPress unchanged.`);
