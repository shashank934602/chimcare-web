'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Map as LeafletMap } from 'leaflet';
import { Icon } from '@/components/chrome/Icon';
import { fold } from '@/lib/content/search';
import type { LocationsMenuData, LocationsMenuState } from '@/lib/content/locations-menu';

const SEARCH_RESULT_LIMIT = 8;

/**
 * The header's "Locations" mega menu: popular states, a quick city/state jump box and a mini map —
 * all from `buildLocationsMenu()` (the same migrated-location data the location hubs render),
 * never a hand-typed list. The jump box is its own small index (every state and city, folded once)
 * and always on — a separate, self-contained feature from the site's directory search, which stays
 * off (`SEARCH_ENABLED` in lib/content/search.ts) until it's ready for visitors.
 *
 * "Locations" itself stays a normal link to `/locations/`; a separate chevron button opens the
 * panel without navigating, for anyone who wants to browse first — click, Enter/Space, or (on
 * desktop) hover. The button only ever *opens*, never toggles closed: a browser dispatches a
 * `mouseenter` right before any click (and, via its touch-compatibility events, before a tap's
 * click too), so a toggling click handler would immediately re-close whatever hover had just
 * opened and the button would appear to do nothing. Closing is `mouseleave` (desktop — after a
 * short grace period a re-entry cancels, since the panel is wide and a cursor crossing to its far
 * side can dip outside for an instant with no intention of leaving), Escape, or a click outside —
 * never the trigger itself. The panel's `hidden` attribute is the single source
 * of truth for open/closed, so a visitor whose JS hasn't hydrated yet still gets a working
 * "Locations" link — they just don't get the panel. `aria-current` on the trigger link is
 * `<NavActive>`'s job, like every other nav link.
 */
