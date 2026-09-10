// The smoke test itself: render the 10 real URLs through the real templates and compare what came
// out against production and against the WordPress source.
//
// Reads data/smoke-10/{smoke-urls.csv, production-truth.csv, page-source.jsonl}.
// Writes data/smoke-10/{parity-report.csv, conflicts.csv, summary.json}.
//
//   node scripts/smoke/parity.mjs [http://localhost:3000]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { cleanVerbatim } from '../../lib/content/verbatim.ts';

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DIR = path.join(ROOT, 'data/smoke-10');

const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const attr = (h, re) => (h.match(re) ?? [])[1]?.trim() ?? '';
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const markupOf = (h) => h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

function parseCsv(text) {
  const lines = text.trim().split('\n');
  const head = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const parts = []; let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { parts.push(cur); cur = ''; continue; }
      cur += ch;
    }
    parts.push(cur);
    return Object.fromEntries(head.map((h, i) => [h, parts[i] ?? '']));
  });
}

const selection = parseCsv(fs.readFileSync(path.join(DIR, 'smoke-urls.csv'), 'utf8'));
const prod = Object.fromEntries(parseCsv(fs.readFileSync(path.join(DIR, 'production-truth.csv'), 'utf8')).map((r) => [r.pilot_id, r]));
const source = Object.fromEntries(
  fs.readFileSync(path.join(DIR, 'page-source.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).map((r) => [r.pilot_id, r]),
);

/** Which template did the app actually use? Read it off the rendered markup, not off our own plan. */
function templateOf(html) {
  const m = markupOf(html);
  if (m.includes('class="tpl-legacy"')) return 'LegacyPage';
  if (m.includes('tpl-service')) return 'ServicePage';
  if (m.includes('tpl-city')) return 'CityPage';
  if (m.includes('tpl-state')) return 'StateHub';
  if (m.includes('tpl-hub')) return 'NationalHub';
  return 'none';
}

const rows = [];
const conflicts = [];
const flag = (pilot_id, url, severity, code, expected, actual, note) =>
  conflicts.push({ pilot_id, url, severity, code, expected: String(expected ?? ''), actual: String(actual ?? ''), note: note ?? '' });

for (const sel of selection) {
  const { pilot_id, url } = sel;
  const p = prod[pilot_id] ?? {};
  const src = source[pilot_id] ?? {};

  // LegacyPage is not on the production route yet and must not be: `/location/[slug]/` still answers
  // 404 for kind='legacy' (ISSUE-006). It is rendered through the admin-gated source preview
  // instead, and the production route's own answer is recorded separately so the gap stays visible.
  const isLegacy = sel.template.startsWith('LegacyPage');
  let legacyRouteStatus = '';
  if (isLegacy) {
    legacyRouteStatus = String((await fetch(base + url, { redirect: 'manual' })).status);
  }
  const renderUrl = isLegacy ? `/admin/preview/legacy/${pilot_id}/` : url;

  // Never follow automatically: the status and the destination are both evidence.
  const res = await fetch(base + renderUrl, { redirect: 'manual' });
  const localFirst = res.status;
  let localFinal = res.status;
  let localFinalUrl = base + renderUrl;
  const chain = [];
  let r = res;
  for (let hop = 0; hop < 10 && [301, 302, 303, 307, 308].includes(r.status); hop++) {
    const loc = r.headers.get('location');
    if (!loc) break;
    chain.push(`${r.status} ${localFinalUrl} -> ${loc}`);
    localFinalUrl = new URL(loc, localFinalUrl).toString();
    r = await fetch(localFinalUrl, { redirect: 'manual' });
    localFinal = r.status;
  }
  const html = (r.headers.get('content-type') ?? '').includes('text/html') ? await r.text() : '';
  const m = markupOf(html);

  const rendered = {
    template: templateOf(html),
    title: strip(attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i)),
    h1: strip(attr(m, /<h1[^>]*>([\s\S]*?)<\/h1>/i)),
    canonical: attr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i),
    description: attr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i),
    robots: attr(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i),
    jsonLdBlocks: (html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi) ?? []).length,
    images: [...m.matchAll(/<img\b[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((x) => x[1]),
    imagesNoAlt: [...m.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/gi)].length,
    internalLinks: new Set([...m.matchAll(/href=["'](\/[^"'#?]*)["']/g)].map((x) => x[1])).size,
    mainTextSha: html ? sha(strip((/<main[^>]*>([\s\S]*?)<\/main>/i.exec(m) ?? [, ''])[1])) : '',
  };

  const expectedTemplate = sel.template.replace(/ .*/, '').replace(/^Redirect$/, 'CityPage');
  const prodFinalPath = p.final_url ? new URL(p.final_url).pathname : '';
  const localFinalPath = new URL(localFinalUrl).pathname;

  // ---- checks -------------------------------------------------------------------------------
  const checks = {};

  checks.production_captured = p.first_status ? 'PASS' : 'FAIL';

  // A legacy URL still answering 404 on the production route is the expected state of this phase,
  // recorded rather than passed over.
  if (isLegacy) {
    checks.legacy_route_not_active = legacyRouteStatus === '404' ? 'PASS' : 'REVIEW';
    flag(pilot_id, url, 'REVIEW', 'legacy_url_404s_on_the_production_route', 'rendered via the admin source preview',
      `/location/ route returns ${legacyRouteStatus}`,
      'Expected in this phase. Connecting LegacyPage to the dispatcher is ISSUE-006 and a separate decision.');
  }

  // Status: production is the baseline. A local 404 where production serves 200 is a real failure.
  if (String(p.final_status) === String(localFinal)) checks.status = 'PASS';
  else if (p.final_status === '200' && localFinal === 404) {
    checks.status = 'FAIL';
    flag(pilot_id, url, 'CRITICAL', 'unexpected_404', `production ${p.final_status}`, `local ${localFinal}`,
      'Production serves this page; the local build does not.');
  } else {
    checks.status = 'REVIEW';
    flag(pilot_id, url, 'REVIEW', 'status_differs', `production ${p.final_status}`, `local ${localFinal}`, '');
  }

  // Redirect status code: production uses 301, the in-app fallback emits 308.
  if (chain.length || (p.redirect_chain ?? '').length) {
    const prodCode = (p.redirect_chain.match(/^(\d{3})/) ?? [])[1] ?? '';
    const localCode = (chain[0]?.match(/^(\d{3})/) ?? [])[1] ?? '';
    if (prodCode && localCode && prodCode !== localCode) {
      checks.redirect_status = 'REVIEW';
      flag(pilot_id, url, 'REVIEW', 'redirect_status_differs', prodCode, localCode,
        'Known: the app emits 308 where production emits 301. ISSUE-007; the edge answers the exact status at cutover.');
    } else checks.redirect_status = prodCode || localCode ? 'PASS' : 'N/A';
  } else checks.redirect_status = 'N/A';

  checks.final_url = !prodFinalPath ? 'N/A' : prodFinalPath === localFinalPath ? 'PASS' : 'REVIEW';
  if (checks.final_url === 'REVIEW') flag(pilot_id, url, 'REVIEW', 'final_url_differs', prodFinalPath, localFinalPath, '');

  checks.template = rendered.template === 'none' ? (localFinal === 200 ? 'FAIL' : 'N/A')
    : rendered.template === expectedTemplate ? 'PASS' : 'FAIL';
  if (checks.template === 'FAIL') flag(pilot_id, url, 'CRITICAL', 'wrong_template', expectedTemplate, rendered.template, '');

  // Canonical and robots belong to the ROUTE, not the template. A legacy page is rendered through
  // the admin preview, which is correctly noindex and carries no canonical; testing it here would
  // measure the preview. Neither can be answered for LegacyPage until it is routed (ISSUE-006), so
  // both are recorded as untestable rather than passed.
  if (isLegacy) {
    checks.canonical = 'REVIEW';
    checks.robots = 'REVIEW';
    flag(pilot_id, url, 'REVIEW', 'canonical_and_robots_untestable_for_legacy', 'self-canonical, indexable',
      `preview route: ${rendered.canonical || '(none)'} / ${rendered.robots || '(none)'}`,
      'The preview is deliberately noindex with no canonical. Both become testable when LegacyPage is routed — ISSUE-006.');
  }

  // Canonical must be self, and must keep the legacy path.
  if (isLegacy) { /* handled above */ }
  else if (localFinal !== 200) checks.canonical = 'N/A';
  else if (!rendered.canonical) { checks.canonical = 'FAIL'; flag(pilot_id, url, 'CRITICAL', 'canonical_missing', 'self-canonical', '(none)', ''); }
  else if (new URL(rendered.canonical).pathname === localFinalPath) checks.canonical = 'PASS';
  else { checks.canonical = 'FAIL'; flag(pilot_id, url, 'CRITICAL', 'canonical_not_self', localFinalPath, new URL(rendered.canonical).pathname, ''); }

  // Robots: nothing served on its own URL in this set may be noindex.
  if (!isLegacy) {
    checks.robots = localFinal !== 200 ? 'N/A' : /noindex/i.test(rendered.robots) ? 'FAIL' : 'PASS';
    if (checks.robots === 'FAIL') flag(pilot_id, url, 'CRITICAL', 'unexpected_noindex', 'indexable', rendered.robots, '');
  }

  // Title and description must come from WordPress where WordPress has them.
  const srcTitle = src.yoast_title ?? null;
  const srcDesc = src.yoast_metadesc ?? null;
  if (localFinal !== 200) { checks.title_source = 'N/A'; checks.description_source = 'N/A'; }
  else {
    checks.title_source = !srcTitle ? 'REVIEW' : rendered.title.includes(strip(srcTitle).split('%%')[0].trim().slice(0, 24)) ? 'PASS' : 'REVIEW';
    if (checks.title_source === 'REVIEW') flag(pilot_id, url, 'REVIEW', 'title_not_traceable_to_source', srcTitle ?? '(WordPress has none)', rendered.title, '');
    checks.description_source = !srcDesc ? 'REVIEW' : rendered.description === strip(srcDesc) ? 'PASS' : 'REVIEW';
    if (checks.description_source === 'REVIEW') flag(pilot_id, url, 'REVIEW', 'description_not_verbatim_from_source', srcDesc ?? '(WordPress has none)', rendered.description, srcDesc ? '' : 'specification §18 item 10: the fallback description is still open.');
  }

  checks.h1 = localFinal !== 200 ? 'N/A' : rendered.h1 ? 'PASS' : 'FAIL';
  if (checks.h1 === 'FAIL') flag(pilot_id, url, 'CRITICAL', 'h1_missing', 'one h1', '(none)', '');

  checks.structured_data = localFinal !== 200 ? 'N/A'
    : rendered.template === 'LegacyPage' ? (rendered.jsonLdBlocks === 0 ? 'PASS' : 'FAIL')
    : rendered.jsonLdBlocks > 0 ? 'PASS' : 'FAIL';
  if (checks.structured_data === 'FAIL') {
    flag(pilot_id, url, 'CRITICAL', rendered.template === 'LegacyPage' ? 'legacy_page_emitted_structured_data' : 'structured_data_missing',
      rendered.template === 'LegacyPage' ? '0 blocks' : '>=1 block', String(rendered.jsonLdBlocks), '');
  }
  // No rating markup, anywhere.
  if (localFinal === 200 && /"@type"\s*:\s*"(AggregateRating|Review)"/.test(html)) {
    checks.structured_data = 'FAIL';
    flag(pilot_id, url, 'CRITICAL', 'rating_markup_emitted', 'no AggregateRating/Review', 'present', '');
  }

  // Images: every one must resolve, and none may be missing alt text.
  let imgOk = 0, imgBad = 0;
  const badImages = [];
  for (const srcUrl of rendered.images.slice(0, 40)) {
    if (srcUrl.startsWith('data:')) { imgOk++; continue; }
    const abs = srcUrl.startsWith('http') ? srcUrl : base + srcUrl;
    try {
      const ir = await fetch(abs, { method: 'GET', headers: { Range: 'bytes=0-0' } });
      if (ir.ok || ir.status === 206) imgOk++; else { imgBad++; badImages.push(`${srcUrl} → ${ir.status}`); }
    } catch { imgBad++; badImages.push(`${srcUrl} → unreachable`); }
  }
  checks.images = localFinal !== 200 ? 'N/A' : imgBad === 0 ? 'PASS' : 'FAIL';
  if (imgBad) flag(pilot_id, url, 'CRITICAL', 'broken_image', '0 broken', String(imgBad), badImages.join(' | '));
  checks.image_alt = localFinal !== 200 ? 'N/A' : rendered.imagesNoAlt === 0 ? 'PASS' : 'REVIEW';
  if (rendered.imagesNoAlt) flag(pilot_id, url, 'REVIEW', 'image_without_alt', '0', String(rendered.imagesNoAlt), '');

  // Source content: for a verbatim page the rendered text must be the source text, cleaned only.
  checks.source_content = 'N/A';
  if (rendered.template === 'LegacyPage' && src.found) {
    // The rendered body must be the source body with only the documented cleanup applied. Compare
    // the normalised visible text of both, so markup differences do not read as content changes.
    const body = (/<div class="legacy-body"[^>]*>([\s\S]*?)<\/div>\s*(?:<p class="legacy-contact"|<aside)/i.exec(m) ?? [, ''])[1];
    const renderedText = strip(body);
    const expectedText = strip(cleanVerbatim(src.post_content ?? '').html);
    const same = sha(renderedText) === sha(expectedText);
    checks.source_content = same ? 'PASS' : 'FAIL';
    if (!same) {
      flag(pilot_id, url, 'CRITICAL', 'verbatim_content_differs_from_source',
        `sha256 ${sha(expectedText).slice(0, 16)} (${expectedText.length} chars)`,
        `sha256 ${sha(renderedText).slice(0, 16)} (${renderedText.length} chars)`,
        'The rendered body is not the source body with only the documented cleanup applied.');
    }
    // And the stored source must not have moved.
    if (sha(src.post_content ?? '') !== src.content_sha256) {
      checks.source_content = 'FAIL';
      flag(pilot_id, url, 'CRITICAL', 'source_content_mutated', src.content_sha256, sha(src.post_content ?? ''), 'The stored source no longer matches its recorded hash.');
    }
  } else if (src.found && localFinal === 200 && rendered.template !== 'none') {
    checks.source_content = 'PASS';
  }

  rows.push({
    pilot_id, url,
    render_url: renderUrl,
    expected_template: expectedTemplate,
    rendered_template: rendered.template,
    prod_first_status: p.first_status ?? '',
    prod_final_status: p.final_status ?? '',
    local_first_status: localFirst,
    local_final_status: localFinal,
    prod_final_path: prodFinalPath,
    local_final_path: localFinalPath,
    wp_post_id: src.wp_post_id ?? '',
    source_found: src.found ? 'yes' : 'no',
    rendered_title: rendered.title,
    rendered_h1: rendered.h1,
    rendered_canonical: rendered.canonical,
    rendered_description: rendered.description,
    rendered_robots: rendered.robots,
    jsonld_blocks: rendered.jsonLdBlocks,
    images_total: rendered.images.length,
    images_broken: imgBad,
    images_no_alt: rendered.imagesNoAlt,
    internal_links: rendered.internalLinks,
    main_text_sha256: rendered.mainTextSha,
    ...Object.fromEntries(Object.entries(checks).map(([k, v]) => [`check_${k}`, v])),
    verdict: Object.values(checks).includes('FAIL') ? 'FAIL' : Object.values(checks).includes('REVIEW') ? 'REVIEW' : 'PASS',
  });

  const v = rows.at(-1).verdict;
  console.log(`${pilot_id} ${v.padEnd(6)} prod ${String(p.final_status).padEnd(3)} local ${String(localFinal).padEnd(3)} ${rendered.template.padEnd(12)} imgs ${rendered.images.length}/${imgBad} bad  ${url}`);
}

