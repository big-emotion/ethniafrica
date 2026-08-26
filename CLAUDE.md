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

### Supabase: three clients, never interchangeable

- `src/lib/supabase/client.ts` — browser, anon key
- `src/lib/supabase/server.ts` — SSR / server components
- `src/lib/supabase/admin.ts` — service-role key, **server-only**

Migrations are numbered and sequential in `supabase/migrations/` (039 at last count). **Two Supabase projects are both labelled "production"** — the recette one and the real prod one. Every migration is a two-step rollout: recette first, prod second. Applying one and calling it done has already left a corpus loaded on one and missing on the other.

### Frontend

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

Every `sources` entry must carry `tier: 1` or `tier: 2`. A claim that cannot be cited at Tier 1 or 2 is **removed**, not softened.

- **Tier 1** — cite directly: UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA.
- **Tier 2** — a primary source _discovered through_ Wikipedia. Cross-check ≥2 language versions, follow through to the primary source, and cite that source's URL — never the Wikipedia article. The `notes` field must record which Wikipedia language versions were crossed so the chain stays auditable; the validator greps `notes` for `wikipedia` on tier-2 entries and fails without it.
- **Tier 3 — forbidden as a `sources` entry**: Wikipedia articles themselves, blogs, social media, forums, AI-generated text, aggregators with no primary source of their own.

### Demographics

2025 reference year. Per-country `percentageInCountry` must sum to 100%. The validator has a hard band [95, 105] (FR28) and a strict target band [99, 101] (FR28-strict); **both currently run as `soft: true`** while ~30 countries' splits are re-sourced, so they warn rather than fail. New and updated fiches must land inside [99, 101] regardless.

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
