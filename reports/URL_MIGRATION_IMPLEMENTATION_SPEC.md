# Chimcare URL Migration — Implementation Specification

Written 10 September 2026, after inspecting every copy of the application on this machine, the audit
artefacts in `data/audits/url-universe/`, the migration scripts, the WordPress database
(`chimcare_local`, SELECT only) and the project documents. Nothing was modified. Where a number is
quoted it was measured today; the code must read counts from its inputs, never from this document.

Companion documents: `URL_MIGRATION_APPROACH.md` (the method), `COMPLETE_URL_MIGRATION_AUDIT.md` (the
measurements this builds on). Where this specification and either of those disagree, §18 says which wins.

---

## 0. Findings that change the plan (read first)

1. **No complete copy of the application exists.** Three trees are on disk and each is missing something
   the others have. See §1.1. Implementation begins with reconstructing one buildable tree.
2. **The recovered tree is contaminated.** Six files carry `===== path =====` banner lines from the dump
   they were reassembled from; `lib/data/pages.ts` contains the dispatcher's source *and* its own.
   None of them compiles as-is. See §1.2.
3. **The generated Minnesota datasets are gone from every copy** (`minnesota.generated.json`,
   `mn.migration.json`, `mn.ledger.json`, `minnesota.faq.json`, `minnesota.media.json`, `mn-geocode.json`).
   Their inputs all exist, so they are regenerable. See §1.3.
4. **The URL universe is missing two redirect sources and one traffic source.**
   `wp_options.wpseo-premium-redirects-base` holds **757 Yoast Premium rules** (752 × 301, 5 × 410) that
   the audit never read — 737 origins are in the universe, 20 are not, 107 chain into another rule, 5
   point at the homepage, and 108 have a destination that is 404 today. The Redirection plugin has 15
   rules (the audit used 12). `wp_redirection_404` holds **1,670,413 logged 404 hits** over 473,258 distinct
   URLs (16 Mar – 26 Aug 2026), a monitoring baseline nobody has used. See §3 and §9.
5. **The current code applies the fate maps.** `scripts/build-mn-seed.mjs` turns `gone.json` into
   `fate='gone', status='retired'` (→ 404) and `redirects.json` into `fate='redirect'` (→ 308). The
   Minnesota slice as sealed (2,864 → 200 · 6,803 → 308 · 10,812 → 404) is therefore *not*
   behaviour-preserving, and its URL-status expectations cannot be the regression baseline for cutover.
6. **The dispatcher cannot serve a verbatim page and cannot emit a 301.** `kind='legacy'` → `notFound()`;
   `fate='redirect'` → `permanentRedirect()` = **308**. Production redirects are 301 (Yoast, Redirection,
   WordPress old-slug). A parity gate that fails on status mismatch fails every redirect today.
7. **`site.pages` cannot represent the whole universe.** Its `slug` is the segment under `/location/`.
   263,372 universe URLs live there; **397 do not** (`/contact/`, `/home-v1/`, `/locations/*`, `/category/*`
   …). They need a full-path table.
8. **Admin authentication is a `?token=` query-string compare that is skipped outside production.**
   Not acceptable for a review interface that will carry business decisions.
9. **Production redirects to the homepage today** (Redirection rule 10: `/location/bend-chimney-sweep/` →
   `/`; five Yoast rules). Behaviour preservation and the "never redirect to the homepage" rule collide
   at cutover. Resolution in §18, item 3.

---

## 1. Architecture assessment

### 1.1 The three trees

| Tree | Date | Has | Lacks |
| --- | --- | --- | --- |
| `~/Desktop/chimcare/chimcare-web-2-RECOVERED` | 9 Sep | `scripts/migrate/{agent,source,states,validate,geocode,compare-datasets}.mjs`, `scripts/build-mn-seed.mjs`, `scripts/audit/*` incl. the production probe, `lib/migration/*`, the newer `lib/db/schema.ts` (with `source_status`, `review_flags`, `legacy_pricing_copy`, `legacy_thumbnail_id`), `app/admin/migration`, `app/admin/preview`, `data/audits/url-universe/*`, all reports | `app/location/[slug]/page.tsx`, `app/locations/*`, `app/api/*`, `lib/content/assemble.ts`, `lib/content/slots.ts`, `lib/data/{masters,pricing,services}.ts`, `components/templates/{CityPage,ServicePage,NationalHub}.tsx`, `lib/db/migrations/`, `data/seed/services.ts`, `data/seed/masters.ts`, all seed JSON, `docs/architecture.md`, `node_modules`. `package.json` is the MA pilot's (Next 15.5.4, `pg`, port 3100, no Drizzle, no PGlite). `next.config.mjs` has no `trailingSlash`. `app/page.tsx` imports `@/lib/queries`, which does not exist. |
| `~/Desktop/Chimcare 2/chimcare-web 2` | 4 Sep | Next 16.3.4, Drizzle 0.45.2, PGlite 0.5.8, postgres-js; the dispatcher; `assemble.ts` with `distinctnessGate`; all four templates; `lib/data/*` loaders; migrations `0000`, `0001`; `next.config.ts` with `trailingSlash: true`; `docs/architecture.md`; `data/seed/services.ts` (92) and `masters.ts` | Everything under `scripts/migrate/` and `scripts/audit/`; `lib/migration/*`; the newer schema columns and migration `0002`; the admin migration pages; `seed.ts` synthesises 92 × city service URLs instead of reading the real universe |
| `~/Downloads/chimcare-web 2` | 4 Sep | identical to the tree above | identical |

Canonical baseline = the 4 Sep tree's application code + the 9 Sep tree's migration code, schema, admin
pages and audits. Neither the reverse nor either alone builds.

### 1.2 Recovery-banner contamination (9 Sep tree)

| File | Banner line(s) | Consequence |
| --- | --- | --- |
| `lib/db/schema.ts` | L1 `===== lib/db/schema.ts =====` | does not parse |
| `lib/data/pages.ts` | L1 `===== app/location/[slug]/page.tsx =====`, L74 `===== lib/data/pages.ts =====` | L2–73 is the dispatcher (recoverable from here), L75+ is `pages.ts` |
| `lib/content/assemble-hubs.ts` | L1 | does not parse |
| `components/templates/StateHub.tsx` | L1 | does not parse |
| `components/islands/LocationDirectory.tsx` | L1 | does not parse |
| `scripts/migrate/source.mjs` | L9 `===== source.mjs =====` inside the header comment block | parses only because it sits inside a comment; remove |

Also present and to be removed: `lib/db/schema.ts.older-10822`, `scripts/migrate/source.mjs.older-10527`,
`scripts/migrate/states.mjs.older-2579`, `lib/data/states.ts.alt-1485`, `components/islands/LocationDirectory.tsx.older-4124`,
`components/locations/city/CityContact.tsx.alt-1152`. `_unsorted/` and `migration images/` contain nothing the
migration uses.

### 1.3 Regeneration inputs (all present)

| Input | Path | Size |
| --- | --- | --- |
| WordPress database, read-only | `mysql -h 127.0.0.1 -u root --database=chimcare_local` | 242,592 posts |
| Legacy export | `~/Desktop/chimcare/Chimcare-Migration/output/job_listings.jsonl` | 2.48 GB |
| Fate maps and business inputs | `~/Desktop/chimcare/chimcare-rebuild-main/site/data/{redirects,gone,keep-pages,branches,pricing}.json` | 50,938 / 36,759 / 175,415 / 105 / — |
| State hub copy | `~/Desktop/chimcare/chimcare-rebuild-main/site/data/content/hubs/state-mn.md` | — |
| Search Console export | `chimcare-web-2-RECOVERED/indexed_urls (4).csv` (`url,clicks,impressions,ctr,position`) | 139,063 rows, undated |
| Enquiries | `wp_gf_entry.source_url` | 20,531 entries, 2020-09-07 → 2026-08-27 |
| Audit artefacts | `data/audits/url-universe/*.csv` | 263,769 rows, frozen 10 Sep |

### 1.4 What runs where today

```
WordPress (Cloudflare in front, `server: cloudflare`)   ← production, all 263,769 URLs
   redirects served by: Yoast Premium option (757) · Redirection plugin (15) · wp_old_slug (826 slugs) · Yoast post meta (723)
Next.js app (4 Sep tree)                                 ← local only, PGlite, 4 seeded cities
   /location/[slug]/ → site.pages → CityPage | ServicePage | 308 | 404
   no proxy/middleware · no sitemap · no robots · no edge worker · no KV · no deployment config
Migration agent (9 Sep tree)                             ← local only; needs the datasets it wrote
```

