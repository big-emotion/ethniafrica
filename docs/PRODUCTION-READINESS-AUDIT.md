# EthniAfrica — Production Readiness Audit

**Date:** 2026-08-27
**Branch audited:** `recette` @ `9bf9bb48`
**Method:** read-only. Every repo gate executed locally; CI evidence read from GitHub Actions; branch protection read from the GitHub API. No external service was written to, no migration run, no live production probe.

---

## 1. Scope and method

| Gate                                                                                              | Result                                                                        |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `npm run lint`                                                                                    | **pass** — 0 errors, 90 warnings                                              |
| `npm run typecheck`                                                                               | **pass**                                                                      |
| `npm run format:check`                                                                            | **pass** on tracked files (only untracked `.playwright-mcp/` scratch fails)   |
| `npm test`                                                                                        | **pass** — 452 files, **4558 passed, 21 skipped, 0 failed**                   |
| `npm run test:coverage`                                                                           | **pass** — 83.1 st / 76.1 br / 85.6 fn / 83.9 li vs thresholds 70/60/70/70    |
| `npm run build`                                                                                   | **pass**                                                                      |
| `npm run test:charter-contracts`                                                                  | **pass** — 17 files, 284 tests                                                |
| `npm run lint:req`                                                                                | **pass** — 0 warnings                                                         |
| `check:jira-template` / `action-pins` / `env-example` / `migration-files` / `pagination-contract` | **all pass**                                                                  |
| `npx tsx scripts/validateAfrikData.ts`                                                            | **exit 0** — 35/35 checks, **0 errors**, 4008 warnings                        |
| `npx tsx scripts/ci/checkEditorialRules.ts`                                                       | **exit 0** — 0 errors, 30 warnings                                            |
| `npm audit`                                                                                       | **4 moderate, 0 high, 0 critical** (1482 deps)                                |
| `gh` CI history                                                                                   | `CI` green; **A11y red and Lighthouse red on the last 5 consecutive PR runs** |

**Two findings from the previous audit are closed.** Prettier is now pinned exactly (`3.8.3`, no caret, matching the lockfile) so the local/CI format drift is gone; and the dependency CVE count fell from 28 (15 high) to **4 moderate, 0 high**.

---

## 2. The five canonical questions

### 1. Is the project ready for production?

**Conditional — the application is ready, the delivery pipeline is not.**

The code is in good shape: every local gate is green, 4558 tests pass with zero failures, coverage sits well above threshold, and the build compiles. What is not ready is what stands between a commit and users:

1. **The quality gates that matter most do not block a merge.** `recette` and `main` require exactly two status checks — `gitleaks` and `build`. The Data Integrity Gate, the Editorial Rules Gate, A11y, Lighthouse, E2E and OpenAPI-diff all run and all report, but none of them can stop a merge. This is not theoretical: A11y and Lighthouse have been red on the last five consecutive PR runs and every one of those PRs merged.
2. **`PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` is not configured.** `production-data-sync.yml` was deliberately written to _fail_ rather than skip when it is missing, so as it stands every production deploy's corpus sync fails.
3. **`/api/v2/internal/*` hands out unpaginated full-table dumps** to anyone who sets an `Origin` header.

### 2. Is the AFRIK editorial surface sound?

**Substantially yes — and the demographic burn-down is finished.**

- **FR28 hard gate [95, 105]% — 0 offenders.** **FR28-strict [99, 101]% — 0 offenders.** Both bands are now clean, so both fail the build and a fiche can no longer drift back out. This is the headline improvement in the corpus.
- Validator: **35/35 checks, 0 errors** over 886 tracked fiches (789 peoples, 54 pays, 26 familles, plus relations/noms/migrations).
- Referential integrity is intact: FLG folder match, PPL duplicates, ISO validity, classification-tree integrity, orphan fiches, relation and name-record references — all green.
- Source Tier: audited against the **current** doctrine (CLAUDE.md + migration `041`: _nothing is forbidden, everything is labelled_), not the superseded Tier-1/2/3 rule that forbade Tier 3. Under the current doctrine there is no such thing as a forbidden citation, so the gate is "every source carries an explicit tier" — and **no source is untiered in the blocking sense**; the validator reports 0 errors.

Four real gaps remain, none of them build-breaking:

