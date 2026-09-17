'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Highlights the nav link matching the current route. <Header> is one shared instance rendered
 * once by the root layout (app/layout.tsx), so it has no route of its own to read `current` from —
 * this sets `aria-current` after hydration instead of duplicating <Header> per template. Renders
 * nothing; it only touches the `aria-current` attribute the server markup already understands.
 */
export function NavActive() {
  const pathname = usePathname();

  useEffect(() => {
    // Every top-level nav link, however deep the Locations trigger is nested in its own wrapper —
    // excluding anything inside the `.mega` dropdown panel itself (its "View All Locations" and
    // popular-state links share the same /locations/ href but aren't the trigger).
    const links = document.querySelectorAll<HTMLAnchorElement>('.hdr .nav a[href]:not(.mega a[href])');
    for (const a of links) {
      const href = a.getAttribute('href') ?? '';
      const isCurrent =
        href === '#'
          ? false
          : href === '/'
            ? pathname === '/'
            : href === '/locations/'
              ? pathname.startsWith('/locations/') || pathname.startsWith('/location/')
              : pathname === href;
      if (isCurrent) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
  }, [pathname]);

  return null;
}
