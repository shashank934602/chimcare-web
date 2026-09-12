'use client';

import { useEffect, useState } from 'react';
import { Icon } from './Icon';

/**
 * The client reference's floating quick-actions rail (`<div class="fcta" id="fcta">`) for the
 * `/location/` template.
 *
 * Four round brand buttons stacked at the right edge — call, email, schedule, quote — in the
 * reference's own order. All of the styling already arrived with the extraction: `.fcta`,
 * `.fcta.is-on`, `.fab` and `.fab-tip` are in `app/location/template.css`, and that stylesheet also
 * decides where the rail is allowed to exist at all — `@media (max-width:900px){ .fcta{display:none} }`
 * sits in the same block that switches the sticky Call/Book bar on. The two are one decision: the
 * bar covers phones, the rail is the desktop affordance, from 901px up. Nothing here re-states that.
 *
 * REVEAL. The reference's script is the rule, not an approximation of it:
 *
 *     var fcta = $('#fcta'), heroIO = null, heroOut = false;
 *     function syncFcta() { fcta.classList.toggle('is-on', heroOut && !sheetOpen && !drawerOpen); }
 *     heroIO = new IntersectionObserver(function (en) { heroOut = !en[0].isIntersecting; syncFcta(); },
 *                                       { threshold: 0.05 });
 *     heroIO.observe(heroSlot());            // heroSlot() === $('[data-book-slot]')
 *
 * So: on once the hero's own booking form has left the viewport, and off again the moment a dialog
 * opens, so the rail can never sit on top of a modal. The anchor is the booking form, not the hero —
 * while a visitor can still see the form, a shortcut to it is noise. The reference's fallback when
 * there is no slot or no IntersectionObserver is `heroOut = true`, and that is kept too.
 *
 * `sheetOpen`/`drawerOpen` are script state in the reference; here the same two overlays are React
 * islands, and both announce themselves in the DOM the same way — `.bsheet.is-open` / `.drawer.is-open`
 * and `body.no-scroll`. A class mutation is not a scroll event, so it is watched, not polled.
 *
 * SCHEDULE. `#fcta-sched` carries `data-book-sheet`, which is the contract `BookingSheet` already
 * listens for (the same one the sticky bar uses), rather than reaching into the sheet from here.
 *
 * DATA. Nothing is invented. The phone is the page's own and the call action is simply absent on a
 * page that has none; no corporate number is substituted for it. The email is brand data and arrives
 * as a prop, so this component holds no address of its own.
 */
export function LocationQuickActions({
  phone,
  phoneHref,
  email,
  quoteHref,
}: {
  phone?: string;
  phoneHref?: string;
  email: string;
  quoteHref: string;
}) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    // The reference marks the slot `data-book-slot`; ours is the `.book-slot` wrapper the sheet
    // already looks for when it decides to scroll instead of opening. Either spelling is accepted.
    const slot = document.querySelector('[data-book-slot]') ?? document.querySelector('.book-slot');

    let heroOut = !slot || !('IntersectionObserver' in window);
    let overlayOpen = false;
    const sync = () => setOn(heroOut && !overlayOpen);

    const readOverlays = () => {
      overlayOpen =
        document.body.classList.contains('no-scroll') ||
        !!document.querySelector('.bsheet.is-open, .drawer.is-open');
      sync();
    };

    let io: IntersectionObserver | null = null;
    if (slot && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          heroOut = !entries[0].isIntersecting;
          sync();
        },
        { threshold: 0.05 },
      );
      io.observe(slot);
    }

    const mo = new MutationObserver(readOverlays);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    for (const el of document.querySelectorAll('.bsheet, .drawer')) {
      mo.observe(el, { attributes: true, attributeFilter: ['class'] });
    }

    readOverlays(); // a page restored mid-scroll must not start in the wrong state

    return () => {
      io?.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    // `inert` while hidden: the rail is only opacity/pointer-events off, so without it a keyboard
    // would tab through four invisible controls. It is dropped the instant the rail is revealed, and
    // the revealed rail is fully tabbable.
    <div className={on ? 'fcta is-on' : 'fcta'} id="fcta" aria-label="Quick actions" inert={!on}>
      {phone && phoneHref && (
        <a className="fab" href={phoneHref} aria-label={`Call ${phone}`}>
          <Icon name="phone" />
          <span className="fab-tip" aria-hidden="true">Call {phone}</span>
        </a>
      )}
      <a className="fab" href={`mailto:${email}`} aria-label="Email Chimcare">
        <Icon name="mail" />
        <span className="fab-tip" aria-hidden="true">Email us</span>
      </a>
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
