# Application session — the site and its backend, not the migration

Written 2026-09-21. Open a session in `/Users/vss-2/Desktop/chimcare/codebase/chimcare-web` and say:
*"Read `docs/frontend-session.md` and work on the app."*

This session owns the **application**: what the visitor sees, and what runs behind it — pages,
styles, islands, API routes, the booking flow, the database and the loaders that feed the templates.
The migration pipeline that fills the site with 13,000 pages is a separate job, listed under
"Do not touch".

---

## 1. The site

A Next.js 16 rebuild of Chimcare.com. Live preview: https://chimcare-web.vercel.app (13,000 pages,
deliberately hidden from Google until the domain moves).

| Page | Built from |
|---|---|
| Home `/` | Saved WordPress/Elementor HTML in `app/_home/content.ts`, patched at render time |
| About, Contact, Services | React templates in `components/templates/` |
| Locations hubs `/locations/`, `/locations/{st}/` | `components/templates/NationalHub.tsx`, `StateHub.tsx` |
| Location pages `/location/{slug}/` | `app/location/[slug]/page.tsx` — one template serves ~13,000 pages |
| Shared chrome | `components/chrome/` — Header, Footer, StickyBar, HomeStyleNav |
| Behaviour | `components/islands/` — small `'use client'` leaves only |

---

## 2. Run it and see it

```bash
npm run dev                  # fastest for front-end work; http://localhost:3000
# or, to see exactly what ships:
rm -rf .next && SITE_URL= npm run build
ADMIN_TOKEN=verify-local npm start -- -p 3200
```

**Port 3200 may belong to another session.** Check first (`lsof -ti tcp:3200`) and prefer `npm run
dev` on 3000 so you never collide. If you must build, say so in chat first — two builds at once
corrupt `.next`.

Pages worth keeping open:

- `/` · `/about-us/` · `/contact-us/` · `/chimcare-services/` · `/locations/` · `/locations/mn/`
- `/location/chimney-sweep-in-columbus-oh/` — 129 service cards
- `/location/chimney-sweep-fireplace-in-minneapolis-mn/` — the reference page, the most complete one

Check at **390px (iPhone 13)** and **1440px**. Most of this site's visitors are on a phone.

---

## 3. Where styles live, and the one rule that matters

| File | Status |
|---|---|
| `styles/tokens.css`, `base.css`, `hub.css`, `state.css`, `city.css` | **Generated. Never hand-edit.** |
| `app/location/template.css`, `app/location/template-assets.json` | **Generated from the client reference. Never hand-edit.** |
| `public/home/home.css` | **Generated from the saved WordPress page. Never hand-edit.** |
| `app/_home/content.ts` | **The saved homepage HTML. Never edit.** |
| `app/_home/overrides.css` | Hand-written homepage corrections, numbered `/* N — … */`. **Next free number: 23** |
| `styles/site-fixes.css` | Hand-written overrides for the generated stylesheets |
| `styles/*.css` (footer, mobile-menu, home-nav, services, usa-map, page-hero …) | Hand-written, edit freely |

**The rule:** to change something a generated file sets, add an override in
`app/_home/overrides.css` (homepage) or `styles/site-fixes.css` (everywhere else), with a comment
saying what you are overriding and why. Never edit the generated file: a regeneration would silently
undo you.

**The homepage is saved HTML.** It is patched at render time in `app/page.tsx` by string swaps —
`withHomeHero`, `withInternalAboutLink`, `withHeaderBbb`, `withoutEmDash`, `withSharpAwardLogos` and
friends in `app/_home/`. To change homepage markup, change the patch, not the saved file.

---

## 4. Decisions already made — keep them

These came from the client and should not be quietly reversed:

- **No em dashes in visible copy.** `lib/content/typography.ts` turns them into commas everywhere.
- **No "Fast" on the booking button.** It reads "Online Booking".
- **Book before Call.** The sticky bar and the phone menu put Book Online first.
- **One light grey: `#F4F4F2`.** Do not reintroduce `#F5F4F2`, `#F5F5F5`, `#F8F9FA`, `#F1F5F8`.
- **No red dash before hero eyebrows.** Removed on home, About, Contact, Services (`site-fixes.css`).
- **Homepage headline:** "Chimney & Gas Fireplace Service Since 1989", "Gas Fireplace" in brand red.
- **Service dropdown reads "Select Service."**
- **Badges:** BBB `public/img/bbb-logo.svg`, Guild `public/img/ncsg-member.svg` (traced from the
  client's own file — do not substitute the official emblem, it was rejected).
- **Services live at `/chimcare-services/`**, WordPress's own URL.

---

## 5. Traps that have already cost this project time

- **The saved theme hides every `<br>` on phones** (`.page-id-337148 br{display:none!important}`).
  For a forced line break, use a block-level span — see `overrides.css` §20.
- **`.mm ul` resets list styles**, so mobile-menu rules must be written `.mm .mm-states` to win.
- **Elementor clones a hidden `.elementor-sticky__spacer`.** Exclude it from any query or you will
  measure the invisible copy.
- **The macOS filesystem is case-insensitive**: `UsaMapTip.tsx` and `usaMapTip.ts` cannot coexist.
- **`trailingSlash: true`** — API calls need the slash (`/api/locate/`), or they 308.
- **`overrides.css` does not hot-reload.** `app/page.tsx` reads it with `fs.readFileSync` at module
  load, so the dev server keeps serving the old CSS until you restart it. An edit that "doesn't
  work" is usually this: check `curl -s localhost:3000/ | grep '<your selector>'` before debugging
  the rule.
- **The saved theme pins menu links black with `!important`** (`.wp-home .menu-item a{color:#000
  !important}`). No amount of specificity beats it — a nav hover/active colour needs `!important`
  too. See `overrides.css` §22.
- **Smooth scrolling ruins screenshots.** Set `document.documentElement.style.scrollBehavior='auto'`
  before capturing, and force `[class*=reveal]` elements visible or they photograph blank.

---

## 6. How to check your work

Write a throwaway script at `.probe-tmp.mjs`, run it, delete it (it is git-ignored):

```js
import puppeteer, { KnownDevices } from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 90000);   // always
const p = await b.newPage(); await p.emulate(KnownDevices['iPhone 13']);
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
// measure, then screenshot and look at it with the Read tool
await b.close(); process.exit(0);
```

Run with `perl -e 'alarm 100; exec @ARGV' node .probe-tmp.mjs` — `timeout` does not exist on this Mac.

**Measure, then look.** Twice in this project a change was reported as working on numbers alone and
was wrong. A screenshot you actually open catches what a selector count cannot.

---

## 7. Open front-end work

| What | Notes |
|---|---|
| **Hero search bar** | The client sketched the ZIP inside the search bar, right-hand side, like Thumbtack. Today service, ZIP and button are three stacked controls. Layout not yet agreed — ask before building |
| **ZIP auto-detect cannot be seen locally** | It reads Vercel's geolocation headers, which do not exist on localhost, and refuses non-US visitors. Needs an IP-lookup fallback so it works anywhere. `lib/content/locate.ts`, `app/api/locate/route.ts` |
| ~~**Out-of-area requests**~~ | **Done 2026-09-21** (P-085). An unserved ZIP now shows a short request form, stored in `site.leads` — a separate table, never the booking adapter. `POST /api/bookings` classifies server-side too and diverts. Coverage rule: `lib/content/coverage.ts` `classifyZip()` — it proxies coverage with "do we publish a page for this ZIP", so swap its body when real territories arrive |
| **Pages are ~51 screens long on a phone** | Pre-existing on every location page. Worth a pass |
| **Breadcrumb structured data stops at "Home"** | The visible trail is Home / Locations / Minnesota / Minneapolis; the machine-readable version has only Home |
| **One photo on 97% of pages** | WordPress's own doing (it sets one Boston photo on 227,504 pages). A front-end fix would be a per-state or per-city mapping once the client supplies images |

---

## 8. The backend

### The shape of it

| Layer | Where | What it does |
|---|---|---|
| API routes | `app/api/` | `bookings`, `contact`, `locate`, `zip-lookup`, `health` |
| Booking | `lib/booking/` | `adapter.ts` (MockAdapter now, WorkizAdapter stub), `validate.ts`, `types.ts` |
| Data loaders | `lib/data/*.ts` | The **only** place that runs SQL. One file per subject: cities, pages, pricing, services, states, contact, masters |
| Assembly | `lib/content/assemble*.ts` | Turns rows into fully-resolved template props. Templates never see a row or a `{{slot}}` |
| Schema | `lib/db/schema.ts` + `lib/db/migrations/` | Drizzle. **Never hand-edit the SQL** — change the schema and run `npm run db:generate` |
| Connection | `lib/db/client.ts` | `DATABASE_URL` set → Supabase Postgres through the pooler; unset → embedded PGlite, migrated and seeded on first use |
| Route store | `lib/route-store.ts` | Read-only SQLite of the 13,000 migrated pages. Published by the pipeline; treat as input |

### The conventions that are not negotiable

- **Postgres is the source of truth.** Only `lib/data/*.ts` runs SQL.
- **No literals for business facts.** Prices, phones, addresses and place names come from rows via
  slots (`lib/content/slots.ts`). An unknown slot throws — keep it that way.
- **Booking goes through the adapter**, never straight to a vendor API. Validation in
  `lib/booking/validate.ts` runs on the client per step and on the server for the whole payload.
- **Never emit `AggregateRating` or `Review` markup.** JSON-LD is built in assemble; canonical is
  self; an unpublished page is a 404.
- **Scripts that write to a database must be idempotent and support `--dry-run`.**

### Running it

```bash
npm run dev            # PGlite migrates and seeds itself — no database setup needed
npm run typecheck      # must pass before you finish
npm run seed -- --reset            # truncate and reseed
npm run db:generate                # after editing lib/db/schema.ts
node scripts/check-pages.mjs http://localhost:3000   # fetches every test URL, posts a booking, reads it back
```

Environment (`.env.example` has the full list): `DATABASE_URL` unset uses the embedded database;
`SITE_URL` sets canonicals; `ADMIN_TOKEN` protects `/admin/*` in production; `BOOKING_ADAPTER`
selects mock or workiz.

### Checking the backend works

```bash
curl -s localhost:3000/api/health/                      # {"ok":true,"driver":"pglite","pages":N}
curl -s localhost:3000/api/zip-lookup/?zip=55415        # city match
curl -s localhost:3000/api/locate/                      # geolocation (see §7 — empty on localhost)
curl -s -X POST localhost:3000/api/bookings/ -H 'content-type: application/json' -d '{"service":"x"}'
# → 422 with field errors; a valid payload returns 201 {reference}
```

The test matrix in `CLAUDE.md` lists the URLs that must keep working after any change — including
which ones must 404 and which must redirect. Run it when you touch routing, data or assembly.

---

## 9. Do not touch

- `chimcare-migration/**` — the pipeline, its scripts, its docs
- `data/routes.sqlite`, `data/migration-ledger.sqlite` — the page data, published by the pipeline.
  Read it, never write it
- `data/seed/services.ts` and `data/seed/states.generated.json` — generated from WordPress
- `lib/db/migrations/*.sql` — generated by Drizzle

**Never deploy.** Deploys are paused at Vercel and only go out when the user says "push it" — and
that is not this session's job.

---

## 10. Where to look things up

- `CLAUDE.md` — project conventions, the test matrix, settled decisions
- `chimcare-migration/docs/problem-log.md` — every problem found and how it was fixed (P-001 … P-084)
- `http://localhost:3200/admin/batches/?token=verify-local` — the migration dashboard, if that port is up
- `docs/page-anatomy/` — what each page is made of
