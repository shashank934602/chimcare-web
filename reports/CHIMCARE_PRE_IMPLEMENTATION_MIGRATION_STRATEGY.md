# Chimcare Pre-Implementation Migration Strategy

**The definitive technical description of the WordPress → Next.js migration system as it exists in
this repository on 2026-09-08, and the plan for scaling it to the remaining states.**

| | |
|---|---|
| Repository | `~/Desktop/chimcare/chimcare-web 2` |
| Written | 2026-09-08 |
| Method | Direct inspection of every script, schema, seed file, audit artefact, report and route. Every claim cites its evidence. |
| Companion | `reports/CHIMCARE_MINNESOTA_MIGRATION_POSTMORTEM.md` |
| Task type | Documentation only. No WordPress write, no production write, no deployment, no migration-behaviour change. |

## How to read the status labels

Every section carries one or more of these labels. They are not decorative; they are the point.

| Label | Meaning |
|---|---|
| **CURRENT** | Exists in the repository today and runs |
| **VERIFIED** | Exercised by a test, a validation script, or a measured audit whose output is on disk |
| **PLANNED** | Described in `docs/architecture.md` or a report, but no code exists |
| **RISK** | A known defect, gap or hazard, with evidence |
| **BUSINESS DECISION** | Cannot be resolved by engineering; someone must choose |

A statement with no label is context. Where this document disagrees with an earlier report, the
disagreement is stated and explained rather than silently resolved.

---

# 1. Executive Summary

## What exists

A read-only migration agent that copies Minnesota city pages out of the live WordPress database,
stores them with provenance separated, validates the rendered result against the source with fifteen
checks, and feeds a Next.js application that serves them at their original URLs. It has migrated
**134 Minnesota city pages**, of which **109 publish** and **25 are withheld** by a content gate that
has never been lowered. Two consecutive apply runs produce byte-identical output.

Alongside it sit two whole-site audits, measured against the same database, covering **262,535
legacy URLs across 22 states**. They are the most important artefacts in the repository for planning
the remaining migration, and **no script that produces them exists anywhere on disk**.

## What the audits established

| Finding | Value | Status |
|---|---|---|
| Legacy URL records in full migration scope | 262,535 | VERIFIED |
| Distinct live published WordPress URLs | 229,617 | VERIFIED |
| URLs with a fully verified State → City → Service → Destination chain | 87,581 (33.4%) | VERIFIED against source data, not against a rendered page |
| Services WordPress actually publishes | 208 | VERIFIED |
| Services the application models | 92 | CURRENT |
| URLs naming a service the application cannot represent | 105,220 | VERIFIED |
| Redirects whose target itself returns 404 | 31,799 of 51,607 (61.6%) | VERIFIED |
| Share of the non-linkable population that is a business decision, not code | 99.3% | VERIFIED |

## The three findings that shape the plan

**The 92-service catalogue is not a fact about the business.** It was generated from one page of a
design mock. WordPress has no service catalogue at all, and actually publishes 208 distinct services.
Roughly half of all legacy URLs name a service the application cannot represent. This is the
migration's bottleneck, and it is a business decision rather than an engineering task.

**Minnesota is not a representative sample.** It is 46.3 percent unresolved against 32.5 percent
site-wide, and the spread across states runs from 2.7 percent (California) to 61.5 percent
(Washington). Ratios measured in Minnesota must never be scaled to the site.

**The redirect map is the largest correctness defect.** Six of every ten approved redirects land on
a URL that will itself 404. This comes from the business fate maps, not from our code, and it is
concentrated in Massachusetts, Washington, Illinois and Minnesota.

## Readiness

The Minnesota agent is sound for Minnesota. It is not ready for a second state: the Massachusetts
configuration cannot be executed by the agent as written, the geocode cache the agent reads is
Minnesota-specific, the URL inventory is produced by a Minnesota-only builder, and the audit layer
that would drive the other 21 states is not reproducible. §29 lists the exact conditions.

---

# 2. Current Migration Architecture

## The shape, as built

```
WordPress MySQL (chimcare_local)          SOURCE OF TRUTH. SELECT only. Never written.
        │
        ├──► scripts/migrate/agent.mjs  ──► data/seed/mn.migration.json   (134 cities, provenance-separated)
        │      via source.mjs               data/seed/mn.ledger.json      (checksums for idempotency)
        │                                   public/uploads/…              (15 hero files, byte-verified)
        │
        └──► scripts/build-mn-seed.mjs ──► data/seed/minnesota.generated.json  (20,479 URL rows, tiers, fates)
               via 2.4 GB export + fate maps                                  MINNESOTA-ONLY
        │
        ▼
data/seed/minnesota.ts   joins both, runs the gate, produces the seed
        │
        ▼
lib/db/seed.ts → Postgres schema `site` (11 tables)   PGlite locally, Supabase planned
        │
        ▼
app/location/[slug]/page.tsx   ONE route, the pages row decides city | service | redirect | 404
        │
        ▼
components/templates/*         CityPage · ServicePage · StateHub · NationalHub
```

**Status: CURRENT.** Evidence: the files named exist and were read in full for this document.

## The shape, as planned

`docs/architecture.md` §2 describes a request path this repository does not yet implement:

```
Cloudflare Worker (KV redirect lookup: 301 / 410 / miss)
  → Cloudflare cache
    → Cloud Run / Next.js
      → kind=legacy → <LegacyShell>    ← does not exist; today kind=legacy is a 404
      → Valkey full-route cache
```

**Status: PLANNED.** Evidence: no `wrangler.toml`, no `workers/` directory, no file referencing
Cloudflare, KV, R2 or Valkey exists outside `docs/`. Confirmed by repository-wide search.

## The one design principle that governs everything

> The agent copies. It must never write copy, paraphrase, fix grammar, invent an FAQ, area, local
> line, alt text or metadata, guess a territory, replace/rename/re-encode/optimise an image, repair
> a source defect, change a source URL, or write to WordPress. Where the source has nothing, the
> field stays empty and the page is flagged.

That paragraph is from `CLAUDE.md` and from the header of `scripts/migrate/source.mjs`. Every
section below can be read as a test of whether the code honours it.

---

# 3. Repository and Script Map

## Everything that participates in the migration

**Status: CURRENT.** 23 scripts, 5,982 lines. Inventory taken by `find scripts -type f`.

| Path | Lines | Role | WordPress? | Writes |
|---|---|---|---|---|
| `scripts/migrate/source.mjs` | 336 | The only WordPress contact. Extraction, cleaning, checksums, media download | SELECT + GET | media files |
| `scripts/migrate/states.mjs` | 182 | Per-state configuration, `mn` and `ma` | no | no |
| `scripts/migrate/agent.mjs` | 464 | Orchestrator, gate, ledger, report, regression | via source.mjs | dataset, ledger (apply only); report |
| `scripts/migrate/validate.mjs` | 162 | The 15 render checks, as a library | no | no |
| `scripts/migrate/geocode.mjs` | 197 | State-qualified geocoder | SELECT | per-state cache |
| `scripts/migrate/compare-datasets.mjs` | 111 | Pilot vs agent, 14 dimensions | no | optional JSON |
| `scripts/build-mn-seed.mjs` | 520 | Pilot builder: the 20,479-row URL universe | no, reads the export | `minnesota.generated.json`, `mn-geocode.json` |
| `scripts/recover-mn-faqs.mjs` | 115 | One-time FAQ recovery from `post_content` | SELECT | `minnesota.faq.json` |
| `scripts/recover-mn-media.mjs` | 182 | One-time hero recovery | SELECT + GET | media, `minnesota.media.json` |
| `scripts/validate-render.mjs` | 238 | Standalone 15-check runner over 134 pages | no | optional JSON |
| `scripts/check-pages.mjs` | 115 | 16-URL smoke test | no | **one booking row** |
| `scripts/check-responsive.mjs` | 130 | Overflow measurement via DevTools Protocol | no | optional PNGs |
| `scripts/test/card-links.mjs` | 382 | Unit and data invariants for card resolution | SELECT | no |
| `scripts/audit/ma-cards.mjs` | 894 | Massachusetts card-link survey | SELECT | `ma.cards.json`, one report |
| `scripts/audit/ma-decision-register.mjs` | 312 | Formats the MA survey into three documents | no | three reports |
| `scripts/audit/mn-url-audit.mjs` | 435 | Classifies all 20,479 MN URLs | reads TSV dumps | `mn-url-audit.json` |
| `scripts/audit/mn-url-report.mjs` | 981 | Renders the MN URL audit | no | one report |
| `scripts/audit/mn-card-links.mjs` | 24 | Hub link and image reachability | no | no |
| `scripts/audit/mn-5-city-dry-run.mjs` | 228 | Five-city frontend dry run | no | one JSON |
| `scripts/audit/mn-service-catalogue-audit.mjs` | 182 | MN slug phrases vs the 92 | no | one JSON |
| `scripts/audit/mn-service-catalogue-report.mjs` | 210 | Renders the above | no | one report |
| `scripts/port-css.mjs` | 172 | CSS from design mocks | no | stylesheets |
| `scripts/seed.ts` | 30 | Database migrate and seed | no | database |

## Shared contract

| Path | Role |
|---|---|
| `lib/migration/types.ts` | `ProvenanceCategory`, `MigrationFlag`, `CitySource`, `CityHero`, `CityDerived`, `CityChecksums`, `MigrationCity`, `PageRecord` |
| `lib/migration/flags.mjs` | `FLAG_CATEGORY`: 16 flag codes → one of `SOURCE_QUALITY_FLAG` (9), `BUSINESS_UNVERIFIED` (4), `DERIVED` (3). Plain JS so Node and TypeScript share one table |
| `lib/migration/card-resolution.ts` | `resolveCityCard()`, `auditResolution()`. Decides what a hub card links to. Never decides publication |

## Files the brief expected that do not exist

The task brief named five library files. **None exists.** Stated here so nobody searches for them.

| Named in brief | Reality |
|---|---|
| `lib/db.ts` | Does not exist. `lib/db/` is a directory: `client.ts`, `schema.ts`, `seed.ts`, `migrations/` |
| `lib/queries.ts` | Does not exist. Queries live in `lib/data/*.ts`, seven files |
| `lib/page-mapper.ts` | Does not exist. Mapping is in `data/seed/minnesota.ts` and `scripts/migrate/agent.mjs` |
| `lib/wpbakery.ts` | Does not exist. Shortcode handling is in `scripts/migrate/source.mjs` |
| `lib/schema-tokens.ts` | Does not exist. There is no Schema Pro token resolution anywhere |

Also absent: `lib/seo/` exists as an **empty directory**. There is no `app/sitemap.ts`, no
`app/robots.ts`, no `middleware.ts`, no test runner configuration, no ESLint configuration.

## The whole-site audit has no producing script — RISK

Four reports in `reports/WHOLE_SITE_*.md` and 444 MB in `data/audits/` (`whole-site-url-audit.json`
296 MB, `whole-site-audit.sqlite` 162 MB, and two smaller files) were generated on 2026-09-07. Their
`generated_at` timestamps carry Python-style microseconds. **No `.py` file and no `.mjs` file
anywhere under `~/Desktop/chimcare` references them**, including the `Chimcare-Migration/scripts/`
folder, which holds only `extract_job_listings.py`, `analyze_content.py` and
`validate_extraction.py`.

The audit results are trustworthy as measurements, and this document uses them. But they cannot be
regenerated, re-run against a changed database, or extended to a new state. The plan in §29 requires
this to be fixed before the audit layer is relied on for any state beyond Minnesota.

---

# 4. WordPress Source Architecture

**Status: CURRENT, VERIFIED.**

## Access method

| Question | Answer | Evidence |
|---|---|---|
| REST API? | **No** | No `fetch` to a `/wp-json/` path anywhere |
| WPGraphQL? | **No** | No GraphQL client or query in the repository |
| Direct database? | **Yes** | `source.mjs:21 makeQuery()` |
| SQL? | **Yes** | Three queries, quoted in §5 |
| SELECT only? | **Yes** | 26 SELECT statements across all scripts, 0 INSERT/UPDATE/DELETE/DROP/ALTER. Confirmed by repository-wide grep |
| Which database | `chimcare_local`, MySQL 8.0 on `127.0.0.1`, user `root`, no password | `agent.mjs:43`, `geocode.mjs:58` |

## How the query is executed

