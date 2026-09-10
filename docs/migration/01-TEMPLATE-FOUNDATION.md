# Step 1 — Next.js template foundation

Date: 2026-09-10
Starting commit: `5eb57fc` (Step 0 baseline `188fa7b`)
Scope: the reusable template layer only. No URL migrated, no redirect applied, no page retired, no
production, WordPress, Cloudflare or DNS change, and no 100-URL pilot.

---

## 1. The architecture

```
URL  →  page type  →  reusable template  →  content/data  →  render
```

Five templates, no page-specific components. There is no `SpokanePage.tsx`, no `SeattlePage.tsx`, and
nothing in any template names a city, a state or a service. Every value a page shows arrives as a
prop.

| Page type | Template | Props type | Assembled by |
| --- | --- | --- | --- |
| National hub | `components/templates/NationalHub.tsx` | `NationalHubProps` | `assembleNationalHub` |
| State hub | `components/templates/StateHub.tsx` | `StateHubProps & { query, stateSlug }` | `assembleStateHub` |
| City page | `components/templates/CityPage.tsx` | `CityPageProps` | `assembleCityPage` |
| Service page | `components/templates/ServicePage.tsx` | `ServicePageProps` | `assembleServicePage` |
| Legacy page | `components/templates/LegacyPage.tsx` | `LegacyPageProps` | none — source-backed, see §7 |

The separation the project already had is kept: only `lib/data/*.ts` runs SQL, `lib/content/assemble*.ts`
turns rows into fully-resolved props, and a template never sees a database row. No second data system
was introduced.

---

## 2. Design sources

| Mock | Bytes | Template |
| --- | --- | --- |
| `design-mocks/locations new3.html` | 4.77 MB | NationalHub |
| `design-mocks/washington-locations.html` | 2.96 MB | StateHub |
| `design-mocks/spokane.html` | 2.44 MB | CityPage |
| — | — | ServicePage, derived from the city design system |
| — | — | LegacyPage, no mock exists (see §7 and DECISION-013) |

**The city mock is newer than the ported CSS.** Re-running `scripts/port-css.mjs` against it produced
82 lines `styles/city.css` never had: `.ph-img`, `.hero-trust`, `.hero-proof`, `.hero-awards`,
`.team-photo`, `.photo-slot`, and `.o1-trust{display:none}`. The trust strip under the city hero is
hidden in the current design and its three claims moved into the hero. The template rendered a strip
that had been invisible since the mock was last updated.

**Chrome from the city mock was being dropped entirely.** `port-css.mjs` took all chrome from the
state mock, so every selector only the city mock defines — the whole service drawer, the header BBB
badge, the icon-only call button, the "Fast Online Booking" CTA, the two header phone variants, the
floating-action tooltips — had markup but no CSS. See DECISION-010.

---

## 3. Templates: sections, data slots, status

### NationalHub — `locations new3.html`

| Section | Data slot | Status |
| --- | --- | --- |
| Hero, headline and counts | `hero.states`, `hero.cities` | done |
| Finder (search, clear, status line) | `directoryGroups` | **added** |
| Trust strip | `trust` | done |
| Editorial intro | static design copy | done |
| State card grid | `stateCards` | done |
| Load more states, six at a time | `stateCards` | **added** |
| City chip directory (`#dirlist`) | `directoryGroups` | **added** |
| Coverage-only note, empty state | `coverageOnly` | **added** |
| Why Chimcare | static design copy | done |
| Crew | `crew` | done |
| Final CTA, booking sheet | `finalCta`, `booking` | done |
| Floating quick actions | `phone`, `phoneHref` | **added** |

### StateHub — `washington-locations.html`

| Section | Data slot | Status |
| --- | --- | --- |
| Hero and breadcrumbs | `hero`, `crumbs` | done |
| Hero search, clear, status line | `directory.cards` | **added** (island) |
| Directory count, card grid | `directory.cards` | **added** (island) |
| Load more, empty state | `directory.cards` | **added** (island) |
| Map panel and show/hide toggle | `directory.cards` | **added**, degraded (§6) |
| Editorial intro, blocks | `intro`, `editorial` | done |
| Expandable detail | `detail` | done |
| Crew, final CTA, booking | `crew`, `finalCta`, `booking` | done |
| Floating quick actions | `phone`, `phoneHref` | **added** |

Washington is an instance of this template. `stateSlug` and `query` are props; `?q=` filters on the
server so a shared link renders already filtered without JavaScript.

### CityPage — `spokane.html`

