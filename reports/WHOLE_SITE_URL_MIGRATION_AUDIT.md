# Whole-Site Legacy URL Migration Audit

**Generated:** 2026-09-07T15:12:00.770805
**Database:** chimcare_local (MySQL 8.0, localhost) — **SELECT only. No INSERT, UPDATE or DELETE was issued.**
**Machine-readable companion:** `data/audits/whole-site-url-audit.json` — one record per legacy URL, 262,535 records.
**State totals:** `data/audits/state-url-summary.json`
**Method, SQL and reconciliation:** `reports/WHOLE_SITE_URL_RECONCILIATION.md`

This is an audit. Nothing was migrated, published, redirected, retired, created or deleted.

---

## 1. The measured whole-site result

The migration URL universe is **262,535 distinct legacy URLs**. It has two parts, and the
distinction matters because they behave very differently:

| Scope | URLs | 200 | 308 | 404 | Intentional 404 | Gate 404 | Unresolved 404 | Unresolved % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Full migration scope** | 262,535 | 87,881 | 51,607 | 123,047 | 36,503 | 1,317 | 85,227 | 32.46% |
| Live published WordPress URLs | 229,617 | 87,881 | 49,552 | 92,184 | 5,640 | 1,317 | 85,227 | 37.12% |
| Fate-map-only URLs (no WP source) | 32,918 | 0 | 2,055 | 30,863 | 30,863 | 0 | 0 | 0.0% |

**The ~227,000 figure in the brief is the live-URL scope.** The database holds **229,621 published
`job_listing` posts** occupying **229,617 distinct URLs** (4 slugs are used by two posts each).
Of those live URLs:

- **87,881** (38.3%) resolve to a page — 200
- **49,552** (21.6%) redirect — 308
- **92,184** (40.1%) 404, of which
  **85,227** (37.12%) are unresolved — no page kind resolves them

The remaining **32,918** URLs are listed in the approved fate maps but have **no WordPress
source at all** — 30,635 of them appear nowhere in `wp_posts`. They are retirement decisions
about URLs that no longer exist as content, and they are 93.8% intentional 404.

### Unresolved / total

- Full migration scope: **85,227 / 262,535 = 32.46%**
- Live published URLs only: **85,227 / 229,617 = 37.12%**

The Minnesota-derived estimate of ~47% was **too pessimistic for the site as a whole and correct for
Minnesota itself.** Minnesota measures 46.31% unresolved; the whole site measures
32.46%. Minnesota is not representative — see section 5.

---

## 2. State-by-state — expected HTTP behaviour

| State | Total URLs | 200 | 308 | 404 | Intentional 404 | Gate 404 | Unresolved 404 | Unresolved % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| CA | 66,694 | 47,367 | 6,849 | 12,478 | 10,074 | 614 | 1,790 | 2.68% |
| MA | 35,286 | 3,621 | 15,305 | 16,360 | 713 | 32 | 15,615 | 44.25% |
| WA | 34,389 | 5,209 | 6,897 | 22,283 | 1,139 | 13 | 21,131 | 61.45% |
| OR | 33,648 | 10,505 | 4,379 | 18,764 | 1,975 | 132 | 16,657 | 49.5% |
| IL | 21,891 | 3,241 | 6,864 | 11,786 | 1,651 | 21 | 10,114 | 46.2% |
| MN | 20,484 | 2,908 | 6,861 | 10,715 | 1,213 | 16 | 9,486 | 46.31% |
| OH | 15,189 | 1,276 | 2,181 | 11,732 | 7,049 | 130 | 4,553 | 29.98% |
| CT | 12,665 | 11,609 | 102 | 954 | 219 | 53 | 682 | 5.38% |
| GA | 7,663 | 333 | 1,165 | 6,165 | 4,821 | 93 | 1,251 | 16.33% |
| CO | 6,829 | 509 | 303 | 6,017 | 3,751 | 126 | 2,140 | 31.34% |
| WI | 6,690 | 427 | 694 | 5,569 | 3,753 | 76 | 1,740 | 26.01% |
| ID | 279 | 264 | 0 | 15 | 0 | 3 | 12 | 4.3% |
| UT | 279 | 265 | 0 | 14 | 0 | 3 | 11 | 3.94% |
| IN | 93 | 92 | 0 | 1 | 1 | 0 | 0 | 0.0% |
| MI | 92 | 84 | 0 | 8 | 0 | 0 | 8 | 8.7% |
| PA | 92 | 90 | 0 | 2 | 0 | 0 | 2 | 2.17% |
| TN | 92 | 73 | 0 | 19 | 0 | 0 | 19 | 20.65% |
| AZ | 38 | 8 | 3 | 27 | 11 | 2 | 14 | 36.84% |
| TX | 6 | 0 | 0 | 6 | 6 | 0 | 0 | 0.0% |
| NH | 2 | 0 | 0 | 2 | 0 | 2 | 0 | 0.0% |
| FL | 1 | 0 | 0 | 1 | 1 | 0 | 0 | 0.0% |
| RI | 1 | 0 | 0 | 1 | 0 | 1 | 0 | 0.0% |
| UNRESOLVED | 132 | 0 | 4 | 128 | 126 | 0 | 2 | 1.52% |
| **WHOLE SITE** | **262,535** | **87,881** | **51,607** | **123,047** | **36,503** | **1,317** | **85,227** | **32.46%** |

