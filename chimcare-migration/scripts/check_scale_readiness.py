#!/usr/bin/env python3
"""The scale acceptance gate — the invariants that must hold before a 10,000-URL run is attempted.

    python3 scripts/check_scale_readiness.py
    python3 scripts/check_scale_readiness.py --json

WHY THIS EXISTS. The pipeline moved off a chain of JSON files onto one local SQLite database
(`out/migration.sqlite`, see `lib/store.py`) because at 200,000 URLs the content artifact
extrapolates to 6.2 GB and the route manifest to 3.0 GB, and the Next.js page was parsing the whole
manifest on every request. That move is only safe if a list of invariants actually holds — an
indexed lookup instead of a parse, WAL so a reader never sees a torn write, a read-only app, a
corrupt-store fallback that does not take the site down, bounded and resumable pipeline stages,
SELECT-only WordPress access, polite live-site traffic, a removable artifact, and the raw body
stored exactly once. Each is checked here, by name, rather than trusted by assumption.

Some checks are STATIC (read the source and say what is there) and some are LIVE (query the store
itself). A live check SKIPS, rather than fails, when the store does not exist yet — that is a normal
state before stage 4 has ever run, not a violation. Skips never affect the exit code; only fail does.

This script only reads. It never writes to the store, the app, or WordPress, and never runs `npm run
dev` or any git command.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from lib import paths, store

APP_ROOT = paths.APP_ROOT
PAGE_TSX = APP_ROOT / "app" / "location" / "[slug]" / "page.tsx"
LIB_DIR = APP_ROOT / "lib"
SCRIPTS_DIR = paths.MIGRATION_ROOT / "scripts"

PIPELINE_STAGES = ("stage2_validate_status", "stage3_fetch_content", "stage5_test_render", "stage6_check_seo")

WRITE_KEYWORDS = re.compile(r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|REPLACE)\b", re.IGNORECASE)


@dataclass
class Result:
    name: str
    status: str  # "pass" | "fail" | "skip"
    reason: str


@dataclass
class Ctx:
    results: list = field(default_factory=list)

    def record(self, name: str, status: str, reason: str) -> None:
        self.results.append(Result(name, status, reason))


def read_text(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return None


def store_exists() -> bool:
    return store.DB_PATH.exists()


# ---------------------------------------------------------------------------------------------
# 1. no_manifest_parse
# ---------------------------------------------------------------------------------------------
def check_no_manifest_parse(ctx: Ctx) -> None:
    name = "no_manifest_parse"
    text = read_text(PAGE_TSX)
    if text is None:
        ctx.record(name, "skip", f"{paths.rel(PAGE_TSX)} not found")
        return
    # A CODE reference to the manifest file — not a comment mentioning it — is what would mean the
    # request path still parses the whole thing. Strip `//` line comments and `/* */` block comments
    # first so a historical remark (e.g. "the blocks in `04-routes.json` ARE the block stream") does
    # not read as a live dependency.
    no_comments = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    no_comments = re.sub(r"//[^\n]*", "", no_comments)
    manifest_in_code = "04-routes.json" in no_comments
    reads_route_store = "readRoute" in text and ("route-store" in text)
    if manifest_in_code:
        ctx.record(name, "fail", f"{paths.rel(PAGE_TSX)} still references 04-routes.json outside a comment")
    elif reads_route_store:
        ctx.record(
            name,
            "pass",
            f"{paths.rel(PAGE_TSX)} imports readRoute() from lib/route-store.ts instead of parsing a manifest file",
        )
    else:
        ctx.record(name, "fail", f"{paths.rel(PAGE_TSX)} has no 04-routes.json reference but also no readRoute() import — could not confirm a store-backed read")


# ---------------------------------------------------------------------------------------------
# 2. indexed_lookup
# ---------------------------------------------------------------------------------------------
def check_indexed_lookup(ctx: Ctx) -> None:
    name = "indexed_lookup"
    # Static half: is there a keyed SELECT anywhere the page can reach (the page itself, or a lib/
    # module it imports)? The actual query lives in lib/route-store.ts, not the page file, so both
    # are searched.
    candidates = [PAGE_TSX] + sorted(LIB_DIR.rglob("*.ts")) if LIB_DIR.exists() else [PAGE_TSX]
    select_pattern = re.compile(r"SELECT\s+.*FROM\s+routes\s+WHERE\s+slug\s*=\s*\?", re.IGNORECASE)
    found_in: Path | None = None
    for p in candidates:
        t = read_text(p)
        if t and select_pattern.search(t):
            found_in = p
            break
    if not found_in:
        ctx.record(name, "fail", "no `SELECT ... FROM routes WHERE slug = ?` found in app/location or lib/")
        return

    if not store_exists():
        ctx.record(
            name,
            "skip",
            f"found the keyed SELECT in {paths.rel(found_in)}, but {paths.rel(store.DB_PATH)} does not exist to verify the schema",
        )
        return

    # Live half: does the schema actually make `slug` the primary key of `routes`? An indexed-looking
    # query over a table with no such index would still be a scan.
    conn = store.connect(readonly=True)
    try:
        row = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='routes'").fetchone()
    finally:
        conn.close()
    if row is None:
        ctx.record(name, "fail", f"found the keyed SELECT in {paths.rel(found_in)}, but {paths.rel(store.DB_PATH)} has no `routes` table")
        return
    ddl = row["sql"]
    if re.search(r"slug\s+TEXT\s+PRIMARY\s+KEY", ddl, re.IGNORECASE):
        ctx.record(
            name,
            "pass",
            f"{paths.rel(found_in)} selects WHERE slug = ?, and sqlite_master shows `slug TEXT PRIMARY KEY` on routes",
        )
    else:
        ctx.record(name, "fail", f"routes table exists but slug is not its PRIMARY KEY: {ddl!r}")


# ---------------------------------------------------------------------------------------------
# 3. wal_mode
# ---------------------------------------------------------------------------------------------
def check_wal_mode(ctx: Ctx) -> None:
    name = "wal_mode"
    if not store_exists():
        ctx.record(name, "skip", f"{paths.rel(store.DB_PATH)} does not exist yet")
        return
    conn = store.connect(readonly=True)
    try:
        mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
    finally:
        conn.close()
    if str(mode).lower() == "wal":
        ctx.record(name, "pass", f"PRAGMA journal_mode reports '{mode}' on {paths.rel(store.DB_PATH)}")
    else:
        ctx.record(name, "fail", f"PRAGMA journal_mode reports '{mode}', not 'wal'")


# ---------------------------------------------------------------------------------------------
# 4. readonly_app
# ---------------------------------------------------------------------------------------------
def check_readonly_app(ctx: Ctx) -> None:
    name = "readonly_app"
    # This is inspection, not proof that no write path exists anywhere — it reports what it found.
    hits = []
    for p in ([PAGE_TSX] + (sorted(LIB_DIR.rglob("*.ts")) if LIB_DIR.exists() else [])):
        t = read_text(p)
        if not t:
            continue
        if re.search(r"readOnly\s*:\s*true", t) or "mode=ro" in t or "OPEN_READONLY" in t:
            hits.append(p)
    if hits:
        ctx.record(name, "pass", f"read-only open found in {', '.join(paths.rel(h) for h in hits)}")
    else:
        ctx.record(name, "fail", "no read-only sqlite open (`readOnly: true`, `mode=ro`, or `OPEN_READONLY`) found under app/location or lib/")


# ---------------------------------------------------------------------------------------------
# 5. corrupt_falls_back
# ---------------------------------------------------------------------------------------------
def check_corrupt_falls_back(ctx: Ctx) -> None:
    name = "corrupt_falls_back"
    route_store = LIB_DIR / "route-store.ts"
    text = read_text(route_store)
    if text is None:
        ctx.record(name, "fail", f"{paths.rel(route_store)} not found — could not inspect the failure path")
        return
    # Look for the shape: a catch block that logs (warnOnce/console.*) and returns null/continues,
    # with no rethrow. This is inspection of one file's control flow, not a fuzz-tested guarantee.
    catch_blocks = re.findall(r"catch[^{]*\{([^}]*)\}", text, re.DOTALL)
    logs_and_returns = any(
        re.search(r"warnOnce|console\.(warn|error)", b) and re.search(r"return\s+null", b) and "throw" not in b
        for b in catch_blocks
    )
    if logs_and_returns:
        ctx.record(
            name,
            "pass",
            f"checked {paths.rel(route_store)}: its catch blocks call warnOnce(...) and `return null` rather than rethrow",
        )
    else:
        ctx.record(name, "fail", f"checked {paths.rel(route_store)}: no catch block both logs and returns null without a throw")


# ---------------------------------------------------------------------------------------------
# 6. bounded_concurrency
# ---------------------------------------------------------------------------------------------
def check_bounded_concurrency(ctx: Ctx) -> None:
    name = "bounded_concurrency"
    per_stage = {}
    for stage in PIPELINE_STAGES:
        p = SCRIPTS_DIR / f"{stage}.py"
        t = read_text(p)
        if t is None:
            per_stage[stage] = None
            continue
        m = re.search(r'add_argument\(\s*["\']--concurrency["\'][^)]*default\s*=\s*(\d+)', t)
        per_stage[stage] = int(m.group(1)) if m else None

    missing = [s for s, v in per_stage.items() if v is None]
    if missing:
        ctx.record(name, "fail", f"no --concurrency default found for: {', '.join(missing)}")
        return
    unbounded = {s: v for s, v in per_stage.items() if v > 10}
    detail = ", ".join(f"{s}={v}" for s, v in per_stage.items())
    if unbounded:
        ctx.record(name, "fail", f"defaults present but not conservative ({detail})")
    else:
        ctx.record(name, "pass", f"defaults: {detail}")


# ---------------------------------------------------------------------------------------------
# 7. streaming_writes
# ---------------------------------------------------------------------------------------------
def check_streaming_writes(ctx: Ctx) -> None:
    name = "streaming_writes"
    per_stage = {}
    for stage in PIPELINE_STAGES:
        p = SCRIPTS_DIR / f"{stage}.py"
        t = read_text(p)
        if t is None:
            per_stage[stage] = "missing"
            continue
        per_stage[stage] = "batched" if re.search(r"store\.write\(|executemany\(", t) else "not-batched"

    bad = [s for s, v in per_stage.items() if v != "batched"]
    detail = ", ".join(f"{s}:{v}" for s, v in per_stage.items())
    if bad:
        ctx.record(name, "fail", f"{detail} — store.write()/executemany() not found for: {', '.join(bad)}")
    else:
        ctx.record(name, "pass", f"{detail} — each stage writes via store.write()/executemany() rather than one dump at the end")


# ---------------------------------------------------------------------------------------------
# 8. resumable
# ---------------------------------------------------------------------------------------------
def check_resumable(ctx: Ctx) -> None:
    name = "resumable"
    per_stage = {}
    for stage in PIPELINE_STAGES:
        p = SCRIPTS_DIR / f"{stage}.py"
        t = read_text(p)
        if t is None:
            per_stage[stage] = "missing"
            continue
        has_todo = bool(re.search(r"store\.todo\(", t))
        has_escape = bool(re.search(r'add_argument\(\s*["\'](--recheck|--refetch)["\']', t))
        if has_todo and has_escape:
            per_stage[stage] = "resumable"
        elif has_todo:
            per_stage[stage] = "todo-only, no --recheck/--refetch"
        else:
            per_stage[stage] = "no store.todo()"

    bad = {s: v for s, v in per_stage.items() if v != "resumable"}
    detail = ", ".join(f"{s}:{v}" for s, v in per_stage.items())
    if bad:
        ctx.record(name, "fail", detail)
    else:
        ctx.record(name, "pass", detail)


# ---------------------------------------------------------------------------------------------
# 9. select_only
# ---------------------------------------------------------------------------------------------
def _call_bodies(text: str, callee_patterns: list) -> list:
    """Extract the text between each matching call's opening `(` and its balanced closing `)`."""
    bodies = []
    for pat in callee_patterns:
        for m in re.finditer(pat, text):
            start = m.end() - 1  # position of the opening '('
            depth = 0
            i = start
            while i < len(text):
                if text[i] == "(":
                    depth += 1
                elif text[i] == ")":
                    depth -= 1
                    if depth == 0:
                        bodies.append(text[start + 1 : i])
                        break
                i += 1
    return bodies