| Section | Data slot | Status |
| --- | --- | --- |
| Hero, breadcrumbs, CTAs | `hero`, `crumbs`, `contact` | done |
| Hero trust line | `hero.trustLine` | **added** |
| Rating and award marks | `hero.rating`, `hero.awards` | **added** |
| Embedded booking form | `booking`, `bookingContext` | done |
| Introduction and reasons | `intro`, `reasons` | done |
| Team photograph | `intro.teamPhoto` | **added** |
| Why homeowners trust us | `whyTrust` | done |
| Service list (accordion) | `serviceRows.rows` | done |
| Service section illustration (`#ph-services`) | `serviceRows.image` | **added** |
| Service drawer | `serviceRows.rows` | **added** |
| Full service solutions, filter, show more | `solutions` | done |
| Service areas | `areas` | done |
| Areas illustration (`#ph-areas`) | `areas.image` | **added** |
| Process, cost, FAQ, contact, final CTA | `process`, `cost`, `faq`, `contactBlock`, `finalCta` | done |
| Floating quick actions | `contact` | **added** |
| Trust strip under the hero | `trust` | **removed** — hidden by the current mock |

### ServicePage — derived

Service identity (`row`, `initialService`), location identity (`hero`, `contact`), content, SEO,
images, FAQs and CTAs are separate slots, so one template serves every service × city combination.
It decides nothing about which services exist. No catalogue entry was invented and none of the 4,207
legacy service phrases was classified — that stays a business decision (ISSUE-009).

### LegacyPage — new

See §7.

---

## 4. Shared components

Nothing below is duplicated inside a template.

| Component | File | Used by |
| --- | --- | --- |
| Header | `components/chrome/Header.tsx` | all, through `app/layout.tsx` |
| Footer | `components/chrome/Footer.tsx` | all |
| Sticky call/book bar | `components/chrome/StickyBar.tsx` | all |
| **Floating quick-action cluster** | `components/chrome/FloatingCta.tsx` | all five |
| Icon / sprite | `components/chrome/{Icon,Sprite}.tsx` | all |
| Breadcrumbs, SectionHead, TrustStrip, Faq | `components/sections/shared.tsx` | all |
| Accordion | `components/islands/Accordion.tsx` | city, state, service |
| Booking sheet and form | `components/islands/Booking{Sheet,Form}.tsx` | all |
| Hero search | `components/islands/HeroSearch.tsx` | state |
| Location directory | `components/islands/LocationDirectory.tsx` | state |
| **State directory + national finder** | `components/islands/StateDirectory.tsx` | national |
| **Map panel** | `components/islands/MapPanel.tsx` | state |
| **Service drawer** | `components/islands/ServiceDrawer.tsx` | city, service |
| Service directory | `components/islands/ServiceDirectory.tsx` | city |
| Shared search store / folding | `components/islands/locationSearch.ts`, `lib/content/search.ts` | national, state |

Header additions are all optional props defaulting to the previous behaviour: `bbb` (renders the
badge only when the real asset exists) and `bookLabel` ("Fast Online Booking" vs "Schedule Service").
No trust mark, certification or award is asserted by markup alone.

Dialogs and the floating cluster are siblings of `<main>` in every template, as in the mocks. Nested
inside a section they position against it rather than the viewport, and a closed panel parked
off-canvas widens the document.

---

## 5. Interactions implemented

All verified by `scripts/test/interactions.mjs` driving headless Chrome — 43 checks.

| Behaviour | Mock hook | Template |
| --- | --- | --- |
| State grid opens at six, grows by six | `#states-load-more`, `#states-more` | national |
| Finder filters chips; state name matches a whole group | `#f-q`, `.chips-group` | national |
| Clear button; status line counts; empty state | `#f-clear`, `#finder-note`, `#dir-empty` | national |
| Directory pages six then twelve | `#load-more`, `#dir-more` | state |
| Hero search filters the card grid; count follows | `#f-q`, `#dir-count` | state |
| Empty state | `#dir-empty` | state |
| Map show/hide, with `aria-expanded` | `#map-toggle`, `#map-panel` | state |
| Service accordion, single-open, `aria-expanded` | `.o1-row-btn`, `#svc-lib` | city |
| Service drawer: open, close, Escape, scroll lock, focus return | `#drawer`, `[data-drawer-close]` | city, service |
| Solutions category filter and show more | `#svc-filters`, `#svc-more-btn` | city |
| FAQ accordion, single-open | `.faq-q` | city, state, service |
| Mobile menu | `.menu-btn` | all |
| Booking sheet from the sticky bar and the cluster | `[data-book-sheet]` | all |
| Cluster appears past the booking form, hides behind dialogs | `#fcta` | all |

---

## 6. Known gaps

