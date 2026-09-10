// Extracts the images the design mocks embed in their MARKUP (scripts/port-css.mjs already handles
// the ones embedded in their CSS) into public/img/mock/, and writes a manifest recording where each
// came from.
//
// Provenance is the point. These are the approved design assets: the BBB accreditation badge, the
// award marks, the hero and section photographs. They are written byte-for-byte under a name derived
// from their own content hash, never renamed to something convenient, never re-encoded, never
// converted to a different format, and never substituted for a similar-looking image.
//
//   node scripts/extract-mock-assets.mjs [<mocks-dir>]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MOCKS = process.argv[2] ?? path.join(ROOT, 'design-mocks');
const OUT = path.join(ROOT, 'public/img/mock');
const MANIFEST = path.join(ROOT, 'data/mock-assets.json');

const FILES = {
  hub: 'locations new3.html',
  state: 'washington-locations.html',
  city: 'spokane.html',
};
const EXT = { 'svg+xml': 'svg', jpeg: 'jpg' };

fs.mkdirSync(OUT, { recursive: true });
const manifest = {};

for (const [tpl, file] of Object.entries(FILES)) {
  const p = path.join(MOCKS, file);
  if (!fs.existsSync(p)) { console.log(`skip ${file} (not found)`); continue; }
  const html = fs.readFileSync(p, 'utf8');
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  let n = 0;
  for (const tag of imgs) {
    const src = /src\s*=\s*"(data:image\/([a-z+]+);base64,([^"]+))"/i.exec(tag);
    if (!src) continue;
    const [, , type, b64] = src;
    const buf = Buffer.from(b64, 'base64');
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const name = `${hash.slice(0, 12)}.${EXT[type] ?? type}`;
    const dest = path.join(OUT, name);
    if (!fs.existsSync(dest)) fs.writeFileSync(dest, buf);
    const alt = (/alt\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? '').replace(/&rsquo;/g, '’').replace(/&amp;/g, '&');
    const cls = /class\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? '';
    const w = Number(/width\s*=\s*"(\d+)"/i.exec(tag)?.[1] ?? 0) || null;
    const h = Number(/height\s*=\s*"(\d+)"/i.exec(tag)?.[1] ?? 0) || null;
    manifest[name] = { url: `/img/mock/${name}`, mock: file, template: tpl, class: cls, alt, width: w, height: h, bytes: buf.length, sha256: hash };
    n++;
  }
  console.log(`${file}: ${n} embedded image(s)`);
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(MANIFEST, JSON.stringify(sorted, null, 1) + '\n');
console.log(`wrote ${Object.keys(sorted).length} asset(s) to public/img/mock/ and data/mock-assets.json`);
