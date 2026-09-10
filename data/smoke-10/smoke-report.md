# 10-URL real-data smoke test

Date: 2026-09-10  
Starting commit: `0232f6f` (Step 1 `95467d8`, Step 0 baseline `188fa7b`)  
Verdict: **SMOKE REVIEW**

Ten real Chimcare URLs taken from the audit universe, rendered through the reusable templates from
real WordPress source. No production, WordPress, Cloudflare or DNS change; no redirect applied; no
URL retired or renamed; no service-catalogue decision; the audit seal untouched.

---

## 1. The ten URLs

| id | audit_id | URL | template | clicks | why |
| --- | --- | --- | --- | ---: | --- |
| S01 | `CH0137596` | `/location/chimney-sweep-repair-in-bloomington-mn/` | CityPage | 6 | Highest-click publishable coverage city page; exercises the full city pipeline end to end. |
| S02 | `CH0140772` | `/location/chimney-sweep-repair-in-chanhassen-mn/` | CityPage | 5 | Second publishable coverage city; confirms the city template is reusable, not tuned to one city. |
| S03 | `CH0139169` | `/location/gas-fireplace-repair-in-shakopee-mn/` | ServicePage | 15 | Highest-click service x city URL whose city clears the gate. |
| S04 | `CH0139898` | `/location/chimney-sweep-in-white-bear-lake-mn/` | ServicePage | 10 | A different service category, so the service template is exercised on more than one catalogue entry. |
| S05 | `NOT_IN_UNIVERSE` | `/locations/mn/` | StateHub | 0 | The state hub, driven by the same 150-city dataset. Not a legacy URL: it does not exist in production and is not in the audit universe. |
| S06 | `CH0262906` | `/locations/` | NationalHub | 193 | The national hub, driven by the state table. This URL does exist in production. |
| S07 | `CH0137618` | `/location/gas-fireplace-repair-service-in-plymouth-mn/` | LegacyPage | 34 | Highest-click live URL whose service is outside the 92-service catalogue: the population ISSUE-009 is about. |
| S08 | `CH0137960` | `/location/gas-fireplace-service-in-blaine-mn/` | LegacyPage | 34 | Second unmodelled service, different phrase, same city pattern. |
| S09 | `CH0000109` | `/location/chimney-sweep-fireplace-in-minneapolis-mn/` | CityPage (withheld) | 89 | Edge case: the highest-click city page in the state, live in WordPress, withheld by our gate because the branch-page extractor misses branch prose. A known defect, on the most valuable page. |
| S10 | `CH0262405` | `/location/chimney-sweep-fireplace-services-in-saint-paul-mn/` | Redirect | 236 | Edge case: 236 clicks, the highest of any Minnesota URL. The fate map calls it a redirect. Directly tests ISSUE-004, production behaviour against the map. |

Distribution as requested: 2 CityPage, 2 ServicePage, 1 StateHub, 1 NationalHub, 2 Legacy, 2 edge cases.

---

## 2. Production baseline (read only, GET, redirects followed by hand)

| id | first | final | hops | final path | production title |
| --- | ---: | ---: | ---: | --- | --- |
| S01 | 200 | 200 | 0 | `/location/chimney-sweep-repair-in-bloomington-mn/` | Chimney Sweep in Bloomington,MN - Chimcare |
| S02 | 200 | 200 | 0 | `/location/chimney-sweep-repair-in-chanhassen-mn/` | Chimney Sweep in Chanhassen,MN - Chimcare |
| S03 | 200 | 200 | 0 | `/location/gas-fireplace-repair-in-shakopee-mn/` | Gas Fireplace Repair in Shakopee,MN - Chimcare |
| S04 | 200 | 200 | 0 | `/location/chimney-sweep-in-white-bear-lake-mn/` | Chimney Sweep in White Bear Lake,MN - Chimcare |
| S05 | 404 | 404 | 0 | `/locations/mn/` | Page not found - Chimcare |
| S06 | 200 | 200 | 0 | `/locations/` | Chimney Service Locations \| Chimney Company Near Me \| Ch |
| S07 | 200 | 200 | 0 | `/location/gas-fireplace-repair-service-in-plymouth-mn/` | Gas Fireplace Repair & Service in Plymouth,MN - Chimcare |
| S08 | 200 | 200 | 0 | `/location/gas-fireplace-service-in-blaine-mn/` | Gas Fireplace Service in Blaine,MN - Chimcare |
| S09 | 200 | 200 | 0 | `/location/chimney-sweep-fireplace-in-minneapolis-mn/` | Chimney Sweep & Fireplace Services in Minneapolis, MN -  |
| S10 | 301 | 200 | 1 | `/location/chimney-sweep-fireplace-in-st-paul-mn/` | Chimney Sweep & Fireplace Services in St. Paul, MN - Chi |

