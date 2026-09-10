# Chimcare Legacy URL Universe — Complete Disposition Audit

**Generated:** 10 September 2026
**Scope:** 263,769 legacy URLs — the complete union of every source that contributes one
**Access:** **READ ONLY.** WordPress was queried with `SELECT` only. No WordPress write, no change to any decision file, no redirect applied, no page retired, no deployment, no file in the application touched. Production was read with `GET` requests only.

**Machine-readable outputs:** `data/audits/url-universe/` — `url-master-audit.csv` (263,769 rows, 56 columns) plus thirteen summary tables listed in §14.

---

## The finding that reframes everything else

**The approved redirect map is not live. It is a plan that has never been applied.**

I probed 25 redirect sources chosen evenly across the approved map, plus a further 102 URLs sampled across every classification.

| Probe | Result |
|---|---|
| Approved redirect sources tested | 25 |
| Returned **200**, serving their own page | **25** |
| Returned 301 or 308 | **0** |

Across the whole population, **50,862 of the 53,346 approved redirects still resolve to a live WordPress page today**, and those live pages earn **5,605 clicks** at their own addresses. The same is true of the retirement list: **5,717 of 36,334 URLs approved for retirement are still live, working pages.**

This changes what the 89,680 "already decided" URLs mean. They are not a description of the current site. They are a **proposal that has not been executed**, and applying it at migration would be a change to live behaviour, not a preservation of it. Every figure in this audit is reported on that basis.

---

## 1. Executive summary

| Question | Answer |
|---|---:|
| How many URLs are there? | **263,769** |
| How many serve a page today? | **229,890** |
| How many return 404 today? | 33,879 |
| How many has Google ever shown? | 133,989 (50.8%) |
| How many have ever been clicked? | **16,982 (6.4%)** |
| Total clicks across the whole universe | 75,482 |
| How many have ever produced an enquiry? | 554 |
| How many are legitimate pages to keep unchanged? | **90,934** |
| How many need a service the new site does not model? | **107,159** |
| How many redirects exist as approved decisions? | 53,346 |
| How many of those are safe as they stand? | **13,348 (25.0%)** |
| How many point at a different service? | 50,144 |
| How many point at a destination the new site cannot serve? | 28,585 |
| How many have **both** problems? | **27,297** |
| How many distinct service pairs need a ruling? | **5,364** |
| How many legacy services need a catalogue decision? | **524** |
| How many retirements are safe? | 30,609 |
| How many retirements need review? | **5,725** |

### The one-sentence answer

Of 263,769 legacy URLs, **90,934 can be carried across untouched**, **107,159 are real live pages blocked only by a missing service definition**, **13,348 redirects are safe to apply**, and **40,022 redirects carry a defect** — but the largest single lever is not a URL decision at all: **524 service names, of which the top 100 unlock 90% of the affected URLs.**

---

## 2. The URL universe, and where it comes from

Eight independent sources contribute. Nothing was discarded for looking malformed.

| Source | URLs contributed |
|---|---:|
| WordPress published `job_listing` | 229,617 |
| `keep-pages.json` (approved keep list) | 175,415 |
| Google Search Console export | 133,665 |
| `redirects.json` (approved redirect map) | 50,938 |
| `gone.json` (approved retirement map) | 36,759 |
| WordPress `_wp_old_slug` | 826 |
| WordPress Yoast recorded earlier URLs | 646 |
| Redirection plugin | 12 |
| **Distinct union** | **263,769** |

Two rules governed the merge. Every URL was normalised to one comparable shape (lowercase, leading and trailing slash, query and fragment stripped). Every URL carries a stable audit ID, `CH0000001` upward.

**One deliberate exclusion, recorded here rather than hidden:** two Redirection-plugin rules are keyed on a query string. Stripping the query would collapse `/?mailpoet_page=subscriptions` to `/` and manufacture a homepage self-redirect that does not exist. Those two rules are excluded and named in the master CSV notes.

---

## 3. Primary map type — every URL, one category

