/**
 * One WordPress `post_content` body → the block stream the location template renders.
 *
 * This is a line-for-line port of `chimcare-migration/scripts/lib/content.py::parse_body`, and it
 * exists for one reason: the migration manifest (`out/04-routes.json`) is that parser's output, and
 * a page whose content comes from the database instead has to arrive at the SAME shape, or the two
 * sources cannot share a template. The Python file is the specification; when it changes, this
 * changes with it. Nothing here is an improvement on it — a "better" parse on one side is a
 * divergence, and a divergence is two templates again.
 *
 * Location bodies are WPBakery, not HTML: the copy lives inside `[vc_column_text]` wrappers with
 * `[vc_row]`, `[vc_btn]` and `[xyz-ihs]` around it. Only WPBakery ever rendered these bodies — the
 * Elementor data on the same posts is orphaned header markup — so the shortcode layer is the one
 * that has to come off.
 *
 * This module reads; it never repairs. Where a body has no heading, none is invented. Where an
 * image carries no alt, none is written for it. The stored body is never modified: stripping
 * happens on a copy, at the parse boundary.
 */

/** Bodies write most URLs absolute, a handful root-relative; the uploads live on this host either way. */
const SITE_ORIGIN = 'https://www.chimcare.com/';

/**
 * A pixel this small is a tracker or a spacer, never page imagery. Only skipped when BOTH
 * dimensions are stated and both are tiny — an unsized `<img>` is a real photo whose attributes
 * were left off, and dropping those would empty the picture bands the reference design is built on.
 */
const MIN_IMAGE_PX = 4;

/** Shortcodes whose own content is layout or a call to action, not page copy. */
const DROPPED_WITH_BODY = [
  'vc_btn', 'vc_single_image', 'vc_gallery', 'vc_video', 'xyz-ihs', 'gravityform', 'vc_raw_html',
];

/** Shortcodes that wrap real copy — the wrapper goes, the copy stays. */
const UNWRAPPED = [
  'vc_row', 'vc_row_inner', 'vc_column', 'vc_column_inner', 'vc_column_text',
  'vc_tta_section', 'vc_tta_accordion', 'vc_toggle', 'vc_tta_tabs', 'vc_tta_tab',
];

/**
 * The same entity table as the Python, in the same order — replacement is sequential, so the order
 * is part of the behaviour (`&amp;` before the numeric pass, `&#038;` spelled out rather than left
 * to it).
 */
const ENTITIES: Array<[string, string]> = [
  ['&nbsp;', ' '], ['&amp;', '&'], ['&#038;', '&'], ['&#38;', '&'], ['&quot;', '"'],
  ['&#039;', "'"], ['&#39;', "'"], ['&apos;', "'"], ['&#8217;', '\u2019'], ['&#8211;', '\u2013'],
  ['&lt;', '<'], ['&gt;', '>'],
];

/**
 * Heading, paragraph or list item, with the heading's closing tag matched by backreference so a
 * `</h3>` cannot close an `<h2>`. Groups: 1 = heading tag, 2 = heading body, 3 = paragraph body,
 * 4 = list item body. Recreated per call because `lastIndex` on a global regex is state.
 */
const blockRe = () => /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>|<p\b[^>]*>([\s\S]*?)<\/p>|<li\b[^>]*>([\s\S]*?)<\/li>/gi;
const imgTagRe = () => /<img\b[^>]*>/gi;
const unknownShortcodeRe = () => /\[\/?[a-z][a-z0-9_-]*\b[^\]]*\]/gi;
const scriptRe = () => /<(script|style|noscript)\b[\s\S]*?<\/\1>/gi;

export type WpBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'listItem'; text: string }
  | { type: 'image'; src: string; alt: string; width: number | null; height: number | null };

export type ParsedBody = {
  blocks: WpBlock[];
  h1: string | null;
  firstHeading: string | null;
  headingCount: number;
  paragraphCount: number;
  listItemCount: number;
  words: number;
  imageCount: number;
  plainText: string;
};

function decode(text: string): string {
  let out = text;
  for (const [entity, char] of ENTITIES) out = out.split(entity).join(char);
  return out.replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
}