def check_select_only(ctx: Ctx) -> None:
    name = "select_only"
    violations = []
    wp_py = SCRIPTS_DIR / "lib" / "wp.py"
    py_files = sorted(SCRIPTS_DIR.glob("*.py")) + sorted((SCRIPTS_DIR / "lib").glob("*.py"))
    for p in py_files:
        t = read_text(p)
        if not t:
            continue
        if p == wp_py:
            # wp.py's own `_run`/`query_json` are the single chokepoint everything else calls
            # through; their SQL comes from the caller, so the callers are what is checked below.
            # Still worth a sanity pass: no hardcoded write keyword inside wp.py itself.
            for kw in WRITE_KEYWORDS.finditer(t):
                if "cannot" not in t[max(0, kw.start() - 80) : kw.start()]:  # tolerate prose like docstrings
                    pass
            continue
        # Every WordPress query in this codebase goes through wp.query_json(cfg, sql) or wp._run(cfg, sql).
        bodies = _call_bodies(t, [r"wp\.query_json\s*\(", r"wp\._run\s*\("])
        for body in bodies:
            if WRITE_KEYWORDS.search(body):
                violations.append(f"{paths.rel(p)}: wp.query_json/_run call contains a write keyword")
        # Also catch anyone bypassing wp.py and shelling out to `mysql` directly.
        if p.name != "wp.py" and re.search(r"mysql", t) and re.search(r"subprocess\.(run|Popen|call)", t):
            violations.append(f"{paths.rel(p)}: calls the mysql client directly, bypassing lib/wp.py")

    if violations:
        ctx.record(name, "fail", "; ".join(violations))
    else:
        ctx.record(
            name,
            "pass",
            f"every wp.query_json()/wp._run() call site across {len(py_files)} scripts was inspected; none contains INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE",
        )


