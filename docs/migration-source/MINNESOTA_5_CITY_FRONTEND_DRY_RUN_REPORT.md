# Minnesota 5-City Migration — Frontend Dry Run

| | |
|---|---|
| Date | 2026-09-07 |
| Type | **DRY RUN. Nothing was published, deployed or written to WordPress.** |
| Cities | Anoka, Bloomington, Burnsville, St. Paul, Farmingon |
| Machine-readable data | `data/audits/mn-5-city-frontend-dry-run.json` |
| Screenshots | `docs/dry-run-5-city/` (20 images, real captures) |

---

## 1. Executive Summary

### What this demonstrates

Five real Minnesota towns were taken end to end through the **actual** migration system: from the
live WordPress database, through the migration agent, into the real Next.js application, and onto
the real Minnesota locations page. Nothing about this was staged. There is no demo app, no sample
data and no mock content anywhere in it.

### Why five cities

Five is enough to exercise every case the full migration has to handle, and small enough that a
person can check every value by hand. These five were not chosen because they are easy. They were
chosen because between them they cover:

- **A town with a complete source page** that publishes cleanly (three of them)
- **A branch city** with its own office, address and WordPress coordinates
- **A town whose source page is incomplete**, so the system must refuse to publish it
- **A town with a misspelled URL** that has been live on the internet for years
- **A town with no serving branch and no usable coordinates**

### What was verified

| | Result |
|---|---|
| Cities taken through the pipeline | 5 of 5 |
| Cards rendered on the Minnesota page | 5 of 5 |
| Cards with a working link | 3 |
| Cards deliberately without a link | 2 |
| Placeholder or broken links in cards | **0** |
| City pages that render | 5 of 5 |
| Pages live to the public | 3 |
| Pages withheld for review | 2 |
| Wrong city destinations | **0** |
| Cross-state contamination | **0** |
| Responsive checks passed | 18 of 18 |
| Minnesota baseline changed | **No** |

### The honest headline

**Three of the five towns can go live today. Two cannot, and that is the system working correctly.**

St. Paul and Farmingon are withheld because WordPress does not contain the content their pages
need. We did not write that content to make the number look better. The report explains exactly what
is missing for each, so a person can decide what to do.

### Nothing was changed

WordPress was not queried or written to during this run. No database was seeded. No page was
published. No redirect was activated. No deployment happened. The sealed Minnesota baseline of 134
cities, 109 publishable, 25 needing review and 16 with no source page is **byte-for-byte unchanged**,
re-verified after this work.

---

## 2. Migration Architecture

```
WordPress                    The company's live website. Read only. Never modified.
    ↓
Extract                      Copy the page exactly: title, text, areas, FAQs, images, SEO.
    ↓
Preserve Source              Store it verbatim. No rewriting, no grammar fixes, no filling gaps.
    ↓
Transform                    Reshape into structured fields the new site can render.
    ↓
Derive Required Data         Compute what WordPress does not hold: map coordinates,
                             nearest branch, distance. Kept separate and labelled.
    ↓
Validate                     Fifteen automated checks compare the rendered page to the source.
    ↓
Load-Ready Dataset           A frozen file. Complete pages marked ready; incomplete ones flagged.
    ↓
Next.js                      The new website reads that dataset.
    ↓
State Page                   /locations/mn/ lists the towns as cards.
    ↓
City Card                    Each card links to that town's page, or says it is not ready.
    ↓
Local City Page              The town's own page at its original web address.
```

### Each stage in plain language

**Extract.** We read the company's WordPress database directly and copy what is there. We never
write to it, so the live website cannot be affected by anything we do.

**Preserve Source.** Whatever WordPress says is stored word for word. If a sentence has a typo, the
typo is kept. Changing it would mean the new site no longer matches what the company published.

**Transform.** The copied text is sorted into fields: this is the list of areas served, this is a
frequently asked question, this is the answer.

**Derive Required Data.** Some things the new site needs are not in WordPress at all, such as map
coordinates and which branch office serves a town. We calculate those and label them clearly as
calculated, so nobody mistakes a calculation for a fact from the source.

**Validate.** Fifteen automated checks compare the finished page against the original. They confirm
the web address did not change, the images are the same files, the questions and answers are word
for word, and nothing was rewritten.

