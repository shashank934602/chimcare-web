# Step 0 — Baseline audit and tree reconstruction

Date: 2026-09-10
Scope: inspection and reconstruction only. No production change, no WordPress change, no Cloudflare
change, no DNS change, no redirect applied, no URL retired, no pilot started.

Authority for the merge plan: `reports/URL_MIGRATION_IMPLEMENTATION_SPEC.md` §1.1–1.2, §3, §4, §17 step 0.
Where this audit and that specification disagree, this audit records the measurement and says so.

---

## 1. Trees inspected

Every directory on this machine that contains a `package.json` naming `chimcare-web` was inspected,
plus the two sibling data repositories. Files were compared by SHA-1 over the whole tree, excluding
`node_modules/`, `.next/` and `.DS_Store`.

| Key | Path | Date | Files | Builds? |
| --- | --- | --- | --- | --- |
| **A-BUILT** | `~/Desktop/Chimcare 2/chimcare-web 2` | 4 Sep, patched 10 Sep | 105 | yes — `node_modules/` present, `.next/` built 10 Sep 15:06 |
| A-DL | `~/Downloads/chimcare-web 2` | 4 Sep | 103 | no deps installed |
| A-OLD1 | `~/Desktop/Chimcare 2/chimcare-web` | 4 Sep | 91 | no deps installed |
| A-OLD2 | `~/Downloads/chimcare-web` | 4 Sep | 91 | no deps installed |
| **B-REC** | `~/Desktop/chimcare/chimcare-web-2-RECOVERED` | 9 Sep | 154 | no — see §4 |

Relationships measured, not assumed:

- **A-OLD1 and A-OLD2 are byte-identical** to each other. Every one of their 91 files also appears in
  A-DL at the same hash. They are an earlier snapshot of the same tree, before booking, the admin
  bookings page, `docs/architecture.md` and migration `0001` existed. Neither adds anything.
- **A-DL is A-BUILT minus one change.** The only source difference is the case-insensitive filesystem
  collision fix: `components/chrome/sprite.ts` was renamed to `components/chrome/spriteData.ts` and
  `Sprite.tsx` updated to match. The remaining differences are build artefacts (`next-env.d.ts`,
  `tsconfig.tsbuildinfo`) and a refreshed `package-lock.json`.
- A-BUILT and B-REC share **16 file paths**, and **all 16 differ**. A-BUILT holds 89 paths B-REC does
  not; B-REC holds 138 paths A-BUILT does not.

This confirms the specification's claim that three trees exist and none is complete, and adds the
detail that four of the five copies are the same lineage: there is one application tree (in four
snapshots, of which A-BUILT is the newest and the only installed one) and one migration tree.

---

## 2. Selected canonical tree

```
~/Desktop/chimcare/chimcare-web
```

Chosen over merging into either source tree because:

- it sits beside `Chimcare-Migration/` and `chimcare-rebuild-main/`, which is exactly what
  `scripts/build-mn-seed.mjs` expects (`../Chimcare-Migration/output/job_listings.jsonl`,
  `../chimcare-rebuild-main/site/data/*`). No path rewriting was needed;
- both source trees stay untouched on disk, so the merge is reversible and every decision below can
  be re-checked against the original bytes.

The two source trees are now **archives, not build targets**. Nothing should be edited in them.

---

## 3. The 16 overlapping files — decision and reason

