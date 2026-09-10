# Chimcare WordPress → Next.js — Migration Implementation

**Authoritative technical handoff document.**

| | |
|---|---|
| Repository | `~/Desktop/chimcare/chimcare-web 2` |
| Document written | 2026-09-05 |
| Evidence basis | Live inspection of the repository, the WordPress database (read-only), and a full re-run of every validation suite on 2026-09-05 |
| Agent dataset | `data/seed/mn.migration.json`, generated 2026-09-04T11:14:36Z |
| Status | Minnesota migrated and validated. Nothing published. Nothing deployed. |

---

## THE CORE RULE

```
FETCH EXACTLY → STORE EXACTLY → VERIFY EXACTLY → RENDER WITHOUT ALTERING SOURCE DATA
```

Everything in this system exists to make that rule *checkable* rather than *promised*. Where
WordPress has nothing, the field stays null and the page carries a flag. No gap is ever filled.

---

## HOW TO READ THIS DOCUMENT

Every claim carries one of five labels. They are used strictly.

| Label | Meaning |
|---|---|
| **IMPLEMENTED** | Code exists in this repository and runs. |
| **VERIFIED** | Implemented *and* re-confirmed by a command executed on 2026-09-05, with the output quoted here. |
| **IN PROGRESS** | Started, not finished. |
| **PLANNED** | Designed and specified. No code exists. |
| **REQUIRES APPROVAL** | Blocked on a human decision. |
| **NOT VERIFIED** | Could not be confirmed from this repository. Treated as unknown. |

---

## ⚠️ CORRECTIONS TO THE COMMISSIONING BRIEF

The brief for this document named files, tables, technologies and past incidents that **do not exist
in this repository**. They are listed here first so no reader is misled, and each is explained in
its own section below.

### Files that do not exist anywhere in the workspace

`lib/db.ts`, `lib/queries.ts`, `lib/page-mapper.ts`, `lib/wpbakery.ts`, `lib/schema-tokens.ts`

**Verification (2026-09-05):**
```
$ for f in db.ts queries.ts page-mapper.ts wpbakery.ts schema-tokens.ts; do
    find ~/Desktop/chimcare -name "$f" -not -path '*/node_modules/*'; done
(no output — zero matches)
```
**Status: NOT VERIFIED.** These are not part of this project. Their equivalents here are
`lib/db/client.ts`, `lib/data/*.ts`, and `data/seed/minnesota.ts`. There is no WPBakery renderer and
no schema-token module — see §8 and §9 for why.

### Database tables that belong to a different project

`page_seo`, `local_seo`, `media`, `page_media`, `page_meta`, `page_taxonomies`, `taxonomies`,
`redirect_audit`, `migration_runs`, `migration_audit`

**Verification (2026-09-05):** these are defined in `../chimcare-ma-pilot/sql/001_schema.sql`, a
**separate sibling project** in the workspace. They do not exist in this repository's schema.
This repository's tables are listed in §6.

**Status: NOT VERIFIED here / belongs to `chimcare-ma-pilot`.**

### Deployment target contradiction

The brief says **Vercel**. This project's own `docs/architecture.md` specifies **Google Cloud Run**.

**Verification (2026-09-05):**
```
$ grep -n -i "cloud run\|vercel" docs/architecture.md
36:  ┌──────────── Google Cloud Run ────────────┐
74:  3. Cloud Run / Next: app/location/[slug]/page.tsx
121: workers/  BullMQ consumers (separate Cloud Run service, same image, different entrypoint)
(no match for "vercel")
```
**Status: CONTRADICTION — REQUIRES APPROVAL.** No deployment configuration of any kind exists in the
repository (`vercel.json`, `.vercel`, `wrangler.toml`, `.github`, `Dockerfile` are all absent). The
deployment target is an open decision, not an implemented fact.

### Incidents in the brief with no evidence in this repository

| Claimed issue | Finding |
|---|---|
| PostgreSQL 16 issue | **NOT VERIFIED.** No Postgres 16 anywhere. Local runtime is PGlite (Postgres compiled to WASM); the production target is Supabase. No such incident occurred in this project. |
| PHP serialization / thumbnail ID issue | **NOT VERIFIED as an incident.** PHP-serialized `_wp_attachment_metadata` *is* parsed (`parseAttachmentMeta`, `scripts/migrate/source.mjs:192`) and works. No failure was encountered. |
| MySQL CLI newline checksum issue | **NOT VERIFIED.** The MySQL CLI is invoked with `-N -B --raw` and returns JSON built by `JSON_ARRAYAGG`, which sidesteps delimiter problems entirely. No such incident occurred. |
| Reveal animation blank-content issue | **NOT VERIFIED as an incident.** `components/islands/Reveal.tsx` was reviewed: it already honours `prefers-reduced-motion` and falls back to showing all content when `IntersectionObserver` is unavailable. Content is fully present in server HTML. No bug was found or fixed. |
| Nested JSON-LD script issue | **NOT VERIFIED.** `components/seo/JsonLd.tsx` emits sibling `<script>` tags, never nested, and escapes `<` to `<`. No such incident occurred. |
| Adminer as discovery/audit tool | **NOT VERIFIED.** Adminer was never used. All database access in this project is the `mysql` CLI in read-only mode. |

Two issues in the brief **are** real and are documented in full in §22: the Minnesota hub
`branch.photoKey` issue, and geocoding conflicts. Two further real issues the brief did not mention
are also documented there: malformed WPBakery source markup, and branch-matching postcode defects.

---

# 1. PROJECT OVERVIEW

## 1.1 Why this migration exists

Chimcare.com is a WordPress site with **229,621 published `job_listing` pages** — city pages and
service-by-city pages across roughly 20 states. The site is built on WPBakery page-builder
shortcodes with Yoast SEO and WP Schema Pro. It is being rebuilt as a Next.js application.

The dominant constraint is that **SEO must not regress**. Those 229,621 URLs are indexed. Any URL
that changes, any page whose content is altered, and any image that moves is a potential ranking
loss. That constraint produces the core rule at the top of this document, and every design decision
below follows from it.

A secondary constraint emerged during the Minnesota work and is now equally binding: **the source is
not uniformly good**. Pages contain malformed markup, images labelled for the wrong state, prices
that contradict the price sheet, and misspelled slugs. The system's job is to carry these across
faithfully and *report* them — never to silently improve them, because a silent improvement is
indistinguishable from a silent corruption.

## 1.2 The pieces and what each one is

| Piece | What it is | Status |
|---|---|---|
| **WordPress source** | MySQL database `chimcare_local` on localhost, a copy of production. Source of truth and rollback source. Read with SELECT only. | **VERIFIED** — 229,621 published `job_listing` rows |
| **Migration Agent** | Deterministic Node scripts in `scripts/migrate/`. Reads WordPress, copies data, computes checksums, applies the gate, reports. **Contains no AI/LLM.** | **IMPLEMENTED + VERIFIED** |
| **Migration Dataset** | `data/seed/<state>.migration.json` — the immutable output of the agent, with provenance separated. Plus `<state>.ledger.json` for idempotency. | **IMPLEMENTED + VERIFIED** |
| **Database** | Currently **PGlite** (Postgres compiled to WASM, in-memory, re-seeded on every start). Supabase is the production target. | PGlite **VERIFIED**; Supabase **PLANNED** |
| **Media storage** | Currently `public/uploads/` on local disk, mirroring the WordPress uploads path. Cloudflare R2 is the target. | Local **VERIFIED**; R2 **PLANNED** |
| **Next.js app** | Next.js 16 App Router. Renders hubs, city pages and service pages from the database. | **IMPLEMENTED + VERIFIED** |
| **Deployment host** | None configured. `docs/architecture.md` specifies Google Cloud Run; the brief for this document says Vercel. | **CONTRADICTION — REQUIRES APPROVAL** |
| **Cloudflare** | DNS, WAF, CDN, edge Worker for redirects/410s, R2 alias for `/wp-content/uploads/*`. | **PLANNED** (architecture §1, milestone M6) |

**WordPress is never written to and remains the rollback path.** If the new site fails, DNS points
back and nothing has been lost, because nothing was changed at source.

## 1.3 Architecture — target state (from `docs/architecture.md`)

This is the **designed** end state. Only the shaded portion is built.

```
                    ┌──────────────────── Cloudflare ─────────────────────┐
  Visitor ────────► │ DNS · WAF · CDN cache (edge TTL + SWR)               │   PLANNED
  Googlebot         │ Worker "edge-router": 301 / 410 lookup in KV         │   PLANNED
                    │ R2 "chimcare-media" + /wp-content/uploads/* alias    │   PLANNED
                    └────────────┬────────────────────────┬───────────────┘
                                 │ cache miss             │ media
                                 ▼                        ▼
                  ┌──────────────────────────────┐   (served from R2)
                  │  Next.js 16 App Router       │  ◄── IMPLEMENTED (runs locally)
                  │  /locations                  │
                  │  /locations/[state]          │
                  │  /location/[slug]            │
                  │  /admin/* · /api/*           │
                  └───────────┬──────────────────┘
                              │
                  ┌───────────▼───────────┐
                  │  Postgres             │  ◄── PGlite locally (VERIFIED)
                  │  schema "site"        │      Supabase in production (PLANNED)
                  └───────────────────────┘

  Deployment host: NOT CONFIGURED. Cloud Run per architecture doc; Vercel per brief. UNRESOLVED.
```