Deployment target is unresolved (Cloud Run per `docs/architecture.md`, Vercel per the brief). Nothing in this
specification depends on the choice except §14 (edge layer), which is written for Cloudflare because
Cloudflare already fronts production.

---

## 2. Current implementation vs required implementation

| Capability | Today | Required | Gap |
| --- | --- | --- | --- |
| URL universe | frozen CSVs; generator lost; 9 sources | reproducible builder; 12 sources (§3) | new module |
| Production truth | 539-URL sample + 8,500-URL retirement probe; auto-follows redirects; no HTML capture | every URL; manual hops; canonical/title/h1/description/robots captured; HTTP and SEO stored separately | modify probe |
| Ledger | none (audit CSVs are the nearest thing) | one generated row per `audit_id`, all column groups of the brief | new module |
| Cutover rule | fate maps applied via `build-mn-seed.mjs` | production behaviour; maps → `proposed_*` only | replace |
| Verbatim page | `kind='legacy'` → 404; no content store | LegacyPage from immutable raw `post_content`; render-time cleanup | new template + table |
| Redirect status | 308 in app; nothing at edge | exact production status (301/302/410) at edge and in app fallback | proxy + edge table |
| Non-`/location/` URLs | unrepresentable | full-path redirect/gone table | new table |
| Consumers | seed from `minnesota.generated.json` | `site.pages`, `site.redirects`, gone list, sitemap, conflicts — all generated from the ledger | new module |
| Graph checks | none standing (run ad hoc once, 5 Sep) | loop / self / chain / destination / state / catch-all / invalid, hard stop | new module |
| Parity | 15 template checks on 134 MN pages | production-vs-staging per URL; exact text hash for verbatim; gate on status/final URL | new module, reuse `validate.mjs` |
| Admin | one board, hard-coded `'mn'`, `?token=` auth | 8 sections, authenticated, backed by the ledger | new pages + auth |
| Decisions | none | `decisions.csv`, append-only, validated, applied by regeneration | new module |
| Sitemap / robots | none | generated from SERVE rows | new |
| Monitoring | none | daily 404/5xx/redirect diff against the ledger | new |
| Idempotency | agent: byte-identical proven | every generated artefact | extend the existing standard |

---

## 3. Files and modules that already exist (reuse as-is or with the stated change)

| Path (tree) | Reuse | Change needed |
| --- | --- | --- |
| `scripts/migrate/source.mjs` (9 Sep) | `makeQuery` (mysql `-N -B --raw` + `JSON_ARRAYAGG`), `cleanMarkup`, `faqsFrom`, `markupDefectsFrom`, `hashJson`, `sha256`, `ensureAsset`, `decodeEntities` | remove banner L9 |
| `scripts/migrate/agent.mjs` | the stage pattern, ledger/checksum pattern, report shape, `--apply` default-off | parse `--dry-run` explicitly (today inert); call `geocode.mjs` instead of the hard-coded `mn-geocode.json`; make `ma` runnable (`citySlugRes` array vs singular `citySlugRe`) — these are agent fixes, not cutover blockers |
| `scripts/migrate/validate.mjs` | the 15 checks for templated pages | keep; add a verbatim check set (§11); delete the duplicate `scripts/validate-render.mjs` |
| `scripts/migrate/states.mjs`, `geocode.mjs` | per-state config, state-qualified geocode | none for cutover |
| `scripts/build-mn-seed.mjs` | the four-set universe formula, JSONL streaming | retire as the source of `pages` rows; keep only for cities/branches/prices until the agent produces them. Fix `lastSeg` keying (Lonsdale self-redirect) if it is kept at all |
| `scripts/audit/validate-live-retirement-urls.py` | aiohttp session, semaphore, retry/backoff, checkpoint/resume, classification table, report builder | becomes `scripts/probe/probe-production.py` (§8) |
| `scripts/recover-mn-faqs.mjs`, `recover-mn-media.mjs` | verbatim FAQ and byte-exact media recovery | none |
| `lib/migration/flags.mjs`, `types.ts` | provenance categories, flag codes | add URL-level flag codes (§9.6) |
| `lib/migration/card-resolution.ts` | hub card resolution, cross-state guard | reads `pages`; unaffected |
| `lib/db/schema.ts` (9 Sep) | all `site.*` tables and enums | remove banner; add §6 |
| `lib/db/client.ts` | PGlite / Supabase switch | none |
| `lib/db/seed.ts` (9 Sep) | cities/branches/faqs/services/masters seeding | `pages` block replaced by the consumer loader (§10) |
| `lib/data/pages.ts` | `resolvePage`, `getServiceForPage`, `getPublishedServiceSlugs` | strip L1–74 |
| `app/location/[slug]/page.tsx` (4 Sep, or L2–73 of the file above) | dispatcher | add `legacy` branch; remove in-app `permanentRedirect` in favour of the proxy (§7.3) |
| `lib/content/assemble.ts` (4 Sep) | `distinctnessGate`, `assembleCityPage`, `assembleServicePage`, JSON-LD | no change for cutover; note the invented description fallback (§18 item 10) |
| `components/templates/{CityPage,ServicePage,StateHub,NationalHub}.tsx` (4 Sep) | templates | none |
| `app/admin/migration/page.tsx`, `app/admin/preview/[slug]/page.tsx` (9 Sep) | board layout, preview banner | generalise state; put behind §16 auth; fix the `MissingList` flag names (`faq_question_missing_in_export`, `hero_image_not_imported` do not exist in `flags.mjs`) |
| `next.config.ts` (4 Sep) | `trailingSlash: true`, `serverExternalPackages` | adopt; delete the 9 Sep `next.config.mjs` |
| `docs/architecture.md` (4 Sep) | §2 request path, §6 `redirects` / `page_sections` / `url_checks` sketches, §19 | update §4/§6 after §6 below lands |
| `data/audits/url-universe/*.csv` | classification (`url_pattern`, `state`, `city`, `service_*`, `duplicate_group`, `primary_map_type`, `priority`), the 539-URL probe, the 8,500-URL retirement probe | treated as **frozen inputs with a recorded hash** until the universe builder reproduces them |

---

## 4. Files and modules that need modification

Listed in the order they will be touched.

1. Reconstruct the tree (§17 step 0): copy the 4 Sep application code into the 9 Sep tree, strip banners,
   delete `.older-*` / `.alt-*`, replace `package.json`/`next.config.mjs` with the 4 Sep `package.json`/`next.config.ts`,
   delete `app/page.tsx` (MA pilot) in favour of the 4 Sep `app/page.tsx` (`redirect('/locations/')`).
2. `lib/db/schema.ts` — §6. Then `npm run db:generate` (never hand-edit SQL; migration `0002` referenced by
   `MIGRATION_IMPLEMENTATION.md` is absent from every tree and must be regenerated).
3. `lib/db/seed.ts` — `pages` rows come from `consumers/site-pages.jsonl`; `site.redirects` from
   `consumers/redirects.json`; `site.page_source` from `consumers/page-source.jsonl`. Keep the rest.
4. `app/location/[slug]/page.tsx` — add `kind === 'legacy' && fate === 'publish_verbatim'` → `LegacyPage`;
   `fate === 'redirect'` becomes a defensive fallback only (the proxy answers first).
5. `scripts/audit/validate-live-retirement-urls.py` → `scripts/probe/probe-production.py` (§8).
6. `scripts/migrate/agent.mjs` — `--dry-run` parsing; geocoder; `ma`. Not on the cutover path.
7. `app/admin/migration/page.tsx` — becomes the dashboard (§7.1); state parameterised.
8. `scripts/migrate/validate.mjs` — export the per-check functions so parity can reuse `seo_meta`,
   `structured_data`, `links`, `no_rewrite` for templated pages.
9. `CLAUDE.md` test matrix — the `308`/`404` rows for map entries are no longer the expectation (§18 item 17).

---

## 5. New modules required

