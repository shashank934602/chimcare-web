'use client';

import { useEffect } from 'react';

/**
 * The homepage header's sticky behaviour (components/islands/HomeBehaviour.tsx, "sticky header") for
 * the same card on other pages (components/chrome/HomeStyleNav.tsx): once the card's top reaches 20px
 * from the viewport top it is fixed there at the same size and position, and its slot — the wrapper
 * HomeStyleNav renders around it — keeps the card's height and bottom margin so nothing below jumps.
 * Scrolling back above that point restores it. The homepage holds the place with a hidden clone; here
 * the slot is React-rendered, so no node is inserted into markup React owns.
 */
export function StickyHomeNav({ targetId, offset = 20 }: { targetId: string; offset?: number }) {
  useEffect(() => {
    const nav = document.getElementById(targetId);
    const slot = nav?.parentElement;
    if (!nav || !slot) return;

    let active = false;
    // Fixed at the card's own unstuck position: measured with the card briefly back in flow (inside its
    // slot, which holds the height), then fixed there. Only on stick and resize, never per scroll event.
    const place = () => {
      nav.style.cssText = '';
      const r = nav.getBoundingClientRect();
      Object.assign(nav.style, { position: 'fixed', top: `${offset}px`, left: `${r.left}px`, width: `${r.width}px`, margin: '0' });
    };
    const stick = () => {
      slot.style.height = `${nav.getBoundingClientRect().height}px`;
      slot.style.marginBottom = getComputedStyle(nav).marginBottom;
      place();
      nav.classList.add('is-stuck');
      active = true;
    };
    const release = () => {
      nav.style.cssText = '';
      slot.style.height = '';
      slot.style.marginBottom = '';
      nav.classList.remove('is-stuck');
      active = false;
    };
    const onScroll = () => {
      if (!active && nav.getBoundingClientRect().top <= offset) stick();
      else if (active && slot.getBoundingClientRect().top > offset) release();
    };
    const onResize = () => {
      if (!active) return onScroll();
      release();
      onScroll();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      release();
    };
  }, [targetId, offset]);
  return null;
}