- **1063 sources sit at `needs_review`** across 469 fiches — the honest placeholder, not a tier. A CI ratchet prevents growth, but it is pinned at exactly the current count, so it forbids regression without driving descent.
- **1190 sources carry no URL**, so they cannot be tiered from the catalogue at all.
- **37 fiches still carry legacy numeric `"tier": 1|2`** (in `migrations/`, `noms/`, `relations/`). CLAUDE.md asserts one vocabulary across code, DB, API and UI; migration `041` normalised the database, but the source-of-truth JSON was never migrated with it. Two vocabularies are live in the corpus.
- **7 relation fiches cite `"unknown"` as the source.** Labelling the absence of a source as `unverified` dresses a hole up as provenance. "Unknown" is not a weak source; it is no source.

The decisive caveat is procedural, not editorial: **the Data Integrity Gate is not a required check**, so none of the above is actually enforced at merge time.

### 3. Can a new contributor go clone → running in one session?

**Yes.** Every step of the path is documented and every command it names exists:

- `npm ci --legacy-peer-deps` — the legacy peer deps are intentional (Storybook `@storybook/react-vite` vs Next 16).
- `.env.example` → `.env.local` — `check:env-example` verifies **both directions**: 39 env references across 1208 files, all documented; every documented entry is read by code. This is stronger than most projects manage.
- `supabase/migrations/` — 42 files, no duplicate version or name, no hole in the sequence.
- `scripts/migrateAfrikToDatabase.ts` loads the corpus; `docs/runbooks/afrik-data-sync.md` is the runbook.
- `ADMIN_EMAIL=… npx tsx scripts/seedAdmin.ts` seeds the first admin (the script exists and documents its own prerequisite: the user must sign up first).
- `npm run dev`, then `/api/v2/*` and `/docs/api`.

Two frictions worth naming: the API and admin surfaces cannot be exercised without real Supabase credentials (no local fixture path), and 39 stale git worktrees on disk make a fresh contributor's `git worktree list` unreadable.

### 4. What is the security posture?

**Strong — the best-scoring axis of this audit.**

- **RLS is complete.** All 29 live tables have `ENABLE ROW LEVEL SECURITY` _and_ at least one policy. There are no `RLS=No` rows. The AFRIK tables carry public-read-only policies with writes reserved to the service role, and migration `019` documents that choice rather than leaving it implicit.
- **API keys**: PBKDF2-SHA256, **600 000 iterations**, 16-byte random salt, self-describing hash format, raw keys never stored.
- **CSP nonce is per request** (`crypto.randomUUID()` on every request), alongside HSTS preload, `nosniff` and `strict-origin-when-cross-origin`.
- **CORS fails closed** — no origin configured means no `Access-Control-Allow-Origin` at all, and `Vary: Origin` is appended rather than assigned so a shared cache cannot leak one origin's decision to another.
- **Sentry**: EU residency is _asserted_, not merely documented — `assertEuDsn` throws on a non-`ingest.de.sentry.io` DSN in production, on all three runtimes, each with the PII scrubber wired into `beforeSend`.
- **Service-role isolation holds**: `@/lib/supabase/admin` never reaches a browser bundle.
- **Rate limiting is real**: Upstash Redis-backed, per-tier, with a separate IP pre-limit that bounds the expensive PBKDF2 comparison before a tier is known.
- **Secrets**: only `.env.example` is tracked, the tracked-file secret scan is clean, and **`gitleaks` is a required status check** on both protected branches.

The gaps are narrow and specific: the same-origin API bypass trusts a client-settable header (see Domain 1), and every public page relaxes CSP to `style-src 'unsafe-inline'`.

### 5. Is the score close to 8–9/10?

**7.0 / 10** — up from 6.4 the day before, and short of target by roughly one point. The three actions that close the distance:

1. **Add the domain-critical workflows to the required status checks** (Data Integrity, Editorial Rules, A11y, Lighthouse). This alone moves Domain 3 from 5 to 8 and makes every other gate mean something.
2. **Fix the two standing red gates** — the SERIOUS color-contrast violation on `/fr` and the mobile performance/TBT budget — so that requiring them is possible rather than self-blocking.
3. **Configure `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY`** and the `TEST_SUPABASE_*` trio, which unblocks production data sync and turns E2E from vacuous-green into a real gate.

---

## 3. Overall score

# **7.0 / 10**

The codebase is healthier than the pipeline that ships it. Every gate this project wrote for itself is green; the problem is that almost none of them are allowed to stop a merge.

---

## 4. Score per domain

