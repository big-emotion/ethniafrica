# EthniAfrica — Production Readiness Audit

**Date:** 2026-09-01
**Branch audited:** `main` @ `8f2b47ff` (v4.0.0). Previous revision audited `recette` @ `0f73b973` earlier the same day.
**Method:** read-only. Every repo gate executed locally against this tree after a clean `npm ci`; CI evidence read from GitHub Actions; branch protection and the repository secret inventory read from the GitHub API. No external service was written to, no migration run, no live production probe.

> **A stale local install produced two false failures on the first pass, recorded here so
> the next run does not re-discover them as defects.** `node_modules` carried a hoisted
> `ajv@6.15.0` instead of the declared `^8.20.0`, and `ajv-formats` was not installed at
> all. That broke `src/app/api/v2/__tests__/contract.test.ts` and its `openapiValidator`
> helper, and produced 23 `tsc` errors — 20 of them from a stale `.next/types/validator.ts`
> still referencing routes ETNI-1555 removed. After `npm ci` and a fresh build, **both
> suites pass (108 tests) and `typecheck` reports zero errors.** All scores below are
> against the clean tree.

> **Two rubric corrections carried forward from the previous revision.** The audit skill's
> own rubric has drifted from the repository it audits; scoring against it unchanged would
> produce false findings.
>
> - Domain 5 asserts _"the deploy model is Vercel-from-git — there is no GitHub deploy
>   workflow"_. False since PR #656: production is self-hosted on OVH and deploys on a
>   published GitHub Release. Domain 5 is scored against the current model.
> - Step 3.6 imposes the **Tier 1/2/3** policy with Tier 3 forbidden. `CLAUDE.md`
>   superseded it with `official` / `referenced` / `unverified`, under which _nothing is
>   forbidden, everything is labelled_. Tier compliance is scored against the current
>   doctrine.
>
> A third rubric check remains a false positive: the service-role isolation grep flags
> `src/app/[lang]/compte/profil/actions.ts`, a `"use server"` Server Action whose module
> never reaches a browser bundle. The grep predates Server Actions.

---

## 1. Scope and method

Gates run locally on this exact tree, after `npm ci`: `lint`, `typecheck`,
`format:check`, `test:coverage`, `build`, `lint:req`, `check:jira-template`,
`check:action-pins`, `check:env-example`, `check:migration-files`,
`test:charter-contracts`, `validateAfrikData.ts`, `checkEditorialRules.ts`.

Additional scans: `knip`, `jscpd`, `npm audit`, RLS coverage derived from the migration
corpus, and the repository secret inventory.

**Not run / not verifiable this revision**, and marked N/A rather than scored:
`check:migration-state` (it refuses to report without database credentials — correct
design, not a defect); `ts-prune`; `e2e` locally; the state of `/srv/ethniafrica/.env` on
the OVH host (no SSH from an audit).

---

## 2. The five canonical questions

**1. Is the project ready for production?** **Conditional.** One blocker remains, and it
is operational rather than application code:

- **Migrations `063` onward cannot apply to any Postgres.** `063`, `065` and — landing
  after this audit's revision — `066` build a GIN index on
  `extensions.unaccent('extensions.unaccent'::regdictionary, …)`, which Postgres rejects
  with `ERROR: functions in index expression must be marked IMMUTABLE (SQLSTATE 42P17)`.
  The recette migration job has failed on this six consecutive times today. `064` is not
  itself defective but is queued behind `063`. Recette therefore runs code whose
  supporting schema was never applied (§6).

A second blocker — `recette` carrying no required status checks and allowing force pushes —
was **resolved while this audit was being written**, and the fix is verified against the
GraphQL API (§6, CI). The branch now requires the same five contexts as `main`, at
`strict: false`, with force pushes refused.

**2. Is the AFRIK editorial surface sound?** **Yes, with two labelled gaps.**
`validateAfrikData.ts` passes **38/38 checks, 0 errors**, 3 989 warnings across the
corpus; `checkEditorialRules.ts` reports **0 errors, 65 warnings**. FR28 passes on both the
hard band [95,105] and the strict band [99,101]. **Zero** fiches cite Wikipedia in a
`sources.url`, and **zero** carry an empty `sources` block. Against that: 19 files still
carry retired numeric tiers, and 1 031 sources sit on `needs_review`, a value the database
`CHECK` constraint does not accept. `data-integrity.yml` and `editorial-rules.yml` gate
pull requests and are **not** advisory.

