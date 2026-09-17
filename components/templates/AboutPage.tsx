import '@/styles/about.css';
import '@/styles/usa-map.css';
import type { CSSProperties } from 'react';
import { Icon } from '@/components/chrome/Icon';
import { BookingSheet } from '@/components/islands/BookingSheet';
import { FloatingCta } from '@/components/chrome/FloatingCta';
import { HeaderMenu } from '@/components/islands/HeaderMenu';
import { LocationsMenu } from '@/components/islands/LocationsMenu';
import type { BookingContext } from '@/lib/booking/types';
import type { BookingOption } from '@/lib/content/assemble';
import { DESIGN, type DesignAsset } from '@/lib/content/design-assets';
import type { LocationsMenuData } from '@/lib/content/locations-menu';

/** The homepage header's solid phone glyph (Font Awesome phone-alt, from app/_home/content.ts). */
function PhoneAltIcon() {
  return (
    <svg className="about-hero-phone-ico" viewBox="0 0 512 512" aria-hidden="true">
      <path d="M497.39 361.8l-112-48a24 24 0 0 0-28 6.9l-49.6 60.6A370.66 370.66 0 0 1 130.6 204.11l60.6-49.6a23.94 23.94 0 0 0 6.9-28l-48-112A24.16 24.16 0 0 0 122.6.61l-104 24A24 24 0 0 0 0 48c0 256.5 207.9 464 464 464a24 24 0 0 0 23.4-18.6l24-104a24.29 24.29 0 0 0-14.01-27.6z" />
    </svg>
  );
}

const NATIONAL_PHONE = '1-800-362-4840';
const NATIONAL_PHONE_HREF = 'tel:18003624840';
// The reference's own hero phone — already the homepage's Call Us Now number (tel:8888552889).
const HERO_PHONE = '(888) 855-2889';
const HERO_PHONE_HREF = 'tel:8888552889';
// The corporate address the footer already carries — kept in step with it rather than a second,
// different address, so the site states one home base everywhere.
const HQ_ADDRESS = '12236 SW Garden Place, Tigard, OR 97223';

// The homepage's own "Chimcare Headquarters" photo (app/_home/content.ts), reused verbatim — same
// real photo, same crop, same real building/team it already shows visitors on the home page.
const HQ_PHOTO = { src: '/home/dc1218c70755.avif', alt: 'The Chimcare team outside Chimcare headquarters', w: 1024, h: 576 };

// Verbatim from the live site's "Meet Some of Our Chimney Experts" testimonial slider
// (chimcare.com), including its "N+ Job Completed" wording — real technicians, real photos.
const TEAM = [
  {
    name: 'Dan Peters',
    jobs: '85+ Job Completed',
    rating: '5.0',
    bio: 'Dan specializes in quick emergency fixes and complex installations with precision and efficiency.',
    src: '/img/team/dan-peters.webp',
    alt: 'Dan Peters, Chimcare technician',
    w: 696,
    h: 1024,
  },
  {
    name: 'Miguel Ramirez',
    jobs: '200+ Job Completed',
    rating: '4.9',
    bio: 'Miguel is known for his expertise in chimney inspection and repair, keeping fireplaces and vent systems safe.',
    src: '/img/team/miguel-ramirez.webp',
    alt: 'Miguel Ramirez, Chimcare technician',
    w: 819,
    h: 1024,
  },
  {
    name: 'Kevin Robson',
    jobs: '175+ Job Completed',
    rating: '4.7',
    bio: 'Kev ensures chimneys stay safe, efficient, and built to last with his skilled repair work and sharp eye for structural issues.',
    src: '/img/team/kevin-robson.webp',
    alt: 'Kevin Robson, Chimcare technician',
    w: 696,
    h: 1024,
  },
  {
    name: 'John Carlson',
    jobs: '150+ Job Completed',
    rating: '4.8',
    bio: 'John is known for his dependable workmanship and commitment to getting every job done right the first time.',
    src: '/img/team/john-carlson.png',
    alt: 'John Carlson, Chimcare technician',
    w: 696,
    h: 1024,
  },
  {
    name: 'James Framer',
    jobs: '190+ Job Completed',
    rating: '4.8',
    bio: 'With more than 20 years in the industry, James offers expert knowledge and proven results.',
    src: '/img/team/james-framer.png',
    alt: 'James Framer, Chimcare technician',
    w: 696,
    h: 1024,
  },
  {
    name: 'Mark Perez',
    jobs: '100+ Job Completed',
    rating: '4.9',
    bio: 'Mark delivers reliable solutions with sharp attention to detail and a strong problem-solving approach.',
    src: '/img/team/mark-perez.png',
    alt: 'Mark Perez, Chimcare technician',
    w: 696,
    h: 1024,
  },
  {
    name: 'Gary Witherson',
    jobs: '220+ Job Completed',
    rating: '4.7',
    bio: 'Gary has proudly served Chimcare for more than 25 years, delivering trusted experience every step of the way.',
    src: '/img/team/gary-witherson.png',
    alt: 'Gary Witherson, Chimcare technician',
    w: 696,
    h: 1024,
  },
];

