#!/usr/bin/env python3
"""Pull the client reference's "Why {City} Homeowners Trust Chimcare" tiles out of
`send-to-client/spokane.html`.

    python3 scripts/extract_reference_trust.py
    python3 scripts/extract_reference_trust.py --reference /path/to/other.html

WHY THIS EXISTS
The band currently renders as a single flat WebP (`/reference/img-d7c295f9.webp`, 361x302) — a
picture of a 2x2 grid of tiles, i.e. a picture of text. Its content cannot be selected, translated,
or read by a screen reader beyond the one alt string carried on the `<img>`, and it goes soft on any
high-density display. It is being replaced with real markup (four tiles, each an icon plus a label),
and this script supplies the data for that markup: `app/location/standard-trust.json`.

WHERE THE LABELS COME FROM
The reference ships this grid as a picture, not as four separate elements, so there is no markup to
read the four labels from directly. But the image's own `alt` attribute carries all four,
comma-separated, in the order the tiles are laid out:

    "Local & trusted, dust-free cleaning, safety first, transparent pricing"

That is the only place in the reference the four labels exist as text, so it is parsed as the source
of truth and the fact is recorded in the output's `note` rather than left for a reader to wonder
about. Each piece is title-cased the way the reference visually presents it (e.g. "dust-free
cleaning" -> "Dust Free Cleaning") and slugged for `key`.

ICONS
The reference's SVG sprite is the only place icon ids exist, so each of the four is looked up there
by name (`id="i-<icon>"`) and the run fails loudly if one is missing — writing a `<use
href="#i-missing">` would silently render an invisible tile, which is worse than not shipping this
file at all.

Idempotent: `generatedAt` is the reference file's own mtime, not the clock, so a re-run over an
unchanged reference writes a byte-identical file.

Reads:  send-to-client/spokane.html (or --reference)
Writes: app/location/standard-trust.json
"""

from __future__ import annotations

import argparse
import html as html_mod
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from lib import paths

DEFAULT_REFERENCE = Path(
    "/Users/vss-2/Desktop/chimcare/chimcare-web-2-RECOVERED/send-to-client/spokane.html"
)

STANDARD_TRUST = paths.APP_ROOT / "app" / "location" / "standard-trust.json"

EXPECTED_TILES = 4

# The four tiles, in the reference's own order (the order the alt text lists them), each paired with
# the sprite icon the new markup will use in place of the flat image. The icon choice is a design
# decision made alongside this extraction, not something derivable from the reference — the mapping
# is recorded here, in code, rather than left implicit.
TILE_ICONS = {
    "local & trusted": "i-handshake",
    "dust-free cleaning": "i-sparkles",
    "safety first": "i-shield",
    "transparent pricing": "i-calc",
}

# Where the trust-band image sits in the reference: the section heading that precedes its <figure>.
TRUST_HEADING = "Homeowners Trust"

IMG_RE = re.compile(r"<img\b[^>]*?>", re.S)
ALT_RE = re.compile(r'\balt="(?P<alt>[^"]*)"')
SPRITE_ID_RE = re.compile(r'\bid="(?P<id>i-[a-z0-9-]+)"')


# ----------------------------------------------------------------------------- parsing

def trust_image_alt(html: str) -> str:
    """The alt text of the trust band's tile image — the only place its four labels exist as text."""
    heading_at = html.find(TRUST_HEADING)
    if heading_at < 0:
        raise SystemExit(f"no {TRUST_HEADING!r} section in the reference")
    m = IMG_RE.search(html, heading_at)
    if not m:
        raise SystemExit("no <img> after the trust heading")
    alt_m = ALT_RE.search(m.group(0))
    if not alt_m:
        raise SystemExit("the trust band's <img> has no alt attribute")
    return html_mod.unescape(alt_m.group("alt")).strip()


def title_case(label: str) -> str:
    """Title-case the way the reference visually presents these tiles: '&' kept as a word, no
    capitalising the letter right after a hyphen (the reference shows "Dust Free", not "Dust-Free")."""
    label = label.replace("-", " ")
    words = label.split()
    return " ".join(w if w == "&" else w.capitalize() for w in words)


def slug(label: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")


def parse_tiles(alt_text: str) -> list[dict]:
    parts = [p.strip() for p in alt_text.split(",")]
    parts = [p for p in parts if p]
    tiles = []
    for raw in parts:
        icon = TILE_ICONS.get(raw.lower())
        if icon is None:
            raise SystemExit(
                f"no icon mapping for reference tile {raw!r} — "
                f"known tiles are {sorted(TILE_ICONS)}"
            )
        label = title_case(raw)
        tiles.append({"key": slug(label), "label": label, "icon": icon})
    return tiles


def verify_icons(html: str, tiles: list[dict]) -> None:
    """Fail loudly rather than write a tile whose icon does not exist in the sprite."""
    sprite_ids = set(SPRITE_ID_RE.findall(html))
    missing = [t["icon"] for t in tiles if t["icon"] not in sprite_ids]
    if missing:
        raise SystemExit(f"icon id(s) not found in the reference's SVG sprite: {missing}")


# ----------------------------------------------------------------------------- main

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reference", type=Path, default=DEFAULT_REFERENCE, help="the client reference HTML page")
    args = parser.parse_args()

    if not args.reference.exists():
        raise SystemExit(f"missing reference {args.reference}")
    html = args.reference.read_text(encoding="utf-8", errors="replace")

    alt_text = trust_image_alt(html)
    tiles = parse_tiles(alt_text)
    if len(tiles) != EXPECTED_TILES:
        raise SystemExit(f"expected {EXPECTED_TILES} tiles in the trust image's alt text, found {len(tiles)}: {alt_text!r}")
    verify_icons(html, tiles)

    # The reference's own mtime, not the clock: a re-run over an unchanged reference has to write
    # the same bytes, or "regenerate and diff" stops being a usable check.
    generated_at = (
        datetime.fromtimestamp(args.reference.stat().st_mtime, tz=timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )
    payload = {
        "generatedAt": generated_at,
        "source": "send-to-client/spokane.html",
        "note": (
            "The reference ships this grid as a single flat image, not markup, so these four "
            "labels were parsed from that image's own alt text "
            f"({alt_text!r}) rather than hand-typed."
        ),
        "tiles": tiles,
    }
    paths.write_json(STANDARD_TRUST, payload)

    print(f"wrote {STANDARD_TRUST}")
    print(f"  tiles found:    {len(tiles)}")
    for t in tiles:
        print(f"    {t['key']:<22} {t['label']:<22} #{t['icon']}")
    print(f"  icons verified: {len(tiles)}/{len(tiles)} present in the reference's SVG sprite")


if __name__ == "__main__":
    main()
