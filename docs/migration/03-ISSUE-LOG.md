# Chimcare Migration — Issue Log

Statuses are changed only against evidence produced in a run, and the run is named. Historical text
is never deleted; a status change is appended under `Update`.

## ISSUE-001 — Multiple application trees

Status: RESOLVED (2026-09-10, step 0)
Severity: HIGH
Phase: Foundation

Problem:
Multiple recovered application trees contain different versions
of the application and migration code.

Impact:
Unclear canonical implementation baseline.

Resolution:
Use the 4 Sep application tree as the application baseline and
the 9 Sep migration/schema/admin/audit work as the migration baseline.

Evidence:
URL_MIGRATION_IMPLEMENTATION_SPEC.md

Update — 2026-09-10, step 0:
Five trees were found, not three. Measured by whole-tree SHA-1:
`~/Desktop/Chimcare 2/chimcare-web` and `~/Downloads/chimcare-web` are byte-identical to each other
and are an earlier snapshot of `~/Downloads/chimcare-web 2`; `~/Desktop/Chimcare 2/chimcare-web 2` is
that same tree plus the Sprite.tsx/sprite.ts rename. So there is one application tree in four
snapshots and one migration tree.

One canonical tree now exists at `~/Desktop/chimcare/chimcare-web`. It typechecks and builds.
All 16 overlapping files were resolved individually; see docs/migration/STEP-0-BASELINE-AUDIT.md §3.
Both source trees remain on disk untouched as archives.

---

## ISSUE-002 — Contaminated recovered files

Status: RESOLVED (2026-09-10, step 0) — was previously marked RESOLVED without evidence; see Update
Severity: HIGH
Phase: Foundation

Problem:
Several recovered files contained `===== path =====` banners.

Impact:
Files were not clean/buildable source files.

Resolution:
Remove recovery banners and reconstruct clean files.

Update — 2026-09-10, step 0:
The banners were still present when this run began, so the earlier RESOLVED status was not supported
by evidence. Two findings beyond the six files the specification lists:

1. `lib/db/client.ts` is contaminated and is not in the specification's table. It carries
   `=== schema.ts (     263 lines) ===` on L1, three orphan lines of `schema.ts` with their original
   line numbers, and `=== client.ts ===` on L5.
2. `scripts/migrate/source.mjs` carries nine contaminated lines, not one. L1–L8 are a `wc -l` listing
   of the recovery dump; only L9 is the `===== source.mjs =====` banner the specification records.
   L1–L8 sit outside the comment block and are a hard SyntaxError — the migration agent could not
   start until they were removed.

The canonical tree is now clean: a regex sweep for all four banner forms across `app/`, `lib/`,
`components/`, `scripts/`, `data/seed/` and `styles/` returns nothing, `node --check` passes on all
20 `.mjs` files, and `tsc --noEmit` is clean.

---

## ISSUE-003 — Missing generated datasets

Status: PARTIALLY RESOLVED (2026-09-10, step 0)
Severity: MEDIUM
Phase: Audit

Problem:
Some generated Minnesota datasets were missing.

Impact:
Migration cannot rely on those generated artifacts.

Resolution:
Regenerate from the available source inputs.

Update — 2026-09-10, step 0:
Regenerated and verified against the sealed baseline: `minnesota.generated.json` (20,479 URLs),
`mn-geocode.json` (135 entries), `minnesota.faq.json` (642 pairs on the 134 migrated pages) and
`minnesota.media.json` with `public/uploads/` (15 assets, 15 byte-verified, 0 problems).
`build-mn-seed.mjs` is deterministic apart from its `generatedAt` stamp.

Still missing: `mn.migration.json` and `mn.ledger.json`. The agent runs but does not reproduce the
sealed gate counts, so nothing was written. Tracked as ISSUE-015.

---

## ISSUE-004 — Production redirects differ from fate maps

Status: OPEN
Severity: CRITICAL
Phase: URL migration

Problem:
Existing migration fate maps do not always match production.

Observed:
11 of 26 sampled live map-vs-production conflicts disagreed.

Rule:
Production behavior wins at cutover.

---

