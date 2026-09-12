---
name: ethniafrica-audit
description: Production-readiness audit for EthniAfrica (this repo). Read-only multi-domain scored assessment that answers five questions — is the project ready for production, is the AFRIK editorial surface sound (data integrity + Source Tier policy), can a new contributor go clone-to-running in one session, what is the security posture (Supabase RLS, CSP, auth, API keys, PII), and is the score close to 8–9/10. Use when the user asks "is it ready", "audit EthniAfrica", "production-readiness check", or invokes /ethniafrica-audit.
metadata:
  author: Big Emotion
  version: "2.1.0"
---

# EthniAfrica Audit

Read-only audit of the project defined in this repo. Produces a scored, evidence-based report and refreshes `docs/PRODUCTION-READINESS-AUDIT.md`.

Inspired by Google SRE's Production Readiness Review — the six PRR engagement axes (architecture & dependencies, instrumentation, emergency response, capacity planning, change management, performance metrics) are folded into the 10-domain rubric below, adapted to the Next.js 16 + Supabase + AFRIK stack.

**`CLAUDE.md` is the authority on what is true about the project** — the deploy model, the Source Tier policy, the locale posture, the Supabase topology. When this skill and `CLAUDE.md` disagree, score against `CLAUDE.md`, record the disagreement as a Domain 10 finding, and never let the disagreement make a criterion easier.

This skill **never** modifies source, never bumps versions, never tags, never pushes, never deploys, never runs migrations, never writes to external services. It only reads, runs the repo's own gates, and writes the audit doc. Fixing anything it finds is deferred to normal ticketed work or `/ethniafrica-release`.

**Local footprint of a full run** (a clean tree in git terms stays the explicit contract, but these appear on disk):

- `docs/PRODUCTION-READINESS-AUDIT.md` — the only tracked file this skill writes.
- `.next/` — refreshed by `npm run build`.
- `coverage/` — refreshed by `npm run test:coverage`.
- `node_modules/.cache/eslint/` — the lint cache.
- `playwright-report/` and `test-results/` if an e2e gate is run.
- `npx --yes` one-shot tool downloads (knip, ts-prune, jscpd) land in the npx cache, never in `package.json`.

All of the above are gitignored. If any of them shows up in `git status --porcelain`, that itself is a finding (Domain 2).

## Measure outcomes, not configuration

The 2026-09-12 audit re-learned this four times, so it is a rule rather than advice:

- **A workflow file is not a gate.** A workflow that exists but has not run, was skipped, ran red, or is not a required check on the merge path is scored as **absent**. Read the runs (`gh run list`) and the protection API (`gh api repos/<owner>/<repo>/branches/<branch>/protection`), not the YAML.
- **A runbook claim is not a ledger read.** Migration state is what `check:migration-state` (recette) and `check:migration-state:production` — or the last Release's `migrate` job log — report, never what a document says.
- **A count is net.** A table created and later dropped is not a table; a policy created and later dropped is not a policy. Count what survives the whole migration sequence.
- **What could not be measured is `N/A`, and `N/A` never counts as a pass.** It is written as `N/A` with the reason, in the domain's evidence cell.

## When to Activate

- User asks: "is the project production-ready", "is it ready to ship", "audit ethniafrica", "score the project".
- User asks specifically about RLS coverage, AFRIK data integrity, Source Tier compliance, Lighthouse status, security posture, or the overall score.
- User invokes `/ethniafrica-audit`.

## Preconditions

Run from the repo root (`package.json` with `"name": "ethniafrica"`). If not, stop and tell the user to `cd` into the repo.

## Inputs

Optional arguments:

- `--quick` — skip the long/costly gates (full test suite, coverage, production build, e2e). Rely instead on the most recent CI run (`gh run list --workflow ci.yml`) and the newest local artifacts, and mark any domain scored from stale data as such.
- `--no-build` — skip `npm run build` only (useful when iterating; the rest of the full audit still runs).

Default: full audit.

## Workflow

### Step 1 — Snapshot the repo state

Run in parallel via Bash:

- `git status --porcelain` — a dirty tree is auditable but must be reported.
- `git log --oneline -20` — recent cadence.
- `git branch --show-current` — confirm the `recette` (integration) vs `main` (release) posture.
- `git tag --sort=-creatordate | head -5` — the latest release tags; compare with `gh release list --limit 5`, because a Release, not a tag, is what deploys.
- `jq '{name, version, private, packageManager, scripts}' package.json` — version, scripts, package manager.
- `ls .github/workflows/` — workflow surface.
- `ls supabase/migrations/ | sort` — migration order and count; flag any duplicated numeric prefix.
- `ls docs/ docs/runbooks/ docs/adr/` — operational doc surface.

Cheap structural checks specific to this repo:

- `jq empty docs/confluence-spec/config.json` — the spec config must parse, and its `jiraProjectKey` must be `ETNI`.
- `npx --yes js-yaml ferry.config.yaml >/dev/null` (or any YAML parse) — `ferry.config.yaml` must parse and expose `git.base_branch` / `git.target_branch`.
- `ls public/modele-*.json` — the AFRIK strict models must be present; they are the schema every fiche is validated against.
- `git ls-files 'dataset/source/afrik/**/*.json' | wc -l` — fiche count, cross-checked against what the DB migration scripts expect.

### Step 2 — Read the existing audit

Read `docs/PRODUCTION-READINESS-AUDIT.md` (it exists). This skill **updates** that file in place, preserving its scoring rubric and section ordering. Canonical structure:

1. Scope and method
2. The five canonical questions — answered explicitly
3. Overall score (X.X / 10) — one-line verdict
4. Score per domain (table, 10 rows)
5. Strengths
6. Gaps and risks (per domain, with `file:line` evidence), including the **Hardcoded values (P0/P1)** and **Dead code & redundancy** subsections from Steps 3.5 and 3.7
7. Consumer / new-contributor flow — clone → env → migrate → seed → dev → API → admin
8. Security posture — dedicated section (Supabase RLS, CSP, auth, API keys, PII, secrets handling)
9. Performance & accessibility posture — Lighthouse mobile thresholds, axe-core
10. AFRIK data integrity & Source Tier compliance
11. Prioritized action list (15 max, each tied to a Jira ID (`ETNI-*`), an FR number, or an issue)
12. Conclusion

Bump the `Date:` field to today.

### Step 3 — Gather evidence

**Long gates** (skip with `--quick`; `npm run build` also skipped with `--no-build`):

```bash
npm run lint            # eslint over src + scripts, content-cached
npm run typecheck       # tsc --noEmit (strict: false, but noEmit must pass)
npm run format:check    # prettier
npm test                # vitest run
npm run test:coverage   # thresholds from vitest.config.ts
npm run build           # next build — the same build the production Dockerfile runs on the OVH VPS
```

Known footguns: run `npm ci` first if `node_modules` is stale after a merged PR — a stale tree is a documented local false-negative here (`.npmrc` sets `legacy-peer-deps=true` on purpose: Storybook `@storybook/react-vite` vs the Next version). Coverage thresholds come from `vitest.config.ts` — read them, do not assume. A handful of pre-existing failures in `scripts/__tests__/migrateAfrikToDatabase.test.ts` (Supabase mock) are known; report them but do not re-litigate them as new findings.

**Always** (cheap, read-only):

- `gh run list --limit 10 --json workflowName,status,conclusion,headBranch,createdAt` — recent CI health on `recette` and `main` (best-effort; note if `gh` unauthenticated).
- **Outcome of every domain-critical workflow**, one call each: `gh run list --workflow <file> --branch recette --limit 5 --json conclusion,event,createdAt` for `ci.yml`, `data-integrity.yml`, `editorial-rules.yml`, `a11y.yml`, `lighthouse.yml`, `e2e.yml`, `openapi-diff.yml`, `migrate-recette.yml`, and `gh run list --workflow deploy-production.yml --limit 3` for the release path. Record the last conclusion per workflow; "never ran" and "skipped" are outcomes, and both score as absent.
- **Branch protection, measured**: `gh api repos/big-emotion/ethniafrica/branches/recette/protection` and the same for `main` — record whether a pull request is required and which status checks are **required**. A workflow not in the required list does not block a merge, however green it is. If the API call is refused, write `N/A — <reason>`.
- **Migration state, measured**: `npm run check:migration-state` (recette credentials) and `npm run check:migration-state:production` (production credentials). Without production credentials, read the latest Release's `migrate` job log (`gh run view <run> --job <job> --log`) for its `applied · pending · orphaned · drifted` line and state the run id and date. Neither available → `N/A`, never "applied".
- `git ls-files | grep -iE '\.env'` — must return only `.env.example` / `env.dist` style files.
- `git grep -nE '(sk_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|sbp_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{30,})' -- ':!*.lock' ':!node_modules'` — must return nothing on tracked files.
- `git grep -nE "uses:\s+[^/\s]+/[^@\s]+@(main|master|v[0-9]+|latest)" .github/workflows/` — third-party Actions must be pinned by SHA (project CLAUDE.md hard rule); every hit is a finding.
- `git grep -nE "TODO|FIXME|XXX|HACK" -- src scripts | wc -l` — code-debt heuristic.
- `git grep -nE "console\.(log|warn|error)" -- src | grep -v "__tests__\|\.test\." | wc -l` — stray console calls; handlers must use `@/lib/api/logger`.
- `npm audit --json --audit-level=moderate` — dependency CVEs, counted by severity.
- `npm run check:local-paths` — this repository is public; any hit is a P1.
- Identifier coherence: `ETNI` must be identical in `CLAUDE.md`, `docs/confluence-spec/config.json`, and the ferry workflow inputs; the Confluence `spaceKey` (`ETHNIAFRIC`) and `engineeringRootPageId` must match between `config.json` and any doc that names them.

