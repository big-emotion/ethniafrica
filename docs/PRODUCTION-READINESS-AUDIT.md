# EthniAfrica — Production Readiness Audit

**Date:** 2026-08-29
**Branch audited:** `recette` @ `faed1a60`
**Method:** read-only. Every repo gate executed locally; CI evidence read from GitHub Actions; branch protection and repository secrets read from the GitHub API. No external service was written to, no migration run, no live production probe.

---

## 1. Scope and method

| Gate                                                                      | Result                                                                                                                       |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                            | **pass** — 0 errors, 107 warnings                                                                                            |
| `npm run typecheck`                                                       | **pass** — but only after `npm run build`; see the Domain 3 ordering finding                                                 |
| `npm run format:check`                                                    | **pass**                                                                                                                     |
| `npm run test:coverage`                                                   | **pass** — 527 files, **5615 passed, 21 skipped, 0 failed**; 85.2 st / 78.9 br / 88.6 fn / 86.0 li vs thresholds 70/60/70/70 |
| `npm run build`                                                           | **pass**                                                                                                                     |
| `npm run test:charter-contracts`                                          | **pass**                                                                                                                     |
| `npm run lint:req`                                                        | **pass**                                                                                                                     |
| `check:jira-template` / `action-pins` / `env-example` / `migration-files` | **all pass**                                                                                                                 |
| `npx tsx scripts/validateAfrikData.ts`                                    | **exit 0** — 35/35 checks, **0 errors**, 4008 warnings                                                                       |
| `npx tsx scripts/ci/checkEditorialRules.ts`                               | **exit 0**                                                                                                                   |
| `npx tsx scripts/ci/checkSourceTierCoverage.ts`                           | **pass at the ratchet** — 1063 untiered across 469 fiches, ratchet pinned at 1063                                            |
| `npm audit`                                                               | **4 moderate, 0 high, 0 critical** (1482 deps)                                                                               |
| `gh` CI history                                                           | `CI` green; **A11y red and Lighthouse red on PR #520, merged anyway**                                                        |

Corpus: 886 tracked fiches (26 `famille_linguistique`, 789 `peuples`, 54 `pays`, 12 `relations`, 6 `migrations`, 2 `noms`). 47 migrations, 37 tables, 22 workflows.

**Note on this skill's own rubric.** The audit rubric still describes the retired Tier 1/2/3 policy in which "Tier 3 is forbidden" and a Wikipedia citation is a P0. `CLAUDE.md` supersedes that with the three-value `official` / `referenced` / `unverified` scale under which _nothing is forbidden and everything is labelled_. Domain 8 below is scored against the **current** doctrine. Scoring against the retired one would have manufactured ~2776 false P0s out of citations the project deliberately publishes and marks.

---

## 2. The five canonical questions

### 1. Is the project ready for production?

**Conditional — no.** Three blockers, all unchanged since the 2026-08-27 audit:

1. **The quality gates do not gate.** Branch protection on `recette` and `main` requires only `gitleaks` and `build`. Data Integrity, Editorial Rules, A11y, Lighthouse, E2E and OpenAPI-diff all run and all merge red.
2. **The accessibility budget is currently violated on the product's core surface.** axe-core reports SERIOUS `color-contrast` on `People/FicheSections` at 430px, 720px _and_ 1200px. The charter's `accessibility = 1.0` is non-negotiable and is not met.
3. **`PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` is still absent from repository secrets.** `production-data-sync.yml` consumes it and is written to fail rather than skip.

### 2. Is the AFRIK editorial surface sound?

**Yes, structurally — with one stalled burn-down.**

