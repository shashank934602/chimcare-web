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

export const DESIGN = {
  /** Header accreditation badge. Rendered only when the real asset is present. */
  bbbBadge: asset('5333e04be04a.webp', 300, 300),
  /** The three award marks the city hero shows beside the rating. */
  awards: [
    asset('1660ae673f91.webp', 113, 200),
    asset('858464cfd64c.webp', 177, 200),
    asset('164602b6aa3b.webp', 148, 200),
  ].filter((a): a is DesignAsset => a !== null),
  /** Illustration beside the city page's service list (`#ph-services`). */
  cityServices: asset('e24c0a2f9fb1.webp', 1200, 900),
  /** Illustration in the city page's service-area section (`#ph-areas`). */
  cityAreas: asset('f6f84751cc7f.webp', 1400, 788),
  /** The crew photograph in the city page's introduction. */
  cityTeam: asset('68c77f141766.jpg', 1600, 905),
} as const;
