import { parseSourceSections, type SourceSections } from './source-sections';
import { bookingOptions, type BookingOption } from './assemble';
import type { BookingContext } from '@/lib/booking/types';
import type { Prices } from '@/lib/data/pricing';

/**
 * Turns one WordPress location page into the props the leaf template renders.
 *
 * There is one leaf page type on this site: a service in a city. `/location/{service}-in-{city}-{st}/`
 * is the whole universe, so there is one template and one assembler, and what varies between two
 * pages is which sections their bodies actually have — not which template they use.
 *
 * Every section is nullable and is null unless the source supplies it. Nothing is written here: no
 * heading, no paragraph, no FAQ, no area name and no description. Where WordPress has nothing, the
 * page renders one section fewer and `missing` says so.
 */

export type LocationIdentity = {
  url: string;
  slug: string;
  /** Read from the slug's own shape, never guessed. */
  serviceSlug: string | null;
  citySlug: string | null;
  state: string;
  city: string;
  service: string;
};

export type LocationPageProps = {
  identity: LocationIdentity;
  hero: {
    eyebrow: string;
    /** WordPress `post_title`, verbatim. */
    title: string;
    lede: string | null;
    trustLine: Array<{ icon: string; label: string }>;
    image: { src: string; alt: string; width: number; height: number } | null;
    addressLine: string | null;
    phone: string | null;
    phoneHref: string | null;
  };
  intro: { heading: string; paragraphs: string[] } | null;
  whyTrust: { heading: string; paragraphs: string[] } | null;
  serviceDirectory: { heading: string; lede: string | null; items: string[] } | null;
  process: { heading: string; steps: Array<{ title: string; body: string }>; paragraphs: string[] } | null;
  whyChooseUs: { heading: string; paragraphs: string[]; bullets: string[] } | null;
  areas: { heading: string; lede: string | null; list: string[] } | null;
  faq: { heading: string; items: Array<{ question: string; answer: string }> } | null;
  finalCta: { heading: string; paragraphs: string[] } | null;
  /** Headings the outlines do not cover, rendered plainly so no source content is dropped. */
  other: Array<{ heading: string; paragraphs: string[] }>;
  /** The booking widget is the same on every page: chrome, not page content. */
  booking: BookingOption[];
  bookingContext: BookingContext;
  meta: { title: string | null; description: string | null; canonical: string };
  /** What WordPress did not supply for this page. */
  missing: string[];
  /** Which source outline this page is written in, for the report. */
  outline: 'service-in-city' | 'city-hub' | 'short-legacy' | 'unrecognised';
  sectionsFound: string[];
};

const TITLE_CASE = new Set(['in', 'of', 'and', 'the', 'for', 'a', 'an', 'to', 'or']);
const titleise = (slug: string) =>
  slug.split('-').map((w, i) => (i > 0 && TITLE_CASE.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');

function outlineOf(s: SourceSections): LocationPageProps['outline'] {
  if (s.whyImportant && s.process) return 'service-in-city';
  if (s.whyTrust || (s.serviceDirectory && s.localExperts)) return 'city-hub';
  if (s.serviceDirectory || s.whyChooseUs) return 'short-legacy';
  return 'unrecognised';
}

export type LocationSource = {
  url: string;
  slug: string;
  state: string;
  serviceSlug: string | null;
  citySlug: string | null;
  post_title: string;
  post_content: string;
  yoast_title: string | null;
  yoast_metadesc: string | null;
  phone: string | null;
  location: string | null;
  hero?: { src: string; alt: string; width: number; height: number } | null;
};

/**
 * Headline prices come from the client's pricing sheet, never from the page body. Stored in cents,
 * which is what `money()` expects — passing dollars here rendered "$3" for a $299 service.
 */
const NATIONAL_PRICES: Prices = {
  sweep_inspection: 29900,
  inspection: 6900,
  gas_diagnostic: 4900,
  regionId: 0,
  regionName: 'National',
  isDefault: true,
};

export function assembleLocationPage(src: LocationSource, siteUrl = 'https://www.chimcare.com'): LocationPageProps {
  const s = parseSourceSections(src.post_content);
  const city = src.citySlug ? titleise(src.citySlug) : '';
  const service = src.serviceSlug ? titleise(src.serviceSlug) : '';
  const missing: string[] = [];

  // The address WordPress stores on the listing, if any. Not composed from anything else.
  const addressLine = src.location?.trim() ? src.location.trim() : null;
  if (!addressLine) missing.push('address');
  if (!src.phone) missing.push('phone');
  if (!src.hero) missing.push('hero image');
  if (!s.lead) missing.push('lead paragraph');
  if (!s.faqs || !s.faqs.items.length) missing.push('FAQ');
  if (!s.areas || !s.areas.list.length) missing.push('service areas');
  if (!src.yoast_title) missing.push('source title tag');
  if (!src.yoast_metadesc) missing.push('source meta description');

  const phone = src.phone?.trim() || null;

  return {
    identity: { url: src.url, slug: src.slug, serviceSlug: src.serviceSlug, citySlug: src.citySlug, state: src.state, city, service },
    hero: {
      eyebrow: city ? `${city}, ${src.state}` : src.state,
      title: src.post_title,
      lede: s.lead,
      // Company-level claims only. Nothing here asserts anything about this city.
      trustLine: [
        { icon: 'shield', label: 'CSIA Certified' },
        { icon: 'cal', label: 'Since 1989' },
        { icon: 'pin', label: 'Local' },
      ],
      image: src.hero ?? null,
      addressLine,
      phone,
      phoneHref: phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null,
    },
    intro: s.whyImportant,
    whyTrust: s.whyTrust,
    serviceDirectory: s.serviceDirectory
      ? { heading: s.serviceDirectory.heading, lede: s.serviceDirectory.paragraphs[0] ?? null, items: s.serviceDirectory.items }
      : null,
    process: s.process,
    whyChooseUs: s.whyChooseUs,
    areas: s.areas
      ? { heading: s.localExperts?.heading ?? s.areas.heading, lede: s.localExperts?.paragraphs[0] ?? null, list: s.areas.list }
      : null,
    faq: s.faqs && s.faqs.items.length ? { heading: s.faqs.heading, items: s.faqs.items } : null,
    finalCta: s.bookCta,
    other: s.otherSections,
    booking: bookingOptions(NATIONAL_PRICES),
    bookingContext: {
      pageSlug: src.url,
      pageKind: 'city',
      label: city ? `Chimcare · ${city}, ${src.state}` : 'Chimcare',
    },
    meta: {
      // Source only. Where WordPress has no title or description, none is produced.
      title: src.yoast_title ?? null,
      description: src.yoast_metadesc ?? null,
      canonical: `${siteUrl}${src.url}`,
    },
    missing,
    outline: outlineOf(s),
    sectionsFound: s.sectionsFound,
  };
}