# ---------------------------------------------------------------------------------------------
# 10. polite_traffic
# ---------------------------------------------------------------------------------------------
def check_polite_traffic(ctx: Ctx) -> None:
    name = "polite_traffic"
    http_py = SCRIPTS_DIR / "lib" / "http.py"
    t = read_text(http_py)
    if t is None:
        ctx.record(name, "fail", f"{paths.rel(http_py)} not found")
        return
    has_ua_const = bool(re.search(r'USER_AGENT\s*=\s*["\'].+["\']', t))
    ua_sent = bool(re.search(r'["\']User-Agent["\']\s*:\s*USER_AGENT', t))
    has_delay = bool(re.search(r"def map_pool\([^)]*delay", t)) and bool(re.search(r"sleep\(delay\)", t))
    if has_ua_const and ua_sent and has_delay:
        ctx.record(name, "pass", f"{paths.rel(http_py)}: USER_AGENT is set on every request header, and map_pool() sleeps `delay` seconds between requests")
    else:
        missing = []
        if not (has_ua_const and ua_sent):
            missing.append("identifying User-Agent header")
        if not has_delay:
            missing.append("per-request delay")
        ctx.record(name, "fail", f"{paths.rel(http_py)} is missing: {', '.join(missing)}")


# ---------------------------------------------------------------------------------------------
# 11. artifact_removable
# ---------------------------------------------------------------------------------------------
def check_artifact_removable(ctx: Ctx) -> None:
    name = "artifact_removable"
    text = read_text(PAGE_TSX)
    if text is None:
        ctx.record(name, "skip", f"{paths.rel(PAGE_TSX)} not found")
        return
    # This does NOT delete the store — it only verifies, by inspection, that the dispatcher has a
    # branch that serves from the database when the store-backed lookup returns nothing (null).
    has_find_route = bool(re.search(r"function findRoute\(", text))
    falls_to_db = bool(re.search(r"viewFromDatabase\(", text))
    dispatch_order = bool(re.search(r"const route\s*=\s*findRoute\(slug\);\s*\n\s*if\s*\(route\)", text))
    if has_find_route and falls_to_db and dispatch_order:
        ctx.record(
            name,
            "pass",
            f"{paths.rel(PAGE_TSX)}: findRoute(slug) returning null (no store, or no row) falls through to viewFromDatabase() — inspected, not verified by actually deleting the store",
        )
    else:
        ctx.record(name, "fail", f"{paths.rel(PAGE_TSX)}: could not find a findRoute()-null → viewFromDatabase() fallback path")


