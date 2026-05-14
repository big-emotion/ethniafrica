# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Before writing any code, read `_bmad-output/project-context.md`** — it contains the critical, unobvious rules (Supabase client isolation, AFRIK data discipline, Storybook framework constraint, V1→V2 invariants, etc.) that AI agents must follow.

## Project Overview

**EthniAfrica** is a Next.js web application providing comprehensive data on African peoples, languages, linguistic families, and countries. It uses the **AFRIK methodology** to organize ethnographic and linguistic data in a decolonial approach.

Key features: public REST API (Swagger/OpenAPI), multilingual interface (fr/en/es/pt), Supabase (PostgreSQL) backend, admin interface for contribution moderation, data export (CSV/Excel).

## Common Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # TypeScript type checking
make check               # Run all checks (lint + type-check + tests)

# Testing (Vitest + happy-dom)
npm run test             # Run all tests once
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run unit-tests       # Unit tests only (src/lib)
npm run api-tests        # API v2 tests (src/app/api/v2)

# Run a single test file
npx vitest run path/to/file.test.ts
# Run tests matching a pattern
npx vitest run -t "pattern"

# AFRIK data migration
tsx scripts/migrateAfrikToDatabase.ts    # Migrate AFRIK files to Supabase
tsx scripts/validateAfrikData.ts         # Validate AFRIK data integrity
```

## High-Level Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router), React 18, TypeScript (`strict: false`)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query
- **Backend**: Supabase (PostgreSQL)
- **API Docs**: Swagger/OpenAPI
- **Testing**: Vitest + Testing Library + happy-dom
- **Imports**: `@/` alias maps to `src/`

### API Architecture (AFRIK)

Database-driven, layered architecture:

- Routes: `src/app/api/v2/{language-families,peoples,countries,search}/`
- Data: Supabase via `src/lib/supabase/`
- Docs: `/docs/api`
- OpenAPI spec: `src/lib/api/openapiV2.ts`

### API Layered Pattern

Endpoints follow a 3-layer pattern:

```
src/app/api/v2/{resource}/route.ts    → Route handler (parsing, CORS, caching)
  ↓ calls
src/api/v2/handlers/{resource}.ts     → Business logic handler
  ↓ calls