**Security surface** (read each file, quote `file:line`):

- `src/middleware.ts` — security headers (HSTS, X-Content-Type-Options, Referrer-Policy, CSP). Confirm the CSP nonce is generated **per request**, not a static string. Confirm locale resolution fails closed to `fr-only` when `SITE_LOCALE_MODE` is missing or invalid.
- `src/lib/api/cors.ts` — allowed origins, methods, credentials posture.
- `src/lib/api/auth.ts` — API key auth uses PBKDF2-SHA256 with iterations ≥ 100 000 and salt ≥ 16 bytes; raw keys are never stored.
- `src/lib/api/rate-limit.ts` — rate limiting wired into the request path, per-key tier backed by the `api_keys` tier migration. In-memory-only limiting on a multi-instance host is a P1. Rate limiting fails **closed** in production without `UPSTASH_REDIS_REST_*` — confirm the production deploy provides them, or record `N/A`.
- `src/lib/supabase/admin.ts` — the service-role client must never reach a browser bundle: `git grep -n 'from "@/lib/supabase/admin"' src/app | grep -vE "(api|admin)/"` must return nothing.
- **The browser never reads the corpus from Supabase** (`CLAUDE.md`, "two data clients"). `server.ts` and `admin.ts` are the only data clients; `auth-client.ts` authenticates and does not query. `git grep -n "createBrowserClient" -- src` must hit `src/lib/supabase/auth-client.ts` only, and no browser-side module may call `.from(` on a client it obtained there. A reintroduced browser data client is a **P0**.
- `sentry.{client,server,edge}.config.ts` — EU DSN (`ingest.de.sentry.io`), PII scrubber in `beforeSend`, no PII in `tags`.
- `.env.example` / `env.dist` lists every required variable (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTIBOT_HMAC_SECRET`, `UPSTASH_REDIS_REST_*`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`) with no real values, and `npm run check:env-example` is green.

**Supabase Row Level Security** — this is the data-plane gate; a table without RLS is an open door. Production is a **self-hosted** stack that the Supabase MCP cannot see, so RLS is scored from the migration sequence, and the live state of production is `N/A` unless read directly.

- Enumerate every table **net of drops**: walk `supabase/migrations/*.sql` in filename order and keep a set — `CREATE TABLE` adds, `DROP TABLE` removes. A table dropped and never re-created is not counted; a table dropped and re-created counts once.
- For each surviving table, confirm `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY` appears **after its last `CREATE TABLE`**. RLS enabled on an earlier incarnation of a table that was later dropped and re-created does not carry over.
- Count policies the same way: `CREATE POLICY` adds, `DROP POLICY` removes, a `DROP TABLE ... CASCADE` removes every policy on that table. Report the net number, never the raw `grep -c`.
- For each RLS-enabled table, confirm at least one surviving policy exists, **or** the migration explicitly comments that no policy is intentional (deny-all to every role but `service_role`). Deny-all without the comment is a P2.
- A table with RLS not enabled after its last creation is a **P0**.

Report coverage as a table, one row per surviving table, with the migration that last created it:

```
| Table                        | Last created | RLS enabled after | Net policies | Notes              |
| ---------------------------- | ------------ | ----------------- | ------------ | ------------------ |
| afrik_countries              | ?            | ?                 | ?            | public-read only?  |
| afrik_language_families      | ?            | ?                 | ?            | public-read only?  |
| afrik_languages              | ?            | ?                 | ?            | public-read only?  |
| afrik_peoples                | ?            | ?                 | ?            | public-read only?  |
| afrik_people_countries       | ?            | ?                 | ?            | join table         |
| user_roles                   | ?            | ?                 | ?            | admin-only writes  |
| api_keys                     | ?            | ?                 | ?            | admin-only writes  |
| …                            |              |                   |              |                    |
```

### Step 3.5 — Hardcoded values scan (`src/**`)

EthniAfrica's contract is that a deployment can be tuned through env vars and Supabase config without a code change. Magic numbers and literal defaults embedded in `src/**` are silent coupling that traps an operator into a redeploy.

**Scope:** `src/**/*.ts`, `src/**/*.tsx`. Exclude `*.test.ts(x)`, `__tests__/`, `src/test/`, `src/stories/`, `*.config.ts`.

**Flag:**

1. Magic numbers in runtime logic — timeouts, retries, byte/char limits, pagination caps, confidence-score cutoffs, batch sizes, polling intervals, `* 1000` / `* 60` durations, `slice(0, N)` / `substring(0, N)`, `if (x > N)`.
2. Literal default parameters — `function f(x = 30)`, `opts.timeout ?? 30000`.
3. Hardcoded URLs in non-test code — Supabase, Upstash, OpenAPI server URLs that belong in env.
4. Hardcoded role / tier strings outside the `user_roles` role enum (`reader`, `contributor`, `moderator`, `admin`, `advisor`) and the api-key tier enum — drift between code and DB.

