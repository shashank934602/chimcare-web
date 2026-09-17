import type { Metadata } from 'next';
import { ContactPage } from '@/components/templates/ContactPage';
import type { BookingContext } from '@/lib/booking/types';
import { SITE_URL, bookingOptions } from '@/lib/content/assemble';
import { DESIGN } from '@/lib/content/design-assets';
import { getPrices } from '@/lib/data/pricing';

export const dynamic = 'force-dynamic';

const canonical = `${SITE_URL}/contact-us/`;
const TITLE = 'Contact Chimcare | Chimney Sweep, Repair & Fireplace Experts';
const DESCRIPTION = 'Reach the Chimcare team by phone or online booking, or send a message with your question — we usually reply the same day.';
// This page has no hero photo of its own — reuses the same real one the About page's hero shows
// (DESIGN.cityAreas) rather than a stand-in image for a share preview that doesn't exist.
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

export default async function ContactUsPage() {
  const booking = bookingOptions(await getPrices(null));
  const bookingContext: BookingContext = { pageSlug: '/contact-us/', pageKind: 'hub', label: 'Chimcare · Contact' };

  return <ContactPage booking={booking} bookingContext={bookingContext} />;
}
