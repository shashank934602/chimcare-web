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

---

## DECISION-010 — The newest mock may add chrome, never override it

Date: 2026-09-10
Phase: Step 1

Decision:
`scripts/port-css.mjs` keeps the state mock as the authority for site chrome. The city mock — the
newest of the three — may add a rule the state mock never wrote at that exact media query. It may
never change one the state mock did write. The hub mock contributes no chrome, as before.

Reason:
Chrome came from the state mock alone so the header and footer would be identical everywhere. The
side effect was that any chrome only the newer mock defines had markup and no CSS: the whole service
drawer, the header BBB badge, the icon-only call button, the "Fast Online Booking" CTA, both header
phone variants and the floating-action tooltips. Five of the six elements the phase brief calls
missing were missing for this reason alone.

Why this rule and not "newest wins":
"Newest wins" would silently restyle the header on every template. This rule cannot: where both mocks
define the same selector at the same breakpoint, the state mock's value stands. Re-running the porter
is additive — 65 lines gained in `base.css`, 82 in `city.css`, none removed, and `tokens.css`,
`hub.css` and `state.css` byte-identical.

---

## DECISION-011 — The national city directory is rendered visible

Date: 2026-09-10
Phase: Step 1
Related: ISSUE-019

The contradiction:
`locations new3.html` ships `#directory` as `hidden style="display:none"`, while the finder code that
filters it is complete and running. Reproducing the mock exactly means shipping a search field that
visibly does nothing.

Decision:
Render it visible, and flag it for design confirmation rather than deciding it here.

Reason:
The section is the finder's only target, so hiding it makes the field inert. The chips are also the
internal links to every city page — SEO value a hidden section does not deliver. Being wrong this way
is visible and reversible in one line; being wrong the other way ships a dead control nobody notices.

---

## DECISION-012 — The service drawer opens from the service rows

Date: 2026-09-10
Phase: Step 1
Related: ISSUE-020

The contradiction:
`spokane.html` contains the drawer complete — markup, CSS, behaviour — but binds its opener to
`.o2-card`, a class that appears nowhere in the approved markup. The mock ships option 1; the drawer
was designed for an option 2 layout that was not kept.

Decision:
Implement the drawer as a reusable island and open it from the eight headline service rows. Record
the mismatch rather than resolve it silently.

Reason:
The rows already carry the drawer's exact data contract: `why`, `imgAlt` and `tone` are fields on
`ServiceRow`, and the mock's rows carry them as `data-why`, `data-img` and `data-tone`. Nothing was
invented to make the drawer work, and nothing was discarded. If the option 2 layout returns, the
island takes it without change — the trigger is any element with `data-drawer-open`.

---

## DECISION-013 — LegacyPage gets minimal hand-written styling

Date: 2026-09-10
Phase: Step 1

Decision:
`styles/legacy.css` is hand-written, in a new file, and deliberately minimal: measure, spacing, safe
overflow for tables, images and code, and the site's own type and colour tokens. It does not restyle
the source's own structure.

Reason:
No mock covers a page whose body is arbitrary WordPress markup, so there is no approved design to
port. Styling it further would be authoring a design nobody approved, on content nobody has reviewed.
The generated stylesheets stay exactly as `port-css.mjs` produces them.

Not decided here:
Whether legacy pages get a designed treatment at all. That needs a mock.

---

## DECISION-014 — Dialogs render as siblings of `<main>`

Date: 2026-09-10
Phase: Step 1

Decision:
The booking sheet, the service drawer and the floating quick-action cluster render outside `<main>`
in every template, as they do in the mocks.

Reason:
Nested inside a section they position against that section rather than the viewport, and a closed
panel parked off-canvas widens the document. Measured on the city template before the change: an 18px
horizontal overflow at 834px that disappeared when the dialogs moved out.

---

## DECISION-015 — Fixture data is quarantined by construction, not by convention

Date: 2026-09-10
Phase: Step 1

Decision:
Test data lives in `lib/fixtures/templates.ts` and is reachable only through
`app/preview/[template]/page.tsx`. Every string contains FIXTURE, every place name is invented, every
phone number is in the 555-01xx range reserved for fiction, every preview page carries a visible red
banner, the route is `noindex, nofollow`, and it returns 404 when `NODE_ENV === 'production'`.

Reason:
The brief requires fixtures that could not accidentally reach production. A naming convention alone
is not that guarantee; four independent barriers are. If any of this content ever appeared on a real
page it would be obvious on sight rather than plausible.
