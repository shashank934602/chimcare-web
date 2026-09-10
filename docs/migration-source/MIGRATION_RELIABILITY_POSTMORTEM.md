# Migration Reliability Postmortem

**An engineering assessment of the Chimcare WordPress → Next.js migration: what broke, what almost
broke, what we got wrong, and what must change before another state is migrated.**

| | |
|---|---|
| Repository | `~/Desktop/chimcare/chimcare-web 2` |
| Written | 2026-09-06 |
| Evidence | Fresh repository inspection, read-only WordPress queries, and validation runs executed 2026-09-05 and 2026-09-06 |
| Scope | Minnesota (migrated, validated, unpublished). Massachusetts (analysed only). |
| Companions | `MIGRATION_IMPLEMENTATION.md`, `URL_MIGRATION_STRATEGY.md` |

## Classification used throughout

| Label | Meaning |
|---|---|
| **CONFIRMED** | Reproduced with evidence quoted in this document |
| **LIKELY** | Strong indirect evidence, not directly reproduced |
| **POTENTIAL RISK** | Mechanism exists; has not yet occurred |
| **NOT VERIFIED** | Could not be confirmed from this repository. Treated as unknown, not as fact |

---

# 1. EXECUTIVE SUMMARY

## How reliable is the migration today?

**For Minnesota, on the data it actually migrated: high. For migrating a second state: not ready.**

That distinction is the whole answer. The 134 Minnesota pages have been copied faithfully and proven
so. But almost every reliability property that made that true is currently **specific to Minnesota
by accident rather than by design**, and three defects found while writing this document would have
shipped if we had proceeded.

### What is genuinely solid

- **Content fidelity is proven, not asserted.** Every FAQ question and answer, every area name and
  every local sentence is compared verbatim against source on every page. 134/134 pass.
- **Media fidelity is proven at the byte level.** Every hero image is SHA-256 checksummed against
  the bytes WordPress serves. 15/15 assets verified, 0 problems.
- **The pipeline is idempotent.** Two consecutive apply runs produce byte-identical dataset and
  ledger; nothing is re-downloaded and nothing is duplicated.
- **Dry run genuinely writes nothing** — verified in code, not assumed.
- **The publishability gate has never been loosened** to make numbers look better, under repeated
  pressure to do so.

### Major risks that remain open

| Risk | Status |
|---|---|
| **Geocode cache is shared across states and keyed by bare city name** | **CONFIRMED — found writing this document.** A Massachusetts run would silently inherit Minnesota coordinates for same-named towns |
| **`pages` has no `state_id`; 2,657 rows have no path to a state at all** | **CONFIRMED.** Nothing structurally prevents cross-state mixing once a second state lands |
| **A redirect loop we introduced, pointing at a live page** | **CONFIRMED, OPEN** |
| **3 Minnesota URLs redirecting to an Oregon page** | **CONFIRMED, OPEN** |
| **The legacy URL universe still comes from a Minnesota-only builder** | **CONFIRMED, OPEN** |
| **Single-state hard-coding in the app** | **CONFIRMED, OPEN** |

### Remaining blockers before another state

Six P0 items in §15. The three that matter most: fix the redirect key collapse, make state identity
structural rather than incidental, and add the redirect and cross-state tests that would have caught
these defects automatically instead of by manual inspection.

### The honest summary

Minnesota succeeded because the work was done carefully and checked repeatedly, **not because the
system prevents mistakes**. Several defects were caught by a person looking, not by a test. Until
the tests in §14 exist, a second state carries meaningful risk of silent error.

---

# 2. MIGRATION RELIABILITY PRINCIPLE

```
FETCH EXACTLY → STORE EXACTLY → VERIFY EXACTLY → RENDER WITHOUT ALTERING SOURCE DATA
```

Reliability means all of the following, and any one failing means the migration is not reliable:

| Property | Currently proven? |
|---|---|
| No missing records | **Yes** for city pages — 137 discovered, 3 duplicates redirected, 134 migrated, reconciled |
| No duplicated records unless the source has duplicates | **Yes** — 134 distinct WP IDs, 134 distinct URLs, 0 duplicates across two apply runs |
| **No cross-state data contamination** | **NOT PROVEN.** No test exists. §8 documents a live mechanism |
| No incorrect city/page associations | **Partly** — enforced by code, only partly by the database |
| No unexpected URL changes | **Yes** for the 134 city pages. **NOT PROVEN** for the other 20,345 rows |
| No incorrect redirects | **NO — 3 confirmed defects**, see §4.P and §11 |
| No missing media | **Yes** — 134/134, 15 distinct assets verified |
| No incorrect media associations | **Yes** at source level; a frontend mapping bug did occur (§4.H) |
| No SEO loss | **Yes** for migrated pages; canonical, description and JSON-LD checked per page |
| No content mutation | **Yes** — verbatim comparison on every page |
| No silent source-data correction | **Yes** — a live misspelling and 20 malformed pages were preserved and flagged |
| No nondeterministic migration | **Mostly** — see §16 |
| No unverified assumptions | **NO.** Several assumptions were wrong; see §5 |

---

# 3. COMPLETE PROBLEM INVENTORY

| ID | Problem | Category | Severity | Status | Root cause | Detection | Fix | Prevention |
|---|---|---|---|---|---|---|---|---|
| **P1** | Pilot dataset was entirely placeholder (fake address, 555 phone, 4 test cities) | SOURCE DATA | High | **Fixed** | Prototype shipped with invented data marked only in comments | Read the seed file before trusting it | Rebuilt from real sources | Data-source indicator now surfaced in `/api/health` and `/admin/migration` |
| **P2** | Every FAQ question missing after extraction | EXTRACTION | Critical | **Fixed** | Question is a shortcode *attribute*; the extractor stripped whole shortcode tags | All 134 pages showed zero FAQs | Read questions from raw `post_content` | Validation check 4 asserts every source FAQ appears verbatim |
| **P3** | Malformed `</vc_column_text]` destroyed whole FAQ sections in the export | SOURCE DATA | High | **Flagged, not repaired** | Typo in WordPress content | Recovered FAQs did not appear in the export text | Detection only, from raw content | Flag `source_markup_defect` on 20 pages |
| **P4** | Postcode regex matched the street number | TRANSFORMATION | High | **Fixed** | `14870 Granada Ave … 55124` starts with a 5-digit number | 3 of 14 branches failed to match | Match street number **plus** the branch's own postcode | 14/14 branches match; asserted in the regression |
| **P5** | 3 geocodes resolved to same-named places elsewhere | GEOCODING | High | **Fixed by rejection** | Becker/Grant County; St. Anthony in Stearns County | Distance to nearest branch 71–166 miles | Coordinates **dropped, not guessed** | Explicit reject list + a distance threshold that flags new cases |
| **P6** | Baseline counts stated as 151/121/135 | PROCESS | Medium | **Fixed** | My arithmetic error, propagated into a locked instruction | Re-derived from the dataset | Corrected to 150/120/134 | Every figure in later documents re-read from disk |
| **P7** | Massachusetts declared "structurally alien"; only 26 pages seen | PROCESS | High | **Fixed** | Used taxonomy alone; missed 217 slug-matched pages | Cross-checked both identification methods | Two-layer model documented | Both methods now mandatory in the pre-migration checklist (§21) |
| **P8** | Hub cards showed no images | FRONTEND | Medium | **Fixed** | Card read `branch.photoKey`, null for every branch | Visual inspection | Card reads the city's own migrated hero | — |
| **P9** | Hero search box did nothing | FRONTEND | Medium | **Fixed** | Mock markup ported without its script | Manual test | Wired as a real island with URL state | Browser test with real keystrokes |
| **P10** | Search matched all 150 towns for any letter in "Minnesota" | FRONTEND | Low | **Fixed** | State name included in every card's search index | Typing "a" returned Bayport | Removed state name from the index | — |
| **P11** | "Saint Paul" and "St Paul" returned nothing | FRONTEND | Low | **Fixed** | Raw substring match | Browser test | Folded matching | — |
| **P12** | **Redirect loop pointing at a live page** | REDIRECTS | **Critical** | **OPEN** | Redirects keyed by last path segment, collapsing two distinct URLs | Redirect audit written for this document | **Not applied** | §11 |
| **P13** | **3 Minnesota URLs redirect to an Oregon page** | REDIRECTS | **Critical** | **OPEN** | Business redirect map; 143 entries target it | Same audit | **Not applied** — needs the business | §11 |
| **P14** | A two-hop redirect chain | REDIRECTS | Low | **OPEN** | Duplicate retired, then the duplicate rule | Same audit | Flatten at publish | §11 |
| **P15** | **Geocode cache shared across states, keyed by bare city name** | GEOCODING | **Critical** | **OPEN** | `GEOCACHE` hard-coded to `mn-geocode.json` | **Found writing this document** | **Not applied** | §8 |
| **P16** | **`pages` has no state column; 2,657 rows have no path to a state** | DATABASE | **High** | **OPEN** | State reachable only via `city_id` | Schema inspection for this document | **Not applied** | §8, §9 |
| **P17** | `faqs.scopeId` is polymorphic with no foreign key | DATABASE | Medium | **OPEN** | Deliberate polymorphic design | Schema inspection | — | §9 |
| **P18** | Single-state hard-coding in app and agent | PROCESS | High | **OPEN** | Pilot was single-state | Code inspection | — | §8 |
| **P19** | Legacy URL universe depends on a Minnesota-only builder | URLS | High | **OPEN** | Pilot builder still the only producer | Known since wiring | Planned change B | §4.P |
| **P20** | `_wp_old_slug` unusable as a redirect source | URLS | Medium | **Deliberately unused** | Duplication artifacts; one value claimed by 75 pages | Investigation | Not extracted | §11 |
| **P21** | Boston image is the hero on 120 MN pages (211k site-wide) | SOURCE DATA | Medium | **Flagged, not changed** | Site-wide default featured image in WordPress | Media audit | Preserved exactly | Two flags per affected city |
| **P22** | Edit scripts reported success without asserting the edit applied | PROCESS | **High** | **Fixed** | `str.replace` returns the original on no match; print ran unconditionally | A prop rename silently failed and crashed the page | Scripts now assert and abort | — |
| **P23** | Hydration errors after client-component edits | FRONTEND | None (dev only) | **Not a defect** | Browser holding a stale bundle | Console | Clear `.next`, hard refresh | Dev-only; never reaches production |

