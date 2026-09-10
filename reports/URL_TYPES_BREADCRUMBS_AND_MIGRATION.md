# The 230,000 URLs — Four Types, a Breadcrumb Map, and the Migration Plan

**Generated:** 9 September 2026
**Scope:** the 229,640 live published pages on chimcare.com
**Access:** READ ONLY. WordPress read with `SELECT` only. Decision files and the Google Search Console export read from disk. Nothing was modified, redirected, retired, published or deployed.

---

## Part 1 — The 230k split into four types

Every live URL was classified by **what hierarchy it can support**, because that is what decides whether a breadcrumb can be built for it.

| # | Type | URLs | Share | Clicks | Impressions | Indexed |
|---|---|---:|---:|---:|---:|---:|
| **A** | **Service page** — State › City › Service | **213,874** | 93.1% | 29,940 | 6,379,591 | 91,949 |
| **B** | **Town hub** — State › City | **4,448** | 1.9% | 18,711 | 3,725,280 | 3,473 |
| **C** | **Duplicate copy** — the `-2` twins | **9,007** | 3.9% | 881 | 321,239 | 3,877 |
| **D** | **Broken** — no city, or an editing note | **2,311** | 1.0% | 820 | 200,799 | 1,058 |
| | **TOTAL** | **229,640** | 100% | 50,352 | 10,626,909 | 100,357 |

**Read this table twice.** Type B is only 1.9% of the pages but earns **37% of all clicks**. The town hub pages are the commercially important ones. Type A is 93% of the site and earns 59%.

### What each type is

**Type A — Service page.** The standard page: one service, in one town, in one state. This is the bulk of the site and it is structurally clean.

**Type B — Town hub.** A town's main page. It names the town but its "service" slot holds a generic phrase like `chimney-sweep-repair` rather than a real service. These are the pages that rank.

**Type C — Duplicate copy.** WordPress created a second page at the same address plus `-2`. Both exist. Nobody has recorded which one is the survivor.

**Type D — Broken.** Either the city is missing from the address entirely, or the state cannot be read, or somebody's editing notes were saved as a live URL.

---

## Part 2 — The URL map, with examples

This is the mapping from today's flat address to a hierarchical one.

### Type A — Service page → full three-level trail

```
/location/chimney-sweep-seattle-wa/                   1,927 clicks
    Home  ›  WA  ›  Seattle  ›  Chimney Sweep

/location/chimney-sweep-portland-oregon/              1,291 clicks
    Home  ›  OR  ›  Portland  ›  Chimney Sweep

/location/chimcare-chimney-sweep-in-burlington-ma/      974 clicks
    Home  ›  MA  ›  Burlington  ›  Chimcare Chimney Sweep

/location/chimney-sweep-corvallis-or/                   364 clicks
    Home  ›  OR  ›  Corvallis  ›  Chimney Sweep
```

### Type B — Town hub → two-level trail

```
/location/chimney-sweep-repair-in-boston-ma/          1,236 clicks
    Home  ›  MA  ›  Boston

/location/chimney-sweep-repair-in-peabody-ma/           909 clicks
    Home  ›  MA  ›  Peabody

/location/chimney-sweep-fireplace-services-in-chicago-il/  664 clicks
    Home  ›  IL  ›  Chicago

/location/nashua-chimney-sweep/                         663 clicks
    Home  ›  NH  ›  Nashua
```

### Type C — Duplicate → trail builds, but the destination is ambiguous

```
/location/chimney-sweep-repair-in-phoenix-az-2/          46 clicks
    Home  ›  AZ  ›  Phoenix  ›  Chimney Sweep Repair      ← which copy wins?

/location/chimney-flashing-repair-in-springfield-ma-2/    6 clicks
    Home  ›  MA  ›  Springfield  ›  Chimney Flashing Repair  ← which copy wins?
```

Both the `-2` page and the clean page would produce the **same** breadcrumb trail. One of them has to be chosen as canonical and the other redirected. That is a decision, not a calculation.

### Type D — Broken → no trail can be built

