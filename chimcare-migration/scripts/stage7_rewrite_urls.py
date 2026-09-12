#!/usr/bin/env python3
"""Stage 7 — move every `{service}-in-{city}-{st}` page to `{service}-{city}-{st}`, with a 301 behind it.

    python3 scripts/stage7_rewrite_urls.py --dry-run
    python3 scripts/stage7_rewrite_urls.py
    python3 scripts/stage7_rewrite_urls.py --revert

WHAT THIS IS, AND WHAT IT IS NOT. This is a LOCAL experiment against the `routes` table that stage 4
built in `out/migration.sqlite`. It does not touch chimcare.com, it probes nothing, and it writes no
rule any edge or server outside this repository will ever read. The only thing that honours these
redirects is the application's own dispatcher (`app/location/[slug]/page.tsx`), which reads this
file read-only. Nothing here is a production cutover, and `--revert` puts the store back.

THE RULE. A slug of the shape `{service}-in-{city}-{st}` becomes `{service}-{city}-{st}`: the FIRST
`-in-` is replaced by a single `-`. The first occurrence is the right one for the same reason stage 3
splits there — no service key in the catalogue contains `-in-`, so the first `-in-` is always the one
the URL template put between the service and the city, and anything later belongs to the place name.

WHAT MOVES, AND WHAT DOES NOT. A new `routes` row is inserted under the target slug carrying stage
4's payload unchanged, so the new URL renders byte-for-byte what the old one did. Two fields are
updated, and only two: `url` and `trialPath`, which are the page's own address — leaving them
pointing at the old path would make the new page canonicalise to a URL that is about to 301.

The payload's `slug` is deliberately NOT rewritten. The application derives the page's city and state
from it (`parsePlace` in the dispatcher reads `-in-(city)-(st)`), so a slug without `-in-` resolves no
place, and the page would silently lose its service directory, its breadcrumb state name and its geo
metadata. The row's KEY is the new slug — that is what the URL resolves by; the payload's `slug`
stays what it has always been, the identity of the WordPress page this row came from.

The payload also gains `rewrittenFrom`, which records the old slug, url and trialPath. Nothing
renders it; it exists so `--revert` can restore the original row exactly rather than guess at it. An
experiment that cannot be undone byte-for-byte is not an experiment.

THE OLD ROW IS DELETED. The dispatcher looks a slug up in `redirects` BEFORE it looks in `routes`, so
it answers the 301 without the old route row existing at all — and deleting it is the only way to
guarantee the requirement that an old URL must never serve content. Left in place it would be a
second, live copy of the same page, one dispatcher edit away from being served again and indexed as
a duplicate. The row is not lost: it is carried inside the new row's payload, which is what `--revert`
reads.

COLLISIONS ARE SKIPPED, NEVER OVERWRITTEN. Two of them can happen, and both mean some other page
already owns the target URL:

    taken       the target slug already exists in `routes` — a different page is there.
    ambiguous   two different source slugs rewrite to the same target, so at most one could win.

In both cases the rewrite does not happen: the source keeps its own URL, its own content and no
redirect, and the conflict is recorded with a reason in the `rewrite` meta summary. Silently taking
over a page's URL is the one outcome here that would actually destroy rankings, so every insert is
additionally written `ON CONFLICT DO NOTHING` — the collision check decides, and the database
refuses to overwrite even if that check were ever wrong.

Reads:  out/migration.sqlite — `routes` (stage 4)
Writes: out/migration.sqlite — `routes` (new rows in, old rows out) and `redirects`
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from datetime import datetime, timezone

from lib import paths, store

# The URL the dispatcher serves everything under. Stage 4 uses the same prefix; it is repeated rather
# than imported because stage 4 takes it as a flag and this stage must rewrite whatever is on the row.
BASE_PATH = "/location"

# `{service}-in-{city}-{st}`. Non-greedy on the service so `-in-` binds to the FIRST occurrence, and
# the two-letter tail is required: a slug that does not end in a state code is not this shape, and
# guessing at it would move a URL the pattern was never about.
#
# The optional `-2` / `-3` tail is WordPress's own duplicate-slug suffix, and 36 of this run's 1,000
# rows carry one. It is part of the URL's identity, not part of the state code, so it is matched and
# then carried through to the target UNCHANGED: `chimney-caps-in-cambridge-ma-2` becomes
# `chimney-caps-cambridge-ma-2`, which is a different page from `chimney-caps-cambridge-ma` and must
# stay one. Stripping the suffix would merge two distinct WordPress pages onto one URL — the exact
# overwrite this stage exists to refuse.
SOURCE_RE = re.compile(r"^(?P<service>.+?)-in-(?P<place>.+-[a-z]{2}(?:-\d+)?)$")

ROUTES_INSERT = """
INSERT INTO routes(slug, url, payload, rendered_blocks, archived_words, service_count, built_at)
VALUES(?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(slug) DO NOTHING
"""

REDIRECTS_INSERT = """
INSERT INTO redirects(from_slug, to_slug, status, reason, created_at)
VALUES(?, ?, ?, ?, ?)
ON CONFLICT(from_slug) DO NOTHING
"""

ROUTES_DELETE = "DELETE FROM routes WHERE slug = ?"
REDIRECTS_DELETE = "DELETE FROM redirects WHERE from_slug = ?"

# Ordered by slug so a run is reproducible and a re-run reports the same conflicts in the same order.
ROUTES_CURSOR = """
SELECT slug, url, payload, rendered_blocks, archived_words, service_count, built_at
FROM routes ORDER BY slug
"""


def target_of(slug: str) -> str | None:
    """`{service}-in-{city}-{st}` → `{service}-{city}-{st}`, or None when the slug is not that shape.

    The first `-in-` becomes a single `-`; it is not simply removed, because the hyphen it sits
    between is the separator the rest of the slug is built from.
    """
    m = SOURCE_RE.match(slug)
    return f"{m.group('service')}-{m.group('place')}" if m else None


def path_of(slug: str) -> str:
    return f"{BASE_PATH}/{slug}/"


def plan(conn) -> dict:
    """Decide every rewrite before writing a single row.

    The plan is built in full first because the ambiguous-collision test is a property of the whole
    set — two sources landing on one target — and cannot be answered while streaming one row at a
    time. At 200,000 URLs this holds slugs, not payloads: the payload is re-read per row at write
    time, straight off the cursor.
    """
    taken = {r["slug"] for r in conn.execute("SELECT slug FROM routes")}
    already = {r["from_slug"]: r["to_slug"] for r in conn.execute("SELECT from_slug, to_slug FROM redirects")}

    wanted: dict[str, list[str]] = {}   # target → the sources that want it
    matched: list[tuple[str, str]] = []  # (source, target), in slug order
    for row in conn.execute("SELECT slug FROM routes ORDER BY slug"):
        slug = row["slug"]
        if slug in already:
            continue  # already rewritten by an earlier run; its redirect is the record of that
        target = target_of(slug)
        if target is None or target == slug:
            continue
        matched.append((slug, target))
        wanted.setdefault(target, []).append(slug)

    moves: list[tuple[str, str]] = []
    conflicts: list[dict] = []
    for source, target in matched:
        if len(wanted[target]) > 1:
            # Two source URLs, one target. Neither may have it: picking one would delete the other's
            # page, and picking by sort order would make that choice arbitrary as well as destructive.
            others = [s for s in wanted[target] if s != source]
            conflicts.append({
                "kind": "ambiguous",
                "from": source,
                "target": target,
                "reason": f"{len(wanted[target])} slugs rewrite to `{target}` ({', '.join(others)}) — none may take it",
            })
            continue
        if target in taken:
            # A different page already lives at the target URL. It keeps it.
            conflicts.append({
                "kind": "taken",
                "from": source,
                "target": target,
                "reason": f"`{target}` already exists in `routes` — that page keeps its URL",
            })
            continue
        moves.append((source, target))
    return {"moves": moves, "conflicts": conflicts, "matched": len(matched), "routes": len(taken),
            "already": len(already)}


def new_rows(conn, moves: dict[str, str], state: dict):
    """The new `routes` rows, one at a time straight off the cursor — the payload is never held twice."""
    for row in conn.execute(ROUTES_CURSOR):
        target = moves.get(row["slug"])
        if target is None:
            continue
        payload = store.unpack(row["payload"])
        payload["rewrittenFrom"] = {"slug": row["slug"], "url": payload.get("url"),
                                    "trialPath": payload.get("trialPath")}
        # The page's own address, and nothing else about the page.
        payload["url"] = path_of(target)
        payload["trialPath"] = f"{BASE_PATH}/{target}"
        state["rewritten"] += 1
        yield (target, path_of(target), store.pack(payload), row["rendered_blocks"],
               row["archived_words"], row["service_count"], row["built_at"])


def restore_rows(conn, state: dict):
    """The original `routes` rows, rebuilt from the rewritten ones. See `rewrittenFrom` in the header."""
    cursor = conn.execute(
        "SELECT r.from_slug, t.payload, t.rendered_blocks, t.archived_words, t.service_count, t.built_at "
        "FROM redirects r JOIN routes t ON t.slug = r.to_slug ORDER BY r.from_slug"
    )
    for row in cursor:
        payload = store.unpack(row["payload"])
        origin = payload.pop("rewrittenFrom", None)
        if not isinstance(origin, dict) or origin.get("slug") != row["from_slug"]:
            # Not a row this stage created — something else owns that slug now. Leave it alone and
            # restore nothing for it, rather than inventing a route row from a payload we did not write.
            state["unrestorable"].append(row["from_slug"])
            continue
        payload["url"] = origin.get("url") or path_of(row["from_slug"])
        payload["trialPath"] = origin.get("trialPath") or f"{BASE_PATH}/{row['from_slug']}"
        state["restored"] += 1
        yield (row["from_slug"], payload["url"], store.pack(payload), row["rendered_blocks"],
               row["archived_words"], row["service_count"], row["built_at"])


def revert(conn, args) -> None:
    """Undo the rewrite: put the original rows back, drop the rewritten rows and the redirects."""
    pairs = [(r["from_slug"], r["to_slug"]) for r in conn.execute("SELECT from_slug, to_slug FROM redirects")]
    if not pairs:
        print("stage 7 · nothing to revert — `redirects` is empty")
        return
    state = {"restored": 0, "unrestorable": []}
    if args.dry_run:
        print(f"stage 7 · --revert --dry-run · would restore {len(pairs)} routes and drop {len(pairs)} redirects")
        return
    # Order matters: the original rows go back FIRST, so no URL is ever without a row to answer it,
    # and the redirects are dropped LAST, so nothing points at a route that has already gone.
    store.write(conn, ROUTES_INSERT, restore_rows(conn, state), chunk=args.batch_size)
    restored = {f for f, _ in pairs} - set(state["unrestorable"])
    store.write(conn, ROUTES_DELETE, [(t,) for f, t in pairs if f in restored], chunk=args.batch_size)
    store.write(conn, REDIRECTS_DELETE, [(f,) for f in restored], chunk=args.batch_size)
    store.set_meta(conn, "rewrite", {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "reverted": True, "restored": state["restored"],
        "unrestorable": state["unrestorable"][:50],
        "rewritten": 0, "redirects": 0,
    })
    print(f"  restored: {state['restored']} · redirects dropped: {len(restored)}")
    for slug in state["unrestorable"][:20]:
        print(f"    kept {slug} — the target row was not written by this stage")
    print(f"  `routes`: {count(conn, 'routes')} · `redirects`: {count(conn, 'redirects')}")


def count(conn, table: str) -> int:
    return conn.execute(f"SELECT COUNT(*) n FROM {table}").fetchone()["n"]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="report what would change and write nothing")
    parser.add_argument("--revert", action="store_true", help="undo a previous run: restore the original rows, drop the redirects")
    parser.add_argument("--batch-size", type=int, default=1000, help="rows per executemany chunk (default: 1000)")
    args = parser.parse_args()

    conn = store.connect()
    if args.revert:
        revert(conn, args)
        return

    total = count(conn, "routes")
    if total == 0:
        raise SystemExit("no rows in `routes` — run `python3 scripts/stage4_build_routes.py` first")

    p = plan(conn)
    moves = dict(p["moves"])
    taken = [c for c in p["conflicts"] if c["kind"] == "taken"]
    ambiguous = [c for c in p["conflicts"] if c["kind"] == "ambiguous"]
    print(f"stage 7 · {total} route rows · {p['matched']} match {{service}}-in-{{city}}-{{st}}"
          + (f" · {p['already']} already rewritten" if p["already"] else ""))
    print(f"  rewrite: {len(moves)} · skipped: {len(taken)} target taken, {len(ambiguous)} ambiguous")

    for c in p["conflicts"][:50]:
        print(f"    skip {c['from']} → {c['target']} — {c['reason']}")
    if len(p["conflicts"]) > 50:
        print(f"    … and {len(p['conflicts']) - 50} more")

    if args.dry_run:
        for source, target in p["moves"][:10]:
            print(f"    would move {path_of(source)} → {path_of(target)} (301)")
        if len(moves) > 10:
            print(f"    … and {len(moves) - 10} more")
        print(f"  --dry-run: nothing written · `routes` stays {total}, `redirects` stays {count(conn, 'redirects')}")
        return

    created_at = datetime.now(timezone.utc).isoformat()
    state = {"rewritten": 0}
    # Three transactions, in this order on purpose. The new rows land first, so the new URL is live
    # before anything points at it; the redirects land second; the old rows are removed last, so no
    # URL on this site is ever without an answer, not even for the width of one transaction.
    written = store.write(conn, ROUTES_INSERT, new_rows(conn, moves, state), chunk=args.batch_size)
    redirected = store.write(
        conn, REDIRECTS_INSERT,
        ((s, t, 301, "stage7: {service}-in-{city}-{st} → {service}-{city}-{st}", created_at) for s, t in p["moves"]),
        chunk=args.batch_size,
    )
    removed = store.write(conn, ROUTES_DELETE, [(s,) for s in moves], chunk=args.batch_size)

    summary = {
        "generatedAt": created_at,
        "reverted": False,
        "basePath": BASE_PATH,
        "routesIn": total,
        "matched": p["matched"],
        "rewritten": written,
        "oldRowsDeleted": removed,
        "redirects": redirected,
        "collisionsTaken": len(taken),
        "collisionsAmbiguous": len(ambiguous),
        # Capped: the counts above are complete, and the meta table is not a report file.
        "conflicts": p["conflicts"][:200],
    }
    store.set_meta(conn, "rewrite", summary)

    print(f"  rewritten: {written} · redirect rows: {redirected} · old rows deleted: {removed}")
    print(f"  `routes`: {count(conn, 'routes')} · `redirects`: {count(conn, 'redirects')}")
    print(f"  → {paths.rel(store.DB_PATH)} · the dispatcher answers the 301 from `redirects`, before `routes`")
    print("  reversible: python3 scripts/stage7_rewrite_urls.py --revert")


if __name__ == "__main__":
    main()