| #   | Domain                             | Score | One-line justification                                                                                                                         |
| --- | ---------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Security posture                   | **8** | RLS complete on 29/29 tables, PBKDF2 600k, per-request nonce, CORS fails closed; `internal/*` dumps and CSP `unsafe-inline` cost it two points |
| 2   | Secrets hygiene                    | **9** | `gitleaks` required on both branches, clean scan, `check:env-example` verifies both directions                                                 |
| 3   | CI                                 | **5** | Only `gitleaks` + `build` are required; A11y and Lighthouse red on 5 straight merges; E2E vacuous-green                                        |
| 4   | Correctness & tests                | **8** | 4558 pass / 0 fail, coverage 83/76/86/84 over 70/60/70/70; a pocket of orphan files                                                            |
| 5   | Deploy coherence                   | **6** | Docs and migration hygiene are excellent; `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` missing breaks prod data sync                                 |
| 6   | Ferry pipeline                     | **8** | Config parses, `base=target=recette` matches doctrine, all 9 Ferry secrets present, pins SHA                                                   |
| 7   | Architecture & boundaries          | **7** | Three-layer API holds for 33/37 routes; 4 bypasses, a duplicated doctrinal constant, 2 undeclared deps                                         |
| 8   | AFRIK data integrity & Source Tier | **7** | 35/35 checks, 0 errors, **both FR28 bands clean**; `needs_review` tail and a second tier vocabulary remain                                     |
| 9   | Performance & accessibility        | **4** | Both gates standing red — SERIOUS contrast on `/fr`, perf < 0.85 and TBT > 300 ms on several routes                                            |
| 10  | Docs & runbooks                    | **8** | DEPLOYMENT.md is genuinely excellent; the restore drill is 13.5 months old                                                                     |

**Mean: 7.0 / 10**

---

## 5. Strengths

These are worth stating plainly, because they are unusual:

- **RLS coverage is total.** 29 live tables, 29 with RLS enabled, 29 with at least one policy, and the read-only-by-design tables say so in a migration comment instead of leaving a reader to guess.
- **The FR28 demographic burn-down is finished.** Both the hard band [95,105] and the doctrinal band [99,101] measure zero offenders, so both now fail the build. A fiche cannot drift back out.
- **`check:env-example` verifies both directions.** Most projects check that code's env reads are documented; this one also checks that every documented entry is actually read. 39 references across 1208 files.
- **The gates are written by someone who has been burned.** `SOFT_CHECK_NAMES` declares advisory checks in exactly one place; `afrikSyncTarget.ts` refuses outright if the production target resolves to the recette project; `openapi-diff` fetches a real baseline; migration `019` explains _why_ AFRIK writes are service-role-only. The comments record tradeoffs, not narration.
- **DEPLOYMENT.md documents the trap rather than the happy path.** It states outright that both Supabase projects call themselves "production", which label means what, and which project serves which application — the exact confusion that has already caused a production deploy to load the corpus into recette.
- **Test suite is substantial and honest.** 4558 passing, zero failing, and the previously-known `migrateAfrikToDatabase` failures are gone rather than quarantined.
- **Supply chain**: every third-party Action SHA-pinned, Dependabot bumping them, 0 high/critical CVEs.

---

## 6. Gaps and risks

### Domain 1 — Security

- **P1** `src/app/api/v2/internal/peoples/route.ts:12` (and `internal/countries`, `internal/language-families`) — calls `getAllAfrikPeoples()` with no page/perPage, so it runs `select("*")` across the whole table. The route comment says "not exposed publicly", but it lives under `/api/v2/*`, where `src/middleware.ts:152` grants a **same-origin bypass** based on the `Origin`/`Referer` headers (`src/middleware.ts:78-91`). Those headers are only browser-enforced; any non-browser client sets them freely. Net effect: a full unpaginated dump of every people, country and language family, without an API key, bypassing the documented `perPage` maximum of 100.
- **P1** `src/middleware.ts:46-49` — every public localized page (`/fr` and everything under it, i.e. the entire public site) gets `style-src 'self' 'unsafe-inline'` plus `style-src-attr 'unsafe-inline'`. The scoping to public pages and the follow-up note are good practice, but the weakening still covers 100% of the user-facing surface.
- **P2** `src/middleware.ts:41-53` — the CSP declares no `base-uri` and no `form-action`. Neither directive falls back to `default-src`, so both are currently unrestricted.
- **P2** Flag validation bounds disagree across the wire: `src/components/flags/FlagForm.tsx:131` requires a reason of at least 50 characters, `src/api/v2/handlers/flags.ts:54` accepts 10. The 50-character rule is browser-only and a direct API call ignores it.

