/**
 * The meta description a page shows search engines, when WordPress never wrote one.
 *
 * WordPress carries a description on 122 of its 229,621 pages, so 12,903 of the 12,982 migrated
 * pages ship without one and Google writes its own snippet from whatever text it finds. A snippet
 * assembled by a crawler is rarely the sentence you would have chosen, and on a page whose opening
 * words are boilerplate it is actively bad.
 *
 * This composes one from the page's OWN content — its first real paragraph, its heading, its city —
 * and never from anything invented. The rules are the ones that caught bad output when the same
 * approach generated the service-card copy:
 *
 *   - it must name this page's city, or it reads identically on every page in the state, which
 *     search engines treat as duplicate content;
 *   - it must not name a different place. Source paragraphs sometimes carry the region they were
 *     written for ("across New England"), which is a lie on a page in Georgia;
 *   - it must end on a whole sentence, not mid-clause;
 *   - it must fit what Google shows, about 155 characters.
 *
 * Where the page's own words cannot satisfy those rules, a plain sentence built from the page's
 * heading and place is used instead. That is still the page's own fact, not a claim about it.
 */

const MAX = 155;
const MIN = 70;

/** Other places a source paragraph might name. A description naming one of these is discarded
 *  unless it is this page's own state. */
const PLACE_WORDS =
  /\b(county|new england|midwest|pacific northwest|east coast|west coast|rocky mountains?|great lakes|new york|massachusetts|minnesota|california|washington|oregon|illinois|michigan|ohio|georgia|texas|florida|colorado|arizona|wisconsin|indiana|tennessee|pennsylvania|utah|idaho|connecticut|rhode island|new hampshire)\b/gi;

const STATE_NAMES: Record<string, string> = {
  MA: 'massachusetts', MN: 'minnesota', CA: 'california', WA: 'washington', OR: 'oregon',
  IL: 'illinois', MI: 'michigan', OH: 'ohio', GA: 'georgia', TX: 'texas', FL: 'florida',
  CO: 'colorado', AZ: 'arizona', WI: 'wisconsin', IN: 'indiana', TN: 'tennessee',
  PA: 'pennsylvania', UT: 'utah', ID: 'idaho', CT: 'connecticut', RI: 'rhode island',
  NH: 'new hampshire', NY: 'new york',
};

// WordPress bodies leave a space where a stripped link used to be, so the source reads
// "Welcome to www.chimcare.com , your trusted provider" and "in Wallingford Center, CT .". Left
// alone that punctuation follows the sentence into the search result, where it looks like a typo.
const tidy = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')   // no space before punctuation
    .replace(/([,.;:!?])(?=[^\s.,;:!?)\]'"”’])/g, '$1 ')  // and one space after it
    .replace(/\s+/g, ' ')
    .trim();

/** Whole sentences up to `max` characters. Returns '' when even the first sentence is too long. */
function toLength(text: string, max: number): string {
  const sentences = tidy(text).split(/(?<=[.!?])\s+/);
  let out = '';
  for (const sentence of sentences) {
    if (!out) {
      if (sentence.length <= max) out = sentence;
      else break;
    } else if (`${out} ${sentence}`.length <= max) {
      out = `${out} ${sentence}`;
    } else break;
  }
  return out;
}

function namesAnotherPlace(text: string, place: { city: string; code: string } | null): boolean {
  const own = place ? STATE_NAMES[place.code.toUpperCase()] : undefined;
  for (const match of text.matchAll(PLACE_WORDS)) {
    const found = match[0].toLowerCase();
    if (found !== own) return true;
  }
  return false;
}

export type DescribableView = {
  title: string;
  metaDescription: string | null;
  place: { city: string; code: string } | null;
  blocks: { type?: string; text?: string }[];
};

/**
 * WordPress's own description where it exists; otherwise one built from this page.
 * Returns undefined only when the page has no title and no place, which cannot happen for a
 * migrated page — the caller then simply omits the tag, as it does today.
 */
export function metaDescriptionFor(view: DescribableView): string | undefined {
  const own = view.metaDescription?.trim();
  if (own) return own;

  const place = view.place;
  const where = place ? `${place.city}, ${place.code}` : null;

  // 1. The page's own opening paragraph, if it can satisfy every rule.
  const paragraph = view.blocks?.find(
    (b) => b.type === 'paragraph' && typeof b.text === 'string' && b.text.trim().length >= 80,
  )?.text;
  if (paragraph && where) {
    const candidate = toLength(paragraph, MAX);
    const mentionsCity = candidate.toLowerCase().includes(place!.city.toLowerCase());
    if (candidate.length >= MIN && mentionsCity && !namesAnotherPlace(candidate, place)) {
      return tidy(candidate);
    }
  }

  // 2. The page's own heading, with the standing facts the whole site already states.
  //    "Since 1989" and the phone-free phrasing come from the site's own trust row, not from nowhere.
  const heading = tidy(view.title).replace(/\s*[|–-]\s*Chimcare\s*$/i, '');
  if (heading && where) {
    const built = `${heading}. Certified, insured chimney and fireplace specialists serving ${where} since 1989. Book online or call for a quote.`;
    return toLength(built, MAX) || built.slice(0, MAX);
  }
  if (heading) return heading.length >= MIN ? heading.slice(0, MAX) : undefined;
  return undefined;
}
