# Chimcare Migration — Master Log

One entry per completed step. Entries are appended, never edited or removed. Each names the run
record that holds the evidence.

| Step | Date | Outcome | Run record |
| --- | --- | --- | --- |
| 0 — Reconstruct and stabilise the canonical tree | 2026-09-10 | **Complete.** One canonical tree at `~/Desktop/chimcare/chimcare-web`, under git, typecheck clean, `next build` clean. Four of five missing datasets regenerated and verified against the sealed baseline. Five new issues raised, three closed with evidence. | [`runs/2026-09-10-step-0.md`](runs/2026-09-10-step-0.md) |
| 1 — Next.js template foundation | 2026-09-10 | **Complete.** Five reusable templates, no page-specific components. Four new shared components. 172 automated checks passing across rendering, interaction and responsive suites. Seven issues raised (two resolved in the same run), two closed. | [`runs/2026-09-10-template-foundation-001.md`](runs/2026-09-10-template-foundation-001.md) |

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
