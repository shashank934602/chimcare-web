#!/usr/bin/env python3
"""Stage 3 — fetch the body of every URL that survived stage 2.

    python3 scripts/stage3_fetch_content.py
    python3 scripts/stage3_fetch_content.py --min-words 120
    python3 scripts/stage3_fetch_content.py --refetch        # fetch and re-parse everything again

The database first. It holds the body byte-for-byte, costs nothing to read and cannot rate-limit
the pipeline, so the live site is a fallback and not the primary source.

The live site is consulted only when the stored body parses to less than ``--min-words`` of copy —
the plan's "if there's not enough data, search via browser". That happens when a page's content
lives in a builder structure this parser does not recognise, and the rendered HTML is then the only
place the copy is visible.

Images are carried. The original plan excluded them; that was reversed once the migrated pages were
rendered in the client's reference design, which is built around imagery. Body images come through
`lib.content.parse_body` as blocks in their true position, and the featured image is resolved here
from `_thumbnail_id` to a real URL on the WordPress uploads host.

Every record also carries the service pages WordPress actually publishes for its city. Those are
resolved against the database — one query per CITY, never one per page and never one per service.
The distinct cities are collected before any page is fetched, so a 10,000-page run over 700 cities
costs 700 queries and every page in a city reuses the one answer.

WHERE THE BODY LIVES. The raw WordPress body is written once, zlib-compressed, into `content.body`,
with the parsed blocks beside it in `content.parsed`. That is the only copy in the pipeline: at
1,000 URLs the old JSON artifact was 32 MB and every later stage copied the body again. Nothing
downstream may copy it — later stages carry the slug and read the row.

Resumability works like stage 2's: `store.todo(status → content)` over the pages fated `migrate`,
written in batches as they complete, so an interrupted run keeps what it already fetched.
`--refetch` forces the whole set again.

Reads:  the `urls` and `status` tables
Writes: the `content` and `services` tables, URLS/fetched-URLS-content.md, and out/03-content.json
        for small runs only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from datetime import datetime, timezone

from lib import catalogue, paths, store, wp
from lib.content import parse_body, visible_text
from lib.http import DEFAULT_ORIGIN, map_pool, probe
from lib.report import cell, header, truncate

CHUNK = 100  # post IDs per SELECT; bodies are large, so they are read in batches

# See stage 1: above this the JSON copy is not written and the database is the artifact.
JSON_ROW_LIMIT = 2000

# Where the uploads are served from. The dump's rows are the live site's rows, so an attachment's
# file path under this prefix is the URL that actually resolves.
UPLOADS_BASE = "https://www.chimcare.com/wp-content/uploads/"

# `_wp_attachment_metadata` is a serialized PHP array. Only its top-level `file`, `width` and
# `height` are wanted, and they are written before the nested `sizes` array, so the first match of
# each is the top-level one. A full unserializer would be a dependency this pipeline does not need.
_META_FILE_RE = re.compile(r's:4:"file";s:\d+:"([^"]*)"')
_META_WIDTH_RE = re.compile(r's:5:"width";i:(\d+);')
_META_HEIGHT_RE = re.compile(r's:6:"height";i:(\d+);')

CONTENT_UPSERT = """
INSERT INTO content(slug, post_title, post_modified, yoast_title, yoast_metadesc, yoast_canonical,
                    phone, job_location, thumbnail_id, hero_image, raw_sha256, raw_bytes,
                    body, parsed, words, image_count, content_source, fetched_at)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(slug) DO UPDATE SET
  post_title=excluded.post_title, post_modified=excluded.post_modified, yoast_title=excluded.yoast_title,
  yoast_metadesc=excluded.yoast_metadesc, yoast_canonical=excluded.yoast_canonical, phone=excluded.phone,
  job_location=excluded.job_location, thumbnail_id=excluded.thumbnail_id, hero_image=excluded.hero_image,
  raw_sha256=excluded.raw_sha256, raw_bytes=excluded.raw_bytes, body=excluded.body, parsed=excluded.parsed,
  words=excluded.words, image_count=excluded.image_count, content_source=excluded.content_source,
  fetched_at=excluded.fetched_at
"""

SERVICE_UPSERT = """
INSERT INTO services(slug, key, category_key, service_slug, url) VALUES(?, ?, ?, ?, ?)
ON CONFLICT(slug, key) DO UPDATE SET
  category_key=excluded.category_key, service_slug=excluded.service_slug, url=excluded.url
