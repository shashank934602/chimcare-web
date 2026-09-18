import '@/styles/page-hero.css';
import '@/styles/services.css';
import { Icon } from '@/components/chrome/Icon';
import { HomeStyleNav } from '@/components/chrome/HomeStyleNav';
import { BookingSheet } from '@/components/islands/BookingSheet';
import { FloatingCta } from '@/components/chrome/FloatingCta';
import type { BookingContext } from '@/lib/booking/types';
import type { BookingOption } from '@/lib/content/assemble';
import type { LocationsMenuData } from '@/lib/content/locations-menu';

const NATIONAL_PHONE = '1-800-362-4840';
const NATIONAL_PHONE_HREF = 'tel:18003624840';

/**
 * All eight teaser cards from the homepage's own "Our Services" section (app/_home/content.ts,
 * `.ser-box` columns — verified against the rendered homepage, not the raw HTML) — same titles,
 * copy, photos and alt text as the homepage. Reproduced with this page's own markup/classes rather
 * than the homepage's WordPress-scoped HTML, the same reasoning the Contact page's FAQ already uses
 * for the homepage's FAQ (styles/contact.css). `bookingService` maps each card to the same category
 * `data/seed/services.ts` (`serviceCategorySeed[].bookingService`) uses, so the card opens the real
 * booking sheet pre-set to that service — there is no standalone URL per service outside a city
 * (lib/content/assemble.ts), so the homepage's own cards carry no link either.
 */
const SERVICE_CARDS: Array<{
  key: string;
  title: string;
  copy: string;
  bookingService: 'sweep' | 'inspect' | 'gas' | 'quote';
  img: { src: string; alt: string; width: number; height: number };
}> = [
  {
    key: 'inspection',
    title: 'Chimney Inspection',
    copy: 'Quick response for inspecting your chimney.',
    bookingService: 'inspect',
    img: { src: '/home/2c283a5f9995.jpg', alt: 'Chimcare technician inspecting a fireplace and chimney', width: 1080, height: 1080 },
  },
  {
    key: 'sweep',
    title: 'Chimney Sweep',
    copy: 'Making sure your chimney is clean.',
    bookingService: 'sweep',
    img: { src: '/home/040b936d1160.jpg', alt: 'Chimcare technician sweeping a chimney on a roof', width: 2048, height: 2048 },
  },
  {
    key: 'repair',
    title: 'Chimney Repair',
    copy: 'Installation and repair of your chimney.',
    bookingService: 'quote',
    img: { src: '/home/2fdd5b323328.jpg', alt: 'Chimcare mason repairing a brick chimney', width: 2048, height: 2048 },
  },
  {
    key: 'fireplace-install',
    title: 'Fireplace Installation',
    copy: 'We install your new fireplace if needed.',
    bookingService: 'quote',
    img: { src: '/home/c93d19a8ba40.jpg', alt: 'New wood-burning fireplace installation', width: 1253, height: 836 },
  },
  {
    key: 'gas-inspection',
    title: 'Gas Fireplace Inspection',
    copy: 'We inspect your gas fireplace.',
    bookingService: 'gas',
    img: { src: '/home/7d80b72ab542.jpg', alt: 'Chimcare technician inspecting a gas fireplace', width: 1600, height: 900 },
  },
  {
    key: 'inserts',
    title: 'Gas & Wood Burning Inserts',
    copy: 'We do gas & wood burning inserts.',
    bookingService: 'quote',
    img: { src: '/home/3cfdf4bae361.webp', alt: 'Gas fireplace insert in a stone surround', width: 2000, height: 1125 },
  },
  {
    key: 'gas-log-sets',
    title: 'Gas Log Sets',
    copy: 'We do gas log sets for you.',
    bookingService: 'quote',
    img: { src: '/home/2d14937bb204.jpg', alt: 'Gas log set burning in a fireplace', width: 1600, height: 901 },
  },
  {
    key: 'caps',
    title: 'Chimney Caps',
    copy: 'Replacing old, damaged, or rusted chimney caps.',
    bookingService: 'quote',
    img: { src: '/home/b364b708d1c8.jpg', alt: 'Chimcare technician fitting a chimney cap on a roof', width: 1152, height: 928 },
  },
];

const BENEFITS: Array<{ icon: string; title: string; body: string }> = [
  {
    icon: 'user',
    title: 'Experienced & Certified Technicians',
    body: 'Our highly trained, certified professionals follow the highest industry standards — from a routine chimney sweep to a full fireplace installation.',
  },
  {
    icon: 'broom',
    title: 'Comprehensive Chimney Services',
    body: 'From chimney sweeping to repair and rebuilding, our full-scale chimney services improve airflow and minimize fire hazards.',
  },
  {
    icon: 'flame',
    title: 'High-Quality Fireplace Services',
    body: 'Traditional wood-burning or modern gas — we install, repair and maintain fireplaces, including custom, energy-efficient installations.',
  },
  {
    icon: 'brick',
    title: 'Quality Materials & Workmanship',
    body: 'We use only the best materials for repairs and rebuilds, delivering craftsmanship that stands the test of time.',
  },
  {
    icon: 'calc',
    title: 'Affordable & Transparent Pricing',
    body: 'Competitive pricing with no hidden fees — detailed estimates upfront, so you can budget with confidence.',
  },
  {
    icon: 'shield',
    title: 'Customer Safety & Satisfaction',
    body: 'Your safety is our priority. Every service meets the latest safety standards, and we won’t rest until you’re fully satisfied.',
  },
];

