# EthniAfrica — Production Readiness Audit

**Date:** 2026-09-03
**Branch:** `recette` @ `9ac1bcf6` · **Version:** 4.0.0 · **Tree:** clean at audit start
**Method:** read-only. No source modified, no migration run, no external service written.

---

## 1. Scope and method

Gates run locally on this tree, in full: `lint`, `typecheck`, `format:check`,
`test:coverage`, `build`, `lint:req`, `check:jira-template`, `check:action-pins`,
`check:workflow-shell`, `check:env-example`, `check:migration-files`,
`test:charter-contracts`, `openapi:diff`, `check:dead`, `validateAfrikData.ts`,
`checkEditorialRules.ts`.

Additional scans: `knip`, `ts-prune`, `jscpd`, `npm audit`; RLS coverage derived from the
migration corpus by replaying every `CREATE TABLE` / `DROP TABLE` / `ENABLE ROW LEVEL
SECURITY` / `CREATE POLICY` in file order; a full structural walk of the **1 712** active
fiche JSON files counting `tier` inside every `sources[]` array at any nesting depth; and
live CI evidence read through `gh` across the last 12 runs of each workflow.

**Not run / not verifiable this revision**, marked N/A rather than scored:

- `check:migration-state` — refuses to report without database credentials. Correct design,
  not a defect.
- DB-vs-JSON row consistency — no database credentials used, per this audit's read-only rule.
- `.env.example` could not be read directly (denied by this environment's permission
  settings). Its completeness is therefore asserted on the repo's own `check:env-example`
  gate, which passes **in both directions**: 41 env references across 1 688 files, all
  documented in `.env.example`, and every entry there is read by code.
- The state of `/srv/ethniafrica/.env` on the OVH host — no SSH from an audit.
- Live Lighthouse or API probes. This audit scores configuration, budgets and recorded CI
  evidence, never live measurement.

### A correction to the method itself

Two of this audit's own greps were wrong on the first pass, and both are worth recording
because each produced a **false alarm** that a less careful run would have published:

- `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY` was matched with a single-space pattern.
  `019_afrik_rls.sql` aligns its statements in columns, so the five AFRIK tables read as
  _RLS absent_ — a fabricated P0 against the most important tables in the product. They are
  covered.
- `Strict-Transport-Security` was matched on one line. `src/middleware.ts:63` splits the
  `.set(` call across lines, so HSTS read as missing. It is present, with
  `max-age=31536000; includeSubDomains; preload`.

A grep that returns nothing is evidence of nothing until the pattern has been proven against
a known positive.

### A note on this audit's own instructions

Three claims in the audit skill are stale against the repository and were **not** followed;
each is filed as a Domain 10 finding rather than silently obeyed:

- It describes the retired **Tier 1/2/3** policy with "Tier 3 forbidden". CLAUDE.md's Source
  Tier Policy explicitly supersedes it with `official` / `referenced` / `unverified`, under
  which nothing is forbidden and everything is labelled. The corpus is audited against the
  **current** doctrine.
- It states "the deploy model is Vercel-from-git — there is no GitHub deploy workflow."
  Production is a GitHub Release triggering `deploy-production.yml` against an OVH VPS.
- It warns of "known pre-existing failures in `migrateAfrikToDatabase.test.ts`". There are
  none; the suite is at 0 failures.

---

## 2. The five canonical questions

### 1. Is the project ready for production?

**Conditional — one P0 is open, and it is operational, not a defect in the application.**

The application code is in good shape and the editorial corpus is the strongest it has been
in this document's history. What is broken is the pipe between them.

**P0 — the AFRIK corpus can no longer load into recette.** `Recette AFRIK Data Sync` has
failed **four consecutive times** (2026-09-02 at 17:43, 18:33, 20:00 and 22:39; two further
runs cancelled). The job exits 1, and the consequence is stated in its own summary line:

```
"patronymes":{"total":777,"inserted":0}
```

Git holds 780 patronyme fiches. The recette database received **none** of them on any of
those runs. The corpus in git and the corpus being served have diverged, and the failure
reads in the Actions list as an ordinary red check rather than as a frozen database.

Five loader errors, two distinct defects:

```
PAT_BORICO.countries[1].countryId: ESP does not exist
PAT_BORICO.spellings[1].attestations[1].countryId: ESP does not exist
PAT_KHUMALO.sources: conflicting source "The Morphological Analysis of Zulu Clan Names" …
PAT_NCHAMA.sources: conflicting source "La cultura para el reconocimiento de la identidad…"
PAT_ZUMA.sources:   conflicting source "The Morphological Analysis of Zulu Clan Names" …
```

- **`ESP` is not a registered country.** Spain is referenced by a patronyme fiche but has no
  country record, so foreign-key resolution fails. Registering a country takes two records,
  not one.
- **One source title, two localisers.** The loader de-duplicates sources by title; the same
  work cited from two fiches with a differing URL, tier or provenance aborts the batch.
  `PAT_KHUMALO` and `PAT_ZUMA` both cite _The Morphological Analysis of Zulu Clan Names_ —
  that single shared title freezes the entire patronyme load, all 777 of them.