| File | Canonical source | Reason |
| --- | --- | --- |
| `package.json` | 4 Sep | 9 Sep copy is the Massachusetts pilot's: Next 15.5.4, `pg`, port 3100, no Drizzle, no PGlite, no `db:generate`, no `seed`. The tree runs Next 16.3.4 / Drizzle / PGlite. |
| `tsconfig.json` | 4 Sep, edited | 9 Sep copy sets `jsx: "preserve"` and `allowJs: false`, which the tree's `.mjs` scripts and JSX need otherwise. Edit: added `_archive`, `design-mocks`, `docs`, `reports` to `exclude`. |
| `app/page.tsx` | 4 Sep | 9 Sep copy imports `@/lib/queries`, which exists in no tree, and renders a Massachusetts pilot index. |
| `app/layout.tsx` | 4 Sep | 9 Sep copy is the pilot's bare shell: no `Sprite`, `Header`, `Footer`, `StickyBar` or `Reveal`, and loads fonts from Google rather than the self-hosted Manrope files in `public/fonts/`. |
| `app/not-found.tsx` | 4 Sep | 9 Sep copy is the pilot's; the 4 Sep one uses the ported design system (`tpl-hub`). |
| `lib/db/client.ts` | 4 Sep | 9 Sep copy is byte-identical apart from a recovery banner and four stray lines of `schema.ts` pasted above it. Nothing is lost. |
| `lib/data/pages.ts` | 4 Sep | 9 Sep copy is two files concatenated. Lines 75–104 are **byte-identical** to the 4 Sep file; lines 2–73 are the dispatcher, which is **byte-identical** to the 4 Sep `app/location/[slug]/page.tsx`. Both halves already exist correctly. |
| `components/templates/StateHub.tsx` | 4 Sep | **Material conflict — see §6 and ISSUE-013.** The 9 Sep copy is a genuine later refactor, but adopting it requires route changes that belong to the template phase. |
| `lib/db/schema.ts` | 9 Sep, banner stripped | Strict superset: adds the `source_status` enum, `review_flags`, `legacy_pricing_copy`, `legacy_thumbnail_id` and the `ReviewFlag` type. Diff against the 4 Sep file is additive only. |
| `lib/content/assemble-hubs.ts` | 9 Sep, banner stripped | Two real fixes over 4 Sep: hub cards read `city.heroImageKey` instead of `branch.photoKey` (null on every branch, so no card ever showed an image), and card search text drops the state name (it matched all 150 towns). Also runs `fillDeep` over `state.introParagraphs`. |
| `data/seed/minnesota.ts` | 9 Sep | The 4 Sep file is hand-written placeholder copy and says so in its own header. The 9 Sep file reads `minnesota.generated.json` and invents nothing. |
| `lib/db/seed.ts` | 9 Sep | Adds `pageSeed`, which the 4 Sep file has no concept of. |
| `scripts/check-pages.mjs` | 9 Sep | Test URLs match the generated dataset; the 4 Sep URLs do not exist in it. |
| `CLAUDE.md` | 9 Sep | Describes the generated seed pipeline and the sibling-repo inputs the merged tree actually uses. |
| `lib/data/states.ts` | **merged** | The 9 Sep file is a fragment: it has no base functions, only the card-resolution addendum, and its first line is a section comment. The 4 Sep file has the base. Merge = 4 Sep base + `getResolvedCitiesForState` and `ResolvedCityListing`, with `inArray` and the `card-resolution` import hoisted. |
| `lib/data/cities.ts` | **merged** | Same shape: the 9 Sep file is only `getCityIdBySlug`, with no imports at all. Appended to the 4 Sep base, which already imports everything it needs. `app/admin/preview/[slug]/page.tsx` requires it. |

---

## 4. Contamination found

The specification lists six contaminated files, each with one or two banner lines. **Seven files were found, and one of them carries nine contaminated lines rather than the one recorded.**

| File | Banner | Handling |
| --- | --- | --- |
| `lib/db/schema.ts` | L1 `===== lib/db/schema.ts =====` | stripped; file adopted |
| `lib/content/assemble-hubs.ts` | L1 `===== lib/content/assemble-hubs.ts =====` | stripped; file adopted |
| `components/templates/StateHub.tsx` | L1 `===== StateHub.tsx =====` | stripped; file archived, not adopted (§6) |
| `components/islands/LocationDirectory.tsx` | L1 `===== LocationDirectory.tsx =====` | stripped; file adopted |
| **`scripts/migrate/source.mjs`** | **L1–L8 are a `wc -l` file listing of the recovery dump (`463 scripts/migrate/agent.mjs` … `1163 total`), then L9 `===== source.mjs =====`** | **the specification records only L9.** L1–L8 are outside the comment block and are a hard `SyntaxError`; all nine lines removed |
| `lib/data/pages.ts` | L1 `===== app/location/[slug]/page.tsx =====`, L74 `===== lib/data/pages.ts =====` | file rejected; both halves already present and byte-identical elsewhere |
| **`lib/db/client.ts`** | **L1 `=== schema.ts (     263 lines) ===`, L5 `=== client.ts ===`, plus three orphan lines of `schema.ts` (`pgEnum,` / `pgSchema,` / `export const site = …`) carrying their original line numbers** | **not listed in the specification.** File rejected; the 4 Sep copy is byte-identical to the clean remainder. |

The canonical tree now contains **zero** banner lines in `app/`, `lib/`, `components/`, `scripts/` or
`data/seed/`, verified by regex sweep.