| Map type | URLs | % | Clicks | Indexed | Action |
|---|---:|---:|---:|---:|---|
| **A** PAGE_KEEP | 88,563 | 33.58% | 46,275 | 23,861 | KEEP |
| **B** PAGE_NEEDS_NEW_TEMPLATE | 78,666 | 29.82% | 11,658 | 24,078 | CREATE_OR_REVIEW |
| **N** GONE_CANDIDATE | 36,334 | 13.77% | 2,439 | 32,069 | RETIRE |
| **M** DESTINATION_NOT_IN_NEW_STRUCTURE | 28,493 | 10.80% | 3,982 | 28,173 | CREATE_OR_REVIEW |
| **F** REDIRECT_RELEVANT | 11,748 | 4.45% | 2,339 | 11,403 | REDIRECT |
| **G** REDIRECT_DIFFERENT_SERVICE | 5,405 | 2.05% | 2,956 | 4,757 | REVIEW |
| **H** REDIRECT_WRONG_SERVICE | 4,159 | 1.58% | 661 | 4,149 | REPOINT |
| **Q** CITY_UNKNOWN | 2,400 | 0.91% | 368 | 492 | REVIEW |
| **C** URL_PATTERN_REVIEW | 2,371 | 0.90% | 300 | 817 | KEEP |
| **E** REDIRECT_EXACT | 1,600 | 0.61% | 354 | 1,117 | REDIRECT |
| **I** REDIRECT_CROSS_CITY | 1,383 | 0.52% | 760 | 1,366 | REVIEW |
| **P** PARSER_REVIEW | 887 | 0.34% | 440 | 222 | REVIEW |
| **O** NO_SOURCE | 767 | 0.29% | 2,724 | 730 | REVIEW |
| **D** DUPLICATE_PAGE | 424 | 0.16% | 24 | 272 | MERGE |
| **S** OTHER_REVIEW | 410 | 0.16% | 156 | 400 | REVIEW |
| **L** REDIRECT_DEAD_DESTINATION | 92 | 0.03% | 1 | 17 | REPOINT |
| **J** REDIRECT_CROSS_STATE | 67 | 0.03% | 45 | 66 | REPOINT |
| **TOTAL** | **263,769** | 100% | 75,482 | 133,989 | |

Categories **K** (catch-all) and **R** (service unknown) are carried as secondary flags rather than primary types: a catch-all is a property of the *destination*, and after the parser was corrected no URL was left with an unreadable service.

---

## 4. The most important distinction in this audit

**28,493 redirects point at a page that WordPress serves at 200 right now.** They are not broken. Their destination simply names a service the new site does not model.

| Destination status | Redirects | Clicks | What it means |
|---|---:|---:|---|
| **LIVE_WP_NOT_IN_NEW_STRUCTURE** | 28,493 | 3,982 | Live page today; the new site cannot serve it |
| LIVE_WP_AND_IN_NEW_SITE | 24,761 | 7,271 | Live today and modelled — genuinely fine |
| APPROVED_GONE | 56 | 1 | Destination is itself on the retirement list |
| NO_WP_RECORD | 35 | 0 | Genuinely dead — exists nowhere |
| WP_RECORD_NOT_PUBLISHED | 1 | 0 | Draft or other post type |

**Only 36 redirects out of 53,346 point at something that genuinely does not exist.** Verified by probe:

```
200  /location/gas-fireplace-inserts-in-marietta-ga/       destination live, service not modelled
200  /location/fireplace-gas-valve-repair-in-east-bethel-mn/  destination live, service not modelled
200  /location/wood-burning-fireplace-inserts-in-easthampton-ma/  same
```

Calling these 28,493 "broken redirects" would be wrong, and any plan built on that description would solve the wrong problem. **They are a service-catalogue gap wearing a redirect's clothing.**

---

## 5. Exact overlap — never added together

The two large redirect problems overlap heavily. Adding them would overstate the population by more than half.

| Set | URLs |
|---|---:|
| A — destination unavailable in the new structure | 28,585 |
| B — destination is a different service | 50,144 |
| **A ∩ B (both problems)** | **27,297** |
| A only | 1,288 |
| B only | 22,847 |
| **A ∪ B (unique affected)** | **51,432** |

Naive addition gives 78,729. The true figure is **51,432**. Further intersections:

| Pair | Both | Union |
|---|---:|---:|
| Different service × has clicks | 5,362 | 61,764 |
| Destination unavailable × has clicks | 3,172 | 42,395 |
| Wrong service × has clicks | 402 | 20,739 |
| Retirement × has clicks | 1,966 | 51,350 |
| Different service × duplicate | 1,662 | 58,640 |
| Wrong service × cross-state | **0** | 4,226 |
| Destination unavailable × wrong service | **0** | 32,744 |

The full 28-pair matrix is in `J-overlap-matrix.csv`.

---

## 6. URL patterns — a different shape is not a defect