Nine of the ten are live in production. `/locations/mn/` returns 404 because it is not a legacy URL:
the state hub is a new URL shape introduced by the rebuild, and it is not in the audit universe either.

`S10` is the only redirect. Production answers **301** to `/location/chimney-sweep-fireplace-in-st-paul-mn/`,
and the fate map names the same destination. On this URL the map and production **agree** — which is
evidence about this URL, not a resolution of ISSUE-004.

---

## 3. WordPress source

| id | wp_post_id | bytes | sha256 (first 16) | defects observed |
| --- | ---: | ---: | --- | --- |
| S01 | 128339 | 12792 | `0a05520ab8458705` | wpbakery_shortcode_in_body, script_tag_in_body |
| S02 | 132454 | 11960 | `2e3a20d5c6769512` | wpbakery_shortcode_in_body, script_tag_in_body |
| S03 | 130449 | 12930 | `16c7e63346e939fa` | wpbakery_shortcode_in_body, script_tag_in_body |
| S04 | 131580 | 12038 | `dfb6730fb7fb34c9` | wpbakery_shortcode_in_body, script_tag_in_body |
| S05 | — | — | — | no published WordPress row matches this path |
| S06 | 14 | 13465 | `15dff022cfc0a756` | wpbakery_shortcode_in_body, inline_event_handler |
| S07 | 128390 | 13098 | `df6bf53146a7168b` | wpbakery_shortcode_in_body, script_tag_in_body |
| S08 | 129053 | 12787 | `8a71a2536828bbd8` | wpbakery_shortcode_in_body, script_tag_in_body |
| S09 | 90807 | 46925 | `218e5576b383b537` | wpbakery_shortcode_in_body |
| S10 | — | — | — | no published WordPress row matches this path |

Eight of ten have a source row. Both absences are correct:
`S05` is a new URL with no WordPress page behind it, and `S10`'s post was renamed, which is why
WordPress itself serves the 301. Source is stored byte-for-byte and its hash is recorded.

Every one of the eight carries WPBakery shortcode markup in its stored body, and six also carry a
`<script>` tag. Nothing was repaired: the defects are observed here and neutralised only at the
render boundary.

---

## 4. Rendering and template mapping

| id | expected | rendered | route used | local status |
| --- | --- | --- | --- | ---: |
| S01 | CityPage | **CityPage** | `/location/chimney-sweep-repair-in-bloomington-mn/` | 200 |
| S02 | CityPage | **CityPage** | `/location/chimney-sweep-repair-in-chanhassen-mn/` | 200 |
| S03 | ServicePage | **ServicePage** | `/location/gas-fireplace-repair-in-shakopee-mn/` | 200 |
| S04 | ServicePage | **ServicePage** | `/location/chimney-sweep-in-white-bear-lake-mn/` | 200 |
| S05 | StateHub | **StateHub** | `/locations/mn/` | 200 |
| S06 | NationalHub | **NationalHub** | `/locations/` | 200 |
| S07 | LegacyPage | **LegacyPage** | `/admin/preview/legacy/S07/` | 200 |
| S08 | LegacyPage | **LegacyPage** | `/admin/preview/legacy/S08/` | 200 |
| S09 | CityPage | **CityPage** | `/location/chimney-sweep-fireplace-in-minneapolis-mn/` | 200 |
| S10 | CityPage | **CityPage** | `/location/chimney-sweep-fireplace-services-in-saint-paul-mn/` | 200 |

Every URL rendered through the template it should. Templates received resolved props only; no
template queries the database and no raw row reaches one.

---

## 5. Parity

