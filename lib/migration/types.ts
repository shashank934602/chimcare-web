// The migration contract: what the agent produces and what the mapper is allowed to read.
//
// The agent copies WordPress; it never writes copy. Every value it emits belongs to exactly one
// provenance category, and the categories are kept in separate objects so they cannot be confused
// at a glance or by accident in code.

export type ProvenanceCategory =
  /** Copied byte-for-byte from WordPress or from a business-supplied artefact. Never edited. */
  | 'SOURCE'
  /** Computed by the agent (geocode, nearest branch, checksums). True only as far as the method is. */
  | 'DERIVED'
  /** A question only the business can answer. The agent records it and stops. */
  | 'BUSINESS_UNVERIFIED'
  /** A defect observed in the source. Recorded, never repaired. */
  | 'SOURCE_QUALITY_FLAG';

export type FlagCode =
  // --- SOURCE_QUALITY_FLAG: something is wrong or thin in WordPress itself ---
  | 'faq_missing_in_source'
  | 'source_markup_defect'
  | 'insufficient_source_areas'
  | 'insufficient_source_local_copy'
  | 'hero_image_missing'
  | 'hero_image_not_city_specific'
  | 'hero_image_wrong_state_label'
  | 'hero_image_missing_alt'
  | 'legacy_slug_typo'
  // --- BUSINESS_UNVERIFIED: a decision, not a data fix ---
  | 'nearest_branch_unverified'
  | 'office_location_conflict'
  | 'legacy_pricing_conflict'
  | 'no_source_city_page'
  // --- DERIVED: the agent could not derive something, or its derivation is suspect ---
  | 'geocode_rejected'
  | 'geocode_unverified'
  | 'no_serving_branch';

/** One flag belongs to exactly one category. This table is the single place that decides which. */
export const FLAG_CATEGORY: Record<FlagCode, ProvenanceCategory> = {
  faq_missing_in_source: 'SOURCE_QUALITY_FLAG',
  source_markup_defect: 'SOURCE_QUALITY_FLAG',
  insufficient_source_areas: 'SOURCE_QUALITY_FLAG',
  insufficient_source_local_copy: 'SOURCE_QUALITY_FLAG',
  hero_image_missing: 'SOURCE_QUALITY_FLAG',
  hero_image_not_city_specific: 'SOURCE_QUALITY_FLAG',
  hero_image_wrong_state_label: 'SOURCE_QUALITY_FLAG',
  hero_image_missing_alt: 'SOURCE_QUALITY_FLAG',
  legacy_slug_typo: 'SOURCE_QUALITY_FLAG',
  nearest_branch_unverified: 'BUSINESS_UNVERIFIED',
  office_location_conflict: 'BUSINESS_UNVERIFIED',
  legacy_pricing_conflict: 'BUSINESS_UNVERIFIED',
  no_source_city_page: 'BUSINESS_UNVERIFIED',
  geocode_rejected: 'DERIVED',
  geocode_unverified: 'DERIVED',
  no_serving_branch: 'DERIVED',
};

export type MigrationFlag = {
  code: FlagCode;
  category: ProvenanceCategory;
  detail: string;
  /** Verbatim source text a flag refers to (e.g. a conflicting price sentence). Never edited. */
  quotes?: string[];
  /** A derived value the agent rejected, kept so a human can see what was thrown away. */
  rejected?: { lat: number; lng: number; display?: string };
};

/** Everything copied out of WordPress for one city page. No field here is ever computed. */
export type CitySource = {
  wpPostId: number | null;
  wpSlug: string;
  wpTitle: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  /** "Areas we serve" list items, as the page lists them, in page order. */
  neighborhoods: string[];
  /** Sentences lifted whole from the page's own prose. */
  localSpecifics: Record<string, string>;
  /** The page's own accordion, question and answer verbatim. */
  faqs: Array<{ question: string; answer: string; tabId: string | null }>;
  hero: CityHero | null;
  /** Price ranges the page states in its own copy. Preserved for review; never rendered. */
  legacyPricingCopy: string[];
  thumbnailId: number | null;
  /** A redirect WordPress itself already records for this page. */
  redirectInfo: { from: string; to: string } | null;
  /** From the business-supplied fate maps, not invented by the agent. */
  tier: 'A' | 'B' | 'C' | null;
  gscClicks: number;
};

/** The exact WordPress attachment, downloaded unchanged. */
export type CityHero = {
  attachmentId: number;
  imageKey: string;
  filename: string;
  extension: string;
  mime: string;
  alt: string | null;
  title: string | null;
  caption: string | null;
  description: string | null;
  width: number | null;
  height: number | null;
  filesize: number | null;
  sha256: string;
  sourceUrl: string;
  guid: string | null;
  usedByPages: number;
};

/** Everything the agent computed. Nothing here came out of WordPress. */
export type CityDerived = {
  lat: number | null;
  lng: number | null;
  coordsSource: 'wordpress' | 'geocoder' | null;
  /** The nearest branch, which is a guess at coverage, not a confirmed territory. */
  branch: string | null;
  branchAssignment: 'own' | 'nearest' | 'none';
  distanceKm: number | null;
};

export type CityChecksums = {
  /** Of the raw WordPress record. Changes when the source page changes. */
  source: string;
  /** Of the mapped content that will render. Changes when the page would look different. */
  content: string;
  /** attachmentId → sha256 of the bytes on disk. */
  media: Record<string, string>;
};

export type MigrationCity = {
  slug: string;
  name: string;
  kind: 'branch' | 'coverage';
  /** False when WordPress never had a city page here: nothing to migrate, no URL invented. */
  hasSourcePage: boolean;
  source: CitySource;
  derived: CityDerived;
  flags: MigrationFlag[];
  checksums: CityChecksums;
};

export type ValidationResult = { check: string; ok: boolean; detail: string };

/** The per-page record the agent reports for every page it processes. */
export type PageRecord = {
  status: 'publishable' | 'needs_review' | 'no_source_page';
  source_wp_id: number | null;
  url: string | null;
  source_checksum: string;
  content_checksum: string;
  media_checksums: Record<string, string>;
  validation_results: ValidationResult[];
  reviewFlags: MigrationFlag[];
};
