---
title: "TEA Test Design → BMAD Handoff Document — Africa History (EthniAfrica)"
version: "1.0"
workflowType: "testarch-test-design-handoff"
sourceWorkflow: "testarch-test-design"
generatedBy: "Murat (TEA) — Master Test Architect"
generatedAt: "2026-05-14"
projectName: "ethniafrica"
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/project-context.md
---

# TEA → BMAD Integration Handoff — Africa History

## Purpose

This document bridges the TEA test-design output with BMAD's epic / story workflow. Quality requirements, risk assessment, and persona-driven test scenarios flow from the system-level test design into per-epic story decomposition (`bmad-create-epics-and-stories` or follow-up Epic-Level `bmad-testarch-test-design` runs).

The Africa History epic structure already exists (7 epics, 77 stories, `_bmad-output/planning-artifacts/epics.md`). This handoff retrofits TEA quality requirements onto that structure and stages the next workflow steps.

---

## TEA Artifacts Inventory

| Artifact                             | Path                                                                  | BMAD integration point                                       |
| ------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| Test Design — Architecture           | `_bmad-output/test-artifacts/test-design/test-design-architecture.md` | Epic-level quality gates, ASRs become architect deliverables |
| Test Design — QA                     | `_bmad-output/test-artifacts/test-design/test-design-qa.md`           | Story-level acceptance criteria; framework setup tasks       |
| Progress / working notes             | `_bmad-output/test-artifacts/test-design/test-design-progress.md`     | TEA workflow audit trail                                     |
| Risk register (embedded in arch doc) | (above)                                                               | Epic risk classification + story priority                    |
| Coverage matrix (embedded in QA doc) | (above)                                                               | Story test requirements                                      |

---

## Epic-Level Integration Guidance

### Risk References — How Risks Map to the 7 Epics

> Mapping based on epic groupings inferred from `_bmad-output/planning-artifacts/epics.md`. Final epic naming may differ; the FR ranges anchor the mapping unambiguously.

| Epic theme (FR range)                                          | Critical risks (score 9) | High risks (score 6) | Quality gates                                                                                                                                  |
| -------------------------------------------------------------- | ------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Content Discovery & Reading Surface** (FR1–FR5 + UX Phase 1) | R-3, R-11                | R-1, R-9, R-10, R-20 | Lighthouse mobile ≥ 85, axe-core 0 violations, emotion-guardrails green, AFRIK invariants green                                                |
| **Source Transparency & Confidence** (FR6–FR11)                | R-3                      | R-1, R-16            | ConfidenceChip ≤ 2 KB gz; SourceChainSheet ≤ 8 KB gz lazy; URL-health weekly cron operational                                                  |
| **Public Contribution & Moderation** (FR12–FR17)               | R-2                      | R-5, R-7, R-18, R-23 | Per-assertion data model live; flag roundtrip E2E green; OAuth per-role auth tests green; CSRF + PII guardrails green                          |
| **Content Versioning & Citation** (FR18–FR21)                  | —                        | R-9                  | Pinned-version byte-equality regression green; CitationBlock copy E2E green; 95% rule respected                                                |
| **Editorial Governance & Doctrine** (FR22–FR25)                | —                        | —                    | DoctrineLinkCard renders on sensitive assertions; doctrine version FK on revisions                                                             |
| **Data Quality & Automation (CI gates)** (FR26–FR32)           | —                        | R-1, R-13, R-16      | All X.1-INT-\* (data invariants) blocking in PR; OpenAPI drift gate; URL-health weekly cron                                                    |
| **Public API & Open Data** (FR33–FR38)                         | —                        | R-12, R-13           | Test API-key tier + reset endpoint live; Sentry scrubbing integration test green; OpenAPI served at stable URL with 6-month deprecation policy |
| **User Account & Contributor Lifecycle** (FR39–FR42)           | —                        | R-7                  | OAuth migration complete; `signInAsRole` test backdoor merged                                                                                  |
| **Accessibility, Platform & Compliance** (FR43–FR46)           | —                        | —                    | WCAG 2.1 AA gate green; age-gate visible on signup; cookie/consent surface (if required) doesn't pollute reading flow                          |

### Quality Gates — Per-Phase (lifts from the QA doc Exit Criteria)

**Phase 1 ship gate (Amina + Ngozi reading surface):**

- Lighthouse mobile ≥ 85, axe-core 0 violations, AFRIK invariants green
- R-2 (per-assertion data model) **mitigated or feature-flagged** so it doesn't block Phase 1 ship while still being available end-of-phase for Phase 2 onboarding
- Emotion-guardrails (R-10) suite running and green
- OpenAPI drift (R-13) and service-role grep (R-4) green
- Pre-existing 6+4 failures quarantined (R-14, ASR-11)
- Today-testable subset shipped first; framework proves itself before Phase-1 primitives finalize

