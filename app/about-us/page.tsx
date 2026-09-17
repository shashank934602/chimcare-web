import type { Metadata } from 'next';
import { getHomeUsaMapSvg } from '@/app/_home/locations-map';
import { AboutPage } from '@/components/templates/AboutPage';
import type { BookingContext } from '@/lib/booking/types';
import { SITE_URL, bookingOptions } from '@/lib/content/assemble';
import { DESIGN } from '@/lib/content/design-assets';
import { buildLocationsMenu } from '@/lib/content/locations-menu';
import { getMigratedStates } from '@/lib/data/migrated-locations';
import { getPrices } from '@/lib/data/pricing';

export const dynamic = 'force-dynamic';

const canonical = `${SITE_URL}/about-us/`;
const TITLE = 'About Chimcare | Chimney Sweep, Repair & Fireplace Experts';
const DESCRIPTION =
  'Chimcare has delivered trusted chimney sweep, inspection, repair and masonry service since 1989. Meet the technicians and see where we operate.';
// The same real photo the page's own hero uses (DESIGN.cityAreas) — never a stand-in image for a
// share preview that doesn't exist.
const OG_IMAGE = DESIGN.cityAreas
  ? [{ url: DESIGN.cityAreas.src, width: DESIGN.cityAreas.width, height: DESIGN.cityAreas.height, alt: DESIGN.cityAreas.alt }]
  : undefined;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical },
  openGraph: { type: 'website', url: canonical, locale: 'en_US', title: TITLE, description: DESCRIPTION, siteName: 'Chimcare', images: OG_IMAGE },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: OG_IMAGE?.map((i) => i.url) },
};

export default async function AboutUsPage() {
  const booking = bookingOptions(await getPrices(null));
  const bookingContext: BookingContext = { pageSlug: '/about-us/', pageKind: 'hub', label: 'Chimcare · About' };
  const states = getMigratedStates().map((s) => ({ name: s.name, href: `/locations/${s.slug}/` }));

  return (
    <AboutPage
      states={states}
      heroImage={DESIGN.cityAreas}
      vanImage={DESIGN.cityTeam}
      usaMapSvg={getHomeUsaMapSvg()}
      booking={booking}
      bookingContext={bookingContext}
      locationsMenu={buildLocationsMenu()}
    />
  );
}
