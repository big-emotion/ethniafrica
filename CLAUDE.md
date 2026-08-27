# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EthniAfrica** is a Next.js 16 App Router app publishing an open, sourced atlas of African peoples, languages, linguistic families and countries, organised by the **AFRIK methodology** in a decolonial editorial posture.

The site is **French-only**: `Language = "fr"` in `src/types/shared.ts`, and `src/middleware.ts` redirects any other two-letter locale segment to `/fr`. The `[lang]` route segment survives from the multilingual V1 but only ever resolves to `fr` — do not reintroduce `en`/`es`/`pt` branches.

The public REST API is **v2 only** (`/api/v2/*`). V1 (regions/ethnicities) was removed; anything referring to `regions` or `ethnicities` as entities is stale, including most of `README.md`.

## Commands

```bash
npm run dev                 # dev server on :3000
npm run build               # production build
make check                  # full local gate: lint + typecheck + format:check + all tests (must stay < 5 min)

npm run lint                # eslint . (flat config; `next lint` is deliberately NOT used — see eslint.config.mjs)
npm run typecheck           # tsc --noEmit
npm run format              # prettier --write .

npm run test                # vitest run (happy-dom)
npm run test:watch
npm run test:coverage       # enforced thresholds: 70% statements/functions/lines, 60% branches
npm run unit-tests          # src/lib only
npm run integration-tests   # src/app/api
npm run api-tests           # src/app/api/v2

npx vitest run path/to/file.test.ts   # single file
npx vitest run -t "test name"         # single test by name

npm run e2e                 # Playwright; intentionally outside `make check`
npm run storybook           # :6006
```

### Repo-specific gates (all CI-blocking on every PR)

```bash
npm run lint:req                    # @req annotation traceability (see below)
npm run check:jira-template         # docs/templates/jira-ticket-template.md must exist and match
npm run check:action-pins           # every third-party GitHub Action must be SHA-pinned
npm run check:env-example           # .env.example and the code agree, both directions
npm run check:migration-files       # no duplicate version or name, no hole in the sequence
npm run test:charter-contracts      # aggregated design-charter contract suite
npx tsx scripts/validateAfrikData.ts        # AFRIK data integrity (FR26–FR52)
npx tsx scripts/ci/checkEditorialRules.ts   # decolonial editorial rules on fiches
```

## Architecture

### API: three layers, never two

Every `/api/v2` endpoint splits into route → handler → service. Adding an endpoint means touching all four of these:

```
src/app/api/v2/{resource}/route.ts   # HTTP: parsing, CORS, cache headers
src/api/v2/handlers/{resource}.ts    # business logic, serialization
src/api/v2/services/{resource}.ts    # Supabase queries — the only layer that talks to the DB
src/lib/api/openapiV2.ts             # OpenAPI spec (openapi:diff gates breaking changes)
```

Shared: `src/api/v2/utils/{validation,response}.ts`, `src/api/v2/schemas/` (zod), `src/api/v2/serializers/`, `src/lib/api/cors.ts`.

`src/middleware.ts` is load-bearing and does four unrelated jobs: CSP/security headers with a per-request nonce, locale canonicalization to `/fr`, API-key validation for `/api/v2/*` (PBKDF2-hashed keys in `api_keys`; same-origin requests are exempt so the frontend needs no embedded key), and Upstash rate limiting.

### AFRIK data pipeline

The corpus lives as JSON files in git, **not** only in the database:

```
dataset/source/afrik/           # ~890 .json fiches — the editorial source of truth
  famille_linguistique/FLG_*.json
  peuples/FLG_*/PPL_*.json
  pays/*.json
  {relations,noms,migrations}/
        ↓ src/lib/afrik/loaders/*JsonLoader.ts
Supabase tables: afrik_language_families, afrik_languages, afrik_peoples,
                 afrik_countries, afrik_people_countries
        ↓ src/api/v2/services/*
```

Fiche shape is fixed by the strict models in `public/modele-*.json` (peuple, pays, linguistique, nom, relation, source, migration, récit-oral, frontière-coloniale). Never skip, rename, or invent a section.

