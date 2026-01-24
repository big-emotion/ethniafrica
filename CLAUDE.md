# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EthniAfrica** is a Next.js web application providing comprehensive data on African peoples, languages, linguistic families, and countries. The project uses the **AFRIK methodology** to organize ethnographic and linguistic data in a decolonial approach.

The application features:

- Public REST API with Swagger/OpenAPI documentation
- Multilingual interface (French, English, Spanish, Portuguese)
- Supabase (PostgreSQL) backend
- Admin interface for contribution moderation
- Data export (CSV/Excel) with enriched fields

## Common Commands

### Development

```bash
npm run dev              # Start development server (http://localhost:3000)
npm run build            # Production build
npm run start            # Start production server
```

### Code Quality

```bash
npm run lint             # ESLint
npm run type-check       # TypeScript type checking
make check               # Run all checks (lint + type-check + tests)
```

### Testing

```bash
npm run test             # Run all tests once
npm run test:watch       # Watch mode
npm run test:ui          # Vitest UI
npm run test:coverage    # Coverage report
npm run unit-tests       # Unit tests only (src/lib)
npm run integration-tests # Integration tests (src/app/api)
npm run api-tests        # API v2 tests (src/app/api/v2)

# Makefile shortcuts
make test                # Run all tests
make unit-tests          # Unit tests
make api-tests           # API tests
```

### Data Migration & Processing

```bash
# AFRIK data migration
tsx scripts/migrateAfrikToDatabase.ts    # Migrate AFRIK files to Supabase
tsx scripts/validateAfrikData.ts         # Validate AFRIK data integrity
tsx scripts/fixMissingPeupleIDs.ts       # Fix missing people IDs

# Export
tsx scripts/exportToPDF.ts               # Export data to PDF
```

## High-Level Architecture

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Backend**: Supabase (PostgreSQL)
- **API Documentation**: Swagger/OpenAPI with dual API versions (v1 legacy, v2 AFRIK)
- **Testing**: Vitest + Testing Library
- **Deployment**: Vercel (recommended)

### Dual API Architecture

The application exposes **two separate API versions**:

1. **API v1** (Legacy): Dataset-based API for regions, countries, ethnicities
   - Routes: `/api/stats`, `/api/regions`, `/api/countries`, `/api/ethnicities`, `/api/download`
   - Data source: CSV files loaded via `datasetLoader.ts`
   - Swagger docs: `/docs/api/v1`

2. **API v2** (AFRIK): Database-driven API following AFRIK methodology
   - Routes: `/api/v2/language-families`, `/api/v2/peoples`, `/api/v2/countries`, `/api/v2/search`
   - Data source: Supabase database (AFRIK tables)
   - Swagger docs: `/docs/api/v2`
   - OpenAPI spec: Defined in `src/lib/api/openapiV2.ts`

**Important**: When working on API routes, always check which version you're modifying. The two systems are intentionally separate and serve different data models.

### Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── [lang]/              # Localized pages (fr, en, es, pt)
│   ├── admin/               # Admin interface (login, contributions)
│   ├── api/                 # API v1 routes (legacy)
│   │   ├── regions/
│   │   ├── countries/
│   │   ├── ethnicities/
│   │   ├── stats/
│   │   ├── download/
│   │   ├── contributions/   # Contribution system
│   │   └── admin/           # Admin API
│   ├── api/v2/              # API v2 routes (AFRIK)
│   │   ├── language-families/
│   │   ├── peoples/
│   │   ├── countries/
│   │   └── search/
│   └── docs/api/            # Swagger UI pages
├── components/              # React components
├── lib/                     # Core utilities
│   ├── api/                # API utilities & OpenAPI configs
│   │   ├── openapi.ts      # Main OpenAPI config (v1)
│   │   ├── openapiV1.ts    # OpenAPI spec for v1
│   │   └── openapiV2.ts    # OpenAPI spec for v2
│   ├── supabase/           # Supabase clients
│   │   ├── client.ts       # Browser client (anon key)
│   │   ├── server.ts       # Server-side client
│   │   └── admin.ts        # Admin client (service role)
│   ├── afrik/              # AFRIK methodology utilities
│   ├── auth/               # Admin authentication
│   └── cache/              # Caching strategies
├── types/                   # TypeScript type definitions
└── middleware.ts            # Next.js middleware (i18n routing)

