---
storyId: R-2/ASR-4
storyKey: r2-asr4-per-assertion-data-model
storyFile: null
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-r2-asr4-per-assertion-data-model.md
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-author-tests
  - step-04-verify-red
  - step-05-author-migration
  - step-06-update-types
generatedTestFiles:
  - src/lib/supabase/__tests__/per-assertion-data-model.test.ts
inputDocuments:
  - _bmad-output/test-artifacts/test-design/test-design-architecture.md
  - _bmad-output/project-context.md
  - supabase/migrations/008_module_zero_fabric.sql
  - supabase/migrations/013_flags_severity_auto.sql
  - supabase/migrations/014_module_zero_fabric_align.sql
  - src/lib/supabase/__tests__/rls-policies.test.ts
  - e2e/support/factories/fiche.ts
  - e2e/support/factories/flag.ts
lastStep: step-06-update-types
lastSaved: 2026-05-21T00:00:00Z
migrationFile: supabase/migrations/018_per_assertion_fiche_revisions.sql
typesFile: src/types/module-zero.ts
jiraStory: ETNI-207
architectRuling: 2026-05-14 — Winston — Option 1 (typed FK, nullable, anchor-required CHECK). See "Architectural ruling" section.
---

# ATDD checklist — R-2 / ASR-4: per-assertion data model

## Why this exists

The TEA test-design architecture names **R-2 (per-assertion data-model migration)** as one of three score-9 Phase-1 risks and pins **ASR-4 (per-assertion stable IDs in fiche content)** as the mitigation. The risk register specifies the mitigation order:

> Schema migration + `data-assertion-id` (ASR-4) before any flag-UI work. ATDD: failing acceptance test on the contract first.

This checklist tracks the red-phase contract test that gates the schema migration.

## Risk linkage

- **R-2** — TECH score 9 — "Per-assertion data-model extension not yet shipped (UX spec L1238 = single hardest Phase-1 blocker). Phase 2 (Kofi) impossible until done."
- **ASR-4** — pre-Phase-2 architectural seam: `data-assertion-id="…"` on every assertion DOM node + matching `id` on the backing DB row.
- **Owner:** architect.
- **Without this test, Phase 2 (Kofi flagging) is dead-on-arrival.**

## Scope of this red-phase test

This file covers the **schema half** of the contract (the database side of R-2 / ASR-4). The DOM half — `data-assertion-id` emitted on every rendered assertion node, matching `assertions.id` — is a separate Playwright spec authored in Phase 2 under test ID **2.1-E2E-001** ("long-press an assertion → FlagTarget appears"). That spec flips red→green only after this migration lands _and_ the render layer emits the attribute.

## Contract assertions (9 tests)

| #    | Group      | Assertion                                                                                                                   | Today                              | Post-migration                       |
| ---- | ---------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------ |
| C1   | regression | `assertions.id` is a server-generated UUID v4 PK                                                                            | passes                             | passes                               |
| C3   | regression | `assertions.confidence_level` CHECK rejects out-of-enum values                                                              | passes                             | passes                               |
| C5   | new        | `fiche_revisions` table accepts insert with `id`, `entity_type`, `entity_id`, `version`, `content_snapshot`, `published_at` | **fails** (42P01 undefined_table)  | passes                               |
| C6.1 | new        | `assertions.fiche_revision_id` is NOT NULL                                                                                  | **fails** (42703 undefined_column) | passes (23502 not_null_violation)    |
| C6.2 | new        | `assertions.fiche_revision_id` FK rejects orphan UUID                                                                       | **fails** (42703)                  | passes (23503 foreign_key_violation) |
| C6.3 | new        | `assertions` insert with valid `fiche_revision_id` succeeds and round-trips the value                                       | **fails** (42703)                  | passes                               |
| C6.4 | new        | Deleting a `fiche_revisions` row cascades to its assertions                                                                 | **fails**                          | passes                               |
| C8.1 | new        | `flags.assertion_id` FK lets a flag anchor to an assertion; deleting the assertion cascades to flags                        | **fails** (42703)                  | passes                               |
| C8.2 | new        | `flags.assertion_id` FK rejects orphan UUID                                                                                 | **fails** (42703)                  | passes (23503)                       |

> The C6.1 test uses a graduated assertion: it accepts either `42703` (column missing — today) or `23502` (NOT NULL violation — after migration). The stricter `23502` check fires only once the column exists, so the test cannot silently accept a nullable column. Same pattern for C6.2 and C8.2.

## Test file

- **Path:** `src/lib/supabase/__tests__/per-assertion-data-model.test.ts`
- **Framework:** Vitest (matches the existing `rls-policies.test.ts` integration-test pattern)
- **Stack tier:** **integration** — runs against a real Supabase / Postgres instance via the service-role client. No mocks.
- **Isolation:** every entity ID is namespaced `ATDD_R2_<short uuid>` (R-9 mitigation). Each `it` block wraps inserts in `try / finally`; an `afterAll` hook deletes all tracked rows in reverse-FK order.
- **Skip guard:** suite is skipped (not failed) when `TEST_SUPABASE_ANON_KEY` / `TEST_SUPABASE_SERVICE_KEY` are absent, so `npm test` on a dev box without `supabase start` does not produce false red.