| Gap | Detail | Tracked |
| --- | --- | --- |
| Map is a list, not a map | Leaflet is not a dependency; the panel renders the degraded state the mock itself specifies — every location listed with a phone number. Toggle, panel, legend and responsive behaviour are the mock's. | ISSUE-018 |
| National city directory visibility | The mock ships `#directory` as `hidden style="display:none"` while its filter code is fully written. Implemented visible. | ISSUE-019, DECISION-011 |
| Drawer trigger | The mock's drawer is opened by `.o2-card`, a class absent from the approved markup. Wired to the eight service rows, which already carry the drawer's data contract (`why`, `imgAlt`, `tone`). | ISSUE-020, DECISION-012 |
| ZIP-to-state lookup | The mock's finder resolves a 5-digit ZIP to a state through a public prefix table. Not ported; matching is by name only. | ISSUE-021 |
| LegacyPage has no approved design | No mock covers arbitrary WordPress markup. `styles/legacy.css` is hand-written and deliberately minimal. | DECISION-013 |
| Header BBB badge on hub/state | Rendered site-wide from the city mock's asset. Whether the badge belongs on every template is a design question. | ISSUE-022 |
| Dispatcher does not route to LegacyPage | Routing is untouched in this phase; `kind='legacy'` still 404s. | ISSUE-006 |

---

## 7. LegacyPage and the render boundary

`LegacyPage` renders a URL that must keep working but has no modelled city, service or hub behind it.

**The stored source is never modified.** `lib/content/verbatim.ts` is pure: it takes raw `post_content`
and returns a string to display. Change a rule and every page renders differently with no migration,
and the original is always recoverable.

Six rules, each reported with its occurrence count so the page and the migration can both show
exactly what was done:

| Rule | Defect | Action |
| --- | --- | --- |
| `wpbakery_unclosed_shortcode` | WPBakery markup left as literal text (33,740 live pages, ISSUE-011) | token not printed; inner copy untouched |
| `orphan_shortcode` | shortcode whose plugin no longer runs | token not printed; nothing substituted |
| `script_and_frame_tags` | script/iframe/object/embed/form/link/meta/base in stored content | element dropped |
| `inline_event_handler` | an `on*` attribute | attribute dropped, element and text kept |
| `javascript_url` | `javascript:` in href/src | neutralised to `#`, link text kept |
| `empty_paragraph` | paragraph emptied by shortcode removal | not printed |

What it will not do: rewrite copy, fix grammar, add or remove a heading, insert an FAQ, generate a
meta description, change a link target, re-encode an image, or add structured data. **There is
deliberately no JSON-LD on a legacy page.** Source metadata (`post_id`, modified date, Yoast title,
description, canonical, robots) is carried through as WordPress holds it; absent fields stay absent.

---

## 8. Assets

`scripts/extract-mock-assets.mjs` writes the 39 images the mocks embed in their markup to
`public/img/mock/`, byte-for-byte, under a content-hash name, with `data/mock-assets.json` recording
mock, template, class, alt text, dimensions, byte count and SHA-256 for each. Nothing is renamed,
re-encoded, converted or resized, and alt text is carried across as the designer wrote it.

`lib/content/design-assets.ts` is the only place a hash appears; templates ask for
`DESIGN.bbbBadge`, `DESIGN.awards`, `DESIGN.cityServices`, `DESIGN.cityAreas`, `DESIGN.cityTeam`. A
missing asset returns null and the caller renders nothing — a trust mark that is not the real one is
a false claim, so no stand-in is ever drawn.

---

## 9. SEO

The template system carries source-backed title, description, canonical, robots and structured data
through existing slots (`meta`, `jsonLd`). Nothing was invented and no production SEO changed. The
open contradiction about generated descriptions (specification §18 item 10) is untouched. The preview
route is `noindex, nofollow` and refuses to run in production.

---

## 10. Test data

`lib/fixtures/templates.ts`. Every string contains FIXTURE, every place name is invented, every phone
number is in the 555-01xx range reserved for fiction, and every preview page carries a visible red
banner. It is imported only by `app/preview/[template]/page.tsx`, which returns 404 when
`NODE_ENV === 'production'`. No real route, loader or assembler imports it.

The fixtures exercise a normal city with eight services and 24 catalogue cards, a state with 20
locations (so pagination and the empty state are both reachable), a national hub with eight states of
which two are coverage-only, a service page, and a legacy page whose source carries all four defect
classes.

---

## 11. Result

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run build` | PASS, 11 routes |
| `npm run test:templates` | PASS, 114 checks |
| `npm run test:interactions` | PASS, 43 checks |
| `npm run test:responsive` | PASS, 15/15 at 390 / 834 / 1440 |