```
/location/cleveland-oh-chimney-sweep-repair/            307 clicks
    CANNOT BUILD   the city reads as "cleveland-oh" — city and state are fused

/location/chimney-sweep-gig-harbor-professional-cleaning-chimcare/   81 clicks
    CANNOT BUILD   no city separator; the whole slug reads as one service name

/location/chimney-sweep-willsonville-oregon/             63 clicks
    CANNOT BUILD   no city token, and "Willsonville" is misspelled

/location/chico-ca-chimney-sweep/                        62 clicks
    CANNOT BUILD   city-first shape; state cannot be separated
```

These 2,311 URLs carry **820 clicks and 200,799 impressions**. They are not throwaway pages, and they cannot be placed in a hierarchy until a person fixes the address or the title.

---

## Part 3 — Can the 230k become breadcrumbs?

**Yes, for 218,322 URLs — 95.1% — with no human decision required.**

| Outcome | URLs | Share |
|---|---:|---:|
| Full breadcrumb builds automatically (Types A + B) | 218,322 | 95.1% |
| Needs a canonical chosen first (Type C) | 9,007 | 3.9% |
| Cannot be built at all (Type D) | 2,311 | 1.0% |

### The hierarchy this would create

| Level | Distinct nodes |
|---|---:|
| States | 20 |
| Towns | 2,580 |
| Service phrases (raw) | 1,767 |

**The service level is the problem, and it is smaller than it looks.**

