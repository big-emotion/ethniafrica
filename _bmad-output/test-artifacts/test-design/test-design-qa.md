---
workflowStatus: "completed"
totalSteps: 5
stepsCompleted:
  - step-01-detect-mode
  - step-02-load-context
  - step-03-risk-and-testability
  - step-04-coverage-plan
  - step-05-generate-output
lastStep: "step-05-generate-output"
nextStep: ""
lastSaved: "2026-05-14"
workflowType: "testarch-test-design"
mode: "system-level"
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/project-context.md
---

# Test Design for QA: Africa History (EthniAfrica) — Program-Wide

**Purpose:** Test execution recipe for the test / QA function. Defines what to test, how to test it, and what the QA function needs from other teams.

**Date:** 2026-05-14
**Author:** Murat (TEA) — Master Test Architect
**Status:** Draft
**Project:** ethniafrica (working name: Africa History)

**Related:** See architecture doc (`test-design-architecture.md`) for testability concerns, ASRs, and architectural blockers.

---

## Executive Summary

**Scope.** Program-wide test plan covering five persona journeys (Amina, Kofi, Fatou, Thomas, Ngozi) plus cross-cutting data invariants, security guardrails, and emotion-guardrails. Sequenced against the UX phase roadmap.

**Risk summary:**

- Total risks: 25 (3 critical score 9, 12 high score 6, 10 medium/low)
- Critical categories: PERF (R-3, R-11), TECH (R-2)
- Mitigation gates: every phase ship-gate clears its phase-scoped high/critical risks before ship

**Coverage summary** (approximate, per system-level matrix):

- P0 tests: ~36 (critical paths, security, persona acceptance thresholds, data invariants)
- P1 tests: ~22 (important variants, secondary flows, perf budgets)
- P2 tests: ~6 (edge cases, regression)
- P3 tests: ~2 (exploratory, future)
- **Total: ~66 scenarios**, ~179–310 h build, ~6–9 weeks calendar at part-time test-engineer cadence

---

## Not in Scope

| Item                                                                         | Reasoning                                                                        | Mitigation                                                                                                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Pre-existing 6+4 test failures** (`migrateAfrikToDatabase`, handler tests) | Supabase mock issues; project-context.md says known + out-of-scope               | Quarantine into `__tests__/known-failing/` excluded from `vitest run` gate (ASR-11). Move out only on explicit fix task.    |
| **Pact contract testing**                                                    | Single producer, single OpenAPI 3.1 spec, no microservice consumer/provider pair | OpenAPI drift CI gate (R-13) is the surrogate. Reopen if a second consumer service materializes.                            |
| **Visual regression in PR gate**                                             | Too slow / brittle for ≤ 12 min budget                                           | Weekly visual-regression cron against Storybook stories with committed mobile-baseline screenshots                          |
| **`@storybook/nextjs` framework migration**                                  | Incompatible with Next 16; project-context.md explicit                           | Storybook stays `@storybook/react-vite`                                                                                     |
| **Multilingual coverage (en / es / pt)**                                     | `Language = "fr"` only; reopening multilingual is a coordinated change           | Out of scope until multilingual reopens; tests run in `fr` only                                                             |
| **Think-aloud usability sessions**                                           | Qualitative; cannot be automated                                                 | In-scope-for-the-quality-program (UX retros); ~10 h budget per phase; feedback loops into doctrine + new emotion-guardrails |
| **Chrome-extension or native-app coverage**                                  | Web only at MVP                                                                  | N/A                                                                                                                         |
| **Real OAuth provider end-to-end (GitHub / Google / ORCID)**                 | Network-dependent, brittle                                                       | Mock provider in tests via `signInAsRole` admin-client backdoor (ASR-1); real-provider smoke run nightly only               |

**Note:** Items listed here have been reviewed and accepted as out-of-scope by the test/QA function. Confirm with PM + Dev lead before Phase 1 ship.

---

## Dependencies & Test Blockers

**CRITICAL:** the test function cannot proceed without these items from other teams.

### Architecture / Dev Dependencies (Pre-Implementation)

Source: see architecture doc "Quick Guide" for detailed mitigation plans.

1. **ASR-4: Per-assertion stable IDs + data-model migration** — architect — End of Phase 1
   - Needed: `data-assertion-id="{uuid}"` on every assertion DOM node + matching DB row
   - Why it blocks: all of Phase 2 (Kofi journey) is dead-on-arrival without it

2. **ASR-1: Test-mode session injection** — dev (auth migration owner) — Pre-Phase-3
   - Needed: `signInAsRole(role)` using Supabase admin client → `storageState` JSON
   - Why it blocks: Fatou journey untestable; Kofi journey can't deterministically simulate the contributor account

3. **ASR-2: Synchronous confidence-score recomputation in test mode** — dev — Pre-Phase-2
   - Needed: `TEST_MODE_SYNC_CONFIDENCE=true` env flag OR test-only `POST /v2/internal/recompute` hook
   - Why it blocks: Kofi resolution assertion ("confidence moved 74 → 78") is flaky-by-construction without it

4. **ASR-7: Playwright reference-device profile** — testarch — Pre-Phase-1
   - Needed: viewport 430×812, deviceScaleFactor 2.625, Slow-4G, 4× CPU encoded in `playwright.config.ts`
   - Why it blocks: persona thresholds (Amina 10 s, etc.) become meaningless on a fast dev machine

5. **ASR-13: Lighthouse mobile + bundle-budget CI gates** — dev — Phase 1 framework
   - Needed: CI job that fails the PR on Lighthouse mobile < 85 or per-component bundle over budget
   - Why it blocks: R-3 + R-11 (both critical) would ship to production silently

