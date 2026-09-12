#!/usr/bin/env python3
"""Stage 2 — ask production what each selected URL does today, and sort the answers.

    python3 scripts/stage2_validate_status.py
    python3 scripts/stage2_validate_status.py --concurrency 4 --delay 0.25
    python3 scripts/stage2_validate_status.py --recheck        # probe everything again

Read-only GET requests to the live WordPress site. Nothing is written to WordPress and no DNS,
CDN or edge configuration is read or touched — this stage only observes.

The plan says "filter out 404". That is widened here on purpose, because a URL has four useful
answers, not two:

    200      migrate   a real page with a body to carry over
    3xx→200  redirect  not a page, but a destination worth recording
    404      drop      nothing to migrate
    410      drop      removed deliberately; nothing to migrate either
    3xx→4xx  drop      a broken chain, which is worse than a plain 404 and should be visible

Dropping everything that is "not 200" would throw away the redirect destinations, and treating a
broken chain as a clean redirect would carry a dead link into the new site.

RESUMABILITY IS WHY THIS STAGE USES THE DATABASE. It makes one network request per URL, so a
10,000-URL run that dies at 9,000 must never re-probe those 9,000: that would be 9,000 needless
requests at the origin, which is the one cost this pipeline is not allowed to be careless with.
The work list is `store.todo(urls → status)` — the slugs with no answer recorded yet — and results
are committed in batches as they complete, so an interrupted run keeps everything it had already
learned. `--recheck` is the deliberate opposite: probe every selected URL again.

Reads:  the `urls` table
Writes: the `status` table, URLS/url-status.md, and out/02-status.json for small runs only.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from datetime import datetime, timezone

from lib import paths, store
from lib.http import DEFAULT_ORIGIN, fate_of, map_pool, probe
from lib.report import cell, header

# See stage 1: above this the JSON copy is not written and the database is the artifact.
JSON_ROW_LIMIT = 2000

FATE_NOTE = {
    "migrate": "200 — a page with a body to carry over",
    "redirect": "redirects to a live page — record the destination, do not migrate a body",
    "drop": "404, 410, or a redirect chain that ends broken — nothing to migrate",
    "error": "no answer (timeout, DNS or TLS) — inconclusive, not the same as absent",
}

UPSERT = """
INSERT INTO status(slug, first_status, final_status, final_url, hops, fate, reason, redirect_to, error, probed_at)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(slug) DO UPDATE SET
  first_status=excluded.first_status, final_status=excluded.final_status, final_url=excluded.final_url,
  hops=excluded.hops, fate=excluded.fate, reason=excluded.reason, redirect_to=excluded.redirect_to,
  error=excluded.error, probed_at=excluded.probed_at
