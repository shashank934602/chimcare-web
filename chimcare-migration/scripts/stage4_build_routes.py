#!/usr/bin/env python3
"""Stage 4 — turn the fetched content into route rows, a source shard and a SQL plan.

    python3 scripts/stage4_build_routes.py
    python3 scripts/stage4_build_routes.py --emit-shard --emit-sql
    python3 scripts/stage4_build_routes.py --tag trial-2 --base-path /location --min-words 120

Nothing here writes to the application. The app serves every `/location/{slug}/` URL from ONE
dynamic dispatcher, and its runtime database is an embedded PGlite instance created inside the
Next.js process — an outside process cannot insert a row into it and a route file per URL would
fight the architecture. So this stage is non-destructive by construction: it emits artifacts, and
the pages are served by the dispatcher (`app/location/[slug]/page.tsx`), which reads them.

WHAT CHANGED, AND WHY. This stage used to write one JSON manifest, `out/04-routes.json`, and the
page parsed that whole file to find one slug. The file was 15.1 MB for 1,000 routes: ~151 MB at
10,000 and ~3.0 GB at 200,000. Caching the parse makes it once-per-version rather than per-request,
but the process still holds the entire manifest in memory, which does not survive 10,000. So the
artifact is now the `routes` table in `out/migration.sqlite` (see `lib/store.py`), one row per slug,
and the page answers a request with `SELECT ... WHERE slug = ? LIMIT 1`.

Four things can come out of it:

    out/migration.sqlite `routes`       always  — one row per served URL. THE artifact.
    out/04-routes.json                  small runs only (<= 2000 routes) — a convenience for reading
                                        a run by eye. Above that the database is the only manifest.
    data/seed/<tag>.page-source.jsonl   --emit-shard — the raw bodies, in the shape the application's
                                        page-source index already reads. What a real cutover would use.
    out/04-pages.sql                    --emit-sql   — the `site.pages` rows a cutover would need. A PLAN.
                                        This pipeline never executes it.

What a route payload holds, and what it deliberately does not. The payload is exactly what the page
renders from: the parsed block stream, the hero image, the title and Yoast fields, the phone, the
job location and this city's sibling service pages. It does NOT carry the raw WordPress body —
stage 3 stores that once, compressed, in `content.body`, and nothing downstream copies it. The
shard is the one place the raw body is written out, and it streams straight from `content.body`.

Thin bodies are skipped, not padded. A page below `--min-words` had nothing worth carrying in the
first place, and inventing copy for it would put text on the internet that the business never wrote.

Reads:  out/migration.sqlite — `content` (stage 3), `services` (stage 3), `urls` (stage 1)
Writes: out/migration.sqlite `routes`, out/04-routes.json (small runs), and on request
        data/seed/<tag>.page-source.jsonl and out/04-pages.sql
"""

from __future__ import annotations

import argparse
import json
import sys
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from datetime import datetime, timezone

from lib import paths, store

# The trial route file. One file, one dynamic segment — the same shape as the production dispatcher.
ROUTE_FILE = "app/location/[slug]/page.tsx"
PAGES_SQL = paths.OUT_DIR / "04-pages.sql"

# Above this many routes the JSON manifest is not written at all. 2,000 routes is ~30 MB of JSON,
# which is still openable; 10,000 is not, and writing it would only tempt something to read it.
JSON_MANIFEST_LIMIT = 2000

# What a carried-over legacy page is, in `site.pages` terms: a body served exactly as WordPress
# stored it, with no template tier behind it yet.
SQL_KIND = "legacy"
SQL_TIER = "C"
SQL_FATE = "publish_verbatim"
SQL_STATUS = "published"

ROUTES_INSERT = """
INSERT INTO routes(slug, url, payload, rendered_blocks, archived_words, service_count, built_at)
VALUES(?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(slug) DO UPDATE SET
  url=excluded.url, payload=excluded.payload, rendered_blocks=excluded.rendered_blocks,
  archived_words=excluded.archived_words, service_count=excluded.service_count,
  built_at=excluded.built_at
"""

