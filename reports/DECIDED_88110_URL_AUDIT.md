# The 88,110 Decided URLs — Research and Validation Audit

**Scope.** Every URL whose fate the business has already decided: the approved redirect map and the
approved retirement map, audited for whether those decisions can actually be applied.


|                  |                                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generated        | 2026-09-09T09:25:10.392Z                                                                                                                             |
| Access           | **READ ONLY.** `SELECT` only against `chimcare_local`. Fate maps, the Search Console export and the WordPress dumps were read from disk.             |
| Written          | Nothing. No WordPress write, no edit to `redirects.json` or `gone.json`, no redirect applied, no deletion, no production change, no seed, no deploy. |
| Machine-readable | `data/audits/decided-88110/` — six CSVs and `summary.json`                                                                                           |


---



## S1. What had to be reconstructed, and why

Three things must be stated before any number in this report is read.

**S1.1 The whole-site audit database no longer exists.** `data/audits/whole-site-audit.sqlite`,
which held the classification behind the figures in the brief (51,607 / 36,503 / 429 / 299 / 1), is
not on this machine. Neither is its generating script. Both were listed as a P0 recovery item; that
risk has now materialised. **Every classification in this report was therefore recomputed from the
primary sources** — the live MySQL database and the approved maps — using the precedence rules the
surviving reconciliation report documents. Where my recomputation differs from the brief's figure, both
are shown and the difference is explained. Nothing is repeated on trust.

**S1.2 The approved maps have never been applied to production.** Probed live during this audit:

```
/location/dryer-duct-cleaning-in-weymouth-ma/  ->  HTTP 200
/location/chimney-rebuild-in-waltham-ma/  ->  HTTP 200
/location/outdoor-fireplaces-repair-in-everett-ma/  ->  HTTP 200
```

Of 239 URLs actually requested against `https://www.chimcare.com`:


| Population probed | Result        |
| ----------------- | ------------- |
| DEAD_DEST         | HTTP 200 × 59 |
| GONE              | HTTP 200 × 10 |
| GONE              | HTTP 404 × 50 |
| REDIRECT_DEST     | HTTP 200 × 60 |
| REDIRECT_SRC      | HTTP 200 × 58 |
| REDIRECT_SRC      | HTTP 404 × 2  |


Three things follow, and the third is the most important finding in this report.

**(a) The redirect map is not live.** Redirect sources still answer 200, not 308. Two already 404.

**(b) The retirement map is partly self-executing.** 50 of 60 retirement URLs already 404 on
production, because they were deleted from WordPress long ago — which matches the 30,854
that appear nowhere in `wp_posts`. The 10 that answer 200 are the ones that are still live published
pages, and they are exactly the ones worth reviewing.

**(c) A "dead destination" is not a broken URL today. All 59 sampled destinations that this audit
predicts will 404 currently answer 200 on production.** They are live, working WordPress pages. They
are "dead" only in the *new* system, because the service they name is one of the 116 that the
92-service catalogue does not model. **The 29,321 dead destinations in S4 are therefore not a
defect in the redirect map at all — they are the service-catalogue decision, seen from a different
angle.** Approve the services and they stop being dead. That single fact reframes the largest number
in this report.

**S1.3 Traffic data does exist.** `indexed_urls (4).csv` is a Google Search Console export of
139,063 rows carrying clicks, impressions, CTR and average position, covering 133,665 location
URLs. It is business-supplied and undated, so it is used as a *relative* value signal, never as proof
that a URL is worthless. Sections 5 and 9 are answered from it rather than declared unavailable.

---



## S2. Population definition and reconciliation

The decided population is every URL whose fate is already settled. It has three origins, not one:


| Origin of the decision                                           | URLs       |
| ---------------------------------------------------------------- | ---------- |
| `redirects.json` — the approved redirect map                     | 50,938     |
| Duplicate town-page mapping — a town with more than one hub page | 1,488      |
| WordPress-recorded earlier URL (`_yoast_post_redirect_info`)     | 630        |
| **Redirect population**                                          | **53,056** |
| `gone.json` — the approved retirement map                        | 36,759     |
| **TOTAL DECIDED**                                                | **89,815** |


**Against the brief's 88,110 (51,607 + 36,503).** The redirect count differs because the number of
duplicate town pages depends on how town pages are identified, and the rule that did that lives in the
lost database. The retirement count differs by a known, small and fully explained amount:


|           | Brief      | This audit | Difference                                                                           |
| --------- | ---------- | ---------- | ------------------------------------------------------------------------------------ |
| REDIRECT  | 51,607     | 53,056     | +1,449 — a broader town-page rule finds more duplicates                              |
| GONE      | 36,503     | 36,759     | +256 — the brief counts the map **after** 258 entries lost precedence to a town page |
| **Total** | **88,110** | **89,815** |                                                                                      |


