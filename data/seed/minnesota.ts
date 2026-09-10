// ---------------------------------------------------------------------------------------------
// MINNESOTA SEED — SOURCE-FAITHFUL
//
// Every city, branch, price and URL below comes from data/seed/minnesota.generated.json, which
// scripts/build-mn-seed.mjs builds from the WordPress export and the migration repo's fate maps.
// Regenerate that file; never edit it by hand.
//
// Nothing here writes copy. Where WordPress could not supply a field — the export dropped every FAQ
// question, no city hero has been imported yet — the field stays null and the city carries a review
// flag naming what is missing. No FAQ, area name, local line, branch assignment or meta description
// is invented to make a page publishable.
//
// Migration and publication are separate decisions:
//   a live WordPress city page  → always migrated, always renders through the same template
//   the distinctness gate       → decides only whether that page may go public
// A page that fails the gate is seeded as SOURCE_PAGE_INCOMPLETE with status 'review'. It is not
// dropped, and it is not back-filled.
//
// The state-hub editorial blocks, climate notes and accordion further down are the design-mock
// marketing copy that shipped with this slice. They carry no business facts and no city data. They
// are NOT from WordPress; that provenance is marked where they appear.
// ---------------------------------------------------------------------------------------------

import type { AccordionItem, ClimateNote, EditorialBlock, LocalSpecifics, ReviewFlag } from '@/lib/db/schema';
import { distinctnessGate } from '@/lib/content/assemble';
import generated from './minnesota.generated.json';

// ---- shape of the generated file (kept explicit so tsc does not infer a 6 MB literal type) ----

export type GeneratedSeed = {
  generatedAt?: string;
  sources: Record<string, string>;
  state: { code: string; slug: string; name: string; blurb: string; heroLede: string; introParagraphs: string[]; branchCount: number };
  prices: { sweep_inspection: number; inspection: number; gas_diagnostic: number };
  branches: Array<{
    slug: string;
    name: string;
    legacyName: string;
    street: string;
    streetShort: string;
    city: string;
    zip: string;
    phone: string;
    email: string | null;
    lat: number;
    lng: number;
    gbpUrl: string | null;
    gbpStatus: string | null;
    licenses: string[];
    legacyPostId: number | null;
    legacyThumbnailId: number | null;
  }>;
  cities: Array<{
    slug: string;
    name: string;
    kind: 'branch' | 'coverage';
    sourceStatus: 'SOURCE_PAGE_EXISTS' | 'NO_SOURCE_PAGE';
    branch: string | null;
    branchAssignment: 'own' | 'nearest' | 'none';
    lat: number | null;
    lng: number | null;
    coordsSource: string | null;
    neighborhoods: string[];
    localSpecifics: Partial<LocalSpecifics>;
    legacyPricingCopy: string[];
    metaTitle: string | null;
    metaDescription: string | null;
    legacyPostId: number | null;
    legacyThumbnailId: number | null;
    legacyTitle: string | null;
    keepTier: 'A' | 'B' | 'C' | null;
    gscClicks: number;
    noCityPage?: boolean;
    reviewFlags: ReviewFlag[];
  }>;
  pages: Array<{
    slug: string;
    kind: 'city' | 'service' | 'legacy';
    city: string | null;
    service: string | null;
    tier: 'A' | 'B' | 'C';
    fate: 'publish_verbatim' | 'regenerate' | 'redirect' | 'gone';
    status: 'published' | 'retired';
    redirectTo: string | null;
    legacyPostId: number | null;
    gscClicks: number;
    source?: string;
  }>;
};

const g = generated as unknown as GeneratedSeed;

// ---- state ----------------------------------------------------------------------------------

