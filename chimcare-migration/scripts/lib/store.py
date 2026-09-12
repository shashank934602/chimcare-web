"""The pipeline's local database: one SQLite file, one table per stage.

Why a database and not a chain of JSON files. At 1,000 URLs the content artifact was 32 MB and the
route manifest 15 MB; at 200,000 those extrapolate to 6.2 GB and 3.0 GB. A file that size cannot be
parsed to answer "what is at this slug", and the application was doing exactly that on every request.
SQLite gives an indexed lookup by primary key, one row read instead of a whole-file parse, and it is
in both Python's and Node's standard library, so neither side gains a dependency.

Why local and not hosted. This is a build artifact, not production data: deleting the file has to
restore database-only behaviour, and the project's own rule is that the pipeline never writes to the
application's database. Supabase's free plan also caps at 500 MB, which this run passes at roughly
15,000 URLs of the 200,000.

Concurrency. The pipeline writes while the Next.js dev server reads, so the database runs in WAL
mode: a reader never observes a half-committed transaction. That is what makes a torn read
impossible, rather than every reader having to recover from one. Each stage writes inside a single
transaction, so a stage either lands completely or not at all.

Space. Bodies and parsed blocks are stored zlib-compressed and stored ONCE — stage 3 owns the body,
and later stages reference the slug rather than copying it. `prune()` drops what only extraction
needed, for when a run is finished and the space matters more than re-runnability.
"""

from __future__ import annotations

import json
import sqlite3
import zlib
from pathlib import Path
from typing import Any, Iterable, Iterator

from lib.paths import OUT_DIR

DB_PATH = OUT_DIR / "migration.sqlite"
SCHEMA_VERSION = 1

# Each stage owns its table. `slug` is the join key everywhere, and every table is keyed by it so a
# stage can be re-run for one URL without touching the rest.
SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- stage 1
CREATE TABLE IF NOT EXISTS urls (
  slug           TEXT PRIMARY KEY,
  url            TEXT NOT NULL,
  wp_post_id     INTEGER,
  title          TEXT,
  modified       TEXT,
  content_length INTEGER,
  run_id         TEXT NOT NULL
);

