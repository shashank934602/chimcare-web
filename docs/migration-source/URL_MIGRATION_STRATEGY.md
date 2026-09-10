# URL Migration Strategy

**Policy, implementation status, and audit findings for URL handling in the Chimcare
WordPress → Next.js migration.**

| | |
|---|---|
| Repository | `~/Desktop/chimcare/chimcare-web 2` |
| Written | 2026-09-05 |
| Companion to | [`MIGRATION_IMPLEMENTATION.md`](./MIGRATION_IMPLEMENTATION.md) §10 |
| Evidence | Repository inspection, read-only WordPress queries, and a full redirect audit executed 2026-09-05 |
| Status | Policy adopted. Parts implemented, parts not. Every clause is labelled below. |

---

## THE PRIMARY RULE

```
EXISTING WORDPRESS URL  →  PRESERVE THE SAME URL IN NEXT.JS
```

**The migration is not an opportunity to redesign the URL structure.** The default behaviour is
preservation. A different URL requires a documented, approved reason.

URLs are **source data**. They are treated with the same discipline as page content: copied exactly,
never regenerated, never "improved".

---

## HOW TO READ THIS DOCUMENT

| Label | Meaning |
|---|---|
| **POLICY** | The rule. Binding regardless of implementation state. |
| **IMPLEMENTED** | Code exists and enforces it. |
| **VERIFIED** | Implemented and confirmed by a command run on 2026-09-05, output quoted. |
| **NOT IMPLEMENTED** | The policy is adopted; the code does not exist yet. |
| **DEFECT** | Implemented incorrectly. Evidence given. |
| **REQUIRES APPROVAL** | Blocked on a human decision. |

---

## ⚠️ AUDIT FINDINGS — READ FIRST

A redirect audit was run against the current Minnesota dataset (6,803 redirect rows) on
2026-09-05, applying the tests this policy demands. **Three defects were found. None is safe to
publish.**

### Finding 1 — A redirect loop, introduced by our own builder — **DEFECT**

```
chimney-cap-repair-lonsdale-mn  →  /location/chimney-cap-repair-lonsdale-mn/   (itself)
```

**Root cause.** The business redirect map contains a legitimate entry:

```
/chimney-cap-repair-lonsdale-mn/   →   /location/chimney-cap-repair-lonsdale-mn/
```

That is a **root-level URL redirecting to the `/location/` URL** — two different paths.
`scripts/build-mn-seed.mjs` keys its redirect lookup by **last path segment only**
(`lastSeg()`), which collapses both sides to the identical key `chimney-cap-repair-lonsdale-mn`.
The result is a self-redirect.

**Two harms, not one:**
1. It creates an infinite redirect loop.
2. It **destroys a legitimate redirect** — the root-level URL now has no rule at all.

**Confirmed live:** `https://www.chimcare.com/location/chimney-cap-repair-lonsdale-mn/` returns
**HTTP 200**. It is a real, published WordPress page (post 142786) with no Yoast redirect. Our data
marks it `fate=redirect, status=retired`, which would take a working page off the site.

**Scope:** 6 entries across all states collapse this way (Minnesota 1; also Oregon, Ohio, and two in
Massachusetts). **This is our bug, not the business map's** — the business map contains zero
self-redirects.

**Status: OPEN DEFECT. Not fixed. Fix belongs in `build-mn-seed.mjs` (or in the agent when change B
lands): key redirects by full path, never by last segment.**

### Finding 2 — Cross-state redirects to a page that does not exist — **DEFECT (in the source data)**

```
chimney-chase-restoration-savage-mn   →  /location/chimney-sweep-portland-oregon/
chimney-fireplace-repair-carver-mn    →  /location/chimney-sweep-portland-oregon/
chimney-sweep-maplewood-mn            →  /location/chimney-sweep-portland-oregon/
```

Three **Minnesota** URLs redirect to an **Oregon** page. That target has no row in the Minnesota
page universe, so within this dataset the redirect leads nowhere.

**Scope:** 143 entries in the business redirect map point at that same Portland page.

This is precisely what §11 of this policy forbids: *"Do not redirect an old URL to the nearest city
merely because that page exists"* and *"No redirects to unrelated pages."* Savage, Minnesota and
Portland, Oregon are not the same business intent.

