import manifest from '@/data/mock-assets.json';

/**
 * The approved design assets, addressed by the role they play rather than by filename.
 *
 * `scripts/extract-mock-assets.mjs` writes both `public/img/mock/*` and `data/mock-assets.json`
 * straight out of the design mocks, byte-for-byte, under a content-hash name. This module is the
 * only place a hash appears, so a template asks for `DESIGN.bbbBadge` and never for a file.
 *
 * Every entry keeps the alt text the designer wrote. Alt text is content: it is carried across, not
 * rewritten. If an asset is ever missing from the manifest the lookup returns null and the caller
 * renders nothing — a missing badge is never replaced by a stand-in, because a trust mark that is
 * not the real one is a false claim.
 */
export type DesignAsset = { src: string; alt: string; width: number; height: number };

type ManifestEntry = { url: string; alt: string; width: number | null; height: number | null };
const ASSETS = manifest as unknown as Record<string, ManifestEntry>;

function asset(name: string, fallbackW: number, fallbackH: number): DesignAsset | null {
  const a = ASSETS[name];
  if (!a) return null;
  return { src: a.url, alt: a.alt, width: a.width ?? fallbackW, height: a.height ?? fallbackH };
}

/** The eight category tiles the mock shows above the service grid, in the mock's own order. */
const TILES: Array<{ key: string; name: string; src: string; alt: string }> = [
  { key: 'sweep', name: 'Chimney Sweep', src: '/img/tile-sweep.jpg', alt: 'Chimcare technician sweeping a chimney from the roof' },
  { key: 'inspection', name: 'Chimney Inspection', src: '/img/tile-inspection.jpg', alt: 'Technician inspecting a fireplace and documenting findings' },
  { key: 'repair', name: 'Chimney Repair', src: '/img/tile-repair.jpg', alt: 'Mason repairing a masonry chimney on a rooftop' },
  { key: 'gas', name: 'Gas Fireplace Service', src: '/img/tile-gas.jpg', alt: 'Serviced gas fireplace burning behind a screen' },
  { key: 'gas-inserts', name: 'Gas Fireplace Inserts', src: '/img/tile-gas-inserts.jpg', alt: 'Gas fireplace insert set into a stone surround' },
  { key: 'wood-inserts', name: 'Wood Burning Inserts', src: '/img/tile-wood-inserts.jpg', alt: 'Wood burning insert with a fire lit in a brick hearth' },
  { key: 'caps', name: 'Chimney Caps', src: '/img/tile-caps.jpg', alt: 'Stainless chimney cap fitted to a masonry flue' },
  { key: 'outdoor', name: 'Outdoor Fireplaces', src: '/img/tile-outdoor.jpg', alt: 'Outdoor masonry fireplace built into a patio' },
];

export const DESIGN = {
  /** Header accreditation badge. The business's own logo, traced to a transparent SVG (public/img/bbb-logo.svg)
   *  from bbb-logo.png so it carries no white disc on dark or tinted backgrounds. */
  bbbBadge: { src: '/img/bbb-logo.svg', alt: 'BBB Accredited Business', width: 260, height: 396 } as DesignAsset,
  /** The three award marks the city hero shows beside the rating. The Guild mark is NCSG's own emblem
   *  (public/img/ncsg-logo.webp, from ncsg.org): the mock's copy was a blurry 113×200 "MEMBER" mark. */
  awards: [
    { src: '/img/ncsg-logo.webp', alt: 'National Chimney Sweep Guild member', width: 432, height: 592 } as DesignAsset,
    asset('858464cfd64c.webp', 177, 200),
    asset('164602b6aa3b.webp', 148, 200),
  ].filter((a): a is DesignAsset => a !== null),
  /** Illustration beside the city page's service list (`#ph-services`). */
  cityServices: asset('e24c0a2f9fb1.webp', 1200, 900),
  /** Illustration in the city page's service-area section (`#ph-areas`). */
  cityAreas: asset('f6f84751cc7f.webp', 1400, 788),
  /** The crew photograph in the city page's introduction. */
  cityTeam: asset('68c77f141766.jpg', 1600, 905),
  /** The hero photograph the mock ships. Used where a page has no distinct image of its own. */
  cityHero: asset('398d30b9b709.jpg', 1000, 749),
  /** The illustration in the dark "why homeowners trust us" band. */
  trustArt: { src: '/img/trust-art.webp', alt: 'Local and trusted, dust-free cleaning, safety first, transparent pricing', width: 361, height: 302 } as DesignAsset,
  /** The eight category tiles above the service grid. */
  tiles: TILES,
} as const;
