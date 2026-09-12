#!/usr/bin/env python3
"""Pull the client reference's HERO LEDE out of `send-to-client/spokane.html`.

    python3 scripts/extract_reference_lede.py
    python3 scripts/extract_reference_lede.py --reference /path/to/other.html

WHY THIS EXISTS
The reference's hero is three lines: an eyebrow naming the place, an `<h1>` naming the service and
the place, and one `<p class="lede">` under it that says what Chimcare actually does there:

    "Experts in chimney sweep & chimney repairs in Spokane, WA — professional sweeping, inspection,
     repair and masonry, dust-free, honestly quoted and done by our own crew."

Until now the migrated page borrowed its OWN first body paragraph for that slot, which put a
paragraph written about one city's neighbourhoods where the design wants a one-line statement of
the offer — and then spent the introduction section on the page's second paragraph instead of its
first. The hero now shows the reference's line and the introduction shows the page's own first
paragraph, which is the order the reference itself reads in.

That line is brand copy: it claims only what Chimcare does, so it travels to every city. The only
part of it that does not travel is the place, so `Spokane` / `WA` are replaced by `{{city.name}}` /
`{{state.code}}` and the renderer fills them from the page's own city — exactly as
`extract_reference_areas.py` does for the service-area band. A page that resolves no place falls
back to its own first paragraph rather than rendering a half-filled sentence; that rule lives in the
renderer, which is where the place is known.

WHICH PARAGRAPH
The reference has two `<p class="lede">` elements — the hero's and the service-area band's — so
neither the class nor a text match alone identifies the right one. The hero's is taken positionally:
the first `p.lede` AFTER the page's single `<h1>`. That is a structural fact about the reference, not
a guess about its wording, so it keeps working if the copy is reworded.

Idempotent: `generatedAt` is the reference file's own mtime, not the clock, so a re-run over an
unchanged reference writes a byte-identical file.

Reads:  send-to-client/spokane.html (or --reference)
Writes: app/location/standard-lede.json
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

STANDARD_LEDE = paths.APP_ROOT / "app" / "location" / "standard-lede.json"

# The city the reference was written for. Kept as data so the substitutions below read as rules
# rather than as magic strings scattered through the file.
REFERENCE_CITY = "Spokane"
REFERENCE_STATE = "WA"

# Place names out, slots in. The order matters: the two-part "Spokane, WA" is handled by the city
# rule and then the state rule.
SUBSTITUTIONS = [
    (r"\b" + REFERENCE_CITY + r"\b", "{{city.name}}"),
    (r"\b" + REFERENCE_STATE + r"\b", "{{state.code}}"),
]

H1_RE = re.compile(r"<h1\b[^>]*>", re.I)
LEDE_RE = re.compile(r'<p\b[^>]*\bclass="[^"]*\blede\b[^"]*"[^>]*>(?P<body>.*?)</p>', re.I | re.S)

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


# ----------------------------------------------------------------------------- parsing

def text_of(fragment: str) -> str:
    """Markup to the words a reader sees: tags out, entities in, whitespace normalised."""
    return WS_RE.sub(" ", html_mod.unescape(TAG_RE.sub(" ", fragment))).strip()


def hero_lede(html: str) -> str:
    """The hero's own lede: the first `p.lede` after the reference's single `<h1>`.

    The reference carries a second `p.lede` further down, in the service-area band, so the search
    deliberately starts at the `<h1>` rather than at the top of the file. Two `<h1>`s would mean the
    reference is no longer the single-hero page this rule assumes, so that is an error, not a pick.
    """
    h1s = H1_RE.findall(html)
    if len(h1s) != 1:
        raise SystemExit(f"expected exactly one <h1> in the reference, found {len(h1s)}")
    m = LEDE_RE.search(html, H1_RE.search(html).end())
    if not m:
        raise SystemExit("no <p class=\"lede\"> after the reference's <h1>")
    lede = text_of(m.group("body"))
    if not lede:
        raise SystemExit("the hero's lede paragraph is empty")
    return lede


def slot(text: str) -> str:
    """Place names out, `{{slots}}` in."""
    for pattern, replacement in SUBSTITUTIONS:
        text = re.sub(pattern, replacement.replace("\\", "\\\\"), text)
    return text


# ----------------------------------------------------------------------------- main

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reference", type=Path, default=DEFAULT_REFERENCE, help="the client reference HTML page")
    args = parser.parse_args()

    if not args.reference.exists():
        raise SystemExit(f"missing reference {args.reference}")
    html = args.reference.read_text(encoding="utf-8", errors="replace")

    raw = hero_lede(html)
    lede = slot(raw)

    # A place name that reached the file would be a hardcoded Spokane on every page that rendered
    # it, which is the one failure this script exists to prevent.
    if REFERENCE_CITY in lede or re.search(r"\b" + REFERENCE_STATE + r"\b", lede):
        raise SystemExit("the reference place survived into the lede — refusing to write it")
    # A lede with no slot left would be the same sentence on every page, naming no city at all.
    if "{{city.name}}" not in lede or "{{state.code}}" not in lede:
        raise SystemExit(f"the lede lost one of its place slots — refusing to write it:\n  {lede}")

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
            "The reference's hero lede, taken as the first <p class=\"lede\"> after its single "
            "<h1> — the reference carries a second one in the service-area band. The place is "
            "replaced by slots the renderer fills from the page's own city."
        ),
        "lede": lede,
    }
    paths.write_json(STANDARD_LEDE, payload)

    print(f"wrote {STANDARD_LEDE}")
    print(f"  reference lede: {raw}")
    print(f"  slotted lede:   {lede}")


if __name__ == "__main__":
    main()