Hierarchy: **linguistic family → language → people → country.** IDs: families `FLG_*`, languages ISO 639-3, peoples `PPL_*`, countries ISO 3166-1 alpha-3.

Editorial work on fiches has a dedicated project skill: `.claude/skills/afrik-curator/`.

Loading the corpus is `scripts/migrateAfrikToDatabase.ts --target=recette|production` (`--target=staging` is retired and throws). `scripts/lib/afrikSyncTarget.ts` checks in the recette ref only; production comes from `AFRIK_PRODUCTION_SUPABASE_URL` with **no default**, because the default used to hold the recette ref and every production deploy loaded the corpus into recette. Runbook: `docs/runbooks/afrik-data-sync.md`.

### Supabase: three clients, never interchangeable

- `src/lib/supabase/client.ts` — browser, anon key
- `src/lib/supabase/server.ts` — SSR / server components
- `src/lib/supabase/admin.ts` — service-role key, **server-only**

Migrations are numbered and sequential in `supabase/migrations/` (042 at last count). A merge into `recette` applies the pending ones there automatically (`migrate-recette.yml`, needs the `RECETTE_SUPABASE_DB_URL` secret); production stays manual on purpose. `npm run migrations:diff` shows what a database is missing, `npm run check:migration-state` fails on anything pending, orphaned or edited-after-applying. Which of them are live on which project is tracked in `docs/runbooks/migration-state.md` — the ledger records some under timestamp versions rather than filenames, so a tool comparing version strings reports applied migrations as pending. **Both Supabase projects label their environment "production"** — a Supabase project has exactly one environment and Supabase names it "production", so the label describes the project, not the application it serves. `shmrjtnfbqzceovroqjj` serves **recette**; a second project, not visible from this repo's credentials, serves production. Every migration is a two-step rollout: recette first, prod second. Applying one and calling it done has already left a corpus loaded on one and missing on the other.

### Frontend

- **Start at `docs/design/atlas-charter.md`.** It is what the atlas surface asserts: the three cartographic encodings and the hard rule that a people never receives a closed line, the per-surface accent scope, the three entry points, the doctrine for showing a field the corpus does not fill, the panel's two anchorings, and the motion tokens. The reviewed rendering is `docs/design/mockups/` (four pages, `node build.js`); the engine decision and what actually shipped instead is `docs/adr/0007-atlas-globe-engine.md`. A charter-named test file is picked up by `test:charter-contracts` automatically.
- **Anything about the games — invoke `/afrik-game-designer` first, every time.** Inventing, critiquing, scoping or killing a game; writing or repairing quiz items; auditing the _Jouer_ hub; or just an offhand "ce jeu est nul" — the skill loads `docs/design/games-charter.md`, which is the contract that surface owes. The charter records why the hub cuts from eleven games to three, the item doctrine (stimulus → stem → options: a round that never names its subject is a coin flip), the near-pool rule for distractors, and the interface rules. Reasoning about a game without it re-derives conclusions that are already written down, usually wrongly.
- Tailwind + shadcn/ui in `src/components/ui/`; feature components grouped by domain (`country/`, `people/`, `family/`, `fiche/`, `home/`, `quiz/`, `search/`, …).
- Design tokens are CSS custom properties in `src/styles/tokens/*.css` plus per-surface `country-tokens.css` / `people-tokens.css`. Colours belong in tokens, not literals — `src/styles/__tests__/colorTokens.test.ts` and the charter contract suite assert this.
- Storybook uses **`@storybook/react-vite`, not `@storybook/nextjs`** — Next 16 dropped `next/config`, which `@storybook/nextjs` requires. Installs need `--legacy-peer-deps`.
- Mobile-first is mandatory. Breakpoints: mobile 430px · tablet `md` 720px · desktop `xl` 800px (country container max-width).

## Non-obvious rules

### `@req` traceability (`npm run lint:req`, CI-blocking)

Every `test()`/`it()` call needs `// @req REQ-NNN` within the 3 lines above it, and any exported symbol annotated `@req REQ-NNN` must have a test annotated with the same ID. IDs are validated against `docs/confluence-spec/req-catalog.json`. Pre-existing tests are grandfathered by diffing against the previous file content, so _new or renamed_ tests are the ones that fail.