### Domain 3 — CI

- **P0** **Branch protection requires only `gitleaks` and `build`** on both `recette` and `main`. The Data Integrity Gate, Editorial Rules Gate, A11y, Lighthouse, E2E and OpenAPI-diff run on every PR and gate nothing. Everything else in this report about "enforced" data and editorial rules is conditional on this.
- **P1** A11y and Lighthouse have concluded `failure` on the last five consecutive PR runs (`fix/famille-parchment-contrast`, `feat/etni-module-jeux` ×2, `feat/etni-jouer-familles` ×2) and every one merged.
- **P1** `.github/workflows/e2e.yml` is **vacuous-green**. The latest run finished in 40 seconds with `Install Playwright browsers`, `Build app`, `Start app`, `Wait for app`, `Run Playwright` and `Upload report` all skipped, because `TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY` are not set. It reports success without executing a single spec. The skip is deliberate and well-commented (forks, Dependabot) — but on same-repo PRs it is silently masking the whole suite.
- **P2** `required_approving_review_count: 0` on both branches. Defensible for a solo developer; worth a conscious decision rather than a default.

### Domain 5 — Deploy coherence

- **P0** **`PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` is not in the repository secrets.** `production-data-sync.yml:36` consumes it, and the workflow is written to fail rather than skip when it is absent. `PRODUCTION_SUPABASE_URL` was set on 2026-08-26; its companion was not.
- **P1** `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY` are absent — the cause of the E2E finding above.
- **P1** Production migrations remain manual by design, but `docs/runbooks/migration-state.md` records applied state for recette only. Nothing in-repo evidences that `037`–`042` reached the production project, and the two-step rollout rule means "applied and called done" has already happened here.

### Domain 7 — Architecture & boundaries

- **P1** Four `/api/v2` routes bypass the mandated route → handler → service split and reach the query layer directly: `internal/peoples`, `internal/countries`, `internal/language-families`, `keys/issue`. 33 of 37 routes honour it (21 handlers, 21 services).
- **P1** The FR28-strict doctrinal band is duplicated as a bare literal: `scripts/validateAfrikData.ts:980` (`sum < 99 || sum > 101`) and `src/components/country/PeoplesSection.tsx:115` (`if (declared >= 99) return null`). Two independent copies of a doctrinal constant; moving the band moves one of them.
- **P1** `@testing-library/user-event` is imported by **31 test files** but declared nowhere in `package.json` — it resolves transitively today. `esbuild` is likewise undeclared in the three `scripts/*-bundle-size.ts` files that gate the Lighthouse workflow. A transitive bump breaks both.
- **P2** 5.69% duplicated lines (709 clones across 1062 files) — moderate, no single hotspot severe enough to name.

### Domain 8 — AFRIK data integrity

- **P1** 1063 sources at `needs_review` across 469 fiches. The CI ratchet in `scripts/ci/checkSourceTierCoverage.ts` is pinned at exactly 1063: it forbids growth but does not drive descent.
- **P1** 1190 sources carry no URL and therefore cannot be tiered from the catalogue.
- **P1** 37 fiches still carry legacy numeric `"tier": 1|2` — 6 in `migrations/`, 1 in `noms/`, 12 in `relations/`. Migration `041` normalised the DB vocabulary; the source-of-truth JSON was left behind, so CLAUDE.md's "one three-value scale everywhere" is not true of the corpus.
- **P1** 7 relation fiches cite `"unknown"` as the source (`REL_RELIGIOUS_*`, `REL_MIGRATORY_*`). Under the current doctrine these publish at `unverified`, which reads as provenance where there is none.
- **P1** `scripts/ci/checkEditorialRules.ts` walks `dataset/source/afrik/logs/` and audits the gate's **own gitignored output** as if it were fiches — `validation_report.json`, `people-source-tier-audit.json` and `people-source-tier-prismic-manifest.json` each draw an "has no autonym" warning. Harmless while these are warnings; a scope bug the moment any of those rules becomes blocking.
- **P2** FR52-coverage remains the single advisory check (`SOFT_CHECK_NAMES`), with 23 families reporting unlinked peoples — `FLG_NIGERCONGO` 0 linked / 179 unlinked, `FLG_BANTU` 8 / 166, `FLG_CREOLE` 0 / 20.

