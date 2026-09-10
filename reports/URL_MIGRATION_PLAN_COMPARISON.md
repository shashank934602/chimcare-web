# Legacy URL Migration: The Four Plans, Evaluated Against Chimcare's Real Data

| | |
|---|---|
| Written | 2026-09-08 |
| Purpose | Explain each of the four plans in depth, test each against what the audits actually measured, and recommend one |
| Data | The whole-site audit (262,535 URLs, 22 states) and the sealed Minnesota baseline (20,479 URLs) |
| Verdict up front | **Plan 4, the hybrid, but with one correction: the site is already on Plan 2, and that must not be undone** |

---

## 0. The one fact that reframes the whole question

Before comparing plans, one thing about this project changes how every plan reads.

**The new site already keeps every legacy URL exactly as it was.** This is a settled architectural
decision, recorded in `CLAUDE.md` under "Non-negotiable conventions":

> URLs are legacy WordPress slugs and never change. `trailingSlash: true`. One dynamic route
> `app/location/[slug]/page.tsx`; the `site.pages` row decides city | service | redirect | 404.

There is no `/locations/minnesota/chimney-cleaning/` structure. There is no plan to create one. A
Minnesota city page lives at `/location/chimney-sweep-repair-in-anoka-mn/` on the new site because
that is where it lived on the old one. The route is the legacy slug.

So Plan 2 is not a candidate. **Plan 2 is the ground the project is already standing on.** The
question is not "which plan for all 262,535 URLs". It is "what happens to the URLs that Plan 2 cannot
serve, because no page exists for them on the new site".

That population is measured:

| What the audit found | URLs | Already handled by |
|---|---|---|
| Resolve to a real page at the same address | 87,881 | **Plan 2, done** |
| Approved redirect in the business map | 51,607 | Plan 1, but 31,799 land on a 404 |
| Approved retirement in the business map | 36,503 | Retire, done |
| **No page, no redirect, no decision** | **85,227** | **nothing, and this is the problem** |
| Withheld by the content gate | 1,317 | review |

The four plans are really being asked about the 85,227, plus the 31,799 broken redirects. Read
everything below with that in mind.

---

## 1. Plan 1: Redirect Legacy URLs to the Best Matching New URL

### What it means

Every old URL gets a 301 to a new URL under a redesigned structure. The old address stops existing
as a page and becomes a signpost.

```
/location/chimney-cleaning-minneapolis-mn/
                 ↓ 301
/locations/minnesota/chimney-cleaning/
```

### How the industry sees it

Google's own site-move documentation says to prepare a URL mapping from current URLs to their new
format, in a structured form of source, destination and redirect type, and to redirect straight to
the final destination rather than through chains. A 301 passes ranking authority to the new page and
tells search engines the old one is gone for good.

The critical caveat, from Google's John Mueller, is that a 301 only works as a 301 when there is a
one-to-one replacement. His words: "301-redirecting for 404s makes sense if you have 1:1 replacement
URLs, otherwise we'll probably see it as soft-404s and treat like a 404." A documented case study
found that redirects to less-relevant pages were treated as soft 404s and the redirected pages were
dropped from the index anyway.

So Plan 1 is only as good as the mapping behind it. A redirect to the wrong page is worth nothing,
and a redirect to the homepage is worth less than nothing because it costs a round trip and still
gets treated as a 404.

### Tested against Chimcare's data

Plan 1 as written, redesigning the URL structure, would **undo the settled decision** and turn
87,881 working pages into 87,881 redirects for no gain. The research is unambiguous that keeping a
working URL is lower risk than redirecting it. This is the strongest reason not to adopt Plan 1
wholesale.

Where Plan 1's mechanism does apply is to the 51,607 URLs the business has already put in a redirect
map. And here the data delivers a warning:

| Approved redirects | 51,607 |
|---|---|
| Target itself returns 404 | **31,799 (61.6%)** |
| of which target is an unresolved URL | 29,859 |
| of which target is a gate-withheld page | 1,166 |
| of which target is another redirect | 774 |
| Loops | 7 |
| Self-redirects | 6 |
| Cross-state targets | 72 |

