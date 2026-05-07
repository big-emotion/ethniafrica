# Development Guide — EthniAfrica

## Prerequisites

- **Node.js** 18+
- **npm**
- **Supabase** project (URL + anon key + service-role key)

## Initial Setup

```bash
git clone https://github.com/big-emotion/ethniafrica.git
cd ethniafrica
npm install
cp env.dist .env.local
# Fill in .env.local (see below)
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # server-side only — never expose
```

Never commit `.env*`. Stage files explicitly on commit (avoid `git add -A` / `git add .`).

## Common Commands

```bash
# Development
npm run dev              # Start dev server at http://localhost:3000
npm run build            # Production build
npm run start            # Run production build locally
make check               # Lint + type-check + tests (run before declaring work done)

# Quality
npm run type-check       # tsc --noEmit
npm run lint             # next lint   (⚠ broken project-dir config — known issue)

# Testing (Vitest 4)
npm run test             # Run all tests once
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run unit-tests       # src/lib tests
npm run api-tests        # src/app/api/v2 tests
npm run integration-tests # src/app/api tests

# Run one file / pattern
npx vitest run path/to/file.test.ts
npx vitest run -t "pattern"

# Storybook
npm run storybook        # Dev @ :6006
npm run build-storybook
```

## AFRIK Data Scripts

```bash
tsx scripts/migrateAfrikToDatabase.ts   # dataset/source/afrik → Supabase
tsx scripts/validateAfrikData.ts        # integrity checks
tsx scripts/convertAfrikToJson.ts       # TXT → JSON conversion
```

## Development Principles (enforced)

### TDD is mandatory

Red → Green → Refactor. Failing test must **precede** the implementation change — no retroactive tests to "claim TDD compliance".

### KISS

One function, one responsibility. Prefer boring over clever. No premature abstraction.

### Scope discipline

Touch only what the task requires. Do NOT clean up orthogonal code, remove comments you don't understand, or refactor adjacent systems as a side effect.

### Comments

Default to NONE. Only add a comment when the WHY is non-obvious (hidden constraint, subtle invariant, workaround). Never narrate WHAT the code does.

### Code-English / UI-French

- All code-level strings (comments, JSDoc, commit messages, logger output, Zod messages, thrown errors) → **English**
- Only strings in `src/lib/translations.ts` are **French**

## Adding an API Route (checklist)

1. Add `src/app/api/v2/{resource}/route.ts` — parsing, Zod validation (via `src/api/v2/utils/validation.ts`), CORS (`src/lib/api/cors.ts`), Cache-Control, then delegate to the handler.
2. Add `src/api/v2/handlers/{resource}.ts` — business logic.
3. Add `src/api/v2/services/{resource}.ts` — Supabase queries.
4. Update **`src/lib/api/openapiV2.ts`** (public contract — do not skip).
5. Write tests (route / handler / service) — TDD.

## Test Placement

| Area              | Path                                           |
| ----------------- | ---------------------------------------------- |
| Unit (`src/lib`)  | `src/lib/**/__tests__/**/*.test.ts`            |
| Handlers/services | `src/api/v2/**/__tests__/**/*.test.ts`         |
| API routes        | `src/app/api/v2/__tests__/**/*.test.ts`        |
| Parsers           | `src/lib/afrik/parsers/__tests__/**/*.test.ts` |
| Components        | colocated `*.test.tsx`                         |

## Known Pre-existing Failures (do NOT fix incidentally)

- 6 failures in `scripts/__tests__/migrateAfrikToDatabase.test.ts` (Supabase mock)
- 4 failures in handler tests (Supabase mock)

These are orthogonal. Out of scope unless the task is explicitly to fix them.

## Known Broken Tooling

- `npm run lint` — broken project-dir config
- `npx eslint src/` — no root `eslint.config.js`
- Do not waste cycles "fixing" these unless asked.

## Git & Branches

- `main` is base; `recette` is the active working branch.
- Conventional-style commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`) — English.
- **No `Co-Authored-By` trailers** on any commit / PR / MR.
- Husky + lint-staged runs ESLint `--fix` + Prettier on `*.{ts,tsx}` and Prettier on `*.{json,md,yml,yaml}` pre-commit.
- Jira project: **ETNI** · active Sprint 3 (ID 101) · board: https://big-emotion.atlassian.net/jira/software/projects/ETNI/boards/67

## Before Declaring Work Done

1. `make check` (lint + type-check + tests) — passes with no NEW failures vs. the known pre-existing set.
2. Tests for the change exist and were written first.
3. OpenAPI spec updated if an API route changed.
4. No `console.*` in API / services / scripts (use `@/lib/api/logger`).
5. No `src/lib/supabase/admin.ts` imports from client-reachable code.
6. No `Co-Authored-By`.
