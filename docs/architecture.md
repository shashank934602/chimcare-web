# Chimcare — Next.js Location Pages: Detailed Architecture

Draft v0.1 · 4 Sep 2026 · Scope: the three location templates (`/locations/`, `/locations/{state}/`, `/location/{slug}/`) and everything they touch. Companion to the migration plan and the HLD.

---

## 0. Scope and inputs

| Input | Becomes |
|---|---|
| `locations_new3.html` | `NationalHub` template — `/locations/` (1 page, net-new) |
| `washington-locations.html` | `StateHub` template — `/locations/{state}/` (20 pages, 7 verified today, net-new) |
| `spokane.html` | `CityPage` template — `/location/{legacy-slug}/` (~2,500 pages, existing URLs) |
| derived from the expanded service rows in `spokane.html` | `ServicePage` template — `/location/{legacy-slug}/` for Tier A/B service×city pages — **pending decision Q1** |
| Extraction DB + keeper ledger | `site.pages` rows (kind, tier, fate, legacy URL) |
| 12 master files | `site.masters` (structured copy with slots) |
| Region pricing spreadsheet | `site.pricing_sheets` / `site.prices` |

Out of scope here: homepage, services hub, about/contact, blog. Same chrome, separate templates.

Numbers used below: 229,621 legacy `job_listing` pages ≈ 92 services × ~2,496 cities (verify with a distinct-city count after Step 5); 81 branch cities across 20 states; 827 lead-producing pages; 1,737 attachments; 775–2,700 hidden redirects.

---

## 1. System context

```
                    ┌──────────────────────── Cloudflare ────────────────────────┐
  Visitor ───────►  │ DNS · WAF · Turnstile · Cache (edge TTL + SWR)              │
  Googlebot         │ Worker "edge-router": redirect / 410 lookup in KV           │
                    │ R2 "chimcare-media" (+ /wp-content/uploads/* alias)        │
                    │ Image transformations · visitor-location headers            │
                    └───────────────┬─────────────────────────────┬──────────────┘
                                    │ cache miss                   │ media
                                    ▼                              ▼
                    ┌──────────── Google Cloud Run ────────────┐   (served from R2)
                    │ web: Next.js 16 (App Router)              │
                    │   /locations · /locations/[state]         │
                    │   /location/[slug] · /admin · /api/*      │
                    │ worker: BullMQ consumers                  │
                    │   booking.sync · pricing.publish          │
                    │   media.import · url.check · gsc.pull     │
                    └───────┬──────────────┬────────────────────┘
                            │              │
                 ┌──────────▼───┐   ┌──────▼──────────┐    ┌───────────────┐
                 │ Supabase     │   │ Valkey          │    │ n8n           │
                 │ Postgres     │   │ Next cache      │    │ Tier B        │
                 │ mig.* site.* │   │ BullMQ queues   │    │ generation    │──► writes site.* drafts
                 │ (Drizzle)    │   │ rate limits     │    │ (no page      │    calls /api/revalidate
                 └──────────────┘   └─────────────────┘    │  creation)    │
                                                           └───────────────┘
                 External: Workiz API (bookings) · Google Business Profile (ratings, optional)
                           · Google Search Console API (clicks by URL) · Sentry
```

Principles:

- Postgres is the only source of truth. Nothing renders from a JS object, a JSON file or n8n state.
- Public pages are server-rendered from typed loaders. Client JS only adds behaviour to HTML that already exists.
- n8n and the admin write to Postgres and call one revalidate endpoint. They never sit in the request path.
- The legacy n8n page generator is not migrated. New pages exist only as `site.pages` rows created by the pipeline or the admin.

---

## 2. Request path