### Domain 9 — Performance & accessibility

- **P1** axe-core: **SERIOUS `color-contrast`** on live route `/fr`, affecting `label:nth-child(1)` and `label:nth-child(3)`, plus 3 of 408 Storybook stories with violations. This is what turns the `accessibility >= 1.0` Lighthouse assertion red as well.
- **P1** Lighthouse mobile: `categories.performance` below the 0.85 floor on several routes, and `total-blocking-time` above the 300 ms ceiling on at least three, across 15 URLs / 48 runs.
- Both gates are correctly configured — no `continue-on-error`, budgets scoped one URL per route family, the two previously-excluded 500ing routes restored rather than re-excluded. They fail because the site fails them, which is the gate working. They just do not block.

### Domain 10 — Docs

- **P1** `docs/runbooks/restore-drill-2025-07-14.md` is the most recent drill — **13.5 months old** against a 12-month bar, and the file itself is labelled "historical record… Not current procedure." The procedure exists; the evidence that it works is stale.
- **P2** 39 stale git worktrees on disk (9 under `.claude/worktrees/`, several `locked`; 30 under `../ethniafrica-worktrees/`). They pollute tooling — `knip` reported 27 "unused files" that were nothing but worktree copies of `.storybook/` and `.lighthouserc.js`.

### Hardcoded values (P0/P1)

The scan came back **clean of P0** and well under the P1 threshold — this is a strength, not a gap. Rate limits (`RATE_LIMIT_IP_RPM`, `_PUBLIC_RPM`, `_PARTNER_RPM`, `_WINDOW`), quiz confidence (`QUIZ_MIN_CONFIDENCE`), CORS origin and every Supabase/Upstash/Sentry endpoint are env-driven; `grep` for hardcoded service URLs in `src/**` returns nothing. Cache TTLs are named module constants documented against the AR18 cache classes rather than bare literals.

Two P1s only:

- **P1** `src/components/country/PeoplesSection.tsx:115` — `declared >= 99`, a second copy of the FR28-strict doctrinal band (Domain 7 above; counted once, there).
- **P1** `src/components/flags/FlagForm.tsx:131` — `length < 50` client-side vs `min(10)` server-side (Domain 1 above; counted once, there).

Both are cross-referenced rather than re-penalised, so Domains 5 and 7 take **no hardcoded-value penalty**.

### Dead code & redundancy

- **P1** `src/lib/api/openapi.ts` — 211 lines of V1 OpenAPI spec, imported by nothing. `openapiV2.ts` (2693 lines) is the live one.
- **P1** `src/components/layout/MobileMenu.tsx` — orphan. `PageLayout.tsx:6` renders `MobileNavBar` instead. (Checked specifically, because an orphaned mobile nav would be a mobile-first regression: it is not — the live mobile nav is `src/components/MobileNavBar.tsx`.)
- **P1** `src/components/family/FamilyDistributionSection.tsx`, `FamilyGeneralInfoSection.tsx`, `FamilySourcesFooter.tsx` and `family/index.ts` — orphaned by the fiche-famille rework.
- **P1** ~20 unused shadcn components under `src/components/ui/` (`aspect-ratio`, `avatar`, `calendar`, `carousel`, `chart`, `collapsible`, `command`, `context-menu`, `form`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `popover`, `resizable`, `sidebar`, `slider`, `toggle`, `toggle-group`) pulling **18 unused production dependencies** (11 `@radix-ui/*`, `cmdk`, `embla-carousel-react`, `framer-motion`, `input-otp`, `react-day-picker`, `react-hook-form`, `@hookform/resolvers`, `react-resizable-panels`). Next tree-shakes them out of the shipped bundle, so this is install weight and supply-chain surface rather than a payload regression — hence P1, not P0.
- **P2** `src/App.css` (Vite-era leftover), `src/api/v2/schemas/games.ts`, `src/components/{compare,names,relations}/index.ts` barrels, 11 unused devDependencies, 128 unused exports / 85 unused exported types / 77 named+default duplicate exports.
- **Clean:** no surviving V1 imports (`entityKeys`, `entityTranslations`, `datasetLoader.server`, `types/ethnicity`) — the V1 removal held. `src/app/docs/api/v1/page.tsx` is _not_ dead: it is a deliberate `redirect("/docs/api/v2")`.

---

