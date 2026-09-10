// Per-state configuration for the migration agent.
//
// Everything here is a fact about the SOURCE (which slugs are city pages, which office is where) or
// a decision already taken with the business. Nothing here generates content. Adding a state means
// adding an entry, not writing new migration code.

export { FLAG_CATEGORY } from '../../lib/migration/flags.mjs';

export const STATES = {
  mn: {
    key: 'mn',
    stateCode: 'MN',
    stateName: 'Minnesota',
    origin: 'https://www.chimcare.com',
    nationalPhone: '1-800-362-4840',
    businessInputs: '../chimcare-rebuild-main',

    // Which WordPress slugs are city pages, and which of those are branch pages.
    cityPagePatterns: ['chimney-sweep-fireplace-in-%-mn', 'chimney-sweep-repair-in-%-mn'],
    citySlugRe: /^chimney-sweep-(fireplace|repair)-in-(.+)-mn$/,
    branchSlugRe: /^chimney-sweep-fireplace-in-.+-mn$/,
    coverageSlugRe: /^chimney-sweep-repair-in-.+-mn$/,

    // The publication gate's thresholds. These are the pilot's values and are NOT to be lowered to
    // make more pages publishable.
    minAreas: 4,
    minLocalLines: 2,
    serviceCatalogueSize: 92,

    // How much of the "Why … Important in" section localSpecificsFrom() may read.
    // 1 = the first paragraph only. This is the behavior Minnesota's 109/25 baseline was sealed on
    // and must not be raised without re-sealing that baseline: nine Minnesota pages carry a housing
    // sentence in a later paragraph, seven of which would newly satisfy the local-lines gate.
    localSpecifics: { paragraphScanDepth: 1 },

    // A derived coordinate further than this from its nearest office is treated as suspect.
    farFromBranchKm: 88,

    // Geocodes that resolved to a different, same-named place. Their coordinates are dropped rather
    // than guessed, and the city is flagged for a verified location.
    rejectedGeocodes: {
      Becker: 'Geocoder returned Becker County (north-west Minnesota), not the city of Becker in Sherburne County',
      Grant: 'Geocoder returned Grant County (west-central Minnesota), not the city of Grant in Washington County',
      'St. Anthony': 'Geocoder returned St. Anthony in Stearns County, not St. Anthony Village next to Minneapolis',
    },

    // A branch office sits inside these "coverage" cities, so the classification may be wrong.
    officeConflicts: {
      'St. Louis Park': 'The "West Minneapolis" branch address (1650 West End Blvd) is in St. Louis Park',
      'Brooklyn Center': 'The "North Minneapolis" branch address (6160 Summit Dr North) is in Brooklyn Center',
    },

    // Legacy slugs known to be misspelled. Recorded only; the redirect decision is the business's.
    slugTypos: {
      'chimney-sweep-repair-in-farmingon-mn': 'The legacy slug reads "farmingon"; a correctly spelled Farmington page also exists. Redirect decision pending.',
    },

    // Slug fragments that are not real cities (a mangled slug, a duplicate of a branch city name).
    excludeSuffixes: /^(saint-paul|south-wayzata)$/,

    // A shortcode closed as `</name]` instead of `[/name]`. Flagged where found, never repaired.
    markupDefectRe: /<\/[a-z][a-z0-9_]*\]/g,

    // Used to notice an image labelled for another state.
    foreignStateRe: /\b(MA|WA|OR|CA|GA|IL|OH|WI|NH)\b/,
  },

  // -------------------------------------------------------------------------------------------
  // MASSACHUSETTS
  //
  // Unlike Minnesota, MA city pages do not share one slug shape. The four below were enumerated
  // from WordPress — they are exactly the shapes used by the 26 pages carrying the MA region term
  // (job_listing_region 5071), extended to the untagged pages of the same shape.
  //
  // Pattern 1 has NO state token. `bedford-chimney-sweep` is Bedford NH and `nashua-chimney-sweep`
  // is Nashua NH, while Bedford MA lives at `chimney-sweep-repair-in-bedford-ma`. State for that
  // shape is therefore read from the page title, never from the slug.
  // -------------------------------------------------------------------------------------------
  ma: {
    key: 'ma',
    stateCode: 'MA',
    stateName: 'Massachusetts',
    origin: 'https://www.chimcare.com',
    nationalPhone: '1-800-362-4840',
    businessInputs: '../chimcare-rebuild-main',

    cityPagePatterns: [
      '%-chimney-sweep',
      '%-chimney-sweep-_',
      'chimney-sweep-repair-in-%-ma',
      'chimney-sweep-repair-in-%-ma-_',
      'chimney-sweep-fireplace-services-in-%-ma',
      'chimney-sweep-fireplace-services-in-%-ma-_',
      'chimcare-chimney-sweep-in-%-ma',
      // The same city-page phrase in three scrambled word orders. Their titles are the standard
      // "Chimney Sweep & Repair in {City},MA", and none of the cities they cover has a P1 page —
      // they are the only city page those towns have.
      '%-chimney-sweep-repair-ma',
      '%-chimney-sweep-repair-ma-_',
      '%-chimney-sweep-repair-in-ma',
      'chimney-sweep-repair-%-in-ma',
      'chimney-sweep-repair-%-ma',
      'chimney-sweep-repair-%-ma-_',
    ],
    // Same order as citySlugRes below — the report indexes the two together.
    patternNames: [
      'chimney-sweep-repair-in-{city}-ma',
      'chimney-sweep-fireplace-services-in-{city}-ma',
      'chimcare-chimney-sweep-in-{city}-ma',
      '{city}-chimney-sweep-repair-ma',
      '{city}-chimney-sweep-repair-in-ma',
      'chimney-sweep-repair-{city}-in-ma',
      'chimney-sweep-repair-{city}-ma',
      '{city}-chimney-sweep',
    ],
    // Ordered: the first match wins, so the state-tokened shapes are tried before the bare one.
    // ORDER IS LOAD-BEARING. The first match wins, so the most specific prefix is tried first:
    // `chimney-sweep-repair-{city}-ma` would otherwise swallow `chimney-sweep-repair-in-boston-ma`
    // and report the city as "in-boston". The bare `{city}-chimney-sweep` shape is last because it
    // is the most permissive.
    citySlugRes: [
      /^chimney-sweep-repair-in-(.+?)-ma(?:-\d+)?$/,
      /^chimney-sweep-fireplace-services-in-(.+?)-ma(?:-\d+)?$/,
      /^chimcare-chimney-sweep-in-(.+?)-ma(?:-\d+)?$/,
      /^(.+?)-chimney-sweep-repair-ma(?:-\d+)?$/,
      /^(.+?)-chimney-sweep-repair-in-ma(?:-\d+)?$/,
      // Must precede the plain `-ma` form below: without it, `chimney-sweep-repair-ware-in-ma`
      // yields the city "ware-in", which then fails to match the "ware" token used by that city's
      // service URLs and produces a second, phantom card for the same town.
      /^chimney-sweep-repair-(.+?)-in-ma(?:-\d+)?$/,
      /^chimney-sweep-repair-(.+?)-ma(?:-\d+)?$/,
      /^(.+?)-chimney-sweep(?:-\d+)?$/,
    ],

    // The pilot's thresholds, unchanged. Not to be lowered to make more pages publishable.
    minAreas: 4,
    minLocalLines: 2,
    serviceCatalogueSize: 92,
    farFromBranchKm: 88,

    // Massachusetts states its climate line in paragraph 1 of the "Why … Important in" section and
    // its housing-stock line in paragraph 2 or 3 of that same section, so a depth of 1 discards
    // text that is already in WordPress.
    //
    // 3 is measured, not guessed. Across all 338 Massachusetts city pages, the first housing
    // sentence appears in paragraph 1 on 200 pages, paragraph 2 on 84 and paragraph 3 on 3 — and
    // never deeper. Sections run to at most 5 paragraphs, and paragraph 4+ is the closing
    // generic line rather than local detail, so 3 captures 287/287 while staying bounded:
    // identical in outcome to reading the whole section, but it cannot drift into closing prose.
    //
    // This widens only WHERE the extractor may look. The gate is untouched — a page still needs
    // minLocalLines distinct lines, and 18 Massachusetts pages have no housing sentence at any
    // depth and stay blocked.
    localSpecifics: {
      paragraphScanDepth: 3,
      // Massachusetts writes the same section heading in two word orders — "Why … Is Important in
      // {city}" and "Why … in {city}, MA Is Important" — and the strict default only matches the
      // first, so pages like Dudley looked as though they had no local section at all.
      // Minnesota keeps the strict default: two of its pages carry a second "Why … Important"
      // heading, and a looser match would resolve them to a different section and change their
      // sealed text.
      sectionHeading: /<h2[^>]*>Why [^<]*Important[^<]*<\/h2>/i,
      // Some Massachusetts pages leave the section's prose as bare text with no <p> wrapper
      // (Leominster, Rockland). Reading only <p> elements discarded copy that is plainly present.
      unwrappedParagraphs: true,
    },

    // 6 Massachusetts city pages (and 464 pages overall) were saved with their Markdown never
    // converted to HTML, so their headings, area lists and bullets are literal "## " and "- " text
    // that every extractor here is blind to. Normalising the markers makes that content reachable
    // without altering a word of it. Minnesota has zero such pages, so it stays off there.
    markdownSource: true,

    rejectedGeocodes: {},
    officeConflicts: {},
    slugTypos: {},
    // Slug fragments that are not real Massachusetts cities.
    excludeSuffixes: /^(ma|massachusetts)$/,
    markupDefectRe: /<\/[a-z][a-z0-9_]*\]/g,
    foreignStateRe: /\b(MN|WA|OR|CA|GA|IL|OH|WI|NH|RI|CT)\b/,
  },
};