## ISSUE-005 — Legacy URLs outside /location/

Status: OPEN
Severity: HIGH
Phase: Routing

Problem:
397 URLs exist outside the `/location/` route structure.

Impact:
A slug-only lookup cannot represent these URLs.

Required:
Full-path URL lookup.

---

## ISSUE-006 — Current dispatcher cannot preserve legacy behavior

Status: OPEN
Severity: HIGH
Phase: Routing

Problem:
Current dispatcher treats legacy pages as notFound and migration
redirects as Next.js permanentRedirect().

Impact:
This does not reproduce production behavior exactly.

Required:
Separate production HTTP behavior from future migration decisions.

Update — 2026-09-10, step 0:
Confirmed by reading the canonical dispatcher, `app/location/[slug]/page.tsx`: `kind === 'legacy'`
reaches `notFound()` and `fate === 'redirect'` reaches `permanentRedirect()`. Unchanged in this step
by design — Step 0 does not touch routing.

---

## ISSUE-007 — 301 vs 308

Status: OPEN
Severity: HIGH

Problem:
Production uses 301 redirects while current application behavior
can produce 308.

Required:
Preserve the production status at the edge.

---

## ISSUE-008 — Weak admin authentication

Status: OPEN
Severity: CRITICAL

Problem:
Current admin authentication uses a query-token approach.

Required:
Authenticated admin access according to the implementation spec.

Update — 2026-09-10, step 0:
Confirmed in the canonical tree and now worse than recorded: `/admin/migration`, `/admin/preview` and
`/admin/bookings` all compare `?token=` against `ADMIN_TOKEN`, and each skips the check entirely when
`NODE_ENV !== 'production'`. All three routes are reachable in the build produced by this step. No
change made here; Step 0 does not deploy anything, and this is on the critical path before any admin
route is exposed.

---

## ISSUE-009 — Service catalogue incomplete

Status: OPEN
Severity: HIGH

Problem:
Current catalogue contains 92 services, while the legacy URL universe
contains 4,207 distinct service phrases.

Impact:
92 services cannot represent the entire legacy service universe.

Required:
Business validation of an expanded service catalogue.

Update — 2026-09-10, step 0:
No catalogue decision was taken and none is implied by this step. `data/seed/services.ts` (92
services) is carried over unchanged, and the Minnesota dataset continues to seed live URLs whose
service is outside the 92 as `kind = 'legacy'`. The data needed for the business decision is
preserved intact in `data/audits/url-universe/` — `legacy-service-universe.csv`,
`unmodelled-live-services.csv`, `service-model-gap.csv`, `service-expansion-tiers.csv` and
`new-service-catalogue.csv` are all in the canonical tree.

---

## ISSUE-010 — Service phrase matching risk

Status: OPEN
Severity: HIGH

Problem:
Substring matching can incorrectly classify services.

Example:
fireplace-flue-installation
must not automatically become
fireplace-installation.

Required:
Exact/token-based matching rules.

---

## ISSUE-011 — Malformed WordPress content

Status: OPEN
Severity: MEDIUM

Problem:
33,740 live pages contain malformed WPBakery closing markup.

Required:
Keep source immutable; perform only render-time cleanup.

---

## ISSUE-012 — Shared template gaps

Status: RESOLVED (2026-09-10, step 1)
Severity: MEDIUM

Problem:
The mock designs contain UI elements not yet represented in the app.

Examples:
- floating CTA cluster
- header trust elements
- City service drawer
- map toggle
- load-more controls
- state directory controls

Required:
Implement shared/template-level behavior rather than page-specific components.

Update — 2026-09-10, step 1: RESOLVED.
All six named elements are implemented as shared components, none inside a page template:
floating CTA cluster (`components/chrome/FloatingCta.tsx`, on all five templates), header trust
elements (BBB badge, icon call button, "Fast Online Booking" CTA — `components/chrome/Header.tsx`,
each an optional prop rendered only from a real asset), city service drawer
(`components/islands/ServiceDrawer.tsx`), map toggle (`components/islands/MapPanel.tsx`), load-more
controls (state cards, city directory, solutions grid) and state directory controls
(`components/islands/StateDirectory.tsx`). Verified by 43 interaction checks in
`scripts/test/interactions.mjs`. Status: RESOLVED.