## 7. Consumer / new-contributor flow

| Step                                      | Status | Evidence                                                                                                         |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `git clone` + `npm ci --legacy-peer-deps` | ✅     | documented in CLAUDE.md; the peer-dep conflict is intentional and explained                                      |
| `.env.example` → `.env.local`             | ✅     | `check:env-example` — 39 refs / 1208 files, verified both directions                                             |
| migrations apply in order                 | ✅     | `check:migration-files` — 42 files, no duplicate, no hole                                                        |
| corpus load                               | ✅     | `scripts/migrateAfrikToDatabase.ts` + `docs/runbooks/afrik-data-sync.md`                                         |
| first admin seeded                        | ✅     | `scripts/seedAdmin.ts`, documents its own prerequisite                                                           |
| `npm run dev`                             | ✅     | build passes clean                                                                                               |
| `/api/v2/*` returns data                  | ⚠️     | requires real Supabase credentials; no local fixture path                                                        |
| `/docs/api` renders                       | ✅     | route present in the build manifest                                                                              |
| `/admin` gated by RBAC                    | ✅     | `src/middleware.ts` admin block + `user_roles` (5 roles, one `UserRole` type in `src/lib/auth/supabase-auth.ts`) |

---

## 8. Security posture

### Supabase Row Level Security — coverage

All 37 `CREATE TABLE` statements across `supabase/migrations/*.sql` were enumerated; 8 belong to the V1 schema dropped by migration `007`. Of the **29 live tables, 29 have RLS enabled and 29 carry at least one policy. There are no `RLS=No` rows and therefore no P0 in this table.**

| Table                     | RLS | Policies | Notes                                           |
| ------------------------- | --- | -------- | ----------------------------------------------- |
| `afrik_countries`         | Yes | 1        | public read only; writes = service role (`019`) |
| `afrik_language_families` | Yes | 1        | public read only                                |
| `afrik_languages`         | Yes | 1        | public read only                                |
| `afrik_peoples`           | Yes | 1        | public read only                                |
| `afrik_people_countries`  | Yes | 1        | join table, public read only                    |
| `afrik_people_relations`  | Yes | 1        | public read only                                |
| `api_keys`                | Yes | 1        | admin-only                                      |
| `assertions`              | Yes | 2        | Module 0 fabric                                 |
| `assertion_references`    | Yes | 1        | `040`                                           |
| `audit_log`               | Yes | 3        | append-only                                     |
| `confidence_scores`       | Yes | 2        | recomputed by trigger                           |
| `contributions`           | Yes | 2        | public insert + read                            |
| `contributor_profiles`    | Yes | 3        | GDPR erasure path (`027`)                       |
| `editorial_doctrine`      | Yes | 5        | locked down in `017`                            |
| `fiche_revisions`         | Yes | 1        | per-assertion revisions (`020`)                 |
| `flags`                   | Yes | 4        | public moderation queue                         |
| `migration_events`        | Yes | 5        |                                                 |
| `migration_event_peoples` | Yes | 5        |                                                 |
| `name_records`            | Yes | 5        | "source or drop" trigger (FR57)                 |
| `oral_narratives`         | Yes | 1        | `032`                                           |
| `oral_narrative_links`    | Yes | 1        |                                                 |
| `protected_records`       | Yes | 1        | rights/consent (`033`)                          |
| `protected_record_audit`  | Yes | 1        |                                                 |
| `quiz_questions`          | Yes | 1        | `036`                                           |
| `quiz_generation_runs`    | Yes | 1        |                                                 |
| `revisions`               | Yes | 3        |                                                 |
| `revision_drafts`         | Yes | 4        |                                                 |
| `source_working_assets`   | Yes | 5        | `034`                                           |
| `sources`                 | Yes | 3        | recreated normalized in `031`                   |
| `user_roles`              | Yes | 5        | recursion fix in `038`                          |

### Other controls