```
GET /location/chimney-crown-sealing-in-spokane-wa/
 1. Cloudflare Worker: KV lookup on the exact path
      hit 301 → Location: /location/chimney-sweep-repair-in-spokane-wa/#svc-chimney-crown-sealing
      hit 410 → 410 + small branded HTML, X-Robots-Tag: noindex
      miss    → continue
 2. Cloudflare cache: HIT → serve (stale-while-revalidate) ; MISS → origin
 3. Cloud Run / Next: app/location/[slug]/page.tsx
      resolvePage(slug) → site.pages row (kind, tier, status)
        status ≠ published → notFound()
        kind = city    → <CityPage variant=branch|coverage>
        kind = service → <ServicePage>
        kind = legacy  → <LegacyShell>          (Step 5 parse failed → sanitised raw sections)
 4. Loaders (lib/data) read Postgres through the Supabase pooler; results tagged
      city:{id} · branch:{id} · pricing:{region} · service:{id} · masters
 5. Next full-route cache (Valkey) stores the HTML with those tags
 6. Response: Cache-Control: public, s-maxage=600, stale-while-revalidate=86400
```

Trailing slashes are preserved end to end (`trailingSlash: true` in `next.config`). No 308 hops on legacy URLs.

---

## 3. Repository layout

```
chimcare-web/
  app/
    layout.tsx                    html, body, fonts, chrome (Header, Footer, BookingSheet, FloatingCtas, MobileStickyBar)
    (site)/
      locations/page.tsx          NationalHub
      locations/[state]/page.tsx  StateHub
      location/[slug]/page.tsx    dispatcher → CityPage | ServicePage | LegacyShell
      sitemap.ts · robots.ts
    (admin)/admin/...             masters, branches, cities, pricing upload, redirects, blog — Tailwind + shadcn, auth-gated
    api/
      bookings/route.ts           POST → validate → insert → enqueue
      revalidate/route.ts         POST {tags[]} (HMAC-signed; called by admin, n8n, pipeline)
      geo/route.ts                reads Cloudflare visitor-location headers
      health/route.ts
  proxy.ts                        noindex on non-prod hosts, admin auth gate, edge-miss redirect fallback
  components/
    chrome/     Header Footer BookingSheet BookingForm FloatingCtas MobileStickyBar
    sections/   Hero TrustStrip Intro ReasonsList ServiceRows ServiceDirectory Areas ProcessSteps
                CostPanel Faq Contact FinalCta StateCards LocationDirectory EditorialBlock CrewGrid LeafletMap
    ui/         Button Eyebrow SectionHead Icon Panel
  lib/
    db/         schema.ts (Drizzle) · client.ts · migrations/
    data/       pages.ts states.ts branches.ts cities.ts services.ts faqs.ts pricing.ts media.ts
    content/    masters.ts (slot renderer) · assemble.ts (row → template props) · sanitize.ts
    seo/        metadata.ts · jsonld.ts · sitemap.ts
    booking/    adapter.ts · mock.ts · workiz.ts
    cache/      handler.ts (Valkey) · tags.ts
  styles/       tokens.css · base.css · chrome.css · sections/*.css
  workers/      BullMQ consumers (separate Cloud Run service, same image, different entrypoint)
  edge/         Cloudflare Worker: redirect/410 router + KV publish script (wrangler)
  scripts/      seed (mig → site) · media-import (→ R2) · kv-publish · url-check · warm
  tests/        parity/ (Playwright screenshots, text diff) · schema/ · links/ · a11y/
```

The Python migration pipeline stays in its own repo and writes to `mig.*`; `scripts/seed` copies from `mig.*` into `site.*`.

---

## 4. Routing and dispatch

| Route | Template | Render | Revalidated by tags | Indexable |
|---|---|---|---|---|
| `/locations/` | NationalHub | static + ISR | `states`, `branches` | yes |
| `/locations/{state}/` | StateHub | static per verified state | `state:{code}`, `branches` | yes (unverified state → 404) |
| `/location/{slug}/` kind=city | CityPage | ISR on demand | `city:{id}`, `branch:{id}`, `pricing:{region}` | Tier A/B only |
| `/location/{slug}/` kind=service | ServicePage | ISR on demand | `city:{id}`, `service:{id}` | Tier A/B only |
| `/location/{slug}/` kind=legacy | LegacyShell | ISR on demand | `page:{id}` | Tier A |
| Tier C paths | edge 301 / 410 | — | KV publish | no |
| `/wp-content/uploads/*` | R2 alias | edge | — | images keep their old URLs |