Update — 2026-09-10, step 0:
Partly addressed as an input, not as an implementation. The 9 Sep tree's directory and search islands
(`components/islands/{HeroSearch,LocationDirectory,locationSearch}`, `lib/content/search.ts`,
`styles/directory.css`) are in the canonical tree and typecheck, so the template phase starts with
them rather than rebuilding them. The three design mocks `port-css.mjs` needs, which `CLAUDE.md` says
are missing, were found in the 9 Sep tree and are now at `design-mocks/`.

Not addressed: floating CTA cluster, header trust elements, city service drawer, map toggle,
load-more controls, state directory controls. No template work was done in this step.
---

## ISSUE-013 — Two authoritative versions of StateHub.tsx

Status: RESOLVED (2026-09-10, step 1)
Severity: MEDIUM
Phase: Template foundation
Raised: 2026-09-10, step 0

Problem:
`components/templates/StateHub.tsx` exists in both trees and the two conflict materially. The 4 Sep
version renders the hero search and the location card grid as inline markup. The 9 Sep version is a
later refactor of the same file with that markup extracted into `HeroSearch` and `LocationDirectory`
islands plus `styles/directory.css`.

Why it was not decided:
The 9 Sep version cannot be adopted without changing its call site. Its signature is
`StateHubProps & { query: string; stateSlug: string }` and `app/locations/[state]/page.tsx`, which is
the only route that renders it, passes neither. That is template work, and Step 0 is not the template
phase. The implementation specification §3 independently assigns this file to the 4 Sep tree.

Current treatment:
The 4 Sep version is canonical for the Step 0 baseline because it builds and its call site is
correct. The 9 Sep version is preserved verbatim at
`_archive/9sep-deferred-to-template-phase/StateHub.tsx`. All of its dependencies are already in the
canonical tree and typecheck.

Resolution required:
The template phase decides. Adopting the refactor is a two-file change: pass `query` and `stateSlug`
from the route, and swap the import.

Blocks the pilot: no.

Update — 2026-09-10, step 1: RESOLVED.
The 9 September island refactor was adopted, as the two-file change predicted: `StateHub` now takes
`StateHubProps & { query?, stateSlug }` and renders `HeroSearch` and `LocationDirectory`, and
`app/locations/[state]/page.tsx` passes `?q=` and the slug. `MapPanel` was added alongside them for
the map toggle the earlier version had no equivalent of. The 4 September inline markup is gone from
the template; the archived copy at `_archive/9sep-deferred-to-template-phase/StateHub.tsx` is now
redundant and is kept only as provenance.

---

## ISSUE-014 — No version control on any tree

Status: RESOLVED (2026-09-10, step 0)
Severity: HIGH
Phase: Foundation
Raised: 2026-09-10, step 0

Problem:
Neither `~/Desktop/chimcare` nor any of the five application trees was a git repository. There was no
commit history, no way to diff a change against a known state, and no hash to name as a baseline.
This is the direct cause of ISSUE-001 and ISSUE-002: files were recovered from a dump because there
was no repository to recover them from.

Resolution:
`git init` in the canonical tree only, with the baseline committed. Large frozen inputs
(`data/audits/`, 501 MB), regenerable datasets (`data/seed/*.json`), recovered binaries
(`public/uploads/`) and the Search Console export (`data/inputs/`) are `.gitignore`d and their
SHA-256 hashes are recorded in `docs/migration/runs/2026-09-10-step-0.md` instead.

Remaining:
No remote is configured. The repository exists on one machine only, which is the same single point of
failure that produced this issue. Pushing it somewhere is a decision for the owner.

---

## ISSUE-015 — The migration agent cannot reproduce the sealed gate counts

Status: OPEN
Severity: HIGH
Phase: Audit / extraction
Raised: 2026-09-10, step 0

Problem:
`scripts/migrate/agent.mjs --state mn --dry-run --no-render` runs to completion against the live
WordPress database but does not reproduce the sealed publication counts.

