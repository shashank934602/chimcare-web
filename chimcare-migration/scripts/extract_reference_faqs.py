#!/usr/bin/env python3
"""Pull the client reference's SEVEN FAQ entries out of `send-to-client/spokane.html`.

    python3 scripts/extract_reference_faqs.py
    python3 scripts/extract_reference_faqs.py --reference /path/to/other.html

WHY THIS EXISTS
The `/location/` template used to render whatever FAQ rows WordPress happened to seed for a city —
three short lines on 137 Minnesota pages, nothing at all on every other page. The client's reference
page carries seven hand-written questions in a deliberate order, and those seven are the design.
This script lifts them out of the reference ONCE, to `app/location/standard-faqs.json`, so the
renderer reads data rather than re-parsing 2.4 MB of HTML on every request — exactly as
`extract_reference_services.py` already does for the eight service rows.

WHY SENTENCES ARE DROPPED
The reference was written for Spokane, and two of its FAQ sentences make a claim about the CLIMATE
rather than about Chimcare:

    "If you burn regularly through a Spokane winter, plan on at least one sweep a season."
    "In Spokane, WA, an annual chimney inspection and cleaning helps prevent creosote buildup,
     improves draft, reduces smoke/odor issues, and keeps your system operating safely before
     heating season."

This migration includes Arizona and Georgia pages. A burning winter is not a fact in Phoenix, and an
annual cycle timed to "before heating season" presupposes one, so both sentences are DROPPED whole
rather than reworded — rewording them would be inventing copy the client never approved. Each drop
is recorded in the entry's `droppedSentences`, with its reason, so the edit stays auditable.

The second drop empties its entry: all that is left of "Do I really need an annual chimney
cleaning?" is the word "Yes.", which answers nothing. A remnant that short is dropped too and the
entry is written with an empty `answer`; the renderer skips an entry with no answer, so that
question appears on no page. Recording it here rather than deleting the entry keeps the seven
entries of the reference visible, and keeps the reason for the absence in the file.

WHY ONE ENTRY IS FLAGGED `needsPrices`
"What does chimney cleaning cost in {City}?" quotes two real figures — $299 for a sweep with
inspection, $69 for an inspection on its own. They are genuine seed prices, but they are
region-scoped: they are true only for a page whose region resolves. So the figures are replaced by
`{{price.sweep_inspection}}` and `{{price.inspection}}`, the entry is marked `needsPrices`, and the
renderer omits the whole entry on a page where no real price resolved. No figure is ever hardcoded,
and the answer is never reworded to dodge the numbers.

SLOTS
Where the reference names the place and the sentence claims nothing about it, the place name is
replaced by `{{city.name}}` / `{{state.code}}` and the renderer fills it from the page's own city.
Every other word carries over verbatim.

Idempotent: `generatedAt` is the reference file's own mtime, not the clock, so a re-run over an
unchanged reference writes a byte-identical file.

Reads:  send-to-client/spokane.html (or --reference)
Writes: app/location/standard-faqs.json
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

STANDARD_FAQS = paths.APP_ROOT / "app" / "location" / "standard-faqs.json"

EXPECTED_ENTRIES = 7

# The city the reference was written for. Kept as data so the substitutions below read as rules
# rather than as magic strings scattered through the file.
REFERENCE_CITY = "Spokane"
REFERENCE_STATE = "WA"

# The seven entries, in the reference's own order: a stable key for each, and enough of the
# question to prove the reference still says what this script was written against. If the reference
# changes under us the run fails rather than writing a file whose keys mean something else.
EXPECTED = [
    ("cleaning-signs", "How do I know if my chimney needs cleaning?"),
    ("cost", "What does chimney cleaning cost in Spokane?"),
    ("creosote", "What is creosote?"),
    ("cleaning-logs", "Can I use chimney cleaning logs instead of a professional?"),
    ("service-area", "What areas do you serve around Spokane, WA?"),
    ("annual-cleaning", "Do I really need an annual chimney cleaning?"),
    ("gas-fireplaces", "Do you service gas fireplaces in Spokane, WA?"),
]

# The one entry whose answer quotes real money. Its figures are region-scoped, so the renderer
# needs to be told to omit the entry outright when no real price resolves for the page.
PRICED_KEY = "cost"

# Dropped whole, never reworded. Keyed by the entry they belong to so a typo cannot silently strip a
# sentence from the wrong entry. Matched literally against the reference's own words.
DROP_SENTENCES = [
    (
        "cleaning-signs",
        "If you burn regularly through a Spokane winter, plan on at least one sweep a season.",
        "climate claim — a burning winter is not a fact for the Arizona and Georgia cities in this "
        "run, and substituting the city name would not make it one",
    ),
    (
        "annual-cleaning",
        "In Spokane, WA, an annual chimney inspection and cleaning helps prevent creosote buildup, "
        "improves draft, reduces smoke/odor issues, and keeps your system operating safely before "
        "heating season.",
        "climate claim — it asserts an annual cycle timed to 'before heating season', which "
        "presupposes a heating season the Arizona and Georgia cities in this run do not have",
    ),
]

# An answer left with fewer real words than this after the drop pass no longer answers its question,
# so what remains is dropped too and the entry renders on no page. "Yes." is not an answer.
MIN_ANSWER_WORDS = 8

# The money the reference quotes, and the slot the renderer fills from this page's own region. The
# figures themselves never reach the JSON: an unresolved region must not be able to print one.
PRICE_SUBSTITUTIONS = [
    (r"\$299", "{{price.sweep_inspection}}", "the seed sweep-with-inspection price, region-scoped"),
    (r"\$69", "{{price.inspection}}", "the seed inspection-only price, region-scoped"),
]

# Place names replaced by a slot the renderer fills from the page's own city and state. Every one of
# these sits in a sentence that claims nothing about the weather or the region — only about what we
# serve — so it survives the move to another city. The order matters: the two-part "Spokane, WA"
# is handled by the city and state rules in turn, which is why the state rule is last.
SUBSTITUTIONS = [
    (r"\b" + REFERENCE_CITY + r"\b", "{{city.name}}", "the reference city"),
    (r"\b" + REFERENCE_STATE + r"\b", "{{state.code}}", "the reference state code"),
]


# ----------------------------------------------------------------------------- parsing

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def text_of(fragment: str) -> str:
    """Markup to the words a reader sees: tags out, entities in, whitespace normalised."""
    return WS_RE.sub(" ", html_mod.unescape(TAG_RE.sub(" ", fragment))).strip()


def faq_block(html: str) -> str:
    """The `div.faq` accordion, from its opening tag to the start of the section after it.

    Sliced rather than parsed as a document because the reference is 2.4 MB of inlined base64 and
    every byte of it outside this list is someone else's section.
    """
    start = html.find('class="faq reveal"')
    if start < 0:
        raise SystemExit("no `faq reveal` accordion in the reference")
    end = html.find('class="section o1-contact', start)
    if end < 0:
        raise SystemExit("no o1-contact section after the FAQ — cannot bound the list")
    return html[start:end]


ITEM_RE = re.compile(r'<div class="faq-item[^"]*">', re.S)
Q_RE = re.compile(r'<button class="faq-q"[^>]*>(?P<q>.*?)<svg', re.S)
A_RE = re.compile(r'<p class="faq-a">(?P<a>.*?)</p>', re.S)


def parse_items(block: str) -> list[dict]:
    # Each item is sliced from its own opening tag to the next one (the last runs to the end of the
    # block). The rows nest four deep and close together, so counting `</div>` buys nothing.
    starts = [m.start() for m in ITEM_RE.finditer(block)]
    items = []
    for order, start in enumerate(starts, start=1):
        body = block[start : starts[order] if order < len(starts) else len(block)]
        for name, pattern in (("question", Q_RE), ("answer", A_RE)):
            if not pattern.search(body):
                raise SystemExit(f"FAQ item {order} has no {name}")
        items.append(
            {
                "question": text_of(Q_RE.search(body).group("q")),
                "answer": text_of(A_RE.search(body).group("a")),
            }
        )
    return items


def key_items(items: list[dict]) -> None:
    """Give each item its stable key, proving the reference still asks the question it asked."""
    for item, (key, question) in zip(items, EXPECTED):
        if item["question"] != question:
            raise SystemExit(
                "the reference's FAQ has changed — refusing to write keys that would mean "
                f"something else:\n  expected: {question}\n  found:    {item['question']}"
            )
        item["key"] = key


# ----------------------------------------------------------------------------- editing

def drop_sentences(item: dict) -> list[dict]:
    """Remove this entry's city-climate sentences and record each removal with its reason."""
    dropped = []
    for key, sentence, reason in DROP_SENTENCES:
        if key != item["key"]:
            continue
        if sentence not in item["answer"]:
            raise SystemExit(
                f"'{item['key']}': the sentence to drop is not in the reference any more — "
                f"refusing to write a half-edited file:\n  {sentence}"
            )
        item["answer"] = WS_RE.sub(" ", item["answer"].replace(sentence, "")).strip()
        dropped.append({"text": sentence, "reason": reason})
    # What is left may no longer answer the question. Drop the remnant too rather than publish it.
    if dropped and item["answer"] and len(item["answer"].split()) < MIN_ANSWER_WORDS:
        dropped.append(
            {
                "text": item["answer"],
                "reason": "remnant — all that survived the climate drop above, and it does not "
                "answer the question, so this entry renders on no page",
            }
        )
        item["answer"] = ""
    return dropped


