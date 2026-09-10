/**
 * ================================ TEST DATA — NOT PRODUCTION CONTENT ================================
 *
 * Fixtures that exercise every template and every slot in it. They exist so the template foundation
 * can be rendered, measured and reviewed before any real page is migrated.
 *
 * Every string here begins with or contains the word FIXTURE, every place name is invented
 * ("Fixture City", "Testshire"), and every phone number uses the 555-01xx range reserved for
 * fiction. Nothing in this file can be mistaken for Chimcare copy, and if any of it ever reached a
 * real page it would be obvious on sight.
 *
 * `app/preview/[template]/page.tsx` is the only consumer, and that route refuses to run in
 * production. Nothing in `lib/data/*`, `lib/content/assemble*.ts` or any real route imports it.
 */

import type { CityPageProps, ServicePageProps } from '@/lib/content/assemble';
import type { NationalHubProps, StateHubProps } from '@/lib/content/assemble-hubs';
import type { LegacyPageProps } from '@/components/templates/LegacyPage';
import type { ServiceRow } from '@/lib/db/schema';
import { DESIGN } from '@/lib/content/design-assets';

export const FIXTURE_BANNER = 'FIXTURE DATA — this page renders test content, not Chimcare content.';

const PHONE = '555-0142';
const PHONE_HREF = 'tel:5550142';
const BOOKING = [
  { key: 'sweep' as const, label: '$299 Chimney Sweep + Inspection (FIXTURE price)' },
  { key: 'inspect' as const, label: '$69 - Chimney Inspection (FIXTURE price)' },
  { key: 'gas' as const, label: '$49 Gas Fireplace Diagnostic (FIXTURE price)' },
  { key: 'quote' as const, label: 'Repair Quote' },
];
const TRUST = [
  { icon: 'cal', title: 'FIXTURE Since 1989', small: 'FIXTURE trust item' },
  { icon: 'shield', title: 'FIXTURE Certified', small: 'FIXTURE trust item' },
  { icon: 'broom', title: 'FIXTURE Sweep + inspection', small: 'FIXTURE trust item' },
  { icon: 'wrench', title: 'FIXTURE Free quotes', small: 'FIXTURE trust item' },
];
const CREW = [
  { src: '/img/crew-sweeping.jpg', alt: 'FIXTURE crew photograph', title: 'FIXTURE Sweeping', small: 'FIXTURE caption' },
  { src: '/img/crew-inspection.jpg', alt: 'FIXTURE crew photograph', title: 'FIXTURE Inspection', small: 'FIXTURE caption' },
  { src: '/img/crew-masonry.jpg', alt: 'FIXTURE crew photograph', title: 'FIXTURE Masonry', small: 'FIXTURE caption' },
  { src: '/img/crew-gas.jpg', alt: 'FIXTURE crew photograph', title: 'FIXTURE Gas service', small: 'FIXTURE caption' },
];
const FAQ_ITEMS = [
  { question: 'FIXTURE question one?', answer: 'FIXTURE answer one. Exercises the accordion in its open state.' },
  { question: 'FIXTURE question two?', answer: 'FIXTURE answer two. Exercises a closed accordion panel.' },
  { question: 'FIXTURE question three?', answer: 'FIXTURE answer three.' },
];

/** Eight rows, so the service accordion, the drawer and the "load more" step are all exercised. */
const SERVICE_ROWS: ServiceRow[] = Array.from({ length: 8 }, (_, i) => ({
  key: `fixture-service-${i + 1}`,
  name: `FIXTURE Service ${i + 1}`,
  icon: ['broom', 'camera', 'wrench', 'brick', 'drop', 'flame', 'wind', 'joints'][i],
  why: `FIXTURE reason the service matters, number ${i + 1}.`,
  imgAlt: `FIXTURE service illustration ${i + 1}`,
  tone: (i % 4) + 1,
  short: `FIXTURE one-line summary for service ${i + 1}.`,
  paragraphs: [`FIXTURE body paragraph for service ${i + 1}.`, 'FIXTURE second paragraph, so the drawer has more than one block.'],
  included: [`FIXTURE included item A${i + 1}`, `FIXTURE included item B${i + 1}`, `FIXTURE included item C${i + 1}`],
  cta: 'FIXTURE Book this service',
}));

