#!/usr/bin/env python3
"""One-off — pull the migration trial's visual template AND its embedded assets out of the client
reference page.

    python3 scripts/extract_reference_template.py
    python3 scripts/extract_reference_template.py --reference /path/to/other.html

The client reference (`send-to-client/spokane.html`) is a fully rendered, hand-approved page: real
CSS, real section structure, real head metadata — and every picture and webfont it uses is inlined
into it as a base64 `data:` URI. That is why the file is 2.4 MB.

An earlier version of this script threw those URIs away: it rewrote every `url(data:...)` in the
stylesheet to `none`, on the theory that the trial route was a copy-review surface that did not need
pictures. That was wrong in a way that showed. Killing the CSS `url()` values also killed the ten
@font-face sources, so the page fell back to system fonts, and it killed the hero plate the layout
is built around. The stripping is gone. Instead every embedded asset is DECODED ONCE to a real file
under `public/reference/`, and the CSS is rewritten to point at those files. Real files are what the
browser can cache, what Next can serve statically, and what a human can look at; a data URI is none
of those things.

Files are named by the first 8 hex of a sha256 of their own decoded bytes — `img-<hash>.webp`,
`font-<hash>.woff2`. Content addressing is what makes a re-run idempotent: the same bytes always
land on the same name, so nothing accumulates and nothing is duplicated even though the same image
may appear in the file more than once.

It is read-only on the reference and writes:

    public/reference/*                 every decoded font and image, one file per distinct payload
    app/location/template.css          the reference's <style> block with url(data:...) -> url(/reference/...)
    app/location/template-shape.json   section classes, head meta keys and JSON-LD @types present
    app/location/template-assets.json  the asset contract the page renderer reads

`template-assets.json` is the interesting one. Extracting the pixels is not enough — the renderer
also has to know WHERE each picture belonged, and the reference's own markup is the only record of
that. So for every <img> in the body this script walks the open-element stack back up to the closest
enclosing element carrying a real section class (an `o1-*` token, or a bare `section`/`hero` token —
token-exact, so `hero-figure` is not mistaken for the hero section) and records that, plus the
image's own class or its parent figure's, plus its alt text verbatim. Alt text is copy the business
wrote about its own photographs; it is carried across, never regenerated.

Dimensions are read from each file's own header bytes (JPEG SOF, PNG IHDR, WebP VP8/VP8L/VP8X) with
the stdlib only — no Pillow, because this pipeline has no third-party dependencies and adding one
for three struct.unpacks would be a poor trade. Anything unreadable (SVG, notably, which has no
pixel header) reports null rather than a guess.

Reads:  send-to-client/spokane.html (or --reference)
Writes: public/reference/, app/location/template.css, template-shape.json, template-assets.json
"""

from __future__ import annotations

import argparse
import base64
import binascii
import hashlib
import json
import re
import struct
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `lib` resolves however the script is invoked

from lib import paths

DEFAULT_REFERENCE = Path(
    "/Users/vss-2/Desktop/chimcare/chimcare-web-2-RECOVERED/send-to-client/spokane.html"
)

TEMPLATE_DIR = paths.APP_ROOT / "app" / "location"
TEMPLATE_CSS = TEMPLATE_DIR / "template.css"
TEMPLATE_SHAPE = TEMPLATE_DIR / "template-shape.json"
TEMPLATE_ASSETS = TEMPLATE_DIR / "template-assets.json"

# Assets land in the app's static root, so the public URL is exactly the path under public/.
ASSET_DIR = paths.APP_ROOT / "public" / "reference"
ASSET_URL_PREFIX = "/reference"

# The reference's own top-level section markers, already measured by hand against this exact file
# (one <style> block; hero/trust/intro/svc/solutions/areas/cost/contact/final in this order). Scanning
# for these known values, rather than guessing a CSS-class heuristic, is what keeps the shape record
# faithful to a file this script must never read into a prompt to double-check.
SECTION_MARKERS = (
    "hero o1-hero",
    "o1-trust",
    "section o1-intro",
    "o1-trust-copy on-dark",
    "section o1-svc",
    "o1-list reveal",
    "section o1-solutions",
    "section areas",
    "section o1-cost",
    "section o1-contact",
    "section o1-final",
)

