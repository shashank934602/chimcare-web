import { getMigratedStates } from '@/lib/data/migrated-locations';

export type LocationsMenuState = { code: string; slug: string; name: string; href: string; cityCount: number };
export type LocationsMenuPin = { name: string; href: string; lat: number; lng: number };
/** One entry per state and one per city, for the menu's own quick state/city jump box. */
export type LocationsMenuSearchItem = { label: string; sub: string; href: string; kind: 'state' | 'city' };

export type LocationsMenuData = {
  popular: LocationsMenuState[];
  states: LocationsMenuState[];
  pins: LocationsMenuPin[];
  searchIndex: LocationsMenuSearchItem[];
  viewAllHref: string;
  cityCount: number;
};

const POPULAR_COUNT = 5;

/**
 * Data for the header's Locations mega menu — built from the same migrated-state data the
 * location hubs themselves read (`getMigratedStates`), never a hand-typed list of cities or
 * states. "Popular" is the states with the most migrated location pages, the same order the
 * national hub and the migration report already use.
 */
export function buildLocationsMenu(): LocationsMenuData {
  const migrated = getMigratedStates();
  const states: LocationsMenuState[] = migrated.map((s) => ({
    code: s.code,
    slug: s.slug,
    name: s.name,
    href: `/locations/${s.slug}/`,
    cityCount: s.cities.length,
  }));
  // One pin per state — its first geocoded city — so the mini map reads as a national overview,
  // not a dense per-city map (that's what each state hub's own map is for).
  const pins: LocationsMenuPin[] = migrated.flatMap((s) => {
    const city = s.cities.find((c) => c.lat != null && c.lng != null);
    return city ? [{ name: `${city.name}, ${s.code}`, href: city.href, lat: city.lat!, lng: city.lng! }] : [];
  });
  // Every state and every one of its cities, for the menu's own quick jump box — a small,
  // self-contained index, separate from the site's directory search (lib/content/search.ts,
  // switched off by SEARCH_ENABLED until that feature is ready).
  const searchIndex: LocationsMenuSearchItem[] = migrated.flatMap((s) => [
    { label: s.name, sub: `${s.cities.length} ${s.cities.length === 1 ? 'city' : 'cities'}`, href: `/locations/${s.slug}/`, kind: 'state' as const },
    ...s.cities.map((c) => ({ label: c.name, sub: s.name, href: c.href, kind: 'city' as const })),
  ]);
  return {
    popular: states.slice(0, POPULAR_COUNT),
    states,
    pins,
    searchIndex,
    viewAllHref: '/locations/',
    cityCount: states.reduce((n, s) => n + s.cityCount, 0),
  };
}
