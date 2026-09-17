'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MegaPanelContent } from './LocationsMenu';
import type { LocationsMenuData } from '@/lib/content/locations-menu';

// The saved WordPress nav (app/_home/content.ts) carries two copies of every link — the visible
// desktop row and a `tabindex="-1"` copy inside its own mobile dropdown, kept unreachable until
// that dropdown opens. This targets only the desktop one.
const LOCATIONS_SELECTOR = 'a.elementor-item[href="/locations/"]:not([tabindex="-1"])';
// The floating white card the whole saved nav sits in (overrides.css calls it "the saved header
// card"). The panel spans this card's own width, flush with its left and right edges, the same
// "flush with the header's own content width" the real Header's <LocationsMenu> panel uses against
// `.hdr .wrap` — anchoring to the tiny "Locations" link itself instead would either overflow the
// viewport on the right or, once clamped back on screen, land far enough from the link to look
// unrelated to it.
const CARD_SELECTOR = '.header-template';

/**
 * Grafts the same Locations mega menu onto the homepage's own saved-WordPress header, without
 * touching that header's markup or styling — its "Locations" link stays exactly as exported; this
 * only adds behaviour. `<LocationsMenu>` (every other page) anchors its panel with
 * `position:absolute` against `.hdr .wrap`, spanning that header's own content width; that link
 * lives inside raw `dangerouslySetInnerHTML` markup with no such positioned ancestor to borrow, so
 * this portals the panel to `document.body` and positions it in JS instead, from `CARD_SELECTOR`'s
 * bounding box rather than the small link itself.
 *
 * Desktop hover only, matching how it was asked for ("when we hover…"); the link's own markup is
 * never touched (no aria-expanded/aria-controls added to it), so the saved header truly stays
 * unchanged. Escape and an outside click still close it, for anyone who does reach it by keyboard.
 */
export function HomeLocationsMenu({ data }: { data: LocationsMenuData }) {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const panelId = useId();
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) setHasOpened(true);
  }, [open]);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };

  useEffect(() => {
    const link = document.querySelector<HTMLAnchorElement>(LOCATIONS_SELECTOR);
    if (!link) return;
    linkRef.current = link;
    const anchor = link.closest<HTMLElement>(CARD_SELECTOR) ?? link;

    const place = () => {
      const r = anchor.getBoundingClientRect();
      const width = Math.min(r.width, window.innerWidth - 48);
      setPos({ top: r.bottom + 14, left: Math.max(24, Math.min(r.left, window.innerWidth - width - 24)), width });
    };
    place();

    const show = () => {
      cancelClose();
      place();
      setOpen(true);
    };
    const hide = () => scheduleClose();
    link.addEventListener('mouseenter', show);
    link.addEventListener('mouseleave', hide);
    link.addEventListener('focus', show);
    link.addEventListener('blur', hide);
    window.addEventListener('resize', place);
    return () => {
      link.removeEventListener('mouseenter', show);
      link.removeEventListener('mouseleave', hide);
      link.removeEventListener('focus', show);
      link.removeEventListener('blur', hide);
      window.removeEventListener('resize', place);
      cancelClose();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const link = linkRef.current;
    const reflow = () => {
      if (!link) return;
      const anchor = link.closest<HTMLElement>(CARD_SELECTOR) ?? link;
      const r = anchor.getBoundingClientRect();
      const width = Math.min(r.width, window.innerWidth - 48);
      setPos({ top: r.bottom + 14, left: Math.max(24, Math.min(r.left, window.innerWidth - width - 24)), width });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      linkRef.current?.focus();
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (linkRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', reflow, { passive: true });
    window.addEventListener('resize', reflow);
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('scroll', reflow);
      window.removeEventListener('resize', reflow);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [open]);

  if (!pos || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      id={panelId}
      className="mega"
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 2000 }}
      hidden={!open}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <MegaPanelContent data={data} currentCode={null} active={hasOpened} open={open} />
    </div>,
    document.body,
  );
}