| Measure | Sealed | Agent, this run | Difference |
| --- | --- | --- | --- |
| pages discovered | 137 | 137 | 0 |
| pages migrated | 134 | 134 | 0 |
| hero assets | 15 | 15 | 0 |
| branches mapped | 14 | 11 | −3 |
| publishable | 109 | 0 | −109 |
| needs_review | 25 | 134 | +109 |
| review flags | 454 | 434 | −20 |

Extraction itself is correct: the same 137 pages, the same 134 migrated, the same 15 byte-verified
assets, 0 source changes, 0 content checksum changes, 0 media checksum changes, 0 SEO differences and
0 URL differences. Only the derived branch assignment, and therefore the gate, disagrees.

Two independent root causes were isolated, both mechanical:

**1. City-name parse, costing all 109 publishable pages.**
`agent.mjs:112` derives the city name with `/in (.*), \w\w$/` against the WordPress title, which
requires a space after the comma. 120 of the 134 Minnesota titles are written `City,MN` with no
space — for example `Chimney Sweep & Repair in Afton,MN`. Exactly the 14 branch pages match, because
only they use the `… Services in Apple Valley, MN` form. For the other 120 the name falls back to the
lowercase slug suffix (`afton`), which never matches `mn-geocode.json`, whose keys are display names
(`Afton`). With no coordinate there is no nearest branch, so all 120 raise `no_serving_branch`, fail
the gate on "serving branch" and land in needs_review. The count of failures is exactly 120, matching
the count of non-conforming titles.

**2. ZIP parse, costing 3 branches.**
`agent.mjs:80` finds a branch with
`branchesJson.find((x) => x.street_address.startsWith(num + ' ') && x.zip === zip)` where
`zip = /\b(\d{5})\b/.exec(loc)?.[1]`. When the street number is itself five digits the regex returns
the street number, not the ZIP. The three affected branches are Apple Valley (14870 Granada Ave),
Lakeville (20731 Holyoke Ave) and Maple Grove (11670 Fountains Dr). `branches.json` holds all 14
Minnesota branches correctly; the matcher discards 3.

What was NOT done, deliberately:
- The sealed baseline in `reports/PROJECT_CONTEXT_HANDOFF.md` §4 was not edited.
- `--apply` was not run, so no `mn.migration.json` or `mn.ledger.json` was written. Writing a dataset
  showing 0 publishable would contradict the seal and would be read later as fact.
- The agent was not patched. Both fixes change migration output, and the implementation specification
  §3 classes agent repairs as work off the cutover path.

Resolution required:
Fix both parses, re-run `--dry-run`, and confirm 109/25/454 before running `--apply`. If the counts
still differ after the fixes, the seal itself needs re-deriving and that must be an explicit decision.

Blocks the pilot: not the 100-URL pilot as specified, which renders real source content through
templates and does not depend on the gate. It does block any use of the agent as a publication gate,
and it blocks `mn.migration.json` from existing.

---

## ISSUE-016 — build-mn-seed.mjs is older than the file that consumes it

Status: OPEN
Severity: MEDIUM
Phase: Audit / extraction
Raised: 2026-09-10, step 0

Problem:
`data/seed/minnesota.ts` declares a `GeneratedSeed` type whose city rows carry `sourceStatus`,
`reviewFlags`, `legacyPricingCopy` and `legacyThumbnailId`. The `build-mn-seed.mjs` on disk emits
none of those four fields. Measured on the freshly generated file: 0 of 150 city rows have a
`reviewFlags` key, and 0 have a non-null `legacyThumbnailId`.

Separately, `agent.mjs --regress` compares its output against the same file on `faqs`, `hero.sha256`
and `hero.imageKey`, none of which the generator emits either.

Impact:
`citySeed` reads `c.reviewFlags` and `c.legacyThumbnailId` as `undefined` at runtime while TypeScript
believes they are present, so every seeded city gets an empty flag list and a null thumbnail. The
sealed 454 flags and 15 thumbnails cannot come through this path. `--regress` cannot pass against
this file.

The URL universe the generator produces is unaffected and reproduces the seal exactly (see
STEP-0-BASELINE-AUDIT.md §9), so this is a payload gap, not a universe gap.