# Only these mime types are ever written out. An unknown mime is reported, not guessed at, because a
# file with the wrong extension is served with the wrong Content-Type and fails silently in a browser.
MIME_EXT = {
    "font/woff2": ".woff2",
    "font/woff": ".woff",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/gif": ".gif",
    "image/avif": ".avif",
}

_STYLE_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.IGNORECASE | re.DOTALL)
# Base64 payloads never contain ')' , so a non-greedy run up to the closing paren is safe here.
_CSS_DATA_URI_RE = re.compile(
    r"url\(\s*['\"]?(data:([^;,]+);base64,([^)'\"\s]+))\s*['\"]?\s*\)", re.IGNORECASE
)
_BODY_DATA_URI_RE = re.compile(r"data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)")
_LDJSON_RE = re.compile(
    r'<script\b[^>]*\btype="application/ld\+json"[^>]*>(.*?)</script>', re.IGNORECASE | re.DOTALL
)

# Tags that never open a scope, so the element stack must not push them.
VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}


# --------------------------------------------------------------------------------------------------
# asset decoding


def asset_name(kind: str, payload: bytes, mime: str) -> str:
    """`<kind>-<8 hex of sha256>.<ext>` — content addressed, so a re-run never makes a second copy."""
    ext = MIME_EXT.get(mime.lower())
    if ext is None:
        raise SystemExit(f"unknown embedded mime type {mime!r} — refusing to guess an extension")
    return f"{kind}-{hashlib.sha256(payload).hexdigest()[:8]}{ext}"


def decode_payload(b64: str) -> bytes:
    """Decode a data-URI payload, tolerating the newlines a pretty-printed HTML file wraps it in."""
    return base64.b64decode(re.sub(r"\s+", "", b64), validate=False)


def image_size(data: bytes) -> tuple[int | None, int | None]:
    """(width, height) from the file's own header bytes, or (None, None) when the format has none."""
    try:
        if data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR":
            w, h = struct.unpack(">II", data[16:24])
            return int(w), int(h)
        if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
            chunk = data[12:16]
            if chunk == b"VP8 ":
                # lossy: 3-byte start code, then 14-bit width and height, low 2 bits are the scale.
                return (
                    struct.unpack("<H", data[26:28])[0] & 0x3FFF,
                    struct.unpack("<H", data[28:30])[0] & 0x3FFF,
                )
            if chunk == b"VP8L":
                bits = struct.unpack("<I", data[21:25])[0]
                return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
            if chunk == b"VP8X":
                # extended: two 24-bit little-endian "minus one" values.
                w = data[24] | (data[25] << 8) | (data[26] << 16)
                h = data[27] | (data[28] << 8) | (data[29] << 16)
                return w + 1, h + 1
            return None, None
        if data[:2] == b"\xff\xd8":
            # JPEG: walk the marker chain to the first Start-Of-Frame, which carries the real size.
            i = 2
            while i + 9 < len(data):
                if data[i] != 0xFF:
                    i += 1
                    continue
                marker = data[i + 1]
                if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
                    i += 2
                    continue
                seg_len = struct.unpack(">H", data[i + 2 : i + 4])[0]
                if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    h, w = struct.unpack(">HH", data[i + 5 : i + 9])
                    return int(w), int(h)
                i += 2 + seg_len
    except (struct.error, IndexError, binascii.Error):
        return None, None
    return None, None


# --------------------------------------------------------------------------------------------------
# CSS


def extract_style_block(html: str) -> tuple[str, int, int]:
    """The single <style> block's content plus its span in the source, so the body can exclude it."""
    match = _STYLE_RE.search(html)
    if not match:
        raise SystemExit("no <style> block found in reference")
    return match.group(1), match.start(), match.end()