**Note:** for two of the three, the business map actually specifies a *sensible* Minnesota target
(`savage-chimney-rebuild-in-mn`, `fireplace-repair-savage-in-mn`); the Portland target appears to
come from a different rule winning. That discrepancy is unresolved.

**Status: OPEN. REQUIRES APPROVAL — the correct targets must be established with the business
before any of the 143 are activated.**

### Finding 3 — A redirect chain — **ACCEPTED, documented**

```
chimney-sweep-repair-in-maple-grove-mn-2
   → chimney-sweep-repair-in-maple-grove-mn
      → chimney-sweep-fireplace-in-maple-grove-mn
```

Two hops. The first is a `gone.json`-era duplicate, the second is our approved duplicate-city rule.
This is avoidable by flattening the chain to a single hop at publish time.

**Status: KNOWN. Flattening is PLANNED, not implemented.**

### Audit summary — **VERIFIED 2026-09-05**

| Test | Result |
|---|---|
| Redirect rows examined | 6,803 |
| Targets with no page row | **3** (all → the Oregon page) |
| Targets that are not published | 2 |
| Redirect chains | **1** (2 hops) |
| Redirect loops | **1** (self-redirect) |
| Self-redirects | **1** |
| Cross-state targets | **3** |

---

## 1. EXISTING WORDPRESS PAGE — SAME URL

**POLICY.** For every migrated page the Next.js route reproduces the existing public URL exactly.

```
WordPress:   /location/chimney-sweep-repair-in-boston-ma/
Next.js:     /location/chimney-sweep-repair-in-boston-ma/
```

### Fields extracted and preserved

| Field | Where it is stored | Status |
|---|---|---|
| WordPress post ID | `cities.legacyPostId`, `pages.legacyPostId` | **VERIFIED** |
| `post_name` (slug) | `cities.slug`, `pages.slug` | **VERIFIED** |
| Full URL | `pages.legacyUrl` | **IMPLEMENTED** |
| URL path | `/location/{slug}/`, derived from the slug | **VERIFIED** |
| Post type | Implicit — only `job_listing` is migrated | **IMPLEMENTED** |
| Post status | `pages.status` (published / review / retired) | **VERIFIED** |
| Old slugs | `_wp_old_slug` — **NOT EXTRACTED** (see §3) | **NOT IMPLEMENTED** |

### The prohibitions — all **VERIFIED as observed**

The system does not, anywhere: rename slugs · remove state suffixes · change city spelling ·
add or remove URL segments · normalise URLs · construct a "better" SEO URL.

**Evidence.** The slug is copied verbatim from `post_name` and is never derived from the title. Two
cases prove the discipline held under pressure:

- `chimney-sweep-repair-in-farmingon-mn` — a **misspelling of Farmington** that is live in
  WordPress. It was migrated with the misspelling intact and flagged `legacy_slug_typo`. It was not
  silently corrected, and the correctly-spelled Farmington page exists separately.
- Slug forms differ wildly between states (`quincy-chimney-sweep`, `amherst-oh-chimney-sweep`,
  `chimcare-chimney-sweep-in-boston-ma`). None is normalised toward a house style.

---

## 2. URL ROUTING IN NEXT.JS

**POLICY.** Routing is data-driven. No city page is hard-coded.

**IMPLEMENTED + VERIFIED.** One dynamic route serves every legacy URL:

```
app/location/[slug]/page.tsx
```

Legacy city URLs and legacy service URLs share the `/location/` prefix and **cannot be told apart by
pattern**, so the database row decides which template renders:

```
resolvePage(slug)  →  pages row
     fate = 'redirect'        →  permanentRedirect(redirectTo)
     status ≠ 'published'     →  notFound()
     kind = 'city'            →  <CityPage>      (+ gate re-check)
     kind = 'service'         →  <ServicePage>
     kind = 'legacy'          →  notFound()      (LegacyShell not built)
```

**Verification:** `grep` confirms no hard-coded city slug exists in any route file. The only slug
literals in the repository are inside test scripts.

### Trailing slashes — **VERIFIED**

`next.config.ts` sets `trailingSlash: true`. `/location/x` issues a 308 to `/location/x/`.
Validation check 2 asserts this on every published page.

