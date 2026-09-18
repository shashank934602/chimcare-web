'use client';

import { useEffect, useRef, useState } from 'react';
import '@/styles/home-nav.css';
import '@/styles/mobile-menu.css';
import { Icon } from '@/components/chrome/Icon';
import type { LocationsMenuData } from '@/lib/content/locations-menu';

/** Opens (`open: true`) or closes the menu. Every menu toggle on the site sends it. */
export const MOBILE_MENU_EVENT = 'chimcare:mobile-menu';
/** Sent by the menu whenever it opens or closes, so each toggle can keep `aria-expanded` in step. */
export const MOBILE_MENU_STATE_EVENT = 'chimcare:mobile-menu-state';

export const openMobileMenu = () => document.dispatchEvent(new CustomEvent(MOBILE_MENU_EVENT, { detail: { open: true } }));

// The footer's own contact block and trust row (components/chrome/Footer.tsx), and the award badges the
// location pages already show (components/sections/shared.tsx): the same facts, not new ones.
const PHONE = '1-800-362-4840';
const PHONE_HREF = 'tel:18003624840';
const EMAIL = 'harold@chimcare.com';
const ADDRESS = ['12236 SW Garden Place', 'Tigard, OR 97223'];
const TRUST = [
  { icon: 'cal', label: 'Since 1989' },
  { icon: 'shield', label: 'Certified & Insured' },
  { icon: 'check', label: '78,000+ Happy Clients' },
];
const BADGES = [
  { src: '/img/bbb-logo.svg', alt: 'BBB Accredited Business', width: 260, height: 396 },
  { src: '/img/ncsg-member.svg', alt: 'National Chimney Sweep Guild member', width: 1152, height: 1600 },
  { src: '/reference/img-858464cf.webp', alt: 'Angie’s List Super Service Award 2020', width: 177, height: 200 },
  { src: '/reference/img-164602b6.webp', alt: 'Angi Super Service Award 2021', width: 148, height: 200 },
];

/**
 * The full-screen menu for tablets and phones, rendered once in the root layout. The toggles of all three
 * headers open it (the homepage's Elementor toggle, the About/Contact card and the site header), so every
 * page gets the same menu: the nav links, Locations opening onto every state, call and booking buttons,
 * the corporate contact details, the trust facts and the badges.
 *
 * The links are in the server HTML; the island only shows and hides the panel. It closes on a link, on
 * Escape, on the close button and when the window grows past the tablet breakpoint, and hands focus
 * back to whatever opened it.
 */
export function MobileMenu({ data }: { data: LocationsMenuData }) {
  const [open, setOpen] = useState(false);
  const [statesOpen, setStatesOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const next = (e as CustomEvent<{ open?: boolean }>).detail?.open ?? true;
      if (next) opener.current = document.activeElement as HTMLElement | null;
      setOpen(next);
    };
    document.addEventListener(MOBILE_MENU_EVENT, onEvent);
    return () => document.removeEventListener(MOBILE_MENU_EVENT, onEvent);
  }, []);

  useEffect(() => {
    document.dispatchEvent(new CustomEvent(MOBILE_MENU_STATE_EVENT, { detail: { open } }));
    if (!open) {
      setStatesOpen(false);
      return;
    }
    const body = document.body;
    body.classList.add('no-scroll', 'mm-lock');
    panelRef.current?.querySelector<HTMLElement>('.mm-close')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const wide = window.matchMedia('(min-width: 1025px)');
    const onWide = () => wide.matches && setOpen(false);
    document.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    return () => {
      body.classList.remove('no-scroll', 'mm-lock');
      document.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
      opener.current?.focus?.();
    };
  }, [open]);

  // Following any link or button inside closes the menu (in-page anchors and the booking sheet included).
  const onClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  };

  return (
    <div
      className={open ? 'mm is-open' : 'mm'}
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
      inert={!open}
      ref={panelRef}
      onClick={onClick}
    >
      <div className="mm-top">
        <a className="mm-logo" href="/">
          <img src="/img/logo.svg" alt="Chimcare" title="Chimcare" width={202} height={62} />
        </a>
        <button className="mm-close" type="button" aria-label="Close menu" onClick={() => setOpen(false)}>
          <Icon name="x" />
        </button>
      </div>

      <div className="mm-body">
        <nav className="mm-nav" aria-label="Mobile">
          <a href="/">Home</a>
          <a href="/chimcare-services/">Services</a>
          <div className={statesOpen ? 'mm-sub is-open' : 'mm-sub'}>
            <button type="button" className="mm-sub-head" aria-expanded={statesOpen} aria-controls="mm-states" onClick={() => setStatesOpen((v) => !v)}>
              Locations
              <Icon name={statesOpen ? 'minus' : 'plus'} />
            </button>
            <ul className="mm-states" id="mm-states">
              {data.states.map((s) => (
                <li key={s.code}>
                  <a href={s.href}>
                    <Icon name="pin" />
                    {s.name}
                  </a>
                </li>
              ))}
              <li className="mm-states-all">
                <a href={data.viewAllHref}>
                  View all locations
                  <Icon name="arrow" />
                </a>
              </li>
            </ul>
          </div>
          <a href="/about-us/">About Us</a>
          <a href="/contact-us/">Contact Us</a>
        </nav>

        <div className="mm-ctas">
          <a className="mm-btn mm-btn-book" href="#booking" data-book-sheet>
            <Icon name="cal" />
            Book Online
          </a>
          <a className="mm-btn mm-btn-call" href={PHONE_HREF}>
            <Icon name="phone" />
            Call {PHONE}
          </a>
        </div>

        <section className="mm-block" aria-label="Contact Chimcare">
          <h2>Contact Us</h2>
          <ul className="mm-contact">
            <li>
              <span className="mm-ico"><Icon name="pin" /></span>
              <span>Corporate Office<br />{ADDRESS[0]}<br />{ADDRESS[1]}</span>
            </li>
            <li>
              <span className="mm-ico"><Icon name="phone" /></span>
              <a href={PHONE_HREF}>{PHONE}</a>
            </li>
            <li>
              <span className="mm-ico"><Icon name="mail" /></span>
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </li>
          </ul>
        </section>

        <section className="mm-block" aria-label="Why Chimcare">
          <ul className="mm-trust">
            {TRUST.map((t) => (
              <li key={t.label}>
                <span className="mm-ico"><Icon name={t.icon} /></span>
                {t.label}
              </li>
            ))}
          </ul>
          <ul className="mm-badges">
            {BADGES.map((b) => (
              <li key={b.src}>
                <img src={b.src} alt={b.alt} title={b.alt} width={b.width} height={b.height} loading="lazy" decoding="async" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
