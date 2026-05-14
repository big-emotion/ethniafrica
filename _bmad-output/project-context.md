---
project_name: "ethniafrica"
user_name: "Jnk"
date: "2026-04-13"
sections_completed:
  [
    "technology_stack",
    "language_rules",
    "framework_rules",
    "testing_rules",
    "quality_rules",
    "workflow_rules",
    "anti_patterns",
  ]
status: "complete"
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Framework**: Next.js 16.0.8 (App Router), React 18.3.1
- **Language**: TypeScript 5.8.3 (`strict: false`, `strictNullChecks: false`)
- **Styling**: Tailwind CSS 3.4.17 + shadcn/ui (Radix UI primitives)
- **State**: TanStack Query 5.83
- **Backend**: Supabase (`@supabase/supabase-js` 2.81)
- **Validation**: Zod 3.25, react-hook-form 7.61
- **Testing**: Vitest 4 + Testing Library + happy-dom
- **Storybook**: 8.6 (`@storybook/react-vite`, NOT `@storybook/nextjs`)
- **Linting**: ESLint 9 + typescript-eslint, Prettier 3, Husky + lint-staged
- **Runtime helpers**: tsx 4.20, dotenv 17

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

- **Strict mode is intentionally off** (`strict: false`, `strictNullChecks: false`). This is a pragmatic codebase choice — do not add `!` non-null assertions to suppress errors. Use defensive `??` and `?.` instead, especially in API handlers and Supabase queries (untrusted data).
- **No `as` casts** as a first resort. Use type guards or `Zod.parse()`. If a cast is unavoidable (e.g. typing a Supabase row), document why in an inline comment.
- **Imports**: use the `@/` alias (maps to `src/`). Never use deep relative paths like `../../../lib/...`.
- **Promise discipline**: in async route handlers (`src/app/api/v2/*/route.ts`), always `return` or `.catch()` promises. No bare `Promise<void>` swallowing.
- **JSON-serializable responses**: API responses must be plain JSON. Convert `Date` → ISO string via `toISOString()`. Mentally `JSON.stringify(response)` before shipping.
- **Zod schema location**: never inline `z.object({...})` in route files. Co-locate schemas with handlers or place them in `src/api/v2/schemas/`.
- **Logger**: use `@/lib/api/logger` instead of `console.*` in API, services, and scripts.
- **API error responses**: format via `src/api/v2/utils/response.ts`. Validate route/query params via `src/api/v2/utils/validation.ts` (Zod) **in the route layer, before calling the service** — services assume valid input.
- **Path: `@/`** alias is mandatory; loose TS is no excuse for sloppy imports.

### Language & Routing (French-only)

- `Language = "fr"` only in `src/types/shared.ts`. Do NOT reintroduce `"en" | "es" | "pt"` or `language === "en" ? ... : ...` ternaries.
- `src/lib/routing.ts` and `src/lib/translations.ts` are **foundational**: they retain a multi-language _shape_ but only `fr` is populated. Do not re-add `en/es/pt` blocks ad-hoc — reopening multilingual support requires a coordinated change across both files plus the `Language` type.
- **Code-English / UI-French / Chat-French split**:
  - All code-level strings — comments, JSDoc, commit messages, logger output, Zod validation messages, thrown error messages — must be in **English**.
  - Only user-facing strings in `src/lib/translations.ts` are in **French**.
  - Conversation with Claude may be in French; written artifacts are still English.

### Framework-Specific Rules

#### Next.js 16 (App Router)

- All app code lives under `src/app/[lang]/` — pages are localized via the `[lang]` segment (currently `fr` only). Never create top-level user-facing routes outside `[lang]`.
- API routes follow the **3-layer pattern**:
  `src/app/api/v2/{resource}/route.ts` → `src/api/v2/handlers/{resource}.ts` → `src/api/v2/services/{resource}.ts`.
  Route layer = parsing/CORS/caching. Handler = business logic. Service = Supabase queries. Do not collapse layers.
- CORS headers come from `src/lib/api/cors.ts`. Cache-Control: mutable data → `revalidate=0`; stable reference data (families, countries) → `s-maxage=86400, immutable`.
- Every new/changed route MUST update the OpenAPI spec at `src/lib/api/openapiV2.ts` — the spec is part of the public contract.
- Middleware (`src/middleware.ts`) protects `/admin` routes via session cookie. Do not bypass.

#### React 18

- Server Components by default; add `"use client"` only when needed (state, effects, browser APIs, event handlers).
- shadcn/ui (Radix) primitives for all UI — do NOT introduce another component library.
- Use the existing `useListView` hook (`src/hooks/use-list-view.ts`) for shared list-view logic instead of re-implementing.
- Error boundary lives at `src/app/[lang]/error.tsx`; loading at `src/app/[lang]/loading.tsx`.

#### Supabase (three clients — do not mix)

