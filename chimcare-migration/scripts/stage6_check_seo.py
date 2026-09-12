#!/usr/bin/env python3
"""Stage 6 — audit the SEO of the migrated pages and record what was found.

    python3 scripts/stage6_check_seo.py
    python3 scripts/stage6_check_seo.py --recheck --concurrency 4 --delay 0.15
    python3 scripts/stage6_check_seo.py --base http://localhost:3000 --min-words 80

Stage 5 asked whether the app renders the content stage 3 extracted. This stage asks a narrower
question of the same rendered pages: does each one carry the SEO surface a search engine and a
social share card actually read — title, description, canonical, headings, structured data — and
does the rendered value match what WordPress had, when WordPress had one at all. It is a report,
not a gate on route existence: the trial route deliberately withholds indexing signals a production
cutover would supply, and this stage is the record of exactly which those are.

Why this stage streams. Like stage 5 it makes one request per URL, and at 10,000 — let alone the
200,000 this is heading for — a run that accumulates every extracted SEO surface in memory before
writing one JSON file does not finish. Work comes out of the `routes` table a batch at a time, the
source-side Yoast values come out of the `content` table for that same batch (never by re-reading a
content JSON file), results go into the `seo` table a batch at a time, and the report is streamed
back out afterwards. Duplicate titles and descriptions are the one check that needs the whole set:
that is done with a GROUP BY over the stored rows at the end, not a dict built as the run goes.

Resume: the work list is `store.todo(routes → seo)`, so a run that dies at 9,000 of 10,000 re-requests
only the 1,000 it never reached. `--recheck` forces the full set.

Reads:  out/migration.sqlite — `routes` (slug, url, payload) and `content` (yoast_title,
        yoast_metadesc, yoast_canonical: the source-of-truth values the rendered page is compared to)
Writes: out/migration.sqlite — `seo` + `meta`; migrated-URLS-SEO/seo-report.md;
        migrated-URLS-SEO/seo-values.json only for runs at or under --json-max rows (a convenience
        for small runs; above that the database is the artifact).

Exits 1 only when a check actually reached the `fail` state; `warn` and `n/a` never fail the run,
because a warn is a judgement call and n/a means the source had nothing to compare against.
"""

from __future__ import annotations

import argparse
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from datetime import datetime, timezone

from lib import paths, store
from lib.content import decode, plain
from lib.http import map_pool, probe
from lib.report import cell, header, table

# migrated-URLS-SEO/ — this stage's own output directory. Not part of lib/paths.py because no other
# stage reads it; the plan names it by hand, exactly as URLS/ is named for stages 1-5.
SEO_DIR = paths.MIGRATION_ROOT / "migrated-URLS-SEO"
SEO_VALUES = SEO_DIR / "seo-values.json"
SEO_REPORT_MD = SEO_DIR / "seo-report.md"

CHECKS = (
    "title_present", "title_length", "title_matches_source",
    "description_present", "description_length", "description_matches_source",
    "canonical_present", "single_h1", "heading_order", "jsonld_present",
    "images_have_alt", "word_count",
)
STATES = ("pass", "warn", "fail", "na")

# SQLite's default limit is 999 bound variables, so a batch of slugs must stay well under it.
MAX_BATCH = 500

# The database actually in use, for messages and reports: --db may point somewhere other than the default.
DB_LABEL = "out/migration.sqlite"

_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
_HTML_TAG_RE = re.compile(r"<html\b([^>]*)>", re.IGNORECASE)
_META_TAG_RE = re.compile(r"<meta\b([^>]*)>", re.IGNORECASE)
_LINK_TAG_RE = re.compile(r"<link\b([^>]*)>", re.IGNORECASE)
_HEADING_RE = re.compile(r"<h([1-6])\b[^>]*>(.*?)</h\1>", re.IGNORECASE | re.DOTALL)
_IMG_TAG_RE = re.compile(r"<img\b([^>]*)>", re.IGNORECASE)
_JSONLD_RE = re.compile(
    r'<script\b[^>]*\btype=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.IGNORECASE | re.DOTALL
)
_ATTR_RE = re.compile(r'([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"|([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*\'([^\']*)\'')


