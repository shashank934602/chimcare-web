#!/usr/bin/env python3
"""Stage 5 — ask the running Next.js app whether it actually renders the migrated content.

    python3 scripts/stage5_test_render.py
    python3 scripts/stage5_test_render.py --recheck --concurrency 4 --delay 0.15
    python3 scripts/stage5_test_render.py --base http://localhost:3000 --coverage 0.9

Every prior stage asked WordPress what a URL does. This stage asks the destination the same
question: for each route stage 4 built, fetch it from the app and check that the rendered page
actually carries the content stage 3 extracted — not just that the route exists.

The app uses trailingSlash, so a route can 30x once before it lands; the fetch follows that hop the
same way ``lib.http.probe`` follows every other redirect, and the checks below run against the
final body. Six checks run per URL: a 200 on the final hop, the first heading present in the visible
text, a coverage ratio of the expected blocks against the visible text, no leaked "{{" template
placeholder, every manifest image reaching the HTML, and a non-empty <title>.

This is a gate, not just a report: it exits 1 if any URL fails any check, so the pipeline can stop
on a broken deploy instead of shipping one.

Why this stage streams. It makes one HTTP request per URL. At the 10,000 this must handle, and the
200,000 it is heading for, holding every result in memory to write one JSON file at the end is the
difference between a run that finishes and one that does not. So: work comes out of the `routes`
table a batch at a time, results go into the `render` table a batch at a time, and the report is
streamed back out of the database afterwards. Nothing whole-file is ever loaded.

Resume is the other half of that. A 10,000-URL run that dies at 9,000 must not re-request those
9,000, so the work list is `store.todo(routes → render)`: the slugs that have a route and no render
row yet. `--recheck` forces the full set.

Reads:  out/migration.sqlite — `routes` (slug, url, zlib-JSON payload, rendered_blocks)
Writes: out/migration.sqlite — `render` + `meta`; URLS/render-report.md;
        out/05-render.json only for runs at or under --json-max rows (a convenience for small runs;
        above that the database is the artifact).
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from datetime import datetime, timezone

from lib import paths, store
from lib.content import visible_text
from lib.http import map_pool, probe
from lib.report import cell, header, table

CHECKS = ("http_200", "heading_present", "content_coverage", "no_slot_leak", "images_present", "title_present")
_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
_IMG_SRC_RE = re.compile(r"<img\b[^>]*\bsrc=[\"']([^\"']+)[\"']", re.IGNORECASE)
# Every /location/ page now renders through the same template, so the template's own class no longer
# says where the content came from. The page marks its source explicitly instead. A database-sourced
# page carries different content by design, so comparing it against the manifest measures nothing.
_SOURCE_RE = re.compile(r'data-source="(manifest|database)"')

# SQLite's default limit is 999 bound variables, so a batch of slugs must stay well under it.
MAX_BATCH = 500

# The database actually in use, for messages and reports: --db may point somewhere other than the default.
DB_LABEL = "out/migration.sqlite"


def normalise(text: str) -> str:
    return " ".join((text or "").split()).lower()


def wait_for_server(base: str, timeout: float) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        result = probe(base, timeout=3.0)
        if result.final_status is not None:
            return True
        time.sleep(1.0)
    return False


def trial_path(route: dict, url: str) -> str:
    """The path to request. Stage 4 records it; a route row without one falls back to its URL path."""
    path = route.get("trialPath")
    if path:
        return path
    from urllib.parse import urlparse

    return urlparse(url).path or "/"


def check_route(base: str, route: dict, *, timeout: float, coverage_threshold: float) -> dict:
    url = base.rstrip("/") + route["trialPath"]
    result = probe(url, want_body=True, timeout=timeout)
    html = result.body or ""
    text = normalise(visible_text(html))

    outcomes: dict = {}

    ok_200 = result.final_status == 200
    outcomes["http_200"] = {
        "pass": ok_200,
        "reason": f"final status {result.final_status}" if not ok_200 else "200",
    }

    heading = route.get("title") or ""
    blocks = route.get("blocks") or []
    first_heading = next((b["text"] for b in blocks if b["type"] == "heading"), None) or heading
    heading_ok = bool(first_heading) and normalise(first_heading) in text
    outcomes["heading_present"] = {
        "pass": heading_ok,
        "reason": "found" if heading_ok else f"{first_heading!r} not found in rendered text",
    }

    # Only the blocks the page actually renders. The rest of the body is archived by an editorial
    # decision recorded in stage 4, not lost, and scoring a deliberate cut as a failure would turn
    # this gate into a hundred false alarms. `archivedWords` below keeps the size of that cut visible.
    cut = route.get("renderedBlocks")
    shown = blocks[:cut] if isinstance(cut, int) else blocks
    expected = [normalise(b["text"]) for b in shown if b.get("text")]
    found = sum(1 for b in expected if b in text)
    ratio = (found / len(expected)) if expected else 1.0
    coverage_ok = ratio >= coverage_threshold
    source_match = _SOURCE_RE.search(html)
    page_source = source_match.group(1) if source_match else "unknown"
    served_from_manifest = page_source == "manifest"
    if served_from_manifest:
        outcomes["content_coverage"] = {
            "pass": coverage_ok,
            "ratio": round(ratio, 3),
            "reason": f"{found}/{len(expected)} rendered blocks found ({ratio:.0%})"
            + (f"; {route['archivedWords']} words archived, not rendered" if route.get("archivedWords") else ""),
        }
    else:
        # Not a failure and not a pass: the database owns this URL, so the manifest was never used.
        outcomes["content_coverage"] = {
            "pass": True,
            "ratio": round(ratio, 3),
            "reason": f"content came from the {page_source}, not the manifest — manifest coverage does not apply",
        }

    leak_ok = "{{" not in html
    outcomes["no_slot_leak"] = {
        "pass": leak_ok,
        "reason": "clean" if leak_ok else "literal {{ found in rendered HTML",
    }

    # Images used to be stripped, and this check asserted their absence. They are carried now, so the
    # question reversed: every image the manifest holds for this page must actually reach the HTML.
    # A silently dropped image is the failure mode worth catching — the page still renders without it.
    # Only the images inside the rendered portion. The body flow beyond the opening group is archived
    # rather than shown, and the images sitting in it go with it — expecting those on the page scored
    # 27 of the hundred as broken when nothing was broken. `shown` is the same slice coverage uses.
    expected = [b["src"] for b in shown if b.get("type") == "image" and b.get("src")]
    hero = (route.get("heroImage") or {}).get("src")
    if hero:
        expected.append(hero)
    rendered = set(_IMG_SRC_RE.findall(html))
    # A URL may be rewritten by the image pipeline, so match on the file name rather than the whole URL.
    rendered_names = {src.rsplit("/", 1)[-1].split("?")[0] for src in rendered}
    missing = [src for src in expected if src.rsplit("/", 1)[-1].split("?")[0] not in rendered_names
               and src not in html]
    if not served_from_manifest:
        missing = []  # the database branch renders its own imagery; the manifest's is not expected
    images_ok = not missing
    outcomes["images_present"] = {
        "pass": images_ok,
        "reason": (f"{len(expected)} image(s) rendered" if expected else "no images on this page")
        if images_ok else f"{len(missing)} of {len(expected)} image(s) missing from the HTML",
    }

    title_match = _TITLE_RE.search(html)
    title_text = title_match.group(1).strip() if title_match else ""
    title_ok = bool(title_text)
    outcomes["title_present"] = {
        "pass": title_ok,
        "reason": "present" if title_ok else "no <title> tag, or it is empty",
    }

    passed = all(o["pass"] for o in outcomes.values())

    return {
        "slug": route["slug"],
        "trialPath": route["trialPath"],
        "status": result.final_status,
        "coverage": outcomes["content_coverage"]["ratio"],
        "servedFrom": page_source,
        "archivedWords": route.get("archivedWords", 0),
        "passed": passed,
        "checks": outcomes,
        "error": result.error,
    }


# --------------------------------------------------------------------------------------------
# reading work out of the store


def work_slugs(conn, *, recheck: bool, limit: int) -> list:
    """The slugs to request on this run — the whole point of resumability.

    Without --recheck this is `routes` minus `render`: a run that died at 9,000 of 10,000 comes
    back and asks the server for the remaining 1,000 only. Slugs are cheap (a list of short
    strings); the payloads they name are not, and those are loaded a batch at a time below.
    """
    if recheck:
        slugs = [r["slug"] for r in conn.execute("SELECT slug FROM routes ORDER BY slug")]
    else:
        slugs = sorted(store.todo(conn, "routes", "render"))
    return slugs[:limit] if limit else slugs


def load_routes(conn, slugs: list) -> list:
    """Inflate one batch of route payloads. `rendered_blocks` on the row wins over the payload copy:
    the column is the stage-4 decision of how much of the body the page renders, and coverage and
    image scoring are both measured against that slice only."""
    marks = ",".join("?" for _ in slugs)
    rows = conn.execute(
        f"SELECT slug, url, payload, rendered_blocks FROM routes WHERE slug IN ({marks})", slugs
    ).fetchall()
    out = []
    for row in rows:
        route = store.unpack(row["payload"]) or {}
        route["slug"] = row["slug"]
        route["trialPath"] = trial_path(route, row["url"])
        if row["rendered_blocks"] is not None:
            route["renderedBlocks"] = row["rendered_blocks"]
        out.append(route)
    return out


RENDER_SQL = """
INSERT INTO render(slug, status, served_from, coverage, passed, checks, checked_at)
VALUES(?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(slug) DO UPDATE SET
  status=excluded.status, served_from=excluded.served_from, coverage=excluded.coverage,
  passed=excluded.passed, checks=excluded.checks, checked_at=excluded.checked_at
"""


def render_row(result: dict, now: str) -> tuple:
    # `checks` keeps the per-check reasons, plus what the report needs but the columns have no place
    # for — the requested path, the archived-word count and any transport error.
    blob = {
        "trialPath": result["trialPath"],
        "archivedWords": result.get("archivedWords", 0),
        "error": result.get("error"),
        "checks": result["checks"],
    }
    return (
        result["slug"], result["status"], result["servedFrom"], result["coverage"],
        1 if result["passed"] else 0, store.pack(blob), now,
    )


def run_batches(conn, slugs: list, *, base: str, concurrency: int, delay: float, timeout: float,
                coverage_threshold: float, batch_size: int) -> int:
    """Request, check and persist one batch at a time. Never holds more than `batch_size` results."""
    def worker(route):
        return check_route(base, route, timeout=timeout, coverage_threshold=coverage_threshold)

    total = len(slugs)
    written = 0
    for start in range(0, total, batch_size):
        chunk = slugs[start:start + batch_size]
        routes = load_routes(conn, chunk)

        def progress(done, _n, _start=start, _len=len(routes)):
            print(f"\r  {_start + done}/{total}", end="", flush=True)

        results = map_pool(routes, worker, concurrency=concurrency, delay=delay, on_progress=progress)
        now = datetime.now(timezone.utc).isoformat()
        written += store.write(conn, RENDER_SQL, (render_row(r, now) for r in results if r))
    if total:
        print()
    return written


# --------------------------------------------------------------------------------------------
# reporting, streamed back out of the store


def summarise(conn) -> dict:
    """One pass over `render`, counting only. The per-check tallies need the checks blob, so the
    rows are streamed and discarded rather than collected."""
    by_check = {c: {"pass": 0, "fail": 0} for c in CHECKS}
    checked = passed = 0
    for row in conn.execute("SELECT passed, checks FROM render"):
        checked += 1
        passed += 1 if row["passed"] else 0
        checks = (store.unpack(row["checks"]) or {}).get("checks", {})
        for c in CHECKS:
            outcome = checks.get(c) or {}
            by_check[c]["pass" if outcome.get("pass") else "fail"] += 1
    return {"checked": checked, "passed": passed, "failed": checked - passed, "byCheck": by_check}


def run_id_of(conn) -> str:
    for stage in ("stage4", "stage1"):
        meta = store.get_meta(conn, stage)
        for key in ("runId", "run_id"):
            if meta.get(key):
                return str(meta[key])
    row = conn.execute("SELECT run_id FROM urls LIMIT 1").fetchone()
    return row["run_id"] if row else "unknown"


def write_report(conn, summary: dict, *, base: str, run_id: str, generated_at: str, detail_limit: int) -> None:
    """Stream the Markdown to disk. The per-URL table is one row per database row, written as it is
    read: the table is the part that grows with the run, so it is the part that must not be built in
    memory. The detailed failure section is capped — a person cannot read 10,000 of them — while the
    summary above it counts every row."""
    paths.RENDER_MD.parent.mkdir(parents=True, exist_ok=True)
    with paths.RENDER_MD.open("w", encoding="utf-8") as fh:
        fh.write(header(
            "Render verification",
            {
                "Run": run_id,
                "Base": base,
                "Checked": f"{summary['checked']} routes from the {DB_LABEL} `routes` table",
                "Passed": f"{summary['passed']}",
                "Failed": f"{summary['failed']}",
                "Generated": generated_at,
            },
        ))
        fh.write(table(
            ["check", "pass", "fail"],
            [[c, summary["byCheck"][c]["pass"], summary["byCheck"][c]["fail"]] for c in CHECKS],
        ))
        fh.write("\n\n## Per URL\n\n")
        headers = ["slug", "trialPath", "status", "coverage", "result"]
        fh.write("| " + " | ".join(headers) + " |\n")
        fh.write("| " + " | ".join("---" for _ in headers) + " |\n")
        for row in conn.execute("SELECT slug, status, coverage, passed, checks FROM render ORDER BY slug"):
            blob = store.unpack(row["checks"]) or {}
            cells = [
                row["slug"], blob.get("trialPath", ""), row["status"],
                f"{(row['coverage'] or 0):.0%}", "pass" if row["passed"] else "FAIL",
            ]
            fh.write("| " + " | ".join(cell(c) for c in cells) + " |\n")

        if summary["failed"]:
            fh.write("\n## Failures\n\n")
            if summary["failed"] > detail_limit:
                fh.write(f"_{summary['failed']} URLs failed; the first {detail_limit} are detailed here. "
                         f"Every failure is counted in the summary above and stored in full in "
                         f"`{DB_LABEL}` (`render` where `passed = 0`)._\n\n")
            for row in conn.execute(
                "SELECT slug, checks FROM render WHERE passed = 0 ORDER BY slug LIMIT ?", (detail_limit,)
            ):
                blob = store.unpack(row["checks"]) or {}
                checks = blob.get("checks", {})
                fh.write(f"### {row['slug']} — `{blob.get('trialPath', '')}`\n\n")
                for c in CHECKS:
                    outcome = checks.get(c) or {}
                    if not outcome.get("pass"):
                        fh.write(f"- **{c}:** {outcome.get('reason', '')}\n")
                fh.write("\n")


def write_json_summary(conn, summary: dict, *, base: str, run_id: str, generated_at: str, json_max: int) -> bool:
    """The small JSON stays only for small runs. Above --json-max the database IS the artifact, and
    re-serialising every result into one file is exactly the whole-file habit this stage dropped."""
    if summary["checked"] > json_max:
        return False
    results = []
    for row in conn.execute(
        "SELECT slug, status, served_from, coverage, passed, checks FROM render ORDER BY slug"
    ):
        blob = store.unpack(row["checks"]) or {}
        results.append({
            "slug": row["slug"],
            "trialPath": blob.get("trialPath", ""),
            "status": row["status"],
            "coverage": row["coverage"],
            "servedFrom": row["served_from"],
            "archivedWords": blob.get("archivedWords", 0),
            "passed": bool(row["passed"]),
            "checks": blob.get("checks", {}),
            "error": blob.get("error"),
        })
    paths.write_json(paths.RENDER, {
        "stage": 5,
        "runId": run_id,
        "generatedAt": generated_at,
        "base": base,
        "checked": summary["checked"],
        "passed": summary["passed"],
        "failed": summary["failed"],
        "byCheck": summary["byCheck"],
        "results": results,
    })
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base", default="http://localhost:3000", help="app origin to test (default: http://localhost:3000)")
    # Conservative on purpose: this points at a real server, and 10,000 URLs at 4 in flight is
    # already a sustained load. Raise it only against a machine you own.
    parser.add_argument("--concurrency", type=int, default=3,
                        help="requests in flight; bounded by a thread pool, never one thread per URL (default: 3)")
    parser.add_argument("--delay", type=float, default=0.1,
                        help="seconds to pause before each request, so a large run is not a burst (default: 0.1)")
    parser.add_argument("--timeout", type=float, default=30.0, help="per-request timeout in seconds (default: 30)")
    parser.add_argument("--coverage", type=float, default=0.8, help="minimum content-coverage ratio to pass (default: 0.8)")
    parser.add_argument("--recheck", action="store_true",
                        help="re-request every route, ignoring rows already in `render` (default: resume, requesting only what is missing)")
    parser.add_argument("--batch-size", type=int, default=200,
                        help=f"routes loaded, checked and written per transaction (default: 200, max {MAX_BATCH})")
    parser.add_argument("--detail-limit", type=int, default=100,
                        help="URLs detailed in the report's failure section; all are counted in the summary (default: 100)")
    parser.add_argument("--json-max", type=int, default=2000,
                        help="write out/05-render.json only when the run is at or under this many rows (default: 2000)")
    parser.add_argument("--limit", type=int, default=0, help="check at most this many routes this run (default: all)")
    parser.add_argument("--db", default=None, help="database file to use (default: out/migration.sqlite)")
    parser.add_argument("--start-server", action="store_true", help="launch `npm run dev` in the app root, wait for it, and shut it down after")
    args = parser.parse_args()

    global DB_LABEL
    batch_size = max(1, min(args.batch_size, MAX_BATCH))
    db_path = Path(args.db) if args.db else store.DB_PATH
    DB_LABEL = paths.rel(db_path)
    conn = store.connect(db_path)
    run_id = run_id_of(conn)

    total_routes = conn.execute("SELECT COUNT(*) n FROM routes").fetchone()["n"]
    if not total_routes:
        raise SystemExit(
            f"no rows in `routes` in {DB_LABEL} — run `python3 scripts/stage4_build_routes.py` first"
        )
    slugs = work_slugs(conn, recheck=args.recheck, limit=args.limit)
    already = 0 if args.recheck else conn.execute("SELECT COUNT(*) n FROM render").fetchone()["n"]
    print(f"stage 5 · {len(slugs)} of {total_routes} routes to verify against {args.base}"
          + (f" ({already} already checked — resuming; --recheck to redo them)" if already else ""))

    server = None
    try:
        if slugs:
            if args.start_server:
                print(f"  starting `npm run dev` in {paths.APP_ROOT} ...")
                server = subprocess.Popen(
                    ["npm", "run", "dev"],
                    cwd=str(paths.APP_ROOT),
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                if not wait_for_server(args.base, timeout=60.0):
                    raise SystemExit(f"`npm run dev` did not answer at {args.base} within 60s")
                print(f"  server is up at {args.base}")
            elif not wait_for_server(args.base, timeout=3.0):
                raise SystemExit(
                    f"no server answering at {args.base} — run `npm run dev` in {paths.APP_ROOT} "
                    f"(port 3000), or pass --start-server to let this stage launch it"
                )

            run_batches(
                conn, slugs,
                base=args.base, concurrency=args.concurrency, delay=args.delay, timeout=args.timeout,
                coverage_threshold=args.coverage, batch_size=batch_size,
            )

        generated_at = datetime.now(timezone.utc).isoformat()
        summary = summarise(conn)
        store.set_meta(conn, "stage5", {
            "runId": run_id,
            "base": args.base,
            "generatedAt": generated_at,
            "checked": summary["checked"],
            "passed": summary["passed"],
            "failed": summary["failed"],
            "byCheck": summary["byCheck"],
            "coverageThreshold": args.coverage,
            "concurrency": args.concurrency,
            "delay": args.delay,
        })
        write_report(conn, summary, base=args.base, run_id=run_id, generated_at=generated_at,
                     detail_limit=args.detail_limit)
        wrote_json = write_json_summary(conn, summary, base=args.base, run_id=run_id,
                                        generated_at=generated_at, json_max=args.json_max)

        for check in CHECKS:
            counts = summary["byCheck"][check]
            print(f"  {check:17} {counts['pass']}/{summary['checked']} passed")
        print(f"  → {summary['passed']}/{summary['checked']} URLs passed every check")
        print(f"  → {DB_LABEL} (`render`, {summary['checked']} rows)")
        print(f"  → {paths.rel(paths.RENDER_MD)}")
        if wrote_json:
            print(f"  → {paths.rel(paths.RENDER)}")
        else:
            print(f"  → out/05-render.json skipped: {summary['checked']} rows is over --json-max "
                  f"{args.json_max}; the database is the artifact")

        if summary["failed"]:
            raise SystemExit(1)
    finally:
        if server is not None:
            print("  stopping dev server ...")
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=10)
        conn.close()


if __name__ == "__main__":
    main()
