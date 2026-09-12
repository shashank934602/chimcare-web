#!/usr/bin/env python3
"""Runs the PREPARE step and stages 1-6 in order, one command instead of eight.

    python3 scripts/run_pipeline.py --pattern 'chimney-sweep-%-wa' --limit 12 --run trial-1
    python3 scripts/run_pipeline.py --pattern 'chimney-sweep-%-wa' --limit 12 --run trial-1 --skip-render
    python3 scripts/run_pipeline.py --from 3 --to 4 --run trial-1
    python3 scripts/run_pipeline.py --pattern 'chimney-sweep-%-wa' --limit 12 --run trial-1 --start-server
    python3 scripts/run_pipeline.py --prepare-only

Each stage is still a script you can run on its own — this just calls them in order, as separate
processes, and stops at the first one that fails. Nothing here talks to WordPress or the app
directly; that stays each stage's job.

PREPARE runs before stage 1 by default (see --prepare-only / --skip-prepare below). It is not a
numbered stage: the seven extractors it runs depend on the client reference HTML and the WordPress
database, not on anything a run selects (pattern, limit, tag), and what they write is the shared
template the pages render into — not per-run data. Re-running it for every --from 3 re-run of a
selection that hasn't changed would just re-decode the same reference file and re-query the same
database rows for no reason, so by default it only runs when the run starts at stage 1 (a fresh
pipeline); use --skip-prepare or --prepare-only to override either way.

Runs: PREPARE (extract_reference_template, extract_reference_services, extract_reference_faqs,
      extract_reference_areas, extract_reference_trust, extract_reference_lede, extract_wp_rating),
      stage1_select_urls, stage2_validate_status, stage3_fetch_content, stage4_build_routes,
      stage5_test_render, stage6_check_seo
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from lib import paths
from lib.http import probe

SCRIPTS_DIR = Path(__file__).resolve().parent

MIN_STAGE = 1
MAX_STAGE = 6
# Stages that need the app answering requests, not just its build artifacts on disk.
SERVER_STAGES = (5, 6)
DEFAULT_BASE = "http://localhost:3000"

STAGE_NAMES = {
    1: "stage1_select_urls.py",
    2: "stage2_validate_status.py",
    3: "stage3_fetch_content.py",
    4: "stage4_build_routes.py",
    5: "stage5_test_render.py",
    6: "stage6_check_seo.py",
}

# migrated-URLS-SEO/ — stage 6's own output directory. Not part of lib/paths.py because no stage
# before it reads it; the plan names it by hand, exactly as URLS/ is named for stages 1-5.
SEO_DIR = paths.MIGRATION_ROOT / "migrated-URLS-SEO"
SEO_VALUES = SEO_DIR / "seo-values.json"
SEO_REPORT_MD = SEO_DIR / "seo-report.md"

STAGE_ARTIFACTS = {
    1: [paths.SELECTED, paths.URLS_MD],
    2: [paths.STATUS, paths.URLS_DIR / "url-status.md"],
    3: [paths.CONTENT, paths.CONTENT_MD],
    4: [paths.ROUTES],
    5: [paths.RENDER, paths.RENDER_MD],
    6: [SEO_VALUES, SEO_REPORT_MD],
}

# PREPARE — the seven extractors, in the order it makes sense to read them: the template and its
# decoded assets first (everything else is copy that renders inside that template), then the five
# reference-HTML content extractors, then the one that reads WordPress instead of the reference.
PREPARE_SCRIPTS = [
    "extract_reference_template.py",
    "extract_reference_services.py",
    "extract_reference_faqs.py",
    "extract_reference_areas.py",
    "extract_reference_trust.py",
    "extract_reference_lede.py",
    "extract_wp_rating.py",
]

# app/location/ — where every PREPARE script writes, in the Next.js app this pipeline feeds.
APP_LOCATION_DIR = paths.APP_ROOT / "app" / "location"
PREPARE_ARTIFACTS = [
    paths.APP_ROOT / "public" / "reference",
    APP_LOCATION_DIR / "template.css",
    APP_LOCATION_DIR / "template-assets.json",
    APP_LOCATION_DIR / "template-shape.json",
    APP_LOCATION_DIR / "standard-services.json",
    APP_LOCATION_DIR / "standard-faqs.json",
    APP_LOCATION_DIR / "standard-areas.json",
    APP_LOCATION_DIR / "standard-trust.json",
    APP_LOCATION_DIR / "standard-lede.json",
    APP_LOCATION_DIR / "standard-rating.json",
]


def build_command(stage: int, args: argparse.Namespace, *, orchestrator_owns_server: bool) -> list:
    """Only the flags each stage actually accepts."""
    script = str(SCRIPTS_DIR / STAGE_NAMES[stage])
    cmd = [sys.executable, script]

    if stage == 1:
        if args.pattern is not None:
            cmd += ["--pattern", args.pattern]
        if args.exclude_regexp is not None:
            # The `=` form on purpose: the value starts with a dash, and as its own argv entry
            # stage 1's argparse reads it as a flag and exits 2.
            cmd.append(f"--exclude-regexp={args.exclude_regexp}")
        if args.limit is not None:
            cmd += ["--limit", str(args.limit)]
        if args.run is not None:
            cmd += ["--run", args.run]
    elif stage == 2:
        pass  # reads whatever stage 1 selected; nothing to pass through
    elif stage == 3:
        if args.min_words is not None:
            cmd += ["--min-words", str(args.min_words)]
    elif stage == 4:
        if args.tag is not None:
            cmd += ["--tag", args.tag]
        if args.min_words is not None:
            cmd += ["--min-words", str(args.min_words)]
        cmd += ["--emit-shard", "--emit-sql"]
    elif stage == 5:
        if args.base is not None:
            cmd += ["--base", args.base]
        # When stage 6 is also in this run, the orchestrator starts and stops one shared server
        # around both stages instead of handing stage 5 --start-server — stage 5's own flag tears
        # the server down again in its own finally block before stage 6 ever gets a request in.
        if args.start_server and not orchestrator_owns_server:
            cmd += ["--start-server"]
    elif stage == 6:
        if args.base is not None:
            cmd += ["--base", args.base]
        if args.min_words is not None:
            cmd += ["--min-words", str(args.min_words)]

    return cmd


def wait_for_server(base: str, timeout: float) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        result = probe(base, timeout=3.0)
        if result.final_status is not None:
            return True
        time.sleep(1.0)
    return False


def run_prepare(args: argparse.Namespace) -> None:
    print("\n" + " PREPARE · seven extractors ".center(72, "="))
    for name in PREPARE_SCRIPTS:
        cmd = [sys.executable, str(SCRIPTS_DIR / name)]
        print("\n  $ " + " ".join(cmd))
        result = subprocess.run(cmd, cwd=str(paths.MIGRATION_ROOT))
        if result.returncode != 0:
            print(f"\npipeline stopped: PREPARE step {name} exited {result.returncode}")
            print(f"  re-run just this extractor:\n    {' '.join(cmd)}")
            raise SystemExit(result.returncode)


def human(seconds: float) -> str:
    """A duration a person reads at a glance rather than counting zeros in."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes, secs = divmod(int(seconds), 60)
    if minutes < 60:
        return f"{minutes}m {secs:02d}s"
    hours, minutes = divmod(minutes, 60)
    return f"{hours}h {minutes:02d}m"