/** Twenty cards, so pagination (six, then twelve more) and the empty state are both reachable. */
const LOCATION_CARDS = Array.from({ length: 20 }, (_, i) => ({
  id: `fixture-city-${i + 1}`,
  name: `Fixture City ${i + 1}`,
  kind: (i % 3 === 0 ? 'branch' : 'coverage') as 'branch' | 'coverage',
  title: `FIXTURE Chimney Services in Fixture City ${i + 1}`,
  addressLines: i % 3 === 0 ? [`${100 + i} Fixture Street`, `Fixture City ${i + 1}, TS 0000${i % 10}`] : [],
  servedFrom: i % 3 === 0 ? undefined : 'FIXTURE served from a nearby branch',
  phone: PHONE,
  phoneHref: PHONE_HREF,
  href: i % 4 === 3 ? undefined : `/preview/city/`,
  photo: i % 2 === 0 ? { src: '/img/crew-sweeping.jpg', alt: 'FIXTURE city photograph' } : undefined,
  search: `Fixture City ${i + 1} Testshire 0000${i % 10}`,
}));

export const nationalHubFixture: NationalHubProps = {
  hero: { states: 8, cities: 24 },
  trust: TRUST,
  stateCards: Array.from({ length: 8 }, (_, i) => ({
    code: `T${i + 1}`,
    name: `Fixture State ${i + 1}`,
    verified: i < 6,
    blurb: `FIXTURE blurb for Fixture State ${i + 1}.`,
    photo: i % 2 === 0 ? '/img/states/mn.jpg' : undefined,
    cities: i < 6 ? Array.from({ length: 4 }, (_, j) => `Fixture City ${i * 4 + j + 1}`) : [],
    href: i < 6 ? '/preview/state/' : undefined,
  })),
  directoryGroups: Array.from({ length: 8 }, (_, i) => ({
    name: `Fixture State ${i + 1}`,
    coverageOnly: i >= 6,
    cities: i < 6 ? Array.from({ length: 4 }, (_, j) => ({ name: `Fixture City ${i * 4 + j + 1}`, href: j === 3 ? undefined : '/preview/city/' })) : [],
  })),
  coverageOnly: ['Fixture State 7', 'Fixture State 8'],
  crew: CREW,
  phone: PHONE,
  phoneHref: PHONE_HREF,
  booking: BOOKING,
  bookingContext: { pageSlug: '/preview/national/', pageKind: 'hub', label: 'FIXTURE Chimcare' },
  meta: { title: 'FIXTURE National hub', description: 'FIXTURE description.', canonical: 'https://example.invalid/preview/national/' },
  jsonLd: [],
};

export const stateHubFixture: StateHubProps & { stateSlug: string } = {
  stateSlug: 'fixture-state',
  imgState: '/img/states/mn.jpg',
  crumbs: [{ label: 'Home', href: '/' }, { label: 'Locations', href: '/locations/' }, { label: 'Fixture State 1' }],
  hero: { name: 'Fixture State 1', lede: 'FIXTURE state hero lede.', count: LOCATION_CARDS.length },
  trust: TRUST,
  directory: { eyebrow: 'FIXTURE directory', heading: 'FIXTURE every location', lede: 'FIXTURE directory lede.', cards: LOCATION_CARDS },
  intro: {
    eyebrow: 'FIXTURE intro',
    heading: 'FIXTURE state introduction heading',
    paragraphs: ['FIXTURE intro paragraph one.', 'FIXTURE intro paragraph two.'],
    stats: [{ title: 'FIXTURE stat', body: 'FIXTURE stat body' }, { title: 'FIXTURE stat two', body: 'FIXTURE stat body two' }],
  },
  editorial: [
    { eyebrow: 'FIXTURE', heading: 'FIXTURE editorial block', intro: 'FIXTURE intro.', bullets: ['FIXTURE bullet one', 'FIXTURE bullet two'], outro: 'FIXTURE outro.', imageKey: 'img/ed-sweep.jpg', imageAlt: 'FIXTURE editorial photograph', flip: false },
    { eyebrow: 'FIXTURE', heading: 'FIXTURE second block', intro: 'FIXTURE intro.', bullets: ['FIXTURE bullet'], outro: undefined, imageKey: 'img/ed-repair.jpg', imageAlt: 'FIXTURE editorial photograph', flip: true },
  ],
  detail: {
    eyebrow: 'FIXTURE detail',
    heading: 'FIXTURE expandable detail',
    lede: 'FIXTURE detail lede.',
    items: [
      { question: 'FIXTURE detail one?', intro: 'FIXTURE intro.', bullets: ['FIXTURE bullet'], paragraphs: ['FIXTURE paragraph.'] },
      { question: 'FIXTURE detail two?', intro: 'FIXTURE intro.', paragraphs: ['FIXTURE paragraph.'] },
    ],
  },
  crew: CREW,
  finalCta: { eyebrow: 'FIXTURE', heading: 'FIXTURE final CTA', paragraph: 'FIXTURE paragraph.' },
  phone: PHONE,
  phoneHref: PHONE_HREF,
  booking: BOOKING,
  bookingContext: { pageSlug: '/preview/state/', pageKind: 'hub', label: 'FIXTURE Chimcare' },
  meta: { title: 'FIXTURE State hub', description: 'FIXTURE description.', canonical: 'https://example.invalid/preview/state/' },
  jsonLd: [],
};