- Validator: **35/35 checks, 0 errors**. Referential integrity is complete: FR26 (FLG folder match), FR27 (PPL duplicates), FR29 (ISO validity), FR52 (classification tree), FR53/FR55/FR57 (name records), REL-1…REL-7 (relations), CR1…CR5 (colonial borders) all pass.
- **FR28 hard gate [95,105] ✅ and FR28-strict [99,101] ✅.** The demographic burn-down is genuinely finished and both bands now fail the build. A fiche cannot drift back out.
- `data-integrity.yml` and `editorial-rules.yml` trigger on PRs into both `recette` and `main` and carry **no `continue-on-error`** — they are correctly configured (they simply are not _required_, which is the Domain 3 blocker).
- **The gap:** 1063 sources sit at `needs_review` across 469 fiches — 53% of the corpus. `needs_review` is deliberately _not_ a member of `SourceTier` (`scripts/codemods/tierStringSources.ts:25`); it is the unresolved state. The CI ratchet is pinned at exactly 1063, so it forbids growth but applies no downward pressure. A further 1190 sources carry no URL and cannot be tiered from the catalogue.
- Under the current doctrine none of this is a violation — the claims publish and are visibly marked. But "one three-value scale everywhere" is not yet true of the corpus.

**No fiche publishes an unmarked claim.** That is the contract, and it holds.

### 3. Can a new contributor go clone → running in one session?

**Yes**, with one documented friction point. Every step is covered by a gate or a runbook; only live API responses need real Supabase credentials, for which there is no local fixture path. Full walk in §7.

### 4. What is the security posture?

**Strong — the strongest domain in this audit.** RLS is enabled with at least one policy on **37 of 37 tables**. The service-role client is kept out of client bundles by `import "server-only"` (a build-time failure, not a convention). API keys are PBKDF2-SHA256 at **600,000 iterations** with a 16-byte salt and a self-describing hash format — six times the 100k bar. The CSP nonce is generated per request. Rate limiting is real Upstash Redis with per-tier sliding windows, fully env-tunable. Sentry enforces EU residency with a **throwing** assert plus a PII scrubber. Detail in §8.

The two real weaknesses are the unpaginated `internal/*` routes reachable through the same-origin bypass, and `style-src 'unsafe-inline'` covering 100% of the public surface.

### 5. Is the score close to 8–9/10?

**No — 7.0 / 10, unchanged from 2026-08-27.** The codebase improved measurably (tests 4558 → 5615, coverage 83/76/86/84 → 85/79/89/86, duplication 5.69% → 4.85%, FR28 burn-down complete). The score did not move **because none of the three blockers moved.** They are all configuration and one CSS fix — not architecture. See §11 for the arithmetic of closing the gap.

---

## 3. Overall score

# **7.0 / 10**

The codebase is healthier than the pipeline that ships it. Every gate this project wrote for itself is green or honestly red; the problem remains that almost none of them are allowed to stop a merge.

---

## 4. Score per domain

| #   | Domain                             | Score | One-line justification                                                                                                                        |
| --- | ---------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Security posture                   | **8** | RLS complete on 37/37 tables, PBKDF2 600k, per-request nonce, `server-only` guard; `internal/*` dumps and CSP `unsafe-inline` cost two points |
| 2   | Secrets hygiene                    | **9** | `gitleaks` required on both branches, clean scan, all Actions SHA-pinned, `check:env-example` verifies both directions                        |
| 3   | CI                                 | **5** | Only `gitleaks` + `build` required; A11y and Lighthouse red on the merged head; E2E vacuous-green; typecheck runs before build                |
| 4   | Correctness & tests                | **8** | 5615 pass / 0 fail, coverage 85/79/89/86 over 70/60/70/70; a persistent pocket of orphan files                                                |
| 5   | Deploy coherence                   | **6** | Docs and migration hygiene excellent; `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` still missing, breaking prod data sync                           |
| 6   | Ferry pipeline                     | **8** | Config parses, `base=target=recette` matches doctrine, pins SHA                                                                               |
| 7   | Architecture & boundaries          | **7** | Three-layer API holds for 33/37 routes; 4 bypasses, 2 undeclared deps, a dead browser-client chain                                            |
| 8   | AFRIK data integrity & Source Tier | **7** | 35/35 checks, 0 errors, **both FR28 bands clean**; `needs_review` ratchet frozen at 1063 and a legacy tier vocabulary                         |
| 9   | Performance & accessibility        | **4** | Both gates standing red — SERIOUS contrast on the people fiche at all 3 breakpoints, perf < 0.85, TBT > 300 ms                                |
| 10  | Docs & runbooks                    | **8** | CLAUDE.md and DEPLOYMENT.md match reality; the restore drill is 13.5 months old                                                               |