| Coverage | URLs | Share of site |
|---|---:|---:|
| Top 50 phrases | 80,552 | 35.1% |
| Top 92 phrases (today's catalogue) | 125,324 | 54.6% |
| **Top 208 phrases** | **223,190** | **97.2%** |
| Top 500 phrases | 228,373 | 99.4% |

**1,451 phrases are used by exactly one URL.** They are typos, one-offs and editing artefacts. So the third breadcrumb level does not need 1,767 nodes — **208 covers 97.2% of the site**, which is exactly the service decision already on the table.

### Towns are in better shape than expected

| | |
|---|---:|
| Distinct towns | 2,580 |
| Towns that already own a hub page | 2,427 |
| Towns with no hub page | **153** |
| Services per town — median | 93 |
| Services per town — maximum | 231 |

Only **153 towns** lack a hub page. The middle level of the breadcrumb is 94% built already.

### Per-state shape

| State | URLs | Towns | Service phrases | Clicks |
|---|---:|---:|---:|---:|
| CA | 58,578 | 631 | 148 | 1,795 |
| MA | 35,291 | 291 | 745 | 16,493 |
| WA | 33,538 | 279 | 499 | 5,482 |
| OR | 33,003 | 281 | 333 | 5,736 |
| IL | 20,533 | 169 | 409 | 4,567 |
| MN | 19,577 | 155 | 474 | 2,326 |
| CT | 12,553 | 135 | 130 | 361 |
| OH | 7,443 | 259 | 313 | 6,531 |
| CO | 2,896 | 130 | 250 | 806 |
| WI | 2,690 | 124 | 165 | 1,414 |
| GA | 2,579 | 110 | 163 | 2,636 |

**California is the model.** 58,578 URLs across 631 towns using only **148 service phrases** — it was built later on a standard vocabulary. **Massachusetts is the opposite:** a third of California's size but **745 phrases**. The cleanup effort is concentrated in MA, WA, OR, IL and MN.

---

## Part 4 — What Google actually indexes

This is the measurement that should govern the whole migration. From the Search Console export of 139,063 rows:

| Measure | URLs | Share of the 230k |
|---|---:|---:|
| Present in Search Console at all | 100,357 | 43.7% |
| **Absent entirely — never shown** | **129,283** | **56.3%** |
| Ever shown (≥1 impression) | 100,357 | 43.7% |
| **Ever clicked (≥1 click)** | **13,440** | **5.9%** |

**More than half the site has never appeared in a Google result.** Only one page in seventeen has ever been clicked. Total clicks across all 229,640 live pages: **50,352**.

### Indexing by state

| State | URLs | Indexed | Rate |
|---|---:|---:|---:|
| WI | 2,690 | 2,105 | 78.3% |
| OH | 7,443 | 5,737 | 77.1% |
| GA | 2,579 | 1,803 | 69.9% |
| MA | 35,291 | 23,164 | 65.6% |
| CO | 2,896 | 1,825 | 63.0% |
| MN | 19,577 | 10,683 | 54.6% |
| IL | 20,533 | 10,865 | 52.9% |
| CT | 12,553 | 6,222 | 49.6% |
| WA | 33,538 | 11,990 | 35.8% |
| OR | 33,003 | 10,023 | 30.4% |
| **CA** | **58,578** | **15,276** | **26.1%** |

California is the largest state on the site and the least indexed. 43,302 California pages have never been shown to anyone. That is a strong signal that volume alone did not work.

---

## Part 5 — How to run the migration

The measurements above point to a specific order. It is built on one principle: **change one thing at a time, and never let two changes obscure each other's results.**

### Stage 1 — Move the platform. Change nothing else.

Move all 229,640 pages to the new site at their **exact current addresses**. No URL changes, no breadcrumb restructure, no consolidation.

| | |
|---|---|
| **URLs affected** | 0 change |
| **Redirect rules needed** | the 53,056 that already exist |
| **Risk** | lowest possible — Google sees the same pages at the same addresses |
| **What it delivers** | speed, structured data, correct titles, internal linking |

**Add breadcrumbs as page furniture in this stage.** A breadcrumb trail is markup, not a URL. Type A and B pages — 218,322 of them, 95.1% — can display `Home › WA › Seattle › Chimney Sweep` and emit `BreadcrumbList` structured data **without any address changing**. This is the highest-value, lowest-risk part of the whole project and it can ship on day one.

### Stage 2 — Build the middle level

Create the 153 missing town hubs and the 20 state hubs so every breadcrumb link resolves to a real page. Today a trail can be displayed but some parent links would 404.

| | |
|---|---:|
| New pages to build | 173 |
| Towns already covered | 2,427 of 2,580 |

### Stage 3 — Fix the 11,318 that cannot be placed

Types C and D. This is content work in WordPress, done while the new site is live and stable.

| Job | URLs | Decision needed |
|---|---:|---|
| Choose the surviving copy | 9,007 | Which of the two pages is canonical |
| Repair the address or title | 2,311 | Where is the city; what is the service |

### Stage 4 — Settle the services

Rule on the service list: keep, merge or retire. **208 phrases cover 97.2% of the site**, so this is a finite meeting, not an endless one. It unblocks the third breadcrumb level and it also repairs the redirect map, where 49,223 redirects currently point at a different service.

### Stage 5 — Consolidate on evidence, not assumption

Only now, with five months of Search Console data on the new site, decide what to merge or retire. The measurement that makes this urgent is in Part 4: 129,283 pages have never been shown to anyone. But **do not act on that today** — a page absent from the export may simply never have been crawled, and the export is undated. Prove it on live data first.

### Stage 6 — Restructure the addresses, if still wanted

Only if the hierarchy needs to be *in the URL* rather than in the breadcrumb. By this point the 11,318 broken addresses are fixed, so the conversion is 100% rather than 95.1%.

**The cost of doing this at Stage 1 instead:** redirect rules go from 53,056 to 282,696, more than five times as many, and every existing redirect becomes a two-hop chain.

---

## The recommendation in one paragraph

**Ship the breadcrumbs in Stage 1 without touching a single URL.** 95.1% of the site can display a full hierarchical trail and emit valid structured data today, because the state, town and service are already present inside the existing addresses. That captures the navigational and SEO benefit of a hierarchy at zero migration risk. Changing the addresses themselves is a separate, later, optional decision — and the four types above say plainly which 11,318 pages must be repaired before it could ever be done cleanly.

---

## Sources and limits

**Sources.** WordPress MySQL `chimcare_local`, read with `SELECT` only. The approved decision files `redirects.json` and `gone.json`. The Search Console export `indexed_urls (4).csv`, 139,063 rows.

**Limits, stated plainly.**

- The Search Console export is **business-supplied and undated**. It has no backlink or session data. Absence from it is not proof a page has no value.
- Service phrases are counted as **raw strings**. `chimney-sweep` and `chimney sweep repair` are two phrases even where they may be one service. That is why the figure is 1,767 rather than 208.
- Breadcrumb feasibility is judged from the **address**, not from whether the page content supports the trail.
- No content-quality measurement exists anywhere in this project. No page here is called thin or valuable on the strength of what it says.

**Nothing was modified.** No WordPress write, no change to any decision file, no redirect applied, no page retired, no deployment.