Duplicated/concatenated content was found in exactly two files, `lib/data/pages.ts` and
`lib/db/client.ts`, both handled above. No import in the canonical tree points at an obsolete copy:
every `@/…` specifier in the merged tree resolves, checked by enumerating all path-alias imports and
by `tsc --noEmit`.

---

## 5. Files rejected and preserved

Nothing was deleted. `_archive/` in the canonical tree is excluded from `tsconfig.json` and holds:

| Directory | Contents | Reason |
| --- | --- | --- |
| `9sep-rejected/` | the 9 Sep `app/page.tsx`, `app/layout.tsx`, `app/not-found.tsx`, `lib/db/client.ts`, `next.config.mjs`, `package.json`, `tsconfig.json`, `app/chimcare-design.css` | superseded per §3 |
| `9sep-recovery-variants/` | `schema.ts.older-10822`, `source.mjs.older-10527`, `states.mjs.older-2579`, `states.ts.alt-1485`, `LocationDirectory.tsx.older-4124`, `CityContact.tsx.alt-1152` | second-best copies the recovery produced |
| `9sep-deferred-to-template-phase/` | `StateHub.tsx` | ISSUE-013 |
| `9sep-orphaned-ma-pilot/` | `components/locations/city/*.tsx` (6 files) | **every one imports `@/lib/types`, which exists in no tree.** They cannot compile anywhere and are not referenced by any surviving file. |
| `9sep-unsorted/` | the 9 Sep `_unsorted/` scratch directory | nothing references it |

Also carried into the canonical tree rather than left behind: the Search Console export
(`data/inputs/indexed_urls (4).csv`, 13 MB) and the three design mocks
(`design-mocks/{locations new3,spokane,washington-locations}.html`) that `scripts/port-css.mjs`
consumes and whose absence `CLAUDE.md` complains about.

---

## 6. Unresolved: the StateHub conflict (ISSUE-013)

Both versions are authoritative in different senses and they conflict materially, so this is recorded
rather than decided.

- The 4 Sep `StateHub.tsx` renders the hero search box and the location card grid as inline markup.
  It builds today and `app/locations/[state]/page.tsx` calls it correctly.
- The 9 Sep `StateHub.tsx` is a later refactor of the same file: the same markup extracted into
  `HeroSearch` and `LocationDirectory` islands, plus `styles/directory.css`. It is newer and better
  structured.
- It cannot be adopted without changing its call site: its signature is
  `StateHubProps & { query: string; stateSlug: string }`, and the only route that renders it passes
  neither.

The specification (§3) assigns `StateHub.tsx` to the 4 Sep tree with "no change needed", which is
consistent with taking the buildable one now.

**Treatment:** the 4 Sep version is canonical for the Step 0 baseline. The 9 Sep version is preserved
in `_archive/9sep-deferred-to-template-phase/`. Its three dependencies —
`components/islands/{HeroSearch,LocationDirectory,locationSearch}.tsx|.ts`, `lib/content/search.ts`
and `styles/directory.css` — **are** in the canonical tree and typecheck cleanly, so the template
phase can adopt the refactor by changing one route and one import. Nothing was thrown away.

---

## 7. Working code changed during reconstruction

Two changes were required to make the merged tree typecheck. Both are recorded because the brief
forbids changing working code silently.

**1. `lib/content/assemble.ts` — `distinctnessGate` accepts both call shapes.**
The 4 Sep signature is `(city: City, branch, prices, faqCount)`. The 9 Sep `data/seed/minnesota.ts`
calls it with a single object naming the same six values, because the seed builder runs the gate on
generated rows that are not yet `City` records. The 9 Sep `assemble.ts` that matched this call is
missing from every tree. Rather than change either caller, an overload was added: both shapes reach
one shared body, so the two forms cannot drift apart. **The gate's logic and thresholds are
unchanged** — same six checks, same order, same strings.

**2. `app/admin/migration/page.tsx` — two flag codes corrected.**
`MissingList` mapped `faq_question_missing_in_export` and `hero_image_not_imported`, neither of which
`lib/migration/flags.mjs` defines. Replaced with the defined codes `faq_missing_in_source` and
`hero_image_missing`. This is the resolution the specification already prescribes (§18 item 22). The
map's type is `Partial<Record<ReviewFlag['code'], string>>`, so an unknown code now fails typecheck.

No other application logic was modified.

---

## 8. Not a git repository