---

## 3. OLD WORDPRESS SLUGS (`_wp_old_slug`)

**POLICY.** `_wp_old_slug` values must be extracted and preserved, not discarded. Each becomes a
redirect **audit record** requiring approval before activation.

### Current state — **NOT IMPLEMENTED**

The agent does **not** read `_wp_old_slug`. There is no redirect audit table and no redirect ledger.

### Why the naive implementation would be dangerous — **VERIFIED**

```
_wp_old_slug rows on the 134 Minnesota city pages     147
distinct old-slug values                               30
already covered by the business redirect map           12
```

The values are **not former URLs of those pages**. They are **page-duplication artifacts**:
Minnesota pages were created by copying Massachusetts pages, and WordPress recorded the source
page's slug.

| Current page | Recorded `_wp_old_slug` |
|---|---|
| `chimney-sweep-fireplace-in-eden-prairie-mn` | `chimcare-chimney-sweep-in-boston-ma` |
| `chimney-sweep-fireplace-in-edina-mn` | `chimcare-chimney-sweep-in-boston-ma` |
| `chimney-sweep-fireplace-in-lake-elmo-mn` | `chimcare-chimney-sweep-in-boston-ma` |

**The mapping is many-to-many and severely ambiguous:**

```
chimcare-chimney-sweep-in-boston-ma               claimed by 75 pages
worcester-chimney-sweep-copy                      claimed by 59 pages
chimney-sweep-fireplace-services-in-lee-ma-copy   claimed by 58 pages
```

**Live behaviour today (verified against production):**

```
/location/chimcare-chimney-sweep-in-boston-ma/  →  301  →  /location/chimney-sweep-repair-in-boston-ma/
/location/worcester-chimney-sweep-copy/         →  301  →  /location/chimney-sweep-fireplace-services-in-lee-ma/
```

WordPress resolves these correctly. A mechanical rule reading our extract could not: one old slug
maps to 75 current pages, and choosing wrongly would send a Massachusetts URL to a Minnesota page.

### Required audit record shape — **POLICY, NOT IMPLEMENTED**

```
old_url            /location/chimcare-chimney-sweep-in-boston-ma/
old_slug           chimcare-chimney-sweep-in-boston-ma
source_wp_post_id  90776
target_url         /location/chimney-sweep-repair-in-boston-ma/
redirect_decision  approve | reject | needs_review
redirect_status    proposed | approved | active | rejected
reason             free text — why this target is semantically equivalent
provenance         wp_old_slug | business_map | wordpress_yoast | duplicate_rule
```

**Status: REQUIRES APPROVAL.** No `_wp_old_slug` redirect may be created until a disambiguation
rule exists and is signed off.

---

## 4. 301 REDIRECTS

**POLICY.** An old URL redirects to the correct **canonical** URL for the same page and the same
business intent. **Never** to the nearest page merely because that page exists.

### Current implementation — **IMPLEMENTED, partial**

| Aspect | State |
|---|---|
| Redirect data | `pages.fate = 'redirect'` + `pages.redirectTo` — **VERIFIED**, 6,803 rows |
| In-app execution | `permanentRedirect()` in the dispatcher — **VERIFIED** (issues 308 in dev) |
| Edge execution (true 301) | Cloudflare Worker + KV — **NOT IMPLEMENTED** (architecture M6) |
| Approval workflow | **NOT IMPLEMENTED** — redirects come straight from the business map |
| Semantic-equivalence check | **NOT IMPLEMENTED** — see Finding 2 |

### 308 vs 301

The in-app fallback issues **308 Permanent Redirect** (Next.js `permanentRedirect()`), not 301. Both
are permanent and both preserve link equity; 308 additionally preserves the HTTP method. Production
intent per the architecture document is a **301 from the edge Worker**, with the in-app redirect as
the miss path.

**Status: acceptable in development. The 301-at-edge behaviour is NOT IMPLEMENTED and NOT VERIFIED.**

---

## 5. DUPLICATE CITY URLS

**POLICY.** Handled by an **explicit, state-specific rule**. Never by assuming similar slugs are
duplicates.

### Minnesota — **IMPLEMENTED + VERIFIED**