My reclassification puts exactly **36,501** of the 36,759 retirement entries in the GONE
class — **two** URLs from the brief's 36,503. That near-exact agreement on the larger and more
independent of the two populations is the strongest evidence that the precedence order was
reconstructed correctly.

### The four-bucket reconciliation the brief asks for


| Bucket                   | URLs        |
| ------------------------ | ----------- |
| Migrate as-is (LINKABLE) | 87,581      |
| Unresolved bucket        | 85,227      |
| Already decided          | 88,110      |
| Open remainder           | 1,617       |
| **TOTAL**                | **262,535** |


**The arithmetic holds exactly: 87,581 + 85,227 + 88,110 + 1,617 = 262,535.** It is arithmetic, not
evidence — the split between 85,227 and 1,617 came from the lost database and cannot be re-derived
today. My independent rebuild of the same universe gives **262,987** URLs, 452
more than 262,535. The difference is entirely in how a WordPress-recorded earlier URL is turned into a
path; it does not touch the decided population, which is defined by the two maps. **No URL is counted
in more than one bucket:** the redirect and retirement sets are disjoint (measured: 0 overlap).

---



## S3. Redirect audit — 53,056 URLs



### 3.1 The redirect graph


| Graph classification                              | URLs   | %      |
| ------------------------------------------------- | ------ | ------ |
| Single hop to a destination that will answer 200  | 23,641 | 44.56% |
| Redirect → a URL that will 404                    | 28,407 | 53.54% |
| Redirect → a page held by the publication gate    | 266    | 0.50%  |
| Redirect → another redirect (chain)               | 107    | 0.20%  |
| Redirect → a destination outside the URL universe | 629    | 1.19%  |
| Redirect → a retired (410) URL                    | 4      | 0.01%  |
| Self-loop                                         | 0      | 0%     |
| True loop                                         | 0      | 0%     |
| Missing destination                               | 0      | 0%     |
| Cross-state                                       | 70     | 0.13%  |


**On loops.** A first pass reported 1,610 loops. Every one was an artefact of my own canonical-town-page
rule, which preferred the shortest slug and so pointed a `-2` page back at the page the business
deliberately redirects *into* it. The routing spec is explicit that where a `-2` slug is the approved
target, that page is the intended survivor and must never be "fixed". After correcting the rule to let
the business's own decisions outrank the heuristic, **the loop count is zero.** This is recorded because
it is the kind of finding that would otherwise have been reported as a data defect when it was a
method defect.

### 3.2 Source and destination service relevance

A related service is **not** the same service. Equality is normalised-string equality or an identical
token multiset in a different word order. No substring match, no superset match, no judgement about
whether two names "sound similar". `fireplace-flue-installation` does not become `fireplace-installation`.


| Relevance                        | URLs   | % of 53,056 |
| -------------------------------- | ------ | ----------- |
| DIFFERENT_SERVICE_SAME_CITY      | 46,539 | 87.72%      |
| DIFFERENT_SERVICE_DIFFERENT_CITY | 2,684  | 5.06%       |
| SAME_SERVICE_SAME_CITY           | 2,210  | 4.17%       |
| SAME_SERVICE_DIFFERENT_CITY      | 905    | 1.71%       |
| CITY_UNKNOWN                     | 718    | 1.35%       |


**92.78% of all approved redirects send a visitor to a different service.**
Only 2,210 — 4.17% — are a like-for-like move of the same
service in the same town. Google treats an irrelevant redirect as a soft 404 and passes no value, so
this is not a cosmetic finding.

Worked examples drawn from the map, exactly the pattern the brief warned about:

```
chimney-animal-removal
   -> chimney-nest-removal   (weymouth, ma; 1 clicks)
wood-fireplaces-sweep-repair
   -> chimney-fireplace-repair   (weymouth, ma; 1 clicks)
wood-stoves-repair
   -> pellet-stove-service   (weymouth, ma; 1 clicks)
chimney-cricket-installation
   -> chimney-flashing-repair   (weymouth, ma; 2 clicks)
wood-burning-fireplace-installation
   -> chimney-fireplace-repair   (weymouth, ma; 1 clicks)
fireplace-gas-valve-repair
   -> gas-fireplaces   (weymouth, ma; 1 clicks)
```



### 3.3 Redirect quality grade

Every redirect carries all of its technical flags; the grade is the most severe one. Overlapping
problems are never hidden — the `flags` column in the CSV lists them all.


