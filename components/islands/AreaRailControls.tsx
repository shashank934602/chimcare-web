'use client';

import { useEffect, useState } from 'react';

/**
 * The two arrows above the service-area rail.
 *
 * The rail itself and every chip in it are SERVER HTML — the chips are internal links to real
 * places and must stay crawlable, and the rail scrolls by swipe with no JavaScript at all. This
 * island is a leaf that adds only the arrows: it finds the server-rendered rail by id and nudges
 * it by ~80% of its visible width. If it never hydrates the band is still complete.
 *
 * The arrows remove themselves when the rail does not actually overflow. The page already withholds
 * them below a chip count, but whether a given list overflows depends on the viewport and on how long
 * the names are, so the only honest test is to measure the rendered rail. Controls that scroll nothing
 * are worse than no controls: they promise more content than exists.
 */
export function AreaRailControls({ railId }: { railId: string }) {
  const [scrollable, setScrollable] = useState(true);

  useEffect(() => {
    const rail = document.getElementById(railId);
    if (!rail) return;
    const measure = () => setScrollable(rail.scrollWidth - rail.clientWidth > 4);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [railId]);

  const nudge = (direction: -1 | 1) => {
    const rail = document.getElementById(railId);
    if (!rail) return;
    const reduced =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollBy({
      left: direction * Math.round(rail.clientWidth * 0.8),
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  if (!scrollable) return null;

  return (
    <div className="rail-ctrls">
      <button className="rail-btn" type="button" aria-label="Scroll locations left" onClick={() => nudge(-1)}>
        <span aria-hidden="true">&#8249;</span>
      </button>
      <button className="rail-btn" type="button" aria-label="Scroll locations right" onClick={() => nudge(1)}>
        <span aria-hidden="true">&#8250;</span>
      </button>
    </div>
  );
}
