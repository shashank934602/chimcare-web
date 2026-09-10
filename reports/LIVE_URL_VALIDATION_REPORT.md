# Chimcare — Live Validation of 404 / Retirement URLs

*Companion to `reports/COMPLETE_URL_MIGRATION_AUDIT.md`. This document reports what production actually returned, measured URL by URL.*

**Run:** 10 September 2026, 49.4 minutes
**Method:** real HTTP `GET` against `https://www.chimcare.com`, redirects followed, full chain recorded
**Volume:** 39,596 URLs · concurrency 40 · batch 500 · timeout 15s · up to 3 attempts
**Result:** 39,596 validated, **zero errors, zero timeouts**, 6 URLs needed a retry

**READ ONLY.** No page, redirect, DNS record, CDN setting, database row, WordPress object or audit file was modified. Every row in `data/audits/url-universe/live-retirement-validation.csv` carries a newly obtained live status and its own UTC timestamp. Nothing is copied from the earlier audit's stored status.

---

## What was validated, and why those URLs

The candidate set was read from the current audit map, `data/audits/url-universe/url-master-migration-map.csv`, by column name. It is the **union** of the two things the brief calls 404 / retirement candidates:

| Set | URLs |
|---|---:|
| `primary_map_type = RETIRE` | 36,334 |
| `http_status` starting `404` | 33,879 |
| Both | 30,617 |
| **Union — validated** | **39,596** |

---

## Totals

| Live classification | URLs | Share |
|---|---:|---:|
| **DIRECT_404** | **32,582** | 82.29% |
| **LIVE_200** | **5,783** | 14.61% |
| **REDIRECT_TO_200** | **1,229** | 3.10% |
| REDIRECT_TO_404 | 2 | 0.01% |
| REDIRECT_TO_3XX | 0 | — |
| 403 | 0 | — |
| 429 | 0 | — |
| 5xx | 0 | — |
| Timeout | 0 | — |
| Connection error | 0 | — |
| DNS error | 0 | — |
| Other | 0 | — |

**Total redirects observed: 1,231.** Of those, **107 were multi-hop chains**, all correctly captured end to end.

The site answered every one of the 39,596 requests. There is no unverified residue in this run, so no URL is being called dead on the strength of a failed request.

---

## The retirement question

36,334 URLs carried `RETIRE`. Production says:

| Live result | URLs | Clicks | What it means |
|---|---:|---:|---|
| DIRECT_404 | **30,266** | 2,318 | Already gone. Retiring changes 404 to 410 and costs nothing. |
| **LIVE_200** | **5,706** | 111 | **A working page. Must not be retired automatically.** |
| REDIRECT_TO_200 | 361 | 10 | Already forwards to a live page. Retiring would destroy a working redirect. |
| REDIRECT_TO_404 | 1 | 0 | Forwards to a dead end. |

**83.3% of the retirement list is already 404.** That part is safe and confirmed by direct measurement rather than by inference.

**The other 6,068 URLs are reachable today.** 5,706 serve a page and 362 redirect. Retiring them is an active removal of working behaviour, not a tidy-up, and it needs a person to authorise it.

The traffic at stake is genuinely small: **121 clicks across all 6,068**. That supports the retirement decision on commercial grounds. It does not make the removal automatic, and it does not make the original file's justification any better documented.

---

## Where the audit and production disagree

| | URLs | Share |
|---|---:|---:|
| Audit prediction confirmed | 38,299 | **96.7%** |
| **Audit prediction wrong** | **1,297** | 3.3% |
| Unverified | 0 | — |

The 1,297 disagreements carry **6,158 clicks**. Every one is in the same direction: the audit said 404, production serves the URL.

| Clicks | Live result | URL |
|---:|---|---|
| 2,233 | LIVE_200 | `/` |
| 524 | REDIRECT_TO_200 | `/location/cleveland-chimney-sweep/` |
| 440 | REDIRECT_TO_200 | `/location/chimney-fireplace-services-in-minneapolis-mn/` |
| 284 | REDIRECT_TO_200 | `/location/chimney-sweep-fireplace-services-in-maple-grove-mn/` |
| 262 | REDIRECT_TO_200 | `/location/chimney-sweep-fireplace-services-in-eagan-mn/` |
| 240 | REDIRECT_TO_200 | `/location/chimney-sweep-fireplace-services-in-lake-elmo-mn/` |
| 236 | REDIRECT_TO_200 | `/location/chimney-sweep-fireplace-services-in-saint-paul-mn/` |

