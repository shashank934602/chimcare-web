import type { Metadata } from 'next';
import { ServicesPage } from '@/components/templates/ServicesPage';
import type { BookingContext } from '@/lib/booking/types';
import { SITE_URL, bookingOptions } from '@/lib/content/assemble';
import { buildLocationsMenu } from '@/lib/content/locations-menu';
import { getPrices } from '@/lib/data/pricing';

export const dynamic = 'force-dynamic';

const canonical = `${SITE_URL}/services/`;
const TITLE = 'Chimney & Fireplace Services | Chimcare';
const DESCRIPTION =
  'Chimney sweeps, inspections, repairs, rebuilding and fireplace installation from certified Chimcare technicians. Transparent pricing — schedule your service today.';
// The same hero photo the homepage, About and Contact pages already share (public/img/hero-chimney-sweep.jpg).
const OG_IMAGE = [{ url: '/img/hero-chimney-sweep.jpg', width: 2000, height: 1589, alt: 'A Chimcare technician servicing a chimney on a rooftop' }];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical },
  openGraph: { type: 'website', url: canonical, locale: 'en_US', title: TITLE, description: DESCRIPTION, siteName: 'Chimcare', images: OG_IMAGE },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: OG_IMAGE.map((i) => i.url) },
};

export default async function ServicesRoute() {
  const booking = bookingOptions(await getPrices(null));
  const bookingContext: BookingContext = { pageSlug: '/services/', pageKind: 'hub', label: 'Chimcare · Services' };

  return <ServicesPage booking={booking} bookingContext={bookingContext} locationsMenu={buildLocationsMenu()} />;
}
