#!/usr/bin/env python3
"""Pull the Google rating badge's figure out of WordPress and write `standard-rating.json`.

    python3 scripts/extract_wp_rating.py
    python3 scripts/extract_wp_rating.py --host 127.0.0.1 --user root --db chimcare_local

SELECT only, through `lib/wp.py` — nothing here writes to WordPress.

WHERE THE NUMBER COMES FROM
The reference's hero shows "Rated 4.7 on Google" next to three award badges. That figure is not
per-location content: WordPress carries it as `wp_postmeta` rows named `local-business-<id>-rating`
and `local-business-<id>-review-count` (one Local Business widget, id 88926), repeated on every post
that widget appears on — currently 125 of them. It is one company-wide fact, not something the
33 job_listing posts outside that set have their own value for, so this script does not join it to
any one post: it reads the meta table directly and asserts there is exactly one distinct value
before writing anything.

FAIL LOUDLY ON DISAGREEMENT
If the database ever held MORE than one distinct (rating, review-count) pair, that would mean the
figure is per-location after all, and rendering one company-wide number on every location page would
then be wrong — a silent average or "just take the first row" would hide that mistake instead of
surfacing it. So a second distinct value is a hard SystemExit, not a warning.

Idempotent: the same database state always yields the same bytes (only `generatedAt` changes, and
only because the clock does — there is no reference file mtime to pin it to here).

Reads:  wp_postmeta (local-business-*-rating / local-business-*-review-count)
Writes: app/location/standard-rating.json
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from lib import paths, wp

STANDARD_RATING = paths.APP_ROOT / "app" / "location" / "standard-rating.json"

RATING_KEY_PATTERN = "local-business-%-rating"
REVIEW_COUNT_KEY_PATTERN = "local-business-%-review-count"


def distinct_values(cfg: wp.WpConfig, key_pattern: str) -> list[dict]:
    """Every distinct (meta_key, meta_value) pair matching the pattern, with how many posts carry
    it — read as JSON so one query answers both "what is the value" and "is it really singular"."""
    return wp.query_json(
        cfg,
        f"""SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
              'metaKey', meta_key, 'value', value, 'posts', n)), JSON_ARRAY()) FROM (
              SELECT meta_key, meta_value AS value, COUNT(*) n
              FROM wp_postmeta WHERE meta_key LIKE {wp.lit(key_pattern)}
              GROUP BY meta_key, meta_value) t""",
    )


def resolve_one(cfg: wp.WpConfig, key_pattern: str, label: str) -> tuple[str, int]:
    """The single value + post count for one meta-key family, or a loud failure if the database
    disagrees with itself about what that value is."""
    rows = distinct_values(cfg, key_pattern)
    if not rows:
        raise SystemExit(f"no `{key_pattern}` rows in wp_postmeta — nothing to extract for {label}")
    distinct = {r["value"] for r in rows}
    if len(distinct) > 1:
        detail = ", ".join(f"{r['value']!r} on {r['posts']} post(s)" for r in rows)
        raise SystemExit(
            f"expected exactly one distinct {label}, found {len(distinct)}: {detail} — "
            f"this would mean the figure is per-location, and rendering one company-wide value "
            f"on every page would then be wrong"
        )
    total_posts = sum(r["posts"] for r in rows)
    return rows[0]["value"], total_posts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    wp.add_db_args(parser)
    args = parser.parse_args()

    wp.assert_mysql()
    cfg = wp.config_from(args)

    rating_str, rating_posts = resolve_one(cfg, RATING_KEY_PATTERN, "rating value")
    count_str, count_posts = resolve_one(cfg, REVIEW_COUNT_KEY_PATTERN, "review count")

    if rating_posts != count_posts:
        raise SystemExit(
            f"rating carried on {rating_posts} post(s) but review count on {count_posts} — "
            f"these should be the same widget on the same posts"
        )

    try:
        rating_value = float(rating_str)
        review_count = int(count_str)
    except ValueError as exc:
        raise SystemExit(f"rating/review-count did not parse as numbers: {rating_str!r}, {count_str!r} ({exc})")

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": "wp_postmeta local-business-*-rating/review-count",
        "ratingValue": rating_value,
        "reviewCount": review_count,
        "distinctValues": 1,
        "postsCarryingIt": rating_posts,
        "scope": "company-wide",
    }
    paths.write_json(STANDARD_RATING, payload)

    print(f"wrote {paths.rel(STANDARD_RATING)}")
    print(f"  ratingValue:     {rating_value}")
    print(f"  reviewCount:     {review_count}")
    print(f"  distinctValues:  1 (both rating and review count agree across the database)")
    print(f"  postsCarryingIt: {rating_posts}")
    print(f"  scope:           company-wide")


if __name__ == "__main__":
    main()
