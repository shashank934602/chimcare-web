# Chimcare Minnesota Migration Postmortem

**Exactly what was done to migrate Minnesota, what worked, what failed, what was discovered, and what
must be fixed before the next state.**

| | |
|---|---|
| Repository | `~/Desktop/chimcare/chimcare-web 2` |
| Written | 2026-09-08 |
| Scope | Minnesota only: 150 cities, 134 migrated pages, 20,479 legacy URLs |
| Method | Every figure re-measured from the datasets, the database, the audit artefacts and the running application for this document. Nothing is carried forward unverified. |
| Companion | `reports/CHIMCARE_PRE_IMPLEMENTATION_MIGRATION_STRATEGY.md` for the system description |
| Task type | Documentation only. No WordPress write, no production write, no deployment, no migration-behaviour change. |

Labels are the same five as the companion: **CURRENT**, **VERIFIED**, **PLANNED**, **RISK**,
**BUSINESS DECISION**. Where this document corrects something an earlier report said, it says so.

---

# 1. Executive Summary

## What Minnesota proved

The migration machinery copies faithfully and refuses to invent. 134 live WordPress city pages were
extracted from the client's database, stored with source and derived data separated, verified against
the source by fifteen checks on every page, and served at their original URLs through one reusable
template. 109 publish. 25 are withheld by a content gate that was asked to be lowered more than once
and never was. Two consecutive apply runs are byte-identical. WordPress was never written to.

## What Minnesota exposed

| Finding | Number | Status |
|---|---|---|
| Legacy URLs in the sealed baseline | 20,479 | VERIFIED |
| Of those, serving 200 today | 2,864 (14.0%) | VERIFIED |
| Redirecting, 308 | 6,803 (33.2%) | VERIFIED |
| Returning 404 | 10,812 (52.8%) | VERIFIED |
| Of the 404s, live WordPress URLs with no destination | **9,568** | VERIFIED |
| Google clicks those 9,568 earned in twelve months | **932** | VERIFIED from business data |
| Redirects that land on a withheld page | 65 | VERIFIED |
| Redirect loop onto a live page | 1 | VERIFIED |
| Redirects to an Oregon page | 3 | VERIFIED |
| City pages the builder does not recognise | 68 classified as unresolved, 130 in total | VERIFIED |
| Branch cities failing the gate on an extractor limitation, not missing content | **14 of 14** | VERIFIED |
| Minnesota's unresolved rate vs the whole site | 46.3% vs 32.5% | VERIFIED |

## The three lessons that matter most

**The gate is right and the extractor is incomplete.** Every one of Minnesota's 14 branch cities
fails publication. Their local description text exists in WordPress under a heading the extractor
does not look for. That is a code fix worth 14 of the 25 withheld pages, and it will repeat in every
state.

**Minnesota is the wrong state to extrapolate from.** It uses roughly 1,500 legacy service phrases
outside the standardised scheme that California and Connecticut were built on. Its 46 percent
unresolved rate is real for Minnesota and wrong for the site.

**The largest defects are in the business's own maps, not in our code.** The redirect map sends 65
Minnesota URLs to withheld pages and 3 to Oregon, and one rule was collapsed into a loop by our
builder. Site-wide, 61.6 percent of approved redirects land on a 404.

## Readiness

Minnesota is safe to keep serving as it is. It is **not** a safe template for a second state until
the ten P0 items in §31 are done, and it is not ready to publish in production until the redirect
defects are fixed and decision Q1 is taken.

---

# 2. What We Intended to Do

From `CLAUDE.md`, `README.md` and `docs/architecture.md`, all of which predate the migration work:

- Build a **Minnesota vertical slice** of the Next.js rebuild: production-shaped schema, loaders,
  content assembly and three templates, with real data for one state.
- Migrate every live Minnesota city page **exactly**: no authored content, no rewritten copy, no
  substituted images, no changed URLs. Where the source has nothing, leave the field empty and flag
  it.
- Separate **migration from publication**: every page migrates; a distinctness gate decides what goes
  public.
- Produce a **reusable migration agent** that other states run by configuration, following
  `FETCH EXACTLY → STORE EXACTLY → MAP → RENDER → VALIDATE → PUBLISH IF VALID → FLAG IF INCOMPLETE`.
- Keep Minnesota as a **sealed regression baseline**: 134 cities, 109 publishable, 25 review,
  16 no-source, 20,479 URLs.
- Never touch WordPress.

The architecture document also intended things that were not built in this slice and are not
claimed here: an edge redirect layer, R2 media, a `LegacyShell` template for unresolved URLs,
sitemaps, a content-parity test suite, CI.

---

# 3. What We Actually Implemented

**Status: CURRENT.**

| Intended | Built? | Evidence |
|---|---|---|
| Minnesota vertical slice | Yes | `app/`, `components/`, `lib/`, 11-table schema, PGlite seed |
| Exact migration of every live city page | Yes, 134 of 137 (3 duplicates redirected) | `data/seed/mn.migration.json` |
| No authored content | Yes. A draft file `minnesota-local.ts` once existed and was removed; nothing imports it | `data/seed/minnesota.ts` imports only the two datasets |
| Migration ≠ publication | Yes | `cities.source_status`, `pages.status`, `/admin/preview/` |
| Reusable agent | Yes for Minnesota; **cannot execute the Massachusetts config** | `scripts/migrate/`, §7 |
| Sealed regression | Yes | `agent.mjs --regress`; whole-site linkability §5 |
| WordPress untouched | Yes | 26 SELECT, 0 write verbs, repository-wide |
| FAQ recovery | Yes, 642 pairs | `recover-mn-faqs.mjs`, then `faqsFrom` in the agent |
| Hero recovery | Yes, 15 assets byte-verified | `recover-mn-media.mjs`, then `ensureAsset` |
| Malformed-markup detection | Yes, 20 pages | `markupDefectsFrom`, one approved agent change |
| State hub with search and progressive reveal | Yes | `HeroSearch.tsx`, `LocationDirectory.tsx`, `card-resolution.ts` |
| Whole-site URL and service audit | Yes, as artefacts; **generator missing** | `data/audits/whole-site-*`, `reports/WHOLE_SITE_*` |
| Edge redirects, R2, LegacyShell, sitemaps, CI | **No** | PLANNED only |

