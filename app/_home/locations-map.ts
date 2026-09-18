import { HOME_HTML } from './content';
import { withEvenMapPins } from './map-pins';

/**
 * The homepage's own interactive USA map — `.cc-usmap-svg` in HOME_HTML (app/_home/content.ts) —
 * read out at render time rather than duplicated, the same "patch the generated string, never
 * hand-copy it" approach app/_home/hero.ts uses. Every state `<g>` already carries its own
 * `is-on`/`data-towns` markup baked in at scrape time, so the returned markup needs no JS to know
 * which states Chimcare serves; a consumer just needs its own CSS for `.cc-st`/`.cc-pins`/`.cc-lines`
 * (see styles/usa-map.css), since the homepage's own stylesheet (public/home/home.css) is
 * homepage-only and far too large to load on another page for one card.
 */
const MAP_START_MARKER = '<svg class="cc-usmap-svg"';
const MAP_END_MARKER = '</svg>';

export function getHomeUsaMapSvg(): string | null {
  const start = HOME_HTML.indexOf(MAP_START_MARKER);
  if (start === -1) return null;
  const end = HOME_HTML.indexOf(MAP_END_MARKER, start);
  if (end === -1) return null;
  return withEvenMapPins(HOME_HTML.slice(start, end + MAP_END_MARKER.length));
}
