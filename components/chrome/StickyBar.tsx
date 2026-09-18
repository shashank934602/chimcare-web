'use client';

import { useEffect } from 'react';
import { Icon } from './Icon';
import '@/styles/sticky-bar.css';

/**
 * Mobile-only sticky Call / Book bar. CSS hides it on desktop.
 *
 * It starts off-screen (`transform: translateY(100%)`) and is revealed by adding `.is-on`, which the
 * stylesheet already defines. Nothing was adding that class, so the bar rendered on every page and
 * was never visible on any of them.
 *
 * The reveal rule is the client reference's: stay hidden while any part of the hero is on screen, so
 * the bar can never cover the hero's own Call and Book buttons, and slide in once the hero is past.
 * A throttled scroll read drives it rather than an IntersectionObserver — that is the reference's own
 * choice, and its comment gives the reason: IntersectionObserver combined with `position: fixed` has
 * known quirks on older iOS Safari, and a scroll read is deterministic.
 *
 * Pages with no hero have nothing to hide behind, so the bar appears after
 * roughly one viewport of scrolling. That keeps it off the first screen, which is the point of the
 * rule, without making it unreachable on a page the reference never covered.
 *
 * It hides again once the footer scrolls into view: the footer carries its own phone and links, and the
 * bar would otherwise sit over them.
 *
 * On phones it is pinned to the bottom of what the visitor actually sees. `position: fixed; bottom: 0`
 * follows the layout viewport, and iOS Safari can leave that above the visible bottom — after the
 * on-screen keyboard closes the bar stayed parked at the keyboard's old top edge, mid-screen. The
 * visual viewport's real bottom is read on every resize/scroll of it and handed to CSS as
 * `--sfoot-offset`; while the keyboard is open (visual viewport well short of the window) the bar
 * hides, since it could only cover the form being typed into.
 */
export function StickyBar({ phoneHref }: { phoneHref: string }) {
  useEffect(() => {
    const bar = document.getElementById('sfoot');
    if (!bar) return;
    const hero = document.getElementById('o1-hero');
    const footer = document.querySelector('footer.ftr') ?? document.querySelector('footer');

    let last = 0;
    const update = () => {
      const past = hero
        ? hero.getBoundingClientRect().bottom <= 0
        : window.scrollY > window.innerHeight;
      const inFooter = footer ? footer.getBoundingClientRect().top < window.innerHeight : false;
      bar.classList.toggle('is-on', past && !inFooter && !keyboardOpen());
    };

    const vv = window.visualViewport;
    // A visual viewport much shorter than the window means the on-screen keyboard is up.
    const keyboardOpen = () => !!vv && vv.height < window.innerHeight * 0.75;
    let offset = 0;
    const setOffset = (px: number) => {
      offset = Math.round(px);
      bar.style.setProperty('--sfoot-offset', `${offset}px`);
    };
    // Self-check: once the bar is showing (and its slide-in has finished), its bottom edge must meet the
    // bottom of what the visitor sees. If Safari has left it anywhere else, move it by the difference.
    // This does not depend on which of Safari's viewport numbers went stale, only on where the bar is.
    const correct = () => {
      if (!vv || !bar.classList.contains('is-on') || !phone.matches) return;
      const gap = bar.getBoundingClientRect().bottom - (vv.offsetTop + vv.height);
      if (Math.abs(gap) > 2) setOffset(offset + gap);
    };
    const pinToVisibleBottom = () => {
      if (!vv) return;
      // Positive when the visible bottom is above the layout bottom, negative when below it.
      setOffset(window.innerHeight - (vv.offsetTop + vv.height));
      update();
      requestAnimationFrame(correct);
    };
    // Safari moves the viewport after the keyboard has gone and after the toolbar settles, a moment after
    // the events that caused it. Look again once each has finished animating.
    let settle: number[] = [];
    const recheckSoon = () => {
      settle.forEach((t) => window.clearTimeout(t));
      settle = [120, 400, 800].map((ms) => window.setTimeout(pinToVisibleBottom, ms));
    };
    const phone = window.matchMedia('(max-width: 900px)');
    const onFocusOut = (e: FocusEvent) => {
      if ((e.target as HTMLElement | null)?.matches?.('input, textarea, select')) recheckSoon();
    };
    // The reference's own 60ms throttle, plus a trailing read: a scroll that ends inside the window (a jump
    // to an anchor, or the homepage's sticky header nudging the page) must still leave the bar right.
    let trailing: number | undefined;
    const onScroll = () => {
      const now = Date.now();
      window.clearTimeout(trailing);
      if (now - last < 60) {
        trailing = window.setTimeout(onScroll, 60 - (now - last));
        return;
      }
      last = now;
      update();
    };

    update(); // a page restored mid-scroll must not start with the bar in the wrong state
    pinToVisibleBottom();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    vv?.addEventListener('resize', pinToVisibleBottom);
    vv?.addEventListener('scroll', pinToVisibleBottom);
    vv?.addEventListener('resize', recheckSoon);
    document.addEventListener('focusout', onFocusOut);
    window.addEventListener('scrollend', correct);
    bar.addEventListener('transitionend', correct);
    window.addEventListener('pageshow', recheckSoon); // back/forward cache restores keep stale positions
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      vv?.removeEventListener('resize', pinToVisibleBottom);
      vv?.removeEventListener('scroll', pinToVisibleBottom);
      vv?.removeEventListener('resize', recheckSoon);
      document.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('scrollend', correct);
      bar.removeEventListener('transitionend', correct);
      window.removeEventListener('pageshow', recheckSoon);
      window.clearTimeout(trailing);
      settle.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div className="sfoot" id="sfoot" aria-label="Book or call for service">
      <a className="sfoot-btn sfoot-book" href="#booking" data-book-sheet>
        <Icon name="cal" />Book Online
      </a>
      <a className="sfoot-btn sfoot-call" href={phoneHref}>
        <Icon name="phone" />Call Now
      </a>
    </div>
  );
}