---

# 4. Repository and Scripts Used

Every script that participated, in the order the work happened:

| Step | Script | Result |
|---|---|---|
| 1 | `scripts/build-mn-seed.mjs` | The 20,479-row URL universe from the 2.4 GB export and the fate maps |
| 2 | `scripts/recover-mn-faqs.mjs` | 642 FAQ pairs from `post_content` |
| 3 | `scripts/recover-mn-media.mjs` | 15 heroes downloaded and byte-verified |
| 4 | `scripts/migrate/agent.mjs --apply` | `mn.migration.json`, `mn.ledger.json`; second apply byte-identical |
| 5 | `scripts/migrate/compare-datasets.mjs` | Pilot vs agent: 13 of 14 dimensions identical, flags differ by 3, explained |
| 6 | `scripts/validate-render.mjs` | 15 checks × 134 pages, all pass |
| 7 | `scripts/check-responsive.mjs` | Clean at 390 / 834 / 1440 |
| 8 | `scripts/audit/mn-url-audit.mjs` + `mn-url-report.mjs` | All 20,479 URLs classified |
| 9 | `scripts/audit/mn-card-links.mjs` | Every hub link and image resolves |
| 10 | `scripts/audit/mn-5-city-dry-run.mjs` | Five-city frontend dry run |
| 11 | `scripts/audit/mn-service-catalogue-audit.mjs` | 187 slug phrases vs the 92 |
| — | whole-site audit, **script not on disk** | 262,535 URLs, 208 services, MN reconciled |

`scripts/test/card-links.mjs` and `scripts/check-pages.mjs` were run as regression checks throughout.

---

# 5. WordPress Data Extraction

**Status: CURRENT, VERIFIED.**

Three SELECT queries against `chimcare_local`, quoted in full in the companion §5. For Minnesota:

| Query | Returned | Filter |
|---|---|---|
| `fetchCityPages` | 137 published city pages | `post_name LIKE 'chimney-sweep-fireplace-in-%-mn' OR '…-repair-in-%-mn'` |
| `fetchGeo` | coordinates and `_job_location` for those 137 | five meta keys |
| `fetchHeroAttachments` | 137 attachment rows, 15 distinct | join through `_thumbnail_id` |

The four `LEFT JOIN`s on `wp_postmeta` would multiply rows if a page had two rows for the same key.
**Tested for Minnesota across nine meta keys: no duplicates exist.** Untested for any other state.

No pagination, no retries, no password support. The 137-page result set returns in well under a
second. `execFileSync` throws on any failure and the run aborts, which is correct.

Two things the extraction deliberately does not read: the region taxonomy (14 tagged pages against
137 by slug, too sparse to trust) and WP Schema Pro (one global Boston record for every page in every
state).

---

# 6. Data Transformation

**Status: CURRENT, VERIFIED by check 15 on every page.**

What each Minnesota city record carries after transformation, with provenance:

| Field | From | Provenance |
|---|---|---|
| `source.wpPostId`, `wpSlug`, `wpTitle` | `wp_posts` | SOURCE |
| `source.neighborhoods` | `introNeighbourhoods()` ∪ `areasFrom()`, deduplicated, source order | SOURCE |
| `source.localSpecifics` | `localSpecificsFrom()`, depth 1; **`{}` for branch pages by code** | SOURCE, see §10 |
| `source.faqs` | `faqsFrom()` on raw content | SOURCE |
| `source.legacyPricingCopy` | `legacyPricingCopyFrom()` | SOURCE, never rendered |
| `source.metaTitle`, `metaDescription` | Yoast meta | SOURCE, mostly null |
| `source.hero` | attachment row + `parseAttachmentMeta()` + `ensureAsset()` | SOURCE |
| `source.thumbnailId`, `redirectInfo`, `tier`, `gscClicks` | meta and `keep-pages.json` | SOURCE / APPROVED_RULE |
| `derived.lat`, `lng`, `coordsSource` | WordPress meta, else `mn-geocode.json` | DERIVED |
| `derived.branch`, `branchAssignment`, `distanceKm` | own office or nearest by great-circle | DERIVED |
| `flags[]` | 12 codes in use, 3 categories | per `FLAG_CATEGORY` |
| `checksums.source`, `content`, `media` | SHA-256 and key-sorted JSON hash | DERIVED |

Nothing is rewritten. The misspelled slug `farmingon` renders as "Farmingon" in the H1, and the
contradictory price sentences on 34 pages are stored verbatim and never displayed.

---

# 7. City and State Resolution

**Status: CURRENT for two slug forms. RISK: Minnesota has eight.**

The agent selects Minnesota by the two `LIKE` patterns above and resolves each city as the slug
suffix between `-in-` and `-mn`. State is never resolved; it is assumed from `--state mn`.

## What the whole-site audit found that the builder missed

| Slug form | Live MN city pages | Agent sees it? |
|---|---|---|
| `chimney-sweep-fireplace-in-{city}-mn` / `chimney-sweep-repair-in-{city}-mn` | 137 | yes |
| `chimney-sweep-repair-in-{city}-mn-<N>` | 55 | no |
| `chimney-sweep-{city}-mn` | 33 | no |
| `chimney-sweep-{city}-in-mn` | 21 | no |
| `chimney-sweep-repair-{city}-mn` | 13 | no |
| `{city}-chimney-sweep-repair-in-mn` | 3 | no |
| `{city}-chimney-sweep-repair-mn` | 3 | no |
| **Total** | **267** | |

Joining the 267 against the sealed baseline, measured for this document:

| The sealed baseline classifies them as | Count |
|---|---|
| PAGE | 109 |
| REVIEW | 25 |
| **LEGACY_NOT_MIGRATED (a real city page, treated as unresolved)** | **68** |
| REDIRECT (already in the approved map) | 59 |
| GONE (already in the gone map) | 6 |

The 68 are the defect. The 59 and 6 already carry a business decision. Earlier reports rounded this
to "130 misclassified"; the precise split is above, and the sealed baseline stays at 20,479 by
agreement.