# Stage 3's rows, joined to stage 1's URL. The join is LEFT because `content` is the table that
# decides what exists: a slug fetched without a surviving `urls` row still routes, at its own
# canonical path. Ordered by slug so a run is reproducible and the cursor is a single index scan.
CONTENT_CURSOR = """
SELECT c.slug, c.post_title, c.post_modified, c.yoast_title, c.yoast_metadesc, c.yoast_canonical,
       c.phone, c.job_location, c.thumbnail_id, c.hero_image, c.raw_sha256, c.body, c.parsed,
       c.words, c.image_count, c.content_source, u.url AS url, u.wp_post_id AS wp_post_id,
       u.title AS url_title
FROM content c
LEFT JOIN urls u ON u.slug = c.slug
ORDER BY c.slug
"""

# `services` has no ordering column, so insertion order — rowid — is what carries stage 3's
# catalogue order through. Re-sorting here would silently reorder the directory the page renders.
SERVICES_FOR_SLUG = """
SELECT key, category_key, service_slug, url FROM services WHERE slug = ? ORDER BY rowid
"""


def sql_lit(value) -> str:
    """A Postgres literal. NULL stays NULL; everything else is a quoted string."""
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def rendered_cut(blocks: list) -> int:
    """How many of a body's blocks the page actually renders.

    The page shows the body's opening heading and the FIRST paragraph under it as its introduction,
    and nothing after that. Its service accordion is the reference's own eight entries and its
    directory lists every service the city really has a page for, so the source's own "why choose
    us" section and its long service list duplicated both, and are not rendered.

    The rest is archived rather than deleted: it stays in this pipeline's output, which is where the
    migration's record of the page lives. Stage 5 scores coverage against the rendered portion, so a
    deliberate editorial cut does not read as a hundred broken pages.
    """
    # THE HISTORY OF THIS RULE, because it has moved twice and each move had a reason.
    #
    # 1. The first version cut at the second level-2 heading, which kept two groups on any page
    #    whose body opens with an h1 — 32 of the first hundred — and those extra blocks were then
    #    scored as missing from a page that never intended to show them.
    # 2. The second cut at the body's SECOND heading, at whatever level: the whole opening group.
    #    That matched a page whose hero borrowed the body's first paragraph and whose introduction
    #    then showed the paragraph after it.
    # 3. The hero now carries the REFERENCE's own lede (app/location/standard-lede.json) instead of
    #    borrowing the page's, so the introduction shows the page's FIRST paragraph and stops there.
    #    The cut is therefore that paragraph, not the whole group.
    #
    # The search stays inside the opening group — up to the second heading — so a body whose opening
    # group has no paragraph does not reach forward into a section the page never renders.
    headings = [i for i, b in enumerate(blocks) if b.get("type") == "heading"]
    opening = blocks[: headings[1]] if len(headings) > 1 else blocks
    first_paragraph = next((i for i, b in enumerate(opening) if b.get("type") == "paragraph"), None)
    if first_paragraph is not None:
        return first_paragraph + 1
    # No paragraph in the opening group: the page renders the heading alone. A body that does not
    # even open with a heading renders nothing at all, and scores against nothing.
    return 1 if opening and opening[0].get("type") == "heading" else 0


def text_blob(blob) -> str:
    """One stored body as text. `store.pack` writes deflated JSON, and that is what stage 3 stores;
    a plainly deflated string from an older run is still read rather than lost."""
    if blob is None:
        return ""
    if isinstance(blob, str):
        return blob
    try:
        value = store.unpack(blob)
        return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    except Exception:
        try:
            return zlib.decompress(blob).decode("utf-8")
        except Exception:
            return ""


def hero_of(raw) -> dict | None:
    """`content.hero_image` is stored as TEXT. A row without one, or with something unparseable in
    it, renders no hero rather than a broken one."""
    if not raw:
        return None
    if isinstance(raw, dict):
        return raw
    try:
        value = json.loads(raw)
    except Exception:
        return None
    return value if isinstance(value, dict) else None


def services_of(conn, slug: str) -> list[dict]:
    """This city's sibling service pages, in stage 3's own catalogue order, named the way the
    application reads them (`key`, `categoryKey`, `slug`, `url`)."""
    return [
        {"key": r["key"], "categoryKey": r["category_key"], "slug": r["service_slug"], "url": r["url"]}
        for r in conn.execute(SERVICES_FOR_SLUG, (slug,))
    ]