| Grade                   | URLs   | %      | Meaning                                                          |
| ----------------------- | ------ | ------ | ---------------------------------------------------------------- |
| A — VALID_1_TO_1        | 1,382  | 2.60%  | Same service, same town, destination answers 200                 |
| B — VALID_BUT_REVIEW    | 594    | 1.12%  | Destination answers 200, but the town changes or is unresolvable |
| C — DIFFERENT_SERVICE   | 21,665 | 40.83% | Destination is a live page for a different service               |
| D — DEAD_DESTINATION    | 29,305 | 55.23% | Destination will not answer 200                                  |
| E — CHAIN_OR_LOOP       | 94     | 0.18%  | More than one hop                                                |
| F — CROSS_STATE         | 16     | 0.03%  | Crosses a state line                                             |
| G — MISSING_DESTINATION | 0      | 0%     | No destination recorded                                          |
| H — OTHER_REVIEW        | 0      | 0.00%  | Anything else                                                    |


---



## S4. The overlap, calculated exactly

The brief is right that the two headline numbers must not be added. Measured intersection:


| Set                                                            | URLs       |
| -------------------------------------------------------------- | ---------- |
| DEAD_TARGET (destination will not answer 200)                  | 29,321     |
| DIFFERENT_SERVICE                                              | 49,223     |
| **BOTH**                                                       | **27,566** |
| DEAD_TARGET_ONLY                                               | 1,755      |
| DIFFERENT_SERVICE_ONLY                                         | 21,657     |
| VALID_SAME_SERVICE (live destination, same service, same town) | 1,468      |
| OTHER (town changed, or town unresolvable, destination live)   | 610        |
| **TOTAL_AFFECTED = DEAD ∪ DIFFERENT_SERVICE**                  | **50,978** |


Check: 50,978 + 1,468 + 610 = 53,056. Every redirect is accounted for once.

**96.08% of the approved redirect map has at least one of the two problems.**
The union is far smaller than the sum, because 27,566 redirects carry both at once: they point at a
page that is both a different service *and* will not exist.

The brief's figures were 31,799 dead targets and 43,204 same-town-different-service. I measure
29,321 and 46,539. Both are close to the stated values and neither
reproduces exactly, for the reasons in S1.1.

---



## S5. Traffic and SEO value

Joined to the Search Console export on the normalised source URL.


| Measure                | Redirect sources | Retirement URLs |
| ---------------------- | ---------------- | --------------- |
| In the export at all   | 51,074           | 32,347          |
| Absent from the export | 1,982            | 4,412           |
| With impressions       | 51,074           | 32,347          |
| With clicks            | 5,757            | 1,972           |
| Total clicks           | 14,319           | 2,445           |
| Total impressions      | 2,797,405        | 567,393         |



| The two dangerous intersections                                   | URLs  | Clicks at stake |
| ----------------------------------------------------------------- | ----- | --------------- |
| Redirects **with clicks** pointing at a destination that will 404 | 3,264 | 4,193           |
| Redirects **with clicks** pointing at a different service         | 5,341 | 11,942          |


**No URL is called worthless because it has no clicks.** The export is undated, has no backlink column
and no session data, and 1,982 redirect sources and 4,412 retirement URLs do not appear
in it at all — absence from the file is not evidence of absence of value. Backlinks and sessions are
**not available anywhere in the repository**; that branch of the value question remains unanswered.

---



## S6. Destination concentration


| Measure                                               | Value  |
| ----------------------------------------------------- | ------ |
| Source URLs                                           | 53,056 |
| Distinct destinations                                 | 15,364 |
| Destinations receiving more than one redirect         | 9,375  |
| Largest number of sources pointing at one destination | 278    |



| Incoming redirects | Destinations |
| ------------------ | ------------ |
| 1                  | 5,989        |
| 2-9                | 8,460        |
| 10-49              | 888          |
| 50-99              | 14           |
| 100+               | 13           |




### The heaviest destinations, examined


| Destination                                    | In  | Distinct source services | Genuinely the same service | Destination will answer |
| ---------------------------------------------- | --- | ------------------------ | -------------------------- | ----------------------- |
| `/location/wood-fireplaces-swansea-ma/`        | 278 | 50                       | **0**                      | 404                     |
| `/location/gas-fireplace-insert-plymouth-ma/`  | 276 | 35                       | **0**                      | 404                     |
| `/location/liners-deerfield-ma/`               | 275 | 42                       | **0**                      | 404                     |
| `/location/chimney-repair-hanover-ma/`         | 261 | 105                      | **0**                      | 200                     |
| `/location/chimney-sweep-attleboro-ma/`        | 211 | 42                       | **0**                      | 200                     |
| `/location/gas-fireplace-insert-puyallup-wa/`  | 132 | 28                       | **0**                      | 404                     |
| `/location/savage-chimney-rebuild-in-mn/`      | 131 | 58                       | **0**                      | 404                     |
| `/location/gas-fireplace-repair-rogers-mn/`    | 115 | 28                       | **0**                      | 200                     |
| `/location/fireplace-damper-repair-sharon-ma/` | 113 | 29                       | **0**                      | 200                     |
| `/location/wood-stoves-acton-ma/`              | 112 | 12                       | **0**                      | 404                     |