Also missed: **five Minnesota URLs whose slugs are LLM editing notes** ending `-is`, `-so`,
`-follow`, `-it` and `-the` rather than `-mn`. WordPress IDs 135455, 136825, 139451, 141671, 144561.
Their titles are clean ("Liners (product) in St. Peter,MN"). The whole-site audit resolves state
from the title when the slug carries none; the builder's `-mn(-\d+)?$` test never saw them. They are
reported as an **addition** of 5 to the baseline, not a correction of it.

## Massachusetts

Surveyed in detail (`MASSACHUSETTS_CARD_LINK_AUDIT.md` and three companions): 26 hand-authored pages
in four slug shapes, 17 with no state suffix at all, plus 217 generated pages structurally identical
to Minnesota's and 2 more using a third form. I initially called it "structurally alien" on the
basis of the 26 alone; that was wrong and was corrected once the 217 were found. **The `ma` config in
`states.mjs` cannot be executed by `agent.mjs`**, because it defines `citySlugRes` (plural array) and
the agent reads `citySlugRe`, `branchSlugRe` and `coverageSlugRe` (singular). Found by reading both
files for this document.

---

# 8. Branch Resolution

**Status: CURRENT, VERIFIED 14 of 14.**

`branches.json` is a business record: 105 offices, 14 in Minnesota, with street, zip and phone and
**no coordinates**. The agent matches a branch page's `_job_location` to a record by leading street
number **and** the record's own zip appearing anywhere in the string. Coordinates come from the branch
page's WordPress meta.

**The first version failed 3 of 14.** It parsed the zip with `\b\d{5}\b`, which matched the street
number in "14870 Granada Ave, Apple Valley, MN 55124". The fix tests for a known value's presence
instead of parsing a value out of free text. A comment in `agent.mjs` records why.

Coverage cities get the nearest branch by distance, **always** flagged `nearest_branch_unverified`
(118 cities). Two coverage cities physically contain a branch office and are flagged
`office_location_conflict`: St. Louis Park and Brooklyn Center. BUSINESS DECISION.

---

# 9. Service Resolution

**Status: two audits with different methods, both VERIFIED, reconciled here.**

## The catalogue

The 92 services in `data/seed/services.ts` come from the Spokane design mock. WordPress has no
service catalogue and publishes **208** canonical services site-wide. This is documented in full in
the companion §13; the Minnesota-specific results follow.

## Method 1: slug phrases in the 9,568 unresolved URLs

`scripts/audit/mn-service-catalogue-audit.mjs` strips the city from either end of each slug and maps
the remaining phrase against the 92 with exact-key and normalised-token rules only. Supersets are
`REVIEW`, never mapped.

| Verdict | Phrases | URLs |
|---|---|---|
| MAPPED, names a catalogue service already | 41 | **761** |
| REVIEW, one token away | 48 | 2,471 |
| UNMAPPED, no catalogue counterpart | 98 | 6,336 |
| **Total** | **187** | **9,568** |

Two corrections to earlier statements. I first reported **760** distinct phrases; that came from a
crude extraction that left city names inside the phrase, and the correct figure is 187. And the
first draft of the script treated a single superset as a match, producing
`fireplace-flue-installation → fireplace-installation`, which is wrong; it was changed to `REVIEW`
before the report was written.

## Method 2: title phrases, whole-site audit, Minnesota rows

| `linkability_status` | MN URLs |
|---|---|
| LINKABLE | 2,853 |
| SERVICE_REVIEW | 8,726 |
| REDIRECT | 6,861 |
| GONE | 1,213 |
| NO_DESTINATION | 645 |
| OTHER_REVIEW | 163 |
| PARSER_FIX | 22 |
| CITY_REVIEW | 1 |
| **Total** | **20,484** |

The two methods agree on the direction and differ on counts because slugs and titles are different
inputs and the whole-site run also discovers the 130 extra city pages. The title method is the one
memory records as correct and the one to carry forward.

## The 761 that need no business decision

They name a service that is already one of the 92 and 404 only on slug wording:

```
WORKS   /location/air-duct-cleaning-in-apple-valley-mn/
404     /location/chimney-sweep-afton-mn/                  no "-in-"
404     /location/chimney-caps-repair-in-albertville-mn/   plural "caps"
404     /location/chimney-inspections-excelsior-mn-2/      plural and "-2"
404     /location/becker-chimney-masonry-repair-in-mn/     city first, words reordered
```

Nineteen of them carry the `-2` duplicate suffix that WordPress appends; the parser sees `-mn-2` and
gives up on both city and service.

---

# 10. Content Extraction

**Status: CURRENT, VERIFIED, with one significant limitation.**

| Extractor | Minnesota result |
|---|---|
| Areas (`areasFrom` + `introNeighbourhoods`) | 11 cities below the 4-item threshold, flagged `insufficient_source_areas` |
| Local lines (`localSpecificsFrom`, depth 1) | 23 cities below the 2-line threshold, flagged `insufficient_source_local_copy` |
| Pricing copy | 34 cities quote $125–$225 or $150–$350 against the $299 sheet, flagged `legacy_pricing_conflict` |
| Markup defects | 20 cities, flagged `source_markup_defect` |

## The branch-page finding

Investigating why St. Paul is withheld showed the gate reason "local specifics (0/2)" is not because
WordPress lacks the text. The page contains, under "Why St. Paul, MN Homeowners Trust Chimcare":

> "We bring deep knowledge of regional building codes, St. Paul weather, and historic homes to every
> project."

Two things stop the extractor. `agent.mjs:126` reads `isBranch ? {} : localSpecificsFrom(...)`, so
branch pages are never scanned. And even when run directly, `localSpecificsFrom` looks for the
heading `Why … Important in`, which coverage pages use and branch pages do not. Measured across the
dataset: **14 of 14 branch cities have zero local lines; 14 of 14 fail the gate; 14 of the 25 withheld
pages are branch cities.** This is our limitation, not a content gap, and it will recur in every
state. RISK, P0.

Earlier session reports said "WordPress supplies none" for these pages. That was true of what the
extractor returned and false of what WordPress holds. Both the five-city dry-run report and its
summary were corrected on 2026-09-07 once this was measured.

---

# 11. FAQ Extraction

**Status: CURRENT, VERIFIED 134/134 by check 4.**