dataset/source/afrik/        # AFRIK source files
├── famille_linguistique/    # Linguistic family files (FLG_*.txt)
├── peuples/                 # People files organized by family (PPL_*.txt)
└── pays/                    # Country files (ISO codes)

supabase/migrations/         # Database migrations
scripts/                     # Data processing scripts
docs/                        # Technical documentation
```

### AFRIK Methodology

The project follows the **AFRIK methodology** for data organization:

**Hierarchy**: Linguistic Family → Language → People → Country

**Identifiers**:

- Linguistic families: `FLG_xxxxx` (e.g., FLG_BANTU)
- Languages: ISO 639-3 codes (e.g., swa, lin, kin)
- Peoples: `PPL_xxxxx` (e.g., PPL_YORUBA)
- Countries: ISO 3166-1 alpha-3 (e.g., COM, ZAF, CMR)

**File Organization**:

- Source files in `dataset/source/afrik/`
- Models in `public/modele-*.txt` (strict templates)
- People files organized by linguistic family: `peuples/FLG_*/PPL_*.txt`
- CSV demographics in root and per-family folders

**Workflow** (see `WORKFLOW_AFRIK_STATUS.md`):

1. Linguistic families (24/24 ✅)
2. Languages (✅)
3. Peoples (592/592 ✅)
4. Countries (9/55 ⏳)
5. CSV demographics (⏳)
6. Global validation (⏳)
7. Publication (⏳)

### Database Schema (Supabase)

**API v1 tables** (legacy):

- `regions` - Geographic regions of Africa
- `countries` - Country data with populations
- `ethnic_groups` - Ethnic groups with demographics
- `contributions` - User contribution system
- `sources` - Data sources
- `languages` - Language associations

**API v2 tables** (AFRIK):

- `afrik_familles_linguistiques` - Linguistic families
- `afrik_langues` - Languages with ISO codes
- `afrik_peuples` - Peoples with full metadata
- `afrik_pays` - Countries with descriptions

See `supabase/migrations/006_afrik_schema.sql` for AFRIK schema details.

### Key Files to Understand

**Data Loading**:

- `src/lib/datasetLoader.ts` - Loads CSV data for API v1 (legacy)
- `src/lib/api/datasetLoader.server.ts` - Server-side data loading
- `src/lib/supabase/client.ts` - Browser Supabase client (API v2)
- `src/lib/supabase/server.ts` - Server Supabase client (API v2)

**Internationalization**:

- `src/lib/translations.ts` - Translation utilities and dictionaries
- `src/lib/entityTranslations.ts` - Entity name translations (auto-generated)
- `src/lib/routing.ts` - Localized routing utilities
- `src/middleware.ts` - Handles language detection and routing

**AFRIK Integration**:

- `src/lib/afrik/` - AFRIK-specific utilities for v2 API
- `scripts/migrateAfrikToDatabase.ts` - Migration from .txt files to Supabase
- `scripts/validateAfrikData.ts` - Data validation and integrity checks

**API Configuration**:

- `src/lib/api/openapi.ts` - Main OpenAPI config with version selection
- `src/lib/api/openapiV1.ts` - OpenAPI spec for v1 (legacy)
- `src/lib/api/openapiV2.ts` - OpenAPI spec for v2 (AFRIK)

## Development Guidelines

### Working with AFRIK Data

When generating AFRIK files (via Cursor AI or manually):

1. **Always use the strict models** in `public/modele-*.txt`
2. **Never skip or rename sections** - respect 100% of the model structure
3. **Research required** - No invented data. Use authorized sources (UN, CIA, SIL, UNESCO)
4. **Handle colonial terms** properly:
   - Keep historical terms but explain why they're problematic
   - Provide auto-appellations (endonyms)
   - Contextualize exonyms and colonial terminology
5. **Demographics must match CSV** - Maintain consistency between .txt and .csv files
6. **Update tracking files**: `WORKFLOW_AFRIK_STATUS.md` and `workflow_status.csv`

See `.cursorrules` for complete AFRIK generation rules (this file is for Cursor AI).

### Adding API Routes

**For API v1** (legacy, avoid extending):

- Add routes in `src/app/api/`
- Update OpenAPI spec in `src/lib/api/openapiV1.ts`
- Use `datasetLoader` for data

**For API v2** (preferred):

- Add routes in `src/app/api/v2/`
- Update OpenAPI spec in `src/lib/api/openapiV2.ts`
- Use Supabase client from `src/lib/supabase/`
- Follow AFRIK methodology and naming

**Documentation**:

- Update `docs/API_ROUTES.md` with new endpoints
- JSDoc comments are used for OpenAPI generation
- Test via Swagger UI at `/docs/api` or `/docs/api/v2`

### Adding Tests

Tests use Vitest with happy-dom:

```typescript
// Unit test example (src/lib/__tests__/utils.test.ts)
import { describe, it, expect } from "vitest";
import { myFunction } from "../utils";

