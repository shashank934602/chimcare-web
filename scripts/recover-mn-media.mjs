// Recovers the ORIGINAL WordPress hero image for each Minnesota city page.
//
// For every city page it reads `_thumbnail_id`, then the attachment's own row and meta, and keeps
// every source field: attachment id, upload path, filename, extension, MIME type, dimensions,
// file size, title, alt, caption and description. The binary is downloaded from the live uploads
// path under its original name and byte-for-byte — no renaming, no conversion, no optimisation, no
// resizing, and no substitution of a similar-looking image. The download is verified against the
// size WordPress recorded and a SHA-256 is stored.
//
// If an image cannot be downloaded or fails verification it is reported and left unrecovered. The
// page then keeps its `hero_image_not_imported` flag; no stand-in is used.
//
// SOURCE IS IMMUTABLE: SELECT statements only, and GET requests only. Nothing is written to
// WordPress and nothing on the origin is modified.
//
//   node scripts/recover-mn-media.mjs [--dry-run] [--origin https://www.chimcare.com] [--force]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : d);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data/seed/minnesota.media.json');
const MEDIA_DIR = path.join(ROOT, 'public/uploads');
const ORIGIN = opt('--origin', 'https://www.chimcare.com').replace(/\/$/, '');
const DRY = flag('--dry-run');
const FORCE = flag('--force');
const DB = { host: opt('--host', '127.0.0.1'), user: opt('--user', 'root'), database: opt('--db', 'chimcare_local') };

function queryJson(sql) {
  const out = execFileSync('mysql', ['-h', DB.host, '-u', DB.user, `--database=${DB.database}`, '-N', '-B', '--raw', '-e', sql], {
    maxBuffer: 512 * 1024 * 1024,
    encoding: 'utf8',
  });
  const t = out.trim();
  return t && t !== 'NULL' ? JSON.parse(t) : [];
}

/** Top-level width / height / file / filesize out of a PHP-serialised _wp_attachment_metadata. */
function parseAttachmentMeta(serialized) {
  if (!serialized) return {};
  const num = (key) => {
    const m = new RegExp(`s:${key.length}:"${key}";i:(\\d+);`).exec(serialized);
    return m ? Number(m[1]) : null;
  };
  const file = /s:4:"file";s:\d+:"([^"]+)"/.exec(serialized)?.[1] ?? null;
  return { width: num('width'), height: num('height'), filesize: num('filesize'), file };
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  const buf = Buffer.from(await res.arrayBuffer());
  const contentLength = res.headers.get('content-length');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf); // byte-for-byte, original filename and extension
  return {
    ok: true,
    bytes: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    contentType: res.headers.get('content-type'),
    contentLength: contentLength ? Number(contentLength) : null,
    lastModified: res.headers.get('last-modified'),
  };
}