The 2.4 GB export had lost every FAQ question, because the question is the `title` attribute of a
`[vc_tta_section]` shortcode and the export's generic shortcode strip deleted whole tags. All 134
pages showed zero FAQs, which for a chimney company was implausible enough to investigate.

`recover-mn-faqs.mjs`, then `faqsFrom()` in the agent, read the questions from raw `post_content`:
**642 question-and-answer pairs across all 134 pages**, nothing reconstructed, nothing paraphrased.
Check 4 asserts every question verbatim and the first 120 characters of every answer on every render.

On 20 pages the export had also lost the answers, because the WordPress copy closes a shortcode with
`</vc_column_text]` instead of `[/vc_column_text]`. The agent detects this from raw content and
flags it; it does not repair it. Direct detection found three pages (Lauderdale, Mound, Roseville)
the pilot's inference had missed.

---

# 12. Media Extraction

**Status: CURRENT, VERIFIED at the byte level.**

| | |
|---|---|
| Pages with a hero | 134 of 134 |
| Distinct attachments | 15 |
| Bytes | 4,670,577 |
| Byte count vs WordPress `filesize` | 15 of 15 |
| SHA-256 recorded and re-verified at render (check 6) | 134 of 134 |
| Files renamed, converted, resized or optimised | 0 |
| Hub card images returning 200 | 15 of 15 |

## The Boston image

Attachment 88125, `chimney-sweep-boston-MA.jpg`, is the featured image on **120 of 134** migrated
pages, on 123 of 137 live Minnesota city pages, and on 227,511 posts site-wide. It is live in
production: the real Bloomington, Minnesota page serves it as `og:image` today. Only the 14 branch
cities have their own photograph; every coverage city inherits the default. Saint Paul's own hero is
`Saint-PaulMA.webp` with alt text "Saint Paul,MA".

The agent copied exactly what each page points at and flagged: `hero_image_not_city_specific` ×120,
`hero_image_wrong_state_label` ×121, `hero_image_missing_alt` ×1. No image was substituted, because
choosing one would be inventing content. The fix belongs in WordPress.

## A frontend bug that the media pipeline did not cause

The state hub rendered no card images while 15 of 15 validation checks were green. The card read
`branch.photoKey`, which is null for every branch and absent on coverage cities, while 134 verified
images sat unused. Fixed in `assemble-hubs.ts` to read `city.heroImageKey`. The lesson: validation
covers what it covers, and nothing covered the hub.

## What is not verified

That the right file is on the right page. A transposition would pass every check. Image reachability
is verified on the hub only, not on city pages.

---

# 13. SEO Preservation

**Status: CURRENT. VERIFIED for what the source holds. Most of what a brief expects does not exist in
the source.**

| Yoast field | MN pages with a value | Migrated? |
|---|---|---|
| Title | 0 of 134 | n/a |
| Meta description | 14 of 134 | yes, verbatim, check 7 |
| Canonical | 0 | derived, self |
| Robots | 0 | derived |
| Open Graph | **the keys do not exist in the database** | none generated |
| Twitter | **the keys do not exist** | none generated; the app emits no Twitter tags |

Yoast templates the rest at request time. Our template does the same for the 120 pages without a
stored description. **We do not claim SEO was preserved where the source has nothing to preserve.**

## Live comparison, three pages

Lighthouse on production vs local, run during the session for Albertville, Anoka and Bayport:

| | Production | Local |
|---|---|---|
| SEO score | 85 | 100 |
| Cause of the gap | **no meta description** on the production page | description present |
| `<h1>` elements | 2 | 1 |
| External scripts | 30 | 0 |
| Page weight | ~500 KB | ~256 KB |
| Best Practices | 73 | 100 |

The same single audit explains the SEO gap on all three. This was a session check with screenshots
in the conversation, not a committed test; no "Boston SEO parity test" artefact exists in the
repository.

## Structured data

Built in `assemble.ts` from migrated fields: `WebPage`, `BreadcrumbList`, and
`HomeAndConstructionBusiness` (branch) or `Service` (coverage), with an `OfferCatalog`. WP Schema Pro
is deliberately not migrated because it is one global Boston record. No rating markup is emitted;
check 9 asserts its absence. 134 of 134 pass.

---

# 14. Next.js Integration

**Status: CURRENT, VERIFIED.**

- `data/seed/minnesota.ts` joins the agent dataset (cities, branches) with the pilot dataset (state
  copy, prices, the 20,479 URL rows, the 16 no-source cities), runs the **same** `distinctnessGate`
  the runtime uses, and produces the seed. `DATA_SOURCE` records which half each value came from and
  is surfaced at `/api/health/` and `/admin/migration/`.
- `lib/db/seed.ts` loads 11 tables in batches of 500, no transaction.
- `app/location/[slug]/page.tsx` dispatches on the `pages` row. `kind='legacy'` has no branch and
  falls to 404; that is the 9,568.
- `app/locations/[state]/page.tsx` resolves every card through `card-resolution.ts`, which walks
  redirect chains up to ten hops, refuses cross-state targets, and never emits a placeholder href.
  The hub renders all 150 cards in the server HTML for crawlers and reveals six at a time.
- `HeroSearch.tsx` and `LocationDirectory.tsx` share one client store so typing in either filters
  both. Matching uses `fold()` so "St. Paul", "St Paul" and "Saint Paul" agree. The search index
  deliberately excludes the state name, because including it made any letter in "Minnesota" match all
  150 towns.
- The admin board hard-codes `getMigrationRows('mn')`. RISK for a second state.

---

# 15. Validation

**Status: CURRENT, VERIFIED. Re-run for this document.**

```
Validating 109 publishable (public URLs) + 25 incomplete (admin preview) = 134 migrated pages
  template · legacy_url · title_h1 · faq · hero_path · hero_file · seo_meta · local_seo
  structured_data · breadcrumbs · services · links · cta_contact · chrome · no_rewrite
  → 134/134 on every check
  no-source cities uncreated  16/16
All checks passed on all pages.
```

Five-city dry run: all checks on all five. Card-link test: 109 of 109 links and 15 of 15 images
return 200. Responsive: 18 of 18 at 390, 834 and 1440. Typecheck exit 0. Production build exit 0,
ten routes. **Lint: NOT CONFIGURED**, and none was created to obtain a pass.

