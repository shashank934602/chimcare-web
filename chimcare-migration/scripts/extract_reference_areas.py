#!/usr/bin/env python3
"""Pull the client reference's SERVICE AREA copy out of `send-to-client/spokane.html`.

    python3 scripts/extract_reference_areas.py
    python3 scripts/extract_reference_areas.py --reference /path/to/other.html

WHY THIS EXISTS
The reference page carries a "Service area" band between the service directory and the process
steps: an eyebrow, "Your Spokane Fireplace Experts" with a paragraph of copy, then a photograph,
"Serving Nearby Areas", a line naming the city, a list of neighbourhood chips and a "Get a Quote"
button. Everything in it except the chips is BRAND boilerplate — it says what Chimcare does, not
what Spokane is like — so it belongs on every city page with the city substituted, exactly as the
eight service rows and the seven FAQ entries already do. This script lifts that copy ONCE, to
`app/location/standard-areas.json`, so the renderer reads data rather than re-parsing 2.4 MB of
HTML on every request.

WHY THE CHIPS ARE NOT CARRIED
Five of the reference's six chips are real neighbourhoods of the reference city; the sixth names no
place at all. There is no rule that turns a neighbourhood of one city into a neighbourhood of
another, so substituting the city name into them would be inventing place names. NO chip reaches
this file, and none is quoted in this script either — one of them has already had to be scrubbed
out of this project once, and a "dropped" list is still a copy. Only the count and the reason are
recorded, in `droppedAreaItems`, so the decision stays auditable rather than looking like an
oversight. The renderer takes its chips from the page's OWN migrated "areas we serve" list, which
is real WordPress copy about that real city, and renders the section without chips where the page
has no such list.

WHY A SENTENCE IS DROPPED
    "From historic homes to modern builds, our certified team ensures warmth, safety, and
     reliability - season after season."
That is a claim about the CITY - what its housing stock is, and that it has a season-after-season
heating cycle. This migration includes Arizona and Georgia pages, where neither is a fact, and no
substitution fixes it. The sentence is dropped whole rather than reworded, because rewording it
would be writing copy the client never approved, and the drop is recorded in `droppedSentences`.

The surviving sentence claims nothing about the place: "in the heart of {City} or in nearby
neighborhoods" names no neighbourhood and asserts nothing about any of them.

SLOTS
Where the reference names the place, the place name is replaced by `{{city.name}}` /
`{{state.code}}` and the renderer fills it from the page's own city. Every other word carries over
verbatim.

Idempotent: `generatedAt` is the reference file's own mtime, not the clock, so a re-run over an
unchanged reference writes a byte-identical file.

Reads:  send-to-client/spokane.html (or --reference)
Writes: app/location/standard-areas.json
"""

from __future__ import annotations

import argparse
import html as html_mod
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from lib import paths

DEFAULT_REFERENCE = Path(
    "/Users/vss-2/Desktop/chimcare/chimcare-web-2-RECOVERED/send-to-client/spokane.html"
)

STANDARD_AREAS = paths.APP_ROOT / "app" / "location" / "standard-areas.json"

# The city the reference was written for. Kept as data so the substitutions below read as rules
# rather than as magic strings scattered through the file.
REFERENCE_CITY = "Spokane"
REFERENCE_STATE = "WA"

# Dropped whole, never reworded. Matched literally against the reference's own words; the dash is
# matched loosely because the reference writes it as an em dash and a copy of this file may not.
DROP_SENTENCES = [
    (
        "From historic homes to modern builds, our certified team ensures warmth, safety, and "
        "reliability — season after season.",
        "claim about the city rather than about Chimcare — it asserts what the local housing "
        "stock is and that there is a season-after-season heating cycle; neither is a fact for the "
        "Arizona and Georgia cities in this run, and substituting the city name would not make it one",
    ),
]

# Place names replaced by a slot the renderer fills from the page's own city and state. Every
# sentence that survives the drop pass claims only what Chimcare serves, so it travels. The order
# matters: the two-part "Spokane, WA" is handled by the city rule and then the state rule.
SUBSTITUTIONS = [
    (r"\b" + REFERENCE_CITY + r"\b", "{{city.name}}", "the reference city"),
    (r"\b" + REFERENCE_STATE + r"\b", "{{state.code}}", "the reference state code"),
]

# Why the chips never reach the JSON — and why their words are not repeated here either. The count
# is the whole audit trail this file needs: the chips themselves are in the reference, which is the
# archive, and every other copy of a neighbourhood name is one more to scrub later.
CHIP_DROP_REASON = (
    "the reference's own area chips are neighbourhoods of the reference city (and one generic "
    "entry that names no place); a neighbourhood of one city is not a neighbourhood of another, so "
    "none is carried and none is quoted here. The renderer uses the page's own migrated 'areas we "
    "serve' list instead, and renders no chips at all where the page has none."
)


# ----------------------------------------------------------------------------- parsing

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def text_of(fragment: str) -> str:
    """Markup to the words a reader sees: tags out, entities in, whitespace normalised."""
    return WS_RE.sub(" ", html_mod.unescape(TAG_RE.sub(" ", fragment))).strip()


