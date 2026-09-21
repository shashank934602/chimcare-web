// Site content model — the subset of architecture §6 that the three location templates read.
// Postgres is the source of truth; the same schema runs on Supabase (postgres-js) and on the
// embedded PGlite database used for local testing.

import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const site = pgSchema('site');

export const pageKind = site.enum('page_kind', ['hub', 'state', 'city', 'service', 'legacy']);
export const tier = site.enum('tier', ['A', 'B', 'C']);
export const fate = site.enum('fate', ['publish_verbatim', 'regenerate', 'redirect', 'gone']);
export const pageStatus = site.enum('page_status', ['draft', 'review', 'published', 'retired']);
export const cityKind = site.enum('city_kind', ['branch', 'coverage']);
/**
 * Where a city stands in the migration, independent of whether its page is publicly published.
 *   NO_SOURCE_PAGE          WordPress never had a city page for this city. Nothing to migrate; creating
 *                           one is a business/content decision. No page row and no URL exists.
 *   SOURCE_PAGE_EXISTS      A live WordPress city page was migrated but has not been validated yet.
 *   SOURCE_PAGE_INCOMPLETE  Migrated, validated, and missing data the gate requires. Renders through the
 *                           same template for review; withheld from the public site. Never back-filled
 *                           with invented content.
 *   SOURCE_PAGE_PUBLISHABLE Migrated, validated, complete.
 */
export const sourceStatus = site.enum('source_status', [
  'NO_SOURCE_PAGE',
  'SOURCE_PAGE_EXISTS',
  'SOURCE_PAGE_INCOMPLETE',
  'SOURCE_PAGE_PUBLISHABLE',
]);
export const faqScope = site.enum('faq_scope', ['global', 'state', 'city', 'service']);

// ---- jsonb shapes ---------------------------------------------------------------------------

export type ClimateNote = { title: string; body: string };
export type EditorialBlock = {
  eyebrow: string;
  heading: string;
  intro: string;
  bullets: string[];
  outro?: string;
  imageKey: string;
  imageAlt: string;
  flip?: boolean;
};
export type AccordionItem = { question: string; intro?: string; bullets?: string[]; paragraphs?: string[] };
/** One thing a human has to resolve on a migrated city. Defined once, in the migration contract. */
import type { MigrationFlag } from '@/lib/migration/types';
export type ReviewFlag = MigrationFlag;

export type LocalSpecifics = {
  climate_line: string; // "In Minneapolis, fireplaces run hard from November through March …"
  weather_stress: string; // "heavy snow loads, months of sub-zero temperatures and a wet spring thaw"
  housing_line: string; // "From 1900s brick foursquares in Longfellow to new builds in the North Loop"
  season_line: string; // "before the first hard freeze"
};
export type ServiceRow = {
  key: string;
  name: string;
  icon: string;
  why: string;
  imgAlt: string;
  tone: number;
  short: string;
  paragraphs: string[];
  included: string[];
  cta: string;
};

// ---- tables ---------------------------------------------------------------------------------

export const states = site.table('states', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // 'MN'
  slug: text('slug').notNull().unique(), // 'mn'  (decision Q2b: 'mn' vs 'minnesota')
  name: text('name').notNull(),
  verified: boolean('verified').notNull().default(false),
  blurb: text('blurb').notNull(),
  heroLede: text('hero_lede').notNull(),
  introHeading: text('intro_heading').notNull(),
  introParagraphs: jsonb('intro_paragraphs').$type<string[]>().notNull(),
  climateNotes: jsonb('climate_notes').$type<ClimateNote[]>().notNull(),
  editorial: jsonb('editorial').$type<EditorialBlock[]>().notNull(),
  detailAccordion: jsonb('detail_accordion').$type<AccordionItem[]>().notNull(),
  photoKey: text('photo_key'),
  sort: integer('sort').notNull().default(0),
});

export const regions = site.table('regions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
});

export const branches = site.table('branches', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  stateId: integer('state_id').notNull().references(() => states.id),
  regionId: integer('region_id').references(() => regions.id),
  street: text('street').notNull(),
  streetShort: text('street_short').notNull(), // "N Washington St" — used in the trust strip
  city: text('city').notNull(),
  zip: text('zip').notNull(),
  phone: text('phone').notNull(), // display form "612-555-0100"
  email: text('email'),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  photoKey: text('photo_key'),
  googlePlaceId: text('google_place_id'),
  rating: numeric('rating', { precision: 2, scale: 1 }), // null → no rating line rendered (Q5)
  ratingCount: integer('rating_count'),
  licenses: jsonb('licenses').$type<string[]>().notNull().default([]),
  status: text('status').notNull().default('active'),
});

