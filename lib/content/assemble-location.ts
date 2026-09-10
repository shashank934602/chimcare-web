import { parseSourceSections, type SourceSections } from './source-sections';
import { bookingOptions, type BookingOption, type ServiceCard, type CategoryTile, type TrustItem } from './assemble';
import { buildContext, fillDeep } from './slots';
import { DESIGN, type DesignAsset } from './design-assets';
import type { BookingContext } from '@/lib/booking/types';
import type { Prices } from '@/lib/data/pricing';
import type { Branch, City, ServiceRow, State } from '@/lib/db/schema';

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
  /** The state's full name, which is what the mock's breadcrumb shows. */
  stateName: string;
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
    figCaption: string | null;
    /**
     * The Google rating pill the mock shows. Rendered only where a rating is recorded against the
     * branch: the mock's 4.7 is design placeholder, and asserting a rating nobody has measured would
     * be a claim about the business. Open question Q5.
     */
    rating: { value: string; count: number | null } | null;
    /** Award marks beside the rating, from the approved mock. Identical on every page. */
    awards: DesignAsset[];
    addressLine: string | null;
    phone: string | null;
    phoneHref: string | null;
  };
  /** The trust strip under the hero. Design furniture, identical on every page. */
  trust: TrustItem[];
  intro: { eyebrow: string; heading: string; paragraphs: string[]; cta: string; teamPhoto: DesignAsset | null } | null;
  /** The three numbered reasons beside the introduction. Master copy from the mock. */
  reasons: Array<{ title: string; body: string }>;
  whyTrust: { heading: string; paragraphs: string[]; art: DesignAsset | null } | null;
  /** The eight-row service accordion. Master copy from the mock, the same eight on every page. */
  serviceRows: { eyebrow: string; heading: string; lede: string; rows: ServiceRow[]; image: DesignAsset | null } | null;
  /** The full catalogue grid with its category tiles. */
  solutions: { eyebrow: string; heading: string; lede: string; count: number; tiles: CategoryTile[]; cards: ServiceCard[] } | null;
  /** The pricing panel. Master copy; the figures come from the pricing sheet. */
  cost: { eyebrow: string; heading: string; paragraph: string; factors: string[]; cta: string } | null;
  /** The contact block and its "why us" card. */
  contact: { eyebrow: string; heading: string; paragraph: string; whyHeading: string; why: string[];
             phone: string | null; phoneHref: string | null; addressLines: string[]; servedFrom: string | null } | null;
  serviceDirectory: { heading: string; lede: string | null; items: string[] } | null;
  process: { heading: string; steps: Array<{ title: string; body: string }>; paragraphs: string[] } | null;
  whyChooseUs: { heading: string; paragraphs: string[]; bullets: string[] } | null;
  areas: { eyebrow: string; heading: string; lede: string | null; subHeading: string | null; list: string[]; image: DesignAsset | null } | null;
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

/**
 * What the page needs beyond its own body: the client's business facts and the approved design copy.
 * These are the same on every page by design — the mock ships them, and the brief is to keep them
 * consistent across city and service pages rather than vary or drop them.
 */
export type LocationContext = {
  city?: City | null;
  state?: State | null;
  branch?: Branch | null;
  prices?: Prices | null;
  /** `site.masters` — the 13 copy blocks extracted from this same mock, with {{slot}} placeholders. */
  masters?: Record<string, unknown> | null;
  catalog?: { count: number; tiles: CategoryTile[]; cards: ServiceCard[] } | null;
};

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