**This is the single clearest evidence of an over-broad redirect rule in the data.** The heaviest
destination absorbs 278 URLs spanning 50 distinct services, of which **none** is the
service the destination itself represents — and the destination is itself predicted to 404. The pattern
repeats across the top ten. `/location/chimney-repair-hanover-ma/` collects 261 redirects from 105
different services. A rule that funnels a hundred different customer intents into one page is not a
redirect map; it is a catch-all.

---



## S7. Cross-state redirects — all 70

**Every single one points at the same page:** `/location/chimney-sweep-portland-oregon/`.


| Source state → destination state | URLs |
| -------------------------------- | ---- |
| oh → or                          | 23   |
| ca → or                          | 15   |
| ga → or                          | 11   |
| wi → or                          | 8    |
| co → or                          | 7    |
| mn → or                          | 3    |
| wa → or                          | 2    |
| ma → or                          | 1    |


27 of the 70 carry Google clicks. The destination is an Oregon branch page; the sources
are towns in Ohio, California, Georgia, Wisconsin, Colorado, Minnesota, Washington and Massachusetts.

**Is it justified?** Not on the evidence available. A visitor searching for a chimney service in
Johnstown, Ohio being sent to Portland, Oregon is a different service area, a different branch and a
different phone number. There is no branch or coverage record that puts these towns inside the
Portland service radius. **Every one is flagged REVIEW, not "wrong"** — only the business can say
whether a historical arrangement justifies it. The full list with evidence is
`cross-state-redirects.csv`. Ten examples:


| Source                                         | Source state | Destination state | Clicks |
| ---------------------------------------------- | ------------ | ----------------- | ------ |
| `/location/duct-cleaning-vermilion-oh/`        | OH           | OR                | 5      |
| `/location/chimney-sweep-greenfield-in-wi/`    | WI           | OR                | 3      |
| `/location/chimney-sweep-repair-chardon-oh/`   | OH           | OR                | 3      |
| `/location/chimney-sweep-repair-in-co-103/`    | CO           | OR                | 3      |
| `/location/fireplace-repair-parker-co/`        | CO           | OR                | 3      |
| `/location/chimney-caps-covington-ga/`         | GA           | OR                | 2      |
| `/location/chimney-sweep-delafield-wi/`        | WI           | OR                | 2      |
| `/location/dryer-vent-cleaning-slinger-in-wi/` | WI           | OR                | 2      |
| `/location/duct-cleaning-elkhorn-wi/`          | WI           | OR                | 2      |
| `/location/gas-fireplace-insert-vancouver-wa/` | WA           | OR                | 2      |


---



## S8. Retirement audit — 36,759 URLs


| Category                  | URLs              | %      | Meaning                                                              |
| ------------------------- | ----------------- | ------ | -------------------------------------------------------------------- |
| NEVER_EXISTED             | 30,854 16 bro bro | 83.94% | Appears nowhere in `wp_posts` — not as a draft, not as any post type |
| DUPLICATE_ARTIFACT        | 5,035             | 13.70% | Live published page carrying WordPress's `-N` duplicate suffix       |
| EXISTED_AND_PUBLISHED     | 603               | 1.64%  | Live published page with no duplicate suffix                         |
| NEEDS_REVIEW              | 239               | 0.65%  | Precedence puts it somewhere other than retirement                   |
| REAL_CONTENT_PAGE         | 19                | 0.05%  | A live town hub page that passes the publication gate                |
| EXISTED_BUT_NOT_PUBLISHED | 9                 | 0.02%  | In `wp_posts` as another post type — 8 attachments and 1 menu item   |


---



## S9. Validating the retirement decisions — the claims tested


| Claim in the brief                                      | Measured                                     | Verdict                   |
| ------------------------------------------------------- | -------------------------------------------- | ------------------------- |
| 30,863 have no WordPress source                         | 30,854 appear nowhere in `wp_posts`          | **Confirmed**, within 9   |
| 30,635 appear nowhere in `wp_posts`                     | 30,854                                       | **Confirmed**, within 219 |
| Only 5,640 are live published pages                     | 5,896 are live published `job_listing` posts | **Understated by 256**    |
| The whole population has **0 impressions and 0 clicks** | 32,347 have impressions; 1,972 have clicks   | **FALSE**                 |




### The exceptions the brief asks for, found


