# Chimcare Migration — Project Context Handoff

**Paste this into a new conversation to continue the work. Everything below was measured from the
repository and the source database as of 2026-09-08. Nothing is estimated.**

---

## 1. What the project is

Chimcare.com is a chimney-service company whose WordPress site has **229,621 published location
pages** across 22 US states. It is being rebuilt in **Next.js 16** (App Router, React 19, Drizzle,
Postgres). SEO must not regress. The work so far has been a **Minnesota vertical slice** that proves
the migration machinery, plus two whole-site audits that measure the remaining scale.

The governing rule, quoted from `CLAUDE.md`:

> The agent copies. It must never write copy, paraphrase, fix grammar, invent an FAQ, area, local
> line, alt text or metadata, guess a territory, replace/rename/re-encode/optimise an image, repair a
> source defect, change a source URL, or write to WordPress. Where the source has nothing, the field
> stays empty and the page is flagged.

WordPress is **read-only** throughout. 26 SELECT statements exist across all scripts; zero writes.

---

## 2. Where everything lives

```
~/Desktop/chimcare/
├── chimcare-web 2/            THE REPO. Next.js app + migration agent + audits + reports. 1 git commit, not pushed.
├── chimcare-rebuild-main/     business inputs: branches.json (105 offices), keep-pages.json, redirects.json, gone.json, pricing.json
├── Chimcare-Migration/        2.4 GB export; only output/job_listings.jsonl is ever read, by the old pilot builder
├── chimcare_local.sql.gz      674 MB MySQL dump of the WordPress DB, ready to share
└── SETUP_FOR_FRIEND.md        setup guide for a new machine
```

**The WordPress source database:** MySQL 8.0, `chimcare_local`, `127.0.0.1`, user `root`, **no
password**. 242,592 posts, 229,621 published `job_listing`. The scripts pass no password flag; a
password-protected MySQL needs `~/.my.cnf`.

**The app runs with no database setup.** `npm install && npm run dev` starts embedded PGlite,
migrates and seeds from `data/seed/`. MySQL is needed only to re-run the migration agent.

---

## 3. What has been built

### The migration agent — `scripts/migrate/`

| File | Role |
|---|---|
| `source.mjs` | Only WordPress contact. Three SELECTs via the `mysql` CLI (`-N -B --raw`, JSON_ARRAYAGG). Extractors: `cleanMarkup`, `areasFrom`, `localSpecificsFrom`, `faqsFrom`, `markupDefectsFrom`, `parseAttachmentMeta`, `ensureAsset` (byte-for-byte media download, SHA-256) |
| `states.mjs` | Per-state config. `mn` works. **`ma` exists but cannot run** (defines `citySlugRes` array; agent reads singular `citySlugRe`/`branchSlugRe`/`coverageSlugRe`) |
| `agent.mjs` | Orchestrator: FETCH → MAP → GATE → EXCLUDE → IDEMPOTENCY → RENDER+VALIDATE → STORE (apply only) → REPORT → REGRESSION. Dry run is default; `--dry-run` flag is inert; every write behind `if (APPLY)` except `--report` |
| `validate.mjs` | The 15 render checks |
| `geocode.mjs` | Correct per-state geocoder, state-qualified keys (`MA:lexington`). **The agent does not call it** — it hard-codes `data/seed/mn-geocode.json` keyed by bare city name (line 47). Cross-state contamination vector |

### The app

One dynamic route `app/location/[slug]/page.tsx`. The `pages` row decides: redirect → 308; city
(if gate passes) → `CityPage`; service → `ServicePage`; **`kind='legacy'` → 404 (no template)**.
Hub `app/locations/[state]/page.tsx` resolves every card through `lib/migration/card-resolution.ts`.
Admin: `/admin/migration/` (hard-codes `'mn'`), `/admin/preview/{slug}/`. Health: `/api/health/`.
Schema: Postgres `site`, 11 tables, 12 FKs. **`pages` has no `state_id`; `faqs.scope_id` has no FK;
`redirect_to` is free text.** No sitemap, no robots, no middleware, no test runner, no lint,
`lib/seo/` is empty.

### Datasets

- `data/seed/mn.migration.json` — 134 cities, `source{}`/`derived{}`/`flags[]`/`checksums{}`
- `data/seed/mn.ledger.json` — idempotency checksums
- `data/seed/minnesota.generated.json` — the 20,479-URL universe (pilot builder, Minnesota-only)
- `data/seed/services.ts` — the 92-service catalogue, **generated from the Spokane design mock**
- `data/audits/whole-site-audit.sqlite` — 262,535 URLs, 22 states, 208 services. **No script on disk produces it.**

---

## 4. The sealed Minnesota baseline (VERIFIED, do not change)