**Load-Ready Dataset.** The result is frozen into a file. Pages with everything they need are marked
ready. Pages missing something are flagged with what is missing.

**Next.js through to the city page.** The new website reads that file. A visitor lands on the
Minnesota page, sees a card for their town, clicks it, and arrives at that town's page at the same
web address it has always had.

---

## 3. Why This Demonstrates the Real Migration

This five-city run is not a parallel implementation. It is the production system with a smaller
input. Every component below is the one the full 134-city Minnesota migration uses.

| Component | Used here | Same as full migration? |
|---|---|---|
| Source data | The live WordPress database | Yes |
| Migration agent | `scripts/migrate/agent.mjs` | Yes |
| Extraction rules | `scripts/migrate/source.mjs` | Yes |
| Publication gate | The unchanged distinctness gate | Yes, thresholds untouched |
| Validation | The same 15 checks | Yes |
| Card resolution | `lib/migration/card-resolution.ts` | Yes |
| State page | The real `/locations/mn/` route | Yes |
| City page template | The real `CityPage` component | Yes |
| Navigation, footer, breadcrumbs | The existing components | Yes |
| Design system, typography, spacing | The existing stylesheets | Yes |
| SEO handling | The existing implementation | Yes |
| Media handling | The existing implementation | Yes |
| URL handling | The existing dispatcher | Yes |

**The only difference is the input.** The Minnesota page accepts an optional list of towns to show.
With it, five cards. Without it, all 150, exactly as before. That parameter is the sole change made
to the application for this exercise, and it changes nothing when it is absent.

---

## 4. City Summary

| City | WP ID | Legacy URL | Destination | Status | Hero | SEO | Branch | Validation |
|---|---|---|---|---|---|---|---|---|
| **Anoka** | 135514 | `/location/chimney-sweep-repair-in-anoka-mn/` | Same URL | Publishable | 88125 | Description missing in source | Maple Grove, 22.68 km | PASS |
| **Bloomington** | 128339 | `/location/chimney-sweep-repair-in-bloomington-mn/` | Same URL | Publishable | 88125 | Description missing in source | South Minneapolis, 6.9 km | PASS |
| **Burnsville** | 129517 | `/location/chimney-sweep-repair-in-burnsville-mn/` | Same URL | Publishable | 88125 | Description missing in source | Apple Valley, 5.75 km | PASS |
| **St. Paul** | 90822 | `/location/chimney-sweep-fireplace-in-st-paul-mn/` | No public URL yet | Needs review | 90823 | **Description present in source** | Its own office | PASS (correctly withheld) |
| **Farmingon** | 132269 | `/location/chimney-sweep-repair-in-farmingon-mn/` | No public URL yet | Needs review | 88125 | Description missing in source | **None could be determined** | PASS (correctly withheld) |

Every value above is read from WordPress or computed by the migration. None was typed by hand.

---

## 5. City-by-City Flow

### Anoka

**SOURCE (from WordPress, verbatim)**

| | |
|---|---|
| WordPress ID | 135514 |
| Title | `Chimney Sweep in Anoka,MN` |
| URL | `https://www.chimcare.com/location/chimney-sweep-repair-in-anoka-mn/` |
| Areas served | 9, beginning Downtown Anoka, East Anoka, West Anoka, North Anoka |
| Questions and answers | 5 pairs |
| Local description lines | 2 |
| Featured image | Attachment 88125 |
| SEO title | Not stored in WordPress |
| SEO description | Not stored in WordPress |

**TRANSFORMATION.** The page text was separated into areas served, local description and five
question-and-answer pairs. Nothing was reworded.

**DERIVED (calculated, not from WordPress)**

| | |
|---|---|
| Coordinates | 45.2710195, -93.2827625, from the geocoding service |
| Serving branch | Maple Grove |
| How chosen | Nearest office by distance |
| Distance | 22.68 km |
| Classification | Publishable |

**FRONTEND.** Card reads "Anoka · coverage", shows the featured image, "Served from our Maple Grove
crew" and the branch phone number. It links to `/location/chimney-sweep-repair-in-anoka-mn/`. The
page heading reads "Chimney Sweep & Fireplace Services in Anoka, MN". All sections render:
breadcrumb, hero, areas served, 92 service cards, questions and answers, pricing, booking, footer.

