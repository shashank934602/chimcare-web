# chimcare-migration

A re-runnable pipeline that takes real WordPress URLs and proves the Next.js application can render
them. Six stages plus a one-off PREPARE step, plain Python, no dependencies to install.

**Read [`docs/migration-trial-and-error-1.md`](docs/migration-trial-and-error-1.md) first** — it is
the plan, with diagrams. [`docs/URL-patterns.md`](docs/URL-patterns.md) catalogues every URL shape in
the database, so you can pick what to migrate.

## Run it

```bash
cd chimcare-migration

# the full URL pattern catalogue: 5 families, 18 states, 420 services
python3 scripts/list_url_patterns.py

# a quick look at the most common slug prefixes
python3 scripts/stage1_select_urls.py --list-patterns

# PREPARE + all six stages, starting a dev server for the render and SEO checks and stopping it
# afterwards; PREPARE runs automatically because this starts at stage 1 (see below)
python3 scripts/run_pipeline.py --pattern 'chimney-sweep-%-wa' --limit 12 --run trial-1 --start-server

# just the PREPARE step: the seven extractors that build the template and its standard content,
# independent of any run's selection
python3 scripts/run_pipeline.py --prepare-only
```

PREPARE (the seven `extract_*` scripts) reads the client reference HTML and the WordPress database,
not a run's pattern/limit/tag, and what it writes is the template every page renders into rather than
per-run data. `run_pipeline.py` runs it once, before stage 1, by default — pass `--skip-prepare` to
skip it (e.g. on a `--from 3` re-run of a selection whose template hasn't changed) or `--prepare-only`
to run just it and exit.

Or one stage at a time:

```bash
python3 scripts/extract_reference_template.py    # + extract_reference_services/faqs/areas/trust/lede.py, extract_wp_rating.py
python3 scripts/stage1_select_urls.py --pattern 'chimney-sweep-%-wa' --limit 12 --run trial-1
python3 scripts/stage2_validate_status.py
python3 scripts/stage3_fetch_content.py
python3 scripts/stage4_build_routes.py --emit-shard --emit-sql
python3 scripts/stage5_test_render.py          # needs `npm run dev` running in ../
python3 scripts/stage6_check_seo.py           # needs the same server
```

## Run reports

[`docs/runs/2026-09-11-family-a-100.md`](docs/runs/2026-09-11-family-a-100.md) — 100 family-A URLs,
all six stages, with what the client template changed and which findings are source data rather than
migration faults.

## What you get

| File | What it is |
| --- | --- |
| `URLS/fetched-URLS.md` | the URLs this run selected, and where they came from |
| `URLS/url-status.md` | what production answers for each one today |
| `URLS/fetched-URLS-content.md` | the copy extracted from each page |
| `URLS/render-report.md` | whether the app rendered it, check by check |
| `migrated-URLS-SEO/seo-values.json` | the SEO values pulled off each migrated page (title, description, canonical, headings, JSON-LD) |
| `migrated-URLS-SEO/seo-report.md` | the stage 6 audit against the WordPress source, per check |
| `out/*.json` | the machine-readable contract between stages |
| `../app/location/template.css`, `template-assets.json`, `template-shape.json` | the client reference's CSS and section/asset shape, decoded once by PREPARE |
| `../app/location/standard-services.json`, `standard-faqs.json`, `standard-areas.json`, `standard-trust.json`, `standard-lede.json` | the reference's brand copy (services, FAQs, service-area band, trust tiles, hero lede), lifted once by PREPARE |
| `../app/location/standard-rating.json` | the company-wide Google rating, read once from WordPress by PREPARE |
| `../public/reference/*` | every image and webfont the template references, decoded once by PREPARE |

## Requirements

- Python 3.9 or newer, standard library only
- The `mysql` client on `PATH`, with the local `chimcare_local` database loaded (also read by PREPARE's `extract_wp_rating.py`)
- The client reference page (`send-to-client/spokane.html`) on disk, for PREPARE's six other extractors
- Node and the app's dependencies installed in `..`, for stages 5 and 6 only

## Rules this pipeline follows

- **WordPress is read, never written.** Every database access is a `SELECT`.
- **The application database is not touched.** Stage 4 emits SQL as a plan; nothing runs it.
- **Production is the authority on status.** Fates come from a real request, not a lookup table.
- **Nothing is invented.** A page with no meta description gets none, and a body too thin to use is
  reported as skipped rather than padded.
- **Runs are reproducible.** The same pattern and count select the same URLs every time.

## Scope

The local WordPress database and the Next.js app in `chimcare-web`. No Cloudflare, no DNS, no edge
redirects, no deployment. Deleting `out/`, `URLS/` and `migrated-URLS-SEO/` removes every trace of a run; the
dispatcher then falls back to database-only behaviour.
