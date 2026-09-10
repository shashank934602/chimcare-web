# Run record — Step 1, template foundation, 2026-09-10

Build the reusable template layer from the approved mocks. No URL migrated, no redirect applied, no
page retired, no production, WordPress, Cloudflare or DNS change, no 100-URL pilot.

---

## 1. Starting state

```
repository   ~/Desktop/chimcare/chimcare-web
branch       main
commit       5eb57fc  (Step 0 baseline 188fa7bdc8a69cf7e490aca419f01b91b85353e5)
working tree clean
```

Four templates existed (NationalHub, StateHub, CityPage, ServicePage); LegacyPage did not.
`typecheck` and `build` both passed before any change.

---

## 2. Inspection first

The mocks were analysed before anything was written: structure, ids, landmark elements and the whole
of each one's behaviour script. Three findings changed the plan.

1. **The city mock is newer than the ported CSS.** Re-running `port-css.mjs` on it produced 82 lines
   `styles/city.css` had never had — `.ph-img`, `.hero-trust`, `.hero-proof`, `.hero-awards`,
   `.team-photo`, and `.o1-trust{display:none}`. The city template was rendering a trust strip the
   current design hides.
2. **Chrome from the city mock was being discarded entirely** (ISSUE-023). Five of the six "missing
   design elements" the brief lists had markup but no CSS.
3. **Two of the mock's behaviours are unreachable in the approved markup**: the national city
   directory ships hidden (ISSUE-019) and the drawer's trigger class does not exist (ISSUE-020).
   Both are recorded as decisions rather than resolved silently.

---

## 3. Files changed

**New — templates and components**
```
components/templates/LegacyPage.tsx        the verbatim template
components/chrome/FloatingCta.tsx          shared quick-action cluster
components/islands/ServiceDrawer.tsx       reusable service drawer
components/islands/StateDirectory.tsx      national finder + state cards + chip directory
components/islands/MapPanel.tsx            state hub map panel and toggle
```

**New — supporting**
```
lib/content/verbatim.ts                    render-time cleanup, pure, six documented rules
lib/content/design-assets.ts               approved assets addressed by role, not filename
lib/fixtures/templates.ts                  test data (FIXTURE-marked, preview-only)
app/preview/[template]/page.tsx            preview harness, 404 in production
scripts/extract-mock-assets.mjs            markup-embedded mock assets, byte-for-byte
scripts/test/templates.mjs                 114 rendering checks
scripts/test/interactions.mjs              43 interaction checks in headless Chrome
styles/legacy.css                          minimal styling for arbitrary source markup
styles/shared.css                          structural corrections to shared chrome
styles/map.css                             map panel fallback list
data/mock-assets.json                      39 assets with provenance and SHA-256
public/img/mock/*                          39 extracted images
```

**Modified**
```
components/templates/{NationalHub,StateHub,CityPage,ServicePage}.tsx
components/chrome/Header.tsx               BBB badge, icon call button, Fast Online Booking (all optional)
components/sections/shared.tsx             SectionHead gained an optional figure
lib/content/assemble.ts                    CityPageProps: hero.trustLine, hero.awards, intro.teamPhoto,
                                           serviceRows.image, areas.image
lib/content/assemble-hubs.ts               NationalHubProps.directoryGroups + assembler
app/locations/[state]/page.tsx             passes ?q= and the state slug
app/layout.tsx, app/globals.css            header props; shared.css and map.css in the import chain
scripts/port-css.mjs                       city-only chrome may be added, never override (DECISION-010)
scripts/check-responsive.mjs               two measurement faults fixed (ISSUE-024)
styles/base.css, styles/city.css           regenerated; +65 and +82 lines, nothing removed
package.json                               test:templates, test:interactions, test:responsive, assets:mock
```

---

## 4. Templates implemented

All five. No page-specific component was created; no template names a city, state or service.

| Template | Design source | Result |
| --- | --- | --- |
| NationalHub | `locations new3.html` | complete |
| StateHub | `washington-locations.html` | complete, map degraded (ISSUE-018) |
| CityPage | `spokane.html` | complete |
| ServicePage | derived from the city design system | complete |
| LegacyPage | none exists (DECISION-013) | complete |

Section-by-section slots: `docs/migration/01-TEMPLATE-FOUNDATION.md` §3.

---

## 5. Shared components

Added: `FloatingCta`, `ServiceDrawer`, `StateDirectory` (with `NationalFinder`), `MapPanel`.
Extended: `Header` (three optional props), `SectionHead` (optional figure).
Already shared and reused unchanged: Footer, StickyBar, Icon, Sprite, Breadcrumbs, TrustStrip, Faq,
Accordion, BookingSheet, BookingForm, HeroSearch, LocationDirectory, ServiceDirectory.

Nothing is duplicated inside a template. Dialogs and the cluster are siblings of `<main>`
(DECISION-014).

---

## 6. Tests

| Check | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | PASS |
| Production build | `npm run build` | PASS, 11 routes |
| Rendering | `npm run test:templates` | PASS, 114 checks |
| Interactions | `npm run test:interactions` | PASS, 43 checks |
| Responsive | `npm run test:responsive` | PASS, 15/15 at 390 / 834 / 1440 |

Rendering checks read the server HTML, so every template's content is present without JavaScript.
Interaction checks drive headless Chrome and assert the DOM actually changes. Responsive checks
measure real horizontal overflow against the layout viewport.

The responsive suite is worth naming: it reported 15/15 clean before it was corrected, and 13/15
after. The two failures were real (ISSUE-024).

---

## 7. Issues

**Raised:** ISSUE-018 (map is a list), ISSUE-019 (mock hides the national directory), ISSUE-020
(drawer trigger absent from the markup), ISSUE-021 (ZIP lookup not ported), ISSUE-022 (BBB badge now
site-wide), ISSUE-023 (chrome CSS dropped by the porter — resolved), ISSUE-024 (responsive check
measured the wrong thing — resolved).

**Closed:** ISSUE-012 (shared template gaps — all six elements now shared and verified), ISSUE-013
(the StateHub conflict, resolved by adopting the island refactor as predicted).

**Untouched, as instructed:** ISSUE-015 and the migration agent. No audit seal was read or written in
this phase, no migration decision was changed, and `data/seed/*` was not regenerated.

**Decisions:** DECISION-010 through DECISION-015.

---

## 8. Final state

Typecheck clean, build clean, 172 automated checks passing across three suites.
Final commit recorded in §9.

---

## 9. Final commit