export const stateSeed = {
  code: g.state.code,
  slug: g.state.slug, // decision Q2b — 'mn' or 'minnesota'
  name: g.state.name,
  verified: true,
  // From ../chimcare-rebuild-main/site/data/content/hubs/state-mn.md, split into blurb / lede / body.
  blurb: g.state.blurb,
  heroLede: g.state.heroLede,
  introParagraphs: g.state.introParagraphs,
  // MOCK COPY — shipped with this slice from the design mocks, not migrated from WordPress.
  // No business facts, no city data. Replace from the admin when real state copy exists.
  introHeading: 'Your premier Minnesota chimney sweep, repair and service provider.',
  climateNotes: [
    { title: 'Twin Cities metro', body: 'Dense older housing stock, brick chimneys that take a beating from freeze-thaw cycles' },
    { title: 'Suburbs and lake country', body: 'Gas inserts in the newer suburbs, wood stoves and inserts running from October to April' },
    { title: 'Statewide', body: 'Ice dams, heavy snow load and Minnesota mechanical and fire codes' },
  ] satisfies ClimateNote[],
  editorial: [
    {
      eyebrow: 'Sweeping',
      heading: 'Minnesota chimney sweep services: keeping your home safe and warm.',
      intro: 'Regular chimney sweeping matters in Minnesota, where fireplaces and wood stoves run for six months of the year and creosote builds up fast. Our Minnesota chimney sweep services go beyond simple cleaning:',
      bullets: [
        'Thorough removal of creosote, soot, and debris',
        'Inspection for freeze-thaw damage to the flue and crown',
        'Checking for and removing wildlife nests before the heating season',
        'Ensuring proper drafting to prevent smoke backflow in tightly sealed homes',
      ],
      outro: "By choosing Chimcare for your Minnesota chimney sweep needs, you're not just getting a clean chimney — you're investing in your home's safety and efficiency.",
      imageKey: 'img/ed-sweep.jpg',
      imageAlt: 'Professional chimney sweep service in Minnesota',
    },
    {
      eyebrow: 'Repair',
      heading: 'Expert Minnesota chimney repair: restoring function and safety.',
      intro: 'Minnesota winters take a toll on chimneys. Our comprehensive Minnesota chimney repair services address issues specific to our region:',
      bullets: [
        'Repairing spalled brick and mortar from repeated freeze-thaw cycles',
        'Fixing crown and cap damage from heavy snow and ice',
        'Rebuilding flashing where ice dams have forced water in',
        'Installing or replacing flue liners for wood stoves and inserts',
        'Tuckpointing and masonry repair using materials rated for sub-zero conditions',
      ],
      imageKey: 'img/ed-repair.jpg',
      imageAlt: 'Chimney repair service in Minnesota by Chimcare expert',
      flip: true,
    },
  ] satisfies EditorialBlock[],
  detailAccordion: [
    {
      question: 'Comprehensive Minnesota chimney inspections: preventing problems before they start',
      intro: 'Our detailed Minnesota chimney inspection services are tailored to local concerns:',
      bullets: [
        'Checking for freeze-thaw cracking in the crown, flue and firebox',
        'Assessing chimney flashing and ice-dam damage at the roofline',
        'Verifying clearances and liner condition on wood stoves and inserts',
        'Ensuring compliance with Minnesota mechanical and fire codes',
      ],
    },
    {
      question: 'Minnesota-specific chimney and masonry services',
      intro: "Our additional services cater to Minnesota's unique needs:",
      bullets: [
        'Installation of caps and crickets to keep snow and ice out of the flue',
        'Waterproofing for masonry exposed to months of freeze-thaw',
        'Stainless liners for high-output wood stoves and inserts',
        'Custom masonry work to match Twin Cities brick and stone',
      ],
    },
    {
      question: 'What does chimney service cost in Minnesota?',
      paragraphs: [
        'Three services are priced up front: a chimney sweep with inspection is {{price.sweep_inspection}}, a chimney inspection on its own is {{price.inspection}}, and a gas fireplace diagnostic is {{price.gas_diagnostic}}.',
        "Repair and masonry work is quoted on site after an inspection, with a written quote and no obligation. You'll see the price before any work starts.",
      ],
    },
  ] satisfies AccordionItem[],
  photoKey: 'img/states/mn.jpg',
  sort: 8,
};

// ---- pricing ----------------------------------------------------------------------------------
// pricing.json marks every headline price "applies_to_regions: all", so the Minnesota region carries
// the same three amounts as the national default. It is still its own region row (not the default),
// which is what the gate checks. Q6 stays open: no source shows a regional difference.
//
// Note: 34 legacy city pages quote their own price ranges ($125–$225, $150–$350) in body copy. Those
// contradict this sheet, are preserved verbatim on the city row as `legacyPricingCopy`, are flagged
// `legacy_pricing_conflict`, and are never rendered or silently replaced.

export const regionSeed = [
  { key: 'default', name: 'National default', isDefault: true, prices: g.prices },
  { key: 'mn', name: 'Minnesota', isDefault: false, prices: g.prices },
];