Six of every ten approved redirects are the "bad redirect" this plan warns about. They exist, they
are approved, and they point nowhere. Any Plan 1 execution must validate every target returns 200
before publishing, which the repository does not yet do automatically.

### Pros, with Chimcare specifics

- Preserves the value of old links **when the target is genuinely equivalent**. Minnesota's 761 URLs
  that name a catalogue service and differ only in slug wording are the ideal case.
- Reduces 404s, provided the target is not itself a 404.
- Gives search engines a clear replacement.

### Cons, with Chimcare specifics

- **Contradicts the settled URL architecture.** The largest con, and specific to this project.
- Requires a mapping that has been validated. The current map fails that test for 31,799 entries.
- 105,220 URLs name a service the application does not model. There is **no relevant destination**
  for them until the business adds or retires those services. A redirect cannot be built for a page
  that does not exist.
- Thousands of URLs need classification. The audit has done that; the classification exists in
  `data/audits/whole-site-audit.sqlite`.
- Chains and loops must be avoided. Seven loops and 767 chains exist in the approved map today.

### Verdict

**Use the mechanism, not the plan.** 301s are the right tool for URLs that have a true one-to-one
replacement. Do not redesign the URL structure. Do not publish the existing redirect map until its
targets are validated.

---

## 2. Plan 2: Keep the Existing URLs Exactly as They Are

### What it means

The WordPress URL becomes the Next.js URL. Same path, same trailing slash, same everything. The
platform changes underneath; the address does not.

```
/location/apartment-chimney-services-becker-mn/
                  ↓ (nothing)
/location/apartment-chimney-services-becker-mn/
```

### How the industry sees it

The research is consistent. If a redesign keeps the same URLs and preserves headings, copy and
internal links, search engines have no reason to re-evaluate the pages. Moving platforms while keeping
the domain and URL structure is usually less risky than changing domain, templates, content and
URLs at the same time, because simultaneous changes make it impossible to isolate the cause of any
ranking drop.

### Tested against Chimcare's data

**This is what the project does.** And it does it well for the pages it can build. The evidence:

- 87,881 URLs resolve to a page at their original address site-wide, 2,864 in Minnesota.
- Validation check 2 asserts every published city page answers at its legacy URL and redirects the
  slashless form. 134 of 134.
- Validation check 15 asserts nothing was rewritten. 134 of 134.
- A live misspelling, `farmingon`, is preserved in the URL and the H1.

The plan's own warning is also confirmed. Keeping the old architecture keeps the old problems, and
the audits found every one the plan lists:

| The plan warns of | Found in Chimcare's source |
|---|---|
| Duplicate pages | 1,666 duplicate city pages; 4 Oregon slugs used by two posts each; one value in `_wp_old_slug` claimed by 75 pages |
| Thin pages | Not measured. No content-quality audit exists yet. Nobody should call them thin until it does |
| Outdated pages | 36,503 URLs the business has already retired |
| Bad naming | 985 slugs are LLM editing notes committed as URLs, some 190 characters long |
| Inconsistent patterns | Minnesota alone uses eight city-page slug forms; the builder recognised two |
| Orphan pages | 1,416 Minnesota URLs whose slug cannot resolve a city |
| Programmatically generated pages | Effectively all 229,617. The site is a service × city grid |
| Pages with little SEO value | Minnesota's 9,568 unresolved URLs earned 932 clicks in a year; 454 of them earned any |

**Plan 2 does not solve the legacy URL problem.** It solves the problem for pages the new site can
build, and leaves 85,227 URLs with no page to be kept at. That is the honest limit of it.

### Pros, with Chimcare specifics

- Lowest URL-change risk. Confirmed by both the research and the fact that 134 of 134 Minnesota
  pages validate at their original address.
- Existing backlinks remain valid.
- Search engines need discover nothing new.
- Rollback is trivial. WordPress is untouched and stays as the origin.
- Already built, already validated, already sealed as a baseline.

### Cons, with Chimcare specifics

- The old architecture is preserved, including a service × city grid of 208 services WordPress
  publishes against 92 the application models.
- 85,227 URLs cannot be kept because no page kind resolves them. They 404 today.
- Future restructuring, if ever wanted, would be a second migration.

