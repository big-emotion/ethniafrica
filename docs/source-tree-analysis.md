# Source Tree Analysis — EthniAfrica

Single-part monolith. Annotated critical directories below.

```
ethniafrica/
├── src/
│   ├── app/                             Next.js App Router
│   │   ├── layout.tsx                   Root layout (fonts, metadata)
│   │   ├── page.tsx                     Root redirect → /fr
│   │   ├── providers.tsx                Client providers (TanStack Query, theme)
│   │   ├── not-found.tsx                404
│   │   ├── [lang]/                      Localized UI (currently fr-only)
│   │   │   ├── error.tsx                Error boundary
│   │   │   ├── loading.tsx              Loading UI
│   │   │   ├── page.tsx                 Home page
│   │   │   ├── about/                   /{lang}/about
│   │   │   ├── contribute/              /{lang}/contribute
│   │   │   ├── report-error/            /{lang}/report-error
│   │   │   └── [section]/[item]/        Dynamic: /{lang}/pays/Rwanda, etc.
│   │   ├── admin/                       Admin UI (protected by middleware)
│   │   ├── docs/                        Swagger UI page (/docs/api)
│   │   └── api/
│   │       ├── v2/                      Public AFRIK API
│   │       │   ├── countries/           GET /api/v2/countries, /[iso]
│   │       │   ├── language-families/   GET /api/v2/language-families, /[id]
│   │       │   ├── peoples/             GET /api/v2/peoples, /[id]
│   │       │   ├── search/              GET /api/v2/search
│   │       │   └── internal/            Server-only: used by SSR pages
│   │       ├── docs/                    /api/docs (v1 spec), /api/docs/v2
│   │       ├── download/                CSV/Excel export
│   │       ├── contributions/           Contribution submission endpoints
│   │       └── admin/                   Login/logout/revalidate/contributions
│   ├── api/v2/                          API BUSINESS LAYER (not a route)
│   │   ├── handlers/                    Orchestration: countries, languageFamilies, peoples, search
│   │   ├── services/                    Supabase queries (countryService, etc.)
│   │   └── utils/                       validation.ts (Zod), response.ts
│   ├── components/
│   │   ├── ui/                          shadcn/ui primitives (Radix wrappers)
│   │   ├── layout/                      DesktopNavBar, MobileMenu, PageLayout
│   │   ├── views/                       List views (CountryView, LanguageFamilyView, PeopleView)
│   │   ├── detail/                      Detail orchestrators (CountryDetailViewV2, etc.)
│   │   ├── country/                     "Carte vivante" country page sections
│   │   ├── pages/                       Page-level content wrappers
│   │   ├── search/                      SearchModalV2
│   │   ├── charts/                      DemographicsChart (recharts)
│   │   ├── ContributionForm.tsx         Contribution UI
│   │   └── LanguageSelector.tsx         Language switcher (currently unused in nav)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                Browser client (anon key)
│   │   │   ├── server.ts                SSR/RSC client
│   │   │   ├── admin.ts                 Service-role client (SERVER-ONLY)
│   │   │   ├── admin-queries.ts         Admin-scoped queries
│   │   │   └── queries/afrik/           AFRIK-specific query modules
│   │   ├── afrik/
│   │   │   ├── parsers/                 .txt / .json → structured data
│   │   │   └── loaders/                 structured data → Supabase
│   │   ├── api/
│   │   │   ├── cors.ts                  CORS headers
│   │   │   ├── logger.ts                Structured logger (use instead of console.*)
│   │   │   ├── openapi.ts               V1 OpenAPI spec
│   │   │   └── openapiV2.ts             V2 OpenAPI spec (PUBLIC CONTRACT)
│   │   ├── afrikLoader.ts               Frontend data loader
│   │   ├── countryDataTransformer.ts    CountryDetail → CountryPageData (9 transforms)
│   │   ├── routing.ts                   Localized slugs (pays/familles/peuples/recherche)
│   │   ├── translations.ts              UI strings (fr only, multi-lang shape)
│   │   ├── auth/, cache/, validations/  Auth helpers, caching, Zod schemas
│   │   ├── normalize.ts                 String normalization (accents, case)
│   │   └── utils.ts                     Generic utilities (cn, etc.)
│   ├── hooks/
│   │   └── use-list-view.ts             Shared list view state
│   ├── types/
│   │   ├── shared.ts                    Language = "fr" (canonical)
│   │   ├── afrik.ts                     AFRIK domain types
│   │   └── afrik-frontend.ts            Frontend-specific AFRIK types
│   ├── styles/
│   │   └── country-tokens.css           Country page CSS variables
│   ├── stories/                         Storybook stories (MDX + tsx)
│   ├── middleware.ts                    Admin route protection (session cookie)
│   ├── index.css, App.css               Global styles
│   └── proxy.ts                         (proxy utility)
├── supabase/
│   └── migrations/                      001_initial → 007 (V1 removal, V2 types)
├── scripts/
│   ├── migrateAfrikToDatabase.ts        Load dataset/source/afrik → Supabase
│   ├── validateAfrikData.ts             Integrity checks
│   ├── convertAfrikToJson.ts            TXT → JSON conversion
│   ├── checkMigration.ts, testLoader.ts Diagnostic utilities
│   └── audit/                           Data audit scripts
├── dataset/
│   └── source/afrik/                    Raw source files (FLG, peuples, pays, langues)
├── public/
│   ├── modele-*.txt                     STRICT data models (prescriptive)
│   └── (static assets, flags, favicons)
├── docs/                                This documentation
├── _bmad-output/
│   ├── project-context.md               Agent-facing rule book (READ FIRST)
│   ├── planning-artifacts/
│   └── implementation-artifacts/
├── _bmad/                               BMM module config
├── .storybook/                          Storybook config (react-vite)
├── next.config.ts, tailwind.config.ts, tsconfig.json, vitest.config.ts, eslint.config.mjs
├── Makefile                             make check = lint + type-check + tests
├── package.json                         (name: ethniafrique-atlas, v1.1.0)
├── env.dist                             Env var template
├── CLAUDE.md                            Project-wide agent rules
└── README.md
```

## Entry Points

- **Web app:** `src/app/layout.tsx` → `src/app/page.tsx` (redirects to `/fr`)
- **API v2:** `src/app/api/v2/{resource}/route.ts`
- **Middleware:** `src/middleware.ts` (admin gate)
- **Data migration:** `scripts/migrateAfrikToDatabase.ts`

## Shared Code

- `@/` path alias → `src/`
- `src/lib/*` and `src/hooks/*` are the shared layers — always prefer extending these over duplicating logic.

## Exclusions (not documented)

`node_modules/`, `.next/`, `_bmad-output/implementation-artifacts/` (generated).