| Pattern | URLs | % | Published | Indexed | Clicks | City extraction |
|---|---:|---:|---:|---:|---:|---:|
| `{service}-in-{city}-{state}` | 240,600 | 91.22% | 210,053 | 121,655 | 42,577 | 100% |
| `{service}-{city}-{state}` | 13,563 | 5.14% | 11,575 | 7,954 | 8,726 | 100% |
| `{service}-in-{state}` (no city) | 6,232 | 2.36% | 5,838 | 2,338 | 456 | 0% |
| other / unrecognised | 2,063 | 0.78% | 1,268 | 1,205 | **18,622** | 67% |
| `{city}-{service}` | 1,281 | 0.49% | 1,126 | 818 | 5,095 | 100% |
| `{service}-{city}` | 30 | 0.01% | 30 | 19 | 6 | 100% |

**Read the clicks column before proposing any rename.** The "other" bucket is 0.78% of URLs and carries **24.7% of all clicks** — it contains the homepage and the blog. The `{city}-{service}` shape carries 5,095 clicks on 1,281 URLs, roughly seven times the site-average click rate per URL.

Only the no-city pattern is genuinely unparseable, and it is 2.36% of the universe.

---

## 7. Should we rename URLs for consistency? Mostly no

16,949 live pages sit on a non-preferred pattern. Each was assessed individually.

| Verdict | URLs | Why |
|---|---:|---|
| **KEEP_CURRENT_URL** | **7,539** | Earns clicks or impressions; format consistency is not a sufficient reason to move it |
| REVIEW | 9,244 | No measured traffic — a rename is possible but still needs a reason beyond tidiness |
| DUPLICATE_CONSOLIDATION | 166 | Already a duplicate of a stronger URL |

Worked example, and the reason the default is KEEP:

```
/location/chimney-sweep-seattle-wa/     1,927 clicks   200 OK
  preferred form would be:  /location/chimney-sweep-in-seattle-wa/
  verdict: KEEP_CURRENT_URL — the only thing "wrong" with it is a missing "in"
```

Per-URL detail with the 301, internal-link, sitemap and canonical implications of any change is in `I-seo-risk-url-changes.csv`.

---

## 8. Service analysis — the real bottleneck

The new site models **92 services**, confirmed by parsing the catalogue file directly (100 keys: 8 categories plus 92 services).

**524 distinct legacy service phrases appear on pages the new site cannot serve**, affecting **107,152 URLs**. But they concentrate sharply:

| Coverage | URLs affected | Share |
|---|---:|---:|
| Top 20 services | 26,599 | 24.8% |
| Top 50 services | 56,422 | 52.7% |
| **Top 100 services** | **96,606** | **90.2%** |
| Top 208 services | 106,641 | 99.5% |

**One hundred decisions resolve ninety per cent of the problem.** The heaviest:

| Service | Live pages | Incoming redirects | Total URLs | Clicks |
|---|---:|---:|---:|---:|
| chimney-repair-reconstruction | 681 | 1,355 | 2,036 | 267 |
| gas-fireplace-repair-service | 736 | 1,279 | 2,015 | 1,266 |
| masonry-repair-construction | 708 | 916 | 1,624 | 285 |
| chimney-fireplace-repair | 751 | 570 | 1,321 | 135 |
| duct-cleaning | 757 | 556 | 1,313 | 376 |
| pellet-stove-repair | 732 | 567 | 1,299 | 816 |
| wood-burning-stove-installation | 790 | 508 | 1,298 | 460 |
| chimney-caps | 717 | 559 | 1,276 | 132 |

Each row is one decision — **CREATE / MERGE_INTO / REDIRECT / RETIRE / REVIEW** — that settles hundreds of URLs. Full list in `C-service-decisions.csv`.

**No mapping was invented.** A service was matched to the catalogue only by exact string equality or an identical token multiset in a different order. `fireplace-flue-installation` was never turned into `fireplace-installation`.

---

## 9. Service pairs — 50,144 URL decisions become 5,364

Every different-service redirect was grouped into a source→destination service pair and typed by evidence.

| Pair type | Pairs | URLs | Clicks | Meaning |
|---|---:|---:|---:|---|
| RELATED_SERVICE | 2,695 | 22,135 | 3,569 | Objects overlap but differ |
| UNRELATED_SERVICE | 1,973 | 15,508 | 1,946 | No shared object token |
| SAME_OBJECT_DIFFERENT_ACTION | 323 | 8,462 | 4,115 | Same thing, different job |
| **DIFFERENT_FUEL_OR_APPLIANCE** | **305** | **2,871** | **566** | **Different appliance — highest priority** |
| UNKNOWN | 68 | 1,144 | 108 | One side has no core object |