6. **ASR-6: Fiche-revision seeding factory** — testarch — Pre-Phase-1
   - Needed: `seedFiche({ ficheType, revisions: n })` returns `{ ficheId, latestVersion, pinnedUrls[] }`
   - Why it blocks: Ngozi journey untestable

7. **ASR-5: Test API-key tier + reset endpoint** — dev — Pre-Phase-4
   - Needed: `api_keys.tier='test'` with tunable limits + `POST /v2/internal/keys/{id}/reset-counter`
   - Why it blocks: Thomas rate-limit tests untestable

8. **ASR-3: Edge-cache-bypass header** — dev — Phase 1 framework
   - Needed: `X-Test-Bypass-Cache: 1` honored only when `NODE_ENV !== 'production'`
   - Why it blocks: cross-test cache contamination on `s-maxage` routes

### Test/QA Infrastructure Setup (Pre-Implementation, testarch-owned)

1. **Playwright config + reference-device profile** (`playwright.config.ts`) — encodes ASR-7
2. **Persona / phase / NFR tag taxonomy** — `@amina @kofi @fatou @thomas @ngozi`, `@phase-1..5`, `@nfr-perf @nfr-a11y @nfr-security @emotion-guardrail`
3. **Test data factories** (`tests/factories/*.ts`):
   - `seedFiche({ ficheType: 'people' | 'country' | 'family', revisions: n })` — ASR-6
   - `seedFlag({ ficheId, assertionId, status: 'pending' | 'resolved' })`
   - `seedKey({ tier: 'free' | 'test' })` — ASR-5
   - `seedSession(role: 'anon' | 'contributor' | 'moderator' | 'admin' | 'advisor')` — ASR-1
4. **Local Supabase CLI scaffolding** — `supabase start` + `db reset` between specs (Open Q1: local default; staging reserved for smoke / perf)
5. **CI matrix** — PR / nightly / weekly jobs wired in GitHub Actions; selective-testing by git-diff on PR
6. **Pre-existing failure quarantine** — relocate to `__tests__/known-failing/` excluded via `vitest.config.ts` (ASR-11)
7. **`make e2e` target separate from `make check`** — protects developer feedback loop (ASR-12)
8. **Lighthouse CI + bundle-budget CI** — ASR-13
9. **a11y-on-Storybook extension** — ASR-10; crawl `stories.json`, run axe per story per viewport
10. **Brand config consumer** in tests — `src/lib/brand.ts` source-of-truth (ASR-14)

**Example factory pattern** (illustrative — actual factories will be added in framework setup):

```typescript
// tests/factories/fiche.ts
import { createClient } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker";

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type SeededFiche = {
  ficheId: string;
  latestVersion: number;
  pinnedUrls: string[]; // /fr/peuples/PPL_TEST_{uuid}@v1 …
};

export async function seedFiche(opts: {
  ficheType: "people" | "country" | "family";
  revisions: number;
  testRunId: string; // UUID per Playwright worker — namespaces all entities
}): Promise<SeededFiche> {
  const slug = `PPL_TEST_${opts.testRunId.slice(0, 8)}_${faker.string.alphanumeric(4)}`;
  // … insert via admin client; build N revisions with deterministic content_snapshot …
  // return shape with pinnedUrls[v1..vN]
}
```

```typescript
// tests/utils/auth.ts (ASR-1)
import type { BrowserContext } from "@playwright/test";
import { admin } from "./admin";

export type Role = "anon" | "contributor" | "moderator" | "admin" | "advisor";

export async function signInAsRole(
  ctx: BrowserContext,
  role: Role,
  testRunId: string
): Promise<void> {
  if (role === "anon") return;
  // mint Supabase Auth user via admin API + insert into user_roles
  // call admin.auth.admin.createUser({ … }) → get session
  // ctx.addCookies([…]) so the next page.goto runs as that role
}
```

---

## Risk Assessment

**Note:** Full risk details and mitigation plans in `test-design-architecture.md`. This section summarizes the risk → test mapping the QA function will use to drive coverage.

### High-Priority Risks (Score ≥ 6) — QA Coverage