Dispatch rule: one dynamic route, DB-driven `kind`. Legacy city and service URLs share the `/location/` prefix and cannot be told apart by pattern, so the row decides the template.

`generateStaticParams` is not used for `/location/*` (~2,500 city pages plus whatever survives of the service pages is an on-demand ISR job, not a build job). Optionally pre-warm the 827 lead pages after each deploy with `scripts/warm`.

State slug: one `states.slug` column (`wa` or `washington`) — decide once (Q2b).

---

## 5. Templates and variants

Sections are server components with typed props; a section never receives a DB row.

| Section | NationalHub | StateHub | CityPage | ServicePage |
|---|---|---|---|---|
| Hero | finder | finder | booking slot | booking slot |
| Breadcrumbs | ✓ | ✓ | ✓ | ✓ (… › State › City › Service) |
| TrustStrip | ✓ | ✓ | ✓ | ✓ |
| Intro / ReasonsList | ✓ | ✓ | ✓ | ✓ (service "why it matters") |
| StateCards | ✓ | | | |
| LocationDirectory + LeafletMap | | ✓ | | |
| EditorialBlocks | | ✓ | | |
| ServiceRows (8 categories, accordion) | | | ✓ | ✓ (own category open) |
| ServiceDirectory (92 cards, filter) | | | ✓ | ✓ (same category, links to siblings) |
| Areas (neighbourhoods) | | | ✓ | ✓ |
| ProcessSteps | | | ✓ | ✓ |
| CostPanel (region prices) | | | ✓ | ✓ |
| Faq | | detail accordion | ✓ | ✓ |
| Contact | | | ✓ | ✓ |
| CrewGrid | ✓ | ✓ | | |
| FinalCta | ✓ | ✓ | ✓ | ✓ |

CityPage variants (`cities.kind`):

- `branch` — has an office. Street address, local phone, "Local {city} team" trust item, Get Directions, `HomeAndConstructionBusiness` schema with address + geo.
- `coverage` — served by a branch elsewhere (the "other category"). No street address anywhere, the serving branch's phone and name ("Served by Chimcare {branch}"), `Service` + `areaServed` schema with `provider` → the branch. Hero address line and Contact block become "Serving {city} from {branch}".

Tier handling inside a template:

- Tier A: the six legacy sections (Why Important, Process, Why Choose Us, Areas Served, FAQs, CTA) map onto Intro, ProcessSteps, ReasonsList/trust copy, Areas, Faq, FinalCta. Text is inserted verbatim; only chrome and markup change. Rows whose parse failed in Step 5 render through LegacyShell (sanitised HTML in one slot).
- Tier B: masters + slots + city data; must pass the distinctness gate (§7).
- Tier C: never reaches a template.

---

## 6. Data model (Drizzle, Postgres schema `site`)

Sketch to fix names and relationships; column types indicative.

