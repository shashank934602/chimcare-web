# _archive — provenance, not source

Nothing in this directory is compiled, imported or executed. `tsconfig.json` excludes it.
It exists so the Step 0 merge is reversible and auditable.

| Directory | What it holds | Why it is not in the tree |
| --- | --- | --- |
| `9sep-rejected/` | the 9 Sep tree's version of a file where the 4 Sep version was chosen | superseded; see `docs/migration/STEP-0-BASELINE-AUDIT.md` |
| `9sep-recovery-variants/` | `.older-*` / `.alt-*` duplicates the recovery produced | second-best copies of files already merged |
| `9sep-deferred-to-template-phase/` | `StateHub.tsx` island refactor | newer than the adopted version but needs route changes that belong to the template phase — ISSUE-013 |
| `9sep-orphaned-ma-pilot/` | `components/locations/city/*` | every file imports `@/lib/types`, which exists in no tree |
| `9sep-unsorted/` | the 9 Sep `_unsorted/` scratch directory | nothing in the migration references it |

The untouched source trees remain at `~/Desktop/chimcare/chimcare-web-2-RECOVERED` (9 Sep) and
`~/Desktop/Chimcare 2/chimcare-web 2` (4 Sep).