export function ServicesPage({
  booking,
  bookingContext,
  locationsMenu,
}: {
  booking: BookingOption[];
  bookingContext: BookingContext;
  locationsMenu: LocationsMenuData;
}) {
  return (
    <>
      <main id="main" className="tpl-services">
        {/* The shared photo hero (styles/page-hero.css), the About page's template. */}
        <section className="page-hero">
          <HomeStyleNav id="services-hero-nav" locationsMenu={locationsMenu} current="services" />
          <div className="wrap page-hero-body">
            <p className="page-hero-eyebrow">Chimney &amp; Fireplace Services</p>
            <h1>Professional Chimney &amp; Fireplace Services You Can Trust</h1>
            <p className="page-hero-copy">
              From routine chimney maintenance to repairs, inspections, and fireplace services, Chimcare provides professional solutions designed to
              keep your home safe, comfortable, and protected.
            </p>
            <div className="ctas">
              <a className="btn btn-primary" href="#booking" data-book>
                <Icon name="cal" />
                Schedule Your Service
              </a>
              <a className="btn btn-dark" href="#our-services">
                Explore Our Services
              </a>
            </div>
          </div>
        </section>

        <section className="section" id="our-services">
          <div className="wrap">
            <div className="svc-head reveal">
              <div>
                <p className="chip">
                  <Icon name="user" className="ico" />
                  Services
                </p>
                <h2>Our Services</h2>
                <p>
                  Certified chimney services for every part of your system — chimney sweeps, chimney inspections and chimney repair, plus
                  fireplace services from installation to gas and wood burning inserts. Regular chimney maintenance keeps your home safer all
                  year round.
                </p>
              </div>
              <a className="btn btn-primary svc-book-btn" href="#booking" data-book>
                Book Now
              </a>
            </div>
            <div className="svc-teaser-grid">
              {SERVICE_CARDS.map((c) => (
                <a
                  className="svc-teaser-card reveal"
                  key={c.key}
                  href="#booking"
                  data-book
                  data-book-service={c.bookingService}
                  aria-label={`Book ${c.title}`}
                >
                  <span className="svc-teaser-arrow" aria-hidden="true">
                    <Icon name="arrow" />
                  </span>
                  <h3>{c.title}</h3>
                  <p>{c.copy}</p>
                  <img src={c.img.src} alt={c.img.alt} title={c.img.alt} loading="lazy" decoding="async" width={c.img.width} height={c.img.height} />
                </a>
              ))}
            </div>
            <p className="svc-teaser-note reveal">
              Every service above is delivered by your nearest Chimcare crew — <a href="/locations/">find your location</a> to see local pricing and
              availability.
            </p>
          </div>
        </section>

        <section className="section tinted" id="why-choose">
          <div className="wrap why-grid">
            <div className="why-intro reveal">
              <p className="chip">
                <Icon name="shield" className="ico" />
                Why Choose
              </p>
              <h2>
                Why Choose Chim<span className="accent">care</span>?
              </h2>
              <p>
                We are reliable, fast, professional and most importantly&hellip; <strong className="accent">WE CARE ABOUT YOU</strong>. Providing
                solutions with 24/7 availability, upfront pricing, and expert service for homes and businesses.
              </p>
              <img
                className="why-art"
                src="/home/9b357801bee4.webp"
                alt="Illustrated map of Chimcare service locations"
                title="Illustrated map of Chimcare service locations"
                loading="lazy"
                decoding="async"
                width={530}
                height={530}
              />
            </div>
            <div className="why-cards">
              {BENEFITS.map((b) => (
                <div className="why-card reveal" key={b.title}>
                  <span className="why-icon">
                    <Icon name={b.icon} />
                  </span>
                  <div>
                    <h3>{b.title}</h3>
                    <p>{b.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="schedule-cta">
          <div className="wrap">
            <div className="cta-band reveal">
              <div>
                <h2>Schedule Your Service Today!</h2>
                <p>
                  Don&rsquo;t wait for chimney problems to escalate. Whether you need an inspection, a chimney sweep, or a fireplace installation,
                  Chimcare is here to help — contact us today to schedule your appointment and experience our professional service firsthand.
                </p>
              </div>
              <div className="ctas">
                <a className="btn btn-primary" href="#booking" data-book>
                  Schedule Your Service
                </a>
                <a className="btn btn-outline" href={NATIONAL_PHONE_HREF}>
                  <Icon name="phone" />
                  Call us at {NATIONAL_PHONE}
                </a>
                <a className="cta-band-link" href="/contact-us/">
                  Or reach us on the Contact page <Icon name="arrow" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <BookingSheet options={booking} context={bookingContext} />
      <FloatingCta phone={NATIONAL_PHONE} phoneHref={NATIONAL_PHONE_HREF} email="harold@chimcare.com" quoteHref="#booking" />
    </>
  );
}