def rewrite_css(css: str, writer) -> tuple[str, list[dict], list[dict]]:
    """Replace every url(data:...) with url(/reference/<file>), emitting the file as a side effect."""
    fonts: list[dict] = []
    images: list[dict] = []

    def substitute(match: re.Match) -> str:
        mime = match.group(2).strip().lower()
        payload = decode_payload(match.group(3))
        kind = "font" if mime.startswith("font/") or "font" in mime else "img"
        name = asset_name(kind, payload, mime)
        writer(name, payload)
        url = f"{ASSET_URL_PREFIX}/{name}"
        record = {"file": url, "bytes": len(payload)}
        if kind == "font":
            if record not in fonts:
                fonts.append(record)
        else:
            width, height = image_size(payload)
            entry = {
                "id": name.rsplit(".", 1)[0],
                "file": url,
                "mime": mime,
                "bytes": len(payload),
                "width": width,
                "height": height,
                "origin": "css",
                "bodyIndex": None,
                "alt": "",
                "nearestSection": None,
                "nearestClass": None,
            }
            if entry not in images:
                images.append(entry)
        return f"url({url})"

    return _CSS_DATA_URI_RE.sub(substitute, css), fonts, images


# --------------------------------------------------------------------------------------------------
# body images and where they belong


class _ImagePlacer(HTMLParser):
    """Walks the body keeping an open-element stack, so each <img> can name the section it sits in.

    Position alone cannot answer "where does this picture go" — the renderer needs the enclosing
    section's class. Keeping the stack while parsing is the cheapest faithful way to get it, and it
    is exact where a backwards regex scan would be a guess.
    """

    #: A class token only counts as a section marker if it IS one of these or starts with `o1-`.
    #: Token-exactness matters: `hero-figure` is a figure inside the hero, not the hero itself.
    BARE_SECTION_TOKENS = {"section", "hero"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.stack: list[tuple[str, str | None]] = []
        self.images: list[dict] = []

    @classmethod
    def _section_label(cls, class_attr: str | None) -> str | None:
        """The o1-* token if the element has one, else a bare `section`/`hero`, else not a section."""
        if not class_attr:
            return None
        tokens = class_attr.split()
        for token in tokens:
            if token.startswith("o1-"):
                return token
        for token in tokens:
            if token in cls.BARE_SECTION_TOKENS:
                return token
        return None

    def handle_starttag(self, tag: str, attrs) -> None:
        attributes = dict(attrs)
        if tag == "img":
            section = None
            for _, class_attr in reversed(self.stack):
                section = self._section_label(class_attr)
                if section:
                    break
            parent_class = self.stack[-1][1] if self.stack else None
            self.images.append(
                {
                    "src": attributes.get("src") or "",
                    "alt": attributes.get("alt") or "",
                    "nearestSection": section,
                    # The image's own class when it has one; otherwise the wrapper (figure, tile,
                    # link) it hangs in, which is the hook the stylesheet actually targets.
                    "nearestClass": attributes.get("class") or parent_class,
                }
            )
            return
        if tag not in VOID_TAGS:
            self.stack.append((tag, attributes.get("class")))

    def handle_startendtag(self, tag: str, attrs) -> None:
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag: str) -> None:
        # Unwind to the matching open tag; the reference has a few unclosed inline elements and
        # popping blindly would corrupt the stack for everything after them.
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                return


def extract_body_images(body: str, writer) -> list[dict]:
    """Every <img> in the body, in document order, with its decoded file and its placement."""
    parser = _ImagePlacer()
    parser.feed(body)

    images: list[dict] = []
    for index, img in enumerate(parser.images):
        match = _BODY_DATA_URI_RE.match(img["src"].strip())
        if not match:
            continue  # e.g. the drawer's empty <img>, filled in by script at runtime — no asset here
        mime = match.group(1).strip().lower()
        payload = decode_payload(match.group(2))
        name = asset_name("img", payload, mime)
        writer(name, payload)
        width, height = image_size(payload)
        images.append(
            {
                "id": name.rsplit(".", 1)[0],
                "file": f"{ASSET_URL_PREFIX}/{name}",
                "mime": mime,
                "bytes": len(payload),
                "width": width,
                "height": height,
                "origin": "body",
                "bodyIndex": index,
                "alt": img["alt"],
                "nearestSection": img["nearestSection"],
                "nearestClass": img["nearestClass"],
            }
        )
    return images


# --------------------------------------------------------------------------------------------------
# shape record (unchanged contract — the rebuilt route is still diffed against it)


def extract_section_classes(html: str) -> list[str]:
    """SECTION_MARKERS, in the order they actually appear in this file."""
    hits = [
        (m.start(), value)
        for value in SECTION_MARKERS
        for m in [re.search(r'class="' + re.escape(value) + '"', html)]
        if m
    ]
    hits.sort(key=lambda pair: pair[0])
    return [value for _, value in hits]


