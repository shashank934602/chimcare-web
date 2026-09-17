import '@/styles/home-nav.css';
import { HeaderMenu } from '@/components/islands/HeaderMenu';
import { LocationsMenu } from '@/components/islands/LocationsMenu';
import { StickyHomeNav } from '@/components/islands/StickyHomeNav';
import { DESIGN } from '@/lib/content/design-assets';
import type { LocationsMenuData } from '@/lib/content/locations-menu';

// The homepage header's own "Call Us Now" number (app/_home/content.ts, tel:8888552889).
const CALL_PHONE = '(888) 855-2889';
const CALL_PHONE_HREF = 'tel:8888552889';

/** The homepage header's solid phone glyph (Font Awesome phone-alt, from app/_home/content.ts). */
function PhoneAltIcon() {
  return (
    <svg className="hnav-phone-ico" viewBox="0 0 512 512" aria-hidden="true">
      <path d="M497.39 361.8l-112-48a24 24 0 0 0-28 6.9l-49.6 60.6A370.66 370.66 0 0 1 130.6 204.11l60.6-49.6a23.94 23.94 0 0 0 6.9-28l-48-112A24.16 24.16 0 0 0 122.6.61l-104 24A24 24 0 0 0 0 48c0 256.5 207.9 464 464 464a24 24 0 0 0 23.4-18.6l24-104a24.29 24.29 0 0 0-14.01-27.6z" />
    </svg>
  );
}

/**
 * The homepage header card (styles/home-nav.css), for a page that carries its own nav over a hero photo
 * instead of the site header: logo, links, BBB badge and "Call Us Now" on desktop; logo, badge, call
 * button and menu toggle on tablets and phones. Place it directly in the hero section, outside `.wrap`,
 * so its width follows the homepage card rather than the page gutter. `current` marks the page's own
 * link for assistive technology; like the homepage, it is not styled differently. The host section
 * needs `z-index: 60` (the site header's layer) so the stuck card and the Locations panel stay above
 * the sections that follow it.
 */
export function HomeStyleNav({
  id,
  locationsMenu,
  current,
}: {
  id: string;
  locationsMenu: LocationsMenuData;
  current?: 'about' | 'contact';
}) {
  const linksId = `${id}-links`;
  const bbb = DESIGN.bbbBadge;
  return (
    <div className="hnav-slot">
      <div className="hnav" id={id}>
        <a className="hnav-logo" href="/">
          <span className="sr-only">Chimcare home</span>
          <img src="/img/logo.svg" alt="Chimcare" title="Chimcare" width={202} height={62} />
        </a>
        <nav className="nav hnav-links" id={linksId} aria-label="Main">
          <a href="/">Home</a>
          <a href="#">Services</a>
          <LocationsMenu data={locationsMenu} />
          <a href="/about-us/" aria-current={current === 'about' ? 'page' : undefined}>About Us</a>
          <a href="/contact-us/" aria-current={current === 'contact' ? 'page' : undefined}>Contact Us</a>
        </nav>
        <div className="hnav-actions">
          {bbb && <img className="hnav-bbb" src={bbb.src} alt={bbb.alt} title={bbb.alt} width={bbb.width} height={bbb.height} decoding="async" />}
          <a className="hnav-call" href={CALL_PHONE_HREF}>
            <PhoneAltIcon />
            <span>Call Us Now</span>
          </a>
          <a className="hnav-phone" href={CALL_PHONE_HREF} aria-label={`Call Chimcare on ${CALL_PHONE}`}>
            <PhoneAltIcon />
          </a>
          <HeaderMenu hdrId={id} menuId={linksId} icons="home" />
        </div>
      </div>
      {/* Sticks 20px from the top on scroll, as the homepage header does. */}
      <StickyHomeNav targetId={id} />
    </div>
  );
}