| id | status | canonical | robots | h1 | title src | desc src | structured data | images | verbatim | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | PASS | PASS | PASS | PASS | REVIEW | REVIEW | PASS | PASS | PASS | **REVIEW** |
| S02 | PASS | PASS | PASS | PASS | REVIEW | REVIEW | PASS | PASS | PASS | **REVIEW** |
| S03 | PASS | PASS | PASS | PASS | REVIEW | REVIEW | PASS | PASS | PASS | **REVIEW** |
| S04 | PASS | PASS | PASS | PASS | REVIEW | REVIEW | PASS | PASS | PASS | **REVIEW** |
| S05 | REVIEW | PASS | PASS | PASS | REVIEW | REVIEW | PASS | PASS | N/A | **REVIEW** |
| S06 | PASS | PASS | PASS | PASS | REVIEW | REVIEW | PASS | PASS | PASS | **REVIEW** |
| S07 | PASS | REVIEW | REVIEW | PASS | REVIEW | REVIEW | PASS | PASS | PASS | **REVIEW** |
| S08 | PASS | REVIEW | REVIEW | PASS | REVIEW | REVIEW | PASS | PASS | PASS | **REVIEW** |
| S09 | PASS | PASS | PASS | PASS | REVIEW | PASS | PASS | PASS | PASS | **REVIEW** |
| S10 | PASS | PASS | PASS | PASS | REVIEW | REVIEW | PASS | PASS | N/A | **REVIEW** |

PASS 0 · REVIEW 10 · FAIL 0. 0 critical conflicts, 27 review.

---

## 6. Every mismatch

| n | code | what it means |
| ---: | --- | --- |
| 10 | `title_not_traceable_to_source` | WordPress has no per-post Yoast title for these pages, so the rendered title comes from a master pattern rather than the source. See ISSUE-025. |
| 9 | `description_not_verbatim_from_source` | WordPress has no per-post Yoast description, so assemble.ts supplies its invented fallback. Specification §18 item 10, now evidenced on nine real pages. See ISSUE-026. |
| 2 | `legacy_url_404s_on_the_production_route` | Expected in this phase: LegacyPage is rendered through the admin source preview and the dispatcher still 404s legacy URLs. ISSUE-006. |
| 2 | `final_url_differs` | A consequence of the line above: the legacy pages were rendered at their preview URL, not their own. |
| 2 | `canonical_and_robots_untestable_for_legacy` | Both belong to the route, and the preview is deliberately noindex with no canonical. Untestable until LegacyPage is routed. |
| 1 | `status_differs` | `/locations/mn/` is 404 in production and 200 locally, because it is a new URL the rebuild introduces. |
| 1 | `redirect_status_differs` | The app emits 308 where production emits 301, on the highest-traffic Minnesota URL. ISSUE-007, now concrete. |

No mismatch was marked PASS. Four critical failures were found on the first run, investigated, fixed and re-run; see §9.

---

## 7. Images

243 images requested across the ten pages, **0 broken**, 0 without alt text.

| id | images | broken | no alt |
| --- | ---: | ---: | ---: |
| S01 | 19 | 0 | 0 |
| S02 | 19 | 0 | 0 |
| S03 | 4 | 0 | 0 |
| S04 | 4 | 0 | 0 |
| S05 | 144 | 0 | 0 |
| S06 | 9 | 0 | 0 |
| S07 | 3 | 0 | 0 |
| S08 | 3 | 0 | 0 |
| S09 | 19 | 0 | 0 |
| S10 | 19 | 0 | 0 |

City heroes are the real WordPress attachments, recovered byte-for-byte and served from their own
upload path. Nothing was renamed, converted or resized. Two of the fifteen Minnesota heroes are
labelled for another state in WordPress itself (`chimney-sweep-boston-MA.jpg`, `Saint-PaulMA.webp`);
they are carried across exactly as stored and flagged, not swapped for something that looks right.

---

## 8. SEO

| id | production title | rendered title | same |
| --- | --- | --- | --- |
| S01 | Chimney Sweep in Bloomington,MN - Chimcare | Chimney Sweep & Fireplace Services in Blooming | no |
| S02 | Chimney Sweep in Chanhassen,MN - Chimcare | Chimney Sweep & Fireplace Services in Chanhass | no |
| S03 | Gas Fireplace Repair in Shakopee,MN - Chimcare | Gas Fireplace Repair in Shakopee, MN - Chimcar | no |
| S04 | Chimney Sweep in White Bear Lake,MN - Chimcare | Chimney Sweep in White Bear Lake, MN - Chimcar | no |
| S05 | Page not found - Chimcare | Chimcare Locations in Minnesota \| Chimney Swee | no |
| S06 | Chimney Service Locations \| Chimney Company Ne | Chimcare Service Locations \| Chimney Sweep, Re | no |
| S07 | Gas Fireplace Repair & Service in Plymouth,MN  | Legacy source preview | no |
| S08 | Gas Fireplace Service in Blaine,MN - Chimcare | Legacy source preview | no |
| S09 | Chimney Sweep & Fireplace Services in Minneapo | Chimney Sweep & Fireplace Services in Minneapo | yes |
| S10 | Chimney Sweep & Fireplace Services in St. Paul | Chimney Sweep & Fireplace Services in St. Paul | yes |