## 3. State-by-state — migration handling

| State | City Pages (200) | Coverage | Service Pages | Redirects | Review | No Source | Retired | Unresolved |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| CA | 0 | 672 | 46,695 | 6,849 | 614 | 0 | 10,074 | 1,790 |
| MA | 230 | 8 | 3,383 | 15,305 | 32 | 0 | 713 | 15,615 |
| WA | 237 | 14 | 4,958 | 6,897 | 13 | 0 | 1,139 | 21,131 |
| OR | 142 | 2 | 10,361 | 4,379 | 132 | 0 | 1,975 | 16,657 |
| IL | 138 | 10 | 3,093 | 6,864 | 21 | 0 | 1,651 | 10,114 |
| MN | 134 | 0 | 2,774 | 6,861 | 16 | 0 | 1,213 | 9,486 |
| OH | 105 | 69 | 1,102 | 2,181 | 130 | 0 | 7,049 | 4,553 |
| CT | 0 | 7,288 | 4,321 | 102 | 53 | 0 | 219 | 682 |
| GA | 17 | 0 | 316 | 1,165 | 93 | 0 | 4,821 | 1,251 |
| CO | 0 | 4 | 505 | 303 | 126 | 0 | 3,751 | 2,140 |
| WI | 48 | 0 | 379 | 694 | 76 | 0 | 3,753 | 1,740 |
| ID | 0 | 0 | 264 | 0 | 3 | 0 | 0 | 12 |
| UT | 0 | 0 | 265 | 0 | 3 | 0 | 0 | 11 |
| IN | 0 | 92 | 0 | 0 | 0 | 0 | 1 | 0 |
| MI | 0 | 84 | 0 | 0 | 0 | 0 | 0 | 8 |
| PA | 0 | 90 | 0 | 0 | 0 | 0 | 0 | 2 |
| TN | 0 | 73 | 0 | 0 | 0 | 0 | 0 | 19 |
| AZ | 0 | 0 | 8 | 3 | 2 | 0 | 11 | 14 |
| TX | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 0 |
| NH | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 |
| FL | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| RI | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| UNRESOLVED | 0 | 0 | 0 | 4 | 0 | 0 | 126 | 2 |

Handling categories: **PAGE** = a city page that passes the publication gate; **COVERAGE_ONLY** = a
service URL in a city that owns no city page; **SERVICE_PAGE** = a service URL whose service is in
the 92-service catalogue and whose city has a page; **REDIRECT** = approved redirect map, duplicate
city page, or a WordPress-recorded earlier slug; **REVIEW** = a city page withheld by the publication
gate; **GONE** = approved gone map; **NO_SOURCE** = in a fate map, no WordPress source, no page kind;
**LEGACY_NOT_MIGRATED** = live WordPress URL that no page kind resolves.

## 4. State-by-state — source reconciliation