const CONTACT = {
  phone: PHONE,
  phoneHref: PHONE_HREF,
  addressLines: ['123 Fixture Street', 'Fixture City, TS 00000'],
  directionsHref: undefined,
  servedFrom: undefined,
};

export const cityPageFixture: CityPageProps = {
  variant: 'branch',
  imgCity: '/img/hero-spokane.jpg',
  crumbs: [{ label: 'Home', href: '/' }, { label: 'Locations', href: '/locations/' }, { label: 'Fixture State 1', href: '/preview/state/' }, { label: 'Fixture City 1' }],
  hero: {
    eyebrow: 'Fixture City 1, Testshire',
    title: 'FIXTURE Chimney Sweep & Fireplace Services in Fixture City 1',
    lede: 'FIXTURE city hero lede.',
    addressLine: '123 Fixture Street, Fixture City, TS 00000',
    rating: { value: '4.7', count: 100 },
    image: { src: '/img/hero-spokane.jpg', alt: 'FIXTURE city hero photograph', width: 1000, height: 749 },
    figCaption: 'FIXTURE caption',
    trustLine: [{ icon: 'shield', label: 'FIXTURE CSIA Certified' }, { icon: 'cal', label: 'FIXTURE Since 1989' }, { icon: 'pin', label: 'FIXTURE Local' }],
    awards: DESIGN.awards,
  },
  contact: CONTACT,
  trust: TRUST,
  intro: { eyebrow: 'FIXTURE intro', heading: 'FIXTURE city introduction', paragraphs: ['FIXTURE paragraph one.', 'FIXTURE paragraph two.'], cta: 'FIXTURE Get a quote', teamPhoto: DESIGN.cityTeam },
  reasons: [
    { title: 'FIXTURE reason one', body: 'FIXTURE body.' },
    { title: 'FIXTURE reason two', body: 'FIXTURE body.' },
    { title: 'FIXTURE reason three', body: 'FIXTURE body.' },
  ],
  whyTrust: { eyebrow: 'FIXTURE', heading: 'FIXTURE why homeowners trust us', paragraph: 'FIXTURE paragraph.' },
  serviceRows: { eyebrow: 'FIXTURE services', heading: 'FIXTURE service list', lede: 'FIXTURE lede.', rows: SERVICE_ROWS, image: DESIGN.cityServices },
  solutions: {
    eyebrow: 'FIXTURE solutions',
    heading: 'FIXTURE full service solutions',
    lede: 'FIXTURE lede.',
    count: 24,
    tiles: Array.from({ length: 4 }, (_, i) => ({ key: `fixture-cat-${i + 1}`, name: `FIXTURE Category ${i + 1}`, count: 6, src: '/img/tile-sweep.jpg', alt: 'FIXTURE category tile' })),
    cards: Array.from({ length: 24 }, (_, i) => ({ key: `fixture-card-${i + 1}`, cat: `fixture-cat-${(i % 4) + 1}`, title: `FIXTURE Service card ${i + 1}`, copy: 'FIXTURE card copy.', href: i % 5 === 0 ? '/preview/service/' : undefined })),
  },
  areas: {
    eyebrow: 'FIXTURE service area',
    heading: 'FIXTURE areas heading',
    lede: 'FIXTURE lede.',
    subHeading: 'FIXTURE nearby areas',
    subLede: 'FIXTURE sub-lede.',
    list: Array.from({ length: 7 }, (_, i) => `FIXTURE Neighbourhood ${i + 1}`),
    cta: 'FIXTURE Book a visit',
    image: DESIGN.cityAreas,
  },
  process: { eyebrow: 'FIXTURE process', heading: 'FIXTURE how it works', lede: 'FIXTURE lede.', steps: [{ title: 'FIXTURE step one', body: 'FIXTURE body.' }, { title: 'FIXTURE step two', body: 'FIXTURE body.' }, { title: 'FIXTURE step three', body: 'FIXTURE body.' }] },
  cost: { eyebrow: 'FIXTURE cost', heading: 'FIXTURE what it costs', paragraph: 'FIXTURE paragraph.', factors: ['FIXTURE factor one', 'FIXTURE factor two'], cta: 'FIXTURE Get a quote' },
  faq: { eyebrow: 'FIXTURE FAQ', heading: 'FIXTURE questions', items: FAQ_ITEMS },
  contactBlock: { eyebrow: 'FIXTURE contact', heading: 'FIXTURE contact heading', paragraph: 'FIXTURE paragraph.', whyHeading: 'FIXTURE why us', why: ['FIXTURE point one', 'FIXTURE point two'] },
  finalCta: { eyebrow: 'FIXTURE', heading: 'FIXTURE final CTA', paragraph: 'FIXTURE paragraph.', cta: 'FIXTURE Schedule' },
  booking: BOOKING,
  bookingContext: { pageSlug: '/preview/city/', pageKind: 'city', label: 'FIXTURE Chimcare · Fixture City 1' },
  meta: { title: 'FIXTURE City page', description: 'FIXTURE description.', canonical: 'https://example.invalid/preview/city/' },
  jsonLd: [],
  gate: { ok: true, missing: [] },
};

