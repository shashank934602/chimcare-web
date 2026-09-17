import { DESIGN } from '@/lib/content/design-assets';

/**
 * The BBB accreditation badge in the homepage's saved WordPress header, beside its phone buttons —
 * the same badge every other page's header (components/chrome/Header.tsx) already shows next to its
 * phone number. HOME_HTML (app/_home/content.ts) is generated and never hand-edited, so the badge is
 * spliced in at render time, the same approach as app/_home/hero.ts and nav-links.ts.
 *
 * Two buttons carry it: the desktop "Call Us Now" pill (widget 6e7e207) and the phone-only call button
 * beside the menu toggle (widget c398819). Each widget's button wrapper gets the badge as its first
 * child; overrides.css lays the wrapper out as a row. A marker that is not found leaves the markup
 * unchanged rather than guessing where to put the badge.
 */
const WIDGETS = ['elementor-element-6e7e207', 'elementor-element-c398819'];
const WRAPPER = '<div class="elementor-button-wrapper">';

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

export function withHeaderBbb(html: string): string {
  const bbb = DESIGN.bbbBadge;
  if (!bbb) return html;
  const img = `<img class="cc-hdr-bbb" src="${attr(bbb.src)}" alt="${attr(bbb.alt)}" title="${attr(bbb.alt)}" width="${bbb.width}" height="${bbb.height}" decoding="async">`;
  let out = html;
  for (const widget of WIDGETS) {
    const at = out.indexOf(widget);
    if (at < 0) continue;
    const wrap = out.indexOf(WRAPPER, at);
    if (wrap < 0) continue;
    const insertAt = wrap + WRAPPER.length;
    out = out.slice(0, insertAt) + img + out.slice(insertAt);
  }
  return out;
}
