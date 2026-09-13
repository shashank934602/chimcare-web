'use client';

import { useEffect, useState } from 'react';
import { Icon } from './Icon';

/**
 * The floating quick-action cluster (`#fcta` in every mock).
 *
 * Four actions — call, email, schedule, quote — pinned to the side of the viewport. The mock turns
 * the cluster on only once the hero's booking form has scrolled out of view, and hides it again
 * while a dialog (booking sheet or service drawer) is open, so the fabs can never sit on top of a
 * modal. `syncFcta()` in the mock does exactly this; here the same two conditions drive `.is-on`.
 *
 * Shared by every template. The actions themselves come from the page's own data — a template never
 * hard-codes a phone number — and any action without data is left out rather than invented.
 */
export function FloatingCta({
  phone,
  phoneHref,
  email,
  quoteHref = '#o1-cost',
}: {
  phone: string;
  phoneHref: string;
  email?: string;
  quoteHref?: string;
}) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    // The booking form is the anchor: while a visitor can see it, the shortcut to it is noise.
    const anchor =
      document.querySelector('[data-book-slot]') ??
      document.querySelector('.book-slot') ??
      document.getElementById('booking') ??
      // The hubs carry no booking form; the hero is the next thing a shortcut would duplicate.
      document.getElementById('o1-hero');

    const dialogOpen = () =>
      !!document.querySelector('.bsheet.is-open, .drawer.is-open') || document.body.classList.contains('no-scroll');

    let past = !anchor;
    const sync = () => setOn(past && !dialogOpen());

    let io: IntersectionObserver | null = null;
    if (anchor) {
      io = new IntersectionObserver(
        ([e]) => {
          past = !e.isIntersecting && e.boundingClientRect.top < 0;
          sync();
        },
        { rootMargin: '-80px 0px 0px 0px' },
      );
      io.observe(anchor);
    }
    // A dialog opening or closing changes nothing about scroll, so watch the class instead.
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    for (const el of document.querySelectorAll('.bsheet, .drawer')) {
      mo.observe(el, { attributes: true, attributeFilter: ['class'] });
    }
    sync();
    return () => {
      io?.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div className={on ? 'fcta is-on' : 'fcta'} id="fcta" aria-label="Quick actions">
      <a className="fab" href={phoneHref} aria-label={`Call ${phone}`}>
        <Icon name="phone" />
        <span className="fab-tip" aria-hidden="true">Call {phone}</span>
      </a>
      {email && (
        <a className="fab" href={`mailto:${email}`} aria-label="Email Chimcare">
          <Icon name="mail" />
          <span className="fab-tip" aria-hidden="true">Email us</span>
        </a>
      )}
      {/* `data-book-sheet` is the contract BookingSheet already listens for, so the cluster opens the
          same sheet the sticky bar does rather than reaching for it directly. */}
      <button className="fab" type="button" id="fcta-sched" aria-label="Schedule service" data-book-sheet>
        <Icon name="cal" />
        <span className="fab-tip" aria-hidden="true">Schedule service</span>
      </button>
      <a className="fab" href={quoteHref} aria-label="Get a quote">
        <Icon name="flame" />
        <span className="fab-tip" aria-hidden="true">Get a quote</span>
      </a>
    </div>
  );
}