export const servicePageFixture: ServicePageProps = {
  variant: 'branch',
  imgCity: '/img/hero-spokane.jpg',
  crumbs: [{ label: 'Home', href: '/' }, { label: 'Locations', href: '/locations/' }, { label: 'Fixture City 1', href: '/preview/city/' }, { label: 'FIXTURE Service 1' }],
  hero: { eyebrow: 'Fixture City 1, Testshire', title: 'FIXTURE Service 1 in Fixture City 1', lede: 'FIXTURE service hero lede.', addressLine: '123 Fixture Street, Fixture City, TS 00000' },
  contact: CONTACT,
  trust: TRUST,
  row: SERVICE_ROWS[0],
  process: cityPageFixture.process,
  cost: cityPageFixture.cost,
  faq: cityPageFixture.faq,
  related: {
    heading: 'FIXTURE related services',
    items: SERVICE_ROWS.slice(1, 5).map((r) => ({ title: r.name, href: '/preview/service/' })),
    cityLink: { label: 'FIXTURE all services in Fixture City 1', href: '/preview/city/' },
  },
  finalCta: cityPageFixture.finalCta,
  booking: BOOKING,
  bookingContext: { pageSlug: '/preview/service/', pageKind: 'service', label: 'FIXTURE Chimcare · Fixture City 1' },
  initialService: 'sweep',
  meta: { title: 'FIXTURE Service page', description: 'FIXTURE description.', canonical: 'https://example.invalid/preview/service/' },
  jsonLd: [],
};

/**
 * Deliberately malformed, in the ways the audit found in real WordPress content: an unclosed
 * WPBakery shortcode, an orphaned shortcode from a plugin that no longer runs, an inline script and
 * an inline event handler. `cleanVerbatim` must neutralise all four and leave the prose alone.
 */
export const legacyPageFixture: LegacyPageProps = {
  path: '/location/fixture-legacy-page/',
  crumbs: [{ label: 'Home', href: '/' }, { label: 'FIXTURE legacy page' }],
  title: 'FIXTURE Legacy Page Title From WordPress',
  rawHtml: [
    '<p>FIXTURE first paragraph, exactly as WordPress stored it.</p>',
    '[vc_row][vc_column width="1/2"]',
    '<h2>FIXTURE heading inside a WPBakery column</h2>',
    '<p>FIXTURE paragraph with a <a href="/fixture-target/">link</a> and an <strong>emphasis</strong>.</p>',
    '[/vc_column][/vc_row]',
    '[fixture_shortcode id="7"]',
    '<ul><li>FIXTURE list item one</li><li>FIXTURE list item two</li></ul>',
    '<script>window.FIXTURE_SHOULD_NOT_RUN = true;</script>',
    '<p onclick="alert(1)">FIXTURE paragraph carrying an inline handler.</p>',
    '<p><a href="javascript:alert(2)">FIXTURE link with a javascript URL</a></p>',
    '<p>&nbsp;</p>',
    '<img src="/img/crew-sweeping.jpg" alt="FIXTURE source image reference kept exactly as WordPress had it" width="600" height="400">',
  ].join('\n'),
  source: {
    postId: 999999,
    modified: '2026-01-01 00:00:00',
    metaTitle: 'FIXTURE source title tag',
    metaDescription: 'FIXTURE source meta description.',
    canonical: 'https://example.invalid/location/fixture-legacy-page/',
    robots: 'index, follow',
  },
  contact: { phone: PHONE, phoneHref: PHONE_HREF },
  showProvenance: true,
};