| Risk ID  | Cat  | Description                                                         | Score | QA Test Coverage                                                                                                                                                                                 |
| -------- | ---- | ------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **R-2**  | TECH | Per-assertion data-model migration (single hardest Phase-1 blocker) | **9** | ATDD: failing contract test written first (Phase 1 mid-cycle); `2.1-E2E-001` flips green only after migration ships                                                                              |
| **R-3**  | PERF | Bundle bloat from Phase-1 primitives                                | **9** | `1.1-PERF-001` Lighthouse gate + per-component bundle-size budget CI gate (CT-level)                                                                                                             |
| **R-11** | PERF | Lighthouse mobile < 85                                              | **9** | Same as R-3 — `1.1-PERF-001` on every reading-surface route                                                                                                                                      |
| **R-1**  | DATA | AFRIK demographics drift (FR28)                                     | 6     | `X.1-INT-001` invariant: sum=100 ± 0.01 per country                                                                                                                                              |
| **R-4**  | SEC  | Service-role key leak to client bundle (NFR7)                       | 6     | `X.2-INT-001` built-artefact scan for `service_role` substring                                                                                                                                   |
| **R-5**  | BUS  | Kofi flag-roundtrip credibility test                                | 6     | `2.1-E2E-002`, `2.1-E2E-004` full roundtrip + contributor credit                                                                                                                                 |
| **R-7**  | SEC  | OAuth misconfig (Fatou journey)                                     | 6     | `3.1-E2E-001`, `3.1-INT-001` per-role auth set                                                                                                                                                   |
| **R-9**  | OPS  | Parallel test data collisions                                       | 6     | Per-run UUID prefix convention enforced in `tests/factories/*`                                                                                                                                   |
| **R-10** | BUS  | "Emotions to avoid" silently regress                                | 6     | `emotion-guardrails.spec.ts` (no popups / red / leaderboards / autoplay / sub-44 px / pinned-on-live) — `1.1-E2E-004`, `1.1-E2E-005`, `1.1-E2E-006`, `1.1-E2E-007`, `1.1-E2E-008`, `1.2-E2E-005` |
| **R-12** | SEC  | API key leak in Sentry payload                                      | 6     | `4.1-INT-002` Sentry `beforeSend` redaction integration test                                                                                                                                     |
| **R-13** | OPS  | OpenAPI 3.1 drift (NFR37)                                           | 6     | `X.2-INT-002` CI drift gate + `4.1-INT-001` spec served at stable URL                                                                                                                            |
| **R-16** | DATA | URL-health drift (404 silently)                                     | 6     | `X.1-INT-005` weekly cron + integration test mocks 404 → asserts confidence drop                                                                                                                 |
| **R-18** | SEC  | CSRF on moderation mutations                                        | 6     | `2.1-INT-002`, `3.1-INT-002` CSRF rejection tests                                                                                                                                                |
| **R-20** | OPS  | Suite > 5 min wall-clock                                            | 6     | Shard by persona tag; selective-testing on PRs                                                                                                                                                   |
| **R-23** | SEC  | Public flag URL leaks moderator deliberations / PII                 | 6     | `2.1-E2E-003`, `2.1-API-E2E-001` response-shape contract: moderator notes never in public response                                                                                               |

### Medium / Low Risks — QA Coverage

| Risk ID | Cat  | Description                                   | Score | QA Test Coverage                                                                  |
| ------- | ---- | --------------------------------------------- | ----- | --------------------------------------------------------------------------------- |
| R-6     | DATA | Pinned snapshot drift across migrations       | 3     | `1.2-INT-001` byte-equality regression                                            |
| R-8     | PERF | Stale confidence post-moderation              | 4     | Integration test asserts cache invalidation within p95 ≤ 2 s after `revalidate()` |
| R-14    | TECH | Pre-existing failures masking new regressions | 3     | Quarantine to `known-failing/` (ASR-11)                                           |
| R-15    | BUS  | 95 % rule breach (pinned banner on live)      | 4     | `1.2-E2E-005` negative test                                                       |
| R-17    | TECH | Storybook framework regression                | 4     | `build-storybook` in `make check`                                                 |
| R-19    | PERF | Pinned-version render slower than live        | 4     | `1.2-PERF-001` p95 budget                                                         |
| R-21    | DATA | Authorized-source allowlist regresses         | 4     | `X.1-INT-006` publisher invariant                                                 |
| R-22    | BUS  | Diff drift in moderation log                  | 3     | Integration test: reproduce diff from snapshots, assert byte-equality             |
| R-24    | OPS  | CI flakiness from staging seam                | 3     | Local Supabase CLI for gate; staging only for smoke                               |
| R-25    | TECH | Test code violates KISS                       | 2     | Enforced via `bmad-testarch-test-review`                                          |

---

## Entry Criteria

**Testing cannot begin until ALL of the following are met:**

- [ ] All persona acceptance criteria from PRD L167–271 reviewed and traced to test IDs (covered by this document)
- [ ] Architecture ASRs (1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15) have an owner and a target sprint (see `test-design-architecture.md` Dependencies table)
- [ ] Pre-existing 6 + 4 test failures are quarantined (ASR-11) and do not block `vitest run`
- [ ] Local Supabase CLI scaffolding exists and `supabase start` works on a clean checkout
- [ ] `playwright.config.ts` exists with reference-device profile (ASR-7); `npx playwright install` runs clean
- [ ] CI matrix (PR / nightly / weekly) is wired in GitHub Actions
- [ ] `make e2e` target exists separate from `make check` (ASR-12)
- [ ] Brand config (`src/lib/brand.ts`) exists; tests resolve product name from it (ASR-14)

## Exit Criteria — Per Phase

**Phase 1 (Amina + Ngozi reading surface) ship:**

- [ ] All P0 tests for Phase 1 passing (100 %)
- [ ] All P1 tests for Phase 1 passing (≥ 95 %)
- [ ] No open R-\* score ≥ 6 attached to Phase 1 in OPEN status (unless waivered)
- [ ] Lighthouse mobile ≥ 85 on `/fr/pays/COM`, `/fr/peuples/PPL_*`, `/fr/familles/FLG_*` (R-3, R-11 mitigated)
- [ ] axe-core: 0 WCAG 2.1 AA violations on reading-surface routes (NFR a11y)
- [ ] AFRIK invariants X.1-INT-\* green (R-1)
- [ ] Emotion-guardrails suite green (R-10)
- [ ] OpenAPI drift gate green (R-13)
- [ ] Service-role grep clean (R-4)
- [ ] Think-aloud usability sessions completed with ≥ 5 target-persona participants (qualitative, out of automation scope)

**Phase 2 (Kofi contribution) ship:**

- [ ] R-2 mitigated: per-assertion data model live; `2.1-E2E-001` green
- [ ] All Phase-2 P0 tests green
- [ ] R-23 (PII in public flag) green: response shape contract test passes
- [ ] R-18 (CSRF) green on moderation mutation endpoints
- [ ] R-8 (cache invalidation) green
- [ ] R-5 (Kofi roundtrip) `2.1-E2E-002` and `2.1-E2E-004` green end-to-end