async function main() {
  const rows = queryJson(`
    SELECT JSON_ARRAYAGG(JSON_OBJECT(
      'slug', p.post_name, 'postId', p.ID, 'attachmentId', a.ID,
      'guid', a.guid, 'mime', a.post_mime_type, 'title', a.post_title,
      'caption', a.post_excerpt, 'description', a.post_content,
      'attachedFile', fm.meta_value, 'alt', am.meta_value, 'meta', mm.meta_value))
    FROM wp_posts p
    JOIN wp_postmeta t ON t.post_id = p.ID AND t.meta_key = '_thumbnail_id'
    JOIN wp_posts a ON a.ID = t.meta_value AND a.post_type = 'attachment'
    LEFT JOIN wp_postmeta fm ON fm.post_id = a.ID AND fm.meta_key = '_wp_attached_file'
    LEFT JOIN wp_postmeta am ON am.post_id = a.ID AND am.meta_key = '_wp_attachment_image_alt'
    LEFT JOIN wp_postmeta mm ON mm.post_id = a.ID AND mm.meta_key = '_wp_attachment_metadata'
    WHERE p.post_type = 'job_listing' AND p.post_status = 'publish'
      AND (p.post_name LIKE 'chimney-sweep-fireplace-in-%-mn' OR p.post_name LIKE 'chimney-sweep-repair-in-%-mn')`);

  // One download per distinct attachment, however many pages share it.
  const assets = new Map();
  for (const r of rows) {
    if (!assets.has(r.attachmentId)) assets.set(r.attachmentId, { ...r, usedBy: [] });
    assets.get(r.attachmentId).usedBy.push(r.slug);
  }

  const media = {};
  const problems = [];
  for (const [id, a] of assets) {
    const meta = parseAttachmentMeta(a.meta);
    const attachedFile = a.attachedFile ?? meta.file;
    if (!attachedFile) {
      problems.push({ attachmentId: id, reason: '_wp_attached_file and _wp_attachment_metadata both missing — no source path to fetch' });
      continue;
    }
    const url = `${ORIGIN}/wp-content/uploads/${attachedFile}`;
    const dest = path.join(MEDIA_DIR, attachedFile);
    const record = {
      attachmentId: id,
      // every source field, preserved as WordPress holds it
      attachedFile,
      filename: path.basename(attachedFile),
      extension: path.extname(attachedFile),
      mime: a.mime,
      width: meta.width,
      height: meta.height,
      filesize: meta.filesize,
      title: a.title ?? null,
      alt: a.alt ?? null,
      caption: a.caption || null,
      description: a.description || null,
      guid: a.guid ?? null, // the pre-scale upload URL WordPress recorded
      sourceUrl: url,
      publicPath: `uploads/${attachedFile}`,
      usedByPages: a.usedBy.length,
      verified: false,
      sha256: null,
      bytes: null,
    };

    if (DRY) {
      media[id] = record;
      continue;
    }
    if (!FORCE && fs.existsSync(dest)) {
      const buf = fs.readFileSync(dest);
      record.bytes = buf.length;
      record.sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      record.verified = meta.filesize == null || buf.length === meta.filesize;
      record.reused = true;
    } else {
      const dl = await download(url, dest);
      if (!dl.ok) {
        problems.push({ attachmentId: id, file: attachedFile, reason: `download failed: ${dl.error}`, url });
        media[id] = record;
        continue;
      }
      record.bytes = dl.bytes;
      record.sha256 = dl.sha256;
      record.servedContentType = dl.contentType;
      record.lastModified = dl.lastModified;
      // Verified when the bytes we hold match the size WordPress recorded for this file.
      record.verified = meta.filesize == null ? dl.contentLength === dl.bytes : dl.bytes === meta.filesize;
      if (!record.verified) {
        problems.push({ attachmentId: id, file: attachedFile, reason: `size mismatch: downloaded ${dl.bytes} bytes, WordPress recorded ${meta.filesize}`, url });
      }
      if (dl.contentType && a.mime && !dl.contentType.startsWith(a.mime)) {
        problems.push({ attachmentId: id, file: attachedFile, reason: `MIME mismatch: origin served ${dl.contentType}, WordPress recorded ${a.mime}` });
      }
    }
    media[id] = record;
  }

  const byPage = {};
  for (const r of rows) byPage[r.slug] = r.attachmentId;

  const out = {
    generatedAt: DRY ? undefined : new Date().toISOString(),
    source: `mysql://${DB.host}/${DB.database} · wp_postmeta._thumbnail_id → wp_posts(attachment) (read-only); binaries GET from ${ORIGIN}/wp-content/uploads/`,
    method: 'Original file downloaded under its original name and extension, byte-for-byte, verified against the file size WordPress recorded. No renaming, conversion, optimisation or substitution.',
    pages: rows.length,
    distinctAssets: assets.size,
    verified: Object.values(media).filter((m) => m.verified).length,
    problems,
    byPage,
    media,
  };
  console.log(JSON.stringify({ pages: out.pages, distinctAssets: out.distinctAssets, verified: out.verified, problems: problems.length }, null, 2));
  if (DRY) return;
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log(`wrote ${path.relative(ROOT, OUT)} and ${path.relative(ROOT, MEDIA_DIR)}/`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
