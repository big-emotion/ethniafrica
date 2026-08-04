# Epic 8 — Names Atlas: Etymology, Endonyms, Exonyms

**Pillar: Names · Product module #4 · "Atlas des noms"**
Status: Draft — PRD addendum (FR block FR53–FR58)

## Module Goal

The Names Atlas turns the naming knowledge already scattered across AFRIK people fiches (`content.appellations`: endonym, exonyms, origin of exonyms, why problematic, contemporary usage) into a first-class, browsable, searchable surface: for each people, who named it, what each name means, endonym versus exonyms, historical evolution of spellings, and which names were colonially imposed — with the imposition contextualized, never neutralized. The emotional hook is the diaspora visitor asking "where does my name come from?": any name variant typed into the atlas resolves to the peoples that carry it, endonym-first. Epic 8 OWNS the naming/etymology data model — structured `name_records` attached to Module 0 `assertions` with Tier 1/2 sources — which Epic 13 (Colonisation & résistances) later consumes for imposed-name mapping. Every etymology claim is an assertion with a source tier; a name record that cannot cite a Tier 1/2 source is not published ("source or drop"). This is the "Les noms" pillar of the Names/Links/Gazes triptych, served through the Explorer access mode.

## Fit & Dependencies

**Position in build order:** `7 → 8 → 9 → 10 → 11 → 12 → 13`. Epic 8 starts after Epic 7 (hierarchical tree dataviz foundation) but consumes nothing from it — no dataviz foundation is needed here. Epic 8's data-sourcing stories (8.4, 8.11) may start early in parallel with Epic 7.

**Builds on (upstream):**

