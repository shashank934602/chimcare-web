/**
 * The saved homepage's awards row (app/_home/content.ts) carries WordPress's National Chimney Sweep Guild
 * "Member" mark as a blurry 144×200 image (the largest copy WordPress holds). This swaps in the vector
 * trace of the same mark (public/img/ncsg-member.svg), the file the hero badges and city pages use too.
 * HOME_HTML is generated and never hand-edited; this patches the string at render time, as hero.ts does.
 */
const OLD = /src="\/home\/aabb14f6ca52\.webp"/g;

export function withSharpAwardLogos(html: string): string {
  return html.replace(OLD, 'src="/img/ncsg-member.svg"');
}