def route_of(row, services: list[dict], parsed: dict, base_path: str) -> dict:
    """One route payload. The blocks are stage 3's, verbatim — this stage parses nothing.

    `blocks` carries `image` blocks inline, in their source position, and `heroImage` rides
    alongside them: the reference design is built around imagery, so a payload without it renders
    empty bands.

    `services` is stage 3's list, verbatim and already in catalogue order — every entry is a page
    WordPress publishes. `serviceCount` is carried next to it so a consumer can decide whether to
    render a directory at all without walking the array.

    The raw WordPress body is NOT here. It lives once in `content.body`; a copy of it in every
    payload is what made the old manifest 15 MB for a thousand pages.
    """
    slug = row["slug"]
    url = row["url"] or f"/location/{slug}/"
    blocks = parsed["blocks"]
    cut = rendered_cut(blocks)
    return {
        "slug": slug,
        "url": url,
        # The served path. It is the production path now, so this equals `url` under the
        # default base — the field name is kept because stages 5 and 6 read it.
        "trialPath": f"{base_path}/{slug}",
        "title": row["post_title"] or row["url_title"],
        "seoTitle": row["yoast_title"],
        "metaDescription": row["yoast_metadesc"],
        "phone": row["phone"],
        "jobLocation": row["job_location"],
        "words": parsed.get("words", row["words"] or 0),
        # Both halves of the page's imagery: the featured image stage 3 resolved, and the count of
        # the body images that are already inline in `blocks`.
        "heroImage": hero_of(row["hero_image"]),
        "imageCount": parsed.get("imageCount", row["image_count"] or 0),
        # Resolved against WordPress in stage 3, not probed and not invented from the catalogue.
        # A city with no published service pages gets an empty list, and renders no directory.
        "services": services,
        "serviceCount": len(services),
        "contentSource": row["content_source"],
        "wpPostId": row["wp_post_id"],
        "rawSha256": row["raw_sha256"],
        "blocks": blocks,
        # How much of the body the page renders, and how much is archived. See rendered_cut().
        "renderedBlocks": cut,
        "archivedWords": sum(len(b.get("text", "").split()) for b in blocks[cut:]),
    }


def shard_row(row, body: str) -> dict:
    """One `PageSourceRow`, as `lib/data/page-source.ts` declares it.

    `postContent` is the raw body, not the parsed form. The application parses at its own render
    boundary, and a shard of pre-chewed copy would be a second, divergent source of truth. This is
    the ONLY output that carries the body, and it streams a row at a time.
    """
    return {
        "slug": row["slug"],
        "wpPostId": row["wp_post_id"],
        "postTitle": row["post_title"] or row["url_title"] or "",
        "postContent": body,
        "postModified": row["post_modified"],
        "yoastTitle": row["yoast_title"],
        "yoastMetadesc": row["yoast_metadesc"],
        "yoastCanonical": row["yoast_canonical"],
        "thumbnailId": int(row["thumbnail_id"]) if str(row["thumbnail_id"] or "").isdigit() else None,
        "phone": row["phone"],
        "jobLocation": row["job_location"],
        "contentSha256": row["raw_sha256"] or "",
    }


def sql_statements(route: dict) -> str:
    """The `site.pages` rows one route would need, as text. Written to be read, not run."""
    return "\n".join(
        [
            f"-- {route['url']} · wp_post {route['wpPostId']} · {route['words']} words · {route['contentSource']}",
            "INSERT INTO site.pages (kind, slug, tier, fate, status, legacy_post_id, legacy_url)",
            "VALUES ({}, {}, {}, {}, {}, {}, {})".format(
                sql_lit(SQL_KIND),
                sql_lit(route["slug"]),
                sql_lit(SQL_TIER),
                sql_lit(SQL_FATE),
                sql_lit(SQL_STATUS),
                route["wpPostId"] if route["wpPostId"] is not None else "NULL",
                sql_lit(route["url"]),
            ),
            "ON CONFLICT DO NOTHING;",
            "",
            "",
        ]
    )


