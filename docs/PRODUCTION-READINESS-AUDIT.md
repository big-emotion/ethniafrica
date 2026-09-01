# EthniAfrica — Production Readiness Audit

**Date:** 2026-08-30
**Branch audited:** `recette` @ `c7edce51`. Previous revision audited `faed1a60` on 2026-08-29 and was updated twice that day as it was acted on (PR #523 `d695cf8c`, PR #525 `34f6f11c`).
**Method:** read-only. Every repo gate executed locally; CI evidence read from GitHub Actions; branch protection and repository secrets read from the GitHub API. No external service was written to, no migration run, no live production probe.

> **Route note, added 2026-09-01.** Two routes named in the findings below have
> since moved, and the findings are left as they were measured rather than
> rewritten. `/fr/explorer` no longer exists — ETNI-1555 removed the three axis
> landing pages, so `/fr/explorer`, `/fr/comprendre` and `/fr/jouer` all answer
> 404 and no Lighthouse or axe run can be pointed at them again.
> `/fr/comprendre/noms` is now `/fr/comprendre/appellations`. Findings 16 and 17
> in §11 therefore need restating against the current route list before they can
> be actioned; the scores they record stand as a record of what was measured on
> 2026-08-30.

**What this revision changed.** Three merges landed since the last one (#525, #526, #527), none structural. The score is unchanged at **7.5**, and all three blockers are unchanged. The substantive work of this pass was editorial: **§6 and §8 still listed four findings that PR #525 had already closed**, contradicting the §4 score table that had already credited them. Those are now marked closed rather than deleted, so the record shows what moved. Two new findings are added (corpus `source_kind`, `next-env.d.ts`), and the corpus breakdown is corrected.

---

## 1. Scope and method

| Gate                                                                      | Result                                                                                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                            | **pass** — 0 errors, 104 warnings                                                                                               |
| `npm run typecheck`                                                       | **pass** after `npm run build`; fails against a stale `.next` — see the Domain 3 note                                           |
| `npm run format:check`                                                    | **pass**                                                                                                                        |
| `npm run test:coverage`                                                   | **pass** — 529 files, **5632 passed, 21 skipped, 0 failed**; 85.0 st / 78.9 br / 88.3 fn / 85.9 li vs thresholds 70/60/70/70    |
| `npm run build`                                                           | **pass**                                                                                                                        |
| `npm run test:charter-contracts`                                          | **pass** — 35 files, 501 tests                                                                                                  |
| `npm run lint:req`                                                        | **pass**                                                                                                                        |
| `check:jira-template` / `action-pins` / `env-example` / `migration-files` | **all pass**                                                                                                                    |
| `npx tsx scripts/validateAfrikData.ts`                                    | **exit 0** — 35/35 checks, **0 errors**, 4008 warnings                                                                          |
| `npx tsx scripts/ci/checkEditorialRules.ts`                               | **exit 0**                                                                                                                      |
| `npx tsx scripts/ci/checkSourceTierCoverage.ts`                           | **pass at the ratchet** — 1063 untiered across 469 fiches, ratchet pinned at 1063                                               |
| `npm audit`                                                               | **4 moderate, 0 high, 0 critical** — all four are `uuid <11.1.1`, transitive via `@storybook/addon-actions` (dev-only)          |
| `gh` CI history                                                           | `CI`, `A11y`, `E2E`, `OpenAPI-diff`, `Claude Code Review` green on #527; **`Lighthouse` red on the last 3 runs, merged anyway** |

Corpus: 886 tracked fiches (**24** `famille_linguistique`, 789 `peuples`, 54 `pays`, 12 `relations`, 6 `migrations`, **1** `noms`). 47 migrations, 37 tables, 22 workflows. 5149 source entries under `content.sources`, 5172 `tier` keys corpus-wide once nested sources are counted.

> **Count correction.** The previous revision recorded 26 `famille_linguistique` and 2 `noms`, a breakdown summing to 889 against a stated total of 886. The tracked figures are 24 and 1 (`git ls-files`, confirmed against the working tree; there are 23 `peuples/FLG_*/` folders). The 886 total was right; only the split was wrong.

**Note on this skill's own rubric.** The audit rubric still describes the retired Tier 1/2/3 policy in which "Tier 3 is forbidden" and a Wikipedia citation is a P0. `CLAUDE.md` supersedes that with the three-value `official` / `referenced` / `unverified` scale under which _nothing is forbidden and everything is labelled_. Domain 8 below is scored against the **current** doctrine. Scoring against the retired one would have manufactured ~2776 false P0s out of citations the project deliberately publishes and marks.

---

## 2. The five canonical questions

### 1. Is the project ready for production?

**Conditional — no.** Three blockers, all unchanged since the 2026-08-27 audit:

1. **The quality gates do not gate.** Branch protection on `recette` and `main` requires only `gitleaks` and `build`. Data Integrity, Editorial Rules, A11y, Lighthouse, E2E and OpenAPI-diff all run and all merge red.
2. **The charter's `accessibility = 1.0` is still not met.** Partially closed the same day by PR #523: axe-core is now green across 402 stories and all 15 live routes. But Lighthouse still scores `/fr/explorer` at 0.96 and `/fr/comprendre/migrations` at 0.98, and its performance budget fails on 11 of 18 URLs.
3. **`PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` is still absent from repository secrets.** `production-data-sync.yml` consumes it and is written to fail rather than skip.

### 2. Is the AFRIK editorial surface sound?

**Yes, structurally — with one stalled burn-down.**

- Validator: **35/35 checks, 0 errors**. Referential integrity is complete: FR26 (FLG folder match), FR27 (PPL duplicates), FR29 (ISO validity), FR52 (classification tree), FR53/FR55/FR57 (name records), REL-1…REL-7 (relations), CR1…CR5 (colonial borders) all pass.
- **FR28 hard gate [95,105] ✅ and FR28-strict [99,101] ✅.** The demographic burn-down is genuinely finished and both bands now fail the build. A fiche cannot drift back out.
- `data-integrity.yml` and `editorial-rules.yml` trigger on PRs into both `recette` and `main` and carry **no `continue-on-error`** — they are correctly configured (they simply are not _required_, which is the Domain 3 blocker).
- **The gap:** 1063 sources sit at `needs_review` across 469 fiches — 53% of the corpus. `needs_review` is deliberately _not_ a member of `SourceTier` (`scripts/codemods/tierStringSources.ts:25`); it is the unresolved state. The CI ratchet is pinned at exactly 1063, so it forbids growth but applies no downward pressure. A further 1190 sources carry no URL and cannot be tiered from the catalogue.
- **New this pass — the provenance axis is empty.** `source_kind` is the second half of the doctrine: `tier` carries authority, `source_kind` carries what the source _is_, and `recompute_confidence()` multiplies them so that AI-generated text lands at 0.4 × 0.5 = 0.2. **0 of 5149 source entries carry the field.** The column, its CHECK constraint, the confidence formula and the UI marker all exist; nothing feeds them. AI-assisted text in the corpus is therefore indistinguishable from human text at the same tier — the one distinction the doctrine exists to preserve. Detail under Domain 8.
- Under the current doctrine none of this is a violation — the claims publish and are visibly marked. But "one three-value scale everywhere" is not yet true of the corpus, and the provenance axis is not yet true of it at all.

**No fiche publishes an unmarked claim.** Every fiche has sources, none is empty, none cites "unknown" as its whole provenance. That is the contract, and it holds. What is unfinished is resolution, not honesty.

### 3. Can a new contributor go clone → running in one session?

**Yes**, with one documented friction point. Every step is covered by a gate or a runbook; only live API responses need real Supabase credentials, for which there is no local fixture path. Full walk in §7.

### 4. What is the security posture?

**Strong — the strongest domain in this audit.** RLS is enabled with at least one policy on **37 of 37 tables**. The service-role client is kept out of client bundles by `import "server-only"` (a build-time failure, not a convention). API keys are PBKDF2-SHA256 at **600,000 iterations** with a 16-byte salt and a self-describing hash format — six times the 100k bar. The CSP nonce is generated per request. Rate limiting is real Upstash Redis with per-tier sliding windows, fully env-tunable. Sentry enforces EU residency with a **throwing** assert plus a PII scrubber. Detail in §8.

After #525 closed the unpaginated `internal/*` routes and set `base-uri` / `form-action`, **one weakness remains**: `style-src 'unsafe-inline'` covering 100% of the public surface. Every other control in §8 is green.

### 5. Is the score close to 8–9/10?

**No — 7.5 / 10**, unchanged from 2026-08-29, and the shape of the remaining gap has not moved either.

The audit opened at 7.0 on 2026-08-27 and stayed there despite a measurably better codebase, because none of the three blockers had moved. Acting on it moved four domains to 7.5: #523 turned axe-core green (Domain 9, 4 → 5), and #525 closed the unauthenticated table dumps and the two missing CSP directives (Domain 1, 8 → 9), fixed openapi-diff twice over (Domain 3, 5 → 6), removed 30 dead files and 18 production dependencies (Domain 4, 8 → 9), and left only one route bypassing the three-layer split (Domain 7, 7 → 8).

**Nothing has moved since.** The three merges of 2026-08-30 (#525 tail, #526 docs, #527 mobile text centring) touched no domain the rubric scores, so every number in §4 is carried forward on re-measured evidence rather than restated. Two findings were added — corpus `source_kind` and `next-env.d.ts` — and neither crosses a scoring threshold: Domain 8 was already at 7 for the tier tail, and Domain 5's P2 sits behind an unmoved P0.

What remains does **not** divide by difficulty. It divides by authority:

- **Three items need the owner** — branch protection (a governance call), and the `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` and `TEST_SUPABASE_*` secrets. Worth ~0.7. All three were open on 2026-08-27 and are open now; `gh secret list` this pass still shows `PRODUCTION_SUPABASE_URL` present and its service-role companion absent.
- **Two need measurement** the repo cannot currently produce: the Lighthouse chunk cannot be named without source maps, and the residual a11y sits on routes the two gates disagree about.
- **Two need a doctrine decision**: the corpus cannot leave the retired tier vocabulary while `validateAfrikData.ts` enforces it, and `source_kind` cannot be backfilled before the AFRIK source model says whether it is required.

An agent working alone here, without secrets or branch-protection rights, tops out around **7.7**. See §11.

**The honest reading of a flat score.** Three consecutive audits have produced 7.0, 7.5, 7.5. The codebase improved measurably across all three; what has not changed is that the gates it writes for itself are not allowed to stop a merge, and the two secrets that would make prod-sync and E2E real have not been added. This report cannot move those, and re-auditing daily will not either. **The next audit is worth running after the branch-protection call, not before it.**

---

## 3. Overall score

# **7.5 / 10**

The codebase is healthier than the pipeline that ships it. Every gate this project wrote for itself is green or honestly red; the problem remains that almost none of them are allowed to stop a merge.

---

## 4. Score per domain

| #   | Domain                             | Score | One-line justification                                                                                                                       |
| --- | ---------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Security posture                   | **9** | RLS 37/37, PBKDF2 600k, per-request nonce, `server-only` guard; `internal/*` dumps deleted and `base-uri`/`form-action` set (#525)           |
| 2   | Secrets hygiene                    | **9** | `gitleaks` required on both branches, clean scan, all Actions SHA-pinned, `check:env-example` verifies both directions                       |
| 3   | CI                                 | **6** | openapi-diff now gates `recette` and sees the whole spec (#525); still only `gitleaks` + `build` required, and E2E is vacuous-green          |
| 4   | Correctness & tests                | **9** | 5632 pass / 0 fail, coverage 85/79/88/86 over 70/60/70/70; knip now reports **0 unused production dependencies** — the #525 cleanup held     |
| 5   | Deploy coherence                   | **6** | Docs and migration hygiene excellent; `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` still missing, breaking prod data sync                          |
| 6   | Ferry pipeline                     | **8** | Config parses, `base=target=recette` matches doctrine, pins SHA                                                                              |
| 7   | Architecture & boundaries          | **8** | Three-layer API now holds for 33/34 routes — only `keys/issue` bypasses it; `user-event` declared; dead browser-client chain left on purpose |
| 8   | AFRIK data integrity & Source Tier | **7** | 35/35 checks, 0 errors, **both FR28 bands clean**; validator still enforces the _retired_ numeric tier policy, and `source_kind` is 0/5149   |
| 9   | Performance & accessibility        | **5** | axe-core green after #523 (0/402 stories, 15/15 routes); Lighthouse still red — perf on 11 URLs, a11y on 2, TBT, LCP                         |
| 10  | Docs & runbooks                    | **8** | CLAUDE.md and DEPLOYMENT.md match reality; the restore drill is 13.5 months old                                                              |

**Mean: 7.5 / 10**

---

## 5. Strengths

These are worth stating plainly, because they are unusual:

- **RLS coverage is total.** 37 tables, 37 with RLS enabled, 37 with at least one policy. The read-only-by-design tables say so in a migration comment (`019_afrik_rls.sql`) rather than leaving a reader to guess. Three separate greps during this audit _appeared_ to find uncovered tables; all three were regex artifacts (column-aligned whitespace, quoted multi-word policy names, multi-line `CREATE POLICY`). The coverage is real.
- **The FR28 demographic burn-down is finished.** Both the hard band [95,105] and the doctrinal band [99,101] measure zero offenders, so both now fail the build.
- **API-key hashing is genuinely strong.** PBKDF2-SHA256 at 600,000 iterations with a self-describing `pbkdf2v1:{iterations}:{salt}:{hash}` format, so the cost parameter can be raised without invalidating existing keys.
- **`import "server-only"` in `src/lib/supabase/admin.ts`.** The file's own comment records that a prose comment used to stand there and "stopped nothing". The guard is now enforced by the compiler.
- **Nothing is hardcoded that an operator would need to change.** Rate limits, windows, quiz confidence, CORS origin and every Supabase/Upstash/Sentry endpoint are env-driven. Cache TTLs are named module constants documented against the AR18 cache classes. **Zero P0 hardcoded values.**
- **The gates are written by someone who has been burned.** `SOFT_CHECK_NAMES` declares advisory checks in exactly one place; `afrikSyncTarget.ts` refuses if the production target resolves to recette; migration `041` explains why `tier` and `source_kind` multiply rather than branch. The comments record tradeoffs, not narration.
- **The test suite keeps growing and stays green.** 5632 passing across 529 files, zero failing, plus 501 charter-contract assertions. The previously-known `migrateAfrikToDatabase` mock failures are gone rather than quarantined.
- **Supply chain**: every third-party Action SHA-pinned, Dependabot bumping them, 0 high/critical CVEs.

---

## 6. Gaps and risks

### Domain 1 — Security

- **P1 — still open.** `src/middleware.ts:54-56` — every public localized page (`/fr` and everything under it, i.e. the entire public site) gets `style-src 'self' 'unsafe-inline'` plus `style-src-attr 'unsafe-inline'`. The scoping and the follow-up note are good practice; the weakening still covers 100% of the user-facing surface. `script-src` correctly stays nonce-only (`'unsafe-eval'` is dev-only). **This is the only open security finding in the report.**
- **✅ Closed by #525 — unauthenticated table dumps.** The previous revision carried a P1 against `src/app/api/v2/internal/{peoples,countries,language-families}/route.ts`, which returned whole tables unpaginated behind the same-origin bypass. Commit `b908201a` deleted the routes outright; `src/app/api/v2/internal/` no longer exists. Verified this pass.
- **✅ Closed by #525 — missing CSP directives.** The previous revision carried a P2 for an absent `base-uri` and `form-action`. Both are now set to `'self'` at `src/middleware.ts:64-65`, with a comment recording that neither falls back to `default-src`. Verified this pass.

### Domain 3 — CI

- **P0** **Branch protection requires only `gitleaks` and `build`** on `recette` (`strict: true`, `enforce_admins: true`, `required_approving_review_count: 0`). Data Integrity, Editorial Rules, A11y, Lighthouse, E2E and OpenAPI-diff run on every PR and gate nothing. Everything else in this report about "enforced" rules is conditional on this.
- **P1** **Red checks keep merging into `recette`.** #520 merged on 2026-08-29 with both `Lighthouse` and `axe-core` failing; axe has since gone green, but **`Lighthouse` has now failed on three consecutive runs — `fix/audit-hardening`, `docs/audit-round-2` and `fix/mobile-text-centring` (#527) — and all three merged.** The last of them is the current head of the integration branch. This is the P0 above expressed as a habit rather than a setting.
- **P1** `.github/workflows/e2e.yml` is still **vacuous-green** — the run reports `pass` in 39 seconds because `TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY` / `TEST_SUPABASE_SERVICE_ROLE_KEY` are absent from repository secrets. It reports success without executing a single spec.
- **P2** **`npm run typecheck` means different things depending on what is on disk.** `tsconfig.json` includes `.next/types/**/*.ts`, which only exists after a build, so `tsc --noEmit` covers Next's generated route validator only when a build preceded it. Run against a _stale_ `.next` it fails with 15 `TS2307` errors naming routes that no longer exist — observed this audit, and enough to make a local `make check` red for reasons unrelated to the source.
  - **Correction (2026-08-29, post-merge):** an earlier revision graded this **P1** and claimed route types are "never checked in CI". That overstated it. `next.config.ts` sets no `typescript.ignoreBuildErrors`, so `next build` runs its own type check on every PR and the route types _are_ gated — by the build step rather than by `tsc`. The real defect is narrower and local: a developer-experience trap, not a CI gate hole. Action #7 was withdrawn accordingly.
- **✅ Closed by #525 — `openapi-diff` scope.** The previous revision carried a P1 that the workflow triggered only on `pull_request: branches: [main]`, leaving a breaking API change undiffed until the release PR. It now triggers on `[main, recette]` (`.github/workflows/openapi-diff.yml:8-9`), with the reasoning recorded in the file. Verified this pass; it ran green on #527.
- **P2** `required_approving_review_count: 0` on both branches. Defensible for a solo developer; worth a conscious decision rather than a default.

### Domain 5 — Deploy coherence

- **P0** **`PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` is not in the repository secrets.** Confirmed by `gh secret list`: `PRODUCTION_SUPABASE_URL` and `PRODUCTION_REVALIDATE_SECRET` are present, its companion is not. `production-data-sync.yml` is written to fail rather than skip when it is absent.
- **P1** `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY` are absent — the cause of the E2E finding above.
- **P1** Production migrations remain manual by design, but `docs/runbooks/migration-state.md` records applied state for recette only. Nothing in-repo evidences that `043`–`047` reached the production project, and the two-step rollout rule means "applied and called done" has already happened here.
- **P2** `migrate-recette.yml:60` carries `continue-on-error: true`. It is the **only** workflow in the repo that does; every domain-critical gate is non-advisory.
- **P2 — new this pass.** `npm run build` rewrites the **tracked** file `next-env.d.ts`, flipping its import between `./.next/dev/types/routes.d.ts` and `./.next/types/routes.d.ts` depending on whether `dev` or `build` ran last. The committed copy holds the `dev` variant, so a production build always leaves the tree dirty and a `dev` run silently reverts it. Harmless in itself, but it puts a tracked file into the same class as the build artefacts, and it means "clean tree" cannot be used as a release precondition without first knowing which command ran.

### Domain 7 — Architecture & boundaries

- **P2** One `/api/v2` route bypasses the mandated route → handler → service split and reaches the query layer directly: `keys/issue`. **33 of 34 routes honour it** — the three `internal/*` offenders were deleted with the routes themselves in #525, so what was a four-route pattern is now a single exception. Downgraded from P1 accordingly.
- **✅ Closed by #525 — undeclared `@testing-library/user-event`.** It is now declared at `package.json:121` (`^14.5.2`). Verified this pass.
  - **Correction (2026-08-29, post-merge), retained:** an earlier revision also listed `esbuild` here. That was wrong. `scripts/axis-graph-bundle-size.ts:1` states outright that esbuild is _intentionally_ undeclared, with the reasoning in `scripts/quiz-bundle-size.ts` — it is a transitive dependency of vite/vitest and resolves after `npm ci`. Declaring it would contradict a deliberate, documented decision.
- **P1** **The documented browser Supabase client is dead.** `CLAUDE.md` describes three clients that are "never interchangeable", but `src/lib/supabase/client.ts` has exactly one importer — `src/lib/flags-client.ts` — which in turn is referenced only by tests (one of which asserts it is _not_ statically imported). The shipped app uses `server.ts` and `admin.ts` only. The invariant is sound; the third client is a two-file dead chain.
- **P2** 4.85% duplicated lines (731 clones, 9886 lines) — moderate, improved from 5.69%, no single hotspot severe enough to name.
- **Clean:** OpenAPI coverage is complete. Re-counted this pass against the post-#525 route set: **31 of 34** routes carry `@swagger` JSDoc consumed by `swaggerJsdoc({ apis: [...] })`, and the remaining 3 — `reference-library/`, `reference-library/assertions/`, `reference-library/assets/` — are described by the static `paths` object. The previous revision's "31 of 37, remaining 3 are `internal/*`" was arithmetic carried over from before those routes were deleted.

### Domain 8 — AFRIK data integrity

- **P1** 1063 sources at `needs_review` across 469 fiches. The ratchet in `scripts/ci/checkSourceTierCoverage.ts` is pinned at exactly 1063: it forbids growth but does not drive descent. Contrast FR28, whose burn-down was actually completed and whose band now blocks.
- **P1** 1190 sources carry no URL and therefore cannot be tiered from the catalogue.
- **P1 — new this pass. The `source_kind` axis has no data in the corpus.** `CLAUDE.md` and migration `031` define provenance as an axis orthogonal to authority: `tier` says how much authority a source carries, `source_kind` says what kind of thing it is, and `recompute_confidence()` **multiplies** them (`unverified` 0.4 × `ai_generated` 0.5 = 0.2, reproducing the retired `ai-enriched` weight exactly). The doctrine further requires the UI to drive its AI-provenance marker "by `source_kind`, never by the tier".

  Measured across all 886 fiches: **0 of 5149 source entries carry a `source_kind` key** (nor a `sourceKind`). The column exists, the constraint exists, the confidence formula reads it and the UI contract depends on it — but no fiche supplies it, so it is `NULL` for every row the loader writes. Consequence: the multiplier is always 1.0, and **the AI-provenance marker can never fire from corpus data**. Any AI-assisted text already in the fiches is therefore indistinguishable from human-written text of the same tier, which is precisely the distinction the doctrine was written to preserve.

  This is not a validator bug — the validator does not check `source_kind` — and it is not visible from the database, where a `NULL` provenance is legal. It only shows up by counting the corpus. Like the `needs_review` tail, it belongs to the spec process rather than to a cleanup commit: someone has to decide whether the AFRIK models require the field, and the strict models in `public/modele-source.json` are the place that decision lands.

- **P1** **The validator still enforces the retired numeric tier policy, which is why the corpus cannot leave it.** 37 source entries across 19 fiches carry `"tier": 1|2`. Migrating them with migration `041`'s own mapping (`1 → official`, `2 → referenced`) was attempted during this audit and **reverted**: it takes `validateAfrikData.ts` from 35/35 to **31/35 with 36 errors**, across `FR80`, `CR4`, `REL-5` and `FR57-source`.

  The gate requires the old vocabulary outright — `scripts/validateAfrikData.ts:1875`, `:2292`, `:2463`, `:2478`, `:2739` all test `tier === 1 || tier === 2` — and two sites go further and encode the retired _doctrine_: `:1882` and `:2485` demand `tier === 2 && /wikipedia/i.test(notes)`, i.e. the rule that a Tier-2 source must record the Wikipedia cross-check that surfaced it. `CLAUDE.md` explicitly supersedes that rule.

  So this is not a data cleanup. Porting the validator decides what every future fiche is allowed to cite, and it is the reason the corpus and the database speak two vocabularies. It belongs in the spec process and the `afrik-curator` skill, with its own REQ/DEC, not in an audit follow-up. The revert is verified: 35/35, 0 errors.

- **P1** 7 relation fiches cite `"unknown"` as the source domain (`REL_RELIGIOUS_*`, `REL_MIGRATORY_*`). Under the current doctrine these publish at `unverified`, which reads as provenance where there is none.
- **P2** FR52-coverage remains the single advisory check (`SOFT_CHECK_NAMES`), with 23 families reporting unlinked peoples — `FLG_NIGERCONGO` 0 linked / 179 unlinked, `FLG_BANTU` 8 / 166, `FLG_CREOLE` 0 / 20.

### Domain 9 — Performance & accessibility

**Partially closed on 2026-08-29 by PR #523** (`d695cf8c`). What that PR fixed, and what it did not, is recorded here rather than edited out — the difference is the interesting part.

- **✅ Fixed — axe-core is now green**, for the first time: 0 violations across 402 stories _and_ all 15 live routes. Two defects, both a colour that is correct in isolation and broken by context:
  - `--country-terracotta` (`#b64e27`) used as **text** on the fiche's warm ground `#f5ede0` — **4.39:1**. It clears AA on the page parchment (4.79) and on a card (5.11), which is why it survived every spot-check. Now split into a fill token and a `--country-terracotta-ink` mixed for type (5.71 / 6.22 / 6.64).
  - `.home-dyk-chip-kind` fading `--accent-ink` with `opacity: 0.72`, which composites the glyph toward the card and took ocre from 6.41:1 to **3.45:1**. This was the _only_ blocking violation — story violations warn, live-route violations fail — and it arrived the same day, with the anecdote work.
- **P1 — Lighthouse is still red.** Measured on the post-fix run (18 URLs, 3 runs each): `categories.performance` fails on **11**, `total-blocking-time` on **5**, `largest-contentful-paint` on **3**.

  **Where it is, measured.** Read out of the run's own LHR rather than guessed at. The three assembled fiches are the floor — `/fr/explorer/pays/SEN` **0.49**, `/fr/explorer/peuples/PPL_WOLOF` **0.52**, `/fr/explorer/familles/FLG_BANTU` **0.49** — with `/fr/explorer` at **0.63**. Several routes miss by a hair and would move for far less work: `/fr/explorer/pays` 0.84, `/fr/explorer/recherche` 0.84, `/fr/comprendre/noms` 0.83.

  For `SEN`: FCP 1.6 s, **LCP 5.6 s**, **TBT 3040 ms**, TTI 8.9 s, CLS 0. Main-thread time is **4371 ms of "Other"** against just 814 ms of script evaluation, and **a single 12 KB chunk** produces about thirteen long tasks of 270–734 ms — 3962 ms of bootup from a file that does not reach the top ten by size. The LCP element is the `AtlasTargetPicker` button inside `AtlasGlobe`, **88% of it render delay**. The document is **471 KB**.

  A 12 KB script burning four seconds is a computation over a large structure, not parsing. The obvious suspect is that all three fiche pages import `AtlasGlobe` **statically**, while both hubs use `dynamic(…, { ssr: false })` — but `AFRICA_ADMIN0` is imported by the _familles_ page and `familyFootprintRanking.ts`, not by the country fiche, so the hypothesis is **not confirmed** and no refactor was attempted on it. Naming that chunk needs source maps in the Lighthouse job, or a local run with Supabase credentials. This is recorded as a diagnosis, deliberately not as a fix.

- **P1 — `categories.accessibility` still fails on 2 URLs**, down from 4: `/fr/explorer` at **0.96** and `/fr/comprendre/migrations` at **0.98**, both deterministic across three runs.
- **The two a11y gates audit different route sets and disagree.** `/fr/comprendre/migrations` **passes axe and fails Lighthouse**; `/fr/explorer` is not in `a11yRoutes.ts` at all, so axe has never looked at it. A green axe run is therefore not evidence that Lighthouse's `accessibility = 1.0` holds, and the residual 0.96/0.98 is invisible to the gate most people read. Reconciling the two route lists is the cheap next step.
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

**Re-measured this pass, and the picture has changed substantially.** `knip` now reports **zero unused production dependencies** — the ~20-component shadcn pocket and its 18 production dependencies are gone, as are the V1 orphans. Verified by direct `ls`: `src/lib/api/openapi.ts`, `src/components/LanguageSelector.tsx`, `src/App.css`, `src/components/family/Family*Section.tsx` and `src/components/layout/MobileMenu.tsx` no longer exist. The #525 cleanup held.

What remains:

- **P1** `src/lib/supabase/client.ts` → `src/lib/flags-client.ts` — the dead browser-client chain described under Domain 7 (counted once, there). Both files still exist; `client.ts` has exactly one importer and `flags-client.ts` has none outside tests. This is the last of the previous revision's P1 dead code, and it was left deliberately.
- **P2** 4 genuinely-unused devDependencies, verified individually rather than trusted from the tool: `@eslint/js`, `@vitejs/plugin-react`, `@tailwindcss/typography`, `baseline-browser-mapping`. The other 7 knip named are false positives — `typescript-eslint`, `globals`, `eslint-plugin-react-hooks`, `marked` and `puppeteer` all have real consumers (`eslint.config.mjs`, `vitest.config.ts`, `scripts/ci/checkMigrationState.ts`, `.lighthouserc.js`).
- **P2** 30 unused files, of which the large majority are legitimate entry points knip cannot see without config: `e2e/` fixtures and factories, one-shot `scripts/` (`convertAfrikToJson.ts`, `testLoader.ts`, `loadPeopleProvenance.ts`), asset generators (`src/lib/atlas/assets/generate-*.mjs`) and the design-mockup build (`docs/design/mockups/build.js`). The genuine orphans are `src/api/v2/schemas/games.ts` and the `src/components/{compare,names,relations}/index.ts` barrels.
- **P2** 257 unused exports / 205 unused exported types / **108 named+default duplicate exports**.
- **Clean:** no surviving V1 imports (`entityKeys`, `entityTranslations`, `datasetLoader.server`, `types/ethnicity`) — the V1 removal held.

**Method note.** `knip`'s largest block (108 entries) is _Duplicate exports_ — symbols exported both named and default — not dead code. Read as "unused", it would have condemned `AutonymExonymHeading`, which a custom ESLint rule (`afh/no-bare-people-name`) _mandates_ using. Its "unused files" list likewise counts `e2e/`, `scripts/` and mockup entry points that have no knip config. Only findings verified by direct reference-grep are listed above.

---

## 7. Consumer / new-contributor flow

| Step                                      | Status | Evidence                                                                                                                         |
| ----------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `git clone` + `npm ci --legacy-peer-deps` | ✅     | documented in CLAUDE.md; the peer-dep conflict is intentional and explained                                                      |
| `.env.example` → `.env.local`             | ✅     | `check:env-example` passes, verified both directions                                                                             |
| migrations apply in order                 | ✅     | `check:migration-files` — 47 files, no duplicate prefix, no hole                                                                 |
| corpus load                               | ✅     | `scripts/migrateAfrikToDatabase.ts` + `docs/runbooks/afrik-data-sync.md`                                                         |
| first admin seeded                        | ✅     | `scripts/seedAdmin.ts`, documents its own prerequisite                                                                           |
| `npm run dev`                             | ✅     | build passes clean                                                                                                               |
| `/api/v2/*` returns data                  | ⚠️     | requires real Supabase credentials; no local fixture path                                                                        |
| `/docs/api` renders                       | ✅     | route present in the build manifest                                                                                              |
| `/admin` gated by RBAC                    | ✅     | `src/middleware.ts` admin block, reading `contributor_profiles.moderator_role` — **not** `user_roles`. See the correction below. |

One friction point (`⚠️`): a contributor with no Supabase project cannot exercise the API locally. Everything else is a single documented command.

**Correction (2026-08-30).** The `/admin` row above was wrong in both halves, and the error mattered because it read as reassurance.

- The middleware reads **`contributor_profiles.moderator_role`** (`none | editor | senior_editor | admin`), not `user_roles`. A user who is `moderator` in `user_roles` opens no door: that table is read in two files, `contributor` is assigned on the auth callback and never checked, and `advisor` is enforced nowhere at all. Three role models coexist — `user_roles`, `moderator_role`, and `api_keys.tier` — and they do not interoperate. `docs/design/moderation-charter.md` §7 records this as unsettled.
- Until 2026-08-30 the route tree it guarded was **empty**: `src/app/[lang]/admin/` held only `connexion/page.tsx`, so a successful moderator sign-in redirected into a 404. `/fr/admin` now exists and lists the reports awaiting a decision.

The audit also never said that the **write** path was dead. Every report button in the product was a disabled shell, because the Turnstile site key was declared without the `NEXT_PUBLIC_` prefix and no page supplied one — so `/fr/signalements` could only ever be empty or seeded, and no moderator screen existed to empty it. Both halves are fixed on `feat/signalement-en-deux-clics`; what remains open is listed in the charter's §7.

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
| `base-uri` / `form-action`       | ✅     | both `'self'` (`src/middleware.ts:64-65`), set by #525                                           |
| Rate limiting                    | ✅     | Upstash Redis, per-tier sliding windows (ip / public / partner), fully env-tunable               |
| Sentry                           | ✅     | EU DSN enforced by a **throwing** `assertEuDsn`, PII scrubber in `beforeSend`, 10% prod sampling |
| Secrets in tree                  | ✅     | only `.env.example` and `e2e/.env.example` tracked; pattern scan clean                           |
| Secret scanning in CI            | ✅     | `gitleaks` is a **required** check (scans the working tree, `--no-git`)                          |
| Supply chain                     | ✅     | every third-party Action SHA-pinned; Dependabot weekly; 4 moderate / 0 high / 0 critical CVEs    |
| Unauthenticated dumps            | ✅     | the `internal/*` routes were deleted in #525; `src/app/api/v2/internal/` no longer exists        |

---

## 9. Performance & accessibility posture

Budgets are configured exactly as the charter requires and are **not** advisory:

- `categories:performance` ≥ **0.85** — currently failing on multiple routes
- `categories:accessibility` = **1.0** — currently failing
- `categories:best-practices` ≥ **0.95**
- `total-blocking-time` ≤ **300 ms** — currently failing on multiple routes
- 18 URLs, 57 runs, one URL per route family.

`a11y.yml` runs axe-core over Storybook at 430px / 720px / 1200px on `pull_request` into `recette` and `main` plus `push` to `main`, with no `continue-on-error`.

**axe-core currently reports no violations** — 0 across 402 stories and all 15 live routes, green on #527. The SERIOUS `color-contrast` failure on `People/FicheSections — Fiche entière` that the previous revision recorded here was fixed by PR #523; the two defects behind it are written up under Domain 9 above, because the way they hid from every spot-check is the reusable part.

What remains is the disagreement between the two gates: Lighthouse still scores `accessibility` below 1.0 on two routes that axe either passes or never visits. A green axe run is not evidence that the charter's `accessibility = 1.0` holds.

E2E (`e2e.yml`) is correctly written but **executes nothing** for want of `TEST_SUPABASE_*` secrets.

---

## 10. AFRIK data integrity & Source Tier compliance

| #   | Check                               | Verdict | Evidence                                                                                                                               |
| --- | ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Strict model adherence              | ✅      | 9 `public/modele-*.json` present; validator's structural checks (CR5, REL-1/3/4/7, FR55-iso) all pass                                  |
| 2   | Validator run                       | ✅      | 35/35 checks, **0 errors**, 4008 warnings                                                                                              |
|     | — FR28 hard gate [95,105]           | ✅      | **0 offenders** — blocking                                                                                                             |
|     | — FR28-strict [99,101]              | ✅      | **0 offenders** — blocking; the burn-down is complete                                                                                  |
| 3   | FLG / PPL / ISO consistency         | ✅      | FR26, FR27, FR29, FR52, FR53-ref all pass; no orphan fiches                                                                            |
| 4   | Source Tier compliance              | ⚠️      | No forbidden citations under current doctrine; **1063 `needs_review`**, 1190 without URL, 37 legacy numeric tiers, **0 `source_kind`** |
| 5   | Database vs source-JSON consistency | N/A     | the validator does not cover this, and a live DB read is out of scope for this audit — recorded as a gap, not asserted                 |
| 6   | CI enforcement                      | ⚠️      | `data-integrity.yml` and `editorial-rules.yml` are correctly configured and non-advisory, but **not required** by branch protection    |
| 7   | Known-issues carry-over             | ✅      | the duplicate-fiche and FLG-mismatch items from the 2026-04-13 audit no longer reproduce; FR27 and FR26 both pass                      |

**Verdict: sound, with a stalled burn-down and a missing axis.** The editorial contract — every claim published _with_ its provenance, nothing suppressed, nothing unmarked — holds. Every fiche has sources; none is empty; no claim publishes unlabelled. Three things have not happened: the `needs_review` tail has not descended, the corpus still speaks two tier vocabularies where the database speaks one, and **the `source_kind` provenance axis is empty across all 5149 source entries**, so the tier × provenance product the doctrine specifies collapses to tier alone.

**A note on counting.** This pass initially read 14 numeric-tier entries against the previous revision's 37 and was about to file a correction. The previous figure was right: 23 of the 37 sit in _nested_ source arrays (migration events, relations, name records) rather than under `content.sources`, so a scan restricted to the top-level path undercounts by more than half. Recorded because the same narrow scan would understate any future corpus measurement, `source_kind` included — the 0/5149 figure above was therefore taken with a full-path scan.

---

## 11. Prioritized action list

| #      | Action                                                                                                                                                                                           | Sev | Domain |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ------ |
| 1      | Add `Data Integrity`, `Editorial Rules`, `A11y`, `Lighthouse`, `E2E` to required checks on `recette` and `main`                                                                                  | P0  | 3      |
| ~~2~~  | ~~Fix the SERIOUS `color-contrast` on `People/FicheSections`~~ — **done** (PR #523): axe-core green, 0/402 stories, 15/15 routes                                                                 | ✅  | 9      |
| 3      | Add `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` to repository secrets                                                                                                                                 | P0  | 5      |
| 4      | Add `TEST_SUPABASE_URL` / `_ANON_KEY` / `_SERVICE_ROLE_KEY` so E2E stops reporting vacuous green                                                                                                 | P1  | 3      |
| 5      | Bring `performance` ≥ 0.85 (11 URLs), `total-blocking-time` ≤ 300 ms (5) and `largest-contentful-paint` (3) inside budget                                                                        | P1  | 9      |
| ~~6~~  | ~~Paginate or authenticate `internal/*`~~ — **done** (#525): deleted; they had no callers                                                                                                        | ✅  | 1      |
| ~~7~~  | ~~Move `npm run typecheck` after `npm run build`~~ — **withdrawn**: `next build` already type-checks, so CI was never blind here                                                                 | —   | 3      |
| 8      | Drive the `needs_review` ratchet down from 1063 (and set a descending schedule, as FR28 had)                                                                                                     | P1  | 8      |
| 9      | **Port `validateAfrikData.ts` off the retired tier policy first**, then migrate the 37 numeric values. Blocked, and a doctrine decision — see Domain 8                                           | P1  | 8      |
| ~~10~~ | ~~Declare `@testing-library/user-event`~~ — **done** (#525). `esbuild` stays undeclared on purpose, see Domain 7                                                                                 | ✅  | 7      |
| ~~11~~ | ~~Extend `openapi-diff.yml` to `recette`~~ — **done** (#525), plus a baseline fix: it was blind to 31 of 34 paths                                                                                | ✅  | 3      |
| 12     | Run a restore drill and replace the 13.5-month-old record                                                                                                                                        | P1  | 10     |
| ~~13~~ | ~~Delete the ~20 unused shadcn components and their 18 production dependencies~~ — **done** (#525)                                                                                               | ✅  | 4/7    |
| ~~14~~ | ~~Remove the dead V1/orphan files~~ — **done** (#525). `supabase/client.ts` → `flags-client.ts` left in place on purpose                                                                         | ✅  | 4      |
| ~~15~~ | ~~Add `base-uri 'self'` and `form-action 'self'` to the CSP~~ — **done** (#525)                                                                                                                  | ✅  | 1      |
| 16     | Reconcile `a11yRoutes.ts` with `.lighthouserc.js`: `/fr/explorer` (0.96) is audited by Lighthouse and never by axe                                                                               | P1  | 9      |
| 17     | Close the residual Lighthouse a11y on `/fr/explorer` (0.96) and `/fr/comprendre/migrations` (0.98)                                                                                               | P1  | 9      |
| 18     | **Decide whether the AFRIK source model requires `source_kind`**, then backfill it. 0 of 5149 entries carry it, so the AI-provenance marker is dead — spec decision, `public/modele-source.json` | P1  | 8      |
| 19     | Stop `npm run build` dirtying the tracked `next-env.d.ts` (gitignore it, or commit the build variant)                                                                                            | P2  | 5      |
| 20     | Remove the 4 genuinely-unused devDependencies (`@eslint/js`, `@vitejs/plugin-react`, `@tailwindcss/typography`, `baseline-browser-mapping`)                                                      | P2  | 4      |
| 18     | Emit source maps in the Lighthouse job so a bootup-dominating chunk can be named — the blocker on action 5                                                                                       | P1  | 9      |

**Arithmetic of closing the gap.** Eight actions are now done, taking the mean 7.0 → 7.1 → **7.5**: #2 (contrast), #6, #10, #11, #13, #14, #15, and the baseline half of #11.

What is left splits cleanly by who can do it.

**Needs the owner, worth ~1.3 of the remaining 1.3:**

- **#1 branch protection** — a governance decision. Sequence it _after_ the budgets are green, or it stops every merge. Domain 3 → ~9.
- **#3 `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY`** — a secret. Domain 5 → ~9.
- **#4 `TEST_SUPABASE_*`** — secrets. Ends the vacuous-green E2E.

**Needs measurement first:** #5 and #18 (performance; the diagnosis is in Domain 9 and the blocker is naming one chunk), #17 and #16 (the residual a11y, on routes the two gates disagree about).

**Needs a doctrine decision:** #9, and #8 behind it — the corpus cannot leave the retired tier vocabulary while the validator enforces it.

Those three secrets-and-settings items alone are worth roughly **+0.7**; the measurement work is another **+0.4**. The ceiling for an agent working alone on this repo, without secrets or branch-protection rights, is about **7.7**.

**Order matters for action 1.** Making the gates required while Lighthouse is red would stop every merge. Actions 5 and 17 come first, then 1.

---

## 12. Conclusion

EthniAfrica's engineering substance is well above its shipping discipline. The data-plane security is complete and, in places, better than the bar this rubric sets — 600k PBKDF2 iterations, a compiler-enforced service-role boundary, total RLS coverage. The editorial machinery does what the decolonial posture requires: it publishes the claim _and_ its provenance, and it finished the FR28 burn-down it set for itself, which is the hardest kind of quality work to actually complete.

The gap between 7.5 and 9.0 is not craft. It is that the project has built ten gates and wired two of them to the door. The single highest-leverage change in this document is a branch-protection setting — sequenced after the budgets are green, or it stops every merge.

Acting on this report is itself evidence for that reading. PR #523 closed the contrast defects in an afternoon: the fix was one token split and one deleted `opacity` line. The defects were not hard, and they were not hidden — axe had been naming them on every PR for weeks. Nothing was missing except a gate with the authority to insist.

**And the pattern repeated while this revision was being written.** Lighthouse has now failed on three consecutive runs — `fix/audit-hardening`, `docs/audit-round-2`, `fix/mobile-text-centring` — and all three merged into `recette`. One of them was the commit that closed this report's own security findings. A gate that names a real regression on every PR and is overruled every time is not a gate; it is a log.

**On the value of this pass.** The score did not move, and saying so plainly is the finding. What did emerge is worth the run: §6 and §8 were still describing four defects that #525 had already fixed, while §4 had already credited the fixes — a report drifting into disagreement with itself within a day, which is exactly how a stale audit starts telling a reader that resolved problems are open. Those are now marked closed with the evidence. Re-auditing daily produces this kind of bookkeeping, not insight; the next run belongs after a blocker actually moves.

Two cautions for the next audit. First, tools lie in this repo's shape, and they lied again this pass. Greps appeared to find missing RLS policies (aligned whitespace, quoted multi-word policy names, multi-line `CREATE POLICY` — all three recurred); knip appeared to find 108 unused exports that were named-plus-default pairs and 11 unused devDependencies of which only 4 are real; and a corpus scan restricted to `content.sources` undercounted the legacy numeric tiers by more than half, nearly producing a "correction" to a figure that was already right. Two findings in the first revision of this document — `esbuild`, and the typecheck ordering — were wrong and are corrected in place above rather than deleted. Where this report says a gap exists, it was confirmed by reading the file; where it was wrong, the correction is left visible.

Second, a green gate is not a green surface. axe-core passes on 15 routes and Lighthouse still scores `/fr/explorer` at 0.96 — a route axe has never been pointed at. The two a11y gates disagree because they audit different lists, and the one most people read is the one that says everything is fine.

Third — and this is the new one — **a gap that no gate is looking for is invisible to every gate.** `source_kind` is empty across all 5149 source entries, and nothing anywhere goes red: the validator does not check it, the database accepts `NULL`, `recompute_confidence()` multiplies by 1.0 without complaint, and the UI simply never renders a marker. The doctrine is written, the schema is built, the formula is correct, and the field has no data. It surfaced only by counting the corpus directly. Where a project encodes doctrine across code, schema and content, the content is the layer with no compiler — and it is the layer this project's entire editorial claim rests on.