**Phase 2 ship gate (Kofi contribution):**

- R-2, R-5, R-18, R-23, R-8 mitigated and green

**Phase 3 ship gate (Fatou moderation):**

- R-7, R-18 mitigated and green; auth migration complete

**Phase 4 ship gate (Thomas developer portal):**

- R-12, R-13 mitigated and green; rate-limit tests deterministic

---

## Story-Level Integration Guidance

### P0 / P1 Test Scenarios → Story Acceptance Criteria

Stories created or revised in `bmad-create-epics-and-stories` (or via `bmad-edit-prd` / `bmad-create-story`) should adopt these tests as **acceptance criteria** — not just "QA will test this later", but "this story is not Done unless this test is green".

**Reading-surface stories (Phase 1):**

- AC: `1.1-E2E-001` — autonym renders above the fold on PPL fiche
- AC: `1.1-E2E-002` — autonym + ConfidenceChip + sources visible within 10 s on 430 px Slow-4G
- AC: `1.1-E2E-003` — tap ConfidenceChip → sheet opens with tiered sources; first source URL resolves
- AC: `1.1-E2E-004` — no popup / cookie / signup wall on first paint
- AC: `1.1-E2E-005` — `[data-classification-status]` color is not red hue
- AC: `1.1-E2E-007` — all interactive elements ≥ 44 × 44 px
- AC: `1.1-PERF-001` — Lighthouse mobile ≥ 85 in CI
- AC: `1.1-A11Y-001` — axe-core 0 WCAG 2.1 AA violations
- AC: `1.1-CT-001`, `1.1-CT-002`, `1.1-CT-003` — per-component story + tests

**Ngozi (pinned-version) stories (Phase 1):**

- AC: `1.2-E2E-002` — pinned URL `@vN` to clipboard within 30 s p95
- AC: `1.2-E2E-003` — `@vN` URL renders banner + frozen snapshot
- AC: `1.2-E2E-005` — `[data-pinned-banner]` NOT visible on live URL (95 % rule)
- AC: `1.2-INT-001` — `content_snapshot` byte-deterministic across migrations

**Kofi (contribution) stories (Phase 2):**

- AC: `2.1-E2E-001` — long-press an assertion → FlagTarget appears; FlagForm pre-fills with disputed assertion (requires R-2 mitigated)
- AC: `2.1-E2E-002` — submit → public flag URL resolvable; ClassificationBadge contested marker visible
- AC: `2.1-E2E-003` — flag body HTML-escaped; moderator notes never in public response
- AC: `2.1-E2E-004` — after moderator resolution: contributor credit + confidence recomputed end-to-end
- AC: `2.1-INT-002` — CSRF rejection on `POST /v2/flags`

**Fatou (moderation) stories (Phase 3):**

- AC: `3.1-E2E-001` — moderator session → queue oldest-first + SLA counter
- AC: `3.1-E2E-002` — single-screen triage view (disputed + counter-source + existing sources + suggested edit + doctrine clause if sensitive)
- AC: `3.1-INT-001` — non-moderator cannot reach `/admin/moderation/**`

**Thomas (developer portal) stories (Phase 4):**

- AC: `4.1-E2E-001` — `/docs/api` Swagger UI + license + attribution block visible
- AC: `4.1-API-E2E-001` — filtered list response carries confidence + sources + license meta
- AC: `4.1-API-E2E-003` — invalid key 401; over-limit 429 with Retry-After
- AC: `4.1-INT-002` — Sentry strips key patterns from event payloads

---

### Data-TestId Requirements (Recommended)

These selectors are referenced across the E2E suite. Stories that ship the corresponding component MUST emit these attributes:

| Selector                                                                                | Component                         | Used by                                    |
| --------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------ |
| `[data-autonym]`                                                                        | `AutonymExonymHeading`            | `1.1-E2E-001`, `1.1-E2E-002`               |
| `[data-confidence-chip]`                                                                | `ConfidenceChip`                  | `1.1-E2E-002`, `1.1-E2E-003`, `1.1-CT-002` |
| `[data-sources-affordance]`                                                             | sources-link in chip / hero       | `1.1-E2E-002`                              |
| `[data-source-tier="primary\|secondary\|tertiary\|ai-enriched"]`                        | `SourceChainSheet` row            | `1.1-E2E-003`, `1.1-CT-003`                |
| `[data-classification-status="consensual\|contested\|colonial-legacy\|reconstructive"]` | `ClassificationBadge`             | `1.1-E2E-005` (computed-style assertion)   |
| `[data-assertion-id="{uuid}"]`                                                          | every assertion node (ASR-4)      | `2.1-E2E-001`, `2.1-E2E-002`               |
| `[data-flag-target]`                                                                    | `FlagTarget` icon                 | `2.1-E2E-001`                              |
| `[data-pinned-banner]`                                                                  | `PinnedVersionBanner`             | `1.2-E2E-003`, `1.2-E2E-005` (negative)    |
| `[data-citation-block][data-variant="live\|pinned"]`                                    | `CitationBlock`                   | `1.2-E2E-002`, `1.2-CT-002`                |
| `[data-revision-drawer]`                                                                | `RevisionDrawer`                  | `1.2-E2E-001`                              |
| `[data-moderator-queue-row][data-sla-color]`                                            | `ModeratorQueueRow`               | `3.1-E2E-001`                              |
| `[data-engagement-counter]`, `[data-leaderboard]`                                       | MUST NOT exist on reading surface | `1.1-E2E-006` (negative assertion)         |

These should be documented in the design-system Storybook (component autodocs) so engineers don't strip them on a styling pass.

---

## Risk-to-Story Mapping

| Risk ID  | Cat  | P×I | Recommended story / epic                                                                 | Test level                       |
| -------- | ---- | --- | ---------------------------------------------------------------------------------------- | -------------------------------- |
| **R-2**  | TECH | 9   | "Per-assertion data-model extension" — first Phase-1 architectural story (gates Phase 2) | INT + ATDD contract test         |
| **R-3**  | PERF | 9   | "Phase-1 primitive bundle budgets" — story across `system/*` components                  | CT + PERF (CI gate)              |
| **R-11** | PERF | 9   | "Lighthouse CI gate" — framework setup story                                             | PERF (CI gate)                   |
| R-1      | DATA | 6   | "AFRIK invariants in CI" — framework setup story                                         | INT (X.1-INT-\*)                 |
| R-4      | SEC  | 6   | "Service-role grep + static-import lint" — security story (cross-cutting)                | INT (built-artefact scan)        |
| R-5      | BUS  | 6   | "Kofi flag-to-public-URL roundtrip" — Phase 2 acceptance story                           | E2E + API-E2E                    |
| R-7      | SEC  | 6   | "OAuth migration + per-role auth tests" — auth migration story (Phase 3)                 | INT + E2E                        |
| R-9      | OPS  | 6   | "Per-run test-data isolation" — framework setup story                                    | Convention enforced by factories |
| R-10     | BUS  | 6   | "Emotion-guardrails suite" — Phase 1 framework story                                     | E2E negative                     |
| R-12     | SEC  | 6   | "Sentry scrubbing" — Phase 4 observability story                                         | INT                              |
| R-13     | OPS  | 6   | "OpenAPI drift CI gate" — framework setup story                                          | INT (CI gate)                    |
| R-16     | DATA | 6   | "URL-health weekly cron + auto-flag" — Phase 1+ data-quality story                       | INT (weekly)                     |
| R-18     | SEC  | 6   | "CSRF on mutation endpoints" — Phase 2/3 security story                                  | INT                              |
| R-20     | OPS  | 6   | "Selective testing + sharding in CI" — framework setup story                             | CI config                        |
| R-23     | SEC  | 6   | "PII / moderator-notes redaction in public flag URL" — Phase 2 security story            | E2E + API-E2E                    |
| R-6      | DATA | 3   | "Forward-only revision-schema migration policy" — Phase 1 architectural story            | INT                              |
| R-8      | PERF | 4   | "Per-fiche cache invalidation on moderation commit" — Phase 2 perf story                 | INT                              |
| R-14     | TECH | 3   | "Quarantine known failures" — pre-Phase-1 hygiene story (ASR-11)                         | Vitest config                    |
| R-15     | BUS  | 4   | "95 % rule — pinned banner only on `@vN` URL" — Phase 1 acceptance                       | E2E negative                     |
| R-17     | TECH | 4   | "Storybook framework constraint" — already documented in project-context                 | `make check`                     |
| R-19     | PERF | 4   | "Pre-rendered HTML cache for pinned versions" — Phase 1 perf story                       | PERF                             |
| R-21     | DATA | 4   | "Source publisher allowlist invariant" — data-quality story                              | INT                              |
| R-22     | BUS  | 3   | "Deterministic moderation diff" — Phase 2 doctrine story                                 | INT                              |
| R-24     | OPS  | 3   | "Local Supabase CLI as gate runner" — framework setup story                              | Convention                       |
| R-25     | TECH | 2   | "TEA test-review convention" — ongoing                                                   | `bmad-testarch-test-review`      |

---