**Phase 3 (Fatou moderation) ship:**

- [ ] R-7 (OAuth) per-role auth tests all green
- [ ] `3.1-INT-001` (non-moderator cannot reach `/admin/moderation/**`) green
- [ ] All Phase-3 P0 tests green

**Phase 4 (Thomas developer portal) ship:**

- [ ] R-12 (Sentry scrubbing) integration test green
- [ ] Rate-limit tests `4.1-API-E2E-003` green (401 / 429 with Retry-After)
- [ ] OpenAPI spec served at stable URL (R-13 mitigation extended)
- [ ] All Phase-4 P0 tests green

---

## Test Coverage Plan

**IMPORTANT:** P0 / P1 / P2 / P3 = **priority and risk level** (what to focus on if time-constrained), NOT execution timing. All tests run in the appropriate CI tier (see Execution Strategy). Tags drive selection: `@phase-N`, `@persona`, `@nfr-*`, `@emotion-guardrail`.

### P0 (Critical)

**Criteria:** Blocks core functionality + high risk (≥ 6) + no workaround + affects majority of users or violates non-negotiable invariant.

| Test ID             | Requirement                                                                                            | Test Level              | Risk Link        | Notes                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------- | ----------------------------------------------------- |
| **1.1-E2E-001**     | FR3 — autonym above the fold on PPL fiche                                                              | E2E                     | —                | Amina happy path foundation                           |
| **1.1-E2E-002**     | FR6, FR7 — autonym + chip + sources visible ≤ 10 s on 430 px Slow-4G                                   | E2E + PERF              | R-3, R-11        | Amina quantified threshold; reference device required |
| **1.1-E2E-003**     | FR7, FR8 — tap ConfidenceChip → sheet → tier labels + resolvable URL                                   | E2E + API-E2E           | —                | Amina trust drill-in                                  |
| **1.1-E2E-004**     | UX L142–150 — no popup / cookie / signup wall on first paint                                           | E2E (emotion-guardrail) | R-10             | Negative assertion                                    |
| **1.1-E2E-005**     | UX L171 — no red on classification-status indicator                                                    | E2E (emotion-guardrail) | R-10             | Computed-style assertion                              |
| **1.1-E2E-007**     | UX L62, NFR a11y — tap targets ≥ 44 px sweep                                                           | E2E + A11Y              | R-10             | Computed bbox loop                                    |
| **1.1-CT-001**      | UX L99 — `AutonymExonymHeading` renders endonym dominant                                               | CT                      | —                | Component invariant                                   |
| **1.1-CT-002**      | FR6, FR11 — `ConfidenceChip` % + count + verified-at; tap ≥ 44 px                                      | CT + A11Y               | R-3              | Bundle budget ≤ 2 KB gz                               |
| **1.1-API-E2E-001** | FR6/7/8/23 — `GET /v2/peoples/*` shape                                                                 | API-E2E                 | —                | Contract                                              |
| **1.1-PERF-001**    | NFR perf — Lighthouse mobile ≥ 85 on reading-surface route                                             | PERF                    | R-3, R-11        | CI gate                                               |
| **1.1-A11Y-001**    | NFR a11y, FR43 — 0 axe violations on reading-surface routes                                            | A11Y                    | —                | CI gate                                               |
| **1.2-E2E-001**     | FR20 — revision drawer opens with ≥ 1 entry                                                            | E2E                     | —                | Ngozi                                                 |
| **1.2-E2E-002**     | FR19, FR21 — pinned URL to clipboard ≤ 30 s p95                                                        | E2E                     | —                | Ngozi quantified threshold                            |
| **1.2-E2E-003**     | FR19 — load `@vN` → banner visible; snapshot matches v1                                                | E2E + API-E2E           | R-6              | Ngozi                                                 |
| **1.2-E2E-005**     | UX L64 — no `[data-pinned-banner]` on live URL                                                         | E2E (emotion-guardrail) | R-15             | 95 % rule negative test                               |
| **1.2-INT-001**     | — `fiche_revisions.content_snapshot` byte-deterministic                                                | INT                     | R-6, R-22        | Migrate, re-render, hash equality                     |
| **1.2-CT-001**      | UX L104 — `PinnedVersionBanner` date + back-to-live always visible                                     | CT + A11Y               | —                | Ngozi                                                 |
| **1.2-API-E2E-001** | FR19 — `?version=N` returns frozen snapshot; bad N → 404                                               | API-E2E                 | —                | Contract                                              |
| **2.1-E2E-001**     | FR12, FR13 — long-press assertion → FlagTarget; FlagForm opens pre-filled                              | E2E                     | R-2, ASR-4       | Kofi entry point — gated on R-2                       |
| **2.1-E2E-002**     | FR12, FR14, FR23, R-5 — submit → public URL resolvable; ClassificationBadge contested                  | E2E + API-E2E           | R-5              | Kofi roundtrip                                        |
| **2.1-E2E-003**     | NFR security — public flag URL HTML-escapes body; moderator notes NOT in response                      | E2E + API-E2E           | R-23             | Kofi PII guardrail                                    |
| **2.1-E2E-004**     | FR16, FR17 — after resolution: contributor credit, confidence updated                                  | E2E + INT               | R-5, R-2 (ASR-2) | Kofi resolution end-to-end                            |
| **2.1-INT-001**     | FR12 — `POST /v2/flags` valid → 201; invalid → 400 Zod                                                 | INT                     | —                | Kofi handler contract                                 |
| **2.1-INT-002**     | NFR security — CSRF on POST → 403 without token; expired → 401                                         | INT                     | R-18             | Security                                              |
| **2.1-INT-003**     | FR11 — confidence recomputation sync under TEST_MODE flag                                              | INT                     | R-2, ASR-2       | Deterministic Kofi resolution                         |
| **2.1-API-E2E-001** | FR14, R-23 — `GET /v2/flags/{id}` response shape                                                       | API-E2E                 | R-23             | Contract                                              |
| **3.1-E2E-001**     | FR15, FR41, R-7 — moderator session → queue oldest-first + SLA counter                                 | E2E                     | R-7              | Fatou entry                                           |
| **3.1-E2E-002**     | FR15/16/22/25 — single-screen view: disputed + counter-source + existing + suggested + doctrine clause | E2E                     | —                | Fatou triage                                          |
| **3.1-E2E-003**     | FR16/17 — resolve → revision + confidence + changelog + log                                            | E2E + INT               | R-2              | Fatou resolution                                      |
| **3.1-INT-001**     | NFR security — non-moderator cannot reach `/admin/moderation/**`                                       | INT + E2E               | R-7              | Auth boundary                                         |
| **3.1-INT-002**     | NFR security — CSRF rejection on resolve                                                               | INT                     | R-18             | Security                                              |
| **3.1-INT-003**     | FR16 — moderation revision append-only                                                                 | INT                     | R-6              | Immutability                                          |
| **4.1-E2E-001**     | FR33, FR35, FR36 — `/docs/api` Swagger + license + attribution visible                                 | E2E                     | —                | Thomas entry                                          |
| **4.1-E2E-002**     | FR34 — self-serve key request → email + key issued; rate-limit displayed                               | E2E + INT               | R-12             | Thomas onboarding                                     |
| **4.1-API-E2E-001** | FR33/35/37 — filtered list response w/ confidence + sources + license meta                             | API-E2E                 | —                | Thomas contract                                       |
| **4.1-API-E2E-003** | FR34, NFR scalability — invalid key 401; over-limit 429 Retry-After                                    | API-E2E                 | R-12             | Rate-limit                                            |
| **4.1-INT-001**     | FR36, NFR37, R-13 — OpenAPI drift gate                                                                 | INT                     | R-13             | CI gate                                               |
| **4.1-INT-002**     | NFR security — Sentry strips key patterns                                                              | INT                     | R-12             | Redaction                                             |
| **X.1-INT-001**     | FR28 — demographics sum 100 ± 0.01 per country                                                         | INT                     | R-1              | AFRIK invariant                                       |
| **X.1-INT-002**     | FR26 — FLG\_\* matches parent folder                                                                   | INT                     | —                | AFRIK invariant                                       |
| **X.1-INT-003**     | FR27 — no duplicate PPL\_\*                                                                            | INT                     | —                | AFRIK invariant                                       |
| **X.1-INT-004**     | FR29 — every ISO 639-3 / 3166-1 alpha-3 valid                                                          | INT                     | —                | AFRIK invariant                                       |
| **X.1-INT-005**     | FR30/31 — URL-health cron + 404 mock → confidence drop + flag                                          | INT (weekly)            | R-16             | URL discipline                                        |
| **X.2-INT-001**     | NFR7 — built `.next/static/**` scrub for `service_role`                                                | INT                     | R-4              | Key-leak guard                                        |
| **X.2-INT-002**     | NFR37 — OpenAPI drift CI                                                                               | INT                     | R-13             | Contract drift                                        |
| **X.3-CT-001**      | UX L1203, NFR a11y — Storybook 0 axe violations at 430 / 720 / 800                                     | CT + A11Y               | —                | Component a11y gate                                   |

