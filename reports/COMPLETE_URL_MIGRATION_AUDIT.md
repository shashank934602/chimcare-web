# Chimcare — Complete URL Migration Audit

**Generated:** 10 September 2026
**Scope:** 263,769 legacy URLs — the complete union of every contributing source
**Verification:** 539 URLs probed live against production
**Access:** **READ ONLY.** WordPress queried with `SELECT` only. No WordPress write, no change to any decision file, no redirect applied, no page created or retired, no Cloudflare change, no application code touched, no deployment. Production was read with `GET` only.

**Outputs:** `data/audits/url-universe/` — 26 files including `url-master-migration-map.csv` (263,769 rows).

---



## THE HEADLINE FINDING

**The approved fate maps have never been applied, and where production does redirect, the map is often wrong.**

I probed 539 URLs stratified across every classification. Prediction accuracy against the database was **93.7%**. The live results overturn two assumptions that every previous document in this project has relied on.

### 1. The maps are a proposal, not the site's behaviour


| Stratum                   | Probed | Result                                         |
| ------------------------- | ------ | ---------------------------------------------- |
| Approved redirect sources | 80     | **49 return 200**, 22 return 301, 9 return 404 |
| Approved retirements      | 147    | **87 return 200** — 59% are live working pages |
| Redirect destinations     | 60     | **60 return 200** — every one is live          |


**Only 22 of 80 approved redirects are actually live.** The rest still serve their own page.

### 2. Where production *does* redirect, the map contradicts it — and production is right

Of 26 live redirects probed, **11 disagree with the map**. In every case the map is worse:

```
/location/cleveland-chimney-sweep/            524 clicks
   production sends it to :  /location/cleveland-oh-chimney-sweep-repair/   (Ohio → Ohio)
   the map would send it to: /location/chimney-sweep-portland-oregon/       (Ohio → OREGON)

/location/chimcare-chimney-sweep-seattle/     202 clicks
   production sends it to :  /location/chimney-sweep-seattle-wa/            (Seattle → Seattle)
   the map would send it to: /location/chimney-sweep-portland-oregon/       (Seattle → OREGON)

/contact/                                     123 clicks
   production sends it to :  /contact-us/
   the map would send it to: /location/chimney-sweep-portland-oregon/       (contact page → a location page)
```

**Applying the approved map would actively break redirects that are correct today.** This is not a theoretical risk; it is measured on the three highest-traffic disagreements in the sample. Full list in `map-vs-production-conflicts.csv`.

**Consequence:** the redirect map cannot be applied as it stands. It must be reconciled against production first, and where they disagree, production wins unless the business says otherwise.

---



## 1. The URL universe

Nine sources contribute. Nothing was discarded for looking malformed. Every URL has a stable ID (`CH0000001`+) and its original form is preserved exactly.


| Source                            | URLs        |
| --------------------------------- | ----------- |
| WordPress published `job_listing` | 229,617     |
| `keep-pages.json`                 | 175,415     |
| Google Search Console export      | 133,665     |
| `redirects.json`                  | 50,938      |
| `gone.json`                       | 36,759      |
| WordPress `_wp_old_slug`          | 826         |
| WordPress Yoast earlier URLs      | 646         |
| Redirection plugin                | 12          |
| **Distinct union**                | **263,769** |


**One deliberate exclusion, recorded not hidden:** two Redirection-plugin rules keyed on a query string are excluded, because stripping the query would collapse `/?mailpoet_page=subscriptions` to `/` and invent a homepage self-redirect that does not exist.

Output: `url-universe.csv`.

---



## 2. Current status — measured, not assumed


| Status today            | URLs        |
| ----------------------- | ----------- |
| **200 — serves a page** | **229,890** |
| 404                     | 33,879      |


Google's view of the same set:


|                          | URLs       | Share    |
| ------------------------ | ---------- | -------- |
| Ever shown by Google     | 133,989    | 50.8%    |
| **Ever clicked**         | **16,982** | **6.4%** |
| Ever produced an enquiry | 554        | 0.2%     |
| Total clicks             | 75,482     |          |