Three coverage-style pages duplicate a branch city and redirect to the branch page:

```
chimney-sweep-repair-in-maple-grove-mn    →  chimney-sweep-fireplace-in-maple-grove-mn
chimney-sweep-repair-in-apple-valley-mn   →  chimney-sweep-fireplace-in-apple-valley-mn
chimney-sweep-repair-in-eagan-mn          →  chimney-sweep-fireplace-in-eagan-mn
```

The rule is **structural, not fuzzy**: a page qualifies only when its slug matches the coverage
pattern *and* its extracted city suffix exactly equals a known branch city suffix. No string
similarity, no distance metric, no guessing.

A fourth (`chimney-sweep-repair-in-minneapolis-mn`) was already a redirect in the business map and
is honoured as-is rather than duplicated.

### Massachusetts — **PLAN ONLY**

17 coverage-style duplicates of branch cities identified. 6 are already redirects in the business
map; 11 would be new. **REQUIRES APPROVAL** (decision D5).

---

## 6. NO-SOURCE CITIES

**POLICY.** A city on a business or service-area list with **no WordPress city page**:

```
✗ do not automatically create a page
✗ do not automatically redirect it to another city
✗ do not invent a URL
✗ do not point it to the nearest branch without explicit approval
✓ keep it as a coverage / service-only record, marked appropriately
```

### Minnesota — **IMPLEMENTED + VERIFIED**

**16 cities** have service pages but no city page: Andover, Becker, Crystal, Delano, Dellwood,
Grant, Hilltop, Hugo, Lindström, Lonsdale, Mayer, Rogers, Shafer, Stacy, Waverly, Zimmerman.

Each is stored as a `cities` row with `sourceStatus = 'NO_SOURCE_PAGE'` and a
`no_source_city_page` flag. **No `pages` row is created**, so no URL exists.

**Verified 2026-09-05:**
```
no-source cities uncreated   16/16
```
Both `/location/{slug}/` and `/admin/preview/{slug}/` return 404 for all 16.

**Why a city row exists at all:** those cities have live *service* pages that need a city to belong
to. Deleting the row would break service pages that resolve today.

**Known presentation defect:** these 16 currently appear on the state hub labelled "Page in review",
which is wrong — nothing is under review because no page exists.
See `MIGRATION_IMPLEMENTATION.md` §12.3.2. **REQUIRES APPROVAL.**

---

## 7. STATE HUB URLS

**POLICY.** State-level URLs are preserved or **explicitly** redirected. Not changed because the new
route looks cleaner.

### Current state — **KNOWN GAP, NOT IMPLEMENTED**

| | URL |
|---|---|
| WordPress today | `/locations/chimcare-locations-in-minnesota/` |
| New site | `/locations/mn/` |
| Redirect between them | **none — the legacy URL 404s** |

**29 legacy `/locations/*` URLs** exist in the business fate maps, including per-state pages for
Washington, Oregon, Ohio, California and Massachusetts, plus a `showrooms` family and a
`kansan-locations` slug that is itself misspelled.

**They are invisible to the agent by design:** they are WordPress taxonomy archives, not
`job_listing` posts, and the agent only reads `job_listing`. All 29 record zero clicks, so no
traffic signal flagged them.

### The blocking decision — **REQUIRES APPROVAL**

The state slug is undecided (Q2b): `/locations/mn/` versus `/locations/minnesota/`. The redirect
target cannot be written until that is settled. Once settled:

```
/locations/chimcare-locations-in-minnesota/       →  301  →  /locations/{approved-slug}/
/locations/chimcare-locations-in-massachusetts/   →  301  →  /locations/{approved-slug}/
…and 27 more
```

**One important observation.** The live Minnesota state page returns 200 but links to **zero** city
pages — it is an empty taxonomy archive. The live national hub links to five state pages and 95
individual city pages, and **includes no Minnesota city links at all**. So today none of
Minnesota's 134 city pages is reachable by browsing; they are found only through search. The new
hierarchy is an improvement, not a regression — but the legacy URLs still need destinations.

---

## 8. URL UNIVERSE

**POLICY.** Account for the complete legacy URL universe, not only visible city pages: current
URLs, old slugs, redirects, service URLs, legacy URLs, gone URLs, duplicate URLs, state URLs,
location URLs.