```js
// scripts/migrate/source.mjs:21
export function makeQuery(db) {
  return function queryJson(sql) {
    const out = execFileSync('mysql', ['-h', db.host, '-u', db.user, `--database=${db.database}`,
      '-N', '-B', '--raw', '-e', sql], { maxBuffer: 1024 * 1024 * 1024, encoding: 'utf8' });
    const t = out.trim();
    return t && t !== 'NULL' ? JSON.parse(t) : [];
  };
}
```

The `mysql` binary is invoked without a shell. `-N -B --raw` suppresses headers, uses tab batch
mode, and disables escaping so JSON survives intact. Every query must return **one cell containing a
JSON array**, built by MySQL itself with `JSON_ARRAYAGG(JSON_OBJECT(...))`. No delimiter parsing
happens in Node. Buffer cap is 1 GiB.

**No password can be passed.** There is no `-p` flag and no option for one. A remote or
password-protected MySQL requires `~/.my.cnf`. This is a RISK for portability, documented in the
Minnesota postmortem.

## Tables read

| Table | Read by | Purpose |
|---|---|---|
| `wp_posts` | all three queries | Page identity, slug, title, content, modified date; attachment rows |
| `wp_postmeta` | all three queries | Yoast title/description, `_thumbnail_id`, `_yoast_post_redirect_info`, `geolocation_*`, `_job_location`, `_wp_attached_file`, `_wp_attachment_image_alt`, `_wp_attachment_metadata` |
| `wp_term_relationships`, `wp_term_taxonomy`, `wp_terms` | the whole-site audit only | `job_listing_region`, 138 tagged pages site-wide |

Not read by the agent: `wp_redirection_items` (15 rows, not the migration redirect source),
`wp_options`, any plugin table.

## Pagination, batching, retries, deduplication

| Concern | What the code does | Status |
|---|---|---|
| Pagination | **None.** Each query returns the whole result set for the state in one JSON array | CURRENT |
| Batching | **None** on read. Media downloads are sequential inside the city loop | CURRENT |
| Retries | **None.** `execFileSync` throws on any failure and the run aborts | CURRENT, RISK for larger states |
| Deduplication | By WordPress post ID. `duplicateSlugs`, `duplicateWpIds`, `duplicateMedia` are counted and reported; all 0 in Minnesota | VERIFIED |
| Duplicate postmeta rows | Would multiply JOIN results. Tested for Minnesota across nine meta keys: **none exist**. **Untested for any other state** | VERIFIED for MN, RISK elsewhere |

For Minnesota the whole state is 137 pages and the three queries complete in well under a second.
California has 616 city pages and 66,694 URLs; the single-array approach will still fit inside 1 GiB
but has never been exercised at that size.

## Identity preservation

| Value | Preserved as | Evidence |
|---|---|---|
| WordPress post ID | `source.wpPostId`, carried into `cities.legacy_post_id` and `pages.legacy_post_id` | `agent.mjs` MAP stage; `lib/db/seed.ts` |
| Source URL | `source.wpSlug`; the slug **is** the route; `pages.legacy_url` stores the full origin URL | `seed.ts` sets `legacyUrl = https://www.chimcare.com/location/${slug}/` |
| Post type | Filtered to `job_listing` at query time | all three SQL `WHERE` clauses |
| Post status | Filtered to `publish` | same |

## How each kind of data is identified

| Data | How | Status |
|---|---|---|
| Post type | `post_type = 'job_listing'` | CURRENT |
| Taxonomies | **Not used by the agent.** `job_listing_region` tags 14 MN pages vs 137 by slug; too sparse to be authoritative | CURRENT, by design |
| Media attachments | `_thumbnail_id` meta → `wp_posts` row with `post_type='attachment'` | CURRENT |
| Page-builder fields | Regex over raw `post_content` for `[vc_tta_section title="…"]` and `<h2>` headings | CURRENT, §8 |
| SEO plugin fields | `_yoast_wpseo_title`, `_yoast_wpseo_metadesc` only | CURRENT, §10 |
| Local SEO fields | `_job_location`, `geolocation_lat`, `geolocation_long` | CURRENT, §11 |
| Structured data fields | **Not extracted.** WP Schema Pro is a single global record and is deliberately excluded | CURRENT, §10 |
| Redirect / fate records | `_yoast_post_redirect_info` from postmeta, plus the three business JSON maps | CURRENT, §14 |

## How source data is protected from modification

Three layers, all CURRENT and VERIFIED:

1. **Only SELECT and GET are ever issued.** Repository-wide search confirms no write verb.
2. **The agent's own writes are guarded.** Every dataset and ledger write sits inside one
   `if (APPLY)` block at `agent.mjs:359–373`. Media downloads are guarded by `dryRun` inside
   `ensureAsset`, which returns before any filesystem call. Dry run is the default.
3. **Nothing points back.** No script holds a WordPress write credential, and the connection is a
   local read replica the client operates.

One exception worth knowing: `--report <file>` writes its JSON in dry-run mode too
(`agent.mjs:462`). It is a report, not migration state, but "dry run writes nothing" is not literally
true.

---

# 5. Extraction Pipeline

**Status: CURRENT, VERIFIED for Minnesota.**

## The three queries, verbatim

### City pages — `fetchCityPages(query, { cityPagePatterns })`, `source.mjs:260`

```sql
SELECT JSON_ARRAYAGG(JSON_OBJECT(
  'wpPostId', p.ID, 'wpSlug', p.post_name, 'wpTitle', p.post_title, 'modified', p.post_modified,
  'content', p.post_content,
  'metaTitle', st.meta_value, 'metaDescription', sd.meta_value,
  'thumbnailId', th.meta_value, 'redirectInfo', rd.meta_value))
FROM wp_posts p
LEFT JOIN wp_postmeta st ON st.post_id = p.ID AND st.meta_key = '_yoast_wpseo_title'
LEFT JOIN wp_postmeta sd ON sd.post_id = p.ID AND sd.meta_key = '_yoast_wpseo_metadesc'
LEFT JOIN wp_postmeta th ON th.post_id = p.ID AND th.meta_key = '_thumbnail_id'
LEFT JOIN wp_postmeta rd ON rd.post_id = p.ID AND rd.meta_key = '_yoast_post_redirect_info'
WHERE p.post_type = 'job_listing' AND p.post_status = 'publish' AND (post_name LIKE '…' OR …)
```

The `LIKE` patterns come from `STATE.cityPagePatterns`. For Minnesota:
`chimney-sweep-fireplace-in-%-mn` and `chimney-sweep-repair-in-%-mn`. **This is the only place a
state's city pages are selected, and it recognises only the patterns listed.** §12 shows what that
misses.

### Coordinates and location — `fetchGeo(query, ids)`, `source.mjs:277`

```sql
SELECT JSON_ARRAYAGG(JSON_OBJECT('postId', post_id, 'k', meta_key, 'v', meta_value))
FROM wp_postmeta
WHERE post_id IN (…) AND meta_key IN
  ('geolocation_lat','geolocation_long','geolocation_city','geolocation_postcode','_job_location')
```

### Hero attachments — `fetchHeroAttachments(query, { cityPagePatterns })`, `source.mjs:290`

```sql
SELECT JSON_ARRAYAGG(JSON_OBJECT(
  'slug', p.post_name, 'postId', p.ID, 'attachmentId', a.ID,
  'guid', a.guid, 'mime', a.post_mime_type, 'title', a.post_title,
  'caption', a.post_excerpt, 'description', a.post_content,
  'attachedFile', fm.meta_value, 'alt', am.meta_value, 'meta', mm.meta_value))
FROM wp_posts p
JOIN wp_postmeta t ON t.post_id = p.ID AND t.meta_key = '_thumbnail_id'
JOIN wp_posts a ON a.ID = t.meta_value AND a.post_type = 'attachment'
LEFT JOIN wp_postmeta fm ON fm.post_id = a.ID AND fm.meta_key = '_wp_attached_file'
LEFT JOIN wp_postmeta am ON am.post_id = a.ID AND am.meta_key = '_wp_attachment_image_alt'
LEFT JOIN wp_postmeta mm ON mm.post_id = a.ID AND mm.meta_key = '_wp_attachment_metadata'
WHERE p.post_type = 'job_listing' AND p.post_status = 'publish' AND (p.post_name LIKE '…' OR …)
```

## The data flow, arrow by arrow

```text
wp_posts + wp_postmeta
    ↓  source.mjs · fetchCityPages() / fetchGeo() / fetchHeroAttachments()
    ↓  three SELECTs, one JSON array each. Can fail: mysql unreachable → execFileSync throws → run aborts
raw page record  { wpPostId, wpSlug, wpTitle, modified, content, metaTitle, metaDescription, thumbnailId, redirectInfo }
    ↓  agent.mjs · FETCH EXACTLY stage, line 57
    ↓  loads branches.json (BUSINESS), keep-pages.json (APPROVED_RULE), mn-geocode.json (DERIVED)
    ↓  agent.mjs · MAP (branches), line 71 · matches _job_location to branches.json by street number + zip
    ↓  can fail: no match → logged "skipped, nothing invented", branch omitted
    ↓  agent.mjs · MAP (cities), line 106 · one loop over every page
    ↓     dupSlugs check → duplicate of a branch page is skipped (handled as a redirect)
    ↓     source.mjs · cleanMarkup()            strips comments, shortcode tags, script/style; collapses whitespace
    ↓     source.mjs · introNeighbourhoods()    two named neighbourhoods from the intro sentence
    ↓     source.mjs · areasFrom()              <li> items in a 2,000-char window after "Areas We Serve"
    ↓     source.mjs · localSpecificsFrom()     first sentence + first housing sentence after "Why … Important in"
    ↓     source.mjs · legacyPricingCopyFrom()  sentences quoting a $ range, preserved and never rendered
    ↓     source.mjs · faqsFrom()               [vc_tta_section title="…"] from RAW post_content
    ↓     source.mjs · markupDefectsFrom()      </name] literals from RAW post_content, counted, never repaired
    ↓     source.mjs · parseAttachmentMeta()    width/height/filesize/file from PHP-serialised metadata by regex
    ↓     source.mjs · ensureAsset()            reuse-or-download, byte count vs WordPress filesize, SHA-256
    ↓     can fail: download error → hero_image_missing flag, page continues, no stand-in
    ↓     DERIVED: coordinates (WordPress > cache > null), nearest branch, distance
    ↓     can fail: no coordinate → no_serving_branch flag, no branch guessed
    ↓     checksums: source (raw), content (extracted, key-sorted), media ({attachmentId: sha256})
city record  { slug, name, kind, hasSourcePage, source{…}, derived{…}, flags[], checksums{…} }
    ↓  agent.mjs · GATE, line 253 · five conditions, thresholds from config
    ↓  agent.mjs · EXCLUDE, line 269 · cities with service URLs but no city page → named, no URL created
    ↓  agent.mjs · IDEMPOTENCY, line 284 · compares three checksums to the previous ledger by post ID
    ↓  agent.mjs · RENDER + VALIDATE, line 304 · fetches every page from the running app, runs 15 checks
    ↓  can fail: any check → listed, exit code 1, but nothing blocks a later --apply
    ↓  agent.mjs · STORE, line 358 · if (APPLY) only
data/seed/mn.migration.json  +  data/seed/mn.ledger.json  +  public/uploads/…
```

## Failure behaviour, summarised

| Failure | Behaviour today | Assessment |
|---|---|---|
| MySQL unreachable | Abort, non-zero exit | Correct |
| Branch record not matched | Page skipped, logged, nothing invented | Correct |
| Hero download fails | Flagged `hero_image_missing`, run continues | RISK: a partial media set is a silently incomplete migration. Recommend hard stop |
| Byte count mismatch | `ok: false`, flagged | RISK: a mismatch means the source changed mid-run. Recommend hard stop |
| Geocoder returns nothing | Coordinate null, `no_serving_branch` flag | Correct |
| Validation check fails | Reported, exit 1 | Correct, but **nothing prevents `--apply` afterwards** |
| Malformed shortcode | Flagged `source_markup_defect`, preserved | Correct |

---

# 6. Raw Data Preservation

**Status: partly CURRENT. The model is FETCH EXACTLY → STORE EXACTLY → VERIFY EXACTLY → RENDER
WITHOUT ALTERING. The code implements most of it. What it does not implement is stated below.**

## What is stored, and its classification

