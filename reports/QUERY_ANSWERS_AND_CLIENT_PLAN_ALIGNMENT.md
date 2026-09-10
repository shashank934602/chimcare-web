# Part 4 — What is measured, and what is not

The value of every number above depends on knowing which of these two lists it is in.

## Measured, reproducible, and verified

| | Evidence |
|---|---|
| The 262,535-URL universe | Union of four sets; the Minnesota subset reproduces the sealed baseline exactly — 20,479 = 20,479, zero set difference in both directions |
| State, town and service resolution for every URL | 262,271 of 262,535 resolve state from the slug token; 130 from the title; 132 unresolved and individually listed |
| The 404 predictions | 155 of 155 sampled 404s across all states and all four reasons returned 404 when actually requested |
| Minnesota's redirects | 8 of 8 returned 308 to the exact predicted destination |
| The published-post count | 229,621, reproduced exactly against `wp_posts` |
| The redirect graph | Re-measured independently for this document; three figures in the prior report corrected |
| Content and SEO counts in WordPress | Measured directly against `chimcare_local` for this document |
| The Lighthouse comparison | Run live, production versus the new build, on three Minnesota pages |

## Not measured — and no number here should be read as if it were

| | Why it matters |
|---|---|
| **Content quality.** No word count, no similarity clustering, no duplicate-content detection, no thin-page scoring exists anywhere in the repository | The 85,227 unresolved URLs are *unclassified for quality*. Calling them thin would be an invention. Everything in Option A's consolidation case rests on a measurement that has not been taken |
| **Whether a page renders correctly in any state but Minnesota** | Only Minnesota is seeded. For the other 21 states, "resolves to a page" is a statement about the source data, verified against the database — not a statement that the page has been built |
| **Google Search Console** | The traffic file is business-supplied and unverified. 87,872 audited URLs have no row in it at all |
| **Backlinks and conversions** | No source for either exists in the repository. The "is it valuable?" branch of the decision tree is running on clicks alone |
| **Open Graph correctness** | Emitted by the new build, verified nowhere |
| **The whole-site audit's generating script** | Missing. The classification on disk cannot currently be re-run or extended — a P0 item, and it means every figure in this document is a snapshot of one run |

---

# Part 5 — What to do next, in order

Ordered by what unblocks the most, not by effort.

| # | Action | Unblocks | Owner |
|---|---|---|---|
| 1 | **Decide the 208 services: keep, merge, or retire each** | 105,253 URLs — 73,539 of them still undecided. Nothing else in the project has this much riding on it | Business |
| 2 | **Grant Google Search Console access and capture a per-URL baseline** | The whole "is it valuable?" branch. 18,806 undecided URLs have impressions we would otherwise be guessing about | Business |
| 3 | **Approve "a service page with no home redirects to its town page"** | 7,708 URLs, immediately, on one decision | Business |
| 4 | Validate every redirect target returns 200; add the redirect-graph test | 31,799 broken redirects, 5 self-loops, 773 chains, 1 dangling, 76 cross-state | Engineering |
| 5 | **Rule on the 429 URLs where the approved maps and the audit disagree** | The business's own redirect and retirement decisions are currently being overridden | Business + engineering |
| 6 | Recover the whole-site audit's generating script | Nothing above can be re-run or extended without it | Engineering |
| 7 | Build `app/sitemap.ts` and `app/robots.ts`; verify the new site in Search Console | Discovery of everything. Neither file exists | Engineering |
| 8 | Fix the branch-page extractor | 1,317 gate-held city pages, including every branch city — the most commercially valuable pages on the site | Engineering |
| 9 | Fix the slug parser: plurals, `-2` suffixes, city-first, missing `-in-`, editing notes | 1,221 URLs become 200s instead of redirects | Engineering |
| 10 | Fix the 29,206 malformed shortcodes in WordPress | Body extraction on 12.7% of pages | Business (one find-and-replace) or engineering |
| 11 | Decide the 1,518 open service duplicates and sign off the city-page duplicate rule | The last 1,518 competing pages | Business |
| 12 | A real photograph per branch, uploaded to WordPress | 227,504 pages sharing the Boston photo, including as the social preview | Business |
| 13 | Build the content-quality audit | The only thing that makes Option A's consolidation case measurable rather than assumed | Engineering |

## The recommendation, unchanged from the client plan and now costed

**Option D, staged: launch on the Option B foundation, then consolidate as the service decisions arrive.**

The client plan's reasoning is that because the URLs never change, nothing from stage 1 has to be undone in stage 2. The measurements add three arguments it does not yet make:

1. **Stage 1 repairs 29,859 of the 31,799 broken redirects for free**, because every dead destination becomes a page. Broken redirects fall to 1,940.
2. **Stage 2 is smaller than it looks.** The additional loss over stage 1 is 84,306 URLs, not ~100,000, and 8,641 of the 10,159 duplicate resolutions are inherited rather than newly decided.
3. **The case for stage 2 is the 17% figure.** 229,621 pages published; at most 38,968 ever shown in Google; 8,555 ever clicked. That is the number that makes consolidation obviously right — and it is also the number that says do not consolidate blind, because 18,806 of the undecided URLs are among the ones Google does show.

---

**Sources.** `data/audits/whole-site-audit.sqlite`; live MySQL `chimcare_local` (SELECT only); `chimcare-rebuild-main/site/data/{keep-pages,redirects,gone,branches}.json`; `reports/WHOLE_SITE_URL_MIGRATION_AUDIT.md`; `reports/WHOLE_SITE_URL_RECONCILIATION.md`; `reports/WHOLE_SITE_LINKABILITY_REPORT.md`; `reports/SEO_IMPROVEMENT_PLAN.md`; `reports/URL_MIGRATION_PLAN_COMPARISON.md`; `reports/CHIMCARE_PRE_IMPLEMENTATION_MIGRATION_STRATEGY.md`; `reports/CLIENT_MIGRATION_PLAN.html` (the source of `CLIENT_MIGRATION_PLAN.pdf`).

**Nothing was written to WordPress, to the audit database, or to the live site. Every database access was read-only.**

**END OF DOCUMENT**