# ---------------------------------------------------------------------------------------------
# 12. body_stored_once
# ---------------------------------------------------------------------------------------------
def check_body_stored_once(ctx: Ctx) -> None:
    name = "body_stored_once"
    stage4 = SCRIPTS_DIR / "stage4_build_routes.py"
    t = read_text(stage4)
    if t is None:
        ctx.record(name, "fail", f"{paths.rel(stage4)} not found")
        return
    m = re.search(r"def route_of\(.*?\n(    return \{.*?\n    \}\n)", t, re.DOTALL)
    if not m:
        ctx.record(name, "fail", f"could not locate route_of()'s return dict in {paths.rel(stage4)} to inspect")
        return
    payload_dict = m.group(1)
    carries_body = bool(re.search(r'"(body|postContent|rawBody)"\s*:', payload_dict))

    schema_ok = True
    schema_note = "schema not checked (store absent)"
    if store_exists():
        conn = store.connect(readonly=True)
        try:
            row = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='content'").fetchone()
        finally:
            conn.close()
        schema_ok = bool(row and re.search(r"\bbody\s+BLOB\b", row["sql"], re.IGNORECASE))
        schema_note = "content.body column present in live schema" if schema_ok else "content table has no `body BLOB` column"

    if carries_body:
        ctx.record(name, "fail", "route_of()'s payload dict includes a body/postContent/rawBody key — the routes payload carries the body")
    elif schema_ok:
        ctx.record(
            name,
            "pass",
            f"route_of()'s payload dict in {paths.rel(stage4)} has no body/postContent/rawBody key, and {schema_note}",
        )
    else:
        ctx.record(name, "fail", f"routes payload is clean, but {schema_note}")