**Skip:** `0`/`1`/`-1`/`2` as indices, exit codes, or booleans; HTTP status codes; loop counters; math identities; numbers inside log templates; AFRIK identifiers (`FLG_*`, `PPL_*`, ISO 639-3, ISO 3166-1) — stable by design.

**Categories** (use these exact buckets): Timeouts / Durations · Retry & Backoff · Size & Truncation Limits · Pagination & Batch Sizes · Cache TTLs · Rate-limit & Quota Thresholds · Confidence & Scoring Thresholds (AFRIK) · Default Parameters · Hardcoded URLs · Hardcoded Roles / Tiers.

**Severity:** **P0** affects production behavior, cost, or differs per deployment (rate-limit windows, request timeouts, Supabase URLs, confidence cutoffs that gate publication). **P1** likely tuned per deployment (cache TTLs, pagination caps). **P2** internal tuning constant unlikely to change.

**Scan:**

```bash
grep -rnE '\b[0-9]{3,}\b' src --include='*.ts' --include='*.tsx' | grep -vE '\.test\.|__tests__|src/test/|src/stories/'
grep -rnE '= [0-9]+[,)]|\?\? [0-9]+|\|\| [0-9]+' src --include='*.ts' --include='*.tsx'
grep -rnE 'setTimeout|slice\(0,|substring\(0,|\.length > [0-9]' src --include='*.ts' --include='*.tsx'
grep -rnE "https?://[a-zA-Z0-9./-]+\.(supabase\.co|upstash\.io|sentry\.io)" src
```

Read each suspect file to confirm the hit is real, capture `file:line`, bucket by category + severity.

**Output:** flat markdown list grouped by category, P0 first. Each line: `**Pn** path:line — value — one-line description`. Include verbatim under section 6 in a subsection **"Hardcoded values (P0/P1)"**. P2 goes to chat only.

**Score impact** — Domain 7 (Architecture & boundaries) and Domain 5 (Deploy coherence): 0 P0 / ≤5 P1 → no penalty; 1–3 P0 or 6–15 P1 → −1 on both; ≥4 P0 or >15 P1 → −2 on both.

### Step 3.6 — AFRIK data integrity & Source Tier compliance

EthniAfrica's editorial doctrine is non-negotiable. This is the domain-critical surface; it gets its own scan. It has **eight checks**; each gets a verdict of pass, fail or `N/A`.

1. **Strict model adherence** — every `dataset/source/afrik/**/*.json` conforms to the matching `public/modele-*.json` (no skipped, renamed, or added sections). Sample 10 fiches spread across `famille_linguistique/`, `peuples/`, `pays/` and cross-check structure.
2. **Validator run** — `npx tsx scripts/validateAfrikData.ts`. Parse its full output (the printed summary undercounts; read `dataset/source/afrik/logs/validation_report.json` too). Two demographic bands apply (per `docs/adr/0001-fr28-demographic-tolerance.md` and `CLAUDE.md` "Demographics"), and **both are now hard gates**:
   - **FR28** — a fiche's per-country population shares must sum within **[95, 105]%**. Any fiche outside is a **P0**.
   - **FR28-strict** — the target band **[99, 101]%**. Its burn-down is finished and it fails the build, so any fiche outside it is also a **P0**.
   - Report both counts explicitly, and report which checks `SOFT_CHECK_NAMES` in `scripts/validateAfrikData.ts` still holds advisory — a check moved into that constant since the last audit is a finding.