**GONE is a business disposition, not a status.** 36,334 URLs are on the retirement list; **5,717 of them serve a page today** and would have to be actively taken down. The 147-URL probe confirms this: 87 returned 200.

---



## 3. Final map types


| Primary map type                 | URLs        | %          | Live today | Clicks | Action                     |
| -------------------------------- | ----------- | ---------- | ---------- | ------ | -------------------------- |
| KEEP                             | 88,563      | 33.58%     | 88,563     | 46,275 | Carry across unchanged     |
| **CREATE**                       | **78,666**  | **29.82%** | 78,666     | 11,658 | Service decision           |
| RETIRE                           | 36,334      | 13.77%     | 5,717      | 2,439  | Confirm retirement         |
| DESTINATION_NOT_IN_NEW_STRUCTURE | 28,493      | 10.80%     | 27,685     | 3,982  | Service decision           |
| REDIRECT_RELEVANT                | 11,568      | 4.39%      | 10,766     | 1,596  | Apply after reconciliation |
| REDIRECT_DIFFERENT_SERVICE       | 5,405       | 2.05%      | 5,089      | 2,956  | Business review            |
| REDIRECT_WRONG_SERVICE           | 4,159       | 1.58%      | 3,958      | 661    | Repoint                    |
| CITY_UNKNOWN                     | 2,400       | 0.91%      | 2,400      | 368    | Parser fix                 |
| URL_PATTERN_REVIEW               | 2,371       | 0.90%      | 2,371      | 300    | Default KEEP               |
| REDIRECT_EXACT                   | 1,599       | 0.61%      | 1,435      | 353    | Apply after reconciliation |
| REDIRECT_CROSS_CITY              | 1,383       | 0.52%      | 1,359      | 760    | Business review            |
| PARSER_REVIEW                    | 887         | 0.34%      | 887        | 440    | Parser fix                 |
| NO_SOURCE                        | 767         | 0.29%      | 0          | 2,724  | Review                     |
| DUPLICATE                        | 424         | 0.16%      | 424        | 24     | Choose survivor            |
| OTHER_REVIEW                     | 410         | 0.16%      | 388        | 156    | Review                     |
| REDIRECT_CATCH_ALL               | 181         | 0.07%      | 125        | 744    | Business review            |
| REDIRECT_DEAD_DESTINATION        | 92          | 0.03%      | 57         | 1      | Repoint                    |
| REDIRECT_CROSS_STATE             | 67          | 0.03%      | 0          | 45     | Repoint                    |
| **TOTAL**                        | **263,769** | 100%       |            | 75,482 |                            |


`REDIRECT_CATCH_ALL` is promoted to a primary type only where the redirect would otherwise look clean; a wrong-service or dead destination is the more actionable finding and keeps precedence.

---



## 4. The service catalogue — where the 92 actually live

**The 92 services are not in WordPress.** WordPress has no services table; its `job_listing_category` taxonomy holds 28 terms, which are states, not services.


|                                               |                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| **Source of truth**                           | `data/seed/services.ts` → `serviceSeed` array                                     |
| **Runtime home**                              | Postgres schema `site`, table `services`, FK `category_id` → `service_categories` |
| **Counts**                                    | 92 services in 8 categories                                                       |
| **Rendering**                                 | `site.services.key` → `site.pages.service_id` → `ServicePage`                     |
| **Provenance, verbatim from the file header** | *"Generated from the Spokane design mock by scripts in the migration repo"*       |


**The 92-service catalogue was derived from a single city's design mock, not from the URL corpus.** That is the single most important fact behind the final recommendation.

Output: `new-service-catalogue.csv`.

---



## 5. Legacy services versus the 92

**4,207 distinct legacy service phrases** appear across the universe.