describe("myFunction", () => {
  it("should do something", () => {
    expect(myFunction("input")).toBe("expected");
  });
});
```

Place tests:

- Unit tests: `src/lib/**/__tests__/**/*.test.ts`
- Integration tests: `src/app/api/**/*.test.ts`
- API v2 tests: `src/app/api/v2/**/*.test.ts`

### Localization

Supported languages: `fr`, `en`, `es`, `pt` (default: `fr`)

**Add translations**:

1. Edit `src/lib/translations.ts` (UI strings)
2. For entity names, edit `src/lib/entityTranslations.ts` (or regenerate via script)
3. URLs are automatically localized via middleware

**URL patterns**:

- `/{lang}/regions` → `/fr/regions`, `/en/regions`, etc.
- `/{lang}/pays` → `/fr/pays`, `/en/countries`, `/es/paises`, `/pt/paises`
- `/{lang}/ethnies` → `/fr/ethnies`, `/en/ethnicities`, etc.

### Environment Variables

Required in `.env.local`:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Admin interface (required for /admin routes)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

## Important Notes

### Data Sources

- **Never invent data** - Always use authorized sources
- Authorized sources: UN, UNFPA, CIA World Factbook, SIL Ethnologue, Glottolog, UNESCO, IWGIA
- Demographics: Always 2025 reference year
- Populations: Must sum to exactly 100% per country

### Security

- Admin routes use session-based auth (see `src/lib/auth/`)
- Contributions are moderated via `/admin/contributions`
- Never commit secrets or API keys
- Use `SUPABASE_SERVICE_ROLE_KEY` only server-side

### Code Style

- TypeScript strict mode is disabled (`strict: false` in tsconfig.json)
- Use `@/` path alias for imports from `src/`
- Prefer functional components and hooks
- Use shadcn/ui components for consistency
- ESLint and Prettier are configured (run via `npm run lint`)

### Documentation References

For detailed information, see:

- **Architecture**: `PROJET_ETHNIAFRICA.md` - Complete project documentation
- **Technical**: `PRESENTATION_TECHNIQUE.md` - Technical presentation
- **API**: `docs/API_ROUTES.md` - API endpoints reference
- **Migration**: `docs/DATA_MIGRATION.md` - Data migration guide
- **Deployment**: `docs/DEPLOYMENT.md` - Deployment instructions
- **AFRIK Reference**: `API_AFRIK_REFERENCE.md` - AFRIK API reference

### GitHub & Contributing

- Repository: https://github.com/big-emotion/ethniafrica
- Issues/feedback: Use GitHub Issues
- Main branch: `main`
- Recent work: Migration to AFRIK v2 API and database-driven architecture