| Field | Stored where | Classification | Notes |
|---|---|---|---|
| `raw_title` | `source.wpTitle` | SOURCE | Verbatim `post_title` |
| `raw_content` | **not stored** | — | See below |
| `raw_excerpt` | **not stored** | — | Not queried |
| raw URL | `source.wpSlug`; `pages.legacy_url` | SOURCE | The slug is the route |
| raw slug | `source.wpSlug` | SOURCE | Never altered, including misspellings |
| WordPress ID | `source.wpPostId` | SOURCE | Join key for idempotency |
| SEO title | `source.metaTitle` | SOURCE where present, else `null` | 0 of 134 MN pages have one |
| Meta description | `source.metaDescription` | SOURCE where present, else `null` | 14 of 134 have one |
| Canonical | **not stored** | DERIVED at render | Constructed as `SITE_URL + /location/{slug}/`. WordPress holds only 2 canonical rows site-wide |
| Robots | **not stored** | DERIVED at render | `noindex,nofollow` on preview and admin; nothing on public pages |
| OG metadata | **not stored** | — | The Yoast OG keys **do not exist** in this database |
| Twitter metadata | **not stored** | — | The Yoast Twitter keys **do not exist**; the app emits no Twitter tags |
| JSON-LD | **not stored** | DERIVED at render | Built in `assemble.ts` from migrated fields |
| Local SEO | `derived.branch`, branch phone/address from `branches.json` | DERIVED + BUSINESS | Branch assignment is a computation |
| Image metadata | `source.hero.{title, alt, caption, description, width, height, mime}` | SOURCE | From the attachment row and metadata |
| Attachment ID | `source.hero.attachmentId`, `cities.legacy_thumbnail_id` | SOURCE | |
| MIME type | `source.hero.mime` | SOURCE | `post_mime_type` |
| Filename, extension | `source.hero.filename`, `.extension` | SOURCE | Never renamed |
| Dimensions | `source.hero.width`, `.height` | SOURCE | Parsed from serialised metadata |
| Size | `source.hero.filesize` | SOURCE | Compared to bytes on disk |
| Checksums | `checksums.source`, `.content`, `.media` | DERIVED | §22 |

## The five verbs, tested against the code

**FETCH EXACTLY — implemented.** The three queries read fields verbatim. Nothing is transformed at
query time.

**STORE EXACTLY — implemented for the fields that are stored, with one significant gap.** Raw
`post_content` is fetched, hashed into `checksums.source`, and then **discarded**. Only the extracted
fields are written. Consequences:

- Content that the extractor does not recognise is neither migrated nor recoverable from the dataset.
  For the 25 withheld pages, that is the point. For the 14 branch pages it means text WordPress
  holds is absent from our copy (§8).
- A change to extraction rules requires a re-run against WordPress. There is **no immutable source
  snapshot** to replay against. RISK, listed in §29.

**VERIFY EXACTLY — implemented for what is stored.** Validation check 4 asserts every FAQ verbatim,
check 15 asserts the areas list byte-identical and in source order, check 6 asserts the hero by
SHA-256, byte count and filename. 134 of 134 pass. What is not verified: anything not extracted.

**RENDER WITHOUT ALTERING — implemented.** Templates receive resolved props from `assemble.ts` and
never see a row or a `{{slot}}`. `slots.ts` `fill()` **throws** on an unknown slot, so a broken
master can never publish a literal placeholder. A live misspelling, `farmingon`, renders unchanged,
which is the practical proof.

## The one explicit rule about rendered values

Rendered output is evidence and never a write-back source. The validator compares rendered against
stored; nothing updates stored from rendered. Reading a live `<title>` back into the dataset would
import Yoast's runtime templating as authored content, and the code does not do this.

---

# 7. Transformation Pipeline

**Status: CURRENT, VERIFIED.** Every function below is in `scripts/migrate/source.mjs`.

## What each extractor does, exactly

**`cleanMarkup(raw, { markdownSource })`, line 47.** Removes HTML comments, every shortcode tag
(text between tags survives), and `<script>`/`<style>`/`<noscript>` blocks. Optionally runs
`markdownToHtml` for states whose pages were saved as Markdown (Massachusetts has 464 such pages;
Minnesota has zero). Collapses whitespace. **Rewrites nothing.**

**`areasFrom(markup)`, line 93.** Finds `<h2>Areas We Serve` or `<h2>Serving Nearby`, takes a
fixed 2,000-character window, extracts every `<li>`, strips tags, and drops generic tail items
matching `/^surrounding|^nearby|^other|^greater|:|^and /i`. Order is document order.

**`localSpecificsFrom(markup, { paragraphScanDepth, sectionHeading, unwrappedParagraphs })`, line
122.** Finds the heading `/<h2>Why [^<]* Important in /`, bounds the section at the next `<h2>`,
takes the first `paragraphScanDepth` paragraphs. `climate_line` is the first sentence of the first
paragraph, verbatim. `housing_line` is the first later sentence matching
`/\b(homes?|housing|houses|builds?|neighborhoods?)\b/i`, with one trailing punctuation mark removed.
Minnesota scans depth 1. Massachusetts is configured for depth 3, a looser heading regex, and
unwrapped paragraphs, all measured rather than guessed.

**`faqsFrom(rawContent)`, line 179.** Operates on **raw** content because it needs the shortcode
attribute. Regex `/\[vc_tta_section\b([^\]]*)\]([\s\S]*?)\[\/vc_tta_section\]/g`. Question is the
`title="…"` attribute. Answer is the body with inner shortcodes and tags replaced by spaces. Sections
with no title or an empty body go to `unrecoverable`, never reconstructed. A prose `Q:/A:` fallback
runs only when the accordion yields nothing.

**`markupDefectsFrom(raw, pattern)`, line 236.** Counts literal matches of the state's
`markupDefectRe` in raw content. Returns `{ text, count }` per distinct literal. **Detection only.**

**`parseAttachmentMeta(serialized)`, line 308.** Regex over PHP serialisation for `width`, `height`,
`filesize`, `file`. Not a general unserialiser; reads top-level scalars only. RISK: untested against
malformed serialisation and nested `sizes` arrays.

## What is preserved verbatim vs derived

| Verbatim | Derived |
|---|---|
| Title, slug, post ID | City name when the title is malformed: `titleCaseSlug(suffix)` |
| Areas, in source order | Deduplication of areas via `Set` (order-preserving) |
| FAQ questions and answers, entities decoded | Nothing |
| Local lines, sentence boundaries intact | Which sentence is chosen |
| Pricing copy sentences | Nothing; never rendered |
| Meta description | Nothing |
| Hero bytes and every attachment field | `imageKey` path under `uploads/` |
| — | Coordinates, branch, distance, checksums, gate verdict |

## Entity handling

`decodeEntities()` maps a fixed table of 14 named entities plus any numeric entity. It is applied to
FAQ text and stripped-tag text. It changes `&amp;` to `&`; it does not change words.

---

# 8. Page-Builder Extraction

**Status: CURRENT, VERIFIED for Minnesota.**

## How WPBakery content is handled

| Question | Answer |
|---|---|
| How is `raw_content` stored? | **It is not.** It is hashed into `checksums.source` and discarded after extraction |
| How is rendered content produced? | From extracted fields plus the master copy blocks in `data/seed/masters.ts`, through `assemble.ts` |
| Is raw source preserved? | **Not in the dataset.** It remains in WordPress, which is read-only and is the rollback |
| How are shortcodes parsed? | `SHORTCODE = /\[\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s[^\]]*)?\]/g` strips tags in `cleanMarkup`; `faqsFrom` reads `[vc_tta_section]` attributes from raw content before stripping |
| How is malformed source handled? | Detected from raw content, flagged `source_markup_defect`, preserved, never repaired |
| FAQs | `faqsFrom`, §7. 642 pairs across 134 pages |
| Areas | `areasFrom`, §7 |
| Local copy | `localSpecificsFrom`, §7 |
| Inline images | **Not extracted.** Only the featured image (`_thumbnail_id`). 19 of 26 hand-authored Massachusetts pages carry inline body images that would silently not migrate. RISK |
| Headings | Used only as section anchors (`<h2>`). Not stored |
| Source defects | `markupDefectsFrom` |

## The `</vc_column_text]` defect

The correct closing tag is `[/vc_column_text]`. Twenty Minnesota city pages contain `</vc_column_text]`
instead. A generic shortcode strip leaves that literal behind; an HTML parser then swallows
everything after it. This is how the original 2.4 GB export lost entire FAQ sections.

| Question | Answer | Evidence |
|---|---|---|
| Repaired? | **No** | `markupDefectsFrom` returns counts only |
| Preserved? | **Yes**, in WordPress, untouched | Read-only access |
| Flagged? | **Yes**, `source_markup_defect`, category `SOURCE_QUALITY_FLAG`, carrying the literal and its count | `agent.mjs` flag block; 20 pages in the regression output |
| Ignored? | **No** | It is surfaced on `/admin/migration/` and in every report |

The agent's direct detection found **three more** affected pages than the pilot's inference
(Lauderdale, Mound, Roseville), where the defect sits after the accordion opens so only part of the
FAQ was lost. Detecting a defect directly beats inferring it from a symptom.

## The branch-page layout the extractor cannot read — RISK

`localSpecificsFrom` looks for the heading pattern coverage pages use: "Why … Important in {City}".
Branch pages use a different heading, for example "Why St. Paul, MN Homeowners Trust Chimcare", and
`agent.mjs:126` additionally short-circuits with `isBranch ? {} : localSpecificsFrom(...)`. The
result: **all 14 Minnesota branch cities have zero local lines extracted, and all 14 fail the gate**,
even though the text exists in WordPress. This accounts for 14 of the 25 withheld pages and is a
code fix, not a content commission. Detail in the postmortem.

---

# 9. Media Pipeline

**Status: CURRENT, VERIFIED at the byte level for all 134 Minnesota pages.**

## The chain

```text
WordPress page  →  _thumbnail_id meta  →  wp_posts attachment row (+ _wp_attached_file, _wp_attachment_image_alt, _wp_attachment_metadata)
    ↓  source.mjs · fetchHeroAttachments()
attachment record  { attachmentId, guid, mime, title, caption, description, attachedFile, alt, meta }
    ↓  source.mjs · parseAttachmentMeta()   → width, height, filesize, file
    ↓  source.mjs · ensureAsset()
    ↓     dest = public/uploads/<attachedFile>          the WordPress uploads path, verbatim
    ↓     exists on disk → read, hash, return reused:true   (NO network; this is what makes re-runs a no-op)
    ↓     dryRun → return missing:true                      (NO download in dry run)
    ↓     fetch(origin/wp-content/uploads/<attachedFile>) → write raw bytes → return sha256, bytes
    ↓     ok = filesize == null || bytes === filesize      byte count against the size WordPress recorded
hero record  { attachmentId, imageKey, filename, extension, mime, alt, title, caption, description, width, height, filesize, sha256, sourceUrl, guid, usedByPages }
    ↓  cities.hero_image_key, cities.hero_image_alt, cities.legacy_thumbnail_id
    ↓  assemble.ts · heroImage()  →  templates render <img src="/uploads/…">
    ↓  validate.mjs check 5 hero_path (path in HTML) · check 6 hero_file (sha256, bytes, filename, alt)
```

## What is and is not done to images

| Action | Done? | Evidence |
|---|---|---|
| Copied byte-for-byte | **Yes** | `ensureAsset` writes `Buffer.from(await res.arrayBuffer())` unchanged |
| Transformed | **No** | No image library in `package.json` |
| Resized | **No** | Same |
| Renamed | **No** | `dest` preserves `attachedFile` including its `yyyy/mm/` directories |
| Converted | **No** | Extension and MIME recorded from source |
| Optimised | **No** | Same |
| Stored in R2 | **No** | PLANNED in `docs/architecture.md` §11; no R2 code exists |
| Stored in `public/uploads/` | **Yes** | 15 files, 4,670,577 bytes |
| Referenced by original URL | **No.** Rendered as `/uploads/yyyy/mm/name` on the new host. The old `wp-content/uploads` path is PLANNED to be aliased at the edge | `assemble-hubs.ts:64`, architecture §11 |

## Fields recorded per asset

`attachmentId`, `filename`, `extension`, `mime`, `filesize`, `width`, `height`, `title`, `alt`,
`caption`, `description`, `sourceUrl`, `guid`, `sha256`, `usedByPages`. **`parent` is not recorded**;
the attachment's `post_parent` is not queried.

## Verification depth

