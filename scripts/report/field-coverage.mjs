// For every field a location page can show: does WordPress have it, does the pipeline read it, and
// does it reach the rendered page. Three columns, so a gap can be attributed rather than argued about.
//
//   node scripts/report/field-coverage.mjs [--sample 500] [--render 40]

import fs from 'node:fs';
import path from 'node:path';
import { parseSourceSections } from '../../lib/content/source-sections.ts';

const args = process.argv.slice(2);
const opt = (n, d) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : d);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const BASE = opt('--base', 'http://localhost:3000').replace(/\/$/, '');
const SAMPLE = Number(opt('--sample', '500'));
const RENDER = Number(opt('--render', '40'));
const SRC = path.join(ROOT, 'data/seed/mn.page-source.jsonl');

let s = 20260910 >>> 0;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);

console.log('reading source rows …');
const all = fs.readFileSync(SRC, 'utf8').trim().split('\n');
const picked = all.map((line) => ({ line, k: rnd() })).sort((a, b) => a.k - b.k).slice(0, SAMPLE).map((x) => JSON.parse(x.line));
console.log(`  ${all.length.toLocaleString()} rows on disk, sampling ${picked.length}`);

const wp = { post_title: 0, yoast_title: 0, yoast_metadesc: 0, yoast_canonical: 0, thumbnail_id: 0, phone: 0, job_location: 0 };
const parsed = { lead: 0, whyImportant: 0, whyTrust: 0, serviceDirectory: 0, process: 0, whyChooseUs: 0, areas: 0, faqs: 0, faqsWithItems: 0, bookCta: 0, unmatchedHeadings: 0 };
for (const r of picked) {
  if (r.postTitle) wp.post_title++;
  if (r.yoastTitle) wp.yoast_title++;
  if (r.yoastMetadesc) wp.yoast_metadesc++;
  if (r.yoastCanonical) wp.yoast_canonical++;
  if (r.thumbnailId) wp.thumbnail_id++;
  if (r.phone) wp.phone++;
  if (r.jobLocation) wp.job_location++;
  const p = parseSourceSections(r.postContent);
  if (p.lead) parsed.lead++;
  if (p.whyImportant) parsed.whyImportant++;
  if (p.whyTrust) parsed.whyTrust++;
  if (p.serviceDirectory) parsed.serviceDirectory++;
  if (p.process) parsed.process++;
  if (p.whyChooseUs) parsed.whyChooseUs++;
  if (p.areas) parsed.areas++;
  if (p.faqs) parsed.faqs++;
  if (p.faqs?.items.length) parsed.faqsWithItems++;
  if (p.bookCta) parsed.bookCta++;
  parsed.unmatchedHeadings += p.otherSections.length;
}

