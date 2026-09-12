#!/usr/bin/env python3
"""Pull the client reference's EIGHT curated service rows out of `send-to-client/spokane.html`.

    python3 scripts/extract_reference_services.py
    python3 scripts/extract_reference_services.py --reference /path/to/other.html

WHY THIS EXISTS
The `/location/` template's service accordion used to be generated from whatever level-3 headings
the migrated WordPress body happened to carry — twenty-odd rows on a typical page, in whatever order
the 2019 editor typed them. The client's reference page has eight, hand-written, in a deliberate
order, each with an icon, a summary line, two paragraphs, a four-item "what's included" list and its
own call to action. Those eight are the design. This script lifts them out of the reference ONCE, to
`app/location/standard-services.json`, so the renderer reads data rather than re-parsing 2.4 MB of
HTML on every request.

WHY SENTENCES ARE DROPPED
The reference was written for Spokane, and three of its sentences say so. Two of them are claims
about the CLIMATE:

    "In Spokane, where fireplaces run from October through March, that buildup is the leading
     cause of chimney fires."
    "Chimney repair in Spokane has to stand up to heavy snow loads, months of freezing
     temperatures and wet springs."

This migration includes Arizona and Georgia pages. "Months of freezing temperatures" is simply false
in Phoenix, and no substitution can make it true, so both sentences are DROPPED whole rather than
reworded — rewording them would be inventing copy the client never approved. Each drop is recorded
in the entry's `droppedSentences`, with its reason, so the edit stays auditable.

The third city sentence — "Our Spokane masons tuckpoint everything from a few joints near the crown
to a full chimney." — claims nothing about the place, only about us, so it survives with a
`{{city.name}}` slot in place of the city. The same treatment is applied to the two other places the
reference names a location and the sentence is safe: the masonry summary line, and the Spokane
neighbourhood "Browne's Addition", which cannot appear on a Tucson page but reads correctly as the
city itself. Every other word of the eight entries is brand copy and carries over verbatim.

IMAGES
The reference's accordion rows carry no photograph of their own — the section has a single plate
above the list. So each entry is matched against the plates the asset stage already extracted
(`app/location/template-assets.json` → `public/reference/*`) by the distinctive words of its own
name against the plate's own alt text, one plate to at most one entry, strongest match first. An
entry with no honest match gets `image: null` and the renderer draws none. Nothing is guessed.

Idempotent: `generatedAt` is the reference file's own mtime, not the clock, so a re-run over an
unchanged reference writes a byte-identical file.

Reads:  send-to-client/spokane.html (or --reference), app/location/template-assets.json
Writes: app/location/standard-services.json
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

TEMPLATE_ASSETS = paths.APP_ROOT / "app" / "location" / "template-assets.json"
STANDARD_SERVICES = paths.APP_ROOT / "app" / "location" / "standard-services.json"

EXPECTED_ENTRIES = 8

# The city the reference was written for. Kept as data so the substitutions below read as rules
# rather than as magic strings scattered through the file.
REFERENCE_CITY = "Spokane"
REFERENCE_STATE = "WA"

# Dropped whole, never reworded. Keyed by the `data-service` of the row they belong to so a typo
# cannot silently strip a sentence from the wrong entry. Matched literally: if the reference changes
# under us the run fails rather than writing a half-edited file.
DROP_SENTENCES = [
    (
        "sweeping",
        "In Spokane, where fireplaces run from October through March, that buildup is the "
        "leading cause of chimney fires.",
        "climate claim — false for the Arizona and Georgia cities in this run, and unfixable by "
        "substituting the city name",
    ),
    (
        "repair",
        "Chimney repair in Spokane has to stand up to heavy snow loads, months of freezing "
        "temperatures and wet springs.",
        "climate claim — 'months of freezing temperatures' is false for the Arizona and Georgia "
        "cities in this run",
    ),
]

# Place names replaced by a slot the renderer fills from the page's own parsed city and state. Every
# one of these sits in a sentence that claims nothing about the weather or the region — only about
# Chimcare — so it survives the move to another city.
SUBSTITUTIONS = [
    (r"Browne's Addition", "{{city.name}}", "a Spokane neighbourhood; the city itself is the true generalisation"),
    (r"\b" + REFERENCE_CITY + r"\b", "{{city.name}}", "the reference city"),
    (r"\b" + REFERENCE_STATE + r"\b", "{{state.code}}", "the reference state code"),
]

# A word every plate's alt text contains, and therefore evidence of nothing.
MATCH_STOPWORDS = {"chimney", "chimcare", "fireplace", "technician", "a", "the", "on", "from", "of", "and"}


# ----------------------------------------------------------------------------- parsing

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def text_of(fragment: str) -> str:
    """Markup to the words a reader sees: tags out, entities in, whitespace normalised."""
    return WS_RE.sub(" ", html_mod.unescape(TAG_RE.sub(" ", fragment))).strip()


def accordion(html: str) -> str:
    """The `ul.o1-list` accordion, from its opening tag to the end of its last row.

    Sliced rather than parsed as a document because the reference is 2.4 MB of inlined base64 and
    every byte of it outside this list is someone else's section.
    """
    start = html.find('class="o1-list')
    if start < 0:
        raise SystemExit("no o1-list accordion in the reference")
    end = html.find('class="section o1-solutions', start)
    if end < 0:
        raise SystemExit("no o1-solutions section after the accordion — cannot bound the list")
    return html[start:end]


ROW_RE = re.compile(r'<article class="o1-row[^"]*"(?P<attrs>[^>]*)>(?P<body>.*?)</article>', re.S)
ATTR_RE = re.compile(r'data-(?P<name>[a-z]+)="(?P<value>[^"]*)"')
ICON_RE = re.compile(r'<span class="ic">\s*<svg[^>]*>\s*<use href="#i-(?P<icon>[a-z0-9-]+)"')
NAME_RE = re.compile(r'<h3 class="svc-name">(?P<name>.*?)</h3>', re.S)
SHORT_RE = re.compile(r'<p class="short svc-short">(?P<short>.*?)</p>', re.S)
MAIN_RE = re.compile(r'<div class="svc-body svc-main">(?P<main>.*?)</div>', re.S)
SIDE_RE = re.compile(r'<div class="side svc-body svc-side">(?P<side>.*?)</div>\s*</div>', re.S)
PARA_RE = re.compile(r"<p>(?P<p>.*?)</p>", re.S)
ITEM_RE = re.compile(r"<li>(?P<li>.*?)</li>", re.S)
CTA_RE = re.compile(r'<div class="ctas">\s*<a[^>]*>(?P<cta>.*?)</a>', re.S)


def parse_rows(list_html: str) -> list[dict]:
    rows = []
    for order, m in enumerate(ROW_RE.finditer(list_html), start=1):
        attrs = dict(ATTR_RE.findall(m.group("attrs")))
        body = m.group("body")
        key = attrs.get("service")
        if not key:
            raise SystemExit(f"accordion row {order} has no data-service")
        for name, pattern in (("icon", ICON_RE), ("name", NAME_RE), ("short", SHORT_RE), ("main", MAIN_RE), ("side", SIDE_RE), ("cta", CTA_RE)):
            if not pattern.search(body):
                raise SystemExit(f"accordion row '{key}' has no {name}")
        main = MAIN_RE.search(body).group("main")
        side = SIDE_RE.search(body).group("side")
        rows.append(
            {
                "key": key,
                "n": f"{order:02d}",
                "icon": ICON_RE.search(body).group("icon"),
                "name": text_of(NAME_RE.search(body).group("name")),
                "summary": text_of(SHORT_RE.search(body).group("short")),
                "paragraphs": [text_of(p) for p in PARA_RE.findall(main)],
                "included": [text_of(li) for li in ITEM_RE.findall(side)],
                "cta": text_of(CTA_RE.search(body).group("cta")),
            }
        )
    return rows


# ----------------------------------------------------------------------------- editing

def drop_sentences(row: dict) -> list[dict]:
    """Remove this row's city-climate sentences and record each removal with its reason."""
    dropped = []
    for key, sentence, reason in DROP_SENTENCES:
        if key != row["key"]:
            continue
        hits = [i for i, p in enumerate(row["paragraphs"]) if sentence in p]
        if not hits:
            raise SystemExit(
                f"'{row['key']}': the sentence to drop is not in the reference any more — "
                f"refusing to write a half-edited file:\n  {sentence}"
            )
        for i in hits:
            row["paragraphs"][i] = WS_RE.sub(" ", row["paragraphs"][i].replace(sentence, "")).strip()
        dropped.append({"text": sentence, "reason": reason})
    row["paragraphs"] = [p for p in row["paragraphs"] if p]
    return dropped


