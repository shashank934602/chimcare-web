'use client';

import { useState } from 'react';
import { Icon } from '@/components/chrome/Icon';

/** Mobile menu toggle. Mirrors the mock: toggles `.open` on #hdr, which the CSS uses to show the drop panel. */
export function HeaderMenu() {
  const [open, setOpen] = useState(false);
  return (
    <button
      className="menu-btn"
      type="button"
      aria-expanded={open}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-controls="hdr-menu"
      onClick={() => {
        const next = !open;
        setOpen(next);
        document.getElementById('hdr')?.classList.toggle('open', next);
      }}
    >
      <Icon name="menu" className="ico ico-menu" />
      <Icon name="x" className="ico ico-x" />
    </button>
  );
}