console.log(`fetching ${RENDER} of them from ${BASE} …`);
const rendered = { served: 0, notServed: 0, title: 0, titleWithSuffix: 0, description: 0, canonical: 0, h1: 0, heroImage: 0, phone: 0, address: 0, intro: 0, process: 0, areas: 0, faq: 0, whyChooseUs: 0, bookCta: 0, serviceDirectory: 0, unmatchedRendered: 0 };
const notServedSlugs = [];
for (const r of picked.slice(0, RENDER)) {
  const res = await fetch(`${BASE}/location/${r.slug}/`, { redirect: 'manual' });
  if (res.status !== 200) { rendered.notServed++; notServedSlugs.push(`${r.slug} → ${res.status}`); continue; }
  rendered.served++;
  const html = await res.text();
  const m = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const has = (re) => re.test(m);
  if (/<title[^>]*>[^<]+<\/title>/i.test(html)) rendered.title++;
  if (/<title[^>]*>[^<]*-\s*Chimcare<\/title>/i.test(html)) rendered.titleWithSuffix++;
  if (/name="description"\s+content="[^"]+"/i.test(html)) rendered.description++;
  if (/rel="canonical"/i.test(html)) rendered.canonical++;
  if (has(/<h1[^>]*>[\s\S]{3,}?<\/h1>/)) rendered.h1++;
  if (has(/class="hero-figure"/)) rendered.heroImage++;
  if (has(/class="addr"/)) rendered.address++;
  if (has(/href="tel:/)) rendered.phone++;
  if (has(/id="o1-intro"/)) rendered.intro++;
  if (has(/id="o1-process"/)) rendered.process++;
  if (has(/id="o1-areas"/)) rendered.areas++;
  if (has(/id="o1-faq"/)) rendered.faq++;
  if (has(/id="o1-contact"/)) rendered.whyChooseUs++;
  if (has(/id="o1-cta"/)) rendered.bookCta++;
  if (has(/id="o1-solutions"/)) rendered.serviceDirectory++;
  if (has(/From this page/)) rendered.unmatchedRendered++;
}

const row = (label, a, b, c, v) => console.log(`  ${label.padEnd(22)} ${String(a).padStart(9)} ${String(b).padStart(11)} ${String(c).padStart(11)}   ${v}`);
console.log(`\n${'='.repeat(100)}\nFIELD COVERAGE — ${picked.length} sampled source rows, ${rendered.served}/${RENDER} fetched and served\n${'='.repeat(100)}`);
console.log(`  ${'field'.padEnd(22)} ${'in source'.padStart(9)} ${'parsed out'.padStart(11)} ${'on the page'.padStart(11)}   attribution`);
console.log('  ' + '-'.repeat(96));
console.log('\n  -- SEO --');
row('post_title', wp.post_title, wp.post_title, rendered.title, wp.post_title === picked.length ? 'OK' : 'DATA');
row('title suffix', 'n/a', 'n/a', rendered.titleWithSuffix, rendered.titleWithSuffix === rendered.served ? 'OK' : 'CODE — sitename not appended');
row('yoast title', wp.yoast_title, wp.yoast_title, '—', 'DATA — WordPress stores none');
row('yoast metadesc', wp.yoast_metadesc, wp.yoast_metadesc, rendered.description, 'DATA — WordPress stores almost none');
row('canonical', wp.yoast_canonical, wp.yoast_canonical, rendered.canonical, 'OK — self-canonical derived');
console.log('\n  -- business facts --');
row('phone', wp.phone, wp.phone, rendered.phone, 'DATA in source; supplied from the branch');
row('address', wp.job_location, wp.job_location, rendered.address, 'DATA in source; supplied from the branch');
row('thumbnail id', wp.thumbnail_id, wp.thumbnail_id, rendered.heroImage, rendered.heroImage < rendered.served ? 'CODE — id present, image not resolved' : 'OK');
console.log('\n  -- page content, parsed from the body --');
row('lead paragraph', '—', parsed.lead, rendered.h1, 'OK');
row('why it matters', '—', parsed.whyImportant, rendered.intro, 'OK');
row('why trust (hub)', '—', parsed.whyTrust, '—', 'OK');
row('service directory', '—', parsed.serviceDirectory, rendered.serviceDirectory, 'OK');
row('process steps', '—', parsed.process, rendered.process, 'OK');
row('why choose us', '—', parsed.whyChooseUs, rendered.whyChooseUs, 'OK');
row('areas served', '—', parsed.areas, rendered.areas, 'OK');
row('FAQ heading', '—', parsed.faqs, rendered.faq, parsed.faqsWithItems < parsed.faqs ? 'CODE — heading found, questions not parsed' : 'OK');
row('  with questions', '—', parsed.faqsWithItems, rendered.faq, `${parsed.faqs - parsed.faqsWithItems} of ${parsed.faqs} lose their FAQ`);
row('book CTA', '—', parsed.bookCta, rendered.bookCta, 'OK');
row('unmatched headings', '—', parsed.unmatchedHeadings, rendered.unmatchedRendered, 'rendered under "From this page"');
console.log(`\n  URLs sampled but not served: ${rendered.notServed}`);
for (const x of notServedSlugs.slice(0, 8)) console.log(`     ${x}`);
fs.writeFileSync(path.join(ROOT, 'data/sample/field-coverage.json'), JSON.stringify({ sampled: picked.length, fetched: RENDER, wp, parsed, rendered, notServedSlugs }, null, 1) + '\n');
console.log('\nwrote data/sample/field-coverage.json');