def report_timings(timings: list, urls: int | None) -> None:
    """What each stage cost, and what that implies at 10k and 200k.

    Stages 2, 5 and 6 make one HTTP request per URL, so they scale linearly and the projection is
    honest. The database stages are indexed and should scale better than linearly, so their
    projections are an upper bound rather than a forecast — the printout says so, because a number in
    a table gets quoted later whether or not it was hedged in prose.
    """
    if not timings:
        return
    total = sum(t for _, t in timings)
    print("\n" + " timings ".center(72, "="))
    for stage, seconds in timings:
        share = f"{seconds / total:5.1%}" if total else "    -"
        print(f"  stage {stage}  {human(seconds):>10}  {share}")
    print(f"  {'total':>7}  {human(total):>10}")
    if urls:
        per = total / urls
        print(f"\n  {per:.2f}s per URL over {urls} URLs")
        for scale in (10_000, 200_000):
            print(f"  at {scale:,} URLs, if it scaled linearly: {human(per * scale)}")
        print("  (linear is right for stages 2, 5 and 6 — one request each — and pessimistic for the rest)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pattern", default=None, help="stage 1: SQL LIKE pattern for post_name")
    # Stage 1 takes a LIKE pattern, which cannot say "not". Family A and family B slugs both
    # contain `-in-`, and only a negated regular expression separates them, so the exclusion has
    # to reach stage 1 from here too — otherwise a run through the orchestrator quietly selects
    # a different set from the same command run by hand.
    parser.add_argument("--exclude-regexp", default=None,
                        help="passed to stage 1: drop slugs matching this MySQL REGEXP")
    parser.add_argument("--limit", type=int, default=None, help="stage 1: how many URLs to take")
    parser.add_argument("--run", default=None, help="stage 1: run id used in the reports")
    parser.add_argument("--min-words", type=int, default=None, help="stage 3, 4 and 6: word-count floor")
    parser.add_argument("--tag", default=None, help="stage 4: tag for the routed run and its source shard")
    parser.add_argument("--base", default=None, help="stage 5 and 6: app origin to test (default: http://localhost:3000)")
    parser.add_argument(
        "--start-server",
        action="store_true",
        help="launch `npm run dev` for stages 5 and 6; the orchestrator starts and stops it once and "
        "shares it across both when both are in the run, instead of each stage managing its own",
    )
    parser.add_argument("--skip-render", action="store_true", help="convenience for --to 4 (also skips stage 6, which needs the server too)")
    parser.add_argument(
        "--prepare-only", action="store_true", help="run only the PREPARE step (the seven extractors) and exit; no stages run"
    )
    parser.add_argument(
        "--skip-prepare",
        action="store_true",
        help="don't run PREPARE, even when the run starts at stage 1 (the default trigger for it)",
    )
    parser.add_argument("--from", dest="from_stage", type=int, default=MIN_STAGE, help=f"first stage to run (default: {MIN_STAGE})")
    parser.add_argument("--to", dest="to_stage", type=int, default=MAX_STAGE, help=f"last stage to run (default: {MAX_STAGE})")
    args = parser.parse_args()

    if args.prepare_only and args.skip_prepare:
        raise SystemExit("--prepare-only and --skip-prepare are contradictory")

    if args.skip_render:
        args.to_stage = min(args.to_stage, 4)

    if args.prepare_only:
        run_prepare(args)
        print("\n" + " PREPARE complete ".center(72, "="))
        for artifact in PREPARE_ARTIFACTS:
            marker = "✓" if artifact.exists() else "·"
            print(f"  {marker} {paths.rel(artifact)}")
        return

    if not MIN_STAGE <= args.from_stage <= MAX_STAGE or not MIN_STAGE <= args.to_stage <= MAX_STAGE or args.from_stage > args.to_stage:
        raise SystemExit(
            f"--from/--to must be between {MIN_STAGE} and {MAX_STAGE}, with --from <= --to "
            f"(got {args.from_stage}..{args.to_stage})"
        )

    # PREPARE's output is the template every run renders into, not a per-run artifact, so it only
    # runs by default when this invocation starts a pipeline from stage 1 — a partial re-run
    # (--from 3, say) has no reason to re-extract it. --skip-prepare / running with --from > 1
    # covers "don't", and --prepare-only above covers "only".
    do_prepare = (args.from_stage == MIN_STAGE) and not args.skip_prepare
    if do_prepare:
        run_prepare(args)

    stages = list(range(args.from_stage, args.to_stage + 1))
    print(f"\npipeline · stages {stages[0]}-{stages[-1]}")

    server_stages = [s for s in stages if s in SERVER_STAGES]
    # The orchestrator only takes over server lifecycle when stage 6 is actually in the run — stage
    # 5 alone already manages `npm run dev` start/wait/stop fine by itself via its own --start-server.
    orchestrator_owns_server = args.start_server and 6 in server_stages
    server = None

    try:
        if orchestrator_owns_server:
            base = args.base or DEFAULT_BASE
            print(f"  starting `npm run dev` in {paths.APP_ROOT} (shared by stages {', '.join(str(s) for s in server_stages)}) ...")
            server = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=str(paths.APP_ROOT),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            if not wait_for_server(base, timeout=60.0):
                raise SystemExit(f"`npm run dev` did not answer at {base} within 60s")
            print(f"  server is up at {base}")

        timings: list[tuple[int, float]] = []
        for stage in stages:
            cmd = build_command(stage, args, orchestrator_owns_server=orchestrator_owns_server)
            banner = f" stage {stage} · {STAGE_NAMES[stage]} "
            print("\n" + banner.center(72, "="))
            print("  $ " + " ".join(cmd))

            started = time.monotonic()
            result = subprocess.run(cmd, cwd=str(paths.MIGRATION_ROOT))
            elapsed = time.monotonic() - started
            timings.append((stage, elapsed))
            print(f"  stage {stage} took {human(elapsed)}")
            if result.returncode != 0:
                print(f"\npipeline stopped: stage {stage} exited {result.returncode}")
                print(f"  re-run just this stage:\n    {' '.join(cmd)}")
                report_timings(timings, args.limit)
                raise SystemExit(result.returncode)
    finally:
        if server is not None:
            print("  stopping dev server ...")
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=10)

    report_timings(timings, args.limit)
    print("\n" + " pipeline complete ".center(72, "="))
    if do_prepare:
        for artifact in PREPARE_ARTIFACTS:
            marker = "✓" if artifact.exists() else "·"
            print(f"  {marker} {paths.rel(artifact)}")
    for stage in stages:
        for artifact in STAGE_ARTIFACTS[stage]:
            marker = "✓" if artifact.exists() else "·"
            print(f"  {marker} {paths.rel(artifact)}")


if __name__ == "__main__":
    main()
