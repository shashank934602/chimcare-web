// The state and city a legacy location URL belongs to, for every URL shape WordPress published.
//
// Plain JavaScript so the app (TypeScript, `allowJs`) and the Node scripts (scripts/*.mjs) share one
// reading of a slug. The shapes, measured across all 229,621 published URLs
// (chimcare-migration/docs/URL-patterns.md):
//
//   A  {service}-in-{city}-{st}      chimney-sweep-repair-in-boston-ma
//   B  {service}-{city}-in-{st}      freestanding-stoves-worcester-in-ma
//   C  {service}-{city}-{st}         chimney-sweep-seattle-wa
//   D  {service}-{city}-{statename}  chimney-sweep-portland-oregon
//   E  irregular                     bedford-chimney-sweep, cleveland-oh-chimney-sweep-repair
//
// plus a trailing `-2`, `-3` on any of them where WordPress duplicated a slug.
//
// The URL is the authority on the state: a title naming a different state is ignored (WordPress
// titles a Washington page "Carlsborg, WA" under an Arizona URL). Only a URL that names no state at
// all (shape E) takes its state from the title. The city comes from the slug for shape A, where the
// slug spells it out unambiguously, and from the title otherwise, because shapes B–E run the service
// and the city together with nothing to split them on.

/** @type {Record<string, string>} */
export const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

const CODE_BY_NAME = Object.fromEntries(Object.entries(STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]));
const NAME_SLUGS = Object.entries(STATE_NAMES)
  .map(([code, name]) => [name.toLowerCase().replace(/\s+/g, '-'), code])
  .sort((a, b) => b[0].length - a[0].length);

// Words a service name is made of. A title such as "Chimney Sweep West Seattle, WA" has no "in"
// between service and city, so the leading service words are stripped to reach the city.
const SERVICE_WORDS = new Set(
  ('chimney chimneys sweep sweeps sweeping repair repairs fireplace fireplaces services service cleaning clean ' +
    'inspection inspections masonry and & gas wood pellet stove stoves insert inserts installation install ' +
    'dryer vent duct air liner liners cap caps crown flashing damper waterproofing restoration rebuild local ' +
    'near me professional expert experts best company chimcare the').split(' '),
);

const slugify = (s) => s.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const titleCase = (slug) => slug.split('-').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const tidy = (s) => s.replace(/\s{2,}/g, ' ').trim();

/** "…in Bedford, NH" / "Chimney Sweep Salem, Oregon" / "Cleveland, OH Chimney Sweep" → { city, code } */
function placeFromTitle(title) {
  if (!title) return null;
  const t = tidy(title.replace(/\|.*$/, ''));
  // State last: "… Bedford, NH", "…Cambridge,MA", "… Salem, Oregon"
  let m = /^(.*?)\s*,\s*([A-Za-z]{2}|[A-Za-z]+(?:\s[A-Za-z]+)?)\s*$/.exec(t);
  let segment = null;
  let code = null;
  if (m) {
    const st = m[2].length === 2 ? m[2].toUpperCase() : CODE_BY_NAME[m[2].toLowerCase()];
    if (st && STATE_NAMES[st]) {
      segment = m[1];
      code = st;
    }
  }
  // State first: "Cleveland, OH Chimney Sweep & Repair"
  if (!code) {
    m = /^([A-Za-z .'-]+?)\s*,\s*([A-Z]{2})\b/.exec(t);
    if (m && STATE_NAMES[m[2]]) return { city: tidy(m[1]), code: m[2] };
    return null;
  }
  const inAt = segment.search(/\bin\s+(?!.*\bin\s)/i);
  let city = inAt >= 0 ? segment.slice(inAt).replace(/^in\s+/i, '') : segment;
  if (inAt < 0) {
    const words = city.split(/\s+/);
    while (words.length > 1 && SERVICE_WORDS.has(words[0].toLowerCase())) words.shift();
    city = words.join(' ');
  }
  city = tidy(city);
  return city ? { city, code } : null;
}

/**
 * @param {string} slug      the legacy slug, without `/location/`
 * @param {string | null | undefined} [title]  the page's WordPress title, used where the slug cannot name the city
 * @returns {{ code: string, state: string, citySlug: string, city: string, duplicate: boolean, shape: 'A'|'B'|'C'|'D'|'E' } | null}
 */
export function placeFromSlug(slug, title) {
  const s = String(slug).toLowerCase();
  const fromTitle = placeFromTitle(title ?? '');

  const dup = /^(.*-[a-z]+)-(\d+)$/.exec(s);
  const base = dup ? dup[1] : s;
  const duplicate = !!dup;

  const finish = (code, citySlug, cityName, shape) => {
    if (!citySlug) return null;
    return { code, state: STATE_NAMES[code], citySlug, city: cityName || titleCase(citySlug), duplicate, shape };
  };
  // The title's city, only when the title agrees with the URL on the state.
  const titleCity = (code) => (fromTitle && fromTitle.code === code ? fromTitle.city : null);

  // A — the slug names the city itself.
  let m = /-in-(.+)-([a-z]{2})$/.exec(base);
  if (m && STATE_NAMES[m[2].toUpperCase()]) {
    const code = m[2].toUpperCase();
    const named = titleCity(code);
    return finish(code, m[1], named && slugify(named) === m[1] ? named : null, 'A');
  }

  // B — `{service}-{city}-in-{st}`: service and city run together, so the title names the city.
  m = /^(.+)-in-([a-z]{2})$/.exec(base);
  if (m && STATE_NAMES[m[2].toUpperCase()]) {
    const code = m[2].toUpperCase();
    const named = titleCity(code);
    return named ? finish(code, slugify(named), named, 'B') : null;
  }

  // D — state spelled out: `chimney-sweep-portland-oregon`, `…-new-hampshire`.
  for (const [nameSlug, code] of NAME_SLUGS) {
    if (base.endsWith('-' + nameSlug)) {
      const rest = base.slice(0, -nameSlug.length - 1);
      const named = titleCity(code) ?? cityFromRest(rest);
      return named ? finish(code, slugify(named), named, 'D') : null;
    }
  }

  // C — `{service}-{city}-{st}`.
  m = /^(.+)-([a-z]{2})$/.exec(base);
  if (m && STATE_NAMES[m[2].toUpperCase()]) {
    const code = m[2].toUpperCase();
    const named = titleCity(code) ?? cityFromRest(m[1]);
    return named ? finish(code, slugify(named), named, 'C') : null;
  }

  // E — no state in the slug at all: the title is the only source.
  if (fromTitle) return finish(fromTitle.code, slugify(fromTitle.city), fromTitle.city, 'E');
  return null;
}

/** `chimney-sweep-west-seattle` → "West Seattle": the city is what is left once the service words go. */
function cityFromRest(rest) {
  const words = rest.split('-').filter(Boolean);
  while (words.length > 1 && SERVICE_WORDS.has(words[0])) words.shift();
  return words.length ? titleCase(words.join('-')) : null;
}