function Stars({ rating }: { rating: string }) {
  const filled = Math.round(parseFloat(rating));
  return (
    <span className="stars" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={i < filled ? 'on' : 'off'} fill="currentColor">
          <path d="M10 1.6l2.51 5.08 5.61.82-4.06 3.96.96 5.59L10 14.3l-5.02 2.64.96-5.59L1.88 7.5l5.61-.82L10 1.6z" />
        </svg>
      ))}
    </span>
  );
}

export function AboutPage({
  states,
  heroImage,
  vanImage,
  usaMapSvg,
  booking,
  bookingContext,
  locationsMenu,
}: {
  states: Array<{ name: string; href: string }>;
  heroImage: DesignAsset | null;
  vanImage: DesignAsset | null;
  usaMapSvg: string | null;
  booking: BookingOption[];
  bookingContext: BookingContext;
  locationsMenu: LocationsMenuData;
}) {
  const heroStyle = heroImage ? ({ '--about-hero-img': `url(${heroImage.src})` } as CSSProperties) : undefined;
  return (
    <>
      <main id="main" className="tpl-about">
        <section className={heroImage ? 'about-hero' : 'about-hero no-photo'} style={heroStyle}>
          {/* The same nav card as the homepage header (app/_home/content.ts): logo, links, BBB badge and
              "Call Us Now" on desktop; logo, badge, call button and menu toggle on tablets and phones.
              It sits outside `.wrap` so its width can follow the homepage card, not the page gutter. */}
          <div className="about-hero-nav" id="about-hero-nav">
            <a className="about-hero-logo" href="/">
              <span className="sr-only">Chimcare home</span>
              <img src="/img/logo.svg" alt="Chimcare" title="Chimcare" width={202} height={62} />
            </a>
            <nav className="nav about-hero-links" id="about-hero-links" aria-label="Main">
              <a href="/">Home</a>
              <a href="#">Services</a>
              <LocationsMenu data={locationsMenu} />
              <a href="/about-us/" aria-current="page">About Us</a>
              <a href="/contact-us/">Contact Us</a>
            </nav>
            <div className="about-hero-actions">
              {DESIGN.bbbBadge && (
                <img
                  className="about-hero-bbb"
                  src={DESIGN.bbbBadge.src}
                  alt={DESIGN.bbbBadge.alt}
                  title={DESIGN.bbbBadge.alt}
                  width={DESIGN.bbbBadge.width}
                  height={DESIGN.bbbBadge.height}
                  decoding="async"
                />
              )}
              <a className="about-hero-call" href={HERO_PHONE_HREF}>
                <PhoneAltIcon />
                <span>Call Us Now</span>
              </a>
              <a className="about-hero-phone" href={HERO_PHONE_HREF} aria-label={`Call Chimcare on ${HERO_PHONE}`}>
                <PhoneAltIcon />
              </a>
              <HeaderMenu hdrId="about-hero-nav" menuId="about-hero-links" icons="home" />
            </div>
          </div>
          <div className="wrap">
            <p className="about-hero-eyebrow">About Chimcare</p>
            <h1>Care You Can Trust. People Who Truly Care.</h1>
            <p className="lede">Support That Feels Like Home.</p>
            <div className="ctas">
              <a className="btn btn-primary" href={HERO_PHONE_HREF}>
                <Icon name="phone" />
                Call Now {HERO_PHONE}
              </a>
              <a className="btn btn-dark" href="#booking" data-book>
                <em className="fast">Fast</em> Online Booking
              </a>
            </div>
          </div>
        </section>

        <section className="section" id="team">
          <div className="wrap">
            <div className="sec-top center">
              <p className="chip">
                <Icon name="handshake" className="ico" />
                Expert Technicians
              </p>
              <h2>Meet Some of Our Chimney Experts</h2>
              <p>
                Our certified technicians bring years of expertise and dedication to delivering top-quality service for all chimney and
                fireplace needs.
              </p>
            </div>
            <div className="team-grid">
              {TEAM.map((t) => (
                <article className="team-card" key={t.name} tabIndex={0}>
                  <div className="team-flip">
                    <div className="team-face team-face-front">
                      <img src={t.src} alt={t.alt} title={t.alt} loading="lazy" decoding="async" width={t.w} height={t.h} />
                      <div className="team-front-name">
                        <h3>{t.name}</h3>
                      </div>
                    </div>
                    <div className="team-face team-face-back">
                      <h3>{t.name}</h3>
                      <div className="team-meta">
                        <span className="team-jobs">{t.jobs}</span>
                        <span className="team-rating">
                          <Stars rating={t.rating} />({t.rating})
                        </span>
                      </div>
                      <p>{t.bio}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section tinted">
          <div className="wrap">
            <div className="cta-band">
              <div>
                <h2>Ready to Get Started?</h2>
                <p>Book your appointment online in minutes — real-time scheduling with instant confirmation.</p>
              </div>
              <div className="ctas">
                <a className="btn btn-primary" href="#booking" data-book>
                  <em className="fast">Fast</em> Online Booking
                </a>
                <a className="btn btn-outline" href={NATIONAL_PHONE_HREF}>
                  <Icon name="phone" />
                  {NATIONAL_PHONE}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="who-we-are">
          <div className="wrap about-grid">
            <div className="about-copy">
              <p className="chip">About Us</p>
              <h2>Who We Are</h2>
              <p>
                Chimcare is a trusted name in the industry, delivering top-quality chimney inspection, maintenance, and repair services for
                both residential and commercial properties. With years of hands-on experience, we take pride in providing safe, reliable, and
                customer-focused solutions that protect homes and buildings year-round. Whether it&rsquo;s a routine inspection, a necessary
                repair, or a full system restoration, our skilled team is committed to keeping your chimney and venting systems operating
                efficiently and safely.
              </p>
              <div className="about-trust">
                <span className="about-trust-item">
                  <Icon name="cal" className="ico" />
                  Since 1989
                </span>
                <span className="about-trust-item">
                  <Icon name="shield" className="ico" />
                  Certified &amp; Insured
                </span>
                <span className="about-trust-item">
                  <Icon name="check" className="ico" />
                  78,000+ Happy Clients
                </span>
              </div>
            </div>
            {vanImage && (
              <div className="about-photos">
                <figure>
                  <img src={vanImage.src} alt={vanImage.alt} title={vanImage.alt} loading="lazy" decoding="async" width={vanImage.width} height={vanImage.height} />
                </figure>
                <div className="about-badge">
                  <span className="n">78,000+</span>
                  <span className="lbl">Happy Clients<br />Since 1989</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section tinted" id="locations">
          <div className="wrap">
            <div className="sec-top center">
              <p className="chip">
                <Icon name="pin" className="ico" />
                Our Location
              </p>
              <h2>Where Does Chimcare Operate?</h2>
              <p>We proudly serve multiple locations across the US, ensuring prompt and reliable chimney services near you.</p>
            </div>
            <div className="loc-grid">
              <div className="loc-card">
                <div className="usmap-card">
                  {usaMapSvg && <div className="usmap-frame" dangerouslySetInnerHTML={{ __html: usaMapSvg }} />}
                  <form className="usmap-search" action="/locations/" method="get">
                    <input
                      type="search"
                      name="s"
                      placeholder="Search by City or Zip"
                      aria-label="Search by city or zip"
                      autoComplete="off"
                    />
                    <button type="submit">Search</button>
                  </form>
                </div>
                <div className="loc-card-body">
                  <h3>Chimcare Locations</h3>
                  <p className="addr">
                    <Icon name="pin" className="ico" />
                    Find us in over {states.length} states across the U.S.
                  </p>
                  <a className="btn btn-primary btn-sm" href="/locations/">
                    View All Locations
                    <Icon name="arrow" />
                  </a>
                </div>
              </div>
              <div className="loc-card">
                <figure className="loc-card-photo">
                  <img
                    src={HQ_PHOTO.src}
                    alt={HQ_PHOTO.alt}
                    title={HQ_PHOTO.alt}
                    loading="lazy"
                    decoding="async"
                    width={HQ_PHOTO.w}
                    height={HQ_PHOTO.h}
                  />
                </figure>
                <div className="loc-card-body">
                  <h3>Chimcare Headquarters</h3>
                  <p className="addr">
                    <Icon name="pin" className="ico" />
                    {HQ_ADDRESS}
                  </p>
                  <a className="btn btn-outline btn-sm" href={NATIONAL_PHONE_HREF}>
                    <Icon name="phone" />
                    {NATIONAL_PHONE}
                  </a>
                </div>
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
