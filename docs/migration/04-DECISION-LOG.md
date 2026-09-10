# Decision Log

## DECISION-001

Date: 2026-09-10

Decision:
Use reusable templates instead of creating React components
for individual cities/services.

Architecture:

URL
→ page type
→ template
→ content/data
→ render

Reason:
Cities and services differ in content, not page structure.

---

## DECISION-002

Decision:
Run a mandatory 100-URL pilot before Batch 1.

Reason:
Validate the template/content architecture using real production
and WordPress data before scaling.

---

## DECISION-003

Decision:
Production behavior is the cutover baseline.

Reason:
Existing fate maps contain conflicts with actual production.

---

## DECISION-004

Decision:
Do not normalize URLs simply because a different URL pattern
is preferred.

Example:

/location/chimney-sweep-seattle-wa/

may remain unchanged if it is an established live URL with traffic.

---

## DECISION-005

Decision:
Do not redirect an unmodelled service simply because it isn't
in the current service catalogue.

It should initially be preserved through the appropriate
migration/legacy mechanism and reviewed separately.
---

## DECISION-006 — Homepage redirect destinations: preserve now, review explicitly

Date: 2026-09-10
Phase: Step 0 (recorded, not applied)

The contradiction:
Two standing rules collide. "Preserve production behaviour at cutover" (DECISION-003) requires keeping
redirects that production serves today. "A redirect must never target the homepage"
(brief, redirect legitimacy) forbids exactly those redirects.

What production actually does, measured 2026-09-10 from `data/audits/url-universe/`:
five URLs redirect to `/`.

| audit_id | source URL | WordPress today |
| --- | --- | --- |
| CH0262737 | `/location/bend-chimney-sweep/` | no source record; Redirection plugin rule 10 |
| CH0262738 | `/payment/` | no source record |
| CH0262739 | `/payment-acknowledgment/` | no source record |
| CH0262740 | `/received-payment/` | live, 200, post 84762 "Thank You !", classed LOW_INFORMATION |
| CH0262741 | `/subscription/` | no source record |

Four of the five are outside `/location/`, so they are also part of ISSUE-005.

Decision:
1. **Preserve production behaviour during the preservation phase.** These five keep the status and
   destination production serves. The behaviour rule wins because it is the one that cannot silently
   lose traffic.
2. **Flag all five for explicit review.** They carry `PROD_REDIRECT_TO_HOMEPAGE` and are reviewed
   individually, by a human, in the first decision batch.
3. **Do not create a blanket homepage-redirect policy.** The legitimacy rule stands unchanged and
   governs every *future* redirect. Preserving five observed rules is not a precedent for writing new
   ones.
4. **Nothing is applied in Step 0.** No redirect was created, changed or removed by this step.

Not decided here:
Whether any of the five should keep pointing at the homepage after review. `/received-payment/` in
particular is a live 200 page, so "redirect to homepage" is not currently what it does and its
treatment is a separate question.

Caveat on the evidence:
The audit's aggregate row for destination `/` records `destination_status: 404` and
`destination_live_today: no`. The homepage is plainly not 404, so this is a probe artefact and the
full production probe should re-measure it before the batch is reviewed.

---

## DECISION-007 — One canonical tree at ~/Desktop/chimcare/chimcare-web

Date: 2026-09-10
Phase: Step 0

Decision:
The canonical application tree is `~/Desktop/chimcare/chimcare-web`, built from the 4 Sep application
code and the 9 Sep migration code, schema, admin pages and audits. It is under git. The five source
trees are archives and are not edited again.

Reason:
Two competing implementations caused ISSUE-001 and ISSUE-002. The location was chosen because
`scripts/build-mn-seed.mjs` resolves its inputs relative to the tree's parent, and this location puts
`Chimcare-Migration/` and `chimcare-rebuild-main/` exactly where the script already expects them.

Per-file reasoning: `docs/migration/STEP-0-BASELINE-AUDIT.md` §3.

---

## DECISION-008 — Rejected files are archived, never deleted

Date: 2026-09-10
Phase: Step 0

Decision:
Every file not adopted into the canonical tree is preserved under `_archive/`, sorted by why it was
rejected, and excluded from `tsconfig.json`. Nothing from any tree was deleted in Step 0.

Reason:
Several rejections rest on judgement that a later phase may revisit — ISSUE-013 in particular. A
rejected file that still exists can be re-examined; a deleted one cannot.

---

## DECISION-009 — The sealed Minnesota baseline is an input, never an output

Date: 2026-09-10
Phase: Step 0

Decision:
`reports/PROJECT_CONTEXT_HANDOFF.md` §4 is read by the regression, never written by it. Where a
regenerated number disagrees with the seal, the disagreement is logged as an issue. Neither the seal
nor the code is adjusted to make them agree.

Applied in this step:
The gate counts did not reproduce (109 → 0 publishable). The seal was left alone, the agent was left
unpatched, and `--apply` was not run, so no dataset exists that contradicts the seal. See ISSUE-015.

Reason:
A baseline that is edited whenever it disagrees with the code is not a baseline.