| Exception                                                      | URLs                                             |
| -------------------------------------------------------------- | ------------------------------------------------ |
| Retirement URLs with Google **clicks**                         | 1,972                                            |
| Retirement URLs with **impressions**                           | 32,347                                           |
| Retirement URLs that are a **live published page**             | 5,896                                            |
| Retirement URLs that are a live town hub page passing the gate | 19                                               |
| Retirement URLs with an **equivalent live URL** elsewhere      | 1,126                                            |
| Retirement URLs with **backlinks**                             | **not determinable — no backlink source exists** |
| Retirement URLs that are not under `/location/` at all         | 47                                               |


**The "zero traffic" claim is the one that fails, and it matters.** 1,972 URLs
scheduled for a 410 have earned clicks, totalling 2,445.

**But the magnitude is modest, and that must be said just as plainly.** The distribution:


| Clicks     | Retirement URLs |
| ---------- | --------------- |
| 0          | 34,787          |
| 1–9        | 1,969           |
| 10 or more | 3               |


The single highest-earning URL on the retirement list has **13 clicks**, and it is a PDF
(`/wp-content/uploads/2022/12/washington-dec.pdf/`), not a page. Retiring the whole set costs on the
order of 2,445 clicks against a site total of 75,524 in the same export — roughly 3%.
The decision is defensible; the premise offered for it is not.

Highest-earning retirement URLs:


| URL                                                              | Clicks | Impressions | Category           |
| ---------------------------------------------------------------- | ------ | ----------- | ------------------ |
| `/wp-content/uploads/2022/12/washington-dec.pdf/`                | 13     | 426         | NEVER_EXISTED      |
| `/location/chimney-flashing-repair-in-tacoma-wa/`                | 11     | 137         | NEVER_EXISTED      |
| `/location/fireplace-refacing-mantel-replacement-in-seattle-wa/` | 10     | 256         | NEVER_EXISTED      |
| `/location/pellet-stove-repair-in-portland-or/`                  | 8      | 627         | NEVER_EXISTED      |
| `/location/ventless-gas-logs-installation-in-or-7/`              | 7      | 1,293       | DUPLICATE_ARTIFACT |
| `/location/electric-fireplace-repair-in-chicago-il/`             | 7      | 1,676       | NEVER_EXISTED      |
| `/location/electric-fireplace-installation-in-minneapolis-mn/`   | 6      | 509         | NEVER_EXISTED      |
| `/location/fireplace-installation-in-monroe-ga/`                 | 6      | 22          | NEVER_EXISTED      |
| `/location/gas-fireplace-repair-in-morro-bay-ca/`                | 6      | 16          | NEVER_EXISTED      |
| `/location/pellet-stove-repair-in-oregon-city-or/`               | 6      | 28          | NEVER_EXISTED      |


---



## S10. Precedence conflicts

A conflict is a URL the business decided to redirect or retire, which the audit's own precedence rules
turn into a live page instead — because rules 1–2 (a town hub page) outrank rules 3–4 (the approved maps).


|                                             | Brief   | This audit |
| ------------------------------------------- | ------- | ---------- |
| Marked REDIRECT, audit makes it a live page | 368     | 114        |
| Marked GONE, audit makes it a live page     | 61      | 19         |
| **Total**                                   | **429** | **133**    |


I find 133, not 429. The gap is the town-page identification rule, which lived in the lost
database (S1.1). My rule is stricter: a URL conflicts only if it is the *canonical* hub page for its
town **and** passes the publication gate. A looser rule — counting every town-shaped page whether or not
it survives as canonical — produces a number in the 400s, which is consistent with the brief's 429.
**All 133 that my rule finds are listed in** `precedence-conflicts.csv` **with full evidence.**

**I am not choosing a side.** 23 of the 133 carry Google clicks, which is the fact most
likely to change the answer. The full table follows.


