/**
 * No em dashes in visible copy (client request, 2026-09-18). Every page's text passes through here on
 * its way to the template: the migrated WordPress bodies, the reference template's standard copy, the
 * state hub copy and the saved homepage. The dash and the spaces around it become a comma, which reads
 * naturally for the asides and clauses the dash set off ("Yes — our work" → "Yes, our work").
 *
 * SEO values are deliberately left as WordPress has them (page titles, meta descriptions, canonical
 * URLs, JSON-LD), so the migration's check that they still match the source keeps holding: callers
 * name those keys in `skip`.
 */

const EM_DASH = /\s*(?:—|&mdash;|&#8212;|&#x2014;)\s*/gi;

export function withoutEmDash(text: string): string {
  if (!text.includes('—') && !/&(?:mdash|#8212|#x2014);/i.test(text)) return text;
  return text
    .replace(EM_DASH, ', ')
    .replace(/,\s*,/g, ',') // "word, — more" never doubles the comma
    .replace(/,\s*([.!?;:])/g, '$1') // a dash that ended a clause leaves no dangling comma
    .replace(/^,\s*/, '');
}

/** Keys that hold SEO values, addresses or identifiers, never visible running copy. */
export const SEO_KEYS = new Set([
  'seoTitle',
  'metaDescription',
  'meta',
  'jsonLd',
  'url',
  'href',
  'src',
  'slug',
  'canonical',
  'trialPath',
]);

/** Every string in a props tree, except under `skip` keys. Returns a new tree; the input is not changed. */
export function deepWithoutEmDash<T>(value: T, skip: Set<string> = SEO_KEYS): T {
  if (typeof value === 'string') return withoutEmDash(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepWithoutEmDash(v, skip)) as unknown as T;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = skip.has(k) ? v : deepWithoutEmDash(v, skip);
    return out as T;
  }
  return value;
}