| State | Total URLs | Live in WP | Fate-map only | Distinct cities | Distinct URL patterns | City pages | Redirects landing on non-200 |
|---|---:|---:|---:|---:|---:|---:|---:|
| CA | 66,694 | 58,577 | 8,117 | 1,005 | 371 | 847 | 726 |
| MA | 35,286 | 35,284 | 2 | 270 | 575 | 467 | 10,776 |
| WA | 34,389 | 33,537 | 852 | 270 | 777 | 613 | 5,134 |
| OR | 33,648 | 32,997 | 651 | 279 | 832 | 529 | 2,924 |
| IL | 21,891 | 20,533 | 1,358 | 172 | 438 | 384 | 4,587 |
| MN | 20,484 | 19,571 | 913 | 152 | 585 | 267 | 4,570 |
| OH | 15,189 | 7,443 | 7,746 | 246 | 488 | 435 | 1,486 |
| CT | 12,665 | 12,553 | 112 | 136 | 253 | 59 | 6 |
| GA | 7,663 | 2,579 | 5,084 | 112 | 210 | 180 | 863 |
| CO | 6,829 | 2,896 | 3,933 | 130 | 384 | 220 | 246 |
| WI | 6,690 | 2,690 | 4,000 | 129 | 258 | 220 | 474 |
| ID | 279 | 279 | 0 | 3 | 105 | 3 | 0 |
| UT | 279 | 279 | 0 | 3 | 104 | 3 | 0 |
| IN | 93 | 92 | 1 | 1 | 92 | 0 | 0 |
| MI | 92 | 92 | 0 | 1 | 92 | 0 | 0 |
| PA | 92 | 92 | 0 | 1 | 92 | 0 | 0 |
| TN | 92 | 92 | 0 | 1 | 92 | 0 | 0 |
| AZ | 38 | 25 | 13 | 4 | 23 | 3 | 3 |
| TX | 6 | 0 | 6 | 1 | 0 | 0 | 0 |
| NH | 2 | 2 | 0 | 2 | 1 | 2 | 0 |
| FL | 1 | 0 | 1 | 1 | 0 | 0 | 0 |
| RI | 1 | 1 | 0 | 1 | 1 | 1 | 0 |
| UNRESOLVED | 132 | 3 | 129 | 0 | 0 | 0 | 0 |

---

## 5. Minnesota versus the whole site

| Metric | MN — sealed baseline | MN — this DB run | Δ | Whole site (measured) |
|---|---:|---:|---:|---:|
| Total URLs | 20,479 | 20,484 | +5 | 262,535 |
| 200 | 2,864 | 2,908 | +44 | 87,881 |
| 308 | 6,803 | 6,861 | +58 | 51,607 |
| 404 | 10,812 | 10,715 | -97 | 123,047 |
| Intentional 404 | 1,219 | 1,213 | -6 | 36,503 |
| Publication gate 404 | 25 | 16 | -9 | 1,317 |
| Unresolved 404 | 9,568 | 9,486 | -82 | 85,227 |
| Unresolved % | 46.7% | 46.31% | — | 32.46% |

**Minnesota is structurally different, in three measurable ways.**

1. **Minnesota is far worse than average on unresolved URLs.** 46.31% of Minnesota's
   URLs are unresolved against 32.46% site-wide. The reason is the service
   vocabulary: Minnesota's legacy slugs use service phrases (`commercial-pizza-oven-cleaning-service`,
   `fireplace-remote-control-troubleshooting`, `vent-free-gas-logs`) that are outside the 92-service
   destination catalogue. California and Connecticut, which were built later on the standardised
   `{service}-in-{city}-{state}` scheme drawn from the same catalogue, measure **2.7%** and
   **5.4%** unresolved respectively — and together they are 79,359 URLs,
   30.2% of the whole universe. They pull the site average down hard.

2. **Minnesota's fate maps are almost entirely about live URLs.** Only 913
   of Minnesota's 20,484 URLs have no WordPress source (4.5%).
   Site-wide the figure is 32,918 of 262,535 (12.5%).
   Ohio, Colorado, Wisconsin and Georgia carry large gone maps for URLs that never existed as posts.

3. **Minnesota does not contain every slug form used elsewhere — and its own audit does not contain
   every slug form used in Minnesota.** See the discrepancies section of the reconciliation report.

