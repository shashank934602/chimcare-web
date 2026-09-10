# Chimcare SEO Improvement Plan

| | |
|---|---|
| Written | 2026-09-08 |
| Basis | The whole-site audit (262,535 URLs), the Minnesota baseline (20,479 URLs), live Lighthouse and page comparisons against production, and current Google guidance |
| Rule | Every recommendation cites a measurement from this repository or a named source. Nothing here is generic advice. |

---

## 1. Where We Stand, Measured

### What the new build already does better than production

Measured on three Minnesota pages, production versus the new site, during this project:

| | Production (WordPress) | New site (Next.js) |
|---|---|---|
| Lighthouse SEO | 85 | **100** |
| Lighthouse Best Practices | 73 | **100** |
| Lighthouse Performance | 69 to 94 | **95 to 96** |
| Meta description | **absent** | present |
| `<h1>` elements | **2** | 1 |
| External scripts | **30** | 0 |
| Page weight | ~500 KB | ~256 KB |
| Rating markup that Google penalises | `AggregateRating` present in source | deliberately not emitted |

The single missing meta description is the entire 85-to-100 gap on all three pages. These are not
plans; they are what shipping the new site delivers.

### What is measurably wrong today

| Problem | Scale | Source of the number |
|---|---|---|
| Live URLs that will return 404 on the new site with no decision behind them | **85,227**, 37.1% of live URLs | whole-site audit |
| Approved redirects that land on a 404 | **31,799 of 51,607**, 61.6% | whole-site audit |
| Services WordPress publishes that the application cannot represent | **116 of 208** | whole-site audit |
| Pages sharing one Boston photograph as their featured image and `og:image` | **227,511 site-wide**; 120 of 134 in MN | database and production fetch |
| Pages whose structured data reports the Boston head office address | every page in every state | WP Schema Pro inspection |
| Branch city pages, the most commercially valuable pages, withheld from publication | **14 of 14 in Minnesota** | gate results |
| Coverage pages whose serving branch is a computed guess | 118 in Minnesota | `nearest_branch_unverified` |
| Pages with an authored meta description | 376 of 229,621 | `wp_postmeta` |
| Pages with an authored SEO title | 234 of 229,621 | `wp_postmeta` |
| Duplicate city pages | 1,666 | whole-site audit |
| Slugs that are LLM editing notes committed as URLs | 985 | whole-site audit |
| Sitemap, robots file, Search Console verification on the new site | none | repository |

### The traffic reality that shapes everything

Minnesota's 9,568 unresolved URLs earned **932 Google clicks in twelve months**. Only 454 of them
earned any click at all. The site is a 229,617-page grid of service × city templates, and the
measured evidence is that the overwhelming majority of that grid earns nothing.

---

## 2. The Principle

**This site's SEO problem is not that it has too few pages. It is that it has 229,617 pages that are
mostly the same page with the town name changed, and Google has said in plain terms that it treats
that as abuse.**

Google's March 2024 core update folded the helpful-content system into core ranking and introduced
the scaled-content-abuse policy, which names "city pages that are minimally rewritten from a template"
and "doorway pages designed to funnel users to a central page" as examples. Because helpfulness is
assessed site-wide, thin pages suppress the strong ones alongside them. The documented recovery
pattern is to consolidate thin content, redirect the thin URLs to the consolidated pages, and rebuild
authority around fewer, genuinely useful resources.

For a multi-location service business, what actually ranks locally is measured elsewhere: Google
Business Profile signals are the largest factor in the local pack at roughly 32 percent, proximity
and review velocity follow, and for organic local results the drivers are dedicated location pages
with **unique local content**, NAP consistency, and inbound links. Pages that swap the city name and
nothing else limit rankings rather than help them.

So the plan has one direction: **fewer, better, genuinely local pages, with the technical foundation
the new build already provides, and nothing lost on the way.**

---

## 3. The Plan

Five phases. Each item names its evidence, its owner, its effort, and how we will know it worked.
Phases 0 and 1 are almost entirely engineering and almost entirely done or ready. Phases 2 and 3 are
where the SEO gains are, and both need the business.

### Phase 0: Lose nothing during the migration

Everything else is pointless if the cutover itself loses rankings. Google's site-move guidance is
explicit: a structured redirect map of source, destination and type; no chains; every target
returning 200; monitor for at least 30 days; keep redirects for at least a year.