-- stage 2
CREATE TABLE IF NOT EXISTS status (
  slug         TEXT PRIMARY KEY,
  first_status INTEGER,
  final_status INTEGER,
  final_url    TEXT,
  hops         INTEGER NOT NULL DEFAULT 0,
  fate         TEXT NOT NULL,
  reason       TEXT,
  redirect_to  TEXT,
  error        TEXT,
  probed_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS status_fate ON status(fate);

-- stage 3. `body` is the WordPress source, compressed, stored exactly once in the pipeline.
CREATE TABLE IF NOT EXISTS content (
  slug            TEXT PRIMARY KEY,
  post_title      TEXT,
  post_modified   TEXT,
  yoast_title     TEXT,
  yoast_metadesc  TEXT,
  yoast_canonical TEXT,
  phone           TEXT,
  job_location    TEXT,
  thumbnail_id    INTEGER,
  hero_image      TEXT,
  raw_sha256      TEXT,
  raw_bytes       INTEGER,
  body            BLOB,
  parsed          BLOB,
  words           INTEGER,
  image_count     INTEGER,
  content_source  TEXT,
  fetched_at      TEXT NOT NULL
);

-- stage 3: the service pages this city really has, one row per link.
CREATE TABLE IF NOT EXISTS services (
  slug         TEXT NOT NULL,
  key          TEXT NOT NULL,
  category_key TEXT NOT NULL,
  service_slug TEXT NOT NULL,
  url          TEXT NOT NULL,
  PRIMARY KEY (slug, key)
);

-- stage 4: what the application reads. One row, one request.
CREATE TABLE IF NOT EXISTS routes (
  slug            TEXT PRIMARY KEY,
  url             TEXT NOT NULL,
  payload         BLOB NOT NULL,
  rendered_blocks INTEGER,
  archived_words  INTEGER,
  service_count   INTEGER,
  built_at        TEXT NOT NULL
);

-- stage 5
CREATE TABLE IF NOT EXISTS render (
  slug        TEXT PRIMARY KEY,
  status      INTEGER,
  served_from TEXT,
  coverage    REAL,
  passed      INTEGER NOT NULL,
  checks      BLOB,
  checked_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS render_passed ON render(passed);

-- stage 6
CREATE TABLE IF NOT EXISTS seo (
  slug       TEXT PRIMARY KEY,
  extracted  BLOB,
  checks     BLOB,
  failures   INTEGER NOT NULL DEFAULT 0,
  checked_at TEXT NOT NULL
);

-- stage 7: the URL rewrite. One row per moved page, and the ONLY record that an old URL ever
-- existed: stage 7 deletes the old `routes` row, so this table is what makes the old path answer a
-- 301 instead of a 404. `to_slug` is indexed because the revert path walks it the other way round.
CREATE TABLE IF NOT EXISTS redirects (
  from_slug  TEXT PRIMARY KEY,
  to_slug    TEXT NOT NULL,
  status     INTEGER NOT NULL DEFAULT 301,
  reason     TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS redirects_to ON redirects(to_slug);
"""


def connect(path: Path | None = None, *, readonly: bool = False) -> sqlite3.Connection:
    """Open the pipeline database, creating it on first use.

    WAL matters here: the dev server reads this file while a stage writes it. In WAL a reader sees
    the last committed state and never a partial one, which removes the torn-read problem at the
    source instead of asking every reader to recover from it.
    """
    target = Path(path or DB_PATH)
    target.parent.mkdir(parents=True, exist_ok=True)
    if readonly:
        conn = sqlite3.connect(f"file:{target}?mode=ro", uri=True, timeout=30)
    else:
        conn = sqlite3.connect(target, timeout=30, isolation_level=None)
        conn.executescript(SCHEMA)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def pack(value: Any) -> bytes:
    """JSON, deflated. Blocks and check results compress to roughly a fifth of their size."""
    return zlib.compress(json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), 6)


def unpack(blob: bytes | None) -> Any:
    return json.loads(zlib.decompress(blob).decode("utf-8")) if blob else None


def set_meta(conn: sqlite3.Connection, stage: str, values: dict) -> None:
    """Meta keys are namespaced by stage so several stages share one table without colliding."""
    conn.executemany(
        "INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        [(f"{stage}.{k}", json.dumps(v, ensure_ascii=False)) for k, v in values.items()],
    )


def get_meta(conn: sqlite3.Connection, stage: str) -> dict:
    rows = conn.execute("SELECT key, value FROM meta WHERE key LIKE ?", (f"{stage}.%",)).fetchall()
    return {r["key"].split(".", 1)[1]: json.loads(r["value"]) for r in rows}


def write(conn: sqlite3.Connection, sql: str, rows: Iterable[tuple], chunk: int = 1000) -> int:
    """Insert in one transaction, in chunks, so a stage never holds every row in memory."""
    n = 0
    conn.execute("BEGIN")
    try:
        batch: list[tuple] = []
        for row in rows:
            batch.append(row)
            if len(batch) >= chunk:
                conn.executemany(sql, batch)
                n += len(batch)
                batch = []
        if batch:
            conn.executemany(sql, batch)
            n += len(batch)
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    return n


def todo(conn: sqlite3.Connection, source: str, done: str, *, where: str = "") -> list[str]:
    """Slugs present in one stage's table and missing from the next — this is what makes a run resumable."""
    clause = f" WHERE {where}" if where else ""
    sql = f"SELECT s.slug FROM {source} s{clause} AND NOT EXISTS (SELECT 1 FROM {done} d WHERE d.slug = s.slug)" \
        if where else \
        f"SELECT s.slug FROM {source} s WHERE NOT EXISTS (SELECT 1 FROM {done} d WHERE d.slug = s.slug)"
    return [r["slug"] for r in conn.execute(sql)]


def counts(conn: sqlite3.Connection) -> dict:
    out = {}
    for table in ("urls", "status", "content", "services", "routes", "render", "seo"):
        out[table] = conn.execute(f"SELECT COUNT(*) n FROM {table}").fetchone()["n"]
    return out


def prune(conn: sqlite3.Connection) -> dict:
    """Drop what only extraction needed, once a run is finished and space matters more than re-running.

    The raw WordPress body is the bulk of the database and is only needed to re-parse blocks. The
    parsed blocks and the route payloads stay, so the application keeps working; re-running stage 3
    restores what this removes.
    """
    before = Path(DB_PATH).stat().st_size if Path(DB_PATH).exists() else 0
    conn.execute("BEGIN")
    conn.execute("UPDATE content SET body = NULL")
    conn.execute("COMMIT")
    conn.execute("VACUUM")
    after = Path(DB_PATH).stat().st_size if Path(DB_PATH).exists() else 0
    return {"before": before, "after": after, "freed": before - after}