def finish_pages_sql(body: Path, path: Path, run_id: str, tag: str, rows: int) -> None:
    """Put the header on the streamed body. The header states the row count, which is only known
    once the stream has ended, so the statements are written to a part file first and copied in —
    never held in memory."""
    header = "\n".join(
        [
            "-- out/04-pages.sql — A PLAN, NOT AN APPLIED CHANGE.",
            "-- Nothing in this pipeline executes this file. The application's runtime database is an",
            "-- embedded PGlite instance created inside the Next.js process and seeded from",
            "-- data/seed/minnesota.ts; an external process cannot insert into it. These statements",
            "-- describe the rows a production cutover would need, so the decision is visible and",
            "-- reviewable before anyone makes it.",
            "--",
            f"-- run: {run_id} · tag: {tag} · generated: {datetime.now(timezone.utc).isoformat()}",
            f"-- rows: {rows} · kind={SQL_KIND} tier={SQL_TIER} fate={SQL_FATE} status={SQL_STATUS}",
            "--",
            "-- Re-runnable: every statement is ON CONFLICT DO NOTHING, so replaying it never edits a",
            "-- row that already exists. It claims URLs; it never takes one over.",
            "",
            "BEGIN;",
            "",
            "",
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as out:
        out.write(header)
        with body.open("r", encoding="utf-8") as part:
            while chunk := part.read(1 << 20):
                out.write(chunk)
        out.write("COMMIT;\n")
    body.unlink(missing_ok=True)


def route_rows(conn, args, base_path: str, state: dict, shard_fh, sql_fh, keep_json: bool):
    """Every `routes` row, yielded one at a time straight off the content cursor.

    A generator rather than a list on purpose: `store.write` consumes this inside one transaction,
    so a 200,000-URL run streams through it and the stage never holds every route in memory. The
    shard and the SQL plan are written from the same pass for the same reason.
    """
    built_at = datetime.now(timezone.utc).isoformat()
    cursor = conn.execute(CONTENT_CURSOR)
    for row in cursor:
        state["seen"] += 1
        parsed = store.unpack(row["parsed"])
        words = parsed.get("words", row["words"] or 0) if parsed else (row["words"] or 0)
        if not parsed or not parsed.get("blocks"):
            reason = "no parsed body"
        elif words < args.min_words:
            reason = f"{words} words — below --min-words {args.min_words}"
        else:
            route = route_of(row, services_of(conn, row["slug"]), parsed, base_path)
            state["services"] += route["serviceCount"]
            if route["serviceCount"] == 0:
                state["without_services"] += 1
            if shard_fh is not None:
                shard_fh.write(json.dumps(shard_row(row, text_blob(row["body"])), ensure_ascii=False) + "\n")
                state["shard_lines"] += 1
            if sql_fh is not None:
                sql_fh.write(sql_statements(route))
            if keep_json:
                state["json_routes"].append(route)
            state["routed"] += 1
            yield (
                route["slug"],
                route["url"],
                store.pack(route),
                route["renderedBlocks"],
                route["archivedWords"],
                route["serviceCount"],
                built_at,
            )
            continue
        state["skipped"].append(
            {"slug": row["slug"], "url": row["url"] or f"/location/{row['slug']}/", "reason": reason, "words": words}
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--tag", default="trial-1", help="names the source shard (default: trial-1)")
    parser.add_argument("--base-path", default="/location",
                        help="URL prefix the pages are served at (default: /location, the real path)")
    parser.add_argument("--min-words", type=int, default=80, help="below this a page is skipped, never padded (default: 80)")
    parser.add_argument("--emit-shard", action="store_true", help="also write data/seed/<tag>.page-source.jsonl")
    parser.add_argument("--emit-sql", action="store_true", help="also write out/04-pages.sql — a plan, never executed")
    args = parser.parse_args()

    conn = store.connect()
    total = conn.execute("SELECT COUNT(*) n FROM content").fetchone()["n"]
    if total == 0:
        raise SystemExit("no rows in `content` — run `python3 scripts/stage3_fetch_content.py` first")
    run_id = store.get_meta(conn, "content").get("runId") or store.get_meta(conn, "urls").get("runId") or args.tag

    base_path = "/" + args.base_path.strip("/")
    keep_json = total <= JSON_MANIFEST_LIMIT
    print(f"stage 4 · {total} content rows · routes under {base_path}/ · below {args.min_words} words is skipped")
    if not keep_json:
        print(f"  {total} rows is above {JSON_MANIFEST_LIMIT}: the database is the manifest, no out/04-routes.json")

    shard_path = paths.source_shard(args.tag) if args.emit_shard else None
    # The shard lands in the application, not in this pipeline, so it is named the way the app names
    # it — `paths.rel` is for files under chimcare-migration/ and would fall back to an absolute path.
    shard_rel = str(shard_path.relative_to(paths.APP_ROOT)) if shard_path else None
    sql_part = PAGES_SQL.with_suffix(".sql.part") if args.emit_sql else None

    state = {"seen": 0, "routed": 0, "services": 0, "without_services": 0, "shard_lines": 0,
             "skipped": [], "json_routes": []}

    shard_fh = sql_fh = None
    if shard_path:
        shard_path.parent.mkdir(parents=True, exist_ok=True)
        shard_fh = shard_path.open("w", encoding="utf-8")
    if sql_part:
        sql_part.parent.mkdir(parents=True, exist_ok=True)
        sql_fh = sql_part.open("w", encoding="utf-8")
    try:
        # One transaction for the whole table: stage 4 either lands completely or not at all, and
        # a reader in WAL mode sees the previous run until the moment it does.
        written = store.write(conn, ROUTES_INSERT, route_rows(conn, args, base_path, state, shard_fh, sql_fh, keep_json))
    finally:
        if shard_fh:
            shard_fh.close()
        if sql_fh:
            sql_fh.close()

    if sql_part:
        finish_pages_sql(sql_part, PAGES_SQL, run_id, args.tag, state["routed"])

    generated_at = datetime.now(timezone.utc).isoformat()
    summary = {
        "runId": run_id,
        "generatedAt": generated_at,
        "tag": args.tag,
        "basePath": base_path,
        "routeFile": ROUTE_FILE,
        "in": state["seen"],
        "routed": state["routed"],
        "written": written,
        "skipped": len(state["skipped"]),
        "serviceLinks": state["services"],
        "routesWithoutServices": state["without_services"],
        "jsonManifest": paths.rel(paths.ROUTES) if keep_json else None,
        "sourceShard": shard_rel,
        "pagesSql": paths.rel(PAGES_SQL) if args.emit_sql else None,
    }
    store.set_meta(conn, "routes", summary)

    if keep_json:
        # A convenience for small runs only: the same shape the manifest always had, so a human can
        # still read a trial run by eye. Nothing in the application reads it any more.
        paths.write_json(
            paths.ROUTES,
            {
                "stage": 4,
                "runId": run_id,
                "generatedAt": generated_at,
                "tag": args.tag,
                "basePath": base_path,
                "routeFile": ROUTE_FILE,
                "counts": {"in": state["seen"], "routed": state["routed"], "skipped": len(state["skipped"]),
                           "serviceLinks": state["services"], "routesWithoutServices": state["without_services"]},
                "routes": state["json_routes"],
                "skipped": state["skipped"],
                "artifacts": {
                    "sourceShard": shard_rel,
                    "pagesSql": paths.rel(PAGES_SQL) if args.emit_sql else None,
                },
            },
        )

    db_size = store.DB_PATH.stat().st_size if store.DB_PATH.exists() else 0
    print(f"  routed: {state['routed']}/{state['seen']} · skipped: {len(state['skipped'])} · rows written: {written}")
    print(f"  service links: {state['services']} across {state['routed']} routes · {state['without_services']} routes with none")
    for entry in state["skipped"][:50]:
        print(f"    skip {entry['url']} — {entry['reason']}")
    if len(state["skipped"]) > 50:
        print(f"    … and {len(state['skipped']) - 50} more")
    print(f"  → {paths.rel(store.DB_PATH)} `routes` ({db_size / 1e6:.1f} MB database)")
    if keep_json:
        print(f"  → {paths.rel(paths.ROUTES)} (a convenience copy — {state['routed']} ≤ {JSON_MANIFEST_LIMIT} routes)")
    if shard_path:
        print(f"  → {shard_rel} ({state['shard_lines']} lines, in the application)")
    if args.emit_sql:
        print(f"  → {paths.rel(PAGES_SQL)} (a plan — nothing runs it)")
    print(f"  the route reads one row per request: {ROUTE_FILE}")


if __name__ == "__main__":
    main()