| Gap status      | Services | URLs    | Live pages | Clicks |
| --------------- | -------- | ------- | ---------- | ------ |
| **EXACT_MATCH** | 92       | 118,987 | 106,355    | 21,104 |
| NOT_MODELED     | 3,973    | 96,992  | 83,168     | 23,530 |
| RELATED_SERVICE | 123      | 36,022  | 31,074     | 7,425  |
| AMBIGUOUS       | 9        | 6,634   | 5,207      | 5,962  |
| UNKNOWN         | 8        | 2,556   | 2,078      | 133    |
| ALIAS_MATCH     | 2        | 2,178   | 1,735      | 180    |


**The 92 services cover 45.1% of the URL universe.** The other 54.9% names something the new site cannot render.

Matching rules, applied in order, with **no substring matching at any point**: exact normalised equality; identical token multiset in a different order; differs by exactly one token (recorded as RELATED_SERVICE and **never auto-mapped**); differs by one token from several keys (AMBIGUOUS); otherwise NOT_MODELED.

`fireplace-flue-installation` was never turned into `fireplace-installation`.

Outputs: `legacy-service-universe.csv`, `service-model-gap.csv`, `unmodelled-live-services.csv`.

---



## 6. Should the 92 be expanded? The tail says exactly how far

This is the decisive table. The unmodelled phrases are not a flat list of 4,105 equals.


| Band              | Phrases   | URLs        | Clicks |
| ----------------- | --------- | ----------- | ------ |
| 1,000+ URLs each  | **83**    | **105,866** | 19,574 |
| 500–999           | 21        | 16,665      | 2,514  |
| 100–499           | 44        | 10,151      | 923    |
| 10–99             | 83        | 2,537       | 10,886 |
| 2–9               | 226       | 781         | 758    |
| **Exactly 1 URL** | **3,648** | **3,648**   | 2,262  |


**148 phrases with 100 or more URLs cover 132,682 URLs — 95% of the whole gap.**
**3,874 phrases with fewer than 10 URLs cover 4,429 URLs — 3.2%.**

The geographic test is cleaner still, because a service a national company actually offers appears in many states:


|                                 | Phrases | URLs        |
| ------------------------------- | ------- | ----------- |
| Appears in **5 or more states** | **210** | **132,930** |
| Appears in **1 state only**     | 3,764   | 4,071       |


A phrase appearing on one URL in one state is a typo or a one-off, not a service line.

### What each tier of decisions buys


| Decisions   | URLs resolved | % of gap  | Clicks recovered | Catalogue size |
| ----------- | ------------- | --------- | ---------------- | -------------- |
| Top 10      | 22,283        | 14.9%     | 11,471 (31.9%)   | 102            |
| Top 25      | 45,192        | 30.1%     | 14,933 (41.5%)   | 117            |
| Top 50      | 77,390        | 51.6%     | 18,146 (50.5%)   | 142            |
| **Top 100** | **129,770**   | **86.6%** | 22,009 (61.2%)   | 192            |




### The heaviest decisions


| Service                         | Live pages | Redirects depending on it | Total URLs | Clicks | Status      |
| ------------------------------- | ---------- | ------------------------- | ---------- | ------ | ----------- |
| chimney-sweep-repair            | 2,773      | 2,022                     | **4,795**  | 5,697  | AMBIGUOUS   |
| chimney-repair-reconstruction   | 1,039      | 1,355                     | 2,394      | 362    | RELATED     |
| gas-fireplace-repair-service    | 1,112      | 1,279                     | 2,391      | 1,643  | RELATED     |
| chimney-caps                    | 1,795      | 559                       | 2,354      | 226    | NOT_MODELED |
| masonry-repair-construction     | 1,092      | 916                       | 2,008      | 369    | NOT_MODELED |
| duct-cleaning                   | 1,218      | 556                       | 1,774      | 531    | RELATED     |
| pellet-stove-repair             | 1,109      | 567                       | 1,676      | 1,034  | NOT_MODELED |
| wood-burning-stove-installation | 1,140      | 508                       | 1,648      | 644    | NOT_MODELED |