def _attrs(tag_body: str) -> dict:
    out = {}
    for m in _ATTR_RE.finditer(tag_body):
        if m.group(1) is not None:
            out[m.group(1).lower()] = decode(m.group(2))
        else:
            out[m.group(3).lower()] = decode(m.group(4))
    return out


def norm(text: str) -> str:
    return " ".join((text or "").split()).strip()


def extract_seo(html: str) -> dict:
    """Pull every SEO-relevant value out of one rendered page. Regex over the HTML, stdlib only."""
    html = html or ""

    title_match = _TITLE_RE.search(html)
    title = norm(decode(title_match.group(1))) if title_match else ""

    lang_match = _HTML_TAG_RE.search(html)
    lang = _attrs(lang_match.group(1)).get("lang", "") if lang_match else ""

    metas = [_attrs(m.group(1)) for m in _META_TAG_RE.finditer(html)]
    meta_by_name: dict = {}
    meta_by_property: dict = {}
    for a in metas:
        if a.get("name") and "content" in a:
            meta_by_name[a["name"].lower()] = a["content"]
        if a.get("property") and "content" in a:
            meta_by_property[a["property"].lower()] = a["content"]

    description = norm(meta_by_name.get("description", ""))
    robots = norm(meta_by_name.get("robots", ""))

    canonical = ""
    for m in _LINK_TAG_RE.finditer(html):
        a = _attrs(m.group(1))
        if a.get("rel", "").lower() == "canonical" and a.get("href"):
            canonical = a["href"]
            break

    og_title = norm(meta_by_property.get("og:title", ""))
    og_description = norm(meta_by_property.get("og:description", ""))
    og_type = norm(meta_by_property.get("og:type", ""))
    og_url = norm(meta_by_property.get("og:url", ""))
    twitter_card = norm(meta_by_name.get("twitter:card", ""))

    headings = [(int(m.group(1)), norm(plain(m.group(2)))) for m in _HEADING_RE.finditer(html)]
    h1s = [text for level, text in headings if level == 1]

    heading_counts = {f"h{n}": sum(1 for level, _ in headings if level == n) for n in range(2, 7)}

    jsonld_blocks = [norm(plain(m.group(1))) for m in _JSONLD_RE.finditer(html)]

    images = []
    for m in _IMG_TAG_RE.finditer(html):
        a = _attrs(m.group(1))
        images.append({"src": a.get("src", ""), "alt": a.get("alt", "")})

    body_text = plain(re.sub(r"<(script|style|noscript)\b.*?</\1>", " ", html, flags=re.IGNORECASE | re.DOTALL))
    word_count = len(body_text.split())

    return {
        "title": title,
        "description": description,
        "robots": robots,
        "canonical": canonical,
        "ogTitle": og_title,
        "ogDescription": og_description,
        "ogType": og_type,
        "ogUrl": og_url,
        "twitterCard": twitter_card,
        "h1s": h1s,
        "headings": [{"level": level, "text": text} for level, text in headings],
        "headingCounts": heading_counts,
        "jsonldCount": len(jsonld_blocks),
        "jsonldBlocks": jsonld_blocks,
        "images": images,
        "wordCount": word_count,
        "lang": lang,
    }


def outcome(state: str, reason: str) -> dict:
    return {"state": state, "reason": reason}