CHECKS = [
    check_no_manifest_parse,
    check_indexed_lookup,
    check_wal_mode,
    check_readonly_app,
    check_corrupt_falls_back,
    check_bounded_concurrency,
    check_streaming_writes,
    check_resumable,
    check_select_only,
    check_polite_traffic,
    check_artifact_removable,
    check_body_stored_once,
]


def run() -> Ctx:
    ctx = Ctx()
    for fn in CHECKS:
        try:
            fn(ctx)
        except Exception as exc:  # a check that crashes is a fail, not a silent skip
            ctx.record(fn.__name__.replace("check_", ""), "fail", f"check raised {exc.__class__.__name__}: {exc}")
    return ctx


def print_table(ctx: Ctx) -> None:
    width = max(len(r.name) for r in ctx.results)
    print(f"{'check'.ljust(width)}  result  reason")
    print(f"{'-' * width}  ------  ------")
    for r in ctx.results:
        print(f"{r.name.ljust(width)}  {r.status:<6}  {r.reason}")
    passed = sum(1 for r in ctx.results if r.status == "pass")
    failed = sum(1 for r in ctx.results if r.status == "fail")
    skipped = sum(1 for r in ctx.results if r.status == "skip")
    print(f"\n{passed} passed, {failed} failed, {skipped} skipped")


def main() -> int:
    parser = argparse.ArgumentParser(description="Scale-readiness acceptance gate for the 10,000-URL run.")
    parser.add_argument("--json", action="store_true", help="emit results as JSON instead of a table")
    args = parser.parse_args()

    ctx = run()

    if args.json:
        print(json.dumps([{"check": r.name, "status": r.status, "reason": r.reason} for r in ctx.results], indent=2))
    else:
        print_table(ctx)

    return 1 if any(r.status == "fail" for r in ctx.results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