**Mean: 7.0 / 10**

---

## 5. Strengths

These are worth stating plainly, because they are unusual:

- **RLS coverage is total.** 37 tables, 37 with RLS enabled, 37 with at least one policy. The read-only-by-design tables say so in a migration comment (`019_afrik_rls.sql`) rather than leaving a reader to guess. Three separate greps during this audit _appeared_ to find uncovered tables; all three were regex artifacts (column-aligned whitespace, quoted multi-word policy names, multi-line `CREATE POLICY`). The coverage is real.
- **The FR28 demographic burn-down is finished.** Both the hard band [95,105] and the doctrinal band [99,101] measure zero offenders, so both now fail the build.
- **API-key hashing is genuinely strong.** PBKDF2-SHA256 at 600,000 iterations with a self-describing `pbkdf2v1:{iterations}:{salt}:{hash}` format, so the cost parameter can be raised without invalidating existing keys.
- **`import "server-only"` in `src/lib/supabase/admin.ts`.** The file's own comment records that a prose comment used to stand there and "stopped nothing". The guard is now enforced by the compiler.
- **Nothing is hardcoded that an operator would need to change.** Rate limits, windows, quiz confidence, CORS origin and every Supabase/Upstash/Sentry endpoint are env-driven. Cache TTLs are named module constants documented against the AR18 cache classes. **Zero P0 hardcoded values.**
- **The gates are written by someone who has been burned.** `SOFT_CHECK_NAMES` declares advisory checks in exactly one place; `afrikSyncTarget.ts` refuses if the production target resolves to recette; migration `041` explains why `tier` and `source_kind` multiply rather than branch. The comments record tradeoffs, not narration.
- **Test suite grew 23% and stayed green.** 5615 passing, zero failing. The previously-known `migrateAfrikToDatabase` mock failures are gone rather than quarantined.
- **Supply chain**: every third-party Action SHA-pinned, Dependabot bumping them, 0 high/critical CVEs.

---

## 6. Gaps and risks

### Domain 1 — Security

- **P1** `src/app/api/v2/internal/peoples/route.ts:11` (and `internal/countries`, `internal/language-families`) — calls `getAllAfrikPeoples()` with no page/perPage, returning the whole table. The route comment says "not exposed publicly", but it lives under `/api/v2/*`, where `src/middleware.ts:303` grants a **same-origin bypass** based on `Origin`/`Referer` (`isSameOriginRequest`, line 201). Those headers are only browser-enforced; a non-browser client sets them freely. Net effect: a full unpaginated dump of every people, country and language family, without an API key, bypassing the documented `perPage` maximum.
- **P1** `src/middleware.ts:46-49` — every public localized page (`/fr` and everything under it, i.e. the entire public site) gets `style-src 'self' 'unsafe-inline'` plus `style-src-attr 'unsafe-inline'`. The scoping and the follow-up note are good practice; the weakening still covers 100% of the user-facing surface. `script-src` correctly stays nonce-only (`'unsafe-eval'` is dev-only).
- **P2** `src/middleware.ts:41-53` — the CSP declares no `base-uri` and no `form-action`. Neither falls back to `default-src`, so both are unrestricted.

### Domain 3 — CI

