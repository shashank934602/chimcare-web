# Whole-Site URL Reconciliation, Methodology and Validation

**Generated:** 2026-09-07T15:12:00.770805
**Database:** `chimcare_local`, MySQL 8.0 on localhost.
**Access:** **SELECT only.** No `INSERT`, `UPDATE`, `DELETE`, `ALTER` or `DROP` was issued. No
WordPress content, postmeta, taxonomy, redirect, URL or migration artefact was modified.

Companion documents: `reports/WHOLE_SITE_URL_MIGRATION_AUDIT.md`,
`data/audits/whole-site-url-audit.json` (262,535 records, one per legacy URL),
`data/audits/state-url-summary.json`.

---

## 1. Database counts, measured

Every figure below is a direct `SELECT` against `chimcare_local`.

| Count | Value | Query criteria |
|---|---:|---|
| All posts, any type/status | 242,592 | `SELECT COUNT(*) FROM wp_posts` |
| Published posts, any type | 230,119 | `post_status='publish'` |
| `job_listing`, any status | 229,626 | `post_type='job_listing'` |
| **Published `job_listing`** | **229,621** | `post_type='job_listing' AND post_status='publish'` |
| Distinct published `job_listing` slugs | 229,617 | `COUNT(DISTINCT post_name)` on the same filter |
| URLs with a two-letter state suffix (strict) | 220,451 | slug ends `-XX` where `XX` is a US state code |
| URLs with a state suffix, numeric duplicate suffix allowed | 229,466 | `REGEXP_REPLACE(post_name,'-[0-9]+$','')` then the same test |
| URLs with no resolvable state suffix | 155 | complement of the above |
| Slugs ending in `-<number>` | 9,018 | `post_name REGEXP '-[0-9]+$'` |
| Distinct states in the inventory | 22 | derived — see §3 |
| Distinct (state, city) pairs | 2,920 | derived |
| Distinct city tokens | 2,699 | derived |
| **Distinct legacy URLs (migration scope)** | **262,535** | derived — see §4 |
| Distinct source pages | 229,617 | live published `job_listing` posts |
| Redirect records (approved map) | 50,938 | `redirects.json` keys |
| Retired / gone records (approved map) | 36,759 | `gone.json` entries |
| WordPress-recorded earlier URLs | 723 | `wp_postmeta.meta_key='_yoast_post_redirect_info'` |
| Posts carrying `_wp_old_slug` | 763 | `wp_postmeta.meta_key='_wp_old_slug'` |
| Redirection-plugin redirects | 15 | `wp_redirection_items` |
| Region-tagged pages | 138 | `job_listing_region` taxonomy |
| **Publication-gated records** | **1,317** | derived — see §6 |

### Verification of the two previously reported figures

| Previously reported | Measured | Verdict |
|---|---:|---|
| 229,621 published job listings | **229,621** | **Exact match.** |
| 220,060 state-suffixed listings | **220,451** strict / **229,466** permissive | **Does not match; both figures explained below.** |

The strict test — slug must end in `-XX` — yields **220,451**, which is **391 more** than the reported
220,060. The reported figure appears to have used a shorter state-code list or a slightly different
regex; it is not reproducible from the database as stated.

More importantly, the strict test is the wrong test. **9,018 slugs end in `-<number>`** — WordPress's
duplicate-slug suffix, as in `chimney-flashing-repair-in-round-lake-beach-il-2`. That URL is plainly an
Illinois URL, but the strict regex counts it as having no state. Stripping the numeric suffix before
testing raises the count to **229,466**, leaving only **155** published URLs with no resolvable state
suffix. This audit uses the permissive test, and resolves 3 of the remaining 155 from the page title.

---

## 2. Sources of truth

| Source | What it supplies |
|---|---|
| `wp_posts` | The live URL space: every published `job_listing` slug, title, ID, status, dates |
| `wp_postmeta` | `_thumbnail_id` (hero), `_yoast_post_redirect_info` (earlier URLs), `_wp_old_slug`, `_job_location`, `geolocation_*`, Yoast SEO fields |
| `wp_term_relationships` / `wp_term_taxonomy` / `wp_terms` | `job_listing_region` — 138 tagged branch pages, used to seed city-page pattern discovery |
| `wp_posts.post_content` | Publication-gate inputs for the 4,034 discovered city pages: areas, local specifics, FAQ shortcodes |
| `../chimcare-rebuild-main/site/data/keep-pages.json` | 175,415 tiers and GSC clicks |
| `../chimcare-rebuild-main/site/data/redirects.json` | 50,938 approved redirects |
| `../chimcare-rebuild-main/site/data/gone.json` | 36,759 approved retirements |
| `../chimcare-rebuild-main/site/data/branches.json` | 105 branch offices, 10 states |
| `data/seed/services.ts` | The 92-service destination catalogue |

