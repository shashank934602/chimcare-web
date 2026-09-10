# URL migration — the approach

Written 10 September 2026 against `COMPLETE_URL_MIGRATION_AUDIT.md` and the files in
`data/audits/url-universe/`. This is the method, not the code.

## What the audit fixes as ground truth

- 263,769 URLs from nine sources. 229,890 serve a page today, 33,879 return 404.
- The fate maps (`redirects.json`, `gone.json`) were never applied. Production has its own
  redirects (old-slug, Yoast, Redirection plugin), and where map and production disagree,
  production is right — 11 of 26 sampled.
- The new site renders 92 services. 54.9% of the URLs name something outside that list.
- Two real value signals exist: the Search Console export (undated) and `wp_gf_entry` enquiries.
- The audit sqlite is gone. The CSVs in `data/audits/url-universe/` are the surviving record.

## The one principle

**The cutover preserves what production does today, URL for URL.** A 200 stays a 200 at the
same address. A live 301 keeps its current destination. A 404 stays dead. Nothing from the fate
maps is applied on cutover day. Every change to that behaviour happens afterwards, as a batch,
with a diff before and a watch after.

That splits the work into four questions, in order: what does production do today (measure it,
don't infer it); can the new stack reproduce it exactly; can we prove that per URL; and only then,
what do we change.

## The flow

```
 SOURCES        WP MySQL (SELECT only) · redirects.json · gone.json · GSC csv · wp_gf_entry
                                        │
 1 UNIVERSE     union of every source → 263,769 rows, stable audit_id      (exists: url-universe.csv)
                                        │
 2 TRUTH        probe every URL on production: first status, final status, final URL, hops, canonical
                                        │
 3 LEDGER       one row per URL: today + what the map proposes + value signals + classification
                                        │
 4 CUTOVER RULE today 200 → SERVE · today 3xx → REDIRECT to production's destination · today 404 → GONE
                                        │
 5 CONSUMERS    site.pages rows · edge redirect table · 410 list · sitemap · conflicts.csv
                                        │
 6 PARITY GATE  staging vs production per URL: status, final URL, canonical, title, H1, body text
                                        │
 7 CUTOVER      edge switch · WordPress kept read-only 30 days · daily 404 diff against the ledger
                                        │
 8 BATCHES      decisions.csv → ledger → regenerate consumers → parity on affected rows → ship → watch
```

## Stage 2 — production truth, and why it comes first

The audit probed 539 URLs. The cutover redirect table has to be built from what production
actually does, so all 263,769 get probed. Method: GET (not HEAD — Cloudflare answers HEAD
differently), redirects **not** followed automatically; each hop recorded by hand up to five hops;
from 200 bodies, capture `<link rel=canonical>`, `<title>` and the H1, because the parity gate
needs them later and they are cheap to take now. Around 20 requests a second, checkpointed and
resumable, the way `validate-live-retirement-urls.py` already works. Roughly four hours.

Output per URL: `first_status, final_status, final_url, hops, chain, canonical, title, h1,
content_length, probed_at`.

This one step retires three problems the project has been carrying:

- `_wp_old_slug` (826 URLs) — WordPress redirects old slugs itself. The probe records the redirect
  WordPress performs, so the naive and dangerous "apply old slugs" implementation is never needed.
- Yoast and Redirection-plugin rules — same thing. Whatever they do today is captured as a 301
  with its real destination.
- The map-versus-production conflicts — the full list falls out of the probe, not a 26-URL sample.

Run it again weekly until cutover. The diff between two runs is "production drift" and goes into
the ledger as a change, never silently overwritten.

## Stage 3 — the ledger

One CSV plus a JSON summary, one row per `audit_id`. Regenerated from inputs, never hand-edited.
Human decisions come in through a separate file (Stage 8), so the ledger is always reproducible.

| Column group     | What it holds                                                                              | Where it comes from                          |
| ---------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| identity         | `audit_id, url, normalized_url`                                                            | `url-universe.csv`                           |
| today            | `first_status, final_status, final_url, hops, canonical, title, h1`                        | Stage 2                                      |
| wordpress        | `wp_post_id, post_status, post_title, content_class, content_defects`                      | `chimcare_local`, joined on `post_name`      |
| proposal         | `map_disposition, map_destination, map_source`                                             | the fate maps + Yoast + Redirection          |
| signals          | `clicks, impressions, position, indexed, enquiries_total, enquiries_12m`                   | GSC csv, `wp_gf_entry.source_url`            |
| classification   | `url_pattern, state, city, service_raw, service_canonical, service_match, duplicate_group` | the audit's parser, carried across unchanged |
| cutover          | `cutover_disposition, cutover_destination, render_mode`                                    | Stage 4 rule                                 |
| conflicts        | `conflict_codes`                                                                           | computed                                     |
| decision         | `decision, decision_destination, approved_by, decided_at`                                  | `decisions.csv` (Stage 8)                    |

Join rules learned the hard way: join WordPress on `post_name` (indexed) with
`COLLATE utf8mb4_unicode_ci`, never on a `CONCAT` over `wp_posts`; normalise GSC and enquiry
URLs the same way (strip scheme, host and query, force the trailing slash); match services on
token multisets plus the synonym table, never substrings.

## Stage 4 — the cutover rule

| Today on production                          | Cutover disposition                | Rendered by                                            |
| -------------------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| 200, service in catalogue, page passes gate  | SERVE, templated                   | `CityPage` / `ServicePage` at the same URL             |
| 200, anything else                           | SERVE, verbatim                    | the verbatim template: `post_content` → cleaned HTML   |
| 301 / 302                                    | REDIRECT to production's final URL | edge table; dispatcher as fallback                     |
| 404 / 410                                    | GONE (410)                         | edge table                                             |
| WordPress says published but production 404s | CONFLICT (default: what production does) | listed for review                                |
| production 200 but no WordPress record       | CONFLICT (default: what production does) | listed for review — 767 NO_SOURCE URLs live here  |

The second row is the whole point. "Service not modelled" does not mean "redirect". It means
"serve the page exactly as it is until the business decides". That is the 107,159 CREATE bucket
and most of REVIEW: they keep their URL and their content on day one, and the service decision
later flips them to a template — same URL, no redirect, no traffic moved.

The verbatim template has three rules of its own:

- Body = `cleanMarkup(post_content)` from `scripts/migrate/source.mjs`: shortcode scaffolding
  removed, prose untouched. The 33,740 pages with the `</vc_column_text]` defect need the stray
  token dropped **at render time only**, or an HTML parser swallows everything after it. Source is
  never edited; the page carries `source_markup_defect`.
- Title and description = Yoast values where they exist, else `post_title`. 229,524 pages have no
  description. Whether a templated description from title, city and state counts as "copying" or
  "writing" is a business decision to record, not one to make quietly here.
- No `AggregateRating`, no `Review`, canonical = self, indexable exactly where the page is
  indexable today.

## Stage 5 — consumers, all generated from the ledger

- **`site.pages` rows.** The schema already has what is needed: `kind` (`city | service | legacy`),
  `fate` (`publish_verbatim | regenerate | redirect | gone`), `status`, `redirect_to`, `legacy_url`,
  `gsc_clicks_12m`, `lead_count`. The verbatim pages are `kind = legacy, fate = publish_verbatim`.
  The dispatcher in `app/location/[slug]/page.tsx` needs one new branch for that fate.
- **Edge redirect table.** Exact path → `{status, location}` for REDIRECT and GONE rows only; SERVE
  falls through to the app. Sorted, checksummed, loaded to KV. Chains rewritten to their final hop.
- **Sitemap.** SERVE rows that are indexed today.
- **`conflicts.csv`.** Every row whose map disposition differs from production, with clicks at stake.

Graph checks before anything is emitted, each a hard stop: no loops; no chain longer than one hop
after rewriting; every redirect destination is a SERVE row; no cross-state redirect unless
production already does it (then it is flagged, not blocked).

## Stage 6 — the parity gate

Staging is compared to production, URL by URL, for: every URL with clicks (16,982), every
production redirect, and a 2% sample of the rest stratified by map type. Compared fields: status,
final URL, canonical, title, H1, meta description, and for verbatim pages a shingled text
similarity of the body, threshold 0.98, so no paragraph can go missing without being seen.

The gate is zero status or final-URL mismatches. Every mismatch becomes a ledger conflict.
It runs until it passes; it is not a report, it is a gate.

## Stage 7 — cutover and the watch

Edge switch. WordPress stays up read-only for 30 days as the fallback. Every day the edge 404 log
is joined to the ledger: a 404 on a SERVE or REDIRECT URL is a P0 fixed the same day; a 404 on a
GONE URL is expected. Weekly, Search Console clicks by map type against the pre-cutover baseline.

## Stage 8 — decision batches (Option D on top of B)

Decisions arrive in one file and nowhere else:
`audit_id, decision, destination, approved_by, decided_at, reason`, where decision is one of
`KEEP | REDIRECT | MERGE | RETIRE | CREATE_SERVICE | MERGE_SERVICE`.

Applying a batch means: re-run the ledger with the decisions file → a diff report (which URLs
change, to what, clicks and enquiries at stake) → regenerate the consumers → parity on the
affected rows → ship → four-week watch. Nothing is applied that the diff did not show.

Order, by what each unlocks:

1. **The measured conflicts and the P0s** — the 11 map-versus-production disagreements and the
   430 wrong-service / cross-state redirects. Production already handles most correctly; the
   ruling is per row.
2. **The service catalogue** — the recommended ~210. A `CREATE_SERVICE` decision flips that
   service's verbatim pages to templated pages at the same URL. A `MERGE_SERVICE` decision
   produces redirect candidates, which still have to pass the legitimacy rule below.
3. **The 424 duplicates** — 301 to the survivor. Survivor = the page production already redirects
   to; else the most clicks; else the slug without the `-2` suffix; else the older post.
4. **Retirements** — the 30,609 already-404 need nothing. The 5,717 that serve a page today stay
   SERVE until a row-level approval says otherwise. Membership in `gone.json` is not a reason.
5. **The 13,167 approved redirects** — applied only where today is 200, the pair type is
   `NAMING_VARIANT`, `SAME_OBJECT_DIFFERENT_ACTION` or `RELATED_SERVICE`, and city and state match.
   `DIFFERENT_FUEL_OR_APPLIANCE` is never applied automatically.
6. **Pattern renames** — default no. `/location/chimney-sweep-seattle-wa/` earns 1,927 clicks and
   the only thing wrong with it is a missing "in".

### The redirect legitimacy rule

A redirect is emitted only if all of these hold:

- same state; same city, or a service page to its own town hub;
- same canonical service, or a naming variant, or child → parent by exactly one token with a
  business confirmation on file — never a substring match;
- the destination is a SERVE row, not a catch-all (≥20 source services), not the homepage;
- never cross-state, unless production already does it and a human has confirmed it.

## Idempotency and safety

- WordPress: `SELECT` only. Production: `GET` only. Cloudflare: written only from a generated
  table, never by hand.
- Every stage defaults to `--dry-run`; writes happen only with `--apply`.
- Row identity is `audit_id`. Every emitted artefact carries the ledger's sha256. A re-run on
  unchanged inputs produces byte-identical outputs, which is the standard the migration agent
  already meets.
- The fate maps are inputs and are never edited. The decisions file is the only human-written
  input, and it is append-only.

## The modules this needs (responsibilities, not code)

| Module               | Reads                                  | Writes                                    | Logic                                                              |
| -------------------- | -------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `probe-production`   | `url-universe.csv`                     | `production-truth.csv` + checkpoint       | Stage 2; resumable; diff against the previous run                  |
| `build-ledger`       | universe, truth, MySQL, maps, GSC, gf  | `url-ledger.csv`, `url-ledger.summary.json` | the joins above; classification carried from the audit           |
| `decide-cutover`     | ledger                                 | ledger `cutover_*` columns, `conflicts.csv` | the Stage 4 table; conflicts default to production               |
| `emit-consumers`     | ledger                                 | pages seed, edge table, 410 list, sitemap | graph checks first; hard stop on any failure                       |
| `parity-check`       | ledger, staging URL, truth             | `parity-report.csv`                       | Stage 6; exit non-zero on any status or final-URL mismatch         |
| `apply-decisions`    | ledger, `decisions.csv`                | ledger `decision_*` columns, `batch-diff.md` | legitimacy rule; refuses anything that fails it                 |
| `watch-404`          | edge logs, ledger                      | daily report                              | join; P0 on SERVE/REDIRECT rows                                    |

All Node with the `mysql -e … JSON_ARRAYAGG` pattern from `source.mjs`, except the probe, which
stays Python/aiohttp because that script already exists and is checkpointed.

## What the business has to supply, by stage

| Before   | Needed                                                                          |
| -------- | ------------------------------------------------------------------------------- |
| Stage 7  | nothing that blocks — the cutover changes no behaviour                          |
| Batch 1  | a ruling on the 11 conflicts and the 430 P0 rows                                |
| Batch 2  | the service list: keep / merge / create, starting from the 210 multi-state ones |
| Batch 4  | row-level approval for any of the 5,717 live retirements                        |
| All      | Search Console access, so the watch uses dated data instead of an undated export |

## What this approach will not do

- Apply the fate maps at cutover. They contradict production where production redirects.
- Retire a live page because a list says so.
- Redirect anything to the homepage, across a state line, or into a catch-all page.
- Rename a working URL for pattern consistency.
- Write copy to get a page through the gate.
- Touch WordPress.