---

# 4. PROBLEMS WE ACTUALLY ENCOUNTERED

## A. PostgreSQL 16 unavailable or broken — **NOT VERIFIED**

**No such incident occurred in this project.** There is no PostgreSQL 16 anywhere in it.

**What actually exists**, from `lib/db/client.ts`: with `DATABASE_URL` unset the app runs
**PGlite**, Postgres compiled to WASM, in memory, migrated and seeded on first request. With it set,
it connects to **Supabase** through `postgres-js` with `prepare: false`. **Supabase has never been
connected.**

**How database health is verified today:** `/api/health/` returns the driver in use and a live row
count (currently `pglite`, 20,479 pages). That is the extent of it. There is **no** schema-drift
check, no constraint verification, and no reconciliation between dataset and database (§20).

## B. Duplicate WordPress postmeta — **POTENTIAL RISK, not encountered**

Extraction uses `LEFT JOIN wp_postmeta … AND meta_key = '…'`. If a page had **two rows for the same
key**, the join would multiply result rows and silently duplicate the page.

**Tested 2026-09-05** across the nine meta keys we read, on all Minnesota city pages:

```sql
SELECT meta_key, COUNT(*) FROM (
  SELECT post_id, meta_key, COUNT(*) c FROM wp_postmeta
  WHERE meta_key IN (…) AND post_id IN (…Minnesota city pages…)
  GROUP BY post_id, meta_key HAVING c > 1) d GROUP BY meta_key;
→ (empty result set)
```

**No duplicates exist in Minnesota, so the joins are safe there.** This is untested for every other
state and is now a mandatory pre-migration check (§21).

**On uniqueness: it must not be imposed.** If duplicates are found they must be **preserved and
reported**, never de-duplicated by arbitrary choice. WordPress resolves duplicates by lowest
`meta_id`; any other selection silently changes a page's data. Adding a unique constraint on
`(post_id, meta_key)` in our own schema would be a source-data correction and is forbidden.

## C. PHP-serialized metadata / thumbnail ID — **NOT VERIFIED as an incident**

No misinterpretation occurred. `_wp_attachment_metadata` is PHP-serialized and is parsed by
`parseAttachmentMeta()` in `scripts/migrate/source.mjs:192`, which extracts width, height, filesize
and file path by targeted pattern match rather than a general unserializer.

`_thumbnail_id` is a plain integer meta value and was never ambiguous.

**What does prevent recurrence:** validation check 6 compares the bytes on disk against the
`filesize` this parser extracted. If the parse were wrong, the size check would fail. 134/134 pass.

**A real limitation worth stating:** the parser is regex-based, not a true unserializer. It reads
only top-level scalar keys. It would not correctly read nested structures such as the `sizes` array,
and it has never been tested against malformed serialization. **POTENTIAL RISK for other states.**

## D. MySQL CLI newline / checksum discrepancy — **NOT VERIFIED**

No such discrepancy occurred. The mechanism that would cause it was avoided by construction:
**MySQL builds the JSON itself** via `JSON_ARRAYAGG(JSON_OBJECT(...))`, and the CLI is invoked with
`-N -B --raw`. Node parses one JSON document. No delimiter or newline parsing happens on our side.

**The canonical checksum method, as implemented:**

- **Binary (media):** `sha256(bytes)` over the file as downloaded — `source.mjs`.
- **Structured data:** `hashJson()`, which serialises with **keys sorted recursively** before
  hashing, so key ordering can never change a digest.
- **Source record:** `sha256` over `post_content` plus meta values joined by a NUL separator, chosen
  so no field value can impersonate a separator.

This is the method to keep. Any future checksum must sort keys and must never hash CLI text output.

## E. WPBakery malformed source markup — **CONFIRMED, flagged, not repaired**

```
</vc_column_text]     instead of     [/vc_column_text]
```

Found on **20 Minnesota city pages**. A shortcode strip leaves the stray token behind; an HTML
parser then swallows everything after it. That is how the original export lost entire FAQ sections.

**This is source data.** It is detected from raw `post_content` by `markupDefectsFrom()`, recorded as
`source_markup_defect`, and **never repaired**. The raw source is read and left byte-for-byte
identical. The fix belongs in WordPress.

**Worth noting on detection quality:** the agent's direct detection found **3 more pages** than the
pilot's indirect inference (Lauderdale, Mound, Roseville), where the defect sits after the accordion
opens so only part of the FAQ was lost. Detecting a defect directly beats inferring it from a
downstream symptom.

## F. Reveal / animation blank content — **NOT VERIFIED as an incident**

No such bug was found, and none was fixed. `components/islands/Reveal.tsx` was reviewed:

- All content is present in the server HTML; the island only adds a fade-up class
- `prefers-reduced-motion: reduce` reveals everything immediately
- Missing `IntersectionObserver` reveals everything immediately
- `styles/base.css` also forces `opacity: 1` under reduced motion

**However, the underlying risk is real and untested.** We have **no visual regression test**. A CSS
or island change that left content at `opacity: 0` would pass all 15 checks, because they read the
HTML, not the rendered pixels. **POTENTIAL RISK — see §14.**

## G. Nested JSON-LD / script corruption — **NOT VERIFIED**

No such incident. `components/seo/JsonLd.tsx` maps each object to a **sibling** `<script>` element,
never nested, and escapes `<` to `<` to prevent early tag termination.

**What is checked:** validation check 9 parses every JSON-LD block on all 134 pages; a parse failure
fails the check. All pass.

**What is not checked: byte-level JSON-LD parity against WordPress.** We do not compare our
structured data to what WordPress emits, because we deliberately do **not** migrate WP Schema Pro
(§4.I). So "JSON-LD parity" is not a meaningful target here — ours is constructed from migrated
fields, and correctness is asserted by type and content, not by matching the old markup.

## H. Minnesota hub image / photoKey — **CONFIRMED, fixed**

City hero images existed and were correctly migrated. The **hub card** asked for `branch.photoKey`,
which is `null` for every branch and does not exist on coverage cities, so all 150 cards rendered
the no-image header while 134 verified images sat unused in `public/uploads/`.

**This was frontend mapping, not media migration failure.** The media pipeline was correct
throughout; the presentation layer read the wrong field.

**Correct mapping**, now in `assemble-hubs.ts`: the card uses `city.heroImageKey` with
`city.heroImageAlt`, falling back to a descriptive alt only when WordPress has none — the same
pattern `CityPage` already used.

**The lesson is the important part:** every one of the 15 validation checks passed while this bug
was live, because no check asserted that the hub renders images. Validation covering city pages said
nothing about the hub.

## I. Shared Boston hero image — **CONFIRMED source-data issue, correctly preserved**

Investigated directly in the database.

```
chimney-sweep-repair-in-anoka-mn        → _thumbnail_id 88125
chimney-sweep-repair-in-bloomington-mn  → _thumbnail_id 88125
attachment 88125 = "chimney-sweep-boston-MA" (image/jpeg)
```

**It is not a Minnesota problem.** Attachment 88125 is the featured image on roughly **211,000
pages across every state**: California 55,855 · Massachusetts 34,006 · Washington 32,824 · Oregon
31,137 · Illinois 19,771 · Minnesota 19,000 · Connecticut 12,345 · Ohio 6,378.

**It is live in production now.** The real Bloomington, Minnesota page returns 200 and its
`og:image` is that Boston file. That is what social platforms and Google see today.

