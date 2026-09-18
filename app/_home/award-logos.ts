/**
 * The saved homepage's awards row (app/_home/content.ts) carries WordPress's National Chimney Sweep Guild
 * mark, a blurry 144×200 image (the largest copy WordPress holds). This swaps in NCSG's own emblem at
 * 432×592, the same file the hero badges and the city pages use (lib/content/design-assets.ts).
 * HOME_HTML is generated and never hand-edited; this patches the string at render time, as hero.ts does.
 */
const OLD = /src="\/home\/aabb14f6ca52\.webp"/g;

export function withSharpAwardLogos(html: string): string {
  return html.replace(OLD, 'src="/img/ncsg-logo.webp"');
}