### A defect in the audit, found by this run

**The audit classified the homepage as a 404.** `/` is `NO_SOURCE` with `http_status = 404`, and it is the single highest-traffic URL on the site at 2,233 clicks.

The cause is structural, not a one-off: the audit resolved a URL's existence by matching its final path segment against a WordPress `post_name`. The homepage has no such segment, and neither do the state hub pages. All of them fell through to "no WordPress record", which the audit then reported as 404.

**76 URLs are affected, carrying 2,570 clicks:**

```
2,233c  /
   74c  /locations/oregon-locations/
   49c  /locations/chimcare-locations-in-massachusetts/
   49c  /locations/ohio-locations/
   32c  /locations/washington-locations/
   31c  /locations/california-locations/
```

None of these was ever at risk of retirement — they are `NO_SOURCE`, not `RETIRE`. But the audit's `http_status` column is wrong for them, and any later work that trusts that column would inherit the error. **This is the strongest argument in the run for validating against production rather than against a database join.**

---

## Full cross-tabulation

| Audit classification | n | Live result | URLs | Clicks |
|---|---:|---|---:|---:|
| RETIRE | 36,334 | DIRECT_404 | 30,266 | 2,318 |
| | | LIVE_200 | 5,706 | 111 |
| | | REDIRECT_TO_200 | 361 | 10 |
| | | REDIRECT_TO_404 | 1 | 0 |
| DESTINATION_NOT_IN_NEW_STRUCTURE | 808 | DIRECT_404 | 743 | 807 |
| | | REDIRECT_TO_200 | 65 | 72 |
| REDIRECT_RELEVANT | 802 | REDIRECT_TO_200 | 521 | 500 |
| | | DIRECT_404 | 281 | 257 |
| NO_SOURCE | 767 | DIRECT_404 | 691 | 154 |
| | | LIVE_200 | 69 | 2,570 |
| | | REDIRECT_TO_200 | 7 | 0 |
| REDIRECT_DIFFERENT_SERVICE | 316 | DIRECT_404 | 246 | 390 |
| | | REDIRECT_TO_200 | 70 | 1,710 |
| REDIRECT_WRONG_SERVICE | 201 | DIRECT_404 | 199 | 336 |
| | | REDIRECT_TO_200 | 2 | 0 |
| REDIRECT_EXACT | 164 | REDIRECT_TO_200 | 112 | 77 |
| | | DIRECT_404 | 52 | 10 |
| REDIRECT_CROSS_STATE | 67 | DIRECT_404 | 63 | 41 |
| | | REDIRECT_TO_200 | 4 | 4 |
| REDIRECT_CATCH_ALL | 56 | REDIRECT_TO_200 | 54 | 726 |
| | | DIRECT_404 | 2 | 0 |
| REDIRECT_DEAD_DESTINATION | 35 | DIRECT_404 | 29 | 0 |
| | | REDIRECT_TO_200 | 5 | 0 |
| | | REDIRECT_TO_404 | 1 | 0 |
| REDIRECT_CROSS_CITY | 24 | REDIRECT_TO_200 | 23 | 361 |
| | | DIRECT_404 | 1 | 223 |
| OTHER_REVIEW | 22 | DIRECT_404 | 9 | 7 |
| | | LIVE_200 | 8 | 0 |
| | | REDIRECT_TO_200 | 5 | 128 |

Two rows worth noting. **All 67 cross-state redirect sources return 404 or forward correctly** — the cross-state problem in the map is a problem with a *plan*, not with live behaviour. And **54 of 56 catch-all sources already redirect to a live page**, carrying 726 clicks, so the catch-all pattern is live and earning.

---

## Multi-hop chains

107 URLs redirect more than once. Every hop is recorded in `redirect_chain`.