**The finding that matters is that no gate catches this.** `validateAfrikData.ts` reports
**0 errors across 42/42 checks** on precisely the corpus the loader rejects. The validator
models the fiche schema; the loader _additionally_ enforces referential integrity against
registered countries, and a one-locator-per-title uniqueness rule, neither of which the
validator models. **A fiche can pass every gate in CI and still be unloadable.** That gap —
not the two fiches — is the thing to fix.

Nothing else rises to P0. There is no open security hole, the production build is green, and
the corpus's editorial contract holds.

### 2. Is the AFRIK editorial surface sound?

**Yes. This is the strongest domain in the product, and it is not close.**

| Check                                | Result                                                |
| ------------------------------------ | ----------------------------------------------------- |
| `validateAfrikData.ts`               | **42/42 controls, 0 errors**, 5 433 warnings          |
| **FR28 hard gate** [95, 105] %       | **0 offenders**                                       |
| **FR28-strict** target [99, 101] %   | **0 offenders** — the burn-down is genuinely finished |
| Source entries carrying a `tier`     | **6 756 / 6 756 — zero untiered**                     |
| Fiches with an empty `sources` block | **0**                                                 |
| Wikipedia cited as a source itself   | **0**                                                 |
| `checkEditorialRules.ts`             | 0 errors, 2 warnings                                  |
| Active fiches                        | 1 712 (archive excluded)                              |

Both demographic bands sit at zero. CLAUDE.md claims the FR28-strict burn-down is finished
and that both bands now fail the build; that claim is **true and verified**, not aspirational.

The tier gate is the one that matters under this project's doctrine, and it is perfect: every
one of 6 756 source entries, at every nesting depth — `content.sources[]`,
`names[].sources[]`, `origin.sources[]`, `content.historicalAffiliation.sources[]` — carries
an explicit tier. That is the actual contract, _nothing is forbidden, everything is
labelled_, and it holds without a single exception.

Two things that look like findings and are not:

- **81 fiches cite blogs or social media.** Under the current Source Tier Policy these are
  legitimate at `unverified` (weight 0.4) and publish behind a visible **Non vérifiée**
  badge. Suppressing them would itself be the colonial filter the doctrine exists to refuse.
  500 fiches additionally carry `source_kind: ai_generated`, which multiplies to 0.2 — the
  provenance axis working exactly as designed, orthogonally to authority.
- **5 410 of the 5 433 warnings are the tier catalogue speaking**, in two shapes: ~3 700
  _"publishes at tier unverified"_ (a statement of fact about a correctly labelled source)
  and ~1 684 _"carries no URL, so it cannot be tiered from the catalogue"_ — those entries
  still carry an explicit tier in the fiche, they simply cannot be auto-corroborated against
  the catalogue. Neither shape is a defect, and a reader would be worse served if either
  were "fixed".

The two genuine editorial warnings are `PPL_MANDE_DU_SUD` and `PPL_KIRDI`, both lacking an
autonym at `confidence=missing` — below the threshold that makes it an error, and both are
exonym-only classifications where the autonym is the open research question rather than an
oversight.

**The caveat that stops this being a clean yes:** the corpus is sound _in git_. Because of
the P0 above, the corpus _being served_ is behind it.

### 3. Can a new contributor go clone → running in one session?

**Yes, with one undocumented trap and one blocked step.**

| Step                          | Verdict                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `npm ci --legacy-peer-deps`   | ✅ intentional (Storybook `react-vite` vs Next 16)         |
| `.env.example` → `.env.local` | ✅ complete both directions (41 refs, gate-verified)       |
| Migrations apply in order     | ✅ 81 files, no duplicate version, no hole in the sequence |
| `migrateAfrikToDatabase.ts`   | ❌ **fails on the current corpus** — see the P0            |
| First admin seeded            | ✅ `scripts/seedAdmin.ts`, `scripts/seedAdminAllowlist.ts` |
| `npm run dev` boots           | ✅ production build green, 0 type errors                   |
| `/api/v2/*` return data       | ⚠️ contingent on a successful corpus load                  |
| `/docs/api` renders           | ✅ route present in the build manifest                     |
| `/admin` gated by RBAC        | ✅ Supabase Auth + `user_roles`                            |

**The trap: `npm run typecheck` is red on any clone that ran `npm run dev` first.** It
reports 11 × `TS2307` against `.next/types/validator.ts`, every one pointing at a
contribution route that migration `081` removed. These are stale _generated_ types, not
source errors — `tsc --noEmit` against a pruned `.next` exits **0**. A newcomer sees a red
gate that CI, building fresh, never sees.

Compounding it, `next build` rewrites the **tracked** file `next-env.d.ts`, swapping
`./.next/dev/types/…` for `./.next/types/…`, so running the build dirties the working tree
by itself. Neither behaviour is documented anywhere.