| Control                      | Status | Evidence                                                                        |
| ---------------------------- | ------ | ------------------------------------------------------------------------------- |
| CSP nonce per request        | ✅     | `src/middleware.ts:133` — `crypto.randomUUID()` on every request                |
| HSTS / nosniff / referrer    | ✅     | `src/middleware.ts:34-38`, `max-age=31536000; includeSubDomains; preload`       |
| CSP `unsafe-inline`          | ⚠️ P1  | `src/middleware.ts:46-49` — all public pages                                    |
| CSP `base-uri`/`form-action` | ⚠️ P2  | absent; neither falls back to `default-src`                                     |
| API key hashing              | ✅     | `src/lib/api/auth.ts:15` — PBKDF2-SHA256, 600 000 iterations, 16-byte salt      |
| Rate limiting                | ✅     | Upstash Redis, per-tier, IP pre-limit guards the PBKDF2 path                    |
| Same-origin API bypass       | ⚠️ P1  | `src/middleware.ts:78-91` — trusts client-settable `Origin`/`Referer`           |
| CORS                         | ✅     | `src/lib/api/cors.ts` — fails closed, `Vary: Origin` appended not assigned      |
| Service-role isolation       | ✅     | no `@/lib/supabase/admin` import reaches a browser bundle                       |
| Sentry EU + PII scrub        | ✅     | `assertEuDsn` throws in prod on all three runtimes; `beforeSend` scrubber wired |
| Secret scanning in CI        | ✅     | `gitleaks` — and it is a **required** check                                     |
| Tracked secrets              | ✅     | only `.env.example` / `e2e/.env.example`; scan clean                            |
| Action SHA pinning           | ✅     | `check:action-pins` green; Dependabot bumps weekly                              |
| Dependency CVEs              | ✅     | 4 moderate, 0 high, 0 critical                                                  |

---

## 9. Performance & accessibility posture

Budgets are well specified. `.lighthouserc.js` collects **15 URLs** — home, `/fr`, one representative route per charter route-family, and one assembled fiche per AFRIK entity type (`pays/SEN`, `peuples/PPL_WOLOF`, `familles/FLG_BANTU`) — with `performance >= 0.85`, `accessibility = 1.0` and `total-blocking-time <= 300 ms`. The two routes previously excluded for 500ing were restored once migration `039` fixed the cause, with a comment stating the correct principle: _an unmeasured route is a budget nobody enforces_. Dedicated bundle-size gates cover the quiz play-island (≤ 15 KB gzipped), the home WebGL island and the axis graph. `a11y.yml` audits 408 Storybook stories plus 15 live routes.

The configuration is right. The results are red:

- **axe-core**: 3/408 stories with violations, and a **SERIOUS `color-contrast`** on `/fr` (`label:nth-child(1)`, `label:nth-child(3)`). All 14 other live routes pass.
- **Lighthouse**: performance below 0.85 and TBT above 300 ms on several routes; accessibility below 1.0 on two — the same contrast defect surfacing through a second gate.

Mobile-first is honoured structurally: the stories are parameterised at 430 / 720 / 1200 px, and the E2E suite targets the reference mobile device profile with CPU and network throttling.

---

## 10. AFRIK data integrity & Source Tier compliance

| #   | Check                         | Verdict                                                                                                                                                                                                                  |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Strict model adherence        | ✅ 9 `public/modele-*.json` present; structural checks green across 886 fiches                                                                                                                                           |
| 2   | Validator + FR28 bands        | ✅ 35/35 checks, **0 errors**. **FR28 [95,105]: 0 offenders. FR28-strict [99,101]: 0 offenders** — burn-down complete, both bands now fail the build                                                                     |
| 3   | FLG / PPL / ISO consistency   | ✅ FR26 folder match, FR27 duplicates, FR29 ISO validity, FR52 tree integrity, orphan fiches — all green                                                                                                                 |
| 4   | Source Tier compliance        | ⚠️ audited against the current doctrine (nothing forbidden, everything labelled). 0 blocking errors; **1063 `needs_review`**, **1190 URL-less**, **37 legacy numeric tiers**, **7 fiches citing `"unknown"`**            |
| 5   | DB vs source-JSON consistency | ⚠️ **not covered** by `validateAfrikData.ts` — recorded as a gap, not asserted                                                                                                                                           |
| 6   | CI enforcement                | ⚠️ `data-integrity.yml` and `editorial-rules.yml` are correctly written (no `continue-on-error`, PR + nightly triggers, URL health checks nightly) but **neither is a required status check**, so neither blocks a merge |
| 7   | Known-issues carry-over       | ✅ the 924-vs-334 fiche-count confusion is resolved (886 tracked JSON: 789 peoples, 54 pays, 26 familles, 12 relations, 6 migrations, 2 noms); FLG mismatches and duplicates now gate green                              |

**Corpus tier census:** 1268 `official`, 1201 `referenced`, 1603 `unverified`, 1063 `needs_review`, plus 37 legacy numeric.

