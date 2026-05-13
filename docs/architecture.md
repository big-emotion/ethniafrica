# Architecture — EthniAfrica

**Pattern:** Layered component-based web app with a 3-tier API (route → handler → service) over Supabase.

## 1. Technology Stack

| Category               | Technology                                | Version                      | Justification                                                  |
| ---------------------- | ----------------------------------------- | ---------------------------- | -------------------------------------------------------------- |
| Framework              | Next.js (App Router)                      | 16.0.8                       | SSR + file-based routing + API routes in one runtime           |
| UI runtime             | React                                     | 18.3.1                       | Server Components by default; client islands opt-in            |
| Language               | TypeScript                                | 5.8.3 (`strict: false`)      | Gradual typing; pragmatic with null checks disabled            |
| Styling                | Tailwind CSS + shadcn/ui                  | 3.4 / Radix                  | Utility-first + accessible primitives                          |
| Data fetching (client) | TanStack Query                            | 5.83                         | Cache/invalidate server state idiomatically                    |
| Backend                | Supabase (PostgreSQL)                     | `@supabase/supabase-js` 2.81 | Managed Postgres + auth + JSONB storage                        |
| Validation             | Zod + react-hook-form                     | 3.25 / 7.61                  | Schema-first runtime validation                                |
| API docs               | swagger-jsdoc + swagger-ui-react          | 6.2 / 5.30                   | OpenAPI spec served at `/api/docs/v2` + `/docs/api`            |
| Testing                | Vitest + Testing Library + happy-dom      | 4 / 16 / 20                  | Fast unit + integration tests                                  |
| Build                  | Next.js (Turbopack/webpack)               | 16                           | Native Next build                                              |
| Tooling                | ESLint 9, Prettier 3, Husky + lint-staged | —                            | Enforced on commit                                             |
| Storybook              | `@storybook/react-vite`                   | 8.6                          | Vite framework (Next 16 incompatible with `@storybook/nextjs`) |

## 2. Layered API Architecture (AFRIK v2)

Every public v2 endpoint follows this three-layer pattern:

```
src/app/api/v2/{resource}/route.ts           Route handler — parsing, CORS, caching
        ↓
src/api/v2/handlers/{resource}.ts            Business logic, orchestration
        ↓
src/api/v2/services/{resource}.ts            Supabase queries
```

Responsibilities per layer:

- **Route layer** — parse query/path params via `src/api/v2/utils/validation.ts` (Zod), set CORS via `src/lib/api/cors.ts`, set `Cache-Control` (mutable → `revalidate=0`; stable reference data → `s-maxage=86400, immutable`), call the handler, format the response via `src/api/v2/utils/response.ts`.
- **Handler layer** — orchestrate service calls, shape domain output, apply business rules (e.g. batch `getCountryRelationsMap()` to avoid N+1 in peoples).
- **Service layer** — typed Supabase queries only. No HTTP concerns, no response shaping.

Structured logging via `src/lib/api/logger.ts` (never `console.*`).

OpenAPI spec: `src/lib/api/openapiV2.ts` — must be updated for every route change (public contract).

## 3. Frontend Architecture

- **Routing:** `src/app/[lang]/` (currently `fr` only; shape preserves `en/es/pt`). Localized segments resolved in `src/lib/routing.ts`. Dynamic catch-all `[section]/[item]` dispatches to views.
- **Views vs detail vs page content:**
  - `components/pages/*` — page-level shells (FamillesPageContent, PaysPageContentV2, PeuplesPageContent, SearchPageContent)
  - `components/views/*` — list views (CountryView, LanguageFamilyView, PeopleView)
  - `components/detail/*` — detail orchestrators (CountryDetailViewV2, LanguageFamilyDetailView, PeopleDetailView)
  - `components/country/*` — the "Carte vivante" country detail sections (Hero, Etymology, OriginBanner, History, Peoples, Kingdoms, Languages, Culture, Sources)
- **UI primitives:** `components/ui/*` — shadcn/ui-generated Radix wrappers. Extend, never replace.
- **State:** TanStack Query for server state; React state for local UI. No Redux/MobX.
- **Error/loading boundaries:** `src/app/[lang]/error.tsx`, `src/app/[lang]/loading.tsx`.
- **Shared hook:** `src/hooks/use-list-view.ts` for shared list UX.
- **i18n:** `src/lib/translations.ts` (FR-only, multi-lang shape preserved). Chat with agents may be FR; all code strings are English; user-facing strings are French.
- **Design tokens:** `src/styles/country-tokens.css` (70+ variables for country page). Fraunces + Nunito Sans loaded via `next/font/google` in `src/app/layout.tsx`.
- **Mobile-first breakpoints:** mobile < 720px · tablet `md` 720–1199px · desktop `xl` ≥ 800px (country container max-width).

