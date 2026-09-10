import type { AccordionItem, Branch, City, EditorialBlock, State } from '@/lib/db/schema';
import type { CityListing } from '@/lib/data/states';
import type { Prices } from '@/lib/data/pricing';
import { buildContext, fillDeep, money, phoneHref } from './slots';
import { SITE_URL, bookingOptions, type BookingOption, type Crumb, type TrustItem } from './assemble';
import type { BookingContext } from '@/lib/booking/types';

const NATIONAL_PHONE = '1-800-362-4840';

// ---- state hub -------------------------------------------------------------------------------

export type LocationCard = {
  id: string;
  name: string;
  kind: 'branch' | 'coverage';
  title: string;
  addressLines: string[];
  servedFrom?: string;
  phone: string;
  phoneHref: string;
  href?: string; // undefined when the city page is not published
  photo?: { src: string; alt: string };
  search: string;
};

export type StateHubProps = {
  imgState: string;
  crumbs: Crumb[];
  hero: { name: string; lede: string; count: number };
  trust: TrustItem[];
  directory: { eyebrow: string; heading: string; lede: string; cards: LocationCard[] };
  intro: { eyebrow: string; heading: string; paragraphs: string[]; stats: Array<{ title: string; body: string }> };
  editorial: EditorialBlock[];
  detail: { eyebrow: string; heading: string; lede: string; items: AccordionItem[] };
  crew: Array<{ src: string; alt: string; title: string; small: string }>;
  finalCta: { eyebrow: string; heading: string; paragraph: string };
  phone: string;
  phoneHref: string;
  booking: BookingOption[];
  bookingContext: BookingContext;
  meta: { title: string; description: string; canonical: string };
  jsonLd: unknown[];
};

export function assembleStateHub(input: { state: State; listings: CityListing[]; prices: Prices }): StateHubProps {
  const { state, listings, prices } = input;
  const ctx = buildContext({ state, prices });
  const canonical = `${SITE_URL}/locations/${state.slug}/`;

  const cards: LocationCard[] = listings.map(({ city, branch, published }) => {
    const isBranch = city.kind === 'branch' && !!branch;
    return {
      id: city.slug,
      name: city.name,
      kind: city.kind,
      title: `Chimney Sweep & Fireplace Services in ${city.name}`,
      addressLines: isBranch ? [branch!.street, `${branch!.city}, ${state.code} ${branch!.zip}`] : [],
      servedFrom: !isBranch && branch ? `Served from our ${branch.name} crew` : undefined,
      phone: branch?.phone ?? NATIONAL_PHONE,
      phoneHref: phoneHref(branch?.phone ?? NATIONAL_PHONE),
      href: published ? `/location/${city.slug}/` : undefined,
      // The city's own WordPress hero, migrated byte-for-byte. Previously this read branch.photoKey,
      // which is null for every branch and absent on coverage cities, so no card ever showed an image.
      photo: city.heroImageKey
        ? { src: '/' + city.heroImageKey, alt: city.heroImageAlt ?? `Chimcare chimney sweep and repair service in ${city.name}, ${state.code}` }
        : undefined,
      // Deliberately excludes the state name: it is identical on every card, so including it made
      // any letter appearing in "Minnesota" match all 150 towns.
      search: [city.name, ...(isBranch ? [branch!.street, branch!.zip] : [])].join(' '),
    };
  });

  const meta = {
    title: `Chimcare Locations in ${state.name} | Chimney Sweep & Repair`,
    description: `${state.blurb} Find your local ${state.name} Chimcare crew.`,
    canonical,
  };

  return {
    imgState: '/' + (state.photoKey ?? 'img/css-aaaca1ea.webp'),
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Locations', href: '/locations/' }, { label: state.name }],
    hero: { name: state.name, lede: state.heroLede, count: cards.length },
    trust: [
      { icon: 'cal', title: 'Since 1989', small: `30+ years serving homeowners` },
      { icon: 'shield', title: 'Certified', small: 'CSIA certified & background-checked' },
      { icon: 'snow', title: `Built for ${state.name} weather`, small: state.climateNotes[0]?.body ?? '' },
      { icon: 'flame', title: `Gas fireplace diagnostic ${money(prices.gas_diagnostic)}`, small: 'Ignition, valve and safety check' },
    ],
    directory: {
      eyebrow: `${state.name} directory`,
      heading: 'Pick the crew nearest you.',
      lede: `Every location below is staffed by a Chimcare team covering that city and the towns around it.`,
      cards,
    },
    intro: { eyebrow: state.name, heading: state.introHeading, paragraphs: fillDeep(state.introParagraphs, ctx), stats: state.climateNotes },
    editorial: state.editorial,
    detail: {
      eyebrow: 'More detail',
      heading: `Inspections, ${state.name}-specific services and what sets us apart.`,
      lede: 'The full detail is here — open only the parts that apply to your home.',
      items: fillDeep(state.detailAccordion, ctx),
    },
    crew: [
      { src: '/img/crew-sweeping.jpg', alt: 'A Chimcare technician sweeping a chimney from a rooftop', title: 'Sweeping', small: 'Dust-controlled, roof or hearth side' },
      { src: '/img/crew-inspection.jpg', alt: 'A Chimcare technician documenting a fireplace inspection', title: 'Inspection', small: 'Documented with photos before we leave' },
      { src: '/img/crew-masonry.jpg', alt: 'A Chimcare mason repairing a masonry chimney', title: 'Repair & masonry', small: 'Crowns, caps, flashing and rebuilds' },
      { src: '/img/crew-gas.jpg', alt: 'A serviced gas fireplace burning behind a screen', title: 'Gas fireplace service', small: 'Ignition, valve and safety checks' },
    ],
    finalCta: {
      eyebrow: `Chimcare · ${state.name}`,
      heading: 'Schedule your service today and experience the local difference.',
      paragraph: `Keeping ${state.name}'s chimneys safe, efficient, and well-maintained since 1989.`,
    },
    phone: NATIONAL_PHONE,
    phoneHref: phoneHref(NATIONAL_PHONE),
    booking: bookingOptions(prices),
    bookingContext: { pageSlug: `/locations/${state.slug}/`, pageKind: 'state', label: `Chimcare · ${state.name}`, stateCode: state.code, stateName: state.name },
    meta,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebPage', '@id': canonical, url: canonical, name: meta.title, description: meta.description, inLanguage: 'en' },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'Locations', item: `${SITE_URL}/locations/` },
              { '@type': 'ListItem', position: 3, name: state.name },
            ],
          },
          {
            '@type': 'ItemList',
            name: `Chimcare locations in ${state.name}`,
            itemListElement: cards.filter((c) => c.href).map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, url: `${SITE_URL}${c.href}` })),
          },
        ],
      },
    ],
  };
}

