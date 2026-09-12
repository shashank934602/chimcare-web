#!/usr/bin/env python3
"""Stage 1 — choose a URL pattern and a count, and take that many real URLs out of WordPress.

    python3 scripts/stage1_select_urls.py --list-patterns
    python3 scripts/stage1_select_urls.py --pattern 'chimney-sweep-%-wa' --limit 25

SELECT only. The pattern is a SQL LIKE against ``post_name``, so ``%`` is the wildcard; a bare
prefix such as ``chimney-sweep`` is turned into ``chimney-sweep%`` for convenience.

Selection is ordered by post ID rather than randomised, so the same pattern and count always yield
the same URLs. A trial you cannot re-run identically cannot be compared against its own last run.

The selection now lands in the pipeline database (``out/migration.sqlite``, table ``urls``) rather
than in a JSON file. At 200,000 URLs the JSON chain stopped being parseable at all — see
``lib/store.py`` for the measurement — and every later stage wants "the rows I have not done yet",
which is an indexed query, not a whole-file read. The upsert is keyed by slug, so re-running the
same selection is idempotent and a widened pattern adds rows without disturbing the ones already
probed or fetched.

Writes: the `urls` table, URLS/fetched-URLS.md, and out/01-selected.json for small runs only.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from datetime import datetime, timezone

from lib import paths, store, wp
from lib.report import cell, header, table, truncate

# Above this many rows the JSON convenience copy is not written: it is the artifact that did not
# scale, and the database is the real output. Small runs keep it so the stages that have not moved
# across yet (and any hand inspection) still work.
JSON_ROW_LIMIT = 2000

# One URL is one row of at most a few hundred bytes, so the ceiling is no longer about file size —
# it is only a guard against a typo asking for the whole 229,621-row table by accident.
MAX_LIMIT = 200_000

UPSERT = """
INSERT INTO urls(slug, url, wp_post_id, title, modified, content_length, run_id)
VALUES(?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(slug) DO UPDATE SET
  url=excluded.url, wp_post_id=excluded.wp_post_id, title=excluded.title,
  modified=excluded.modified, content_length=excluded.content_length, run_id=excluded.run_id
"""


def write_report(conn, path: Path, run_id: str, pattern: str, exclude, cfg, matched: int, selected: int) -> None:
    """Stream URLS/fetched-URLS.md straight out of the database.

    Deliberately NOT built from a list held in memory: at 200,000 rows the Markdown is ~30 MB and
    the rows behind it far more, and there is no reason for either to exist twice. The cursor yields
    one row at a time and each line is written as it is read.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        fh.write(
            header(
                "Fetched URLs",
                {
                    "Run": run_id,
                    "Pattern": f"`{pattern}`" + (f" excluding `{exclude}`" if exclude else ""),
                    "Source": f"WordPress `{cfg.database}`, `{wp.POST_TYPE}` where `post_status='publish'`",
                    "Matched": f"{matched} published URLs match the pattern",
                    "Selected": f"{selected} (lowest post IDs first, so the selection is reproducible)",
                    "Store": f"`{paths.rel(store.DB_PATH)}` table `urls`",
                    "Generated": datetime.now(timezone.utc).isoformat(),
                },
            )
        )
        fh.write("\n| # | URL | WP post | Title | Body bytes |\n| --- | --- | --- | --- | --- |\n")
        cursor = conn.execute(
            "SELECT url, wp_post_id, title, content_length FROM urls WHERE run_id = ? ORDER BY wp_post_id",
            (run_id,),
        )
        for i, row in enumerate(cursor, 1):
            fh.write(
                "| "
                + " | ".join(
                    cell(c)
                    for c in (i, row["url"], row["wp_post_id"], truncate(row["title"], 60), row["content_length"])
                )
                + " |\n"
            )
        fh.write("\n> Status codes are not checked here. Stage 2 decides what each URL does today.\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pattern", default="%", help="SQL LIKE pattern for post_name (default: %% — every URL)")
    parser.add_argument("--limit", type=int, default=25, help=f"how many URLs to take (1-{MAX_LIMIT}, default: 25)")
    parser.add_argument("--run", default=None, help="run id used in the reports (default: a UTC timestamp)")
    # A LIKE pattern cannot say "not". Family A and family B slugs both contain `-in-`, and only a
    # negated regular expression separates them, so one is offered rather than a second LIKE.
    parser.add_argument("--exclude-regexp", default=None,
                        help="drop slugs matching this MySQL REGEXP (e.g. '-in-[a-z]{2}$' to exclude family B)")
    parser.add_argument("--list-patterns", action="store_true", help="show the 30 most common slug prefixes and exit")
    wp.add_db_args(parser)
    args = parser.parse_args()

    wp.assert_mysql()
    cfg = wp.config_from(args)
    paths.ensure_dirs()

    if args.list_patterns:
        rows = wp.query_json(
            cfg,
            f"""SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('prefix', prefix, 'n', n)), JSON_ARRAY()) FROM (
                  SELECT SUBSTRING_INDEX(post_name,'-',2) AS prefix, COUNT(*) n
                  FROM wp_posts WHERE post_type={wp.lit(wp.POST_TYPE)} AND post_status='publish'
                  GROUP BY prefix ORDER BY n DESC LIMIT 30) t""",
        )
        print(table(["pattern", "published URLs"], [[f"{r['prefix']}-%", r["n"]] for r in rows]))
        return

    if not 1 <= args.limit <= MAX_LIMIT:
        raise SystemExit(f"--limit must be between 1 and {MAX_LIMIT} (got {args.limit})")

    pattern = args.pattern if "%" in args.pattern else args.pattern + "%"
    exclude = f" AND post_name NOT REGEXP {wp.lit(args.exclude_regexp)}" if args.exclude_regexp else ""
    run_id = args.run or datetime.now(timezone.utc).strftime("%Y-%m-%d-%H%M%S")

    matched = int(
        wp.query_json(
            cfg,
            f"""SELECT JSON_ARRAY(COUNT(*)) FROM wp_posts
                WHERE post_type={wp.lit(wp.POST_TYPE)} AND post_status='publish'
                  AND post_name LIKE {wp.lit(pattern)}{exclude}""",
        )[0]
    )
    print(f"stage 1 · pattern {pattern} · {matched} published URLs match · taking {min(args.limit, matched)}")

    rows = wp.query_json(
        cfg,
        f"""SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
              'wpPostId', ID, 'slug', post_name, 'title', post_title,
              'modified', post_modified, 'contentLength', LENGTH(post_content))), JSON_ARRAY())
            FROM (SELECT ID, post_name, post_title, post_modified, post_content FROM wp_posts
                  WHERE post_type={wp.lit(wp.POST_TYPE)} AND post_status='publish'
                    AND post_name LIKE {wp.lit(pattern)}{exclude}
                  ORDER BY ID LIMIT {args.limit}) t""",
    )
    urls = sorted(({**r, "url": wp.url_for(r["slug"])} for r in rows), key=lambda r: r["wpPostId"])

    generated_at = datetime.now(timezone.utc).isoformat()
    conn = store.connect()
    try:
        selected = store.write(
            conn,
            UPSERT,
            (
                (u["slug"], u["url"], u["wpPostId"], u["title"], u["modified"], u["contentLength"], run_id)
                for u in urls
            ),
        )
        store.set_meta(
            conn,
            "select",
            {
                "pattern": pattern,
                "excludeRegexp": args.exclude_regexp,
                "requested": args.limit,
                "matchedInDb": matched,
                "selected": selected,
                "runId": run_id,
                "generatedAt": generated_at,
                "database": cfg.database,
            },
        )
        write_report(conn, paths.URLS_MD, run_id, pattern, args.exclude_regexp, cfg, matched, selected)
        total = conn.execute("SELECT COUNT(*) n FROM urls").fetchone()["n"]
    finally:
        conn.close()

    # A convenience for small runs and for the stages that still read JSON. Above the limit the
    # database is the artifact; nothing is silently truncated, the file is simply not written.
    if selected <= JSON_ROW_LIMIT:
        paths.write_json(
            paths.SELECTED,
            {
                "stage": 1,
                "runId": run_id,
                "generatedAt": generated_at,
                "database": cfg.database,
                "pattern": pattern,
                "excludeRegexp": args.exclude_regexp,
                "requested": args.limit,
                "matchedInDb": matched,
                "selected": selected,
                "urls": urls,
            },
        )

    print(f"  → {selected} URLs upserted into `urls` ({total} rows in the store)")
    print(f"  → {paths.rel(store.DB_PATH)}")
    if selected <= JSON_ROW_LIMIT:
        print(f"  → {paths.rel(paths.SELECTED)} (convenience copy, runs of {JSON_ROW_LIMIT} rows or fewer)")
    print(f"  → {paths.rel(paths.URLS_MD)}")


if __name__ == "__main__":
    main()