"""


def fetch_from_db(cfg, post_ids):
    """Every stored body and its Yoast metadata, keyed by slug. SELECT only."""
    rows = []
    for start in range(0, len(post_ids), CHUNK):
        batch = post_ids[start : start + CHUNK]
        rows += wp.query_json(
            cfg,
            f"""SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
                  'wpPostId', p.ID, 'slug', p.post_name, 'postTitle', p.post_title,
                  'postModified', p.post_modified, 'postContent', p.post_content,
                  'yoastTitle',    (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_yoast_wpseo_title'     LIMIT 1),
                  'yoastMetadesc', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_yoast_wpseo_metadesc'  LIMIT 1),
                  'yoastCanonical',(SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_yoast_wpseo_canonical' LIMIT 1),
                  'thumbnailId',   (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_thumbnail_id'          LIMIT 1),
                  'phone',         (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_phone'                 LIMIT 1),
                  'jobLocation',   (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_job_location'          LIMIT 1)
                )), JSON_ARRAY())
                FROM wp_posts p WHERE p.ID IN ({','.join(str(i) for i in batch)})""",
        )
    return {r["slug"]: r for r in rows}


def resolve_hero_images(cfg, thumbnail_ids, resolved=None):
    """Every featured image, keyed by attachment ID. SELECT only, one query per batch.

    ``resolved`` is carried across batches: the same featured image is shared by many location
    pages, so an attachment already looked up is never looked up again.

    The URL is built from `_wp_attachment_metadata`'s `file` path, not from the attachment's `guid`.
    `guid` is a historical value WordPress never rewrites: where an image has been cropped or
    re-edited, it still names the ORIGINAL upload while the metadata names the file in use (5 of the
    63 attachments behind this run's pages disagree that way). `guid` is only the fallback, for an
    attachment with no metadata row.
    """
    resolved = {} if resolved is None else resolved
    ids = sorted({int(t) for t in thumbnail_ids if str(t or "").isdigit()} - set(resolved))
    for start in range(0, len(ids), CHUNK):
        batch = ids[start : start + CHUNK]
        rows = wp.query_json(
            cfg,
            f"""SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
                  'id', p.ID, 'guid', p.guid,
                  'metadata', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_wp_attachment_metadata'  LIMIT 1),
                  'alt',      (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_wp_attachment_image_alt' LIMIT 1)
                )), JSON_ARRAY())
                FROM wp_posts p WHERE p.post_type='attachment' AND p.ID IN ({','.join(str(i) for i in batch)})""",
        )
        for row in rows:
            metadata = row.get("metadata") or ""
            file_match = _META_FILE_RE.search(metadata)
            width = _META_WIDTH_RE.search(metadata)
            height = _META_HEIGHT_RE.search(metadata)
            src = UPLOADS_BASE + file_match.group(1) if file_match else (row.get("guid") or "")
            if not src.startswith("http"):
                continue  # nothing usable: an attachment row with neither metadata nor a real guid
            resolved[row["id"]] = {
                # The alt is whatever WordPress stores, empty string included. Never invented here:
                # an empty alt says "decorative", and a guessed one misdescribes the page.
                "src": src,
                "alt": (row.get("alt") or "").strip(),
                "width": int(width.group(1)) if width else None,
                "height": int(height.group(1)) if height else None,
            }
    return resolved


def median(values) -> float:
    """The middle value. Reported alongside the total because coverage per city is wildly uneven
    (0..92 services), and a mean would hide that."""
    ordered = sorted(values)
    if not ordered:
        return 0.0
    mid = len(ordered) // 2
    if len(ordered) % 2:
        return float(ordered[mid])
    return (ordered[mid - 1] + ordered[mid]) / 2


def published_by_city(cfg, slugs, services):
    """Which catalogue services have a published page in each city named by ``slugs``. SELECT only.

    Batched by CITY, not by page and never by service, and called ONCE for the whole run before any
    page is fetched. The catalogue's 92 keys and one city make 92 candidate slugs, which is one
    `post_name IN (…)` query; every page in that city then reuses the answer. 10,000 pages across
    700 cities cost 700 queries, where per-service probing would have cost 920,000 and would have
    told us nothing more.

    Only `post_status='publish'` counts. A draft or trashed row is a page the public cannot reach,
    and linking to one would manufacture a 404 out of the migration itself.
    """
    cities = sorted({parsed for parsed in (catalogue.split_slug(s) for s in slugs) if parsed is not None})
    published = {}
    for city, state in cities:
        candidates = [catalogue.service_slug(s["key"], city, state) for s in services]
        rows = wp.query_json(
            cfg,
            f"""SELECT COALESCE(JSON_ARRAYAGG(p.post_name), JSON_ARRAY())
                FROM wp_posts p
                WHERE p.post_type={wp.lit(wp.POST_TYPE)} AND p.post_status='publish'
                  AND p.post_name IN ({','.join(wp.lit(c) for c in candidates)})""",
        )
        published[(city, state)] = set(rows)
    return published


def service_links_for(slug, published, services):
    """The published service pages in this page's city, in catalogue order. No query: a lookup."""
    parsed = catalogue.split_slug(slug)
    if parsed is None or parsed not in published:
        return []
    city, state = parsed
    existing = published[parsed]
    return [
        {"key": service["key"], "categoryKey": service["categoryKey"], "slug": candidate, "url": wp.url_for(candidate)}
        for service in services
        for candidate in [catalogue.service_slug(service["key"], city, state)]
        # A page whose own slug is a service slug must not link to itself: a self-link is dead
        # weight in the directory and reads as a navigation bug.
        if candidate in existing and candidate != slug
    ]


def write_report(conn, path: Path, cfg, services, min_words: int, excerpt: int, detail: int, stats: dict) -> None:
    """Stream URLS/fetched-URLS-content.md out of the database.

    The summary table covers every page; the extracted copy is quoted for the first ``detail``
    pages only. At 10,000 pages the old report was ~40 MB of block quotes that nobody could open,
    and a report nobody opens is not a report. Heading and paragraph counts moved into the detail
    section because they live inside the compressed `parsed` blob — printing them for every row
    would mean decompressing every body to build a table.
    """
    total = conn.execute("SELECT COUNT(*) n FROM content").fetchone()["n"]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        fh.write(
            header(
                "Fetched URL content",
                {
                    "Source": f"WordPress `{cfg.database}` bodies; the live page only where the stored body parsed thin",
                    "Store": f"`{paths.rel(store.DB_PATH)}` tables `content` (body + parsed blocks) and `services`",
                    "URLs": f"{total} with content fetched ({stats['fetchedThisRun']} this run)",
                    "Usable": f"{stats['usable']} at or above {min_words} words",
                    "Images": f"{stats['bodyImages']} carried in page bodies; {stats['withHero']} of {total} "
                              f"records have a hero image",
                    "Service links": f"{stats['serviceTotal']} resolved from the database · median "
                                     f"{stats['serviceMedian']:g} per page · {stats['pagesWithNone']} of {total} "
                                     f"pages have none · {stats['cityQueries']} city queries for {total} pages",
                    "Detail": f"copy quoted for the first {min(detail, total)} pages; the table below covers all {total}",
                    "Generated": datetime.now(timezone.utc).isoformat(),
                },
            )
        )
        fh.write("\n| URL | source | words | images | hero | services | usable |\n")
        fh.write("| --- | --- | --- | --- | --- | --- | --- |\n")
        summary = conn.execute(
            """SELECT u.url, c.content_source, c.words, c.image_count, c.hero_image,
                      (SELECT COUNT(*) FROM services s WHERE s.slug = c.slug) AS service_count
               FROM content c JOIN urls u ON u.slug = c.slug ORDER BY u.wp_post_id"""
        )
        for row in summary:
            fh.write(
                "| "
                + " | ".join(
                    cell(c)
                    for c in (
                        row["url"], row["content_source"], row["words"], row["image_count"],
                        "yes" if row["hero_image"] else "no", row["service_count"],
                        "yes" if (row["words"] or 0) >= min_words else "THIN",
                    )
                )
                + " |\n"
            )

        fh.write("\n## Extracted copy\n\n")
        rows = conn.execute(
            """SELECT c.*, u.url, u.wp_post_id,
                      (SELECT COUNT(*) FROM services s WHERE s.slug = c.slug) AS service_count
               FROM content c JOIN urls u ON u.slug = c.slug ORDER BY u.wp_post_id LIMIT ?""",
            (detail,),
        )
        for row in rows:
            parsed = store.unpack(row["parsed"]) or {}
            hero = json.loads(row["hero_image"]) if row["hero_image"] else None
            fh.write(f"### {row['url']}\n\n")
            fh.write(f"- **WordPress post:** {row['wp_post_id']} · modified {row['post_modified'] or 'unknown'}\n")
            fh.write(f"- **Title:** {row['post_title'] or ''}\n")
            fh.write(f"- **SEO title:** {row['yoast_title'] or '_none stored_'}\n")
            fh.write(f"- **Meta description:** {row['yoast_metadesc'] or '_none stored_'}\n")
            fh.write(f"- **Content source:** {row['content_source']}\n")
            fh.write(f"- **Extracted:** {parsed.get('words', 0)} words · {parsed.get('headingCount', 0)} headings · "
                     f"{parsed.get('paragraphCount', 0)} paragraphs · {parsed.get('listItemCount', 0)} list items\n")
            fh.write(f"- **Images carried:** {parsed.get('imageCount', 0)} in the body"
                     + (f" · hero `{hero['src']}`" if hero else " · no hero image") + "\n")
            fh.write(f"- **Service pages in this city:** {row['service_count']} of {len(services)} published\n")
            fh.write(f"- **Body SHA-256:** `{(row['raw_sha256'] or '')[:16]}…`\n\n")
            fh.write("> " + (truncate(parsed.get("plainText", ""), excerpt) or "_no copy extracted_") + "\n\n")
        if total > detail:
            fh.write(f"_{total - detail} further pages are in the table above; their copy is in "
                     f"`{paths.rel(store.DB_PATH)}` (`content.parsed`) rather than quoted here._\n")


def write_json_copy(conn, min_words: int, cfg, stats: dict, services) -> None:
    """The pre-database artifact, rebuilt from the store for runs small enough to hold in memory."""
    records = []
    for row in conn.execute(
        """SELECT c.*, u.url, u.wp_post_id, u.title, u.modified, u.content_length
           FROM content c JOIN urls u ON u.slug = c.slug ORDER BY u.wp_post_id"""
    ):
        service_rows = conn.execute(
            "SELECT key, category_key, service_slug, url FROM services WHERE slug = ? ORDER BY rowid", (row["slug"],)
        ).fetchall()
        records.append({
            "slug": row["slug"], "url": row["url"], "wpPostId": row["wp_post_id"], "title": row["title"],
            "modified": row["modified"], "contentLength": row["content_length"],
            "postTitle": row["post_title"], "postModified": row["post_modified"],
            "yoastTitle": row["yoast_title"], "yoastMetadesc": row["yoast_metadesc"],
            "yoastCanonical": row["yoast_canonical"], "phone": row["phone"], "jobLocation": row["job_location"],
            "thumbnailId": row["thumbnail_id"],
            "heroImage": json.loads(row["hero_image"]) if row["hero_image"] else None,
            "services": [
                {"key": s["key"], "categoryKey": s["category_key"], "slug": s["service_slug"], "url": s["url"]}
                for s in service_rows
            ],
            "rawBytes": row["raw_bytes"], "rawSha256": row["raw_sha256"],
            "rawBody": (store.unpack(row["body"]) or ""),
            "contentSource": row["content_source"], "parsed": store.unpack(row["parsed"]),
        })
    paths.write_json(
        paths.CONTENT,
        {
            "stage": 3,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "database": cfg.database,
            "minWords": min_words,
            "serviceCatalogue": len(services),
            "serviceLinks": {
                "total": stats["serviceTotal"],
                "medianPerPage": stats["serviceMedian"],
                "pagesWithNone": stats["pagesWithNone"],
                "maxPerPage": stats["serviceMax"],
            },
            "fetched": len(records),
            "usable": stats["usable"],
            "bySource": stats["bySource"],
            "records": records,
        },
    )


def collect_stats(conn, min_words: int, city_queries: int, fetched_this_run: int) -> dict:
    """Everything the report and the summary line need, as aggregate queries over the store."""
    total = conn.execute("SELECT COUNT(*) n FROM content").fetchone()["n"]
    per_page = [
        r["n"] for r in conn.execute(
            """SELECT (SELECT COUNT(*) FROM services s WHERE s.slug = c.slug) n FROM content c"""
        )
    ]
    by_source = {
        r["content_source"]: r["n"]
        for r in conn.execute("SELECT content_source, COUNT(*) n FROM content GROUP BY content_source")
    }
    agg = conn.execute(
        "SELECT COALESCE(SUM(image_count),0) images, COUNT(hero_image) heroes, "
        "SUM(CASE WHEN words >= ? THEN 1 ELSE 0 END) usable FROM content", (min_words,)
    ).fetchone()
    return {
        "total": total,
        "fetchedThisRun": fetched_this_run,
        "usable": agg["usable"] or 0,
        "bodyImages": agg["images"] or 0,
        "withHero": agg["heroes"] or 0,
        "serviceTotal": sum(per_page),
        "serviceMedian": median(per_page),
        "serviceMax": max(per_page) if per_page else 0,
        "pagesWithNone": sum(1 for n in per_page if n == 0),
        "cityQueries": city_queries,
        "bySource": by_source,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--min-words", type=int, default=80, help="below this, fall back to the live page (default: 80)")
    parser.add_argument("--origin", default=DEFAULT_ORIGIN, help=f"origin for the fallback (default: {DEFAULT_ORIGIN})")
    parser.add_argument("--no-fallback", action="store_true", help="database only; never fetch the live page")
    parser.add_argument("--concurrency", type=int, default=3, help="fallback requests in flight (default: 3)")
    parser.add_argument("--delay", type=float, default=0.3, help="seconds before each fallback request (default: 0.3)")
    parser.add_argument("--excerpt", type=int, default=600, help="characters of body quoted per URL (default: 600)")
    parser.add_argument("--detail", type=int, default=100,
                        help="pages whose copy is quoted in the report (default: 100); the table covers all of them")
    parser.add_argument("--refetch", action="store_true", help="fetch and re-parse every migrate page again")
    parser.add_argument("--batch", type=int, default=CHUNK,
                        help=f"pages committed per transaction (default: {CHUNK}) — the resume granularity")
    wp.add_db_args(parser)
    args = parser.parse_args()

    wp.assert_mysql()
    cfg = wp.config_from(args)
    paths.ensure_dirs()

    conn = store.connect()
    try:
        if not conn.execute("SELECT COUNT(*) n FROM status").fetchone()["n"]:
            raise SystemExit("the `status` table is empty — run `python3 scripts/stage2_validate_status.py` first")

        if args.refetch:
            todo = [r["slug"] for r in conn.execute("SELECT slug FROM status WHERE fate='migrate' ORDER BY slug")]
        else:
            todo = store.todo(conn, "status", "content", where="s.fate='migrate'")

        migrate_total = conn.execute("SELECT COUNT(*) n FROM status WHERE fate='migrate'").fetchone()["n"]
        # The catalogue is the application's own seed file, parsed, never restated here.
        services = catalogue.load_services()

        if not todo:
            # The normal end of a resumed run: every page fated `migrate` already has a body stored.
            print(f"stage 3 · nothing to do — all {migrate_total} pages fated `migrate` already have content "
                  f"(use --refetch to fetch them again)")
            stats = collect_stats(conn, args.min_words, 0, 0)
            write_report(conn, paths.CONTENT_MD, cfg, services, args.min_words, args.excerpt, args.detail, stats)
            print(f"  usable: {stats['usable']}/{stats['total']}")
            print(f"  → {paths.rel(paths.CONTENT_MD)}")
            return

        already = migrate_total - len(todo)
        print(f"stage 3 · {len(todo)} pages · database first, live page only below {args.min_words} words"
              + (f" · {already} already fetched, skipped" if already else ""))

        # The cities are resolved ONCE for the whole run, before any page is fetched. This is the
        # dedup that matters at scale: pages per city, not queries per page.
        published = published_by_city(cfg, todo, services)
        city_queries = len(published)
        print(f"  services: catalogue of {len(services)} across {city_queries} cities · "
              f"{city_queries} city queries for {len(todo)} pages")

        heroes: dict = {}
        fetched = 0
        for start in range(0, len(todo), args.batch):
            chunk = todo[start : start + args.batch]
            placeholders = ",".join("?" for _ in chunk)
            entries = conn.execute(
                f"SELECT slug, url, wp_post_id FROM urls WHERE slug IN ({placeholders}) ORDER BY wp_post_id", chunk
            ).fetchall()
            stored = fetch_from_db(cfg, [e["wp_post_id"] for e in entries])
            # Resolved over the distinct attachment IDs, and cached across batches — the same
            # featured image is shared by many location pages.
            resolve_hero_images(cfg, [r.get("thumbnailId") for r in stored.values()], heroes)

            records = []
            thin = []
            for entry in entries:
                row = stored.get(entry["slug"])
                if row is None:
                    # No row in wp_posts behind a URL stage 2 saw answer 200. Recorded as missing
                    # rather than skipped, so the gap is visible instead of silently absent.
                    records.append({"slug": entry["slug"], "contentSource": "missing", "raw": "",
                                    "parsed": None, "row": {}, "hero": None})
                    continue
                raw = row.get("postContent") or ""
                thumbnail_id = row.get("thumbnailId")
                record = {
                    "slug": entry["slug"], "raw": raw, "parsed": parse_body(raw), "row": row,
                    # Null when the post has no featured image, or when the attachment it names is
                    # gone from the dump. A missing hero is reported as missing, never substituted.
                    "hero": heroes.get(int(thumbnail_id)) if str(thumbnail_id or "").isdigit() else None,
                    "contentSource": "database",
                }
                records.append(record)
                if record["parsed"]["words"] < args.min_words:
                    thin.append(record)

            if thin and not args.no_fallback:
                origin = args.origin.rstrip("/")

                def fetch_live(record):
                    result = probe(origin + wp.url_for(record["slug"]), want_body=True, timeout=30.0)
                    if result.body:
                        text = visible_text(result.body)
                        if len(text.split()) > record["parsed"]["words"]:
                            record["contentSource"] = "live-page"
                            record["parsed"] = {
                                **record["parsed"],
                                "plainText": text,
                                "words": len(text.split()),
                                "recoveredFromLivePage": True,
                            }
                    return record

                map_pool(thin, fetch_live, concurrency=args.concurrency, delay=args.delay)

            now = datetime.now(timezone.utc).isoformat()
            store.write(conn, CONTENT_UPSERT, (
                (
                    r["slug"], r["row"].get("postTitle"), r["row"].get("postModified"),
                    r["row"].get("yoastTitle"), r["row"].get("yoastMetadesc"), r["row"].get("yoastCanonical"),
                    r["row"].get("phone"), r["row"].get("jobLocation"),
                    int(r["row"]["thumbnailId"]) if str(r["row"].get("thumbnailId") or "").isdigit() else None,
                    json.dumps(r["hero"], ensure_ascii=False) if r["hero"] else None,
                    hashlib.sha256(r["raw"].encode("utf-8")).hexdigest(), len(r["raw"].encode("utf-8")),
                    # The body is written here, compressed, and nowhere else in the pipeline.
                    store.pack(r["raw"]), store.pack(r["parsed"]),
                    (r["parsed"] or {}).get("words", 0), (r["parsed"] or {}).get("imageCount", 0),
                    r["contentSource"], now,
                )
                for r in records
            ))
            store.write(conn, SERVICE_UPSERT, (
                (r["slug"], link["key"], link["categoryKey"], link["slug"], link["url"])
                for r in records
                for link in service_links_for(r["slug"], published, services)
            ))
            fetched += len(records)
            print(f"\r  {fetched}/{len(todo)}", end="", flush=True)
        print()

        stats = collect_stats(conn, args.min_words, city_queries, fetched)
        store.set_meta(conn, "content", {
            "database": cfg.database,
            "minWords": args.min_words,
            "serviceCatalogue": len(services),
            "cityQueries": city_queries,
            "fetchedThisRun": fetched,
            "fetched": stats["total"],
            "usable": stats["usable"],
            "bySource": stats["bySource"],
            "serviceLinks": {
                "total": stats["serviceTotal"], "medianPerPage": stats["serviceMedian"],
                "pagesWithNone": stats["pagesWithNone"], "maxPerPage": stats["serviceMax"],
            },
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        })
        write_report(conn, paths.CONTENT_MD, cfg, services, args.min_words, args.excerpt, args.detail, stats)
        if stats["total"] <= JSON_ROW_LIMIT:
            write_json_copy(conn, args.min_words, cfg, stats, services)

        print(f"  usable: {stats['usable']}/{stats['total']}")
        print(f"  images: {stats['bodyImages']} carried in bodies · {stats['withHero']}/{stats['total']} with a hero image")
        print(f"  service links: {stats['serviceTotal']} total · median {stats['serviceMedian']:g} per page · "
              f"{stats['pagesWithNone']}/{stats['total']} pages with none")
        print(f"  city queries: {city_queries} for {fetched} pages fetched this run")
        print(f"  → {paths.rel(store.DB_PATH)} tables `content`, `services`")
        if stats["total"] <= JSON_ROW_LIMIT:
            print(f"  → {paths.rel(paths.CONTENT)} (convenience copy, runs of {JSON_ROW_LIMIT} rows or fewer)")
        print(f"  → {paths.rel(paths.CONTENT_MD)}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