- **P0** **Branch protection requires only `gitleaks` and `build`** on `recette` (`strict: true`, `enforce_admins: true`, `required_approving_review_count: 0`). Data Integrity, Editorial Rules, A11y, Lighthouse, E2E and OpenAPI-diff run on every PR and gate nothing. Everything else in this report about "enforced" rules is conditional on this.
- **P1** **PR #520 merged into `recette` on 2026-08-29 with `Lighthouse Mobile Audit` = fail and `axe-core (Storybook)` = fail.** This is not historical: it is the current head of the integration branch.
- **P1** `.github/workflows/e2e.yml` is still **vacuous-green** — the run reports `pass` in 39 seconds because `TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY` / `TEST_SUPABASE_SERVICE_ROLE_KEY` are absent from repository secrets. It reports success without executing a single spec.
- **P1** **`npm run typecheck` runs _before_ `npm run build`** in `ci.yml`. `tsconfig.json` includes `.next/types/**/*.ts`, which only exists after a build — so Next's generated route-type validator is **never type-checked in CI**. Locally the same ordering inverts: running `typecheck` against a _stale_ `.next` fails with 15 `TS2307` errors naming routes that no longer exist (observed this audit, before the build regenerated them). One command, two different meanings depending on what is on disk.
- **P1** `openapi-diff.yml` triggers only on `pull_request: branches: [main]`. A breaking API change merged into `recette` is never diffed until the release PR.
- **P2** `required_approving_review_count: 0` on both branches. Defensible for a solo developer; worth a conscious decision rather than a default.

### Domain 5 — Deploy coherence

- **P0** **`PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` is not in the repository secrets.** Confirmed by `gh secret list`: `PRODUCTION_SUPABASE_URL` and `PRODUCTION_REVALIDATE_SECRET` are present, its companion is not. `production-data-sync.yml` is written to fail rather than skip when it is absent.
- **P1** `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY` are absent — the cause of the E2E finding above.
- **P1** Production migrations remain manual by design, but `docs/runbooks/migration-state.md` records applied state for recette only. Nothing in-repo evidences that `043`–`047` reached the production project, and the two-step rollout rule means "applied and called done" has already happened here.
- **P2** `migrate-recette.yml:60` carries `continue-on-error: true`.

### Domain 7 — Architecture & boundaries

- **P1** Four `/api/v2` routes bypass the mandated route → handler → service split and reach the query layer directly: `internal/peoples`, `internal/countries`, `internal/language-families`, `keys/issue`. 33 of 37 routes honour it.
- **P1** `@testing-library/user-event` is imported by **31 test files** but declared nowhere in `package.json`; `esbuild` is likewise undeclared in the bundle-size scripts that gate Lighthouse. Both resolve transitively today. A transitive bump breaks both.
- **P1** **The documented browser Supabase client is dead.** `CLAUDE.md` describes three clients that are "never interchangeable", but `src/lib/supabase/client.ts` has exactly one importer — `src/lib/flags-client.ts` — which in turn is referenced only by tests (one of which asserts it is _not_ statically imported). The shipped app uses `server.ts` and `admin.ts` only. The invariant is sound; the third client is a two-file dead chain.
- **P2** 4.85% duplicated lines (731 clones, 9886 lines) — moderate, improved from 5.69%, no single hotspot severe enough to name.
- **Clean:** OpenAPI coverage is effectively complete — 31 of 37 routes carry `@swagger` JSDoc consumed by `swaggerJsdoc({ apis: [...] })`, 3 more are described by the static `paths` object, and the remaining 3 are the deliberately non-public `internal/*` routes.

### Domain 8 — AFRIK data integrity

- **P1** 1063 sources at `needs_review` across 469 fiches. The ratchet in `scripts/ci/checkSourceTierCoverage.ts` is pinned at exactly 1063: it forbids growth but does not drive descent. Contrast FR28, whose burn-down was actually completed and whose band now blocks.
- **P1** 1190 sources carry no URL and therefore cannot be tiered from the catalogue.
- **P1** 35 source entries still carry legacy numeric `"tier": 1|2` (27 at `2`, 8 at `1`), and 1 carries no `tier` field at all. Migration `041` narrowed the DB constraint to `official|referenced|unverified`; the source-of-truth JSON was left behind, so CLAUDE.md's "one three-value scale everywhere" is not true of the corpus. `CLAUDE.md` also states that a `sources` entry with no tier is a _blocking_ error — one entry currently contradicts that.
- **P1** 7 relation fiches cite `"unknown"` as the source domain (`REL_RELIGIOUS_*`, `REL_MIGRATORY_*`). Under the current doctrine these publish at `unverified`, which reads as provenance where there is none.
- **P2** FR52-coverage remains the single advisory check (`SOFT_CHECK_NAMES`), with 23 families reporting unlinked peoples — `FLG_NIGERCONGO` 0 linked / 179 unlinked, `FLG_BANTU` 8 / 166, `FLG_CREOLE` 0 / 20.