```
enums
  page_kind    hub | state | city | service | legacy
  tier         A | B | C
  fate         publish_verbatim | regenerate | redirect | gone
  page_status  draft | review | published | retired
  city_kind    branch | coverage

states            id, code 'WA', slug 'wa', name, verified bool, blurb, hero_copy,
                  climate_notes jsonb, editorial jsonb, detail_accordion jsonb,
                  outline geojson, photo_key, sort
regions           id, name, state_id?, is_default bool                  -- pricing regions
branches          id, slug, name, state_id, region_id, street, city, zip, phone, email,
                  lat, lng, photo_key, google_place_id, rating numeric?, rating_count int?,
                  rating_synced_at, licenses jsonb, status
cities            id, slug (legacy post_name of the city page), name, state_id, kind city_kind,
                  branch_id (serving), region_id, lat, lng, neighborhoods jsonb,
                  local_specifics jsonb {climate_line, housing_line, season_line},
                  hero_image_key, tier, meta_title, meta_description, legacy_post_id
service_categories id, key ('sweep','inspection','repair','gas','gas-inserts','wood-inserts','caps','outdoor'),
                  name, sort, tile_image_key, master_key                 -- the 8 long-form rows
services          id, key, name, category_id, sort, name_template, card_copy_template   -- 92
pages             id, kind, slug (exact legacy path), city_id?, service_id?, branch_id?, state_id?,
                  tier, fate, status, redirect_to?, legacy_post_id, legacy_url, canonical_url,
                  gsc_clicks_12m, gsc_impressions_12m, lead_count, content_version,
                  published_at, updated_at                             -- one row per URL, incl. Tier C
page_sections     page_id, section_key ('why_important','process','why_choose','areas_served','faqs','cta'),
                  html_verbatim, text_plain, parse_status, word_count
page_content      page_id, version, assembled jsonb (rendered props), generated_by ('pipeline'|'n8n'|'admin'),
                  reviewed_by?, approved_at?
masters           id, key (12), version, kind ('intro'|'reasons'|'service_row'|'process'|'faq'|'cta'|...),
                  body jsonb (structured fields with {{slots}}), published_at
faqs              id, scope ('global'|'state'|'city'|'service'), scope_id, question, answer, sort
pricing_sheets    id, version, file_key, uploaded_by, status ('draft'|'published'), published_at, summary jsonb
prices            sheet_id, region_id, service_key ('sweep_inspection','inspection','gas_diagnostic',...),
                  amount_cents, label
media             key, r2_key, mime, width, height, alt, kind, wp_attachment_id?, blurhash
redirects         from_path, to_path?, status (301|410), source ('wp_old_slug'|'yoast'|'tier_c'|'manual'),
                  active, published_to_kv_at
bookings          id, page_id?, city_id?, service_key, payload jsonb, status, workiz_job_id?, created_at
url_checks        page_id, checked_at, live_status, live_canonical, live_title, new_status, diff jsonb
gsc_daily         url, date, clicks, impressions, position
```

Relationships: `cities.branch_id → branches`; `branches.region_id` and `cities.region_id → regions`; `pages.city_id / service_id`; `page_sections.page_id`; `prices.region_id`.

Population: Step 7 (join to keeper ledger) fills `pages`; Step 5 fills `page_sections`; Step 6 fills `redirects`; Step 8 fills `media`; the hub's `CHIMCARE_LOCATIONS` object seeds `states`/`branches` after de-duplication against the extraction (the mock already carries two different Seattle addresses).

Access: Drizzle over `postgres-js` through the Supabase pooler in transaction mode (`prepare: false`). Cloud Run scales instances and must not open direct connections per instance.

---

## 7. Content assembly

```
site.pages row ─┬─ Tier A ─► page_sections (verbatim text) ─────────────────┐
                │                                                            ├─► assemble() ─► template props ─► render
                └─ Tier B ─► masters (12) + slots + city/branch/pricing data ┘
```

Masters are structured JSON, not free HTML: `reasons[3]{title, body}`, `steps[4]{title, body}`, `service_row{why, included[4], paragraphs[2]}`, `faq[]`, `intro{paragraphs[]}`. String fields may contain slots: `{{city.name}}`, `{{state.code}}`, `{{branch.phone}}`, `{{neighborhoods.list}}`, `{{price.sweep_inspection}}`, `{{local.climate_line}}`. The renderer substitutes known slots only; an unknown slot fails the publish.

Distinctness gate (Tier B; enforced at publish in admin/n8n and again inside `assemble()`):

- branch resolved (kind `branch`, or `coverage` with a serving branch)
- ≥ 4 neighbourhoods
- ≥ 2 local-specifics lines
- region prices resolved (not the national fallback)
- hero image assigned (not the global default)
- ≥ 2 city- or service-specific FAQs

Fail → the row stays in `review`; the route returns 404 for anything not `published`. The template never emits a thinner copy of Spokane.

LegacyShell sanitisation: `rehype-sanitize` allow-list, WPBakery `[vc_*]` residue stripped (Step 5 flags it), `/wp-content/uploads/…` rewritten to R2 keys via `media`, inline styles dropped.

---

## 8. Client islands

Each is a `'use client'` leaf; the surrounding HTML is server-rendered and complete without JS.

