import './globals.css';
// The header's Locations mega menu carries a Leaflet mini map on every page, same as the state
// hub's own map — both need Leaflet's stylesheet, so it loads here rather than per-route.
import 'leaflet/dist/leaflet.css';
import type { Metadata } from 'next';
import { Sprite } from '@/components/chrome/Sprite';
import { Header } from '@/components/chrome/Header';
import { Footer } from '@/components/chrome/Footer';
import { StickyBar } from '@/components/chrome/StickyBar';
import { Reveal } from '@/components/islands/Reveal';
import { MobileMenu } from '@/components/islands/MobileMenu';
import { getMigratedStates } from '@/lib/data/migrated-locations';
import { buildLocationsMenu } from '@/lib/content/locations-menu';
import { DESIGN } from '@/lib/content/design-assets';
import { SITE_URL } from '@/lib/content/assemble';

const NATIONAL_PHONE = '1-800-362-4840';

// Every page's `openGraph`/`twitter` image is given as a site-relative path (e.g. "/img/...") —
// without this, Next has no origin to resolve those against and falls back to localhost, so the
// image never actually loads once shared. Same real domain every canonical URL already uses.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The footer lists every state that has migrated location pages, each linked to its hub, with
  // every one of its real cities (the same migrated-location data the location hubs read) so
  // "Service Areas" never shows a placeholder — or a truncated — city list.
  const states = getMigratedStates().map((s) => ({
    name: s.name,
    href: `/locations/${s.slug}/`,
    cities: s.cities.map((c) => ({ name: c.name, href: c.href })),
  }));
  const locationsMenu = buildLocationsMenu();
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <a className="skip" href="#main">Skip to content</a>
        <Sprite />
        {/* One header for every template. The BBB badge renders only because the real approved asset
            exists in the design mocks; with no asset it is omitted, never drawn. */}
        <Header
          phone={NATIONAL_PHONE}
          phoneHref="tel:18003624840"
          bbb={DESIGN.bbbBadge ?? undefined}
          bookLabel="fast-online-booking"
          locationsMenu={locationsMenu}
        />
        {children}
        <Footer states={states} />
        <StickyBar phoneHref="tel:18003624840" />
        {/* The tablet/phone menu every header's toggle opens. */}
        <MobileMenu data={locationsMenu} />
        <Reveal />
      </body>
    </html>
  );
}
