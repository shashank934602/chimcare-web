import fs from 'node:fs';

/**
 * A per-process cache for JSON files that are read on a REQUEST path.
 *
 * Why this exists: `app/location/[slug]/page.tsx` is `force-dynamic`, so every JSON read in it runs
 * once per request. The migration manifest (`chimcare-migration/out/04-routes.json`) is 3.3 MB for a
 * 100-route run and projects to ~32 MB at 1000 routes; re-reading and re-parsing it to find one slug
 * meant tens of gigabytes of redundant parsing across a single pipeline run, and the same file is
 * requested twice per route by stages 5 and 6.
 *
 * Why a plain module-level constant is NOT enough: the dev server is long-lived and the pipeline
 * REWRITES these files between runs (stage 4 rewrites the manifest; the prepare step rewrites the
 * `standard-*.json` copy). A constant parsed once at module load would pin one run's output for the
 * lifetime of the server and silently serve a stale manifest — the next run would look like it had
 * produced nothing, with no error anywhere. So the cache is keyed on the file's identity, not merely
 * on having been read: `mtimeMs` AND `size` from a `statSync`, which is a cheap syscall per request
 * and invalidates exactly when the file is rewritten. Size is carried alongside mtime because a
 * rewrite inside the same millisecond tick — plausible for the small `standard-*.json` files — can
 * leave mtime unchanged while the content's length moves.
 *
 * Failure policy, deliberately identical for "absent", "unreadable" and "unparseable": return null
 * and let the caller fall back to whatever it does with no file. A manifest that is missing means
 * the database branch still serves and an unknown slug 404s; a manifest that is malformed must mean
 * the same thing rather than throwing on every request and taking the whole site down.
 *
 * Torn reads: the pipeline rewrites the manifest while this server is running, so a read can land
 * mid-write and `JSON.parse` will throw on a truncated document. That is treated exactly as
 * malformed — and crucially the FAILURE IS NOT CACHED, so the very next request re-stats, re-reads
 * and picks up the finished file rather than serving nothing until a restart.
 */

type Entry = {
  /** `mtimeMs:size` of the file as it was when `value` was parsed. */
  stamp: string;
  value: unknown;
  /** Structures derived from `value` (e.g. the manifest's slug index), built at most once per stamp. */
  derived: Map<string, unknown>;
};

const cache = new Map<string, Entry>();

/** Files already complained about, keyed by file+stamp, so a broken file logs once, not per request. */
const warned = new Set<string>();

/**
 * `mtimeMs:size`, or null when the file is absent or cannot be stat'ed.
 *
 * Exported because the route store (`lib/route-store.ts`) keeps a SQLite handle open across
 * requests and has to decide when that handle is stale for exactly the same reason and by exactly
 * the same test. One stamping rule for every long-lived artifact this process holds open, rather
 * than a second, subtly different one next door.
 */
export function fileStamp(file: string): string | null {
  try {
    const st = fs.statSync(file);
    return `${st.mtimeMs}:${st.size}`;
  } catch {
    return null;
  }
}

/**
 * Complain about one broken artifact once per version of it, never per request. `label` names the
 * subsystem doing the complaining so a log line points at the right file.
 */
export function warnOnce(file: string, stamp: string | null, err: unknown, label = 'json-cache'): void {
  const key = `${label}:${file}@${stamp ?? 'unknown'}`;
  if (warned.has(key)) return;
  warned.add(key);
  const why = err instanceof Error ? err.message : String(err);
  console.warn(`[${label}] ignoring unreadable ${label === 'json-cache' ? 'JSON' : 'artifact'} at ${file}: ${why}`);
}

/**
 * The parsed contents of `file`, or null when it is absent, unreadable, half-written or malformed.
 * A successful parse is cached until the file's mtime or size changes; a failure is never cached.
 */
export function readJsonCached(file: string): unknown | null {
  const stamp = fileStamp(file);
  if (stamp === null) return null; // no file: exactly the old `existsSync` behaviour

  const hit = cache.get(file);
  if (hit && hit.stamp === stamp) return hit.value;

  let value: unknown;
  try {
    value = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    // Malformed, or read mid-rewrite. Drop any stale entry, log once, and do NOT remember the
    // failure — the next request retries and picks up the finished file.
    cache.delete(file);
    warnOnce(file, stamp, err);
    return null;
  }

  cache.set(file, { stamp, value, derived: new Map() });
  return value;
}

/**
 * A structure derived from `file`'s contents — an index, a validated list — built at most once per
 * version of the file and cached beside the parsed value, so a request is a map lookup rather than a
 * scan. `derive` must be pure; it is never called with a null document.
 *
 * Returns null exactly when `readJsonCached` does.
 */
export function readJsonDerived<T>(file: string, key: string, derive: (raw: unknown) => T): T | null {
  const value = readJsonCached(file);
  if (value === null) return null;

  const entry = cache.get(file);
  if (!entry) return derive(value); // can only happen if the file changed under us; recompute
  if (!entry.derived.has(key)) entry.derived.set(key, derive(value));
  return entry.derived.get(key) as T;
}