def run_checks(extracted: dict, source: dict, *, min_words: int) -> dict:
    checks: dict = {}

    # 1. title_present
    title = extracted["title"]
    checks["title_present"] = outcome("pass" if title else "fail", "present" if title else "no <title>, or it is empty")

    # 2. title_length — warn outside 30..65, never fail on length alone
    if title:
        n = len(title)
        if 30 <= n <= 65:
            checks["title_length"] = outcome("pass", f"{n} characters")
        else:
            checks["title_length"] = outcome("warn", f"{n} characters, outside 30..65")
    else:
        checks["title_length"] = outcome("na", "no title to measure")

    # 3. title_matches_source
    yoast_title = norm(source.get("yoastTitle") or "")
    if not yoast_title:
        checks["title_matches_source"] = outcome("na", "source has no yoastTitle to compare against")
    elif norm(title) == yoast_title:
        checks["title_matches_source"] = outcome("pass", "rendered title equals yoastTitle")
    else:
        checks["title_matches_source"] = outcome(
            "fail", f"rendered {title!r} != source yoastTitle {yoast_title!r}"
        )

    # 4. description_present
    description = extracted["description"]
    checks["description_present"] = outcome(
        "pass" if description else "fail", "present" if description else "no meta description"
    )

    # 5. description_length — warn outside 70..160
    if description:
        n = len(description)
        if 70 <= n <= 160:
            checks["description_length"] = outcome("pass", f"{n} characters")
        else:
            checks["description_length"] = outcome("warn", f"{n} characters, outside 70..160")
    else:
        checks["description_length"] = outcome("na", "no description to measure")

    # 6. description_matches_source
    yoast_desc = norm(source.get("yoastMetadesc") or "")
    if not yoast_desc:
        checks["description_matches_source"] = outcome("na", "source has no yoastMetadesc to compare against")
    elif norm(description) == yoast_desc:
        checks["description_matches_source"] = outcome("pass", "rendered description equals yoastMetadesc")
    else:
        checks["description_matches_source"] = outcome(
            "fail", f"rendered {description!r} != source yoastMetadesc {yoast_desc!r}"
        )

    # 7. canonical_present
    canonical = extracted["canonical"]
    checks["canonical_present"] = outcome(
        "pass" if canonical else "fail", "present" if canonical else "no rel=canonical link"
    )

    # 8. single_h1
    h1_count = len(extracted["h1s"])
    if h1_count == 1:
        checks["single_h1"] = outcome("pass", "exactly one h1")
    else:
        checks["single_h1"] = outcome("fail", f"{h1_count} h1 elements found")

    # 9. heading_order — no skipped level walking the document in order
    levels = [lvl for lvl, _ in [(h["level"], h["text"]) for h in extracted["headings"]]]
    skip_at = None
    seen_max = 0
    for lvl in levels:
        if seen_max and lvl > seen_max + 1:
            skip_at = (seen_max, lvl)
            break
        seen_max = max(seen_max, lvl)
    if not levels:
        checks["heading_order"] = outcome("na", "no headings to order")
    elif skip_at is None:
        checks["heading_order"] = outcome("pass", "no skipped heading level")
    else:
        checks["heading_order"] = outcome("fail", f"h{skip_at[0]} jumps straight to h{skip_at[1]}")

    # 10. jsonld_present
    jsonld_count = extracted["jsonldCount"]
    checks["jsonld_present"] = outcome(
        "pass" if jsonld_count else "fail",
        f"{jsonld_count} block(s)" if jsonld_count else "no application/ld+json block",
    )

    # 11. images_have_alt — images are carried now, so this check has real work to do. It stays
    #     "n/a" only on a page that genuinely has none, which is a fact about that page, not a pass.
    images = extracted["images"]
    if not images:
        checks["images_have_alt"] = outcome("na", "this page has no images")
    else:
        missing = [i for i in images if not (i["alt"] or "").strip()]
        if missing:
            checks["images_have_alt"] = outcome("fail", f"{len(missing)}/{len(images)} <img> tag(s) missing alt")
        else:
            checks["images_have_alt"] = outcome("pass", f"all {len(images)} <img> tag(s) have alt text")

    # 12. word_count
    wc = extracted["wordCount"]
    if wc >= min_words:
        checks["word_count"] = outcome("pass", f"{wc} words")
    else:
        checks["word_count"] = outcome("fail", f"{wc} words, below --min-words {min_words}")

    return checks


