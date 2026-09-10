# Chimcare Migration — Master Log

One entry per completed step. Entries are appended, never edited or removed. Each names the run
record that holds the evidence.

| Step | Date | Outcome | Run record |
| --- | --- | --- | --- |
| 0 — Reconstruct and stabilise the canonical tree | 2026-09-10 | **Complete.** One canonical tree at `~/Desktop/chimcare/chimcare-web`, under git, typecheck clean, `next build` clean. Four of five missing datasets regenerated and verified against the sealed baseline. Five new issues raised, three closed with evidence. | [`runs/2026-09-10-step-0.md`](runs/2026-09-10-step-0.md) |
| 1 — Next.js template foundation | 2026-09-10 | **Complete.** Five reusable templates, no page-specific components. Four new shared components. 172 automated checks passing across rendering, interaction and responsive suites. Seven issues raised (two resolved in the same run), two closed. | [`runs/2026-09-10-template-foundation-001.md`](runs/2026-09-10-template-foundation-001.md) |
| 2 — 10-URL real-data smoke test | 2026-09-10 | **SMOKE REVIEW.** Ten real URLs rendered through the real templates from real WordPress source. Four critical failures found, root-caused, fixed and re-run to zero. 243 images, none broken. Four issues raised (one resolved in the run), four decisions. | [`runs/2026-09-10-smoke-10-001.md`](runs/2026-09-10-smoke-10-001.md) |

---

## Step 0 — 2026-09-10

**What changed.** Five application trees were reduced to one. The canonical tree is
`~/Desktop/chimcare/chimcare-web`: 4 September application code plus 9 September migration code,
schema, admin pages and audits, with all sixteen overlapping files resolved individually and every
recovery banner removed. Migration `0002` was regenerated from the schema. The Minnesota dataset, its
geocode cache, the recovered FAQ questions and the recovered hero images were rebuilt from primary
sources.

**What was verified.** `npm run typecheck` exits clean. `npm run build` completes and emits all ten
routes. The extraction regression reproduces every measurable number in the sealed Minnesota baseline
— 150 cities, 14 branches, 134 migrated pages, 20,479 URLs, 6,803 redirects, 1,219 gone, 9,568 legacy,
642 FAQ pairs and 15 byte-verified hero images.

**What did not reproduce.** The sealed gate counts (109 publishable, 25 needs_review, 454 flags). Two
mechanical defects in the migration agent were isolated to specific lines and logged as ISSUE-015. The
seal was not edited and the agent dataset was not written.

**What was deliberately not done.** No URL migrated, no redirect applied, no URL retired, no
production, WordPress, Cloudflare or DNS change, no service-catalogue decision, no template work
beyond what buildability required. The 100-URL pilot was not started.

**Issues closed:** ISSUE-001, ISSUE-002 (previously marked resolved without evidence), ISSUE-014.
**Issues partly closed:** ISSUE-003.
**Issues raised:** ISSUE-013, ISSUE-014, ISSUE-015, ISSUE-016, ISSUE-017.
**Decisions recorded:** DECISION-006 through DECISION-009.

**Verdict:** READY FOR TEMPLATE FOUNDATION, with ISSUE-015 open and not on that phase's path.

---

## Step 1 — 2026-09-10

**What changed.** The reusable template layer. Five templates — NationalHub, StateHub, CityPage,
ServicePage and a new LegacyPage — each driven entirely by props. No template names a city, a state
or a service, and no page-specific component was created. Four new shared components carry the
behaviour the mocks specify: the floating quick-action cluster, the service drawer, the national
state directory with its finder, and the state hub's map panel. The header gained the BBB badge, the
icon-only call button and the "Fast Online Booking" CTA, each an optional prop rendered only from a
real approved asset.

**What the inspection found.** Five of the six "missing design elements" were missing because their
CSS had never been ported, not because the markup was absent: `scripts/port-css.mjs` took all chrome
from the state mock and discarded the city mock's. The city mock also turned out to be 82 lines ahead
of the ported stylesheet, and hides the trust strip the city template was still rendering.

**What was verified.** Typecheck and build clean. 114 rendering checks against the server HTML, so
every template's content is present without JavaScript. 43 interaction checks driving headless
Chrome. 15 responsive checks at 390, 834 and 1440 with no horizontal overflow.

The responsive suite reported 15/15 before it was corrected and 13/15 after. It had been comparing
the document against `window.innerWidth`, which Chrome misreports under mobile emulation, and reading
a stale scroll width. Both failures it then exposed were real and are fixed.

**What was deliberately not done.** No URL migrated, no redirect applied, no page retired, no
production, WordPress, Cloudflare or DNS change. ISSUE-015 and the migration agent were not touched,
no audit seal was read or written, and no service-catalogue decision was taken. Routing is unchanged,
so `kind='legacy'` still 404s and LegacyPage is reachable only through the preview harness.

**Issues raised:** ISSUE-018 through ISSUE-024 (ISSUE-023 and ISSUE-024 resolved in the same run).
**Issues closed:** ISSUE-012, ISSUE-013.
**Decisions recorded:** DECISION-010 through DECISION-015.

**Verdict:** READY FOR REAL-DATA SMOKE TEST.

---

## Step 2 — 2026-09-10

**What changed.** Real Chimcare source data now reaches the templates. Two recovered datasets — 642
WordPress FAQ pairs and 15 byte-verified hero images — were wired into the city seed. Before this,
every one of the 134 Minnesota city pages answered 404, because the publication gate was being run
with an empty FAQ list and a null hero on every city.

**What the smoke test found.** The first parity run failed on four URLs, two of them the highest-traffic
city pages in the state. The cause was a single extractor: branch pages were skipped outright when
reading their "why it matters" prose, and the pattern it searched for was the wording only coverage
pages use. Fourteen city pages were failing the gate on prose that had been in WordPress all along.
Fixed by reading both heading forms.

That moved the publication counts from 110/24 to 120/14 against a sealed baseline of 109/25. The seal
was not edited. The gate's conditions and thresholds were not touched either — ten more pages clear
the same bar because the data they needed is finally being read.

**What was verified.** Ten of ten render through the correct template. 243 images requested, none
broken. Both verbatim pages match their WordPress source exactly under the documented cleanup. No
canonical is wrong, no page is unexpectedly noindex, no rating markup is emitted anywhere, and
LegacyPage emits no structured data at all. Eighteen real-window responsive checks with no horizontal
overflow and no page that will scroll sideways.

**What remains open.** Every one of the ten carries a REVIEW item, and they are all the same three
things: WordPress has no per-post title or description for most of these pages so both are currently
produced by the app rather than the source (ISSUE-025, ISSUE-026); LegacyPage is verified through an
admin preview because it is not routed (ISSUE-006); and the app emits 308 where production emits 301
(ISSUE-007). None can be closed by this phase.

**What was deliberately not done.** No production, WordPress, Cloudflare or DNS change. No redirect
applied, no URL retired, renamed or normalised. No service-catalogue decision. The admin gate was not
weakened to make the legacy preview work. `mn.migration.json` was not written, so nothing on disk
contradicts the seal.

**Issues raised:** ISSUE-025, ISSUE-026, ISSUE-027 (resolved in the run), ISSUE-028.
**Issues updated with real measurements:** ISSUE-004, ISSUE-007.
**Decisions recorded:** DECISION-016 through DECISION-019.

**Verdict:** SMOKE REVIEW. NOT READY FOR 100-URL PILOT until the title and description decisions are
made, because the pilot would otherwise publish 100 pages under an unmade SEO decision.