- **Epic 0 — Trustworthy Data Baseline:** CI data-integrity gates (`data-integrity.yml`), `scripts/validateAfrikData.ts` infrastructure, migration runbook (manual `supabase db push`, AR45), structured logger.
- **Epic 1 — Source Transparency Fabric (Module 0):** `sources`, `assertions`, `confidence_scores` tables; `ConfidenceChip`, `ClassificationBadge`, `SourceChainSheet`, `DoctrineLinkCard` L3 components; the `--afh-*` token sheet (notably `--afh-colonial` / `--afh-colonial-bg`, the muted-brick colonial-imposed-name marker that exists precisely for this module). Every name record attaches to an `assertions` row; every etymology claim renders with a `ConfidenceChip` opening the `SourceChainSheet`.
- **Epic 2 — People Fiche Reading Experience:** `AutonymExonymHeading` (mandatory for any people-name display, UX-DR49 #1), the reading-surface conventions (Direction D prose-with-inline-chips, breadcrumbs, `/fr/recherche` patterns), and the Postgres FTS infrastructure (migration `025_search_vectors.sql`: French `tsvector` + GIN pattern) that the name-variant search extends.
- **Epic 3 — Pinned Versions:** people-fiche snapshots (`revisions.snapshot_jsonb`) must include the names section once Story 8.9 lands, so pinned fiche versions keep their name dossier as-published (note in 8.9 technical notes).
- **Epics 4/5 — Flags & Moderation:** name-record assertions are flaggable through the existing `SourceChainSheet` → `FlagTarget` flow; no new contribution surface is built here.

**OWNS (for downstream):**

- The naming/etymology data model: `name_records` table, `name_record_type` enum, the imposed-name contextualization shape (`imposed_by`, `imposition_period`, `why_problematic`, `contemporary_usage`), the strict dataset model `public/modele-nom.json`, and the `/v2/names` + `/v2/peoples/{id}/names` API surface.
- **Epic 13 CONSUMES** Epic 8's imposed-name records (exonym rows with imposition metadata) for its colonial-fragmentation mapping — it defines no competing name model.

**Does NOT own / does not violate:** hierarchical tree dataviz (Epic 7), people-relations graph (Epic 11), spatio-temporal event model + basemap + timeline scrubber (Epic 12).

## User Journeys

**Journey 1 — Aïcha, 24, diaspora (Paris), phone 390 px.** Aïcha heard her grandmother use a people name that differs from the one in her schoolbooks. She opens `/fr/noms`, types the schoolbook name in the search input, and submits. The atlas returns matching name records grouped by people; the top result shows the name marked "exonyme" with a muted-brick "nom imposé" badge, and directly beside it the endonym rendered first, in its own script, in Fraunces 900. She taps through to the people fiche's names section and reads who imposed the exonym, when, and why it is problematic — each claim ending with a `ConfidenceChip` she can tap to see the Ethnologue / academic sources. Success moment: "the name I was taught is not the name they call themselves — and I can see exactly who says so."

**Journey 2 — Emmanuel, history teacher (Accra-francophone context), tablet 720 px.** Preparing a lesson on colonial naming, he opens `/fr/noms` and applies the "noms imposés" filter chip. He gets a browsable list of imposed exonyms across peoples, each with its imposition context and a `DoctrineLinkCard` to the naming doctrine. He opens three source chains and copies primary-source references for his slides. Success moment: a sourced, citable list of imposed names in under two minutes, on a mid-range device.

**Journey 3 — Nadia, contributor, phone 430 px.** Reading a name dossier, she believes a spelling-evolution claim is wrong. She taps the claim's `ConfidenceChip`, reads the source chain, and uses the existing "signaler cette assertion" exit (Epic 4 flow) to file a flag with a counter-source. Success moment: the naming module needed zero new contribution UI — the Module 0 fabric carries the dispute.

## Functional Requirements

- **FR53:** Users can browse the Names Atlas — an index of all published people-name records (endonyms, exonyms, historical spellings) — filterable by name type and imposed-name status, and grouped alphabetically

  **Given** the `/fr/noms` page
  **When** a visitor opens it on a 430 px viewport without authentication
  **Then** a paginated, alphabetically grouped list of name records renders server-side, each entry showing the name, its type badge, and the people it belongs to (endonym-first via `AutonymExonymHeading`)

  **Given** the filter chip row (name type: `endonyme` / `exonyme` / `graphie historique` / `patronyme`; plus `noms imposés`)
  **When** the visitor activates a chip
  **Then** the list narrows accordingly, the URL query string reflects the filter state (shareable), and active filters are dismissible with `×` (UX-DR32)

- **FR54:** Users can view, for each covered people, a name dossier presenting the endonym(s) first, then exonyms with their origin and meaning, then historical spellings in chronological order — every claim carrying its source chain

  **Given** a people with published name records
  **When** the visitor reaches the fiche's names section (anchor `#noms`)
  **Then** endonym records render before exonym records, each name record shows meaning and origin when sourced, and each record ends with a `ConfidenceChip` that opens the `SourceChainSheet` for its assertion

  **Given** a people whose fiche has no published name records
  **When** the names section would render
  **Then** the section omits itself or renders a calm empty state per UX-DR31 — never an error, never placeholder content

- **FR55:** Users can search any name variant (endonym, exonym, historical spelling, alternate orthography) and reach the peoples matching that variant

  **Given** the atlas search input on `/fr/noms`
  **When** the visitor submits a query of ≥ 2 characters
  **Then** the system matches the query against `name_records` via Postgres French FTS (same `websearch_to_tsquery` mechanics as Epic 2) and returns matching name records grouped by people, within 500 ms p95 at 1 000-fiche scale (NFR4)

  **Given** a query with no matches
  **When** results render
  **Then** the empty state offers spelling-check guidance, a link to browse by name type, and a "signaler une donnée manquante" affordance pre-filled with the query (UX-DR31/32) — no invented suggestions

- **FR56:** Colonial and imposed exonyms are always displayed with their contextualization — who imposed the name, during which period, and why it is problematic — and are never presented as neutral equivalents of the endonym

  **Given** a name record whose `imposed_by` is set
  **When** it renders anywhere (atlas index, dossier, search results)
  **Then** it carries the "nom imposé" marker styled with `--afh-colonial` (muted brick — icon + text + color, never color alone, never `--afh-error` red), and the dossier view shows `imposed_by`, `imposition_period`, and `why_problematic` alongside a `DoctrineLinkCard` to the naming doctrine

  **Given** an imposed exonym record lacking a non-empty `why_problematic`
  **When** `scripts/validateAfrikData.ts` runs (locally or in CI)
  **Then** validation fails with a named rule violation and the CI data-integrity gate blocks the merge (FR32 mechanics)

- **FR57:** Every name record and every etymology claim is an assertion backed by at least one Tier 1 or Tier 2 source; a record that cannot cite one is not published ("source or drop" — speculative name genealogy is never stored)

  **Given** an attempt to insert or update a `name_records` row whose `assertion_id` is null or whose assertion cites zero Tier 1/2 sources
  **When** the statement executes
  **Then** a Postgres trigger rejects it (AR3 pattern) and the loader reports the record as dropped, not loaded

  **Given** a surname-to-people connection candidate without a Tier 1/2 onomastic source
  **When** curation processes it
  **Then** the record is excluded from the dataset entirely — it appears only in the curation report as "dropped: no qualifying source"

- **FR58:** Third-party integrators can read name records via documented `/v2` JSON API endpoints with standard envelope, attribution metadata, and OpenAPI 3.1 coverage

  **Given** `GET /v2/names` and `GET /v2/peoples/{id}/names`
  **When** an anonymous client calls them
  **Then** responses use the `{ data, meta: { license: "CC-BY-SA-4.0", attribution, ... }, errors: [] }` envelope (AR8), camelCase payloads, ISO-8601 dates, and the 9-code error taxonomy (AR9)

  **Given** the OpenAPI spec at `src/lib/api/openapiV2.ts`
  **When** the endpoints ship
  **Then** the spec documents both paths, all query params, response schemas, and error codes in the same PR (NFR38), and the OpenAPI-diff CI gate passes

## Data Model & Sourcing

### AFRIK dependencies

- Source of truth for v1 name data: `content.appellations` in PPL fiches (`dataset/source/afrik/peuples/FLG_*/PPL_*.json`), per the strict model `public/modele-peuple.json` (`mainName`, `selfAppellation`, `exonyms[]`, `originOfExonyms`, `whyProblematic`, `contemporaryUsage`).
- These fields are prose blobs; the atlas needs per-name structured records. Curation (not code) converts prose into records, and only where a Tier 1/2 source exists — hence the new dataset type below.
- Module 0 tables consumed: `sources` (tier lives here), `assertions` (polymorphic `entity_type`/`entity_id`, `field_path`, `source_ids[]`), `confidence_scores`.

### New Supabase table: `name_records`

Migration sketch — **numbered placeholder `0XX_names_atlas.sql`** (next free number at implementation time; 028 as of this writing — coordinate with Epic 7's migrations), idempotent, applied manually per AR45 runbook (`supabase db push`, never auto-migrate):

```sql
-- 0XX_names_atlas.sql — Names Atlas data model (Epic 8, FR53-FR58)
-- Idempotent. Human-applied via supabase db push (AR45).

DO $$ BEGIN
  CREATE TYPE name_record_type AS ENUM
    ('endonym', 'exonym', 'historical_spelling', 'surname');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS name_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'people',         -- Module 0 fabric convention: TEXT values ('people', 'language_family', 'country' per 009), not a Postgres enum; v1 populates 'people' only
  entity_id VARCHAR(50) NOT NULL,                     -- PPL_* (FK to afrik_peoples for v1 rows)
  name_text TEXT NOT NULL,
  name_type name_record_type NOT NULL,
  language_of_origin VARCHAR(3),                      -- ISO 639-3 where sourced, else NULL
  meaning TEXT,                                       -- sourced etymology gloss, else NULL
  period_label TEXT,                                  -- for historical_spelling: attested period, sourced
  imposed_by TEXT,                                    -- imposed-name context (NULL = not imposed)
  imposition_period TEXT,
  why_problematic TEXT,
  contemporary_usage TEXT,
  assertion_id uuid NOT NULL REFERENCES assertions(id),
  sort_rank INTEGER NOT NULL DEFAULT 0,               -- endonym-first ordering within a dossier
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT name_records_unique_variant UNIQUE (entity_type, entity_id, name_text, name_type),
  CONSTRAINT name_records_imposed_needs_context
    CHECK (imposed_by IS NULL OR why_problematic IS NOT NULL)
);

-- Source-or-drop enforcement (AR3 pattern): reject rows whose assertion
-- cites zero Tier 1/2 sources. Function body mirrors 011_assertions_triggers.sql.
-- CREATE OR REPLACE FUNCTION enforce_name_record_sources() ... (trigger, see Story 8.1)

-- Name-variant FTS (extends Epic 2 / migration 025 pattern)
ALTER TABLE name_records
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french', COALESCE(name_text, '') || ' ' || COALESCE(meaning, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_name_records_search_vector
  ON name_records USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_name_records_entity
  ON name_records(entity_type, entity_id);

-- RLS: read public, write role-gated (AR6) — see Story 8.1 for policies.
ALTER TABLE name_records ENABLE ROW LEVEL SECURITY;
```

Naming follows pattern N1 (domain prefix, not module prefix — like `sources`, `flags`); polymorphic `(entity_type, entity_id)` follows the Module 0 fabric convention — `entity_type` is TEXT (like `assertions` in 009; no `entity_type` Postgres type exists) — so languages/places can be covered later without schema change (NFR16). No new columns on `afrik_peoples`.

### New dataset type (blocking stories)

Curated name records are a new AFRIK dataset type — the existing fiche prose cannot carry per-name sources:

- **Strict model file:** `public/modele-nom.json` (Story 8.2 — blocking). One document per people: `{ _meta, peopleId, names: [{ nameText, nameType, languageOfOrigin?, meaning?, periodLabel?, imposedBy?, impositionPeriod?, whyProblematic?, contemporaryUsage?, sources: [{ ref, url, tier, notes? }] }] }`. Never skip, rename, or add sections (AFRIK discipline).
- **Dataset location:** `dataset/source/afrik/noms/NOM_PPL_*.json` (one file per people, filename carries the PPL id).
- **Validator extension:** `scripts/validateAfrikData.ts` (Story 8.3 — blocking) gains FR-name rules (below).
- **Loader:** `src/lib/afrik/loaders/nameRecordJsonLoader.ts` (Story 8.5) loads dataset → `sources`/`assertions`/`name_records`.

### Source Tier policy application

- Tier 1 (UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA) cited directly; Tier 2 = primary source located via ≥ 2 Wikipedia language versions, citing the primary source URL with the Wikipedia path recorded in `notes`; Tier 3 forbidden. Every `sources` entry in `modele-nom.json` records `tier: 1 | 2`.
- **"Source or drop" is absolute:** no invented etymologies, no speculative name genealogy, no "probably derives from". The extraction script (8.4) emits unsourceable candidates to a curation report file — never to the dataset.
- Illustrative example — **illustrative, not data; drawn from the existing `PPL_DINKA` fiche and re-verified at curation time:** endonym `Jieng` / `Muonyjang` (with meaning gloss), exonym `Dinka` (Arabic-origin term adopted by British/Egyptian colonial administration), historical variant `Denka`. This is the shape a curated `NOM_PPL_DINKA.json` would take; every field still requires its own Tier 1/2 citation before publication.

### FR28-style integrity rules (validator, CI-gated)

| Rule ID      | Check                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| FR57-source  | Every name record cites ≥ 1 source with `tier` 1 or 2; Tier 2 records carry Wikipedia path in `notes` |
| FR56-imposed | `imposedBy` present ⇒ `whyProblematic` non-empty                                                      |
| FR54-endonym | Every people covered by the atlas dataset has ≥ 1 `endonym` record (AR33 echo)                        |
| FR53-ref     | `peopleId` exists in `dataset/source/afrik/peuples/**` (no orphan name files)                         |
| FR53-dup     | No duplicate `(peopleId, nameText, nameType)` across the dataset                                      |
| FR55-iso     | `languageOfOrigin`, when present, is a valid ISO 639-3 code (FR29 mechanics)                          |

All rules run in `data-integrity.yml` pre-merge + nightly (FR32).

## API Surface

Both endpoints follow the 3-layer pattern (route → handler → service), Zod schemas in `src/api/v2/schemas/names.ts` (never inline in routes), envelopes via `createApiResponse` / `createApiError`, snake_case→camelCase mapping inside the service, logging via `@/lib/api/logger`.

### `GET /v2/names` (Story 8.7)

- **Files:** `src/app/api/v2/names/route.ts` → `src/api/v2/handlers/names.ts` → `src/api/v2/services/names.ts`
- **Query params:** `q?` (FTS on name variants, ≥ 2 chars), `nameType?` (`endonym|exonym|historical_spelling|surname`), `imposedOnly?` (boolean), `peopleId?`, `letter?` (single initial for alphabetical browse), `limit` (default 20, max 100), `offset`
- **Response `data`:** `{ names: [{ id, nameText, nameType, languageOfOrigin, meaning, periodLabel, imposition: { imposedBy, impositionPeriod, whyProblematic, contemporaryUsage } | null, people: { id, nameMain, autonym, slug }, assertionId }], total }`
- **Ranking (with `q`):** `ts_rank_cd` on `websearch_to_tsquery('french', q)`, boosted by the people's confidence score (`score/100`) — same formula as `/v2/search` (Epic 2 Story 2.6)
- **Cache:** `s-maxage=3600` (mutable via moderation); anonymous rate limit 60 req/min (AR11)
- **Errors:** `VALIDATION_ERROR` 400 (bad params), `RATE_LIMITED` 429 with `Retry-After` + `X-RateLimit-*`

### `GET /v2/peoples/{id}/names` (Story 8.6)

- **Files:** `src/app/api/v2/peoples/[id]/names/route.ts` → handler → service (service batches source/confidence joins via the `getSourcesMap`/`getConfidenceMap` pattern — AR17, no N+1)
- **Response `data`:** `{ peopleId, autonym, names: [ ...same record shape..., sources: [{ id, title, url, year, tier }], confidence: { score, recomputedAt } ] }` ordered `sort_rank` (endonyms first), then `name_type`, then `name_text`
- **Cache:** `s-maxage=3600`; **Errors:** `NOT_FOUND` 404 for unknown PPL id, `VALIDATION_ERROR` 400

### OpenAPI (mandatory, same PR as each endpoint)

`src/lib/api/openapiV2.ts` gains both paths, the `NameRecord` schema, all params, and error responses. The OpenAPI-diff CI gate must pass; additions are additive-only within `/v2` (NFR31). The `/fr/noms` route segment is added to `src/lib/routing.ts` in the same wave (anti-pattern rule: no new top-level segment without routing + OpenAPI updates).

## UX & Components

Visual specification is deliberately minimal (tokens + shadcn composition); a designer pass is deferred to the redesign phase. Functional a11y is maximal (next section). All components: mobile-first 320–430 px, breakpoints 430 / 720 / 800, Server Components by default, `"use client"` only where interaction demands.

**New components in `src/components/names/`** (domain folder mirroring `src/components/country/`; shared L3 primitives stay in Epic 1's `src/components/system/`):

| Component             | Props sketch                                                                             | Notes                                                                                                                                                                                                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NameTypeBadge`       | `{ nameType: "endonym"\|"exonym"\|"historical_spelling"\|"surname", imposed?: boolean }` | Icon + French text label + color, never color alone. Imposed variant uses `--afh-colonial` / `--afh-colonial-bg` (muted brick, calm — never `--afh-error`). Labels: "endonyme", "exonyme", "graphie historique", "patronyme", "nom imposé".                                                                         |
| `NameOriginCard`      | `{ record: NameRecordView, confidenceChip: ReactNode }`                                  | One name record: name in Fraunces (weight 700; the people's endonym itself always renders through `AutonymExonymHeading` per UX-DR49 #1), `lang={languageOfOrigin}` on the name text (UX-DR38), meaning + imposition context in Nunito Sans body, `ConfidenceChip` slot required (source-attached rule UX-DR49 #2). |
| `NameSpellingHistory` | `{ spellings: [{ nameText, periodLabel, confidenceChip }] }`                             | Chronological `<ol>` of historical spellings — a semantic ordered list IS the primary rendering (no dataviz, no timeline library).                                                                                                                                                                                  |
| `PeopleNamesSection`  | `{ peopleId, dossier: PeopleNamesDossier }`                                              | Fiche section at anchor `#noms`: endonyms first, exonyms with imposition context + `DoctrineLinkCard`, then `NameSpellingHistory`. Omits itself when empty (UX-DR31).                                                                                                                                               |
| `NamesAtlasView`      | `{ initialRecords, total, filters }`                                                     | `/fr/noms` orchestrator: search input (submit-button pattern, not instant — UX-DR32), always-visible filter chip row, alphabetically grouped SSR list, pagination.                                                                                                                                                  |

**Design tokens:** reuse `--afh-*` exclusively — `--afh-colonial(-bg)` for imposed names, `--afh-gold` / `--afh-earth` for source tiers, `--afh-text-soft` for meta. **No new tokens.** No raw hex/px in components (AR40 stylelint rule).

**Type roles:** Fraunces for displayed names (display voice — the name is the subject); Nunito Sans for badges, meaning, context, UI. Autonym display inherits `AutonymExonymHeading` invariants (Fraunces 900 + `lang` attr).

**Microcopy (French, librarian tone, UX-DR34):** "rechercher un nom", "nom imposé", "qui a imposé ce nom", "pourquoi ce nom pose problème", "voir les sources", empty state "aucun nom trouvé — vérifier l'orthographe ou parcourir par type de nom".

**Storybook (`@storybook/react-vite` only):** every component above ships `*.stories.tsx` at 430 / 720 / 800 px with loaded / empty / imposed-name states; axe-core runs on each story (NFR37, UX-DR48).

## Accessibility (WCAG 2.1 AA)

Accessibility is functional scope. The atlas contains **no graphical dataviz in v1** — the text-first equivalent IS the primary surface: the atlas index is a semantic list, the dossier is headed prose + lists, spelling evolution is a chronological `<ol>`. Nothing here has a "visual mode" whose meaning is unavailable to text.

**Atlas index + search (`/fr/noms`):**

- _Keyboard:_ search input reachable first after skip-link; filter chips are toggle buttons (`Tab` to reach, `Enter`/`Space` to toggle, `aria-pressed` state); result entries are plain links; pagination links; no keyboard trap; `/` focuses the search input (progressive enhancement, UX-DR29).
- _Screen reader:_ page `<h1>` "Atlas des noms"; result count announced via `aria-live="polite"` region after a search ("N noms trouvés pour {q}"); each entry announced as "{name}, {type label}, peuple : {autonym}" — the type comes from visible text, not color; alphabetical group headers are real `<h2>` elements.
- _Text-first equivalent:_ the list itself — filterable, paginated, complete. No separate fallback needed because no dataviz exists.

**Name dossier (`#noms` fiche section):**

- _Keyboard:_ every `ConfidenceChip` tab-reachable, `Enter`/`Space` opens `SourceChainSheet` (inherits Epic 1 keyboard model: focus trap, `Esc`/swipe/scrim dismiss, return-focus-to-chip).
- _Screen reader:_ section heading `<h2>` "Noms" ; endonym announced with correct pronunciation via `lang={iso639-3}` (UX-DR38); imposed names announced as "nom imposé" through visible badge text; imposition context is ordinary prose (no `aria` acrobatics); `NameSpellingHistory` is an `<ol>` so item count and order are announced natively.
- _Reduced motion:_ no module-specific animation; only inherited token-level transitions, which resolve to 0.01 ms under `prefers-reduced-motion: reduce` (UX-DR4).

**CI gate:** `/fr/noms` and one dossier-bearing fiche route added to the axe-core (Playwright) matrix in `a11y.yml` — zero serious/critical violations blocks merge (Story 8.12); axe also runs per Storybook story. Per-module manual pass (UX-DR43): keyboard-only journey + VoiceOver (iOS) + TalkBack in French on the search→dossier→source-chain journey, 200 % zoom check, color-blindness simulation on the badge palette.

## Performance

- **Lighthouse mobile ≥ 85 gate:** `/fr/noms` and one dossier fiche route added to `lighthouse.yml` reference routes (Story 8.12). LCP ≤ 2.5 s / INP ≤ 200 ms / CLS ≤ 0.1 on the 4G profile (NFR1).
- **SSR + pagination:** atlas index is server-rendered with `limit=20` pages; no client-side infinite scroll; search is submit-based (one request per query, rate-limit friendly).
- **Search latency:** name-variant FTS hits the `name_records` GIN index — ≤ 500 ms p95 at MVP scale (NFR4); `s-maxage=3600` edge caching on both endpoints.
- **Hydration budget:** only the filter chip row and chips hydrate (`"use client"` islands); dossier prose and lists are Server Components. `ConfidenceChip`/`SourceChainSheet` budgets (≤ 2 KB / ≤ 8 KB gzipped, lazy) are inherited, not re-paid.
- **New dependencies: NONE.** Explicit decisions:
  - _Client fuzzy search (e.g. Fuse.js, ~10 KB gz):_ rejected — Postgres FTS already exists (Epic 2), server-side search scales with corpus, zero bundle cost. KISS.
  - _Timeline/visualization library for spelling evolution:_ rejected — a semantic `<ol>` carries the same information at zero cost and is the a11y-primary form anyway.
  - _`pg_trgm` fuzzy matching for misspelled variants:_ deferred (Open Questions) — French FTS + curated variant coverage first; add trigram similarity only if real query logs show a miss rate.

## Test Plan (TDD)

TDD is mandatory: each story writes its failing test file first (red → green → refactor). Placement per project conventions:

| Layer                  | Location                           | Files (per story)                                                                                                                |
| ---------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Migration DDL contract | `scripts/__tests__/`               | `namesAtlasMigration.test.ts` (8.1 — asserts the SQL file declares table, enum, CHECK, trigger, GIN index, RLS)                  |
| Parser (strict model)  | `src/lib/afrik/parsers/__tests__/` | `nameRecordParser.test.ts` (8.2)                                                                                                 |
| Validator rules        | `scripts/__tests__/`               | `validateNameRecords.test.ts` (8.3)                                                                                              |
| Extraction script      | `scripts/__tests__/`               | `extractNameRecordsFromFiches.test.ts` (8.4)                                                                                     |
| Loader                 | `src/lib/afrik/loaders/__tests__/` | `nameRecordJsonLoader.test.ts` (8.5)                                                                                             |
| Handlers/services      | `src/api/v2/__tests__/`            | `peopleNames.test.ts` (8.6), `names.test.ts` (8.7)                                                                               |
| API routes             | `src/app/api/v2/__tests__/`        | `names-routes.test.ts` (8.6/8.7)                                                                                                 |
| Components             | `src/components/names/__tests__/`  | `NameOriginCard.test.tsx`, `NameTypeBadge.test.tsx` (8.8), `PeopleNamesSection.test.tsx` (8.9), `NamesAtlasView.test.tsx` (8.10) |

Mocking discipline: real JSON fixtures for parser/loader/extraction tests (never deep Supabase mocks — the known test-bug source); component tests exercise the public interface with axe assertions; handler tests mock at the service boundary only. `make check` green (modulo the acknowledged pre-existing failures) before any story is declared done.

## Epic 8 Definition

**Epic goal:** Every people's names — endonyms first, exonyms contextualized, spellings historicized — become a browsable, searchable, fully sourced Names Atlas; imposed names carry their imposition context as structured data that Epic 13 consumes.

**FRs covered:** FR53, FR54, FR55, FR56, FR57, FR58

**Key deliverables:** `name_records` table + `name_record_type` enum + source-or-drop trigger + FTS column (migration `0XX_names_atlas.sql`) · strict model `public/modele-nom.json` + dataset `dataset/source/afrik/noms/` · `validateAfrikData.ts` FR-name rules in CI · extraction + curation waves (appellations-derived, then surnames — Tier 1/2 only) · `nameRecordJsonLoader` · `GET /v2/names` + `GET /v2/peoples/{id}/names` + OpenAPI · `NameTypeBadge`, `NameOriginCard`, `NameSpellingHistory`, `PeopleNamesSection`, `NamesAtlasView` components · `/fr/noms` page + routing entry · a11y + Lighthouse gate wiring.

**Depends on:** Epic 0 (validator + CI gates), Epic 1 (sources/assertions/confidence fabric, ConfidenceChip/SourceChainSheet/ClassificationBadge/DoctrineLinkCard, `--afh-*` tokens), Epic 2 (AutonymExonymHeading, FTS pattern, reading surface), Epic 3 (fiche snapshots include names section). Position: after Epic 7 in build order; consumes nothing from it.
**Enables:** Epic 13 (imposed-name data), Epics 9/10 (name context available to fiche-consuming modules).

## Stories

### Story 8.1: `name_records` schema migration

**As a** backend engineer,
**I want** a `name_records` table with its enum, source-or-drop trigger, FTS column, and RLS policies,
**So that** every downstream story reads and writes one canonical naming data model (FR55, FR57).

**Acceptance Criteria:**

**Given** the failing test `scripts/__tests__/namesAtlasMigration.test.ts` written first
**When** I create `supabase/migrations/0XX_names_atlas.sql` (next free number; 028 as of writing)
**Then** the test passes: the SQL declares the `name_record_type` enum, the `name_records` table per the Data Model sketch (with `entity_type` as TEXT per the Module 0 fabric convention — no `entity_type` Postgres type exists), the `name_records_imposed_needs_context` CHECK, the unique `(entity_type, entity_id, name_text, name_type)` constraint, a trigger rejecting rows whose `assertion_id` is null or whose assertion cites zero Tier 1/2 sources, the generated `search_vector` column + GIN index, and RLS enablement

**Given** the migration applied to a staging database via `supabase db push`
**When** an insert with a sourceless assertion is attempted
**Then** the statement is rejected by the trigger, and an insert with a Tier 1-sourced assertion succeeds

**Given** RLS policies
**When** an anonymous client selects from `name_records`
**Then** reads succeed; writes require `role IN ('moderator', 'admin')` (AR6)

**Technical notes:** Touches `supabase/migrations/0XX_names_atlas.sql` only. Test: `scripts/__tests__/namesAtlasMigration.test.ts` (static DDL-contract assertions on the SQL text — same idempotence discipline as 015/016). Trigger body mirrors `011_assertions_triggers.sql`. **First story, runs alone** — nothing else starts before the schema shape is merged. Human applies the migration per AR45; the story is code-complete without prod application.

### Story 8.2: Strict model `modele-nom.json` + name-record parser

**As a** data curator,
**I want** a strict AFRIK model for name-record documents and a parser that enforces it,
**So that** curated name data enters the pipeline in exactly one auditable shape (FR56, FR57). **Blocking for all dataset work.**

**Acceptance Criteria:**

**Given** the failing test `src/lib/afrik/parsers/__tests__/nameRecordParser.test.ts` written first, with real JSON fixtures
**When** I create `public/modele-nom.json` (with `_meta.format`, `_meta.entity: "nom"`, `_meta.directives` mirroring the existing `modele-peuple.json` conventions) and `src/lib/afrik/parsers/nameRecordParser.ts`
**Then** the parser accepts a conforming document and returns typed records, and rejects documents that skip/rename/add sections, use an unknown `nameType`, omit `sources`, or carry a source without `tier`

**Given** a record with `imposedBy` but empty `whyProblematic`
**When** parsed
**Then** parsing fails with a named violation (FR56-imposed surfaced at parse time, before the validator)

**Given** `dataset/source/afrik/noms/` created with a `.gitkeep` and one fixture-quality example file clearly headed `"_meta": { "illustrative": true }`
**When** the example is parsed
**Then** it round-trips — and it is excluded from production loads by the loader (8.5)

**Technical notes:** New files: `public/modele-nom.json`, `src/lib/afrik/parsers/nameRecordParser.ts`, fixtures under `src/lib/afrik/parsers/__tests__/fixtures/`. Zod schema co-located with the parser. Depends on 8.1 (enum values must match). Blocks 8.3, 8.4, 8.5.

### Story 8.3: `validateAfrikData.ts` FR-name integrity rules

**As a** maintainer,
**I want** the six FR-name rules wired into the data validator and the CI data-integrity gate,
**So that** unsourced or uncontextualized name data can never merge (FR56, FR57, FR32). **Blocking for dataset growth.**

**Acceptance Criteria:**

**Given** the failing test `scripts/__tests__/validateNameRecords.test.ts` written first
**When** I extend `scripts/validateAfrikData.ts` with rules FR57-source, FR56-imposed, FR54-endonym, FR53-ref, FR53-dup, FR55-iso (table in Data Model & Sourcing)
**Then** each rule fails on a crafted bad fixture and passes on the good fixture, with rule IDs in the report output

**Given** a Tier 2 source entry without the Wikipedia cross-check path in `notes`
**When** validation runs
**Then** FR57-source reports a violation (auditable chain required)

**Given** `.github/workflows/data-integrity.yml`
**When** the workflow runs pre-merge with a violating `dataset/source/afrik/noms/**` file
**Then** the job fails and blocks merge

**Technical notes:** Touches `scripts/validateAfrikData.ts`, `.github/workflows/data-integrity.yml` (add `noms/**` path). Test: `scripts/__tests__/validateNameRecords.test.ts`. Depends on 8.2 (parser is the input). Blocks 8.4 and 8.11 (curation must land against a live gate).

### Story 8.4: Appellations extraction + curation wave 1 (source or drop)

**As a** data curator,
**I want** an extraction script that drafts name records from existing PPL `content.appellations` blocks plus a curation pass that publishes only sourceable records,
**So that** the atlas launches with real, fully sourced data and zero invented etymology (FR54, FR57). **Blocking for launch — no atlas ships on empty or unsourced data.**

**Acceptance Criteria:**

**Given** the failing test `scripts/__tests__/extractNameRecordsFromFiches.test.ts` written first, using real fiche fixtures
**When** I create `scripts/extractNameRecordsFromFiches.ts`
**Then** it parses `content.appellations` (`selfAppellation` → endonym drafts, `exonyms[]` → exonym drafts, `originOfExonyms`/`whyProblematic`/`contemporaryUsage` → imposition-context drafts) and writes **draft** `modele-nom.json`-shaped files to a working directory — never directly to `dataset/source/afrik/noms/`

**Given** a draft whose claims cannot be attached to a Tier 1/2 source during curation
**When** the curation pass completes
**Then** the record is dropped and listed in a curation report (people id, name, reason) — the report is a working artifact, not a dataset file

**Given** curation wave 1 (target: an agreed starter set of peoples — see Open Questions)
**When** the curated files land in `dataset/source/afrik/noms/` via PR
**Then** `validateAfrikData.ts` passes all FR-name rules and every published record cites Tier 1/2 sources

**Technical notes:** New: `scripts/extractNameRecordsFromFiches.ts` + test. Curation itself uses the `afrik-curator` skill workflow (editorial, human-reviewed). Depends on 8.2 + 8.3. Blocks nothing technically (API/UI develop against fixtures) but **blocks launch** of 8.9/8.10 with real data. May start early in parallel with Epic 7 per build-order rules.

### Story 8.5: `nameRecordJsonLoader` → Supabase

**As a** backend engineer,
**I want** a loader that loads curated name documents into `sources`, `assertions`, and `name_records`,
**So that** the dataset and the database stay consistent, with sourcing wired through the Module 0 fabric (FR57).

**Acceptance Criteria:**

**Given** the failing test `src/lib/afrik/loaders/__tests__/nameRecordJsonLoader.test.ts` written first (real fixtures; Supabase mocked at the client boundary only)
**When** I create `src/lib/afrik/loaders/nameRecordJsonLoader.ts`
**Then** for each record it upserts the cited `sources` rows (dedup by existing unique title constraint), creates one `assertions` row (`entity_type='people'`, `entity_id=peopleId`, `field_path='names.{nameType}.{slug(nameText)}'`, `source_ids`), then upserts the `name_records` row referencing that assertion — idempotent on re-run (no duplicate records, `name_records_unique_variant` respected)

**Given** a record the database trigger rejects (defense in depth: sourceless assertion)
**When** the loader runs
**Then** it logs the rejection via `@/lib/api/logger`, continues with remaining records, and exits non-zero listing dropped records

**Given** `scripts/migrateAfrikToDatabase.ts`
**When** extended to invoke the names loader after the peoples loader
**Then** ordering guarantees the referenced PPL rows exist first

**Technical notes:** New: `src/lib/afrik/loaders/nameRecordJsonLoader.ts` + test; touches `scripts/migrateAfrikToDatabase.ts` (add loader call — do not touch its 6 known-failing pre-existing tests). Endonym rows get `sort_rank=0`, others `sort_rank=1` (endonym-first ordering is data, not UI guesswork). Depends on 8.1, 8.2. Blocks 8.6, 8.7.

### Story 8.6: `GET /v2/peoples/{id}/names` endpoint

**As a** frontend engineer and API consumer,
**I want** a per-people name-dossier endpoint with sources and confidence attached,
**So that** the fiche names section and third parties read one contract (FR54, FR58).

**Acceptance Criteria:**

**Given** failing tests `src/api/v2/__tests__/peopleNames.test.ts` and `src/app/api/v2/__tests__/names-routes.test.ts` written first
**When** I create `src/app/api/v2/peoples/[id]/names/route.ts` → `src/api/v2/handlers/peopleNames.ts` → `src/api/v2/services/names.ts` with Zod params in `src/api/v2/schemas/names.ts`
**Then** a valid PPL id returns the dossier shape from API Surface, ordered endonyms-first, with per-record `sources[]` (title, url, year, tier) and `confidence`, in the `{ data, meta, errors: [] }` envelope with `meta.license = "CC-BY-SA-4.0"`

**Given** an unknown id
**When** requested
**Then** `404 NOT_FOUND` per AR9; malformed id → `400 VALIDATION_ERROR`

**Given** source/confidence joins
**When** the service builds the dossier
**Then** it batches lookups (AR17 map pattern) — one query per relation set, no per-record queries

**Given** the OpenAPI spec
**When** the endpoint ships
**Then** `src/lib/api/openapiV2.ts` documents path, `NameRecord` schema, and error codes in the same PR; OpenAPI-diff gate passes

**Technical notes:** New: route + handler + `names.ts` service + schema + tests. Cache `s-maxage=3600` via route layer; CORS from `src/lib/api/cors.ts`. Depends on 8.5 (data exists in staging) — can develop against seeded fixtures. Blocks 8.9.

### Story 8.7: `GET /v2/names` index + name-variant search endpoint

**As a** visitor and API consumer,
**I want** a browsable, filterable, searchable names index endpoint,
**So that** any name variant leads to its peoples (FR53, FR55, FR58).

**Acceptance Criteria:**

**Given** the failing test `src/api/v2/__tests__/names.test.ts` written first (extend `names-routes.test.ts` for the route layer)
**When** I create `src/app/api/v2/names/route.ts` → `src/api/v2/handlers/names.ts` → service methods in `src/api/v2/services/names.ts`
**Then** the route validates `q?`, `nameType?`, `imposedOnly?`, `peopleId?`, `letter?`, `limit`, `offset` via Zod and returns `{ names: [...], total }` with each record carrying its people summary (id, nameMain, autonym, slug)

**Given** `q="jieng"` _(illustrative)_ at 1 000-fiche scale
**When** the handler runs `websearch_to_tsquery('french', q)` against `name_records.search_vector` ranked by `ts_rank_cd` × confidence boost
**Then** matching records return in ≤ 500 ms p95 (NFR4), French stemming applied

**Given** `imposedOnly=true`
**When** queried
**Then** only records with `imposed_by IS NOT NULL` return — the contract Epic 13 consumes

**Given** the 61st anonymous request in a minute
**When** it arrives
**Then** `429 RATE_LIMITED` with `Retry-After` + `X-RateLimit-*` (AR11)

**Given** the OpenAPI spec and `src/lib/routing.ts`
**When** the endpoint ships
**Then** both are updated in the same PR; OpenAPI-diff gate passes

**Technical notes:** New: route + handler additions + service methods + tests. Pagination is `limit`/`offset` (matches existing peoples endpoints; corpus ≤ 10 k rows — cursor pagination unnecessary, KISS). Depends on 8.5, 8.6 (shares service file). Blocks 8.10.

### Story 8.8: `NameTypeBadge` + `NameOriginCard` + `NameSpellingHistory` components

**As a** reader,
**I want** name records rendered as calm, sourced, typed cards with imposed names visibly contextualized,
**So that** every name I see carries its nature and its evidence (FR54, FR56).

**Acceptance Criteria:**

**Given** failing tests `src/components/names/__tests__/NameTypeBadge.test.tsx` and `NameOriginCard.test.tsx` written first
**When** I create the three components in `src/components/names/` per the UX & Components props sketches
**Then** `NameTypeBadge` renders icon + French label + color for all four types (never color alone), the imposed variant uses `--afh-colonial(-bg)` and never `--afh-error`; `NameOriginCard` renders the name with `lang={languageOfOrigin}` when present, requires its `confidenceChip` slot (UX-DR49 #2), and renders imposition context (`imposedBy`, `impositionPeriod`, `whyProblematic`, `contemporaryUsage`) when provided; `NameSpellingHistory` renders a semantic `<ol>` in the given chronological order with one `ConfidenceChip` per entry

**Given** a card with missing optional fields (no meaning, no ISO code)
**When** rendered
**Then** it renders the available fields without placeholders — never throws, never invents

**Given** Storybook stories at 430 / 720 / 800 px covering endonym / imposed-exonym / historical / empty states
**When** axe-core runs on each story
**Then** zero serious/critical violations

**Technical notes:** New: `src/components/names/{NameTypeBadge,NameOriginCard,NameSpellingHistory}.tsx` + `index.ts` barrel + tests + stories. Server Components (no state); `ConfidenceChip` arrives as a slot from the parent. Depends on Epic 1 primitives; independent of 8.6/8.7 (fixture-driven). Blocks 8.9, 8.10.

### Story 8.9: `PeopleNamesSection` on the people fiche

**As a** reader on a people fiche,
**I want** a names section presenting endonyms first, contextualized exonyms, and spelling history,
**So that** the fiche answers "who named this people, and what do they call themselves?" in place (FR54, FR56).

**Acceptance Criteria:**

**Given** the failing test `src/components/names/__tests__/PeopleNamesSection.test.tsx` written first
**When** I create `PeopleNamesSection` and register it in `PeopleDetailViewV2` with anchor `id="noms"`, feeding it from `GET /v2/peoples/{id}/names` data threaded through the fiche's server-side data flow (extend `src/lib/peopleDataTransformer.ts` with a `names` payload)
**Then** endonym records render first (via `AutonymExonymHeading` semantics for the people name, `NameOriginCard` for each record), imposed exonyms carry the badge + full context + a `DoctrineLinkCard`, and `NameSpellingHistory` closes the section

**Given** a people with zero published name records
**When** the fiche renders
**Then** the section omits itself entirely (UX-DR31) — SSR output contains no empty shell

**Given** the section renders server-side
**When** measured on the 4G mobile profile
**Then** the fiche's LCP ≤ 2.5 s budget still holds (section is below the fold; chips hydrate second-wave per UX-DR18)

**Given** Epic 3 pinned versions
**When** a revision snapshot is taken after this story lands
**Then** the snapshot includes the names payload so `@v{n}` URLs render the dossier as-published (AR14)

**Technical notes:** New: `PeopleNamesSection.tsx` + test + story. Touches: `src/components/people/PeopleDetailViewV2.tsx` (register section), `src/lib/peopleDataTransformer.ts` (+ transformer unit tests in its existing suite). Depends on 8.6, 8.8. Coordinate the snapshot-inclusion note with Epic 3's revision service.

### Story 8.10: `/fr/noms` Names Atlas page

**As a** visitor,
**I want** a mobile-first atlas page to browse, filter, and search all name records,
**So that** "where does my name come from?" has a public front door (FR53, FR55).

**Acceptance Criteria:**

**Given** the failing test `src/components/names/__tests__/NamesAtlasView.test.tsx` written first
**When** I create `src/app/[lang]/noms/page.tsx` (SSR, French only) rendering `NamesAtlasView`, and register the `noms` segment in `src/lib/routing.ts` (new PageType entry) plus labels in `src/lib/translations.ts`
**Then** the page renders the alphabetically grouped SSR list at 320–430 px without horizontal scroll, escalating at 720 / 800 px

**Given** the search input (submit-button pattern) and filter chips (`endonyme` / `exonyme` / `graphie historique` / `patronyme` / `noms imposés`)
**When** a visitor searches or filters
**Then** the page queries `GET /v2/names`, the URL query string reflects state (shareable), active filters dismiss with `×`, and the result count announces via `aria-live="polite"`

**Given** an empty result
**When** rendered
**Then** the calm empty state offers spelling guidance, browse-by-type links, and "signaler une donnée manquante" pre-filled with the query — no emoji, no "Oops"

**Given** each atlas entry
**When** activated
**Then** it links to the people fiche's `#noms` anchor — one canonical dossier surface, no duplication

**Technical notes:** New: `src/app/[lang]/noms/page.tsx`, `NamesAtlasView.tsx` + test + story. Touches: `src/lib/routing.ts`, `src/lib/translations.ts` (French strings only — never reintroduce a locale switch). Client island limited to search/filter controls (TanStack Query for the filtered fetches). Depends on 8.7, 8.8, 8.9 (anchor target exists).

### Story 8.11: Surname-connection curation wave (source or drop)

**As a** diaspora visitor,
**I want** surname-to-people records where — and only where — a Tier 1/2 onomastic source documents the connection,
**So that** "my family name" queries return evidence, never speculation (FR55, FR57). **Data-sourcing story — explicitly blocking nothing; ships value incrementally.**

**Acceptance Criteria:**

**Given** the FR-name validator rules already live (8.3)
**When** curation reviews surname-connection candidates against Tier 1/2 sources (academic onomastics, official records surfaced per the Tier 2 protocol)
**Then** each accepted record enters `dataset/source/afrik/noms/` as `nameType: "surname"` with its sources, and every candidate without a qualifying source is dropped and listed in the curation report with reason "no qualifying source"

**Given** a failing test extension in `scripts/__tests__/validateNameRecords.test.ts` written first
**When** I add the surname-specific rule (a `surname` record must additionally carry non-empty `meaning` **or** an explicit connection statement in the assertion notes — a bare name-to-people pairing with no documented basis is invalid)
**Then** the rule fails on a bare pairing fixture and passes on a documented one

**Given** the loaded wave
**When** a curated surname is searched on `/fr/noms`
**Then** it returns with its people, its "patronyme" badge, and its source chain — zero speculative genealogy anywhere in the corpus

**Technical notes:** Touches `scripts/validateAfrikData.ts` (+ its test) and dataset files via curation PRs (afrik-curator workflow, human-reviewed). Depends on 8.3, 8.5; independent of UI stories. May run in parallel any time after 8.5; expected to be small in v1 (see Open Questions on qualifying sources).

### Story 8.12: A11y + performance gates and manual pass for the atlas surfaces

**As a** maintainer,
**I want** the atlas routes wired into the axe-core and Lighthouse CI gates plus the per-module manual a11y pass completed,
**So that** the module's accessibility and performance are enforced, not asserted (FR53–FR56, NFR1, NFR18–NFR23).

**Acceptance Criteria:**

**Given** `.github/workflows/a11y.yml` and `lighthouse.yml`
**When** I add `/fr/noms` and one dossier-bearing fiche route to both matrices (failing first if violations exist — the gate is the test)
**Then** axe-core reports zero serious/critical violations and Lighthouse mobile Performance ≥ 85 on both routes, blocking merge on regression

**Given** the manual pass (UX-DR43)
**When** executed on the search → filter → dossier → source-chain journey
**Then** keyboard-only completes it with no trap, VoiceOver (iOS, French) and TalkBack announce name types and endonym pronunciation (`lang` attr) correctly, 200 % zoom reflows without horizontal scroll, and deuteranopia/protanopia/tritanopia simulations keep imposed-name badges distinguishable (icon + text carry the signal) — findings filed as issues before the epic closes

**Given** `prefers-reduced-motion: reduce`
**When** the atlas and dossier render
**Then** no residual animation beyond 0.01 ms opacity transitions

**Technical notes:** Touches `.github/workflows/a11y.yml`, `.github/workflows/lighthouse.yml` (route matrices only). No new test files beyond the CI configs; the manual-pass checklist is recorded in the PR description per UX-DR45. Depends on 8.9, 8.10. Last story of the epic.

## Out of Scope

- **Names of languages and places** — the schema supports them (`entity_type`), but v1 populates peoples only; activating other entity types is a product decision with its own curation budget.
- **Speculative name genealogy of any kind** — no inferred surname origins, no reconstructed etymologies without a Tier 1/2 source, ever. This is doctrine, not backlog.
- **Etymology dataviz** (name-evolution graphs, imposed-name maps) — Epic 13 owns the colonial-mapping visualization on top of this data; Epic 12 owns basemap/timeline foundations. V1 atlas is deliberately text-first.
- **`/v2/search` cross-entity integration** (adding a `names` group to the global search response) — additive and cheap, but touches Epic 2's contract; deferred to a coordinated follow-up (Open Question 4).
- **Fuzzy/trigram matching** (`pg_trgm`) for misspelled variants — deferred until query logs justify it.
- **Pronunciation audio and IPA authoring for name records** — the `AutonymExonymHeading` IPA affordance exists; recording/curating pronunciations is a growth-phase editorial effort.
- **Contribution UI specific to names** — flags on name assertions ride the Epic 4 fabric unchanged.
- **Visual/branding polish of the atlas** — deferred to the designer-led redesign phase; v1 ships tokens + shadcn only.

## Open Questions

1. **Canonical dossier URL for SEO:** should the name dossier eventually get its own indexable URL (`/fr/noms/{people-slug}`) to capture "where does my name come from" search traffic, or does the fiche `#noms` anchor remain canonical? (v1 ships the anchor; SEO analysis needed before adding a second surface.)
2. **Curation wave 1 sizing and priority list:** which peoples form the starter set for Story 8.4 (all 924 fiches is not a 1–3-day curation reality)? Proposal: begin with the fiches whose `appellations` blocks are richest and whose sources are already Tier 1 — needs product-owner sign-off.
3. **Qualifying surname sources:** which onomastic references count as Tier 1/2 for surname-to-people connections (academic onomastics journals? state civil-registry studies?) — needs advisory/PO validation before Story 8.11 curation starts.
4. **Global search integration:** add a `names` result group to `/v2/search` (additive per NFR31, touches Epic 2's handler) or keep `/v2/names?q=` as the sole name-search entry? Recommend deciding when Epic 8 and any Epic 2 follow-up can share a PR window.
5. **Naming doctrine text:** the imposed-name `DoctrineLinkCard` needs a doctrine section (naming doctrine: endonym primacy, exonym contextualization rules). Who authors it and on what advisory-board sign-off timeline (AR31)?
6. **Migration number collision:** `0XX_names_atlas.sql` assumes the next free number at implementation time; Epics 7 and 8 may land migrations in either order — the implementing dev takes the next number and updates this spec's references.