## 1.4 Architecture — what is actually built and running today

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  WORDPRESS (MySQL chimcare_local)          IMMUTABLE. SELECT statements only. │
│  wp_posts · wp_postmeta · wp_terms                                            │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │  read-only extraction
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  MIGRATION AGENT            scripts/migrate/                                   │
│    source.mjs    ── the only code that touches WordPress                       │
│    states.mjs    ── per-state configuration (patterns, thresholds, known facts)│
│    agent.mjs     ── orchestrator · checksum ledger · report · dry-run default  │
│    validate.mjs  ── the 15 checks                                              │
│  Business inputs (not WordPress, not invented):                                │
│    ../chimcare-rebuild-main/site/data/{branches,keep-pages,redirects,gone,     │
│                                         pricing}.json + content/hubs/*.md      │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │  writes only its own artefacts
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  MIGRATION DATASET (immutable)                                                 │
│    data/seed/mn.migration.json   source{} · derived{} · flags[] · checksums{}  │
│    data/seed/mn.ledger.json      one row per page, for idempotency             │
│    public/uploads/<yyyy>/<mm>/   original binaries, byte-for-byte              │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │  type-safe mapper: selects + renames, changes no value
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  data/seed/minnesota.ts  →  lib/db/seed.ts  →  Postgres (PGlite), schema "site"│
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │  typed loaders (lib/data/*.ts — the only SQL)
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  lib/content/assemble.ts   rows + master copy → fully-resolved template props  │
│  components/templates/CityPage.tsx   ONE template for all 134 pages            │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │
                    ┌───────────┴────────────┐
                    ▼                        ▼
        PUBLIC /location/{slug}/     ADMIN /admin/preview/{slug}/
        109 pages, HTTP 200          25 pages, noindex, review only
```

---

# 2. NON-NEGOTIABLE DATA PRESERVATION RULES

## 2.1 What is preserved exactly

Every item below is copied from WordPress and stored unmodified. Where WordPress has no value, the
field is **null and flagged** — never filled.

| Category | Item | Where it lives | Status |
|---|---|---|---|
| **URLs** | Legacy slug, exact | `cities.slug`, `pages.slug` | **VERIFIED** |
| | Trailing slash preserved end to end | `next.config.ts` → `trailingSlash: true` | **VERIFIED** |
| | WordPress post ID | `cities.legacyPostId`, `pages.legacyPostId` | **VERIFIED** |
| | Full legacy URL | `pages.legacyUrl` | **IMPLEMENTED** |
| **Content** | Page title | `source.wpTitle` | **VERIFIED** |
| | FAQ questions and answers, verbatim | `faqs` table, `source.faqs` | **VERIFIED** — 642 pairs |
| | Areas served, in page order | `cities.neighborhoods` | **VERIFIED** |
| | Local prose sentences, whole | `cities.localSpecifics` | **VERIFIED** |
| | Legacy pricing sentences, verbatim | `cities.legacyPricingCopy` | **VERIFIED** — 34 pages |
| **SEO** | Yoast SEO title | `cities.metaTitle` | **VERIFIED** |
| | Yoast meta description | `cities.metaDescription` | **VERIFIED** |
| | Canonical (self) | computed in `assemble.ts` | **VERIFIED** |
| | Robots | Next.js metadata; preview = noindex | **VERIFIED** |
| | Open Graph | `assemble.ts` → `openGraph` | **IMPLEMENTED** |
| | JSON-LD structured data | `assemble.ts` → `components/seo/JsonLd.tsx` | **VERIFIED** |
| | Breadcrumbs | JSON-LD `BreadcrumbList` + visible trail | **VERIFIED** |
| **Local SEO** | Branch street, city, ZIP, phone | `branches` table | **VERIFIED** |
| | Coordinates | `branches.lat/lng`, `cities.lat/lng` | **VERIFIED** |
| **Media** | Attachment ID | `cities.legacyThumbnailId`, `hero.attachmentId` | **VERIFIED** |
| | Original filename + extension | `hero.filename`, `hero.extension` | **VERIFIED** |
| | Uploads path preserved | `public/uploads/<yyyy>/<mm>/<name>` | **VERIFIED** |
| | MIME type | `hero.mime` | **VERIFIED** |
| | File size (bytes) | `hero.filesize` | **VERIFIED** |
| | Dimensions | `hero.width`, `hero.height` | **VERIFIED** |
| | Alt, title, caption, description | `hero.*` | **VERIFIED** |
| | SHA-256 of the binary | `hero.sha256` | **VERIFIED** |

## 2.2 What the system MUST NOT do

This list is the design. It is enforced by the agent containing no generation capability at all.

```
✗ generate content                    ✗ rename images
✗ rewrite or paraphrase               ✗ convert image formats
✗ improve grammar                     ✗ replace images with lookalikes
✗ rewrite for SEO                     ✗ optimise or re-encode images
✗ generate missing FAQs               ✗ change alt text
✗ generate missing areas              ✗ repair source defects
✗ invent local SEO                    ✗ modify WordPress
✗ invent metadata                     ✗ change source URLs
✗ guess business territories          ✗ auto-redirect a city to an unrelated city
✗ loosen the publishability gate      ✗ publish without approval
```

**Verification that no AI is involved (2026-09-05):**
```
$ grep -rli "openai\|anthropic\|claude\|gpt\|llm\|generateText\|completion" scripts/migrate lib/migration
none
```

## 2.3 Missing data stays missing

When WordPress has no value, three things happen and no fourth:

1. The field is stored as `null` or an empty array.
2. A **flag** is added to `cities.reviewFlags` naming exactly what is absent and why.
3. If the absence breaks the publishability gate, the page is marked `needs_review` and withheld
   from the public site — but it is still migrated, still stored, and still renders through the
   same template in the admin preview.

---

# 3. CURRENT REPOSITORY STRUCTURE

**VERIFIED** by full directory listing on 2026-09-05. This is the complete, actual tree
(excluding `node_modules`, `.next`, and binary asset directories).

```
chimcare-web 2/
├── MIGRATION_IMPLEMENTATION.md      ← this document
├── CLAUDE.md                        project guide, conventions, test matrix
├── README.md                        runnable-slice documentation
├── docs/architecture.md             the target architecture (Cloud Run, Cloudflare, R2, Valkey)
│
├── scripts/
│   ├── migrate/                     ★ THE MIGRATION AGENT
│   │   ├── agent.mjs                orchestrator (27,669 bytes)
│   │   ├── source.mjs               read-only WordPress extraction (11,199 bytes)
│   │   ├── states.mjs               per-state configuration (2,874 bytes)
│   │   ├── validate.mjs             the 15-check harness (9,052 bytes)
│   │   └── compare-datasets.mjs     old-vs-new dataset diff (7,147 bytes)
│   ├── validate-render.mjs          CLI wrapper over validate.mjs
│   ├── check-responsive.mjs         real overflow measurement via Chrome DevTools Protocol
│   ├── check-pages.mjs              route-level smoke test + booking round-trip
│   ├── build-mn-seed.mjs            LEGACY pilot builder (still produces the URL universe)
│   ├── recover-mn-faqs.mjs          LEGACY one-off FAQ recovery (superseded by the agent)
│   ├── recover-mn-media.mjs         LEGACY one-off media recovery (superseded by the agent)
│   ├── port-css.mjs                 regenerates styles/* from the design mocks
│   └── seed.ts                      CLI DB seeder (npm run seed)
│
├── lib/
│   ├── migration/
│   │   ├── types.ts                 provenance categories, record shapes, PageRecord
│   │   └── flags.mjs                THE flag→category table (shared by app and agent)
│   ├── db/
│   │   ├── schema.ts                Drizzle schema, Postgres schema "site"
│   │   ├── client.ts                PGlite | Supabase driver selection
│   │   ├── seed.ts                  inserts the mapped dataset
│   │   └── migrations/              0000, 0001, 0002 + meta snapshots
│   ├── data/                        ★ THE ONLY PLACE SQL LIVES
│   │   ├── cities.ts  states.ts  pages.ts  services.ts  pricing.ts  masters.ts
│   │   └── migration.ts             migration board loader (runs the real gate)
│   ├── content/
│   │   ├── assemble.ts              rows + masters → props · THE GATE lives here
│   │   ├── assemble-hubs.ts         national + state hub assembly
│   │   └── slots.ts                 {{slot}} renderer; unknown slot throws
│   └── booking/                     adapter.ts · types.ts · validate.ts
│
├── data/seed/
│   ├── mn.migration.json      ★ AGENT OUTPUT — 776 KB, the app's city/branch source
│   ├── mn.ledger.json         ★ AGENT LEDGER — 66 KB, checksums for idempotency
│   ├── minnesota.ts           ★ THE TYPE-SAFE MAPPER
│   ├── minnesota.generated.json  PILOT/REFERENCE artefact — 7.0 MB (see §6.4)
│   ├── minnesota.faq.json     recovery artefact, 656 Q&A pairs
│   ├── minnesota.media.json   recovery artefact, 15 verified assets
│   ├── mn-geocode.json        135 cached geocodes
│   ├── masters.ts             13 master copy blocks (design-mock template copy)
│   └── services.ts            8 categories + 92 services (design-mock template copy)
│
├── app/
│   ├── location/[slug]/page.tsx     THE DISPATCHER — one route for every legacy URL
│   ├── locations/page.tsx           national hub
│   ├── locations/[state]/page.tsx   state hub
│   ├── admin/migration/page.tsx     migration review board + data-source indicator
│   ├── admin/preview/[slug]/page.tsx  renders held-back pages, noindex
│   ├── admin/bookings/page.tsx      booking list
│   ├── api/bookings/route.ts        POST/GET bookings
│   ├── api/health/route.ts          health + dataSource indicator
│   └── layout.tsx · page.tsx · not-found.tsx · globals.css
│
├── components/
│   ├── templates/  CityPage.tsx ★ · ServicePage.tsx · NationalHub.tsx · StateHub.tsx
│   ├── chrome/     Header · Footer · StickyBar · Sprite · Icon
│   ├── islands/    BookingForm · BookingSheet · Accordion · Reveal · ServiceDirectory · HeaderMenu
│   ├── sections/   shared.tsx
│   └── seo/        JsonLd.tsx
│
├── public/
│   ├── uploads/<yyyy>/<mm>/  ★ 15 original WordPress binaries (4.67 MB)
│   └── img/                  design-mock assets (crew, tiles, state photo)
│
└── styles/  tokens · base · hub · state · city (generated) · booking · fonts (hand-written)
```

## 3.1 Migration file reference

| File | Does | Input | Output | Writes? | Touches WP? | Generic? | Status |
|---|---|---|---|---|---|---|---|
| `scripts/migrate/source.mjs` | The **only** code that contacts WordPress. Queries rows, parses accordions/areas/prose, detects markup defects, downloads media. | MySQL, uploads origin | JS objects, files in `public/uploads/` | Media files only | **Reads only** (SELECT + GET) | Generic | **VERIFIED** |
| `scripts/migrate/states.mjs` | Per-state config: slug patterns, gate thresholds, rejected geocodes, office conflicts, slug typos, markup-defect pattern, foreign-state pattern. | — | config object | No | No | **Config** | **VERIFIED** (MN only) |
| `scripts/migrate/agent.mjs` | Orchestrates fetch→map→gate→render→validate→report. Maintains ledger. Dry run by default. | WordPress + business inputs + config | dataset, ledger, report | Only with `--apply` | Via source.mjs | Generic | **VERIFIED** |
| `scripts/migrate/validate.mjs` | The 15 checks against a rendered page. One implementation, two callers. | running server + expectations | pass/fail per check | No | No | Generic | **VERIFIED** |
| `scripts/migrate/compare-datasets.mjs` | Diffs pilot vs agent across 14 dimensions. | two datasets | difference report | No | No | Generic | **VERIFIED** |
| `lib/migration/types.ts` | The contract: `ProvenanceCategory`, `MigrationFlag`, `CitySource`, `CityDerived`, `CityHero`, `CityChecksums`, `PageRecord`. | — | TypeScript types | No | No | Generic | **VERIFIED** |
| `lib/migration/flags.mjs` | The single table mapping each flag code to its provenance category. Imported by both the TypeScript app and the Node agent. | — | `FLAG_CATEGORY` | No | No | Generic | **VERIFIED** |
| `data/seed/minnesota.ts` | **The type-safe mapper.** Reads the agent dataset, selects and renames fields for the DB, runs the gate, computes `sourceStatus`. Changes no value. | `mn.migration.json` + pilot artefact | seed arrays | No | No | **State-specific** | **VERIFIED** |
| `lib/db/seed.ts` | Inserts the mapped arrays into Postgres in batches of 500. Idempotent via `seedIfEmpty`. | seed arrays | DB rows | DB only | No | Generic | **VERIFIED** |
| `scripts/build-mn-seed.mjs` | **LEGACY.** The original pilot builder. Still the only producer of the 20,479-row URL universe. Reads the 2.4 GB export. | export + fate maps | `minnesota.generated.json` | Yes | No | MN-specific | **IMPLEMENTED** (superseded for cities) |
| `scripts/recover-mn-faqs.mjs` | **LEGACY.** One-off FAQ recovery, now built into the agent. | MySQL | `minnesota.faq.json` | Yes | Reads only | MN-specific | **IMPLEMENTED** (superseded) |
| `scripts/recover-mn-media.mjs` | **LEGACY.** One-off media recovery, now built into the agent. | MySQL + origin | `minnesota.media.json`, files | Yes | Reads only | MN-specific | **IMPLEMENTED** (superseded) |

### Files named in the brief that do not exist

`lib/db.ts` · `lib/queries.ts` · `lib/page-mapper.ts` · `lib/wpbakery.ts` · `lib/schema-tokens.ts`
— **NOT VERIFIED.** Zero matches anywhere in the workspace. See the corrections section.

---

# 4. THE MIGRATION AGENT

## 4.1 There is one agent

**There is exactly one migration agent.** Minnesota is not "the Minnesota agent" and Massachusetts
will not be "the Massachusetts agent". There is a generic pipeline in `scripts/migrate/` and a
per-state configuration block in `scripts/migrate/states.mjs`. Adding a state means adding a config
entry, not writing migration code — *provided* the state's structure fits the existing
configuration surface (Massachusetts partly does not; see §13).

## 4.2 Pipeline

```
  WORDPRESS (MySQL, read-only)
        │
        │  fetchCityPages() · fetchGeo() · fetchHeroAttachments()      source.mjs
        ▼
  SOURCE EXTRACTION
        │  cleanMarkup · areasFrom · localSpecificsFrom · introNeighbourhoods
        │  faqsFrom · legacyPricingCopyFrom · markupDefectsFrom · ensureAsset
        ▼
  STATE CONFIGURATION                                                  states.mjs
        │  slug patterns · gate thresholds · rejected geocodes
        │  office conflicts · slug typos · defect + foreign-state patterns
        ▼
  TRANSFORMATION / MAPPING                                             agent.mjs
        │  source{}  ← verbatim WordPress
        │  derived{} ← coordinates, nearest branch, distance
        │  flags[]   ← each with its provenance category
        │  checksums{source, content, media}
        ▼
  PUBLISHABILITY GATE  (unchanged, never loosened)
        │  needs: serving branch · ≥4 areas · ≥2 local lines · hero · ≥1 FAQ
        ├──── ok ────►  status "publishable"
        └──── not ───►  status "needs_review"   (still migrated, still rendered)
        ▼
  DATASET + LEDGER                              data/seed/<state>.{migration,ledger}.json
        │  written only with --apply
        ▼
  MAPPER → DATABASE → TEMPLATE                  data/seed/<state>.ts → lib/db/seed.ts
        ▼
  RENDER + VALIDATE  (15 checks per page)                              validate.mjs
```

## 4.3 What lives in configuration

**VERIFIED** from `scripts/migrate/states.mjs`:

| Config key | Purpose | Minnesota value |
|---|---|---|
| `key`, `stateCode`, `stateName` | Identity | `mn`, `MN`, `Minnesota` |
| `origin` | Where media is downloaded from | `https://www.chimcare.com` |
| `nationalPhone` | Fallback phone | `1-800-362-4840` |
| `businessInputs` | Path to branch/fate/pricing files | `../chimcare-rebuild-main` |
| `cityPagePatterns` | SQL LIKE patterns selecting city pages | 2 patterns |
| `citySlugRe` | Extracts the city suffix from a slug | `/^chimney-sweep-(fireplace\|repair)-in-(.+)-mn$/` |
| `branchSlugRe` / `coverageSlugRe` | Distinguishes the two layers | fireplace = branch, repair = coverage |
| `minAreas`, `minLocalLines` | **Gate thresholds — not to be lowered** | 4, 2 |
| `serviceCatalogueSize` | Expected service cards per page | 92 |
| `farFromBranchKm` | Suspicious-geocode threshold | 88 |
| `rejectedGeocodes` | Geocodes known to resolve elsewhere | Becker, Grant, St. Anthony |
| `officeConflicts` | Branch office inside a "coverage" city | St. Louis Park, Brooklyn Center |
| `slugTypos` | Known misspelled legacy slugs | `farmingon` |
| `excludeSuffixes` | Slug fragments that are not real cities | `saint-paul`, `south-wayzata` |
| `markupDefectRe` | Malformed shortcode close pattern | `/<\/[a-z][a-z0-9_]*\]/g` |
| `foreignStateRe` | Detects an image labelled for another state | `/\b(MA\|WA\|OR\|CA\|GA\|IL\|OH\|WI\|NH)\b/` |

## 4.4 Adding a new state

**The intended path (config only):**

1. Survey the state's WordPress structure (§18 step 1–6).
2. Add a `STATES` entry in `scripts/migrate/states.mjs`.
3. Re-run the Minnesota regression — it must stay at 134/109/25.
4. Dry-run the new state, review the report, get approval.
5. Apply, re-apply to prove idempotency, wire, validate.

**This works only if the state fits the configuration surface.** Massachusetts does not fully fit
(§13). When a state exposes a structure the agent does not understand, the rule is: **stop and
report. Do not modify the generic agent automatically.** Any agent change is then landed one at a
time, each followed by the Minnesota regression.

---

# 5. WORDPRESS SOURCE EXTRACTION

## 5.1 Access model — **VERIFIED**

- **Transport:** the `mysql` CLI invoked via `execFileSync`, with `-N -B --raw`.
- **Result format:** MySQL builds the JSON itself with `JSON_ARRAYAGG(JSON_OBJECT(...))`, so no
  delimiter or newline parsing is involved on the Node side.
- **Statements:** SELECT only. No INSERT, UPDATE, DELETE, ALTER or DDL exists anywhere in
  `scripts/migrate/`.
- **Media:** HTTP GET against `https://www.chimcare.com/wp-content/uploads/...`.
- **Adminer:** **NOT VERIFIED — never used in this project.**

**WordPress is never modified.** Confirmed by inspection of every query in `source.mjs`, and by the
source database being unchanged across the whole project (row count and max `post_modified`
re-checked after every apply run).

## 5.2 Tables and meta keys read — **VERIFIED**

| Source | Keys / columns | Used for |
|---|---|---|
| `wp_posts` | `ID`, `post_name`, `post_title`, `post_content`, `post_status`, `post_type`, `post_modified`, `guid`, `post_mime_type`, `post_excerpt` | Page identity, raw content, attachment records |
| `wp_postmeta` | `_yoast_wpseo_title` | SEO title |
| | `_yoast_wpseo_metadesc` | Meta description |
| | `_yoast_post_redirect_info` | WordPress's own recorded redirect (PHP-serialized) |
| | `_thumbnail_id` | Hero attachment ID |
| | `_job_location` | Branch address text |
| | `geolocation_lat`, `geolocation_long`, `geolocation_city`, `geolocation_postcode` | Coordinates |
| | `_wp_attached_file` | Canonical uploads path of the attachment |
| | `_wp_attachment_image_alt` | Alt text |
| | `_wp_attachment_metadata` | Width, height, filesize (PHP-serialized) |
| `wp_terms`, `wp_term_taxonomy`, `wp_term_relationships` | `job_listing_region` | State identification (used for surveys; see §13) |

## 5.3 Duplicate postmeta — **VERIFIED, not currently an issue**

The extraction uses `LEFT JOIN wp_postmeta ... AND meta_key = '...'`. If a page had **two rows for
the same meta key**, that join would multiply the result rows and silently duplicate the page.

**Test executed 2026-09-05:**
```sql
SELECT meta_key, COUNT(*) FROM (
  SELECT post_id, meta_key, COUNT(*) c FROM wp_postmeta
  WHERE meta_key IN (…the 9 keys we read…)
    AND post_id IN (…the Minnesota city pages…)
  GROUP BY post_id, meta_key HAVING c > 1) d GROUP BY meta_key;
→ (empty result set)
```

**Finding:** no duplicate postmeta exists on the Minnesota city pages, so the joins are safe *for
Minnesota*. This is **a latent risk for every future state** and the same test must be run before
each one. Duplicates, if found, must be **preserved and reported**, never de-duplicated by picking
one arbitrarily — WordPress itself resolves duplicates by lowest `meta_id`, and any other choice
would silently change a page's data.

**Status: VERIFIED for Minnesota. REQUIRED PRE-CHECK for every new state.**

---

# 6. DATA MODEL

## 6.1 Runtime — **VERIFIED**

`lib/db/client.ts` selects a driver at runtime:

- `DATABASE_URL` **unset** → **PGlite**, Postgres compiled to WASM, in-memory, migrated and seeded
  on first request. This is the current mode. A restart re-seeds from the dataset.
- `DATABASE_URL` **set** → **Supabase** via `postgres-js`, with `prepare: false` for the
  transaction-mode pooler.

Both run the identical schema and identical migrations. **Supabase has never been connected in this
project — PLANNED.**

## 6.2 Tables — **VERIFIED** from `lib/db/schema.ts`

All tables live in the Postgres schema `site`.

| Table | Purpose | Key columns | Provenance |
|---|---|---|---|
| `states` | One row per state. Drives `/locations/{slug}/`. | `code`, `slug`, `name`, `verified`, `blurb`, `heroLede`, `introParagraphs`, `climateNotes`, `editorial`, `detailAccordion`, `photoKey` | Copy from `state-mn.md` (SOURCE) + design-mock marketing copy (TEMPLATE) |
| `regions` | Pricing regions. | `name`, `isDefault` | Derived from pricing sheet |
| `branches` | Physical offices. | `slug`, `name`, `street`, `streetShort`, `city`, `zip`, `phone`, `lat`, `lng`, `licenses`, `rating`, `ratingCount` | SOURCE (branches.json + WP geo) |
| `cities` | **The core table.** One row per city. | see below | mixed — see below |
| `pages` | **One row per legacy URL** under `/location/`. | `kind`, `slug`, `cityId`, `serviceId`, `tier`, `fate`, `status`, `redirectTo`, `legacyPostId`, `legacyUrl`, `gscClicks12m` | SOURCE (WP) + fate maps |
| `services` | The 92-service catalogue. | `key`, `name`, `categoryId`, `nameTemplate`, `cardCopyTemplate` | TEMPLATE (design mock) |
| `service_categories` | 8 categories. | `key`, `name`, `tileImageKey`, `bookingService` | TEMPLATE |
| `faqs` | Scoped FAQ entries. | `scope`, `scopeId`, `question`, `answer`, `sort` | **SOURCE — verbatim WordPress** |
| `prices` | Region × service-key amounts in cents. | `regionId`, `serviceKey`, `amountCents` | SOURCE (pricing.json) |
| `masters` | 13 master copy blocks with `{{slots}}`. | `key`, `body` | TEMPLATE (design mock) |
| `bookings` | Form submissions with page attribution. | `reference`, `serviceKey`, `pageSlug`, `cityId`, `branchId`, … | Runtime data |

### `cities` — column-by-column provenance

**VERIFIED** column list: `id · slug · name · stateId · kind · branchId · regionId · lat · lng ·
neighborhoods · localSpecifics · heroImageKey · heroImageAlt · tier · metaTitle · metaDescription ·
legacyPostId · sourceStatus · reviewFlags · legacyPricingCopy · legacyThumbnailId`

| Column | Provenance | Notes |
|---|---|---|
| `slug`, `name`, `metaTitle`, `metaDescription`, `legacyPostId`, `legacyThumbnailId` | **SOURCE** | Verbatim WordPress |
| `neighborhoods`, `localSpecifics`, `legacyPricingCopy` | **SOURCE** | Extracted whole; never rewritten |
| `heroImageKey`, `heroImageAlt` | **SOURCE** | Uploads path + WordPress's own alt |
| `kind` | **SOURCE-derived** | branch vs coverage, from the slug pattern |
| `lat`, `lng` | **SOURCE or DERIVED** | WordPress geo (14) or geocoder (118); `coordsSource` records which |
| `branchId` | **DERIVED — unverified** | Nearest office. Flagged `nearest_branch_unverified` |
| `tier` | **SOURCE** | From the business fate maps |
| `sourceStatus` | **VALIDATION** | `NO_SOURCE_PAGE` / `SOURCE_PAGE_EXISTS` / `SOURCE_PAGE_INCOMPLETE` / `SOURCE_PAGE_PUBLISHABLE` |
| `reviewFlags` | **VALIDATION** | Each flag carries its own provenance category |

### Enums — **VERIFIED**

```
page_kind      hub · state · city · service · legacy
tier           A · B · C
fate           publish_verbatim · regenerate · redirect · gone
page_status    draft · review · published · retired
city_kind      branch · coverage
source_status  NO_SOURCE_PAGE · SOURCE_PAGE_EXISTS · SOURCE_PAGE_INCOMPLETE · SOURCE_PAGE_PUBLISHABLE
faq_scope      global · state · city · service
```

### Migrations — **VERIFIED**

`0000_public_electro.sql` (initial, 25 statements) · `0001_harsh_lord_hawal.sql` (bookings, 4) ·
`0002_fast_salo.sql` (migration bookkeeping, 5: adds `source_status`, `review_flags`,
`legacy_pricing_copy`, `legacy_thumbnail_id`).

Generated by `npm run db:generate`. **Never hand-edit the SQL.**

## 6.3 Why raw source data is retained

`legacyPricingCopy` is the clearest case. 34 Minnesota pages state prices in their own body copy
that contradict the pricing sheet ("$125 to $225" against a $299 sheet price). The system:

- stores the sentence **verbatim** on the city row,
- **never renders it**,
- **flags** it `legacy_pricing_conflict` (BUSINESS_UNVERIFIED),
- and leaves the decision to a human.

Deleting it would destroy evidence of a real business inconsistency. Rendering it would publish a
contradiction. Retaining-and-flagging is the only option that neither loses nor lies.

## 6.4 The two datasets and why both exist

**VERIFIED** from `data/seed/minnesota.ts` and the live `/api/health/` endpoint:

| Part of the seed | Source artefact | Why |
|---|---|---|
| Cities (134) | **agent** `mn.migration.json` | The agent's product |
| Branches (14) | **agent** `mn.migration.json` | The agent's product |
| No-source cities (16) | **pilot** `minnesota.generated.json` | City rows only, no page rows, so their live service URLs still resolve |
| State hub copy | **pilot** `minnesota.generated.json` | From `state-mn.md`; the agent does not yet produce it |
| Prices | **pilot** `minnesota.generated.json` | From `pricing.json`; the agent does not yet produce it |
| Page universe (20,479 rows) | **pilot** `minnesota.generated.json` | Service/redirect/gone rows from the fate maps; the agent does not yet produce them |

This split is surfaced at runtime so it is never a guess — `/api/health/` and `/admin/migration/`
both display which half is which. **`minnesota.generated.json` must not be deleted:** it is both a
live data source for the four items above and the regression reference for dataset comparison.

**Closing this split is planned change B in §13.**

---

# 7. MEDIA / IMAGE MIGRATION

## 7.1 Pipeline — **IMPLEMENTED + VERIFIED**

```
  WordPress page
      │ _thumbnail_id
      ▼
  wp_posts (post_type='attachment')          guid · post_mime_type · post_title
      │                                       post_excerpt (caption) · post_content (description)
      │ + wp_postmeta
      │   _wp_attached_file        → canonical uploads path (e.g. 2025/06/Minneapolis-city-MN-scaled.jpg)
      │   _wp_attachment_image_alt → alt text
      │   _wp_attachment_metadata  → width · height · filesize   (PHP-serialized)
      ▼
  ensureAsset()                              scripts/migrate/source.mjs
      │  ① file already on disk? → read it, hash it, verify, DO NOT re-download
      │  ② otherwise GET https://www.chimcare.com/wp-content/uploads/<path>
      ▼
  public/uploads/<yyyy>/<mm>/<original-filename>     ← path, name and extension preserved
      │
      │  VERIFY: bytes on disk === filesize WordPress recorded
      │  RECORD: SHA-256 of the binary
      ▼
  cities.heroImageKey = "uploads/2025/06/Minneapolis-city-MN-scaled.jpg"
  cities.heroImageAlt = WordPress's own alt text (null if WordPress has none)
      ▼
  Next.js renders <img src="/uploads/…"> — no loader, no transform, no resize
```

**Images are recovered from WordPress and reused byte-for-byte. Nothing is generated.**

## 7.2 Preserved fields — **VERIFIED**

`attachmentId · imageKey (uploads path) · filename · extension · mime · alt · title · caption ·
description · width · height · filesize · sha256 · sourceUrl · guid · usedByPages`

## 7.3 Minnesota media results — **VERIFIED 2026-09-05**

| Metric | Value |
|---|---|
| Pages with a hero | 134 / 134 |
| Distinct attachments | 15 |
| Verified against WordPress's recorded size | 15 / 15 |
| Download problems | 0 |
| Total bytes on disk | 4,670,577 |
| MIME types | 7 × `image/jpeg`, 6 × `image/avif`, 2 × `image/webp` |

**AVIF and WebP files were kept as AVIF and WebP.** No format conversion occurred.

## 7.4 Media classes

| Class | Definition | Minnesota | Massachusetts |
|---|---|---|---|
| **Hero / featured** | The `_thumbnail_id` attachment | **IMPLEMENTED** — 134/134 | would work |
| **Inline body image** | `<img>` embedded in `post_content` | none exist | **19 of 26 pages have one — PLANNED, change E in §13** |
| **Gallery / other** | `_gallery`, `_gallery_images` | not read | **PLANNED / not scoped** |

**The agent currently downloads hero images only.** For Massachusetts this is a real gap: 19 inline
body images would silently not migrate.

## 7.5 R2 — **PLANNED**

`docs/architecture.md` specifies Cloudflare R2 with a `/wp-content/uploads/*` alias so image URLs
never change. Not implemented. Media currently sits in `public/uploads/` under the same relative
path, which makes the future move a copy plus a base-URL change.

---

# 8. CONTENT MIGRATION

## 8.1 WPBakery

Pages are authored with WPBakery. `post_content` is a mix of HTML and `[vc_*]` shortcodes:

```
[vc_row][vc_column][vc_column_text css=""]
<h2>Chimney Sweep &amp; Fireplace Services in Minneapolis, MN</h2>
…prose…
[/vc_column_text]
[vc_tta_accordion active_section="1" el_id="faq-minneapolis-mn"]
  [vc_tta_section title="Where do you provide chimney services?" tab_id="faq1"]
    [vc_column_text]We provide chimney services throughout Minneapolis, MN…[/vc_column_text]
  [/vc_tta_section]
[/vc_tta_accordion][/vc_column][/vc_row]
```

**The single most important structural fact in this project:** in a WPBakery accordion, the FAQ
**question is a shortcode attribute** (`title="…"`) while the **answer is the shortcode's inner
content**. Any extraction that strips whole shortcode tags keeps every answer and destroys every
question. That is exactly what happened to the original export (§22.1).

## 8.2 What this project does and does not do

**IMPORTANT ARCHITECTURAL FACT:** this project **does not render WPBakery content**. There is no
`wpbakery.ts`, no shortcode renderer, and no `raw_content` / `rendered_content` /
`content_outline` column. **NOT VERIFIED — those concepts belong to `chimcare-ma-pilot`, not here.**

Instead, this project **extracts structured facts** from `post_content` and renders them through
a designed React template:

| Extracted | Function | Rule |
|---|---|---|
| Areas served | `areasFrom()` | `<li>` items under "Areas We Serve"/"Serving Nearby", in page order, generic tail lines dropped |
| Local prose | `localSpecificsFrom()` | **Whole sentences** from the "Why … Is Important in {City}" paragraph. Never joined, split or rewritten |
| Intro neighbourhoods | `introNeighbourhoods()` | The two places named in the intro sentence, where present |
| FAQ | `faqsFrom()` | `title` attribute = question; inner content = answer. Both verbatim |
| Legacy pricing | `legacyPricingCopyFrom()` | Sentences containing a price range. Stored, never rendered |
| Markup defects | `markupDefectsFrom()` | Detection only, never repaired |

`cleanMarkup()` removes only builder scaffolding — HTML comments, shortcode tags, and
`<script>/<style>/<noscript>` blocks. **All prose survives exactly as written.**

**The raw `post_content` in WordPress is never modified.** It is read and left byte-for-byte
identical; the agent holds no write path to the database.

## 8.3 The Reveal animation — **NOT VERIFIED as an incident**

The brief asks about a "reveal/animation blank-content issue". `components/islands/Reveal.tsx` was
reviewed on 2026-09-05. It is correct as written:

- All content is present in the server HTML; the island only adds a fade-up class.
- `prefers-reduced-motion: reduce` → all elements are revealed immediately.
- No `IntersectionObserver` support → all elements are revealed immediately.
- `styles/base.css:54` also forces `opacity: 1` under reduced motion.

**No such bug was found, and none was fixed.** If this issue was observed elsewhere, it was in a
different project.

---

# 9. SEO MIGRATION

## 9.1 Three distinct values

| Term | Meaning | Where |
|---|---|---|
| **source** | What WordPress holds in `wp_postmeta` | `_yoast_wpseo_title`, `_yoast_wpseo_metadesc` |
| **stored_value** | What the migration wrote into Postgres | `cities.metaTitle`, `cities.metaDescription` |
| **rendered_value** | What the new page emits | Next.js `generateMetadata()` |

**Rule: rendered values are evidence, never a write-back source.** Reading the live WordPress page
and copying its rendered `<title>` into the database would import Yoast's runtime templating as if
it were authored content. The validation harness compares rendered against stored; it never
updates stored from rendered.

## 9.2 Yoast behaviour — **VERIFIED**

Yoast stores an explicit title/description **only when an editor typed one**. Otherwise it renders
from a template at request time and stores nothing.

**Measured on the Minnesota city pages:**
```sql
SELECT COUNT(*) FROM wp_posts p JOIN wp_postmeta m ON m.post_id=p.ID
WHERE m.meta_key='_yoast_wpseo_metadesc' AND …minnesota city pages…;
→ 14
```
Only the **14 branch pages** have an authored meta description. The 120 coverage pages have none.
The system therefore stores `null` for those 120 and the template supplies its own description.
**That null is correct and must not be "fixed" by generating descriptions.**

## 9.3 Structured data — **VERIFIED**

Built in `lib/content/assemble.ts`, emitted by `components/seo/JsonLd.tsx` as sibling `<script>`
tags with `<` escaped to `<`.

| Page variant | `@graph` types |
|---|---|
| Branch city | `WebPage` · `BreadcrumbList` · `HomeAndConstructionBusiness` (with `PostalAddress`, `GeoCoordinates`, `areaServed`, `hasOfferCatalog`) |
| Coverage city | `WebPage` · `BreadcrumbList` · `Service` (with `areaServed`, `provider`, `hasOfferCatalog`) |
| Service page | `WebPage` · `BreadcrumbList` · `Service` |

**`AggregateRating` and `Review` are never emitted.** This is a deliberate decision (Q5): the
rating source is unverified, so `branches.rating` is null and no rating markup is produced. The
validation harness asserts their absence on all 134 pages.

**WP Schema Pro — VERIFIED and deliberately NOT migrated.** WordPress carries a
`local-business-88926-*` field set. Inspection showed it is a **single global record**: every page
in both Minnesota and Massachusetts reports the same Boston HQ address
(`1 Marina Park Drive, Suite 1410`, Boston, 02210). It looks like per-city local SEO and is not.
Migrating it would attach a Boston address to every city in the country. **It is ignored, and this
is intentional.**

---

# 10. URLS AND REDIRECTS

## 10.1 Three outcomes

| Outcome | Meaning | Implementation |
|---|---|---|
| **DIRECT ROUTE** | The legacy URL renders a page | `pages` row, `status='published'` → dispatcher renders |
| **301 REDIRECT** | The legacy URL points elsewhere | `pages` row, `fate='redirect'`, `redirectTo` set → `permanentRedirect()` (308 in dev; the edge Worker will issue 301 in production) |
| **NO ROUTE / NO SOURCE** | Nothing exists | No `pages` row → 404. Gone URLs also 404 locally; the edge Worker will answer 410 |

## 10.2 The dispatcher — **VERIFIED**

`app/location/[slug]/page.tsx` is **one dynamic route for every legacy URL**. Legacy city and
service URLs share the `/location/` prefix and cannot be distinguished by pattern, so the database
row decides:

```
resolvePage(slug) → pages row
   fate = redirect          → permanentRedirect(redirectTo)
   status ≠ published       → notFound()
   kind = city              → <CityPage>   (+ gate re-check; withheld if it fails)
   kind = service           → <ServicePage>
   kind = legacy            → notFound()   (LegacyShell not built — PLANNED)
```

`trailingSlash: true` is set globally, so `/location/x` 308-redirects to `/location/x/`.

## 10.3 Minnesota URL results — **VERIFIED**

20,479 rows in `pages`:

| Kind | Count | | Fate | Count | | Status | Count |
|---|---|---|---|---|---|---|---|
| legacy | 16,077 | | publish_verbatim | 7,189 | | published | 12,457 |
| service | 4,251 | | redirect | 6,803 | | retired | 8,022 |
| city | 151 | | regenerate | 5,268 | | | |
| | | | gone | 1,219 | | | |

City page rows: 134 real + 17 redirect rows (3 live duplicates + 14 WordPress-recorded redirects).

## 10.4 `_wp_old_slug` — ⚠️ **CRITICAL FINDING, NOT USED, MUST NOT BE USED NAIVELY**

WordPress records former slugs in `_wp_old_slug` and auto-redirects them. **The agent does not read
this key.** Investigation on 2026-09-05 shows that is the correct decision.

**Measured:**
```
_wp_old_slug rows on the 134 Minnesota city pages     → 147
distinct old-slug values                              → 30
already covered by redirects.json                     → 12
```

The values are **not former URLs of those pages**. They are **page-duplication artifacts**. Minnesota
pages were created by copying Massachusetts pages, and WordPress recorded the source page's slug:

| Current page | Recorded `_wp_old_slug` |
|---|---|
| `chimney-sweep-fireplace-in-eden-prairie-mn` | `chimcare-chimney-sweep-in-boston-ma` |
| `chimney-sweep-fireplace-in-edina-mn` | `chimcare-chimney-sweep-in-boston-ma` |
| `chimney-sweep-fireplace-in-lake-elmo-mn` | `chimcare-chimney-sweep-in-boston-ma` |

**The ambiguity is severe:**
```sql
SELECT m.meta_value, COUNT(DISTINCT m.post_id) FROM wp_postmeta m …
→ chimcare-chimney-sweep-in-boston-ma              claimed by 75 pages
  worcester-chimney-sweep-copy                     claimed by 59 pages
  chimney-sweep-fireplace-services-in-lee-ma-copy  claimed by 58 pages
```

**Live behaviour today (verified against production):**
```
/location/chimcare-chimney-sweep-in-boston-ma/  → 301 → /location/chimney-sweep-repair-in-boston-ma/
/location/worcester-chimney-sweep-copy/         → 301 → /location/chimney-sweep-fireplace-services-in-lee-ma/
```

WordPress resolves these correctly today. **Building redirects from `_wp_old_slug` mechanically
would be a serious error** — one old slug maps to 75 different current pages, and a naive rule could
redirect a live Massachusetts URL to a Minnesota page.

**Status: deliberately NOT IMPLEMENTED. REQUIRES APPROVAL and a disambiguation rule before any use.**

## 10.5 The `/locations/*` legacy URLs — **KNOWN GAP, NOT IMPLEMENTED**

29 legacy URLs exist under `/locations/` in the fate maps, including
`/locations/chimcare-locations-in-minnesota/` and `/locations/chimcare-locations-in-massachusetts/`.

The new hubs live at `/locations/` and `/locations/{state}/`. **Nothing connects the old to the new,
so those 29 URLs currently 404 on the new site.** They are WordPress taxonomy archives, not
`job_listing` pages, so the agent never sees them. All 29 record zero clicks, which is why no signal
flagged them.

**Status: REQUIRES APPROVAL** — the redirect targets depend on the unresolved state-slug decision (Q2b).

---

# 11. MINNESOTA IMPLEMENTATION

**All figures below were re-verified on 2026-09-05** by reading `data/seed/mn.migration.json`,
`mn.ledger.json`, `minnesota.media.json`, `minnesota.faq.json` and by a fresh agent run.

## 11.1 City inventory

| Group | Count | Meaning |
|---|---|---|
| **Total city rows** | **150** | Everything in the `cities` table for Minnesota |
| ├ Branch cities | 14 | An office exists; hand-authored WordPress pages |
| ├ Coverage cities with a WordPress page | 120 | Generated WordPress pages |
| └ Cities with **no** WordPress city page | 16 | Service pages only; **no page row, no URL created** |
| **Existing city pages migrated** | **134** | 14 branch + 120 coverage |
| Duplicate city pages redirected | 3 | Coverage-style duplicates of Apple Valley, Maple Grove, Eagan |

Derivation: 137 live city pages match the slug patterns; 3 are duplicates of branch cities and
become redirects; 134 become city rows. Plus 16 no-source cities = 150 rows.

## 11.2 Publication outcome — **VERIFIED**

```
GATE     109 publishable · 25 needs_review  (gate unchanged)
```

### Why 109 publish

They satisfy every gate condition from source data alone: a serving branch, at least four named
areas, at least two local prose lines, a hero image, and at least one page-specific FAQ.

### Why 25 are held — **these are not "bad cities"**

They are **existing WordPress pages whose source data does not meet the publication threshold**.
Nothing is wrong with them as migrations; all 25 are fully migrated, stored and renderable.

| Pages | Kind | Missing from source |
|---|---|---|
| 11 | branch | Fewer than 4 areas **and** no local prose |
| 9 | coverage | Only 1 of the 2 required local lines |
| 3 | branch | No local prose (Minneapolis, St. Paul, West Minneapolis have 5 areas) |
| 2 | coverage | No serving branch (Farmingon slug typo; St. Anthony rejected geocode) |

The 14 branch pages fail structurally: WordPress lists only "Downtown / East / West {City}" for
them, and their copy has no "Why … Is Important in" paragraph to take a local line from. Publishing
them would require **writing content**, which the system exists to prevent.

## 11.3 Content recovery — **VERIFIED**

| Item | Result |
|---|---|
| FAQ pairs recovered | **642** across all 134 pages (656 across 137 including duplicates) |
| Pages with zero FAQ | 0 |
| Recovery problems | 0 |
| Source | `wp_posts.post_content`, `[vc_tta_section title="…"]`, read-only |

## 11.4 Media — **VERIFIED**

134/134 heroes, 15 distinct attachments, 15/15 verified, 0 problems, 4,670,577 bytes.
See §7.3.

## 11.5 Coordinates and serving branches — **VERIFIED**

| Source | Count |
|---|---|
| From WordPress geo meta | 14 |
| From geocoder (cached, 135 entries) | 118 |
| None (rejected or absent) | 2 |

| Branch assignment | Count |
|---|---|
| `own` (the city's own office) | 14 |
| `nearest` (**DERIVED, unverified**) | 118 |
| `none` | 2 |

**Every one of the 118 nearest-branch assignments is flagged `nearest_branch_unverified`.** They are
guesses at coverage, not confirmed territories.

## 11.6 Review flags — **VERIFIED**

**454 flags total**, by provenance category:

| Category | Flags | Codes |
|---|---|---|
| **SOURCE_QUALITY_FLAG** | 297 | `hero_image_wrong_state_label` 121 · `hero_image_not_city_specific` 120 · `insufficient_source_local_copy` 23 · `source_markup_defect` 20 · `insufficient_source_areas` 11 · `legacy_slug_typo` 1 · `hero_image_missing_alt` 1 |
| **BUSINESS_UNVERIFIED** | 154 | `nearest_branch_unverified` 118 · `legacy_pricing_conflict` 34 · `office_location_conflict` 2 |
| **DERIVED** | 3 | `no_serving_branch` 2 · `geocode_rejected` 1 |

## 11.7 Source-quality findings

1. **Malformed shortcodes — 20 pages.** `</vc_column_text]` instead of `[/vc_column_text]`.
   Detected from raw `post_content`, flagged, **never repaired**.
2. **A Boston photograph is the hero on 120 Minnesota pages.** File
   `chimney-sweep-boston-MA.jpg`, alt `chimney-sweep-boston-MA`. It is the genuine WordPress hero,
   so it was migrated exactly and flagged twice.
3. **Saint Paul's hero is `Saint-PaulMA.webp`**, alt "Saint Paul,MA" — labelled Massachusetts.
4. **One hero has no alt text at all** (Wayzata). None was written.
5. **34 pages quote conflicting prices** in their own copy.
6. **`chimney-sweep-repair-in-farmingon-mn`** is a misspelled slug alongside a correct Farmington page.
7. **St. Louis Park and Brooklyn Center** are classified coverage, yet branch offices sit in them.
8. **Three geocodes resolved to the wrong place** (Becker, Grant, St. Anthony). Coordinates
   **dropped, not guessed**.

## 11.8 Idempotency — **VERIFIED 2026-09-05**

```
unchanged since last     134
source changes           0
content checksum changes 0
media checksum changes   0
SEO differences          0
URL differences          0
duplicates created       slugs 0 · wp ids 0 · media 0
media                    15 assets · 15 reused · 0 downloaded
```

Two consecutive `--apply` runs previously produced **byte-identical** dataset and ledger.

**Ledger integrity:** 134 rows · 134 distinct WordPress IDs · 134 distinct URLs · statuses
`publishable: 109, needs_review: 25`.

## 11.9 Perturbation test — **VERIFIED (earlier in the project)**

Change detection was proven by deliberately corrupting the agent's **own ledger** (never WordPress)
for two pages, then re-running. The agent correctly reported 1 source change, 1 content-checksum
change, 1 media-checksum change, 1 SEO difference and 1 URL difference, then restored cleanly.

## 11.10 Dry-run default — **VERIFIED**

The agent runs in dry-run mode unless `--apply` is passed. A dry run fetches, maps, gates, validates
and reports, and writes **no dataset, no ledger and no media**.

---

# 12. MINNESOTA HUB / FRONTEND

## 12.1 Current state — **VERIFIED 2026-09-05**

```
loc cards : 150 cities | 41 in review | 109 linked
migration : SOURCE_PAGE_PUBLISHABLE=109 NO_SOURCE_PAGE=16 SOURCE_PAGE_INCOMPLETE=25
```

All 109 linked cards resolve to HTTP 200. **Zero broken links.**

## 12.2 Why 41 cards do not link

| Cards | Reason |
|---|---|
| 16 | No WordPress city page exists → no URL to link to |
| 11 | Branch cities: 3 areas, no local prose |
| 9 | Coverage cities: 1 of 2 local lines |
| 3 | Minneapolis, St. Paul, West Minneapolis: no local prose |
| 2 | Farmingon, St. Anthony: no serving branch |

## 12.3 ⚠️ Known frontend defects — **IMPLEMENTED but WRONG, not yet fixed**

### 12.3.1 Card hero images are missing

**VERIFIED:** `lib/content/assemble-hubs.ts:62`
```js
photo: branch?.photoKey && isBranch ? { src: '/' + branch.photoKey, … } : undefined
```
The card asks for **`branch.photoKey`**, which `data/seed/minnesota.ts:173` sets to `null` for every
branch, and which coverage cities do not have at all. Result: **all 150 cards render the "no-image"
header**, while all 134 city hero images sit unused in `public/uploads/`.

**Correct source:** the city's own `heroImageKey`. The fix is one line in the hub assembly and
would use genuine WordPress heroes, so it does not breach any preservation rule.

**Status: DEFECT — fix not applied. Minnesota is the locked regression baseline and this is hub
presentation, not migration logic. REQUIRES APPROVAL.**

### 12.3.2 Misleading "Page in review" label

The 16 no-source cities show the same "Page in review" label as the 25 genuinely awaiting content.
They are not in review — no page exists to review. The label is also written for the migration team,
not for a homeowner, who sees a card for their town with no way to book despite a serving crew and
phone number being present on the card.

**Status: DEFECT — REQUIRES APPROVAL** on which treatment to apply.

### 12.3.3 Map is a placeholder

`components/templates/StateHub.tsx` renders a static panel reading "Map island (Leaflet, M3) mounts
here — 150 pins". Leaflet is **milestone M3 and is not built**. Coordinates are ready: 132 of 150
cities have latitude and longitude; 3 lack them deliberately (rejected geocodes).

**Status: PLANNED (M3).**

## 12.4 UI gating vs migration correctness

**These are separate concerns and must stay separate.** A card without a link is a *presentation*
decision about what a visitor sees. It says nothing about whether the page migrated correctly — all
134 migrated correctly and all 134 pass all 15 validation checks. The admin board is where migration
status belongs; the public hub is where visitor experience belongs.

---

# 13. MASSACHUSETTS — ⚠️ ANALYSIS AND PLAN ONLY

> **NOTHING IN THIS SECTION IS IMPLEMENTED.** No Massachusetts configuration exists in
> `scripts/migrate/states.mjs` (**VERIFIED** — the `STATES` object contains only `mn`). No dataset,
> no ledger, no media, no dry run has been executed.

## 13.1 Inventory — **VERIFIED by read-only survey**

| Metric | Value |
|---|---|
| Hand-authored pages (region taxonomy) | 26 |
| Generated coverage-style pages (slug patterns) | 217 |
| In both sets | 6 |
| **Distinct city pages** | **~237** |
| Branches on the business list | 23 (all 23 have a page) |
| Coverage duplicates of branch cities | 17 |
| Genuine coverage cities | 194 |
| Live legacy URLs ending in `-ma` | 35,247 |
| Distinct hero attachments across both layers | **25** |

## 13.2 The two layers

| Layer | Pages | Characteristics | Fits config? |
|---|---|---|---|
| **Coverage, generated** | 217 | Titled "Chimney Sweep & Repair in {City}, MA". 211 FAQ accordions, 211 areas lists, 210 "why" paragraphs, 26 markup defects. Only 6 have coordinates. 212 share the Boston hero. | **Yes** — same patterns, same extractors |
| **Branch, hand-authored** | 26 | Four slug shapes; **17 have no state suffix at all** (`quincy-chimney-sweep`). No FAQ accordion, no areas list, no "why" paragraph. All have hero, meta description and job location. 19 have an inline body image. | **No** — needs new selection, parsing, extraction |

## 13.3 Why the taxonomy count of 26 is misleading

The `job_listing_region` taxonomy tags only the hand-authored layer. **Minnesota has the identical
gap:** its taxonomy tags 14 pages (the branch pages), while 137 match by slug. Had the taxonomy been
used as the criterion for Minnesota, 120 of the 134 pages now migrated would not exist.

The `chimcare-ma-pilot` project used the taxonomy and concluded "26, not 100". It was measuring the
branch layer and did not detect the coverage layer.

## 13.4 Content quality measurement — **VERIFIED by analysis**

| Test | MA coverage (195) | MN coverage (120) |
|---|---|---|
| Body text unique after swapping the town name | 195 | 120 |
| FAQ answers unique | 195 | 120 |
| Local "why" paragraph present and unique | 189 | 115 |
| Names a real local place (not "East Lowell") | **178** | **120** |

**17 Massachusetts coverage pages contain directional filler only** — Lowell, Brockton, Plymouth,
Arlington, Belmont, Revere, Malden, Fitchburg, Chicopee and others. Minnesota had none like this.
The current gate counts area *entries*, not quality, so those 17 would pass. Holding them back
would be a **new rule** and the first time the gate judged quality rather than presence.
**REQUIRES APPROVAL.**

## 13.5 Predicted outcome — **PREDICTION, NOT RESULT**

| Group | Pages | Expected status | Basis |
|---|---|---|---|
| Coverage cities | 194 | mostly publishable, ~175 | Minnesota published 109/120 |
| Hand-authored branch pages | 26 | **all needs_review** | No areas list, no local prose in a readable form |
| Duplicates of branch cities | 17 | redirect | Minnesota's 3 were handled this way |

## 13.6 Required agent changes — **ALL PLANNED**

| | Change | Why | Kind | Touches MN? |
|---|---|---|---|---|
| **A** | Geocode inside the agent, cached per state | 211 coverage pages have no coordinates. Bounded to MA because Concord, Lexington, Milton, Newton, Canton all exist elsewhere | agent | No |
| **B** | Build the legacy URL universe in the agent | The 35,247 rows currently come from the MN-only pilot builder | agent | Must reproduce MN's 20,479 exactly |
| **C** | Multi-state mapper and seed | The app's mapper loads one hard-coded state | app | MN rows must be unchanged |
| **D** | Select and parse the hand-authored layer | Taxonomy selection; city name from `quincy-chimney-sweep`; branch match without postcode | agent | No |
| **E** | Inline body images as a second media class | 19 of 26 embed an image the hero-only download never sees | agent | No |
| **F** | Per-state duplicate rule | Currently MN-specific slug matching | config | MN's 3 redirects must survive |

**Each change lands alone, followed by the Minnesota regression. If 134/109/25 moves, revert.**

## 13.7 Decisions required before any Massachusetts dry run

**ALL REQUIRE APPROVAL.** D1 confirm the two-layer model · D2 classify Eastham, Lee, Hopkinton
(not branches; two have no job location; Hopkinton's postcode `07148` is in New Jersey) ·
D3 confirm the 20 suffix-less slugs are canonical · D4 state URL (`/locations/ma/` vs
`/locations/massachusetts/`) · D5 redirect the 17 duplicates · D6 confirm Massachusetts pricing ·
D7 approve geocoding bounds · D8 confirm showrooms and metro hubs are out of scope.

## 13.8 The separate `chimcare-ma-pilot` project

A sibling project exists at `../chimcare-ma-pilot`. Its README declares phase 1 implemented and
phases 2–8 "pending approval", **but its data directories contain 26 raw, 26 transformed, 26
live-html and 17 report files**, suggesting later phases were run. It targets a different schema
(§the corrections section) and uses taxonomy-only selection.

**Status: SEPARATE PROJECT. Its relationship to this repository is undefined. REQUIRES A DECISION**
on whether it is superseded.

---

# 14. VALIDATION / QA

## 14.1 The 15-check harness — **IMPLEMENTED + VERIFIED**

`scripts/migrate/validate.mjs`, one implementation used by both the agent and
`scripts/validate-render.mjs`. Publishable pages are checked on their **public legacy URL**;
held pages on the **admin preview**, which uses the same template.

| # | Check | Asserts |
|---|---|---|
| 1 | `template` | HTTP 200 and the `tpl-city` marker — the one shared template |
| 2 | `legacy_url` | Exact legacy URL serves; the slashless form 301/308-redirects |
| 3 | `title_h1` | H1 and `<title>` name the source city exactly |
| 4 | `faq` | **Every** source FAQ question and answer appears verbatim |
| 5 | `hero_path` | The WordPress uploads path is in the markup |
| 6 | `hero_file` | File exists · **SHA-256 matches** · byte count matches WordPress · original filename · WordPress's own alt rendered |
| 7 | `seo_meta` | Canonical is self; description matches the source when the source has one; preview is noindex |
| 8 | `local_seo` | Branch phone present; street address on branch pages only, never on coverage |
| 9 | `structured_data` | JSON-LD parses; correct business type per variant; city in `areaServed`; **no AggregateRating/Review** |
| 10 | `breadcrumbs` | Home › Locations › State › City, with correct hub hrefs |
| 11 | `services` | 92 cards; link count equals the number of published service pages |
| 12 | `links` | **Every internal link on the page resolves** (shared status cache) |
| 13 | `cta_contact` | Region prices, booking form, correct phone |
| 14 | `chrome` | Header, footer, state hub link, national phone, trust line |
| 15 | `no_rewrite` | **Rendered areas list equals the source list, in source order** |

## 14.2 Results — **VERIFIED 2026-09-05**

```
Validating 109 publishable (public URLs) + 25 incomplete (admin preview) = 134 migrated pages

  template 134/134   legacy_url 134/134   title_h1 134/134   faq 134/134
  hero_path 134/134  hero_file 134/134    seo_meta 134/134   local_seo 134/134
  structured_data 134/134   breadcrumbs 134/134   services 134/134   links 134/134
  cta_contact 134/134   chrome 134/134    no_rewrite 134/134

  no-source cities uncreated   16/16
  All checks passed on all pages.
```

## 14.3 Responsive — **VERIFIED 2026-09-05**

```
18/18 viewport checks with no horizontal overflow.
```

Six representatives × 390 / 834 / 1440 px, measured through the **Chrome DevTools Protocol with
device-metrics emulation**, comparing `document.scrollWidth` against `window.innerWidth` and naming
offending elements.

**Methodological note:** plain `--window-size` screenshots mis-render mobile layout and produced a
false positive early in the project. Use `scripts/check-responsive.mjs`, not screenshots.

## 14.4 Dataset comparison — **VERIFIED 2026-09-05**

14 dimensions compared between the pilot artefact and the agent dataset:

```
city count · WordPress post IDs · slugs · URLs · source content · source fields ·
SEO values · local SEO · FAQ data · area data · media metadata · media SHA-256 ·
publishable/needs_review status                          → ALL IDENTICAL

review flags                                             → 3 difference(s)
```

The 3 differences are Lauderdale, Mound and Roseville gaining `source_markup_defect`. The agent
detects the defect directly from raw `post_content`; the pilot inferred it indirectly and missed
these three, where the defect sits after the accordion opens so only part of the FAQ was lost.
**The agent is strictly more accurate.**

## 14.5 Route smoke test — **VERIFIED 2026-09-05**

`scripts/check-pages.mjs` — "all checks passed", covering hubs, a publishable city page, a held
page 404, admin routes, service pages, redirects, gone URLs, and a booking POST/GET round-trip.

## 14.6 What "PASS" actually means

A pass means: **the rendered page matches the migrated data, and the migrated data matches
WordPress.** Specifically — every FAQ question and answer appears verbatim; the hero file's SHA-256
matches the bytes WordPress serves; the areas list is byte-identical and in source order; the
canonical URL is the legacy URL; and no invented content appears anywhere.

**A pass does NOT mean:** the page is good, the content is accurate, the business facts are correct,
the images are appropriate, or the page should be published. Those are human judgements. The 120
pages carrying a Boston photograph all pass check 6.

---

# 15. CURRENT STATUS

| Area | Status | Evidence | Remaining work |
|---|---|---|---|
| **Migration agent** | **VERIFIED** | Fresh dry run 2026-09-05; 0 duplicates; idempotent | Changes A–F for multi-state (§13.6) |
| **Minnesota migration** | **VERIFIED** | 134 pages · 109/25 · 642 FAQs · 134 heroes | 25 held pages need business decisions |
| **Validation harness** | **VERIFIED** | 15/15 × 134, 2026-09-05 | Extend when new page types appear |
| **Responsive** | **VERIFIED** | 18/18 clean, 2026-09-05 | Wider sample when more states land |
| **Next.js app** | **IMPLEMENTED** | Runs locally; all routes pass | LegacyShell; Leaflet map (M3); hub card images |
| **Database (PGlite)** | **VERIFIED** | 20,479 page rows seeded | — |
| **Database (Supabase)** | **PLANNED** | `.env.example` only; never connected | Provision, migrate, seed, verify |
| **Media (local)** | **VERIFIED** | 15 assets, 15 verified, 0 problems | — |
| **Media (R2)** | **PLANNED** | architecture doc only | Bucket, upload, uploads alias, loader |
| **Cloudflare** | **PLANNED** | architecture doc only | Worker, KV, WAF, cache |
| **Deployment** | **NOT CONFIGURED** | No vercel.json/wrangler.toml/.github/Dockerfile | **Resolve Cloud Run vs Vercel first** |
| **SEO** | **IMPLEMENTED + VERIFIED** | Checks 7, 9, 10 pass | sitemap.ts, robots.ts not built |
| **URL routing** | **IMPLEMENTED** | Dispatcher verified | Edge 301/410; `/locations/*` legacy gap |
| **Redirects** | **PARTIAL** | In-app 308 works | Edge Worker; `_wp_old_slug` unresolved |
| **Frontend (hub)** | **DEFECTS OPEN** | §12.3 | Card images; card labels; map |
| **Massachusetts** | **PLAN ONLY** | Survey verified; no config exists | 8 decisions, then changes A–F |
| **Publishing** | **NOT STARTED** | Nothing published | **REQUIRES APPROVAL** |
| **Booking → Workiz** | **MOCK ONLY** | `MockAdapter` in use | Real adapter, Turnstile, retry, email |

---

# 16. WHAT IS SAFE TO DO NOW

Nothing here modifies WordPress, source content, or published output.

- ✅ Run the agent in **dry-run** mode against any state (default mode; writes nothing)
- ✅ Run the **15-check harness** against a running server
- ✅ Run the **responsive** measurement
- ✅ Run the **dataset comparison**
- ✅ Run `npm run typecheck`
- ✅ **Read-only WordPress surveys** for any state
- ✅ Add a **state configuration** entry (config only, then regress Minnesota)
- ✅ Fix **frontend defects** in §12.3 (hub card images, labels) — presentation only
- ✅ Re-run **apply** for an already-migrated state (idempotent, byte-identical)
- ✅ Review the **admin board** and preview any held page
- ✅ Extend **validation checks** (only ever stricter)

---

# 17. WHAT REQUIRES APPROVAL

| Decision | Why it needs a human |
|---|---|
| **Publishing any page** | Publication is separate from migration, by design |
| **Activating redirects** | Especially anything derived from `_wp_old_slug` (§10.4) |
| **Creating pages for the 16 no-source cities** | No WordPress source exists; this is content creation |
| **Writing content for the 25 held pages** | Would breach the core rule if done automatically |
| **Pricing conflicts** (34 MN pages) | The source contradicts the price sheet |
| **State URL slug** (Q2b) | `/locations/mn/` vs `/locations/minnesota/`; blocks the `/locations/*` redirects |
| **Duplicate city URL handling** | 3 in MN (done), 17 in MA (pending) |
| **Hand-authored page handling** (MA's 26) | Cannot publish without new extractors or content |
| **Geocoding policy** | Bounding, thresholds, what to do with rejects |
| **Nearest-branch territories** | 118 MN assignments are guesses |
| **Deployment target** | Cloud Run vs Vercel — unresolved contradiction |
| **Any source modification** | Fixing the 20 markup defects, replacing the Boston hero, correcting the Farmingon slug — **all belong in WordPress, not here** |
| **Massachusetts scope** (D1–D8) | Eight decisions in §13.7 |
| **Gate changes** | Never loosened. Any change must be deliberate and regression-tested |

---

# 18. FUTURE STATE MIGRATION PROCESS

```
 1. ANALYZE STATE          Read-only survey: page counts by slug pattern AND by taxonomy.
                           They will disagree — establish which identifies city pages.
 2. INVENTORY WORDPRESS    Content shape: FAQ accordions? areas lists? "why" paragraphs?
                           Media: heroes only, or inline body images too?
                           Meta: which SEO keys are actually populated?
 3. CHECK DUPLICATE POSTMETA   Run the §5.3 query. Duplicates break the JOINs.
 4. IDENTIFY BRANCH PAGES  Cross-reference branches.json against page slugs and _job_location.
 5. IDENTIFY COVERAGE PAGES   The generated layer.
 6. IDENTIFY NO-SOURCE CITIES Cities with service pages but no city page. NEVER create pages.
 7. IDENTIFY DUPLICATES    Coverage-style pages for branch cities → redirect candidates.
 8. STOP IF STRUCTURE IS NEW   Report. Do not modify the generic agent automatically.
 9. ADD CONFIGURATION      One STATES entry. Gate thresholds unchanged.
10. RUN MINNESOTA REGRESSION  Must stay 134 / 109 / 25. If it moves, revert.
11. DRY-RUN THE NEW STATE  Writes nothing.
12. REVIEW THE REPORT      All 17 inventory points. → APPROVAL GATE
13. APPLY                  Writes dataset, ledger, media.
14. RE-RUN APPLY           Must be byte-identical. Proves idempotency.
15. LOAD DATABASE          Reseed; confirm row counts.
16. VERIFY MEDIA           Every SHA-256 matches; no renames; no conversions.
17. WIRE NEXT.JS           Mapper reads the new dataset.
18. RUN THE 15 CHECKS      Every page in the new state.
19. RUN URL VALIDATION     Legacy URLs, trailing slashes, redirects, gone.
20. RUN RESPONSIVE TESTS   390 / 834 / 1440 on representatives.
21. RE-RUN MINNESOTA       Full suite. Both states must pass together.
22. APPROVAL               → Publishing is a separate decision.
23. DEPLOY                 Once a target exists.
24. MONITOR                404s, 301 chains, Search Console.
25. ROLLBACK IF REQUIRED   §20.
```

---

# 19. FUTURE STATES

**VERIFIED** structural survey (city pages by Minnesota's slug patterns, with content markers):

| State | City pages | FAQ accordion | Areas block | Hero | Branches | Assessment |
|---|---|---|---|---|---|---|
| **Georgia** | 118 | 117 | 117 | 118 | 10 | **Most likely next.** Structurally closest to Minnesota |
| Wisconsin | 157 | 157 | 157 | 157 | 5 | Looks Minnesota-shaped |
| Illinois | 141 | 141 | 141 | 141 | 16 | Looks Minnesota-shaped |
| Washington | 249 | 249 | 249 | 249 | 14 | Looks Minnesota-shaped |
| Ohio | 304 | 304 | 303 | 304 | 14 | Looks Minnesota-shaped; mixed slug forms in taxonomy layer |
| Oregon | 271 | 271 | 253 | 270 | 3 | Mostly; 18 pages lack an areas block |
| California | 616 | 616 | 501 | 616 | 4 | Largest; 115 pages lack an areas block |
| Massachusetts | 217 + 26 | 211 | 211 | — | 23 | **Two layers; see §13** |

**No state is ready until it has been surveyed in full (§18 steps 1–7).** These markers indicate a
*likely* fit for the existing configuration; they do not confirm one. The Massachusetts experience
shows that the hand-authored layer is invisible to slug-pattern counting.

---

# 20. ROLLBACK STRATEGY

## 20.1 The foundation

**WordPress is never modified, so it is always a complete, current rollback target.** Verified after
every apply run: row count and maximum `post_modified` unchanged.

## 20.2 Layered rollback

| Layer | Mechanism | Status |
|---|---|---|
| **DNS / traffic** | Point back at WordPress. Instant, total. | **PLANNED** (Cloudflare) |
| **Edge redirects** | KV entries are additive; delete to revert | **PLANNED** |
| **Application** | Redeploy the previous build | **NOT CONFIGURED** |
| **Database** | Re-seed from a previous dataset; PGlite is disposable | **VERIFIED** locally |
| **Dataset** | `<state>.migration.json` + `.ledger.json` are versionable files | **IMPLEMENTED** |
| **Media** | Additive only. Nothing is renamed, overwritten or deleted at source | **VERIFIED** |
| **Publication** | Flip `pages.status` back to `review` | **IMPLEMENTED** |

## 20.3 Why staging matters

Migration, publication and deployment are three separate steps. A page can be migrated and validated
for weeks before anyone considers publishing it. That separation means a rollback is almost always
"do not publish" rather than "undo a publish".

## 20.4 Run identity

The ledger records `source_checksum`, `content_checksum` and `media_checksums` per page, so any two
runs can be compared exactly. **`migration_runs` as a table does not exist here** — that is
`chimcare-ma-pilot`'s model. **NOT VERIFIED in this repository.**

---

# 21. COMMANDS

## 21.1 From `package.json` — **VERIFIED**

```bash
npm install                  # install dependencies
npm run dev                  # dev server; PGlite migrates + seeds on first request
npm run build                # production build
npm start                    # serve the production build
npm run typecheck            # tsc --noEmit    (must pass before finishing work)
npm run db:generate          # drizzle-kit generate — regenerate migrations after schema edits
npm run seed                 # tsx scripts/seed.ts
npm run seed -- --reset      # truncate and reseed
npm run port:css -- <dir>    # regenerate styles/* from the design mocks
```

**There is no `npm run lint` and no `npm test`. NOT VERIFIED / do not invent them.**

## 21.2 Migration agent — **VERIFIED**

```bash
# Dry run (DEFAULT — writes nothing)
node scripts/migrate/agent.mjs --state mn --dry-run

# Dry run with the Minnesota regression comparison
node scripts/migrate/agent.mjs --state mn --dry-run \
  --regress data/seed/minnesota.generated.json

# Skip the render/validate stage (no server needed)
node scripts/migrate/agent.mjs --state mn --dry-run --no-render

# Apply — writes dataset, ledger, downloads missing media
node scripts/migrate/agent.mjs --state mn --apply

# Machine-readable report
node scripts/migrate/agent.mjs --state mn --dry-run --report /tmp/report.json
```

Options: `--state` · `--dry-run` / `--apply` · `--base <url>` · `--regress <file>` ·
`--report <file>` · `--no-render` · `--host` · `--user` · `--db`

## 21.3 Validation — **VERIFIED**

```bash
node scripts/validate-render.mjs http://localhost:3000            # the 15 checks × every page
node scripts/check-pages.mjs http://localhost:3000                # route smoke test + booking
node scripts/migrate/compare-datasets.mjs                         # pilot vs agent, 14 dimensions
node scripts/check-responsive.mjs http://localhost:3000 \
  --url /location/chimney-sweep-repair-in-bloomington-mn/ \
  --widths 390,834,1440 --shots /tmp/shots                        # real overflow measurement
```

## 21.4 Legacy / superseded — **VERIFIED to exist**

```bash
node scripts/build-mn-seed.mjs [--dry-run] [--no-geocode]   # still produces the URL universe
node scripts/recover-mn-faqs.mjs                            # superseded by the agent
node scripts/recover-mn-media.mjs                           # superseded by the agent
```

## 21.5 Prerequisites

- Node 22+, MySQL client on PATH, the local `chimcare_local` database running
- Sibling directories `../Chimcare-Migration` and `../chimcare-rebuild-main`
- Network access to `https://www.chimcare.com` for media downloads
- Chrome (for `check-responsive.mjs`)

---

# 22. TROUBLESHOOTING

## 22.1 FAQ questions missing after extraction — **RESOLVED**

**Problem.** Every FAQ answer survived extraction; every question vanished. All 134 pages appeared
to have no FAQ, blocking publication.

**Cause.** In WPBakery, the question is the `title` **attribute** of `[vc_tta_section]` and the
answer is the shortcode's **inner content**. The original extraction stripped whole shortcode tags
with a generic regex, deleting the attribute and keeping the content.

**Fix.** Read questions directly from `wp_posts.post_content` (`faqsFrom()` in `source.mjs`).
Nothing reconstructed or paraphrased.

**Status: RESOLVED. 642 pairs recovered across all 134 pages, 0 failures.**
**Regression protection:** validation check 4 asserts every source FAQ appears verbatim.

## 22.2 Malformed WPBakery source markup — **DETECTED, NOT REPAIRED**

**Problem.** On 20 pages the export had lost the entire FAQ section, not just the questions.

**Cause.** The WordPress copy closes a shortcode with `</vc_column_text]` instead of
`[/vc_column_text]`. A shortcode strip leaves the stray token, and an HTML parser then swallows
everything after it.

**Fix.** Detection only, from raw `post_content` (`markupDefectsFrom()`), flagged
`source_markup_defect`. **The source is not repaired — the fix belongs in WordPress.**

**Status: 20 pages flagged.** The agent's direct detection found 3 more than the pilot's indirect
inference (Lauderdale, Mound, Roseville), where the defect sits after the accordion opens.
**Regression protection:** dataset comparison surfaces any change in the flag count.

## 22.3 Geocoding conflicts — **RESOLVED by rejection**

**Problem.** Becker, Grant and St. Anthony returned coordinates 166, 139 and 71 km from their
nearest branch.

**Cause.** Same-named places elsewhere in Minnesota — Becker County, Grant County, and St. Anthony
in Stearns County rather than the village next to Minneapolis.

**Fix.** Listed in `states.mjs` → `rejectedGeocodes`. Their **coordinates are dropped, not
guessed**, and the city is flagged `geocode_rejected`. A generic rule also flags anything beyond
`farFromBranchKm` (88 km).

**Status: RESOLVED.** Consequence: St. Anthony has no serving branch and cannot publish. That is
correct — a guessed coordinate would be worse.
**Regression protection:** the distance rule catches new cases automatically.

## 22.4 Branch matching / postcode defects — **RESOLVED**

**Problem.** Branch matching failed for Apple Valley, Lakeville and Maple Grove.

**Cause.** The postcode regex matched the **street number**: `14870 Granada Ave, Apple Valley, MN
55124` begins with a five-digit number.

**Fix.** Match on the street number **plus** the branch's own postcode appearing anywhere in the
location text, rather than parsing a postcode out of the string.

**Status: RESOLVED — 14/14 branches match.**
**Known Massachusetts risk:** 12 of 26 job locations have no usable postcode; Medford's is stored as
`2155` (leading zero lost) and Hopkinton's `07148` is a New Jersey code. **PLANNED change D.**

## 22.5 Minnesota hub card images — ⚠️ **OPEN DEFECT**

**Problem.** No city card on `/locations/mn/` shows an image.

**Cause.** `assemble-hubs.ts:62` reads `branch.photoKey`, which is null for every branch and absent
on coverage cities. Meanwhile all 134 real hero images sit unused in `public/uploads/`.

**Fix (not applied).** Point the card at the city's own `heroImageKey`.

**Status: OPEN. REQUIRES APPROVAL** — Minnesota is the locked regression baseline.

## 22.6 False-positive responsive failure — **RESOLVED (methodology)**

**Problem.** Screenshots at 390 px showed content clipped off-screen.

**Cause.** Chrome `--window-size` without device-metrics emulation mis-renders mobile layout.

**Fix.** `scripts/check-responsive.mjs` uses the DevTools Protocol with
`Emulation.setDeviceMetricsOverride`, compares `document.scrollWidth` to `window.innerWidth`, and
names offenders. A settle step and a blank-page step between measurements remove a transient
off-canvas artefact.

**Status: RESOLVED — 18/18 clean.** **Lesson: never diagnose responsive behaviour from a
`--window-size` screenshot.**

## 22.7 Duplicate postmeta — **LATENT RISK, NOT YET HIT**

See §5.3. Not present in Minnesota; **must be re-tested for every new state**.

## 22.8 Issues in the brief with no evidence here

PostgreSQL 16 · PHP-serialization failure · MySQL CLI newline/checksum · reveal-animation blank
content · nested JSON-LD · Adminer — **all NOT VERIFIED.** See the corrections section.

---

# 23. ENGINEERING PRINCIPLES

These are permanent. They are not preferences.

1. **WordPress is the source of truth.**
2. **Never modify WordPress.** SELECT and GET only.
3. **Preserve source exactly.** Byte-for-byte where it is bytes; word-for-word where it is words.
4. **Preserve URLs.** A legacy URL either serves, redirects deliberately, or is deliberately gone.
5. **Preserve media exactly.** No rename, no re-encode, no resize, no substitution.
6. **Never invent missing information.** Missing stays missing, and gets flagged.
7. **Separate source from derived data.** Structurally, in different objects — not by convention.
8. **One reusable migration agent.** Not one per state.
9. **State differences belong in configuration.** If a state needs code, stop and report first.
10. **Minnesota is the regression baseline.** 134 / 109 / 25 must survive every change.
11. **Dry-run before apply.** Dry run is the default.
12. **Apply must be idempotent.** Two runs, byte-identical output, nothing re-downloaded.
13. **Validate before publishing.** All 15 checks, on every page.
14. **Publishing is separate from migration.** A page can be migrated for months without publishing.
15. **Every exception must be explicitly flagged**, with a provenance category and a human-readable
    reason.

---

# 24. FINAL CHECKLIST FOR ANY FUTURE STATE

### Source
- [ ] Read-only access confirmed; no write path exists
- [ ] Page counts established by **both** slug pattern and taxonomy; disagreement explained
- [ ] Branch layer vs coverage layer identified
- [ ] No-source cities identified (pages will **not** be created for them)
- [ ] Duplicate city pages identified
- [ ] **Duplicate postmeta test run (§5.3)**
- [ ] Content shape confirmed: FAQ accordions, areas lists, "why" paragraphs
- [ ] New structures reported and approved before any agent change

### Data
- [ ] Every field mapped to SOURCE, DERIVED, BUSINESS_UNVERIFIED or SOURCE_QUALITY_FLAG
- [ ] No derived value stored as if it were source
- [ ] Checksums computed: source, content, media
- [ ] Ledger written; wp_id / URL / slug uniqueness confirmed

### Content
- [ ] FAQ questions and answers verbatim; count matches source
- [ ] Areas in source order; no additions
- [ ] Local prose lifted as whole sentences
- [ ] Conflicting pricing copy preserved and flagged, never rendered
- [ ] Markup defects flagged, never repaired

### SEO
- [ ] Yoast title/description migrated where present; null where absent
- [ ] Canonical is the legacy URL
- [ ] JSON-LD correct per variant; **no AggregateRating/Review**
- [ ] Breadcrumbs correct
- [ ] Held pages are noindex
- [ ] WP Schema Pro global field set **not** treated as per-city data

### Media
- [ ] Every hero downloaded, SHA-256 recorded
- [ ] Byte count matches WordPress's recorded size
- [ ] Filename, extension, MIME, dimensions preserved
- [ ] Alt/title/caption/description preserved; nulls left null
- [ ] Uploads path preserved
- [ ] **Inline body images handled or explicitly out of scope**
- [ ] No renames, conversions or optimisations

### URLs and redirects
- [ ] Every legacy URL has a row and a fate
- [ ] Trailing slash behaviour verified
- [ ] Duplicate-city redirects approved
- [ ] `_wp_old_slug` **not** used without a disambiguation rule (§10.4)
- [ ] Legacy `/locations/*` URLs addressed
- [ ] No city redirected to an unrelated city

### Database
- [ ] Migrations generated, never hand-edited
- [ ] Seed idempotent; row counts confirmed
- [ ] `sourceStatus` set for every city

### Next.js
- [ ] Every migrated page renders through the shared template
- [ ] Held pages reachable only via admin preview
- [ ] No-source cities have no URL
- [ ] Data-source indicator shows the correct artefact

### Validation and QA
- [ ] 15/15 on every page
- [ ] Responsive clean at 390 / 834 / 1440
- [ ] Route smoke test passes
- [ ] Dataset comparison run; differences explained
- [ ] **Minnesota regression still 134 / 109 / 25**
- [ ] Second apply byte-identical

### Approval
- [ ] Dry-run report reviewed
- [ ] All state-specific decisions signed off
- [ ] Publication approved separately

### Deployment and rollback
- [ ] Deployment target resolved
- [ ] Rollback rehearsed
- [ ] WordPress confirmed untouched
- [ ] Monitoring in place

---

# 25. APPENDIX

## 25.1 Agent flow

```
  agent.mjs --state <s> [--dry-run|--apply]
      │
      ├─ FETCH      fetchCityPages · fetchGeo · fetchHeroAttachments      (SELECT only)
      │             + business inputs: branches.json · keep-pages.json · pricing.json
      │
      ├─ MAP        branches  ← street number + postcode match
      │             cities    ← source{} · derived{} · flags[] · checksums{}
      │             duplicates → redirect, not a city row
      │
      ├─ GATE       branch? ≥4 areas? ≥2 local lines? hero? ≥1 FAQ?
      │             → publishable | needs_review          (thresholds from config)
      │
      ├─ EXCLUDE    cities with service pages but no city page → never created
      │
      ├─ IDEMPOTENCY  compare against the ledger
      │               source / content / media checksums · SEO · URL differences
      │
      ├─ RENDER + VALIDATE   15 checks × every page          (skippable with --no-render)
      │
      ├─ STORE      --apply only → <state>.migration.json · <state>.ledger.json · media
      │
      └─ REPORT     discovered · migrated · publishable · needs_review · skipped ·
                    changes · duplicates · media · validation · flags by category
```

## 25.2 Provenance model

```
  ┌─────────────────────┐   Copied byte-for-byte from WordPress or a business file.
  │ SOURCE              │   Never edited. Lives in city.source{}.
  └─────────────────────┘

  ┌─────────────────────┐   Computed by the agent. True only as far as the method is.
  │ DERIVED             │   Lives in city.derived{}. Never mixed with source.
  └─────────────────────┘

  ┌─────────────────────┐   A question only the business can answer.
  │ BUSINESS_UNVERIFIED │   Recorded as a flag; the agent stops there.
  └─────────────────────┘

  ┌─────────────────────┐   A defect observed in WordPress.
  │ SOURCE_QUALITY_FLAG │   Recorded, never repaired.
  └─────────────────────┘

  The category of every flag comes from ONE table: lib/migration/flags.mjs
```

## 25.3 State configuration model

```js
STATES = {
  <key>: {
    key, stateCode, stateName, origin, nationalPhone, businessInputs,
    cityPagePatterns[],        // SQL LIKE — which pages are city pages
    citySlugRe,                // extracts the city suffix
    branchSlugRe, coverageSlugRe,
    minAreas, minLocalLines,   // GATE THRESHOLDS — never lowered
    serviceCatalogueSize,
    farFromBranchKm,
    rejectedGeocodes{}, officeConflicts{}, slugTypos{}, excludeSuffixes,
    markupDefectRe, foreignStateRe,
  }
}
```

## 25.4 Key file paths

| Purpose | Path |
|---|---|
| Agent orchestrator | `scripts/migrate/agent.mjs` |
| WordPress extraction | `scripts/migrate/source.mjs` |
| State configuration | `scripts/migrate/states.mjs` |
| The 15 checks | `scripts/migrate/validate.mjs` |
| Migration contract | `lib/migration/types.ts` |
| Flag → category table | `lib/migration/flags.mjs` |
| **The gate** | `lib/content/assemble.ts` → `distinctnessGate()` |
| Type-safe mapper | `data/seed/minnesota.ts` |
| Agent dataset | `data/seed/mn.migration.json` |
| Ledger | `data/seed/mn.ledger.json` |
| Reference artefact | `data/seed/minnesota.generated.json` |
| Database schema | `lib/db/schema.ts` |
| The one city template | `components/templates/CityPage.tsx` |
| URL dispatcher | `app/location/[slug]/page.tsx` |
| Migration board | `app/admin/migration/page.tsx` |
| Original media | `public/uploads/<yyyy>/<mm>/` |

## 25.5 Validation results summary — 2026-09-05

| Suite | Result |
|---|---|
| 15-check harness | **134/134 on every check; 0 failures** |
| No-source cities uncreated | **16/16** |
| Responsive | **18/18 clean** |
| Route smoke test | **all checks passed** |
| Agent idempotency | **134 unchanged; 0 changes; 0 duplicates** |
| Minnesota regression | **✓ identical: 134 / 109 / 25** |
| Dataset comparison | **13 of 14 dimensions identical**; review flags differ by 3 (explained) |
| Typecheck | **clean** |

## 25.6 Glossary

| Term | Meaning |
|---|---|
| **Branch city** | A city with a physical Chimcare office; hand-authored WordPress page |
| **Coverage city** | A city served from another branch; generated WordPress page |
| **No-source city** | A city with service pages but no city page. **No page is created** |
| **The gate** | `distinctnessGate()`. Decides publication only, never migration |
| **Publishable** | Passes the gate; served on its legacy URL |
| **needs_review** | Migrated and rendered, but withheld. **Not a "bad city"** |
| **Provenance category** | SOURCE / DERIVED / BUSINESS_UNVERIFIED / SOURCE_QUALITY_FLAG |
| **The ledger** | Per-page checksums enabling idempotency and change detection |
| **Dry run** | Fetch, validate, report; write nothing. The default |
| **Apply** | Write dataset, ledger and media. Must be idempotent |
| **Tier A/B/C** | Business classification from the fate maps |
| **Fate** | `publish_verbatim` / `regenerate` / `redirect` / `gone` |
| **Pilot artefact** | `minnesota.generated.json`. Reference **and** live source for four items (§6.4) |
| **WPBakery** | The page builder. Content is `[vc_*]` shortcodes |
| **Distinctness** | Whether a page has enough page-specific source data to be worth publishing |

---

**END OF DOCUMENT**

*Every figure was verified against the repository, the WordPress database, or a command executed on
2026-09-05. Claims that could not be verified are marked NOT VERIFIED and are not relied upon
anywhere else in this document.*