### Minnesota — **VERIFIED 2026-09-05**

**20,479 rows** in `site.pages`:

| Kind | Rows | | Fate | Rows | | Status | Rows |
|---|---|---|---|---|---|---|---|
| legacy | 16,077 | | publish_verbatim | 7,189 | | published | 12,457 |
| service | 4,251 | | redirect | 6,803 | | retired | 8,022 |
| city | 151 | | regenerate | 5,268 | | | |
| | | | gone | 1,219 | | | |

**Coverage gaps in that universe — all NOT IMPLEMENTED:**

| Missing | Count | Note |
|---|---|---|
| `_wp_old_slug` redirects | 147 rows / 30 distinct | §3 |
| Legacy `/locations/*` URLs | 29 | §7 |
| Root-level redirects | ≥1 lost to key collapse | Finding 1 |

### Massachusetts — **NOT VERIFIED, survey figure only**

**~35,247** live legacy URLs ending in `-ma`. This is a raw count from a read-only survey. It has
**not** been reconciled into a page universe, and it **excludes** the 17 hand-authored pages whose
slugs carry no state suffix (`quincy-chimney-sweep`). The true universe is larger.

**Both figures must be re-derived during implementation, not carried forward from this document.**

---

## 9. URL VALIDATION

**POLICY.** Before publishing, verify for every migrated page that the WordPress source URL equals
the Next.js target URL, unless an approved redirect says otherwise.

### What is tested today — **VERIFIED 2026-09-05**

| Test | Where | Status |
|---|---|---|
| HTTP status | validation check 1 | ✅ 134/134 |
| URL path parity | validation check 2 | ✅ 134/134 |
| Trailing-slash behaviour | validation check 2 (slashless → 301/308) | ✅ 134/134 |
| Canonical is the legacy URL | validation check 7 | ✅ 134/134 |
| Internal links all resolve | validation check 12 | ✅ 134/134 |
| No unexpected 404s | `check-pages.mjs` route matrix | ✅ passed |
| Redirect target correctness | `check-pages.mjs`, sampled | ✅ 2 cases |
| Duplicate handling | `check-pages.mjs` | ✅ verified |

### What is **not** tested — **NOT IMPLEMENTED**

| Missing test | Consequence |
|---|---|
| **Redirect loop detection** | Finding 1 went undetected until this audit |
| **Redirect chain detection** | Finding 3 went undetected |
| **Redirect target existence, all rows** | Finding 2 went undetected |
| **Semantic equivalence of target** | Cross-state redirects would ship |
| **Full-universe sweep** (all 20,479) | Only the 134 city pages are swept |
| **Old-URL coverage** | `_wp_old_slug` is not extracted |

**The audit at the top of this document is the first time these ran.** They must become part of the
standing harness before any redirect is activated.

---

## 10. REDIRECT IMPLEMENTATION

**POLICY.** Redirects are managed **centrally**, from the migration redirect dataset, never scattered
through page components. The consuming layer (Cloudflare, Next.js config, or the host) reads one
approved map.

### Current state

| Aspect | State |
|---|---|
| Central data | `pages` table, `fate` + `redirectTo` — **IMPLEMENTED** |
| Scattered redirects in components | **none — VERIFIED**, the only redirect call is in the dispatcher |
| Approved-redirect map artifact | **NOT IMPLEMENTED** |
| Edge consumption | **NOT IMPLEMENTED** |

### The five URL types — **POLICY**

These must never be conflated. Current storage:

| Type | Meaning | Stored as |
|---|---|---|
| **SOURCE URL** | The URL WordPress serves today | `pages.legacyUrl` / `pages.slug` |
| **CANONICAL URL** | The one true URL for the content | emitted in `<link rel="canonical">`; equals the source URL |
| **TARGET URL** | Where a redirect points | `pages.redirectTo` |
| **REDIRECT URL** | The URL that *is* a redirect (the source side) | `pages.slug` where `fate='redirect'` |
| **ROUTE URL** | The Next.js route pattern | `/location/[slug]/` |

**A route is not a redirect.** Finding 1 is exactly this confusion: keying a redirect by its last
path segment treated two distinct source URLs as one route identity.

---

