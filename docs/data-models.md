# Data Models — EthniAfrica

**Authoritative DDL:** `supabase/migrations/006_afrik_schema.sql` (tables) + 001–007 (full history).

## AFRIK v2 Tables

### `afrik_countries`

| Column                     | Type                   | Notes                                          |
| -------------------------- | ---------------------- | ---------------------------------------------- |
| `id`                       | `CHAR(3)` PK           | ISO 3166-1 alpha-3 (e.g. `ZAF`, `COM`)         |
| `name_fr`                  | `TEXT NOT NULL`        | French display name                            |
| `etymology`                | `TEXT`                 | Origin of the country's name                   |
| `name_origin_actor`        | `TEXT`                 | Who named it (colonial actor, endonym source…) |
| `content`                  | `JSONB` (default `{}`) | Evolutionary payload; GIN-indexed              |
| `created_at`, `updated_at` | `TIMESTAMPTZ`          |                                                |

### `afrik_language_families`

| Column    | Type             | Notes                          |
| --------- | ---------------- | ------------------------------ |
| `id`      | `VARCHAR(50)` PK | `FLG_xxxxx` (e.g. `FLG_BANTU`) |
| `name_fr` | `TEXT NOT NULL`  |                                |
| `name_en` | `TEXT`           |                                |
| `content` | `JSONB`          | GIN-indexed                    |

### `afrik_languages`

| Column      | Type                                            | Notes                         |
| ----------- | ----------------------------------------------- | ----------------------------- |
| `id`        | `VARCHAR(10)` PK                                | ISO 639-3 (e.g. `swa`, `lin`) |
| `name`      | `TEXT NOT NULL`                                 |                               |
| `family_id` | `VARCHAR(50)` FK → `afrik_language_families.id` |                               |
| `content`   | `JSONB`                                         | GIN-indexed                   |

### `afrik_peoples`

| Column               | Type                                            | Notes                                             |
| -------------------- | ----------------------------------------------- | ------------------------------------------------- |
| `id`                 | `VARCHAR(50)` PK                                | `PPL_xxxxx` (e.g. `PPL_YORUBA`)                   |
| `name_main`          | `TEXT NOT NULL`                                 | Canonical name (endonym preferred when available) |
| `language_family_id` | `VARCHAR(50)` FK → `afrik_language_families.id` |                                                   |
| `content`            | `JSONB`                                         | GIN-indexed                                       |

### `afrik_people_countries` (many-to-many)

| Column       | Type                                                        | Notes |
| ------------ | ----------------------------------------------------------- | ----- |
| `people_id`  | `VARCHAR(50)` FK → `afrik_peoples.id` (`ON DELETE CASCADE`) |       |
| `country_id` | `CHAR(3)` FK → `afrik_countries.id` (`ON DELETE CASCADE`)   |       |
| PK           | (`people_id`, `country_id`)                                 |       |

### `contributions`

User-submitted contributions. Types: `new_people`, `update_people`, `new_country`, `update_country`, `new_language_family`, `update_language_family`. Moderated via the admin UI.

## JSONB `content` Strategy

Each core entity stores its evolutionary data in `content` (GIN-indexed for full-text). New fields can be added without schema migrations — parsers populate, loaders write. TypeScript shapes live in `src/types/afrik.ts`.

## Relationships

```
afrik_language_families 1─┐
                          ├── afrik_languages (many)
                          └── afrik_peoples (many)

afrik_peoples  N ──┬─ afrik_people_countries ─┬── N  afrik_countries
```

## Migration History

- `001_initial_schema.sql` — legacy V1 schema
- `002_add_enriched_fields.sql` — enriched V1 fields
- `003_add_unique_constraint_sources_title.sql`
- `004_change_ancient_names_to_jsonb.sql`
- `005_add_country_sections_4_and_6.sql`
- `006_afrik_schema.sql` — **V2 AFRIK tables (current)**
- `007_remove_v1_add_v2_contribution_types.sql` — V1 cleanup + V2 contribution types (**not yet applied to prod**)

## Access Patterns

- Frontend reads: `src/lib/afrikLoader.ts` or `src/lib/supabase/queries/afrik/*`
- API reads: `src/api/v2/services/*`
- Migrations/loaders: `src/lib/afrik/loaders/*` via `scripts/migrateAfrikToDatabase.ts`
- Never call Supabase directly from React components.

## AFRIK Data Discipline

- Authorized sources only (UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA).
- Strict models `public/modele-*.txt` are prescriptive.
- Demographics are 2025 reference year; populations must sum to **exactly 100%** per country.
- TXT source demographics MUST match database records.
- Colonial names are kept but explained; endonyms (auto-appellations) always provided.