def check_route(base: str, route: dict, *, timeout: float, min_words: int) -> dict:
    url = base.rstrip("/") + route["trialPath"]
    result = probe(url, want_body=True, timeout=timeout)
    html = result.body or ""
    extracted = extract_seo(html)
    # The source values ride on the route dict, read from the `content` table for this batch.
    checks = run_checks(extracted, route.get("source") or {}, min_words=min_words)

    return {
        "slug": route["slug"],
        "trialPath": route["trialPath"],
        "status": result.final_status,
        "extracted": extracted,
        "checks": checks,
    }


# --------------------------------------------------------------------------------------------
# reading work out of the store


def trial_path(route: dict, url: str) -> str:
    """The path to request. Stage 4 records it; a route row without one falls back to its URL path."""
    path = route.get("trialPath")
    if path:
        return path
    from urllib.parse import urlparse

    return urlparse(url).path or "/"


def work_slugs(conn, *, recheck: bool, limit: int) -> list:
    if recheck:
        slugs = [r["slug"] for r in conn.execute("SELECT slug FROM routes ORDER BY slug")]
    else:
        slugs = sorted(store.todo(conn, "routes", "seo"))
    return slugs[:limit] if limit else slugs


def load_batch(conn, slugs: list) -> list:
    """One batch of routes, each carrying the source-side Yoast values from `content`.

    The join is the point: the values this stage compares the rendered page against are read per
    batch out of the `content` table, so nothing here ever parses a 32 MB content manifest.
    """
    marks = ",".join("?" for _ in slugs)
    rows = conn.execute(
        f"""SELECT r.slug, r.url, r.payload,
                   c.yoast_title, c.yoast_metadesc, c.yoast_canonical
              FROM routes r LEFT JOIN content c ON c.slug = r.slug
             WHERE r.slug IN ({marks})""",
        slugs,
    ).fetchall()
    out = []
    for row in rows:
        route = store.unpack(row["payload"]) or {}
        route["slug"] = row["slug"]
        route["trialPath"] = trial_path(route, row["url"])
        route["source"] = {
            "yoastTitle": row["yoast_title"],
            "yoastMetadesc": row["yoast_metadesc"],
            "yoastCanonical": row["yoast_canonical"],
        }
        out.append(route)
    return out


SEO_SQL = """
INSERT INTO seo(slug, extracted, checks, failures, checked_at)
VALUES(?, ?, ?, ?, ?)
ON CONFLICT(slug) DO UPDATE SET
  extracted=excluded.extracted, checks=excluded.checks,
  failures=excluded.failures, checked_at=excluded.checked_at
"""


def seo_row(result: dict, now: str) -> tuple:
    failures = sum(1 for c in CHECKS if result["checks"][c]["state"] == "fail")
    blob = {"trialPath": result["trialPath"], "status": result["status"], "checks": result["checks"]}
    return (result["slug"], store.pack(result["extracted"]), store.pack(blob), failures, now)


def run_batches(conn, slugs: list, *, base: str, concurrency: int, delay: float, timeout: float,
                min_words: int, batch_size: int) -> int:
    """Request, check and persist one batch at a time. Never holds more than `batch_size` results."""
    def worker(route):
        return check_route(base, route, timeout=timeout, min_words=min_words)

    total = len(slugs)
    written = 0
    for start in range(0, total, batch_size):
        chunk = slugs[start:start + batch_size]
        routes = load_batch(conn, chunk)

        def progress(done, _n, _start=start):
            print(f"\r  {_start + done}/{total}", end="", flush=True)

        results = map_pool(routes, worker, concurrency=concurrency, delay=delay, on_progress=progress)
        now = datetime.now(timezone.utc).isoformat()
        written += store.write(conn, SEO_SQL, (seo_row(r, now) for r in results if r))
    if total:
        print()
    return written


