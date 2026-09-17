// assemble(): DB rows + masters → template props. Templates never see a DB row or a {{slot}}.
// The same function backs the admin preview and the n8n publish check (architecture §7).

import type { Branch, City, Faq, LocalSpecifics, Service, ServiceCategory, ServiceRow, State } from '@/lib/db/schema';
import type { Prices } from '@/lib/data/pricing';
import type { Catalog } from '@/lib/data/services';
import { buildContext, fill, fillDeep, money, phoneHref, type SlotContext } from './slots';
import type { BookingContext, ServiceKey } from '@/lib/booking/types';
import { DESIGN, type DesignAsset } from './design-assets';

// `||`, not `??`: a deployment with SITE_URL defined but empty must still get the real origin, or
// `new URL(SITE_URL)` in app/layout.tsx throws and the build fails.
export const SITE_URL = (process.env.SITE_URL || 'https://www.chimcare.com').replace(/\/$/, '');
const NATIONAL_PHONE = '1-800-362-4840';

// ---- shared shapes -------------------------------------------------------------------------

export type Crumb = { label: string; href?: string };
export type TrustItem = { icon: string; title: string; small: string };
export type FaqItem = { question: string; answer: string };
export type BookingOption = { key: 'sweep' | 'inspect' | 'gas' | 'quote'; label: string };
export type Contact = { phone: string; phoneHref: string; addressLines: string[]; directionsHref?: string; servedFrom?: string };

export type ServiceCard = { key: string; cat: string; title: string; copy: string; href?: string };
export type CategoryTile = { key: string; name: string; count: number; src: string; alt: string };

/**
 * The service catalogue as the grid renders it: one card per service, one tile per category.
 * A card links only where that service has a published page in this city, so the grid can never
 * point at a URL that 404s. Shared, because the leaf template and the older city template must show
 * the same catalogue from the same source.
 */
export function catalogueGrid(
  catalog: Catalog,
  ctx: SlotContext,
  serviceSlugs: Map<number, string>,
): { cards: ServiceCard[]; tiles: CategoryTile[] } {
  const catById = new Map(catalog.categories.map((c) => [c.id, c]));
  const cards: ServiceCard[] = catalog.services.map((s) => {
    const cat = catById.get(s.categoryId)!;
    const sctx = { ...ctx, 'service.name': s.name, 'category.name': cat.name };
    const slug = serviceSlugs.get(s.id);
    return { key: s.key, cat: cat.key, title: fill(s.nameTemplate, sctx), copy: fill(s.cardCopyTemplate, sctx), href: slug ? `/location/${slug}/` : undefined };
  });
  const tiles: CategoryTile[] = catalog.categories.map((c) => ({
    key: c.key,
    name: c.name,
    count: cards.filter((k) => k.cat === c.key).length,
    src: '/' + (c.tileImageKey ?? 'img/tile-repair.jpg'),
    alt: c.tileImageAlt ?? c.name,
  }));
  return { cards, tiles };
}

type Masters = Record<string, unknown>;
function master<T>(m: Masters, key: string, ctx: SlotContext): T {
  const body = m[key];
  if (!body) throw new Error(`Missing master "${key}"`);
  return fillDeep(body as T, ctx);
}

function heroImage(city: City) {
  return {
    src: '/' + (city.heroImageKey ?? 'img/hero-spokane.jpg'),
    alt: city.heroImageAlt ?? `Homes and rooftops in ${city.name}`,
    width: 1000,
    height: 749,
  };
}

function contactFor(city: City, branch: Branch | null, state: State): Contact {
  if (!branch) return { phone: NATIONAL_PHONE, phoneHref: phoneHref(NATIONAL_PHONE), addressLines: [] };
  if (city.kind === 'branch') {
    return {
      phone: branch.phone,
      phoneHref: phoneHref(branch.phone),
      addressLines: [branch.street, `${branch.city}, ${state.code} ${branch.zip}`],
      directionsHref: `https://maps.google.com/maps?daddr=${branch.lat},${branch.lng}`,
    };
  }
  return {
    phone: branch.phone,
    phoneHref: phoneHref(branch.phone),
    addressLines: [],
    servedFrom: `Serving ${city.name} from our ${branch.name} crew`,
  };
}

export function bookingOptions(prices: Prices): BookingOption[] {
  return [
    { key: 'sweep', label: `${money(prices.sweep_inspection)} Chimney Sweep + Inspection` },
    { key: 'inspect', label: `${money(prices.inspection)} - Chimney Inspection` },
    { key: 'gas', label: `${money(prices.gas_diagnostic)} Gas Fireplace Diagnostic` },
    { key: 'quote', label: 'Repair Quote' },
  ];
}