The fuel-type group is the one to rule on first, because these are indefensible rather than merely arguable:

```
pellet-stove-service        →  wood-burning-stove-installation
pellet-stoves               →  wood-stoves
gas-stoves-repair           →  pellet-stove-repair
wood-burning-stove-installation → gas-stoves-repair
```

A customer with a pellet stove is sent to a wood-stove installation page. Both pages return 200 today. Full list in `D-service-pair-decisions.csv`, top 100 by traffic in `L-top-100-service-pairs.csv`.

---

## 10. Catch-all destinations

**3,339 redirects land on a destination that absorbs 20 or more distinct source services.** The threshold of 20 is a judgement, stated here so it can be argued with; the raw counts are in `M-top-100-destinations.csv`.

| Destination | Sources | Distinct services | Cities | States |
|---|---:|---:|---:|---:|
| `/location/wood-fireplaces-swansea-ma/` | 278 | 57 | 83 | 1 |
| `/location/gas-fireplace-insert-plymouth-ma/` | 276 | 35 | 150 | 1 |
| `/location/liners-deerfield-ma/` | 275 | 40 | 160 | 1 |
| `/location/chimney-repair-hanover-ma/` | 261 | 69 | 72 | 1 |
| `/location/chimney-sweep-attleboro-ma/` | 213 | 45 | 101 | 1 |
| **`/location/chimney-sweep-portland-oregon/`** | **79** | **44** | **57** | **8** |

The Portland page is the one to look at first. It receives redirects from **eight different states** and carries 1,310 clicks. Sixty-nine unrelated services funnelling into a single Hanover page is not a redirect map; it is a catch-all.

**Not every high fan-in is wrong.** A town hub legitimately receives many service URLs from its own town. What marks these out is the combination of many services, many *cities*, and in Portland's case many *states*.

---

## 11. Retirement validation

| Category | URLs | Clicks | With clicks | Still live today |
|---|---:|---:|---:|---:|
| NEVER_EXISTED | 30,609 | 2,327 | 1,872 | 0 |
| DUPLICATE_ARTIFACT | 5,069 | 83 | 67 | **5,069** |
| EXISTED_AND_PUBLISHED | 603 | 21 | 20 | **603** |
| **REAL_CONTENT_PAGE** | **45** | 7 | 6 | **45** |
| EXISTED_BUT_NOT_PUBLISHED | 8 | 1 | 1 | 0 |

**Two claims to correct.**

The retirement list was described as having zero Google traffic. It does not: **32,069 have impressions and 1,966 have clicks.** But the amounts are small, and that matters equally — the highest earner on the entire list has 13 clicks and is a PDF, not a page.

**GONE is a business disposition, not a current HTTP status.** 30,609 already return 404. The other **5,725 are live, working pages** that would have to be actively taken down. The 45 classified REAL_CONTENT_PAGE are working town hub pages and deserve a second look before anything is retired.

Every exception is enumerated in `G2-retirement-exceptions.csv` (7,590 rows).

---

## 12. Content quality, measured from the page body

Measured for all 229,890 live pages from `post_content` — word count, headings, FAQ blocks, images, internal links, and an MD5 of the body. Never inferred from traffic.

| Content class | Pages |
|---|---:|
| CONTENT_STRONG | 192,443 |
| **REVIEW (malformed markup)** | **33,740** |
| CONTENT_NORMAL | 3,552 |
| LOW_INFORMATION | 152 |
| MISSING | 3 |

| Defect | Pages |
|---|---:|
| Malformed WPBakery close tag (`</vc_…]`) | **33,740** |
| No meta description | **229,524** |
| Raw markdown in the body | 1,651 |
| No `<h2>` heading | 1,791 |
| Identical body to another page | 451 |
| No hero image | 171 |

**A correction to my own earlier work.** A previous pass counted the malformed-shortcode defect using the literal string `</name]` and returned zero. The real marker is `</vc_column_text]`. The corrected count is **33,740 pages**, higher than the 30,089 previously reported.

**A limit worth stating.** CONTENT_STRONG means the page meets the template's structural bar, not that its content is distinctive. Only 451 pages share an exact body, because the town name differs, but that is textual difference, not editorial difference. **No near-duplicate or thin-content measurement exists in this project**, and nothing here should be read as one.

---

## 13. Priority