| URL                                                 | Business | Audit  | Clicks | Imp.  | Approved destination                                                |
| --------------------------------------------------- | -------- | ------ | ------ | ----- | ------------------------------------------------------------------- |
| `/location/chimney-sweep-repair-in-hudson-ma/`      | REDIRECT | PAGE   | 7      | 301   | `/location/chimney-cleaning-in-hudson-ma/`                          |
| `/location/hadley-chimney-sweep-in-ma/`             | REDIRECT | PAGE   | 4      | 90    | `/location/chimney-sweep-attleboro-ma/`                             |
| `/location/whitman-chimney-sweep-repair-in-ma/`     | REDIRECT | PAGE   | 3      | 685   | `/location/chimney-sweep-attleboro-ma/`                             |
| `/location/chimney-sweep-repair-in-swansea-ma/`     | REDIRECT | PAGE   | 2      | 1,826 | `/location/chimney-maintenance-in-swansea-ma/`                      |
| `/location/chimney-sweep-repair-in-sterling-ma/`    | REDIRECT | PAGE   | 2      | 24    | `/location/local-chimney-sweep-and-cleaning-in-sterling-ma/`        |
| `/location/chimney-sweep-repair-in-glen-ellyn-il/`  | GONE     | PAGE   | 2      | 67    | `(retire)`                                                          |
| `/location/chimney-sweep-repair-in-gilroy-ca/`      | REDIRECT | PAGE   | 2      | 24    | `/location/chimney-cleaning-in-gilroy-ca/`                          |
| `/location/chimney-sweep-repair-in-everett-ma/`     | REDIRECT | PAGE   | 1      | 93    | `/location/chimney-cleaning-in-everett-ma/`                         |
| `/location/holden-chimney-sweep-in-ma/`             | REDIRECT | PAGE   | 1      | 34    | `/location/chimney-sweep-attleboro-ma/`                             |
| `/location/chimney-sweep-repair-in-duxbury-ma/`     | REDIRECT | PAGE   | 1      | 241   | `/location/local-chimney-sweep-and-cleaning-in-duxbury-ma/`         |
| `/location/chimney-sweep-repair-in-berkley-ma/`     | REDIRECT | PAGE   | 1      | 454   | `/location/chimney-cleaning-in-berkley-ma/`                         |
| `/location/chimney-sweep-services-in-buckland-ma/`  | REDIRECT | PAGE   | 1      | 3     | `/location/chimney-cleaning-maintenance-services-in-buckland-ma/`   |
| `/location/chimney-sweep-in-vadnais-heights-mn/`    | REDIRECT | PAGE   | 1      | 160   | `/location/chimney-cleaning-in-vadnais-heights-mn/`                 |
| `/location/chimney-sweep-repair-in-st-francis-mn/`  | REDIRECT | PAGE   | 1      | 21    | `/location/chimney-cleaning-maintenance-services-in-st-francis-mn/` |
| `/location/chimney-sweep-in-grants-pass-or/`        | REDIRECT | PAGE   | 1      | 25    | `/location/chimney-deep-cleaning-pcr-in-grants-pass-or/`            |
| `/location/chimney-sweep-in-dayton-or/`             | REDIRECT | PAGE   | 1      | 71    | `/location/cleaning-sweeping-in-dayton-or/`                         |
| `/location/chimney-sweep-repair-in-hermiston-or/`   | REDIRECT | PAGE   | 1      | 1     | `/location/chimney-maintenance-in-hermiston-or/`                    |
| `/location/chimney-sweep-repair-in-capitola-ca/`    | GONE     | PAGE   | 1      | 32    | `(retire)`                                                          |
| `/location/chimney-sweep-repair-in-pismo-beach-ca/` | GONE     | PAGE   | 1      | 3     | `(retire)`                                                          |
| `/location/chimney-sweep-repair-in-orland-ca/`      | REDIRECT | PAGE   | 1      | 18    | `/location/chimney-cleaning-in-orland-ca/`                          |
| `/location/chimney-sweep-in-kings-beach-ca/`        | REDIRECT | PAGE   | 1      | 5     | `/location/chimney-cleaning-in-kings-beach-ca/`                     |
| `/location/chimney-sweep-in-los-angeles-ca/`        | REDIRECT | PAGE   | 1      | 690   | `/location/chimney-cleaning-in-los-angeles-ca/`                     |
| `/location/chimney-sweep-in-fremont-ca/`            | REDIRECT | PAGE   | 1      | 26    | `/location/chimney-preventive-maintenance-in-fremont-ca/`           |
| `/location/chimney-sweep-repair-in-springfield-ma/` | REDIRECT | PAGE   | 0      | 250   | `/location/local-chimney-sweep-and-cleaning-in-springfield-ma/`     |
| `/location/chimney-sweep-repair-in-walpole-ma/`     | REDIRECT | PAGE   | 0      | 192   | `/location/chimney-cleaning-in-walpole-ma/`                         |
| `/location/chimney-sweep-services-in-saugus-ma/`    | REDIRECT | REVIEW | 0      | 19    | `/location/chimney-sweep-near-me-in-saugus-ma/`                     |
| `/location/melrose-chimney-sweep-repair-ma/`        | REDIRECT | PAGE   | 0      | 15    | `/location/chimney-sweep-attleboro-ma/`                             |
| `/location/norton-chimney-sweep-repair-in-ma/`      | REDIRECT | PAGE   | 0      | 495   | `/location/chimney-sweep-attleboro-ma/`                             |
| `/location/chimney-sweep-repair-in-webster-ma/`     | REDIRECT | PAGE   | 0      | 9     | `/location/local-chimney-sweep-and-cleaning-in-webster-ma/`         |
| `/location/chimney-sweep-in-longmeadow-ma/`         | REDIRECT | PAGE   | 0      | 9     | `/location/chimney-cleaning-in-longmeadow-ma/`                      |
| `/location/chimney-sweep-repair-in-seekonk-ma/`     | REDIRECT | PAGE   | 0      | 598   | `/location/chimney-maintenance-in-seekonk-ma/`                      |
| `/location/chimney-sweep-services-in-charlton-ma/`  | REDIRECT | PAGE   | 0      | 2     | `/location/cleaning-sweeping-in-charlton-ma/`                       |
| `/location/palmer-chimney-sweep-repair-ma/`         | REDIRECT | PAGE   | 0      | 1     | `/location/chimney-sweep-attleboro-ma/`                             |
| `/location/chimney-sweep-services-in-lunenburg-ma/` | REDIRECT | PAGE   | 0      | 4     | `/location/chimney-cleaning-in-lunenburg-ma-2/`                     |
| `/location/carver-chimney-sweep-in-ma/`             | REDIRECT | PAGE   | 0      | 189   | `/location/chimney-sweep-attleboro-ma/`                             |
| `/location/chimney-sweep-repair-in-middleton-ma/`   | REDIRECT | PAGE   | 0      | 87    | `/location/chimney-cleaning-in-middleton-ma/`                       |
| `/location/hanson-chimney-sweep-in-ma/`             | REDIRECT | PAGE   | 0      | 12    | `/location/chimney-sweep-attleboro-ma/`                             |
| `/location/douglas-chimney-sweep-repair-ma/`        | REDIRECT | PAGE   | 0      | 17    | `/location/chimney-sweep-attleboro-ma/`                             |
| `/location/townsend-chimney-sweep-repair-ma/`       | REDIRECT | PAGE   | 0      | 84    | `/location/chimney-sweep-attleboro-ma/`                             |
| `/location/chimney-sweep-in-stow-ma/`               | REDIRECT | PAGE   | 0      | 2     | `/location/chimney-cleaning-in-stow-ma/`                            |