// ---- distinctness gate (Tier B) --------------------------------------------------------------

export type GateResult = { ok: boolean; missing: string[] };

/**
 * The six values the gate reads, named independently of where they come from. The seed builder runs
 * the gate on generated rows that are not yet `City` records, so both call shapes reach one body and
 * cannot drift apart.
 */
export type GateInput = {
  neighborhoods: string[];
  localSpecifics: Partial<LocalSpecifics>;
  heroImageKey: string | null;
  hasBranch: boolean;
  pricesAreDefault: boolean;
  faqCount: number;
};

export function distinctnessGate(input: GateInput): GateResult;
export function distinctnessGate(city: City, branch: Branch | null, prices: Prices, faqCount: number): GateResult;
export function distinctnessGate(
  a: GateInput | City,
  branch?: Branch | null,
  prices?: Prices,
  faqCount?: number,
): GateResult {
  const i: GateInput =
    prices === undefined
      ? (a as GateInput)
      : {
          neighborhoods: (a as City).neighborhoods,
          localSpecifics: (a as City).localSpecifics,
          heroImageKey: (a as City).heroImageKey,
          hasBranch: branch != null,
          pricesAreDefault: prices.isDefault,
          faqCount: faqCount ?? 0,
        };
  const missing: string[] = [];
  if (!i.hasBranch) missing.push('serving branch');
  if (i.neighborhoods.length < 4) missing.push(`neighbourhoods (${i.neighborhoods.length}/4)`);
  const specifics = Object.values(i.localSpecifics).filter(Boolean).length;
  if (specifics < 2) missing.push(`local specifics (${specifics}/2)`);
  if (i.pricesAreDefault) missing.push('region pricing (national fallback used)');
  if (!i.heroImageKey) missing.push('hero image');
  if (i.faqCount < 1) missing.push('city-specific FAQ');
  return { ok: missing.length === 0, missing };
}

// ---- city page ------------------------------------------------------------------------------

export type CityPageProps = {
  variant: 'branch' | 'coverage';
  imgCity: string;
  crumbs: Crumb[];
  hero: {
    eyebrow: string;
    title: string;
    lede: string;
    addressLine: string;
    rating: { value: string; count: number | null } | null;
    image: { src: string; alt: string; width: number; height: number };
    figCaption: string;
    /**
     * The hero trust line the newest city mock introduced. It carries the same claims the trust
     * strip already made — the strip is `display:none` in that mock — so nothing new is asserted
     * here; the claims simply moved above the fold. An empty list renders no line.
     */
    trustLine: Array<{ icon: string; label: string }>;
    /** Award marks beside the rating. Only real approved assets; never a drawn stand-in. */
    awards: DesignAsset[];
  };
  contact: Contact;
  trust: TrustItem[];
  intro: { eyebrow: string; heading: string; paragraphs: string[]; cta: string; teamPhoto: DesignAsset | null };
  reasons: Array<{ title: string; body: string }>;
  whyTrust: { eyebrow: string; heading: string; paragraph: string };
  serviceRows: { eyebrow: string; heading: string; lede: string; rows: ServiceRow[]; image: DesignAsset | null };
  solutions: { eyebrow: string; heading: string; lede: string; count: number; tiles: CategoryTile[]; cards: ServiceCard[] };
  areas: { eyebrow: string; heading: string; lede: string; subHeading: string; subLede: string; list: string[]; cta: string; image: DesignAsset | null };
  process: { eyebrow: string; heading: string; lede: string; steps: Array<{ title: string; body: string }> };
  cost: { eyebrow: string; heading: string; paragraph: string; factors: string[]; cta: string };
  faq: { eyebrow: string; heading: string; items: FaqItem[] };
  contactBlock: { eyebrow: string; heading: string; paragraph: string; whyHeading: string; why: string[] };
  finalCta: { eyebrow: string; heading: string; paragraph: string; cta: string };
  booking: BookingOption[];
  bookingContext: BookingContext;
  meta: { title: string; description: string; canonical: string };
  jsonLd: unknown[];
  gate: GateResult;
};