# --------------------------------------------------------------------------------------------
# reporting, streamed back out of the store


def summarise(conn) -> dict:
    """One counting pass over `seo`. The state tallies live in the checks blob, so rows are streamed
    and discarded rather than collected."""
    by_check = {c: {s: 0 for s in STATES} for c in CHECKS}
    checked = failing = 0
    for row in conn.execute("SELECT failures, checks FROM seo"):
        checked += 1
        failing += 1 if row["failures"] else 0
        checks = (store.unpack(row["checks"]) or {}).get("checks", {})
        for c in CHECKS:
            state = (checks.get(c) or {}).get("state")
            if state in by_check[c]:
                by_check[c][state] += 1
    return {"checked": checked, "failing": failing, "byCheck": by_check}


def source_coverage(conn) -> dict:
    """How much the source could ever have matched — counted in SQL, not by walking records."""
    row = conn.execute(
        """SELECT COUNT(*) AS total,
                  SUM(CASE WHEN TRIM(COALESCE(yoast_title, '')) <> '' THEN 1 ELSE 0 END) AS t,
                  SUM(CASE WHEN TRIM(COALESCE(yoast_metadesc, '')) <> '' THEN 1 ELSE 0 END) AS d,
                  SUM(CASE WHEN TRIM(COALESCE(yoast_canonical, '')) <> '' THEN 1 ELSE 0 END) AS c
             FROM content"""
    ).fetchone()
    return {
        "records": row["total"] or 0,
        "yoastTitle": row["t"] or 0,
        "yoastMetadesc": row["d"] or 0,
        "yoastCanonical": row["c"] or 0,
    }


def duplicates(conn, limit: int) -> dict:
    """Duplicate titles and descriptions — the one question that needs the whole set.

    It is answered with a GROUP BY rather than a dict of every value seen: the rendered title and
    description are lifted out of each stored row into a TEMP table (which SQLite spills to disk),
    grouped there, and the temp table is dropped. Memory holds one row at a time plus the groups
    that actually repeat.
    """
    conn.executescript(
        "DROP TABLE IF EXISTS temp.seo_values;"
        "CREATE TEMP TABLE seo_values (slug TEXT, title TEXT, description TEXT);"
    )
    def rows():
        for row in conn.execute("SELECT slug, extracted FROM seo"):
            extracted = store.unpack(row["extracted"]) or {}
            yield (row["slug"], extracted.get("title") or "", extracted.get("description") or "")

    store.write(conn, "INSERT INTO temp.seo_values(slug, title, description) VALUES(?, ?, ?)", rows())

    out = {}
    for field in ("title", "description"):
        found = []
        for group in conn.execute(
            f"""SELECT {field} AS value, COUNT(*) AS n, GROUP_CONCAT(slug, ', ') AS slugs
                  FROM temp.seo_values
                 WHERE {field} <> ''
              GROUP BY {field} HAVING n > 1
              ORDER BY n DESC, value LIMIT ?""",
            (limit,),
        ):
            found.append({"value": group["value"], "count": group["n"],
                          "slugs": (group["slugs"] or "").split(", ")})
        out[field] = found
    # Totals count every duplicate group, even the ones past `limit`, so the report never understates.
    for field in ("title", "description"):
        out[field + "Groups"] = conn.execute(
            f"SELECT COUNT(*) n FROM (SELECT {field} FROM temp.seo_values WHERE {field} <> ''"
            f" GROUP BY {field} HAVING COUNT(*) > 1)"
        ).fetchone()["n"]
    conn.execute("DROP TABLE temp.seo_values")
    return out


def run_id_of(conn) -> str:
    for stage in ("stage4", "stage1"):
        meta = store.get_meta(conn, stage)
        for key in ("runId", "run_id"):
            if meta.get(key):
                return str(meta[key])
    row = conn.execute("SELECT run_id FROM urls LIMIT 1").fetchone()
    return row["run_id"] if row else "unknown"