Resolution required:
Decide which is authoritative — extend the generator to emit the four fields, or narrow the type and
have the seed take flags and thumbnails from the agent dataset once ISSUE-015 is fixed. Do not
silence it by loosening the type.

Blocks the pilot: no, but it makes the review-flag columns in the admin empty and misleading.

---

## ISSUE-017 — Six recovered components import a module that exists in no tree

Status: OPEN (contained)
Severity: LOW
Phase: Foundation
Raised: 2026-09-10, step 0

Problem:
`components/locations/city/{CityCTA,CityContact,CityHero,CityTrustSection,ServiceCard,ServicesSection}.tsx`
in the 9 Sep tree all import `@/lib/types`, which exists in none of the five trees. They cannot
compile anywhere and nothing that survives references them. They appear to belong to the
Massachusetts pilot, whose `app/page.tsx` similarly imports a non-existent `@/lib/queries`.

Current treatment:
Moved to `_archive/9sep-orphaned-ma-pilot/`, which `tsconfig.json` excludes. Nothing was deleted.

Resolution required:
Confirm they are Massachusetts pilot leftovers and drop them, or recover `lib/types.ts` if these
components carry design work worth keeping. Low priority either way.

Blocks the pilot: no.

---

## ISSUE-018 — The state hub map is a list, not a map

Status: OPEN
Severity: LOW
Phase: Template foundation
Raised: 2026-09-10, step 1

Problem:
The state mock draws pins with Leaflet from a `MAPDATA` blob. Leaflet is not a dependency of this
application, and adding one is a separate decision (milestone M3 in `CLAUDE.md`).

Current treatment:
`components/islands/MapPanel.tsx` renders the degraded state the mock itself specifies for when
Leaflet or the tile server cannot be reached: every location listed, each with its phone number. The
toggle, the panel, the legend and the responsive behaviour are the mock's. Nothing about the map is
faked and no pin is drawn.

Resolution required:
Decide whether the map ships. If it does, the island's shape does not change — only what fills
`#lmap`. The card-to-pin linkage the mock implements is not built either.

Blocks the pilot: no.

---

## ISSUE-019 — The mock ships the national city directory hidden

Status: OPEN (decision needed)
Severity: LOW
Phase: Template foundation
Raised: 2026-09-10, step 1

Problem:
In `locations new3.html` the city directory section is `<section class="section" id="directory"
hidden style="display:none">`, while the finder code that filters it — group opening, city matching,
ZIP resolution, counts, empty state — is complete and running. The mock filters an invisible list.

Impact:
Taken literally, the approved design has a search field on the national hub that visibly does
nothing.

Current treatment:
Implemented visible. The section is the finder's only target, and the chips are the internal links to
every city page — SEO value that a hidden section does not deliver. See DECISION-011.

Resolution required:
Design confirmation that the directory should be visible, or an instruction to hide it and remove the
finder with it.

Blocks the pilot: no.

---

## ISSUE-020 — The mock's drawer trigger is not in the approved markup

Status: OPEN (decision needed)
Severity: LOW
Phase: Template foundation
Raised: 2026-09-10, step 1

Problem:
`spokane.html` contains the full service drawer — markup, CSS and behaviour — but its opener binds to
`.o2-card`, and no element with that class exists anywhere in the approved markup. The mock ships
option 1 (`.option.o1`); the drawer belongs to an option 2 layout that was not kept.

Current treatment:
The drawer is implemented as a reusable island and opened from the eight headline service rows, which
already carry exactly the data the drawer reads: `why`, `imgAlt` and `tone` are fields on
`ServiceRow`, and the mock's rows carry them as `data-why`, `data-img` and `data-tone`. Each row gains
an "Open full detail" control. See DECISION-012.

Resolution required:
Confirm that the service rows are the intended trigger, or supply the option 2 card layout the drawer
was designed for.

Blocks the pilot: no.

---

## ISSUE-021 — ZIP-to-state lookup not ported

Status: OPEN
Severity: LOW
Phase: Template foundation
Raised: 2026-09-10, step 1