export const cities = site.table('cities', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(), // legacy post_name of the city page, e.g. chimney-sweep-repair-in-minneapolis-mn
  name: text('name').notNull(),
  stateId: integer('state_id').notNull().references(() => states.id),
  kind: cityKind('kind').notNull(),
  branchId: integer('branch_id').references(() => branches.id), // the serving branch (also for coverage cities)
  regionId: integer('region_id').references(() => regions.id),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  neighborhoods: jsonb('neighborhoods').$type<string[]>().notNull().default([]),
  localSpecifics: jsonb('local_specifics').$type<Partial<LocalSpecifics>>().notNull().default({}),
  heroImageKey: text('hero_image_key'),
  heroImageAlt: text('hero_image_alt'),
  tier: tier('tier').notNull().default('B'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  legacyPostId: integer('legacy_post_id'),
  // ---- migration bookkeeping ----
  // How far this city got in the migration. Set from validation at seed time; never used to decide
  // whether a source page is migrated, only whether it may be published.
  sourceStatus: sourceStatus('source_status').notNull().default('SOURCE_PAGE_EXISTS'),
  // What is missing or unverified, in the city's own words. Written by the migration; a human clears it.
  reviewFlags: jsonb('review_flags').$type<ReviewFlag[]>().notNull().default([]),
  // Price ranges quoted in the legacy page's own copy that contradict the pricing sheet. Preserved
  // verbatim for review and deliberately NOT rendered.
  legacyPricingCopy: jsonb('legacy_pricing_copy').$type<string[]>().notNull().default([]),
  // WordPress attachment id of the page's hero, so the media import (M6) can fetch the real image.
  legacyThumbnailId: integer('legacy_thumbnail_id'),
});

export const serviceCategories = site.table('service_categories', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(), // sweep | inspection | repair | gas | gas-inserts | wood-inserts | caps | outdoor
  name: text('name').notNull(),
  sort: integer('sort').notNull().default(0),
  tileImageKey: text('tile_image_key'),
  tileImageAlt: text('tile_image_alt'),
  rowKey: text('row_key'), // which long-form service row (masters.service_rows) supports this category
  bookingService: text('booking_service'), // sweep | inspect | gas | quote
});

export const services = site.table('services', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(), // chimney-crown-sealing
  name: text('name').notNull(), // "Chimney Crown Sealing" (no city)
  categoryId: integer('category_id').notNull().references(() => serviceCategories.id),
  sort: integer('sort').notNull().default(0),
  nameTemplate: text('name_template').notNull(), // "{{service.name}} in {{city.name}}, {{state.code}}"
  cardCopyTemplate: text('card_copy_template').notNull(),
});