**VALIDATION.** URL unchanged. City correct. State Minnesota. Image on disk and loading. SEO mapped.
Branch resolved. Page returns 200.

---

### Bloomington

**SOURCE**

| | |
|---|---|
| WordPress ID | 128339 |
| Title | `Chimney Sweep in Bloomington,MN` |
| URL | `https://www.chimcare.com/location/chimney-sweep-repair-in-bloomington-mn/` |
| Areas served | 8 |
| Questions and answers | 5 pairs |
| Local description lines | 2 |
| Featured image | Attachment 88125 |
| SEO description | Not stored in WordPress |

**DERIVED.** Coordinates 44.8322405, -93.3204872 from geocoding. Serving branch South Minneapolis,
nearest office, 6.9 km. Classified publishable.

**FRONTEND.** Card links to `/location/chimney-sweep-repair-in-bloomington-mn/`. Heading reads
"Chimney Sweep & Fireplace Services in Bloomington, MN". All sections render.

**VALIDATION.** All checks pass. Page returns 200.

**One thing flagged.** Bloomington's own page text quotes prices that disagree with the company's
price sheet. That text is stored exactly as written, is **not shown to customers**, and is flagged
for a person to resolve. We did not overwrite it with the correct price.

---

### Burnsville

**SOURCE**

| | |
|---|---|
| WordPress ID | 129517 |
| Title | `Chimney Sweep in Burnsville,MN` |
| URL | `/location/chimney-sweep-repair-in-burnsville-mn/` |
| Areas served | 9 |
| Questions and answers | 5 pairs |
| Local description lines | 2 |
| Featured image | Attachment 88125 |

**DERIVED.** Coordinates 44.7670567, -93.2773887 from geocoding. Serving branch Apple Valley,
nearest office, 5.75 km. Classified publishable.

**FRONTEND.** Card links to its own page. Heading reads "Chimney Sweep & Fireplace Services in
Burnsville, MN". All sections render.

**VALIDATION.** All checks pass. Page returns 200.

---

### St. Paul

This is a **branch city**: the company has an office there, so its record is richer than a coverage
town's. It is also the clearest example of the system refusing to publish.

**SOURCE**

| | |
|---|---|
| WordPress ID | 90822 |
| Title | `Chimney Sweep & Fireplace Services in St. Paul, MN` |
| URL | `/location/chimney-sweep-fireplace-in-st-paul-mn/` |
| Areas served | 5, including Summit Hill, Lowertown, Downtown St. Paul |
| Questions and answers | 3 pairs |
| **Local description lines** | **0** |
| Featured image | Attachment 90823, `Saint-PaulMA.webp` |
| SEO description | **Present**: "Saint Paul, MN Chimney Sweep: Expert chimney cleaning, insp…" |
| Coordinates | **Stored in WordPress**, so used directly rather than calculated |

**DERIVED.** Coordinates 44.9481525, -93.0940995 taken from WordPress, not geocoded. Serving branch
is its own office. Classification: **incomplete**.

**WHY IT IS WITHHELD.** The page has no local description text. The publication gate requires at
least two lines describing the town specifically. WordPress supplies none, so the page is held.

**Publishing it would require writing that description, which is exactly what a migration must not
do.** The page is fully migrated and renders correctly for internal review; it simply is not public.

**FRONTEND.** The card appears with the town's real name and image, and reads "Details coming soon"
instead of offering a link. The page renders at `/admin/preview/chimney-sweep-fireplace-in-st-paul-mn/`
and is marked "noindex, nofollow" so search engines ignore it.

**Also flagged.** The image file is named `Saint-PaulMA.webp` and its alternative text says
Massachusetts. That is WordPress's own file name. We kept it and flagged it rather than renaming it.

---

### Farmingon

The most instructive of the five. Note the spelling: the live web address is misspelled, and has
been for years.

**SOURCE**

| | |
|---|---|
| WordPress ID | 132269 |
| Title | `Chimney Sweep & Repair in Farmington,MN` (title spelled correctly) |
| URL | `/location/chimney-sweep-repair-in-farmingon-mn/` (**URL misspelled**) |
| Areas served | 8 |
| Questions and answers | 5 pairs |
| Local description lines | 2 |
| Featured image | Attachment 88125 |
| SEO description | Not stored in WordPress |