### Verdict

**Already adopted. Correct. Not a complete answer on its own.** Every plan below is about what to do
with the URLs Plan 2 leaves behind.

---

## 3. Plan 3: Pattern-Based Redirects

### What it means

Instead of a hand-written table of thousands of rows, a parser reads each URL, extracts service,
city and state, validates each against a table of known values, and constructs the destination.

```
/location/chimney-cleaning-becker-mn/
        ↓ parse
service = chimney-cleaning · city = becker · state = mn
        ↓ validate against the database
destination exists?  →  YES: 301  ·  NO: manual review
```

### How the industry sees it

Pattern rules handle structurally identical URL groups far faster than one row per URL, but a regex
meant for one pattern can sweep up URLs it was never meant to touch. The guidance is to use pattern
rules only for structurally identical groups and to spot-check every match against the full
inventory before publishing.

### Tested against Chimcare's data

The pattern is real and the audit already runs it. `legacy_url_inventory` records a `url_pattern`
for every URL, and 262,271 of 262,535 resolve their state from the slug token. But the audit also
measured exactly where the pattern breaks, and this is the most useful thing it produced:

| Pattern assumption | What the data does |
|---|---|
| `{service}-in-{city}-{state}` | The standard form. California and Connecticut were built entirely on it and resolve at 97.3% and 94.6% |
| Same pattern everywhere | Minnesota uses eight city-page forms. Massachusetts uses four hand-authored forms, 17 with no state token at all |
| The state is at the end | 9,018 slugs carry WordPress's duplicate suffix (`…-il-2`); a strict `-XX$` test misfiles every one |
| The city is a city | 418 titles name a city that is also a state name (Wyoming MN, Delaware OH, Nevada City CA). Reading only after the last comma removes all of them |
| The slug is a URL | 985 slugs are editing notes (`…-is-not-correct-the-correct-is-…`). Their titles are clean |
| The service is in the catalogue | 105,220 URLs name a service the application does not model. The parser succeeds; the destination does not exist |

**The parser is not the bottleneck.** The whole-site audit classifies only **1,221 URLs, 0.7 percent**
of the non-linkable population, as engineering defects. The other 99.3 percent parse correctly and
have nowhere to go.

### The validation layer the plan describes already exists, in part

The plan asks for a service mapping table and a location mapping table. The audit database has both:

| Plan asks for | Exists as |
|---|---|
| Service mapping table | `services` table: 208 canonical services, each with `match_status` and, where it resolves, `application_catalogue_key` |
| Location mapping table | `cities` table: 2,920 state-city pairs, `UNIQUE(state_code, city_norm)` |
| Validated destination | `legacy_url_classification.destination_url` and `expected_http_status` |

What is missing is the step **after** classification: an approved, versioned redirect map generated
from those tables, validated for loops, chains and 200 targets, and published to the edge. That is
planned and not built.

### The plan's most important warning, confirmed

> Do NOT redirect purely based on string similarity.

The audit's service matcher was built on exactly this principle. It uses exact key match, a token
multiset match for word-order differences, and five explicitly recorded synonym pairs. **It never
uses substring or superset matching.** The worked example from the repository:

```
Fireplace Flue Installation     1,012 URLs
differs from "fireplace-installation" by the single token "flue"
→ POSSIBLE_MATCH, canonical_service_id = NULL, referred to a human
```

Installing a flue is not installing a fireplace. A superset rule would have sent 1,012 URLs to the
wrong page with high confidence. Thirty services sit in this one-token-away state, covering 32,411
URLs, every one held for a person rather than resolved by a rule.

This repository's own history has the counter-example. A first draft of the Minnesota catalogue
audit did treat a single superset as a match and produced exactly `fireplace-flue-installation →
fireplace-installation`. It was caught and reverted before the report was written, and the rule is
now recorded in project memory.

### Pros, with Chimcare specifics

- Handles the volume. 262,535 URLs were classified in one run.
- Deterministic and repeatable, if the generating script is on disk. **It currently is not**, which
  is the first item on the remediation list.
- Consistent: every URL carries one status and one reason, and none is `UNKNOWN`.
- Shrinks the redirect table to the exceptions.