const cols = Object.keys(rows[0]);
const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
fs.writeFileSync(path.join(DIR, 'parity-report.csv'), [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n');
const ccols = ['pilot_id', 'url', 'severity', 'code', 'expected', 'actual', 'note'];
fs.writeFileSync(path.join(DIR, 'conflicts.csv'), [ccols.join(','), ...conflicts.map((r) => ccols.map((c) => esc(r[c])).join(','))].join('\n') + '\n');

const counts = { PASS: 0, FAIL: 0, REVIEW: 0 };
for (const r of rows) counts[r.verdict]++;
const summary = {
  generatedAt: new Date().toISOString(),
  urls: rows.length,
  verdict: counts.FAIL > 0 ? 'SMOKE FAIL' : counts.REVIEW > 0 ? 'SMOKE REVIEW' : 'SMOKE PASS',
  counts,
  templates: rows.reduce((a, r) => ({ ...a, [r.rendered_template]: (a[r.rendered_template] ?? 0) + 1 }), {}),
  production: rows.reduce((a, r) => ({ ...a, [r.prod_final_status]: (a[r.prod_final_status] ?? 0) + 1 }), {}),
  sourceRows: rows.filter((r) => r.source_found === 'yes').length,
  imagesChecked: rows.reduce((n, r) => n + Number(r.images_total), 0),
  imagesBroken: rows.reduce((n, r) => n + Number(r.images_broken), 0),
  conflicts: { total: conflicts.length, critical: conflicts.filter((c) => c.severity === 'CRITICAL').length, review: conflicts.filter((c) => c.severity === 'REVIEW').length },
};
fs.writeFileSync(path.join(DIR, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');

console.log(`\n${summary.verdict}  —  PASS ${counts.PASS} · REVIEW ${counts.REVIEW} · FAIL ${counts.FAIL}`);
console.log(`conflicts: ${summary.conflicts.critical} critical, ${summary.conflicts.review} review`);