**Total P0:** ~36 tests

---

### P1 (High)

**Criteria:** Important features + medium risk (3–4) + common workflows + workaround exists but difficult.

| Test ID             | Requirement                                                            | Test Level              | Risk Link | Notes                      |
| ------------------- | ---------------------------------------------------------------------- | ----------------------- | --------- | -------------------------- |
| **1.1-E2E-006**     | UX L194, R-10 — no leaderboard / engagement counter / avatar pile      | E2E (emotion-guardrail) | R-10      | Negative assertion         |
| **1.1-E2E-008**     | UX L94, NFR a11y — no autoplay; `prefers-reduced-motion` honored       | E2E (emotion-guardrail) | R-10      | Negative + media-query     |
| **1.1-CT-003**      | FR7, FR8, R-3 — `SourceChainSheet` lazy-loads ≤ 8 KB gz                | CT                      | R-3       | Bundle budget              |
| **1.1-UNIT-001**    | FR11, R-16 — confidence computation pure-fn (incl. broken-URL penalty) | UNIT                    | R-16      | Pure logic                 |
| **1.2-E2E-004**     | FR21 — print preview with numbered footnotes; charts → static          | E2E                     | —         | Ngozi pedagogy             |
| **1.2-CT-002**      | FR21 — `CitationBlock` (pinned) outputs cite block; copy fires         | CT                      | —         | Ngozi                      |
| **1.2-PERF-001**    | R-19 — `@vN` route p95 ≤ live p95 + 10 %                               | PERF                    | R-19      | Pinned cache               |
| **2.1-CT-001**      | UX L63, R-10 — `FlagTarget` long-press / hover+icon / focus-inline     | CT + A11Y               | R-10      | Kofi affordance modalities |
| **2.1-CT-002**      | FR12, FR40 — `FlagForm` validates required + optional identity         | CT                      | —         | Kofi form                  |
| **2.1-E2E-005**     | FR17 — notification email contains public URL + credit                 | INT                     | —         | Email contract             |
| **3.1-E2E-004**     | FR15 ext — escalate flag to advisory board → status `en arbitrage`     | E2E                     | —         | Fatou edge                 |
| **4.1-API-E2E-002** | FR38 — `?sinceVerifiedAfter=…` changelog                               | API-E2E                 | —         | Thomas feed                |
| **4.1-INT-003**     | FR35 — bulk export CSV + JSON with license header                      | INT                     | —         | Thomas export              |
| **4.1-PERF-001**    | NFR perf — API p95 ≤ 300 ms cached / 800 ms uncached                   | PERF                    | —         | API perf                   |
| **X.1-INT-006**     | UX strict source rule, R-21 — publisher allowlist                      | INT                     | R-21      | Source discipline          |