src/api/v2/services/{service}.ts      → Supabase queries
```

Shared utilities: `src/api/v2/utils/validation.ts` (param validation), `src/api/v2/utils/response.ts` (response formatting), `src/lib/api/cors.ts` (CORS headers), `src/lib/api/logger.ts`.

### AFRIK Data Pipeline

Source `.json` files (AFRIK JSON v2 format) are loaded into Supabase:

```
dataset/source/afrik/                          → Raw .json files (strict model format)
  ├── famille_linguistique/FLG_*.json
  ├── peuples/FLG_*/PPL_*.json
  └── pays/*.json
      ↓ loaded by
src/lib/afrik/loaders/{entity}JsonLoader.ts    → Load into Supabase
      ↓ stored in
Supabase tables: afrik_language_families, afrik_languages, afrik_peoples, afrik_countries
```

### AFRIK Methodology

**Hierarchy**: Linguistic Family → Language → People → Country

**Identifiers**:

- Families: `FLG_xxxxx` (e.g., `FLG_BANTU`)
- Languages: ISO 639-3 (e.g., `swa`, `lin`)
- Peoples: `PPL_xxxxx` (e.g., `PPL_YORUBA`)
- Countries: ISO 3166-1 alpha-3 (e.g., `COM`, `ZAF`)

### Supabase Clients

Three client configurations for different contexts:

- `src/lib/supabase/client.ts` — Browser client (anon key, `NEXT_PUBLIC_*`)
- `src/lib/supabase/server.ts` — Server-side client (SSR)
- `src/lib/supabase/admin.ts` — Admin client (`SUPABASE_SERVICE_ROLE_KEY`, server-only)

### Internationalization

Languages: `fr` (default), `en`, `es`, `pt`. Pages under `src/app/[lang]/`.

- `src/lib/translations.ts` — UI string translations
- `src/lib/routing.ts` — Localized URL slugs (e.g., `/fr/pays`, `/en/countries`, `/es/paises`)
- `src/middleware.ts` — Admin route protection (session cookie check)

### Database Tables

**AFRIK** (canonical English names per migration 006): `afrik_language_families`, `afrik_languages`, `afrik_peoples`, `afrik_countries`, `afrik_people_countries`
**System**: `contributions`, `api_keys`, `user_roles`, `audit_log`

Schema: `supabase/migrations/006_afrik_schema.sql`

## Development Guidelines

### Working with AFRIK Data

1. **Always use strict models** from `public/modele-*.json` — never skip, rename, or add sections
2. **Never invent data** — every claim must be backed by a verifiable primary source (see [Source Tier Policy](#source-tier-policy))
3. **Demographics**: 2025 reference year. Populations must sum to 100% per country. During the transition, the validator (`scripts/validateAfrikData.ts` FR28) hard-gates at **[95, 105]%** and emits a soft warning **FR28-strict** for any fiche outside **[99, 101]%**. The doctrinal target is [99, 101]%; the hard gate will be tightened to match once every fiche lands inside it. New or updated fiches must aim for the strict band. See `docs/adr/0001-fr28-demographic-tolerance.md`.
4. **Colonial terms**: Keep but explain why problematic; provide auto-appellations (endonyms)
5. **Consistency**: Source JSON demographics must match database records

### Source Tier Policy

A claim is acceptable only if it can be cited at **Tier 1** or **Tier 2**. Otherwise, **remove the claim**.

**Tier 1 — Authorized canon (preferred).** Cite directly:
UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA.

**Tier 2 — Primary source surfaced via Wikipedia (fallback).** Wikipedia is a _meta-source_, not a citable source. To use it as a discovery tool:

1. Open the article in **≥2 language versions** (prefer EN + FR + the language(s) of the people/country concerned).
2. Locate the **primary source** (peer-reviewed paper, official government/IGO document, academic publication, archival record) that backs the claim.
3. Cite the **primary source URL/reference directly** — never the Wikipedia article.
4. If no language version of Wikipedia provides a primary source for the claim, **remove the claim**.

**Tier 3 — Forbidden.** Never cite as a `sources` entry: Wikipedia articles themselves, blogs, social media, forum posts, AI-generated content, secondary aggregators without their own primary sources.

**In every `sources` block**, each entry must record `tier: 1` or `tier: 2`. Tier-2 entries must include the path through Wikipedia (which language version(s) cross-checked) in the `notes` field so the chain is auditable.

### Adding API Routes

1. Add route in `src/app/api/v2/{resource}/route.ts`
2. Create handler in `src/api/v2/handlers/`
3. Create service in `src/api/v2/services/`
4. Update OpenAPI spec in `src/lib/api/openapiV2.ts`

### Test Placement

- Unit tests: `src/lib/**/__tests__/**/*.test.ts`
- Handler/service tests: `src/api/v2/**/__tests__/**/*.test.ts`
- API route tests: `src/app/api/v2/__tests__/**/*.test.ts`
- Parser tests: `src/lib/afrik/parsers/__tests__/**/*.test.ts`

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # server-side only
```

### Authentication

Admin authentication uses Supabase Auth with OAuth (GitHub, Google) and magic-link. Role-based access control is managed via the `user_roles` table with the following role enum values: `reader`, `contributor`, `moderator`, `admin`, `advisor`.

### Code Style

- TypeScript `strict: false`, `strictNullChecks: false`
- `@/` path alias for `src/`
- shadcn/ui components for UI consistency
- lint-staged with Husky: ESLint + Prettier on commit

### Development Principles

**TDD (Test-Driven Development)**

- Write tests BEFORE writing code
- Red → Green → Refactor cycle
- All new code must have tests
- Run tests before committing: `npm run test`

**KISS (Keep It Simple, Stupid)**

- Prefer simple solutions over complex ones
- Avoid over-engineering
- One function = one responsibility
- Clear, self-documenting code

### Git

- **Never add `Co-Authored-By` trailers** to commits, PRs, or MRs

### GitHub Actions

- **SHA-pin every third-party action.** Tags are mutable; a compromised release can substitute malicious code. Format: `uses: org/action@<40-char-sha>  # <semver>`.
- Dependabot is configured (`.github/dependabot.yml`) to bump pinned SHAs weekly. Review changelogs before merging.

## Jira

- **Project**: ETNI
- **Board**: https://big-emotion.atlassian.net/jira/software/projects/ETNI/boards/67
- **Active sprint**: Sprint 3 (ID: 101)

## Documentation References

- `docs/archive/PROJET_ETHNIAFRICA.md` — Complete project documentation (archived)
- `docs/DEPLOYMENT.md` — Deployment instructions
- `docs/archive/API_AFRIK_REFERENCE.md` — AFRIK API reference (archived)
