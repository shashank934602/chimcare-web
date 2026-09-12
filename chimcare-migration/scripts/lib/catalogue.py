"""The service catalogue, read from the application's own seed file.

`data/seed/services.ts` is the single source of truth for what Chimcare sells: 8 categories and 92
services. This module parses it rather than restating it, because a hardcoded copy would drift the
moment the business adds or renames a service, and a page would then either advertise something that
does not exist or quietly stop listing something that does.

The file is TypeScript, but both exports are plain JSON array literals, so the value is sliced from
its opening `[` to the matching `\n];` and handed to `json.loads`. That is the whole parser — no
dependency, and it breaks loudly (see `_parse_array`) if the file ever stops being JSON-shaped.

Nothing here touches WordPress. It answers "what could exist"; `stage3_fetch_content.py` asks the
database which of those pages actually do.
"""

from __future__ import annotations

import json
from pathlib import Path

from lib import paths

# The seed the application itself reads. Relative to chimcare-web/, not to this pipeline.
SERVICES_TS = paths.APP_ROOT / "data" / "seed" / "services.ts"

# What the current file holds. These are assertions, not configuration: if a real change to the
# catalogue moves them, the number here moves with it in the same commit, deliberately.
EXPECTED_CATEGORIES = 8
EXPECTED_SERVICES = 92

# The keys every row must carry. A row missing one of these is a shape change, and a shape change
# that parsed anyway would silently shrink the directory on every migrated page.
CATEGORY_KEYS = ("key", "name", "sort")
SERVICE_KEYS = ("key", "name", "category", "sort")

# A slug is `{service key}-in-{city}-{state}`. Nothing in the catalogue may contain the separator,
# or the slug could not be split back apart unambiguously (a city such as `lake-in-the-hills` can,
# which is why the split is taken at the FIRST occurrence).
SLUG_JOINER = "-in-"


def _parse_array(source: str, export_name: str, path: Path):
    """Slice one `export const <name> = [ … \\n];` out of the .ts file and parse it as JSON."""
    marker = f"export const {export_name} = ["
    start = source.find(marker)
    if start < 0:
        raise SystemExit(f"{path}: no `{marker.strip()}` — the service catalogue's shape changed")
    open_bracket = start + len(marker) - 1
    end = source.find("\n];", open_bracket)
    if end < 0:
        raise SystemExit(f"{path}: `{export_name}` is not closed by a line `];` — cannot parse it as JSON")
    try:
        value = json.loads(source[open_bracket : end + 2])
    except json.JSONDecodeError as exc:
        raise SystemExit(f"{path}: `{export_name}` is no longer a plain JSON array literal ({exc})")
    if not isinstance(value, list) or not value:
        raise SystemExit(f"{path}: `{export_name}` parsed to something that is not a non-empty array")
    return value


def _require_keys(rows, required, export_name: str, path: Path) -> None:
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise SystemExit(f"{path}: `{export_name}`[{index}] is not an object")
        missing = [k for k in required if k not in row]
        if missing:
            raise SystemExit(f"{path}: `{export_name}`[{index}] is missing {missing} — the catalogue's shape changed")


def load_services(path: Path = SERVICES_TS):
    """The 92 services in catalogue order, each as `{key, categoryKey, name, sort}`.

    Order is the file's own (`category` sort, then `sort` within it), so every migrated page lists
    its services in the same sequence and two pages can be compared line by line.
    """
    if not path.exists():
        raise SystemExit(f"missing {path} — the service catalogue lives in the application, not in this pipeline")
    source = path.read_text(encoding="utf-8")

    categories = _parse_array(source, "serviceCategorySeed", path)
    services = _parse_array(source, "serviceSeed", path)
    _require_keys(categories, CATEGORY_KEYS, "serviceCategorySeed", path)
    _require_keys(services, SERVICE_KEYS, "serviceSeed", path)

    if len(categories) != EXPECTED_CATEGORIES or len(services) != EXPECTED_SERVICES:
        raise SystemExit(
            f"{path}: expected {EXPECTED_CATEGORIES} categories and {EXPECTED_SERVICES} services, "
            f"found {len(categories)} and {len(services)} — if the catalogue really changed, update "
            f"EXPECTED_* in scripts/lib/catalogue.py in the same commit"
        )

    known = {c["key"] for c in categories}
    orphans = sorted({s["category"] for s in services} - known)
    if orphans:
        raise SystemExit(f"{path}: services reference categories that do not exist: {orphans}")

    bad = sorted(s["key"] for s in services if SLUG_JOINER in s["key"])
    if bad:
        # `{service}-in-{city}-{state}` is split at the first `-in-`; a key containing it would make
        # every slug ambiguous, so this is fatal rather than a warning.
        raise SystemExit(f"{path}: service keys must not contain `{SLUG_JOINER}`: {bad}")

    duplicates = sorted({s["key"] for s in services if sum(1 for o in services if o["key"] == s["key"]) > 1})
    if duplicates:
        raise SystemExit(f"{path}: duplicate service keys: {duplicates}")

    order = {c["key"]: c["sort"] for c in categories}
    ordered = sorted(services, key=lambda s: (order[s["category"]], s["sort"], s["key"]))
    return [{"key": s["key"], "categoryKey": s["category"], "name": s["name"], "sort": s["sort"]} for s in ordered]


def split_slug(slug: str):
    """`{service}-in-{city}-{state}` → `(city, state)`, or None when the slug is not that shape.

    Split at the FIRST `-in-`: no service key contains it (enforced above) while a city name can.
    The state is the trailing two-letter segment; a slug that ends in anything else (WordPress's
    `…-ma-2` duplicates, for instance) names no city this lookup can trust, so it returns None
    instead of guessing.
    """
    head, sep, tail = slug.partition(SLUG_JOINER)
    if not sep or not head or "-" not in tail:
        return None
    city, _, state = tail.rpartition("-")
    if not city or len(state) != 2 or not state.isalpha():
        return None
    return city, state


def service_slug(service_key: str, city: str, state: str) -> str:
    """The slug WordPress would publish a service page at. Existence is checked elsewhere."""
    return f"{service_key}{SLUG_JOINER}{city}-{state}"
