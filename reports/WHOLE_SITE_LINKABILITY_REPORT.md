# Whole-Site Linkability Report

**Audit run:** `wsa-20260907T165001` · **Generated:** 2026-09-07T16:53:38.759605
**READ ONLY.** WordPress was queried with `SELECT` only. Nothing was migrated, published, redirected,
deleted, rewritten or generated. Classification lives in `data/audits/whole-site-audit.sqlite`,
separate from any production migration table; its raw inventory table is immutable.

---

## The question this report answers

> Before migration, how many of the ~227,000 legacy URLs have a verified
> State → City → Service → Destination relationship?

## **87,581**

That is **33.4%** of the 262,535 URLs in full migration scope, and
**38.1%** of the 229,617 live published WordPress URLs.

---

## 1. Linkability totals

| Linkability Status | URLs | Percentage | Problem class |
|---|---:|---:|---|
| LINKABLE | 87,581 | 33.36% | — |
| SERVICE_REVIEW | 75,105 | 28.61% | BUSINESS |
| REDIRECT | 51,607 | 19.66% | BUSINESS (decided) |
| GONE | 36,503 | 13.9% | BUSINESS (decided) |
| NO_DESTINATION | 7,708 | 2.94% | BUSINESS |
| OTHER_REVIEW | 2,810 | 1.07% | BUSINESS |
| PARSER_FIX | 896 | 0.34% | **ENGINEERING** |
| CITY_REVIEW | 325 | 0.12% | **ENGINEERING** |
| NO_SOURCE_PAGE | 0 | 0.0% | BUSINESS |
| **TOTAL** | **262,535** | **100%** | |

No URL is `UNKNOWN`. Every non-LINKABLE record carries a reason.

## 2. Engineering versus business

The two are kept strictly apart, because they have different owners and wildly different costs.

| | URLs | Share of all non-linkable |
|---|---:|---:|
| **ENGINEERING** — parser, slug, extraction defects | **1,221** | 0.7% |
| **BUSINESS** — service, destination and retirement decisions | **173,733** | 99.3% |

**99.3% of the problem is a business decision, not code.**
Engineering work totals 1,221 URLs — about half a percent of the inventory.

### Engineering backlog, itemised

| Defect | URLs | Fix |
|---|---:|---|
| Malformed slug (editing note committed as a URL) | 985 | Read state/city/service from the page title |
| City not resolvable from the slug | 6,043 | Extend the city extractor to the title |
| State readable only from the title | 130 | Already handled; keep the title fallback |
| Slug and title disagree on the state | 2 | Human confirmation, 2 URLs |
| State unresolvable from any signal | 132 | Human confirmation |

### Business backlog, itemised

| Decision | URLs |
|---|---:|
| Service has no counterpart in the application catalogue | 72,809 |
| Service is ambiguous against a near neighbour | 32,411 |
| Hierarchy complete, no approved destination | 7,708 |
| Already decided: redirect | 51,607 |
| Already decided: retire | 36,503 |
| No WordPress source page to migrate | 0 |
| City page withheld by the publication gate | 2,810 |

## 3. Linkability by state

| State | URLs | Linkable | Linkable % | Service Review | No Destination | Engineering |
|---|---:|---:|---:|---:|---:|---:|
| CA | 66,694 | 47,367 | 71.0% | 0 | 1,300 | 490 |
| MA | 35,286 | 3,554 | 10.1% | 14,259 | 1,103 | 45 |
| WA | 34,389 | 5,146 | 15.0% | 19,257 | 1,439 | 110 |
| OR | 33,648 | 10,494 | 31.2% | 14,846 | 1,370 | 216 |
| IL | 21,891 | 3,178 | 14.5% | 9,322 | 625 | 49 |
| MN | 20,484 | 2,853 | 13.9% | 8,726 | 645 | 23 |
| OH | 15,189 | 1,257 | 8.3% | 4,077 | 314 | 49 |
| CT | 12,665 | 11,609 | 91.7% | 0 | 530 | 152 |
| GA | 7,663 | 325 | 4.2% | 1,144 | 79 | 2 |
| CO | 6,829 | 501 | 7.3% | 1,880 | 184 | 33 |
| WI | 6,690 | 421 | 6.3% | 1,583 | 102 | 12 |
| UT | 279 | 265 | 95.0% | 0 | 5 | 6 |
| ID | 279 | 264 | 94.6% | 0 | 6 | 6 |
| UNRESOLVED | 132 | 0 | 0.0% | 0 | 0 | 2 |
| IN | 93 | 92 | 98.9% | 0 | 0 | 0 |
| MI | 92 | 84 | 91.3% | 0 | 1 | 7 |
| PA | 92 | 90 | 97.8% | 0 | 2 | 0 |
| TN | 92 | 73 | 79.3% | 0 | 0 | 19 |
| AZ | 38 | 8 | 21.1% | 11 | 3 | 0 |
| TX | 6 | 0 | 0.0% | 0 | 0 | 0 |
| NH | 2 | 0 | 0.0% | 0 | 0 | 0 |
| RI | 1 | 0 | 0.0% | 0 | 0 | 0 |
| FL | 1 | 0 | 0.0% | 0 | 0 | 0 |