## Verification log

### 2026-05-21 — ETNI-207 implementation (ferry/ETNI-207)

Migration `018_per_assertion_fiche_revisions.sql` authored and merged into `ferry/ETNI-207`. TypeScript row types added in `src/types/module-zero.ts`. The migration creates `fiche_revisions`, wires `assertions.fiche_revision_id NOT NULL` (with backfill), adds `flags.assertion_id NULL` + `flags.assertion_field_path NULL`, adds `flags_has_anchor_check` CHECK, and creates the two required indexes. All steps are idempotent. The ATDD test file was not modified — it was authored as the red-phase gate and turns green only when the migration is applied to a live database. No polymorphic columns were introduced on `flags`, per the architectural ruling.

---

### 2026-05-14 — initial author

Ran without local Supabase running:

```text
npx vitest run src/lib/supabase/__tests__/per-assertion-data-model.test.ts --reporter=verbose
…
 Test Files  1 skipped (1)
      Tests  9 skipped (9)
   Duration  308ms
```

All 9 tests parse correctly and are discovered under the proper describe hierarchy. Skipped (expected) because env not set on dev box.

### Steps to verify red against local Supabase

```bash
supabase start
export TEST_SUPABASE_URL=http://127.0.0.1:54321
export TEST_SUPABASE_ANON_KEY=$(supabase status -o json | jq -r .ANON_KEY)
export TEST_SUPABASE_SERVICE_KEY=$(supabase status -o json | jq -r .SERVICE_ROLE_KEY)
npx vitest run src/lib/supabase/__tests__/per-assertion-data-model.test.ts
```

**Expected red output:**

- C1, C3 — pass (already on `main` via migration 014).
- C5 — fails with `relation "fiche_revisions" does not exist` (42P01).
- C6.1, C6.2, C6.3, C6.4, C8.1, C8.2 — fail with `column "fiche_revision_id" / "assertion_id" of relation … does not exist` (42703).

This is the **right** kind of red: it points at concrete schema gaps, not at infrastructure flakiness.

## Definition of done (green criteria)

A future migration (call it `016_per_assertion_fiche_revisions.sql`) must:

1. **Create `fiche_revisions`** with PK `id UUID DEFAULT gen_random_uuid()`, columns `entity_type TEXT NOT NULL`, `entity_id TEXT NOT NULL`, `version INTEGER NOT NULL`, `content_snapshot JSONB NOT NULL`, `published_at TIMESTAMPTZ`, plus standard audit fields and `UNIQUE (entity_type, entity_id, version)`. RLS enabled, read-public policy.
2. **Add `assertions.fiche_revision_id UUID NOT NULL REFERENCES fiche_revisions(id) ON DELETE CASCADE`** and `CREATE INDEX idx_assertions_fiche_revision_id ON assertions(fiche_revision_id)`. Backfill for any rows that exist in `assertions` today must seed a placeholder `fiche_revisions` row per `(entity_type, entity_id)` so the NOT NULL constraint is satisfiable in one shot.
3. **Add `flags.assertion_id UUID REFERENCES assertions(id) ON DELETE CASCADE`** and `CREATE INDEX idx_flags_assertion_id ON flags(assertion_id)`. Column is nullable for now — entity-level flags (no specific assertion) are still allowed for backwards compatibility with Module #0 v1.

After the migration applies cleanly, this test file flips fully green. **Do not weaken the test to make it green earlier**; the FK + cascade behavior is the contract.

## Handoff

- **Next ATDD pass:** Phase 2, test `2.1-E2E-001` — Playwright spec asserting that every rendered assertion node carries `data-assertion-id` matching its `assertions.id`. That spec depends on this migration landing on `main`.
- **Jira:** intentionally not yet created (user decision, 2026-05-14). When opened, place under ETNI Sprint 3 (board 67), name it "Schema: per-assertion data model (R-2 / ASR-4)", and link this checklist as acceptance evidence.
- **Story automator handoff:** when the migration story is created, paste the verification command from "Steps to verify red against local Supabase" into the story's QA section so the dev agent runs it both before and after the migration ships.

## Architectural ruling — Winston, 2026-05-14

**Verdict: Option 1 (typed FK), nullable, with anchor-required CHECK constraint.**