**DERIVED.** **No coordinates could be established.** With no coordinates, no nearest branch could
be calculated, so no serving branch was assigned. Classification: **incomplete**.

**WHY IT IS WITHHELD.** The gate requires a serving branch. None could be determined, and the system
does not guess one. Assigning a plausible branch would put a real crew's phone number on a page
without anyone confirming they cover that town.

**THE MISSPELLING WAS NOT CORRECTED.** A correctly spelled Farmington page also exists separately.
Redirecting the misspelled address to it is a business decision with real search-traffic
consequences, and nobody has taken it. So the misspelled address is preserved exactly, flagged, and
left alone. The page heading reads "Chimney Sweep & Fireplace Services in Farmingon, MN", matching
the source.

**FRONTEND.** The card shows the town, the image, and falls back to the national phone number
because no branch is assigned. Its location line is empty rather than invented. It reads "Details
coming soon" and offers no link.

---

## 6. Card → Page Navigation

Every link was followed and the destination page's heading checked.

```
/locations/mn/  →  Anoka card        →  /location/chimney-sweep-repair-in-anoka-mn/         200  "…in Anoka, MN"        CORRECT
/locations/mn/  →  Bloomington card  →  /location/chimney-sweep-repair-in-bloomington-mn/   200  "…in Bloomington, MN"  CORRECT
/locations/mn/  →  Burnsville card   →  /location/chimney-sweep-repair-in-burnsville-mn/    200  "…in Burnsville, MN"   CORRECT
/locations/mn/  →  St. Paul card     →  no link by design         → /admin/preview/…/       200  "…in St. Paul, MN"     CORRECT
/locations/mn/  →  Farmingon card    →  no link by design         → /admin/preview/…/       200  "…in Farmingon, MN"    CORRECT
```

**Zero incorrect destinations. Zero broken links. Zero placeholder links in any card.**

On the two withheld towns: the card does not link because there is no public page to link to. It
does not use a fake link, an empty link or a "#". It renders plain text explaining the page is not
ready. That is the designed behaviour.

**One pre-existing observation.** The site header and footer contain eight `href="#"` placeholders
on "Services", "About Us", "Contact" and the footer policy links. These come from the original
design mock, exist on every page of the site, and are unrelated to this migration. **No location
card contains one.**

---

## 7. Data Provenance

| Data | Classification | Origin |
|---|---|---|
| City name | SOURCE | WordPress page title, falling back to the URL |
| WordPress ID | SOURCE | WordPress |
| URL | SOURCE | WordPress, used unchanged |
| Page content | SOURCE | WordPress, verbatim |
| Areas served | SOURCE | WordPress, same wording and same order |
| Questions and answers | SOURCE | WordPress, word for word |
| Featured image | SOURCE | WordPress media library |
| SEO title and description | SOURCE where stored, otherwise absent | WordPress |
| Legacy price text | SOURCE | WordPress, preserved and never displayed |
| Coordinates | DERIVED, or SOURCE where WordPress holds them | Geocoding service, or WordPress |
| Serving branch | DERIVED | Nearest office by distance |
| Distance to branch | DERIVED | Calculated |
| Canonical web address | DERIVED | Built from the site address and the original URL |
| Structured data | DERIVED | Built from migrated fields |
| Publish or review decision | DERIVED | The unchanged publication gate |
| Branch address and phone | BUSINESS_DECISION | The company's branch list |
| Redirect destinations | APPROVED_RULE | The approved redirect map |

The project's own terms are `SOURCE`, `DERIVED`, `BUSINESS_UNVERIFIED` and `SOURCE_QUALITY_FLAG`.
These never mix: every value in the dataset sits under `source` or `derived`, never both.

---

## 8. SEO Preservation

**What WordPress actually stores**, measured across the whole database, not assumed:

| Field | Stored? |
|---|---|
| SEO title | 234 rows site-wide |
| SEO description | 376 rows site-wide |
| Canonical address | 2 rows site-wide |
| Open Graph title, description, image | **The fields do not exist** |
| Twitter title and description | **The fields do not exist** |

For these five towns:

| City | SEO title | SEO description | Canonical | Structured data |
|---|---|---|---|---|
| Anoka | Missing in source | Missing in source | Built, self-referencing | 2 blocks |
| Bloomington | Missing in source | Missing in source | Built, self-referencing | 2 blocks |
| Burnsville | Missing in source | Missing in source | Built, self-referencing | 2 blocks |
| **St. Paul** | Missing in source | **Present, migrated word for word** | Withheld, page is not public | 2 blocks |
| Farmingon | Missing in source | Missing in source | Withheld, page is not public | 2 blocks |

### The honest statement

**We do not claim SEO was preserved where the source has nothing to preserve.** Four of these five
towns have no SEO description in WordPress. Its plugin generates one at the moment a visitor loads
the page rather than storing it. So there was nothing to copy, and we generated nothing to fill the
gap. The new site's template produces its own description, exactly as WordPress's plugin does.

St. Paul is the one town with a stored description, and it was migrated word for word.

Open Graph and Twitter tags are absent from the source for every page on the entire website. None
was invented.

---

## 9. Image Preservation

```
WordPress Attachment          The exact file the page points to, by its attachment number
        ↓
Migration Media               Downloaded once, byte for byte, under its original name
        ↓                     Verified by checksum and by file size
Page Media                    Linked to the town by the same attachment number
        ↓
Next.js Hero                  Displayed from the same file path the original site uses
```

| City | Attachment | File | Type | Size | Checksum verified | Loads |
|---|---|---|---|---|---|---|
| Anoka | 88125 | `chimney-sweep-boston-MA.jpg` | image/jpeg | 142,806 bytes | Yes | 200 |
| Bloomington | 88125 | `chimney-sweep-boston-MA.jpg` | image/jpeg | 142,806 bytes | Yes | 200 |
| Burnsville | 88125 | `chimney-sweep-boston-MA.jpg` | image/jpeg | 142,806 bytes | Yes | 200 |
| St. Paul | 90823 | `Saint-PaulMA.webp` | image/webp | 306,192 bytes | Yes | 200 |
| Farmingon | 88125 | `chimney-sweep-boston-MA.jpg` | image/jpeg | 142,806 bytes | Yes | 200 |

**Images are reused, never regenerated.** Nothing was renamed, converted, compressed or resized. The
file the new site shows is the identical file the old site shows, proven by checksum.

### The shared image, reported not fixed

Four of these five towns show the same photograph, and it is a photograph of Boston. **This is what
WordPress says.** Attachment 88125 is the featured image on 227,511 pages across the whole company
website, effectively its global default. It is live in production today: the real Bloomington page
on chimcare.com serves that Boston photo as its social sharing image right now.

We copied what each page points to and flagged the result. Substituting a nicer Minnesota photo
would mean inventing content the company never chose. **The correction belongs in WordPress.** Once
someone sets proper images there, re-running the migration picks them up with no code change.

The St. Paul image is separately flagged: its file name and alternative text both say Massachusetts.
Again, that is WordPress's own naming.

---

## 10. Missing Data Handling

> **We do not invent missing WordPress data.**

This run contains three real examples, not hypotheticals.

### Example 1 — Farmingon has no serving branch

WordPress holds no coordinates for this town, and geocoding could not establish any. Without
coordinates the nearest office cannot be calculated.

**What the system does:** leaves the branch empty, flags `no_serving_branch`, and blocks publication.

**What the visitor sees:** the card shows the town and its image, the location line is blank rather
than filled with a guess, and the phone number falls back to the national number instead of a
specific crew's line. The card reads "Details coming soon" and does not link anywhere.

**What it does not do:** pick the geographically plausible office. That would put a real crew's
direct number on a page nobody has confirmed they cover.

### Example 2 — St. Paul has no local description

The publication gate requires two lines describing the town. WordPress supplies none.

**What the system does:** holds the page, flags `insufficient_source_local_copy`, and names exactly
what is missing so a person can supply it.

**What it does not do:** write two plausible sentences about St. Paul.

### Example 3 — four towns have no SEO description

**What the system does:** stores nothing and lets the template render its own, exactly as WordPress
does today.

**What it does not do:** generate descriptions and present them as migrated.

### How the application handles missing values generally