```
scripts/universe/build-universe.mjs        §3.1  sources → url-universe.csv (+ ids)
scripts/probe/probe-production.py          §8    universe → production-truth.<run>.csv
scripts/ledger/build-ledger.mjs            §9    inputs → url-ledger.csv + summary + meta
scripts/ledger/rules/cutover.mjs           §9.4  decideCutover(row) — pure function
scripts/ledger/rules/legitimacy.mjs        §12.3 isLegitimateRedirect(row, dest) — pure function
scripts/ledger/rules/retirement.mjs        §12.4 classifyRetirement(row) — pure function
scripts/ledger/apply-decisions.mjs         §12   decisions.csv → ledger decision_* columns + batch diff
scripts/consumers/emit-consumers.mjs       §10   ledger → site-pages.jsonl, redirects.json, gone.json, sitemap-urls.txt, conflicts.csv, page-source.jsonl
scripts/consumers/graph-checks.mjs         §10.2 loop/self/chain/destination/state/catch-all/invalid
scripts/consumers/load-migration-db.mjs    §7.4  artefacts → Postgres schema `migration` (admin read model)
scripts/parity/parity-check.mjs            §11   staging vs production truth
scripts/parity/verbatim-expect.mjs         §11.2 expected text hash from page_source
scripts/monitor/watch-404.py               §15   edge logs → daily report
scripts/edge/kv-publish.mjs                §14   redirects.json → Cloudflare KV (idempotent, --dry-run)
edge/worker.js                             §14   exact-path lookup: 301/302/410, else pass to origin
proxy.ts  (Next 16 name for middleware; verify in node_modules/next/dist/docs before writing)
                                           §7.3  admin auth gate; redirect/410 fallback with exact status; noindex on non-prod hosts
components/templates/LegacyPage.tsx        §7.2  verbatim template
lib/content/verbatim.ts                    §7.2  render-time cleanup (pure; unit-tested on the 33,740-page defect)
lib/data/redirects.ts, lib/data/ledger.ts, lib/data/page-source.ts   loaders (only lib/data runs SQL)
lib/admin/auth.ts                          §16
app/admin/migration/{urls,urls/[audit_id],services,redirects,retirements,conflicts,parity,decisions}/page.tsx  §7
app/sitemap.ts, app/robots.ts              §10.5
data/decisions/decisions.csv               §12   the only human-written input
tests/                                     §15
```

---

## 6. Database / schema changes