Problem:
The mocks' finders resolve a 5-digit ZIP to a state name through a public USPS prefix table
(`Chimcare.location.stateOfZip`) and open that state's group. The current implementation matches by
state and city name only; a ZIP finds nothing.

Impact:
A visitor typing a ZIP — which the placeholder invites — gets the empty state.

Resolution required:
Port the prefix table, or change the placeholder to stop inviting a ZIP. The table says only which
state a ZIP sits in and nothing about Chimcare coverage, so porting it asserts nothing new.

Blocks the pilot: no.

---

## ISSUE-022 — The BBB badge now renders on every template

Status: OPEN (decision needed)
Severity: LOW
Phase: Template foundation
Raised: 2026-09-10, step 1

Problem:
The header is one shared component. The BBB accreditation badge exists only in the city mock, so
adopting it into the shared header puts it on the national and state hubs too, which their own mocks
do not show.

Current treatment:
Rendered site-wide, from the real approved asset extracted out of the city mock. The badge is an
optional prop, so restricting it to city and service pages is a one-line change.

Resolution required:
Design confirmation. Also worth confirming the accreditation is current before it ships anywhere —
the template renders the asset, it does not verify the claim.

Blocks the pilot: no.

---

## ISSUE-023 — Chrome CSS was silently dropped by the porter

Status: RESOLVED (2026-09-10, step 1)
Severity: MEDIUM
Phase: Template foundation
Raised: 2026-09-10, step 1

Problem:
`scripts/port-css.mjs` took every chrome rule from the state mock and discarded chrome from the hub
and city mocks, so any chrome the state mock did not define had no CSS at all. Measured: the entire
service drawer (28 rules), `.hdr-bbb`, `.hdr-call`, `.hdr-book`, `.phone-bar`, `.phone-panel` and
`.fab-tip`. Separately, `styles/city.css` was 82 lines behind the current city mock, including
`.ph-img`, `.hero-trust`, `.hero-proof`, `.hero-awards`, `.team-photo` and `.o1-trust{display:none}`.

Impact:
Five of the six "missing design elements" the phase brief lists were missing because their CSS had
never been ported, not because the markup was absent. The city page also rendered a trust strip that
the current design hides.

Resolution:
The porter now lets the city mock ADD a chrome rule the state mock never wrote at that exact media
query, and never override one it did. Re-running it is purely additive: 65 lines gained in
`base.css`, 82 in `city.css`, none removed, and `tokens.css`, `hub.css` and `state.css` are
byte-identical. See DECISION-010.

---

## ISSUE-024 — Two measurement faults in the responsive check

Status: RESOLVED (2026-09-10, step 1)
Severity: MEDIUM
Phase: Template foundation
Raised: 2026-09-10, step 1

Problem:
`scripts/check-responsive.mjs` reported 15/15 clean while the city page overflowed at two widths.
Two causes:

1. It compared the document against `window.innerWidth`. Under Chrome's mobile emulation that
   reports the emulated window, not the layout viewport — 436 for a 390px device. Both sides of the
   comparison were wrong by the same amount, so real overflow at exactly the width that matters most
   was invisible.
2. Chrome can hold a `scrollWidth` computed before the last style or font change. It reported a
   phantom 16px overflow that vanished the moment anything on the page was touched.

Resolution:
Measure against `document.documentElement.clientWidth`, and force a structural reflow before reading.
The check also now skips elements inside a fixed or hidden ancestor, so a closed dialog parked
off-canvas is not reported as overflow.

What the corrected check then found: a real 17px overflow from the sticky call/book bar, whose flex
items would not shrink below their own content width. Fixed in `styles/shared.css` with
`min-width: 0`, in the shared component rather than per template.

---

## ISSUE-025 — Rendered titles are not the WordPress title

Status: OPEN
Severity: HIGH
Phase: Real-data smoke test
Raised: 2026-09-10, step 2

Problem:
Measured on all ten smoke URLs. WordPress has **no** `_yoast_wpseo_title` for any of the eight pages
that have a source row, so the rendered `<title>` comes from a master pattern in
`lib/content/assemble.ts` rather than from the source. On four of the eight it visibly differs from
what production serves.