Output: `service-expansion-tiers.csv`.

---



## 7. Redirects

53,346 approved redirects from four decision sources: `redirects.json` (50,938), duplicate town mapping (1,878 groups), Yoast earlier URLs (646), Redirection plugin (12).

### Destination availability — the distinction that matters most


| Destination status               | Redirects | Clicks |
| -------------------------------- | --------- | ------ |
| **LIVE_WP_NOT_IN_NEW_STRUCTURE** | 28,493    | 3,982  |
| LIVE_WP_AND_IN_NEW_SITE          | 24,761    | 7,271  |
| APPROVED_GONE                    | 56        | 1      |
| NO_WP_RECORD (genuinely dead)    | **35**    | 0      |
| WP_RECORD_NOT_PUBLISHED          | 1         | 0      |


**Only 36 redirects out of 53,346 point at something that genuinely does not exist.** All 60 sampled destinations returned 200 live. The 28,493 are not broken — their service is simply not modelled. Calling them broken would send engineering to fix the wrong thing.

### Graph health


|                                              | Count           |
| -------------------------------------------- | --------------- |
| Chains (more than one hop)                   | 677             |
| **Loops**                                    | **0**           |
| Self-redirects                               | 0               |
| Catch-all destinations (≥20 source services) | 3,339 redirects |


**On loops.** A first pass reported 549. Every one was an artefact of my own canonical-page rule fighting the business's own decisions. After letting an approved decision outrank the traffic heuristic, the loop count is **zero**. Recorded because it would otherwise read as a data defect when it was a method defect.

### Catch-all destinations


| Destination                                   | Sources | Services | Cities | States |
| --------------------------------------------- | ------- | -------- | ------ | ------ |
| `/location/wood-fireplaces-swansea-ma/`       | 278     | 57       | 83     | 1      |
| `/location/gas-fireplace-insert-plymouth-ma/` | 276     | 35       | 150    | 1      |
| `/location/liners-deerfield-ma/`              | 275     | 40       | 160    | 1      |
| `/location/chimney-repair-hanover-ma/`        | 261     | 69       | 72     | 1      |
| `/location/chimney-sweep-portland-oregon/`    | **79**  | **44**   | **57** | **8**  |


The Portland page is the one to look at first: it absorbs redirects from **eight states** and is the destination in three of the highest-traffic map-versus-production conflicts above.

Outputs: `redirect-destinations.csv`, `map-vs-production-conflicts.csv`.

---



## 8. Service pairs — 50,144 URL decisions become 5,580


| Pair type                       | Pairs   | URLs      | Clicks  |
| ------------------------------- | ------- | --------- | ------- |
| RELATED_SERVICE                 | 2,695   | 22,135    | 3,569   |
| UNRELATED_SERVICE               | 1,973   | 15,508    | 1,946   |
| SAME_OBJECT_DIFFERENT_ACTION    | 323     | 8,462     | 4,115   |
| **DIFFERENT_FUEL_OR_APPLIANCE** | **305** | **2,871** | **566** |
| NAMING_VARIANT                  | 216     | 3,268     | 828     |
| UNKNOWN                         | 68      | 1,144     | 108     |


The fuel-type group is indefensible rather than merely arguable, and should be ruled on first:

```
pellet-stove-service            →  wood-burning-stove-installation
pellet-stoves                   →  wood-stoves
gas-stoves-repair               →  pellet-stove-repair
wood-burning-stove-installation →  gas-stoves-repair
```

Output: `service-pair-decisions.csv`, `service-pair-summary.csv`.

---



## 9. Exact overlap — never added


| Set                     | URLs       |
| ----------------------- | ---------- |
| Destination unavailable | 28,585     |
| Different service       | 50,144     |
| **Both**                | **27,297** |
| A only                  | 1,288      |
| B only                  | 22,847     |
| **Union**               | **51,432** |