### 4. What is the security posture?

**Strong. The best-scoring domain, with one architectural blemish.**

- **RLS: every table covered, zero open doors.** 51 tables are created across the migration
  corpus and 10 subsequently dropped; **all 51 carry `ENABLE ROW LEVEL SECURITY`**. Five live
  tables hold RLS with _no_ policy — `admin_allowlist`, `flag_reporter_contacts`,
  `antibot_challenges`, `search_query_log` — and each carries an explicit comment saying why:
  _"Deliberately no policy: RLS enabled with none denies every role but service_role. Adding
  a public SELECT here would publish the moderator roster."_ That is deny-all by
  construction, and it is the correct exposure for a moderator roster and a reader's email
  address. **No table is open.**
- **CSP nonce is per-request** — `btoa(crypto.randomUUID())` at `src/middleware.ts:453`, not
  a constant.
- **Headers**: HSTS `max-age=31536000; includeSubDomains; preload` (`:63`), `nosniff`
  (`:67`), `Referrer-Policy: strict-origin-when-cross-origin` (`:68`), CSP carrying
  `frame-ancestors 'self'` (`:85`) and `base-uri 'self'` (`:91`).
- **API keys**: PBKDF2-SHA256 at **600 000 iterations** — six times the 100k bar — with a
  16-byte random salt and a self-describing hash format; raw keys are never stored
  (`src/lib/api/auth.ts:15,16,53`).
- **Rate limiting is real and fails closed.** Upstash Redis sliding window, per tier
  (ip / public / partner). A missing env var returns 500 in production rather than silently
  disabling the limiter (`src/lib/api/rate-limit.ts:171-177`) — deliberate, and commented as
  such.
- **Service-role isolation holds.** `src/lib/supabase/admin.ts` carries the `server-only`
  guard, and the browser-bundle import scan returns **nothing**. The browser data client is
  genuinely gone; `auth-client.ts` remains and authenticates without querying.
- **Sentry**: EU residency enforced _in code_ — `assertEuDsn` rejects any DSN not ending
  `ingest.de.sentry.io` — with the `beforeSend` PII scrubber wired on client, server and edge.
- **Secrets**: only `.env.example` and `e2e/.env.example` are tracked. The pattern scan over
  tracked files returns exactly one hit, verified a **false positive**: a base64 path segment
  inside a Ugandan parliament URL in `PAT_BABIRYE.json`. `gitleaks` is a required check.
- **Supply chain**: every third-party Action is SHA-pinned (`check:action-pins` green, and
  all seven Ferry workflows agree on one pin). `npm audit` reports **9 moderate, 0 high,
  0 critical**.

**The blemish:** `src/app/api/v2/keys/issue/route.ts:50` calls `createAdminClient()` and
queries `api_keys` directly, skipping the handler → service layering every other v2 route
observes. It is the API-key _issuance_ path — the single route where that shortcut is least
appropriate. Counted once, in Domain 7.

### 5. Is the score close to 8–9/10?

**No — 6.4/10, down from 7.6.**

The drop is not a regression in the code. Tests grew from 6 668 to 7 384 with zero failures,
coverage rose, security held at 9, and the corpus reached zero untiered sources. The drop is
that **three of this project's quality gates have stopped producing signal**, and this
revision verified their green rather than trusting it:

1. **E2E is a vacuous green.** `TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY` are not
   configured, so every substantive step is skipped by
   `if: steps.secrets.outputs.present == 'true'`. The run log carries the notice verbatim.
   **17 spec files have never executed in CI**, and the check reports success on every PR.
2. **Lighthouse is red on every PR and blocks nothing.** 7 of the last 7 runs failed, and it
   is not a required check.
3. **The two domain-critical gates do not gate.** `Data Integrity Gate` and `Editorial Rules
Gate` run on every PR and are correctly _not_ `continue-on-error` — but neither is in the
   required-checks list, which is exactly five: `gitleaks`, `build`, `validate`,
   `openapi-diff`, `axe-core (Storybook)`. A PR that reddens the editorial contract is
   mergeable.

A gate that cannot fail is worse than no gate, because it is budgeted for as though it works.

**Top 3 actions to close the distance** — all three are gate-integrity work, not features:

1. Fix the corpus load (register `ESP`; give the shared source title a single locator) **and
   add the loader's two invariants to `validateAfrikData.ts`**, so the validator stops
   passing corpora the loader rejects. Clears the P0; lifts Domains 5 and 8.
2. Configure the two `TEST_SUPABASE_*` repository secrets and repair the Lighthouse
   collection timeout. Turns two dead gates into live ones; lifts Domain 9 from 3 on its own.
3. Add `Data Integrity Gate`, `Editorial Rules Gate` and `Lighthouse CI` to the required
   checks on `recette` and `main`. Lifts Domain 3.

Executed, those three put the project at roughly **8.1**.

---

## 3. Overall score