## What validation did not catch, and how it was caught instead

| Defect | Validation state when it was live | Caught by |
|---|---|---|
| Hub cards with no images | 15/15 green | looking at the page |
| Dead hero search box | 15/15 green | manual test |
| Redirect loop onto a live page | 15/15 green | the URL audit written weeks later |
| Cross-state redirects | 15/15 green | same |
| 68 city pages classified as unresolved | 15/15 green | the whole-site audit |

The harness is also duplicated: `validate-render.mjs` carries its own copy of the 15 checks and
imports nothing from `validate.mjs`, contrary to `CLAUDE.md`.

---

# 16. Minnesota City Results

**Status: VERIFIED. Every number re-read from disk for this document.**

| Metric | Value |
|---|---|
| Cities | **150** = 14 branch + 120 coverage with a page + 16 no-source |
| Migrated city pages | **134** (137 discovered − 3 duplicates redirected) |
| Publishable | **109** |
| Needs review | **25** = 14 branch + 11 coverage |
| No-source cities, no page row, no URL | **16** |
| FAQ pairs | **642**, all 134 pages |
| Distinct hero attachments | **15** |
| Coordinates available | **132** of 134 (118 geocoder, 14 WordPress) |
| Coordinates absent | 2: St. Anthony (rejected), Farmingon (cache keyed by the correct spelling) |
| Geocodes in the reject list | 3: Becker, Grant, St. Anthony; Becker and Grant are no-source cities |
| Review flags | **454**: 297 source-quality, 154 business-unverified, 3 derived |
| Responsive | clean at 390 / 834 / 1440 |

## The 25 withheld, by reason

| Blocked by | Pages | Kind |
|---|---|---|
| Local specifics 0/2 | 12 | 11 branch, 1 coverage |
| Areas below 4 and local specifics below 2 | 11 | 3 branch, 8 coverage |
| No serving branch | 2 | Farmingon (name-miss), St. Anthony (rejected geocode) |

## The 454 flags

`hero_image_wrong_state_label` 121 · `hero_image_not_city_specific` 120 · `nearest_branch_unverified`
118 · `legacy_pricing_conflict` 34 · `insufficient_source_local_copy` 23 · `source_markup_defect` 20
· `insufficient_source_areas` 11 · `office_location_conflict` 2 · `no_serving_branch` 2 ·
`legacy_slug_typo` 1 · `geocode_rejected` 1 · `hero_image_missing_alt` 1.

---

# 17. Minnesota URL Results

**Status: VERIFIED against the dataset, the database and the running server.**

| Handling | URLs | Runtime | Sampled live |
|---|---|---|---|
| PAGE | 109 | 200 | 8 of 8 |
| SERVICE_PAGE | 2,607 | 200 | 8 of 8 |
| COVERAGE_ONLY | 148 | 200 | 8 of 8 |
| REVIEW | 25 | 404 public, 200 preview | 8 of 8 |
| REDIRECT | 6,803 | 308 | 8 of 8 |
| GONE | 1,219 | 404 | 8 of 8 |
| LEGACY_NOT_MIGRATED | 9,568 | 404 | 8 of 8 |
| **Total** | **20,479** | | 56 of 56 matched |

Unique URLs 20,479, duplicates 0, unhandled 0, invalid 0, cross-state in the universe 0. All 20,479
carry a WordPress post ID or an approved fate-map origin; 913 exist only in the fate maps and are all
retired.

## Redirects

| | |
|---|---|
| From the approved business map | 6,786 |
| From a WordPress-recorded earlier slug | 14 |
| From the duplicate-city rule | 3 |
| Distinct destinations | 1,445 |
| Single hop to a live target | 6,735 |
| **Landing on a withheld page** | **65**, across 20 targets |
| **Loop** | **1**: `chimney-cap-repair-lonsdale-mn` → itself |
| **Chain** | **1**: `…-maple-grove-mn-2` → `…-repair-in-maple-grove-mn` → `…-fireplace-in-maple-grove-mn` |
| **Cross-state, dangling** | **3** → `/location/chimney-sweep-portland-oregon/` |

Both problem targets are real and live: Lonsdale is WordPress post 142786, published, HTTP 200 in
production; the Oregon page is post 658, published, HTTP 200. The loop is ours: `build-mn-seed.mjs`
keys redirects by last path segment, collapsing the root-level rule `/chimney-cap-repair-lonsdale-mn/`
→ `/location/chimney-cap-repair-lonsdale-mn/` into a self-redirect, and retiring a live page in the
process. Six entries collapse this way site-wide. The three Oregon redirects come from the business
map, where 143 entries target that page.

---

# 18. The 9,568 Legacy-Not-Migrated URLs

**Status: VERIFIED. Nothing here is a projection.**

## What they are

Live, published WordPress URLs, all 9,568, that no page kind resolves. They carry `kind='legacy'` in
the `pages` table and the dispatcher has no branch for that kind.

| | |
|---|---|
| Live in WordPress | 9,568 of 9,568 |
| Tier A / B / C in the business keep map | 5,349 / 4,205 / 14 |
| Resolve to a known city | **8,152** |
| No resolvable city | **1,416** (all `city_id IS NULL`; slug shapes without `-in-`, with misplaced `-in-`, or with `-2`) |
| Name a catalogue service, 404 on wording alone | **761** |
| One token from a catalogue service | 2,471 |
| No catalogue counterpart | 6,336 |
| Distinct service phrases (slug method) | 187, from 760 first reported |

## Why the app does not resolve them

Two separate causes, both ending at the same `return { kind: 'missing' }`:

1. The service phrase is not one of the 92, so `service_id` is null and no service page can be
   built. 9,549 of the 9,568.
2. The slug shape defeats the city parser, so `city_id` is null. 1,416, overlapping with the above.

The planned `LegacyShell` template that would have served `kind='legacy'` was never built.

## Current WordPress behaviour

All 9,568 return 200 on production today. Sampled during the session:
`apartment-chimney-services-becker-mn` production 200, local 404.

## Traffic