**3. Can a new contributor go clone → running in one session?** **Yes, with one caveat.**
`.env.example` is complete and `check:env-example` verifies it against the code in both
directions. `.npmrc` sets `legacy-peer-deps`, so plain `npm ci` works. The caveat is the
step this revision cannot certify: **migrations do not apply cleanly on a fresh project** —
`063` fails, as above.

**4. What is the security posture?** **Strong.** **48 of 48 tables have RLS enabled — zero
open tables.** Per-request CSP nonce, HSTS, `X-Content-Type-Options`, `Referrer-Policy`.
API keys are PBKDF2-SHA256 at **600 000 iterations** with a 16-byte salt and a
self-describing hash; raw keys are never stored. Sentry asserts an EU DSN and scrubs PII in
`beforeSend`. Rate limiting fails **closed**. Every third-party Action is SHA-pinned. No
secret-shaped string exists in any tracked file. The residual is that the leaked recette
credentials cannot be _confirmed_ rotated (§6).

**5. Is the score close to 8–9/10?** **Not yet — 6.9/10**, up from 6.5 mid-session once
`recette`'s protection was restored. Three things close most of the remaining distance: fix
the three broken migrations so recette can catch up to its own code (+4 on Domain 5),
re-baseline or repair the Lighthouse performance budget (+4 on Domain 9), and record the
outcome of the credential rotation (+3 on Domain 2). That arithmetic lands at 8.0.

---

## 3. Overall score

**6.9 / 10** — the application code is in good shape and improves each revision; the
operational envelope around it is where the remaining blocker lives.

Scored 6.5 when the evidence was gathered. `recette`'s branch protection was restored
during the session, which moved Domain 3 from 4 to 8 and the mean from 6.5 to 6.9.

---

## 4. Score per domain

| #   | Domain                             | Score | Basis                                                                                  |
| --- | ---------------------------------- | ----- | -------------------------------------------------------------------------------------- |
| 1   | Security posture                   | **9** | 48/48 tables with RLS; per-request nonce; PBKDF2 600k; Sentry EU + PII scrub           |
| 2   | Secrets hygiene                    | **6** | Tracked files clean, secrets re-set today, but no completion record for the rotation   |
| 3   | CI                                 | **8** | Protection restored on `recette` mid-session; all Actions SHA-pinned; no advisory gate |
| 4   | Correctness & tests                | **8** | 6 367 tests pass, 0 failures; coverage 84.9/79.0/88.2/85.7 vs 70/60/70/70              |
| 5   | Deploy coherence                   | **4** | Migrations 063/065/066 cannot apply anywhere; recette is 3 behind its own merged code  |
| 6   | Ferry pipeline                     | **8** | `ferry.config.yaml` coherent with the branch model; Jira column names unverified       |
| 7   | Architecture & boundaries          | **8** | Three-layer v2 holds; no hardcoded external URLs; 4.83 % duplication                   |
| 8   | AFRIK data integrity & Source Tier | **7** | Validator 38/38 with 0 errors; 19 files still on retired numeric tiers                 |
| 9   | Performance & accessibility        | **4** | axe green, e2e green; Lighthouse fails perf on 12 assertions across 22 audited routes  |
| 10  | Docs & runbooks                    | **7** | Deploy docs current; restore drill 13.6 months old, exceeding the 12-month rule        |

Mean = **6.9** (6.5 before Domain 3 was fixed mid-session).

The broken migration is one defect that surfaces in three domains. It is counted fully in
Domain 5, which is where it is caused, and referenced from Domains 3 and 8 without
re-penalising them. The same applies to Lighthouse: it is counted in Domain 9, not again in
Domain 3.

---

## 5. Strengths

- **RLS coverage is complete.** All 48 tables created across the 65 migrations have
  `ENABLE ROW LEVEL SECURITY`. Tables with RLS and zero policies are deny-all — the correct
  fail-closed posture for server-written tables (`antibot_challenges`, `search_query_log`,
  `contributions`).
