---
title: "Fix the stale Cabo Verde population total in recette"
type: "bugfix"
created: "2026-09-01"
status: "in-review"
baseline_commit: "bb640c48ef43875a24b97f18e779e909da0837e4"
context:
  - "{project-root}/docs/runbooks/afrik-data-sync.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Cabo Verde country page served by localhost displays `6K habitants documentés · 2025`, although the canonical 2025 country population is 500,000. The application is reading a stale `afrik_countries` row from the Supabase project backing recette: that row has no national total and declares only the 6,000-person minority headcount.

**Approach:** Keep the existing transformer and canonical corpus unchanged because they already contain the tested 500,000 total. Follow the guarded AFRIK synchronization runbook to validate and back up recette, preview the corpus drift, apply the canonical projection to recette only, and verify the database, API, and rendered page.

## Boundaries & Constraints

**Always:** Work from the isolated worktree; preserve the user's dirty checkout; use Node 22 or newer for the loader; validate the corpus before writing; take a restorable pre-sync snapshot of every AFRIK table named by the runbook; run preview before apply; target the checked recette project `shmrjtnfbqzceovroqjj`; verify the resulting CPV payload through an anonymous read; delete any temporary snapshot immediately after verification unless it is needed for recovery.

**Ask First:** Any write outside recette, any schema migration, any manual JSONB patch that bypasses the canonical synchronizer, or any recovery restore requires separate approval.

**Never:** Target production; edit the already-correct 500,000 canonical figure; weaken RLS; expose service-role credentials; skip the pre-sync snapshot; discard unrelated work; add a redundant transformer test solely to mask deployment drift.

## I/O & Edge-Case Matrix

| Scenario                   | Input / State                                                                 | Expected Output / Behavior                                                                      | Error Handling                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Stale recette projection   | CPV lacks `demographics.totalPopulation`; only one row has `population: 6000` | Preview reports CPV as stale without writing                                                    | Stop if the target guard, corpus validation, or read fails                                     |
| Successful synchronization | Canonical CPV content has total 500,000 and row headcounts 494,000 + 6,000    | Apply completes without insertion errors and post-sync drift is false                           | Retain the snapshot and diagnose; restore only after explicit approval                         |
| Runtime verification       | Anonymous API/page read after apply                                           | API exposes 500,000 and the page renders `500K habitants · 2025`, not `6K habitants documentés` | Revalidate or restart the local runtime cache, then re-read; do not rewrite data twice blindly |

</frozen-after-approval>

## Code Map

- `dataset/source/afrik/pays/CPV.json` -- canonical CPV record; already declares the 2025 national total and both people headcounts.
- `src/lib/__tests__/countryDataTransformer.test.ts` -- existing regression test that imports the canonical CPV fiche and requires `500K`.
- `src/lib/countryDataTransformer.ts` -- correctly prefers a declared national total and falls back to summed documented headcounts only when it is absent.
- `scripts/migrateAfrikToDatabase.ts` -- guarded preview/apply synchronizer that projects canonical AFRIK JSON into Supabase and verifies residual drift.
- `scripts/lib/afrikSyncTarget.ts` -- refuses environment/project mismatches and pins the recette project.
- `docs/runbooks/afrik-data-sync.md` -- authoritative validation, snapshot, preview, apply, and verification procedure.

## Tasks & Acceptance

**Execution:**

- [x] `src/lib/__tests__/countryDataTransformer.test.ts` and `scripts/__tests__/populationDataCoverage.test.ts` -- run the existing test-first contracts to confirm the Git source still yields 500,000 before any database write.
- [x] `docs/runbooks/afrik-data-sync.md` -- run canonical validation and editorial checks with the required Node runtime.
- [x] `docs/runbooks/afrik-data-sync.md` -- create a restorable recette snapshot, execute the read-only sync preview, and review all reported drift and parsed corpus counts.
- [x] `scripts/__tests__/migrateAfrikToDatabase.test.ts` -- prove that existing rows preserve protected classification status while their unprotected content synchronizes and protected drift remains visible.
- [x] `scripts/migrateAfrikToDatabase.ts` -- treat classification status as insert-only in bulk synchronization and report existing-row status differences without bypassing assertion integrity.
- [ ] `scripts/migrateAfrikToDatabase.ts` -- apply the approved canonical sync to recette and require zero insertion errors plus `hasDrift: false` afterward.
- [x] `src/app/[lang]/explorer/pays/[slug]/page.tsx` -- verify the anonymous CPV API payload and the country page after cache revalidation or local restart if necessary.

**Acceptance Criteria:**

- Given the canonical CPV fiche and existing regression contracts, when the targeted tests run, then they pass with a national population of 500,000 for reference year 2025.
- Given a reviewed snapshot and preview against the pinned recette project, when the guarded sync is applied, then post-sync verification reports no residual AFRIK content drift and no insertion errors.
- Given an anonymous request for CPV after synchronization, when the country page is rendered, then it shows `500K habitants · 2025`; the 99% row resolves to 494K and the 1% row remains 6K.
- Given the original checkout contains unrelated changes, when the task completes, then those files remain untouched and the operational work is isolated to the requested worktree and recette database.

## Spec Change Log

- 2026-09-01: After the first recette apply exposed assertion-trigger failures on existing classification statuses, the user expanded the scope to fix the generic synchronizer. Existing protected statuses are now preserved and surfaced as non-fatal protected drift; bulk synchronization no longer bypasses assertion integrity. The operational re-apply was stopped at the user's request before opening the PR.

## Verification

**Commands:**

- `vitest run src/lib/__tests__/countryDataTransformer.test.ts scripts/__tests__/populationDataCoverage.test.ts` -- expected: existing CPV and corpus population contracts pass.
- `tsx scripts/validateAfrikData.ts` and `tsx scripts/ci/checkEditorialRules.ts` -- expected: canonical corpus is valid before synchronization.
- `tsx scripts/migrateAfrikToDatabase.ts --target=recette` -- expected: read-only preview identifies stale projection data and the target guard accepts only recette.
- `tsx scripts/migrateAfrikToDatabase.ts --target=recette --apply` -- expected: no insertion errors and post-sync `hasDrift: false`.
- Anonymous REST/API read for `CPV` -- expected: `totalPopulation: 500000`, `referenceYear: 2025`, people populations `494000` and `6000`.