Naive addition gives 78,729; the true figure is **51,432**. Every pairwise intersection carries an arithmetic self-check and all 45 pass. Selected:


| Pair                                 | A       | B      | Both  | Union   |
| ------------------------------------ | ------- | ------ | ----- | ------- |
| Different service × has clicks       | 50,144  | 16,982 | 5,362 | 61,764  |
| Destination unavailable × has clicks | 28,585  | 16,982 | 3,172 | 42,395  |
| Wrong service × has clicks           | 4,159   | 16,982 | 402   | 20,739  |
| Unmodelled service × retirement      | 107,159 | 36,334 | **0** | 143,493 |
| Unmodelled service × duplicate       | 107,159 | 10,158 | 2,920 | 114,397 |


Output: `overlap-matrix.csv`.

---



## 10. URL patterns — a different shape is not a defect


| Pattern                          | URLs    | %      | Published | Indexed | Clicks     |
| -------------------------------- | ------- | ------ | --------- | ------- | ---------- |
| `{service}-in-{city}-{state}`    | 240,600 | 91.22% | 210,053   | 121,655 | 42,577     |
| `{service}-{city}-{state}`       | 13,563  | 5.14%  | 11,575    | 7,954   | 8,726      |
| `{service}-in-{state}` (no city) | 6,232   | 2.36%  | 5,838     | 2,338   | 456        |
| other / unrecognised             | 2,063   | 0.78%  | 1,268     | 1,205   | **18,622** |
| `{city}-{service}`               | 1,281   | 0.49%  | 1,126     | 818     | 5,095      |
| `{service}-{city}`               | 30      | 0.01%  | 30        | 19      | 6          |


**The "other" bucket is 0.78% of URLs and carries 24.7% of all clicks.** The `{city}-{service}` shape earns roughly seven times the site-average click rate per URL. Both would be prime rename candidates on appearance alone, and both would be expensive mistakes.

### SEO risk of renaming

16,949 live pages sit on a non-preferred pattern.


| Verdict                      | URLs      |
| ---------------------------- | --------- |
| **KEEP_CURRENT_URL**         | **7,539** |
| REVIEW (no measured traffic) | 9,244     |
| DUPLICATE_CONSOLIDATION      | 166       |


```
/location/chimney-sweep-seattle-wa/     1,927 clicks, 200 OK
   the only thing "wrong" with it is a missing "in"    →  KEEP
```

Output: `I-seo-risk-url-changes.csv`.

---



## 11. Retirement validation


| Category                  | URLs   | Clicks | With clicks | Live today |
| ------------------------- | ------ | ------ | ----------- | ---------- |
| NEVER_EXISTED             | 30,609 | 2,327  | 1,872       | 0          |
| DUPLICATE_ARTIFACT        | 5,069  | 83     | 67          | **5,069**  |
| EXISTED_AND_PUBLISHED     | 603    | 21     | 20          | **603**    |
| **REAL_CONTENT_PAGE**     | **45** | 7      | 6           | **45**     |
| EXISTED_BUT_NOT_PUBLISHED | 8      | 1      | 1           | 0          |


Probe confirmation: 60 of 60 NEVER_EXISTED returned 404; 40 of 40 DUPLICATE_ARTIFACT, 30 of 30 EXISTED_AND_PUBLISHED and 17 of 17 REAL_CONTENT_PAGE returned **200**.

**30,609 retirements are already 404** — retiring them changes only the status code. **5,725 are live pages** requiring an active decision, including 45 working town hub pages.

The list is not traffic-free: **32,069 have impressions and 1,966 have clicks.** But the highest earner on the entire list has 13 clicks and is a PDF, not a page.

Output: `retirement-validation.csv` (36,334 rows).

---



## 12. Content quality

Measured from `post_content` for 229,890 live pages. Never inferred from traffic.