export const pages = site.table('pages', {
  id: serial('id').primaryKey(),
  kind: pageKind('kind').notNull(),
  slug: text('slug').notNull().unique(), // exact legacy path segment under /location/
  cityId: integer('city_id').references(() => cities.id),
  serviceId: integer('service_id').references(() => services.id),
  tier: tier('tier').notNull(),
  fate: fate('fate').notNull(),
  status: pageStatus('status').notNull().default('draft'),
  redirectTo: text('redirect_to'),
  legacyPostId: integer('legacy_post_id'),
  legacyUrl: text('legacy_url'),
  gscClicks12m: integer('gsc_clicks_12m').notNull().default(0),
  leadCount: integer('lead_count').notNull().default(0),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const faqs = site.table('faqs', {
  id: serial('id').primaryKey(),
  scope: faqScope('scope').notNull(),
  scopeId: integer('scope_id'),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sort: integer('sort').notNull().default(0),
});

export const prices = site.table('prices', {
  id: serial('id').primaryKey(),
  regionId: integer('region_id').notNull().references(() => regions.id),
  serviceKey: text('service_key').notNull(), // sweep_inspection | inspection | gas_diagnostic
  amountCents: integer('amount_cents').notNull(),
});

export const masters = site.table('masters', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  version: integer('version').notNull().default(1),
  body: jsonb('body').$type<unknown>().notNull(),
});

export type State = typeof states.$inferSelect;
export type Region = typeof regions.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type City = typeof cities.$inferSelect;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type Faq = typeof faqs.$inferSelect;
export type Price = typeof prices.$inferSelect;
export type Master = typeof masters.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

// ---- bookings (architecture §12) ------------------------------------------------------------

export const bookings = site.table('bookings', {
  id: serial('id').primaryKey(),
  reference: text('reference').notNull().unique(), // shown to the customer, e.g. CHM-7F3K2Q
  status: text('status').notNull().default('received'), // received | synced | failed
  adapter: text('adapter').notNull().default('mock'),
  externalId: text('external_id'), // Workiz job id once the real adapter exists
  serviceKey: text('service_key').notNull(), // sweep | inspect | gas | quote
  serviceLabel: text('service_label').notNull(), // the priced label the customer saw
  preferredDate: text('preferred_date').notNull(), // YYYY-MM-DD
  timeWindow: text('time_window').notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  zip: text('zip').notNull(),
  address: text('address'),
  notes: text('notes'),
  // where the booking came from — so a lead can be attributed to a page, city and branch
  pageSlug: text('page_slug'),
  pageKind: text('page_kind'),
  stateCode: text('state_code'),
  cityId: integer('city_id').references(() => cities.id),
  cityName: text('city_name'),
  branchId: integer('branch_id').references(() => branches.id),
  serviceId: integer('service_id').references(() => services.id),
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * The page's WordPress body, exactly as WordPress holds it.
 *
 * This is the migration's own copy of the source, and it is immutable: nothing in the application
 * writes to it after insert, and nothing cleans it in place. Templates read it through
 * `lib/content/source-sections.ts`, which parses it at the render boundary and leaves the row alone.
 * `contentSha256` is recorded at extraction so any later claim about "the source" can be checked.
 */
export const pageSource = site.table('page_source', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(), // the legacy path segment under /location/, same key as pages.slug
  wpPostId: integer('wp_post_id'),
  postTitle: text('post_title').notNull(),
  postContent: text('post_content').notNull(),
  postModified: text('post_modified'),
  yoastTitle: text('yoast_title'),
  yoastMetadesc: text('yoast_metadesc'),
  yoastCanonical: text('yoast_canonical'),
  thumbnailId: integer('thumbnail_id'),
  phone: text('phone'),
  jobLocation: text('job_location'),
  contentSha256: text('content_sha256').notNull(),
  extractedAt: timestamp('extracted_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PageSource = typeof pageSource.$inferSelect;
export type NewPageSource = typeof pageSource.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

// ---- contact messages (Contact Us page) -----------------------------------------------------

export const contactMessages = site.table('contact_messages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  pageSlug: text('page_slug'),
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewContactMessage = typeof contactMessages.$inferInsert;

// ---- out-of-area leads ------------------------------------------------------------------------

/**
 * Where a lead stands in the resale workflow. `new` until someone works it.
 */
export const leadStatus = site.enum('lead_status', ['new', 'contacted', 'sold', 'dead']);

/**
 * A service request from a ZIP this business does not cover.
 *
 * Deliberately a separate table from `bookings`, not a flag on it: these are never scheduled, never
 * reach the booking adapter, and never become a Chimcare job. The client resells them, so this row
 * is the product — it carries the contact details, what the visitor asked for, the page the request
 * came from, and where the ZIP actually resolves to (`zipCity`/`zipState`), which is what a buyer
 * needs to know.
 *
 * Which requests land here is decided server-side by `classifyZip()` (lib/content/coverage.ts) from
 * the ZIP alone. The client never chooses its own table.
 *
 * No date or time window: nothing here is being booked. That is the whole distinction.
 */
export const leads = site.table('leads', {
  id: serial('id').primaryKey(),
  reference: text('reference').notNull().unique(), // shown to the visitor, e.g. CHM-L-7F3K2Q
  status: leadStatus('status').notNull().default('new'),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  zip: text('zip').notNull(),
  // Where the ZIP actually is, when the ZIP directory could tell us. Null when it was unreachable —
  // never guessed, because a buyer would be paying for the guess.
  zipCity: text('zip_city'),
  zipState: text('zip_state'),
  // What they asked for. Optional: a request can arrive without a service picked.
  serviceKey: text('service_key'),
  serviceLabel: text('service_label'),
  message: text('message'), // free-text "what do you need"
  // Attribution — the same page context a booking carries, minus the city/branch foreign keys,
  // which by definition do not apply to a ZIP we do not serve.
  pageSlug: text('page_slug'),
  pageKind: text('page_kind'),
  sourceUrl: text('source_url'),
  // Set when a request reached /api/bookings with an out-of-area ZIP and was diverted here rather
  // than booked. Tells the admin the visitor may have been expecting a scheduled visit.
  divertedFromBooking: boolean('diverted_from_booking').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