3. **FLG / PPL / ISO consistency** — every `PPL_*.json` references an existing `FLG_*` parent (folder path and content field agree); every country reference is a valid ISO 3166-1 alpha-3; every language code is a valid ISO 639-3.
4. **Source Tier compliance** (`CLAUDE.md` "Source Tier Policy") — _nothing is forbidden, everything is labelled_. A weak source is not a defect; an unlabelled or mislabelled one is. The tier vocabulary is the one `CLAUDE.md` declares (`official | referenced | unverified`) as enforced by the latest `sources_tier_check` migration; `source_kind` (e.g. `ai_generated`) is a separate provenance axis. Detect and classify:
   - **P0 — a `sources` entry with no `tier`.** `CLAUDE.md` makes it a blocking error.
   - **P0 — a fiche with an empty `sources` block**, or whose source is not an identifiable work at all (`"unknown"`, `"internet"`, `"wikipedia"` as the title or URL of the source itself). The remedy is to identify the work or record the gap for the reader, not to downgrade the tier.
   - **P0 — Wikipedia cited as the source.** `CLAUDE.md`: _Wikipedia is not a source._ A `url` on `wikipedia.org` is a P0.
   - **P0 — a weak source carrying authority it does not have.** An aggregator, tertiary encyclopedia, blog, social-media post, forum, community account or AI-generated text at `official` or `referenced`. These are published at `unverified` and at no other tier.
   - **P0 — AI-generated text without `source_kind: "ai_generated"`.** The provenance marker is what the UI's AI badge and the 0.5 multiplier in `recompute_confidence()` read.
   - **P0 — a `tier` value outside the vocabulary** that the corpus, the TypeScript types, the API and the database all admit.
   - **P1 — the vocabulary disagrees between layers**: a value one layer admits (types, API enum, corpus) and another cannot store (`sources_tier_check`), or a `recompute_confidence()` `CASE` with no branch for it. Count this as a failed check even while the corpus keeps the value in JSONB.
   - **P1 — a primary source discovered through Wikipedia whose `notes` does not record which Wikipedia language versions were crossed.** The chain is unauditable.
     ```bash
     grep -rlniE '"url"\s*:\s*"[^"]*wikipedia\.org' dataset/source/afrik/                                       # P0 each
     grep -rlniE '"url"\s*:\s*"[^"]*(medium\.com|blogspot|wordpress\.com|reddit\.com|x\.com|twitter\.com|facebook\.com|quora\.com|joshuaproject|101lasttribes|peoplegroups)' dataset/source/afrik/   # must be tier unverified
     grep -rln '"tier"' dataset/source/afrik/ | wc -l                                                             # vs total fiche count → fiches with no tier field at all
     ```
     Count tier values across the corpus (`official`, `referenced`, `unverified`, anything else) and compare each against the database constraint in the latest migration that defines `sources_tier_check`.
5. **Database vs source-JSON consistency** — for the sampled fiches, confirm the row in `afrik_peoples` / `afrik_countries` / `afrik_language_families` matches the source `.json` (demographics especially), on recette at least. If this cannot be read, the check is `N/A`, not pass.
6. **CI enforcement** — `.github/workflows/data-integrity.yml` and `editorial-rules.yml` must run these checks on PRs, must **not** be in advisory mode (`continue-on-error: true`) for `recette`/`main`, and their **last runs on `recette` must be `success`** (Step 3 outcome read). An advisory data gate is a P1 regardless of how green the local run is.
7. **Reader-facing register** — `npx tsx scripts/ci/checkEditorialRules.ts` passes `reader-facing-register`, **and** a grep of `gaps[].reason`, `sources[].title` and `sources[].notes` across the corpus finds no pipeline vocabulary in either language (the French patterns in `INTERNAL_REGISTER_PATTERNS`, plus English workshop phrasing such as "domain ruling" and "awaits editorial review" — read each hit, since an English word can also be a legitimate source title). The gate passing while the grep hits is a fail: the gate's pattern list is the thing that is incomplete.
8. **Known-issues carry-over** — read the session memory's `data_quality_status.md` if present and surface unresolved items (duplicate fiches, FLG mismatches, erroneous fiches) so a known problem is not re-discovered as new. Also report `UNDATED_POLITY_CEILING` against its measured count.

Include the full result verbatim under section 10 of the audit doc.

### Step 3.7 — Dead code & redundancy scan

EthniAfrica is a single-developer codebase that went through a V1→V2 migration; orphan files, unused exports, and half-integrated patterns accumulate.

**Scope:** `src/**/*.{ts,tsx}` and `scripts/**/*.ts`. Exclude `node_modules/`, `.next/`, `dist/`, `*.d.ts`, `src/stories/`, generated OpenAPI types.

```bash
npm run check:dead                                              # the ratchet, as CI sees it
npx --yes knip --production --no-progress --reporter compact 2>&1 | tail -80   # production mode
npx --yes ts-prune -p tsconfig.json 2>&1 | grep -v "(used in module)" | head -60
npx --yes jscpd src/ --min-tokens 50 --min-lines 5 --reporters consoleFull --silent 2>&1 | tail -40
npm run lint 2>&1 | grep -cE "Unused eslint-disable"
```

**Run knip in production mode as well as through `check:dead`.** In default mode, test files and stories are entry points, so a production module imported only by its own test or story counts as used. `--production` drops those entries and shows code no user-reachable path touches. Report the production-mode tallies next to the ratchet's; a file that is dead in production mode is a finding even while `check:dead` is green.

Run tools via `npx --yes` only — never add them as project deps for an audit.

**Flag:** orphan files not imported anywhere and not entry points (Next routes, `middleware.ts`, sentry configs, `package.json` scripts, stories); unused exports; unused npm dependencies; duplicated blocks (watch the view components and the AFRIK loaders/parsers — they are known to share shape); dead branches; and any surviving V1 import (`entityKeys`, `entityTranslations`, `datasetLoader.server`, `types/ethnicity`) — the V1 surface was deleted, so any reference is dead code.

**Skip:** type-only re-exports from a barrel `index.ts`, test helpers, `_template_*` placeholders used by AFRIK loaders, and the entry points `knip.json` declares on purpose (`CLAUDE.md` "Dead code").