### Cons, with Chimcare specifics

- Pattern assumptions were wrong for Minnesota's own slug forms until measured.
- A bad rule redirects thousands incorrectly. The superset near-miss above would have done exactly
  that.
- **Cannot manufacture a destination.** For 105,220 URLs the parse is perfect and the page does not
  exist. That is a business decision the parser cannot take.

### Verdict

**Essential, and mostly built.** The parse-and-validate layer exists in the audit. What it needs is
its generator recovered, its output turned into a validated redirect map, and a human deciding the
services.

---

## 4. Plan 4: Hybrid URL Migration

### What it means

Stop asking "how do we redirect everything" and ask "what should happen to every old URL". Every URL
is classified into one deliberate outcome, and the outcomes are different tools for different cases.

```
ALL LEGACY URLs
      │
      ↓ classify
 ┌────────┬──────────┬──────────┬──────────┐
 KEEP     REDIRECT   REVIEW     RETIRE
 200      301        manual     410
```

### How the industry sees it

This is the consensus position. Google's guidance is a structured mapping of source, destination and
type. The soft-404 research says redirect only to a true replacement. The retirement guidance says
genuinely gone content should return an honest signal and Google drops it naturally. The
keep-URLs research says do not change what works. Plan 4 is those four findings applied to four
populations instead of one rule applied to all.

### Tested against Chimcare's data

**The audit layer already implements this classification.** Every one of the 262,535 URLs carries a
`linkability_status`. The plan's categories map onto them directly:

| Plan 4 category | Audit status | URLs | Runtime |
|---|---|---|---|
| **A: KEEP** | `LINKABLE` | 87,581 | 200 at the same address |
| **B: EXACT REDIRECT** | `REDIRECT`, target returns 200 | 19,808 | 301 |
| **B, broken** | `REDIRECT`, target returns 404 | 31,799 | must be re-decided |
| **C: PATTERN REDIRECT** | `NO_DESTINATION`: state, city and catalogue service all resolve, no approved destination yet | 7,708 | none yet; the cheapest wins |
| **D: CONTENT-BASED** | `SERVICE_REVIEW`: service is one token from a catalogue key, or has no counterpart | 75,105 | none yet; business decision |
| **E: RETIRE** | `GONE` | 36,503 | 404 today, 410 planned |
| **UNCERTAIN, review** | `PARSER_FIX` + `CITY_REVIEW` + `OTHER_REVIEW` | 4,031 | engineering for 1,221, then human |

Two numbers in that table deserve attention.

**The 7,708 `NO_DESTINATION` URLs are the plan's Category C, ready to go.** State resolves, city
resolves, the service is in the catalogue, the target page can be built. They have no destination
only because nobody has approved the rule "service URL forwards to its city page". One decision
unlocks all 7,708.

**The 75,105 `SERVICE_REVIEW` URLs are Category D, and they are the bottleneck.** Content analysis
can establish that "Pellet Stove Repair in Monticello" means pellet stove repair in Monticello. It
cannot make the application have a pellet-stove-repair page. Seventy-two services with no
counterpart and thirty one-token-away services need a decision each: add the service, map it to an
existing one, or retire the URLs.

### The decision tree, with Chimcare's evidence attached

```
Legacy URL
   │
   ↓ Is it valuable?              ← traffic from keep-pages.json (unverified against GSC);
   │                                 MN's 9,568 unresolved earned 932 clicks/yr, 454 URLs earned any
   ├─ NO  → Retire (410)          ← 36,503 already decided by the business
   │
   ↓ Can we preserve it?
   ├─ YES → KEEP (200)            ← 87,581, already built and validated
   │
   ↓ Find replacement
   ├─ Exact match                 ← 19,808 approved redirects with a live target
   ├─ Pattern match               ← 7,708 NO_DESTINATION, one rule away
   └─ Content match               ← 75,105 SERVICE_REVIEW, business decision first
        │
        ↓ Confidence check
        ├─ HIGH → 301
        └─ LOW  → Manual review   ← 30 possible-match services, 4,031 review URLs
```

### Category E and the 410 question

