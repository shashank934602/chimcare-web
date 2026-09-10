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

Status: OPEN
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

Status: OPEN
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