**Total P1:** ~22 tests (incl. variant cases for the personas)

---

### P2 (Medium)

**Criteria:** Secondary features + low risk (1–2) + edge cases + regression prevention.

| Test ID                                   | Requirement                                                            | Test Level              | Risk Link | Notes               |
| ----------------------------------------- | ---------------------------------------------------------------------- | ----------------------- | --------- | ------------------- |
| **3.1-E2E-005**                           | UX L194 — moderator log credit, no avatar pile (Fatou desktop)         | E2E (emotion-guardrail) | —         | Visual sanity       |
| **Visual regression**                     | Storybook story screenshot baselines @ 430 / 720 / 800                 | Visual (weekly)         | —         | Weekly cron         |
| **Drift detection**                       | Source `.json` vs Supabase rows (weekly cron)                          | INT (weekly)            | R-1       | Long-tail           |
| **OpenAPI snapshot diff**                 | Weekly diff vs previous (changelog feed)                               | INT (weekly)            | —         | Changelog           |
| **Country page partial Amina**            | Today-testable subset — autonym, a11y, perf baseline on `/fr/pays/COM` | E2E + A11Y + PERF       | —         | Today bucket        |
| **Pre-existing failure quarantine smoke** | `__tests__/known-failing/` excluded from gate run                      | INT                     | R-14      | ASR-11 verification |

**Total P2:** ~6 tests

---

### P3 (Low)

**Criteria:** Nice-to-have + exploratory + future benchmarks.

| Test ID                                          | Requirement                                            | Test Level | Notes   |
| ------------------------------------------------ | ------------------------------------------------------ | ---------- | ------- |
| **Exploratory perf**                             | Long-corpus stress (10 k fiches synthetic) — NFR scale | PERF       | Phase 5 |
| **Visual regression on Storybook (mobile-only)** | Baseline-vs-current                                    | Visual     | Phase 5 |

**Total P3:** ~2 tests

---

## Execution Strategy

**Philosophy:** Run everything we can in PR (≤ 12 min wall-clock). Defer expensive perf and exploratory checks to nightly / weekly. Selective testing by git-diff on PR (only run E2E that match touched routes / components / persona tags).

### Every PR — Playwright + Vitest + axe + bundle (target ≤ 12 min)

| Job                 | Tool                                 | Scope                                                                                                                                                 | Tags                                                       | Target  |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------- |
| `lint+type`         | ESLint (when fixed) + `tsc --noEmit` | All src                                                                                                                                               | —                                                          | ≤ 2 min |
| `unit+int`          | Vitest run                           | `src/**/__tests__/**` excl. `known-failing/`                                                                                                          | —                                                          | ≤ 4 min |
| `data-invariants`   | Vitest gate                          | `X.1-INT-*`                                                                                                                                           | —                                                          | ≤ 1 min |
| `storybook+axe`     | Storybook build + axe-core           | All L3 components @ 430 / 720 / 800                                                                                                                   | `@nfr-a11y`                                                | ≤ 3 min |
| `e2e-pr-slice`      | Playwright                           | P0 tests for routes touched (selective via git diff). Full reading-surface slice if `src/components/system/**` or `src/components/country/**` touched | `@phase-{N}` matching merged scope, `@nfr-perf` smoke only | ≤ 6 min |
| `openapi-drift`     | Custom CI                            | `src/lib/api/openapiV2.ts` vs runtime introspection                                                                                                   | —                                                          | ≤ 30 s  |
| `service-role-grep` | grep on `.next/static/**`            | Built artefacts                                                                                                                                       | —                                                          | ≤ 30 s  |

**Why run in PR:** fast feedback. Selective testing keeps it under 12 min even as the suite grows.

### Nightly — Full Playwright + Lighthouse + Sweeps (no time cap, runs on `main`)

- Full Playwright suite — all personas, all shipped phases — at three viewports (430 / 720 / 800; +1024 for Fatou moderation)
- Lighthouse mobile on every reading-surface route (sample 20 fiches rotating per night)
- Full axe sweep across `/fr/pays/*`, `/fr/peuples/*`, `/fr/familles/*`
- API perf smoke (k6-style or Playwright loop): p95 budgets per `/v2/*` endpoint (NFR perf)
- Bundle-size budget report (per route + per component)
- Hosted-staging Supabase smoke — small fixed subset against staging to catch local/staging parity drift

**Why nightly:** expensive (Lighthouse on full route map), slower, can absorb the latency.

### Weekly — Cron Long-Running (hours)

- `tsx scripts/checkSourceUrls.ts` — URL-health sweep on all sources (FR30/31); broken → auto-lower confidence + auto-flag (X.1-INT-005)
- AFRIK source vs DB drift detection
- OpenAPI snapshot diff vs previous week (feeds changelog)
- Visual regression on Storybook stories (mobile-baseline screenshots)

**Why weekly:** infrequent validation sufficient; long-tail data hygiene.

### Out of Automation (Quality Program)

- **Think-aloud usability sessions** — 5–8 testers per persona archetype per phase ship (~10 h / phase). Findings feed into doctrine or new automation guardrails. **Not in CI.** Tracked separately by UX function.