### Domain 9 — Performance & accessibility

- **P1** axe-core: **SERIOUS `color-contrast`** on `People/FicheSections — Fiche entière` at **430px, 720px and 1200px**, for the 1-country, 5-country and 21-country variants alike. The people fiche is the product's core surface, and mobile-first is a project mandate.
- **P1** Lighthouse mobile across 18 URLs / 57 runs: `categories.performance` below the 0.85 floor, `categories.accessibility` below the 1.0 floor, and `total-blocking-time` above the 300 ms ceiling, each on multiple routes.
- Both gates are correctly configured — no `continue-on-error`, budgets scoped one URL per route family, thresholds exactly as the charter specifies. They fail because the site fails them, which is the gate working. They just do not block.

### Domain 10 — Docs

- **P1** `docs/runbooks/restore-drill-2025-07-14.md` is the most recent drill — **13.5 months old** against a 12-month bar, and the file itself is labelled "historical record… Not current procedure." The procedure exists; the evidence that it works is stale.
- **P2** `docs/adr/` holds only `0007-atlas-globe-engine.md` and a README. The FR28 tolerance decision this audit's rubric expects at `docs/adr/0001-fr28-demographic-tolerance.md` does not exist; that doctrine lives in `CLAUDE.md` instead. Not wrong — but the ADR directory implies a series that was never written.

### Hardcoded values (P0/P1)

The scan came back **clean of P0 and clean of P1** — this is a strength, not a gap.

- `grep` for hardcoded Supabase / Upstash / Sentry URLs in `src/**` returns **nothing**.
- Rate limiting is exemplary: `DEFAULT_IP_RPM` 60, `DEFAULT_PUBLIC_RPM` 600, `DEFAULT_PARTNER_RPM` 6000, `DEFAULT_WINDOW` "1 m" — every one a named constant overridable by `RATE_LIMIT_IP_RPM` / `_PUBLIC_RPM` / `_PARTNER_RPM` / `_WINDOW`.
- Cache TTLs are named `CACHE_CONTROL` module constants documented against the AR18 cache classes (`s-maxage=86400, immutable` for stable references, `s-maxage=3600` for people data) rather than bare literals.
- **P2 only:** the `s-maxage=3600` string is repeated verbatim across four route files; a shared constant per cache class would make the AR18 policy editable in one place.

Domains 5 and 7 therefore take **no hardcoded-value penalty**.

### Dead code & redundancy

- **P1** ~20 unused shadcn components under `src/components/ui/` (`aspect-ratio`, `avatar`, `calendar`, `carousel`, `chart`, `collapsible`, `command`, `context-menu`, `form`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `popover`, `resizable`, `sidebar`, `slider`, `toggle`, `toggle-group`) pulling **18 unused production dependencies** (11 `@radix-ui/*`, `cmdk`, `embla-carousel-react`, `framer-motion`, `input-otp`, `react-day-picker`, `react-hook-form`, `@hookform/resolvers`, `react-resizable-panels`). Next tree-shakes them out of the shipped bundle, so this is install weight and supply-chain surface rather than a payload regression — hence P1, not P0.
- **P1** `src/lib/api/openapi.ts` — V1 OpenAPI spec, imported by nothing. `openapiV2.ts` is the live one.
- **P1** `src/components/LanguageSelector.tsx` — orphan, and a V1 multilingual artefact in an app that `middleware.ts` pins to `/fr`. Zero references outside itself.
- **P1** `src/lib/supabase/client.ts` → `src/lib/flags-client.ts` — the dead browser-client chain described under Domain 7 (counted once, there).
- **P1** `src/components/family/FamilyDistributionSection.tsx`, `FamilyGeneralInfoSection.tsx`, `FamilySourcesFooter.tsx` and `family/index.ts` — orphaned by the fiche-famille rework. `src/components/layout/MobileMenu.tsx` likewise (the live mobile nav is `MobileNavBar.tsx` — checked specifically, since an orphaned mobile nav would be a mobile-first regression; it is not).
- **P2** `src/App.css` (Vite-era leftover), `src/api/v2/schemas/games.ts`, `src/components/{compare,names,relations}/index.ts` barrels, 11 unused devDependencies, 170 unused exports / 96 unused exported types / **108 named+default duplicate exports**.
- **Clean:** no surviving V1 imports (`entityKeys`, `entityTranslations`, `datasetLoader.server`, `types/ethnicity`) — the V1 removal held.

