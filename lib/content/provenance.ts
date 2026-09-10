/**
 * Where every rendered value came from.
 *
 * The templates take resolved props and never see a database row, which is right — but it also means
 * that by the time a value reaches the page, its origin is invisible. This module names the origin of
 * each slot, so a rendered page can be audited field by field without reading the assembler.
 *
 * It is a description of the pipeline, not part of it: nothing here is imported by a route, a loader
 * or a template. `verifyProvenance` re-derives each claim from the same inputs the assembler used and
 * reports whether the value the template received actually came from where this table says.
 *
 * A field with `origin: 'ABSENT_IN_SOURCE'` is one WordPress does not supply. It is recorded as
 * missing. It is never filled from another city, another page, or from copy written here.
 */

export type Origin =
  /** Straight from a WordPress row, unchanged. */
  | 'WORDPRESS'
  /** From a business input the client supplied (branch list, pricing sheet). */
  | 'BUSINESS_INPUT'
  /** Computed by the migration (nearest branch, geocode, slug shape). */
  | 'DERIVED'
  /** Master template copy that carries no business fact and no page-specific claim. */
  | 'MASTER_TEMPLATE'
  /** An approved design asset, extracted from a mock with its provenance recorded. */
  | 'DESIGN_ASSET'
  /** WordPress has no value. The field is empty and stays empty. */
  | 'ABSENT_IN_SOURCE';

export type FieldProvenance = {
  /** The rendered slot, in the path a reviewer would use to find it in the props. */
  field: string;
  origin: Origin;
  /** Exactly where: a table.column, a dataset file, or the master key. */
  source: string;
  /** What the template actually received, truncated for the report. */
  value: string | null;
  note?: string;
};

const show = (v: unknown, max = 90): string | null => {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.length ? `[${v.length}] ${String(v[0]).slice(0, max)}` : '[0]';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return s.length > max ? s.slice(0, max) + '…' : s;
};