| Island | Behaviour | Notes |
|---|---|---|
| HeaderMenu | mobile toggle | `aria-expanded` |
| Reveal | IntersectionObserver fade-in | honours `prefers-reduced-motion`; no layout dependence |
| Accordion | single / multi; used by ServiceRows, Faq, StateHub detail | panels stay in the DOM when closed |
| ServiceDirectory | category filter, 8-at-a-time show-more | all 92 cards in HTML; `hidden` toggled client-side |
| ServiceDrawer | opens a category row in a side panel | reads content from the row already in the DOM |
| BookingForm / BookingSheet | 4 steps, opens from any CTA | posts to `/api/bookings` (§12) |
| FloatingCtas / MobileStickyBar | call / book / email | phone number from props |
| LocationFinder | ZIP / city search on hub and state pages | filters server-rendered cards; ZIP→state table shipped as data |
| LeafletMap | `next/dynamic` with `ssr: false` | markers from props; the card list is the accessible fallback |

Hydration rules: no `Date.now()`, `Math.random()` or `window` reads during render; the hero "roof art" SVG is generated on the server from a hash of the page id.

---

## 9. SEO layer

- `generateMetadata` per route from the row: title, description, `alternates.canonical` (self, trailing slash), Open Graph (type `website`), `robots` = index only when `status = published` and tier A/B. Non-production hosts send `X-Robots-Tag: noindex` from `proxy.ts` and sit behind Cloudflare Access.
- JSON-LD from `lib/seo/jsonld.ts` as one `@graph`:
  - all pages: `WebPage`, `BreadcrumbList` (Home › Locations › State › City › Service)
  - branch city: `HomeAndConstructionBusiness` (address, geo, telephone, `areaServed` = neighbourhoods, `parentOrganization`), `OfferCatalog` of the city's services
  - coverage city: `Service` with `areaServed` = city and `provider` → branch `@id`; no address
  - service page: `Service` (name, category, provider, areaServed)
  - `FAQPage`: optional; if emitted it must contain exactly the visible FAQs
  - never: `AggregateRating` or review markup (Q5)
- Sitemaps: `app/sitemap.ts` with `generateSitemaps()` chunked at 20,000 URLs; index at `/sitemap.xml`; entries only for published Tier A/B rows; `lastmod` from `pages.updated_at`. Submitted to GSC and Bing at cutover.
- Redirects live at the edge (§2). `next.config` `redirects()` is not used for the legacy map — tens of thousands of entries evaluated per request on the origin.
- Internal-linking rules baked into templates: hub → every verified state; state → every published city in it; city → its state, its branch, all its published service pages; service → its city and its category siblings. Every published page is reachable in ≤ 3 clicks from `/locations/`.
- 404 vs 410: unpublished or unknown → 404; Tier C → 410 from the edge, both `noindex`.

---

## 10. Caching and revalidation

Three layers:

1. Cloudflare edge — cache rules for `/location/*` and `/locations/*`, `s-maxage=600`, `stale-while-revalidate=86400`, bypass when an admin cookie is present. Purge-by-tag is Enterprise-only; use purge-by-URL for the small hub/state set and let the long tail expire (≤ 10 min staleness accepted).
2. Next full-route + data cache in Valkey via a custom `cacheHandler` (`cacheMaxMemorySize: 0` so instances never diverge). Tags as in §4. `POST /api/revalidate {tags}` (HMAC) is the single write path; callers: admin save, pricing publish, n8n publish, pipeline scripts.
3. Postgres.

Cloud Run settings that matter: min instances 1 in prod; CPU always allocated (ISR regeneration runs after the response is sent); concurrency ~80; request timeout 60 s; health check on `/api/health`.

---

## 11. Media, fonts, icons

- R2 bucket `chimcare-media`; keys `wp/{attachment_id}/{filename}` (imported in Step 8) and `site/{kind}/{id}/{filename}` for new uploads; public via `media.chimcare.com`. A Cloudflare rule maps `www.chimcare.com/wp-content/uploads/*` → R2 so existing image URLs and image-search results keep resolving.
- `next/image` with a custom loader → Cloudflare image transformations (`/cdn-cgi/image/width=…,format=auto/…`); fall back to the Next optimizer if plan limits bite. `sizes` per slot; hero `priority`, everything else lazy.
- Fonts: Manrope woff2 (latin + latin-ext) via `next/font/local`, `display: swap`. Extracted once from the mock's embedded base64; nothing inline.
- Icons: `lucide-react` (the mock sprite is Lucide-style), tree-shaken per component. Custom art (roof art, award strip) as static SVG/PNG in R2.
- Budgets: HTML ≤ 120 KB; JS on a city page ≤ 130 KB gzipped; LCP image ≤ 120 KB.