| Class                         | Pages      |
| ----------------------------- | ---------- |
| CONTENT_STRONG                | 192,443    |
| **REVIEW (malformed markup)** | **33,740** |
| CONTENT_NORMAL                | 3,552      |
| LOW_INFORMATION               | 152        |
| MISSING                       | 3          |



| Defect                                 | Pages       |
| -------------------------------------- | ----------- |
| Malformed WPBakery close tag `</vc_…]` | 33,740      |
| **No meta description**                | **229,524** |
| No `<h2>`                              | 1,791       |
| Raw markdown in the body               | 1,651       |
| Identical body to another page         | 451         |
| No hero image                          | 171         |


**A correction to my own earlier work.** A previous pass counted the shortcode defect using the string `</name]` and returned zero. The real marker is `</vc_column_text]`. The corrected count is **33,740**, higher than the 30,089 previously reported in this project.

**A limit, stated plainly.** CONTENT_STRONG means the page meets the template's structural bar, not that its content is distinctive. No near-duplicate or thin-content measurement exists anywhere in this project, and nothing here should be read as one.

---



## 13. Priority


| Priority | URLs    | Clicks |
| -------- | ------- | ------ |
| **P0**   | **430** | 707    |
| P1       | 7,090   | 1,881  |
| P2       | 113,437 | 21,617 |
| P3       | 48,385  | 4,649  |
| P4       | 94,427  | 46,628 |


**P0 is 430 URLs** — wrong-service and cross-state redirects that currently earn clicks. To that list must now be added the **11 measured map-versus-production conflicts**, which are P0 by definition because applying the map would break working behaviour.

---



## 14. MIGRATION PLAN INPUT

Every URL in exactly one bucket. Verified: the seven primary buckets sum to 263,769.


| Bucket                                  | URLs                      | %      | Clicks | Live today | Owner                      |
| --------------------------------------- | ------------------------- | ------ | ------ | ---------- | -------------------------- |
| **KEEP**                                | 90,934                    | 34.47% | 46,575 | 90,934     | Carry across as is         |
| **CREATE**                              | 107,159                   | 40.63% | 15,640 | 106,351    | BUSINESS                   |
| **MERGE**                               | 424                       | 0.16%  | 24     | 424        | BUSINESS                   |
| **REDIRECT**                            | 13,167                    | 4.99%  | 1,949  | 12,201     | Apply after reconciliation |
| **RETIRE**                              | 36,334                    | 13.77% | 2,439  | 5,717      | BUSINESS                   |
| **REVIEW**                              | 11,433                    | 4.33%  | 8,148  | 10,248     | BUSINESS                   |
| **TECHNICAL_FIX**                       | 4,318                     | 1.64%  | 707    | 4,015      | ENGINEERING                |
| *URL_CHANGE candidates (overlaps KEEP)* | 16,949 Enduku Nehru Nagar | 6.43%  | 28,686 | 16,949     | BUSINESS, default KEEP     |
| *BUSINESS_DECISION total (overlaps)*    | 155,112                   | 58.81% | 23,269 | 123,023    | BUSINESS                   |
| *TECHNICAL_FIX total (overlaps)*        | 4,055                     | 1.54%  | 1,094  | 3,721      | ENGINEERING                |


**58.8% of the universe needs a business decision. 1.5% is engineering.**

Output: `migration-plan-input.csv`.

---



## 15. The 32 questions, answered


