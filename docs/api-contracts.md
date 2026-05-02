# API Contracts — EthniAfrica

**OpenAPI spec (authoritative):** `src/lib/api/openapiV2.ts` · served at `/api/docs/v2` (JSON) and `/docs/api` (Swagger UI).

All v2 endpoints follow the 3-layer pattern (route → handler → service). CORS headers from `src/lib/api/cors.ts`. Responses are JSON (`Date` → ISO string). Errors formatted via `src/api/v2/utils/response.ts`.

## Public v2 Endpoints (AFRIK)

### Countries

| Method | Path                      | Handler                 | Description                                |
| ------ | ------------------------- | ----------------------- | ------------------------------------------ |
| GET    | `/api/v2/countries`       | `handlers/countries.ts` | List all countries                         |
| GET    | `/api/v2/countries/{iso}` | `handlers/countries.ts` | Country by ISO 3166-1 alpha-3 (e.g. `ZAF`) |

### Language Families

| Method | Path                             | Handler                        | Description                  |
| ------ | -------------------------------- | ------------------------------ | ---------------------------- |
| GET    | `/api/v2/language-families`      | `handlers/languageFamilies.ts` | List all linguistic families |
| GET    | `/api/v2/language-families/{id}` | `handlers/languageFamilies.ts` | Family by `FLG_xxxxx` ID     |

### Peoples

| Method | Path                   | Handler               | Description              |
| ------ | ---------------------- | --------------------- | ------------------------ |
| GET    | `/api/v2/peoples`      | `handlers/peoples.ts` | List all peoples         |
| GET    | `/api/v2/peoples/{id}` | `handlers/peoples.ts` | People by `PPL_xxxxx` ID |

### Search

| Method | Path                   | Handler              | Description                                                   |
| ------ | ---------------------- | -------------------- | ------------------------------------------------------------- |
| GET    | `/api/v2/search?q=...` | `handlers/search.ts` | Cross-entity search (countries, families, peoples, languages) |

## Internal v2 Endpoints (server-side only)

Used by SSR / RSC for list pages. Not part of the public contract.

- `GET /api/v2/internal/countries`
- `GET /api/v2/internal/language-families`
- `GET /api/v2/internal/peoples`

## Other Endpoints

### Documentation

- `GET /api/docs` — V1 OpenAPI JSON (legacy)
- `GET /api/docs/v2` — V2 OpenAPI JSON (authoritative)

### Download / Export

- `GET /api/download?format=csv` — ZIP of enriched CSV files
- `GET /api/download?format=excel` — XLSX with all enriched columns

### Contributions (user-submitted)

- `POST /api/contributions` — submit a contribution
- `GET /api/contributions/entities/countries`
- `GET /api/contributions/entities/peoples`
- `GET /api/contributions/entities/language-families`
- `GET /api/contributions/entities/country/{id}`
- `GET /api/contributions/entities/people/{id}`
- `GET /api/contributions/entities/language-family/{id}`

Contribution types: `new_people`, `update_people`, `new_country`, `update_country`, `new_language_family`, `update_language_family`.

### Admin (session-gated by middleware)

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET  /api/admin/contributions` — list pending contributions
- `PATCH /api/admin/contributions/{id}` — approve/reject
- `POST /api/admin/revalidate` — trigger ISR revalidation

## Caching Policy

- Mutable / user-specific data → `Cache-Control: revalidate=0`
- Stable reference data (families, countries) → `s-maxage=86400, immutable`

## Validation

Route layer MUST validate path/query params via `src/api/v2/utils/validation.ts` (Zod) **before** calling handlers. Services assume valid input.

## Contract Discipline

- Any new or changed route MUST update `src/lib/api/openapiV2.ts` in the same change. The OpenAPI spec is the public contract.
- API error messages are in English (code-level strings rule).