| Check | Where | Status |
|---|---|---|
| Byte count vs WordPress `filesize` | `ensureAsset` on download and on reuse | VERIFIED 15/15 |
| SHA-256 recorded | `ensureAsset` | VERIFIED |
| SHA-256 re-verified at render | `validate.mjs` check 6 recomputes from disk and compares | VERIFIED 134/134 |
| Filename preserved | check 6 | VERIFIED |
| Alt text rendered | check 6 | VERIFIED |
| Path present in HTML | check 5 | VERIFIED |
| **Image URL actually returns 200** | `scripts/audit/mn-card-links.mjs` on the hub only | VERIFIED for the 15 on the hub; not for city pages |
| **Right file on the right page** | **Nothing** | RISK: a transposition would pass every check |

## The Boston image finding

Attachment **88125**, `chimney-sweep-boston-MA.jpg`, is the featured image on **120 of the 134**
migrated Minnesota pages, on **123 of the 137** live Minnesota city pages, and on **227,511 posts
site-wide** out of 229,626 job listings. It is effectively the installation's default featured image.
It is live in production now: the real Bloomington, Minnesota page serves it as `og:image`.

The agent copied what each page points at and flagged the result: `hero_image_not_city_specific` on
120 cities, `hero_image_wrong_state_label` on 121 (Saint Paul's own hero is `Saint-PaulMA.webp` with
alt "Saint Paul,MA"). **No image was substituted.** Choosing a nicer photograph would be inventing
content. The correction belongs in WordPress; a re-run picks it up with no code change.

---

# 10. SEO Pipeline

**Status: CURRENT for what WordPress stores. Much of what a brief expects to be migrated does not
exist in the source.**

## What WordPress actually stores, measured site-wide

| Yoast field | Rows in the whole database | Consequence |
|---|---|---|
| `_yoast_wpseo_title` | 234 | Migrated where present; null otherwise |
| `_yoast_wpseo_metadesc` | 376 | Migrated where present; null otherwise |
| `_yoast_wpseo_canonical` | 2 | Effectively absent; ours is derived |
| `_yoast_wpseo_meta-robots-noindex` / `-nofollow` | 2 each | Effectively absent |
| `_yoast_wpseo_opengraph-title/-description/-image` | **0 — the keys do not exist** | Nothing to migrate |
| `_yoast_wpseo_twitter-title/-description` | **0 — the keys do not exist** | Nothing to migrate |

Yoast templates these at request time and stores nothing. Of the 134 Minnesota pages, **14 have an
authored description and 0 have an authored title**.

## How each element moves

| Element | Source | Extraction | Dataset | Next.js | Rendered | Status |
|---|---|---|---|---|---|---|
| Title | `_yoast_wpseo_title` | `fetchCityPages` | `source.metaTitle` | `generateMetadata` uses assembled `meta.title` | `<title>Chimney Sweep & Fireplace Services in {City}, MN - Chimcare</title>` | CURRENT. Source title is stored but **the template title is rendered**; check 3 asserts the template form |
| Meta description | `_yoast_wpseo_metadesc` | same | `source.metaDescription` | `meta.description` | present where source has it, template otherwise | VERIFIED check 7 |
| Canonical | not in source | — | — | `alternates.canonical` | self, trailing slash | VERIFIED check 7 |
| Robots | not in source | — | — | `robots: {index:false}` on preview/admin | `noindex,nofollow` on withheld pages | VERIFIED check 7 |
| Open Graph | not in source | — | — | `openGraph: {type, title, description, url}` | emitted, derived | CURRENT, not verified |
| Twitter | not in source | — | — | **nothing** | **no Twitter tags** | CURRENT |
| JSON-LD | not migrated | — | — | `cityJsonLd()` in `assemble.ts` | `WebPage`, `BreadcrumbList`, `HomeAndConstructionBusiness` or `Service`, `OfferCatalog` | VERIFIED check 9 |
| Breadcrumbs | derived | — | — | `Breadcrumbs` component + JSON-LD | Home › Locations › State › City | VERIFIED check 10 |
| Local SEO | `_job_location`, branch record | `fetchGeo`, branch match | `derived.branch` | `contactFor()` | phone on every page, address only on branch pages | VERIFIED check 8 |

## Schema Pro

**There is no Schema Pro token resolution, and no Schema Pro mapping table exists in the repository.**
What was discovered, documented in `MIGRATION_IMPLEMENTATION.md:814`: the `local-business-88926-*`
field set is a **single global record**. Every page in every state reports the same Boston head
office address. Migrating it would attach a Boston address to every city in the country. It is
**deliberately excluded**, and structured data is built from migrated fields instead. The source pages
also carry an `AggregateRating` block; the application emits no rating markup, and check 9 asserts
its absence.

## The "Boston SEO parity test"

**No artefact by that name exists in the repository.** What does exist, and what may have been meant:

- The finding above, that Schema Pro reports Boston everywhere.
- The finding in §9, that the Boston photograph is the live `og:image` on Minnesota pages, verified by
  fetching production during this session.
- Live production-vs-local comparisons run during this session for three cities (Albertville,
  Anoka, Bayport), which showed production pages carry **no meta description** and **two `<h1>`
  elements**, while ours carry one description and one `<h1>`. These were session checks, not a
  committed test.

## What is VERIFIED and what is NOT YET VERIFIED SITE-WIDE

| | Status |
|---|---|
| Meta description parity with stored source, Minnesota, 134 pages | VERIFIED, check 7 |
| Canonical self-reference, Minnesota | VERIFIED, check 7 |
| Structured data parses and has the right types, Minnesota | VERIFIED, check 9 |
| Breadcrumbs, Minnesota | VERIFIED, check 10 |
| Open Graph correctness | **NOT VERIFIED** anywhere |
| Any SEO element for any state other than Minnesota | **NOT VERIFIED.** No other state is seeded |
| Byte-level JSON-LD parity with WordPress output | **Not a target**, by design, since Schema Pro is excluded |

Also absent: `app/sitemap.ts` and `app/robots.ts`. Sitemaps are PLANNED (architecture §9).

---

# 11. State Resolution

**Status: CURRENT, and the weakest structural point in the system. RISK.**

## How state is determined today

**The agent does not resolve state. It assumes it.** `agent.mjs --state mn` selects the `mn` config,
and every page returned by the `LIKE` patterns is Minnesota by construction. State is never stored
on a page; it is inferred from the config that fetched it.

In the database, `cities.state_id` and `branches.state_id` are NOT NULL foreign keys. **`pages` has
no `state_id` column.** A page reaches its state only through `city_id`, and **2,657 page rows have
no city link at all** (all `kind='legacy'`; 1,416 published). With one state this is invisible. With
two, nothing structurally prevents cross-state mixing, and `pages_slug_unique` is global.

## How the whole-site audit resolved state

It had to, because it processed 22 states. `legacy_url_inventory.state_source` records the method:

| Method | URLs |
|---|---|
| Slug state token, after stripping a trailing `-<number>` | 262,271 |
| Page title, reading after the **last** comma | 130 |
| Slug and title disagree | 2 |
| Unresolvable | 132 |

Two traps it documented. **9,018 slugs carry WordPress's duplicate suffix** (`…-il-2`); a strict
`-XX$` test misfiles every one. **418 titles name a city that is also a state** (Wyoming MN, Delaware
OH, Nevada City CA, Port Washington WI); reading only after the last comma removes all of them. And
**130 pages carry no state token in the slug at all** (the `{city}-chimney-sweep` form used in MA,
OH, WA, OR, IL, CA, MN, NH, RI), so state must come from the title.

**None of that logic exists in `scripts/migrate/`.** The agent has no title fallback and no
duplicate-suffix handling for state. RISK for every state after Minnesota.

## Massachusetts cannot run through the agent — RISK

`states.mjs` has an `ma` entry with 13 `cityPagePatterns`, 8 ordered `citySlugRes` and measured
extractor settings. But `agent.mjs` reads the **singular** `STATE.citySlugRe`, `STATE.branchSlugRe`
and `STATE.coverageSlugRe`. The `ma` entry defines none of them. `suffixOf()` would throw on
`STATE.citySlugRe.exec` at the first page. Only `geocode.mjs`, which reads the plural array, is
Massachusetts-ready. **`agent.mjs --state ma` fails today.** This was found by reading the two files
side by side for this document.

---

# 12. City Resolution

**Status: CURRENT for Minnesota's two slug forms. VERIFIED that those two forms are not enough.**

## How the agent resolves a city

```js
// agent.mjs · MAP stage
const suffixOf = (slug) => STATE.citySlugRe.exec(slug)?.[2] ?? null;
const cityName = (page) =>
  new RegExp(`in (.*), ${STATE.stateCode}$`).exec(page.wpTitle ?? '')?.[1]
  ?? titleCaseSlug(suffixOf(page.wpSlug));
```

City identity is the slug suffix between `-in-` and `-mn`. The display name comes from the title
when it is well formed ("… in Anoka, MN"), otherwise from the title-cased suffix, because many
legacy titles read `"City,MN"` with no space.

## Minnesota uses eight slug forms; the agent recognises two

Measured against WordPress and recorded in the whole-site reconciliation §5.2:

| Shape | Pages | Recognised by the agent? |
|---|---|---|
| `chimney-sweep-fireplace-in-{city}-mn` / `chimney-sweep-repair-in-{city}-mn` | 137 | **yes** |
| `chimney-sweep-repair-in-{city}-mn-<N>` | 55 | no, numeric suffix |
| `chimney-sweep-{city}-mn` | 33 | no |
| `chimney-sweep-{city}-in-mn` | 21 | no |
| `chimney-sweep-repair-{city}-mn` | 13 | no |
| `{city}-chimney-sweep-repair-in-mn` | 3 | no |
| `{city}-chimney-sweep-repair-mn` | 3 | no |
| earlier-URL redirect rows | 2 | yes |

**267 city pages exist; the sealed baseline sees 137.** The other 130 are handled as follows in the
sealed baseline, measured for this document by joining the whole-site city set against
`mn-url-audit.json`:

| Sealed handling of the 267 | Count |
|---|---|
| PAGE | 109 |
| REVIEW | 25 |
| **LEGACY_NOT_MIGRATED** | **68** |
| REDIRECT | 59 |
| GONE | 6 |

So 68 real Minnesota city pages are classified as unresolved legacy URLs. The 59 in the redirect map
and 6 in the gone map already carry a business decision. This is a finding about the builder, not a
correction to the sealed baseline, which stays at 20,479 / 2,864 / 6,803 / 10,812 by agreement.

## Massachusetts

Four slug shapes among 26 hand-authored pages, 17 of which have **no state suffix**. Eight ordered
regexes in `states.mjs` with a comment that the order is load-bearing. Not executable by the agent
(§11).

## City inventory

The 150 Minnesota cities are 134 with a WordPress page plus 16 that appear only in service URLs and
the business branch list. The 16 get a `cities` row with `NO_SOURCE_PAGE` and **no page row**, so
their live service URLs keep resolving and no city page is fabricated. Site-wide the audit resolved
**2,920 distinct (state, city) pairs**; 6,043 URLs could not be resolved to a city, mostly the
`{service}-in-{state}` family of 9,018 slugs that name a state but no city.

## Branch resolution

`branches.json` is a business record with 105 offices, 14 in Minnesota, carrying street, zip and phone
but **no coordinates**. The agent matches a branch page's `_job_location` to a branch record by
street number prefix **and** the record's own zip appearing in the location string
(`agent.mjs` MAP branches). Coordinates come from the branch page's WordPress `geolocation_*` meta.
14 of 14 match. The original zip regex `\b\d{5}\b` matched the street number in "14870 Granada Ave"
and failed 3 of 14; the fix is documented in the postmortem.

Coverage cities get **the nearest branch by great-circle distance**, always flagged
`nearest_branch_unverified` because the business has not confirmed any territory. Cities beyond
`farFromBranchKm` (88) get `geocode_unverified`. Cities with no coordinate get **no branch and
`no_serving_branch`**; nothing is guessed.

## Geocoding

Two implementations coexist, and the agent uses the wrong one. RISK.

| | `agent.mjs` (what runs) | `geocode.mjs` (what should run) |
|---|---|---|
| Cache file | `data/seed/mn-geocode.json`, **hard-coded at line 47 regardless of `--state`** | `data/seed/<state>-geocode.json` |
| Key | Bare city name, `"Lexington"` | State-qualified, `"MA:lexington"` |
| Guard | none | Throws if the cache belongs to another state |
| Rejection | Config list `rejectedGeocodes` by name | Five rules: no result, wrong state, not a populated place, ambiguous, error |
| Rate limit | n/a, reads cache | 1,100 ms between Nominatim calls |
| Formats | flat map | `{schema, state, entries}` |

