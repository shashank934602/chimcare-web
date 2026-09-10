# Chimcare Migration — Master Log

One entry per completed step. Entries are appended, never edited or removed. Each names the run
record that holds the evidence.

| Step | Date | Outcome | Run record |
| --- | --- | --- | --- |
| 0 — Reconstruct and stabilise the canonical tree | 2026-09-10 | **Complete.** One canonical tree at `~/Desktop/chimcare/chimcare-web`, under git, typecheck clean, `next build` clean. Four of five missing datasets regenerated and verified against the sealed baseline. Five new issues raised, three closed with evidence. | [`runs/2026-09-10-step-0.md`](runs/2026-09-10-step-0.md) |

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