- **The full suite is green.** 6 367 tests pass, 21 skipped, **zero failures**, and
  `lint` / `typecheck` / `format:check` / `build` all pass. Coverage sits well above its
  declared thresholds: 84.86 % statements, 78.98 % branches, 88.21 % functions, 85.74 %
  lines against minimums of 70/60/70/70.
- **Rate limiting fails closed, deliberately** — `checkUpstashConfigured()` returns 500
  rather than serving unthrottled traffic (`src/lib/api/rate-limit.ts:177,199`).
- **API key hashing is strong and self-describing**: PBKDF2-SHA256, 600 000 iterations,
  16-byte salt (`src/lib/api/auth.ts:15,16`), format `pbkdf2v1:{iterations}:{salt}:{hash}`.
- **The repo's own gates are real gates, and they all pass**: `lint:req`,
  `check:action-pins`, `check:env-example`, `check:migration-files`,
  `check:jira-template`, `test:charter-contracts`.
- **The editorial contract holds where it matters most**: zero Wikipedia URLs cited as
  sources, zero empty `sources` blocks, FR28 passing on both bands.

---

## 6. Gaps and risks

### Migrations that cannot apply (Domain 5; visible in 3 and 8) — P0

**`063_afrik_search_trigram.sql` and `065_afrik_search_persons.sql` are rejected by
Postgres.** Both build a GIN trigram index over a raw two-argument unaccent call:

```sql
CREATE INDEX IF NOT EXISTS idx_afrik_peoples_name_main_trgm
  ON public.afrik_peoples
  USING gin (
    (extensions.unaccent('extensions.unaccent'::regdictionary, lower(name_main)))
    extensions.gin_trgm_ops
  );
```

`supabase/migrations/063_afrik_search_trigram.sql:57-63`, and the same shape at
`supabase/migrations/065_afrik_search_persons.sql:62-67`.

An index expression requires a function marked `IMMUTABLE` in the catalog, and
`unaccent(regdictionary, text)` is not. **Migration `052` already solved this**: it created
`public.afrik_unaccent(TEXT)`, explicitly `IMMUTABLE`, and its own `COMMENT` says it exists
to be _"usable inside a GENERATED column or an index expression"_
(`supabase/migrations/052_afrik_search_prefix_unaccent.sql:72-84`). Migration `065` uses
that wrapper correctly for its tsvector column (`:53`) and then bypasses it for the index
(`:65`).

Consequences:

- `Apply Migrations — Recette` has failed **six consecutive times** today, most recently at
  10:49. The failure is not the workflow — it is the SQL.