/** One row per rendered slot on a city page. */
export function cityPageProvenance(props: {
  hero: { eyebrow: string; title: string; lede: string; addressLine: string; rating: unknown; image: { src: string; alt: string }; trustLine: unknown[]; awards: unknown[] };
  contact: { phone: string; addressLines: string[]; servedFrom?: string };
  intro: { heading: string; paragraphs: string[]; teamPhoto: unknown };
  serviceRows: { rows: unknown[]; image: unknown };
  solutions: { count: number; cards: unknown[] };
  areas: { list: string[]; image: unknown };
  faq: { items: unknown[] };
  meta: { title: string; description: string; canonical: string };
  jsonLd: unknown[];
}): FieldProvenance[] {
  const p = props;
  return [
    { field: 'hero.eyebrow', origin: 'WORDPRESS', source: 'site.cities.name + site.states.name', value: show(p.hero.eyebrow) },
    { field: 'hero.title', origin: 'MASTER_TEMPLATE', source: "site.masters['city_hero'].title, filled with the city and state", value: show(p.hero.title), note: 'The heading pattern is master copy; every value inside it is the row.' },
    { field: 'hero.lede', origin: 'MASTER_TEMPLATE', source: "site.masters['city_hero'].lede", value: show(p.hero.lede) },
    { field: 'hero.addressLine', origin: p.hero.addressLine ? 'BUSINESS_INPUT' : 'ABSENT_IN_SOURCE', source: 'site.branches.street/city/zip (branches.json)', value: show(p.hero.addressLine) },
    { field: 'hero.rating', origin: p.hero.rating ? 'BUSINESS_INPUT' : 'ABSENT_IN_SOURCE', source: 'site.branches.rating', value: show(p.hero.rating), note: p.hero.rating ? undefined : 'No rating is known, so none is shown. Q5 is still open.' },
    { field: 'hero.image.src', origin: p.hero.image.src.includes('/uploads/') ? 'WORDPRESS' : 'DESIGN_ASSET', source: 'wp_postmeta._thumbnail_id → attachment file (minnesota.media.json)', value: show(p.hero.image.src) },
    { field: 'hero.image.alt', origin: p.hero.image.alt ? 'WORDPRESS' : 'ABSENT_IN_SOURCE', source: 'wp_postmeta._wp_attachment_image_alt', value: show(p.hero.image.alt) },
    { field: 'hero.trustLine', origin: 'MASTER_TEMPLATE', source: 'design mock hero trust line', value: show(p.hero.trustLine), note: 'Company-level claims, not city claims.' },
    { field: 'hero.awards', origin: 'DESIGN_ASSET', source: 'data/mock-assets.json', value: show(p.hero.awards) },
    { field: 'contact.phone', origin: 'BUSINESS_INPUT', source: 'site.branches.phone (branches.json)', value: show(p.contact.phone) },
    { field: 'contact.addressLines', origin: p.contact.addressLines.length ? 'BUSINESS_INPUT' : 'ABSENT_IN_SOURCE', source: 'site.branches (branches.json)', value: show(p.contact.addressLines) },
    { field: 'intro.heading', origin: 'MASTER_TEMPLATE', source: "site.masters['city_intro']", value: show(p.intro.heading) },
    { field: 'intro.paragraphs', origin: 'MASTER_TEMPLATE', source: "site.masters['city_intro'], filled with the city's own local specifics", value: show(p.intro.paragraphs) },
    { field: 'intro.teamPhoto', origin: 'DESIGN_ASSET', source: 'data/mock-assets.json', value: show(p.intro.teamPhoto) },
    { field: 'serviceRows.rows', origin: 'MASTER_TEMPLATE', source: "site.masters['service_rows']", value: show(p.serviceRows.rows), note: 'The eight headline services, identical on every city page by design.' },
    { field: 'solutions.cards', origin: 'BUSINESS_INPUT', source: 'data/seed/services.ts (the 92-service catalogue)', value: show(p.solutions.count), note: 'The catalogue is an input. ISSUE-009 is about whether 92 is the right number; nothing here decides it.' },
    { field: 'areas.list', origin: p.areas.list.length > 1 ? 'WORDPRESS' : 'ABSENT_IN_SOURCE', source: 'site.cities.neighborhoods, read from the page\'s own WordPress prose', value: show(p.areas.list) },
    { field: 'areas.image', origin: 'DESIGN_ASSET', source: 'data/mock-assets.json', value: show(p.areas.image) },
    { field: 'faq.items', origin: p.faq.items.length ? 'WORDPRESS' : 'ABSENT_IN_SOURCE', source: 'wp_posts.post_content accordion sections (minnesota.faq.json)', value: show(p.faq.items) },
    { field: 'meta.title', origin: 'WORDPRESS', source: 'wp_postmeta._yoast_wpseo_title', value: show(p.meta.title) },
    { field: 'meta.description', origin: 'WORDPRESS', source: 'wp_postmeta._yoast_wpseo_metadesc', value: show(p.meta.description), note: 'When WordPress has none, assemble.ts currently supplies a fallback — specification §18 item 10, still open.' },
    { field: 'meta.canonical', origin: 'DERIVED', source: 'SITE_URL + the page\'s own legacy slug', value: show(p.meta.canonical), note: 'Self-canonical. The slug is never changed.' },
    { field: 'jsonLd', origin: 'DERIVED', source: 'lib/content/assemble.ts, built from the row', value: show(p.jsonLd.length), note: 'No AggregateRating or Review is ever emitted.' },
  ];
}

/** Counts by origin, for the smoke report. */
export function provenanceSummary(rows: FieldProvenance[]) {
  const by: Record<string, number> = {};
  for (const r of rows) by[r.origin] = (by[r.origin] ?? 0) + 1;
  return {
    fields: rows.length,
    byOrigin: by,
    absent: rows.filter((r) => r.origin === 'ABSENT_IN_SOURCE').map((r) => r.field),
    fromWordPress: rows.filter((r) => r.origin === 'WORDPRESS').map((r) => r.field),
  };
}