export function assembleCityPage(input: {
  city: City;
  state: State;
  branch: Branch | null;
  prices: Prices;
  faqs: Faq[];
  catalog: Catalog;
  serviceSlugs: Map<number, string>;
  masters: Masters;
}): CityPageProps {
  const { city, state, branch, prices, faqs, catalog, serviceSlugs, masters } = input;
  const ctx = buildContext({ state, city, branch, prices, servicesCount: catalog.services.length });
  const m = <T,>(key: string) => master<T>(masters, key, ctx);

  const hero = m<{ eyebrow: string; title: string; lede: string; figCaption: string }>('city_hero');
  const contact = contactFor(city, branch, state);
  const cityFaqs = faqs.map((f) => ({ question: fill(f.question, ctx), answer: fill(f.answer, ctx) }));
  const masterFaq = m<{ eyebrow: string; heading: string; items: FaqItem[] }>('faq_city');
  const contactMaster = m<{ eyebrow: string; heading: string; paragraph: string; whyHeading: string; why: string[] }>('contact');

  const why = [...contactMaster.why];
  if (branch?.licenses.length) why.push(`Licensed & insured — ${branch.licenses.join(' · ')}.`);
  if (branch?.rating) why.push(`Rated ${branch.rating} on Google by homeowners across ${city.name}.`);

  const catById = new Map(catalog.categories.map((c) => [c.id, c]));
  const cards: ServiceCard[] = catalog.services.map((s) => {
    const cat = catById.get(s.categoryId)!;
    const sctx = { ...ctx, 'service.name': s.name, 'category.name': cat.name };
    const slug = serviceSlugs.get(s.id);
    return { key: s.key, cat: cat.key, title: fill(s.nameTemplate, sctx), copy: fill(s.cardCopyTemplate, sctx), href: slug ? `/location/${slug}/` : undefined };
  });
  const tiles: CategoryTile[] = catalog.categories.map((c) => ({
    key: c.key,
    name: c.name,
    count: cards.filter((k) => k.cat === c.key).length,
    src: '/' + (c.tileImageKey ?? 'img/tile-repair.jpg'),
    alt: c.tileImageAlt ?? c.name,
  }));

  const trust: TrustItem[] = [
    { icon: 'cal', title: 'Since 1989', small: 'Family-owned, 30+ years in business' },
    { icon: 'shield', title: 'Certified', small: 'Licensed & insured technicians' },
    city.kind === 'branch' && branch
      ? { icon: 'pin', title: `Local ${city.name} Team`, small: `Based on ${branch.streetShort}` }
      : { icon: 'pin', title: `${city.name} coverage`, small: branch ? `Served from our ${branch.name} crew` : 'Served by the nearest Chimcare crew' },
  ];

  const canonical = `${SITE_URL}/location/${city.slug}/`;
  const meta = {
    title: city.metaTitle ?? `${hero.title} - Chimcare`,
    description:
      city.metaDescription ??
      `Chimney sweep, inspection, repair and fireplace services in ${city.name}, ${state.code}. Dust-free cleaning, honest pricing and certified local technicians. Call ${contact.phone}.`,
    canonical,
  };

  const solutionsMaster = m<{ eyebrow: string; heading: string; lede: string }>('solutions');
  const areasMaster = m<{ eyebrow: string; heading: string; lede: string; subHeading: string; subLede: string; cta: string }>('areas');

  return {
    variant: city.kind,
    imgCity: '/' + (city.heroImageKey ?? 'img/css-7c0c2d41.jpg'),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Locations', href: '/locations/' },
      { label: state.name, href: `/locations/${state.slug}/` },
      { label: city.name },
    ],
    hero: {
      ...hero,
      addressLine: city.kind === 'branch' && branch ? `${branch.street}, ${branch.city}, ${state.code} ${branch.zip}` : contact.servedFrom ?? '',
      rating: branch?.rating ? { value: String(branch.rating), count: branch.ratingCount } : null,
      image: heroImage(city),
      // The same three claims the trust strip carried, moved above the fold by the newest mock.
      trustLine: [
        { icon: 'shield', label: 'CSIA Certified' },
        { icon: 'cal', label: 'Since 1989' },
        { icon: 'pin', label: 'Local' },
      ],
      awards: DESIGN.awards,
    },
    contact,
    trust,
    intro: { ...m<{ eyebrow: string; heading: string; paragraphs: string[]; cta: string }>('city_intro'), teamPhoto: DESIGN.cityTeam },
    reasons: m<{ items: Array<{ title: string; body: string }> }>('reasons').items,
    whyTrust: m('why_trust'),
    serviceRows: { ...m<{ eyebrow: string; heading: string; lede: string; rows: ServiceRow[] }>('service_rows'), image: DESIGN.cityServices },
    solutions: { ...solutionsMaster, count: cards.length, tiles, cards },
    areas: { ...areasMaster, list: [...city.neighborhoods, 'Surrounding areas'], image: DESIGN.cityAreas },
    process: m('process'),
    cost: m('cost'),
    faq: { eyebrow: masterFaq.eyebrow, heading: masterFaq.heading, items: [...masterFaq.items.slice(0, 4), ...cityFaqs, ...masterFaq.items.slice(4)] },
    contactBlock: { ...contactMaster, why },
    finalCta: m('final_cta'),
    booking: bookingOptions(prices),
    bookingContext: {
      pageSlug: `/location/${city.slug}/`,
      pageKind: 'city',
      label: `Chimcare · ${city.name}, ${state.code}`,
      stateCode: state.code,
      stateName: state.name,
      cityId: city.id,
      cityName: city.name,
      branchId: branch?.id,
      branchName: branch?.name,
    },
    meta,
    jsonLd: cityJsonLd({ city, state, branch, canonical, meta, cards }),
    gate: distinctnessGate(city, branch, prices, cityFaqs.length),
  };
}