/** Spaces and tabs collapse; newlines survive, because the leftover pass splits on them. */
function collapse(text: string): string {
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function plain(fragment: string): string {
  return collapse(decode((fragment || '').replace(/<[^>]+>/g, ' ')));
}

/** One attribute off an `<img>` tag, or null when the tag does not carry it. */
function attr(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i').exec(tag);
  if (!match) return null;
  const value = match[1];
  return value.startsWith('"') || value.startsWith("'") ? value.slice(1, -1) : value;
}

/**
 * A width/height attribute as a number. WordPress sometimes writes `100%` or an empty string, and a
 * dimension that is not a plain pixel count is no dimension at all — the template then reserves the
 * space with an aspect-ratio box instead of a wrong number.
 */
function dimension(tag: string, name: string): number | null {
  const value = (attr(tag, name) ?? '').trim();
  return /^\d+$/.test(value) ? Number(value) : null;
}

/** `urljoin(SITE_ORIGIN, src)`. A src the URL parser rejects is carried through as written. */
function absolutise(src: string): string {
  try {
    return new URL(src, SITE_ORIGIN).href;
  } catch {
    return src;
  }
}

/**
 * One `<img>` as a content block, or null when it is not page imagery.
 *
 * `alt` is whatever the tag says, including the empty string. An empty alt is a real accessibility
 * signal — it tells a screen reader the image is decorative — so it is carried as written.
 * Inventing alt text here would describe the page as this parser imagines it, not as the business
 * wrote it.
 */
export function imageBlock(tag: string): WpBlock | null {
  const src = (attr(tag, 'src') ?? '').trim();
  if (!src) return null;
  const width = dimension(tag, 'width');
  const height = dimension(tag, 'height');
  if (width !== null && height !== null && width < MIN_IMAGE_PX && height < MIN_IMAGE_PX) {
    return null; // tracking pixel or layout spacer
  }
  return {
    type: 'image',
    src: absolutise(decode(src)),
    alt: collapse(decode(attr(tag, 'alt') ?? '')),
    width,
    height,
  };
}

function stripShortcodes(src: string): string {
  let out = src;
  for (const tag of DROPPED_WITH_BODY) {
    out = out.replace(new RegExp(`\\[${tag}\\b[^\\]]*\\][\\s\\S]*?\\[/${tag}\\]`, 'gi'), ' ');
    out = out.replace(new RegExp(`\\[${tag}\\b[^\\]]*\\]`, 'gi'), ' ');
  }
  for (const tag of UNWRAPPED) {
    out = out.replace(new RegExp(`\\[/?${tag}\\b[^\\]]*\\]`, 'gi'), '\n');
  }
  // Anything still in square brackets is a shortcode this pipeline does not know; it is not copy.
  return out.replace(unknownShortcodeRe(), ' ');
}

/**
 * Parse one body into headings, paragraphs, list items and images.
 *
 * Images used to be counted and thrown away, on the plan's original decision to exclude them. That
 * was reversed in 2026-09: the migrated pages render in the client's reference design, which is
 * built around imagery, and a page stripped of it shows empty bands where a photo belongs. So the
 * markup is carried, in the position the body puts it in — an image between two sections belongs
 * between them, not appended at the end.
 */
export function parseBody(postContent: string | null | undefined): ParsedBody {
  const raw = String(postContent ?? '');

  let html = stripShortcodes(raw);
  html = html.replace(scriptRe(), ' ');
  html = html.split('\\n').join('\n'); // bodies are stored with escaped newlines

  /*
   * Blocks are collected WITH their offset in the body and sorted at the end, so that copy which
   * sits loose in a [vc_column_text] keeps its place between the headings it belongs to. Appending
   * the loose copy after the matched blocks (as the pipeline did until 2026-09) silently reordered
   * whole pages: every heading first, every paragraph afterwards, and no way to tell which belonged
   * to which. Document order is the only thing that ties a service heading to its description.
   */
  const positioned: Array<[number, number, WpBlock]> = [];
  const leftovers: Array<[number, string]> = [];
  let lastEnd = 0;

  const blocks = blockRe();
  for (let match = blocks.exec(html); match !== null; match = blocks.exec(html)) {
    leftovers.push([lastEnd, html.slice(lastEnd, match.index)]);
    lastEnd = match.index + match[0].length;
    if (match[1] !== undefined) {
      positioned.push([match.index, 0, { type: 'heading', level: Number(match[1][1]), text: plain(match[2]) }]);
    } else if (match[3] !== undefined) {
      positioned.push([match.index, 0, { type: 'paragraph', text: plain(match[3]) }]);
    } else {
      positioned.push([match.index, 0, { type: 'listItem', text: plain(match[4]) }]);
    }
  }
  leftovers.push([lastEnd, html.slice(lastEnd)]);

  // Images sort by the same source offset as everything else, so one that sits between two headings
  // stays between them. An <img> inside a <p> sorts just after that paragraph, which is where the
  // body puts it; `plain()` has already dropped the tag from the paragraph's own text.
  const imgs = imgTagRe();
  for (let match = imgs.exec(html); match !== null; match = imgs.exec(html)) {
    const block = imageBlock(match[0]);
    if (block) positioned.push([match.index, 0, block]);
  }

  // Copy that sits directly in a [vc_column_text] with no <p> around it is still copy.
  for (const [chunkStart, chunk] of leftovers) {
    // Every line of one gap sorts at that gap's start, in its own order. `plain()` rewrites the text
    // so a real per-line offset is not available, but a gap always begins before the block that ends
    // it, so (gap start, line number) orders the whole body exactly.
    const lines = plain(chunk).split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (line.length > 40) positioned.push([chunkStart, i + 1, { type: 'paragraph', text: line }]);
    }
  }

  // Stable sort on (offset, line) — the same ordering the Python applies, and the reason a service
  // heading still owns the paragraph written under it.
  positioned.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  // An image has no text of its own; an empty alt is meaningful, so it is never a reason to drop it.
  const kept = positioned
    .map(([, , block]) => block)
    .filter((b) => b.type === 'image' || b.text.length > 0);
  const headings = kept.filter((b): b is Extract<WpBlock, { type: 'heading' }> => b.type === 'heading');

  return {
    blocks: kept,
    h1: headings.find((h) => h.level === 1)?.text ?? null,
    firstHeading: headings[0]?.text ?? null,
    headingCount: headings.length,
    paragraphCount: kept.filter((b) => b.type === 'paragraph').length,
    listItemCount: kept.filter((b) => b.type === 'listItem').length,
    words: kept.reduce((n, b) => n + (b.type === 'image' ? 0 : b.text.split(/\s+/).filter(Boolean).length), 0),
    imageCount: kept.filter((b) => b.type === 'image').length,
    plainText: collapse(kept.filter((b) => b.type !== 'image').map((b) => b.text).join('\n\n')),
  };
}