The plan is right that some URLs should not exist and should not be redirected. Chimcare has 36,503
of them already decided. Two points the data adds:

- **30,635 of the 36,759 gone-map entries appear nowhere in `wp_posts`.** They were never live
  pages. A 410 for them is honest.
- **Today they return 404, not 410.** The edge layer that would answer 410 is planned. A 404 is
  acceptable in the interim; Google drops both, 410 just does it faster.

### Pros, with Chimcare specifics

- Complete coverage. Every URL has one deliberate outcome, and the audit proves it: zero `UNKNOWN`.
- The right tool per population. 87,581 kept, 19,808 forwarded, 36,503 retired, 7,708 waiting on one
  rule, 75,105 waiting on the business.
- Separates engineering from business. 1,221 URLs are code; 173,733 are decisions.
- Already largely computed. The classification exists on disk.

### Cons, with Chimcare specifics

- The classification is **not reproducible**. No script on disk generates it.
- The redirect map it would feed does not exist yet as a validated, versioned artefact.
- Category D depends entirely on business decisions that have not been taken.
- The "is it valuable" branch rests on click data from the business that has not been verified
  against Google Search Console.

### Verdict

**This is the plan.** It is the only one that gives every URL a deliberate outcome, and the audit
has already done most of the classification work. What remains is recovering the generator, building
the validated redirect map, and putting 102 service decisions in front of the business.

---

## 5. The Recommendation

### Adopt Plan 4, in this order of preference

**Priority 1: Keep every URL that resolves to a page.** Plan 2. Already done for 87,581 URLs. Do not
redirect a working URL to a new structure. The research says this is the lowest-risk option and the
sealed Minnesota baseline proves it works.

**Priority 2: Pattern-based redirects for the proven groups.** Plan 3. The 7,708 `NO_DESTINATION`
URLs are the first group: state, city and catalogue service all resolve. One approved rule,
"service URL forwards to its city page", and a validated map. Then the 761 Minnesota URLs and their
site-wide equivalents that name a catalogue service and fail only on slug wording; those are a parser
fix, not a redirect.

**Priority 3: Individual and content-based redirects for exceptions.** Plan 1's mechanism. The
19,808 approved redirects with live targets go out as-is once validated. The 31,799 with dead targets
go back to the business. The 4,031 review URLs get a person.

**Priority 4: Retire what has no replacement.** 36,503 already decided. Nothing gets a fake
destination to avoid a 404.

### What must happen before any of it is published

| Prerequisite | Status | Why |
|---|---|---|
| Recover the whole-site audit generator | **missing** | The classification cannot be re-run or extended |
| Validate every redirect target returns 200 | audit only, no test | 31,799 currently fail |
| Redirect-graph test: no loops, chains, self, cross-state | **missing** | 7 loops, 767 chains, 72 cross-state exist |
| Versioned, approved redirect map | **missing** | Rollback needs a previous version |
| Business decisions on 72 + 30 services | **not taken** | 105,220 URLs wait on them |
| Approval of the service-to-city forwarding rule | **not taken** | 7,708 URLs wait on it |
| Content-quality audit, for the "is it valuable" branch | **not implemented** | Nothing should be called thin without it |

### The principle, in the plan's own words, confirmed by the data

The objective is not "every old URL redirects". It is "every valuable old URL has the most relevant
possible destination, and URLs with no legitimate replacement are removed". The audit gives a
number to every branch of that sentence, and the number that dominates is 105,220 URLs whose most
relevant destination does not exist yet because the business has not said which services the new
site offers.

---

## 6. The URL Migration Matrix, With Real Chimcare Rows

The plan asks for a matrix proving every URL has a deliberate outcome. The audit database already
holds it for all 262,535. Real rows, in the plan's format:

