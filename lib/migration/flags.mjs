// The single table deciding which provenance category each review flag belongs to.
// Plain JS so the migration agent (Node) and the app (TypeScript) share one source of truth.

/** @typedef {'SOURCE'|'DERIVED'|'BUSINESS_UNVERIFIED'|'SOURCE_QUALITY_FLAG'} ProvenanceCategory */

export const FLAG_CATEGORY = {
  // A defect or a gap in WordPress itself: recorded, never repaired.
  faq_missing_in_source: 'SOURCE_QUALITY_FLAG',
  source_markup_defect: 'SOURCE_QUALITY_FLAG',
  insufficient_source_areas: 'SOURCE_QUALITY_FLAG',
  insufficient_source_local_copy: 'SOURCE_QUALITY_FLAG',
  hero_image_missing: 'SOURCE_QUALITY_FLAG',
  hero_image_not_city_specific: 'SOURCE_QUALITY_FLAG',
  hero_image_wrong_state_label: 'SOURCE_QUALITY_FLAG',
  hero_image_missing_alt: 'SOURCE_QUALITY_FLAG',
  legacy_slug_typo: 'SOURCE_QUALITY_FLAG',
  // A decision only the business can take.
  nearest_branch_unverified: 'BUSINESS_UNVERIFIED',
  office_location_conflict: 'BUSINESS_UNVERIFIED',
  legacy_pricing_conflict: 'BUSINESS_UNVERIFIED',
  no_source_city_page: 'BUSINESS_UNVERIFIED',
  // Something this agent computed, or failed to compute.
  geocode_rejected: 'DERIVED',
  geocode_unverified: 'DERIVED',
  no_serving_branch: 'DERIVED',
};
