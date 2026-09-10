'use client';

import { useState } from 'react';
import type { LocationCard } from '@/lib/content/assemble-hubs';

/**
 * The state hub's map panel and its show/hide control.
 *
 * The mock draws pins with Leaflet from a `MAPDATA` blob and degrades to a plain location list when
 * Leaflet or the tile server cannot be reached. Leaflet is not a dependency of this application and
 * adding one is a separate decision (milestone M3), so the panel currently renders the degraded
 * state the mock already specifies: every location listed, each with its phone number. The toggle,
 * the panel, the legend and the responsive behaviour are the mock's.
 *
 * The toggle exists because on small screens the map sits below the cards and is collapsed by
 * default; on desktop the CSS shows the panel regardless.
 */
export function MapPanel({ cards }: { cards: LocationCard[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="btn btn-ghost map-toggle"
        type="button"
        id="map-toggle"
        aria-expanded={open}
        aria-controls="map-panel"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide map' : 'Show map'}
      </button>
      <div className={open ? 'map-panel reveal is-shown' : 'map-panel reveal'} id="map-panel">
        <div className="lmap" id="lmap">
          <p className="lmap-fallback">
            The interactive map needs an internet connection and is not enabled yet. Every location is listed here, with a
            phone number for each.
          </p>
          <ul className="lmap-list">
            {cards.map((c) => (
              <li key={c.id}>
                {c.href ? <a href={c.href}>{c.name}</a> : <span>{c.name}</span>}
                <a className="tel" href={c.phoneHref}>{c.phone}</a>
              </li>
            ))}
          </ul>
        </div>
        <div className="map-legend">
          <span><i></i>Chimcare location</span>
          <span>Every location on this list has its own page and phone number.</span>
        </div>
      </div>
    </>
  );
}