C8 of this test (`flags.assertion_id` typed FK + cascade) had been in conflict with the polymorphic flag-target design originally drafted in [ETNI-54](https://big-emotion.atlassian.net/browse/ETNI-54) (`target_type ∈ {assertion|source|fiche_section|classification}` + `target_id uuid` + `target_field_path text nullable`).

The architect (Winston) has ruled in favour of typed FK. The polymorphic design is dropped from ETNI-54.

### Rationale (Fowler + Vogels + Rule of Three)

- **Rule of Three not satisfied.** Only one flag anchor type has a written, sized journey (assertion flagging — Kofi, Phase 2). The other three (source / fiche_section / classification) are anticipated, not designed in detail. Polymorphism for three speculative anchor types before any has shipped is premature abstraction.
- **Polymorphic associations are a known anti-pattern.** Postgres cannot enforce a polymorphic FK natively — every integrity check becomes custom PL/pgSQL. We'd trade FK integrity, free `ON DELETE CASCADE`, Supabase autogen-type accuracy, PostgREST joins (`select=*,assertion:assertions(*)`), and direct RLS-policy references for one nice property (one column queryable uniformly), which only pays off with ≥ 3 in-production anchor types being queried polymorphically.
- **Test cost: zero.** C8 as written does not require `assertion_id` to be NOT NULL — it asserts that valid FKs work, orphans are rejected, and cascade fires. The "nullable typed FK" reading endorsed here satisfies all three.
- **Future anchor types are additive, not rewrites.** When source / fiche_section / classification flagging earns its own story, add `flags.source_id` / `flags.fiche_section_id` / `flags.classification_id` as separate nullable FK columns and extend the CHECK constraint. No data rewrite. No polymorphic substitution.

### Migration 016 sketch — sequencing and shape

Apply order:

1. ETNI-22 (migration 014) — already on `main`.
2. **Migration 016** (this work) — creates `fiche_revisions`, wires `assertions.fiche_revision_id`, wires `flags.assertion_id`.
3. ETNI-23 (migration 015 trigger work) — **must be resequenced** to depend on 016 so `recompute_confidence` can factor revision currency (latest revision wins; superseded revisions don't double-count). Without resequencing, ETNI-23's PL/pgSQL function would have to be rewritten twice. Open a comment on ETNI-23 when this is amended.

DDL outline (canonical — author the actual migration to match):

```sql
-- 1. fiche_revisions
CREATE TABLE fiche_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  content_snapshot JSONB NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_type, entity_id, version)
);
ALTER TABLE fiche_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY fiche_revisions_read_public ON fiche_revisions FOR SELECT USING (true);

-- 2. assertions.fiche_revision_id — typed FK, NOT NULL, cascade
ALTER TABLE assertions
  ADD COLUMN fiche_revision_id UUID NOT NULL
    REFERENCES fiche_revisions(id) ON DELETE CASCADE;
CREATE INDEX idx_assertions_fiche_revision_id
  ON assertions(fiche_revision_id);
-- Backfill: seed one placeholder fiche_revisions row per (entity_type, entity_id)
-- that exists in assertions today, so the NOT NULL constraint is satisfiable
-- in one shot. (Will be a no-op on a fresh db.)

-- 3. flags.assertion_id — typed FK, NULLABLE, cascade
ALTER TABLE flags
  ADD COLUMN assertion_id UUID NULL
    REFERENCES assertions(id) ON DELETE CASCADE,
  ADD COLUMN assertion_field_path TEXT NULL;
CREATE INDEX idx_flags_assertion_id ON flags(assertion_id);

-- 4. Anchor-required CHECK — every flag must point at SOMETHING
ALTER TABLE flags
  ADD CONSTRAINT flags_has_anchor_check CHECK (
    assertion_id IS NOT NULL
    OR (entity_type IS NOT NULL AND entity_id IS NOT NULL)
  );
```

Notes on the shape:

- **`flags.assertion_id` is nullable**, by design. The test does not require NOT NULL; entity-level flags ("this whole fiche is wrong") remain valid. The CHECK constraint guarantees every flag anchors to _something_ (specific assertion OR parent entity), so no orphan flags are possible.
- **`assertion_field_path`** replaces the polymorphic `target_field_path` from ETNI-54 — same shape, renamed to be explicit about what it anchors.
- **`flags.entity_type` + `flags.entity_id`** (already on the table since migration 008) are kept. They double as the fallback anchor when `assertion_id` is null and as a denormalization for the common "all flags on PPL_YORUBA" query.

### Test impact

**None.** C8 stays as written. No rewrite required.

### Jira actions implied by this ruling

- Amend **ETNI-54**: drop `target_type` / `target_id` / `target_field_path`; replace with `assertion_id UUID NULL REFERENCES assertions(id) ON DELETE CASCADE` + `assertion_field_path TEXT NULL` + the anchor-required CHECK. The state-machine, `public_slug`, and RLS work in ETNI-54 are unchanged.
- Add a sequencing note on **ETNI-23**: depends on migration 016 (this work) landing first.
- Open the migration story (deferred per user, 2026-05-14): "Schema: per-assertion data model (R-2 / ASR-4)" — link this checklist as acceptance evidence and the verification command for the red→green transition.

### Risk accepted by this ruling

If non-assertion flagging (source / fiche_section / classification) needs to ship in the same quarter as Phase 2, this design takes one additive migration per anchor type. That cost is preferred over polymorphic complexity for one in-flight use case.