**6.4 / 10** — down from 7.6, on gate integrity rather than code quality. The application and
the corpus are both in their best recorded state; what regressed is the project's ability to
_know_ that, because the corpus can no longer reach its database and three gates report
success without testing anything.

---

## 4. Score per domain

| #   | Domain                             | Score | Basis                                                                                       |
| --- | ---------------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| 1   | Security posture                   | **9** | 51/51 tables RLS, zero open; per-request nonce; PBKDF2 600k; HSTS; Sentry EU + PII scrub    |
| 2   | Secrets hygiene                    | **8** | Tracked files clean; sole scan hit a verified false positive; gitleaks required             |
| 3   | CI                                 | **7** | All gates present and green, one legitimate `continue-on-error`; but only 5 checks required |
| 4   | Correctness & tests                | **7** | 7 384 pass / 0 fail; coverage 85.9/79.5/89.5/86.8 vs 70/60/70/70; −2 dead code              |
| 5   | Deploy coherence                   | **5** | DEPLOYMENT.md accurate, 81 files clean; ledger 13 short; −2 hardcoded (5 P0)                |
| 6   | Ferry pipeline                     | **8** | Config coherent with branch model; 7 workflows on one SHA; board state unverified           |
| 7   | Architecture & boundaries          | **5** | Three-layer holds but for `keys/issue`; −2 hardcoded, −2 dead code; 4.56 % duplication      |
| 8   | AFRIK data integrity & Source Tier | **6** | 42/42, 0 errors, 0/6 756 untiered, FR28 both bands at 0 — but corpus cannot reach the DB    |
| 9   | Performance & accessibility        | **3** | axe-core green and required; Lighthouse red 7/7 and unenforced; e2e vacuously green         |
| 10  | Docs & runbooks                    | **6** | Deploy docs accurate; restore drill 13.7 months old; ledger and CLAUDE.md both stale        |

Mean = **6.4**.

**Cross-domain harmonisation.** Defects were assigned one canonical severity before the mean
was computed:

- The **corpus-load failure** is counted once, in Domain 8 (the corpus cannot reach the
  database it serves, and the validator does not model the loader's invariants), and
  referenced from Domain 5 without re-penalising.
- **Lighthouse** is counted once, in Domain 9, and referenced from Domain 3.
- The **`keys/issue` boundary break** is counted once, in Domain 7, and referenced from
  Domain 1.
- `src/lib/rights/protected-asset-access.ts` surfaced in **both** Step 3.5 (hardcoded TTL)
  and Step 3.7 (174 lines, no importer). The dead-code finding subsumes it: a hardcoded
  constant in an unreachable file is one defect, not two.

---

## 5. Strengths

- **The editorial contract is fully enforced.** 6 756 source entries, zero untiered, zero
  empty `sources` blocks, zero Wikipedia-as-source citations. Both FR28 bands at zero
  offenders — a burn-down that previous revisions tracked as outstanding is genuinely done.
- **Security is comprehensively built, not bolted on.** Per-request nonces, PBKDF2 at 600k,
  RLS on every table with deny-all documented where it is intended, EU data residency
  asserted in code rather than in a runbook, and rate limiting that fails closed _on purpose_
  with a comment explaining why failing open would be worse.
- **Test depth is real.** 7 384 tests across 725 files, zero failures, no quarantine
  directory, coverage 15–20 points above every threshold, and a 689-test charter-contract
  suite that pins design decisions the code alone could not defend.
- **The repo's bespoke gates work.** `lint:req`, `check:env-example`, `check:action-pins`,
  `check:workflow-shell`, `check:migration-files` all pass and all check something real —
  `check:env-example` in particular verifies the env surface _bidirectionally_, which is the
  half most projects skip.
- **The deploy documentation matches the deploy reality**, including the details that are
  easy to get wrong: Release-triggered, OVH Gravelines, `git.deploymentEnabled: false`.

---

## 6. Gaps and risks

### The corpus cannot reach its database (Domains 8, 5) — P0

Covered in full under question 1. Four consecutive `Recette AFRIK Data Sync` failures;
777 patronymes, 0 inserted; two fixable fiche defects and one structural gap — the validator
passes corpora the loader rejects.

### Three gates report success without testing anything (Domains 9, 3) — P1

- **E2E**: `e2e.yml:53` gates every real step on `TEST_SUPABASE_URL` /
  `TEST_SUPABASE_ANON_KEY`. They are unset. The last run emitted
  `##[notice]Skipping Playwright E2E …` and concluded **success**. 17 spec files, never run.
- **Lighthouse**: fails 7/7 recent runs — and **not on a score assertion**. The run completes
  3 passes on `/`, then dies with `TimeoutError: Navigation timeout of 30000 ms exceeded` at
  `scripts/lighthouse-setup.cjs:5`, where `page.goto(url, { waitUntil: "networkidle0" })`
  never settles on the next URL. `lhci`'s collect step aborts the whole run on the first URL
  that fails to load, so **every route after the first is unmeasured**. `.lighthouserc.js`
  warns about exactly this failure mode in a comment — _"an unmeasured route is a budget
  nobody enforces"_ — and it has recurred.
- **`openapi:diff` is vacuously green locally**: it cannot fetch the `main` baseline and exits
  0 with "No baseline available". In CI it _is_ a required check and does fetch the baseline,
  so this is a local-only false green — but it means the gate cannot be trusted from a
  developer's terminal.

### The domain-critical gates are not required checks (Domain 3) — P1

Required on `recette`: `gitleaks`, `build`, `validate`, `openapi-diff`,
`axe-core (Storybook)`. **Not** required: `Data Integrity Gate`, `Editorial Rules Gate`,
`Lighthouse CI`, `E2E — Playwright`. For a product whose thesis is its editorial contract,
the editorial gate not blocking a merge is the wrong default. `strict: false` additionally
means a branch need not be current with `recette` before merging.

### Hardcoded values (P0/P1)

Verified by reading each file. Paths repo-relative.

**Hardcoded URLs**

- **P0** `src/middleware.ts:93` — `https://supabase.ethniafrica.com` — the production
  Supabase host is baked into the CSP `connect-src`; any self-hosted, branch or staging
  Supabase domain is silently blocked by the browser.
- **P1** `src/app/providers.tsx:42` — `https://plausible.io/js/script.js` — bypasses
  `buildPlausibleSrc()`, so `NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN` is ignored.

**Rate-limit & quota thresholds**

- **P0** `src/lib/ratelimit/flagRateLimit.ts:30` — `Ratelimit.slidingWindow(10, "1 h")` —
  flag-submission hourly quota inlined with no env override, unlike `lib/api/rate-limit.ts`
  which reads `RATE_LIMIT_*`.
- **P0** `src/lib/ratelimit/flagRateLimit.ts:35` — `Ratelimit.slidingWindow(30, "24 h")` —
  same, daily.
- **P1** `src/lib/antibot/proofOfWork.ts:23` — `DEFAULT_DIFFICULTY_BITS = 20` — proof-of-work
  cost borne by the reader's device; env-overridable, but this fallback is what deploys.

**Timeouts / durations**

- **P0** `src/lib/supabase/requestDeadline.ts:24` — `SUPABASE_REQUEST_TIMEOUT_MS = 10_000` —
  every server-side Supabase request deadline, not env-configurable; a slower region needs a
  different value.
- **P1** `:43` — `SUPABASE_BATCH_REQUEST_TIMEOUT_MS = 120_000` — the corpus-loader deadline,
  already widened once, so demonstrably deployment-tuned.
- **P1** `src/lib/antibot/proofOfWork.ts:24` — `DEFAULT_TTL_MS = 5 * 60 * 1000`.
- **P1** `src/lib/flags/reporterContact.ts:14` — `VERIFICATION_TTL_MS = 24 h` — email
  verification link lifetime.
- **P1** `src/lib/api/auth.ts:15` — `PBKDF2_ITERATIONS = 600_000` — correct for security, but
  it is also a per-request CPU cost with no env knob.

**Confidence & scoring thresholds (AFRIK)**

- **P0** `src/lib/quiz/eligibility.ts:58` — `DEFAULT_QUIZ_MIN_CONFIDENCE = 60` — the cutoff
  deciding whether a corpus fact may be served as a quiz answer. Env-overridable, but the
  deployed default is this literal and it is calibrated against a measured corpus median
  (0.68) that will drift as the corpus grows.
- **P1** `src/lib/quiz/eligibility.ts:103` — `"official" | "referenced"` — the source-tier
  allowlist gating a quiz answer, inlined rather than derived from the tier enum.
- **P1** `src/lib/quiz/quizScope.ts:94,96` — `FACILE_QUANTILE = 0.1` /
  `DIFFICILE_QUANTILE = 0.7`.
- **P1** `src/components/country/PeoplesSection.tsx:151` — `if (declared >= 99) return null`
  — a coverage-warning threshold silently duplicating the validator's `[99, 101]` band. The
  two can drift apart.

**Cache TTLs & pagination** — the widest class by count.

- **P1** `s-maxage=3600` re-declared as a local `CACHE_CONTROL` across ~12 v2 route files;
  `s-maxage=86400, immutable` across 4 more; `revalidate = 3600` duplicated verbatim in 6
  fiche page files and 4 `unstable_cache` call sites. There is no shared TTL module.
- **P1** `src/api/v2/utils/validation.ts:22,23,26,27` — `max: number = 100` and `return 20` —
  the public API's page-size ceiling and default as bare literals in the shared validator,
  with a third independent copy of the default at `src/lib/afrikLoader.ts:47`.
- **P1** `src/api/v2/services/languagesFacet.ts:82` — `LANGUAGE_ROSTER_SIZE = 900`, a
  single-shot read sized against a 748-language corpus. **Crossing 900 truncates silently**
  with no guard — a latent correctness bug, not merely a tuning constant.
- **P1** `src/api/v2/services/sourceCitations.ts:53` — `ASSERTION_SCAN_LIMIT = 500` — a
  heavily-cited source is under-reported.
- **P1** `src/lib/supabase/queries/flags/publicFlagsPageQuery.ts:110` — `MAX_PAGE_SIZE = 50`,
  duplicated as a literal in `src/app/[lang]/signalements/actions.ts:50,51`.

**Size & truncation**

- **P1** `src/components/flags/FlagForm.tsx:163,171` — `length < 10 || length > 2000`,
  duplicating `src/api/v2/handlers/flags.ts:88`'s
  `z.string().trim().min(10).max(2000)`. A change on one side desyncs form from API.

Two categories came back **clean**: _Retry & Backoff_ (the codebase has no retry logic;
React Query is `retry: false`) and _Hardcoded Roles / Tiers_ (admin authorization is
table-driven through `admin_allowlist`, and every literal tier string checked sits inside the
sanctioned enums).

**Totals: P0 = 5 · P1 = 27 · P2 = 19.** Above the ≥4 P0 threshold, so **−2 on Domains 5 and
7**.

### Dead code & redundancy (Domains 4, 7) — P1

`npm run check:dead` is **green and sitting exactly on every ceiling**:

```
files 0/0 · dependencies 0/0 · devDependencies 0/0 · unlisted 0/0
binaries 0/0 · unresolved 0/0 · exports 24/24 · types 50/50 · duplicates 0/0
```

**But the gate is structurally blind to the largest category of dead code in this repo.**
`knip.json` treats test files as entry points, so a production module whose only importer is
its own `__tests__` counts as _used_. The `files` tally can therefore never leave 0 for that
class — and roughly **4 500 lines of unreachable production code** sit behind it.

Clean results worth recording: **zero surviving V1 imports** (`entityKeys`,
`entityTranslations`, `datasetLoader.server`, `types/ethnicity` — no hits), **zero unused npm
dependencies**, and **no orphan file under `src/app/`**. There is no P0 here.

Largest orphans (no production importer):

- **P1** `src/components/home/AccessAxes.tsx` — 748 lines. `[lang]/page.tsx` renders only
  `HomeHero` + `DidYouKnow`; verified directly.
- **P1** `src/components/oral-narratives/OralNarrativeForms.tsx` — 552 lines.
- **P1** `src/components/system/HierarchyTree.tsx` — 471 lines.
- **P1** `src/components/charts/DemographicsChart.tsx` — 374 lines.
- **P1** `src/components/colonization/{BorderCrossingTable,GazeEventNarrativeSection,ImposedNameList}.tsx`
  — 328 lines across three components, none mounted by any page.
- **P1** `src/components/system/CitationBlock.tsx` — 288 lines.
- **P1** `src/lib/games/projectionContrast.ts` — 280 lines.
- **P1** `src/components/admin/RevisionPublishDialog.tsx` (264 lines) with
  `src/lib/revisions/publishRevision.ts` (151 lines) — the revision-publish surface is built
  but not mounted.
- **P1** `src/lib/rights/protected-asset-access.ts` — 174 lines, no importer anywhere.
- **P1** `src/api/v2/services/personService.ts` — a service with no handler above it; the
  only such orphan in `src/api`.
- **P1** `src/lib/cache/clientCache.ts` — `getCachedData` / `setCachedData` / `clearCache` all
  dead; only `CACHE_KEYS` is imported, so ~150 of 195 lines are unreachable.
- **P1** `src/lib/home/synthesisRailData.ts:51` — `loadSynthesisRail` has no caller, and
  `home.test.tsx:211` **asserts that it is never called**. The test documents the deadness
  rather than the behaviour.
- **P1** `src/lib/afrik/loaders/{country,family,people}JsonLoader.ts` — three `clear*Cache`
  exports with no caller, including from tests.

Duplication: jscpd reports 867 exact clones over 11 648 duplicated lines (**4.56 %**) across
1 456 files; 196 clones survive excluding tests, fixtures and stories. The widest families
are a 17–18-line CORS/`OPTIONS`/error-envelope block cloned across 14 v2 route files, and a
35-line load/validate/cache block identical across three AFRIK loaders.

Two candidates were cleared as **false positives — do not delete**:
`src/lib/sentry/pii-scrubber.ts` (imported by the three root `sentry.*.config.ts`) and
`src/workers/proofOfWork.worker.ts` (loaded via `new URL(...)` in `ProofOfWorkGate.tsx:63`).

**Totals: P0 = 0 · P1 = 26 · P2 = 6.** Above the >15 P1 threshold, so **−2 on Domains 4 and
7**.

### The `keys/issue` route bypasses its own service layer (Domain 7) — P1

`src/app/api/v2/keys/issue/route.ts:50` calls `createAdminClient()` and queries `api_keys`
directly at lines 54 and 79. It is the only production route in `src/app/api/v2/` that
imports a Supabase client — every other route goes route → handler → service. That a
`personService.ts` exists with no handler above it, while this route reaches past the pattern
entirely, suggests the layering is applied by habit rather than enforced. No lint rule
guards it.

### Developer-experience traps (Domain 4) — P2

- `npm run typecheck` red on a stale `.next` (11 × TS2307 against removed contribution
  routes); clean `tsc --noEmit` exits 0.
- `next build` dirties the tracked `next-env.d.ts`.
- 35 `TODO` / `FIXME` / `XXX` / `HACK` markers across `src` and `scripts`.
- 78 lint warnings, 0 errors. Stray `console.*` calls: **none in the enforced zones** —
  `src/lib/api/logger.ts` is the only match and is the intended sink.

---

## 7. Consumer / new-contributor flow

Walked in question 3 above. One blocked step (`migrateAfrikToDatabase.ts`, the P0), one
undocumented trap (stale-`.next` typecheck), everything else clean. The two seed scripts
exist, the migration sequence is unbroken, and the env surface is gate-verified in both
directions.

The single highest-value documentation fix is a `docs/runbooks/` note — or a line in
`CLAUDE.md` — recording that a red `typecheck` after `npm run dev` means a stale `.next`, not
broken source. It costs one paragraph and saves a newcomer an afternoon.

---

## 8. Security posture

Detailed in question 4. Summary of the RLS data plane:

| Table group                          | RLS | Policies               | Posture                          |
| ------------------------------------ | --- | ---------------------- | -------------------------------- |
| `afrik_*` (5 corpus tables)          | ✅  | 1 × public SELECT each | public read, service-role writes |
| `afrik_people_relations`             | ✅  | public SELECT          | idem                             |
| `admin_allowlist`                    | ✅  | **none, deliberately** | deny-all but service_role        |
| `flag_reporter_contacts`             | ✅  | **none, deliberately** | deny-all — reader addresses      |
| `antibot_challenges`                 | ✅  | **none, deliberately** | deny-all                         |
| `search_query_log`                   | ✅  | **none, deliberately** | deny-all                         |
| `user_roles`, `api_keys`, `flags`, … | ✅  | scoped policies        | RBAC-gated                       |
| 10 dropped V1 tables                 | n/a | n/a                    | removed from the schema          |

**No `RLS = No` row exists.** Every deny-all is annotated in its migration with the reasoning,
which is the difference between a deliberate posture and an oversight that happens to be safe.

Residual risks, none blocking:

- `ANTIBOT_HMAC_SECRET` fails **closed**: unset, `GET /api/v2/antibot/challenge` answers 503
  and every report dialog dies on "la vérification n'a pas abouti" while the build stays
  green (`src/api/v2/handlers/antibot.ts:52`). Its provisioning on the OVH host cannot be
  verified from an audit; it is a deploy-time precondition worth a runbook check.
- `UPSTASH_REDIS_REST_*` likewise mandatory in production — rate limiting fails closed, so
  without them every `/api/v2/*` answers 500 while pages render fine.
- 9 moderate `npm audit` advisories, 0 high, 0 critical.

---

## 9. Performance & accessibility posture

**Score 3 — the weakest domain, and the one whose repair is cheapest.**

- `.lighthouserc.js` declares the right budgets: `performance ≥ 0.85`,
  `accessibility = 1.0`, `best-practices ≥ 0.95`, mobile, over a deliberately curated route
  list with one representative route per charter route-family.
- **Those budgets are not being evaluated.** The collect step dies on a navigation timeout at
  the second URL, so every route after the first goes unmeasured, and the workflow is not a
  required check, so the red merges. The config file's own comment predicted this exact
  failure and it recurred.
- **axe-core is the one gate here that works**: green, and required on `recette` and `main`.
- **E2E covers a real user path in 17 spec files, none of which have run.**

Mobile-first breakpoints (mobile 430 px, tablet `md` 720 px, desktop `xl` 800 px) are
respected in the token layer and asserted by the charter-contract suite, which is green.

---

## 10. AFRIK data integrity & Source Tier compliance

The seven checks, with verdicts:

1. **Strict model adherence** — ✅ 16 `public/modele-*.json` present; the fiche corpus
   validates against them through 42 controls with 0 errors.
2. **Validator run** — ✅ 42/42, 0 errors. **FR28 hard gate [95,105] %: 0 offenders.
   FR28-strict [99,101] %: 0 offenders.** Reported separately, as required; the burn-down is
   complete and both bands now fail the build.
3. **FLG / PPL / ISO consistency** — ✅ covered by `FR52 Classification-tree integrity`,
   `FR53-ref`, `REL-2` and the orphan-fiche check, all passing. The `FR52-coverage`
   people-to-language warnings (23 families with unlinked peoples, e.g. `FLG_NIGERCONGO`
   0/180) remain advisory via `SOFT_CHECK_NAMES` — a known coverage backlog, not a
   referential break.
4. **Source Tier compliance** — ✅ **6 756 / 6 756 entries tiered; 0 untiered; 0 empty
   `sources` blocks; 0 Wikipedia-as-source.** Audited against the _current_ three-value
   doctrine, not the retired Tier 1/2/3 policy the audit skill still describes.
5. **Database vs source-JSON consistency** — ❌ **fails.** The corpus does not reach the
   database at all; see the P0. This is the domain's one hard failure.
6. **CI enforcement** — ⚠️ partial. `data-integrity.yml` and `editorial-rules.yml` both run on
   `pull_request` into `main` and `recette` (plus a nightly cron) and neither is
   `continue-on-error`. But neither is a **required** check, so a red one does not block.
7. **Known-issues carry-over** — no `data_quality_status.md` in the memory directory; the
   `FR52-coverage` backlog above is the standing known issue.

**Verdict: one hard failure (5) and one partial (6) → Domain 8 scores 6.** No Tier-3-class
citation exists and no fiche sits outside the FR28 hard gate, so the skill's cap-at-4
condition does not apply.

The editorial contract itself is in excellent shape. What fails is delivery.

---

## 11. Prioritized action list

| #   | Action                                                                                                                        | Sev | Domain |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | --- | ------ |
| 1   | Register `ESP` as a country (both records) so `PAT_BORICO` resolves                                                           | P0  | 8      |
| 2   | Give _The Morphological Analysis of Zulu Clan Names_ one locator across `PAT_KHUMALO`/`PAT_ZUMA`; same for `PAT_NCHAMA`       | P0  | 8      |
| 3   | **Add the loader's two invariants to `validateAfrikData.ts`** — country-reference resolution and one-locator-per-source-title | P0  | 8, 3   |
| 4   | Configure `TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY` so Playwright actually runs                                          | P1  | 9      |
| 5   | Fix the Lighthouse navigation timeout in `scripts/lighthouse-setup.cjs`; consider `networkidle2`                              | P1  | 9      |
| 6   | Add `Data Integrity Gate`, `Editorial Rules Gate`, `Lighthouse CI` to required checks on `recette`/`main`                     | P1  | 3      |
| 7   | Move the production Supabase host out of the CSP literal (`src/middleware.ts:93`) into env                                    | P0  | 1, 7   |
| 8   | Give `flagRateLimit.ts` the same `RATE_LIMIT_*` env treatment as `lib/api/rate-limit.ts`                                      | P0  | 7      |
| 9   | Make `SUPABASE_REQUEST_TIMEOUT_MS` env-configurable                                                                           | P0  | 7      |
| 10  | Guard `LANGUAGE_ROSTER_SIZE = 900` against silent truncation (748 languages today)                                            | P1  | 7      |
| 11  | Extract one shared cache-TTL module; collapse the ~22 duplicated `s-maxage` / `revalidate` literals                           | P1  | 7      |
| 12  | Delete or mount the ~4 500 lines of orphaned production modules, starting with `AccessAxes.tsx` (748 lines)                   | P1  | 4, 7   |
| 13  | Stop `knip.json` counting test files as entry points, so the dead-code gate can see this class                                | P1  | 4      |
| 14  | Route `keys/issue` through a handler + service like every other v2 route                                                      | P1  | 7      |
| 15  | Run a restore drill (last: 2025-07-14, **13.7 months**); record the 13 unlogged migrations in the ledger                      | P1  | 10     |

---

## 12. Conclusion

EthniAfrica's application code and editorial corpus are both in the best state this document
has recorded. Security scores 9 on substance rather than checklist compliance — RLS on every
table with each deny-all annotated, PBKDF2 at six times the recommended cost, EU residency
asserted in code, and a rate limiter that deliberately fails closed. The corpus reached the
milestone previous revisions were tracking: **6 756 source entries, none untiered, and both
FR28 demographic bands at zero offenders.** For a project whose whole thesis is that a claim
travels with its provenance, that is the number that matters, and it is perfect.

The score fell anyway, from 7.6 to 6.4, and the reason is worth stating plainly: **this
project's instruments have drifted out of agreement with the thing they measure.** The corpus
validates cleanly and cannot load. Playwright reports success across 17 specs it has never
executed. Lighthouse has been red for a day and blocks nothing, having died before it
measured anything. The dead-code gate sits precisely on every ceiling while 4 500 lines of
unreachable production code hide behind an entry-point rule. And the two gates that enforce
the editorial contract — the product's actual differentiator — are not required checks.

None of these is a large piece of work. Items 1–6 are a day, and they would take the project
to roughly 8.1. The important one is item 3: the two fiche defects are trivia, but a
validator that passes corpora the loader rejects will produce this same outage again, under a
different fiche, at a less convenient hour. Fix the instrument, not just the reading.

The one thing to resist is treating the 5 433 validator warnings as a backlog. They are the
tier system describing itself — sources correctly labelled `unverified`, entries that cannot
be auto-corroborated against a catalogue. Under this project's doctrine, publishing the claim
with its provenance is the intended outcome. Silencing them would mean deleting exactly the
oral, community and amateur knowledge the decolonial posture exists to keep.
