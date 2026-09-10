import fs from 'node:fs';
import path from 'node:path';
import { cache } from 'react';

/**
 * The page's own WordPress body, read by slug.
 *
 * `scripts/extract-page-source.mjs` writes one JSON object per line per state, byte-for-byte out of
 * WordPress. That is 222 MB for Minnesota alone, far too much to hold in memory, so this builds a
 * slug → byte-offset index once and reads a single record on demand. The index is a few hundred KB.
 *
 * The source is read, never written. Nothing here cleans, repairs or normalises the body; parsing
 * happens at the render boundary in `lib/content/source-sections.ts`, and the file on disk is the
 * only copy of the truth.
 *
 * This sits in `lib/data/` because it is a source loader, and only `lib/data/*` reads sources — a
 * template still receives resolved props and never reaches for a body itself.
 */

export type PageSourceRow = {
  slug: string;
  wpPostId: number | null;
  postTitle: string;
  postContent: string;
  postModified: string | null;
  yoastTitle: string | null;
  yoastMetadesc: string | null;
  yoastCanonical: string | null;
  thumbnailId: number | null;
  phone: string | null;
  jobLocation: string | null;
  contentSha256: string;
};

type Index = { file: string; offsets: Map<string, { start: number; length: number }> };

const SOURCE_DIR = path.join(process.cwd(), 'data/seed');
let indexes: Index[] | null = null;

/** Scan each `*.page-source.jsonl` once, recording where every slug's line begins and ends. */
function buildIndex(): Index[] {
  if (indexes) return indexes;
  const built: Index[] = [];
  if (!fs.existsSync(SOURCE_DIR)) return (indexes = built);

  for (const name of fs.readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.page-source.jsonl'))) {
    const file = path.join(SOURCE_DIR, name);
    const offsets = new Map<string, { start: number; length: number }>();
    const fd = fs.openSync(file, 'r');
    try {
      const size = fs.statSync(file).size;
      const CHUNK = 1 << 22; // 4 MB
      const buf = Buffer.allocUnsafe(CHUNK);
      let carry = Buffer.alloc(0);
      let filePos = 0;
      let lineStart = 0;
      while (filePos < size) {
        const read = fs.readSync(fd, buf, 0, Math.min(CHUNK, size - filePos), filePos);
        const data = carry.length ? Buffer.concat([carry, buf.subarray(0, read)]) : buf.subarray(0, read);
        let from = 0;
        for (;;) {
          const nl = data.indexOf(0x0a, from);
          if (nl < 0) break;
          const line = data.subarray(from, nl);
          // Only the slug is parsed during indexing; the body stays on disk.
          const m = /"slug":"((?:[^"\\]|\\.)*)"/.exec(line.subarray(0, 300).toString('utf8'));
          if (m) offsets.set(JSON.parse(`"${m[1]}"`), { start: lineStart, length: nl - from });
          lineStart += nl - from + 1;
          from = nl + 1;
        }
        carry = data.subarray(from);
        filePos += read;
      }
    } finally {
      fs.closeSync(fd);
    }
    built.push({ file, offsets });
  }
  return (indexes = built);
}

/** One page's stored WordPress body, or null when this slug has no source row. */
export const getPageSource = cache(async (slug: string): Promise<PageSourceRow | null> => {
  for (const idx of buildIndex()) {
    const at = idx.offsets.get(slug);
    if (!at) continue;
    const fd = fs.openSync(idx.file, 'r');
    try {
      const buf = Buffer.allocUnsafe(at.length);
      fs.readSync(fd, buf, 0, at.length, at.start);
      return JSON.parse(buf.toString('utf8')) as PageSourceRow;
    } finally {
      fs.closeSync(fd);
    }
  }
  return null;
});

/** How many source rows are indexed, per file. For the admin and for reports. */
export function pageSourceStats(): Array<{ file: string; rows: number }> {
  return buildIndex().map((i) => ({ file: path.basename(i.file), rows: i.offsets.size }));
}