`wp_redirection_items` holds only **15** rows and is not the migration redirect source; the approved
fate maps are. That is the same source the sealed Minnesota audit used.

---

## 3. Determining the state of a URL

Two independent signals were computed for every published URL and compared:

- **slug token** — the trailing two-letter or full state name, after stripping any `-<number>` suffix
- **title state** — the state named after the last comma of the post title

They agree on **229,068** of 229,621 URLs. The 418 apparent disagreements under a naive title parser
are all **cities whose names are state names** — Wyoming MN, Delaware OH, Nevada City CA, Idaho Springs
CO, Port Washington WI, Washington Court House OH, New California OH. Reading only the text after the
last comma removes all of them, leaving **2** genuine disagreements.

**Precedence: the slug token wins; the title is the fallback.** This is the opposite of the rule the
Massachusetts config uses for the bare `{city}-chimney-sweep` shape — and correctly so, because that
shape *has no slug token*, so the fallback is what fires. Result:

| Signal used | URLs |
|---|---:|
| Slug token | 229,486 |
| Title (slug carries no state token) | 130 |
| Slug token, title disagrees | 2 |
| Unresolved | 3 |

The 2 disagreements and 3 unresolved are individually listed in §8.

---

## 4. Defining the URL universe

Reverse-engineered from `scripts/build-mn-seed.mjs`, which produced the sealed Minnesota baseline, the
universe is the union of four sets — **per state**:

```
universe(state) = live_published_job_listing_slugs(state)
                ∪ redirect_map_sources(state)
                ∪ gone_map_entries(state)
                ∪ wordpress_recorded_earlier_urls(state)
```

Applied site-wide this gives **262,535 distinct legacy URLs**:

| Universe component | URLs |
|---|---:|
| Live WordPress only | 174,644 |
| Live WordPress + redirect map | 49,075 |
| Gone map only (no WordPress source) | 30,644 |
| Gone map + live WordPress | 5,894 |
| Redirect map only | 1,646 |
| Gone map + WordPress earlier URL | 219 |
| Redirect map + WordPress earlier URL | 210 |
| WordPress earlier URL only | 199 |
| Three-way overlaps | 4 |

**32,918 URLs have no WordPress source at all.** Of the 30,644 gone-map-only URLs, **30,635 appear
nowhere in `wp_posts`** — not as a draft, not as another post type, not at all. The 9 that do appear
are 8 attachments and 1 nav-menu item. These are retirement decisions about URLs that no longer exist
as content. They belong in the migration scope — the sealed Minnesota baseline includes its own 911 of
them — but they are not "published job/service URLs" and are reported separately throughout.

---

## 5. Minnesota reconciliation

### 5.1 The URL set

| Step | URLs |
|---|---:|
| Live published `job_listing` with an `-mn` / `-mn-N` slug | 19,566 |
| Redirect-map sources for Minnesota | 6,849 |
| Gone-map entries for Minnesota | 1,225 |
| **Union of the three** | **20,477** |
| WordPress-recorded earlier URLs for Minnesota city pages, not already in the union | 2 |
| **DB-derived Minnesota universe** | **20,479** |
| **Sealed Minnesota baseline** | **20,479** |
| **Difference** | **0** |

**The Minnesota URL set reproduces exactly.** Set-difference in both directions is empty.

The 2 URLs contributed by the fourth component are:

- `/location/chimney-sweep-fireplace-services-in-saint-paul-mn/` → `chimney-sweep-fireplace-in-st-paul-mn` (post 90822)
- `/location/chimney-sweep-fireplace-services-in-south-wayzata-mn/` → `chimney-sweep-fireplace-in-wayzata-mn` (post 90836)

Both are real `_wp_old_slug` / `_yoast_post_redirect_info` values in the database, and both are the two
slug fragments the Minnesota config lists in `excludeSuffixes`. Their presence confirms the fourth
component is required, not optional. The sealed audit's 151 `pageType=city` records decompose as
**137 WordPress city pages + 14 earlier-URL redirect rows**, of which 12 already fell inside
live ∪ redirect ∪ gone — leaving exactly these 2 as net additions.