def extract_head_meta_keys(html: str) -> list[str]:
    """The head meta this reference sets, in document order: 'title', 'canonical', name/property values."""
    head_end = html.find("</head>")
    head = html[:head_end] if head_end != -1 else html
    keys: list[str] = []
    for m in re.finditer(r"<title\b[^>]*>|<meta\b[^>]*>|<link\b[^>]*>", head, re.IGNORECASE):
        tag = m.group(0)
        if tag.lower().startswith("<title"):
            keys.append("title")
            continue
        rel = re.search(r'rel="([^"]+)"', tag, re.IGNORECASE)
        if rel and rel.group(1).lower() == "canonical":
            keys.append("canonical")
            continue
        key = re.search(r'(?:name|property)="([^"]+)"', tag, re.IGNORECASE)
        if key:
            keys.append(key.group(1))
    return keys


def extract_jsonld_types(html: str) -> list[str]:
    """The @graph @type list of the first application/ld+json block."""
    blocks = _LDJSON_RE.findall(html)
    if not blocks:
        return []
    try:
        parsed = json.loads(blocks[0])
    except json.JSONDecodeError:
        return []
    graph = parsed.get("@graph") if isinstance(parsed, dict) else None
    if not isinstance(graph, list):
        return []
    return [node.get("@type") for node in graph if isinstance(node, dict) and "@type" in node]


# --------------------------------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--reference", type=Path, default=DEFAULT_REFERENCE, help="path to the client reference HTML")
    args = parser.parse_args()

    if not args.reference.exists():
        raise SystemExit(f"reference not found: {args.reference}")

    html = args.reference.read_text(encoding="utf-8", errors="replace")

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    written: dict[str, int] = {}

    def write_asset(name: str, payload: bytes) -> None:
        """Write once. The name is the content hash, so an existing file of the right size IS this
        payload — rewriting it would only churn mtimes and make the run look non-idempotent."""
        written[name] = len(payload)
        target = ASSET_DIR / name
        if target.exists() and target.stat().st_size == len(payload):
            return
        target.write_bytes(payload)

    css_raw, style_start, style_end = extract_style_block(html)
    css, fonts, css_images = rewrite_css(css_raw, write_asset)

    # The body is everything outside the <style> block; parsing the stylesheet as markup would only
    # confuse the element stack (it contains an `<img>` inside a CSS content string).
    body = html[:style_start] + html[style_end:]
    body_images = extract_body_images(body, write_asset)
    images = css_images + body_images

    TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)
    TEMPLATE_CSS.write_text(css, encoding="utf-8")

    assets = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": "send-to-client/spokane.html",
        "fonts": fonts,
        "images": images,
    }
    paths.write_json(TEMPLATE_ASSETS, assets)

    shape = {
        "source": str(args.reference),
        "sectionClasses": extract_section_classes(html),
        "headMetaKeys": extract_head_meta_keys(html),
        "jsonldTypes": extract_jsonld_types(html),
        "cssBytesWritten": len(css.encode("utf-8")),
        "assetFilesWritten": len(written),
    }
    paths.write_json(TEMPLATE_SHAPE, shape)

    total_bytes = sum(written.values())
    print(f"wrote {len(written)} asset files to {ASSET_DIR} ({total_bytes:,} bytes)")
    print(f"  fonts: {len(fonts)}   images: {len(images)} ({len(css_images)} from css, {len(body_images)} from body)")
    print(f"wrote {TEMPLATE_CSS} ({len(css.encode('utf-8')):,} bytes, {css.count(ASSET_URL_PREFIX + '/')} asset refs)")
    print(f"wrote {TEMPLATE_ASSETS}")
    print(f"wrote {TEMPLATE_SHAPE}")

    counts: dict[str, int] = {}
    for image in images:
        counts[image["nearestSection"] or "(none)"] = counts.get(image["nearestSection"] or "(none)", 0) + 1
    print("  images per section:")
    for section, count in sorted(counts.items(), key=lambda pair: (-pair[1], pair[0])):
        print(f"    {section:<20} {count}")


if __name__ == "__main__":
    main()