| Priority | URLs | Clicks | Meaning |
|---|---:|---:|---|
| **P0** | **430** | 707 | Must resolve before migration |
| **P1** | 7,090 | 1,881 | High priority |
| P2 | 113,437 | 21,617 | Business review |
| P3 | 48,385 | 4,649 | Low-priority review |
| P4 | 94,427 | 46,628 | Safe as is |

**P0 is only 430 URLs.** They are wrong-service redirects and cross-state redirects that currently earn clicks. That is a tractable list for one engineer and one business owner in a week. Ranked detail in `K-top-100-priority.csv`.

### Who decides what

| Owner | URLs | Work |
|---|---:|---|
| **Engineering alone** | **4,055** | Parser fixes, unresolvable cities, chains, the 36 genuinely dead destinations |
| **Business** | 154,931 | Service catalogue, redirect intent, retirement confirmation, duplicate survivors |

**97.5% of the work needs a business decision, not code.** Engineering cannot decide whether a pellet stove page should forward to a wood stove page.

---

## 14. Files produced

All under `data/audits/url-universe/`.

| File | Rows | Contents |
|---|---:|---|
| `url-master-audit.csv` | 263,769 | **A.** Every URL, 56 columns, full evidence |
| `B-map-type-summary.csv` | 17 | Map type counts, traffic, action |
| `C-service-decisions.csv` | 524 | **Service decision table** — the key management input |
| `D-service-pair-decisions.csv` | 5,364 | Every source→destination service pair |
| `E-redirect-problems.csv` | 40,022 | Every defective redirect, ranked by traffic |
| `F-destination-availability.csv` | 5 | Destination health |
| `G-retirement-validation.csv` | 5 | Retirement categories |
| `G2-retirement-exceptions.csv` | 7,590 | Every retirement with traffic or still live |
| `H-url-patterns.csv` | 6 | Pattern census with extraction success |
| `I-seo-risk-url-changes.csv` | 16,949 | Rename candidates with a KEEP/CHANGE verdict |
| `J-overlap-matrix.csv` | 28 | Exact pairwise intersections |
| `K-top-100-priority.csv` | 100 | Highest-priority URLs |
| `L-top-100-service-pairs.csv` | 100 | Service pairs by traffic |
| `M-top-100-destinations.csv` | 100 | Destinations receiving redirects |
| `N-duplicate-groups.csv` | 4,829 | Duplicate groups with chosen survivor |

---

## 15. What management must decide

1. **Rule on the top 100 legacy services.** Keep, merge, redirect or retire each. This unlocks 90% of the 107,152 blocked URLs and is the single highest-leverage decision available.
2. **Rule on the 305 fuel-type redirect pairs.** These send customers to the wrong appliance and are indefensible as they stand.
3. **Confirm the 5,725 live pages on the retirement list** should actually be taken down, including the 45 working town hub pages.
4. **Confirm the redirect map should be applied at all.** It has never been live. 50,862 of its sources are working pages today.
5. **Choose survivors for the 4,829 duplicate groups**, or ratify the evidence-based choice already recorded.

## What engineering can fix without asking

1. The 36 genuinely dead destinations.
2. 677 multi-hop chains.
3. 887 editing-note slugs and 2,400 unresolvable cities — read the town from the page title.
4. 229,524 missing meta descriptions — generate from service, town and state.
5. 33,740 malformed shortcodes — one find-and-replace in WordPress.

---

## 16. Limits of this audit, stated plainly

- **The Search Console export is business-supplied and undated.** It carries no backlink or session data. Absence from it is not proof a page has no value, and no page here is called worthless on that basis.
- **No content-quality measurement exists.** Word counts and heading counts are structural. No near-duplicate detection, no thin-content scoring, no topical clustering was performed.
- **Live status was sampled, not exhaustive.** 127 URLs were probed against production. Every other status is derived from the database.
- **The city vocabulary is learned from the corpus.** It is built only from shapes that cannot be misread, and a town name is rejected if it contains a service word. 2,400 URLs still have no resolvable city and are marked CITY_UNKNOWN rather than guessed.
- **Service matching never uses substrings.** Only exact equality or an identical token multiset. Where the relationship is uncertain, the pair is typed and referred to a human.
- **The redirect map's 53,346 entries are a proposal.** Nothing in this audit assumes they are or should be live.

**Nothing was modified.** No WordPress write, no change to `redirects.json` or `gone.json`, no redirect applied, no page retired, no deployment, no application code touched.