## 4. Why the service layer is the bottleneck

**WordPress names 208 distinct services. The application models 92.**

| Match status | Distinct services | URLs |
|---|---:|---:|
| EXACT_MATCH | 94 | 111,476 |
| DETERMINISTIC_ALIAS | 5 | 5,442 |
| POSSIBLE_MATCH | 30 | 32,411 |
| NEW_SERVICE_CANDIDATE | 72 | 72,809 |
| UNRESOLVED | 2 | 2,104 |
| CITY_PAGE_PHRASE (not a service) | 5 | 5,342 |

Matching rules, applied in order, with **no substring or superset matching at any point**:

1. **EXACT_MATCH** — the normalised phrase equals a catalogue key.
2. **DETERMINISTIC_ALIAS** — identical token multiset in a different word order, or one of 5 explicit
   synonym pairs recorded in the code.
3. **POSSIBLE_MATCH** — differs from a catalogue key by exactly one qualifier token.
   **Recorded with `canonical_service_id = NULL` and referred to a human. Never auto-mapped.**
4. **NEW_SERVICE_CANDIDATE** — a well-formed service name with no catalogue counterpart.
5. **UNRESOLVED** — no well-formed service phrase derivable.

The worked example from the brief behaves as required:

> `Fireplace Flue Installation` — 1,012 URLs — differs from `fireplace-installation` by the single
> token `flue` → **POSSIBLE_MATCH**, `canonical_service_id = NULL`. It was **not** turned into
> `fireplace-installation`.

### The 30 ambiguous services — every one needs a human ruling

| Service | URLs | Why it is ambiguous |
|---|---:|---|
| Chimney Caps | 2,137 | differs from "chimney-cap-installation" by the single token "installation" — not auto-mapped |
| Duct Cleaning | 1,302 | differs from "air-duct-cleaning" by the single token "air" — not auto-mapped |
| Gas Fireplace Repair & Service | 1,169 | differs from "gas-fireplace-repair" by the single token "service" — not auto-mapped |
| Fireplace Inserts | 1,148 | differs from "fireplace-insert-installation" by the single token "installation" — not auto-mapped |
| Gas Fireplace Installation | 1,118 | differs from "fireplace-installation" by the single token "gas" — not auto-mapped |
| Chimney Repair & Reconstruction | 1,113 | differs from "chimney-repair" by the single token "reconstruction" — not auto-mapped |
| Gas Fireplaces | 1,112 | differs from "gas-fireplace-repair" by the single token "repair" — not auto-mapped |
| Fireplace Panels Repair | 1,098 | differs from "fireplace-repair" by the single token "panel" — not auto-mapped |
| Gas Fireplace Cleaning | 1,093 | differs from "fireplace-cleaning" by the single token "gas" — not auto-mapped |
| Electric Fireplace Installation | 1,090 | differs from "fireplace-installation" by the single token "electric" — not auto-mapped |
| Chimney Restoration | 1,083 | differs from "chimney-masonry-restoration" by the single token "masonry" — not auto-mapped |
| Flexible Chimney Liner Installation | 1,081 | differs from "chimney-liner-installation" by the single token "flexible" — not auto-mapped |
| Fireplace Gas Valve Repair | 1,080 | differs from "gas-fireplace-repair" by the single token "valve" — not auto-mapped |
| Masonry Repair | 1,080 | differs from "masonry-chimney-repair" by the single token "chimney" — not auto-mapped |
| Electric Fireplace Repair | 1,078 | differs from "fireplace-repair" by the single token "electric" — not auto-mapped |
| Wood Burning Inserts | 1,069 | differs from "wood-burning-insert-removal" by the single token "removal" — not auto-mapped |
| Chimney Bricks Repair | 1,067 | differs from "chimney-repair" by the single token "brick" — not auto-mapped |
| Chimney Fireplace Repair | 1,064 | differs from "chimney-repair" by the single token "fireplace" — not auto-mapped |
| Fireplace Masonry Repair | 1,061 | differs from "fireplace-repair" by the single token "masonry" — not auto-mapped |
| Chimney Maintenance | 1,059 | differs from "chimney-liner-maintenance" by the single token "liner" — not auto-mapped |
| Firebox Repair | 1,054 | differs from "chimney-firebox-repair" by the single token "chimney" — not auto-mapped |
| Leaking Chimney Repair | 1,048 | differs from "chimney-repair" by the single token "leaking" — not auto-mapped |
| Chimney Leaks | 1,041 | differs from "chimney-leak-repair" by the single token "repair" — not auto-mapped |
| Chimney Flashing | 1,039 | differs from "chimney-flashing-installation" by the single token "installation" — not auto-mapped |
| Fireplace Brick Repair | 1,038 | differs from "fireplace-repair" by the single token "brick" — not auto-mapped |
| Chimney Crowns | 1,031 | differs from "chimney-crown-repair" by the single token "repair" — not auto-mapped |
| Chimney Framing Rebuild | 1,026 | differs from "chimney-rebuild" by the single token "framing" — not auto-mapped |
| Chimney Framing Repair | 1,019 | differs from "chimney-repair" by the single token "framing" — not auto-mapped |
| Fireplace Flue Installation | 1,012 | differs from "fireplace-installation" by the single token "flue" — not auto-mapped |
| Commercial Air Duct Cleaning | 1 | differs from "air-duct-cleaning" by the single token "commercial" — not auto-mapped |