**Severity:** **P0** orphan file under `src/app/` (a route nobody reaches), unused npm dep shipping in the production bundle, surviving V1 import. **P1** unused export in `src/lib` or `src/api`, a production-mode-only dead file under `src/`, duplicated block ≥30 lines across ≥3 files, unused devDependency. **P2** unused barrel export, duplication <30 lines.

**Output:** grouped flat list, P0 first, capped at the top 30 findings by impact. Include verbatim under section 6 as **"Dead code & redundancy"**, immediately after the hardcoded-values subsection.

**Score impact** — Domain 4 (Correctness & tests) and Domain 7 (Architecture & boundaries): same thresholds as Step 3.5. **Cross-check with Step 3.5:** when the same hotspot appears in both (e.g. an identical literal duplicated across three views), count it once — the duplication finding subsumes the hardcoded one.

### Step 4 — Score the domains

Use this rubric (1–10 each, equal weight). Severity buckets: **P0** blocks production with real users, **P1** must land before GA, **P2** nice to have.

| #   | Domain                             | SRE PRR axis                 | What to look for                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ---------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Security posture                   | Architecture                 | Service-role client never reachable from a browser bundle (`src/lib/supabase/admin.ts` import scan clean); the browser holds no data client (Step 3); Supabase Auth + `user_roles` RBAC gates `/admin` and every mutating v2 route; per-request CSP nonce and the header set in `src/middleware.ts`; input validation on every external surface (v2 route param validation via `src/api/v2/utils/validation.ts`, AJV/strict schema on AFRIK ingest); API keys hashed PBKDF2-SHA256 ≥100k iterations, raw keys never stored; rate limiting real and per-tier, not dev-only in-memory; Sentry PII scrubber active with an EU DSN; RLS coverage net of drops (Step 3) with no `RLS=No` row.                                                                                                                                                                                                                                                                                                                                                                         |
| 2   | Secrets hygiene                    | Architecture                 | `.gitignore` covers every `.env` variant through repo rules, not the auditor's global excludes; full-history secret scan clean; workflow credentials supplied only through the GitHub Actions `secrets` context, never inline; a repo-wide secret scanner in CI **that is a required check** (agents push autonomously here — its absence is a standing P1); `.env.example` complete and value-free; `check:local-paths` green; no audit artifact leaked into `git status`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 3   | CI                                 | Change management            | **Measured, not configured**: the last runs of `ci.yml` and every domain-critical workflow (`data-integrity`, `editorial-rules`, `a11y`, `lighthouse`, `openapi-diff`, `e2e`) on `recette` are `success`; branch protection read from the API — the required status checks on `recette` and `main` listed, and a domain-critical workflow that is not required is a finding, not a footnote; every third-party action SHA-pinned per the CLAUDE.md hard rule, with Dependabot bumping them; `ci.yml` triggers cover the real merge paths (`pull_request` into `recette` and `main`); no domain-critical workflow silently `continue-on-error`. A workflow that has not run, was skipped or ran red scores as absent.                                                                                                                                                                                                                                                                                                                                             |
| 4   | Correctness & tests                | Performance metrics          | Vitest coverage at or above the thresholds declared in `vitest.config.ts`; tests present at each layer per the CLAUDE.md placement conventions (`src/lib/**/__tests__`, `src/api/v2/**/__tests__`, `src/app/api/v2/__tests__`, `src/lib/afrik/parsers/__tests__`); tests exercise the public interface, not internals; known pre-existing failures tracked, not growing; no stray `console.*` outside `@/lib/api/logger`; **no orphan files / unused exports / surviving V1 imports, in production mode as well as by the ratchet (Step 3.7)**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 5   | Deploy coherence                   | Change management + Capacity | **Publishing a GitHub Release is the only thing that deploys production** — `deploy-production.yml` on `release: published`, to the OVH VPS — and nothing else does: no push, no tag, and no Vercel git deployment (`vercel.json` keeps `git.deploymentEnabled: false`; the recette preview is built only on demand). The docs must say so and `docs/DEPLOYMENT.md` must match it. The last Release's deploy run is `success` (measured). The branch model holds (`recette` integrates, `main` releases). `production-data-sync.yml` and `deploy-production.yml` are both on `main`, because `workflow_run` only fires from the default branch. Every migration in `supabase/migrations/` is **measured** applied on recette and on production (Step 3), and `docs/runbooks/migration-state.md` agrees with that measurement; no duplicated migration prefix; a rollback path exists for a mid-deploy failure (`docs/runbooks/ovh-production-deploy.md`); **P0/P1 hardcoded values from Step 3.5 do not trap an operator into a redeploy**.                      |
| 6   | Ferry pipeline                     | Change management            | `ferry.config.yaml` parses and its `git.base_branch` / `git.target_branch` match the branch model; the `ferry-*.yml` workflows are consistent with each other on the ferry action version; the Jira column names the automation triggers on (`ferry-jira-automation-setup.md`) match the live `ETNI` board; ferry action pins are SHAs and consistent with what CLAUDE.md states; any superseded automation doc carries a SUPERSEDED banner.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 7   | Architecture & boundaries          | Architecture                 | The three-layer v2 API pattern holds (`src/app/api/v2/{resource}/route.ts` → `src/api/v2/handlers/` → `src/api/v2/services/`) with no route querying Supabase directly; the two data clients (`server` / `admin`) stay isolated and the browser never queries the corpus, per `CLAUDE.md`; the AFRIK strict models are never extended ad-hoc; `src/lib/api/openapiV2.ts` matches the routes actually served at `/docs/api`; **no untunable magic numbers (Step 3.5)** and **no significant duplication across views/handlers (Step 3.7)**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 8   | AFRIK data integrity & Source Tier | Change management            | The Step 3.6 result, **scored by the literal rubric**: count the failed checks among the eight — all pass → 9–10; one failure or `N/A` → 7–8; two failures → 5–6; three or more → ≤4. A failure is a failure whatever its severity or however latent it is argued to be; do not net a failed check against a strong one or round a band up. **Any P0 from Step 3.6 check 4** (a source with no tier, an empty `sources` block or an unidentifiable source, Wikipedia cited as the source, a weak source over-tiered, AI text without its `source_kind`, a tier outside the agreed vocabulary) **or any fiche outside either FR28 band caps this domain at 4** regardless of the rest — the editorial contract is the product.                                                                                                                                                                                                                                                                                                                                    |
| 9   | Performance & accessibility        | Performance metrics          | Lighthouse mobile thresholds enforced in `.lighthouserc.js` (perf ≥ 0.85, a11y = 1.0, best-practices ≥ 0.95) over the canonical routes (home + a country page + a people page), **and the last `lighthouse.yml` run on `recette` measured those thresholds and passed** — budgets that no run exercised score as absent, and a run that is not a required check is recorded as not blocking; `a11y.yml` axe-core not in advisory mode for `recette`/`main` and its last run green; `e2e.yml` covers a real user path **and its last run actually executed tests** (a run that reports success on zero tests is absent); mobile-first honoured at the project breakpoints (mobile 430px, tablet md 720px, desktop xl 800px). Publication fails closed to French-only: audit the canonical routes under `/fr`, under `/en` too whenever `SITE_LOCALE_MODE` publishes it, and confirm that an unpublished locale does not resolve; Core Web Vitals tracked.                                                                                                         |
| 10  | Docs & runbooks                    | Emergency response           | `README`, `CLAUDE.md` and `AGENTS.md` match reality and agree with each other (no stale dual-API claims; the locale posture stated as bilingual code with publication failing closed to French-only; Next.js 16; production Supabase self-hosted); `docs/DEPLOYMENT.md` describes the actual GitHub Release → OVH VPS path; `docs/runbooks/restore-procedure.md` exists, the last restore drill is < 12 months old, and its next-drill-due date is not in the past; `docs/runbooks/migration-state.md` agrees with the Step 3 migration measurement; `docs/api-contracts.md` matches `src/lib/api/openapiV2.ts`; every count a doc quotes matches a measurement taken this run (a stale count is a finding even when the doctrine around it is right); the declared operational source of truth is not older than the last operational change by > 7 days; every command a doc names exists in `package.json`; named owners for recurring loops (a literal `(owner)` placeholder is a finding); this skill agrees with `CLAUDE.md`; English-docs rule respected. |