**Method note.** `knip`'s largest block (108 entries) is _Duplicate exports_ — symbols exported both named and default — not dead code. Read as "unused", it would have condemned `AutonymExonymHeading`, which a custom ESLint rule (`afh/no-bare-people-name`) _mandates_ using. Its "unused files" list likewise counts `e2e/`, `scripts/` and mockup entry points that have no knip config. Only findings verified by direct reference-grep are listed above.

---

## 7. Consumer / new-contributor flow

| Step                                      | Status | Evidence                                                                                                     |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `git clone` + `npm ci --legacy-peer-deps` | ✅     | documented in CLAUDE.md; the peer-dep conflict is intentional and explained                                  |
| `.env.example` → `.env.local`             | ✅     | `check:env-example` passes, verified both directions                                                         |
| migrations apply in order                 | ✅     | `check:migration-files` — 47 files, no duplicate prefix, no hole                                             |
| corpus load                               | ✅     | `scripts/migrateAfrikToDatabase.ts` + `docs/runbooks/afrik-data-sync.md`                                     |
| first admin seeded                        | ✅     | `scripts/seedAdmin.ts`, documents its own prerequisite                                                       |
| `npm run dev`                             | ✅     | build passes clean                                                                                           |
| `/api/v2/*` returns data                  | ⚠️     | requires real Supabase credentials; no local fixture path                                                    |
| `/docs/api` renders                       | ✅     | route present in the build manifest                                                                          |
| `/admin` gated by RBAC                    | ✅     | `src/middleware.ts` admin block + `user_roles` (5 roles: reader / contributor / moderator / admin / advisor) |

One friction point (`⚠️`): a contributor with no Supabase project cannot exercise the API locally. Everything else is a single documented command.

---

## 8. Security posture

### Supabase Row Level Security — coverage

**37 tables · 37 with RLS enabled · 37 with at least one policy.** No gaps.

| Table group                                                                                                | RLS | Policies | Notes                                                         |
| ---------------------------------------------------------------------------------------------------------- | --- | -------- | ------------------------------------------------------------- |
| `afrik_countries`, `afrik_language_families`, `afrik_languages`, `afrik_peoples`, `afrik_people_countries` | ✅  | 1 each   | public SELECT only; writes are service-role by design (`019`) |
| `afrik_people_relations`                                                                                   | ✅  | ✅       | added by `030`                                                |
| `contributions`                                                                                            | ✅  | 2        | public insert + read-own (`001`)                              |
| `user_roles`                                                                                               | ✅  | 3        | admin-only writes; recursion fix in `038`                     |
| `api_keys`                                                                                                 | ✅  | 1        | admin-only                                                    |
| `audit_log`                                                                                                | ✅  | 3        | append-only                                                   |
| `sources`, `assertions`, `assertion_references`, `confidence_scores`                                       | ✅  | 1–2 each | module-zero fabric                                            |
| `revisions`, `revision_drafts`, `fiche_revisions`, `flags`                                                 | ✅  | 3–4 each | moderation surface                                            |
| `name_records`, `migration_events`, `migration_event_peoples`, `oral_narratives`, `oral_narrative_links`   | ✅  | 1–5 each | atlas modules                                                 |
| `editorial_doctrine`, `source_working_assets`, `contributor_profiles`, `protected_records`, quiz tables    | ✅  | 1–5 each | —                                                             |
| V1 remnants (`ethnic_groups`, `countries`, `languages`, `african_regions`, …)                              | ✅  | ✅       | dead schema, but locked down                                  |

