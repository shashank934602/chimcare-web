/**
 * The sweep pins on the homepage's USA map (`.cc-usmap-svg .cc-pins`, app/_home/content.ts), all one
 * size. The saved map scaled each pin to its state (0.41× for New Hampshire up to 2.62× for Montana's
 * neighbours), so small states carried specks and large ones giants. Every pin now uses the same scale,
 * re-centred on the point its state's pin was centred on, so it stays over the same state.
 *
 * HOME_HTML is generated and never hand-edited; this patches the string at render time, as hero.ts and
 * nav-links.ts do. Used by the homepage and by the About page's copy of the map (locations-map.ts).
 */

/** `#cc-sweep`'s bounding box in its own units (measured with getBBox in the rendered map). */
const SWEEP_BOX = { x: 1.6203, y: 2.2852, w: 24.1539, h: 40.7617 };
/** The middle of the saved pins' range (0.41–2.62). */
const PIN_SCALE = 1.7;

const PIN = /<use href="#cc-sweep" transform="translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)"/g;

export function withEvenMapPins(html: string, scale: number = PIN_SCALE): string {
  const cx0 = SWEEP_BOX.x + SWEEP_BOX.w / 2;
  const cy0 = SWEEP_BOX.y + SWEEP_BOX.h / 2;
  return html.replace(PIN, (_m, tx: string, ty: string, s: string) => {
    const old = Number(s);
    const cx = Number(tx) + cx0 * old; // the pin's centre in map units
    const cy = Number(ty) + cy0 * old;
    const nx = (cx - cx0 * scale).toFixed(1);
    const ny = (cy - cy0 * scale).toFixed(1);
    return `<use href="#cc-sweep" transform="translate(${nx} ${ny}) scale(${scale})"`;
  });
}