def write_report(conn, summary: dict, coverage: dict, dups: dict, *, base: str, run_id: str,
                 generated_at: str, min_words: int, detail_limit: int) -> None:
    """Stream the Markdown to disk: the per-URL table is written a row at a time as the database
    yields it, and the detailed failure and warning sections are capped — a person cannot read
    10,000 of them — while every row is still counted in the summary tables above."""
    SEO_DIR.mkdir(parents=True, exist_ok=True)
    with SEO_REPORT_MD.open("w", encoding="utf-8") as fh:
        fh.write(header(
            "SEO audit",
            {
                "Run": run_id,
                "Base": base,
                "Checked": f"{summary['checked']} routes from the {DB_LABEL} `routes` table",
                "Min words": min_words,
                "Generated": generated_at,
            },
        ))
        fh.write(
            "## What this trial route intentionally does not carry\n\n"
            "- The trial route deliberately emits `robots: noindex`. That is correct for a review surface "
            "and is reported here as **expected**, not as an SEO failure.\n"
            "- The trial route emits no canonical and no JSON-LD. Those are real gaps a production "
            "cutover would have to close, so they are reported below as gaps against production "
            "readiness — not as bugs in the trial.\n"
            "- Images are carried by the pipeline and served from the WordPress host. Alt text is whatever "
            "WordPress stored, including empty — an empty alt marks a decorative image and is never "
            "invented here, so `images_have_alt` measures the source's own accessibility, not the migration's.\n\n"
        )
        fh.write(
            "## Source data coverage\n\n"
            f"Of {coverage['records']} WordPress source records, "
            f"{coverage['yoastTitle']} had a yoastTitle, "
            f"{coverage['yoastMetadesc']} had a yoastMetadesc, and "
            f"{coverage['yoastCanonical']} had a yoastCanonical. "
            "Where a source value is absent, `title_matches_source` / `description_matches_source` are "
            "reported `n/a` — WordPress never gave this migration anything to carry over, and that is a "
            "finding about the source data, not a migration failure. This coverage number is the ceiling "
            "on what any migration of these pages could match.\n\n"
        )
        fh.write("## Summary by check\n\n")
        fh.write(table(
            ["check", "pass", "warn", "fail", "n/a"],
            [[c] + [summary["byCheck"][c][s] for s in STATES] for c in CHECKS],
        ))
        fh.write("\n\n## Duplicates across the set\n\n")
        for field, label in (("title", "titles"), ("description", "meta descriptions")):
            groups = dups[field + "Groups"]
            if groups:
                shown = dups[field]
                fh.write(f"**Duplicate {label}:** {groups} repeated value(s)"
                         + (f"; the {len(shown)} most repeated are listed.\n\n" if groups > len(shown) else ".\n\n"))
                fh.write(table(
                    [field, "count", "slugs"],
                    [[d["value"], d["count"], ", ".join(d["slugs"])] for d in shown],
                ))
                fh.write("\n\n")
            else:
                fh.write(f"No duplicate {label} found among the checked routes.\n\n")

        fh.write("## Per URL\n\n")
        headers = ["slug", "trialPath", "status", "title len", "desc len", "h1s", "jsonld", "words", "fails"]
        fh.write("| " + " | ".join(headers) + " |\n")
        fh.write("| " + " | ".join("---" for _ in headers) + " |\n")
        for row in conn.execute("SELECT slug, extracted, checks, failures FROM seo ORDER BY slug"):
            extracted = store.unpack(row["extracted"]) or {}
            blob = store.unpack(row["checks"]) or {}
            cells = [
                row["slug"], blob.get("trialPath", ""), blob.get("status"),
                len(extracted.get("title") or ""), len(extracted.get("description") or ""),
                len(extracted.get("h1s") or []), extracted.get("jsonldCount", 0),
                extracted.get("wordCount", 0), row["failures"],
            ]
            fh.write("| " + " | ".join(cell(c) for c in cells) + " |\n")
        fh.write("\n")

        _write_state_section(conn, fh, "Failures", "fail", detail_limit,
                             "SELECT slug, checks FROM seo WHERE failures > 0 ORDER BY slug LIMIT ?",
                             summary["failing"])
        # Warnings have no column of their own, so they are found by scanning — still one row at a
        # time, and still capped, because the summary table above already counts every one.
        _write_state_section(conn, fh, "Warnings", "warn", detail_limit,
                             "SELECT slug, checks FROM seo ORDER BY slug", None)