**Never delete `docs/confluence-spec/*.json` or `docs/templates/jira-ticket-template.md`.** With the catalog missing, `lintReqAnnotations.ts` returns early and reports OK while checking nothing — a silently disarmed gate, which is worse than a red one.

### Custom ESLint rules (`eslint/rules/`, plugin `afh`)

- `afh/no-bare-people-name` — people/language names in `components/people/**` and `components/country/**` must render through `<AutonymExonymHeading>` so autonyms keep their exonyms and `lang` attribute.
- `afh/afh-error-misuse` — the `--afh-error` token is reserved for error/invalid contexts.
- `no-console` is an **error** in `src/api/**`, `src/app/api/**`, `src/lib/{api,afrik,auth,supabase}/**`. Use `import { logger } from "@/lib/api/logger"`.
- `@typescript-eslint/no-explicit-any` is an error in `src/`, a warning in tests (Supabase builder mocks are deep chained objects).

The rules' own tests are `.js` under `eslint/__tests__/` and are explicitly listed in `vitest.config.ts` — they once fell outside the glob and never ran, which is how a broken rule shipped.

### Source Tier Policy (enforced by `validateAfrikData.ts`)

**Nothing is forbidden. Everything is labelled.** A source is never rejected for being weak; it is
tiered, and the fiche's confidence follows from the tiers it rests on. Excluding oral, community and
amateur knowledge would itself be a colonial filter — the decolonial posture is to publish the claim
_and_ its provenance, not to suppress the claim.

The gate is therefore not "reject weak sources" but **"every source carries an explicit tier"**. A
`sources` entry with no tier is a blocking error.

One three-value scale is used everywhere — code identifier, DB value, API payload and user-facing
label all say the same thing:

| Identifier (code + DB) | Label (UI)       | Confidence weight | What it covers                                                                                  |
| ---------------------- | ---------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `official`             | **Officielle**   | 1.0               | UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA, national statistics institutes        |
| `referenced`           | **Référencée**   | 0.7               | Published, identifiable, verifiable work — academic, press, books. Not necessarily official     |
| `unverified`           | **Non vérifiée** | 0.4               | Aggregators, tertiary encyclopedias, blogs, social media, community accounts, AI-generated text |

This supersedes the earlier Tier 1/2/3 policy, under which Tier 3 was forbidden and an uncitable
claim was deleted. It also settles the aggregator question (Joshua Project, 101lasttribes,
peoplegroups): they are cited, at `unverified`.

Wikipedia is not a source. A primary source _discovered through_ Wikipedia is cited at its own tier,
by its own URL, and its `notes` field records which Wikipedia language versions were crossed so the
chain stays auditable.

#### Tier is authority; `source_kind` is provenance

They are orthogonal axes and must not be collapsed:

- `tier` — how much authority the source carries.
- `source_kind` — what kind of thing the source is (`sources.source_kind`, migration `031`).

AI-generated text is the worked example. It is not a level of authority — it is unverified content
whose _origin_ happens to matter. So it is `tier: "unverified"` + `source_kind: "ai_generated"`, and
`recompute_confidence()` multiplies rather than branches:

```sql
CASE s.tier
  WHEN 'official'   THEN 1.0
  WHEN 'referenced' THEN 0.7
  WHEN 'unverified' THEN 0.4
END
* CASE WHEN s.source_kind = 'ai_generated' THEN 0.5 ELSE 1.0 END   -- 0.4 × 0.5 = 0.2
```

which reproduces the retired `ai-enriched` weight of 0.2 exactly. The UI keeps the distinction
visible: the **Non vérifiée** badge plus an AI provenance marker driven by `source_kind`, never by
the tier.

A fiche sourced only at `unverified` is published and visibly marked low-confidence through
`ConfidenceChip`. That is the intended outcome, not a defect to fix.

### Demographics