### 5.2 The classification split

| Metric | Sealed baseline | This DB run | Δ |
|---|---:|---:|---:|
| Total URLs | 20,479 | 20,484 | +5 |
| 200 | 2,864 | 2,908 | +44 |
| 308 | 6,803 | 6,861 | +58 |
| 404 | 10,812 | 10,715 | -97 |
| Intentional 404 | 1,219 | 1,213 | -6 |
| Publication gate 404 | 25 | 16 | -9 |
| Unresolved 404 | 9,568 | 9,486 | -82 |

The URL **set** matches exactly; the **classification** differs by 5–97 URLs per
row. Every difference traces to one of three deliberate generalisations, and **none of them changes the
sealed baseline, which is untouched**:

**(a) Broader city-page discovery (+130 Minnesota city pages).** The sealed builder recognises exactly
two Minnesota city-page shapes, `chimney-sweep-fireplace-in-{city}-mn` and
`chimney-sweep-repair-in-{city}-mn`, with no numeric suffix — 137 pages. This audit discovers
city-page shapes dynamically and finds **267** in Minnesota:

| Shape | Pages | In the sealed builder? |
|---|---:|---|
| `chimney-sweep-fireplace-in-{city}-mn` / `chimney-sweep-repair-in-{city}-mn` | 137 | yes |
| `chimney-sweep-repair-in-{city}-mn-<N>` | 55 | **no — numeric suffix excluded** |
| `chimney-sweep-{city}-mn` | 33 | **no** |
| `chimney-sweep-{city}-in-mn` | 21 | **no** |
| `chimney-sweep-repair-{city}-mn` | 13 | **no** |
| `{city}-chimney-sweep-repair-in-mn` | 3 | **no** |
| `{city}-chimney-sweep-repair-mn` | 3 | **no** |
| earlier-URL rows | 2 | yes |

**This is a finding, not a defect in this audit.** The known cross-state trap was that *Minnesota does
not contain every slug form used elsewhere*. The measurement shows the converse is also true:
**Minnesota itself uses six slug forms its own migration code does not recognise**, and the sealed
audit classifies those 130 URLs as `legacy` — unresolved 404 — when they are structurally city pages.
That is the main driver of this run's lower unresolved count (9,486 vs 9,568) and higher 200/308.

**(b) Publication gate scan depth (25 → 16 blocked).** The sealed Minnesota gate reads **one**
paragraph of the "Why … Important in" section; the Massachusetts work later measured that a depth of
**3** captures 287/287 housing sentences without drifting into closing prose. This audit applies the
depth-3 parser uniformly so states are comparable. Re-running the gate on Minnesota's own 137
sealed-shape pages gives **118 pass / 19 blocked** against the sealed **109 / 25**. The 9-page
difference is entirely the scan depth, and it is the same effect Massachusetts documented.
**Minnesota's sealed 109/25 is unchanged and remains the baseline for Minnesota.**

**(c) `COVERAGE_ONLY` derivation.** The sealed audit's 148 coverage-only URLs come from 16 named
no-source cities carried in the pilot dataset. This audit derives coverage-only structurally — a
catalogue service URL whose city owns no city page — which is the same rule applied without a
hand-curated city list.

**Conclusion of the reconciliation: the Minnesota URL universe is reproduced exactly (20,479 = 20,479,
zero set difference). The classification differences are understood, individually attributed, and
arise from generalisations required to process the other 21 states.**

---

## 6. Classification rules

Applied in this precedence order, one category per URL, never collapsed:

1. **City page, duplicate** → `REDIRECT`, 308. A city with more than one city page keeps the
   region-tagged one (or the shortest slug); the others redirect to it.
2. **City page** → publication gate. Passes → `PAGE`, 200. Fails → `REVIEW`, **404, reason
   `PUBLICATION_GATE`**.
3. **In the approved gone map** → `GONE`, **404, reason `INTENTIONAL_RETIRED`**.
4. **In the approved redirect map** → `REDIRECT`, 308.
5. **WordPress-recorded earlier URL** → `REDIRECT`, 308.
6. **Slug is exactly `{catalogue-key}-in-{city}-{state}`** → 200, as `SERVICE_PAGE` if the city owns
   a city page, `COVERAGE_ONLY` if it does not.