def _write_state_section(conn, fh, title: str, state: str, detail_limit: int, sql: str, known_total) -> None:
    params = (detail_limit,) if sql.rstrip().endswith("LIMIT ?") else ()
    if known_total is not None:
        if not known_total:
            return
        fh.write(f"## {title}\n\n")
        if known_total > detail_limit:
            fh.write(f"_{known_total} URLs have at least one `{state}`; the first {detail_limit} are detailed "
                     f"here. All are counted in the summary above and stored in full in "
                     f"`{DB_LABEL}` (`seo`)._\n\n")
    written = 0
    for row in conn.execute(sql, params):
        blob = store.unpack(row["checks"]) or {}
        checks = blob.get("checks", {})
        hits = [(c, checks[c]) for c in CHECKS if (checks.get(c) or {}).get("state") == state]
        if not hits:
            continue
        if known_total is None and written == 0:
            fh.write(f"## {title}\n\n")
        body = [f"### {row['slug']} — `{blob.get('trialPath', '')}`", ""]
        body += [f"- **{c}:** {o['reason']}" for c, o in hits]
        fh.write("\n".join(body) + "\n\n")
        written += 1
        if written >= detail_limit:
            if known_total is None:
                fh.write(f"_Capped at {detail_limit} URLs; every `{state}` is counted in the summary above "
                         f"and stored in `{DB_LABEL}` (`seo`)._\n\n")
            break


def write_json_summary(conn, summary: dict, coverage: dict, dups: dict, *, base: str, run_id: str,
                       generated_at: str, json_max: int) -> bool:
    """The small JSON stays only for small runs. Above --json-max the database IS the artifact, and
    re-serialising every extracted SEO surface into one file is the whole-file habit this stage dropped."""
    if summary["checked"] > json_max:
        return False
    results = []
    for row in conn.execute("SELECT slug, extracted, checks FROM seo ORDER BY slug"):
        blob = store.unpack(row["checks"]) or {}
        results.append({
            "slug": row["slug"],
            "trialPath": blob.get("trialPath", ""),
            "status": blob.get("status"),
            "extracted": store.unpack(row["extracted"]) or {},
            "checks": blob.get("checks", {}),
        })
    SEO_DIR.mkdir(parents=True, exist_ok=True)
    paths.write_json(SEO_VALUES, {
        "stage": 6,
        "runId": run_id,
        "generatedAt": generated_at,
        "base": base,
        "checked": summary["checked"],
        "sourceCoverage": {k: coverage[k] for k in ("yoastTitle", "yoastMetadesc", "yoastCanonical")},
        "byCheck": summary["byCheck"],
        "duplicates": {"titles": dups["title"], "descriptions": dups["description"]},
        "results": results,
    })
    return True