---

## 6. Redirect analysis

| Metric | Value |
|---|---:|
| Total redirects | 51,607 |
| Single hop | 50,833 |
| Chains (more than one hop) | 767 |
| Loops | 7 |
| Self-redirects | 6 |
| Dangling targets (target not in the universe) | 0 |
| **Targets that will not return 200** | **31,799** |
| Cross-state redirects | 72 |
| Redirects sharing a destination | 45,687 |
| Distinct destinations | 15,167 |

### The dominant redirect problem

**31,799 of 51,607 redirects (61.6%) point at a URL that will not return 200.**
Breaking those down by what the destination actually resolves to:

| Destination resolves to | Redirects landing there |
|---|---:|
| `LEGACY_NOT_MIGRATED` (unresolved 404) | 29,859 |
| `REVIEW` (gate-held 404) | 1,166 |
| `REDIRECT` (a further hop) | 774 |

A 308 to a 404 is a dead end that also costs a round trip. This is the single largest correctness
problem in the redirect map, and it is concentrated in Massachusetts (10,776), Washington (5,134),
Illinois (4,587) and Minnesota (4,570).

### Redirect fan-in

45,687 redirects share a destination with at least one other redirect.
The heaviest destinations:

| Destination | Source URLs pointing at it |
|---|---:|
| `/location/wood-fireplaces-swansea-ma/` | 278 |
| `/location/gas-fireplace-insert-plymouth-ma/` | 276 |
| `/location/liners-deerfield-ma/` | 275 |
| `/location/chimney-repair-hanover-ma/` | 261 |
| `/location/chimney-sweep-attleboro-ma/` | 133 |
| `/location/gas-fireplace-insert-puyallup-wa/` | 132 |
| `/location/savage-chimney-rebuild-in-mn/` | 130 |
| `/location/gas-fireplace-repair-rogers-mn/` | 115 |
| `/location/fireplace-damper-repair-sharon-ma/` | 113 |
| `/location/wood-stoves-acton-ma/` | 112 |
| `/location/outdoor-fireplaces-camas-in-wa/` | 101 |
| `/location/heatshield-circle-pines-mn/` | 86 |

### Loops, self-redirects and cross-state contamination

- **7 loops** and **6 self-redirects** — small in number, fatal where they occur.
- **72 cross-state redirects.** A recurring pattern sends URLs from Massachusetts,
  Minnesota and Washington to `/location/chimney-sweep-portland-oregon/`, an Oregon branch page.

---

## 7. Live verification against the running Next.js server

Every URL below was actually requested against `http://localhost:3000`. Nothing was requested that is
not reported, and nothing is reported that was not requested.

**310 URLs probed**, sampled from every handling category in every state
(8 per category for Minnesota, 3 per category elsewhere).

| Prediction | Probed | Confirmed |
|---|---:|---:|
| Expected 404 (all states, all four 404 reasons) | 155 | **155 — 100%** |
| Expected 308 — Minnesota | 8 | **8 — 100%**, each to the exact predicted target |
| Expected 200 — Minnesota | 16 | 13 |
| Expected 200/308 — other states | 131 | not verifiable — see below |

**The running app is the Minnesota vertical slice.** Only Minnesota is seeded, so every non-Minnesota
200 or 308 prediction returns 404 for want of data rather than because the prediction is wrong. Those
predictions are therefore **structurally derived and not live-verified**. This is a limit of the
current app, not a finding about the URLs.

Two results are load-bearing and do hold everywhere:

- **No 404 prediction failed anywhere** — 155/155 across all states and all four 404 reasons.
- **Minnesota's redirects are correct**: 8/8 returned 308 to the exact predicted destination, with no
  loop, no chain and no cross-state contamination in the sample.

The 3 Minnesota 200-predictions that returned 404 are city pages this audit discovers but the sealed
Minnesota slice does not serve — the city-page-discovery discrepancy described in the reconciliation report.

---

## 8. What this audit did not do

No migration, no publication, no redirect change, no WordPress write, no source-data change, no
pricing, SEO or image change, no city page created, no destination invented, no source defect fixed,
no production deploy. Read-only throughout.