- `src/lib/supabase/client.ts` — browser only (anon key, `NEXT_PUBLIC_*`).
- `src/lib/supabase/server.ts` — server-side / RSC.
- `src/lib/supabase/admin.ts` — service-role key, **server-only**. Never import from client components or browser-reachable code paths. Leaking the service role key is a security incident.
- Frontend reads go through `src/lib/afrikLoader.ts` or queries under `src/lib/supabase/queries/afrik/`. Avoid raw Supabase calls in components.

#### TanStack Query

- Use TanStack Query for client-side server-state. Do not roll your own `useEffect + setState` pattern for remote data.

#### Storybook

- Framework MUST be `@storybook/react-vite` (NOT `@storybook/nextjs` — incompatible with Next 16). Configs at `.storybook/main.ts` and `.storybook/preview.ts`. Install with `--legacy-peer-deps`.

### Testing Rules

- **TDD is mandatory**: write failing tests BEFORE implementation. Red → Green → Refactor.
- **Runner**: Vitest 4 with happy-dom. `npm run test` (single run) before commits; `npm run test:watch` while iterating.
- **Test placement** (colocated under `__tests__/`):
  - Unit: `src/lib/**/__tests__/**/*.test.ts`
  - Handlers/services: `src/api/v2/**/__tests__/**/*.test.ts`
  - API routes: `src/app/api/v2/__tests__/**/*.test.ts`
  - Parsers: `src/lib/afrik/parsers/__tests__/**/*.test.ts`
  - Components: alongside the component as `*.test.tsx`
- **Run a single file**: `npx vitest run path/to/file.test.ts`. Pattern: `npx vitest run -t "pattern"`.
- **Pre-existing failures (do not "fix" without explicit scope):**
  - 6 failures in `scripts/__tests__/migrateAfrikToDatabase.test.ts` (Supabase mock)
  - 4 failures in handler tests (Supabase mock)
    These are known and orthogonal — touching them is out of scope unless the task is explicitly to fix them.
- **Mocks**: prefer real fixtures over deep mocks for AFRIK parsers/loaders. Mocking the Supabase client at the wrong layer is the most common test-bug source in this repo.
- **Do NOT retrofit tests** after the fact to claim TDD compliance — the failing test must precede the change.
- **`make check`** runs lint + type-check + tests; use it before declaring work done.

### Code Quality & Style Rules

- **KISS over cleverness**: prefer simple, boring solutions. One function = one responsibility. No premature abstraction.
- **Scope discipline**: touch only what the task requires. Do NOT "clean up" orthogonal code, remove comments you don't understand, or refactor adjacent systems as a side effect.
- **Comments**: default to NONE. Only add a comment when the WHY is non-obvious (hidden constraint, subtle invariant, workaround for a specific bug). Never narrate WHAT the code does — names should do that. No "added for X flow" / "used by Y" / issue-number comments.
- **Linting**: ESLint 9 + typescript-eslint + Prettier 3, enforced by Husky + lint-staged on commit.
- **Known broken tooling** (do not waste cycles fixing unless asked):
  - `npm run lint` (`next lint`) has a broken project directory config.
  - `npx eslint src/` is also broken (no `eslint.config.js` at root).
- **File naming**: components `PascalCase.tsx`; hooks `use-*.ts(x)`; utilities `kebab-case.ts` or domain-grouped folders.
- **shadcn/ui** is the canonical UI primitive set — extend, don't replace.
- **No `Co-Authored-By` trailers** on commits, PRs, or MRs (project + global rule).

### Development Workflow Rules

- **Branches**: `main` is the base; `recette` is the active working branch. Many old feature branches (ETNI-17, ETNI-49, etc.) exist — most are safe to delete after audit.
- **Commits**: conventional-style prefix (`feat:`, `fix:`, `docs:`, `chore:`). Always English. NO `Co-Authored-By` trailers.
- **Jira**: project ETNI · board https://big-emotion.atlassian.net/jira/software/projects/ETNI/boards/67 · active Sprint 3 (ID 101). Reference ticket IDs in branch names where applicable.
- **Pre-commit**: Husky + lint-staged runs ESLint `--fix` + Prettier on `*.{ts,tsx}` and Prettier on `*.{json,md,yml,yaml}`.
- **Before declaring work done**: `make check` (lint + type-check + tests). Confirm no NEW failures vs the known pre-existing set.
- **AFRIK data scripts**:
  - `tsx scripts/migrateAfrikToDatabase.ts` — migrate AFRIK files to Supabase
  - `tsx scripts/validateAfrikData.ts` — validate integrity
- **DB migrations**: under `supabase/migrations/`. `007_remove_v1_add_v2_contribution_types.sql` is not yet applied to prod.
- **Confirm before risky actions**: pushes, force-push, branch deletion, PR creation, `git reset --hard`, third-party uploads. Local edits and tests are free; anything visible to others or hard to reverse needs explicit user OK.

### Critical Don't-Miss Rules (Anti-Patterns & Gotchas)

#### Security