| # | Action | Evidence | Owner | Effort | Done when |
|---|---|---|---|---|---|
| 0.1 | Validate every redirect target returns 200 before publishing the map | 31,799 currently do not | engineering | days | zero non-200 targets, or each listed with a sign-off |
| 0.2 | Add the redirect-graph test: loops, chains, self, cross-state | 7 loops, 767 chains, 72 cross-state in the map; 1 loop in MN retires a live page | engineering | days | test fails on today's data with exactly the known defects |
| 0.3 | Build `app/sitemap.ts` and `app/robots.ts` | neither exists | engineering | day | sitemap index at `/sitemap.xml`, published pages only, chunked at 20,000 |
| 0.4 | Verify the new site in Google Search Console and Bing before cutover | not done; the architecture calls it "a blocker" | business + engineering | hour | verified property, sitemap submitted |
| 0.5 | Capture a Search Console baseline of clicks and impressions per URL | `keep-pages.json` clicks are business data, unverified | business | hour | export on disk, dated |
| 0.6 | Keep WordPress read-only as the origin for 30 days after cutover | already the plan | engineering | none | rollback rehearsed once |
| 0.7 | Log every `/location/*` 404 daily for four weeks | planned in architecture §17 | engineering | day | dashboard, reviewed daily |

### Phase 1: Ship the fixes the new build already contains

These are wins that arrive with the migration. The work is making sure they are true for every
page, not just the 134 validated ones.

| # | Action | Evidence | Owner | Effort | Done when |
|---|---|---|---|---|---|
| 1.1 | One `<h1>` per page, a meta description on every page, canonical self-reference | production has 2 h1 and no description; new site passes check 3 and 7 on 134/134 | done for city pages | none | extend validation to service pages |
| 1.2 | Zero third-party scripts on location pages | production loads 30; new site loads 0 | done | none | Lighthouse Best Practices stays 100 |
| 1.3 | Remove `AggregateRating` markup site-wide | source carries it; Google treats self-serving review markup as a policy violation; new site asserts its absence in check 9 | done | none | — |
| 1.4 | Stop emitting the Boston head-office address on every page | WP Schema Pro is one global record; new site excludes it and builds per-page `HomeAndConstructionBusiness` or `Service` | done | none | — |
| 1.5 | Add Open Graph and Twitter metadata | Yoast stores neither; new site emits OG only, no Twitter | engineering | hours | `twitter:card`, `twitter:title`, `twitter:description` on every page |
| 1.6 | Replace the Boston `og:image` | 227,511 posts share attachment 88125; it is the social preview for Minnesota today | **business**, in WordPress | per city | a real photograph per city, or at least per state; the agent picks it up on re-run with no code change |
| 1.7 | Fix the slug parser for plurals, `-2` suffixes, city-first and missing `-in-` | 761 MN URLs name a catalogue service and 404 on wording alone | engineering | days | those URLs return 200 at their own address |
| 1.8 | Recover the 985 editing-note slugs from their titles | title "Chimney Vent Installation in Wales,MA" behind a 190-character slug | engineering | days | each resolves to state, city and service |

### Phase 2: Local SEO, where the money is

Branch cities are the pages a searcher for "chimney sweep near me" should land on. Every one of
Minnesota's 14 is withheld today, and the reason is ours.

| # | Action | Evidence | Owner | Effort | Done when |
|---|---|---|---|---|---|
| 2.1 | Fix the branch-page extractor | 14 of 14 branch cities have zero local lines extracted; the text exists in WordPress under a heading the extractor does not read | engineering | days | 14 branch pages pass the gate on their own content; regression re-sealed by decision |
| 2.2 | Verify branch territories and replace the nearest-office guess | 118 coverage cities carry `nearest_branch_unverified`; local phone and "served from" line depend on it | **business** | one session | a territory table; flag count goes to 0 |
| 2.3 | NAP consistency: one name, address and phone per branch, identical on the page, in JSON-LD, and in Google Business Profile | 105 branches in `branches.json`; two coverage cities physically contain an office (St. Louis Park, Brooklyn Center) | **business** | days | audit of page vs GBP vs citations, zero mismatches |
| 2.4 | Claim and complete a Google Business Profile for every branch | the largest local ranking factor; `gbp_url` and `gbp_status` fields exist in `branches.json` | **business** | per branch | every branch has a verified GBP with matching NAP, hours, categories, photos |
| 2.5 | A real photograph per branch and per branch city | 14 of 15 Minnesota heroes are real city photos; every coverage city shows Boston | **business** | per city | zero `hero_image_not_city_specific` flags on branch pages |
| 2.6 | Reviews: a process to request and respond | review velocity is a top local-pack factor; the site shows "Rated 4.7" with no verified source (open question Q5) | **business** | ongoing | source of the rating confirmed; responses within a week |
| 2.7 | Genuinely local content on branch pages: named neighbourhoods, local building stock, local weather stress, the crew | the gate already requires 4 areas and 2 local lines; branch pages list only "Downtown / East / West" | **business** writes; engineering extracts | per branch | passes the gate on real content, not a lowered threshold |
| 2.8 | Link every branch page from the state hub, the national hub, and its coverage cities | architecture §9 internal-linking rules; the hub already links every published city | done for hubs | none | every branch page reachable in ≤3 clicks |