// ---- national hub ----------------------------------------------------------------------------

export type StateCard = {
  code: string;
  name: string;
  verified: boolean;
  blurb: string;
  photo?: string;
  cities: string[];
  href?: string;
};

export type NationalHubProps = {
  hero: { states: number; cities: number };
  trust: TrustItem[];
  stateCards: StateCard[];
  coverageOnly: string[];
  crew: StateHubProps['crew'];
  phone: string;
  phoneHref: string;
  booking: BookingOption[];
  bookingContext: BookingContext;
  meta: { title: string; description: string; canonical: string };
  jsonLd: unknown[];
};

export function assembleNationalHub(input: { states: State[]; citiesByState: Map<number, City[]>; branchesByState: Map<number, Branch[]>; prices: Prices }): NationalHubProps {
  const { states, citiesByState, prices } = input;
  const canonical = `${SITE_URL}/locations/`;
  const stateCards: StateCard[] = states.map((s) => {
    const cities = (citiesByState.get(s.id) ?? []).map((c) => c.name);
    return {
      code: s.code,
      name: s.name,
      verified: s.verified && cities.length > 0,
      blurb: s.blurb,
      photo: s.photoKey ? '/' + s.photoKey : undefined,
      cities,
      href: s.verified && cities.length ? `/locations/${s.slug}/` : undefined,
    };
  });
  const cityCount = stateCards.reduce((n, s) => n + s.cities.length, 0);
  const meta = {
    title: 'Chimcare Service Locations | Chimney Sweep, Repair & Masonry',
    description: `Find your local Chimcare chimney sweep, repair and masonry crew. Serving homeowners in ${states.length} states.`,
    canonical,
  };
  return {
    hero: { states: states.length, cities: cityCount },
    trust: [
      { icon: 'cal', title: 'Since 1989', small: 'Family-owned, 30+ years in business' },
      { icon: 'shield', title: 'Certified', small: 'CSIA-certified, licensed & insured crews' },
      { icon: 'broom', title: `Sweep + inspection ${money(prices.sweep_inspection)}`, small: `Inspection on its own ${money(prices.inspection)}` },
      { icon: 'wrench', title: 'Free repair & masonry quotes', small: 'Priced on site before work starts' },
    ],
    stateCards,
    coverageOnly: stateCards.filter((s) => !s.verified).map((s) => s.name),
    crew: [
      { src: '/img/crew-sweeping.jpg', alt: 'A Chimcare technician sweeping a chimney from a rooftop', title: 'Sweeping', small: 'Dust-controlled, roof or hearth side' },
      { src: '/img/crew-inspection.jpg', alt: 'A Chimcare technician documenting a fireplace inspection', title: 'Inspection', small: 'Documented with photos before we leave' },
      { src: '/img/crew-masonry.jpg', alt: 'A Chimcare mason repairing a masonry chimney', title: 'Repair & masonry', small: 'Crowns, caps, flashing and rebuilds' },
      { src: '/img/crew-gas.jpg', alt: 'A serviced gas fireplace burning behind a screen', title: 'Gas fireplace service', small: 'Ignition, valve and safety checks' },
    ],
    phone: NATIONAL_PHONE,
    phoneHref: phoneHref(NATIONAL_PHONE),
    booking: bookingOptions(prices),
    bookingContext: { pageSlug: '/locations/', pageKind: 'hub', label: 'Chimcare' },
    meta,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebPage', '@id': canonical, url: canonical, name: meta.title, description: meta.description, inLanguage: 'en' },
          { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` }, { '@type': 'ListItem', position: 2, name: 'Locations' }] },
          { '@type': 'ItemList', name: 'Chimcare states served', itemListElement: stateCards.filter((s) => s.href).map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.name, url: `${SITE_URL}${s.href}` })) },
        ],
      },
    ],
  };
}
