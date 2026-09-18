import { Icon } from './Icon';
import { HeaderMenu } from '@/components/islands/HeaderMenu';
import { LocationsMenu } from '@/components/islands/LocationsMenu';
import { NavActive } from '@/components/islands/NavActive';
import type { LocationsMenuData } from '@/lib/content/locations-menu';

/**
 * The one site header, shared by every template.
 *
 * The city mock (the newest of the three) adds three elements the earlier hub and state mocks do not
 * have: the BBB accreditation badge, an icon-only call button for narrow screens, and a booking CTA
 * labelled "Fast Online Booking". All three are optional here and default to the older mocks'
 * behaviour, so a template opts in rather than every page silently changing.
 *
 * `bbb` carries a real image path or nothing. No accreditation, certification or award is asserted
 * by markup alone — if the asset is not supplied the badge is not rendered.
 */
export function Header({
  phone,
  phoneHref,
  bbb,
  bookLabel,
  locationsMenu,
}: {
  phone: string;
  phoneHref: string;
  bbb?: { src: string; alt: string; width: number; height: number };
  bookLabel?: 'schedule' | 'fast-online-booking';
  locationsMenu: LocationsMenuData;
}) {
  return (
    <header className="hdr" id="hdr">
      <div className="wrap">
        <NavActive />
        <HeaderMenu />
        <a className="logo" href="/">
          <span className="sr-only">Chimcare home</span>
          <img src="/img/logo.svg" alt="Chimcare" title="Chimcare" width={202} height={62} />
        </a>
        <div className="hdr-menu" id="hdr-menu">
          <nav className="nav" aria-label="Main">
            <a href="/">Home</a>
            <a href="/services/">Services</a>
            <LocationsMenu data={locationsMenu} />
            <a href="/about-us/">About Us</a>
            <a href="/contact-us/">Contact</a>
          </nav>
          <a className="phone phone-panel" href={phoneHref}>
            <Icon name="phone" />
            {phone}
          </a>
          {/*
            On phones the badge moves into this panel with the phone number, so the bar keeps only the
            menu button and the logo. Same file as the one in the bar, so nothing extra downloads.

            Its intrinsic size is declared at the size it is actually shown, not the asset's 300x300.
            The first version inherited 300x300 and was held back only by a CSS rule; a stale or late
            stylesheet then rendered a 300px badge across the middle of the header. Sized this way the
            worst case is a 34px badge in the wrong place, not a broken header.

            The `hidden` attribute is deliberately NOT used: the reset declares
            `[hidden]{display:none!important}`, so nothing could reveal it again at phone widths.
          */}
          {bbb && (
            <img
              className="hdr-bbb-panel"
              src={bbb.src}
              width={22}
              height={34}
              decoding="async"
              alt={bbb.alt} title={bbb.alt}
            />
          )}
        </div>
        {bbb && <img className="hdr-bbb" src={bbb.src} width={bbb.width} height={bbb.height} decoding="async" alt={bbb.alt} title={bbb.alt} />}
        <a className="phone phone-bar" href={phoneHref}>
          <Icon name="phone" />
          {phone}
        </a>
        <a className="hdr-call" href={phoneHref} aria-label={`Call Chimcare on ${phone}`}>
          <Icon name="phone" />
        </a>
        {bookLabel === 'fast-online-booking' ? (
          <a className="btn btn-primary hdr-book" href="#booking" data-book>
            <em className="fast">Fast</em> Online Booking
          </a>
        ) : (
          <a className="btn btn-primary" href="#booking" data-book>
            Schedule Service
          </a>
        )}
      </div>
    </header>
  );
}