Compute overall score = mean of the 10 domain scores, rounded to one decimal.

When two domains surface the same defect, pick **one canonical severity** for it before scoring, count it fully in the most causal domain, and reference it from the others — otherwise the same gap multi-penalizes the mean and the domains' relative order stops meaning anything.

### Step 5 — Answer the five canonical questions

Always open the report with explicit answers:

1. **Is the project ready for production?** Yes / No / Conditional, plus the 1–3 blockers. A promise the system makes to users that nothing delivers is not production-ready no matter the other scores.
2. **Is the AFRIK editorial surface sound?** The domain-critical question for this project. Walk the evidence: validator verdict, FR28 and FR28-strict failures (with counts), the Step 3.6 check 4 P0 counts (untiered sources, empty or unidentifiable sources, Wikipedia-as-source, over-tiered weak sources, AI text without `source_kind`, out-of-vocabulary tiers — each must be zero), the tier distribution and whether every layer can store it, FLG/PPL/ISO referential integrity, the reader-facing register, and whether `data-integrity.yml` actually gates PRs. A site that publishes unlabelled ethnographic claims fails this question even at 10/10 everywhere else.
3. **Can a new contributor go clone → running in one session?** Walk it end to end and turn every step that has no test, no doc, or only tribal knowledge into a P1:
   - `git clone` + `npm ci` (`.npmrc` carries `legacy-peer-deps=true` — intentional, Storybook vs the Next version).
   - `.env.example` → `.env.local`: is every required key documented?
   - `supabase/migrations/` apply cleanly, in order, on a fresh Supabase project?
   - `npx tsx scripts/migrateAfrikToDatabase.ts --target=recette` succeeds against an empty DB (reason about it; never run it against a real one)?
   - A first admin user can be seeded (`scripts/seedAdmin.ts`; if it is gone, that is the finding).
   - `npm run dev` boots with no runtime error.
   - `GET /api/v2/countries`, `/api/v2/peoples`, `/api/v2/language-families`, `/api/v2/search?q=wolof` all return 200 with non-empty data.
   - `/docs/api` renders the OpenAPI UI.
   - `/admin` requires Supabase Auth and respects the `user_roles` RBAC (`reader / contributor / moderator / admin / advisor`).