### The 30 largest new-service candidates (72 in total)

| Service WordPress publishes | Legacy URLs |
|---|---:|
| Fireplace Gas Valve Replace | 1,453 |
| Dryer Duct Cleaning | 1,195 |
| Wood-Burning Stove Installation | 1,159 |
| Gas Line Installation Service | 1,147 |
| Chimney Cleaning & Maintenance Services | 1,145 |
| Cleaning & Sweeping | 1,134 |
| Wood Fireplaces | 1,133 |
| Masonry Repair & Construction | 1,128 |
| Chimney Inspection Level 1 | 1,126 |
| Wood Stoves | 1,121 |
| Gas Fireplace Maintenance & Cleaning | 1,120 |
| Gas Fireplace Insert | 1,119 |
| Gas Fireplace Service | 1,118 |
| Pellet Stove Repair | 1,117 |
| Wood Burning Fireplace Inserts | 1,113 |
| Remote Control for a Pilot Light | 1,110 |
| Local Chimney Sweep and Cleaning | 1,108 |
| Gas Fireplace Inserts | 1,105 |
| Fireplace Remodeling | 1,105 |
| Wood-Burning Fireplace Installation | 1,104 |
| Pellet Stoves | 1,104 |
| Fireplace Refacing & Mantel Replacement | 1,101 |
| Chimney Cricket Installation | 1,100 |
| Fireplace Panels Replace | 1,097 |
| Commercial Pizza Oven Cleaning Service | 1,092 |
| Gas Log Sets | 1,091 |
| Electric Fireplaces | 1,090 |
| Chimney Inspection Level 2 | 1,089 |
| Vented Gas Logs | 1,086 |
| Gas Stoves | 1,086 |

## 5. Minnesota regression

The sealed Minnesota baseline is **unchanged and reproduced exactly**:

| Metric | Required | Measured | Result |
|---|---:|---:|---|
| Total URLs | 20,479 | 20,479 | **PASS** |
| 200 | 2,864 | 2,864 | **PASS** |
| 308 | 6,803 | 6,803 | **PASS** |
| 404 | 10,812 | 10,812 | **PASS** |
| 404 → LEGACY_NOT_MIGRATED | 9,568 | 9,568 | **PASS** |
| 404 → GONE | 1,219 | 1,219 | **PASS** |
| 404 → REVIEW | 25 | 25 | **PASS** |

Set comparison against `data/audits/mn-url-audit.json`: **all 20,479 sealed URLs are present in this
layer; none is missing.** This layer additionally carries **5** Minnesota URLs the sealed baseline
does not contain. They were investigated before the whole site was processed, as required:

| WP ID | Title | Why the baseline missed it |
|---|---|---|
| 139451 | Liners (product) in Dayton,MN | slug is an editing note ending `-is`, not `-mn` |
| 144561 | Liners (product) in Lexington,MN | slug ends `-so` |
| 141671 | Liners (product) in Nowthen,MN | slug ends `-follow` |
| 135455 | Liners (product) in St. Peter,MN | slug ends `-it` |
| 136825 | Liners (product) in Victoria,MN | slug ends `-the` |

The sealed builder selects Minnesota with the slug test `-mn(-\d+)?$`. None of these five slugs ends
in `-mn`, so it never saw them; this layer resolves state from the title when the slug carries none.
All five are classified `PARSER_FIX` / ENGINEERING. **The baseline was not altered** — the five are
reported as an addition to it, not a correction of it.

## 6. What "LINKABLE" does and does not assert

LINKABLE means the full chain resolves in source data: the URL has a state, a city in that state, a
service phrase that maps to the application catalogue by exact match or deterministic alias, a
WordPress source page, and an approved destination.

It does **not** assert that the destination page has been built. Only Minnesota is seeded in the
application today; for every other state LINKABLE is a statement about the source data, verified
against the database, not a statement that the page renders.