### Phase 3: Consolidate the grid

This is the phase with the largest SEO effect and the largest business dependency. It cannot start
until the service decisions are taken.

| # | Action | Evidence | Owner | Effort | Done when |
|---|---|---|---|---|---|
| 3.1 | Decide the 72 new-service candidates and 30 near-matches: add, map, or retire | 105,220 URLs, 40 percent of the live site, wait on this | **business** | one to two sessions | a written decision per service |
| 3.2 | Approve the rule "a service-by-city URL forwards to its city page" for services not kept as pages | 7,708 URLs resolve fully and wait on this one rule; John Mueller: a 301 only counts with a true 1:1 replacement, and the city page for the same town is the relevant one | **business** | one decision | rule recorded; map generated |
| 3.3 | Build the content-quality audit | not implemented; nothing may be called thin until it exists | engineering | week | word count, duplicate detection, city and service specificity per page |
| 3.4 | Keep as pages only the service × city combinations that earn traffic **and** have unique content | MN: 454 of 9,568 unresolved URLs earned any click; the rest are template swaps | **business** decides thresholds; engineering applies | days | a kept list, a forwarded list, a retired list, all from the audit |
| 3.5 | Forward the thin ones to the city page, retire the ones with no page and no traffic | the consolidation pattern Google's guidance describes; 36,503 already retired | engineering | days | every URL has one deliberate outcome |
| 3.6 | Resolve the 1,666 duplicate city pages and the 4 duplicate Oregon slugs | duplicates split ranking signals | engineering, business confirms | days | one canonical page per city |
| 3.7 | Make each kept service page substantively different: service-specific FAQs, pricing, process, photos | the existing service template shares copy across all 92 services; check 11 counts cards, not uniqueness | **business** content | per service | the content-quality audit scores each above the duplicate threshold |

### Phase 4: Measure, and keep measuring

| # | Action | Evidence | Owner | Effort |
|---|---|---|---|---|
| 4.1 | Daily for 30 days after cutover: indexing, crawl errors, 404s by prefix, Core Web Vitals | Google's guidance | engineering | dashboard |
| 4.2 | Weekly: clicks and impressions per kept page against the Phase 0 baseline | the only way to know whether consolidation worked | business | report |
| 4.3 | Monthly: local pack position per branch for "chimney sweep {city}" | the outcome Phase 2 is for | business | tracking |
| 4.4 | Build `url_checks`: request every legacy URL on the live site before cutover and on the new site after | planned in architecture §17; not built | engineering | week |

---

## 4. Priority, by impact and effort

| Rank | Action | Impact | Effort | Why this order |
|---|---|---|---|---|
| 1 | 0.1 + 0.2, validate the redirect map | **Critical**, avoids losing what exists | days | 61.6 percent of redirects are dead ends today |
| 2 | 2.1, branch-page extractor | **High**, unlocks the 14 most valuable pages per state | days | code fix, no content needed |
| 3 | 0.3 + 0.4, sitemap and Search Console | **High**, Google cannot index what it cannot find | hours | prerequisite for everything measured |
| 4 | 1.7, slug parser fixes | Medium, 761 MN pages and thousands site-wide | days | pure engineering |
| 5 | 3.1, the service decisions | **Highest** overall, gates 105,220 URLs | one meeting | nothing downstream moves without it |
| 6 | 2.2 to 2.4, territories, NAP, GBP | **High**, the local-pack factors | weeks | business, can run in parallel |
| 7 | 1.6 + 2.5, real photographs | Medium, fixes the social preview and the doorway signal | ongoing | business, in WordPress |
| 8 | 3.3 to 3.5, quality audit and consolidation | **High**, the scaled-content fix | weeks | needs 3.1 first |
| 9 | 2.7 + 3.7, real local and service content | **High**, long-term | ongoing | the only thing that makes pages genuinely different |