def wait_for_server(base: str, timeout: float) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        result = probe(base, timeout=3.0)
        if result.final_status is not None:
            return True
        time.sleep(1.0)
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base", default="http://localhost:3000", help="app origin to audit (default: http://localhost:3000)")
    # Conservative on purpose: this points at a real server, and 10,000 URLs at 4 in flight is
    # already a sustained load. Raise it only against a machine you own.
    parser.add_argument("--concurrency", type=int, default=3,
                        help="requests in flight; bounded by a thread pool, never one thread per URL (default: 3)")
    parser.add_argument("--delay", type=float, default=0.1,
                        help="seconds to pause before each request, so a large run is not a burst (default: 0.1)")
    parser.add_argument("--timeout", type=float, default=30.0, help="per-request timeout in seconds (default: 30)")
    parser.add_argument("--min-words", type=int, default=80, help="minimum rendered word count to pass (default: 80)")
    parser.add_argument("--recheck", action="store_true",
                        help="re-request every route, ignoring rows already in `seo` (default: resume, requesting only what is missing)")
    parser.add_argument("--batch-size", type=int, default=200,
                        help=f"routes loaded, checked and written per transaction (default: 200, max {MAX_BATCH})")
    parser.add_argument("--detail-limit", type=int, default=100,
                        help="URLs detailed in the failure/warning sections, and duplicate groups listed; all are counted in the summaries (default: 100)")
    parser.add_argument("--json-max", type=int, default=2000,
                        help="write migrated-URLS-SEO/seo-values.json only when the run is at or under this many rows (default: 2000)")
    parser.add_argument("--limit", type=int, default=0, help="check at most this many routes this run (default: all)")
    parser.add_argument("--db", default=None, help="database file to use (default: out/migration.sqlite)")
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
    already = 0 if args.recheck else conn.execute("SELECT COUNT(*) n FROM seo").fetchone()["n"]
    print(f"stage 6 · {len(slugs)} of {total_routes} routes to audit against {args.base}"
          + (f" ({already} already checked — resuming; --recheck to redo them)" if already else ""))

    try:
        if slugs:
            if not wait_for_server(args.base, timeout=3.0):
                raise SystemExit(
                    f"no server answering at {args.base} — run `npm run dev` in {paths.APP_ROOT} "
                    f"(port 3000) first; this stage does not start the server itself"
                )
            run_batches(
                conn, slugs,
                base=args.base, concurrency=args.concurrency, delay=args.delay, timeout=args.timeout,
                min_words=args.min_words, batch_size=batch_size,
            )

        generated_at = datetime.now(timezone.utc).isoformat()
        summary = summarise(conn)
        coverage = source_coverage(conn)
        dups = duplicates(conn, args.detail_limit)

        store.set_meta(conn, "stage6", {
            "runId": run_id,
            "base": args.base,
            "generatedAt": generated_at,
            "checked": summary["checked"],
            "failing": summary["failing"],
            "byCheck": summary["byCheck"],
            "sourceCoverage": coverage,
            "duplicateTitleGroups": dups["titleGroups"],
            "duplicateDescriptionGroups": dups["descriptionGroups"],
            "minWords": args.min_words,
            "concurrency": args.concurrency,
            "delay": args.delay,
        })
        write_report(conn, summary, coverage, dups, base=args.base, run_id=run_id,
                     generated_at=generated_at, min_words=args.min_words, detail_limit=args.detail_limit)
        wrote_json = write_json_summary(conn, summary, coverage, dups, base=args.base, run_id=run_id,
                                        generated_at=generated_at, json_max=args.json_max)

        for check in CHECKS:
            counts = summary["byCheck"][check]
            print(f"  {check:28} pass={counts['pass']:<3} warn={counts['warn']:<3} "
                  f"fail={counts['fail']:<3} n/a={counts['na']}")
        print(f"  → {DB_LABEL} (`seo`, {summary['checked']} rows)")
        print(f"  → {SEO_DIR.name}/seo-report.md")
        if wrote_json:
            print(f"  → {SEO_DIR.name}/seo-values.json")
        else:
            print(f"  → {SEO_DIR.name}/seo-values.json skipped: {summary['checked']} rows is over "
                  f"--json-max {args.json_max}; the database is the artifact")

        if summary["failing"]:
            raise SystemExit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
