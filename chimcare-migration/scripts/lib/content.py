"""Turning a WordPress ``post_content`` body into readable content.

Location bodies are WPBakery, not HTML: the copy lives inside ``[vc_column_text]`` wrappers with
``[vc_row]``, ``[vc_btn]`` and ``[xyz-ihs]`` around it. Only WPBakery ever rendered these bodies —
the Elementor data on the same posts is orphaned header markup — so the WPBakery shortcode layer is
the one that has to come off.

This module reads; it never repairs. Where a body has no heading, none is invented. Stage 3 keeps
the raw bytes and their SHA-256 alongside the parsed form, so a parsing mistake here is always
recoverable without going back to the database.
"""

from __future__ import annotations

import re
from urllib.parse import urljoin

# Bodies carry absolute https://www.chimcare.com URLs almost everywhere, but a handful are written
# root-relative. The uploads live on this host either way, so a relative src is resolved against it.
SITE_ORIGIN = "https://www.chimcare.com/"
# A pixel this small is a tracker or a spacer, never page imagery. Only skipped when BOTH dimensions
# are stated and both are tiny — an unsized <img> is a real photo whose attributes were left off.
MIN_IMAGE_PX = 4

# Shortcodes whose own content is layout or a call to action, not page copy.
DROPPED_WITH_BODY = ("vc_btn", "vc_single_image", "vc_gallery", "vc_video", "xyz-ihs", "gravityform", "vc_raw_html")
# Shortcodes that wrap real copy — the wrapper goes, the copy stays.
UNWRAPPED = (
    "vc_row", "vc_row_inner", "vc_column", "vc_column_inner", "vc_column_text",
    "vc_tta_section", "vc_tta_accordion", "vc_toggle", "vc_tta_tabs", "vc_tta_tab",
)

_ENTITIES = {
    "&nbsp;": " ", "&amp;": "&", "&#038;": "&", "&#38;": "&", "&quot;": '"',
    "&#039;": "'", "&#39;": "'", "&apos;": "'", "&#8217;": "’", "&#8211;": "–",
    "&lt;": "<", "&gt;": ">",
}
# Both decimal and hex numeric entities. React escapes apostrophes as `&#x27;`, and missing the
# hex form made every paragraph containing one look absent from the rendered page.
_NUMERIC_ENTITY = re.compile(r"&#(x[0-9a-fA-F]+|\d+);")
_BLOCK_RE = re.compile(
    r"<(h[1-6])\b[^>]*>(.*?)</\1>|<p\b[^>]*>(.*?)</p>|<li\b[^>]*>(.*?)</li>",
    re.IGNORECASE | re.DOTALL,
)
_IMG_TAG_RE = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
_UNKNOWN_SHORTCODE_RE = re.compile(r"\[/?[a-z][a-z0-9_-]*\b[^\]]*\]", re.IGNORECASE)
_SCRIPT_RE = re.compile(r"<(script|style|noscript)\b.*?</\1>", re.IGNORECASE | re.DOTALL)


def decode(text: str) -> str:
    for entity, char in _ENTITIES.items():
        text = text.replace(entity, char)
    return _NUMERIC_ENTITY.sub(
        lambda m: chr(int(m.group(1)[1:], 16) if m.group(1)[0] in "xX" else int(m.group(1))), text
    )