| | |
|---|---|
| Total Google clicks, twelve months | **932** |
| URLs with at least one click | **454** |
| Most clicks on a single URL | 33, `gas-fireplace-repair-service-in-plymouth-mn` |
| Clicks on URLs whose city page is published | 753 |
| Clicks on URLs whose city page is withheld | 30 |
| Clicks on URLs with no resolvable city | 149 |

Source: `keep-pages.json`, business data, not verified against Google Search Console.

## What this document does not say

**These are not "thin content".** No content-quality audit exists (§19). Their quality is unmeasured.
What is measured is that they earn about two and a half visits a day between them, that 761 are a
parser fix, and that 6,336 name services the business has not decided to model.

---

# 19. Content-Quality Findings

**Status: NOT IMPLEMENTED YET.**

No word-count, similarity, duplicate-detection or `CONTENT_*` classification exists in the
repository. Repository-wide search returns only `editDistance()` in `ma-cards.mjs`, used to flag slug
typos. Therefore **no Minnesota page has a content-quality verdict**, and none is asserted here. The
planned audit and its six categories are described in the companion §16.

---

# 20. What Worked

- **Fidelity.** Every FAQ, every area, every local line compared verbatim on every page. A live
  misspelling and 34 contradictory price sentences preserved untouched. 134 of 134.
- **Media.** Byte-for-byte, SHA-256 and size verified, original names, 15 of 15.
- **Idempotency.** Two applies byte-identical; the regression reports zero in every category.
- **Provenance.** `source` and `derived` never mixed; every flag categorised; the dataset carries its
  own legend.
- **The gate held.** Requested to be loosened more than once; never was. The 25 withheld pages are
  visible at `/admin/preview/` through the same template.
- **Dry run by default.** Every write behind `if (APPLY)`; media returns before touching disk.
- **Direct detection over inference.** Reading raw `post_content` found 642 FAQs the export had lost
  and 3 markup-defect pages the pilot had missed.
- **Refusing to guess.** Three geocodes dropped rather than substituted; no branch invented for
  Farmingon; no city page fabricated for 16 towns; no image swapped for a nicer one.
- **The hub.** 150 cards, zero placeholder links, redirect chains walked, cross-state targets
  refused, all content in the server HTML.

---

# 21. What Did Not Work

- **Extrapolating from Minnesota.** The 47 percent unresolved figure was quoted as if it were the
  site; the site is 32.5 percent.
- **Slug pattern discovery.** Two of eight forms; 68 city pages misfiled; 5 editing-note URLs unseen.
- **Branch-page extraction.** 14 of 14 branch cities fail on a heading the extractor does not read.
- **The Massachusetts config.** Written against field names the agent does not use.
- **The geocode cache.** Agent reads Minnesota's by bare name regardless of state; the correct module
  exists and is not called.
- **The URL builder.** Last-segment keying created a loop and retired a live page.
- **Validation coverage.** Three visible defects and two redirect defects shipped under 15/15 green.
- **Reproducibility of the whole-site audit.** 444 MB of the most important planning data with no
  generator on disk.

---

# 22. Reliability Problems

Process failures, as distinct from data or code defects. All from the session record.

| Failure | What happened | Prevention adopted |
|---|---|---|
| Arithmetic | Baseline stated as 151 / 121 / 135; truth is 150 / 120 / 134; the wrong figures propagated into a locked instruction | Every figure re-read from disk before quoting |
| Generalising from a subset | Massachusetts called "structurally alien" on 26 pages; 217 compatible pages missed | Both identification methods, reconciled, before scoping |
| Scripted edits reporting success | A `str.replace` with no match printed "done"; the page crashed | Every edit script asserts the match |
| Screenshot diagnosis | `--window-size` mis-rendered mobile; a false overflow was nearly "fixed" | Measure `scrollWidth` under device emulation |
| Full-page screenshot artefact | Cards below the fold appeared blank; verified opacity 1 in a real browser | Scroll before capture; document the artefact |
| Stale browser bundles | Two "runtime errors" were cached bundles, not code | Clear `.next`, hard refresh, then diagnose |
| Test-driver artefact | `.focus()` put the caret at 0; backspace deleted nothing | `setSelectionRange(end)` |
| Overstated diagnosis | "WordPress supplies none" for withheld pages; the text exists | Corrected in both dry-run reports on 2026-09-07 |
| Wrong phrase count | 760 distinct phrases; correct is 187 | Corrected in the catalogue report |
| Loose matching | Superset rule mapped flue installation to fireplace installation | Superset is `REVIEW`, recorded in memory |
| Wrong architectural claim | Postmortem said no per-state geocoder and no `ma` config existed; both exist | Corrected in the postmortem with dated notes |

---

# 23. SEO Risks

| Risk | Scale | Status |
|---|---|---|
| 9,568 live URLs return 404 with no decision behind it | 932 clicks/yr, inbound links unknown | BUSINESS DECISION, Q1 |
| 65 redirects land on a withheld page | 65 | resolves when the target passes the gate |
| 3 redirects send Minnesota visitors to Oregon | 3 | BUSINESS DECISION |
| Redirect loop | 1 | RISK, our builder |
| Boston `og:image` on 120 pages | 120 | source defect, live today |
| Branch assignment is a guess on every coverage page | 118 | BUSINESS DECISION |
| 29 legacy `/locations/*` URLs 404 | 29 | BUSINESS DECISION, Q2b |
| No sitemap, no robots file | site | PLANNED |
| Open Graph not verified | all | RISK |

---

# 24. Data Integrity Risks

| Risk | Evidence | Status |
|---|---|---|
| `pages` has no `state_id`; 2,657 rows have no `city_id` | schema; live count | RISK |
| `faqs.scope_id` has no foreign key | migration SQL | RISK |
| `redirect_to` is unconstrained text | schema | RISK, this is how the loop was representable |
| No dataset ↔ database reconciliation | nothing verifies the DB holds what the dataset says | RISK |
| No immutable source snapshot | each run re-queries live WordPress | RISK |
| Seed has no transaction; `reset()` does not truncate bookings | `lib/db/seed.ts` | RISK |
| Media pairing unverified | checksum proves the file, not the placement | RISK |
| Duplicate postmeta untested outside Minnesota | JOIN multiplication | RISK |

---

# 25. Cross-State Risks