---

## QA Effort Estimate

**Test build effort only** (excludes implementation, DevOps, dev-side hooks):

| Priority                  | Count   | Effort range       | Notes                                                                                                        |
| ------------------------- | ------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Framework setup (one-off) | —       | ~41–73 h           | Playwright config + persona/phase tags + factories + CI matrix + Lighthouse + a11y-on-Storybook + quarantine |
| P0                        | ~36     | ~80–135 h          | Persona acceptance + security + data invariants + emotion-guardrails                                         |
| P1                        | ~22     | ~31–58 h           | Variants + secondary flows                                                                                   |
| P2                        | ~6      | ~5–10 h            | Edge cases                                                                                                   |
| P3                        | ~2      | ~2–5 h             | Exploratory                                                                                                  |
| **Total**                 | **~66** | **~159–281 h**     | **~22–39 working days, 1 test engineer full-time**                                                           |
| Ongoing maintenance       | —       | ~16–28 h / quarter | Flake-fighting + selector resilience + perf-budget rebaselines (~10–15 % of build)                           |

**Assumptions:**

- Includes test design, fixture authoring, implementation, debugging, CI integration.
- Excludes implementation work (dev-owned) and ongoing usability sessions (UX-owned, ~10 h / phase separate).
- Assumes ASRs land on schedule; slippage on ASR-4 in particular extends Phase 2 timeline.

**Dependencies from other teams:** see "Dependencies & Test Blockers".

---

## Implementation Planning Handoff

| Work item                                                                                    | Owner                      | Target milestone | Dependencies / Notes                 |
| -------------------------------------------------------------------------------------------- | -------------------------- | ---------------- | ------------------------------------ |
| Framework setup (Playwright config + factories + CI matrix + Lighthouse + a11y-on-Storybook) | testarch                   | Pre-Phase-1      | ASR-3, 6, 7, 10, 11, 12, 13          |
| Today-testable subset (country page partial Amina + AFRIK invariants in CI)                  | testarch                   | Phase 1 wk 1     | None — proves framework              |
| ASR-4 (per-assertion data model)                                                             | architect                  | Phase 1 mid      | Gates Phase 2 entirely               |
| ASR-1 (auth backdoor / `signInAsRole`)                                                       | dev (auth migration owner) | Phase 3 kickoff  | Bundles with Supabase Auth migration |
| ASR-2 (sync confidence recomputation in test mode)                                           | dev                        | Phase 2 kickoff  |                                      |
| ASR-5 (test API-key tier + reset)                                                            | dev                        | Phase 4 kickoff  |                                      |
| ASR-14 (brand config single source of truth)                                                 | architect                  | Phase 1          | Rebrand readiness                    |
| ASR-15 (deterministic clock hook)                                                            | dev                        | Phase 1          | Time-sensitive tests                 |
| Emotion-guardrails suite                                                                     | testarch                   | Phase 1 wk 2     | R-10 mitigation                      |
| Phase 1 P0 + P1 implementation                                                               | testarch                   | Phase 1 ship     | All ASRs above                       |
| Phase 2 P0 + P1 implementation                                                               | testarch                   | Phase 2 ship     | Depends on R-2 mitigated             |
| Phase 3 P0 + P1 implementation                                                               | testarch                   | Phase 3 ship     | Depends on ASR-1                     |
| Phase 4 P0 + P1 implementation                                                               | testarch                   | Phase 4 ship     | Depends on ASR-5                     |
| Think-aloud usability sessions per phase                                                     | UX function                | Each phase ship  | ~10 h / phase; not on TEA            |

---

## Tooling & Access

| Tool / Service                       | Purpose                                                             | Access                       | Status                                                        |
| ------------------------------------ | ------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| `@playwright/test ^1.49`             | E2E + API-E2E runner                                                | devDep present               | Ready                                                         |
| `@axe-core/playwright ^4.10.1`       | a11y assertions                                                     | devDep present               | Ready                                                         |
| `@seontechnologies/playwright-utils` | Fixtures: api-request, auth-session, intercept, recurse, file-utils | Not yet installed            | Pending install (per config `tea_use_playwright_utils: true`) |
| Vitest 4 + happy-dom                 | Unit + integration + API tests                                      | Already in use               | Ready                                                         |
| Supabase CLI                         | Local Supabase for test data                                        | Install in dev images        | Pending                                                       |
| Lighthouse CI                        | Mobile perf gate                                                    | Install in GH Actions        | Pending — ASR-13                                              |
| size-limit (or `next build` budget)  | Per-component bundle gate                                           | Install                      | Pending — ASR-13                                              |
| GitHub Actions                       | CI matrix runner                                                    | Existing repo access         | Ready                                                         |
| Mailpit / Inbucket (or similar)      | Capture transactional emails in INT tests                           | Install in CI image          | Pending — for `2.1-E2E-005`                                   |
| Hosted staging Supabase              | Smoke + perf nightly                                                | Existing project credentials | Ready (verify env var wiring)                                 |

**Access requests needed:**

- [ ] Confirm GH Actions has secrets for `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` for the test project (separate from prod)
- [ ] Confirm CI minutes budget supports nightly Lighthouse (~30 min × routes)

---

## Interworking & Regression