## 4. Data Architecture

### Supabase Tables (AFRIK v2)

| Table                     | PK                                | Description                                          |
| ------------------------- | --------------------------------- | ---------------------------------------------------- |
| `afrik_countries`         | `id CHAR(3)` (ISO 3166-1 alpha-3) | Countries with JSONB `content` for evolutionary data |
| `afrik_language_families` | `id VARCHAR(50)` (FLG_xxxxx)      | Linguistic families                                  |
| `afrik_languages`         | `id VARCHAR(10)` (ISO 639-3)      | Languages, FK to family                              |
| `afrik_peoples`           | `id VARCHAR(50)` (PPL_xxxxx)      | Peoples, FK to language family                       |
| `afrik_people_countries`  | composite (people_id, country_id) | Many-to-many people ↔ country                       |
| `contributions`           | —                                 | User-submitted contributions (new/update entities)   |

All entity tables use a JSONB `content` column with a GIN index — new fields can be added without schema migrations.

Full DDL: `supabase/migrations/006_afrik_schema.sql`. Migrations 001–007; **007 not yet applied to prod** (V1 cleanup + V2 contribution types).

### Three Supabase Clients (strict isolation)

- `src/lib/supabase/client.ts` — browser (anon key, `NEXT_PUBLIC_*`).
- `src/lib/supabase/server.ts` — server-side / RSC.
- `src/lib/supabase/admin.ts` — service-role key, **server-only**. Importing from browser code = security incident.

Frontend reads flow through `src/lib/afrikLoader.ts` or `src/lib/supabase/queries/afrik/*`. No raw Supabase calls in components.

## 5. AFRIK Data Pipeline

```
dataset/source/afrik/                         Raw .txt / .json source (strict model format)
  ├── famille_linguistique/FLG_*.txt|.json
  ├── peuples/FLG_*/PPL_*.txt|.json
  └── pays/*.txt|.json
        │
        ▼ src/lib/afrik/parsers/*             Parse to structured data
        ▼ src/lib/afrik/loaders/*             Load into Supabase
        ▼ scripts/migrateAfrikToDatabase.ts   Migration entry-point
        ▼ Supabase tables                     (afrik_*)
```

Strict models in `public/modele-*.txt` are prescriptive — never skip, rename, or add sections. Authorized sources only (UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA). 2025 reference demographics must sum to exactly 100% per country.

## 6. Security

- Admin routes protected by `src/middleware.ts` (session cookie check) — login at `/admin/login`, POST to `/api/admin/login`, logout at `/api/admin/logout`. Contribution moderation at `/admin/contributions`.
- Secrets via env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Admin authentication uses Supabase Auth with OAuth (GitHub, Google) and magic-link.
- Never commit `.env*`. Never import `admin.ts` from client code.

## 7. Build & Deployment

- Dev: `npm run dev` → http://localhost:3000
- Build: `npm run build` (Next.js production build)
- Deploy target: Vercel (OpenAPI spec auto-detects production URL). See `docs/DEPLOYMENT.md`.

## 8. Testing Strategy

Vitest + happy-dom. TDD is mandatory — red/green/refactor.

- Unit: `src/lib/**/__tests__/*.test.ts`
- Handlers/services: `src/api/v2/**/__tests__/*.test.ts`
- API routes: `src/app/api/v2/__tests__/*.test.ts`
- Parsers: `src/lib/afrik/parsers/__tests__/*.test.ts`
- Components: colocated `*.test.tsx`

Known pre-existing failures (6 in `scripts/__tests__/migrateAfrikToDatabase.test.ts`; 4 in handler tests — all Supabase mock issues). Do not "fix" without scope.

## 9. Architectural Invariants

- **3-layer API separation** — do not collapse route/handler/service.
- **V1 → V2 migration complete** — do not reintroduce `regions`/`ethnicities`, `entityKeys.ts`, `datasetLoader.server.ts`, etc.
- **French-only UI** — do not reintroduce `en/es/pt` branches; the _shape_ remains for future reopening.
- **Scope discipline** — surgical edits; no orthogonal cleanup.
- **Mobile-first** — always review at 320–430px first.