4. **What is the security posture?** One short paragraph + bullets: Supabase RLS coverage net of drops (the Step 3 table — any `RLS=No` row is a P0), per-request CSP nonce, API-key PBKDF2 hashing, rate-limit tiering reality, Sentry EU residency + PII scrubbing, service-role isolation and no browser data client, secrets hygiene, supply chain (SHA pinning, Dependabot, scanners), branch protection as measured.
5. **Is the score close to 8–9/10?** Quote the computed score, compare to target, list the top 3 gaps that would close the distance.

### Step 6 — Write the report

Update `docs/PRODUCTION-READINESS-AUDIT.md` in place. Bump the `Date:` field to today. English, per the repo's docs-language rule. In section 1, list what was **measured** and what was `N/A`, with the reason for each `N/A`.

Then output a concise summary to the user (≤ 30 lines): the five answers + the computed score + the top 3 actions. The full detail lives in the file.

### Step 7 — Verification

Before reporting done:

- [ ] All 10 domain scores justified by at least one piece of evidence (command output, run id, `file:line`).
- [ ] The five canonical questions are answered explicitly in section 2 of the report.
- [ ] No score is invented — if a check could not run (`--quick`, `--no-build`, missing credential, unauthenticated `gh`, refused API), mark it `N/A`, explain, and do not count it as a pass.
- [ ] CI, branch protection, Lighthouse, E2E and migration state were read as outcomes (run conclusions, protection API, ledger reads), not inferred from configuration.
- [ ] The Step 3 RLS coverage table is present, counted net of `DROP TABLE` / `DROP POLICY`, and every `RLS=No` row is flagged P0 in section 8.
- [ ] Step 3.5 ran: P0 + P1 hardcoded values listed under "Hardcoded values (P0/P1)", and Domains 5 and 7 reflect the penalty (or the count is stated as below threshold).
- [ ] Step 3.6 ran: all eight AFRIK checks have a verdict in section 10, with FR28 and FR28-strict counts reported separately, and Domain 8 was scored by counting failed checks literally.
- [ ] Step 3.7 ran, including knip in production mode: P0 + P1 dead-code findings listed under "Dead code & redundancy", and Domains 4 and 7 reflect the penalty. Cross-checked against Step 3.5 to avoid double-counting.
- [ ] Cross-domain defects were harmonized to one canonical severity before the mean was computed.
- [ ] `docs/PRODUCTION-READINESS-AUDIT.md` was updated and its Date field reflects today.
- [ ] `git status --porcelain` shows **only** `docs/PRODUCTION-READINESS-AUDIT.md` changed (plus the disclosed gitignored artifacts).

## Output Format

User-facing summary (printed at end):

```
EthniAfrica Audit — <YYYY-MM-DD>
Score: X.X / 10 (target 8–9)

1. Production-ready? <verdict + 1-line reason>
2. AFRIK editorial surface sound? <FR28 / FR28-strict counts, Source Tier P0 count, CI gate>
3. Clone → running in one session? <verdict + the blocking step, if any>
4. Security posture? <one line: RLS + CSP + auth + secrets>
5. Distance to 8–9? <top 3 actions>

Full report: docs/PRODUCTION-READINESS-AUDIT.md
```

## Out of Scope

- Fixing any gap found. The audit only **reports**; releases go through `/ethniafrica-release`, fixes through `/ethniafrica-ticket`.
- Any write against external services — Supabase, Sentry, Upstash, Plausible, Vercel, the OVH hosts, Confluence, Jira. The audit is local and read-only; read-only `gh` and ledger reads are in scope.
- Running or rolling back migrations; running `scripts/migrateAfrikToDatabase.ts` against any database.
- Generating or rotating API keys, service-role tokens, or session cookies.
- Running live load or Lighthouse against production. Domains score on recorded outcomes — CI run conclusions, job logs, the protection API, ledger reads — and on budgets, never on configuration alone.
- Editorial correction of AFRIK fiches. Finding an unlabelled or mislabelled source is this skill's job; rewriting the fiche belongs to the `afrik-curator` skill.
- Auditing the Confluence spec tree's content or the Jira board's hygiene — that surface belongs to `/ethniafrica-spec`.