- **NEVER** import `src/lib/supabase/admin.ts` from client components, browser-served code, or any file lacking server-only guarantees. Service-role key exposure is a security incident.
- **NEVER** commit `.env*` files or hardcode `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, or any secret. Stage files explicitly — avoid `git add -A` / `git add .`.

#### AFRIK Data Discipline (Domain)

- **Strict models**: `public/modele-*.txt` are prescriptive — never skip, rename, or invent sections.
- **Source Tier Policy** — every claim must cite Tier 1 or Tier 2; otherwise **remove the claim**.
  - **Tier 1 (preferred)**: UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA — cite directly.
  - **Tier 2 (fallback)**: Wikipedia is a _meta-source_, never citable itself. Use it only to locate the underlying **primary source** (peer-reviewed paper, official IGO/government document, academic publication). Cross-check the claim across **≥2 language versions** of Wikipedia. Cite the **primary source URL**, not the Wikipedia article. If no language version provides a primary source, **remove the claim**.
  - **Tier 3 (forbidden)**: Wikipedia articles themselves, blogs, social media, AI-generated content, secondary aggregators without their own primary sources.
  - Each `sources` entry must record `tier: 1` or `tier: 2`. Tier-2 entries must record the Wikipedia language versions cross-checked in `notes`.
- **Database table names** (canonical, per migration `006_afrik_schema.sql`): `afrik_language_families`, `afrik_languages`, `afrik_peoples`, `afrik_countries`, `afrik_people_countries`. The French names (`afrik_familles_linguistiques`, `afrik_langues`, `afrik_peuples`, `afrik_pays`) do NOT exist in the DB — using them causes runtime failures.
- **Demographics**: 2025 reference year; populations must sum to 100% per country. Validator `scripts/validateAfrikData.ts` FR28 hard-gates at **[95, 105]%** and emits a soft warning **FR28-strict** for any fiche outside **[99, 101]%** (the doctrinal target). The hard gate will be tightened to [99, 101]% once every fiche fits inside it. New / updated fiches must aim for [99, 101]%. Rationale: `docs/adr/0001-fr28-demographic-tolerance.md`.
- **Colonial terms**: keep but explain why problematic; always provide auto-appellations (endonyms).
- **Consistency**: TXT demographics MUST match database records.

#### Mobile-First (Frontend)

- **Always design and review starting from mobile (320–430px)**, then tablet, then desktop. Never the inverse.
- EthniAfrica breakpoints: mobile 430px · tablet `md` 720px · desktop `xl` 800px (max-width container for country page).
- Country detail page uses the "Carte vivante" variant — `CountryDetailViewV2` orchestrates 8 scrollable sections; data flows through `src/lib/countryDataTransformer.ts`; tokens live in `src/styles/country-tokens.css`.

#### V1 → V2 Migration is COMPLETE

- All V1 code is removed. Do NOT reintroduce: `entityKeys.ts`, `entityTranslations.ts`, `datasetLoader.server.ts`, `types/ethnicity.ts`, V1 Supabase queries (`regions.ts`, `countries.ts` v1, `ethnicities.ts`, `presences.ts`).
- Routing `PageType` is `"countries" | "families" | "peoples" | "search"` — no `regions` / `ethnicities`.
- Contribution types: `new_people`, `update_people`, `new_country`, `update_country`, `new_language_family`, `update_language_family`.

#### Tooling Gotchas

- **Storybook**: `@storybook/react-vite` ONLY. `@storybook/nextjs` is incompatible with Next 16 (`next/config` removed). Install with `--legacy-peer-deps`.
- **Playwright MCP**: `file://` URLs are blocked — serve static HTML over HTTP (`npx http-server docs/spec-v2 -p 8889`). Chrome can conflict with active sessions — close Chrome or call `browser_close` first.
- **Temp file hygiene**: delete anything created under `/tmp` or `.playwright-mcp/` as soon as the task using it is done. `rm -rf .playwright-mcp/` after each Playwright session. Never commit it.
- **MCP installs (global)**: never write to `/Users/jnk/.claude/.mcp.json` (not read by Claude Code). Use `/Users/jnk/.claude.json` under `mcpServers` for user-level installs.

#### Performance

- AFRIK queries use the structured `logger`, not `console.error`.
- Watch for N+1: previously fixed in `peoples.ts` via batch `getCountryRelationsMap()`. Apply the same batching pattern when joining country relations.
- Partner-config JSONs: preserve original indentation and field order verbatim — never reformat unless explicitly asked.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code in this repo.
- Follow ALL rules exactly as documented. When in doubt, prefer the more restrictive option.
- If a new pattern emerges or a rule turns out to be wrong, propose an update — do not silently deviate.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update when the technology stack, AFRIK methodology, or workflow changes.
- Review periodically; remove rules that have become obvious or no longer apply (e.g. once V1 references stop showing up in PRs, drop the V1→V2 callout).

Last Updated: 2026-04-13