```
150 cities = 14 branch + 120 coverage-with-page + 16 no-source
134 migrated pages · 109 publishable · 25 needs_review
642 FAQ pairs · 15 hero attachments (byte-verified) · 454 flags
20,479 URLs = 2,864 → 200 · 6,803 → 308 · 10,812 → 404
404 = 9,568 LEGACY_NOT_MIGRATED + 1,219 GONE + 25 REVIEW
Regression: 0 source / 0 content / 0 media / 0 SEO / 0 URL changes; two applies byte-identical
Validation: 15 checks × 134 pages all pass; 16/16 no-source uncreated
Typecheck 0 · build 0 · lint NOT CONFIGURED · responsive clean at 390/834/1440
```

Minnesota redirect defects (open): 1 loop (`chimney-cap-repair-lonsdale-mn` → itself, retires a live
page; caused by our builder's last-segment keying), 1 chain, 3 cross-state to an Oregon page, 65
landing on withheld pages.

---

## 5. Whole-site findings (VERIFIED)

| Finding | Value |
|---|---|
| Legacy URL records | 262,535 (229,617 live + 32,918 fate-map-only) |
| Fully linkable State→City→Service→Destination | 87,581 (33.4%) |
| Live URLs with no page kind (undecided 404) | **85,227 (37.1%)** |
| Redirects landing on a 404 | **31,799 of 51,607 (61.6%)** |
| Services WordPress publishes | **208** (vs 92 modelled) |
| URLs naming a service the app cannot represent | **105,220** |
| Engineering defects vs business decisions | 1,221 vs 173,733 (99.3% business) |
| URL shapes | 80.4% `{service}-in-{city}-{state}`; rest are mangled variants of the same intent |
| Malformed shortcode `</name]` | **30,089 pages (13.1%)** |
| Raw Markdown never converted | 1,642 |
| No `<h2>` structure | 123 |
| **Clean, migrate as-is** | **197,767 (86.1%)** |
| Boston photo as featured image | 227,511 pages |
| Yoast meta descriptions stored | 376 of 229,621; OG/Twitter keys do not exist |
| Minnesota unresolved vs site | 46.3% vs 32.5% — **MN is not representative** (CA 2.7%, WA 61.5%) |

Service matching: 94 exact + 5 alias = 99 map; 30 one-token-away (POSSIBLE_MATCH, never
auto-mapped, e.g. `Fireplace Flue Installation` ≠ `fireplace-installation`); 72 with no
counterpart; **never match by substring or superset**.

---

## 6. Key discoveries and corrections made during the work

- **All 14 MN branch cities fail the gate on an extractor limitation, not missing content.** Their local text exists under a heading (`Why {City} Homeowners Trust Chimcare`) the extractor does not read, and `agent.mjs:126` skips branch pages by code. Worth 14 of the 25 withheld pages; will repeat in every state.
- **Minnesota uses 8 city-page slug forms; the builder knows 2.** 267 city pages exist; 68 are misclassified as unresolved legacy. Five MN URLs are LLM editing-note slugs the baseline never saw (WP 135455, 136825, 139451, 141671, 144561).
- **Farmingon** (misspelled live slug) has no coordinates only because the geocode cache is keyed by the correct spelling "Farmington".
- **Corrections I made to my own earlier claims:** 760 distinct phrases → 187 (bad extraction); a superset rule wrongly mapped flue→fireplace installation, reverted; postmortem wrongly said no per-state geocoder / no `ma` config exist (both exist, agent ignores them); "WordPress supplies none" for withheld pages was false.
- **`validate-render.mjs` is a duplicate of `validate.mjs`**, not shared as `CLAUDE.md` claims.
- **`port-css.mjs`** resolves its root via `URL.pathname` and would write to `chimcare-web%202/` from this checkout (space in folder name).
- **`check-pages.mjs` writes a real booking row.**

---

## 7. Documents produced (all in `chimcare-web 2/`)

| File | Purpose |
|---|---|
| `reports/CHIMCARE_PRE_IMPLEMENTATION_MIGRATION_STRATEGY.md` | 1,723 lines. How the system actually works, every claim labelled CURRENT/VERIFIED/PLANNED/RISK/BUSINESS DECISION |
| `reports/CHIMCARE_MINNESOTA_MIGRATION_POSTMORTEM.md` | 984 lines. What Minnesota proved and exposed |
| `reports/URL_MIGRATION_PLAN_COMPARISON.md` | Four legacy-URL plans evaluated against real data; recommends the hybrid |
| `reports/SEO_IMPROVEMENT_PLAN.md` | 5-phase SEO plan, 34 actions, each with evidence |
| `reports/MINNESOTA_SERVICE_CATALOGUE_AUDIT.md` | 92 vs 208; the Flue Installation example |
| `reports/WHOLE_SITE_*.md` (4 files) | The whole-site audits (generator missing) |
| `MIGRATION_RELIABILITY_POSTMORTEM.md` | 28-section reliability postmortem |
| `MINNESOTA_MIGRATION_URL_AUDIT.md` | All 20,479 MN URLs, one row each (5.5 MB) |
| `MINNESOTA_5_CITY_FRONTEND_DRY_RUN_REPORT.md` + `_SUMMARY.md` | Anoka, Bloomington, Burnsville, St. Paul, Farmingon through the real app; 20 screenshots in `docs/dry-run-5-city/` |
| `MIGRATION_IMPLEMENTATION.md`, `URL_MIGRATION_STRATEGY.md` | Earlier architecture docs |
| `MASSACHUSETTS_*.md` (4 files) | MA survey: 219+ pages, 4 hand-authored slug shapes, dry run only |

---

## 8. Open engineering defects (P0, in order)

1. Recover or rewrite the whole-site audit generator (nothing can be re-run without it)
2. Fix `states.mjs`/`agent.mjs` field mismatch so `--state ma` runs
3. Wire `agent.mjs` to `geocode.mjs`; migrate `mn-geocode.json` to state-qualified keys
4. Fix `lastSeg` redirect keying in `build-mn-seed.mjs:49` (the Lonsdale loop)
5. Add a redirect-graph test (loops, chains, self, cross-state, non-200 targets)
6. Add `pages.state_id` + FK; 2,657 rows have no city link
7. Add a cross-state contamination test
8. Move URL-universe generation into the agent (four-set formula: live slugs ∪ redirects.json ∪ gone.json ∪ `_yoast_post_redirect_info`)
9. Recognise all 8 MN slug forms; resolve state from the title after the last comma when the slug has no token; strip `-N` first
10. Read the branch-page heading layout in `localSpecificsFrom`
11. Build the `LegacyShell` / verbatim-sections template for the 85,227 (the agent currently discards raw `post_content` after hashing it; it must be stored)
12. Strip the stray `</name]` token at render for 30,089 pages; run `markdownToHtml` for the 1,642

---

## 9. Open business decisions (nothing below can be decided by engineering)

1. **Q1 / the services:** which of the 208 to add, map or retire. Gates 105,220 URLs.
2. Approve "service URL forwards to its city page" — unlocks 7,708 NO_DESTINATION URLs immediately.
3. Re-decide the 31,799 redirects to 404s and 72 cross-state redirects.
4. Confirm the 36,759 gone-map retirements are intended (30,635 never existed as posts).
5. Branch territories (118 MN cities are nearest-office guesses).
6. Can the client fix the 30,089 malformed shortcodes in WordPress with a find-and-replace?
7. Real photographs per branch/city (Boston photo everywhere today).
8. Google Search Console access — no verified traffic data exists; `keep-pages.json` clicks are unverified business data.
9. Source of the "Rated 4.7 on Google" line (Q5). Regional pricing (Q6). State slug `mn` vs `minnesota` (Q2b).
10. Whether the no-source cities (16 MN, ~115 CT) get pages.

---

## 10. Strategic position reached

- **Plan 2 (keep URLs) is already the architecture** — legacy slugs are the routes. Do not restructure URLs; consolidation is where the SEO gain is, restructuring is a separate costlier decision.
- **Recommended: hybrid.** Every URL gets one of KEEP / CONSOLIDATE / 301 / REBUILD / 410 / REVIEW. The audit already classifies all 262,535; what is missing is Part D (search intent, content quality, SEO value), which needs GSC data and a content-quality audit, neither of which exists.
- **URL count is not the KPI.** 197,767 pages are clean; the problem is 105,220 URLs whose service the site does not model.
- **Google's scaled-content policy** names template city pages; the site is a 229,617-page service × city grid. Fewer, genuinely local pages beat the grid.
- **Never** redirect to the homepage, never lower the gate, never invent content, never call a page "thin" without a quality audit.

---

## 11. Current state of the machine

- Dev server: `npm run dev` in `chimcare-web 2/`, port 3000; detached so it survives between turns; restart if a request returns nothing.
- Git: 1 local commit (196 files, 47.5 MB); `data/audits/`, `graphify-out/`, `node_modules`, `.next`, `.env` ignored. Not pushed — no GitHub CLI, no SSH key, no remote. User must create a private repo and push.
- The four reports from the last session (`CHIMCARE_*`, `URL_MIGRATION_PLAN_COMPARISON`, `SEO_IMPROVEMENT_PLAN`) are untracked, not committed.
- `chimcare_local.sql.gz` (674 MB, verified: 205 tables, ends cleanly) is at `~/Desktop/chimcare/` ready for Google Drive. Recipient must confirm `SELECT COUNT(*) FROM wp_posts WHERE post_type='job_listing'` = **229626** after import.

---

## 12. Where the conversation ended

The user asked what problems exist before migrating and whether it can be done with only the
existing templates. Answer: the three templates serve 38 percent; 85,227 live URLs need a fourth,
verbatim template, which is feasible because 86 percent of pages are structurally clean and the raw
HTML is in the database. The user offered to obtain information from the client; the priority asks
are the service list, Search Console access, and whether the client can fix the 30,089 malformed
shortcodes in WordPress.

**END OF HANDOFF**