---

## 12. Booking

```
BookingForm ─► POST /api/bookings ─► zod validate ─► Turnstile verify ─► insert bookings(status=received)
            ─► enqueue booking.sync (BullMQ)
worker: booking.sync ─► adapter.createBooking() ─► Workiz job id ─► status=synced ─► confirmation email
                         retries ×5 with backoff; dead-letter → admin "failed bookings" list
```

`lib/booking/adapter.ts` defines `createBooking(input) → { id, externalId? }` and optional `listSlots(dateRange)`. `MockAdapter` now (stores + logs); `WorkizAdapter` when the API arrives. Step 2 ("Schedule") stays a preferred date/time until Workiz slot availability is confirmed. Every booking carries: page kind, city, branch, service key, source URL, UTM.

---

## 13. Pricing (region-aware)

```
admin uploads .xlsx ─► parse (region, service_key, amount) ─► validate
   (every active region present · known service keys · amount > 0 · > 30 % change vs current → warn)
   ─► pricing_sheets(status=draft) + prices ─► admin publishes ─► active version set
   ─► revalidate pricing:{region} for each region ─► pages re-render
```

Resolution at render: `city.region_id → prices` (active sheet); missing region → the national default row, which fails the Tier B distinctness gate. Slots `{{price.sweep_inspection}}`, `{{price.inspection}}`, `{{price.gas_diagnostic}}` feed TrustStrip, CostPanel, Faq and BookingForm options. No price is ever a literal in a template or master.

---

## 14. Maps and geolocation

- Basemap: Protomaps PMTiles on R2 served by a Worker (no per-tile fees, no OSM tile-server policy issue); MapTiler as the paid alternative. Leaflet loads client-side only; state outline from `states.outline`; pins from `branches.lat / lng`.
- Finder geolocation: `/api/geo` reads `cf-ipcity`, `cf-region-code`, `cf-postal-code` (enable "Add visitor location headers" in Cloudflare). Browser geolocation only on user action. No third-party IP API.

---

## 15. Admin and n8n write paths

- Admin (`/admin`; Supabase Auth + Cloudflare Access): masters editor (structured forms, versioned, preview on a real city), branches CRUD, cities (kind, serving branch, neighbourhoods, specifics), pricing upload/publish, redirects (manual adds → KV publish), failed bookings, blog. Every save → a `page_content` or master version → revalidate.
- n8n (Tier B generation): reads `pages` where `fate = regenerate` and `status = draft`, assembles masters + city data through the same `assemble()` contract (exposed as an internal API so the gate is identical), writes `page_content(generated_by = 'n8n', status = review)`. Publishing is a human action in admin (or a rule for low-risk pages) and triggers revalidation. n8n cannot create `pages` rows.
- Pipeline scripts: `seed` (mig → site), `media-import`, `kv-publish` (redirects → Cloudflare KV; idempotent; `--dry-run`), `url-check`, `warm`.

---

## 16. Environments, deployment, security

- Environments: `local` (Docker: Postgres, Valkey), `staging` (Cloud Run; separate Supabase project or branch; `noindex`; Cloudflare Access), `prod`.
- CI: GitHub Actions → typecheck, lint, unit, `drizzle-kit generate` drift check, Playwright parity suite → image → Artifact Registry → Cloud Run revision with no traffic → smoke → traffic shift. Migrations run as a Cloud Run Job before the shift.
- Secrets in Secret Manager: `DATABASE_URL` (pooler), `VALKEY_URL`, `REVALIDATE_SECRET`, `WORKIZ_*`, `TURNSTILE_SECRET`, `R2_*`, `CF_API_TOKEN`.
- Security: admin behind Cloudflare Access + app auth; `/api/revalidate` HMAC + IP allow-list; Turnstile on booking; rate limits in Valkey; CSP with nonces; no PII in logs; bookings pruned 90 days after sync.
- Cutover: KV redirect map published and verified against `redirects` before the DNS switch; WordPress frozen read-only and kept as rollback origin for 30 days; sitemap index submitted; GSC baseline captured — GSC verification remains a blocker.

