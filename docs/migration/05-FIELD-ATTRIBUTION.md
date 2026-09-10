# Why fields are missing — measured, per field, with the cause named

Date: 2026-09-10
Question: for every field that is empty on a migrated page, is the cause the source data or this
pipeline?

Method: three independent measurements per field.

1. **In source** — does WordPress hold it? Counted with SQL against `chimcare_local`, over all
   229,621 published location pages and over a deterministic random sample of 500 Minnesota pages.
2. **Parsed out** — does the pipeline read it? `lib/content/source-sections.ts` run over the same 500.
3. **On the page** — does it reach the rendered HTML? 40 of those 500 fetched from the running app.

Reproduce with `node scripts/report/field-coverage.mjs --sample 500 --render 40`. Raw numbers in
`data/sample/field-coverage.json`.

---

## The short answer

Of eleven fields that are empty somewhere, **eight are the source data** and **three are this
pipeline**. Two of the three are one-line fixes. The third is a judgement call that should not be
"fixed" without a decision, and is explained below.

---

## 1. SEO fields

| Field | In WordPress | On the page | Cause |
| --- | ---: | ---: | --- |
| `post_title` | 500 / 500 | 27 / 27 | — |
| Yoast SEO title | **0 / 500** · 35 of 229,621 site-wide | — | **DATA** |
| Yoast meta description | **1 / 500** · 122 of 229,621 site-wide | 0 / 27 | **DATA** |
| Yoast canonical | **0 / 500** | 27 / 27 | — (derived) |
| Title's " - Chimcare" suffix | n/a | **0 / 27** | **CODE** |

**The SEO title and description are not missing from the migration. They were never in WordPress.**
Across the entire site, 35 pages out of 229,621 have a stored SEO title, and 122 have a stored
description. Yoast has no title template configured for `job_listing` either
(`wpseo_titles.title-job_listing` is unset), so production falls back to Yoast's default.

That default is reproducible, and this is the proof:

| URL | `post_title` in WordPress | What production serves |
| --- | --- | --- |
| `chimney-sweep-repair-in-bloomington-mn` | Chimney Sweep in Bloomington,MN | Chimney Sweep in Bloomington,MN **- Chimcare** |
| `gas-fireplace-repair-in-shakopee-mn` | Gas Fireplace Repair in Shakopee,MN | Gas Fireplace Repair in Shakopee,MN **- Chimcare** |
| `chimney-sweep-in-white-bear-lake-mn` | Chimney Sweep in White Bear Lake,MN | Chimney Sweep in White Bear Lake,MN **- Chimcare** |
| `chimney-sweep-fireplace-in-minneapolis-mn` | Chimney Sweep & Fireplace Services in Minneapolis, MN | … **- Chimcare** |

Production title = `post_title` + " - " + `blogname`, where `blogname` is "Chimcare". Four of four.
The application currently emits the `post_title` and stops. **That missing suffix is mine** and is a
one-line change. Tracked as ISSUE-025.

The description is already correct: the application emits one only where WordPress has one, which
matches production exactly — no description on Bloomington or Shakopee, the real one on Minneapolis.

---

## 2. Business facts

| Field | In WordPress | On the page | Cause |
| --- | ---: | ---: | --- |
| Phone | **24 / 500** (4.8%) | 27 / 27 | **DATA**, already worked around |
| Address | **24 / 500** (4.8%) | 23 / 27 | **DATA**, already worked around |
| Google rating | **0** | 0 | **DATA** |

WordPress carries `_phone` and `_job_location` on only 1,302 of 19,014 Minnesota pages. Site-wide it
is better but still partial: 113,731 of 229,621.

This is already handled and is not a gap. The phone and address come from the client's own branch
list, not from the page, which is why every page renders them even though 95% of Minnesota pages have
neither. The one caveat is that a coverage city shows its *nearest* branch, so the Shakopee page
carries a Minneapolis address. That is correct data presented in a way that reads oddly, and it is
the unconfirmed-territory heuristic already logged.

No page shows a Google rating because no rating exists in any source. Open question Q5.

---

## 3. Images — the one that needs a decision, not a fix

| Measure | Value |
| --- | ---: |
| Minnesota pages with a `_thumbnail_id` | **19,014 / 19,014** (100%) |
| Distinct attachments those 19,014 point at | **15** |
| Pages pointing at attachment **88125** alone | **19,000** |
| Site-wide: pages with a thumbnail | 229,483 of 229,621 |
| Site-wide: distinct attachments | **118** |
| Pages currently rendering a hero | 21 / 27 |

Every page has a thumbnail. The application renders one for 21 of 27, because it only resolves the
hero for cities whose media was recovered. **Resolving the rest is a code change I could make in
minutes.**

I have not made it, and this is why. The attachment 19,000 Minnesota pages point at is
`chimney-sweep-boston-MA.jpg` — a photograph of Boston, Massachusetts. Wiring the field through
"correctly" would put a Boston photo on 19,000 Minnesota pages. The data is present; the data is
wrong. A second recovered file is `Saint-PaulMA.webp`, also mislabelled.

So the attribution here is split, and both halves are true:

- **CODE** — the pipeline does not resolve a thumbnail it has.
- **DATA** — what it would resolve to is one shared, geographically wrong image.

This is a decision, not a defect to quietly close. Tracked as ISSUE-030.

---

## 4. Page content — parsed from each page's own body

| Section | Parsed from 500 | On the page | Cause |
| --- | ---: | ---: | --- |
| Lead paragraph | 500 | 27 / 27 | — |
| Why it matters | 468 | 26 | — |
| Process steps | 479 | 26 | — |
| Why choose us | 475 | 27 | — |
| Areas served | 473 | 26 | — |
| FAQ, with questions | 475 of 475 | 26 | — |
| Book CTA | 458 | 24 | — |
| Service directory | 1 | 0 | — |
| Why trust (hub pages) | 8 | — | — |
| Headings the outlines do not cover | 55 across 500 | rendered | — |

**No content field is lost in Minnesota.** Where a section is absent from the count, the page's own
body does not contain it — the shortfall from 500 is pages written to a different outline, not pages
whose content was dropped. Every FAQ that has questions renders its questions: 475 of 475.

The 55 unmatched headings are not discarded either; they render under "From this page" so nothing
from the source disappears.

**One cross-state caveat, measured, not assumed.** On the random non-Minnesota sample (Milwaukee,
Lincoln City, Salem, Cleveland, north-west Milwaukee), the FAQ heading parses but the questions do
not, because those bodies hold the whole Q&A as one prose blob rather than an accordion. That is
**CODE** — five pages out of twelve in that sample. Tracked as ISSUE-031.

---

## 5. URLs that do not render at all

13 of the 40 fetched returned **308**, not 404. They are `fate='redirect'` rows and redirecting is
what they are supposed to do. Not a missing field, and not a failure.

Production answers these with 301 where the application answers 308. That difference is real and is
ISSUE-007.

---

## Summary of attribution

| Cause | Fields |
| --- | --- |
| **DATA** — WordPress does not hold it | Yoast SEO title, Yoast description, Yoast canonical, phone, address, Google rating, and the shortfall in every content section |
| **CODE** — mine, and fixable | the " - Chimcare" title suffix (ISSUE-025); FAQ questions on non-Minnesota prose-blob pages (ISSUE-031) |
| **BOTH** — needs a decision | hero image: the id is there and unresolved (code), and it points at a Boston photo on 19,000 Minnesota pages (data). ISSUE-030 |