**The agent behaved correctly.** It copied the attachment each page points at, byte for byte, and
flagged the result: 120 cities carry `hero_image_not_city_specific`, 121 carry
`hero_image_wrong_state_label` (Saint Paul's hero is `Saint-PaulMA.webp`, alt "Saint Paul,MA").

**A shared image is not automatically an error** — it is the source's decision. Substituting a
different image would be inventing content. The correction belongs in WordPress, after which a
rerun picks it up with no code change.

## J. State / city / page identification — **CONFIRMED fragile**

Identification today:

```
STATE   ← config key + slug pattern suffix (e.g. "-mn")      HEURISTIC
  ↓
CITY    ← regex on the slug: /^chimney-sweep-(fireplace|repair)-in-(.+)-mn$/   HEURISTIC
  ↓         name from page title, falling back to title-cased slug            HEURISTIC
PAGE    ← wp_posts row, post_type='job_listing', status='publish'             RELIABLE
```

| Signal | Used for | Reliability |
|---|---|---|
| `post_type` + `post_status` | Page selection | **Reliable** |
| Slug pattern | State and city identification | **Heuristic** — the primary mechanism |
| Region taxonomy | Not used by the agent | **Heuristic** — disagrees with slugs (§5) |
| Page title | City name | **Heuristic** — many titles are malformed (`"City,MN"`), so the slug is the fallback |
| `_job_location` meta | Branch matching | **Heuristic** — inconsistent formatting |
| Business branch list | Branch identity | Reliable input, but matched heuristically |
| Geocoding | Coordinates, nearest branch | **Heuristic and externally sourced** |

**Where the heuristics fail, demonstrated:**

- Massachusetts has **four** slug shapes; 17 of 26 hand-authored pages have **no state suffix at
  all** (`quincy-chimney-sweep`), so the slug carries no state signal.
- Minnesota's taxonomy tags 14 pages; its slugs match 137. The two disagree by an order of magnitude.
- Page titles read `"Chimney Sweep in Afton,MN"` with no space, defeating a `, MN` match.

**Conclusion: state identity is currently inferred, not stored.** §8 covers the consequences.

## K. Geocoding ambiguity — **CONFIRMED**

Three Minnesota geocodes resolved to different same-named places: Becker (Becker County), Grant
(Grant County), St. Anthony (Stearns County), at 166, 139 and 71 miles from their nearest branch.

**Handled correctly:** coordinates **dropped, not guessed**; the rejected value is retained in the
flag so a human can see what was thrown away; a generic rule flags anything beyond 88 km.

**Massachusetts is materially worse.** Concord, Lexington, Milton, Newton, Canton, Dedham and
Medford all exist in multiple states. **State-bounded geocoding is mandatory**, and the ambiguity
compounds with the cache defect in §8.

## L. Bad or missing postcode data — **CONFIRMED**

| Defect | Example |
|---|---|
| Street number parsed as postcode | `14870 Granada Ave, Apple Valley, MN 55124` — **caused P4** |
| Leading zero lost | Medford MA stored as `2155`, not `02155` |
| Postcode from another state | Hopkinton MA carries `07148`, a New Jersey code |
| Missing entirely | Lee and Eastham MA have empty `_job_location` |

**Postcode cannot be the sole branch-matching key.** The current rule requires the street number to
match **and** the branch's own postcode to appear in the text. For Massachusetts, 12 of 26 job
locations have no usable postcode, so a different rule is required there.

## M. No-source cities — **CONFIRMED, handled correctly**

A city on a business list is **not** a WordPress page. Minnesota has **16** such cities.

Each gets a `cities` row with `sourceStatus = 'NO_SOURCE_PAGE'` so its live *service* pages have a
city to belong to, but **no `pages` row and no URL**. Verified: `/location/{slug}/` and
`/admin/preview/{slug}/` both return 404 for all 16.

**Why a business list does not justify a page:** creating one means writing content that does not
exist, which breaches the core rule. It is a business and content decision, not a migration one.

**Presentation defect, open:** those 16 appear on the hub labelled "Page in review", which is wrong —
nothing is under review because no page exists.

## N. Publishability gate — **CONFIRMED sound**

**Existing page ≠ publishable page.**

```
150 cities  =  14 branch + 120 coverage-with-page + 16 no-source
134 existing pages  →  109 publishable · 25 needs_review
```

Blockers on the 25, from source data alone:

| Pages | Kind | Missing |
|---|---|---|
| 11 | branch | Fewer than 4 areas **and** no local prose |
| 9 | coverage | Only 1 of the 2 required local lines |
| 3 | branch | No local prose (5 areas present) |
| 2 | coverage | No serving branch (slug typo; rejected geocode) |

**Why it must not be loosened:** the 14 branch pages fail structurally — WordPress lists only
"Downtown / East / West {City}" and carries no "why it matters" prose. Publishing them requires
**writing content**. Lowering the threshold converts a visible content gap into an invisible one,
and thin duplicate pages are precisely the SEO risk this migration exists to avoid.

The gate has been requested to be loosened more than once and has not been.

## O. Duplicate city pages — **CONFIRMED, handled**

Minnesota has 3 coverage-style pages duplicating a branch city; each redirects to the branch page.

**The rule is structural, not fuzzy**: a page qualifies only when its slug matches the coverage
pattern **and** its extracted city suffix exactly equals a known branch suffix. No string
similarity, no distance metric.

**It must stay state-specific.** The Minnesota rule encodes Minnesota's two slug forms. Massachusetts
has four, so the same rule would silently miss its 17 duplicates.

## P. Legacy URL universe — **CONFIRMED reliability risk, OPEN**

The 20,479-row universe is produced by `scripts/build-mn-seed.mjs`, which is **Minnesota-specific**
and reads the 2.4 GB export rather than WordPress.

**Why this is a risk:**

1. **Not reusable.** No other state can produce a URL universe today.
2. **Depends on a stale artifact.** The export is a point-in-time file, not live WordPress.
3. **It introduced defect P12.** Its last-segment keying created the redirect loop.
4. **The app still consumes it.** State copy, prices, the 16 no-source cities and all 20,479 URL
   rows come from the pilot dataset, not the agent.

**Requirement:** the agent must build the universe directly from WordPress plus the fate maps, and
must reproduce Minnesota's 20,479 rows exactly as part of the regression.

---

# 5. ASSUMPTIONS THAT WERE WRONG

### A1 — "The pilot slice contains real Minnesota data"

| | |
|---|---|
| **Expected** | A working slice seeded with real business data |
| **Actual** | Placeholder address `1234 Placeholder Ave N`, phone `612-555-0100`, 4 invented test cities |
| **Discovered** | Reading `data/seed/minnesota.ts` before trusting it |
| **Impact** | The entire real-data build followed from this |
| **New rule** | Never trust a seed file's provenance from its name. `DATA_SOURCE` is now surfaced at runtime |

### A2 — "The export contains the page content"

| | |
|---|---|
| **Expected** | `cleaned_html` is a faithful rendering of the page |
| **Actual** | Every FAQ **question** was missing; on 20 pages the whole FAQ was gone |
| **Discovered** | All 134 pages showed zero FAQs — implausible for a chimney company |
| **Impact** | Without recovery, 0 of 134 pages could ever publish |
| **New rule** | **Read the raw source, not a derived artifact.** The agent no longer uses the export |

### A3 — "The region taxonomy identifies a state's city pages"

| | |
|---|---|
| **Expected** | Taxonomy is the authoritative state marker |
| **Actual** | Minnesota: 14 tagged vs 137 by slug. Massachusetts: 26 vs 217 |
| **Discovered** | Testing both methods on both states after the Massachusetts survey looked wrong |
| **Impact** | I wrongly reported Massachusetts as 26 pages and "structurally alien" |
| **New rule** | **Always run both identification methods and reconcile the difference before scoping** (§21) |

### A4 — "Massachusetts is structurally incompatible"

| | |
|---|---|
| **Expected** | A different CMS structure requiring major agent work |
| **Actual** | Two layers: 26 hand-authored (different) + 217 generated (**nearly identical to Minnesota**) |
| **Discovered** | Re-examining the 217 slug-matched pages I had dismissed |
| **Impact** | Nearly abandoned a state that is mostly config-compatible |
| **New rule** | Do not generalise from the first subset found. Enumerate all layers first |

### A5 — "The five-digit number in an address is the postcode"

| | |
|---|---|
| **Expected** | A `\b\d{5}\b` match finds the ZIP |
| **Actual** | Street numbers are also five digits |
| **Discovered** | 3 of 14 branches failed to match |
| **Impact** | Would have silently dropped 3 branches |
| **New rule** | Never parse a value out of free text when you can test for a known value's presence |

### A6 — "A geocoder returns the place you asked for"

| | |
|---|---|
| **Expected** | "Becker, Minnesota" returns the city of Becker |
| **Actual** | Returned Becker **County**, 166 miles away |
| **Discovered** | Distance-to-branch sanity check |
| **Impact** | Would have assigned wrong branches and wrong map pins |
| **New rule** | Every derived coordinate is checked against a plausibility bound; failures are **dropped, never guessed** |

### A7 — "`_wp_old_slug` records this page's former URLs"

| | |
|---|---|
| **Expected** | A clean redirect source |
| **Actual** | Page-duplication artifacts. One value claimed by **75** different pages |
| **Discovered** | Investigating redirect coverage; Eden Prairie MN recorded a Boston MA slug |
| **Impact** | Mechanical redirects would have sent Massachusetts URLs to Minnesota pages |
| **New rule** | Not used. Requires a disambiguation rule and explicit approval |

### A8 — "Passing all 15 checks means the site is correct"

| | |
|---|---|
| **Expected** | Green validation means no user-visible defects |
| **Actual** | With 15/15 green: no hub card images, a dead search box, a redirect loop |
| **Discovered** | Looking at the page, and writing this postmortem |
| **Impact** | False confidence |
| **New rule** | **Validation covers what it covers.** §14 enumerates the gaps explicitly |

### A9 — "A script that printed success made the change"

| | |
|---|---|
| **Expected** | An edit script that logs "done" performed the edit |
| **Actual** | `str.replace` returns the original string when nothing matches; the print ran regardless |
| **Discovered** | A prop rename silently failed and crashed the page at runtime |
| **Impact** | Wasted debugging; a real runtime error |
| **New rule** | Every scripted edit **asserts the pattern matched** and aborts if not |

### A10 — "A screenshot shows what a mobile user sees"

| | |
|---|---|
| **Expected** | Chrome `--window-size=390` renders the mobile layout |
| **Actual** | Without device emulation it mis-renders; produced a false overflow report |
| **Discovered** | Re-measuring with the DevTools Protocol |
| **Impact** | Nearly "fixed" a layout that was never broken |
| **New rule** | Responsive claims come from measured `scrollWidth` under emulation, never a screenshot |

---

# 6. WHAT THE MINNESOTA MIGRATION TAUGHT US

All figures re-read from `data/seed/mn.migration.json`, `mn.ledger.json`, `minnesota.media.json`
and live validation runs.

## Verified baseline — the regression contract

| Metric | Value |
|---|---|
| Total city rows | **150** |
| ├ Branch cities | 14 |
| ├ Coverage cities with a WordPress page | 120 |
| └ No-source cities | 16 |
| **Existing city pages migrated** | **134** |
| **Publishable** | **109** |
| **needs_review** | **25** |
| Duplicate pages redirected | 3 |
| FAQ pairs recovered | **642** |
| Pages with a hero | **134 / 134** |
| Distinct media assets | 15, **15/15 verified**, 0 problems, 4,670,577 bytes |
| Review flags | **454** — 297 source-quality, 154 business-unverified, 3 derived |
| Legacy URL rows | **20,479** |
| Ledger rows | 134 · 134 distinct WP IDs · 134 distinct URLs |

## Validation results — 2026-09-06

```
15 checks × 134 pages   → 134/134 on every check, 0 failures
no-source uncreated     → 16/16
route smoke test        → all checks passed
responsive              → clean at 390 / 834 / 1440
idempotency             → 134 unchanged · 0 changes · 0 duplicates · 15 assets reused, 0 downloaded
regression vs pilot     → identical: 134 / 109 / 25
dataset comparison      → 13 of 14 dimensions identical (flags differ by 3, explained)
typecheck               → clean
```

## Perturbation testing

Change detection was proven by corrupting the agent's **own ledger** — never WordPress — for two
pages. The agent correctly reported 1 source change, 1 content change, 1 media change, 1 SEO
difference and 1 URL difference, then restored cleanly.

## Why Minnesota is valuable as a baseline

It is the only state where we know what the right answer is. Any agent change is run against it and
must leave 134/109/25 untouched. That contract already caught regressions during the multi-state
generalisation work.

**Its limitation, honestly stated:** Minnesota is the *easiest* state. Two slug forms, consistent
titles, FAQ accordions everywhere, usable postcodes. Passing the Minnesota regression proves a
change did not break the easy case. It does **not** prove the agent handles a hard one.

---

# 7. DATA INTEGRITY RISKS

| Risk | Likelihood | Impact | Detection today | Prevention | Recovery |
|---|---|---|---|---|---|
| Missing records | Low | High | Count reconciliation in the agent report | Discovered vs migrated vs skipped reconciled each run | Re-run; idempotent |
| Duplicate records | Low | High | Explicit duplicate counters; 0 across two applies | Keyed by WP post id | Re-run |
| **Wrong state** | **Medium** | **Critical** | **None** | **None structural** (§8) | Manual |
| Wrong city | Low | High | Slug-derived, asserted in validation | FK `cities.state_id` | Re-run |
| Wrong page | Low | High | Unique slug constraint | `pages_slug_unique` | Re-run |
| Wrong WordPress ID | Very low | High | 134 distinct ids in the ledger | Copied verbatim | Re-run |
| **Wrong media association** | **Medium** | Medium | Checksum proves the *file*, not the *pairing* | Attachment id copied from `_thumbnail_id` | Re-run |
| Wrong SEO | Low | Medium | Description compared to source per page | Copied verbatim | Re-run |
| **Wrong URL** | Low | **Critical** | Check 2, city pages only | Slug copied verbatim | Re-run |
| **Wrong redirect** | **CONFIRMED** | **Critical** | **None automated** (§11) | **None** | Manual |
| Wrong local SEO | Medium | Medium | Phone/address asserted per variant | Branch match verified | Re-run |
| **Stale dataset** | Medium | Medium | Checksums detect source drift **only if the agent is re-run** | Ledger comparison | Re-run |
| **Stale database** | **High** | Medium | **None** — no dataset↔DB reconciliation | Restart reseeds | Reseed |
| Stale cache | High (dev) | Low | Hydration errors | Clear `.next` | Restart |
| Stale R2 media | N/A | — | R2 not implemented | — | — |

---

# 8. STATE CONTAMINATION RISK

**This is the most serious structural finding in this document.**

## Can one state's data appear under another?

**Today, no — because only one state exists.** Once a second state is migrated, **yes, by several
mechanisms**. Nothing structurally prevents it.

## Where state is stored, inferred, derived, hard-coded

| Location | Mechanism | Safety |
|---|---|---|
| `states` table | Explicit row, unique `code` and `slug` | **Stored — safe** |
| `cities.stateId` | FK → `states.id`, NOT NULL | **Enforced by the database — safe** |
| `branches.stateId` | FK → `states.id`, NOT NULL | **Enforced — safe** |
| **`pages`** | **No state column.** Reachable only via `city_id` | **UNSAFE — see below** |
| `faqs` | `scope` + `scopeId`, **no FK** | **UNSAFE — polymorphic, unenforced** |
| Agent selection | Slug LIKE patterns in config | **Inferred — heuristic** |
| **Geocode cache** | **Hard-coded `mn-geocode.json`, keyed by bare city name** | **UNSAFE — confirmed defect** |
| App seed | `import … from '@/data/seed/minnesota'` | **Hard-coded single state** |
| Admin board | `getMigrationRows('mn')` | **Hard-coded** |

## CONFIRMED DEFECT P15 — the geocode cache leaks across states

```js
// scripts/migrate/agent.mjs:47
const GEOCACHE = path.join(ROOT, 'data/seed/mn-geocode.json');
```

The path is **fixed to Minnesota regardless of `--state`**, and the cache is keyed by **bare city
name** with no state qualifier:

```json
"Lexington": { "lat": 45.1387, "lng": -93.1686,
               "display": "Lexington, Anoka County, Minnesota, United States" }
```

**Lexington, Massachusetts would silently receive Lexington, Minnesota's coordinates**, and its
nearest branch would then be computed from Minnesota geography. Verified: 1 of Massachusetts's 23
branch-city names already collides today, and the mechanism applies to every same-named town —
Concord, Milton, Newton, Canton, Dedham and Medford among them.

**Severity: critical.** It is silent, it corrupts derived data, and the plausibility check would not
catch it because the wrong coordinates are internally consistent with a real place.

**Required fix:** per-state cache file **and** a state-qualified cache key.

## CONFIRMED DEFECT P16 — `pages` has no state linkage

```
total page rows        20,479
rows with NO city link  2,657   ← no path to a state at all
of those, published     1,416
```

All 2,657 are `kind = 'legacy'` — URLs whose slug does not resolve to a known city
(`apartment-chimney-services-becker-mn`, and the ~930 old-form slugs without `-in-`).

With one state, they are implicitly Minnesota. With two, **there is no way to tell which state a
legacy row belongs to**, and `pages_slug_unique` is global, so a slug collision between states would
be a hard failure or a silent overwrite.

**Required fix:** add `pages.state_id NOT NULL` with an FK, and assert every row's state matches its
city's state where a city exists.

## The conceptual chain, as it should hold

```
Minnesota page → Minnesota city → Minnesota state → /locations/mn/ + /location/{mn-slug}/
Massachusetts page → Massachusetts city → Massachusetts state → /locations/{ma}/ + /location/{ma-slug}/
```

For cities and branches this holds and is **enforced by foreign keys**. For pages, FAQs and derived
geocoding it holds **only by convention**.

**Status: NOT PROVEN. No cross-state contamination test exists.**

---

# 9. DATABASE RELIABILITY

## What the database enforces — **VERIFIED** from the migration SQL

**Foreign keys (12):**

```
cities.state_id    → states.id          branches.state_id  → states.id
cities.branch_id   → branches.id        branches.region_id → regions.id
cities.region_id   → regions.id         pages.city_id      → cities.id
pages.service_id   → services.id        services.category_id → service_categories.id
prices.region_id   → regions.id         bookings.{city,branch,service}_id → …
```

**Unique constraints (9):** `states.code`, `states.slug`, `cities.slug`, `branches.slug`,
`pages.slug`, `services.key`, `service_categories.key`, `masters.key`, `bookings.reference`

**NOT NULL** on every structural column of `cities` including `state_id`.

## Enforced by the database vs enforced only by code

| Relationship | Enforcement |
|---|---|
| city → state | **Database** (FK + NOT NULL) |
| branch → state | **Database** |
| page → city | **Database** (nullable) |
| page → **state** | **Code only** — no column exists |
| faq → city | **Code only** — polymorphic `scope`/`scopeId`, no FK |
| city → serving branch | **Database** FK, but the *choice* is a derived guess |
| media → page | **Code only** — hero fields are columns on `cities`, no media table |
| redirect → target | **Code only** — `redirectTo` is free text, unconstrained |
| SEO → page | **Database** — columns on `cities` |

**Database enforcement is safer** because it cannot be bypassed by a code path, a migration script
or a manual fix, and it fails loudly at write time rather than silently at read time.

## Recommended additional constraints

These strengthen integrity **without** altering source data:

1. **`pages.state_id NOT NULL` + FK** — closes P16.
2. **CHECK: a page's state matches its city's state** when `city_id` is present.
3. **FK on `faqs.scopeId`** where `scope = 'city'`, or split into `city_faqs`.
4. **UNIQUE `(state_id, slug)` on cities** in addition to global slug uniqueness.
5. **CHECK: `redirectTo` is non-null when `fate = 'redirect'`** — a redirect with no target is
   currently representable.

**Explicitly not recommended:** any constraint asserting that source data is well-formed — that
non-null alt text exists, that postcodes are valid, that images are unique. Those would force
correction of source defects the system exists to preserve.

---

# 10. MEDIA RELIABILITY

## The pipeline

```
WordPress page → _thumbnail_id → attachment row + meta → download → SHA-256
   → public/uploads/<yyyy>/<mm>/<original name> → cities.heroImageKey → Next.js <img>
```

## Failure points

| Failure | Detected today? | How |
|---|---|---|
| Wrong attachment id | **No** | Copied from `_thumbnail_id`; nothing verifies the *pairing* |
| Missing download | **Yes** | `ensureAsset` returns not-ok; page flagged, no stand-in used |
| Duplicate file | **Yes** | Keyed by path; existing verified file reused, never re-fetched |
| Incorrect filename | **Yes** | Check 6 asserts basename equals the source filename |
| Incorrect MIME | **Partly** | Recorded and compared to the served content-type at download; not re-checked later |
| Corrupted file | **Yes** | SHA-256 plus byte-count against WordPress's recorded `filesize` |
| Wrong page↔media relationship | **No** | The strongest gap — see below |
| Broken public URL | **Partly** | Check 5 asserts the path is in the markup; **nothing fetches it** |
| Incorrect image mapping in the UI | **Was live** | P8 — no check covered the hub |

**The critical gap:** we prove the *file* is correct, never that the *right file is on the right
page*. A transposition — Anoka showing Edina's hero — would pass every current check, because both
files are individually valid.

## Recommended automated tests

1. **Pairing test.** Re-query `_thumbnail_id` for each page at validation time and assert it equals
   the stored `attachmentId`. Catches transposition.
2. **Fetch test.** HTTP GET every rendered image URL; assert 200 and that content-length matches.
   Catches broken paths and missing files in the built output.
3. **Orphan test.** Every file in `public/uploads/` is referenced by at least one city, and every
   referenced key exists on disk. Catches drift in both directions.
4. **MIME/extension agreement.** Assert the served content-type matches the recorded MIME.
5. **Hub image test.** Assert the state hub renders an image for every city that has one — the check
   that would have caught P8.

---

# 11. URL RELIABILITY

## The safety model — every URL must have a deterministic outcome

```
KEEP       → pages row, status published        → route renders
REDIRECT   → fate=redirect + redirectTo         → 301/308
REVIEW     → migrated, status review            → 404 publicly, visible in admin
NO SOURCE  → no row at all                      → 404
```

**GUESS is never an outcome.** Where the destination cannot be determined, the URL is flagged and
left alone. This is honoured for `_wp_old_slug`, the `farmingon` typo, no-source cities and rejected
geocodes — and **violated by the three cross-state redirects inherited from the business map**.

## Redirect audit — **executed 2026-09-05, first time ever**

| Test | Result |
|---|---|
| Redirect rows examined | 6,803 |
| Targets with no page row | **3** |
| Targets not published | 2 |
| **Redirect chains** | **1** (2 hops) |
| **Redirect loops** | **1** |
| Self-redirects | **1** |
| **Cross-state targets** | **3** |

### P12 — redirect loop, introduced by our builder — **OPEN, critical**

The business map holds a legitimate rule: root-level `/chimney-cap-repair-lonsdale-mn/` →
`/location/chimney-cap-repair-lonsdale-mn/`. The builder keys redirects by **last path segment**,
collapsing both sides to one key.

Two harms: an infinite loop, **and** the destruction of a valid redirect. Worse, the target is a
**live published page returning HTTP 200** that our data marks retired. Six entries collapse this way
across all states.

### P13 — cross-state redirects — **OPEN, critical**

Three Minnesota URLs redirect to `/location/chimney-sweep-portland-oregon/`, which has no row in the
Minnesota universe. 143 business-map entries target that page. For two of the three the map also
names a sensible Minnesota target, so the discrepancy is unresolved.

## Detection required — none of these exist today

| Detect | Method |
|---|---|
| Loops | Walk the redirect graph; any revisited node fails |
| Chains | Any target whose own fate is `redirect` |
| Cross-state targets | Target's state must equal source's state, or be explicitly approved |
| Incorrect targets | Target must exist and be published |
| Unexpected URL changes | Diff the slug set against the previous ledger |
| Broken links | Already covered on city pages (check 12); not across the universe |
| Accidental 404s | Sweep all 20,479 rows, not just the 134 city pages |

---

# 12. SEO RELIABILITY

## Can SEO become associated with the wrong page?

**Mechanically unlikely, because SEO fields are columns on the city row itself** — `metaTitle`,
`metaDescription` — rather than a separate table joined by id. There is no join to get wrong.

## Per-element assessment

| Element | Source | Risk | Checked |
|---|---|---|---|
| Meta title | `_yoast_wpseo_title` | Low | Compared per page |
| Meta description | `_yoast_wpseo_metadesc` | Low | Compared to source when present |
| **Canonical** | Constructed as `SITE_URL + /location/{slug}/` | **Medium** — derived, not copied | Check 7 |
| Open Graph | Derived from title/description | Low | Present, not compared |
| **Twitter card** | **Not emitted** | — | **NOT VERIFIED** — no Twitter tags found |
| JSON-LD | Constructed from migrated fields | Medium | Parsed and type-checked |
| Breadcrumbs | Constructed | Low | Check 10 |
| Local SEO | Branch row | **Medium** — depends on the derived branch guess | Check 8 |

## The Yoast nuance that must not be "fixed"

Only **14** Minnesota city pages have an authored meta description. The other 120 have none, because
Yoast renders from a template at request time and stores nothing. We store `null` for those 120 and
the template supplies its own.

**That null is correct.** Generating descriptions to fill it would be inventing SEO content.

## What is deliberately not migrated

**WP Schema Pro `local-business-88926-*`.** Inspection showed it is a **single global record**: every
page in every state reports the same Boston HQ address. Migrating it would attach a Boston address to
every city in the country.

## Gap

**Rendered values are evidence, never a write-back source.** Reading the live page's `<title>` and
storing it would import Yoast's runtime templating as authored content. The harness compares
rendered against stored; it never updates stored from rendered. This is correct and must stay.

---

# 13. CONTENT RELIABILITY

## How we prove migrated content equals WordPress content

| Layer | Method | Coverage |
|---|---|---|
| **Extraction** | Text lifted as whole sentences and list items; never joined, split or rewritten | All fields |
| **Storage** | `sha256(post_content + meta)` as the source checksum | Per page |
| **Mapped content** | `hashJson()` with **recursively sorted keys** over the fields that render | Per page |
| **Media** | `sha256(bytes)` + byte count vs WordPress's recorded `filesize` | Per asset |
| **Rendered** | Every FAQ question and answer, and the full areas list in source order, asserted present verbatim | 134/134 |
| **Identity** | WordPress post id carried end to end | Per page |

## Why fuzzy comparison is insufficient

A similarity score cannot distinguish "the same text" from "text a model rewrote to be clearer".
Both score high. The entire purpose here is to detect *any* alteration, including improvements — a
corrected typo is a failed migration, because the typo is the source's and correcting it silently
changes what the business published.

**This matters concretely:** `chimney-sweep-repair-in-farmingon-mn` is a live misspelling. Exact
comparison preserves and flags it. Fuzzy comparison would have accepted a "corrected" Farmington and
reported success.

## Honest limitation

We compare **extracted fields**, not the whole document. The raw `post_content` is never stored in
our database — only the structured fields we render. So we prove *the fields we migrated* are exact.
Content in the source that we do not extract is neither migrated nor compared. For the 25
needs_review pages that is precisely the point; for `kind = 'legacy'` rows it means **the content is
not migrated at all** and those URLs currently 404.

---

# 14. VALIDATION GAPS

**The most important section for the next state.** Everything below was green while three defects
were live.

| Check | What it catches | What it misses | New test required |
|---|---|---|---|
| 1 `template` | Page renders through the shared template | Whether it renders *correctly* | Visual regression |
| 2 `legacy_url` | URL parity, trailing slash | Only the 134 city pages; nothing about the other 20,345 rows | Full-universe URL sweep |
| 3 `title_h1` | Title and H1 name the source city | Whether the rest of the copy belongs to that city | — |
| 4 `faq` | Every source FAQ present verbatim | FAQs that exist in WordPress but were not extracted | Extraction-coverage audit |
| 5 `hero_path` | The uploads path is in the markup | **Whether the image loads** | HTTP fetch of every image |
| 6 `hero_file` | Bytes match WordPress exactly | **Whether it is the right image for this page** | Pairing test vs `_thumbnail_id` |
| 7 `seo_meta` | Canonical, description, robots | OG/Twitter correctness; nothing compared to live WP | — |
| 8 `local_seo` | Phone present; address only on branch pages | Whether the **branch assignment** is correct | Business territory confirmation |
| 9 `structured_data` | JSON-LD parses; right type; no rating markup | Whether values are semantically right | — |
| 10 `breadcrumbs` | Correct trail and hub links | — | — |
| 11 `services` | 92 cards; link count matches published pages | Whether each links to the *right* service | — |
| 12 `links` | Internal links resolve on that page | **Redirect loops, chains, cross-state targets** | Redirect graph audit |
| 13 `cta_contact` | Prices, booking form, phone | — | — |
| 14 `chrome` | Header, footer, hub link | — | — |
| 15 `no_rewrite` | Areas list byte-identical in source order | Fields not in the areas list | — |

## What nothing checks at all

| Missing entirely | Consequence, demonstrated |
|---|---|
| **Cross-state contamination** | §8 — no test would notice Massachusetts data under Minnesota |
| **Database ↔ dataset reconciliation** | A stale database serves old data silently |
| **The hub itself** | P8: no card images, 15/15 still green |
| **Visual rendering** | An `opacity: 0` regression would pass every check |
| **Image reachability** | A 404ing image passes check 5 |
| **Redirect behaviour** | P12/P13/P14 all survived until a manual audit |
| **Full URL universe** | 20,345 of 20,479 rows are never exercised |
| **External reachability** | We never confirm the WordPress URL still resolves as expected |

---

# 15. REQUIRED RELIABILITY IMPROVEMENTS

Each item inspected against the repository first.

## P0 — MUST HAVE BEFORE THE NEXT STATE

| # | Item | Status | Why |
|---|---|---|---|
| 1 | **Fix redirect key collapse** (full path, not last segment) | **MISSING** | P12: active loop, retires a live page |
| 2 | **Redirect graph audit** — loops, chains, target existence, cross-state | **MISSING** | Would have caught P12–P14 automatically |
| 3 | **Per-state, state-qualified geocode cache** | **MISSING** | P15: confirmed cross-state leak |
| 4 | **`pages.state_id` + FK + state-consistency check** | **MISSING** | P16: 2,657 rows with no state |
| 5 | **Cross-state contamination test** | **MISSING** | Nothing proves state separation |
| 6 | **Legacy URL universe built by the agent** | **MISSING** | P19: Minnesota-only builder |
| 7 | Deterministic state identity (config-driven, both methods reconciled) | **PARTIAL** | Slug heuristics only |
| 8 | Exact source/content checksum validation | **IMPLEMENTED** | `hashJson`, sorted keys |
| 9 | Media checksum validation | **IMPLEMENTED** | SHA-256 + byte count, 15/15 |
| 10 | URL parity testing | **PARTIAL** | City pages only |
| 11 | Idempotency test | **IMPLEMENTED** | Byte-identical across two applies |
| 12 | Dry-run requirement | **IMPLEMENTED** | Default; verified in code |
| 13 | Reconciliation (dataset ↔ DB ↔ rendered) | **PARTIAL** | Dataset↔rendered only |
| 14 | Immutable source snapshot | **MISSING** | We re-query live WordPress each run |
| 15 | Dataset versioning + migration run ID | **PARTIAL** | Ledger + timestamps; no run id |
| 16 | Full audit ledger | **PARTIAL** | Checksums yes; no per-run history |

## P1 — SHOULD HAVE

Image reachability test · media pairing test · hub rendering test · visual regression baseline ·
full-universe URL sweep · duplicate-postmeta pre-check automated · `faqs` FK or table split ·
redirect reason/approval/provenance columns · `redirectTo` non-null check.

## P2 — NICE TO HAVE

Chain flattening at publish · orphan-media detection · MIME/extension agreement check ·
external WordPress reachability check · per-state dashboards.

---

# 16. MAKE THE MIGRATION DETERMINISTIC

**Goal:** same WordPress source + same configuration = same dataset, every time.

## Current sources of nondeterminism — **inspected**

| Source | Present? | Handling | Deterministic? |
|---|---|---|---|
| Geocoding API | **Yes** | Cached in a file; cache hit avoids the network | **Yes once cached**, no on first run |
| Timestamps | **Yes** — `generatedAt` in dataset and ledger | Excluded from every comparison | **Effectively yes** |
| Ordering | Cities sorted by name; writes batched in order | Explicit sort | **Yes** |
| Random IDs | **None** — identity is the WordPress post id | — | **Yes** |
| Image downloads | **Yes** | Existing verified file reused, never re-fetched | **Yes after first run** |
| Network failure | **Yes** | Asset marked not-ok, page flagged, **no stand-in** | **Fails safe**, but output differs |
| `Object.keys` order in hashing | Handled | `hashJson` sorts keys recursively | **Yes** |
| Live WordPress drift | **Yes** | Checksums detect it | **No** — source can change between runs |

**Proven:** two consecutive `--apply` runs produced byte-identical dataset and ledger.

## Remaining gaps

1. **No immutable source snapshot.** Each run re-queries live WordPress. If the source changes
   mid-migration, two runs legitimately differ and there is no pinned version to reproduce from.
   **Recommendation:** capture a per-run raw snapshot keyed by run id.
2. **First-run geocoding is nondeterministic.** A geocoder can change its answer. The cache makes
   subsequent runs stable but the first is unrepeatable. **Recommendation:** treat the cache as a
   versioned, committed input, per state.
3. **A failed image download changes the dataset** — the page is flagged rather than heroed.
   **Recommendation:** treat any download failure as a hard stop (§18), not a flag.

---

# 17. DRY RUN SAFETY MODEL

```
DRY RUN → REPORT → HUMAN REVIEW → APPROVAL → APPLY → RECONCILE → IDEMPOTENCY → PUBLISH
```

## Verified in code

Dry run is the **default**; `--apply` is required to write. Every write is guarded:

```js
const APPLY = flag('--apply');
const DRY = !APPLY;
…
if (APPLY) {
  fs.writeFileSync(DATASET, …);   // agent.mjs:359
  fs.writeFileSync(LEDGER,  …);   // agent.mjs:371
}
```

Media downloads are guarded inside `ensureAsset`, which returns **before** any filesystem call:

```js
if (dryRun) return { ok: false, bytes: null, sha256: null, url, missing: true };
```

**Nothing else in the agent writes.** WordPress access is SELECT-only.

## One honest exception

`--report <file>` writes a JSON report **even in dry run** (`agent.mjs:461`). This is a deliberate
output, not a mutation of migration state, but "dry run writes nothing" is not literally true and
the report path should never point at a dataset or ledger.

## Where the model is not yet enforced

**APPROVAL and RECONCILE are conventions, not gates.** Nothing in the code requires a human approval
before `--apply`, and no reconciliation step exists between apply and publish. They are documented
process steps, and process without enforcement is the weakest link in this model.

---

# 18. FAILURE RECOVERY

The governing principle: **STOP, REPORT, RESUME SAFELY — never silently continue.**

| Failure | Behaviour today | Recommended |
|---|---|---|
| WordPress unavailable | `execFileSync` throws; the run aborts | Correct. Add a clear message |
| Database unavailable | Seed throws at startup | Correct |
| **Media download fails** | **Page flagged, run continues** | **Change to hard stop.** A partial media set is a silently incomplete migration |
| **Checksum mismatch** | Flagged; asset not used | **Change to hard stop.** A mismatch means the source changed mid-run |
| Malformed source markup | Flagged, preserved, continue | **Correct** — this is expected source data |
| Geocoder fails | No coordinate, city flagged, continue | **Correct** — never guess |
| State cannot be identified | Config lookup throws with known states listed | Correct |
| Duplicate detected | Counted and reported; 0 so far | Correct |
| URL destination unknown | Flagged, no redirect created | **Correct** |
| Validation fails | Non-zero exit; failures listed | Correct, but **nothing blocks a later apply** |
| **DB load partially completes** | **No transaction wrapper** — batches of 500 committed independently | **Wrap the seed in one transaction** |

**The last one is a real risk:** an error midway through seeding leaves a partially populated
database with no marker saying so.

---

# 19. OBSERVABILITY

## What a run logs today

Discovered · migrated · publishable · needs_review · skipped with reason · unchanged since last run ·
source/content/media checksum changes · SEO and URL differences · duplicate counters · media reused
vs downloaded · per-check validation pass counts · review flags grouped by provenance category ·
excluded no-source cities. Machine-readable via `--report`.

**That is a genuinely good report**, and it is where most reliability confidence currently comes
from.

## Missing

| Field | Why it matters |
|---|---|
| **Migration run ID** | No way to reference or compare a specific run |
| **Source version/snapshot id** | Cannot prove which WordPress state produced a dataset |
| **Duration and timing** | No signal for degradation |
| **Explicit error/warning arrays** | Errors surface as console text, not structured data |
| **Run history** | The ledger holds only the latest state; no append-only log |
| **Operator identity** | Who ran it |

**Recommendation:** every run emits an append-only ledger entry with a run id, source snapshot id,
all counts, all checksum failures, all URL changes and the duration.

---

# 20. RECONCILIATION MODEL

## Target: four-way agreement

```
WordPress  ⟷  Agent Dataset  ⟷  Database  ⟷  Next.js (rendered)
```

| Entity | Count | IDs | URLs | Content hash | Media hash | SEO |
|---|---|---|---|---|---|---|
| WP ⟷ Dataset | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |
| Dataset ⟷ Database | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** |
| Database ⟷ Rendered | Partial | Partial | **Yes** | **Yes** | **Yes** | **Yes** |
| WP ⟷ Rendered | Partial | — | **Yes** | **Yes** | **Yes** | Partial |

**The missing leg is Dataset ⟷ Database.** Nothing verifies that what the agent wrote is what the
database holds. In development this is masked because PGlite reseeds from the dataset on every
restart. **Against a persistent Supabase database, a stale or partial load would be invisible.**

**Required:** a reconciliation command asserting, per state, that row counts, post ids, slugs and
content hashes in the database match the dataset exactly.

---

# 21. PRE-MIGRATION CHECKLIST

### Source health
- [ ] WordPress reachable; SELECT-only access confirmed
- [ ] **Duplicate postmeta test run** for every meta key read (§4.B)
- [ ] Published row counts recorded as the reconciliation baseline
- [ ] Source snapshot captured and given an id

### Database health
- [ ] Migrations applied; schema matches `schema.ts`
- [ ] Foreign keys and unique constraints present
- [ ] Existing state data counted before load

### Inventory — **both identification methods, reconciled**
- [ ] Page count by **slug pattern** AND by **taxonomy**; difference explained (§5 A3)
- [ ] Branch layer vs coverage layer identified
- [ ] No-source cities identified — **no pages will be created**
- [ ] Duplicate city pages identified
- [ ] Content shape confirmed: FAQ accordions, areas lists, local prose
- [ ] Slug forms enumerated — **including any with no state suffix**

### URL inventory
- [ ] Full legacy universe enumerated from WordPress + fate maps
- [ ] Redirect sources and targets listed
- [ ] **Redirect graph audited: loops, chains, missing targets, cross-state**
- [ ] `_wp_old_slug` inventoried, **not activated**
- [ ] Legacy `/locations/*` URLs addressed

### Media inventory
- [ ] Distinct attachments counted
- [ ] Shared/default images identified
- [ ] **Inline body images identified** or explicitly out of scope
- [ ] All attachment files reachable at origin

### SEO inventory
- [ ] Which Yoast fields are actually populated, and on how many pages
- [ ] Plugin field sets checked for global vs per-page (§4.I)

### Geocoding
- [ ] **Per-state cache file** in use
- [ ] Queries bounded to the state
- [ ] Same-name collisions with other states listed in advance
- [ ] Plausibility threshold set

### Configuration and regression
- [ ] `STATES` entry added; gate thresholds unchanged
- [ ] **Minnesota regression re-run: 134 / 109 / 25 unchanged**
- [ ] Dry run completed and report reviewed
- [ ] Business decisions approved in writing

---

# 22. POST-MIGRATION CHECKLIST

- [ ] Counts reconcile: WordPress → dataset → database → rendered
- [ ] Every WordPress post id present exactly once
- [ ] Every legacy URL has exactly one outcome: KEEP / REDIRECT / REVIEW / NO SOURCE
- [ ] Content hashes match for every page
- [ ] SEO fields match source where source has them; null where it does not
- [ ] **Every media file SHA-256 verified AND paired with the right page**
- [ ] **Every rendered image URL returns 200**
- [ ] Local SEO correct per variant
- [ ] **Redirect graph clean: no loops, no chains, no missing targets, no cross-state**
- [ ] **Every city links to the correct state; no cross-state rows**
- [ ] Frontend: all pages render through the shared template
- [ ] Responsive clean at 390 / 834 / 1440
- [ ] No broken internal links
- [ ] Structured data parses; no rating markup
- [ ] **Second apply byte-identical (idempotency)**
- [ ] Dataset ↔ database reconciliation passes
- [ ] Minnesota regression still 134 / 109 / 25

---

# 23. NEXT STATE GATE

```
[ ] Minnesota regression unchanged (134 / 109 / 25)
[ ] P0 items 1–6 from §15 implemented and tested
[ ] New state dry-run completed; report reviewed by a human
[ ] No unexplained cross-state records
[ ] No unexplained missing pages
[ ] No unexplained URL changes
[ ] Media audit complete — checksums AND pairing
[ ] SEO audit complete
[ ] Redirect audit complete — loops, chains, targets, cross-state
[ ] Database reconciliation complete
[ ] Idempotency proven by a second apply
[ ] Business decisions approved
```

**Today: not met.** Items 2, 4, 7, 8, 9, 10 and 12 all fail.

---

# 24. MASSACHUSETTS-SPECIFIC LESSONS

> **Nothing here is implemented.** No `ma` entry exists in `states.mjs`, no dataset, no ledger, no
> media, no dry run. Everything below is **OBSERVED** (read-only survey) or **PREDICTED**.

## OBSERVED — verified by read-only queries

| Fact | Value |
|---|---|
| Hand-authored pages (region taxonomy) | 26 |
| Generated coverage-style pages (slug patterns) | 217 |
| In both sets | 6 |
| Distinct city pages | ~237 |
| Branches on the business list | 23, all with a page |
| Coverage duplicates of branch cities | 17 |
| Live legacy URLs ending `-ma` | 35,247 |
| Distinct hero attachments | 25 |
| Slug shapes among the 26 | **4**, and 17 have **no state suffix** |
| Coverage pages with FAQ accordions | 211 of 217 |
| Coverage pages naming a real local place | 178 of 195 |
| Coverage pages with coordinates | **6 of 217** |
| Coverage pages with the markup defect | 26 |
| Hand-authored pages with an inline body image | 19 of 26 |
| Job locations with an unusable postcode | 12 of 26 |

## PREDICTED — not results

| Group | Pages | Expected | Basis |
|---|---|---|---|
| Coverage cities | 194 | mostly publishable, ~175 | Minnesota published 109/120 |
| Hand-authored | 26 | **all needs_review** | No areas list, no local prose in a readable form |
| Duplicates | 17 | redirect | Minnesota's 3 handled this way |

## PLANNED — six agent changes

A geocoding (per-state, bounded) · B legacy URL universe · C multi-state mapper · D hand-authored
selection and parsing · E inline body images · F per-state duplicate rule.

## Risks specific to Massachusetts

1. **Geocoding collisions plus the shared cache (P15) is the highest risk.** 211 pages need
   geocoding and Concord, Lexington, Milton, Newton, Canton, Dedham and Medford all collide.
   **Lexington already has Minnesota coordinates in the shared cache.**
2. **State-less slugs.** 17 pages carry no state signal; `citySlugRe` returns null for them.
3. **Postcode defects.** 12 of 26 unusable, including a New Jersey code and a lost leading zero.
4. **Inline body images** would silently not migrate — 19 pages.
5. **URL volume.** 35,247 is a raw count, **not** a reconciled universe, and excludes the 17
   suffix-less slugs.
6. **17 coverage pages have filler-only areas** ("East Lowell") and would pass the gate, which
   counts entries not quality. Holding them back would be a **new rule**.

---

# 25. RECOMMENDED FINAL ARCHITECTURE

```
  ONE GENERIC AGENT                     ← exists; state-specific paths remain (P15, P18)
        + STATE CONFIGURATION           ← exists; must cover geocode cache and duplicate rules
        + IMMUTABLE SOURCE SNAPSHOT     ← MISSING; needed for reproducibility
        + VERSIONED DATASET + RUN ID    ← partial; no run id, no history
        + AUDIT LEDGER (append-only)    ← partial; latest state only
        + EXACT VALIDATION              ← strong for content/media; blind to redirects, hub, cross-state
        + DATABASE CONSTRAINTS          ← good for cities/branches; missing for pages/faqs/redirects
        + URL AUDIT                     ← MISSING as a standing test
        + MEDIA CHECKSUMS + PAIRING     ← checksums yes; pairing MISSING
        + FOUR-WAY RECONCILIATION       ← Dataset↔Database leg MISSING
        + REGRESSION TESTING            ← exists and works; Minnesota only, and Minnesota is easy
```

**The shape is right. The gaps are specific and enumerable, which is the good news: this is a list
of work, not a redesign.**

---

# 26. FINAL RELIABILITY SCORECARD

| Area | Current state | Risk | Required action |
|---|---|---|---|
| Source extraction | Read-only, verbatim, defect-detecting | **Low** | Duplicate-postmeta pre-check per state |
| **State identification** | Slug heuristics; two methods disagree | **High** | Reconcile both; store state explicitly |
| City identification | Slug regex + title fallback | **Medium** | Per-state config; verify on each new state |
| Page mapping | WP post id end to end | **Low** | — |
| **Database** | FKs for cities/branches; none for page→state, faq→city | **High** | `pages.state_id`, faq FK, redirect checks |
| Content | Verbatim, checksummed, verified per page | **Low** | — |
| SEO | Copied where present; null preserved | **Low** | Confirm OG/Twitter intent |
| Local SEO | Branch data exact; **assignment is a guess** | **Medium** | Business territory confirmation |
| Media | Byte-verified, 15/15 | **Medium** | Pairing test, reachability test |
| **URLs** | City pages proven; universe unswept | **High** | Full-universe sweep |
| **Redirects** | **3 confirmed defects, no automated testing** | **Critical** | P0 items 1–2 |
| **Geocoding** | Rejection logic sound; **cache leaks across states** | **Critical** | P0 item 3 |
| Frontend | Renders correctly; two mapping bugs found by eye | **Medium** | Hub and visual tests |
| Validation | 15 checks, strong on content/media | **Medium** | Close §14 gaps |
| Idempotency | Byte-identical across runs | **Low** | — |
| Observability | Rich report | **Medium** | Run id, history, structured errors |
| Rollback | WordPress untouched; nothing published | **Low** | Rehearse against a persistent DB |

---

# 27. FINAL ANSWER

### 1. What were the biggest problems?

The export had silently lost every FAQ question. Three geocodes pointed at the wrong place. A
postcode regex matched street numbers. I misjudged Massachusetts's structure and stated wrong
baseline numbers. And a redirect defect we introduced would have retired a live page.

### 2. Which problems are solved?

FAQ recovery (642 pairs, all 134 pages) · media recovery (134/134, byte-verified) · branch matching
(14/14) · geocode rejection · hub card images · hero search · search matching · baseline arithmetic ·
the Massachusetts structural assessment · scripted-edit verification.

### 3. Which problems remain?

Redirect loop (P12) · cross-state redirects (P13) · redirect chain (P14) · **geocode cache leaking
across states (P15)** · **pages have no state linkage (P16)** · faqs lack an FK (P17) · single-state
hard-coding (P18) · URL universe from a Minnesota-only builder (P19).

### 4. Can we safely migrate another state now?

**No.** Six P0 items are missing, two of them — the geocode cache and page state linkage — are
active cross-state contamination vectors. Massachusetts in particular would hit the geocode defect
immediately, because Lexington already carries Minnesota coordinates in the shared cache.

### 5. What must be added first?

The six P0 items in §15: redirect key fix, redirect graph audit, per-state geocode cache,
`pages.state_id`, a cross-state contamination test, and an agent-built URL universe.

### 6. How do we prove data belongs to the correct state?

**We cannot, fully. NOT PROVEN.** Cities and branches are tied to a state by foreign key, which is
solid. Pages are not — 2,657 rows have no path to a state at all — and geocoding currently reads a
Minnesota-specific cache regardless of state. No test asserts state separation.

### 7. How do we prove URLs are preserved?

For the 134 city pages: **proven.** Each is fetched at its exact legacy URL, the canonical is
asserted to equal it, and the slashless form is asserted to redirect. 134/134.
For the other 20,345 rows: **NOT PROVEN.** Never swept.

### 8. How do we prove content is unchanged?

**Proven for migrated fields.** Every FAQ question and answer and the full areas list are asserted
present **verbatim and in source order** on every page, backed by a content checksum over
key-sorted JSON. A live misspelling survived intact, which is the proof that works.
**Not proven** for content we do not extract, and `kind = 'legacy'` pages are not migrated at all.

### 9. How do we prove images are unchanged?

**Proven at the byte level.** Every hero is SHA-256 checksummed and byte-count-verified against what
WordPress records. 15/15 assets, 0 problems, no renaming or re-encoding.
**Not proven:** that the right image is on the right page, and that rendered image URLs actually
resolve.

### 10. How do we prove SEO is unchanged?

**Partly proven.** Meta description is compared to source where source has one; canonical, robots,
breadcrumbs and structured-data types are asserted per page. **Not proven:** OG and Twitter parity,
and nothing is compared against the live WordPress output.

### 11. How do we prevent one state's data leaking into another?

**Today we do not.** Cities and branches are protected by foreign keys. Pages, FAQs and geocoding
are not. This is the single most important gap in the system.

### 12. What is the minimum reliability gate for every future state?

The twelve-item gate in §23. Non-negotiable: the Minnesota regression unchanged, a clean redirect
graph, a cross-state contamination test passing, dataset↔database reconciliation, and idempotency
proven by a second apply.

---

# 28. APPENDIX

## Files inspected

**Agent:** `scripts/migrate/{agent,source,states,validate,compare-datasets}.mjs`
**Contract:** `lib/migration/{types.ts,flags.mjs}`
**Database:** `lib/db/{schema.ts,client.ts,seed.ts}`, `lib/db/migrations/{0000,0001,0002}*.sql`
**Data access:** `lib/data/{cities,states,pages,services,pricing,masters,migration}.ts`
**Content:** `lib/content/{assemble,assemble-hubs,slots,search}.ts`
**App:** `app/location/[slug]/page.tsx`, `app/locations/{page.tsx,[state]/page.tsx}`,
`app/admin/{migration,preview/[slug],bookings}/page.tsx`, `app/api/{health,bookings}/route.ts`
**Components:** `components/templates/*`, `components/islands/*`, `components/seo/JsonLd.tsx`
**Datasets:** `data/seed/{mn.migration.json,mn.ledger.json,minnesota.generated.json,
minnesota.faq.json,minnesota.media.json,mn-geocode.json,minnesota.ts}`
**Other:** `package.json`, `next.config.ts`, `styles/*`, `docs/architecture.md`, `CLAUDE.md`,
`MIGRATION_IMPLEMENTATION.md`, `URL_MIGRATION_STRATEGY.md`, `../chimcare-ma-pilot/sql/001_schema.sql`

## Validation scripts

`scripts/validate-render.mjs` · `scripts/check-pages.mjs` · `scripts/check-responsive.mjs` ·
`scripts/migrate/compare-datasets.mjs` · `scripts/migrate/agent.mjs --dry-run --regress`

## Commands used for this postmortem

```bash
node scripts/migrate/agent.mjs --state mn --dry-run --no-render --regress data/seed/minnesota.generated.json
node scripts/validate-render.mjs http://localhost:3000
node scripts/check-pages.mjs http://localhost:3000
node scripts/check-responsive.mjs http://localhost:3000 --url /locations/mn/
node scripts/migrate/compare-datasets.mjs
npx tsc --noEmit
mysql -h 127.0.0.1 -u root --database=chimcare_local -e "…"    # read-only
```

## Baseline numbers

150 cities · 14 branch · 120 coverage-with-page · 16 no-source · 134 migrated · 109 publishable ·
25 needs_review · 3 duplicates redirected · 642 FAQ pairs · 134/134 heroes · 15 assets ·
4,670,577 bytes · 454 flags · 20,479 URL rows · 6,803 redirects · 2,657 rows with no city link

## Known flags

`hero_image_wrong_state_label` 121 · `hero_image_not_city_specific` 120 ·
`nearest_branch_unverified` 118 · `legacy_pricing_conflict` 34 ·
`insufficient_source_local_copy` 23 · `source_markup_defect` 20 ·
`insufficient_source_areas` 11 · `office_location_conflict` 2 · `no_serving_branch` 2 ·
`legacy_slug_typo` 1 · `geocode_rejected` 1 · `hero_image_missing_alt` 1

## Known anomalies in the source

Boston image on ~211,000 pages site-wide · 20 pages with malformed shortcode closings ·
34 pages quoting prices that contradict the price sheet · `farmingon` slug misspelling ·
Saint Paul's hero labelled Massachusetts · one hero with no alt text ·
`_wp_old_slug` values claimed by up to 75 pages each · 143 redirects targeting one Oregon page ·
WP Schema Pro reporting one Boston address for every page in every state

## Unresolved

P12 redirect loop · P13 cross-state redirects · P14 chain · P15 geocode cache · P16 page state
linkage · P17 faq FK · P18 hard-coding · P19 URL universe · deployment target (Cloud Run vs Vercel) ·
state slug Q2b · the 25 needs_review pages · the 16 no-source cities · Massachusetts D1–D8

---

**END OF DOCUMENT**

*Written as an engineering postmortem. Problems are recorded as found, including those introduced by
this work and mistakes made in analysing it. Predictions are labelled as predictions. Where something
is not proven, it says NOT PROVEN.*
