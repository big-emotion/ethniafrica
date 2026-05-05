# EthniAfrica — Developer agent overrides

## Package manager

Use `npm`. The repo ships `package-lock.json`; do not invoke `pnpm`, `yarn`, or `bun`.

## Validation commands (run all three before declaring done)

- `npm run lint`
- `npm run type-check`
- `npm run test`

You may also run `make check` which chains all three.

## Single-test runs

- File: `npx vitest run path/to/file.test.ts`
- Pattern: `npx vitest run -t "pattern"`

## Do NOT run

- `npm install` — deps are pre-installed by CI
- `npm run build` — too slow for inner-loop validation; only run if explicitly required
- `tsx scripts/migrateAfrikToDatabase.ts` — touches Supabase, never run from the agent

## Repo conventions

- TypeScript `strict: false` (do not turn it on as a side effect)
- `@/` path alias maps to `src/`
- Tests live next to the code under `__tests__/` directories
- Never add `Co-Authored-By` trailers to commits