export function LocationsMenu({ data }: { data: LocationsMenuData }) {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const currentCode = useMemo(() => currentStateCode(pathname, data.states), [pathname, data.states]);

  useEffect(() => {
    if (open) setHasOpened(true);
  }, [open]);

  // A short grace period on close, cancelled by re-entering: the panel is wide and the trigger is a
  // small link, so a cursor moving toward its far side can dip outside for an instant without
  // meaning to leave. Opening stays instant — only closing waits.
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
  useEffect(() => () => cancelClose(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      rootRef.current?.querySelector('a')?.focus();
    };
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [open]);

  return (
    <div
      className="nav-item has-mega"
      ref={rootRef}
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="mega-trigger">
        <a href="/locations/">Locations</a>
        <button
          type="button"
          className="mega-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label="Show the locations menu"
          onClick={() => {
            cancelClose();
            setOpen(true);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="mega-chevron">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
      <div id={panelId} className="mega" hidden={!open}>
        <MegaPanelContent data={data} currentCode={currentCode} active={hasOpened} open={open} />
      </div>
    </div>
  );
}

/**
 * Everything inside the `.mega` panel — eyebrow, quick jump search, popular states and the mini
 * map. Shared by `<LocationsMenu>` (the real Header's own trigger, CSS-anchored under `.hdr .wrap`)
 * and `<HomeLocationsMenu>` (grafted onto the homepage's saved-WordPress "Locations" link via a
 * portal, JS-positioned since that link has no reliable positioned ancestor to anchor to) — one
 * panel, two ways of hanging it off a trigger.
 */
export function MegaPanelContent({
  data,
  currentCode,
  active,
  open,
}: {
  data: LocationsMenuData;
  currentCode: string | null;
  active: boolean;
  open: boolean;
}) {
  const [query, setQuery] = useState('');

  // The menu's own quick jump box — every state and city, folded once and filtered on each
  // keystroke. Separate from the site's directory search (SEARCH_ENABLED in lib/content/search.ts),
  // which stays off; this is a small, self-contained index the same size as the panel already shows.
  const foldedIndex = useMemo(() => data.searchIndex.map((item) => ({ item, text: fold(item.label) })), [data.searchIndex]);
  const needle = fold(query.trim());
  const matches = useMemo(
    () => (needle ? foldedIndex.filter((f) => f.text.includes(needle)).slice(0, SEARCH_RESULT_LIMIT).map((f) => f.item) : []),
    [foldedIndex, needle],
  );

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  return (
    <>
      <div className="mega-head">
        <p className="mega-eyebrow">
          <Icon name="pin" className="ico" />
          Locations
        </p>
        <a className="mega-viewall" href={data.viewAllHref}>
          View All Locations <Icon name="arrow" />
        </a>
      </div>
      <h3 className="mega-title">Find the Chimcare Crew Near You</h3>

      <div className="mega-intro">
        <div className="mega-search">
          <Icon name="search" className="ico" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find your city or state"
            autoComplete="off"
            spellCheck={false}
            aria-label="Find your Chimcare city or state"
          />
          {query && (
            <button type="button" className="mega-search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
              <Icon name="x" className="ico" />
            </button>
          )}
          {needle && (
            <div className="mega-search-results" role="region" aria-label="Search results">
              {matches.length > 0 ? (
                <ul>
                  {matches.map((m) => (
                    <li key={m.href}>
                      <a href={m.href}>
                        <Icon name="pin" className="ico" />
                        <span>{m.label}</span>
                        <em>{m.sub}</em>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mega-search-empty">
                  No match for &ldquo;{query.trim()}&rdquo;. <a href={data.viewAllHref}>Browse all locations</a> instead.
                </p>
              )}
            </div>
          )}
        </div>
        <p className="mega-lede">
          Chimney sweep, repair and masonry service from local Chimcare crews in {data.states.length} states. Pick your state below for its page, phone number and cities.
        </p>
      </div>

      <div className="mega-inner">
        <div className="mega-popular">
          <p className="mega-panel-label">
            <Icon name="pin" className="ico" />
            Popular Locations
          </p>
          <ul>
            {data.popular.map((s) => (
              <li key={s.code} className={s.code === currentCode ? 'is-active' : undefined}>
                <a href={s.href} aria-current={s.code === currentCode ? 'page' : undefined}>
                  <span>{s.name}</span>
                  <em>{s.cityCount} {s.cityCount === 1 ? 'city' : 'cities'}</em>
                  <Icon name="arrow" className="ico go" />
                </a>
              </li>
            ))}
          </ul>
          <a className="mega-viewcities" href={data.viewAllHref}>
            <Icon name="plus" className="ico" />
            View All Cities
          </a>
        </div>
        <div className="mega-map-col">
          <div className="mega-map-frame">
            <MegaMap pins={data.pins} active={active} />
            <a className="mega-viewmap" href={data.viewAllHref}>
              <span>View Full Map</span>
              <span className="mega-viewmap-ico">
                <Icon name="arrow" />
              </span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * The state whose own hub or city page the visitor is already on, if any — read from the real
 * pathname, never guessed. A state hub URL (`/locations/mn/`) matches by prefix; a legacy city URL
 * (`/location/chimney-sweep-…-mn/`) always ends in its state's two-letter code, the same pattern
 * `migrated-locations.ts` parses migrated slugs with.
 */
function currentStateCode(pathname: string | null, states: LocationsMenuState[]): string | null {
  if (!pathname) return null;
  const hub = states.find((s) => pathname === s.href || pathname.startsWith(s.href));
  if (hub) return hub.code;
  const city = /^\/location\/.+-([a-z]{2})\/?$/i.exec(pathname);
  return city ? city[1].toUpperCase() : null;
}

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * The panel's mini map — one pin per state, same Leaflet approach as the state hub's `MapPanel`
 * (dynamic import so Leaflet never touches the server bundle), mounted once the menu has actually
 * been opened, since it sits in the header of every page. The busiest state's pin (the migration
 * report's own order) carries a permanently-open label, the way the state hub's own map always
 * shows its pins' names.
 *
 * No "already mounted, skip" ref guard: `Header` is a Server Component, so `pins` is a fresh array
 * on every navigation even though its contents never change — a guard keyed off "have I ever run"
 * would block re-init after that first legitimate re-run (the effect's own cleanup already tore the
 * previous map down), leaving the container permanently empty. Cleanup-then-rebuild on every
 * `pins`/`active` change is correct and cheap enough for a seven-pin map.
 */
function MegaMap({ pins, active }: { pins: LocationsMenuData['pins']; active: boolean }) {
  const [status, setStatus] = useState<'idle' | 'ready' | 'failed'>('idle');
  const mapEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const el = mapEl.current;
    if (!el || pins.length === 0) {
      setStatus('failed');
      return;
    }
    let map: LeafletMap | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let cancelled = false;

    import('leaflet')
      .then((mod) => {
        if (cancelled) return;
        const L = mod.default ?? mod;
        const m = L.map(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile, zoomControl: false, attributionControl: false, keyboard: false });
        map = m;
        // The panel's own layout is responsive (`.mega-inner` drops to one column under 1040px, the
        // map frame's height changes with it), and a browser resize while the menu is already open
        // doesn't repaint Leaflet's tile grid on its own — without this, the map keeps the tile grid
        // it was born with and a size change leaves a scrambled sliver of stale tiles in one corner
        // instead of a map filling the frame.
        resizeObserver = new ResizeObserver(() => m.invalidateSize());
        resizeObserver.observe(el);
        L.control.zoom({ position: 'topright' }).addTo(m);
        // Bottom-left, not Leaflet's default bottom-right — that corner is `.mega-viewmap`'s.
        L.control.attribution({ position: 'bottomleft' }).addTo(m);
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 14 }).addTo(m);

        const dotIcon = L.divIcon({ className: 'mmpin', html: '<span class="mmpin-dot"></span>', iconSize: [16, 16], iconAnchor: [8, 8] });
        // The busiest state's pin — the one carrying the permanent label — gets the same soft
        // halo-and-ring treatment as an active pin on the state hub's own map (`.lpin.is-active`
        // in state.css), just under the `mm-` names so it can't pick up that file's dark theme.
        const primaryIcon = L.divIcon({ className: 'mmpin is-primary', html: '<span class="mmpin-dot"></span>', iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -15] });
        pins.forEach((p, i) => {
          const isPrimary = i === 0;
          const marker = L.marker([p.lat, p.lng], {
            icon: isPrimary ? primaryIcon : dotIcon,
            title: p.name,
            alt: p.name,
            keyboard: false,
            zIndexOffset: isPrimary ? 1000 : 0,
          }).addTo(m);
          marker.bindTooltip(p.name, { className: 'mmtip', direction: 'top', offset: [0, isPrimary ? -16 : -8], permanent: isPrimary });
          marker.on('click', () => {
            window.location.href = p.href;
          });
        });
        const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
        // The panel can finish its own open transition after this runs, so a stale size here is
        // usually how a freshly-opened Leaflet map ends up rendering blank or badly cropped until
        // the next manual resize — invalidateSize() alone doesn't fix that if the container was
        // still mid-layout when it ran, only re-confirms whatever (possibly wrong) size it reads at
        // that instant. Fitting once now covers the common case fast; the two rAFs re-fit once
        // layout has *actually* settled (Chrome can need a frame beyond the first to reflect a
        // freshly-portaled subtree's final size), so a race here self-corrects instead of leaving
        // the map zoomed to `maxZoom` on whatever tiny size it was first measured at — the zoomed-in,
        // pinless view this was written to fix.
        const fit = () => {
          m.invalidateSize();
          m.fitBounds(bounds, { padding: [30, 30] });
        };
        fit();
        requestAnimationFrame(() => requestAnimationFrame(() => cancelled || fit()));
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      map?.remove();
    };
  }, [active, pins]);

  if (status === 'failed') return null;
  return <div className="mega-map" ref={mapEl} role="region" aria-label="Map of the states Chimcare serves" />;
}