Canonical is self on every page served on its own URL. No page is noindex. No `AggregateRating` or
`Review` markup is emitted anywhere. LegacyPage emits no structured data at all, which is the point
of it. Titles and descriptions are the open finding — see ISSUE-025 and ISSUE-026. No production SEO
was changed and no SEO value was invented to make a check pass.

---

## 9. Responsive, on real pages

18/18 checks with no horizontal overflow, measured on real rendered pages at 390, 834 and 1440.

| width | method | pages | result |
| ---: | --- | ---: | --- |
| 390 | real-window | 6 | 6/6 clean |
| 834 | real-window | 6 | 6/6 clean |
| 1440 | real-window | 6 | 6/6 clean |

Measured against the layout viewport, cross-checked against document, body and visual viewport, and
confirmed by trying to scroll each page sideways and finding it would not move.

---

## 10. Failures found, fixed and re-run

The first run was **SMOKE FAIL**: 4 critical failures, 4 URLs. Each was investigated to a root cause
before anything was changed.

| id | symptom | root cause | fix |
| --- | --- | --- | --- |
| S09, S10 | Production serves 200; the local build serves 404 on the two highest-traffic city pages in the state | `build-mn-seed.mjs` skipped branch pages entirely when reading their "why it matters" prose, and looked for the heading wording only coverage pages use. Branch pages write `Why {City}, MN Homeowners Trust Chimcare`, and put the paragraph in a styled `<span>` rather than a `<p>`. All 14 branch cities therefore reported zero local lines and failed the distinctness gate on prose that was in WordPress the whole time. | Read both heading forms, and take the block between that heading and the next one instead of the next `<p>`. Nothing is written; the prose is the page's own. |
| S07, S08 | Legacy URLs 404 locally | `LegacyPage` exists but the dispatcher still answers 404 for `kind='legacy'`, by design in this phase. | Rendered through a new admin-gated source preview at `/admin/preview/legacy/{pilot}/`. Production routing is unchanged and the 404 is recorded as an expected state, not passed over. |
| S07, S08 | Missing canonical, and `noindex` | Both are properties of the preview route, which is deliberately noindex with no canonical. Testing them there would have measured the preview, not the template. | The checks now record them as untestable for legacy until `LegacyPage` is routed, rather than passing or failing them. |

After the fixes: **0 critical failures, 10 REVIEW**.

The branch-page fix moves the Minnesota publication counts. Before: 110 publishable, 24 needs_review.
After: **120 publishable, 14 needs_review**, of which 3 are branch cities. The sealed baseline is
109/25 and was **not edited**. The change is deliberate, evidenced and recorded as DECISION-016 and
ISSUE-027.

---

## 11. Provenance

Every rendered slot on a city page is traceable. `lib/content/provenance.ts` names the origin of each
one and `provenanceSummary` counts them. Origins are `WORDPRESS`, `BUSINESS_INPUT`, `DERIVED`,
`MASTER_TEMPLATE`, `DESIGN_ASSET` and `ABSENT_IN_SOURCE`.

Straight from WordPress on a city page: the eyebrow's city and state, the hero image and its alt
text, the service areas, the FAQ questions and answers, and the page's own slug. From the client's
business inputs: the branch address, phone and pricing. Recorded as absent rather than filled: the
Google rating, and any Yoast title or description WordPress does not have.

No field is filled from another city, another page, or from copy written during this run.

---

## 12. Gate

**SMOKE REVIEW** — 0 FAIL, 10 REVIEW, 0 PASS.

Nothing rendered wrongly, no image is broken, no canonical is wrong, no page is unexpectedly noindex,
no structured data regressed, no layout breaks at any of the three widths, and every verbatim page
matches its source under the documented cleanup. Ten of ten carry at least one REVIEW item, and all
of them are the same three known, logged things: WordPress has no per-post title or description for
most of these pages, LegacyPage is not routed yet, and the app emits 308 where production emits 301.

None of the three can be closed by this phase. Each is a decision or a phase of its own.