def slot(text: str) -> str:
    """Place names out, `{{slots}}` in — applied only to copy that survived the drop pass."""
    for pattern, replacement, _reason in SUBSTITUTIONS:
        text = re.sub(pattern, replacement.replace("\\", "\\\\"), text)
    return text


def slot_prices(text: str) -> str:
    """The quoted figures out, price slots in. Only the `needsPrices` entry is ever passed here."""
    for pattern, replacement, _reason in PRICE_SUBSTITUTIONS:
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

    items = parse_items(faq_block(html))
    if len(items) != EXPECTED_ENTRIES:
        raise SystemExit(f"expected {EXPECTED_ENTRIES} FAQ items in the reference, found {len(items)}")
    key_items(items)

    dropped_total = 0
    for item in items:
        dropped = drop_sentences(item)
        dropped_total += len(dropped)
        item["needsPrices"] = item["key"] == PRICED_KEY
        if item["needsPrices"]:
            item["answer"] = slot_prices(item["answer"])
        item["question"] = slot(item["question"])
        item["answer"] = slot(item["answer"])
        item["droppedSentences"] = dropped

    # A figure that reached the file would be a hardcoded price on every page that renders it.
    for item in items:
        for field in ("question", "answer"):
            if re.search(r"\$\d", item[field]):
                raise SystemExit(f"'{item['key']}': a literal price survived into {field} — refusing to write it")
        if REFERENCE_CITY in item["question"] or REFERENCE_CITY in item["answer"]:
            raise SystemExit(f"'{item['key']}': the reference city survived into the copy — refusing to write it")

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
        "faqs": [
            {
                "key": i["key"],
                "question": i["question"],
                "answer": i["answer"],
                "needsPrices": i["needsPrices"],
                "droppedSentences": i["droppedSentences"],
            }
            for i in items
        ],
    }
    paths.write_json(STANDARD_FAQS, payload)

    renders = sum(1 for i in items if i["answer"])
    print(f"wrote {STANDARD_FAQS}")
    print(f"  entries found:     {len(items)}")
    for item in items:
        state = "renders" if item["answer"] else "no answer left — renders nowhere"
        if item["needsPrices"]:
            state = "renders only where real prices resolve"
        print(f"    {item['key']:<16} {state}")
    print(f"  entries with copy: {renders}/{len(items)}")
    print(f"  sentences dropped: {dropped_total}")
    for item in items:
        for d in item["droppedSentences"]:
            print(f"    [{item['key']}] {d['text']}")
            print(f"        why: {d['reason']}")
    print("  substitutions:")
    for pattern, replacement, reason in PRICE_SUBSTITUTIONS + SUBSTITUTIONS:
        used = sum(1 for i in items for t in (i["question"], i["answer"]) if replacement in t)
        print(f"    /{pattern}/ -> {replacement}  ({reason}){'' if used else '  [unused]'}")


if __name__ == "__main__":
    main()