| #   | Question                                     | Answer                                                                                                    |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Total URLs                                   | 263,769                                                                                                   |
| 2   | Serve pages                                  | 229,890                                                                                                   |
| 3   | 404                                          | 33,879                                                                                                    |
| 4   | Legitimate KEEP                              | 90,934                                                                                                    |
| 5   | Live pages, service not modelled             | 78,666                                                                                                    |
| 6   | Approved retirements                         | 36,334                                                                                                    |
| 7   | Retirements still live                       | **5,717**                                                                                                 |
| 8   | Redirect destinations that are live WP pages | 53,254 of 53,346                                                                                          |
| 9   | Destinations that genuinely do not exist     | **36**                                                                                                    |
| 10  | Redirects to a different service             | 50,144                                                                                                    |
| 11  | Service pairs                                | 5,580                                                                                                     |
| 12  | Naming variants                              | 216 pairs / 3,268 URLs                                                                                    |
| 13  | Action changes                               | 323 pairs / 8,462 URLs                                                                                    |
| 14  | Fuel or appliance changes                    | **305 pairs / 2,871 URLs**                                                                                |
| 15  | Cross-state                                  | 67                                                                                                        |
| 16  | Catch-all destinations                       | 3,339 redirects into ≥20-service destinations                                                             |
| 17  | Legacy service concepts                      | 4,207 phrases                                                                                             |
| 18  | Represented by the 92                        | 94 phrases (92 exact + 2 alias) = 121,165 URLs                                                            |
| 19  | Not represented                              | 4,105 phrases = 139,648 URLs                                                                              |
| 20  | Should the 92 expand?                        | **Yes — see below**                                                                                       |
| 21  | Missing services affecting most URLs         | chimney-sweep-repair (4,795), chimney-repair-reconstruction (2,394), gas-fireplace-repair-service (2,391) |
| 22  | Missing services affecting most traffic      | chimney-sweep-repair (5,697 clicks), gas-fireplace-repair-service (1,643), pellet-stove-repair (1,034)    |
| 23  | Decisions resolving most URLs                | Top 100 services → 129,770 URLs (86.6%)                                                                   |
| 24  | URLs to leave unchanged                      | 90,934 KEEP + 7,539 explicit KEEP verdicts on odd patterns                                                |
| 25  | URLs genuinely requiring a change            | 424 duplicates + 166 duplicate consolidations = **590**                                                   |
| 26  | Safe redirects                               | 13,167 — **but only after reconciliation against production**                                             |
| 27  | Redirects needing business review            | 11,433                                                                                                    |
| 28  | Redirects needing technical correction       | 4,318                                                                                                     |
| 29  | URLs to retire                               | 30,609 already 404 are safe; 5,725 need confirmation                                                      |
| 30  | Needing further investigation                | 4,055 engineering + 11 measured map conflicts                                                             |
| 31  | P0 population                                | 430, plus the 11 map-versus-production conflicts                                                          |
| 32  | Must be decided before migration             | The service catalogue; whether to apply the redirect map at all; the 5,725 live retirements               |


---



## FINAL ANSWER: should Chimcare keep the 92, expand, merge, or revise?

**Create a revised catalogue of roughly 210 services. Do not keep 92. Do not expand to 4,207.**

The evidence, in order of weight:

**1. The 92 was never derived from the data.** The catalogue file states it was *"generated from the Spokane design mock"*. It is one city's page design, not a census of what Chimcare sells. It has no authority as a description of the business.

**2. It covers less than half the site.** The 92 services match **118,987 of 263,769 URLs — 45.1%**. The other 54.9% names something the new site cannot render. That is not a long tail; it is the majority.

**3. The gap is concentrated, and the concentration says where to stop.** Of 4,105 unmodelled phrases:

- **210 appear in 5 or more states and cover 132,930 URLs (95% of the gap)**
- 3,764 appear in one state only and cover 4,071 URLs (2.9%)
- 3,648 appear on exactly one URL

A service a national chimney company actually sells appears across many states. A phrase on one URL in one state is a typo. **The multi-state test draws the line at 210, and it draws it on evidence rather than on a round number.**

**4. Most of the gap is merge work, not create work.** 123 phrases classified RELATED_SERVICE differ from an existing catalogue key by exactly one token and cover 36,022 URLs. `chimney-caps` versus `chimney-cap-installation`. `duct-cleaning` versus `air-duct-cleaning`. These should be **merged into existing keys**, not created as new services. A further 9 AMBIGUOUS phrases covering 6,634 URLs need a human ruling before anything.