| Legacy URL | Type | Decision | Destination | Method | Confidence |
|---|---|---|---|---|---|
| `/location/chimney-sweep-repair-in-anoka-mn/` | Valuable city page | **Keep** | Same URL | 200 | High, validated 15/15 |
| `/location/air-duct-cleaning-in-apple-valley-mn/` | Catalogue service page | **Keep** | Same URL | 200 | High |
| `/location/chimney-sweep-repair-in-minneapolis-mn/` | Duplicate of branch page | **Redirect** | `/location/chimney-sweep-fireplace-in-minneapolis-mn/` | 308 today, 301 planned | High, approved map |
| `/location/chimney-caps-repair-in-albertville-mn/` | Catalogue service, plural slug | **Parser fix** | Same URL once the parser reads plurals | 200 | High, 761 like it in MN |
| `/location/pellet-stove-repair-in-monticello-mn/` | New-service candidate | **Review** | TBD | Manual, business | Low until the service is decided |
| `/location/fireplace-flue-installation-in-…-mn/` | One token from a catalogue key | **Review** | TBD, **not** `fireplace-installation` | Manual, business | Low by rule |
| `/location/chimney-cap-repair-lonsdale-mn/` | Approved redirect, loops to itself | **Re-decide** | Currently itself; live page in production | — | Defect, our builder |
| `/location/chimney-sweep-maplewood-mn/` | Approved redirect to Oregon | **Re-decide** | `/location/chimney-sweep-portland-oregon/` | — | Cross-state, business |
| `/location/liners-sandia-mn/` | Misspelled city (Scandia) | **Parser fix** | Resolve city from title | 200 or 301 | High once the title is read |
| `/location/liners-sweep-repair-in-st-peter-mn-is-not-correct-…-so-it/` | Editing note as slug | **Parser fix** | Resolve from title "Liners (product) in St. Peter,MN" | 301 | High, 985 like it site-wide |
| `/location/chimney-caps-repair-in-bloomington-mn-2/` | In gone map | **Retire** | — | 404 today, 410 planned | High, approved |
| `/location/chimney-sweep-fireplace-in-st-paul-mn/` | Branch city, gate-withheld | **Review** | Same URL once the branch-page extractor is fixed | 200 | High, code fix |

Every row in the real matrix carries the same fields plus the evidence that produced the decision.
That is what makes it a matrix rather than a list of guesses.

---

## 7. Sources

- Google Search Central, [Site Moves and Migrations with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- Search Engine Journal, [Google Shares How 301 Redirects Pass PageRank](https://www.searchenginejournal.com/301-redirect-pagerank/275503/)
- GSQi, [301 Redirects To Less-Relevant Pages Are Seen As Soft 404s, case study](https://www.gsqi.com/marketing-blog/redirects-less-relevant-pages-soft-404s/)
- Stan Ventures, [404 Pages vs Redirects: What Google Recommends](https://www.stanventures.com/news/seo-404-pages-vs-redirects-google-6544/), quoting John Mueller on 1:1 replacements
- Shop Circle, [Why Redirecting 404s to Homepages Destroys SEO](https://shopcircle.co/blogs/news/redirecting-404-page-to-homepage-seo-danger)
- Bruce Clay, [URL Redirects Best Practices During a Site Migration](https://www.bruceclay.com/blog/url-redirects-best-practices-during-a-site-migration/)
- SEOParity, [Redirect Maps for Site Migrations: 301 vs 308](https://seoparity.com/blog/redirect-map-site-migration)
- Pagepro, [SEO CMS Migration Checklist 2026](https://pagepro.co/blog/cms-migration-seo/)
- Precis, [How to manage SEO during a website migration](https://www.precis.com/resources/how-to-manage-seo-during-a-website-migration)
- Urllo, [SEO migration guide: avoid ranking declines](https://www.urllo.com/resources/learn/how-website-migration-affects-seo)
- Siteimprove, [Manage redirects during a website migration](https://www.siteimprove.com/blog/manage-redirects-during-website-migration/)
- Hostney, [HTTP 410 Gone: what it means and when to use it](https://www.hostney.com/blog/http-410-gone-what-it-means-and-when-to-use-it)

Chimcare data: `reports/WHOLE_SITE_LINKABILITY_REPORT.md`, `reports/WHOLE_SITE_URL_RECONCILIATION.md`,
`data/audits/whole-site-audit.sqlite`, `data/audits/mn-url-audit.json`,
`reports/CHIMCARE_PRE_IMPLEMENTATION_MIGRATION_STRATEGY.md`.

**END OF DOCUMENT**