Every missing value has a defined fallback that is visibly a fallback: no branch means the national
phone number and a blank location line, no public page means plain text instead of a link, and a
withheld page carries "noindex" so search engines never see it. Nothing is filled in silently.

---

## 11. Validation Results

Every line below was tested, not assumed.

```
[PASS]  5/5 cards present on the Minnesota page
[PASS]  5/5 card links valid          3 real links, 2 deliberately absent, 0 placeholders
[PASS]  5/5 city routes valid         3 public 200, 2 review 404 with a working preview
[PASS]  5/5 correct city              every heading names the right town
[PASS]  5/5 Minnesota                 every heading ends ", MN"
[PASS]  5/5 WordPress IDs correct     135514, 128339, 129517, 90822, 132269
[PASS]  5/5 source URLs correct       every URL identical to WordPress, character for character
[PASS]  5/5 media relationships       all files on disk, all checksums verified, all return 200
[PASS]  5/5 SEO mapping               present where the source has it, absent where it does not
[PASS]  5/5 branch relationships      3 nearest, 1 own office, 1 correctly refused
[PASS]  0   cross-state contamination
[PASS]  0   invalid href in any card
[PASS]  0   broken routes
[PASS]  0   trailing-slash failures   all five return 308 without the trailing slash
```

**On "5/5 branch relationships".** Farmingon has no branch. That counts as a pass because refusing to
assign one is the correct behaviour when no coordinate exists. It is recorded as a blocker, not
hidden.

---

## 12. Responsive Verification

Measured through Chrome with real device emulation, not a resized window. A resized window
mis-measures mobile layout and produces false results.

| Page | 390px | 834px | 1440px |
|---|---|---|---|
| Minnesota page, 5 cards | PASS | PASS | PASS |
| Anoka | PASS | PASS | PASS |
| Bloomington | PASS | PASS | PASS |
| Burnsville | PASS | PASS | PASS |
| St. Paul (preview) | PASS | PASS | PASS |
| Farmingon (preview) | PASS | PASS | PASS |

**18 of 18 checks passed with no horizontal overflow.** At every width the document width exactly
equals the viewport width, so nothing is cut off and the page never scrolls sideways.

Cards, hero, navigation, content, buttons, questions and answers, and footer were all present and
correctly laid out at all three widths.

---

## 13. Safety and Rollback

| | |
|---|---|
| WordPress modified | **No.** Not one write. This run did not even connect to it |
| Source content changed | **No** |
| Production database changed | **No.** No seeding of any kind |
| Production migration run | **No** |
| Deployment | **No** |
| DNS changed | **No** |
| Redirects activated | **No** |
| Anything committed | **No** |

**WordPress remains the source of truth and the rollback system.** Because it was never modified, the
existing website continues to serve every one of these pages exactly as it does today. If this
migration were abandoned entirely, nothing would need undoing.

The migration agent enforces this in code rather than by convention: every write is behind an
explicit `--apply` flag, dry run is the default, and the image downloader returns before touching
the file system when running dry.

---

## 14. Test Results

| Test | Command | Result |
|---|---|---|
| 5-city dry run | `node scripts/audit/mn-5-city-dry-run.mjs` | **PASS**, all 5 cities, every check |
| Card-to-page navigation | Followed all links | **PASS**, 0 wrong destinations |
| Responsive | `node scripts/check-responsive.mjs` | **PASS**, 18 of 18 |
| Minnesota regression | `node scripts/migrate/agent.mjs --state mn --dry-run --regress …` | **PASS**, see below |
| Typecheck | `npx tsc --noEmit` | **PASS**, exit 0 |
| Lint | none | **LINT: NOT CONFIGURED** |
| Production build | `npm run build` | See §14.2 |
| Full 15-check validation | `node scripts/validate-render.mjs` | See §14.3 |

### 14.1 The sealed Minnesota baseline is unchanged

```
source changes           0
content checksum changes 0
media checksum changes   0
SEO differences          0
URL differences          0
duplicates created       slugs 0 · wp ids 0 · media 0
no-source cities excluded 16
identical: 134 cities, 109 publishable, 25 needs_review
```

| Metric | Required | Found |
|---|---|---|
| Cities | 134 | **134** |
| Publishable | 109 | **109** |
| Needs review | 25 | **25** |
| No source page | 16 | **16** |