| id | production | rendered |
| --- | --- | --- |
| S01 | `Chimney Sweep in Bloomington,MN - Chimcare` | `Chimney Sweep & Fireplace Services in Bloomington, MN - Chimcare` |
| S02 | `Chimney Sweep in Chanhassen,MN - Chimcare` | `Chimney Sweep & Fireplace Services in Chanhassen, MN - Chimcare` |
| S03 | `Gas Fireplace Repair in Shakopee,MN - Chimcare` | `Gas Fireplace Repair in Shakopee, MN - Chimcare` |
| S09 | `Chimney Sweep & Fireplace Services in Minneapolis, MN - Chimcare` | identical |

Production's title is WordPress's own `post_title` with Yoast's site-wide suffix. That value is
already in the dataset as `legacyTitle` on every city row, so reproducing production exactly is
possible from data we hold — S03's difference is a single space after the comma.

Why it was not fixed here:
Changing how every page's title is produced is a global SEO change, which this phase is explicitly
forbidden from making. The finding is recorded with its evidence instead.

Resolution required:
Decide whether the migrated title is the WordPress title (exact preservation) or the master pattern
(a deliberate improvement). If it is the former, the change is to read `legacyTitle`; if the latter,
it is a recorded SEO decision with a before-and-after per URL.

Blocks the pilot: this should be settled before 100 URLs are migrated, because it changes the title
of every page.

---

## ISSUE-026 — Meta descriptions are invented where WordPress has none

Status: OPEN
Severity: HIGH
Phase: Real-data smoke test
Raised: 2026-09-10, step 2
Related: implementation specification §18 item 10

Problem:
Nine of the ten smoke URLs render a meta description that WordPress does not have. None of the eight
pages with a source row carries a `_yoast_wpseo_metadesc`, and `assembleCityPage` falls back to
`city.metaDescription ?? 'Chimney sweep, inspection…'`. The specification already flagged this as a
contradiction; this run is the first measurement of it on real pages.

Impact:
The rule is "never generate metadata". The code generates it on every page whose source has none,
which on this sample is all of them.

Resolution required:
Either emit no description when the source has none, or record the fallback as an approved decision
with its exact wording. The specification's own recommendation is the former, with the fallback
enabled only as a recorded `CREATE_PAGE` decision.

Blocks the pilot: yes, in the sense that migrating 100 URLs would publish 100 generated descriptions.

---

## ISSUE-027 — Branch-page prose was never extracted, and it cost 14 pages

Status: RESOLVED (2026-09-10, step 2)
Severity: HIGH
Phase: Real-data smoke test
Raised: 2026-09-10, step 2

Problem:
Every one of the 14 Minnesota branch city pages failed the distinctness gate on `local specifics
(0/2)` and answered 404 locally while production served 200. Minneapolis and St Paul — the two
highest-traffic city pages in the state, 89 and 236 clicks — were among them.

Two causes in `scripts/build-mn-seed.mjs`, both in the same extractor:

1. `localSpecifics: isBranch ? {} : specificsFromHtml(r.html)` — branch pages were skipped before the
   extractor was even called.
2. `specificsFromHtml` searched for `<h2>Why … Important in {City}`, the wording coverage pages use.
   Branch pages write `<h2>Why {City}, MN Homeowners Trust Chimcare</h2>`, and put the paragraph in a
   styled `<span>` rather than a `<p>`, so even the heading match would have found nothing.

The prose was in WordPress the whole time. Minneapolis, post 90807:

> "For decades, Chimcare has been the trusted choice for chimney and fireplace repair in Minneapolis,
> MN. We bring deep knowledge of regional building codes, Minnesota weather, and historic homes to
> every project."

Resolution:
Match both heading forms, and take the block between that heading and the next heading rather than
the next `<p>`. Nothing is written or reworded; the two lines are the page's own sentences.

Effect on the counts:

| | publishable | needs_review | branch cities publishable |
| --- | ---: | ---: | ---: |
| before | 110 | 24 | 0 of 14 |
| after | 120 | 14 | 3 of 14 |