| Service / Component                                  | Impact                                                                                      | Regression scope                                                                    | Validation                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **`scripts/a11y-test.ts`**                           | Existing a11y script — extend, do not duplicate (ASR-10)                                    | All existing a11y assertions must keep passing                                      | Run as part of `e2e-pr-slice` job                       |
| **`scripts/validateAfrikData.ts`**                   | Promoted to CI gate (X.1-INT-\* family)                                                     | Source `.json` integrity must remain green                                          | PR gate; weekly cron                                    |
| **Carte vivante (`CountryDetailViewV2`)**            | Today-testable baseline; reference for the Phase 1 reading-surface system                   | All shipped country-page behavior must keep passing                                 | E2E + a11y + Lighthouse on `/fr/pays/COM` smoke         |
| **Existing `src/app/api/v2/*` handlers**             | Unchanged for Module #0 routes; extended for `flags`, `revisions`, `confidence`, `doctrine` | All existing API integration tests stay green                                       | Vitest run on `src/app/api/v2/__tests__/**`             |
| **OpenAPI spec `src/lib/api/openapiV2.ts`**          | Authoritative contract; CI drift gate                                                       | No breaking change without `Sunset` / `Deprecation` headers + 6-month window (FR37) | `X.2-INT-002`                                           |
| **Supabase migrations under `supabase/migrations/`** | `007_remove_v1_add_v2_contribution_types.sql` is not yet applied to prod                    | Migrations must remain idempotent                                                   | Local Supabase CLI applies all migrations on `db reset` |
| **Pre-existing 6 + 4 test failures**                 | Quarantined, not regressed                                                                  | New PRs must not add to known-failing/                                              | `vitest run` excludes that dir; new failures break PR   |

**Regression test strategy:**

- Every PR runs the full Vitest gate (excl. `known-failing/`) — no new failure allowed.
- Selective Playwright slice keeps PR under budget; nightly catches anything the slice missed.
- Pre-Phase-2 schema migration (R-2 mitigation) is a force-test event: all pinned-version regression tests (`1.2-INT-001`) must re-run after the migration to confirm byte-equality preserved.
- Cross-team coordination: dev's Supabase migration PRs must include a corresponding test-data factory update (`tests/factories/*`) so the test layer keeps producing valid fixtures.

---

## Appendix A: Tagging & Selective Execution

**Tag scheme** (Playwright `test.describe.configure({ tag: '@…' })` or filenames):

- **Persona:** `@amina @kofi @fatou @thomas @ngozi`
- **Phase:** `@phase-1 @phase-2 @phase-3 @phase-4 @phase-5`
- **NFR:** `@nfr-perf @nfr-a11y @nfr-security`
- **Negative assertion:** `@emotion-guardrail`
- **Priority:** Vitest / Playwright run by file pattern + tag, not by P0/P1 tag (priorities classify test scope, not execution order — execution is tier-based)

**Example test skeleton:**

```typescript
// e2e/amina/reading-surface.spec.ts
import { test, expect, devices } from "@playwright/test";
import { signInAsRole } from "../utils/auth";
import { seedFiche } from "../factories/fiche";

const referenceDevice = {
  ...devices["Pixel 5"],
  viewport: { width: 430, height: 812 },
};

test.use({
  ...referenceDevice,
  // Slow-4G profile encoded via context.route() or browser context throttling (ASR-7)
});

test.describe("@amina @phase-1 — reading surface happy path", () => {
  test("1.1-E2E-002 — autonym + chip + sources visible within 10s @nfr-perf", async ({
    page,
    request,
  }, testInfo) => {
    const { ficheId } = await seedFiche({
      ficheType: "people",
      revisions: 1,
      testRunId: testInfo.testId,
    });

    const t0 = performance.now();
    await page.goto(`/fr/peuples/${ficheId}`);

    await expect(page.locator("[data-autonym]")).toBeVisible();
    await expect(page.locator("[data-confidence-chip]")).toBeVisible();
    await expect(page.locator("[data-sources-affordance]")).toBeVisible();

    const tVisible = performance.now() - t0;
    expect(tVisible).toBeLessThan(10_000);
  });

  test("1.1-E2E-004 — no popup / cookie / signup wall on first paint @emotion-guardrail", async ({
    page,
  }, testInfo) => {
    const { ficheId } = await seedFiche({
      ficheType: "people",
      revisions: 1,
      testRunId: testInfo.testId,
    });
    await page.goto(`/fr/peuples/${ficheId}`);
    // No dialog / modal / interstitial — present on first paint
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await expect(page.locator("[data-cookie-banner]")).toHaveCount(0);
    await expect(page.locator("[data-newsletter-popup]")).toHaveCount(0);
  });
});
```

**Run targeted slices:**

```bash
# PR slice — Phase 1 only
npx playwright test --grep "@phase-1"

# Just Amina’s journey across whatever has shipped
npx playwright test --grep "@amina"

# A11y + perf NFRs across the suite
npx playwright test --grep "@nfr-a11y|@nfr-perf"

# Emotion-guardrails (negative assertions) — should always be cheap
npx playwright test --grep "@emotion-guardrail"
```

---

## Appendix B: Knowledge Base References

- **Risk Governance:** `risk-governance.md` — P × I scoring, gate decisions
- **Test Levels Framework:** `test-levels-framework.md` — Unit / Integration / E2E selection
- **Project Context (load-bearing rules):** `_bmad-output/project-context.md`
- **Persona journeys:** `_bmad-output/planning-artifacts/prd.md` L167–271
- **Emotional matrix:** `_bmad-output/planning-artifacts/ux-design-specification.md` L50–197
- **Phase roadmap:** `_bmad-output/planning-artifacts/ux-design-specification.md` L1211–1237
- **Epics + FR / NFR inventory:** `_bmad-output/planning-artifacts/epics.md`

---

**Generated by:** Murat (TEA) — Master Test Architect
**Workflow:** `bmad-testarch-test-design`
**Version:** v6.6.0 (BMad-Method)