| Risk | Evidence | Status |
|---|---|---|
| Agent reads `mn-geocode.json` regardless of `--state`, keyed by bare name | `agent.mjs:47`; "Lexington" is already Anoka County MN | **Critical** RISK |
| `ma` config field names do not match what the agent reads | `states.mjs` vs `agent.mjs` | **Critical** RISK |
| `pages` cannot be attributed to a state structurally | schema | RISK |
| No cross-state contamination test | none exists | RISK |
| RENDER stage reads `minnesota.generated.json` unconditionally | `agent.mjs` | RISK |
| Admin board hard-codes `'mn'` | `app/admin/migration/page.tsx:17` | RISK |
| `check-pages.mjs` URLs hard-coded to Minnesota | 16 entries | RISK |
| 130 slugs site-wide carry no state token | whole-site audit | handled by title fallback there, not in the agent |

---

# 26. Frontend Risks

| Risk | Status |
|---|---|
| The 16 no-source cities render "Details coming soon" like withheld pages; nothing is under review because no page exists | RISK, presentation |
| Eight `href="#"` placeholders in header and footer chrome from the design mock; none in any card | RISK, pre-existing |
| Map panel is a placeholder ("Map island mounts here — 5 pins") | PLANNED, M3 |
| No visual regression test; an `opacity: 0` regression would pass every check | RISK |
| Reveal animation is scroll-triggered; full-page captures show blank cards below the fold | documented artefact, not a bug |
| `port-css.mjs` resolves its root through `URL.pathname`; writes to `chimcare-web%202/` from this checkout | RISK |

---

# 27. Redirect Risks

Minnesota's 6,803 redirects: 6,735 clean, 65 pending a withheld target, 1 loop, 1 chain, 3
cross-state. No automated graph test exists; all five findings came from a manual audit. Site-wide
the same map has 31,799 redirects to a 404, 7 loops, 767 chains, 72 cross-state. Every redirect must
be generated from the audited inventory and validated before publish; the mechanism to do so is
PLANNED (companion §18).

---

# 28. Known Source Defects

Detected, preserved, never repaired. The fix for each belongs in WordPress.

| Defect | Scale | Flag |
|---|---|---|
| `</vc_column_text]` malformed closing | 20 city pages | `source_markup_defect` |
| Boston photo as featured image | 120 of 134 MN; 227,511 site-wide | `hero_image_not_city_specific` |
| Hero labelled for another state | 121 | `hero_image_wrong_state_label` |
| Hero with no alt text | 1 | `hero_image_missing_alt` |
| Misspelled slug `farmingon`; a correct `farmington` page also exists | 1 | `legacy_slug_typo` |
| `liners-sandia-mn`, title "Scandia" | 1 | unflagged; found in the URL audit |
| Five editing-note slugs | 5 MN, 985 site-wide | `PARSER_FIX` in the whole-site layer |
| Page copy contradicting the price sheet | 34 | `legacy_pricing_conflict` |
| Titles reading `"City,MN"` with no space | many | handled by slug fallback |
| Four Oregon slugs used by two posts each | 4 site-wide | reconciliation §8.1 |
| Gone map 83% unbacked by any post | 30,635 site-wide | reported |
| WP Schema Pro one Boston address for every page | site-wide | excluded |
| `_wp_old_slug` values claimed by up to 75 pages | site-wide | not used |

---

# 29. P0 / P1 / P2 Remediation Plan

Identical to the companion §29, restated by priority with the Minnesota proof for each.

**P0**

| # | Item | Minnesota proof |
|---|---|---|
| 1 | Recover or rewrite the whole-site audit generator | 262,535 records and 208 services reproduce; MN reconciles to 20,479 + 5 |
| 2 | Fix the `states.mjs` / `agent.mjs` field mismatch | `--state ma --dry-run` completes; `--state mn --regress` unchanged |
| 3 | Wire the agent to `geocode.mjs`; migrate the MN cache | Farmingon resolves; St. Anthony still rejected; 132 → 133 with coordinates; regression otherwise unchanged |
| 4 | Fix `lastSeg` keying in `build-mn-seed.mjs` | Lonsdale loop gone; 20,479 set unchanged |
| 5 | Redirect-graph test | fails on current MN data with exactly 1 loop, 1 chain, 3 cross-state, 65 pending |
| 6 | `pages.state_id` + FK + consistency check | 2,657 city-less rows assigned or listed |
| 7 | Cross-state contamination test | passes on MN alone; fails with an injected MA row |
| 8 | Agent-built URL universe from the four-set formula | 20,479 reproduced |
| 9 | All eight MN slug forms + title-based state | 267 city pages; reported as an addition of 130 and 5 |
| 10 | Branch-page heading in `localSpecificsFrom` | 14 branch cities gain lines; re-sealing 109/25 is a decision, not automatic |

**P1** — source snapshot per run; dataset ↔ database reconciliation; media pairing and reachability
tests; seed transaction; single validation harness; approval enforced before `--apply`;
content-quality audit.

**P2** — test runner and CI; sitemap and robots; edge redirect layer; `port-css.mjs` path fix;
stop `check-pages.mjs` writing bookings; correct the "Page in review" label for no-source cities.

---

# 30. Minnesota Regression Contract

**Status: CURRENT, VERIFIED, re-run for this document.**

## Contract

```
134 cities · 109 publishable · 25 needs_review · 16 no-source
20,479 URLs · 2,864 → 200 · 6,803 → 308 · 10,812 → 404
404 = 9,568 LEGACY_NOT_MIGRATED + 1,219 GONE + 25 REVIEW
source changes 0 · content checksum changes 0 · media checksum changes 0 · SEO differences 0 · URL differences 0
```

## How the test works

**Mechanism 1, the agent.** `agent.mjs --state mn --dry-run --regress data/seed/minnesota.generated.json`
re-extracts every page from WordPress, compares three checksums per page to `mn.ledger.json` keyed by
WordPress post ID, then compares eight fields per city to the pilot dataset (`areas`,
`localSpecifics`, `faqs`, `heroSha`, `heroKey`, `metaDescription`, `branch`, `wpPostId`) and
recomputes the publishable count with the same gate. Output for this document:

```
✓ identical: 134 cities, 109 publishable, 25 needs_review, all source fields and checksums match
Dry run: no dataset, ledger or media was written.
```