- **Recette is three migrations behind code already merged to depend on them.** The pg_trgm
  typo tolerance (#666), the patronyme dossier (#668) and the REQ-126 people search (#669)
  are on `main`; `063`, `064` and `065` are not on recette.
- Because `supabase db push` stops at the first failure, `064` — which is _not_ itself
  defective — is blocked behind `063`.

The fix is to call `public.afrik_unaccent(lower(…))` — in the index expression **and at
the matching call sites of the RPC**. `063` has five raw calls and zero wrapped ones
(`:54` index, then `:82`, `:105`, `:112`, `:122`); `065` has three raw against six wrapped
(`:65` index, then `:119`, `:134`). Fixing only the index line would let the migration
apply while leaving the index unusable: the planner matches an index by expression, so an
index built on the wrapper and a `WHERE` clause built on the raw call never meet, and the
query silently falls back to a sequential scan over `afrik_peoples`.

Note that `public.afrik_unaccent` applies `COALESCE(p_text, '')` where the raw call does
not. On the non-null `name_main` / `full_name` columns this is neutral, and the enclosing
`CASE` expressions already guard the blank query — but it should be checked rather than
assumed.

**These files were never applied anywhere, so they must be edited in place.** Adding a
corrective `067` would leave two dead migrations in the sequence; there is no ledger drift
to fear because no database ever executed them.

> **Addendum, after the audited revision.** `origin/recette` has since received
> `066_afrik_search_patronymes.sql` (REQ-135), which carries **the same defect** at
> `:127-131` — a trigram index over the raw `extensions.unaccent(…)`, alongside 14 correct
> uses of the wrapper elsewhere in the same file. The count is therefore **three
> migrations, not two**. That three independent authors reached for the raw call while the
> IMMUTABLE wrapper sat two files away suggests the wrapper is not discoverable enough:
> `052`'s `COMMENT` explains it, but nothing at the point of use points to it.

### CI (Domain 3) — the P0 was fixed during this session

When the evidence was gathered, `recette` had `required_status_checks: null`,
`required_pull_request_reviews: null`, `restrictions: null`, **`allow_force_pushes: true`**
and no ruleset supplying the missing rules — `enforce_admins: true` only meant the empty
rule set also applied to admins, which is not itself a protection. The integration branch
accepted a red merge, an unreviewed merge and a history rewrite.

**That was corrected mid-session**, and the fix is verified from two independent reads:

```
recette   force=false  del=false  strict=false  admin=true
          checks=["gitleaks","build","validate","openapi-diff","axe-core (Storybook)"]
```

`strict: false` on `recette` is deliberate and differs from `main`, which is `strict: true`.
With parallel Ferry sessions merging continuously, requiring "up to date with base" on the
integration branch makes every merge stale every other open pull request, which then has to
rebase and re-run CI. The cost outruns the benefit on an integration branch.

**Read this from GraphQL, not REST.** The repository's protection has been misreported by
`GET /branches/:b/protection` before — `allowsForcePushes` in particular. The
`branchProtectionRules` GraphQL node is the reliable source, and the two agreed here.

Remaining in this domain, both counted elsewhere so as not to double-penalise:
Lighthouse is red repo-wide (§9), and `Apply Migrations — Recette` is red because of the
migration defect above (§6, first entry).

### Secrets (Domain 2) — P1

The previous revision recorded a leaked recette `service_role` key and Postgres password in
the public git history. This revision finds:

- **No secret-shaped string in any tracked file.** Only `.env.example` and
  `e2e/.env.example` are tracked env files.
- **The relevant repository secrets were all re-set today** — `SUPABASE_SERVICE_ROLE_KEY`
  09:29, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 09:28, `RECETTE_SUPABASE_DB_URL` 09:09 — which is
  consistent with the rotation having been performed.
- **But `docs/runbooks/secret-exposure-audit-2026-09.md` still reads "Must be rotated" and
  carries no completion record.** Confirming a key is dead requires probing the service,
  which is out of scope here. **The gap is the missing record, not necessarily the missing
  rotation** — and the record is what a future reader will act on.
- `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` is now present (08:12), closing the previous
  revision's P0 #5: the corpus sync will no longer fail for want of it.

### Dead code & redundancy (Domains 4, 7) — P1

`knip` reports 32 unused files, 177 unused exports, 4 unlisted dependencies and 11 unused
devDependencies. `jscpd` measures **4.83 % duplicated lines**, which is low and carries no
penalty.

Confirmed and worth acting on:

- **P1** `src/lib/supabase/client.ts` — the browser Supabase client is unused. The "three
  Supabase clients, never interchangeable" invariant in `CLAUDE.md` now describes two.
- **P1** `src/lib/flags-client.ts`, `src/lib/home/accessAxesData.ts`,
  `src/api/v2/schemas/games.ts`, `src/test/server-only-stub.ts` — orphaned.
- **P1** Three empty barrels: `src/components/{compare,names,relations}/index.ts`.
- **P1** Four **unlisted** dependencies — `esbuild`, imported by three
  `scripts/*-bundle-size.ts`, and `tinyglobby`, by
  `src/app/[lang]/__tests__/loaderCoverage.test.ts`. These resolve today only because a
  transitive hoist provides them; the `ajv` incident at the top of this document is exactly
  how that arrangement fails.
- **P2** `scripts/` carries 10 orphaned one-off scripts (`checkMigration.ts`,
  `convertAfrikToJson.ts`, `testLoader.ts`, …).

**Two knip findings are false positives and must not be actioned:**

- **`sharp` reported as an unused dependency.** It is never imported — Next loads it
  implicitly for `next/image` optimisation. Removing it on knip's word would silently
  degrade image optimisation on the self-hosted host.
- `e2e/support/factories/*` and `e2e/global.setup.ts` are reached through the Playwright
  config, which knip does not follow; `docs/design/mockups/*` are built by `node build.js`,
  not imported.

### Hardcoded values (P0/P1)

**No P0, and below the penalty threshold for Domains 5 and 7.** No hardcoded Supabase,
Upstash or Sentry URL exists anywhere in `src/**` — the scan returns empty. The only
literals worth naming are eight pagination defaults (`perPage ?? 20`, `limit ?? 20`,
`pageSize ?? 50`) in the v2 handlers, which are documented API defaults rather than
deployment-varying configuration.

### Code debt (Domain 4) — P2

79 lint warnings (0 errors); 23 stray `console.*` in `src` outside tests, against a rule
that handlers use `@/lib/api/logger`; 35 `TODO`/`FIXME` markers across `src` and `scripts`;
4 moderate `npm audit` advisories, none high or critical.

`next-env.d.ts` is tracked but regenerated by `next build`, which adds
`import "./.next/types/root-params.d.ts"` and leaves the tree dirty after any build. Either
commit the regenerated form or untrack it — as it stands, every build produces a spurious
diff.

---

## 7. Consumer / new-contributor flow

`git clone` → `npm ci` (`.npmrc` sets `legacy-peer-deps`, so no flag is needed) →
`cp .env.example .env.local` → migrations → `npm run dev`.

`check:env-example` verifies `.env.example` against the code **in both directions**, which
is why this flow holds: every environment reference in the code is documented, and every
documented entry is actually read.

Two traps, both now documented rather than tribal:

- `UPSTASH_REDIS_REST_URL` / `_TOKEN` are listed among optional subsystems but are mandatory
  in a production build — without them every `/api/v2/*` answers 500 while pages render
  normally.
- `ANTIBOT_HMAC_SECRET` is not inert when unset: `GET /api/v2/antibot/challenge` answers 503
  and every report dialog fails, while the build stays green.

The one step this revision cannot certify is **migrations applying cleanly on a fresh
project** — they do not. `063` fails, as in §6.

---

## 8. Security posture

**48 tables created across 65 migrations. 48 have RLS enabled. Zero open tables, zero P0 in
this table.**

| Table                                                                | RLS enabled | Policies | Notes                          |
| -------------------------------------------------------------------- | ----------- | -------- | ------------------------------ |
| afrik_countries                                                      | yes         | 1        | public read                    |
| afrik_language_families                                              | yes         | 1        | public read                    |
| afrik_languages                                                      | yes         | 1        | public read                    |
| afrik_peoples                                                        | yes         | 1        | public read                    |
| afrik_people_countries                                               | yes         | 1        | join table                     |
| afrik_patronymes + \_peoples / \_countries / \_persons / \_alliances | yes         | 1 each   | public read                    |
| persons, person_peoples, person_countries                            | yes         | 1 each   | public read                    |
| api_keys                                                             | yes         | 1        | admin-only writes              |
| user_roles                                                           | yes         | 3        | admin-only writes              |
| audit_log                                                            | yes         | 3        | append-only                    |
| flags, migration_events, name_records, editorial_doctrine            | yes         | 5 each   | moderated write paths          |
| contributions, antibot_challenges, search_query_log                  | yes         | 0        | deny-all; server-written       |
| african_regions, countries, ethnic_groups, ethnic_group\_\*          | yes         | 0        | **dead V1 schema** — see below |

**Dead V1 schema.** Seven tables from the removed V1 surface still exist with RLS and no
policies. Inert and not a security hole, but `CLAUDE.md` states V1 was removed — the schema
disagrees.

Other findings, all verified this run:

- **CSP nonce is per request** — `btoa(crypto.randomUUID())` at `src/middleware.ts:435`,
  injected into `script-src` and `style-src` (`:75`, `:80`).
- **Headers**: HSTS (`:64`), `X-Content-Type-Options: nosniff` (`:67`), `Referrer-Policy:
strict-origin-when-cross-origin` (`:68`).
- **API keys**: PBKDF2-SHA256, 600 000 iterations, 16-byte salt
  (`src/lib/api/auth.ts:15,16`); raw keys never stored.
- **Sentry**: EU residency asserted at init — a production build throws if the DSN is not
  `ingest.de.sentry.io`; PII scrubbed in `beforeSend` across client, server and edge.
- **Service-role isolation holds.** The only non-API import is a `"use server"` Server
  Action.
- **Three-layer API boundary holds**: no `route.ts` under `src/app/api/v2/` queries Supabase
  directly.
- **Supply chain**: no unpinned third-party Action; 4 moderate advisories, 0 high, 0
  critical.
- **Nobody can deploy from a clone**: `deploy-production.yml` triggers only on `release:
published`, has no `workflow_dispatch`, and forks receive no secrets.

---

## 9. Performance & accessibility posture

- **axe-core: green, and not advisory.**
- **E2E (Playwright): green** on every recent run.
- **Lighthouse: red, repo-wide.** On the most recent completed run, **12 assertions fail
  `categories:performance ≥ 0.85`** across the 22 audited routes, plus **10**
  `largest-contentful-paint > 5500 ms` and **6** `total-blocking-time > 300 ms` breaches.
  The failures span the home, the three atlas hubs, and the fiche routes
  (`/fr/atlas/pays/SEN`, `/fr/atlas/peuples/PPL_WOLOF`, `/fr/atlas/familles/FLG_BANTU`).
- **The failing routes fall into two distinct populations, and conflating them has been
  costing effort.** Four routes score **0.78 – 0.83** — near-misses, a few points short of
  the 0.85 budget. Three score **0.47 – 0.49**, with `total-blocking-time` measured at
  **2 101 ms, 2 598 ms and 3 350 ms** against a 300 ms budget, and LCP up to **5 821 ms**.
  A TBT of two to three seconds is main-thread JavaScript, not payload weight: that group
  is the globe, and only deferring or lazily mounting it moves those numbers. The two
  populations need different work.
- **One route also fails `categories:accessibility` at 0.98 against a required 1.0.**
  axe-core is green on the same tree — the two gates audit different route lists, so a
  green axe run is not evidence that Lighthouse's a11y assertion passes.
- Because it fails everywhere, Lighthouse currently carries **no signal** — it cannot
  distinguish a regression from the baseline. That, more than the raw failure count, is why
  Domain 9 scores 4.

---

## 10. AFRIK data integrity & Source Tier compliance

922 fiche JSON files are tracked under `dataset/source/afrik/`.

| #   | Check                         | Verdict                                                          |
| --- | ----------------------------- | ---------------------------------------------------------------- |
| 1   | Strict model adherence        | **Pass** — 14 strict models present; validator enforces them     |
| 2   | Validator run                 | **Pass** — 38/38 checks, **0 errors**, 3 989 warnings            |
| 2b  | FR28 hard gate [95,105]       | **Pass** — zero fiches outside the band                          |
| 2c  | FR28-strict [99,101]          | **Pass** — burn-down at zero; both bands now fail the build      |
| 3   | FLG / PPL / ISO consistency   | **Pass** — orphan-fiche and reference checks green               |
| 4   | Source tier compliance        | **Partial** — see below                                          |
| 5   | DB vs source-JSON consistency | **Not verified** — recorded as a gap, not asserted               |
| 6   | CI enforcement                | **Pass** — both gates on `pull_request`, neither advisory        |
| 7   | Known-issues carry-over       | Reviewed; `checkEditorialRules.ts` reports 0 errors, 65 warnings |

**What passes cleanly.** Zero fiches cite a Wikipedia article as a `sources.url`, and zero
carry an empty `sources` block — the two conditions that would cap this domain at 4 under
any doctrine. The 43 files that mention Wikipedia do so in `notes`, which is exactly the
auditable cross-check chain `CLAUDE.md` prescribes.

**Tier vocabulary.** Counts across the corpus: `unverified` 1 605, `official` 1 367,
`referenced` 1 211 — the current three-value scale. Against that:

- **P1 — 19 files still carry retired numeric tiers** (10 occurrences of `1`, 27 of `2`),
  under `migrations/`, `relations/` and `noms/PPL_YORUBA.json`. Migration `041` constrained
  the column to `CHECK (tier IN ('official','referenced','unverified'))`, so these values
  have no destination.
- **Open question — 1 031 sources carry `tier: "needs_review"`.** This is deliberate and
  typed (`src/types/afrik.ts` states it is _not_ a `SourceTier` and marks the tail), but the
  same DB constraint does not accept it. The two vocabularies live in different places.
  Tracing the provenance path was not completed; this is recorded as an open question with
  evidence, not a confirmed defect.

**Note on §5.** DB-vs-JSON consistency is doubly unverifiable this revision: no database
credentials were used, and recette's schema is three migrations behind the corpus loaders
anyway.

---

## 11. Prioritized action list

| #   | P   | Action                                                                                                         |
| --- | --- | -------------------------------------------------------------------------------------------------------------- |
| 1   | P0  | Fix `063`, `065` and `066`: use `public.afrik_unaccent(…)` in the index **and** the RPC call sites             |
| 2   | P0  | Re-run `Apply Migrations — Recette`; confirm `063`, `064`, `065` land and search works on recette              |
| 3   | ✅  | ~~Restore required status checks on `recette`~~ — **done during this session**, verified via GraphQL           |
| 4   | P1  | Record the outcome of the credential rotation in `runbooks/secret-exposure-audit-2026-09.md`, or perform it    |
| 5   | P1  | Fix or re-baseline the Lighthouse performance budget — a permanently red gate carries no signal                |
| 6   | P1  | Declare the 4 unlisted deps (`esbuild`, `tinyglobby`) in `package.json` — hoist-luck is what broke `ajv` here  |
| 7   | P1  | Migrate the 19 `migrations/` / `relations/` fiches off numeric tiers onto the three-value scale                |
| 8   | P1  | Trace `needs_review` from fiche to `sources.tier`; either map it or document that it never lands               |
| 9   | P1  | Run a restore drill — the last one is dated 2025-07-14, 13.6 months ago                                        |
| 10  | P1  | Verify `/srv/ethniafrica/.env` on the OVH host is complete before the next Release (not auditable from here)   |
| 11  | P1  | Drop the seven dead V1 tables, or record in `CLAUDE.md` why they remain                                        |
| 12  | P2  | Decide the fate of `src/lib/supabase/client.ts` and restate the three-client invariant in `CLAUDE.md`          |
| 13  | P2  | Delete the confirmed orphans (`flags-client.ts`, `accessAxesData.ts`, `schemas/games.ts`, the 3 empty barrels) |
| 14  | P2  | Untrack or commit `next-env.d.ts` — every `next build` currently dirties the tree                              |
| 15  | P2  | Replace the 23 stray `console.*` in `src` with `@/lib/api/logger`; triage the 4 moderate advisories            |

---

## 12. Conclusion

The codebase is healthy and improving. Every quality gate this repo owns passes on a clean
tree: 6 367 tests green with zero failures, coverage well above its thresholds,
`lint` / `typecheck` / `format` / `build` all clean, a complete 48-of-48 RLS surface, PBKDF2
at 600 000 iterations, a fail-closed rate limiter, and an editorial validator that passes 38
of 38 checks with zero errors. The two credential P0s that dominated the previous revision
have visibly moved — the tracked tree is clean, the production service-role secret is in
place, and the recette secrets were re-set today.

What holds the score at 6.9 is that **the schema and the code have come apart**. Migrations
`063`, `065` and `066` build an index on a function Postgres will not accept there — and the
repository already contains the fix, written for exactly this reason in migration `052`. The
result is that recette runs code whose supporting schema was never applied, and the
migration gate has been red all day announcing it. Until that lands, every claim about what
recette actually serves is unverified.

The more interesting fact is that the defect recurred three times. `052` created
`public.afrik_unaccent` and documented in its own `COMMENT` that it exists to be usable in
an index expression; three later migrations, by different hands, still reached for the raw
two-argument call. A helper whose reason for existing is recorded only at its definition is
a helper that will keep being bypassed. Whatever fixes `063`, `065` and `066` should also
leave something at the point of use — a check, a lint rule over `supabase/migrations`, or a
line in `CLAUDE.md` — so the fourth occurrence is caught before a migration job finds it.

The second blocker of this revision closed while the revision was being written: `recette`
now requires the same five checks as `main` and refuses force pushes. It is worth noting how
it failed, because the failure was silent — the branch had been protected before, the
protection disappeared without anyone noticing, and nothing in CI reports on its own
enforcement. A gate that can vanish quietly is worth a periodic assertion.