The two cache formats are incompatible. `mn-geocode.json` already holds `"Lexington"` with Anoka
County, Minnesota coordinates; Massachusetts also has a Lexington, plus Andover, Carver, Hanover,
Northfield and Plymouth. Running the agent for Massachusetts would silently hand those towns
Minnesota coordinates. `ma-geocode.json` already holds 236 correctly keyed entries that the agent
cannot read. **Remediation required: wire `agent.mjs` to `geocode.mjs` and migrate the Minnesota
cache to the qualified format.**

Minnesota results: 132 of 134 migrated cities have coordinates (118 geocoder, 14 WordPress). Two
have none: St. Anthony (rejected, the geocoder returned Stearns County) and Farmingon (the cache is
keyed by the correctly spelled "Farmington" and the page's name is the misspelled "Farmingon", so the
lookup misses data that is already on disk). Becker and Grant are also in the reject list but are
no-source cities outside the 134.

---

# 13. Service Resolution

**Status: the most important section for planning. Mixed CURRENT, VERIFIED and BUSINESS DECISION.**

## The application catalogue

`data/seed/services.ts` holds **8 categories and 92 services**. Its first line reads:

```
// Generated from the Spokane design mock by scripts in the migration repo; city-specific words are slots.
```

**It is a frontend catalogue derived from one page of a visual design.** It is not a WordPress
catalogue, because WordPress has none:

| Looked for | Found |
|---|---|
| Service post type | Not present. The only content post type at scale is `job_listing` |
| Service taxonomy | Not present |
| `job_listing_category` | Present, but it is a **location** taxonomy: all 28 terms are states and showrooms |
| `job_listing_type` | The 5 default WP Job Manager terms, every count 0 |
| Service metadata | Not present |
| Menus | Name services loosely: Sweep, Repair, Masonry, Liners, Flashing |
| Marketing pages under `/page/` | 84 published, roughly 40 service-related, unstructured, **not 92** |

## What WordPress actually publishes

The whole-site audit derived services from the post **title**, not the slug, because titles are
clean prose (`{Service} in {City}, {ST}`) and slugs are not. Two title artefacts are stripped first:
an SEO keyword tail after an en-dash, and a trailing `(product)` marker.

```
847 distinct raw slug phrases  →  230 distinct title phrases  →  208 canonical services
```

Against the 92-item catalogue:

| Match status | Services | URLs | Decision owner |
|---|---|---|---|
| `EXACT_MATCH` | 94 | 111,476 | none |
| `DETERMINISTIC_ALIAS` | 5 | 5,442 | none |
| `POSSIBLE_MATCH` | 30 | 32,411 | **BUSINESS** |
| `NEW_SERVICE_CANDIDATE` | 72 | 72,809 | **BUSINESS** |
| `CITY_PAGE_PHRASE` | 5 | 5,342 | none, not a service |
| `UNRESOLVED` | 2 | 2,104 | engineering, then business |

94 plus 5 is the **99 services that currently map**, covering 116,918 URLs. (94 exceeds 92 because
two WordPress phrases, "Chimney Inspections" and "Chimney Rebuilds", map onto keys already counted.)

## `raw_service_phrase` versus `canonical_service_id`

| | Meaning | Example |
|---|---|---|
| `raw_service_phrase` | What the slug or title literally says, after city and state are removed | `fireplace-flue-installation`, `chimney-caps-repair`, `gas-fireplace-repair-service` |
| `title_service_phrase` | The same, derived from the title | `Fireplace Flue Installation` |
| `canonical_service_id` | A row in the audit's `services` table, or **NULL** | `services.service_id` |
| `application_catalogue_key` | One of the 92, or NULL | `fireplace-installation` |

A phrase can have a canonical service without an application key. That is what
`NEW_SERVICE_CANDIDATE` means.

## The matching algorithm, and whether substring matching is used

Five rules, applied in order, from `WHOLE_SITE_LINKABILITY_REPORT.md` §4 and confirmed against the
`services` table evidence column:

1. **`EXACT_MATCH`** — the normalised phrase equals a catalogue key.
2. **`DETERMINISTIC_ALIAS`** — identical token multiset in a different word order, or one of **five
   explicit synonym pairs**. The five: Chimney Masonry Repair, Spark Arrestor Installation, Smoke
   Chamber Cleaning, Chimney Inspection Level 3, Smoke Chamber Repair.
3. **`POSSIBLE_MATCH`** — differs from a catalogue key by exactly one qualifier token. Recorded with
   `canonical_service_id = NULL`. **Never auto-mapped.**
4. **`NEW_SERVICE_CANDIDATE`** — a well-formed service name with no catalogue counterpart.
5. **`UNRESOLVED`** — no well-formed phrase derivable (Heatshield, Liners).

**Substring and superset matching are not used.** Verified two ways. The report states it. And the
`services` table evidence for every `POSSIBLE_MATCH` row reads `differs from "<key>" by the single
token "<word>" — not auto-mapped`.

## Fireplace Flue Installation

```
canonical_service_name      Fireplace Flue Installation
url_count                   1,012
match_status                POSSIBLE_MATCH
application_catalogue_key   (NULL)
evidence                    differs from "fireplace-installation" by the single token "flue" — not auto-mapped
```

`Fireplace Flue Installation` ≠ `Fireplace Installation`. Installing a flue is not installing a
fireplace. The extra token changes the service. A superset rule would have folded 1,012 URLs into the
wrong catalogue entry. The same table shows `Gas Fireplace Installation` (1,118) and `Electric
Fireplace Installation` (1,090) held in the same way, and `Chimney Flue Installation` (1,027) as a
new-service candidate because no catalogue key shares its tokens.

**A worked warning from this repository's own history.** The Minnesota slug-based catalogue audit,
`scripts/audit/mn-service-catalogue-audit.mjs`, had a first draft that treated a single superset as
a match and produced exactly `fireplace-flue-installation → fireplace-installation`. It was corrected
to `REVIEW` before the report was written. The rule is now in memory: **never match services by
substring or superset**.

## What is automatic and what requires approval

| | Automatic | Needs approval |
|---|---|---|
| Exact key match | yes | |
| Token-multiset reorder | yes | |
| The five recorded synonym pairs | yes | |
| One-token difference | | **yes**, per phrase, 30 decisions |
| No counterpart | | **yes**, add or retire, 72 decisions |
| Slug is an editing note (985 URLs) | fixable from the title | no |

## Two Minnesota audits used different methods — stated plainly

`scripts/audit/mn-service-catalogue-audit.mjs` works from **slugs** and finds 187 distinct phrases in
the 9,568 unresolved Minnesota URLs: 41 mapped (761 URLs), 48 review (2,471), 98 unmapped (6,336).
The whole-site audit works from **titles** and classifies Minnesota as 2,853 linkable, 8,726
service-review, 645 no-destination, 22 parser-fix. They agree on the direction and disagree on the
counts because they measure different things. The title-based method is the one memory records as
correct, and it is the one to carry forward.

---

# 14. Legacy URL Inventory

**Status: VERIFIED for the whole site by audit. CURRENT code produces it only for Minnesota.**

## The universe formula

Reverse-engineered from `scripts/build-mn-seed.mjs` and confirmed by reproducing Minnesota's 20,479
exactly:

```
universe(state) = live_published_job_listing_slugs(state)
               ∪ redirects.json sources(state)
               ∪ gone.json entries(state)
               ∪ wp_postmeta._yoast_post_redirect_info origins(state)
```

The fourth set is easy to miss and is worth exactly 2 URLs in Minnesota. Without it, a reconciliation
is off by 2 and looks like a bug.

## Why 262,535 and 229,617 are different numbers

| Component | URLs |
|---|---|
| Live WordPress only | 174,644 |
| Live WordPress + redirect map | 49,075 |
| Gone map only, no WordPress source | 30,644 |
| Gone map + live WordPress | 5,894 |
| Redirect map only | 1,646 |
| Gone map + WordPress earlier URL | 219 |
| Redirect map + WordPress earlier URL | 210 |
| WordPress earlier URL only | 199 |
| Three-way overlaps | 4 |
| **Total legacy URL records** | **262,535** |

**229,621 published `job_listing` posts occupy 229,617 distinct URLs** (four slugs are used by two
Oregon posts each). The other **32,918 records exist only in the business fate maps**, and **30,635
of those appear nowhere in `wp_posts`** — not as drafts, not as another post type. They belong in
scope because they are URLs the business decided about, but they cannot be verified against any
source content.

## Slug patterns the inventory must handle

| Pattern | Example | Handled by |
|---|---|---|
| Standard | `{service}-in-{city}-{st}` | agent, builder, audit |
| City first | `{city}-{service}-in-{st}` | audit only |
| Missing `-in-` | `{service}-{city}-{st}` | audit only |
| Misplaced `-in-` | `{service}-{city}-in-{st}` | audit only |
| Duplicate suffix | `…-{st}-2` (9,018 site-wide) | audit only |
| No state token | `{city}-chimney-sweep` (130 site-wide) | audit, from title |
| State but no city | `{service}-in-{st}` (9,018 site-wide) | unresolvable |
| Third city-page form | `chimney-sweep-fireplace-services-in-{city}-{st}` (43 live: IL 15, OH 11, GA 10, WI 5, MA 2; **0 in MN**) | `ma` config only |
| Editing notes as slugs | 972 slugs over 90 characters | audit, `PARSER_FIX` from title |

Plurals (`chimney-caps-repair`), suffixes (`-service`, `-services`, `-near-me`) and the `-2` form all
cause a catalogue service to go unrecognised in Minnesota; 761 URLs fail on wording alone.

## Where the inventory comes from today, and the gap

`build-mn-seed.mjs` reads `../Chimcare-Migration/output/job_listings.jsonl`, a 2.4 GB export that
mangles `post_content`, filters to `-mn` slugs, and applies the three fate maps keyed by **last path
segment only**. It is Minnesota-specific. **The migration agent cannot produce a URL inventory for
any state.** The whole-site audit produced one for all 22 states, and its generating script is
missing (§3). Closing this gap is a P0 item.

---

# 15. URL Classification

**Status: CURRENT in three places with three vocabularies. This section reconciles them.**

## The runtime dispatcher — what actually happens to a request

`app/location/[slug]/page.tsx`, `load(slug)`, in order:

```js
if (!page)                                        → 404
if (page.fate === 'redirect' && page.redirectTo)  → 308 permanentRedirect(redirectTo)
if (page.status !== 'published' || !page.cityId)  → 404
if (page.kind === 'city')   { if (!gate.ok) → 404 (withheld, console.warn); else → CityPage }
if (page.kind === 'service' && page.serviceId)    → ServicePage      (no gate on service pages)
otherwise                                         → 404             ← kind='legacy' lands here
```

Only `city` and `service` render. There is no branch for `kind='legacy'`, so every such row is a 404.
The planned `<LegacyShell>` (architecture §2) was never built.

## The three classification vocabularies

| Layer | Terms | Source |
|---|---|---|
| Dataset `fate` | `publish_verbatim`, `regenerate`, `redirect`, `gone` | `build-mn-seed.mjs`, from keep/redirect/gone maps |
| Minnesota URL audit `handling` | `PAGE`, `SERVICE_PAGE`, `COVERAGE_ONLY`, `REVIEW`, `REDIRECT`, `GONE`, `LEGACY_NOT_MIGRATED` | `scripts/audit/mn-url-audit.mjs` |
| Whole-site `linkability_status` | `LINKABLE`, `PARSER_FIX`, `SERVICE_REVIEW`, `CITY_REVIEW`, `OTHER_REVIEW`, `NO_DESTINATION`, `REDIRECT`, `GONE`, `NO_SOURCE_PAGE` | `whole-site-audit.sqlite` |

The brief's list (`PAGE`, `PARSER_FIX`, `REDIRECT`, `GONE`, `REVIEW`, `NO_SOURCE`, `NO_DESTINATION`,
`SERVICE_REVIEW`, `CITY_REVIEW`, `OTHER`) is the whole-site vocabulary plus `PAGE`. The rules follow.

## The whole-site classification rules, with counts

From `legacy_url_classification.reason`, grouped, and the reconciliation's stated precedence:

