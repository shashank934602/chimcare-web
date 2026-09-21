import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Read-only view of the migration tracking database (`data/migration-ledger.sqlite`), published by
 * `chimcare-migration/scripts/ledger.py --publish`.
 *
 * It answers three questions the batch dashboard exists for:
 *   1. batch by batch, how far did every URL get, and how many are actually live;
 *   2. what has been missed — the URL spaces the pipeline cannot read at all;
 *   3. what would break at cutover — the images the pages still load from the old WordPress server.
 *
 * Opened the same way as the route store (lib/route-store.ts): Node's own `node:sqlite`, read-only,
 * with the handle dropped when the file is replaced, so a fresh publish is picked up without a
 * restart. A missing file is not an error — the dashboard says "no data published yet", because an
 * admin page must never take the site down.
 */

const LEDGER_PATH = path.join(process.cwd(), 'data/migration-ledger.sqlite');

type Handle = { db: DatabaseSync; identity: string } | null;
let handle: Handle = null;

function identity(): string | null {
  try {
    const stat = fs.statSync(LEDGER_PATH);
    return `${stat.mtimeMs}:${stat.size}`;
  } catch {
    return null;
  }
}

function open(): DatabaseSync | null {
  const now = identity();
  if (!now) {
    handle = null;
    return null;
  }
  if (handle && handle.identity === now) return handle.db;
  try {
    const db = new DatabaseSync(LEDGER_PATH, { readOnly: true });
    handle = { db, identity: now };
    return db;
  } catch {
    handle = null;
    return null;
  }
}

function all<T>(sql: string, params: unknown[] = []): T[] {
  const db = open();
  if (!db) return [];
  try {
    return db.prepare(sql).all(...(params as never[])) as T[];
  } catch {
    return []; // a table this build does not know about is "nothing to show", not a crash
  }
}

export type BatchRow = {
  batch: string;
  urls: number;
  probed: number;
  fetched: number;
  routed: number;
  published: number;
  liveOk: number;
  liveChecked: number;
  defects: number;
  clicks: number;
};

export type SpaceRow = {
  space: string;
  wp_urls: number | null;
  gsc_urls: number;
  clicks: number;
  share: number;
  covered: string;
  note: string;
};

export type ImageSummary = {
  files: number;
  heroes: number;
  mirrored: number;
  liveOk: number;
  checked: number;
  bytes: number;
};

export type UrlRow = {
  slug: string;
  batch: string | null;
  clicks: number | null;
  probe_fate: string | null;
  render_pass: number | null;
  seo_failures: number | null;
  published: number | null;
  live_status: number | null;
  service_count: number | null;
  defect: string | null;
  hero_image: string | null;
  hero_host: string | null;
};

export type CheckRow = { check: string; question: string; failed: number; sample: string[] };

export type PhotoRow = { hero_image: string; hero_host: string; pages: number; share: number };

export type IssueRow = {
  id: string;
  title: string;
  scale: string;
  blocks: string;
  status: string;
  effort: string;
  fix: string;
  cause: string;
  evidence: string;
  log: string;
};

export function ledgerAvailable(): boolean {
  return open() !== null;
}

export function batches(): BatchRow[] {
  return all<BatchRow>(`
    SELECT COALESCE(batch, '(none)') AS batch,
           COUNT(*)                                   AS urls,
           SUM(probed_at IS NOT NULL)                 AS probed,
           SUM(fetched_at IS NOT NULL)                AS fetched,
           SUM(routed_at IS NOT NULL)                 AS routed,
           SUM(published = 1)                         AS published,
           SUM(live_status = 200)                     AS liveOk,
           SUM(live_checked_at IS NOT NULL)           AS liveChecked,
           SUM(defect IS NOT NULL)                    AS defects,
           COALESCE(SUM(clicks), 0)                   AS clicks
    FROM ledger GROUP BY COALESCE(batch, '(none)') ORDER BY urls DESC
  `);
}

export function spaces(): SpaceRow[] {
  return all<SpaceRow>('SELECT space, wp_urls, gsc_urls, clicks, share, covered, note FROM url_spaces ORDER BY clicks DESC');
}

export function images(): ImageSummary {
  const row = all<ImageSummary>(`
    SELECT COUNT(*) AS files, COALESCE(SUM(kind = 'hero'), 0) AS heroes,
           COALESCE(SUM(mirrored = 1), 0) AS mirrored,
           COALESCE(SUM(live_status = 200), 0) AS liveOk,
           COALESCE(SUM(live_status IS NOT NULL), 0) AS checked,
           COALESCE(SUM(bytes), 0) AS bytes
    FROM images
  `)[0];
  return row ?? { files: 0, heroes: 0, mirrored: 0, liveOk: 0, checked: 0, bytes: 0 };
}

/** The same reconciliation questions the pipeline's own `ledger.py --check` asks, run here so the
 *  dashboard can never disagree with the command line. A check passes when it finds nothing. */