## 11. URL SAFETY RULE

**POLICY.** Before activating any redirect:

```
SOURCE URL
    ↓  identify the original WordPress page
    ↓  identify the intended destination
    ↓  verify semantic equivalence  ← the step that catches Finding 2
    ↓  approve
    ↓  activate 301
    ↓  test
```

**If the destination cannot be confidently determined: DO NOT REDIRECT. Flag it for review.**

### How this rule is currently honoured

| Case | Handling |
|---|---|
| `_wp_old_slug` (147 rows) | **Not redirected.** Destination is ambiguous (one slug → 75 pages). Flagged. ✅ |
| Rejected geocodes (3 cities) | Coordinates **dropped, not guessed**. Two cities left with no serving branch rather than a wrong one. ✅ |
| No-source cities (16) | **Not redirected** to a nearby city. ✅ |
| `farmingon` typo | **Not redirected** to Farmington. Flagged, decision pending. ✅ |
| Cross-state → Portland (3) | ❌ **Present in the dataset.** Would violate the rule if published. See Finding 2. |

**Status: the rule is followed everywhere except the three cross-state redirects inherited from the
business map, which are now flagged and REQUIRE APPROVAL.**

---

## 12. FINAL URL PRINCIPLE

**PRESERVE EXISTING URL.** Only use a different URL with a documented, approved reason.

Every URL change must record:

```
source URL · destination URL · reason · redirect type · approval status · validation result
```

**Current state: PARTIAL.** `pages` stores source, destination and redirect type. It does **not**
store reason, approval status or validation result. Those three fields are what make the URL
migration auditable and reversible, and they are **NOT IMPLEMENTED**.

---

## IMPLEMENTATION BACKLOG

Derived from the gaps above, in dependency order. **None is started.**

| # | Item | Blocks | Priority |
|---|---|---|---|
| U1 | **Fix the last-segment key collapse** in the redirect builder. Key by full path. | Publishing any redirect | **Critical — active defect** |
| U2 | **Add loop, chain, self-redirect and target-existence tests** to the standing harness | Publishing any redirect | **Critical** |
| U3 | **Resolve the 3 cross-state redirects** (and the 143 pointing at the Portland page) with the business | Publishing | **Critical — REQUIRES APPROVAL** |
| U4 | **Extend `pages`** with `redirect_reason`, `redirect_approval_status`, `redirect_provenance`, `validated_at` | Auditability | High |
| U5 | **Extract `_wp_old_slug`** into audit records, unactivated, with a disambiguation rule | Old-URL coverage | High — **REQUIRES APPROVAL** |
| U6 | **Decide the state slug (Q2b)**, then add the 29 `/locations/*` redirects | State hub URLs | High — **REQUIRES APPROVAL** |
| U7 | **Flatten redirect chains** to a single hop at publish time | SEO quality | Medium |
| U8 | **Full-universe URL sweep** across all 20,479 rows, not just the 134 city pages | Confidence | Medium |
| U9 | **Export an approved redirect map** for the edge layer | Deployment | Medium |
| U10 | **Move 308 → true 301** at the edge | Production correctness | Medium |

---

## COMMANDS

```bash
# The URL checks that exist today (server must be running)
node scripts/validate-render.mjs http://localhost:3000     # checks 1, 2, 7, 12
node scripts/check-pages.mjs      http://localhost:3000     # route matrix incl. redirects and gone

# The redirect audit in this document is not yet a script.
# It was run ad hoc against data/seed/minnesota.generated.json on 2026-09-05.
# Making it a standing check is backlog item U2.
```

---

## RELATED DOCUMENTS

| Document | Covers |
|---|---|
| [`MIGRATION_IMPLEMENTATION.md`](./MIGRATION_IMPLEMENTATION.md) | The whole migration. §10 is URLs; this document expands it |
| `docs/architecture.md` | Target architecture, edge Worker, KV redirect design |
| `CLAUDE.md` | Working conventions, including "URLs are legacy WordPress slugs and never change" |

---

**END OF DOCUMENT**

*Audit findings were produced by executing the tests this policy specifies against the current
Minnesota dataset on 2026-09-05. The three defects are open and none has been fixed, in keeping with
the instruction to document rather than modify.*