| Order | Rule | Result | URLs |
|---|---|---|---|
| 1 | City page that duplicates another city page for the same city | `REDIRECT` 308 | 1,666 |
| 2 | City page passes the publication gate | `LINKABLE` 200 | 1,051 |
| 2 | City page fails the gate | `OTHER_REVIEW` 404 | 1,317 |
| 3 | In `gone.json` | `GONE` 404 | 36,503 |
| 4 | In `redirects.json` | `REDIRECT` 308 | 49,742 |
| 5 | WordPress recorded an earlier slug | `REDIRECT` 308 | 199 |
| 6 | State, city, service and destination all resolve | `LINKABLE` 200 | 86,530 |
| 6 | Resolves, but the service is a new candidate | `SERVICE_REVIEW` | 51,450 |
| 6 | Resolves, but the service is a one-token possible match | `SERVICE_REVIEW` | ~22,000 across 30 phrases |
| 6 | No service phrase derivable | `SERVICE_REVIEW` | 1,566 |
| 6 | State, city, service resolve; **no approved destination** | `NO_DESTINATION` | 7,708 |
| 6 | Slug is an editing note; title is clean | `PARSER_FIX` | 894 |
| 6 | State unresolvable | `PARSER_FIX` | 2 |
| 6 | City unresolvable, nothing more severe | `CITY_REVIEW` | 325 |
| 6 | City-page phrase, not a service | `OTHER_REVIEW` | 1,493 |
| 7 | `NO_SOURCE_PAGE` | defined, **empty** | 0 |

Every URL carries exactly one status and one `reason`. **No URL is `UNKNOWN`.**

For each status, the evidence, confidence, destination and approval requirement:

| Status | Evidence column | Confidence | Destination | Approval? |
|---|---|---|---|---|
| `LINKABLE` | `reason` + `service_match_evidence` | high | `SELF`, 200 | no |
| `REDIRECT` | fate-map membership | high that the rule exists; **61.6% of targets 404** | `REDIRECT_TARGET`, 308 | already given |
| `GONE` | `gone.json` membership | high | `NONE`, 404 | already given |
| `PARSER_FIX` | title parses cleanly | high | none yet | **no**, engineering |
| `CITY_REVIEW` | no city token | medium | none | engineering, then human |
| `SERVICE_REVIEW` | `service_match_evidence` names the one differing token or the missing counterpart | high that it is unresolved | none | **yes**, business |
| `NO_DESTINATION` | full chain resolves | high | none | **yes**, business |
| `OTHER_REVIEW` | gate blockers or city-page phrase | high | none | content or business |

## The rule that matters most

**Parsing a URL does not decide its destination.** The parser can establish

```
state = MN · city = Monticello · service = Pellet Stove Repair
```

with full confidence, and the URL is still `SERVICE_REVIEW`, not `LINKABLE`, because "Pellet Stove
Repair" is a `NEW_SERVICE_CANDIDATE` with no catalogue counterpart. It must **not** be sent to the
Monticello city page automatically. That is a destination decision, and §17 sets out who takes it.
The 7,708 `NO_DESTINATION` URLs are the sharpest example: state, city and catalogue service all
resolve, and they still have nowhere approved to go.

---

# 16. Content-Quality Audit

**Status: NOT IMPLEMENTED YET.**

No content-quality scoring exists in `scripts/`, `lib/` or `app/`. Repository-wide search for word
counts, similarity, Jaccard, Levenshtein, duplicate-content detection or any `CONTENT_*` category
returns nothing except `editDistance()` in `scripts/audit/ma-cards.mjs`, which by its own comment is
used only to flag suspected slug typos and never to score content.

**Therefore no page in this repository has been classified as thin, duplicate, strong or weak.** The
9,568 unresolved Minnesota URLs are not "thin content"; they are unclassified for quality. Any such
label would be an invention.

## What a content-quality audit should measure — PLANNED

| Dimension | Source | Notes |
|---|---|---|
| Word count | `post_content` after `cleanMarkup` | |
| Unique content | normalised text hash | exact duplicates |
| Similarity clusters | token shingles across pages of the same service | near duplicates |
| City specificity | count of the city name and its areas in the body | |
| Service specificity | count of the service phrase in the body | |
| Headings | `<h2>` inventory | structure |
| FAQs | `faqsFrom` count | already extracted |
| Images | `_thumbnail_id` plus inline `<img>` | inline not yet extracted |
| Internal links | `href` inventory | |
| Structured data | present / absent | Schema Pro global only |
| SEO metadata | Yoast fields | measured, mostly absent |
| Traffic | `keep-pages.json` clicks and `imp90` | business data, unverified against GSC |
| Impressions | `imp90` | same |
| Backlinks | **no source in the repository** | |
| Conversions | **no source in the repository** | |

## Proposed categories — PLANNED, not applied

| Category | Definition |
|---|---|
| `CONTENT_STRONG` | unique, city- and service-specific, above a word threshold, with FAQs and an image |
| `CONTENT_NORMAL` | unique and specific, below the strong thresholds |
| `CONTENT_DUPLICATE` | exact or near-duplicate of another page |
| `CONTENT_LOW_INFORMATION` | template with only the city and service swapped |
| `CONTENT_MISSING` | no body, or body that fails to parse |
| `CONTENT_REVIEW` | any signal a person must weigh |

These would be **DERIVED** values in the proposed `content_quality_audit` table (§18) and would feed
destination decisions, never replace them.

---

# 17. Destination Logic

**Status: PLANNED, informed by measured data. Nothing below is implemented as a system.**

## Why not the obvious approaches

| Approach | Why not |
|---|---|
| Create 230,000 pages | ~105,000 name services the application does not model; the rest would be one-variable templates. Google's helpful-content guidance targets exactly that pattern. The measured traffic across Minnesota's 9,568 unresolved URLs is **932 clicks a year** |
| 230,000 `if` statements | Unmaintainable and untestable. Destinations must be data, generated from the audited inventory |
| Redirect everything to the homepage | Google treats mass unrelated redirects to one page as a soft 404 and passes no value |
| Redirect everything to the city page | 6,043 URLs cannot resolve a city; 1,416 in Minnesota alone. And it hides the service decision |
| 404 everything | Loses 932 Minnesota clicks and every inbound link, and is the accidental state today |
| Auto-delete low-traffic pages | Traffic data is unverified business input. Deletion is a business decision |

## FIX → FORWARD → RETIRE

1. **Fix** what is a code defect: slug wording, duplicate suffixes, city-first shapes, editing-note
   slugs. The whole-site audit puts this at **1,221 URLs, 0.7 percent** of the non-linkable set.
2. **Forward** what has an approved destination.
3. **Retire** what has none and never will.

## Refined into six destination types

| Type | Meaning | Who decides | Implemented? |
|---|---|---|---|
| `REDIRECT_EXACT` | The URL is itself the page. No redirect. Today's `LINKABLE`/`PAGE`/`SERVICE_PAGE` | nobody | CURRENT |
| `REDIRECT_CITY` | Service URL forwarded to its city page, **only where a rule permits it** | business, once per service | PLANNED |
| `REDIRECT_OTHER_VERIFIED` | An approved map entry whose target is confirmed to return 200 | business, already | CURRENT for MN's 6,735 clean redirects |
| `LEGACY_REDIRECT` | A map entry whose target is **not** confirmed | business, must re-decide | RISK: 31,799 site-wide |
| `NO_DESTINATION` | Chain resolves, no approved rule | business | 7,708 waiting |
| `GONE` | Retired deliberately | business, already | CURRENT, 36,503 |

`EXACT PAGE → EXACT REDIRECT → VERIFIED CITY REDIRECT → REVIEW → GONE` is the precedence. A URL takes
the first that applies and never falls through to a guess.

## Every redirect must be generated from the audited inventory

Because a redirect written by hand cannot be validated for loops, chains, cross-state targets or a
404 destination, and the audit has already found all four in the business map. The generation path
is `legacy_url_classification` → `legacy_redirect_map` (§18) → validated graph → deploy.

---

# 18. Redirect Architecture

**Status: CURRENT in-app for Minnesota; the edge layer is PLANNED.**

## What runs today