`~/Desktop/chimcare` is not a git repository and neither was any source tree, so **no commit hash
exists to record as the Step 0 baseline.** This is ISSUE-014. The baseline is instead identified by
the file manifest and hashes in `docs/migration/runs/2026-09-10-step-0.md`.

---

## 9. Generated datasets — regeneration result

Four of the five missing datasets were regenerated from primary sources. The fifth was not written,
deliberately.

| Dataset | Generator | Inputs | Result |
| --- | --- | --- | --- |
| `data/seed/minnesota.generated.json` (6.4 MB) | `scripts/build-mn-seed.mjs` | `../Chimcare-Migration/output/job_listings.jsonl` (2.48 GB), `../chimcare-rebuild-main/site/data/{branches,keep-pages,redirects,gone,pricing}.json`, `content/hubs/state-mn.md` | **regenerated**, every sealed count reproduced |
| `data/seed/mn-geocode.json` (135 entries) | same, Nominatim at 1 req/s | city names with no WordPress coordinate | **regenerated** |
| `data/seed/minnesota.faq.json` (137 pages, 656 questions) | `scripts/recover-mn-faqs.mjs` | `chimcare_local.wp_posts.post_content`, SELECT only | **regenerated** |
| `data/seed/minnesota.media.json` + `public/uploads/` (15 assets) | `scripts/recover-mn-media.mjs` | `_thumbnail_id` + attachment meta; binaries by GET from `https://www.chimcare.com` | **regenerated**, 15/15 byte-verified, 0 problems |
| `data/seed/mn.migration.json`, `data/seed/mn.ledger.json` | `scripts/migrate/agent.mjs --apply` | WordPress + the above | **NOT written — see ISSUE-015** |

### Determinism

`build-mn-seed.mjs` was run twice, the second time with a warm geocode cache. With `generatedAt`
removed, the two outputs are byte-identical:

```
run 1  sha256 = fd6b9d0b20c03bccc34d35426cbb60c2f5ceadda101569eabf9f696baed8c26c
run 2  sha256 = fd6b9d0b20c03bccc34d35426cbb60c2f5ceadda101569eabf9f696baed8c26c
```

The file as written is **not** byte-stable across runs, because the generator stamps
`generatedAt: new Date().toISOString()` into it. Every other byte is reproducible. The geocode cache
is byte-stable across runs.

The output is **not committed**: it is regenerable, 6.4 MB, and `.gitignore`d along with the frozen
audit CSVs. Its hash is recorded in `runs/2026-09-10-step-0.md`.

### Counts against the sealed baseline

Source of the seal: `reports/PROJECT_CONTEXT_HANDOFF.md` §4, "VERIFIED, do not change". **The seal was
not edited.** Checked by `scripts/regression/step0-extraction-regression.mjs`.

| Check | Sealed | Regenerated | Result |
| --- | --- | --- | --- |
| cities | 150 | 150 | PASS |
| branch cities | 14 | 14 | PASS |
| coverage cities with a page | 120 | 120 | PASS |
| cities with no source page | 16 | 16 | PASS |
| branches | 14 | 14 | PASS |
| migrated city pages | 134 | 134 | PASS |
| URLs in the Minnesota universe | 20,479 | 20,479 | PASS |
| → 308 (redirect) | 6,803 | 6,803 | PASS |
| → gone | 1,219 | 1,219 | PASS |
| → legacy not migrated | 9,568 | 9,568 | PASS |
| FAQ pairs on the 134 migrated pages | 642 | 642 | PASS |
| hero attachments, byte-verified | 15 | 15 | PASS |

Two numbers needed reconciling, and both reconcile exactly rather than approximately:

- The generator's own summary prints `redirect: 6786`, not 6,803. Its counter increments only inside
  the universe loop and misses the 14 rows built from WordPress `redirect_info` and the 3 duplicate
  city pages. 6,786 + 14 + 3 = 6,803, and counting rows with `fate === 'redirect'` in the output
  gives 6,803 directly. The seal is right; the printed counter is a partial measure.
- FAQ recovery reports 137 pages and 656 questions, not 134 and 642. The three extra pages are
  `chimney-sweep-repair-in-{apple-valley,eagan,maple-grove}-mn`, the duplicate city pages the builder
  redirects, and they carry exactly 14 questions between them. 656 − 14 = 642 on the 134 pages.

### Counts that did NOT reproduce

`109 publishable · 25 needs_review · 454 review flags` could not be reproduced. See ISSUE-015. The
sealed numbers were not altered and no dataset was written to make them agree.