**Mechanism 2, the whole-site layer.** `WHOLE_SITE_LINKABILITY_REPORT.md` §5 set-compares its
Minnesota rows against `mn-url-audit.json`: all 20,479 present, none missing, and the seven contract
counts reproduced exactly. It additionally carries five URLs the baseline never saw.

## The five additions

| WP ID | Title | Slug ends |
|---|---|---|
| 135455 | Liners (product) in St. Peter,MN | `-it` |
| 136825 | Liners (product) in Victoria,MN | `-the` |
| 139451 | Liners (product) in Dayton,MN | `-is` |
| 141671 | Liners (product) in Nowthen,MN | `-follow` |
| 144561 | Liners (product) in Lexington,MN | `-so` |

They are additions, not corrections, because the sealed builder selects Minnesota by the slug test
`-mn(-\d+)?$` and none of these ends in `-mn`; the baseline was defined by that rule and is kept as
defined. Verified for this document: none of the five is in `mn-url-audit.json`; the whole-site MN
total is 20,484 = 20,479 + 5.

## Two whole-site runs measure Minnesota differently, stated plainly

The 15:12 run (`WHOLE_SITE_URL_MIGRATION_AUDIT.md`) broadened city-page discovery to eight forms and
the gate scan depth to three, and reports Minnesota as 20,484 / 9,486 unresolved / 16 gate-held. The
16:50 run (`wsa-20260907T165001`, the linkability report) kept the sealed rules and reproduces
20,479 / 9,568 / 25 exactly. Both state the baseline is untouched. They are different measurements,
not a contradiction, and this document uses the sealed figures.

---

# 31. Readiness Assessment

| Question | Answer |
|---|---|
| Is Minnesota safe to keep serving locally? | Yes |
| Is Minnesota safe to publish to production? | **No.** One redirect loop retires a live page; 3 redirects leave the state; 9,568 live URLs 404 with no decision; no redirect-graph test |
| Is the agent safe to run on a second state? | **No.** `--state ma` throws; geocode cache leaks; no URL inventory; no cross-state test |
| Is the whole-site audit safe to plan on? | As a measurement, yes. As a tool, **no**, until its generator exists |
| Is the gate safe? | Yes, and it should not change until the branch-page extractor is fixed and the result re-sealed by decision |

## Exact conditions before the next production state

All of the following, each with an artefact on disk:

1. P0 items 1 through 10 complete.
2. Minnesota regression unchanged, or re-sealed by an explicit written decision if item 10 moves it.
3. The new state's URL universe reproduces from the four-set formula and reconciles to WordPress.
4. The new state's redirect graph has zero loops, chains, self-redirects, cross-state and non-200
   targets, or every exception carries a business sign-off.
5. Cross-state test passes with both states loaded.
6. Dataset ↔ database reconciliation passes.
7. Second apply byte-identical.
8. Every business decision the state needs is recorded with a name and a date.
9. WordPress untouched.

---

# 32. Lessons for the Remaining States

1. **Enumerate slug forms from WordPress per state.** Minnesota had eight; the builder knew two. A
   third city-page form exists in five states.
2. **Resolve state from the slug token after stripping `-N`, then from the title after the last
   comma.** 9,018 duplicate suffixes and 418 city-is-a-state-name titles wait for anyone who does not.
3. **Derive services from titles, and never match by substring or superset.** One token changes the
   service.
4. **Read both heading layouts.** Branch pages and coverage pages differ; the gate will otherwise
   withhold every branch city in every state.
5. **Run the duplicate-postmeta check before extraction.** Minnesota was clean; nothing says the
   others are.
6. **Key every cache by state.** The module exists; use it.
7. **Do not scale Minnesota's ratios.** Measure per state and weight. California is 2.7 percent
   unresolved; Washington is 61.5.
8. **Validate the redirect map before trusting it.** Six in ten approved redirects land on a 404.
9. **Expect no-source cities at scale.** Connecticut has 135 towns with service pages and 20 city
   pages.
10. **Validation covers what it covers.** Add the hub, the graph, the pairing and the reconciliation
    tests before believing 15 of 15.

---

# 33. Final Recommendation

Keep Minnesota exactly as sealed. Do not publish it, and do not run a second state, until the ten P0
items are done and proven against the Minnesota regression. Fix the branch-page extractor first among
the code items, because it is worth 14 pages here and the same in every state, and it costs nothing
in content. Put the service catalogue and the redirect map in front of the business now, because
99.3 percent of the remaining backlog waits on those two decisions and no amount of engineering
substitutes for them.

---

# MINNESOTA STATUS

**What passed**
- 134 of 134 pages on all 15 checks; 16 of 16 no-source cities uncreated
- 20,479 of 20,479 URLs classified; 0 unhandled; 56 of 56 live samples matched
- Two applies byte-identical; regression all zeros
- 15 of 15 heroes byte-verified; 109 of 109 hub links and 15 of 15 images resolve
- 18 of 18 responsive checks; typecheck 0; build 0
- WordPress never written to

**What failed**
- 9,568 live URLs return 404 with no decision
- 1 redirect loop retiring a live page; 3 cross-state redirects; 65 redirects to withheld pages
- 68 real city pages classified as unresolved; 5 editing-note URLs unseen
- 14 of 14 branch cities withheld on an extractor limitation
- Hub images, hero search and card labelling shipped under green validation

**What is reliable**
- Extraction, storage, verification and rendering of the fields the agent extracts
- Idempotency, provenance separation, the gate, dry-run safety, refusal to invent

**What is not reliable**
- State identity (assumed, not resolved); slug-form coverage; the geocode path; the URL inventory
  for any other state; the redirect map; the whole-site audit as a re-runnable tool; anything
  validation does not cover

**What must be fixed**
- The ten P0 items in §29, in order

**What must be decided by business**
- Q1 for 9,568 URLs; 72 new services and 30 possible matches; the 65 + 3 + 1 redirect defects;
  118 branch territories; Farmingon; St. Louis Park and Brooklyn Center; 34 price conflicts;
  16 no-source cities; Q2b; Q5; Q6

**Is another state safe to migrate?**
- No. §31 lists the nine conditions.

**END OF REPORT**
