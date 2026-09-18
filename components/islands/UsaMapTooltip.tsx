'use client';

import { useEffect } from 'react';
import { attachUsaMapTooltip } from './usaMapTip';

/** The homepage map's tooltip and state highlight, on another page's copy of the map (the About page's
 *  "Chimcare Locations" card). `frameId` is the positioned box holding the map's `<svg>` and its `.cc-tip`. */
export function UsaMapTooltip({ frameId }: { frameId: string }) {
  useEffect(() => {
    const map = document.getElementById(frameId);
    const tip = map?.querySelector<HTMLElement>('.cc-tip');
    if (!map || !tip) return;
    const ac = new AbortController();
    attachUsaMapTooltip(map, tip, ac.signal);
    return () => ac.abort();
  }, [frameId]);
  return null;
}