def slot(text: str) -> str:
    """Place names out, `{{slots}}` in — applied only to copy that survived the drop pass."""
    for pattern, replacement, _reason in SUBSTITUTIONS:
        text = re.sub(pattern, replacement.replace("\\", "\\\\"), text)
    return text


# ----------------------------------------------------------------------------- image matching

def match_images(rows: list[dict]) -> None:
    """Give each entry the reference plate whose own alt text names what the entry does.

    Scored on the distinctive words of the entry's name only (stemmed to a five-letter prefix, so
    "sweeping" finds "sweeping" and "repair" finds "repairing"), one plate per entry, strongest
    score first. No match, no image — the renderer then draws the row without one.
    """
    if not TEMPLATE_ASSETS.exists():
        raise SystemExit(f"missing {TEMPLATE_ASSETS} — run `python3 scripts/extract_reference_template.py` first")
    # Only the photographs from the two SERVICE sections are candidates. The hero's award badges and
    # the trust band's illustration also mention chimneys, and matching one of those to a service row
    # would put a logo where a photograph belongs.
    plates = [
        img
        for img in json.loads(TEMPLATE_ASSETS.read_text(encoding="utf-8"))["images"]
        if img.get("origin") == "body"
        and img.get("nearestSection") in ("o1-svc", "o1-solutions")
        and img.get("alt")
        and img.get("width")
        and img.get("height")
    ]

    def stems(phrase: str) -> set:
        return {w[:5] for w in re.findall(r"[a-z]+", phrase.lower()) if w not in MATCH_STOPWORDS}

    scored = []
    for row in rows:
        wanted = stems(row["name"])
        for plate in plates:
            score = len(wanted & stems(plate["alt"]))
            if score:
                scored.append((score, row["n"], row["key"], plate["id"]))
    scored.sort(key=lambda t: (-t[0], t[1]))

    by_id = {p["id"]: p for p in plates}
    taken, placed = set(), set()
    for _score, _n, key, plate_id in scored:
        if key in placed or plate_id in taken:
            continue
        plate = by_id[plate_id]
        for row in rows:
            if row["key"] == key:
                row["image"] = {
                    "file": plate["file"],
                    "alt": plate["alt"],
                    "width": plate["width"],
                    "height": plate["height"],
                }
        taken.add(plate_id)
        placed.add(key)
    for row in rows:
        row.setdefault("image", None)