The sealed baseline (109 / 25) was **not edited**. See DECISION-016. Eleven branch cities still fail,
now on neighbourhood count rather than local prose; that is a separate extraction question.

---

## ISSUE-028 — The state hub URL does not exist in production

Status: OPEN (decision needed)
Severity: MEDIUM
Phase: Real-data smoke test
Raised: 2026-09-10, step 2

Problem:
`/locations/mn/` returns **404** in production and is not in the audit universe. The state hub is a
URL shape the rebuild introduces; nothing links to it today and it has no traffic or history.

Impact:
It is not a migration in the sense the rest of this work uses — it is a new page. It needs a
decision about its URL before it ships, and Q2b (`/locations/mn/` versus `/locations/minnesota/`) is
still open. Whatever is chosen has to be linked from somewhere and added to the sitemap, or it will
be an orphan.

Blocks the pilot: no, but the 100-URL pilot should not include it as if it were a migrated URL.

---

## ISSUE-007 — 301 vs 308

Update — 2026-09-10, step 2: measured on a real URL for the first time.
`S10` (`/location/chimney-sweep-fireplace-services-in-saint-paul-mn/`, 236 clicks, the highest of any
Minnesota URL) is answered **301** by production and **308** by the application. The destination is
the same in both — `/location/chimney-sweep-fireplace-in-st-paul-mn/` — so only the status differs.
The issue stands as written; the edge layer answers the exact production status at cutover.

---

## ISSUE-004 — Production redirects differ from fate maps

Update — 2026-09-10, step 2: one real URL checked, and on this one they agree.
For `S10`, production 301s to `/location/chimney-sweep-fireplace-in-st-paul-mn/` and the fate map
names that same destination. That is evidence about one URL. It does not resolve the issue: the audit
found 11 of 26 sampled conflicts disagreeing, and this sample of one does not touch that.

---

## ISSUE-029 — CityPage is a page type the URL universe does not have

Status: OPEN — awaiting a template from the client
Severity: HIGH
Phase: Template foundation / architecture
Raised: 2026-09-10, after review

Problem:
The template layer has a `CityPage` and a `ServicePage` as if a city page and a service page were two
different things. They are not. Every URL under `/location/` is one shape: **service + city**.

Measured across all 20,479 Minnesota URLs in `data/seed/minnesota.generated.json`: **zero** decompose
to a city without a service.

| URL | service | city |
| --- | --- | --- |
| `chimney-sweep-fireplace-in-minneapolis-mn` | chimney sweep & fireplace | Minneapolis |
| `air-duct-cleaning-in-apple-valley-mn` | air duct cleaning | Apple Valley |
| `apartment-chimney-services-in-afton-mn` | apartment chimney services | Afton |

The 151 rows carrying `kind='city'` are four service phrases and nothing else:
`chimney-sweep-repair` (123), `chimney-sweep-fireplace` (14), `chimney-sweep-fireplace-services` (13),
`chimney-fireplace-services` (1). All of them are the same generic flagship service. A "city page" is
the service×city page whose service happens to be the generic one.

The state hub already contradicted the naming: every city card links to
`/location/chimney-sweep-fireplace-in-minneapolis-mn/`, a service URL, while the code called the
destination a city page.

The hierarchy, as the client states it:

```
home  →  /locations/            the states
      →  /locations/{state}/    the cities in that state
      →  /location/{service}-in-{city}-{state}/   the leaf: city + service
```

Impact:
An extra template exists for a page type that has no URLs. `site.pages.kind` splits `city` from
`service` on a service-phrase match rather than on a real difference, and `assembleCityPage` and
`assembleServicePage` duplicate most of their work.

What is actually different between them is the amount of source, not the kind of page: the flagship pages
carry far more WordPress content (Minneapolis post 90807 is 46,925 bytes; the Shakopee
gas-fireplace-repair page is 12,930).

Agreed direction:
One leaf template for service×city, with every section optional and rendered only when the source
supplies it. No variant flag and no second template. The client is supplying the template; no
refactor has been started.

Blocks the pilot: yes. The 100-URL pilot would otherwise be built on a page model that does not match
the URLs it is migrating.