def areas_block(html: str) -> str:
    """The `div.section.areas` band, from its opening tag to the section after it.

    Sliced rather than parsed as a document because the reference is 2.4 MB of inlined base64 and
    every byte of it outside this band is someone else's section.
    """
    start = html.find('class="section areas"')
    if start < 0:
        raise SystemExit("no `section areas` band in the reference")
    end = html.find("<!-- PROCESS", start)
    if end < 0:
        raise SystemExit("no PROCESS section after the areas band — cannot bound the slice")
    return html[start:end]


EYEBROW_RE = re.compile(r'<p class="eyebrow">(?P<t>.*?)</p>', re.S)
H2_RE = re.compile(r"<h2[^>]*>(?P<t>.*?)</h2>", re.S)
LEDE_RE = re.compile(r'<p class="lede">(?P<t>.*?)</p>', re.S)
H3_RE = re.compile(r"<h3[^>]*>(?P<t>.*?)</h3>", re.S)
SUBLEDE_RE = re.compile(r"</h3>\s*<p[^>]*>(?P<t>.*?)</p>", re.S)
CHIP_RE = re.compile(r"<li[^>]*>(?P<t>.*?)</li>", re.S)
CTA_RE = re.compile(r'<a class="btn btn-primary"[^>]*>(?P<t>.*?)</a>', re.S)


def parse_block(block: str) -> dict:
    """The band's six pieces of copy and its chips, each proved present before anything is written."""
    fields = {
        "eyebrow": EYEBROW_RE,
        "heading": H2_RE,
        "lede": LEDE_RE,
        "subHeading": H3_RE,
        "subLede": SUBLEDE_RE,
        "cta": CTA_RE,
    }
    out = {}
    for name, pattern in fields.items():
        match = pattern.search(block)
        if not match:
            raise SystemExit(f"the reference's areas band has no {name} — refusing to write a half file")
        out[name] = text_of(match.group("t"))
        if not out[name]:
            raise SystemExit(f"the reference's areas band has an empty {name}")
    out["chips"] = [text_of(m.group("t")) for m in CHIP_RE.finditer(block)]
    if not out["chips"]:
        raise SystemExit("the reference's areas band lists no chips — the file this script was written against has changed")
    return out


# ----------------------------------------------------------------------------- editing

def drop_sentences(copy: dict) -> list[dict]:
    """Remove the band's city-claim sentence and record the removal with its reason."""
    dropped = []
    for sentence, reason in DROP_SENTENCES:
        target = next((k for k in ("lede", "subLede") if sentence in copy[k]), None)
        if target is None:
            raise SystemExit(
                "the sentence to drop is not in the reference any more — refusing to write a "
                f"half-edited file:\n  {sentence}"
            )
        copy[target] = WS_RE.sub(" ", copy[target].replace(sentence, "")).strip()
        dropped.append({"text": sentence, "reason": reason})
    return dropped


def slot(text: str) -> str:
    """Place names out, `{{slots}}` in — applied only to copy that survived the drop pass."""
    for pattern, replacement, _reason in SUBSTITUTIONS:
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

    copy = parse_block(areas_block(html))
    chips = copy.pop("chips")
    dropped = drop_sentences(copy)
    for key in ("eyebrow", "heading", "lede", "subHeading", "subLede", "cta"):
        copy[key] = slot(copy[key])

    # A place name that reached the file would be a hardcoded neighbourhood on every page that
    # rendered it, which is the one failure this whole script exists to prevent.
    for key, value in copy.items():
        if REFERENCE_CITY in value or re.search(r"\b" + REFERENCE_STATE + r"\b", value):
            raise SystemExit(f"'{key}': the reference place survived into the copy — refusing to write it")
        for chip in chips:
            if chip.lower() in value.lower():
                raise SystemExit(f"'{key}': the chip {chip!r} survived into the copy — refusing to write it")

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
        "areas": {
            **copy,
            "droppedSentences": dropped,
            # Counted, never carried and never quoted. See WHY THE CHIPS ARE NOT CARRIED above.
            "droppedAreaItems": {"count": len(chips), "reason": CHIP_DROP_REASON},
        },
    }
    paths.write_json(STANDARD_AREAS, payload)

    print(f"wrote {STANDARD_AREAS}")
    for key in ("eyebrow", "heading", "lede", "subHeading", "subLede", "cta"):
        print(f"    {key:<11} {payload['areas'][key]}")
    print(f"  sentences dropped: {len(dropped)}")
    for d in dropped:
        print(f"    {d['text']}")
        print(f"        why: {d['reason']}")
    print(f"  area items dropped: {len(chips)} (no neighbourhood name is carried, and none is printed here)")
    print(f"        why: {CHIP_DROP_REASON}")
    print("  substitutions:")
    for pattern, replacement, reason in SUBSTITUTIONS:
        used = sum(1 for k in ("eyebrow", "heading", "lede", "subHeading", "subLede", "cta") if replacement in payload["areas"][k])
        print(f"    /{pattern}/ -> {replacement}  ({reason}){'' if used else '  [unused]'}")


if __name__ == "__main__":
    main()