# ----------------------------------------------------------------------------- main

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reference", type=Path, default=DEFAULT_REFERENCE, help="the client reference HTML page")
    args = parser.parse_args()

    if not args.reference.exists():
        raise SystemExit(f"missing reference {args.reference}")
    html = args.reference.read_text(encoding="utf-8", errors="replace")

    rows = parse_rows(accordion(html))
    if len(rows) != EXPECTED_ENTRIES:
        raise SystemExit(f"expected {EXPECTED_ENTRIES} service rows in the reference, found {len(rows)}")

    dropped_total = 0
    for row in rows:
        dropped = drop_sentences(row)
        dropped_total += len(dropped)
        row["summary"] = slot(row["summary"])
        row["paragraphs"] = [slot(p) for p in row["paragraphs"]]
        row["droppedSentences"] = dropped
    match_images(rows)

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
        "services": [
            {
                "key": r["key"],
                "n": r["n"],
                "icon": r["icon"],
                "name": r["name"],
                "summary": r["summary"],
                "paragraphs": r["paragraphs"],
                "included": r["included"],
                "cta": r["cta"],
                "image": r["image"],
                "droppedSentences": r["droppedSentences"],
            }
            for r in rows
        ],
    }
    paths.write_json(STANDARD_SERVICES, payload)

    matched = sum(1 for r in rows if r["image"])
    print(f"wrote {STANDARD_SERVICES}")
    print(f"  entries found:    {len(rows)} ({', '.join(r['name'] for r in rows)})")
    print(f"  sentences dropped: {dropped_total}")
    for row in rows:
        for d in row["droppedSentences"]:
            print(f"    [{row['key']}] {d['text']}")
            print(f"        why: {d['reason']}")
    print(f"  images matched:   {matched}/{len(rows)}")
    for row in rows:
        where = row["image"]["file"] if row["image"] else "(none)"
        print(f"    {row['n']} {row['name']:<20} {where}")
    print("  place names slotted:")
    for pattern, replacement, reason in SUBSTITUTIONS:
        used = sum(1 for r in rows for t in [r["summary"], *r["paragraphs"]] if replacement in t)
        print(f"    /{pattern}/ -> {replacement}  ({reason}){'' if used else '  [unused]'}")


if __name__ == "__main__":
    main()