2025 reference year. Per-country `percentageInCountry` must sum to 100%. The validator has a hard band [95, 105] (FR28) and a strict target band [99, 101] (FR28-strict). Both were advisory while ~30 countries' splits were re-sourced; that burn-down is finished — measured at zero offenders — so **both now fail the build**, and a fiche can no longer drift back out. Which checks remain advisory is one exported constant, `SOFT_CHECK_NAMES` in `scripts/validateAfrikData.ts`; only `FR52-coverage` is still in it.

### Colonial terminology

Keep colonial-era names but explain why they are problematic, and always surface the autonym. `checkEditorialRules.ts` enforces: an autonym is required at `confidence >= medium`, and ≥2 sources when `classification_status` is `contested` or `colonial-legacy`.

### TypeScript

`strict: false`, `strictNullChecks: false`, `noImplicitAny: false`. The compiler will not catch nullability here — tests are the real gate. `@/` aliases `src/`.

## Workflow

### Git

- **One worktree per agent session.** Any agent task that writes to the repo — a background job, a Ferry run, `/ethniafrica-ticket`, a hand-launched sub-agent — must first isolate itself in its own git worktree (`EnterWorktree`, or `git worktree add .claude/worktrees/<name>`), never edit in the shared checkout. Parallel sessions sharing one working copy overwrite each other's edits and switch branches under each other. Read-only work — search, audit, answering a question — stays in place. Commit and push before the session ends: the worktree can be deleted with it.
- `recette` is the integration branch; `main` is the base. **`recette` is protected** — always branch and open a PR, never push directly.
- `recette ↔ main` sync PRs must use a **merge commit**, not a squash; squashing has broken the ancestry before.
- Conventional commits (commitlint on `commit-msg`). Pre-commit runs `type-check` + `lint-staged`.
- Never add `Co-Authored-By` trailers.
- SHA-pin every third-party GitHub Action (`uses: org/action@<40-char-sha>  # <semver>`); `check:action-pins` enforces it and Dependabot bumps the pins weekly.

### Spec and tickets

**Confluence is the source of truth** for Requirements / Decisions / Architecture — not the repo. The in-repo copies were deliberately deleted (commit `0e753c07`) because they had drifted into a competing spec; don't recreate them. Page IDs and the Jira project (`ETNI`) are in `docs/confluence-spec/config.json`. Requirements live in twelve sub-pages under the Requirements parent — reading the parent alone will make you re-allocate an existing REQ number.

Project skills wrap the loop: `/ethniafrica-spec` (investigate → draft Pending REQ/DEC/ARCH + Jira tickets), `/ethniafrica-ticket` (take a Jira ticket end-to-end in an isolated worktree), `/ethniafrica-audit`, `/ethniafrica-release`.

Ferry (`ferry.config.yaml`) drives agent automation off Jira status transitions on ETNI — Refinement → READY FOR DEV → In Review → Changes Requested → TO MERGE — branching `ferry/*` off `recette`.

### Test placement

Colocated `__tests__/` next to the code: `src/lib/**`, `src/api/v2/**`, `src/app/api/v2/__tests__/`, `src/components/**`, `eslint/__tests__/`. Known-failing tests are quarantined under any `__tests__/known-failing/` directory (excluded in `vitest.config.ts`) rather than deleted, so the gate cannot mask new regressions.

### Development principles

TDD (failing test first) and KISS. Tests exercise the public interface — no reflection into internals, no mock-everything suites that assert nothing. Comments justify non-obvious decisions; they never narrate what the code already says. All docs, comments, commit messages and PR descriptions in **English**, even when the conversation is in French.

### Environment

Copy `.env.example` → `.env.local`. Required to run: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only). Optional subsystems: `UPSTASH_REDIS_REST_*` (rate limiting), `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`, `REVALIDATE_SECRET`, `SUPABASE_WEBHOOK_SECRET`, `NEXT_PUBLIC_FEATURE_QUIZ`. The CI build passes placeholder Supabase values so fork and Dependabot PRs still gate.

Admin auth is Supabase Auth (magic-link, GitHub, Google OAuth); roles live in `user_roles` with values `reader`, `contributor`, `moderator`, `admin`, `advisor`. First admin: `ADMIN_EMAIL=… npx tsx scripts/seedAdmin.ts`.