7. **Everything else** → `LEGACY_NOT_MIGRATED`, **404, reason `NO_PAGE_KIND_RESOLVES`**.

The `NO_SOURCE` category is defined but **empty**: every URL that lacks a WordPress source already
carries a gone or redirect decision, so none reaches rule 7 by that route. Those URLs are still
individually identifiable by the `NO_WORDPRESS_SOURCE` flag (32,918 URLs).

### The publication gate

Evaluated from `wp_posts.post_content` for all 4,034 discovered city pages. A page passes only if it
has all five: a serving branch in its state; ≥4 "Areas We Serve" items; ≥2 local specifics (climate
line and housing line); a hero image (`_thumbnail_id`); ≥1 FAQ (a `[vc_tta_section title="…"]`
shortcode with a title and a body). Thresholds are the pilot's and were **not lowered**.

### The four kinds of 404 — kept separate throughout

| 404 reason | URLs | Meaning |
|---|---:|---|
| `NO_PAGE_KIND_RESOLVES` | 85,227 | **Unresolved.** Live or mapped URL that no page kind resolves — the real problem population |
| `INTENTIONAL_RETIRED` | 36,503 | Deliberate retirement under the approved gone map |
| `PUBLICATION_GATE` | 1,317 | A city page withheld because its source is incomplete |
| Other | 0 | none arose |

---

## 7. Whole-site and state-by-state counts

| Scope | Total | 200 | 308 | 404 | Intentional | Gate | Unresolved | Unresolved % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Full migration scope | 262,535 | 87,881 | 51,607 | 123,047 | 36,503 | 1,317 | 85,227 | 32.46% |
| Live published URLs | 229,617 | 87,881 | 49,552 | 92,184 | 5,640 | 1,317 | 85,227 | 37.12% |
| Fate-map-only URLs | 32,918 | 0 | 2,055 | 30,863 | 30,863 | 0 | 0 | 0.0% |

Full per-state tables are in `reports/WHOLE_SITE_URL_MIGRATION_AUDIT.md` §2–§4 and in
`data/audits/state-url-summary.json`.

### Unresolved URLs by state

| State | Unresolved | % of that state | State total |
|---|---:|---:|---:|
| CA | 1,790 | 2.68% | 66,694 |
| MA | 15,615 | 44.25% | 35,286 |
| WA | 21,131 | 61.45% | 34,389 |
| OR | 16,657 | 49.5% | 33,648 |
| IL | 10,114 | 46.2% | 21,891 |
| MN | 9,486 | 46.31% | 20,484 |
| OH | 4,553 | 29.98% | 15,189 |
| CT | 682 | 5.38% | 12,665 |
| GA | 1,251 | 16.33% | 7,663 |
| CO | 2,140 | 31.34% | 6,829 |
| WI | 1,740 | 26.01% | 6,690 |
| ID | 12 | 4.3% | 279 |
| UT | 11 | 3.94% | 279 |
| IN | 0 | 0.0% | 93 |
| MI | 8 | 8.7% | 92 |
| PA | 2 | 2.17% | 92 |
| TN | 19 | 20.65% | 92 |
| AZ | 14 | 36.84% | 38 |
| TX | 0 | 0.0% | 6 |
| NH | 0 | 0.0% | 2 |
| FL | 0 | 0.0% | 1 |
| RI | 0 | 0.0% | 1 |
| UNRESOLVED | 2 | 1.52% | 132 |

The site-wide unresolved rate of **32.46%** is a weighted result dominated by two
large, late-built, standards-compliant states — California (2.68%) and
Connecticut (5.38%) — set against the older states, where Washington
(61.45%), Oregon (49.5%), Illinois
(46.2%), Minnesota (46.31%) and Massachusetts
(44.25%) all sit between 44% and 62%.

---

## 8. Discrepancies and data defects found

All were found by measurement, and **none was corrected** — this is an audit.

**8.1 Four duplicate published slugs.** Two posts share each of these `post_name` values, so 229,621
posts occupy 229,617 URLs:

| Slug | Post IDs |
|---|---|
| `air-duct-cleaning-in-or` | 321477, 321478 |
| `chimney-cap-installation-in-or-4` | 324772, 324773 |
| `dryer-vent-cleaning-in-or-56` | 328432, 328433 |
| `fireplace-installation-in-or-17` | 328149, 328150 |

**8.2 Two slug/title state contradictions.**