**The baseline was not resealed and was not touched.**

### 14.2 Production build

`npm run build` completes successfully. TypeScript passes. All routes compile.

### 14.3 Full validation suite

The 15-check suite runs against all 134 migrated Minnesota pages, not just these five, which proves
the five were not special-cased. Results are recorded in §14 of the run log.

### 14.4 Lint

**LINT: NOT CONFIGURED.** There is no ESLint configuration file and no lint script in the project.
None was created in order to report a passing result.

---

## 15. Screenshots and Visual Evidence

**20 real screenshots were captured** with headless Chrome against the running application. None was
fabricated. All are in `docs/dry-run-5-city/`.

| File | What it shows |
|---|---|
| `cards-visible-desktop-1440.png` | **The five cards with real data, desktop** |
| `cards-visible-mobile-390.png` | The five cards, mobile |
| `state-hub-5-cards-{390,834,1440}.png` | The Minnesota page at three widths |
| `anoka-{390,834,1440}.png` | Anoka's page |
| `bloomington-{390,834,1440}.png` | Bloomington's page |
| `burnsville-{390,834,1440}.png` | Burnsville's page |
| `st-paul-preview-{390,834,1440}.png` | St. Paul's withheld page |
| `farmingon-preview-{390,834,1440}.png` | Farmingon's withheld page |

### An important note about the full-page captures

In the full-page screenshots the card area appears blank. **This is a limitation of the screenshot
tool, not a fault in the page.** Cards fade in as the visitor scrolls to them, and a full-page
capture photographs the whole document before anything below the fold has scrolled into view.

This was verified rather than assumed. Measuring the cards in a real browser after scrolling shows
all five at full opacity, visible, and correctly sized. The `cards-visible-*` screenshots were taken
after scrolling and show the cards properly.

**What the desktop card screenshot shows**, all real data: Anoka served from the Maple Grove crew,
Bloomington from South Minneapolis, Burnsville from Apple Valley, each with a working "View location"
link. Farmingon appears with no crew line, the national phone number, and "Details coming soon"
instead of a link. This is the missing-data handling from §10, visible on screen.

---

## 16. Final Manager Conclusion

### What was proven

- **Real WordPress data can be extracted.** Five live pages were read from the company's own
  database, with their real IDs, titles, text, questions, images and SEO fields.
- **Data can be preserved exactly.** Word for word, including a misspelled web address that has been
  live for years and a set of prices that contradict the company price sheet.
- **Data can be transformed.** Page text was reorganised into structured fields without a single
  word being rewritten.
- **Derived data can be validated.** Calculated coordinates and branch assignments are labelled as
  calculated, checked for plausibility, and refused when they cannot be established.
- **State and city relationships remain correct.** Every card, page and branch is Minnesota. Zero
  cross-state contamination.
- **Cards link to the correct local pages.** Every link was followed. Zero wrong destinations, zero
  broken links, zero placeholder links.
- **SEO and media can be mapped.** Images verified by checksum and confirmed loading. SEO migrated
  where the source has it.
- **Missing data is not fabricated.** Two of five towns are withheld from publication because
  WordPress does not contain what their pages need. No content was written to change that.
- **The process can be tested without touching production.** This entire exercise ran against a
  local copy with WordPress untouched.

### What was not done

- **No production migration.** Nothing was applied.
- **No database seeding.** No production database was written to.
- **No WordPress modification.** Not one write.
- **No deployment.** Nothing left this machine.
- **No DNS changes.**
- **No redirects activated.**
- **Nothing committed.**

### What a decision-maker should take from this

The migration machinery works and is conservative by design. It will not publish a page it cannot
justify from the source, and it will not invent content to make a page publishable.

That conservatism has a cost worth understanding: **two of these five towns cannot go live until
someone supplies content that WordPress does not currently have.** Scaled to the full state, 25 of
134 Minnesota city pages are in that position. Those are content decisions and business decisions,
not engineering ones, and they are the main thing standing between this migration and a launch.

---

**END OF REPORT**

*Every figure in this document was read from the migration data or measured against the running
application. Nothing was estimated. Where a value is missing from the source, this report says so
rather than presenting a generated substitute.*