### Other controls

| Control                          | Status | Evidence                                                                                         |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| Service-role isolation           | ✅     | `import "server-only"` in `src/lib/supabase/admin.ts` — a build failure, not a convention        |
| API-key hashing                  | ✅     | PBKDF2-SHA256, **600,000 iterations**, 16-byte salt, self-describing `pbkdf2v1:` format          |
| CSP nonce                        | ✅     | `crypto.randomUUID()` per request (`src/middleware.ts:284`)                                      |
| HSTS / nosniff / Referrer-Policy | ✅     | `max-age=31536000; includeSubDomains; preload`, `nosniff`, `strict-origin-when-cross-origin`     |
| `style-src`                      | ⚠️     | `'unsafe-inline'` on 100% of public pages (scoped and documented, still broad)                   |
| `base-uri` / `form-action`       | ❌     | absent; neither falls back to `default-src`                                                      |
| Rate limiting                    | ✅     | Upstash Redis, per-tier sliding windows (ip / public / partner), fully env-tunable               |
| Sentry                           | ✅     | EU DSN enforced by a **throwing** `assertEuDsn`, PII scrubber in `beforeSend`, 10% prod sampling |
| Secrets in tree                  | ✅     | only `.env.example` and `e2e/.env.example` tracked; pattern scan clean                           |
| Secret scanning in CI            | ✅     | `gitleaks` is a **required** check (scans the working tree, `--no-git`)                          |
| Supply chain                     | ✅     | every third-party Action SHA-pinned; Dependabot weekly; 4 moderate / 0 high / 0 critical CVEs    |
| Unauthenticated dumps            | ❌     | `internal/*` routes, reachable via the same-origin bypass                                        |

---

## 9. Performance & accessibility posture

Budgets are configured exactly as the charter requires and are **not** advisory:

- `categories:performance` ≥ **0.85** — currently failing on multiple routes
- `categories:accessibility` = **1.0** — currently failing
- `categories:best-practices` ≥ **0.95**
- `total-blocking-time` ≤ **300 ms** — currently failing on multiple routes
- 18 URLs, 57 runs, one URL per route family.

`a11y.yml` runs axe-core over Storybook at 430px / 720px / 1200px on `pull_request` into `recette` and `main` plus `push` to `main`, with no `continue-on-error`.

**The current violation:** SERIOUS `color-contrast` on `People/FicheSections — Fiche entière` at all three breakpoints, in the 1-, 5- and 21-country variants. Given the project's standing note that the `--afh-color-*` ramp is a day palette that does not switch at night, and that removing a background can expose inherited contrast, this is most likely a token-inheritance issue on the fiche rather than nine independent defects — but that is a hypothesis for the fix, not a finding of this audit.

E2E (`e2e.yml`) is correctly written but **executes nothing** for want of `TEST_SUPABASE_*` secrets.

---

## 10. AFRIK data integrity & Source Tier compliance

| #   | Check                               | Verdict | Evidence                                                                                                                            |
| --- | ----------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Strict model adherence              | ✅      | 9 `public/modele-*.json` present; validator's structural checks (CR5, REL-1/3/4/7, FR55-iso) all pass                               |
| 2   | Validator run                       | ✅      | 35/35 checks, **0 errors**, 4008 warnings                                                                                           |
|     | — FR28 hard gate [95,105]           | ✅      | **0 offenders** — blocking                                                                                                          |
|     | — FR28-strict [99,101]              | ✅      | **0 offenders** — blocking; the burn-down is complete                                                                               |
| 3   | FLG / PPL / ISO consistency         | ✅      | FR26, FR27, FR29, FR52, FR53-ref all pass; no orphan fiches                                                                         |
| 4   | Source Tier compliance              | ⚠️      | No forbidden citations under current doctrine; **1063 `needs_review`**, 1190 without URL, 35 legacy numeric tiers, 1 with no tier   |
| 5   | Database vs source-JSON consistency | N/A     | the validator does not cover this, and a live DB read is out of scope for this audit — recorded as a gap, not asserted              |
| 6   | CI enforcement                      | ⚠️      | `data-integrity.yml` and `editorial-rules.yml` are correctly configured and non-advisory, but **not required** by branch protection |
| 7   | Known-issues carry-over             | ✅      | the duplicate-fiche and FLG-mismatch items from the 2026-04-13 audit no longer reproduce; FR27 and FR26 both pass                   |