"""


def write_report(conn, path: Path, origin: str, probed: int, by_fate: dict) -> None:
    """Stream URLS/url-status.md out of the database — every row, one cursor, no list in memory."""
    keep = by_fate.get("migrate", 0)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        fh.write(
            header(
                "URL status validation",
                {
                    "Origin": origin,
                    "Probed": f"{probed} URLs this run, read-only GET, redirects followed by hand",
                    "Recorded": f"{sum(by_fate.values())} answers in the store",
                    "Carried into stage 3": f"{keep}",
                    "Store": f"`{paths.rel(store.DB_PATH)}` table `status`",
                    "Generated": datetime.now(timezone.utc).isoformat(),
                },
            )
        )
        fh.write("| fate | URLs | meaning |\n| --- | --- | --- |\n")
        for fate, n in sorted(by_fate.items(), key=lambda kv: -kv[1]):
            fh.write(f"| {cell(fate)} | {cell(n)} | {cell(FATE_NOTE.get(fate, ''))} |\n")
        fh.write("\n## Per URL\n\n")
        fh.write("| URL | first | final | hops | fate | redirects to |\n| --- | --- | --- | --- | --- | --- |\n")
        cursor = conn.execute(
            """SELECT u.url, s.first_status, s.final_status, s.hops, s.fate, s.redirect_to
               FROM status s JOIN urls u ON u.slug = s.slug ORDER BY u.wp_post_id"""
        )
        for row in cursor:
            fh.write(
                "| "
                + " | ".join(
                    cell(c)
                    for c in (
                        row["url"], row["first_status"], row["final_status"],
                        row["hops"], row["fate"], row["redirect_to"] or "",
                    )
                )
                + " |\n"
            )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--origin", default=DEFAULT_ORIGIN, help=f"origin to probe (default: {DEFAULT_ORIGIN})")
    parser.add_argument("--concurrency", type=int, default=4, help="requests in flight (default: 4)")
    parser.add_argument("--delay", type=float, default=0.2, help="seconds to wait before each request (default: 0.2)")
    parser.add_argument("--timeout", type=float, default=20.0, help="per-request timeout in seconds (default: 20)")
    parser.add_argument("--max-hops", type=int, default=5, help="redirect hops to follow (default: 5)")
    parser.add_argument("--recheck", action="store_true",
                        help="re-probe every selected URL, including ones already answered")
    parser.add_argument("--batch", type=int, default=200,
                        help="answers committed per transaction (default: 200) — the resume granularity")
    args = parser.parse_args()

    paths.ensure_dirs()
    origin = args.origin.rstrip("/")
    conn = store.connect()
    try:
        total = conn.execute("SELECT COUNT(*) n FROM urls").fetchone()["n"]
        if not total:
            raise SystemExit("the `urls` table is empty — run `python3 scripts/stage1_select_urls.py` first")

        if args.recheck:
            todo = [r["slug"] for r in conn.execute("SELECT slug FROM urls ORDER BY wp_post_id")]
        else:
            todo = store.todo(conn, "urls", "status")

        already = total - len(todo)
        if not todo:
            # The normal end of a resumed run, and not an error: every selected URL has an answer.
            print(f"stage 2 · nothing to do — all {total} selected URLs already have a status "
                  f"(use --recheck to probe them again)")
            by_fate = {r["fate"]: r["n"] for r in conn.execute("SELECT fate, COUNT(*) n FROM status GROUP BY fate")}
            write_report(conn, paths.URLS_DIR / "url-status.md", origin, 0, by_fate)
            for fate, n in sorted(by_fate.items(), key=lambda kv: -kv[1]):
                print(f"  {fate:9} {n}")
            return

        print(f"stage 2 · probing {len(todo)} URLs at {origin} · {args.concurrency} in flight, {args.delay}s apart"
              + (f" · {already} already answered, skipped" if already else ""))

        def check(entry):
            result = probe(origin + entry["url"], max_hops=args.max_hops, timeout=args.timeout)
            verdict = fate_of(result)
            return (
                entry["slug"], result.first_status, result.final_status, result.final_url,
                len(result.chain), verdict["fate"], verdict.get("reason"), verdict.get("redirectTo"),
                result.error, datetime.now(timezone.utc).isoformat(),
            )

        done = 0
        # Committed batch by batch rather than once at the end. A run that is killed at 9,000 of
        # 10,000 keeps 9,000 answers, and the next invocation probes only the remainder.
        for start in range(0, len(todo), args.batch):
            chunk = todo[start : start + args.batch]
            placeholders = ",".join("?" for _ in chunk)
            entries = conn.execute(
                f"SELECT slug, url FROM urls WHERE slug IN ({placeholders}) ORDER BY wp_post_id", chunk
            ).fetchall()
            rows = map_pool(entries, check, concurrency=args.concurrency, delay=args.delay)
            store.write(conn, UPSERT, rows)
            done += len(rows)
            print(f"\r  {done}/{len(todo)}", end="", flush=True)
        print()

        by_fate = {r["fate"]: r["n"] for r in conn.execute("SELECT fate, COUNT(*) n FROM status GROUP BY fate")}
        store.set_meta(
            conn,
            "status",
            {
                "origin": origin,
                "probedThisRun": done,
                "recorded": sum(by_fate.values()),
                "byFate": by_fate,
                "recheck": bool(args.recheck),
                "generatedAt": datetime.now(timezone.utc).isoformat(),
            },
        )
        write_report(conn, paths.URLS_DIR / "url-status.md", origin, done, by_fate)

        recorded = sum(by_fate.values())
        if recorded <= JSON_ROW_LIMIT:
            # Convenience for small runs. Rebuilt from the store, so it says the same thing the
            # database does; the per-hop redirect chain is not kept as a column and is not restated.
            results = [
                {
                    "slug": r["slug"], "url": r["url"], "wpPostId": r["wp_post_id"], "title": r["title"],
                    "firstStatus": r["first_status"], "finalStatus": r["final_status"],
                    "finalUrl": r["final_url"], "error": r["error"], "fate": r["fate"],
                    "reason": r["reason"], "redirectTo": r["redirect_to"], "hops": r["hops"],
                }
                for r in conn.execute(
                    """SELECT s.*, u.url, u.wp_post_id, u.title FROM status s
                       JOIN urls u ON u.slug = s.slug ORDER BY u.wp_post_id"""
                )
            ]
            paths.write_json(
                paths.STATUS,
                {
                    "stage": 2,
                    "generatedAt": datetime.now(timezone.utc).isoformat(),
                    "origin": origin,
                    "probed": len(results),
                    "byFate": by_fate,
                    "keptForContent": [r["slug"] for r in results if r["fate"] == "migrate"],
                    "results": results,
                },
            )

        for fate, n in sorted(by_fate.items(), key=lambda kv: -kv[1]):
            print(f"  {fate:9} {n}")
        print(f"  → {paths.rel(store.DB_PATH)} table `status`")
        if recorded <= JSON_ROW_LIMIT:
            print(f"  → {paths.rel(paths.STATUS)} (convenience copy, runs of {JSON_ROW_LIMIT} rows or fewer)")
        print(f"  → {paths.rel(paths.URLS_DIR / 'url-status.md')}")

        if not by_fate.get("migrate"):
            raise SystemExit("no URL returned 200 — stage 3 would have nothing to fetch")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