*First 40 of 133 by clicks. All 133 are in the CSV with post ID, title, service, town, state,*
*conflict reason, evidence and a recommended classification.*

---



## S11 & S12. Classification anomalies

The brief cites 299 SERVICE_REVIEW URLs and 1 PARSER_FIX URL that nevertheless resolve. Those labels
lived in the lost database. Reconstructing the same two tests:


|                                                  | Brief | This audit |
| ------------------------------------------------ | ----- | ---------- |
| SERVICE_REVIEW URLs that still resolve to a page | 299   | 1,670      |
| PARSER_FIX URLs that still resolve to a page     | 1     | 4          |




### The SERVICE_REVIEW anomalies are not a bug

Every one of the 1,670 resolves as a **town hub page**, and they carry just four service phrases:


| Phrase                             | URLs  |
| ---------------------------------- | ----- |
| `chimney-sweep-repair`             | 1,165 |
| `chimney-sweep-fireplace`          | 266   |
| `chimney-sweep-services`           | 226   |
| `chimney-sweep-fireplace-services` | 13    |


These are not services. They are the naming convention for a town's hub page. Testing them against the
92-service catalogue is the wrong test, and failing it is not a defect in the URL.
**Recommended classification: VALID_PAGE.** The fix belongs in the classifier, which should exempt
town-page phrases from the service-catalogue test.

### The PARSER_FIX anomalies are real, and they are worse than the brief suggests

All four are editing notes — someone's reasoning-out-loud — committed as live, published URLs:


| URL                                                                                                     | Title                                                    | Resolves as   |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------- |
| `/location/gas-fireplace-repair-in-granville-ohio-is-not-correct-the-correct-is-gas-fireplace-repair-…` | Gas Fireplace Repair in Granville,OH                     | COVERAGE_ONLY |
| `/location/roy-chimney-sweep-services-in-seattle-wa-is-not-correct-since-the-city-is-not-seattle-lets…` | Chimney Sweep Services in Roy                            |               |
| ,WA                                                                                                     | PAGE                                                     |               |
| `/location/chimney-sweep-repair-in-nuevo-nuevo-since-nuevo-has-only-1-word-the-output-remains-nuevo-c…` | Chimney Sweep & Fireplace Services in Nuevo, CA          | PAGE          |
| `/location/chimney-sweep-repair-in-north-el-monte-is-not-correct-the-correct-is-north-el-monte-is-als…` | Chimney Sweep & Fireplace Services in North El Monte, CA | PAGE          |


The titles are clean, so the state, town and service are all recoverable from the title.
**Recommended classification: CLASSIFICATION_BUG in the slug parser, plus a content defect in
WordPress.** 981 such slugs exist site-wide; these four are the ones that currently still resolve.