All in `lib/db/schema.ts`, generated with `npm run db:generate`. Two schemas: `site` (what the public site
reads) and `migration` (the admin's read model, loaded from generated artefacts — files remain canonical).

### 6.1 `site` — changes

`site.pages` (existing) — add:

| Column | Type | Meaning |
| --- | --- | --- |
| `audit_id` | text, unique, not null for migrated rows | ledger identity |
| `state_id` | int fk `states` | the doc sketch has it; card resolution and hubs need it |
| `render_mode` | enum `render_mode('templated','verbatim','none')` | which template |
| `cutover_status` | smallint | 200 for SERVE rows; recorded so parity can compare |
| `source_sha256` | text | of the raw WordPress record the row was built from |
| `ledger_sha256` | text | which ledger produced the row |

Existing enums stay. `fate='publish_verbatim'` + `kind='legacy'` + `render_mode='verbatim'` is the verbatim
page. `fate='redirect'` and `fate='gone'` rows remain for `/location/` URLs so `card-resolution.ts` keeps
working, but the proxy and edge answer them from `site.redirects` first.

New `site.redirects` — one row per REDIRECT or GONE URL, any path, including the 397 outside `/location/`:

| Column | Type |
| --- | --- |
| `from_path` | text pk (exact path, trailing slash as in the universe) |
| `to_path` | text null (null for 410) |
| `status` | smallint (301 / 302 / 410) |
| `source` | enum `redirect_source('production','decision')` — at cutover always `production` |
| `production_source` | text null (`yoast_premium` / `redirection` / `wp_old_slug` / `yoast_meta` / `unknown`) — informative |
| `audit_id` | text |
| `active` | boolean |
| `ledger_sha256` | text |
| `published_to_kv_at` | timestamptz null |

New `site.page_source` — the immutable raw record behind every SERVE row (verbatim and templated):

| Column | Type |
| --- | --- |
| `page_id` | int fk `pages`, unique |
| `wp_post_id` | int |
| `post_title` | text |
| `post_content` | text — raw, byte-for-byte |
| `post_modified` | timestamptz |
| `yoast_title`, `yoast_metadesc` | text null |
| `thumbnail_id` | int null |
| `content_sha256` | text |
| `defects` | jsonb — e.g. `[{"code":"source_markup_defect","text":"</vc_column_text]","count":2}]` |
| `fetched_at` | timestamptz |

Nothing updates `post_content` after insert; a changed source produces a new row version by re-running the
consumer (checksum differs → reported, not silently replaced).

### 6.2 `migration` schema — read model for the admin

| Table | Loaded from | Key |
| --- | --- | --- |
| `migration.universe` | `url-universe.csv` | `audit_id` |
| `migration.probe_runs` | `production-truth.<run>.meta.json` | `run_id` |
| `migration.probe_results` | `production-truth.<run>.csv` | (`run_id`, `audit_id`) |
| `migration.url_ledger` | `url-ledger.csv` (all §9 columns) | `audit_id` |
| `migration.conflicts` | `conflicts.csv` | (`audit_id`, `conflict_code`) |
| `migration.decisions` | `decisions.csv` | (`audit_id`, `decided_at`) — append-only |
| `migration.parity_runs` / `parity_results` | `parity-report.<run>.csv` | (`run_id`, `audit_id`) |
| `migration.batches` | `batch-diff.<n>.json` | `batch_id` |
| `migration.services` | `legacy-service-universe.csv` + catalogue | `service_normalized` |

Indexes: `url_ledger(cutover_disposition)`, `(state, city)`, `(service_canonical)`, `(final_status)`,
`(traffic_clicks desc)`, `(priority)`, GIN on `conflict_codes`. 263,769 rows × ~70 columns is ~200 MB in
Postgres; PGlite handles it locally but slowly — use `DATABASE_URL` (Supabase or local Postgres) for admin work.

---

## 7. Admin dashboard architecture

Route group `app/admin/migration/`. Every page is a server component reading `migration.*` through
`lib/data/ledger.ts`; the only write path is `POST /admin/migration/decisions` (§12.2). All pages
`robots: noindex`, `Cache-Control: no-store`, behind §16.

| Route | Reads | Shows |
| --- | --- | --- |
| `/admin/migration` | ledger aggregates | universe total; production 200/3xx/404/5xx-error; migration buckets KEEP / CREATE_PAGE / CREATE_SERVICE / MERGE / REDIRECT / RETIRE / REVIEW / TECHNICAL_FIX; clicks / impressions / enquiries; conflicts total / P0 / P1 / unresolved; parity tested / passed / failed; probe run age; ledger hash; loaded artefact hashes |
| `/admin/migration/urls` | `url_ledger` | paginated table (server-side, 100/page); filters: action, first/final status, state, city, service, service_match, indexed, clicks (≥), enquiries (≥), has conflict, retirement class, duplicate group, technical flag; free-text on URL; sort by clicks, priority |
| `/admin/migration/urls/[audit_id]` | one ledger row + probe history + decisions + parity | URL · production (first/final status, final URL, chain, canonical, robots, title, h1, description, probed_at, drift between runs) · WordPress (post id, status, title, content class, defects) · classification · signals · migration (map proposal, cutover disposition + destination, render mode, future decision + destination) · approval (decision, approved_by, decided_at, reason) · links: preview on staging, production |
| `/admin/migration/services` | `migration.services` | the 92 catalogue rows; every legacy phrase with URL count, live count, clicks, states, current match (`EXACT_MATCH` / `ALIAS_MATCH` / `RELATED_SERVICE` / `AMBIGUOUS` / `NOT_MODELED` / `UNKNOWN`), proposed classification, business decision (`CREATE_SERVICE` / `MERGE_SERVICE` / `KEEP_SERVICE` / `REVIEW_SERVICE`) |
| `/admin/migration/redirects` | ledger rows with `first_status` 3xx or `map_disposition = REDIRECT` | source · production destination · production status · map destination · proposed destination · service relationship (`pair_type`) · city match · state match · clicks · conflict codes · approval; highlight production/map conflicts, chains, loops, cross-state, different-service, catch-all destinations, destinations returning 404 |
| `/admin/migration/retirements` | ledger rows with `map_disposition = RETIRE` or `final_status` 404/410 | URL · live status · audit retirement class · clicks · impressions · enquiries · WP status · content class · §12.4 class · decision. A live 200 row shows a red "SERVES A PAGE — needs explicit approval" state and the decision form refuses `RETIRE` without a non-empty reason and a second confirmation |
| `/admin/migration/conflicts` | `conflicts` | grouped by code, sorted P0 first; each row links to the URL detail |
| `/admin/migration/parity` | `parity_results` | per run: tested/passed/failed; failures by check; drill-down to URL with expected vs actual for each compared field |
| `/admin/migration/decisions` | `decisions` | the append-only log; pending (not yet applied to a ledger) vs applied (ledger hash); batch diffs |

Design: Tailwind is permitted for `/admin` only (`CLAUDE.md`). Tables are server-rendered; islands only for
filter state.

### 7.2 LegacyPage (verbatim mode)

Input: `page_source` row + `pages` row. Output: the site chrome (header/footer/sticky bar) around the
cleaned body, `title` = `yoast_title ?? post_title`, description = `yoast_metadesc ?? none`, canonical =
self, robots = as production (`index` unless production's robots said `noindex`), JSON-LD `WebPage` +
`BreadcrumbList` only, no rating markup, no invented sections, no service cards from the 92-catalogue
(that is a templated-page feature).

`lib/content/verbatim.ts` does, at render time only:
1. `cleanMarkup` (existing): comments, shortcode tags, script/style removed.
2. The `</vc_column_text]` family: the stray token is removed from the *render output* so an HTML parser
   does not swallow the remainder. The `page_source.defects` array already records it; the page shows nothing
   about it to the public and the admin detail lists it.
3. Sanitise: allow-list of tags/attributes (h1–h6, p, ul/ol/li, a[href], strong/em/b/i, br, img[src|alt],
   table family); strip inline `style`, `on*`, `javascript:` URLs.
4. Image URLs: keep `/wp-content/uploads/...` paths exactly (the R2 alias / origin proxy serves them — §14).
5. Never write back. The function is pure and unit-tested against fixtures drawn from real defect pages.

### 7.3 `proxy.ts` (Next 16 middleware)

Order per request:
1. Host is not the production host → add `X-Robots-Tag: noindex`.
2. Path starts with `/admin` → §16 gate.
3. Exact-path lookup in the redirect map (in-memory, loaded from `consumers/redirects.json` at boot and
   reloaded on a version change; **not** from `next.config` `redirects()` — tens of thousands of entries):
   hit → `NextResponse.redirect(to, status)` with the recorded status, or a 410 `Response` with a small
   branded body and `X-Robots-Tag: noindex`.
4. Otherwise continue to the route.

In production the edge worker answers step 3 first; the proxy is the miss path. Both read the same
generated file, so they cannot disagree.

### 7.4 Loading the read model

`scripts/consumers/load-migration-db.mjs --from <artefact dir> [--dry-run]`: truncates and reloads
`migration.*` from the named artefacts, records their sha256 in `migration.loads`. Idempotent; refuses to
load a ledger whose `meta.json` input hashes do not match the files on disk.

---

## 8. Production probe architecture

`scripts/probe/probe-production.py` — Python 3.9 + aiohttp (both present), derived from
`validate-live-retirement-urls.py`. Read-only: GET only, identifying User-Agent, never writes anywhere but
its own output directory.

### 8.1 Behaviour

| Aspect | Specification |
| --- | --- |
| Candidates | every `audit_id` in `url-universe.csv`; `--only <file>` for subsets; order = clicks desc, then audit_id (highest-value URLs are measured first) |
| Method | GET; `allow_redirects=False`; the loop follows `Location` by hand, resolving relative locations against the current URL, up to `--max-hops 5`; a 6th hop → `error=hop_limit` |
| Per hop recorded | status, `Location`, elapsed ms |
| Final 200 body | read fully; parse: `<link rel=canonical>`, `<title>`, first `<h1>`, `<meta name=description>`, `<meta name=robots>`, `content_length` (bytes), `content_type`; `body_sha256` (whole HTML, for drift); `main_text_sha256` (text of `<main>`/`article`/`.entry-content` after whitespace normalisation, for parity) |
| HTTP vs SEO | written to separate column groups (§9.2, §9.3); classification uses HTTP only |
| Concurrency | `--concurrency 20`, `--rps 20` token bucket (default), `--timeout 20`, `--retries 3` with exponential backoff + jitter on 429/5xx/timeout/connection errors; a 429 halves the rate for 60 s |
| Checkpointing | results appended per batch of 250 to `production-truth.<run_id>.csv`; `checkpoint.<run_id>.json` holds last audit_id and counters; `--resume` re-reads the CSV and skips rows whose classification is not transient |
| Run identity | `run_id = YYYYMMDDTHHMM`; `production-truth.<run_id>.meta.json` = started/finished, universe sha256, args, counts by classification; `production-truth.latest.csv` is a copy, never a symlink |
| Drift | `--diff <previous run>` emits `production-drift.<run_id>.csv`: rows whose first_status, final_status or final_url changed |
| Safety | refuses to run against any host but `https://www.chimcare.com` unless `--host` is given explicitly; refuses `--rps > 40` |

### 8.2 Output columns

`audit_id, url, first_status, final_status, final_url, redirect_count, redirect_chain, hop_statuses,
canonical, title, h1, meta_description, robots, content_length, content_type, body_sha256, main_text_sha256,
response_time_ms, attempts, error, probed_at, run_id, classification`

Classifications as in the existing script (`LIVE_200`, `REDIRECT_TO_200`, `REDIRECT_TO_404`,
`REDIRECT_TO_3XX`, `DIRECT_404`, `403`, `429`, `SERVER_ERROR`, `TIMEOUT`, `CONNECTION_ERROR`, `DNS_ERROR`,
`OTHER`) plus `GONE_410` and `HOP_LIMIT`. A transient result is never recorded as 404.

### 8.3 Rollout

1. `--limit 50` — the 50 highest-click URLs. Verify by hand with
   `curl -sS -o /dev/null -D - --max-redirs 0 https://www.chimcare.com<path>` for ten of them, including
   at least two production redirects, one 404 and one Yoast 410. Compare status, `Location`, and canonical.
2. `--limit 2000` — check the rate held at ≈20 rps and the 429 count is 0.
3. Full run in batches (`--from`/`--to` by rank), ≈ 263,769 / 20 ≈ 3.7 h. Run overnight.
4. Repeat weekly until cutover; keep every run; the ledger names the run it used.

---

## 9. Ledger architecture

`scripts/ledger/build-ledger.mjs --universe <csv> --truth <csv> [--decisions <csv>] --out <dir>`.
Node, `makeQuery` for WordPress, streaming CSV. Deterministic: rows sorted by `audit_id`; no timestamps
inside `url-ledger.csv`; `url-ledger.meta.json` carries `generated_at`, every input's sha256, and
`ledger_sha256` (sha256 of `url-ledger.csv`). `url-ledger.summary.json` carries the aggregates the dashboard
shows.

### 9.1 Universe (Phase 1) — `scripts/universe/build-universe.mjs`

Sources, each contributing `(normalized_url, source_tag)`:

| # | Source | Read from |
| --- | --- | --- |
| 1 | published `job_listing` slugs | `wp_posts` |
| 2 | `keep-pages.json` paths | file |
| 3 | Search Console export | file |
| 4 | `redirects.json` sources and destinations | file |
| 5 | `gone.json` | file |
| 6 | `_wp_old_slug` (as `/location/<slug>/`, per post type prefix) | `wp_postmeta` |
| 7 | `_yoast_post_redirect_info` origins | `wp_postmeta` |
| 8 | Redirection plugin `url` (exact-match rules; query-string rules recorded in `universe-excluded.csv`, not silently dropped) | `wp_redirection_items` |
| 9 | **Yoast Premium `wpseo-premium-redirects-base` origins and destinations** | `wp_options` (PHP-serialised; parse with a regex over `origin`/`url`/`type`) |
| 10 | **`wp_redirection_404` URLs with ≥ 10 hits under `/location/` or `/locations/`** (a requested-URL source; excluded patterns: paths containing `@`, `/wp-`, `.php`, `.env`, `/.well-known/`) | `wp_redirection_404` |
| 11 | `wp_posts.post_status != 'publish'` `job_listing` slugs (draft/private/trash) | `wp_posts` |
| 12 | production probe discoveries: any `final_url` on the site not already present | previous `production-truth` |

Normalisation (one function, unit-tested): strip scheme/host/query/fragment, decode `%2F`-free
percent-encoding, lower-case, collapse `//`, force one trailing slash, keep the original form in
`source_url`. `audit_id`: existing ids from the frozen `url-universe.csv` are preserved for their
`normalized_url`; new URLs receive `CH` + zero-padded numbers continuing from the current maximum, assigned
in sorted order of `normalized_url`, and the id map is written to `universe-id-map.csv`. Re-running on
unchanged inputs yields the same ids.

### 9.2 Columns — one row per `audit_id`

| Group | Columns |
| --- | --- |
| identity | `audit_id, source_url, normalized_url, contributing_sources` |
| production_http | `probe_run_id, first_status, final_status, final_url, redirect_count, redirect_chain, hop_statuses, response_time_ms, probed_at, probe_error` |
| production_seo | `canonical, canonical_matches_url, robots, title, h1, meta_description, content_length, content_type, main_text_sha256` |
| wordpress | `wp_post_id, wp_post_type, post_status, post_title, content_sha256, content_class, content_defects, has_yoast_title, has_yoast_metadesc, thumbnail_id` (`post_content` itself lives in `page-source.jsonl`, keyed by `audit_id`, not in the CSV) |
| map | `map_disposition` (KEEP / REDIRECT / GONE / none), `map_destination, map_source` (redirects_json / gone_json / keep_pages / duplicate_rule / yoast_meta / yoast_premium / redirection / wp_old_slug) |
| signals | `clicks, impressions, ctr, position, indexed, enquiries_total, enquiries_12m, enquiry_first, enquiry_last, enquiry_period` (the export's period, undated → `undated`; enquiries → `2020-09-07..2026-08-27`) |
| classification | `url_pattern, state, city, service_raw, service_normalized, service_canonical, service_match, duplicate_group, duplicate_survivor, catch_all_destination` (carried from the audit parser, re-derivable) |
| cutover | `cutover_disposition` (SERVE / REDIRECT / GONE / CONFLICT), `cutover_status, cutover_destination, render_mode` (templated / verbatim / none), `cutover_reason` |
| production_redirect | `production_redirect_to, production_redirect_status, production_redirect_source` |
| proposed_redirect | `proposed_redirect_to, proposed_redirect_source, pair_type, same_state, same_city, same_service` |
| approved_redirect | `approved_redirect_to, approved_redirect_status` (from decisions only) |
| conflicts | `conflict_codes` (pipe-separated), `priority` |
| decision | `decision, decision_destination, approved_by, decided_at, reason, decision_applied_ledger_sha256` |

### 9.3 Joins

- WordPress by `post_name` (indexed), `COLLATE utf8mb4_unicode_ci`; never `CONCAT` over `wp_posts`.
- Search Console and enquiries by `normalized_url`.
- Maps by `normalized_url`; a `redirects.json` key that normalises to the same path as another key is
  recorded as `map_duplicate_key` and both kept.
- Services by token multiset against the catalogue plus the synonym table; substring matching is not
  implemented anywhere in the module (tested by a negative test: `fireplace-flue-installation` must not
  resolve to `fireplace-installation`).

### 9.4 The cutover rule — `decideCutover(row)`

Evaluated in this order; the first match wins; every branch sets `cutover_reason`.

| # | Condition | `cutover_disposition` | `cutover_status` | destination / mode |
| --- | --- | --- | --- | --- |
| 1 | probe_error or final_status 5xx/429/403 or HOP_LIMIT | CONFLICT (`PROD_UNVERIFIED`) | — | re-probe before cutover; if still unverified → SERVE if WordPress publishes it, else GONE |
| 2 | first_status 301/302 and final_status 200 | REDIRECT | first_status | `final_url` (chain collapsed; `PROD_CHAIN_GT1` flag when hops > 1) |
| 3 | first_status 301/302 and final_status 404/410 | REDIRECT + CONFLICT (`PROD_REDIRECT_TO_DEAD`) | first_status | production's `Location` preserved; listed for batch 1 |
| 4 | first_status 200, service_match ∈ {EXACT_MATCH, ALIAS_MATCH}, city and state resolved, page passes `distinctnessGate` in staging | SERVE | 200 | `render_mode=templated` |
| 5 | first_status 200, anything else | SERVE | 200 | `render_mode=verbatim` |
| 6 | first_status 410 | GONE | 410 | — |
| 7 | first_status 404 | GONE | 410 (404 if the business prefers; one switch) | — |
| 8 | no probe row | CONFLICT (`NOT_PROBED`) | — | blocks emission |

Then, independently of the branch taken, conflict codes are added when:

| Code | Condition |
| --- | --- |
| `MAP_REDIRECT_PROD_200` | `map_disposition=REDIRECT` and first_status 200 (50,862 today) |
| `MAP_GONE_PROD_200` | `map_disposition=GONE` and first_status 200 (5,717 today) |
| `MAP_DEST_DIFFERS` | production redirects and `final_url ≠ map_destination` |
| `MAP_REDIRECT_PROD_404` | map says redirect, production 404 (2,476 today) |
| `PROD_REDIRECT_TO_HOMEPAGE` | `final_url = '/'` |
| `PROD_CROSS_STATE` | source and destination states differ |
| `PROD_CATCH_ALL_DEST` | destination is a catch-all (≥ 20 distinct source services) |
| `PROD_CHAIN_GT1`, `PROD_REDIRECT_TO_DEAD` | as above |
| `WP_PUBLISHED_PROD_404` | post_status publish, production 404 |
| `PROD_200_NO_WP_RECORD` | production 200, no WordPress row (767 today; hubs, homepage, taxonomy archives) |
| `CANONICAL_DIFFERS` | 200 with canonical ≠ self — **SEO note only, never changes the disposition** |
| `DUPLICATE_NO_SURVIVOR` | duplicate group with no production-chosen survivor |
| `SERVICE_UNMODELLED` | service_match ∉ {EXACT, ALIAS} — informational; drives CREATE_SERVICE |
| `SOURCE_MARKUP_DEFECT` | `content_defects` non-empty (33,740 today) |

### 9.5 CREATE, split

| Migration bucket (dashboard) | Ledger condition |
| --- | --- |
| KEEP | SERVE, templated, service in catalogue, no open conflict |
| CREATE_PAGE | SERVE, service_match ∈ {EXACT, ALIAS}, but no `site.pages` row exists yet in the app for this URL (the app's representation is created; the URL never changes) |
| CREATE_SERVICE | SERVE, verbatim, service_match ∉ {EXACT, ALIAS}; served verbatim at cutover; the service decision later flips `render_mode` to templated at the same URL |
| MERGE | `duplicate_group` with a survivor decision |
| REDIRECT | cutover REDIRECT (production) or approved future redirect |
| RETIRE | cutover GONE, or an approved RETIRE decision |
| REVIEW | any open P0/P1 conflict, CITY_UNKNOWN, PARSER_REVIEW, NO_SOURCE |
| TECHNICAL_FIX | `PROD_UNVERIFIED`, `HOP_LIMIT`, parser failures, chains > 1 that production itself has |

A service being absent from the 92 is never, by itself, a reason for REDIRECT or RETIRE.

### 9.6 Flag codes added to `lib/migration/flags.mjs`

`url_conflict_map_vs_production` (BUSINESS_UNVERIFIED), `url_production_unverified` (DERIVED),
`url_redirect_chain` (SOURCE_QUALITY_FLAG), `url_redirect_to_dead` (SOURCE_QUALITY_FLAG),
`url_service_unmodelled` (BUSINESS_UNVERIFIED).

---

## 10. Consumers

`scripts/consumers/emit-consumers.mjs --ledger <csv> --out consumers/ [--dry-run]`. Every file is sorted,
newline-terminated, without timestamps; `consumers/meta.json` carries `ledger_sha256` and each file's sha256.

| File | Rows | Content |
| --- | --- | --- |
| `site-pages.jsonl` | SERVE rows under `/location/` | `audit_id, slug, kind, fate, status, render_mode, city_slug, service_key, tier, legacy_post_id, legacy_url, cutover_status, gsc_clicks, lead_count, source_sha256` |
| `page-source.jsonl` | SERVE rows with a WordPress record | the §6.1 `page_source` fields, `post_content` raw |
| `redirects.json` | REDIRECT rows, any path | `{ "<from_path>": { "to": "<to_path>", "status": 301 } }` sorted by key |
| `gone.json` | GONE rows, any path | `["<path>", …]` — status 410 |
| `sitemap-urls.txt` | SERVE rows whose production `robots` did not say `noindex` and whose canonical is self | one path per line |
| `conflicts.csv` | rows with any conflict code | `audit_id, url, conflict_code, priority, clicks, enquiries, detail` |
| `serve-outside-location.csv` | SERVE rows not under `/location/` (homepage, hubs, blog…) | these need their own routes or an origin rule; the file makes the count visible instead of losing it |

### 10.2 Graph checks (hard stop; the run exits non-zero and writes nothing but `graph-report.json`)

| Check | Rule |
| --- | --- |
| loop | following `redirects.json` from any key must terminate |
| self | `from_path ≠ to_path` |
| chain | after emission no `to_path` is itself a key (the rule collapses production chains to their final 200; a chain that production ends on a non-200 is not collapsed and is a conflict) |
| destination exists | every `to_path` is a SERVE row or an external absolute URL explicitly allow-listed |
| state mismatch | source and destination states differ → allowed only when `production_redirect_source` is set (production does it today) **and** the row carries `PROD_CROSS_STATE`; a decision-sourced cross-state redirect requires `approved_by` |
| catch-all | destination fan-in ≥ 20 distinct source services → allowed for production-sourced rows, refused for decision-sourced rows |
| invalid destination | not a path, contains `@`, query string, fragment on a non-`/location/` page, or the homepage for a decision-sourced row |
| coverage | every universe `audit_id` appears in exactly one of: `site-pages.jsonl`, `redirects.json`, `gone.json`, `serve-outside-location.csv`, or `conflicts.csv` with a blocking code — and the counts sum to the universe |

### 10.3 Production vs proposed vs approved

`redirects.json` at cutover is built **only** from `production_redirect_*`. `proposed_redirect_*` (the maps)
and `approved_redirect_*` (decisions) never reach a consumer until §12 applies a batch.

### 10.4 `site.pages` seeding

`lib/db/seed.ts` reads `site-pages.jsonl` + `page-source.jsonl`, never `build-mn-seed.mjs` output for
`pages`. Cities, branches, FAQs, hero media still come from the agent dataset.

### 10.5 Sitemap and robots

`app/sitemap.ts` with `generateSitemaps()` chunked at 20,000 from `sitemap-urls.txt` loaded into
`site.pages` (`sitemap=true`), `lastmod` = `pages.updated_at`. `app/robots.ts`: allow all on the production
host, `Disallow: /admin`, sitemap index URL; on non-production hosts `Disallow: /` and the proxy's
`X-Robots-Tag`.

---

## 11. Parity workflow

`scripts/parity/parity-check.mjs --ledger <csv> --truth <csv> --staging <base> [--sample …] --out parity/`.

### 11.1 Population

All rows with `clicks > 0` (16,982 today) ∪ all cutover REDIRECT rows ∪ all GONE rows with impressions ∪ a
2 % sample of the remainder stratified by (`cutover_disposition`, `render_mode`, `state`) ∪ every row a
batch touches. `--all` for the rehearsal before cutover.

### 11.2 Comparison per URL (staging fetched with `redirect: 'manual'`, hops followed by hand)

| Field | Rule | Gate? |
| --- | --- | --- |
| HTTP status (first) | equal | **yes** |
| final URL | equal after normalisation | **yes** |
| final status | equal | **yes** |
| canonical | equal to production's, or self where production had none | report |
| title, h1, meta description | equal after whitespace/entity normalisation; description compared only when production had one | report |
| robots | equal | report (gate if production `noindex` becomes indexable) |
| structured data | JSON-LD `@type` set ⊇ production's WebPage/BreadcrumbList; no `AggregateRating`/`Review` | report |
| image URLs | set of `/wp-content/uploads/…` src equal (verbatim); hero path + sha per `validate.mjs` (templated) | report |
| internal links | set of `/location/…` hrefs: every production link resolves on staging (status < 400) | report |
| content — verbatim | `sha256(normalised text of LegacyPage body)` **equals** `sha256(normalised text of cleanMarkup(page_source.post_content))` computed by `verbatim-expect.mjs`; production `main_text_sha256` recorded alongside as a second signal, not a gate | **yes** for the exact-hash comparison |
| content — templated | the 15 `validate.mjs` checks | report; `faq`, `no_rewrite`, `hero_file` gate |

Output `parity-report.<run>.csv` (`audit_id, url, check, expected, actual, ok`) and `parity-summary.<run>.json`.
Exit non-zero on any gate failure. Loaded into `migration.parity_*` for `/admin/migration/parity`.

### 11.3 Sequence

1. Verbatim expectation fixtures: 200 pages including 50 with `SOURCE_MARKUP_DEFECT`.
2. Templated pages: the sealed Minnesota 134 through the existing 15 checks (extraction regression stays
   valid even though the URL-status baseline does not — §18 item 17).
3. Full population on staging; iterate until zero gate failures; the report is attached to the cutover ticket.

---

## 12. Decision workflow

### 12.1 `data/decisions/decisions.csv`

`audit_id, decision, destination, approved_by, decided_at, reason`

`decision ∈ {KEEP, CREATE_PAGE, CREATE_SERVICE, REDIRECT, MERGE, RETIRE, MERGE_SERVICE, REVIEW}`;
service-level decisions use `audit_id = "service:<service_normalized>"`. Append-only; a later row for the
same `audit_id` supersedes; a `REVIEW` row re-opens. Validated on every load: known `audit_id`, allowed
decision, ISO `decided_at`, non-empty `approved_by` and `reason`, destination required for REDIRECT/MERGE
and forbidden otherwise.

### 12.2 Recording a decision from the admin

`POST /admin/migration/decisions` (server action): validates as above, refuses `RETIRE` for a row whose
`final_status` is 200 unless `confirm_live_retirement=yes` is present and `reason` ≥ 20 characters,
appends one row to `decisions.csv` with `approved_by` taken from the session (§16), never from the form.
It does not touch the ledger or any generated file.

### 12.3 Redirect legitimacy — `isLegitimateRedirect(row, dest)` (future redirects only)

All must hold: same `state`; same `city` unless the decision row says `cross_city_approved`; same
`service_canonical`, or `pair_type = NAMING_VARIANT`, or an approved child → parent relationship listed in
`rules/service-parents.json`; no substring or superset matching (the function only ever compares token
multisets and exact keys); destination is a SERVE row; destination is not `/`; destination fan-in < 20
services; cross-state requires `approved_by` and `reason`; `pair_type = DIFFERENT_FUEL_OR_APPLIANCE` is
refused regardless of approval unless the row carries `override=fuel` and a named approver.

### 12.4 Retirement classification — `classifyRetirement(row)`

| production | class | cutover effect |
| --- | --- | --- |
| 404 | RETIRE_CANDIDATE | GONE (already dead) |
| 410 | RETIRE_CANDIDATE | GONE |
| 200 | KEEP_SERVE_UNTIL_APPROVED | SERVE; admin shows the warning state |
| 301 / 302 | REVIEW_REDIRECT | REDIRECT as production does |
| 5xx / timeout / hop limit | TECHNICAL_REVIEW | CONFLICT |
| any, with clicks or enquiries | + HIGH_PRIORITY_REVIEW | unchanged; priority raised |

Membership in `gone.json` never deletes anything.

### 12.5 The batch process

```
decision(s) appended to decisions.csv
  → build-ledger --decisions            (new ledger, new sha)
  → apply-decisions --diff <prev sha>   writes batch-diff.<n>.json: every audit_id whose cutover/approved
                                         columns changed, old → new, clicks and enquiries at stake, summed
  → human reads the diff in /admin/migration/decisions and approves the batch (approved_by, timestamp)
  → emit-consumers                       (graph checks)
  → parity-check --only <affected>       (gate)
  → kv-publish / load-migration-db / seed --pages-only
  → deploy
  → watch-404 for 4 weeks; GSC weekly
```
No batch reaches `emit-consumers` unless `batch-diff.<n>.json` exists and is approved. First batch:
the 11 measured map-versus-production conflicts + the 430 P0 rows + the `PROD_REDIRECT_TO_DEAD` and
`PROD_REDIRECT_TO_HOMEPAGE` sets.

---

## 13. Cutover procedure

Pre-conditions (all machine-checked by `scripts/cutover/preflight.mjs`):
1. Probe run ≤ 7 days old; drift since the previous run reviewed.
2. Ledger built from that run; coverage check passes (§10.2); no `NOT_PROBED`.
3. Consumers emitted; graph checks green; `meta.json` hashes match what is loaded in staging and in KV.
4. Parity `--all` green on staging against the production truth of the same run.
5. Sitemap generated; Search Console and Bing verified for the new host; GSC baseline exported.
6. WordPress frozen: editing disabled (`DISALLOW_FILE_MODS`, editor roles set read-only or maintenance
   plugin), cron paused; it keeps serving on its current origin hostname.
7. Rollback drill performed on staging (§14) within the previous 7 days.

Steps:
1. Publish `redirects.json` + `gone.json` to KV (`kv-publish --apply`), verify 200 random keys.
2. Switch the Cloudflare origin for `www.chimcare.com` from WordPress to the new app; keep WordPress
   reachable at `origin-wp.<internal>` for the fallback.
3. Immediately re-run the probe on the 16,982 click-bearing URLs against production (`--host` explicit)
   and diff against the pre-cutover truth: zero status/final-URL differences expected.
4. Submit the sitemap index. Start §15 monitoring.
5. Not applied on cutover day: the fate maps, retirements, consolidation, renames, pattern normalisation,
   any decision batch.

---

## 14. Rollback procedure

Rollback is an origin switch, never a data rebuild.

| Trigger (any one, measured over the stated window) | Action |
| --- | --- |
| > 50 P0 404s (SERVE/REDIRECT rows returning 404) in any hour | switch origin back to WordPress |
| 5xx > 1 % of requests over 15 min | switch origin back |
| p95 latency > 2 × the pre-cutover baseline over 30 min | investigate; switch back at 60 min |
| enquiries over 48 h < 50 % of the same weekday baseline | switch back, investigate |
| GSC "Not found (404)" coverage errors rising on SERVE rows for 3 consecutive days | switch back |

Mechanics: KV redirect map has a kill switch (`redirects_enabled=false`) so the edge passes everything to
whichever origin is active; the WordPress origin was never changed, so a switch back restores behaviour
exactly; the new app keeps running so the cause can be diagnosed in place. Rehearsed on staging before
cutover by switching a staging hostname between the two origins and re-running the probe.

---

## 15. Monitoring procedure (daily, from cutover for 4 weeks, then weekly)

`scripts/monitor/watch-404.py --logs <cloudflare logpush export or worker analytics> --ledger <csv>`:

1. Aggregate requests by path and status for the day.
2. Join to the ledger by `normalized_url`.
3. Classify: `EXPECTED_GONE` (GONE row), `UNEXPECTED_404_SERVE` (**P0**), `UNEXPECTED_404_REDIRECT`
   (**P0**), `UNEXPECTED_STATUS_REDIRECT` (row is REDIRECT but the day's status differs), `5XX`,
   `NOT_IN_UNIVERSE` (compared against the `wp_redirection_404` baseline: the top background patterns —
   `/wp-login.php`, `/.env`, `apple-touch-icon`, the `…/harold@chimcare.com` email-suffix family — are
   expected noise and reported separately), `LATENCY` (p50/p95 by disposition).
4. Report `monitor/<date>.md` + CSV; P0 rows open a ticket the same day; enquiry count from the booking
   table and Search Console clicks (once dated data exists) plotted against the baseline.

Baseline for "normal": WordPress's own 404 log — 1,670,413 hits / 473,258 distinct URLs in five months, of
which only 3,474 of the top 20,000 are universe URLs. A day is not alarming because it has 404s; it is
alarming when a SERVE or REDIRECT row returns one.

---

## 16. Security / authentication requirements

| Item | Requirement |
| --- | --- |
| `/admin/*` | gated in `proxy.ts`; production: Cloudflare Access (identity) **and** an app session; non-production: app session only. Never open because `NODE_ENV !== 'production'`; a `ADMIN_OPEN=1` env var is the only override and the dashboard shows a red banner when set |
| Session | HttpOnly, Secure, SameSite=Lax cookie holding an HMAC-signed token; login form exchanges `ADMIN_TOKEN` (constant-time compare) for a session; no token in query strings; 401 on failure (not 404) |
| Decisions | server action requires the session; `approved_by` from the session identity; CSRF via same-origin check + form token; rate-limited |
| Robots | `noindex` metadata and `X-Robots-Tag: noindex` on every `/admin` response and on non-production hosts |
| Database | app connects through the pooler with a role that cannot write `site.page_source.post_content` after insert (trigger raises); `migration.*` write role only for the loader |
| WordPress | MySQL user for all scripts is SELECT-only (`GRANT SELECT`); production reached by GET only, with the identifying User-Agent, ≤ 20 rps |
| Secrets | `.env` never committed; `ADMIN_TOKEN`, `DATABASE_URL`, Cloudflare API token in the host's secret store |
| PII | the 404 log contains request paths with personal email addresses; it is used for counts and pattern detection only and its rows are not copied into any published artefact; `wp_gf_entry` contributes counts and dates only |
| Verbatim rendering | allow-list sanitiser (§7.2); no inline scripts/styles from source; CSP for `/location/*` without `unsafe-inline` scripts |

---

## 17. Estimated implementation order

Dependencies only; no durations are claimed.

| Step | Work | Depends on | Done when |
| --- | --- | --- | --- |
| 0 | Reconstruct one tree (§1.1–1.2); `npm install`; schema §6; `db:generate`; `typecheck` clean; regenerate MN datasets (`build-mn-seed`, `agent --apply`, `recover-mn-faqs`, `recover-mn-media`); extraction regression against the sealed counts (134 / 109 / 25 / 642 / 15) | — | `npm run typecheck` 0; agent regression identical on extraction fields |
| 1 | `build-universe.mjs` with the 12 sources; reproduce the frozen `url-universe.csv` ids; report the delta (expected: + Yoast Premium origins/destinations, + 404-log URLs, + non-published slugs) | 0 | universe CSV + id map + delta report |
| 2 | `probe-production.py`; smoke 50 → 2,000 → full; weekly schedule | 1 | `production-truth.<run>.csv` covering every `audit_id`; manual verification log |
| 3 | `build-ledger.mjs`, `rules/cutover.mjs`, conflict codes, summary | 1, 2 | ledger; coverage sums to the universe; conflicts.csv |
| 4 | `page_source` extraction, `LegacyPage`, `verbatim.ts`, dispatcher branch, `proxy.ts` redirects with exact status, sitemap/robots | 0, 3 | staging renders a verbatim page and a 301 identical to production for a sampled set |
| 5 | `emit-consumers.mjs` + graph checks; `seed.ts` from consumers; `load-migration-db.mjs` | 3, 4 | all consumers emitted; graph green; staging seeded from them |
| 6 | Admin: auth first, then dashboard, urls, url detail, conflicts, redirects, retirements, services, parity, decisions | 5 | every §7 route reachable only with a session |
| 7 | `parity-check.mjs`; verbatim fixtures; full run; iterate to green | 4, 5 | gate green on `--all` |
| 8 | Edge: `worker.js`, `kv-publish.mjs`; rollback drill; `preflight.mjs` | host decision, 5 | 200-key spot check; drill log |
| 9 | Cutover (§13) | 7, 8 | post-cutover probe diff zero on click-bearing URLs |
| 10 | Monitoring (§15) from day 1 | 9 | daily reports; P0 zero |
| 11 | Batch 1 (§12.5) | 9, decisions from the business | diff approved; parity on affected rows green |

---

## 18. Contradictions found, and the safest resolution for each

Each entry names the sources that disagree. None was resolved silently; the resolution is a recommendation.

| # | Contradiction | Sources | Safest resolution |
| --- | --- | --- | --- |
| 1 | The fate maps are applied by the code (`gone.json` → `fate='gone'`/404, `redirects.json` → `fate='redirect'`/308) but the approach and the audit say the maps were never applied to production and contradict it where it redirects | `scripts/build-mn-seed.mjs:313–318`; `CLAUDE.md` test matrix; `URL_MIGRATION_APPROACH.md` L16–20; `COMPLETE_URL_MIGRATION_AUDIT.md` L16–54 | `pages` rows come from the ledger's `cutover_*` columns (production truth). Maps populate `map_*` / `proposed_*` only. `build-mn-seed.mjs` stops producing `pages` |
| 2 | The dispatcher emits 308 (`permanentRedirect`); production emits 301/302; the parity gate must fail on status mismatch; `docs/architecture.md` L86 says "No 308 hops on legacy URLs" | `app/location/[slug]/page.tsx:69`; `URL_MIGRATION_STRATEGY.md` §4 "308 vs 301"; probe results | Exact status from `site.redirects` at the edge and in `proxy.ts`; the in-app `permanentRedirect` remains only as a last-resort fallback and is recorded as a known 308 exception in parity |
| 3 | "Destination must not be the homepage" vs production redirecting to `/` today (Redirection rule 10 `/location/bend-chimney-sweep/`; 5 Yoast Premium rules) | brief §REDIRECT LEGITIMACY; `wp_redirection_items` row 10; `wpseo-premium-redirects-base` | Preserve at cutover (behaviour rule wins), tag `PROD_REDIRECT_TO_HOMEPAGE`, put in batch 1; the legitimacy rule governs *future* redirects only |
| 4 | The universe's nine sources omit the Yoast Premium redirect option (757 rules, 20 origins absent), the two query-string Redirection rules, and the 404 request log | `COMPLETE_URL_MIGRATION_AUDIT.md` §1; `wp_options`; `wp_redirection_404` | Twelve sources (§9.1); do not hard-code 263,769 anywhere; report the delta |
| 5 | `RETIRE + 200` (5,717) → 404 under the current code vs "KEEP/SERVE until explicit approval" | `build-mn-seed.mjs`; brief §RETIREMENT | §12.4; `gone.json` never deletes |
| 6 | "The ledger must be reproducible" vs the universe generator and `whole-site-audit.sqlite` being lost | `PROJECT_CONTEXT_HANDOFF.md` L74, L155; `DECIDED_88110_URL_AUDIT.md` §S1.1 | Rebuild the generator (step 1); until it reproduces the frozen CSV, the CSV is an input with a recorded hash and the classification columns are labelled `carried_from_audit_2026-09-10` |
| 7 | `site.pages.slug` is a `/location/` segment; 397 universe URLs are not under `/location/`; the spec requires exact path → destination for every URL | `lib/db/schema.ts` `pages.slug` comment; universe prefix census | `site.redirects.from_path` is a full path; `serve-outside-location.csv` makes the SERVE remainder visible; hub/homepage routes are file-based and listed there |
| 8 | `kind='legacy'` → 404 today vs verbatim mode required | dispatcher; `mn-url-audit.mjs:210`; `docs/architecture.md` §2 (`LegacyShell`) | `LegacyPage` + `page_source` (§7.2) |
| 9 | `trailingSlash: true` is "VERIFIED" in three documents; the 9 Sep `next.config.mjs` has no such key | `MIGRATION_IMPLEMENTATION.md` §2.1 L225; `URL_MIGRATION_STRATEGY.md` §2; `next.config.mjs` | Adopt the 4 Sep `next.config.ts`; the probe records slashless behaviour (WordPress 301s to the slash) so parity covers it |
| 10 | "Never generate metadata" vs `assembleCityPage` inventing a description when the source has none (`city.metaDescription ?? 'Chimney sweep, inspection…'`) and `validate.mjs` accepting any description when the source has none | `MIGRATION_IMPLEMENTATION.md` §9.2 L796, §2.2; `assemble.ts:165–172`; `validate.mjs` `seo_meta`; `LEGACY_URL_UNIVERSE_AUDIT.md` "generate from service, town and state" | Cutover: templated pages emit a description only when WordPress had one; the fallback becomes a recorded decision (`service:*` level, `CREATE_PAGE` with `reason`) before it is enabled. Parity compares descriptions only where production had one |
| 11 | Sealed Minnesota baseline expects 2,864 → 200 · 6,803 → 308 · 10,812 → 404, and `CLAUDE.md`'s matrix expects 308/404 for map rows | `PROJECT_CONTEXT_HANDOFF.md` §4; `CLAUDE.md` L44–56 | Keep the sealed dataset as the **extraction** regression (cities, FAQs, media, checksums). Retire its URL-status expectations; the URL baseline is the production truth run. Update `CLAUDE.md` after approval |
| 12 | Admin "sits behind Cloudflare Access + auth" vs a `?token=` compare skipped outside production | `app/admin/bookings/page.tsx:10`; `app/admin/migration/page.tsx:17`; `.env.example` | §16 |
| 13 | `--dry-run` documented as supported; the flag is inert (dry run is the default, `--apply` is the only switch); `--report` writes in dry run | `CLAUDE.md` L30; `agent.mjs:448`; postmortem §17 | Parse `--dry-run` explicitly; document `--report` as an output; apply the same convention to every new script |
| 14 | `validate-render.mjs` described as sharing `validate.mjs`; it is a duplicate | `CLAUDE.md` L16; `PROJECT_CONTEXT_HANDOFF.md` L129 | Delete the duplicate; one implementation |
| 15 | Deployment target: Cloud Run (`docs/architecture.md`, `CLAUDE.md` L32) vs Vercel (brief); nothing configured | `MIGRATION_IMPLEMENTATION.md` §CORRECTIONS L72–86 | Decide before step 8; everything before it is host-agnostic; the edge layer is Cloudflare either way because Cloudflare already fronts the site |
| 16 | Redirect-graph and universe figures differ across documents (loops 1/5/7; chains 1/677/767/773; cross-state 3/16/67/70/72/76; universe 262,535/262,987/263,769; shortcode defect 20/26/29,206/30,013/30,089/33,740) | explorer report C7, C8, C11 | The ledger recomputes all of them from primary sources; every reconstructed figure is labelled with the run that produced it; documents are not corrected retroactively |
| 17 | `_wp_old_slug` policy: "extract and preserve as redirect audit records requiring approval" vs "must not be used naively" (one old slug → 75 pages) | `URL_MIGRATION_STRATEGY.md` §3; `MIGRATION_IMPLEMENTATION.md` §10.4 | The probe captures what WordPress actually does with each old slug (a 301 to one page); that observed redirect is the cutover row. The meta key itself is a universe source and a `production_redirect_source` label, never a rule |
| 18 | Precedence order in the reconciliation (`gone.json` outranks `redirects.json`, a live hub page outranks both) vs the brief's "production behaviour takes precedence over stale maps" | `WHOLE_SITE_URL_RECONCILIATION.md` §6; brief §PHASE 4 | Production wins at cutover; the reconciliation's order is retained only for computing `proposed_*` from the maps |
| 19 | Yoast Premium rules of type 410 (5) vs "Production 404/410 → remain gone" | `wpseo-premium-redirects-base` | Emit 410 for them (rule 6 in §9.4); the probe confirms each |
| 20 | Distinctness gate: doc says ≥ 2 FAQs, code says ≥ 1, and a global FAQ satisfies "city-specific" | `docs/architecture.md` §7; `assemble.ts:67–81`; `lib/data/cities.ts:19` | Not a cutover matter (templated pages only). Record as an open item; do not change the gate without re-sealing the Minnesota counts |
| 21 | Migration `0002_fast_salo` is referenced as applied; no tree contains it; the 9 Sep schema has its columns | `MIGRATION_IMPLEMENTATION.md` §6.2; `lib/db/migrations/` | Regenerate from the reconstructed schema with `db:generate`; never hand-write it |
| 22 | The admin's `MissingList` maps flag codes that `flags.mjs` does not define (`faq_question_missing_in_export`, `hero_image_not_imported`) | `app/admin/migration/page.tsx:97–103`; `lib/migration/flags.mjs` | Use the defined codes (`faq_missing_in_source`, `hero_image_missing`); add a type-level check so an unknown code fails `typecheck` |
| 23 | "Minnesota is representative" is assumed in several plans; measured whole-site figures differ by state (CA 2.7 % unresolved, WA 61.4 %) | `chimcare-mn-not-representative` finding | Every threshold and estimate in this specification is computed per state from the ledger; nothing is scaled from Minnesota |

---

## 19. Limits of this specification

- Production status was measured for 539 + 8,500 URLs, not all 263,769; the full probe (step 2) may change
  the counts quoted in §0 and §9. The code reads counts from inputs.
- The `wp_redirection_404` and Search Console inputs are undated or partially dated; they rank, they do not
  prove absence of value.
- No content-quality or near-duplicate measure exists; "CONTENT_STRONG" is structural. Nothing here retires
  or merges a page on that basis.
- The deployment host is undecided; §14 is written for Cloudflare in front of either candidate.