## Recommended BMAD → TEA Workflow Sequence

The Africa History epic + story structure already exists (epics.md v2026-04-17). The next-step sequence is therefore:

1. ✅ **TEA Test Design (TD)** — produced this handoff, the architecture doc, and the QA doc. **Complete.**
2. **BMAD Edit PRD / Create Story** _(if needed)_ — surface the ASR-4 per-assertion data-model story to the front of the Phase-1 backlog (recommended). It's load-bearing for the rest of Phase 2.
3. **TEA Framework setup (TF)** — invoke `bmad-testarch-framework` next. Scaffolds `playwright.config.ts`, `tests/utils/*`, `tests/factories/*`, persona/phase tags, CI matrix, Lighthouse + bundle-size CI gates, a11y-on-Storybook extension, quarantine of pre-existing failures. ~41–73 h.
4. **TEA ATDD (AT)** — invoke `bmad-testarch-atdd` per Phase-1 story. Generates failing acceptance tests + an implementation checklist before the engineer starts coding. Especially load-bearing for the R-2 mitigation story (per-assertion data model) and the bundle-budget primitives.
5. **BMAD Dev Story / Implementation** — engineers implement under TDD pressure; tests created in step 4 turn green.
6. **TEA Automate (TA)** — invoke `bmad-testarch-automate` to expand from acceptance tests to full automation per shipped feature (variants, edge cases, regression).
7. **TEA Trace (TR)** — invoke `bmad-testarch-trace` to produce the traceability matrix (tests ↔ FR / NFR ↔ persona) and Phase-N gate decision (PASS / CONCERNS / FAIL / WAIVED).
8. **TEA NFR Assess (NR)** — invoke `bmad-testarch-nfr` for the perf / a11y / security envelope per phase ship. Especially Phase 1 (Lighthouse, axe, contrast budgets).
9. **TEA CI (CI)** — invoke `bmad-testarch-ci` if not already covered by step 3 — formalizes the CI matrix and gate config.
10. **BMAD Sprint Status / Checkpoint Preview** — at the end of each phase, snapshot state and prepare ship gate.

Recommended next single-command invocation: **`bmad-testarch-framework`** (TF) — this lays the foundation everything else depends on and doesn't require any ASR to be resolved first.

---

## Phase Transition Quality Gates (TEA → BMAD)

| From phase             | To phase             | Gate criteria                                                                                                                                                    |
| ---------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test Design (this run) | Framework Setup (TF) | ✅ This handoff complete + architecture doc reviewed                                                                                                             |
| Framework Setup        | ATDD                 | `playwright.config.ts` + factories + CI matrix in place; quarantine done; today-testable subset green                                                            |
| ATDD                   | Implementation       | Failing acceptance tests exist for all P0/P1 scenarios in the active phase                                                                                       |
| Implementation         | Automation           | All acceptance tests pass at story Done                                                                                                                          |
| Automation             | Phase ship           | Trace matrix shows ≥ 80 % FR/NFR coverage on phase scope; gate decision PASS or CONCERNS-with-waiver                                                             |
| Phase ship             | Next phase           | All R-\* score ≥ 6 attached to phase mitigated; usability sessions delivered findings (out-of-automation feedback loop into doctrine and new emotion-guardrails) |

---

## Open Items the Test Strategy Surfaces (For PM / Architect Decision)

These are flagged in TEA's output but require a non-TEA decision:

1. **Confirm local Supabase CLI** as default for test data (Open Q1 of this run). Hosted-staging Supabase reserved for smoke + perf only.
2. **Confirm persona / phase tag taxonomy** matches what BMAD's `bmad-testarch-trace` expects.
3. **Decide whether ASR-4 (per-assertion data model) ships behind a feature flag** at Phase-1 end so Phase 2 can start onboarding before the full UI surface lands.
4. **Confirm UX function ownership of think-aloud usability sessions** (~10 h / phase) — not on the TEA side.
5. **Resolve open architectural decisions** the PRD/architecture flagged (code license, rate-limit substrate, analytics substrate, error tracking) — each shapes one or more integration tests when chosen.

---

**End of TEA → BMAD Handoff Document**

**For BMAD operators:**

- This handoff is meant to be read by `bmad-create-epics-and-stories` (re-runnable) and by `bmad-edit-prd` if PRD edits are needed.
- The acceptance criteria in §Story-Level Integration are TEA's recommendations; the architect / PM still owns the final epic/story shape. Push back if any AC is over-scoped for the story.

**For the test / QA function:**

- Next concrete step: **`bmad-testarch-framework` (TF)**.
- Today-testable subset can start _now_ (country page partial Amina + a11y + perf baseline + AFRIK invariants).