function cityJsonLd(input: {
  city: City;
  state: State;
  branch: Branch | null;
  canonical: string;
  meta: { title: string; description: string };
  cards: ServiceCard[];
}) {
  const { city, state, branch, canonical, meta, cards } = input;
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Locations', item: `${SITE_URL}/locations/` },
      { '@type': 'ListItem', position: 3, name: state.name, item: `${SITE_URL}/locations/${state.slug}/` },
      { '@type': 'ListItem', position: 4, name: city.name },
    ],
  };
  const webPage = { '@type': 'WebPage', '@id': canonical, url: canonical, name: meta.title, description: meta.description, breadcrumb: { '@id': `${canonical}#breadcrumb` }, inLanguage: 'en' };
  const offers = {
    '@type': 'OfferCatalog',
    name: `Chimney, fireplace and vent services in ${city.name}, ${state.code}`,
    itemListElement: cards.map((c) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: c.title, ...(c.href ? { url: `${SITE_URL}${c.href}` } : {}) } })),
  };
  const org = { '@id': `${SITE_URL}/#organization` };
  const business =
    city.kind === 'branch' && branch
      ? {
          '@type': 'HomeAndConstructionBusiness',
          '@id': `${canonical}#localbusiness`,
          name: `Chimcare — Chimney Sweep & Fireplace Services in ${city.name}, ${state.code}`,
          url: canonical,
          telephone: branch.phone,
          address: { '@type': 'PostalAddress', streetAddress: branch.street, addressLocality: branch.city, addressRegion: state.code, postalCode: branch.zip, addressCountry: 'US' },
          geo: { '@type': 'GeoCoordinates', latitude: branch.lat, longitude: branch.lng },
          areaServed: [{ '@type': 'City', name: city.name }, ...city.neighborhoods.map((n) => ({ '@type': 'Place', name: n }))],
          parentOrganization: org,
          hasOfferCatalog: offers,
        }
      : {
          // Coverage city: a Service provided by the serving branch. No street address is claimed here.
          '@type': 'Service',
          '@id': `${canonical}#service`,
          name: `Chimney Sweep & Fireplace Services in ${city.name}, ${state.code}`,
          url: canonical,
          serviceType: 'Chimney sweep, inspection, repair and fireplace service',
          areaServed: [{ '@type': 'City', name: city.name }, ...city.neighborhoods.map((n) => ({ '@type': 'Place', name: n }))],
          provider: branch ? { '@type': 'HomeAndConstructionBusiness', name: `Chimcare ${branch.name}`, telephone: branch.phone, address: { '@type': 'PostalAddress', addressLocality: branch.city, addressRegion: state.code, addressCountry: 'US' } } : org,
          hasOfferCatalog: offers,
        };
  // Deliberately no AggregateRating / Review markup (decision Q5).
  return [{ '@context': 'https://schema.org', '@graph': [webPage, breadcrumb, business] }];
}

// ---- service page ----------------------------------------------------------------------------

export type ServicePageProps = {
  variant: 'branch' | 'coverage';
  imgCity: string;
  crumbs: Crumb[];
  hero: { eyebrow: string; title: string; lede: string; addressLine: string };
  contact: Contact;
  trust: TrustItem[];
  row: ServiceRow | null; // long-form support copy from the matching headline service row, if any
  process: CityPageProps['process'];
  cost: CityPageProps['cost'];
  faq: CityPageProps['faq'];
  related: { heading: string; items: Array<{ title: string; href?: string }>; cityLink: { label: string; href: string } };
  finalCta: CityPageProps['finalCta'];
  booking: BookingOption[];
  bookingContext: BookingContext;
  initialService: ServiceKey | null; // the category's booking option is preselected on a service page
  meta: { title: string; description: string; canonical: string };
  jsonLd: unknown[];
};

