// Recovers the ORIGINAL WordPress FAQ questions for the Minnesota city pages.
//
// Why this exists: the extraction in ../Chimcare-Migration strips shortcodes with a generic
// `\[[^\]]*\]` pass, which deletes the whole `[vc_tta_section title="…"]` tag. The answer survives
// (it is the shortcode's inner content) but the question does not (it is an attribute). The questions
// were never lost from WordPress — only from job_listings.jsonl. This script reads them straight out
// of wp_posts.post_content.
//
// Nothing is reconstructed, paraphrased or generated. A question is taken verbatim from the
// `title` attribute of the accordion section that contains the answer. If a section has no title,
// it is reported as unrecoverable and left out.
//
// SOURCE IS IMMUTABLE: this issues SELECT statements only and never writes to WordPress.
//
//   node scripts/recover-mn-faqs.mjs [--dry-run] [--db chimcare_local] [--host 127.0.0.1] [--user root]

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : d);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data/seed/minnesota.faq.json');
const DRY = flag('--dry-run');
const DB = { host: opt('--host', '127.0.0.1'), user: opt('--user', 'root'), database: opt('--db', 'chimcare_local') };

/** Read-only query helper. Returns parsed JSON from a single-cell result. */
export function queryJson(sql) {
  const out = execFileSync('mysql', ['-h', DB.host, '-u', DB.user, `--database=${DB.database}`, '-N', '-B', '--raw', '-e', sql], {
    maxBuffer: 512 * 1024 * 1024,
    encoding: 'utf8',
  });
  const trimmed = out.trim();
  return trimmed && trimmed !== 'NULL' ? JSON.parse(trimmed) : [];
}

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#39;': "'", '&nbsp;': ' ', '&#8217;': '’', '&#8216;': '‘', '&#8220;': '“', '&#8221;': '”', '&#8211;': '–', '&#8212;': '—', '&#8230;': '…' };
export function decodeEntities(s) {
  return s
    .replace(/&(amp|lt|gt|quot|nbsp|#0?39|#8217|#8216|#8220|#8221|#8211|#8212|#8230);/g, (m) => ENTITIES[m] ?? ENTITIES[m.replace('#0', '#')] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

const SHORTCODE = /\[\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s[^\]]*)?\]/g;
/** Answer text exactly as the page reads it: shortcodes and tags removed, entities decoded. */
export function answerText(raw) {
  return decodeEntities(raw.replace(SHORTCODE, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
}

const SECTION = /\[vc_tta_section\b([^\]]*)\]([\s\S]*?)\[\/vc_tta_section\]/g;
const TITLE_ATTR = /\btitle="([^"]*)"/;
const TAB_ATTR = /\btab_id="([^"]*)"/;

/** Every accordion section on the page, in document order, with its verbatim question. */
export function parseFaqs(postContent) {
  const items = [];
  const unrecoverable = [];
  let m;
  SECTION.lastIndex = 0;
  while ((m = SECTION.exec(postContent))) {
    const attrs = m[1];
    const question = TITLE_ATTR.exec(attrs)?.[1];
    const answer = answerText(m[2]);
    if (!question || !question.trim()) {
      unrecoverable.push({ reason: 'accordion section has no title attribute', answerPreview: answer.slice(0, 80) });
      continue;
    }
    if (!answer) {
      unrecoverable.push({ reason: 'accordion section has an empty body', question: decodeEntities(question) });
      continue;
    }
    items.push({ question: decodeEntities(question).trim(), answer, tabId: TAB_ATTR.exec(attrs)?.[1] ?? null });
  }
  return { items, unrecoverable };
}

function main() {
  // The 134 Minnesota city pages: the two live city-page slug forms, minus nothing — the caller
  // decides which rows to use, this script simply recovers what WordPress holds for each.
  const rows = queryJson(`
    SELECT JSON_ARRAYAGG(JSON_OBJECT('id', ID, 'slug', post_name, 'content', post_content))
    FROM wp_posts
    WHERE post_type = 'job_listing' AND post_status = 'publish'
      AND (post_name LIKE 'chimney-sweep-fireplace-in-%-mn' OR post_name LIKE 'chimney-sweep-repair-in-%-mn')`);

  const faqs = {};
  const problems = [];
  let total = 0;
  for (const r of rows) {
    const { items, unrecoverable } = parseFaqs(r.content ?? '');
    if (items.length) faqs[r.slug] = items.map((it, i) => ({ ...it, sort: i, legacyPostId: r.id }));
    total += items.length;
    if (unrecoverable.length) problems.push({ slug: r.slug, legacyPostId: r.id, unrecoverable });
    if (!items.length) problems.push({ slug: r.slug, legacyPostId: r.id, unrecoverable: [{ reason: 'no vc_tta_section accordion found in post_content' }] });
  }

  const out = {
    generatedAt: DRY ? undefined : new Date().toISOString(),
    source: `mysql://${DB.host}/${DB.database} · wp_posts.post_content · [vc_tta_section title="…"] (read-only)`,
    method: 'Questions are the verbatim title attribute of the WPBakery accordion section wrapping each answer. Nothing reconstructed, paraphrased or generated.',
    pagesWithFaqs: Object.keys(faqs).length,
    questionsRecovered: total,
    problems,
    faqs,
  };
  console.log(JSON.stringify({ pages: rows.length, pagesWithFaqs: out.pagesWithFaqs, questionsRecovered: total, pagesWithProblems: problems.length }, null, 2));
  if (DRY) return;
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