The doctrine itself is coherent and correctly implemented in `041`: `tier` (authority) and `source_kind` (provenance) are orthogonal, and `recompute_confidence()` multiplies rather than branches, reproducing the retired `ai-enriched` 0.2 weight exactly as `0.4 × 0.5`. The gap is not the design; it is that 1063 sources have not yet been run through it, and that 37 fiches predate it entirely.

---

## 11. Prioritized action list

| #   | P   | Action                                                                                                                                      | Domain     |
| --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | P0  | Add `Data Integrity Gate`, `Editorial Rules Gate`, `A11y — axe-core`, `Lighthouse CI` to the required status checks on `recette` and `main` | 3          |
| 2   | P0  | Set the `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` repository secret — prod data sync fails without it                                          | 5          |
| 3   | P1  | Fix the SERIOUS `color-contrast` violation on `/fr` (`label:nth-child(1)`, `label:nth-child(3)`) and the 3 red Storybook stories            | 9          |
| 4   | P1  | Bring mobile performance back inside `>= 0.85` and TBT under 300 ms on the failing routes                                                   | 9          |
| 5   | P1  | Set `TEST_SUPABASE_URL` / `_ANON_KEY` / `_SERVICE_ROLE_KEY` so E2E stops reporting green without running                                    | 3          |
| 6   | P1  | Paginate or authenticate `/api/v2/internal/*`; stop treating a client-settable `Origin` as authorization                                    | 1          |
| 7   | P1  | Migrate the 37 fiches still carrying numeric `"tier": 1\|2` onto the three-value vocabulary                                                 | 8          |
| 8   | P1  | Replace the 7 `"unknown"` source citations in `relations/` with a real source, or drop the claim                                            | 8          |
| 9   | P1  | Declare `@testing-library/user-event` and `esbuild` in `package.json` — 31 test files and the Lighthouse gate rely on transitive resolution | 7          |
| 10  | P1  | Turn the source-tier ratchet from "pinned at 1063" into a scheduled descent, and record the target date                                     | 8          |
| 11  | P1  | Run a restore drill and add `docs/runbooks/restore-drill-2026-*.md` — the last one is 13.5 months old                                       | 10         |
| 12  | P1  | Scope `checkEditorialRules.ts` to exclude `dataset/source/afrik/logs/` — it audits its own output                                           | 8          |
| 13  | P1  | Delete `src/lib/api/openapi.ts`, `MobileMenu.tsx`, the orphaned `family/*Section.tsx`, `App.css`                                            | 4          |
| 14  | P1  | Prune the ~20 unused shadcn components and the 18 production dependencies they pull                                                         | 4 / 7      |
| 15  | P2  | Extract the FR28-strict band to one shared constant; add `base-uri` and `form-action` to the CSP; prune the 39 stale worktrees              | 1 / 7 / 10 |

---

## 12. Conclusion

**7.0 / 10.** EthniAfrica's engineering is in better shape than the number suggests, and the number is held down almost entirely by one structural fact: the project has built an unusually thorough set of quality gates and then not required any of them.

The evidence for the first half is strong. RLS is complete across all 29 live tables. API keys are hashed at 600 000 PBKDF2 iterations. The CSP nonce is genuinely per-request, CORS fails closed, and Sentry's EU residency is asserted in code rather than asked for in a comment. 4558 tests pass with none failing. Coverage sits 13 points above its own floor. Every third-party Action is SHA-pinned and there are no high or critical CVEs. And the AFRIK corpus — the actual product — has finished its demographic burn-down: both FR28 bands measure zero offenders, so both now fail the build and no fiche can drift back out.

The evidence for the second half is equally clear. `recette` and `main` require exactly two checks. The Data Integrity Gate that guards the editorial contract, the Editorial Rules Gate that enforces the decolonial posture, the accessibility gate and the performance gate all run on every pull request and stop nothing — which is how A11y and Lighthouse came to be red on five consecutive merges. The E2E suite reports success in forty seconds without executing a spec. And `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` is missing from a workflow explicitly designed to fail rather than skip without it.

None of this requires new engineering. Items 1, 2 and 5 on the action list are configuration changes measured in minutes, and together they move Domain 3 from 5 to 8 and Domain 5 from 6 to 8. Items 3 and 4 are one contrast defect and one performance budget. Closing those five closes most of the gap to 8–9, because the work they would gate is already done — it simply is not switched on.
