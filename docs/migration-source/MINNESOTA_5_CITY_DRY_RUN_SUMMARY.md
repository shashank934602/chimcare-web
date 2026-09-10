# Minnesota 5-City Dry Run — Summary

**A one-page summary of `MINNESOTA_5_CITY_FRONTEND_DRY_RUN_REPORT.md` (802 lines).**

| | |
|---|---|
| Date | 2026-09-07 |
| Type | Dry run. Nothing published, deployed, seeded or written to WordPress. |
| Cities | Anoka, Bloomington, Burnsville, St. Paul, Farmingon |
| Full report | `MINNESOTA_5_CITY_FRONTEND_DRY_RUN_REPORT.md` |
| Data | `data/audits/mn-5-city-frontend-dry-run.json` |
| Screenshots | `docs/dry-run-5-city/` — 20 real captures |

---

## What was done

Five real Minnesota towns were taken end to end through the **production** migration system: from
the live WordPress database, through the migration agent, into the real Next.js application, and
onto the real Minnesota locations page.

This was not a demo build. Same source, same agent, same publication gate, same validation, same
page templates, same design system, same SEO and media handling as the full 134-city migration. The
only difference is that the input was scoped to five towns.

**Why these five.** Between them they cover every case the full migration must handle: three
complete pages, one branch city with its own office, one page with incomplete content, one town with
no branch, and one live URL that has been misspelled for years.

---

## Result

| | Result |
|---|---|
| Cities through the pipeline | 5 of 5 |
| Cards on the Minnesota page | 5 of 5 |
| Cards with a working link | 3 |
| Cards deliberately without a link | 2 |
| Placeholder or broken links in cards | **0** |
| Wrong destinations | **0** |
| Cross-state contamination | **0** |
| Responsive checks | 18 of 18 passed |
| Minnesota baseline changed | **No** |

### The five cities

| City | WordPress ID | Status | Card | Page |
|---|---|---|---|---|
| Anoka | 135514 | Publishable | Links to its page | 200 |
| Bloomington | 128339 | Publishable | Links to its page | 200 |
| Burnsville | 129517 | Publishable | Links to its page | 200 |
| St. Paul | 90822 | Needs review | "Details coming soon" | Withheld |
| Farmingon | 132269 | Needs review | "Details coming soon" | Withheld |

**Three can go live today. Two are withheld, and that is the system working correctly.** No content
was written to get them past the gate.

---

## The most important finding

Investigating *why* those two are withheld produced the most actionable result of the exercise.
**Neither blocker is a gap in WordPress. Both are fixable in our own code.**

### 1. The branch-page extractor is blind, and it costs 14 pages

St. Paul's local description **exists in WordPress**, under the heading "Why St. Paul, MN Homeowners
Trust Chimcare". Our extractor misses it because it looks for the heading wording that *coverage*
pages use, and branch pages word theirs differently.

| | |
|---|---|
| Minnesota branch cities | 14 |
| Branch cities with local text extracted | **0** |
| Branch cities passing the gate | **0** |
| Of the 25 Minnesota pages needing review, branch cities | **14** |

Branch cities are the most commercially valuable pages on the site. Teaching the extractor to read
their layout would likely release all 14 without anyone writing a word of new content. The same gap
almost certainly repeats in every other state.

### 2. A misspelled URL makes a lookup miss data we already hold

Farmingon has no serving branch because it has no coordinates. **The coordinates already exist**,
filed under the correctly spelled "Farmington" at 44.6402434, -93.1435497. The cache is keyed by
city name, and this page's name comes from its misspelled URL, so the lookup misses.

### Priority

| | Fix | Unlocks |
|---|---|---|
| **1** | Read the branch-page heading layout | Up to 14 Minnesota pages, and likely the same in every state |
| **2** | Key the geocode cache by URL slug | Farmingon and any future misspelled URL |

Neither was applied. Both need testing against the sealed baseline first.

---

## Fidelity

**Content.** Copied word for word. A misspelled URL was preserved. Prices in the page text that
contradict the company price sheet were preserved, flagged, and never shown to customers.

**Images.** The exact WordPress files, verified by checksum, never renamed or re-encoded. Four of the
five show the same Boston photograph because that is the featured image WordPress assigns; it is the
default on 227,511 pages site-wide and is live in production today. Flagged, not substituted.

**SEO.** Migrated where the source has it. One of the five has a stored description, and it was
copied exactly. The other four have none, so none was generated. Open Graph and Twitter fields do
not exist anywhere in this WordPress installation, so none was invented.

**Missing data.** Never fabricated. Farmingon's card shows a blank location line and the national
phone number rather than a guessed branch.

---

## Tests

| Test | Result |
|---|---|
| Five-city dry run | PASS, all checks on all five |
| Card-to-page navigation | PASS, 0 wrong destinations |
| Full 15-check validation, all 134 pages | **134/134 on every check** |
| Minnesota regression | **Identical: 134 / 109 / 25 / 16**, zero changes |
| Responsive at 390, 834, 1440 | 18 of 18 |
| Typecheck | Exit 0 |
| Production build | Exit 0 |
| Lint | **NOT CONFIGURED** — none was created to obtain a pass |

---

## Safety

WordPress was never connected to during this run, let alone written to. No database seeding, no
publication, no deployment, no DNS change, no redirect activated, nothing committed.

**One application file changed:** the Minnesota page gained an optional parameter to narrow the card
list. Without it the page renders all 150 cards exactly as before, which was verified.

The sealed baseline of 134 cities, 109 publishable, 25 needing review and 16 with no source page was
re-verified after all work and is unchanged.

---

## Bottom line

The migration machinery works and is conservative by design. It will not publish a page it cannot
justify from the source, and it will not invent content to make one publishable.

The two pages it withheld turned out to be blocked by our own extraction and lookup rules rather
than by missing source content. **Fixing those two rules is cheaper than commissioning content, and
one of them is worth 14 pages in Minnesota alone.** That is the recommended next step.
