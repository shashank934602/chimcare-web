# chimcare-web — Minnesota vertical slice

A runnable Next.js 16 (App Router) build of the three location templates, seeded with **one state (Minnesota)** so you can check that every URL renders the content of the row it belongs to. Same schema, loaders, assembly and templates the production site will use; only the data is a test set.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000 — embedded Postgres (PGlite), migrated + seeded on first request
```

No database to install. Leave `DATABASE_URL` unset and the app runs on an in-memory Postgres (re-seeded on each restart). Set `PGLITE_DATA_DIR=.pglite` to keep the data between restarts. See `.env.example`.

Then, with the server running:

```bash
node scripts/check-pages.mjs http://localhost:3000
```

It fetches every test URL and prints what the template actually rendered for that row (title, h1, canonical, JSON-LD types, hero address line, phone, prices, neighbourhoods, card/FAQ counts) and fails on any unfilled `{{slot}}`.

## What each URL proves

| URL | Expect | Proves |
|---|---|---|
| `/locations/` | 200 | National hub; the state card, city chips and counts come from `site.states` / `site.cities`, not from the mock's JS object |
| `/locations/mn/` | 200 | State hub; 4 location cards (Minneapolis with a street address, Saint Paul/Rochester "served from", Duluth "Page in review" with no link); prices in the detail accordion are the MN region's |
| `/location/chimney-sweep-repair-in-minneapolis-mn/` | 200 | **Branch** city page: address, local phone, "Local Minneapolis Team", `HomeAndConstructionBusiness` schema, 92 service cards linking to 92 service pages, 2 Minneapolis-only FAQs merged into the 7 master FAQs, region prices $319/$79/$59 (national default is $299/$69/$49 — a literal would show the wrong number) |
| `/location/chimney-sweep-repair-in-st-paul-mn/` | 200 | **Coverage** city page: no street address anywhere, "Serving Saint Paul from our Minneapolis crew", `Service` + `areaServed` schema |
| `/location/chimney-crown-sealing-in-minneapolis-mn/` | 200 | Service×city page (decision Q1, option a): category eyebrow, card copy as lede, the category's long-form row, sibling links, link back to the city page, 5-item breadcrumb |
| `/location/chimney-crown-sealing-in-rochester-mn/` | 308 → city page `#svc-chimney-crown-sealing` | Tier C handling in-app (the edge Worker sends 301 in production) |
| `/location/chimney-sweep-repair-in-duluth-mn/` | 404 | A row with no neighbourhoods/local copy fails the distinctness gate and is withheld, not served thin |
| `/locations/wa/` | 404 | Unverified / unseeded state has no hub |

No `AggregateRating` markup is emitted anywhere; the visible rating line renders only when `branches.rating` is set (it is `null` in the seed).

## The booking form

Four steps — Service → Schedule → Details → Confirmation — in the mock widget's own style. Where it appears:

- **City and service pages**: inline in the hero (`#booking`). Any "Schedule Service" link on the page scrolls to it; a `data-book-service="quote"` link preselects an option. Service pages preselect their category's option (repair → Repair Quote).
- **Hub and state pages**: the slide-in sheet, opened by any `data-book` link (header button, final CTA). The sticky mobile bar always opens the sheet.

Every submission carries its context — page slug/kind, state, city, serving branch, service — so a lead is attributable to the page it came from. Prices in the options are the region's (the same `bookingOptions()` the templates use).

```
POST /api/bookings/      validate → insert site.bookings → adapter (mock: returns MOCK-<ref>) → { reference }
GET  /api/bookings/      last 50 rows (open in dev; ?token=ADMIN_TOKEN in production)
/admin/bookings/         table of submissions with their page / city / branch context
```

Validation lives in `lib/booking/validate.ts` and runs on both sides: the client checks the current step, the server checks the whole payload (422 with field errors). The adapter boundary is `lib/booking/adapter.ts` — `MockAdapter` now, `WorkizAdapter` when the API contract arrives (`BOOKING_ADAPTER=workiz`). Not yet: Turnstile, rate limiting, confirmation email, the BullMQ retry hop (architecture §12).

`node scripts/check-pages.mjs` also posts a booking and reads it back.

## Where the content comes from

```
data/seed/minnesota.ts   state copy, region prices, branch, cities (neighbourhoods, local specifics), city FAQs
data/seed/services.ts    8 categories + 92 services, card copy with {{slots}} (from the Spokane mock)
data/seed/masters.ts     13 master copy blocks with {{slots}} (from the Spokane mock)
lib/db/schema.ts         Drizzle schema, Postgres schema `site` (subset of architecture §6)
lib/db/seed.ts           inserts the above and builds site.pages: 4 city rows + 92 service rows per published city
lib/data/*.ts            typed loaders (the only place SQL lives)
lib/content/slots.ts     {{slot}} renderer — unknown slot throws
lib/content/assemble.ts  rows + masters → template props, distinctness gate, JSON-LD
app/location/[slug]/     the dispatcher: site.pages row decides city | service | redirect | 404
lib/booking/*            booking types, validation, adapter boundary (mock / workiz stub)
components/islands/BookingForm.tsx, BookingSheet.tsx   the 4-step form and the slide-in sheet
```

Templates (`components/templates/*`) receive fully-resolved props; they never see a DB row or a slot.

## Placeholders in the seed

Everything describing the business in Minnesota is invented for the test and marked as such in `data/seed/minnesota.ts`:
branch address (`1234 Placeholder Ave N`), phone (`612-555-0100`), licence, region prices, the Minnesota copy, and the photos (the state photo is reused as the city hero). Real values come from the extraction DB (`mig.*`) and the admin.

## Switching to Supabase

```bash
export DATABASE_URL='postgresql://…pooler.supabase.com:6543/postgres'   # transaction-mode pooler
npm run seed            # runs the migration in lib/db/migrations, then seeds if empty
npm run dev
```

Nothing else changes: the same Drizzle queries run against both drivers.

## Styling

The mock CSS is ported, not rewritten (`npm run port:css -- <dir-with-the-3-mock-html-files>` regenerates it):

- `styles/tokens.css` — one `:root` token set
- `styles/base.css` — resets, header/footer/booking/floating CTAs (from the state mock), keyframes
- `styles/hub.css` / `state.css` / `city.css` — each mock's remaining rules, scoped under `.tpl-hub`, `.tpl-state`, `.option`

Scoping is what lets three mocks that each redefine `.hero`, `.panel`, `.section` coexist in one app without touching their look. Fonts are the mock's Manrope files self-hosted from `public/fonts`; icons are the mock's sprite mounted once in the root layout.

## Not in this slice

Leaflet map (placeholder panel), ZIP/city finder behaviour, service drawer, Workiz adapter (mock in place), Turnstile/rate limiting, confirmation email, sitemap/robots, edge Worker + KV redirects, Valkey cache handler, `next/image` loader, Tier A verbatim sections (`page_sections`), admin. All of these are M3–M6 in the architecture doc; the data contract they plug into is already here.

## Open decisions this build exposes

- **Q1** — service×city URLs: keep as pages (`ServicePage`, shown here) for Tier A/B and redirect Tier C (Rochester shows the redirect), or redirect all of them.
- **Q2b** — state slug: `/locations/mn/` (as built) or `/locations/minnesota/`.
- **Q5** — source of the visible Google rating (`branches.rating`, currently null → no line).
- **Q6** — confirm prices differ by region; the seed makes MN differ from the default on purpose.
