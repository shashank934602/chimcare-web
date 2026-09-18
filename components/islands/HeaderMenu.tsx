'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/chrome/Icon';
import { MOBILE_MENU_STATE_EVENT, openMobileMenu } from './MobileMenu';

// The homepage header's own menu and close glyphs (Elementor's eicon-menu-bar / eicon-close, from
// app/_home/content.ts), for a nav that has to look identical to that header.
const HOME_MENU_PATH =
  'M104 333H896C929 333 958 304 958 271S929 208 896 208H104C71 208 42 237 42 271S71 333 104 333ZM104 583H896C929 583 958 554 958 521S929 458 896 458H104C71 458 42 487 42 521S71 583 104 583ZM104 833H896C929 833 958 804 958 771S929 708 896 708H104C71 708 42 737 42 771S71 833 104 833Z';
const HOME_CLOSE_PATH =
  'M742 167L500 408 258 167C246 154 233 150 217 150 196 150 179 158 167 167 154 179 150 196 150 212 150 229 154 242 171 254L408 500 167 742C138 771 138 800 167 829 196 858 225 858 254 829L496 587 738 829C750 842 767 846 783 846 800 846 817 842 829 829 842 817 846 804 846 783 846 767 842 750 829 737L588 500 833 258C863 229 863 200 833 171 804 137 775 137 742 167Z';

/**
 * Mobile menu toggle. Opens the full-screen menu (MobileMenu.tsx, rendered once in the root layout) and
 * mirrors its open state in `aria-expanded`. The button only shows on tablets and phones, where the old
 * drop panels (`.hdr-menu`, `.hnav-links`) no longer open. `icons="home"` draws the homepage header's own
 * glyphs instead of the site icon set.
 */
export function HeaderMenu({ icons = 'site' }: { icons?: 'site' | 'home' } = {}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onState = (e: Event) => setOpen(Boolean((e as CustomEvent<{ open: boolean }>).detail?.open));
    document.addEventListener(MOBILE_MENU_STATE_EVENT, onState);
    return () => document.removeEventListener(MOBILE_MENU_STATE_EVENT, onState);
  }, []);
  return (
    <button
      className="menu-btn"
      type="button"
      aria-expanded={open}
      aria-label="Open menu"
      aria-controls="mobile-menu"
      onClick={() => {
        // The Locations mega menu closes when the full menu opens.
        document.dispatchEvent(new CustomEvent('chimcare:nav-menu', { detail: { open: false } }));
        openMobileMenu();
      }}
    >
      {icons === 'home' ? (
        <>
          <svg className="ico ico-menu" viewBox="0 0 1000 1000" aria-hidden="true"><path d={HOME_MENU_PATH} /></svg>
          <svg className="ico ico-x" viewBox="0 0 1000 1000" aria-hidden="true"><path d={HOME_CLOSE_PATH} /></svg>
        </>
      ) : (
        <>
          <Icon name="menu" className="ico ico-menu" />
          <Icon name="x" className="ico ico-x" />
        </>
      )}
    </button>
  );
}