```
/location/chimney-sweep-repair-in-co-13/
   -> /location/chimney-sweep-repair-in-longmont-co-2/
   -> /location/chimney-sweep-fireplace-in-longmont-co/

/do-gas-fireplace-chimneys-need-to-be-cleaned/
   -> /revised-content-chimney-gas-do-gas-fireplace-chimneys-need-to-be-cleaned/
   -> /chimney-gas-do-gas-fireplace-chimneys-need-to-be-cleaned/
```

The second is worth a look on its own: an editorial working title, `revised-content-…`, is a live hop in a public redirect chain.

---

## Highest-priority exceptions

Retirement candidates that are live **and** earn clicks. These are the ones that must not be retired without a decision.

| Clicks | Live result | URL |
|---:|---|---|
| 13 | DIRECT_404 | `/wp-content/uploads/2022/12/washington-dec.pdf/` |
| 11 | DIRECT_404 | `/location/chimney-flashing-repair-in-tacoma-wa/` |
| 7 | LIVE_200 | `/location/ventless-gas-logs-installation-in-or-7/` |
| 6 | LIVE_200 | `/location/chimney-sweep-repair-in-mount-vernon-wa-2/` |
| 5 | LIVE_200 | `/location/chimney-sweep-repair-in-gig-harbor-wa-2/` |

The full ranked list is in the CSV, filtered on `source_classification = RETIRE` and `classification = LIVE_200`.

---

## Verifying any single URL by hand

```bash
# headers, following redirects
curl -I -L "https://www.chimcare.com/location/example-url/"

# one-line status + final destination + hop count
curl -sS -o /dev/null -L \
  -w '%{http_code}  %{num_redirects} hops  -> %{url_effective}\n' \
  "https://www.chimcare.com/location/example-url/"

# first response only, no redirect followed
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  "https://www.chimcare.com/location/example-url/"
```

---

## Known limitations of this run

**Response times in this dataset are inflated.** The timer wrapped the concurrency semaphore, so `response_time_ms` includes the wait for a free slot, not just the HTTP round trip. The recorded median of 14.4s is a queue-depth artefact; measured directly, the same pages answer in **0.35s to 1.6s**, which matches independent `curl` timing. **The script has been corrected** so future runs measure the round trip only. Every other column in this dataset is unaffected — status codes, chains, final URLs and classifications were never dependent on the timer.

**A single point in time.** These results describe production on 10 September 2026. WordPress redirect behaviour can change without a code deploy.

**`www` only.** All requests went to `https://www.chimcare.com`. The apex domain and `http://` were not separately tested.

**Clicks are business-supplied.** Traffic figures come from the undated Search Console export carried through from the audit, not from this run.

---

## Files

| File | Rows | Contents |
|---|---:|---|
| `data/audits/url-universe/live-retirement-validation.csv` | 39,596 | One row per URL: live status, chain, timings, and the audit's prior classification alongside it |
| `data/audits/url-universe/live-retirement-validation-summary.csv` | 29 | Counts by audit classification × live result, with clicks and impressions |
| `reports/LIVE_URL_VALIDATION_REPORT.md` | — | This report |
| `scripts/audit/validate-live-retirement-urls.py` | — | The validator: `--limit`, `--resume`, `--report-only` |

**Classifications used**

- `LIVE_200` — served 200 directly, no redirect
- `REDIRECT_TO_200` — redirected and the final response was 200
- `REDIRECT_TO_3XX` — chain ended on a 3xx (hop limit or loop)
- `REDIRECT_TO_404` — redirected and the final response was 404 or 410
- `DIRECT_404` — returned 404 or 410 with no redirect
- `403`, `429`, `SERVER_ERROR`, `TIMEOUT`, `CONNECTION_ERROR`, `DNS_ERROR` — recorded as themselves after all retries; **never converted into a 404**
- `OTHER` — a status fitting none of the above

---

## What this run establishes

1. **30,266 retirements are confirmed already gone.** Safe to formalise as 410.
2. **6,068 retirement candidates are live and must not be retired automatically.** They carry 121 clicks between them.
3. **The audit is 96.7% accurate against production**, and every one of its 1,297 errors is in the safe direction: it called something dead that is alive, never the reverse.
4. **The audit's `http_status` column cannot be trusted for non-`/location/` URLs**, including the homepage. That is a structural defect in how existence was resolved, now identified and quantified at 76 URLs.
5. **Nothing was changed.** This was a measurement.