export function assembleServicePage(input: {
  slug: string;
  city: City;
  state: State;
  branch: Branch | null;
  prices: Prices;
  faqs: Faq[];
  service: Service;
  category: ServiceCategory;
  catalog: Catalog;
  serviceSlugs: Map<number, string>;
  masters: Masters;
}): ServicePageProps {
  const { slug, city, state, branch, prices, faqs, service, category, catalog, serviceSlugs, masters } = input;
  const ctx = buildContext({ state, city, branch, prices, service, category, servicesCount: catalog.services.length });
  const m = <T,>(key: string) => master<T>(masters, key, ctx);

  const sp = m<{ eyebrow: string; title: string; relatedHeading: string; cityLink: string }>('service_page');
  const rows = m<{ rows: ServiceRow[] }>('service_rows').rows;
  const row = category.rowKey ? rows.find((r) => r.key === category.rowKey) ?? null : null;
  const contact = contactFor(city, branch, state);
  const canonical = `${SITE_URL}/location/${slug}/`;
  const lede = fill(service.cardCopyTemplate, ctx);
  const masterFaq = m<{ eyebrow: string; heading: string; items: FaqItem[] }>('faq_city');
  const cityFaqs = faqs.filter((f) => f.scope === 'city').map((f) => ({ question: fill(f.question, ctx), answer: fill(f.answer, ctx) }));

  const related = catalog.services
    .filter((s) => s.categoryId === category.id && s.id !== service.id)
    .map((s) => {
      const rslug = serviceSlugs.get(s.id);
      return { title: fill(s.nameTemplate, { ...ctx, 'service.name': s.name }), href: rslug ? `/location/${rslug}/` : undefined };
    });

  const meta = { title: `${sp.title} - Chimcare`, description: lede, canonical };
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', '@id': canonical, url: canonical, name: meta.title, description: lede, inLanguage: 'en' },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Locations', item: `${SITE_URL}/locations/` },
            { '@type': 'ListItem', position: 3, name: state.name, item: `${SITE_URL}/locations/${state.slug}/` },
            { '@type': 'ListItem', position: 4, name: city.name, item: `${SITE_URL}/location/${city.slug}/` },
            { '@type': 'ListItem', position: 5, name: service.name },
          ],
        },
        {
          '@type': 'Service',
          '@id': `${canonical}#service`,
          name: sp.title,
          serviceType: category.name,
          url: canonical,
          areaServed: { '@type': 'City', name: city.name },
          provider: branch
            ? { '@type': 'HomeAndConstructionBusiness', name: `Chimcare ${branch.name}`, telephone: branch.phone }
            : { '@id': `${SITE_URL}/#organization` },
        },
      ],
    },
  ];

  return {
    variant: city.kind,
    imgCity: '/' + (city.heroImageKey ?? 'img/css-7c0c2d41.jpg'),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Locations', href: '/locations/' },
      { label: state.name, href: `/locations/${state.slug}/` },
      { label: city.name, href: `/location/${city.slug}/` },
      { label: service.name },
    ],
    hero: { eyebrow: sp.eyebrow, title: sp.title, lede, addressLine: city.kind === 'branch' && branch ? `${branch.street}, ${branch.city}, ${state.code} ${branch.zip}` : contact.servedFrom ?? '' },
    contact,
    trust: [
      { icon: 'cal', title: 'Since 1989', small: 'Family-owned, 30+ years in business' },
      { icon: 'shield', title: 'Certified', small: 'Licensed & insured technicians' },
      { icon: 'wrench', title: category.name, small: `One of ${catalog.services.length} services in ${city.name}` },
    ],
    row,
    process: m('process'),
    cost: m('cost'),
    faq: { eyebrow: masterFaq.eyebrow, heading: masterFaq.heading, items: [...cityFaqs, ...masterFaq.items.slice(0, 3)] },
    related: { heading: sp.relatedHeading, items: related, cityLink: { label: sp.cityLink, href: `/location/${city.slug}/` } },
    finalCta: m('final_cta'),
    booking: bookingOptions(prices),
    bookingContext: {
      pageSlug: `/location/${slug}/`,
      pageKind: 'service',
      label: `Chimcare · ${city.name}, ${state.code}`,
      stateCode: state.code,
      stateName: state.name,
      cityId: city.id,
      cityName: city.name,
      branchId: branch?.id,
      branchName: branch?.name,
      serviceId: service.id,
      serviceName: service.name,
    },
    initialService: (['sweep', 'inspect', 'gas', 'quote'] as const).includes(category.bookingService as never) ? (category.bookingService as ServiceKey) : null,
    meta,
    jsonLd,
  };
}