def collapse(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def plain(fragment: str) -> str:
    return collapse(decode(re.sub(r"<[^>]+>", " ", fragment or "")))


def _attr(tag: str, name: str) -> str | None:
    """One attribute off an ``<img>`` tag, or None when the tag does not carry it."""
    match = re.search(rf"\b{name}\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", tag, re.IGNORECASE)
    if not match:
        return None
    value = match.group(1)
    if value[:1] in ("\"", "'"):
        value = value[1:-1]
    return value


def _dimension(tag: str, name: str):
    """A width/height attribute as an int. WordPress sometimes writes `100%` or an empty string,
    and a dimension that is not a plain pixel count is no dimension at all."""
    value = (_attr(tag, name) or "").strip()
    return int(value) if value.isdigit() else None


def image_block(tag: str):
    """One ``<img>`` as a content block, or None when it is not page imagery.

    `alt` is whatever the tag says, including the empty string. An empty alt is a real
    accessibility signal — it tells a screen reader the image is decorative — so it is carried as
    written. Inventing alt text here would describe the page as this parser imagines it, not as the
    business wrote it.
    """
    src = (_attr(tag, "src") or "").strip()
    if not src:
        return None
    width = _dimension(tag, "width")
    height = _dimension(tag, "height")
    if width is not None and height is not None and width < MIN_IMAGE_PX and height < MIN_IMAGE_PX:
        return None  # tracking pixel or layout spacer
    return {
        "type": "image",
        "src": urljoin(SITE_ORIGIN, decode(src)),
        "alt": collapse(decode(_attr(tag, "alt") or "")),
        "width": width,
        "height": height,
    }


def _strip_shortcodes(src: str) -> str:
    out = src
    for tag in DROPPED_WITH_BODY:
        out = re.sub(rf"\[{tag}\b[^\]]*\].*?\[/{tag}\]", " ", out, flags=re.IGNORECASE | re.DOTALL)
        out = re.sub(rf"\[{tag}\b[^\]]*\]", " ", out, flags=re.IGNORECASE)
    for tag in UNWRAPPED:
        out = re.sub(rf"\[/?{tag}\b[^\]]*\]", "\n", out, flags=re.IGNORECASE)
    # Anything still in square brackets is a shortcode this pipeline does not know; it is not copy.
    return _UNKNOWN_SHORTCODE_RE.sub(" ", out)


def parse_body(post_content: str) -> dict:
    """Parse one body into headings, paragraphs, list items and images.

    Images used to be counted and thrown away, on the plan's original decision to exclude them.
    That was reversed in 2026-09: the migrated pages render in the client's reference design, which
    is built around imagery, and a page stripped of it shows empty bands where a photo belongs. So
    the markup is carried, in the position the body puts it in — an image between two sections
    belongs between them, not appended at the end.
    """
    raw = str(post_content or "")

    html = _strip_shortcodes(raw)
    html = _SCRIPT_RE.sub(" ", html)
    html = html.replace("\\n", "\n")  # bodies are stored with escaped newlines

    # Blocks are collected WITH their offset in the body and sorted at the end, so that copy which
    # sits loose in a [vc_column_text] keeps its place between the headings it belongs to. Appending
    # the loose copy after the matched blocks (as this did until 2026-09) silently reordered whole
    # pages: every heading first, every paragraph afterwards, and no way to tell which belonged to
    # which. Document order is the only thing that ties a service heading to its description.
    positioned: list[tuple[int, int, dict]] = []
    last_end = 0
    leftovers: list[tuple[int, str]] = []

    for match in _BLOCK_RE.finditer(html):
        leftovers.append((last_end, html[last_end : match.start()]))
        last_end = match.end()
        if match.group(1):
            positioned.append((match.start(), 0, {"type": "heading", "level": int(match.group(1)[1]), "text": plain(match.group(2))}))
        elif match.group(3) is not None:
            positioned.append((match.start(), 0, {"type": "paragraph", "text": plain(match.group(3))}))
        else:
            positioned.append((match.start(), 0, {"type": "listItem", "text": plain(match.group(4))}))
    leftovers.append((last_end, html[last_end:]))

    # Images sort by the same source offset as everything else, so one that sits between two
    # headings stays between them. An <img> inside a <p> sorts just after that paragraph, which is
    # where the body puts it; `plain()` has already dropped the tag from the paragraph's own text.
    for match in _IMG_TAG_RE.finditer(html):
        block = image_block(match.group(0))
        if block is not None:
            positioned.append((match.start(), 0, block))

    # Copy that sits directly in a [vc_column_text] with no <p> around it is still copy.
    for chunk_start, chunk in leftovers:
        # Every line of one gap sorts at that gap's start, in its own order. `plain()` rewrites the
        # text so a real per-line offset is not available, but a gap always begins before the block
        # that ends it, so (gap start, line number) orders the whole body exactly.
        for line_no, line in enumerate(plain(chunk).split("\n"), start=1):
            line = line.strip()
            if len(line) > 40:
                positioned.append((chunk_start, line_no, {"type": "paragraph", "text": line}))

    positioned.sort(key=lambda item: (item[0], item[1]))
    blocks = [block for _, _, block in positioned]

    # An image has no text of its own; an empty alt is meaningful, so it is never a reason to drop it.
    kept = [b for b in blocks if b["type"] == "image" or b["text"]]
    headings = [b for b in kept if b["type"] == "heading"]

    return {
        "blocks": kept,
        "h1": next((h["text"] for h in headings if h["level"] == 1), None),
        "firstHeading": headings[0]["text"] if headings else None,
        "headingCount": len(headings),
        "paragraphCount": sum(1 for b in kept if b["type"] == "paragraph"),
        "listItemCount": sum(1 for b in kept if b["type"] == "listItem"),
        "words": sum(len(b.get("text", "").split()) for b in kept),
        "imageCount": sum(1 for b in kept if b["type"] == "image"),
        "plainText": collapse("\n\n".join(b["text"] for b in kept if b["type"] != "image")),
    }


def visible_text(html: str) -> str:
    """The visible text of a rendered page, for comparing the new app against production."""
    match = re.search(r"<body[^>]*>(.*)</body>", html or "", re.IGNORECASE | re.DOTALL)
    body = match.group(1) if match else (html or "")
    return plain(_SCRIPT_RE.sub(" ", body))