export function assembleLocationPage(
  src: LocationSource,
  ctx: LocationContext = {},
  siteUrl = 'https://www.chimcare.com',
): LocationPageProps {
  const s = parseSourceSections(src.post_content);
  const city = src.citySlug ? titleise(src.citySlug) : '';
  const service = src.serviceSlug ? titleise(src.serviceSlug) : '';
  const missing: string[] = [];

  const prices = ctx.prices ?? NATIONAL_PRICES;
  const branch = ctx.branch ?? null;

  // Master copy is the design's own words, with {{slot}} placeholders filled from this page's row.
  // Where the page's body says the same thing in its own words, the body wins.
  const slots = ctx.state
    ? buildContext({ state: ctx.state, city: ctx.city ?? undefined, branch, prices, servicesCount: ctx.catalog?.count })
    : null;
  const master = <T,>(key: string): T | null => {
    const raw = ctx.masters?.[key];
    if (raw === undefined || raw === null) return null;
    return (slots ? fillDeep(raw, slots) : raw) as T;
  };

  const addressLine = branch
    ? `${branch.street}, ${branch.city}, ${ctx.state?.code ?? src.state} ${branch.zip}`
    : src.location?.trim() || null;
  const phone = branch?.phone ?? (src.phone?.trim() || null);
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null;

  if (!addressLine) missing.push('address');
  if (!phone) missing.push('phone');
  if (!s.lead) missing.push('lead paragraph');
  if (!s.faqs?.items.length) missing.push('FAQ');
  if (!s.areas?.list.length) missing.push('service areas');
  if (!src.yoast_title) missing.push('source title tag');
  if (!src.yoast_metadesc) missing.push('source meta description');

  const heroMaster = master<{ eyebrow: string; title: string; lede: string; figCaption: string }>('city_hero');
  const introMaster = master<{ eyebrow: string; heading: string; paragraphs: string[]; cta: string }>('city_intro');
  const reasonsMaster = master<{ items: Array<{ title: string; body: string }> }>('reasons');
  const whyTrustMaster = master<{ eyebrow: string; heading: string; paragraph: string }>('why_trust');
  const rowsMaster = master<{ eyebrow: string; heading: string; lede: string; rows: ServiceRow[] }>('service_rows');
  const solutionsMaster = master<{ eyebrow: string; heading: string; lede: string }>('solutions');
  const areasMaster = master<{ eyebrow: string; heading: string; lede: string; subHeading: string }>('areas');
  const processMaster = master<{ eyebrow: string; heading: string; steps: Array<{ title: string; body: string }> }>('process');
  const costMaster = master<{ eyebrow: string; heading: string; paragraph: string; factors: string[]; cta: string }>('cost');
  const faqMaster = master<{ eyebrow: string; heading: string; items: Array<{ question: string; answer: string }> }>('faq_city');
  const contactMaster = master<{ eyebrow: string; heading: string; paragraph: string; whyHeading: string; why: string[] }>('contact');

  // The page's own hero photograph if it has one, otherwise the mock's. The brief is to keep the
  // imagery consistent across city and service pages rather than leave a page without one.
  const heroImage = src.hero ?? DESIGN.cityHero;

  return {
    identity: {
      url: src.url, slug: src.slug, serviceSlug: src.serviceSlug, citySlug: src.citySlug,
      state: ctx.state?.code ?? src.state,
      stateName: ctx.state?.name ?? src.state,
      city: ctx.city?.name ?? city,
      service,
    },
    hero: {
      eyebrow: heroMaster?.eyebrow ?? (city ? `${city}, ${src.state}` : src.state),
      title: src.post_title,
      // The mock's hero lede is one short line, capped at 44ch by the stylesheet. The body's opening
      // paragraph is a full paragraph and belongs in the introduction, where the mock puts its prose;
      // dropping it into the hero stretched the hero to twice its designed height.
      lede: heroMaster?.lede ?? s.lead ?? null,
      trustLine: [
        { icon: 'shield', label: 'CSIA Certified' },
        { icon: 'cal', label: 'Since 1989' },
        { icon: 'pin', label: 'Local' },
      ],
      image: heroImage,
      figCaption: heroMaster?.figCaption ?? null,
      rating: branch?.rating ? { value: String(branch.rating), count: branch.ratingCount } : null,
      awards: DESIGN.awards,
      addressLine,
      phone,
      phoneHref,
    },
    trust: [
      { icon: 'cal', title: 'Since 1989', small: 'Family-owned, 30+ years in business' },
      { icon: 'shield', title: 'Certified', small: 'Licensed & insured technicians' },
      { icon: 'pin', title: ctx.city ? `Local ${ctx.city.name} Team` : 'Local team', small: addressLine ?? 'Serving this area' },
    ],
    // The body's own "why it matters" if it has one; otherwise the design's introduction.
    // The introduction is where the page's own prose lives: its opening paragraph first, then its
    // "why it matters" section. Master copy fills in only when the body has neither.
    intro: s.whyImportant || s.lead
      ? {
          eyebrow: introMaster?.eyebrow ?? 'Chimcare',
          heading: s.whyImportant?.heading ?? introMaster?.heading ?? '',
          paragraphs: [...(s.lead ? [s.lead] : []), ...(s.whyImportant?.paragraphs ?? [])],
          cta: introMaster?.cta ?? 'Get a Quote',
          teamPhoto: DESIGN.cityTeam,
        }
      : introMaster
        ? { ...introMaster, teamPhoto: DESIGN.cityTeam }
        : null,
    reasons: reasonsMaster?.items ?? [],
    whyTrust: s.whyTrust
      ? { heading: s.whyTrust.heading, paragraphs: s.whyTrust.paragraphs, art: DESIGN.trustArt }
      : whyTrustMaster
        ? { heading: whyTrustMaster.heading, paragraphs: [whyTrustMaster.paragraph], art: DESIGN.trustArt }
        : null,
    serviceRows: rowsMaster ? { ...rowsMaster, image: DESIGN.cityServices } : null,
    serviceDirectory: s.serviceDirectory && s.serviceDirectory.items.length
      ? { heading: s.serviceDirectory.heading, lede: s.serviceDirectory.paragraphs[0] ?? null, items: s.serviceDirectory.items }
      : null,
    solutions: ctx.catalog && solutionsMaster
      ? { ...solutionsMaster, count: ctx.catalog.count, tiles: ctx.catalog.tiles, cards: ctx.catalog.cards }
      : null,
    process: s.process ?? (processMaster ? { heading: processMaster.heading, steps: processMaster.steps, paragraphs: [] } : null),
    whyChooseUs: s.whyChooseUs,
    areas: s.areas?.list.length
      ? { eyebrow: areasMaster?.eyebrow ?? 'Service area', heading: s.localExperts?.heading ?? areasMaster?.heading ?? s.areas.heading,
          lede: s.localExperts?.paragraphs[0] ?? areasMaster?.lede ?? null, subHeading: areasMaster?.subHeading ?? s.areas.heading,
          list: s.areas.list, image: DESIGN.cityAreas }
      : ctx.city?.neighborhoods.length && areasMaster
        ? { eyebrow: areasMaster.eyebrow, heading: areasMaster.heading, lede: areasMaster.lede, subHeading: areasMaster.subHeading,
            list: ctx.city.neighborhoods, image: DESIGN.cityAreas }
        : null,
    cost: costMaster,
    faq: s.faqs?.items.length
      ? { heading: s.faqs.heading, items: s.faqs.items }
      : faqMaster ? { heading: faqMaster.heading, items: faqMaster.items } : null,
    contact: contactMaster
      ? { ...contactMaster, phone, phoneHref, addressLines: branch ? [branch.street, `${branch.city}, ${ctx.state?.code ?? src.state} ${branch.zip}`] : [], servedFrom: branch ? null : addressLine }
      : null,
    finalCta: s.bookCta ?? (master<{ heading: string; paragraph: string }>('final_cta')
      ? { heading: master<{ heading: string }>('final_cta')!.heading, paragraphs: [master<{ paragraph: string }>('final_cta')!.paragraph] }
      : null),
    other: s.otherSections,
    booking: bookingOptions(prices),
    bookingContext: { pageSlug: src.url, pageKind: 'city', label: city ? `Chimcare · ${city}, ${src.state}` : 'Chimcare' },
    meta: { title: src.yoast_title ?? null, description: src.yoast_metadesc ?? null, canonical: `${siteUrl}${src.url}` },
    missing,
    outline: outlineOf(s),
    sectionsFound: s.sectionsFound,
  };
}