// ---- branches ---------------------------------------------------------------------------------

export const branchSeed = g.branches.map((b) => ({
  slug: b.slug,
  name: b.name, // as the live page names it ("North Minneapolis" is the Brooklyn Center office)
  region: 'mn',
  street: b.street,
  streetShort: b.streetShort,
  city: b.city,
  zip: b.zip,
  phone: b.phone,
  email: b.email,
  lat: b.lat,
  lng: b.lng,
  photoKey: null as string | null,
  rating: null as string | null, // Q5: no verified rating source; the template renders no rating line
  ratingCount: null as number | null,
  licenses: b.licenses, // branches.json carries no licence numbers for Minnesota
}));

// ---- cities -----------------------------------------------------------------------------------

export type CitySeed = {
  slug: string;
  name: string;
  kind: 'branch' | 'coverage';
  branch: string | null;
  region: string;
  lat: number | null;
  lng: number | null;
  neighborhoods: string[];
  localSpecifics: Partial<LocalSpecifics>;
  heroImageKey: string | null;
  heroImageAlt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  legacyPostId: number | null;
  legacyThumbnailId: number | null;
  legacyPricingCopy: string[];
  tier: 'A' | 'B' | 'C';
  hasSourcePage: boolean;
  sourceStatus: 'NO_SOURCE_PAGE' | 'SOURCE_PAGE_EXISTS' | 'SOURCE_PAGE_INCOMPLETE' | 'SOURCE_PAGE_PUBLISHABLE';
  status: 'published' | 'review';
  missing: string[];
  reviewFlags: ReviewFlag[];
  faqs: Array<{ question: string; answer: string }>;
};

export const citySeed: CitySeed[] = g.cities.map((c) => {
  const hasSourcePage = !c.noCityPage;

  // Source data only. The export carried FAQ answers but no questions, so no city FAQ can be
  // migrated; the row therefore has none. No hero has been imported (media import is M6), so the
  // key is null and the WordPress attachment id is kept for that import to resolve later.
  const faqs: CitySeed['faqs'] = [];
  const heroImageKey = null;

  // The one gate, run on migrated data. Region pricing is always the MN region here, so the
  // pricing condition passes; everything else reflects what WordPress actually supplied.
  const gate = distinctnessGate({
    neighborhoods: c.neighborhoods,
    localSpecifics: c.localSpecifics,
    heroImageKey,
    hasBranch: !!c.branch,
    pricesAreDefault: false,
    faqCount: faqs.length,
  });

  const sourceStatus = !hasSourcePage ? 'NO_SOURCE_PAGE' : gate.ok ? 'SOURCE_PAGE_PUBLISHABLE' : 'SOURCE_PAGE_INCOMPLETE';

  return {
    slug: c.slug,
    name: c.name,
    kind: c.kind,
    branch: c.branch,
    region: 'mn',
    lat: c.lat,
    lng: c.lng,
    neighborhoods: c.neighborhoods,
    localSpecifics: c.localSpecifics,
    heroImageKey,
    heroImageAlt: null,
    metaTitle: c.metaTitle,
    metaDescription: c.metaDescription,
    legacyPostId: c.legacyPostId,
    legacyThumbnailId: c.legacyThumbnailId,
    legacyPricingCopy: c.legacyPricingCopy,
    tier: c.keepTier ?? 'B',
    hasSourcePage,
    sourceStatus,
    // Publication, not migration: an incomplete page is still imported and still renders.
    status: sourceStatus === 'SOURCE_PAGE_PUBLISHABLE' ? 'published' : 'review',
    missing: gate.missing,
    reviewFlags: c.reviewFlags,
    faqs,
  };
});

// ---- pages ------------------------------------------------------------------------------------
// One row per legacy Minnesota URL under /location/. City pages take the status validation computed
// above; every other row keeps the fate the migration maps gave it. No URL is invented: the 16
// cities WordPress never had a city page for get no page row at all.

const cityStatus = new Map<string, CitySeed['status']>(citySeed.map((c) => [c.slug, c.status]));

export type PageSeed = Omit<GeneratedSeed['pages'][number], 'status'> & { status: 'draft' | 'review' | 'published' | 'retired' };

export const pageSeed: PageSeed[] = g.pages.map((p) => ({
  ...p,
  status: p.kind === 'city' && p.fate !== 'redirect' ? (cityStatus.get(p.slug) ?? 'draft') : p.status,
}));