const CHECKS: { check: string; question: string; where: string }[] = [
  { check: 'selected_not_probed', question: 'selected URLs never checked against the old site', where: 'probed_at IS NULL' },
  { check: 'migrate_not_fetched', question: 'URLs to migrate whose content was never fetched', where: "probe_fate = 'migrate' AND fetched_at IS NULL" },
  { check: 'fetched_not_routed', question: 'fetched pages that never became a route', where: 'fetched_at IS NOT NULL AND routed_at IS NULL' },
  { check: 'routed_not_published', question: 'routes the app does not serve', where: 'routed_at IS NOT NULL AND published = 0' },
  { check: 'published_not_rendered', question: 'published pages never render-checked', where: 'published = 1 AND rendered_at IS NULL' },
  { check: 'render_failed', question: 'pages that failed the render check', where: 'render_pass = 0' },
  { check: 'seo_failed', question: 'pages with a failing SEO check', where: 'seo_failures > 0' },
  { check: 'no_services', question: 'pages with no service links', where: 'routed_at IS NOT NULL AND COALESCE(service_count, 0) = 0' },
  { check: 'live_not_200', question: 'published pages that do not answer 200 live', where: 'live_checked_at IS NOT NULL AND live_status != 200' },
  { check: 'url_changed', question: 'pages whose path is not the old WordPress path', where: "url IS NOT NULL AND url NOT LIKE '%/location/' || slug || '/'" },
];

export function checks(batch?: string): CheckRow[] {
  return CHECKS.map(({ check, question, where }) => {
    const scope = batch ? ` AND batch = ?` : '';
    const params = batch ? [batch] : [];
    const rows = all<{ slug: string }>(`SELECT slug FROM ledger WHERE ${where}${scope} LIMIT 200`, params);
    return { check, question, failed: rows.length, sample: rows.slice(0, 4).map((r) => r.slug) };
  });
}

/** Which photo each page shows, biggest first. One file on 97% of pages is the point (I-013). */
export function photos(): PhotoRow[] {
  const total = all<{ n: number }>('SELECT COUNT(*) AS n FROM ledger WHERE hero_image IS NOT NULL')[0]?.n || 1;
  return all<PhotoRow>(`
    SELECT hero_image, hero_host, COUNT(*) AS pages
    FROM ledger WHERE hero_image IS NOT NULL
    GROUP BY hero_image, hero_host ORDER BY pages DESC LIMIT 12
  `).map((r) => ({ ...r, share: r.pages / total }));
}

/** When the pipeline last published this data. A dashboard showing yesterday's numbers without
 *  saying so is worse than no dashboard: it was doing exactly that until 2026-09-21. */
export function publishedAt(): string | null {
  return all<{ at: string }>('SELECT MAX(updated_at) AS at FROM ledger')[0]?.at ?? null;
}

export function urls(options: { batch?: string; only?: string; photo?: string; limit?: number } = {}): UrlRow[] {
  const { batch, only, photo, limit = 200 } = options;
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (batch) {
    clauses.push('batch = ?');
    params.push(batch);
  }
  if (photo) {
    clauses.push('hero_image = ?');
    params.push(photo);
  }
  if (only === 'defects') clauses.push('defect IS NOT NULL');
  if (only === 'live') clauses.push('live_status = 200');
  if (only === 'old-photo') clauses.push("hero_host = 'old site'");
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return all<UrlRow>(`
    SELECT slug, batch, clicks, probe_fate, render_pass, seo_failures, published,
           live_status, service_count, defect, hero_image, hero_host
    FROM ledger ${where} ORDER BY COALESCE(clicks, 0) DESC, slug LIMIT ${Number(limit) || 200}
  `, params);
}

/** The problem register (`scripts/issues.py`), worst-blocking first. Unfinished work leads. */
export function issues(): IssueRow[] {
  const rows = all<IssueRow>('SELECT id, title, scale, blocks, status, effort, fix, cause, evidence, log FROM issues');
  const order: Record<string, number> = { batch: 0, cutover: 1, scale: 2, none: 3 };
  const done = (s: string) => s === 'fixed' || s === 'accepted';
  return rows.sort((a, b) =>
    Number(done(a.status)) - Number(done(b.status)) ||
    (order[a.blocks] ?? 9) - (order[b.blocks] ?? 9) ||
    a.id.localeCompare(b.id));
}

export function totals(): { urls: number; published: number; liveOk: number; clicks: number; defects: number } {
  const row = all<{ urls: number; published: number; liveOk: number; clicks: number; defects: number }>(`
    SELECT COUNT(*) AS urls, COALESCE(SUM(published = 1), 0) AS published,
           COALESCE(SUM(live_status = 200), 0) AS liveOk,
           COALESCE(SUM(clicks), 0) AS clicks,
           COALESCE(SUM(defect IS NOT NULL), 0) AS defects
    FROM ledger
  `)[0];
  return row ?? { urls: 0, published: 0, liveOk: 0, clicks: 0, defects: 0 };
}
