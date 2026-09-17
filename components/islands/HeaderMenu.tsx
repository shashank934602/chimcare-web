'use client';

import { useState } from 'react';
import { Icon } from '@/components/chrome/Icon';

/**
 * Mobile menu toggle. Mirrors the mock: toggles `.open` on the target element (`#hdr` by default),
 * which the CSS uses to show the drop panel. `hdrId`/`menuId` let a second nav bar — the About
 * hero's own nav (components/templates/AboutPage.tsx) — reuse this same toggle against its own ids.
 */
export function HeaderMenu({ hdrId = 'hdr', menuId = 'hdr-menu' }: { hdrId?: string; menuId?: string } = {}) {
  const [open, setOpen] = useState(false);
  return (
    <button
      className="menu-btn"
      type="button"
      aria-expanded={open}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-controls={menuId}
      onClick={() => {
        const next = !open;
        setOpen(next);
        document.getElementById(hdrId)?.classList.toggle('open', next);
      }}
    >
      <Icon name="menu" className="ico ico-menu" />
      <Icon name="x" className="ico ico-x" />
    </button>
  );
}