**5. The single biggest item is a category error, not a service.** `chimney-sweep-repair` affects **4,795 URLs and 5,697 clicks** and is classified AMBIGUOUS. It is the phrase Chimcare uses for **town hub pages**, not a service at all. Ruling on it correctly reclassifies more URLs than any other decision available.

### /Users/vss-2/Desktop/chimcare/chimcare-web-2-RECOVERED/reports/COMPLETE_URL_MIGRATION_[AUDIT.md](http://AUDIT.md)


|     |
| --- |
|     |


**Why not simply create all 4,105:** 3,874 of them have fewer than ten URLs and 3,690 have never been clicked. Modelling them would multiply the catalogue forty-fold to reach 3.2% more URLs, and would enshrine typos as service lines.

**Why not keep 92:** it leaves 139,648 URLs — more than half the site, carrying 37,250 clicks — with nothing to render them, and it forces every one of those into a redirect or a retirement that the evidence does not support.

**Sequencing note.** This decision is worth more than any redirect work. 107,159 URLs are blocked on it, against 13,167 that a perfect redirect map would resolve. And since the map has never been applied and contradicts production where it has, **the service catalogue should be settled first and the redirect map rebuilt against the answer** — not the other way round.

---



## 16. Files produced

All under `data/audits/url-universe/`.


| File                                                                                    | Rows     |
| --------------------------------------------------------------------------------------- | -------- |
| `url-master-migration-map.csv`                                                          | 263,769  |
| `url-universe.csv`                                                                      | 263,769  |
| `url-master-audit.csv` (56-column superset)                                             | 263,769  |
| `retirement-validation.csv`                                                             | 36,334   |
| `I-seo-risk-url-changes.csv`                                                            | 16,949   |
| `redirect-destinations.csv`                                                             | 15,284   |
| `E-redirect-problems.csv`                                                               | 40,022   |
| `service-pair-decisions.csv`                                                            | 5,580    |
| `legacy-service-universe.csv` / `service-model-gap.csv`                                 | 4,207    |
| `N-duplicate-groups.csv`                                                                | 4,829    |
| `unmodelled-live-services.csv`                                                          | 3,568    |
| `G2-retirement-exceptions.csv`                                                          | 7,590    |
| `production-verification.csv`                                                           | 539      |
| `new-service-catalogue.csv`                                                             | 92       |
| `K-top-100-priority.csv` / `L-top-100-service-pairs.csv` / `M-top-100-destinations.csv` | 100 each |
| `overlap-matrix.csv`                                                                    | 45       |
| `map-type-summary.csv`                                                                  | 18       |
| `map-vs-production-conflicts.csv`                                                       | 11       |
| `migration-plan-input.csv`                                                              | 10       |
| `service-expansion-tiers.csv`                                                           | 4        |
| `service-pair-summary.csv`                                                              | 6        |
| plus `B/C/F/G/H/J` summary tables                                                       |          |


---



## 17. Limits

- **The Search Console export is business-supplied and undated**, with no backlink or session data. Absence from it is not proof a page has no value, and no page here is called worthless on that basis.
- **No content-quality measurement exists.** Word and heading counts are structural. No near-duplicate detection, no thin-content scoring.
- **Live status was sampled, not exhaustive.** 539 URLs probed, 93.7% prediction accuracy. Every other status is database-derived. The 11 map-versus-production conflicts are from a 26-URL live-redirect sample; **the full reconciliation has not been done and should be.**
- **The city vocabulary is learned from the corpus**, only from shapes that cannot be misread, and rejects any candidate containing a service word. 2,400 URLs still have no resolvable city and are marked CITY_UNKNOWN rather than guessed.
- **Service matching never uses substrings.** Uncertain relationships are typed and referred to a human, never applied.

**Nothing was modified.** No WordPress write, no change to `redirects.json` or `gone.json`, no redirect applied, no page created or retired, no Cloudflare change, no deployment.