---



## S13. THE ANSWER

> *Of the 89,815 URLs the business has already decided on, how many decisions can we safely apply
> as-is, how many need technical correction, and how many need business review?*


| Verdict                                                                                   | URLs       | %      |
| ----------------------------------------------------------------------------------------- | ---------- | ------ |
| **Safe to apply exactly as decided**                                                      | **5,777**  | 6.43%  |
| **Needs technical correction only** — the decision is sound, the destination is not built | **1,154**  | 1.28%  |
| **Needs business review** — a person must rule on it                                      | **52,586** | 58.55% |
| **Low-priority review** — retirement URLs with impressions but no clicks                  | 30,298     | 33.73% |
| **TOTAL**                                                                                 | **89,815** | 100%   |


Split by population:


|                      | Safe  | Technical | Business review | Low-priority |
| -------------------- | ----- | --------- | --------------- | ------------ |
| Redirects (53,056)   | 1,534 | 1,154     | 50,368          | —            |
| Retirements (36,759) | 4,243 | 0         | 2,218           | 30,298       |




### In plain English

**The retirement decisions are broadly sound. The redirect decisions are not.**

Of 53,056 approved redirects, **1,534 — 2.89% — can be applied as they stand.**
The rest fail for one of two reasons, and mostly both at once: the destination is a page the new site
will not model, so it would answer 404 (29,321 — though it answers 200 in WordPress today, see
S1.2c), or the destination is a different service from the one the visitor asked for
(49,223). 27,566 carry both problems.

Of 36,759 approved retirements, **4,243 can be applied with no reservation at all** and a
further 30,298 only carry impressions, never a click. Just **2,218 genuinely need a person** —
the 1,972 that earn clicks, the 19 that are live town pages, and the
239 where precedence disagrees with the map.

**The most useful thing in this report is the shape of the redirect problem, not its size.**
1,755 redirects are dead-but-otherwise-correct: build the destination and they become valid
with no decision from anyone. That is engineering. But 21,657 more point at a live page for the
wrong service, and no amount of engineering fixes those — each is a judgement about whether a customer
who wanted a pellet-stove repair is well served by a wood-stove installation page. **That is the
decision that governs 92.78% of the redirect map, and it is the same decision as the
208-service question.** Answer that one and most of this population resolves with it.

### What I would not do

Apply the redirect map as it stands **on launch day**. On the numbers above, 96.08% of it would
either land on a 404 or be read by Google as a soft 404, and 16,135 clicks currently flow through
those URLs. The order that works is the opposite one: settle the services first, rebuild the map
against the answer, then apply it.

---



## S14. Files produced

All under `data/audits/decided-88110/`. Every row traces to its source URL and carries its evidence.


| File                            | Rows   | What it holds                                                                                                                                      |
| ------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `redirects-complete.csv`        | 53,056 | Every redirect: source, WordPress identity, decision origin, destination, graph, relevance, grade, flags, traffic, fan-in, verdict, recommendation |
| `gone-complete.csv`             | 36,759 | Every retirement URL: WordPress identity, category, traffic, duplicate suffix, equivalent live URL, verdict, recommendation                        |
| `top-100-redirect-problems.csv` | 100    | The 100 highest-priority problems, ranked by traffic, then dead destination, different service, concentration, cross-state, chains                 |
| `precedence-conflicts.csv`      | 133    | Every conflict with both classifications, both sources, evidence and a recommendation                                                              |
| `anomalies.csv`                 | 1,674  | The service-review and parser anomalies                                                                                                            |
| `cross-state-redirects.csv`     | 70     | All cross-state redirects with evidence                                                                                                            |
| `summary.json`                  | —      | Every figure in this report, machine-readable                                                                                                      |


---



## S15. Limits of this audit

Stated plainly, because the figures above are only worth what these limits allow.

- **The original classification is gone** and was rebuilt from primary sources. Figures close to the
brief's are corroboration; figures that differ are explained, not reconciled away.
- **Predicted status is structural, not observed.** It says a page kind resolves the URL, not that the
page has been built. Only Minnesota is seeded in the application today.
- **The publication gate here uses four of its five parts** — branch-in-state, areas, FAQ and hero.
The fifth needs per-city geocoding that exists only for Minnesota and Massachusetts.
- **The traffic export is business-supplied and undated.** No backlinks, no sessions, no date range.
- **No content-quality measurement exists anywhere**, so no URL here is called thin or valuable on
the strength of its content. That measurement has still never been taken.

**Nothing was modified.** WordPress was read with `SELECT` only. `redirects.json` and `gone.json` were
opened read-only and are byte-for-byte unchanged. No redirect was applied, no URL retired, nothing
deleted, nothing published, nothing deployed.

**END OF REPORT**