**Verdict: sound, with a stalled burn-down.** The editorial contract — every claim published _with_ its provenance, nothing suppressed, nothing unmarked — holds. What has not happened is the descent of the `needs_review` tail, and the corpus still speaks two tier vocabularies where the database speaks one.

---

## 11. Prioritized action list

| #   | Action                                                                                                          | Sev | Domain |
| --- | --------------------------------------------------------------------------------------------------------------- | --- | ------ |
| 1   | Add `Data Integrity`, `Editorial Rules`, `A11y`, `Lighthouse`, `E2E` to required checks on `recette` and `main` | P0  | 3      |
| 2   | Fix the SERIOUS `color-contrast` on `People/FicheSections` at 430/720/1200                                      | P0  | 9      |
| 3   | Add `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` to repository secrets                                                | P0  | 5      |
| 4   | Add `TEST_SUPABASE_URL` / `_ANON_KEY` / `_SERVICE_ROLE_KEY` so E2E stops reporting vacuous green                | P1  | 3      |
| 5   | Bring `performance` ≥ 0.85 and `total-blocking-time` ≤ 300 ms on the failing routes                             | P1  | 9      |
| 6   | Paginate or authenticate `internal/{peoples,countries,language-families}`                                       | P1  | 1      |
| 7   | Move `npm run typecheck` after `npm run build` in `ci.yml` so `.next/types` is actually checked                 | P1  | 3      |
| 8   | Drive the `needs_review` ratchet down from 1063 (and set a descending schedule, as FR28 had)                    | P1  | 8      |
| 9   | Migrate the 35 legacy numeric `tier` values and the 1 missing one onto the three-value scale                    | P1  | 8      |
| 10  | Declare `@testing-library/user-event` and `esbuild` in `package.json`                                           | P1  | 7      |
| 11  | Extend `openapi-diff.yml` to PRs into `recette`                                                                 | P1  | 3      |
| 12  | Run a restore drill and replace the 13.5-month-old record                                                       | P1  | 10     |
| 13  | Delete the ~20 unused shadcn components and their 18 production dependencies                                    | P1  | 4/7    |
| 14  | Remove the dead V1/orphan files (`openapi.ts`, `LanguageSelector.tsx`, `App.css`, `family/*`, `MobileMenu.tsx`) | P2  | 4      |
| 15  | Add `base-uri 'self'` and `form-action 'self'` to the CSP                                                       | P2  | 1      |

**Arithmetic of closing the gap.** Actions 1–3 alone move Domain 3 to ~9, Domain 9 to ~9 and Domain 5 to ~9 — a mean of **8.2**. Adding 4–12 lifts Domains 1, 7 and 8 to 8–9 and lands the project at **≈ 8.8**. Nothing on this list is architectural; items 1, 3 and 4 are configuration changes measured in minutes.

---

## 12. Conclusion

EthniAfrica's engineering substance is well above its shipping discipline. The data-plane security is complete and, in places, better than the bar this rubric sets — 600k PBKDF2 iterations, a compiler-enforced service-role boundary, total RLS coverage. The editorial machinery does what the decolonial posture requires: it publishes the claim _and_ its provenance, and it finished the FR28 burn-down it set for itself, which is the hardest kind of quality work to actually complete.

The gap between 7.0 and 9.0 is not craft. It is that the project has built ten gates and wired two of them to the door. A people fiche with a SERIOUS contrast violation reached the integration branch today, past a gate that detected it precisely and was not permitted to stop it. The single highest-leverage change in this document is a branch-protection setting.

One caution for the next audit: three separate greps in this pass appeared to find missing RLS policies, and a dead-code tool appeared to find 108 unused exports. All were artifacts. Where this report says a gap exists, it was confirmed by reading the file.
