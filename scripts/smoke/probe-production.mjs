// Production baseline for the 10 smoke URLs. READ ONLY.
//
// GET only, redirects never followed automatically — each hop is fetched by hand so the chain is
// observed rather than inferred. Nothing is written to WordPress, Cloudflare or DNS, and the fate
// maps are not consulted: what production does is the evidence.
//
//   node scripts/smoke/probe-production.mjs [--origin https://www.chimcare.com]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const opt = (n, d) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : d);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ORIGIN = opt('--origin', 'https://www.chimcare.com').replace(/\/$/, '');
const IN = path.join(ROOT, 'data/smoke-10/smoke-urls.csv');
const OUT = path.join(ROOT, 'data/smoke-10/production-truth.csv');
const UA = 'chimcare-migration-smoke/1.0 (+migration parity check; contact harold@chimcare.com)';
const MAX_HOPS = 10;

const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const attr = (html, re) => (html.match(re) ?? [])[1]?.trim() ?? '';
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** The visible body text, so a byte difference in markup does not read as a content change. */
function mainText(html) {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  return strip(body.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' '));
}

function parseCsvLine(line) {
  const parts = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

const rows = fs.readFileSync(IN, 'utf8').trim().split('\n').slice(1)
  .map(parseCsvLine).map((p) => ({ pilot_id: p[0], url: p[2] }));

const out = [];
for (const { pilot_id, url } of rows) {
  const chain = [];
  let current = ORIGIN + url;
  let first = null;
  let res = null;
  const t0 = Date.now();
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    res = await fetch(current, { redirect: 'manual', headers: { 'User-Agent': UA, Accept: 'text/html,*/*' } });
    if (first === null) first = res.status;
    const loc = res.headers.get('location');
    if (![301, 302, 303, 307, 308].includes(res.status) || !loc) break;
    chain.push(`${res.status} ${current} -> ${loc}`);
    current = new URL(loc, current).toString();
    await new Promise((r) => setTimeout(r, 120)); // stay well under 20 rps
  }
  const ms = Date.now() - t0;
  const ctype = res.headers.get('content-type') ?? '';
  const html = ctype.includes('text/html') ? await res.text() : '';
  out.push({
    pilot_id, url,
    first_status: first,
    final_status: res.status,
    final_url: current,
    redirect_chain: chain.join(' | '),
    canonical: attr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i),
    title: strip(attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i)),
    h1: strip(attr(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)),
    meta_description: attr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i),
    robots: attr(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i),
    content_type: ctype,
    content_length: html.length || Number(res.headers.get('content-length') ?? 0),
    body_sha256: html ? sha(html) : '',
    main_text_sha256: html ? sha(mainText(html)) : '',
    response_time_ms: ms,
    probed_at: new Date().toISOString(),
  });
  console.log(`${pilot_id} ${String(first).padEnd(3)} -> ${String(res.status).padEnd(3)} ${chain.length} hop(s)  ${url}`);
  await new Promise((r) => setTimeout(r, 150));
}

const cols = Object.keys(out[0]);
const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
fs.writeFileSync(OUT, [cols.join(','), ...out.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n');
console.log(`\nwrote ${path.relative(ROOT, OUT)} (${out.length} rows). Nothing on the origin was modified.`);