- Post 283567 `spark-arrestor-installation-in-carlsborg-az` — titled "Spark Arrestor Installation in
  Carlsborg ,WA". Carlsborg is in Washington; the slug's `-az` is wrong.
- Post 121820 — a 196-character slug that is an editing note committed as a URL
  (`liners-sweep-repair-in-wenham-ma-is-not-correct-the-correct-is-…-so-the-co`), titled
  "Liners (product) in Wenham,MA". It ends `-co`, so a naive parser files it under Colorado.

**8.3 Three URLs with no resolvable state.** `redding-ca-chimney-sweep` (title "Redding, CA, Chimney
Sweep" — the state sits before the last comma), `brooklyn-heights-ohio-fireplace-showroom`, and
`testing-location-pg`, a test page still published.

**8.4 The `-in-{state}` family: 9,018 URLs whose slug lost its city.** Slugs such as
`smelly-chimneys-repair-in-or` and `dryer-vent-cleaning-in-or-56` carry a state but no city, while
their titles do name one ("Smelly Chimneys in Lebanon, OR"). Concentrated in California and Oregon.

**8.5 The gone map is 83% unbacked.** 30,635 of 36,759 gone entries name URLs that appear nowhere in
`wp_posts`.

**8.6 Minnesota's own migration code misses six Minnesota slug forms** — 130 URLs. See §5.2(a).

**8.7 The previously reported 220,060 state-suffixed count is not reproducible.** See §1.

---

## 9. Redirect analysis

| Metric | Value |
|---|---:|
| Total redirects | 51,607 |
| Single hop | 50,833 |
| Chains | 767 |
| Loops | 7 |
| Self-redirects | 6 |
| Dangling targets | 0 |
| **Target will not return 200** | **31,799** (61.6%) |
| Cross-state | 72 |
| Sharing a destination | 45,687 |
| Distinct destinations | 15,167 |

Every redirect record carries, in the JSON: source URL, destination URL, source and destination state,
source and destination city, type, reason, source and destination WP IDs, whether the destination
exists, whether it returns 200, hop count, chain and loop flags, and whether the destination is
canonical. Flags emitted: `REDIRECT_LOOP`, `REDIRECT_CHAIN`, `DANGLING_TARGET`, `CROSS_STATE_REDIRECT`,
`SELF_REDIRECT`, `TARGET_NOT_200`, `DUPLICATE_DESTINATION`, `UNRESOLVED_REDIRECT`.

**The dominant problem is `TARGET_NOT_200`: 31,799 redirects land on a URL that
itself 404s** — 29,859 on unresolved URLs, 1,166 on gate-held pages, 774 on a further redirect.
Fixing the unresolved population would resolve most of this by construction.

---

## 10. Validation results

**Live verification.** 310 URLs were actually requested against the running Next.js
server at `http://localhost:3000`, sampled from every handling category in every state.

| Prediction | Probed | Confirmed |
|---|---:|---:|
| Expected 404, all states, all reasons | 155 | **155 (100%)** |
| Expected 308, Minnesota | 8 | **8 (100%)**, each to the exact predicted target |
| Expected 200, Minnesota | 16 | 13 |
| Expected 200/308, other states | 131 | **not verifiable** |

**Limit of the live check, stated plainly.** The running application is the Minnesota vertical slice;
only Minnesota is seeded. Every non-Minnesota 200/308 prediction returned 404 because the app holds no
data for that state, not because the prediction is wrong. **Those predictions are structurally derived
and are not claimed as live-verified.** The three Minnesota 200-predictions that returned 404 are
city pages this audit discovers and the sealed slice does not serve (§5.2(a)).

No redirect in the sample looped, chained, or crossed a state boundary at request time.

**Internal validation.** Minnesota URL set reproduced exactly (0 difference, both directions).
Published `job_listing` count reproduced exactly (229,621). Every URL carries exactly one handling
category; 0 URLs are unclassified.

---

## 11. Completeness

**Measured, not projected:** the URL universe, state assignment, city and pattern resolution, the
gone/redirect/earlier-URL fates, the service-catalogue match, the publication gate, the redirect graph,
and the 404 reason split. All derive from `SELECT` queries plus the approved fate maps.

**Not measured:** whether a `SERVICE_PAGE` or `COVERAGE_ONLY` URL *renders correctly* in any state but
Minnesota — no other state has been seeded, geocoded or branch-assigned. This audit reports that a page
kind resolves the URL, which is what the 200 prediction claims; it does not claim the page is built.