---

## 17. Observability and URL tracking

- Cloud Logging (JSON): every `/location/*` 404 with its path — these are missed redirects; reviewed daily for the first four weeks.
- Sentry on web and worker.
- `url_checks`: a repeatable BullMQ job requests each `pages.legacy_url` on the live site before cutover and on the new site after it, storing status, canonical and title; diff view in admin. This is the "keep the DB URL and track it against live" requirement (Q2).
- `gsc_daily`: GSC API pull per URL, feeding tier decisions and post-migration attribution.
- Dashboards: 404/410/5xx by prefix, edge cache hit ratio, ISR regeneration time, booking sync failures, p95 TTFB.

---

## 18. QA gates (automated; block deploy)

| Gate | Tool | Pass condition |
|---|---|---|
| Visual parity with mocks | Playwright screenshots, 3 breakpoints | ≤ 0.5 % pixel diff per section |
| Tier A text parity | token diff, legacy text vs new render | 100 % of legacy words present, order preserved per section |
| Structured data | schema validator + Rich Results test | 0 errors; no rating markup |
| Performance | Lighthouse CI on 10 representative URLs | LCP < 2.5 s, CLS < 0.1, INP < 200 ms; budgets in §11 |
| Link graph | crawler over the sitemap | every published page reachable ≤ 3 clicks; 0 links to Tier C |
| Redirect map | script over `redirects` | 100 % return the expected status/target from the edge |
| Accessibility | axe | 0 serious/critical |
| Hydration | CI console check | 0 mismatch warnings |

---

## 19. Build sequence

| # | Milestone | Deliverable | Depends on |
|---|---|---|---|
| M0 | Foundation | repo, tokens/base CSS, root layout + chrome, fonts, lint/CI, local Docker | — |
| M1 | Data contract | `site` schema, migrations, loaders, seed from `mig.*` | Step 5–7 outputs |
| M2 | CityPage | both variants, Tier A slots, distinctness gate, metadata, JSON-LD | M1 |
| M3 | StateHub + NationalHub | directory, map, finder, state cards | M1 |
| M4 | ServicePage or redirect | per Q1 | M2 |
| M5 | Islands, booking, pricing | accordion / filter / drawer / finder / map; booking adapter; pricing upload | M2, M3 |
| M6 | Edge + cache | Worker + KV publish, Valkey cache handler, Cloudflare rules, R2 alias | Step 6 |
| M7 | QA + cutover rehearsal | gates green on staging, `url_checks` diff clean, rollback drill | all |

---

## 20. Decisions log and open questions

Decided:

- App Router; one dynamic `/location/[slug]/` route with DB dispatch; `trailingSlash: true`.
- Public-site CSS: port the mock CSS (tokens + base + per-section files). Tailwind + shadcn for `/admin` only.
- Booking behind an adapter; mock now, Workiz later.
- Non-branch cities are their own category: `cities.kind = 'coverage'`.
- Slugs stay exactly as in the DB; `pages.legacy_url` tracked by `url_checks`.
- No `AggregateRating` / review markup anywhere.
- Next.js 16.x (16.3.1 current stable), React 19, Drizzle, Node 22.

Open:

- Q1 — service×city URLs: own page (ServicePage template derived from the expanded rows in `spokane.html`) for Tier A/B plus edge redirect/410 for Tier C — recommended; or redirect every service URL to its city page.
- Q2b — state slug: `/locations/wa/` or `/locations/washington/`.
- Q5 — source of the visible "Rated 4.7 on Google": Google Business Profile per branch (API sync; needs place ids) or manual entry in admin; otherwise the line is removed.
- Q6 — confirm prices vary by region, and which three headline prices appear on location pages.
- Q7 — confirm the CSS decision above.
- Cloudflare plan (affects image transformations and purge options); Cloud Run min-instances budget.
