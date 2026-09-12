#!/usr/bin/env python3
"""Catalogue every URL pattern in the WordPress database, and write docs/URL-patterns.md.

    python3 scripts/list_url_patterns.py

SELECT only, and read at query time rather than from a stored list, so the catalogue cannot drift
from the database it describes.

A location slug is not one shape. Five families account for every published URL, and the split is
exhaustive — the family counts add up to the total, which is the only reason to trust them. The
important distinction is where the word ``in`` falls:

    air-duct-cleaning-in-acton-ca      service, then city, then state   (family A)
    air-duct-cleaning-airport-in-ca    service, then city, then state, but `in` sits before the
                                       state instead, so a naive split on the first `-in-` reads
                                       the city as part of the service name  (family B)

That second form is why the service list here is derived from family A alone. Splitting family B the
same way invents 3,813 one-off "services" that do not exist.

Writes: docs/URL-patterns.md
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from datetime import datetime, timezone

from lib import paths, wp
from lib.report import header, table, write

PUBLISHED = f"post_type={wp.lit(wp.POST_TYPE)} AND post_status='publish'"

# A two-letter tail is only a state when it is one. The remaining tails are words that happen to
# end in two letters, and counting them as states would invent a dozen territories.
STATES = {
    "ca": "California", "ma": "Massachusetts", "wa": "Washington", "or": "Oregon",
    "il": "Illinois", "mn": "Minnesota", "ct": "Connecticut", "oh": "Ohio",
    "co": "Colorado", "wi": "Wisconsin", "ga": "Georgia", "id": "Idaho",
    "ut": "Utah", "pa": "Pennsylvania", "in": "Indiana", "mi": "Michigan",
    "tn": "Tennessee", "az": "Arizona",
}

FULL_STATE_WORDS = "oregon|ohio|washington|california|massachusetts|illinois|minnesota|connecticut|colorado|wisconsin|georgia|idaho|utah"

# Each family is a name, a shape, a SQL predicate and a sentence about what it is.
FAMILIES = [
    ("A", "{service}-in-{city}-{st}",
     rf"post_name LIKE '%-in-%' AND post_name NOT REGEXP '-in-[a-z]{{2}}$'",
     "The modern form. Almost every published URL is one of these."),
    ("B", "{service}-{city}-in-{st}",
     rf"post_name REGEXP '-in-[a-z]{{2}}$'",
     "The same three parts with `in` before the state. Splitting on the first `-in-` misreads these."),
    ("C", "{service}-{city}-{st}",
     rf"post_name NOT LIKE '%-in-%' AND post_name REGEXP '-[a-z]{{2}}$'",
     "The oldest form, with no `in` at all. These are the earliest posts by ID."),
    ("D", "{service}-{city}-{statename}",
     rf"post_name NOT LIKE '%-in-%' AND post_name REGEXP '-({FULL_STATE_WORDS})$'",
     "The state spelled out instead of abbreviated."),
    ("E", "irregular",
     rf"post_name NOT LIKE '%-in-%' AND post_name NOT REGEXP '-[a-z]{{2}}$' AND post_name NOT REGEXP '-({FULL_STATE_WORDS})$'",
     "Marketing tails, city-first ordering and one-offs. No shared shape."),
]


def scalar(cfg, select_sql: str) -> int:
    """Run a complete SELECT that returns one number, wrapped so it comes back as JSON."""
    return int(wp.query_json(cfg, f"SELECT JSON_ARRAY(({select_sql}))")[0])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--min-services", type=int, default=10,
                        help="list service prefixes at or above this URL count (default: 10)")
    wp.add_db_args(parser)
    args = parser.parse_args()

    wp.assert_mysql()
    cfg = wp.config_from(args)
    total = scalar(cfg, f"SELECT COUNT(*) FROM wp_posts WHERE {PUBLISHED}")
    print(f"cataloguing {total} published URLs in {cfg.database} …")

    # --- families ------------------------------------------------------------------------------
    family_rows = []
    counted = 0
    for key, shape, predicate, note in FAMILIES:
        n = scalar(cfg, f"SELECT COUNT(*) FROM wp_posts WHERE {PUBLISHED} AND {predicate}")
        counted += n
        example = wp.query_json(
            cfg,
            f"""SELECT COALESCE(JSON_ARRAYAGG(post_name), JSON_ARRAY()) FROM
                (SELECT post_name FROM wp_posts WHERE {PUBLISHED} AND {predicate} ORDER BY ID LIMIT 1) t""",
        )
        family_rows.append([key, f"`{shape}`", f"{n:,}", f"{n / total:.1%}",
                            f"`{example[0]}`" if example else "—", note])

    # --- states --------------------------------------------------------------------------------
    state_raw = wp.query_json(
        cfg,
        f"""SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('s', s, 'n', n)), JSON_ARRAY()) FROM
            (SELECT RIGHT(post_name,2) s, COUNT(*) n FROM wp_posts
             WHERE {PUBLISHED} AND post_name REGEXP '-[a-z]{{2}}$'
             GROUP BY s ORDER BY n DESC) t""",
    )
    state_rows = [[r["s"], STATES[r["s"]], f'{r["n"]:,}', f"`%-{r['s']}`"] for r in state_raw if r["s"] in STATES]
    not_states = sum(r["n"] for r in state_raw if r["s"] not in STATES)

    # --- services, from family A only ----------------------------------------------------------
    service_raw = wp.query_json(
        cfg,
        f"""SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('s', s, 'n', n)), JSON_ARRAY()) FROM
            (SELECT SUBSTRING_INDEX(post_name,'-in-',1) s, COUNT(*) n FROM wp_posts
             WHERE {PUBLISHED} AND post_name LIKE '%-in-%' AND post_name NOT REGEXP '-in-[a-z]{{2}}$'
             GROUP BY s HAVING n >= {args.min_services} ORDER BY n DESC) t""",
    )
    distinct_services = scalar(
        cfg,
        f"""SELECT COUNT(*) FROM (SELECT 1 FROM wp_posts WHERE {PUBLISHED} AND post_name LIKE '%-in-%'
            AND post_name NOT REGEXP '-in-[a-z]{{2}}$' GROUP BY SUBSTRING_INDEX(post_name,'-in-',1)) t""",
    )
    listed = sum(r["n"] for r in service_raw)
    family_a = int(next(r[2] for r in family_rows if r[0] == "A").replace(",", ""))

    # --- write ---------------------------------------------------------------------------------
    doc = [
        header(
            "URL patterns",
            {
                "Source": f"WordPress `{cfg.database}`, `{wp.POST_TYPE}` where `post_status='publish'`",
                "Published URLs": f"{total:,}",
                "Families": f"{len(FAMILIES)}, accounting for {counted:,} URLs "
                            f"({'exhaustive' if counted == total else f'{total - counted:,} unaccounted'})",
                "Service names": f"{distinct_services:,} distinct, from family A",
                "Generated": datetime.now(timezone.utc).isoformat(),
                "Regenerate": "`python3 scripts/list_url_patterns.py`",
            },
        ),
        "Every URL lives under `/location/{slug}/`. The slug is what varies, and it varies in five",
        "shapes. The counts below add up to the total, which is the only reason to trust the split.",
        "",
        "## Families",
        "",
        table(["", "shape", "URLs", "share", "example", "what it is"], family_rows),
        "",
        "### Why families A and B have to be told apart",
        "",
        "```",
        "air-duct-cleaning-in-acton-ca      A   service=air-duct-cleaning   city=acton     state=ca",
        "air-duct-cleaning-airport-in-ca    B   service=air-duct-cleaning   city=airport   state=ca",
        "```",
        "",
        "Both contain `-in-`. Splitting on the first one reads family B's city as part of its service",
        f"name, which invents thousands of services that do not exist. The service list below is",
        "therefore derived from family A alone.",
        "",
        "## States",
        "",
        f"{len(state_rows)} states, taken from the two-letter tail.",
        "",
        table(["code", "state", "URLs", "stage 1 pattern"], state_rows),
        "",
        f"A further {not_states:,} URLs end in two letters that are not a state code — an ordinary word",
        "that happens to end that way. They are not counted as states here.",
        "",
        "## Services",
        "",
        f"{distinct_services:,} distinct service names appear in family A. The {len(service_raw)} listed below each",
        f"cover {args.min_services} URLs or more, and together account for {listed:,} of family A's {family_a:,} URLs",
        f"({listed / family_a:.1%}). The remainder are long-tail names used on a handful of pages each.",
        "",
        table(["service", "URLs", "stage 1 pattern"],
              [[f"`{r['s']}`", f'{r["n"]:,}', f"`{r['s']}-in-%`"] for r in service_raw]),
        "",
        "## Using a pattern",
        "",
        "Stage 1 takes any SQL `LIKE` pattern against the slug, so any row above can be pasted in:",
        "",
        "```bash",
        "python3 scripts/stage1_select_urls.py --pattern 'chimney-sweep-repair-in-%' --limit 25",
        "python3 scripts/stage1_select_urls.py --pattern '%-mn' --limit 25          # one state",
        "python3 scripts/stage1_select_urls.py --pattern 'chimney-inspection-in-%-ca' --limit 25",
        "```",
        "",
        "Combining a service and a state narrows to one cell of the grid, which is usually the right",
        "size for a trial run.",
        "",
    ]

    out = paths.MIGRATION_ROOT / "docs" / "URL-patterns.md"
    write(out, "\n".join(doc))
    print(f"  {len(FAMILIES)} families · {len(state_rows)} states · {len(service_raw)} services listed")
    print(f"  → {paths.rel(out)}")


if __name__ == "__main__":
    main()