Redirects are rows. `pages.fate = 'redirect'` with `pages.redirect_to` as free text. The dispatcher
calls `permanentRedirect(redirect_to)`, which is a 308. A comment in the route reads: "edge Worker
answers 301 in production; this is the in-app fallback". There is no `next.config` `redirects()`
entry, and the architecture explicitly rejects one ("tens of thousands of entries evaluated per
request on the origin").

## What is planned

```
WordPress fate maps + wp_postmeta earlier URLs
    → audit database (legacy_url_inventory, legacy_url_classification)
        → approved redirect map (legacy_redirect_map, versioned)
            → Cloudflare Worker + KV, exact-path lookup: 301 / 410 / miss
                → Next.js origin only on miss
```

| Component | Status | Evidence |
|---|---|---|
| Fate maps as input | CURRENT | `build-mn-seed.mjs:201–203` |
| Audit tables | CURRENT in sqlite for the 2026-09-07 run; **not reproducible** | §3 |
| Approved redirect map table | PLANNED | not in any schema |
| Cloudflare Worker | PLANNED | no code |
| KV publish | PLANNED | no code |
| Edge 410 for gone | PLANNED | today 404 in app |

## How 230,000 mappings are handled without application code

As data. KV is a key-value store with exact-path lookup; 262,535 entries is small for it. The
application holds zero redirect logic beyond the row-driven fallback. Publishing is a script that
reads the approved map and writes KV, versioned by run ID.

## Validation the map must pass before publish

| Property | Checked today? | Where |
|---|---|---|
| Exact source path, exact destination path | yes | audit records |
| Status is 301 (planned) / 308 (today) | today only | dispatcher |
| No loops | audit only | 7 site-wide, 1 in MN |
| No chains | audit only | 767 site-wide, 1 in MN |
| No self-redirects | audit only | 6 site-wide, 1 in MN |
| No cross-state destinations | audit and `card-resolution.ts` | 72 site-wide, 3 in MN, all to one Oregon page |
| Destination returns 200 | audit only | **31,799 fail** |
| Versioning | **no** | PLANNED |
| Rollback | **no** | PLANNED: republish the previous KV version; WordPress stays as origin for 30 days |

**No automated redirect-graph test exists in the repository.** The findings above came from two
manual audits. RISK, and a P0 item.

---

# 19. Database and Audit Architecture

## The production schema — CURRENT, VERIFIED

Postgres schema `site`, 11 tables, defined in `lib/db/schema.ts`, applied by three generated
migrations. Constraints from the SQL: 11 primary keys, **12 foreign keys**, 9 unique constraints,
86 NOT NULL columns.

| Table | Rows (MN) | Purpose | FKs | Source vs derived | Written by |
|---|---|---|---|---|---|
| `states` | 1 | hub copy, climate notes, editorial | — | pilot copy, not WordPress | seed |
| `regions` | 2 | pricing regions | — | business | seed |
| `branches` | 14 | offices | `state_id`, `region_id` | business record + WordPress coords | seed |
| `cities` | 150 | the migration's core row | `state_id` NOT NULL, `branch_id`, `region_id` | `source_status`, `review_flags`, `legacy_pricing_copy`, `legacy_post_id`, `legacy_thumbnail_id` | seed |
| `service_categories` | 8 | catalogue groups | — | design mock | seed |
| `services` | 92 | the catalogue | `category_id` | design mock | seed |
| `pages` | 20,479 | **the dispatcher table** | `city_id`, `service_id` | fate/tier from maps | seed |
| `faqs` | 642 | city FAQs | **none** — `scope_id` is polymorphic | source | seed |
| `prices` | 6 | cents per region and key | `region_id` | business | seed |
| `masters` | 13 | shared copy blocks | — | design mock | seed |
| `bookings` | 0 | leads | `city_id`, `branch_id`, `service_id` | runtime | API |

Live counts measured against PGlite for this document.

Three structural gaps, each VERIFIED by inspecting the SQL:

- **`pages` has no `state_id`.** The planned schema in `docs/architecture.md` §6 has `state_id`,
  `branch_id`, `canonical_url`, `gsc_impressions_12m` and `content_version` on `pages`; the real one
  has none of them. 2,657 rows have no `city_id` and therefore no path to a state.
- **`faqs.scope_id` has no foreign key.** Enforced in code only.
- **`pages.redirect_to` is unconstrained text.** A redirect with no target, or a target that does not
  exist, is representable. That is how the loop and the cross-state redirects went undetected.

Also: `lib/db/seed.ts` inserts in batches of 500 with **no transaction wrapper**; a failure midway
leaves a partial database with no marker. And `reset()` does not truncate `site.bookings`.

## The audit layer — mixed CURRENT (sqlite) and PROPOSED

`data/audits/whole-site-audit.sqlite` holds five tables from run `wsa-20260907T165001`. The
reconciliation report describes its `legacy_url_inventory` as immutable.

| Table | Status | Key fields | FKs | Purpose | Immutable? | Writes | Reads |
|---|---|---|---|---|---|---|---|
| `states` | **CURRENT** (sqlite) | `state_code` PK, `url_count`, `live_url_count` | — | 22 states | yes | audit run | reports |
| `cities` | **CURRENT** | `city_id`, `state_code`, `city_norm`, `city_raw`, `url_count`, `UNIQUE(state_code, city_norm)` | `state_code` | 2,920 pairs | yes | audit run | reports |
| `services` | **CURRENT** | `service_id`, `canonical_service_name` UNIQUE, `match_status`, `application_catalogue_key`, `evidence`, `url_count`, `variant_count`, `source_variants` | — | 208 canonical services | yes | audit run | reports, business |
| `legacy_url_inventory` | **CURRENT** | `url_id`, `audit_run_id`, `legacy_url` UNIQUE, `normalized_path`, `wp_post_id`, `post_type`, `post_status`, `state_code`, `city_id`, `raw_service_phrase`, `title_service_phrase`, `page_kind`, `url_pattern`, `source_exists`, `state_source` | `state_code`, `city_id` | 262,535 URLs | **yes** | audit run | everything |
| `legacy_url_classification` | **CURRENT** | `url_id` PK→inventory, `audit_run_id`, `canonical_service_id`, `service_match_status`, `service_match_evidence`, `destination_url`, `destination_type`, `expected_http_status`, `linkability_status`, `problem_class`, `reason`, `flags` | `url_id`, `canonical_service_id` | one verdict per URL | per run | audit run | destination logic |
| `legacy_redirect_map` | **PROPOSED** | source path, destination path, status, source rule, version, approved_by, validated_at | → inventory | the approved, validated map | versioned | approval step | KV publisher |
| `service_resolution_candidates` | **PROPOSED** | `canonical_service_id`, candidate key, differing token, url_count | → services | the 30 + 72 pending | no | audit | business |
| `business_service_decisions` | **PROPOSED** | `canonical_service_id`, decision (`ADD`, `MAP_TO`, `RETIRE`), decided_by, decided_at | → services | the answers | append-only | business | classification re-run |
| `content_quality_audit` | **PROPOSED** | `url_id`, metrics, category | → inventory | §16 | per run | audit | destination logic |
| `redirect_validation` | **PROPOSED** | map version, loops, chains, self, cross-state, non-200 targets, pass/fail | → redirect map | the gate before publish | per version | validator | deploy |

The planned production schema also names `page_sections`, `page_content`, `media`, `redirects`,
`url_checks`, `gsc_daily` and `pricing_sheets` (architecture §6). **None exists.** PLANNED.

---

# 20. Migration Agent

**Status: CURRENT, VERIFIED for Minnesota. Not executable for Massachusetts.**

| | |
|---|---|
| Entry point | `node scripts/migrate/agent.mjs --state <key> [--apply] [--base URL] [--regress <pilot.json>] [--report out.json] [--no-render] [--host] [--user] [--db]` |
| Configuration | `STATES[key]` from `states.mjs`; DB from flags with local defaults |
| Dry run | **The default.** `DRY = !APPLY`. The `--dry-run` flag is accepted and **inert** |
| Extraction | `source.mjs`, §5 |
| Transformation | `source.mjs` extractors, §7 |
| Validation | `validate.mjs`, 15 checks, §21 |
| Output | `data/seed/<key>.migration.json`, `data/seed/<key>.ledger.json`, `public/uploads/…`; optional `--report` |
| Idempotency | three checksums per page keyed by WordPress post ID, §22 |
| Flags | 16 codes, three categories, `lib/migration/flags.mjs` |
| Provenance | every city record has `source{}`, `derived{}`, `flags[]`, `checksums{}`; the dataset carries a four-line provenance legend |

## Why one agent

Because the workflow is the same for every state and the differences are facts about the source:
which slugs are city pages, which heading wording the extractor should look for, which geocodes are
known to be wrong, which offices sit inside coverage cities. Those belong in configuration. One agent
means one gate, one validator, one ledger format and one regression, so a change is proven against
Minnesota before it touches anyone else.

## Generic logic versus state configuration, as actually divided

| Generic (`agent.mjs`, `source.mjs`, `validate.mjs`) | State config (`states.mjs`) |
|---|---|
| The three queries | `cityPagePatterns` (SQL LIKE) |
| Every extractor | `citySlugRe`, `branchSlugRe`, `coverageSlugRe` |
| The gate's five conditions | `minAreas`, `minLocalLines` thresholds |
| Branch matching by street number and zip | `officeConflicts` |
| Nearest-branch computation | `farFromBranchKm` |
| Idempotency, ledger, report | `rejectedGeocodes`, `slugTypos`, `excludeSuffixes` |
| The 15 checks | `serviceCatalogueSize`, `nationalPhone` |
| Markup defect detection | `markupDefectRe`, `foreignStateRe` |
| — | `localSpecifics` extractor options, `markdownSource` |

Two things are **generic in the wrong place**, and both are RISKS already documented:
`GEOCACHE` hard-coded to `mn-geocode.json` at `agent.mjs:47`, and `data/seed/minnesota.generated.json`
read unconditionally in the RENDER stage for `expectedServiceLinks`. And the `ma` config uses field
names the agent does not read (§11).

---

# 21. Validation

**Status: CURRENT, VERIFIED 134/134 on every check, re-run for this document.**

The 15 checks in `scripts/migrate/validate.mjs`, what each asserts, and what it misses:

| # | Check | Asserts | Misses |
|---|---|---|---|
| 1 | `template` | 200 and `tpl-city` present. If not 200, all others fail with "page did not render" | correctness of rendering |
| 2 | `legacy_url` | Public: the slashless URL returns 301 or 308. Preview: pass by definition | the other 20,345 URLs |
| 3 | `title_h1` | H1 is exactly `Chimney Sweep & Fireplace Services in {name}, {ST}`; public title adds ` - Chimcare` | whether the body belongs to that city |
| 4 | `faq` | ≥1 FAQ; every source question verbatim in a `faq-q` button; first 120 chars of every answer in the text | FAQs the extractor did not find |
| 5 | `hero_path` | `/${imageKey}` in the HTML | whether it loads |
| 6 | `hero_file` | file exists; SHA-256 matches; byte count matches; basename matches; alt rendered | right image on the right page |
| 7 | `seo_meta` | canonical equals site URL + path; description present and equal to source where source has one; no `noindex` (public) / `noindex` present (preview) | OG, Twitter |
| 8 | `local_seo` | `tel:` for branch or national phone; street shown only on branch pages | whether the branch assignment is correct |
| 9 | `structured_data` | all JSON-LD parses; types include `WebPage`, `BreadcrumbList`, business or `Service`; no `AggregateRating`; no `"Review"`; `areaServed` names the city | semantic values |
| 10 | `breadcrumbs` | `Home > Locations > {State} > {City}` with correct hub items | — |
| 11 | `services` | exactly `serviceCatalogueSize` (92) `svc-card` articles; distinct service links equal expected published count | whether each links to the right service |
| 12 | `links` | every internal href resolves below 400 | redirect loops and chains; cross-state targets |
| 13 | `cta_contact` | every price string present; `id="booking"`; phone | — |
| 14 | `chrome` | header, footer, state hub link, national tel, "Since 1989" | — |
| 15 | `no_rewrite` | rendered areas list equals source list plus "Surrounding areas", **same items, same order** | fields not in the areas list |

Plus `scripts/validate-render.mjs` asserts the 16 no-source cities have no public URL, no preview and
no page row: 16/16.

## What no check covers — RISK

Cross-state contamination. Dataset-to-database reconciliation. The state hub itself (the card-image
bug shipped with 15/15 green). Visual rendering. Image reachability on city pages. Redirect graph
behaviour. The 20,345 non-city URLs. Live WordPress reachability.

## The harness is duplicated — RISK

`CLAUDE.md` states `validate.mjs` is "one implementation shared with `scripts/validate-render.mjs`".
**It is not.** `validate-render.mjs` has zero imports and carries its own copy. Only the agent imports
the shared module. Both check lists are identical today; a change to one silently diverges from the
other.

## Test infrastructure

There is **no test runner**. No `vitest`, `jest` or Playwright configuration. The only test file is
`scripts/test/card-links.mjs`, 382 lines of unit fixtures for `resolveCityCard` (redirect chain, loop,
cross-state, unpublished, no-source) plus data invariants over Massachusetts cards and the geocode
cache. `check-pages.mjs` writes a real booking row as part of its run.

---

# 22. Idempotency

**Status: CURRENT, VERIFIED by two byte-identical apply runs.**

Three checksums per city, minted in the MAP stage:

```js
source:  sha256(post_content + '\0' + metaTitle + '\0' + metaDescription + '\0' + thumbnailId)
content: hashJson({ neighborhoods, localSpecifics, faqs, hero:{attachmentId, sha256, alt}, metaDescription, name })
media:   { [attachmentId]: sha256 }
```

`source` fingerprints WordPress. `content` fingerprints what the agent extracted, with keys sorted
recursively so ordering cannot change a digest. The NUL separator prevents a field value from
impersonating a boundary.

The comparison, keyed by **WordPress post ID** so a renamed page is a URL change rather than a new
row: `unchanged` requires both `source` and `content` to match; `media`, `seo` and `url` differences
are reported separately. A page absent from the previous ledger is skipped and counts nowhere.

Media reuse is structural: `ensureAsset` checks the disk **before** any network call, so a second run
downloads nothing. Perturbation testing corrupted the agent's own ledger for two pages and the agent
correctly reported one change in each of source, content, media, SEO and URL.

Nondeterminism that remains: timestamps (excluded from diffs), the first geocoder call for a city
(cached thereafter), and live WordPress drift between runs, for which there is no immutable snapshot.

---

# 23. Provenance

**Status: CURRENT, VERIFIED. Never mixed.**

| Category | Meaning | Examples |
|---|---|---|
| `SOURCE` | verbatim from `wp_posts`/`wp_postmeta`, plus tier and clicks from the fate maps | title, slug, areas, FAQs, hero, meta description |
| `DERIVED` | computed by the agent, or a computation that failed | coordinates, branch, distance, checksums, gate verdict; flags `geocode_rejected`, `geocode_unverified`, `no_serving_branch` |
| `BUSINESS_UNVERIFIED` | a decision the business owns | `nearest_branch_unverified`, `office_location_conflict`, `legacy_pricing_conflict`, `no_source_city_page` |
| `SOURCE_QUALITY_FLAG` | a defect in WordPress, recorded, never repaired | `source_markup_defect`, `hero_image_not_city_specific`, `hero_image_wrong_state_label`, `hero_image_missing_alt`, `legacy_slug_typo`, `insufficient_source_*`, `faq_missing_in_source`, `hero_image_missing` |

The dataset separates `source{}` from `derived{}` at the record level, and the four-line legend is
written into every dataset file. `FLAG_CATEGORY` is the single table both Node and TypeScript read.
The brief's `APPROVED_RULE` maps to the fate-map inputs (tier, redirect, gone) and `BUSINESS_DECISION`
to `branches.json` and the `BUSINESS_UNVERIFIED` flags.

State identity is DERIVED from the slug pattern and is not stored on a page. That is the one
provenance the model does not record, and §11 covers why it matters.

---

# 24. Rollback

**Status: CURRENT by construction for the source; PLANNED for the target.**

WordPress has never been written to, so it remains the complete rollback for every page. The
architecture plans to keep it as the origin for 30 days after cutover.

For the new system, rollback is reseeding: PGlite rebuilds from the seed files on every start, and
`npm run seed -- --reset` truncates and reseeds Supabase. There is no rollback for a partial seed
(no transaction) and no versioning of the dataset beyond the ledger's latest state. A KV redirect map
rollback would be republishing the previous version, which requires the versioning that does not yet
exist.

---

# 25. State-by-State Rollout

**Status: PLANNED. Massachusetts is surveyed but not runnable.**

Measured scale, by live URLs and city pages, with the audit's linkability so the order is informed
rather than alphabetical:

| State | URLs | City pages | Linkable | Unresolved | Notes |
|---|---|---|---|---|---|
| CA | 66,694 | 616 | 71.0% | 2.7% | Standardised slugs; the easiest large state |
| CT | 12,665 | 20 | 91.7% | 5.4% | 135 towns with service pages but only 20 city pages; the no-source case at scale |
| MA | 35,286 | 219+ | 10.1% | 44.3% | Surveyed; four hand-authored slug shapes; 12 of 26 job locations lack a usable zip |
| WA | 34,389 | 249 | 15.0% | 61.5% | Worst unresolved rate |
| OR | 33,648 | 272 | 31.2% | 49.5% | |
| IL | 21,891 | 156 | 14.5% | 46.2% | |
| OH | 15,189 | 315 | 8.3% | 30.0% | 7,746 fate-map-only URLs |
| GA, CO, WI | 21,182 | 437 | 4–7% | 16–31% | Large gone maps |
| ID, UT, IN, MI, PA, TN, AZ, TX, NH, FL, RI | 1,070 | 8 | high | low | Tiny |

Recommended order after the P0 items: California first, because it resolves by construction and
exercises the pipeline at 616 city pages; then Massachusetts, already surveyed; then Washington and
Oregon, which carry the largest business backlogs and should not be attempted until the service
decisions are taken.

---

# 26. Business Decision Gates

Nothing here can be decided by engineering. Each is BUSINESS DECISION.

| Decision | Scale | Blocks |
|---|---|---|
| **Q1**: service-by-city URLs become pages, or redirect to the city page | 85,227 unresolved URLs site-wide; 9,568 in MN | the largest single population |
| Add, map or retire each of the **72** new-service candidates | 72,809 URLs | |
| Confirm or reject each of the **30** one-token possible matches | 32,411 URLs | |
| Approve a destination for the **7,708** `NO_DESTINATION` URLs | 7,708 | the cheapest wins |
| Re-decide the **31,799** redirects whose target 404s | 31,799 | the largest correctness defect |
| The 3 Minnesota and 72 site-wide cross-state redirects to the Oregon page | 75 | |
| Branch territories, replacing `nearest_branch_unverified` | 118 MN cities | local SEO correctness |
| The Farmingon slug typo redirect | 1 URL, 5 in the whole-site editing-note set | |
| St. Louis Park and Brooklyn Center branch-vs-coverage | 2 cities | |
| The 34 pages whose copy contradicts the price sheet | 34 pages | |
| Whether any of the 16 no-source cities deserves a page | 16 cities | content commission |
| **Q2b**: state slug `mn` vs `minnesota` | 29 legacy `/locations/*` URLs 404 until decided | |
| **Q5**: source of the "Rated 4.7 on Google" line | all branch pages | |
| **Q6**: whether prices really differ by region | pricing | |

---

# 27. Production Safety Gates

**Status: CURRENT gates are process, not enforcement. RISK.**

What blocks a bad apply today: nothing but convention. The agent exits 1 on validation failure and
**still allows `--apply` on the next invocation**. There is no approval step in code.

Required before any production apply, with status:

| Gate | Status |
|---|---|
| Dry run completed and its report reviewed | process only |
| Minnesota regression unchanged (134 / 109 / 25 / 16) | CURRENT, `--regress` |
| Validation 15/15 on every page | CURRENT, but not enforced before apply |
| Redirect graph clean: no loops, chains, self, cross-state, non-200 targets | **MISSING** as an automated test |
| Cross-state contamination test | **MISSING** |
| Dataset ↔ database reconciliation | **MISSING** |
| Idempotency proven by a second apply | CURRENT, manual |
| Business decisions recorded in writing | process only |
| Immutable source snapshot captured | **MISSING** |

The architecture's eight QA gates (§18) — visual parity, Tier A text parity, structured data,
Lighthouse, link graph, redirect map, accessibility, hydration — are PLANNED; none is wired to a
deploy.

---

# 28. Known Gaps

Consolidated from every section. Severity is argued from evidence, not asserted.

| # | Gap | Severity | Why that severity | Status |
|---|---|---|---|---|
| G1 | Whole-site audit has no producing script | **Critical** | 444 MB of the most important planning data cannot be regenerated or extended | RISK |
| G2 | `agent.mjs --state ma` throws: config field names do not match | **Critical** | The second state cannot run at all | RISK |
| G3 | Agent reads the Minnesota geocode cache regardless of state, by bare name | **Critical** | Silent cross-state coordinate contamination; six MA towns already collide | RISK |
| G4 | 31,799 approved redirects target a 404 | **Critical** | 61.6% of the redirect map; sends visitors to dead ends | BUSINESS DECISION |
| G5 | 92-service catalogue vs 208 published | **Critical** | ~105,000 URLs unresolvable; 99.3% of the backlog | BUSINESS DECISION |
| G6 | No redirect-graph test | **High** | Loop, chain and cross-state defects found only by manual audit | RISK |
| G7 | URL inventory produced only by a Minnesota-specific builder | **High** | No other state can be inventoried by the agent | RISK |
| G8 | Builder recognises 2 of Minnesota's 8 city-page slug forms | **High** | 68 real city pages classified as unresolved legacy | RISK |
| G9 | `pages` has no `state_id`; 2,657 rows have no city | **High** | No structural state integrity | RISK |
| G10 | Branch-page extractor cannot read branch heading layout | **High** | All 14 MN branch cities fail the gate on a code limitation | RISK |
| G11 | No cross-state contamination test | **High** | Nothing proves state separation | RISK |
| G12 | No dataset ↔ database reconciliation | **High** | A stale or partial Supabase load is invisible | RISK |
| G13 | No immutable source snapshot | **Medium** | Runs cannot be reproduced against a pinned source | RISK |
| G14 | Media pairing not verified | **Medium** | A transposed hero passes every check | RISK |
| G15 | Image reachability not verified on city pages | **Medium** | A 404ing image passes check 5 | RISK |
| G16 | Validation harness duplicated | **Medium** | Silent divergence | RISK |
| G17 | Seed has no transaction | **Medium** | Partial database on failure | RISK |
| G18 | `faqs.scope_id` unconstrained; `redirect_to` unconstrained | **Medium** | Orphans and dangling targets representable | RISK |
| G19 | Media download failure does not stop the run | **Medium** | Silently incomplete migration | RISK |
| G20 | 985 slugs are LLM editing notes committed as URLs; 972 over 90 chars | **Medium** | Recoverable from titles; 5 are MN URLs the baseline never saw | RISK |
| G21 | Inline body images not extracted | **Medium** | 19 MA hand-authored pages would lose images | RISK |
| G22 | Content-quality audit not implemented | **Medium** | Destination decisions have no quality input | PLANNED |
| G23 | No test runner, no CI | **Medium** | | RISK |
| G24 | `check-pages.mjs` writes a booking row | **Low** | Harmless on PGlite; leaves rows on Supabase | RISK |
| G25 | `port-css.mjs` resolves its root via `URL.pathname` | **Low** | Writes to a percent-encoded path when the directory name has a space | RISK |
| G26 | `--dry-run` flag is inert | **Low** | Documented but does nothing; dryness is `!--apply` | RISK |
| G27 | `--report` writes in dry run | **Low** | "Dry run writes nothing" is not literally true | RISK |
| G28 | Whole-site reports contain internal arithmetic inconsistencies | **Low** | ENGINEERING 1,221 vs itemised 7,292; BUSINESS 173,733 vs 201,038; "0 vs 30,635" self-contradiction in §I | RISK, reporting only |

---

# 29. Exact Next Steps

Ordered. Each names the file, the change, and the proof required.

**P0 — before any state after Minnesota**

1. **Recover or rewrite the whole-site audit generator** so `whole-site-audit.sqlite` can be
   reproduced from `chimcare_local`. Proof: a fresh run reproduces 262,535 records and the 208
   services exactly.
2. **Fix `states.mjs` / `agent.mjs` field mismatch.** Either give `ma` the singular regexes the agent
   reads, or teach the agent the ordered `citySlugRes` array. Proof: `agent.mjs --state ma --dry-run`
   completes.
3. **Wire `agent.mjs` to `geocode.mjs`** and migrate `mn-geocode.json` to the state-qualified format.
   Proof: Lexington resolves to different coordinates for MN and MA; Minnesota regression unchanged.
4. **Fix the redirect key collapse** in `build-mn-seed.mjs:49` (`lastSeg`). Proof: the Lonsdale loop
   disappears and the root-level rule survives; the 20,479 set is unchanged.
5. **Add a redirect-graph test**: loops, chains, self, cross-state, non-200 targets. Proof: it fails
   on the current Minnesota data with exactly the known 1 + 1 + 1 + 3 + 65 defects.
6. **Add `pages.state_id` NOT NULL with an FK**, and a check that a page's state equals its city's.
   Proof: migration applies; seed passes; the 2,657 city-less rows are assigned a state or listed.
7. **Add a cross-state contamination test**. Proof: it passes on Minnesota alone and fails when a
   Massachusetts row is injected.
8. **Move URL-universe generation into the agent**, using the four-set formula. Proof: Minnesota
   reproduces 20,479 exactly.
9. **Extend city-page discovery to all eight Minnesota forms** and title-based state resolution.
   Proof: 267 city pages found; the sealed baseline reported as an addition, not changed.
10. **Read the branch-page heading layout** in `localSpecificsFrom`. Proof: the 14 branch cities gain
    local lines; the change is reported against the sealed 109/25 and re-sealed only by decision.

**P1 — before production**

11. Immutable per-run source snapshot with a run ID.
12. Dataset ↔ database reconciliation command.
13. Media pairing and image reachability tests.
14. Seed transaction wrapper.
15. Consolidate `validate-render.mjs` onto `validate.mjs`.
16. Approval step enforced in code before `--apply`.
17. Content-quality audit (§16).

**P2**

18. A test runner and CI. 19. `sitemap.ts`, `robots.ts`. 20. The edge redirect layer. 21. Fix
`port-css.mjs` path resolution. 22. Stop `check-pages.mjs` writing bookings.

---

# 30. Definition of Done

A state is done when all of the following hold, each proven by an artefact on disk:

- Its URL universe reproduces from the four-set formula and reconciles to WordPress.
- Every URL carries exactly one handling and one reason; `UNKNOWN` is zero.
- Every city page is migrated with `source{}`/`derived{}` separated and three checksums.
- The 15 checks pass on every publishable page and every preview.
- The redirect graph for the state has zero loops, chains, self-redirects, cross-state targets and
  non-200 targets, or every exception is listed with a business sign-off.
- A second apply is byte-identical.
- The Minnesota regression is unchanged.
- The cross-state test passes with this state and Minnesota both loaded.
- Every business decision the state needed is recorded with who took it.
- WordPress was not written to.

---

# Final Summary

## CURRENT MIGRATION FLOW

```
WordPress (chimcare_local, SELECT only)
→ Extraction         scripts/migrate/source.mjs · fetchCityPages / fetchGeo / fetchHeroAttachments
→ Raw source         raw page record + attachment record; post_content hashed then discarded
→ Transformation     cleanMarkup · areasFrom · localSpecificsFrom · faqsFrom · markupDefectsFrom · parseAttachmentMeta · ensureAsset
→ Validation         gate (5 conditions) · 15 render checks · idempotency vs ledger · regression vs pilot
→ Dataset            data/seed/mn.migration.json (source/derived/flags/checksums) · mn.ledger.json
→ Database / R2      lib/db/seed.ts → Postgres `site` (PGlite now, Supabase planned) · public/uploads (R2 planned)
→ Next.js            app/location/[slug]/page.tsx · pages row decides city | service | redirect | 404
→ Render             assemble.ts → CityPage / ServicePage; StateHub via card-resolution.ts
```

## LEGACY URL FLOW

```
Legacy URL
→ Inventory     four-set union: live slugs ∪ redirects.json ∪ gone.json ∪ yoast earlier URLs   (MN: builder; site: audit, script missing)
→ State         slug token after stripping -N; title after last comma as fallback           (audit only; agent assumes)
→ City          slug suffix vs known city tokens; title fallback                             (agent: 2 forms; audit: 8+)
→ Service       title phrase → canonical service; exact / alias / possible / new / unresolved (audit; never substring)
→ Source/content/SEO audit   post_content, Yoast fields, _thumbnail_id; gate; checksums
→ Destination   EXACT PAGE → EXACT REDIRECT → VERIFIED CITY REDIRECT → REVIEW → GONE          (planned precedence)
→ PAGE / REDIRECT / REVIEW / GONE                                                              (today: 87,881 / 51,607 / 1,317+review / 36,503 / 85,227 unresolved)
→ Validation    redirect graph · destination 200 · no cross-state                             (audit only; no automated test)
→ Deployment    KV at the edge, versioned                                                     (planned; today in-app 308 from the pages row)
```

**END OF REPORT**