---

## 5. What Not To Do

Each of these has been suggested or is the accidental state today, and each is wrong on the
evidence.

| Do not | Because |
|---|---|
| Rebuild all 229,617 pages on the new site | Google names template city pages as scaled-content abuse; 116 of the 208 services have no page to build; MN's grid earned 932 clicks a year |
| Redirect everything to the homepage | Google treats mass unrelated redirects as soft 404s and passes nothing |
| Redirect every service URL to its city page without the business approving the rule | 6,043 URLs cannot resolve a city; the rule must be recorded, not assumed |
| Publish the redirect map as-is | 31,799 targets return 404; 7 loops; 72 cross-state |
| Generate meta descriptions, alt text or local copy to fill gaps | the migration rule forbids inventing content; a template description is honest, an invented one is not |
| Substitute a nicer image for the Boston photo in code | it is the source's decision; fix it in WordPress and re-run |
| Lower the publication gate to publish more pages | thin pages suppress strong ones site-wide; the gate is the defence |
| Call any page "thin" before the content-quality audit exists | nothing has been measured; the label would be an invention |
| Add `AggregateRating` or review markup | self-serving review markup is a policy violation; the new site correctly emits none |
| Change working URLs to a new structure | keeping a working URL is the lowest-risk option in every source consulted |

---

## 6. How We Will Know It Worked

| Metric | Baseline | Target | Measured by |
|---|---|---|---|
| Lighthouse SEO, location pages | 85 | 100 | already achieved on the new build |
| Live URLs returning an undecided 404 | 85,227 | 0 | every URL has a deliberate outcome |
| Redirects landing on a 404 | 31,799 | 0 | redirect-graph test |
| Branch pages published | 0 of 14 in MN | 14 of 14 | gate on real content |
| Coverage pages with a verified branch | 0 of 118 | 118 | territory table |
| Branches with a verified, NAP-consistent GBP | unknown | all 105 | audit |
| Pages with a real local photograph | 15 of 134 in MN | every branch page | flag count |
| Total indexed pages | ~229,617 | a much smaller, deliberate number | Search Console |
| Clicks to kept pages | Phase 0 baseline | up, 90 days after cutover | Search Console |
| Local pack position, "chimney sweep {branch city}" | unknown | top 3 for each branch | rank tracking |

The last three are the ones that matter. Everything above them is how we get there.

---

## 7. Sources

- Google Search Central, [Site Moves and Migrations with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- Evok Advertising, [Mastering Google's March 2024 Core Update](https://evokad.com/mastering-googles-march-2024-core-update/)
- Digital Applied, [Scaled Content Abuse: Google's AI Page Crackdown](https://www.digitalapplied.com/blog/scaled-content-abuse-google-march-update-ai-pages-decimated)
- Breakline, [Guide to Google's Scaled Content Abuse Policies](https://www.breaklineagency.com/guide-to-googles-scaled-content-abuse/)
- Aristral, [Google Helpful Content Update for Service Businesses](https://aristral.com/blog/google-helpful-content-update-service-businesses)
- Entrepreneur, [The Real Playbook for Multi-Location Local SEO in 2026](https://www.entrepreneur.com/growing-a-business/the-real-playbook-for-multi-location-local-seo-in-2026/502959)
- BizIQ, [Multi-Location SEO Statistics 2026](https://biziq.com/blog/multi-location-seo-statistics/)
- V9 Digital, [Local SEO For Multiple Locations In 2026](https://www.v9digital.com/insights/local-seo-in-2026-how-multi-location-businesses-win-in-ai-search/)
- KD Interactive, [Local SEO for Multi-Location Businesses](https://www.kdinteractive.com/local-seo-for-multi-location-businesses-the-2026-growth-guide)
- Stan Ventures, [404 Pages vs Redirects: What Google Recommends](https://www.stanventures.com/news/seo-404-pages-vs-redirects-google-6544/), quoting John Mueller
- GSQi, [301 Redirects To Less-Relevant Pages Are Seen As Soft 404s](https://www.gsqi.com/marketing-blog/redirects-less-relevant-pages-soft-404s/)

Chimcare data: `reports/WHOLE_SITE_LINKABILITY_REPORT.md`, `reports/CHIMCARE_MINNESOTA_MIGRATION_POSTMORTEM.md`,
`reports/URL_MIGRATION_PLAN_COMPARISON.md`, `data/audits/whole-site-audit.sqlite`.

**END OF DOCUMENT**
