# Epic 12 — African Migrations Timeline (spatio-temporal atlas)

**Pillar:** Les liens (Links) · **Module:** #6 — Frise des migrations africaines
**Status:** Draft — PRD addendum (FR block FR78–FR84)

## Module Goal

Ship a spatio-temporal atlas of African migrations: an Africa basemap plus a time scrubber that lets a reader watch peoples move across the continent through time — Bantu expansion phases, Nilo-Saharan and Cushitic movements, slave-trade routes, caravan networks. Selecting a migration reveals its path, its period, the peoples involved, its scholarly-debate status, and the full source chain behind every dated claim. This module OWNS the spatio-temporal event data model (`migration_events`), the Africa basemap foundation, and the timeline-scrubber interaction pattern — all three are reused by Epic 13. Because migration datings are among the most contested claims in African historiography, every event carries a mandatory classification status and Tier 1/2 sources, wired into the Module 0 fabric (assertions, confidence scores, flags). The map is a projection of the data, never the data itself: a chronological narrative text equivalent ships in the same wave as the dataviz and carries identical information.

## Fit & Dependencies

**Position in build order:** `7 → 8 → 9 → 10 → 11 → 12 → 13`. Epic 12 starts after Epic 11 ships, **except** its data-acquisition stories (12.1, 12.2), which are the long pole and may start early in parallel with Epics 7–11.

**Builds on (consumes):**

- **Module 0 fabric (Epics 0–1):** `sources`, `assertions`, `confidence_scores`, `flags` tables via the polymorphic `(entity_type, entity_id)` pattern — Epic 12 adds the `'migration'` entity type value (the fabric's `entity_type` is TEXT per `009_module_zero_fabric.sql`, so this is a new accepted value, not a schema change), it does NOT create a competing sourcing model. UI reuses `ConfidenceChip`, `ClassificationBadge`, `SourceChainSheet` verbatim.
- **Epic 2 reading surface:** `AutonymExonymHeading` for every people name rendered in migration surfaces (UX-DR49 #1 — bare name strings are a lint error), Direction D prose-with-inline-chips conventions for the narrative view, `--afh-*` tokens, Fraunces/Nunito type roles, 430/720/800 breakpoints.
- **Epic 0 CI gates:** data-integrity workflow extended with migration-corpus checks (FR80); Lighthouse and axe-core gates extended with the atlas route.
- **Epic 3 (pinned versions):** migration events participate in the generic `assertions`/`confidence_scores` fabric at MVP; pinned-version URLs (`@v{n}`) for migration fiches are deferred (see Out of Scope) — the polymorphic `revisions` table makes this additive later.

**OWNS (consumed by siblings):**

- **Spatio-temporal event model** — `migration_events` + `migration_event_peoples` tables, `migration_event_type` Postgres enum designed for extension (`ALTER TYPE … ADD VALUE`), the `MGR_*` identifier namespace, and `public/modele-migration.json`. Epic 13 EXTENDS this model with new event types; it defines no competing foundation. The extension seams — open `eventType` enum procedure, basemap layer slot, scrubber marker slot — are specified in the **Extension contract** (Data Model section).
- **Africa basemap foundation** — `AfricaBasemap` L3 component + the committed projected-SVG geometry asset + the `projectLonLat` equirectangular projection utility.
- **Timeline scrubber interaction pattern** — `TimeScrubber` L3 component (keyboard model, ARIA slider semantics, French era formatting), reused by Epic 13.

**Does NOT touch:** Epic 7's tree dataviz, Epic 8's naming/etymology model, Epic 11's people-relations model and network graph.

## User Journeys

**Journey 1 — Amina, diaspora reader (mobile, 390 px).** Amina heard "the Bantu expansion" mentioned in a podcast and wants to _see_ it. She opens `/fr/migrations` on her phone: the Africa map fills the top of the screen, a year scrubber sits directly beneath it, and a chronological list of migrations follows. She drags the scrubber backward; migration paths brighten and dim as the year changes. She taps an active path — a bottom sheet rises: name, period in plain French, a calm "débat scientifique en cours" badge, the peoples involved (endonym first), and a confidence chip she recognizes from people fiches. She taps a people link and lands on its fiche. **Success moment:** "I can see where they moved, when, and where historians still disagree — in three taps."

**Journey 2 — Ibrahima, teacher (low-end Android, throttled 4G).** Ibrahima prepares a lesson and needs citable prose, not an interactive toy. He opens the atlas and switches to the **Récit** tab: a server-rendered chronological account of each migration — period, phases, peoples, debate status — each dated claim ending in a `ConfidenceChip` that opens the source chain. He copies a primary-source reference for his slides. **Success moment:** the text carries everything the map shows, loads fast on his connection, and every date has a source he can hand to a colleague.

**Journey 3 — Claire, screen-reader user (NVDA, keyboard only).** Claire tabs to the year scrubber, announced as "Année, curseur, 500 av. J.-C." She presses arrow keys to move through time; each step announces the new year and how many migrations are active. She tabs into the event list — plain buttons — selects one with Enter, and the detail sheet opens with focus trapped inside; the period, peoples, and debate status are read in order. Esc returns her to the list, focus restored. **Success moment:** the entire atlas — time travel included — works without ever needing the map.

## Functional Requirements

- **FR78:** Users can explore African migrations on a spatio-temporal atlas combining an Africa basemap and a time scrubber; moving the scrubber changes which migration events are active at the selected year

**Given** the atlas page at `/fr/migrations` with a published migration corpus
**When** the page loads on a 430 px viewport
**Then** the Africa basemap, the time scrubber, and the chronological event list all render, with every published event listed regardless of scrubber position

**Given** the scrubber is set to year Y
**When** Y falls inside an event's `[startYear, endYear]` range
**Then** that event's path renders in its active state on the map and its list card is marked active; events outside the range render dimmed but remain selectable

**Given** the published corpus
**When** the scrubber bounds are computed
**Then** the minimum and maximum are derived from the earliest `startYear` and latest `endYear` in the corpus — never hardcoded

- **FR79:** Users can select a migration event and see its path or area on the map, its period, the peoples involved, its classification status, its confidence score, and the source chain of each dated assertion

**Given** an event selected from the list or by tapping its path
**When** the detail sheet opens
**Then** it shows the event name, its period formatted in French ("v. 1500 av. J.-C. – v. 500 apr. J.-C." pattern), a `ClassificationBadge`, a `ConfidenceChip`, and each people involved rendered via `AutonymExonymHeading` (inline variant)

**Given** a dated assertion in the detail sheet or narrative
**When** the reader taps its `ConfidenceChip`
**Then** the `SourceChainSheet` opens with the assertion quoted verbatim and its Tier 1/2 sources, identical in behavior to people fiches (UX-DR10)

**Given** an event is selected
**When** the map re-renders
**Then** the selected path gains increased stroke width plus a text label — never color change alone (UX-DR39)

- **FR80:** Every migration event must carry a classification status and at least one Tier 1/2 source; the system validates migration-corpus integrity (identifier format and uniqueness, time-range coherence, valid geometry, resolvable people references, source tiers) and CI blocks merges on regressions

**Given** a migration fiche missing `classificationStatus` or with an empty `sources` block
**When** `tsx scripts/validateAfrikData.ts` runs
**Then** validation fails with an error naming the fiche and the missing field

**Given** a fiche with `classificationStatus: "contested"` citing fewer than 2 sources, or `startYear > endYear`, or a `peoplesInvolved` entry not matching any existing `PPL_*` id
**When** the validator runs
**Then** each condition produces a blocking error (mirrors the AR32 two-source rule and FR26–FR29 discipline)

**Given** the data-integrity CI workflow
**When** a PR introduces a migration fiche that fails any FR80 check
**Then** the merge is blocked (FR32 extension)

- **FR81:** Users can read a narrative text equivalent of every migration — a chronological account carrying the same information as the map and scrubber (period, phases, peoples, debate status, sources) — as a first-class surface, not a fallback

**Given** the atlas page's **Récit** tab
**When** rendered server-side with JavaScript disabled
**Then** the complete chronological account of every migration is readable: name, period, phases in order, peoples involved, classification status, and source references

**Given** any fact visible on the map surface (path endpoints described as regions, period, peoples, debate status)
**When** the narrative for that event is read
**Then** the same information is present in prose — no information exists only in the dataviz

**Given** a dated claim in the narrative
**When** rendered
**Then** it ends with a `ConfidenceChip` (one per paragraph, UX-DR50) opening the same source chain as the map surface

- **FR82:** Users can navigate from a migration event to the fiche of every people involved, and filter the atlas to migrations involving a given people

**Given** the detail sheet or narrative of an event
**When** the reader activates a people link
**Then** navigation goes to `/fr/peuples/{slug}` and the browser back button returns to the atlas with the prior selection and scrubber position restored (URL reflects state, UX-DR29)

**Given** the atlas URL carries `?peuple=PPL_X`
**When** the page loads
**Then** the list and map show only events whose `peoplesInvolved` includes `PPL_X`, with the active filter shown as a dismissible chip (UX-DR32)

- **FR83:** Third-party integrators can read migration events via documented `/v2/migrations` endpoints returning the standard envelope with attribution and confidence metadata

**Given** `GET /api/v2/migrations?from=-2000&to=500&eventType=expansion`
**When** the request succeeds
**Then** the response is `{ data, meta, errors }` per AR8 with `meta.license = "CC-BY-SA-4.0"` and events filtered to those intersecting the year range

**Given** `GET /api/v2/migrations/{id}`
**When** the event exists
**Then** the payload includes geometry (GeoJSON), time range, peoples (id + autonym + slug), classification status, narrative, sources, and `meta.confidence` from `confidence_scores`; an unknown id returns `404 NOT_FOUND` per AR9

**Given** the OpenAPI spec at `src/lib/api/openapiV2.ts`
**When** the endpoints ship
**Then** the spec documents both paths, all parameters, response schemas, and error codes in the same PR (NFR38), and the OpenAPI-diff CI gate passes

- **FR84:** Users relying on assistive technology can operate the complete atlas — time scrubbing included — via keyboard and screen reader; no animation autoplays and all motion respects `prefers-reduced-motion`

**Given** keyboard-only navigation
**When** the scrubber has focus
**Then** Left/Right arrows step one year-unit, PageUp/PageDown step one era-unit, Home/End jump to corpus bounds, and each change is announced via `aria-valuetext` in French ("500 av. J.-C.")

**Given** a screen reader on the atlas
**When** the scrubber value changes
**Then** an `aria-live="polite"` region announces the year and the count of active migrations ("3 migrations actives vers 500 av. J.-C.")

**Given** `prefers-reduced-motion: reduce`
**When** an event is selected or the scrubber moves
**Then** state changes apply with opacity-only transitions ≤ 0.01 ms per UX-DR4; no autoplay control exists at MVP, so no animation ever plays unattended

## Data Model & Sourcing

### AFRIK dependencies

- `peoplesInvolved` entries reference existing `PPL_*` identifiers — validated against `dataset/source/afrik/peuples/**` (source of truth) and `afrik_peoples` (DB). No new people data is created by this module.
- Migration fiches live in a **new dataset type**: `dataset/source/afrik/migrations/MGR_*.json`, following a **new strict model** `public/modele-migration.json`. Creating the strict model and extending `scripts/validateAfrikData.ts` are explicit blocking stories (12.1) — no corpus authoring before the model and validator exist.

### Strict model `public/modele-migration.json` (sketch — final shape fixed in Story 12.1)

```jsonc
{
  "_meta": {
    "format": "AFRIK JSON v2",
    "entity": "migration",
    "directives": [
      "Never invent dates, paths, or peoples — every claim cites a Tier 1/2 source or is dropped",
      "classificationStatus is mandatory; contested events cite >= 2 sources",
      "Years are astronomical integers: negative = BCE (e.g. -1500), positive = CE",
      "Geometry is schematic (corridor-level), never a claim of precise historical borders",
    ],
  },
  "id": "MGR_<UPPER_SNAKE>",
  "nameMain": "…",
  "migrationGroup": "<slug clustering phases of one macro-migration, optional>",
  "eventType": "expansion | trade_route | forced_displacement | pastoral_movement", // open enum — MVP launch set, extended by Epic 13 per the Extension contract
  "classificationStatus": "consensual | contested | colonial-legacy | reconstructive",
  "timeRange": {
    "startYear": 0,
    "endYear": 0,
    "datingNote": "required when contested",
  },
  "geometry": {
    "type": "LineString | MultiLineString | Polygon",
    "coordinates": [],
  },
  "peoplesInvolved": [
    { "id": "PPL_…", "role": "origin | in-movement | destination-formed" },
  ],
  "content": {
    "summary": "…",
    "narrative": "chronological prose, FR, one sourced claim per paragraph",
    "debate": "required when classificationStatus != consensual",
    "sources": [
      { "title": "…", "url": "…", "year": 0, "tier": 1, "notes": "" },
      {
        "title": "…",
        "url": "…",
        "year": 0,
        "tier": 2,
        "notes": "Wikipedia path: EN+FR cross-checked, primary source cited directly",
      },
    ],
  },
}
```

Phases of a macro-migration (e.g. the Bantu expansion) are modeled as **one event per phase** sharing a `migrationGroup` slug — no phase sub-table (KISS; revisit only if a corpus need proves it insufficient).

### Source Tier policy application

- **Tier 1/2 only, "source or drop":** every dated claim, path segment, and people attribution in a migration fiche must cite Tier 1 (UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA) or Tier 2 (primary source surfaced via ≥ 2 Wikipedia language versions, primary source cited directly, path recorded in `notes`). Wikipedia articles, blogs, and AI-generated syntheses are forbidden as `sources` entries.
- Migration dating is contested territory by nature: peer-reviewed archaeology/linguistics papers and academic-press syntheses located via the Tier 2 procedure are the expected backbone. Where scholarship disagrees, the fiche records the disagreement (`classificationStatus: "contested"` + `debate` + `datingNote`) instead of picking a winner.
- Candidate pilot subjects — Bantu expansion phases, one major trade route _(illustrative, not data — every date, path, and people list is established from Tier 1/2 sources during Story 12.2, never copied from this spec)_.

### New Supabase tables + migration sketch

One migration, numbered placeholder (`0XX` = next free number at implementation time), idempotent, **applied manually by a human** via `supabase db push` per AR45.

The `'migration'` entity-type value needs **zero DDL**: the Module 0 fabric stores `entity_type` as **TEXT** (`009_module_zero_fabric.sql` — `assertions`, `flags`, `revisions`, `audit_log`; there is no `entity_type` Postgres enum), so `'migration'` is a new accepted value, not a schema change. Acceptance is code-level — extend the fabric Zod entity-type unions and audit `recompute_confidence` for hard-coded entity-type lists, with a failing test first (mirrors Epic 11 Story 11.2; handled in Story 12.3).

```sql
-- 0XX_migration_events.sql
DO $$ BEGIN
  CREATE TYPE migration_event_type AS ENUM
    ('expansion', 'trade_route', 'forced_displacement', 'pastoral_movement');
  -- Epic 13 extends this enum via ALTER TYPE ... ADD VALUE in its own
  -- migration file (ADD VALUE cannot run in the same transaction as
  -- statements referencing the new value); do not model event families
  -- as separate tables.
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS migration_events (
  id                    text PRIMARY KEY CHECK (id ~ '^MGR_[A-Z0-9_]+$'),
  slug                  text UNIQUE NOT NULL,
  name                  text NOT NULL,
  migration_group       text,
  event_type            migration_event_type NOT NULL,
  classification_status classification_status NOT NULL,
  time_start_year       int NOT NULL,
  time_end_year         int NOT NULL CHECK (time_end_year >= time_start_year),
  dating_note           text,
  geometry_geojson      jsonb NOT NULL,
  summary               text NOT NULL,
  narrative             text NOT NULL,
  debate                text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS migration_event_peoples (
  migration_id text NOT NULL REFERENCES migration_events(id) ON DELETE CASCADE,
  people_id    text NOT NULL REFERENCES afrik_peoples(id),
  role         text,
  PRIMARY KEY (migration_id, people_id)
);

CREATE INDEX IF NOT EXISTS idx_migration_events_time
  ON migration_events (time_start_year, time_end_year);
CREATE INDEX IF NOT EXISTS idx_migration_event_peoples_people
  ON migration_event_peoples (people_id);

-- RLS mirrors AR6: read public, write role-gated (moderator/admin).
```

Sourcing and confidence ride the **existing** Module 0 fabric: the loader writes `sources` + `assertions` rows with `entity_type = 'migration'`, and seeds `confidence_scores` per event; `recompute_confidence('migration', id)` reuses the existing function (audited in Story 12.3 for hard-coded entity-type lists).

### FR80 integrity rules (validator extension, FR28-style)

| Rule                                                                                                                                                                                                  | Severity                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `id` matches `^MGR_[A-Z0-9_]+$` and is unique across the corpus                                                                                                                                       | error                                                                 |
| `classificationStatus` present and in the AR32 enum                                                                                                                                                   | error                                                                 |
| `eventType` present and among the values enumerated in `modele-migration.json` (open enum — the validator reads the allowed set from the model file, never a duplicated list; see Extension contract) | error                                                                 |
| `startYear <= endYear`, both integers within [-10000, current year]                                                                                                                                   | error                                                                 |
| `contested` / `colonial-legacy` events cite ≥ 2 sources (AR32 parity)                                                                                                                                 | error                                                                 |
| `contested` events carry non-empty `datingNote` and `content.debate`                                                                                                                                  | error                                                                 |
| Every `sources` entry records `tier: 1` or `tier: 2`; Tier 2 entries carry non-empty `notes`                                                                                                          | error                                                                 |
| Every `peoplesInvolved.id` resolves to an existing PPL fiche                                                                                                                                          | error                                                                 |
| `geometry` is a valid GeoJSON LineString / MultiLineString / Polygon                                                                                                                                  | error                                                                 |
| Geometry coordinates outside a generous Africa + maritime-margin bbox (lon [-30, 80], lat [-40, 40])                                                                                                  | warning (ocean trade routes legitimately extend beyond the continent) |
| JSON keys exactly match `modele-migration.json` — no skipped, renamed, or invented sections                                                                                                           | error                                                                 |

Note: key-matching constrains **structure**, not enum values — extending the `eventType` value set per the Extension contract requires no change to this rule, and `MGR_*` ids remain valid for extended-type events.

### Extension contract (consumed by Epic 13)

Epic 12's foundation is extended — never forked — by Epic 13. The seams are explicit and stable:

- **`eventType` is an open enum.** The four MVP values are the launch set, not a closed list. Adding an event type (e.g. Epic 13's `fragmentation`, `displacement`, `imposed_name`, `resistance`) is one documented procedure landed in a single PR: (1) extend the `eventType` enum in `public/modele-migration.json` — the single source of truth; (2) `validateAfrikData.ts` needs no logic change, since its migration pass reads the allowed `eventType` values from the model file; (3) extend the shared TS union exported from `src/lib/afrik/migrationEventTypes.ts` (created in Story 12.1); (4) `ALTER TYPE migration_event_type ADD VALUE IF NOT EXISTS …` in its own migration file (the ADD VALUE transaction constraint); (5) extend the `eventType` filter enum in `src/lib/api/openapiV2.ts` — additive, non-breaking within `/v2`. A lockstep unit test asserts model enum = TS union = OpenAPI filter enum, so a partial extension fails CI.
- **Identifier & dataset namespace.** Extended-type events are authored in the same fiche format: `MGR_*` ids, `_meta.entity: "migration"`, stored under `dataset/source/afrik/migrations/` — the FR80 id regex and key-matching rules accept them unchanged. The `migration` branding thereby doubles as the generic spatio-temporal event namespace; the tradeoff (naming accuracy for non-migration events vs. the cost of a foundation-wide rename) is recorded in Open Question 6 for PO decision before the schema and API path freeze.
- **Basemap layer slot.** `AfricaBasemap` renders `children` inside its projected SVG coordinate space, and `projectLonLat` (`src/lib/atlas/projection.ts`) is the exported public projection API. Epic 13 layers (e.g. `ColonialBorderOverlay`) render as basemap children and project their own geometry via `projectLonLat`; the props and viewport coordinate system are stable interfaces.
- **Timeline marker slot.** `TimeScrubber` ships at MVP **without** a marker slot — a decision, not an omission. Epic 13 adds an optional `markers?` prop as an additive, non-breaking change: markers render as focusable elements in DOM order adjacent to the track, never inside the `role="slider"` element, leaving the MVP keyboard model untouched.

## API Surface

New endpoints follow the 3-layer pattern exactly (route = parsing/CORS/caching · handler = business logic · service = Supabase queries). The migration corpus is curated, human-published reference data → cache `s-maxage=86400, immutable` per AR18's stable-reference class.

| Path                      | Method | Purpose                                                                                                                             | Cache                       |
| ------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `/api/v2/migrations`      | GET    | List events; filters `from`, `to` (years, intersect semantics), `eventType`, `peopleId`, `classificationStatus`, `group`; paginated | `s-maxage=86400, immutable` |
| `/api/v2/migrations/{id}` | GET    | Event detail: geometry, time range, peoples (id + autonym + exonym + slug), sources, narrative, debate; `meta.confidence` populated | `s-maxage=86400, immutable` |

**Files (3-layer):**

- `src/app/api/v2/migrations/route.ts` and `src/app/api/v2/migrations/[id]/route.ts`
- `src/api/v2/handlers/migrations.ts`
- `src/api/v2/services/migrations.ts` — camelCase mapping happens here; no snake_case leaks past services (N3). Peoples joined via one batched query following the `getCountryRelationsMap()` pattern (AR17 — no N+1 per event).
- `src/api/v2/schemas/migrations.ts` — Zod schemas for query/route params, validated **in the route layer** before the handler runs; never inline `z.object({...})` in route files.

**Envelope & errors:** `createApiResponse` / `createApiError` only (AR8); error taxonomy AR9 (`VALIDATION_ERROR` 400 for malformed years, `NOT_FOUND` 404 for unknown id, `SEMANTIC_ERROR` 422 for `peopleId` not in catalog). Dates as ISO strings; years as plain integers (negative = BCE), documented in OpenAPI.

**OpenAPI (mandatory):** `src/lib/api/openapiV2.ts` updated in the same PR as the routes — paths, params, schemas (`MigrationEvent`, `MigrationEventSummary`, `GeoJSONGeometry`), error responses. The OpenAPI-diff CI gate must pass; additions are non-breaking within `/v2`.

## UX & Components

Visual specification is deliberately minimal (tokens + shadcn primitives); functional a11y is maximal. Visual polish is deferred to the designer-led redesign phase.

### New L3 components

Shared foundation (owned by Epic 12, consumed by Epic 13) lives in `src/components/system/`; module-specific composition lives in `src/components/migrations/`.

| Component              | Location      | Props sketch                                                                                                                         | Notes                                                                                                                                                                                                                    |
| ---------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AfricaBasemap`        | `system/`     | `{ children?: ReactNode; ariaHidden?: boolean; className? }`                                                                         | Inline SVG, equirectangular projection, committed geometry asset; renders land/borders from `--afh-*` tokens; `aria-hidden="true"` by default (list + narrative are the accessible surface)                              |
| `TimeScrubber`         | `system/`     | `{ min: number; max: number; value: number; onChange(y): void; step?: number; eraStep?: number; formatYear?(y): string; disabled? }` | ARIA slider; French era formatting via `formatYearFr` (`"500 av. J.-C."`); 44×44 px thumb target                                                                                                                         |
| `MigrationPathLayer`   | `migrations/` | `{ events: MigrationGeometry[]; selectedId?: string; activeIds: string[]; onSelect(id): void }`                                      | Projects GeoJSON via `projectLonLat`; selected = wider stroke + label, active/dim via opacity                                                                                                                            |
| `MigrationEventCard`   | `migrations/` | `{ event: MigrationSummary; active: boolean; selected: boolean; onSelect(id): void }`                                                | List card: name (Fraunces), period, peoples count, `ClassificationBadge`, `ConfidenceChip` inline                                                                                                                        |
| `MigrationDetailSheet` | `migrations/` | `{ event: MigrationDetail; open: boolean; onClose(): void }`                                                                         | shadcn Sheet: bottom sheet < 720 px, side sheet ≥ 720 px; contains period, `ClassificationBadge`, peoples via `AutonymExonymHeading`, chips opening `SourceChainSheet`; focus-trapped, Esc/swipe/scrim dismiss (UX-DR30) |
| `MigrationNarrative`   | `migrations/` | `{ events: MigrationDetail[] }`                                                                                                      | SSR chronological prose, one `ConfidenceChip` per paragraph (UX-DR50); the text-first equivalent                                                                                                                         |
| `MigrationsAtlasView`  | `migrations/` | `{ initialData: MigrationsPageData }`                                                                                                | Orchestrator: Tabs "Carte" / "Récit", basemap + scrubber + list + sheet wiring; URL state (`?annee=`, `?migration=`, `?peuple=`)                                                                                         |

Supporting lib: `src/lib/atlas/projection.ts` (`projectLonLat`, hand-rolled linear equirectangular math — no dependency), `src/lib/atlas/formatYearFr.ts`, `src/lib/migrationDataTransformer.ts` (mirrors `countryDataTransformer` precedent: `transformMigrationData(raw) → MigrationsPageData`).

### Tokens & type

- New tokens alias existing palette — no new raw hex inside components: `--afh-atlas-land: var(--afh-bg-warm)` · `--afh-atlas-border: var(--afh-border)` · `--afh-atlas-water: var(--afh-bg)` · `--afh-atlas-path: var(--afh-earth)` · `--afh-atlas-path-active: var(--afh-terracotta)` · `--afh-atlas-path-selected: var(--afh-gold)`. Red is never used on the map (UX-DR3).
- Type roles: Fraunces for event names and the large period display; Nunito Sans for scrubber values, labels, cards, sheet body. Peoples names always via `AutonymExonymHeading` with `lang` attributes (UX-DR38).

### Layout (mobile-first 430 → 720 → 800)

- **< 720 px (canonical 430, works at 320):** vertical stack — page title, Tabs, basemap (full-width, fixed aspect ratio with reserved space → CLS 0), scrubber directly under the map (thumb-reachable), event list; selection opens bottom sheet. No horizontal scroll.
- **≥ 720 px:** map + scrubber left, event list right; sheet becomes side sheet.
- **≥ 800 px:** content capped at the reading-surface max-width; narrative column keeps 65–75 ch line length (UX-DR2).

### Storybook (`@storybook/react-vite`)

Every new component ships a story at 430 / 720 / 800 px with axe-core checks (AR40, NFR37): `TimeScrubber` (default, era bounds, reduced-motion, disabled), `AfricaBasemap` (bare, with paths), `MigrationEventCard` (active/dimmed/selected/contested), `MigrationDetailSheet`, `MigrationNarrative`. Stories use fixture data clearly marked as fixtures — never invented "real" migration values presented as facts.

## Accessibility (WCAG 2.1 AA)

Accessibility is functional scope: the text-first equivalent ships in the same story wave as the dataviz (Story 12.8 is a hard release-gate for Story 12.9), not after.

**TimeScrubber (interactive surface #1)**

- _Keyboard:_ focusable via Tab; Left/Right ± one step; PageUp/PageDown ± one era step; Home/End to corpus bounds; no key trap.
- _Screen reader:_ `role="slider"`, `aria-label="Année"`, `aria-valuemin/max/now`, `aria-valuetext` in French era form ("1500 av. J.-C."); on change, an `aria-live="polite"` region announces "N migrations actives vers {année}".
- _Focus:_ 2–3 px `--afh-gold` outline, never clipped (UX-DR37).

**Map (SVG)**

- The map is `aria-hidden="true"`: every event it shows is reachable as a real `<button>` in the event list, and every fact it encodes exists in the narrative. This is a deliberate decision — keyboard-navigating SVG paths is fragile; the list is the canonical accessible control, and map paths are a pointer-only redundant affordance. Selection made by pointer on the map is mirrored in the list (`aria-pressed`) and announced politely.

**Event list & detail sheet**

- List items are buttons with accessible names carrying name + period + status ("Expansion bantoue, phase 1 — v. 1500 av. J.-C. — débat scientifique en cours"). The sheet follows UX-DR30/36: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on the event name, focus trap, return-focus-on-close, Esc / swipe-down / scrim-tap / hardware-back dismiss, history entry so Android back closes the sheet before the page.

**Text-first equivalent (first-class deliverable)**

- The **Récit** tab is a fully server-rendered chronological account per migration carrying the same data as the map + scrubber: period, phases in order, peoples (endonym-first, linked), classification status with explanation, and per-paragraph `ConfidenceChip`s. Both tab panels are in the DOM server-side; the tab toggles visibility only. With JS disabled the narrative is complete and the source links degrade to plain anchors (UX-DR47).

**Reduced motion**

- No autoplay exists at MVP (no "play" button — the scrubber is manual only), so no animation ever runs unattended. Under `prefers-reduced-motion: reduce`, path active/selected transitions and sheet slides resolve to opacity-only ≤ 0.01 ms (UX-DR4). No parallax, no scroll-triggered animation.

**CI gate hookup**

- axe-core runs on every new Storybook story (zero serious/critical) and the Playwright a11y workflow (`a11y.yml`) adds `/fr/migrations` (both tabs, sheet open state) to its route set. A keyboard-only journey test (scrub → select → open sources → close) lands with Story 12.10.

## Performance

**Gate:** Lighthouse mobile ≥ 85 on `/fr/migrations`, added to the Lighthouse CI reference routes.

**Map stack decision (the load-bearing choice):**

| Option                                                                             | Bundle cost                                          | Fit                                                                                                                                                               |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Static optimized SVG basemap + hand-rolled equirectangular projection (chosen)** | ~25–40 KB gzipped SVG asset, 0 KB runtime dependency | A fixed single-continent view with schematic corridor overlays needs no tiles, no pan/zoom, no WebGL. Projection is 20 lines of linear math, unit-tested. KISS.   |
| MapLibre GL JS                                                                     | ~215 KB gzipped + worker + style + tile fetches      | Real cartography power the module does not need at MVP; would consume most of the Lighthouse budget on a 4G profile and add a native-WebGL a11y burden. Rejected. |
| react-simple-maps / d3-geo runtime                                                 | ~30–70 KB gzipped                                    | Buys arbitrary projections we don't need (equirectangular is enough for a schematic atlas); another dependency to audit. Rejected.                                |

The basemap SVG is generated **once** from Natural Earth 1:50m admin-0 data (public domain) with an external one-off tool run (e.g. `npx mapshaper`, not added to `package.json`), simplified, and committed as an asset. Generation steps are documented next to the asset so it is reproducible. **Net new dependencies: zero (runtime and package.json).**

**Budget strategy:**

- SSR-first: the page title, tabs, and narrative are server-rendered — LCP is text, not the map. The basemap renders server-side as inline SVG (server component); only the scrubber, path layer, and sheet hydrate (`"use client"` islands).
- `MigrationDetailSheet` and `SourceChainSheet` are lazy-loaded (dynamic import), mirroring the ≤ 8 KB sheet budget discipline of UX-DR10.
- Geometry payload discipline: list endpoint returns summaries without geometry; geometry arrives per-event on selection (or inlined for the pilot corpus while it stays small — measured, with the split ready). Corpus responses are edge-cached 24 h.
- Fixed aspect-ratio container reserves map space → CLS ≤ 0.1; scrubber interaction INP ≤ 200 ms (pure state + CSS class flips, no layout thrash).

## Test Plan (TDD)

TDD is mandatory: each story lists its failing test file(s), written first (Red → Green → Refactor). Placement per project conventions:

| Area                         | Test files                                                                                                                                                                                                                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validator (FR80)             | `scripts/__tests__/validateMigrationEvents.test.ts`                                                                                                                                                                                                                                                                   |
| Loader                       | `src/lib/afrik/loaders/__tests__/migrationJsonLoader.test.ts` (real fixture files, not deep Supabase mocks — known mock-bug hotspot)                                                                                                                                                                                  |
| Projection + year formatting | `src/lib/atlas/__tests__/projection.test.ts`, `src/lib/atlas/__tests__/formatYearFr.test.ts`                                                                                                                                                                                                                          |
| Transformer                  | `src/lib/__tests__/migrationDataTransformer.test.ts`                                                                                                                                                                                                                                                                  |
| Service / handler            | `src/api/v2/services/__tests__/migrations.test.ts`, `src/api/v2/handlers/__tests__/migrations.test.ts`                                                                                                                                                                                                                |
| API routes                   | `src/app/api/v2/__tests__/migrations.test.ts`                                                                                                                                                                                                                                                                         |
| Components                   | co-located `*.test.tsx` beside each component (`TimeScrubber.test.tsx`, `MigrationEventCard.test.tsx`, `MigrationDetailSheet.test.tsx`, `MigrationNarrative.test.tsx`, `MigrationsAtlasView.test.tsx`) — behavior through the public interface: keyboard events, ARIA attributes, announcements — no internals poking |
| A11y/CI                      | axe-core story checks + Playwright keyboard-journey spec added to `a11y.yml` route set                                                                                                                                                                                                                                |

`make check` green (no NEW failures vs the known pre-existing set) before any story is declared done.

## Epic 12 Definition

### Epic 12: African Migrations Timeline — Spatio-Temporal Atlas (Module #6)

Readers watch peoples move across Africa through time on a map + time-scrubber atlas whose every event is sourced, confidence-scored, and honest about scholarly debate — with a narrative text equivalent carrying identical information, fully operable by keyboard and screen reader.

**FRs covered:** FR78, FR79, FR80, FR81, FR82, FR83, FR84

**Key deliverables:** `public/modele-migration.json` strict model + `validateAfrikData.ts` FR80 extension · sourced pilot corpus under `dataset/source/afrik/migrations/` (Tier 1/2 only) · `migration_events` + `migration_event_peoples` tables + fabric acceptance of `entity_type = 'migration'` (TEXT column — code-level Zod-union extension, no DDL) · `migrationJsonLoader` + migrate-script integration · `/v2/migrations` endpoints (3-layer + Zod + OpenAPI) · `AfricaBasemap` + `TimeScrubber` shared L3 foundation (consumed by Epic 13) · `/fr/migrations` atlas page with Carte/Récit tabs · `MigrationNarrative` text-first equivalent · a11y hardening + axe/Lighthouse CI route additions.

**Depends on:** Epic 0 (CI gates, migrations runbook), Epic 1 (Module 0 fabric + `ConfidenceChip`/`ClassificationBadge`/`SourceChainSheet`), Epic 2 (`AutonymExonymHeading`, reading-surface conventions), Epic 11 (build-order predecessor — data stories 12.1/12.2 may start early in parallel)
**Enables:** Epic 13 (extends the event model with new event types; reuses `AfricaBasemap` + `TimeScrubber`)

## Stories

### Story 12.1: Strict model `modele-migration.json` + validator extension (BLOCKING — data foundation)

**As a** data curator,
**I want** a strict AFRIK model for migration fiches and validator rules enforcing it,
**So that** no migration data can enter the corpus without mandatory classification status, coherent dating, valid geometry, and Tier 1/2 sources (FR80, AR44).

**Acceptance Criteria:**

**Given** `public/modele-migration.json` does not exist
**When** I create it per the Data Model sketch (`_meta`, `id`, `nameMain`, `migrationGroup`, `eventType`, `classificationStatus`, `timeRange`, `geometry`, `peoplesInvolved`, `content` with `summary`/`narrative`/`debate`/`sources`)
**Then** the model's `_meta.directives` encode the never-invent-data, two-sources-when-contested, and astronomical-year rules

**Given** the `eventType` field
**When** the model and validator land
**Then** `eventType` is an **open enum** whose allowed values live only in `public/modele-migration.json` (the validator reads the set from the model file — no duplicated list), and the shared TS union is exported from `src/lib/afrik/migrationEventTypes.ts` with a lockstep test asserting model enum = TS union, so Epic 13 extends the set per the Extension contract without validator logic changes

**Given** `scripts/validateAfrikData.ts`
**When** I extend it with a `validateMigrationEvents()` pass over `dataset/source/afrik/migrations/*.json`
**Then** every FR80 integrity rule from the Data Model section is enforced with the listed severities, following the existing `ValidationResult` shape and FR26–FR31 function style

**Given** a fixture fiche violating each rule (missing classification, contested with 1 source, `startYear > endYear`, unknown PPL id, invalid GeoJSON, missing `tier`)
**When** the test suite runs
**Then** each violation is reported as a distinct blocking error naming the fiche and field

**Given** the data-integrity CI workflow
**When** the validator gains the migration pass
**Then** migration-corpus regressions block merges exactly like FR26–FR30 regressions (FR32 parity)

**Technical notes:** Touches `public/modele-migration.json` (new), `src/lib/afrik/migrationEventTypes.ts` (new — shared event-type source of truth consumed by 12.3/12.5 and Epic 13's Story 13.1), `scripts/validateAfrikData.ts` (extend, scoped — do not refactor existing passes), `.github/workflows/` data-integrity job route only if a path filter needs the new folder. Test-first: `scripts/__tests__/validateMigrationEvents.test.ts` with fixture JSONs under the test folder. **Blocks 12.2 and everything downstream. May start before Epics 7–11 complete.**

---

### Story 12.2: Sourced pilot corpus — Bantu expansion phases + one trade route (BLOCKING — data acquisition)

**As a** reader,
**I want** a small, rigorously sourced pilot corpus of migration events,
**So that** the atlas launches with real, verifiable content instead of placeholders (FR80, Source Tier policy).

**Acceptance Criteria:**

**Given** the strict model and validator from Story 12.1
**When** the pilot corpus is authored under `dataset/source/afrik/migrations/MGR_*.json`
**Then** it covers the Bantu expansion as phased events sharing one `migrationGroup`, plus one major trade route _(subjects per module mandate; every date, path, people attribution, and narrative claim is established from Tier 1/2 sources during authoring — anything unsourceable is dropped, never estimated)_

**Given** any claim in a pilot fiche
**When** its sources are inspected
**Then** each `sources` entry records `tier: 1` or `tier: 2`, Tier 2 entries cite the primary source directly with the Wikipedia cross-check path in `notes`, and contested events carry ≥ 2 sources + `datingNote` + `debate`

**Given** the full pilot corpus
**When** `tsx scripts/validateAfrikData.ts` runs
**Then** zero migration errors are reported

**Given** every `peoplesInvolved` reference
**When** validated
**Then** it resolves to an existing PPL fiche (no new peoples invented for the corpus)

**Technical notes:** Touches `dataset/source/afrik/migrations/` (new folder) only. Use the `afrik-curator` skill workflow for sourcing discipline. Test = the validator suite from 12.1 running over the real corpus (add a corpus-level test asserting zero errors). **This is the long pole — start as early as possible, in parallel with Epics 7–11. Blocks 12.4 (loader needs real files) and content of 12.8/12.9.**

---

### Story 12.3: `migration_events` schema — Supabase migrations (schema story, lands alone)

**As a** backend engineer,
**I want** the spatio-temporal event tables in Supabase plus fabric acceptance of `entity_type = 'migration'`,
**So that** migration events persist with time, geometry, and peoples links, and plug into the Module 0 fabric without a competing sourcing model (FR80, AR2/AR6/AR45).

**Acceptance Criteria:**

**Given** the migrations folder `supabase/migrations/`
**When** I add `0XX_migration_events.sql` per the Data Model sketch (number = next free at implementation)
**Then** it is idempotent (`IF NOT EXISTS` / guarded `DO $$` blocks)

**Given** the Module 0 fabric (`assertions`, `confidence_scores`, `flags` with TEXT `entity_type` per `009_module_zero_fabric.sql` — no `entity_type` Postgres enum exists, so no DDL is needed)
**When** I audit fabric Zod schemas and `recompute_confidence` for hard-coded entity-type lists
**Then** `'migration'` is accepted end-to-end (schema unions extended where needed), with a failing test first covering the extended union (mirrors Epic 11 Story 11.2)

**Given** the `migration_events` table
**When** created
**Then** it enforces `id ~ '^MGR_[A-Z0-9_]+$'`, `time_end_year >= time_start_year`, non-null `classification_status` (reusing the AR32 enum), and carries the `(time_start_year, time_end_year)` index

**Given** `migration_event_peoples`
**When** created
**Then** it references `afrik_peoples(id)` (canonical English table name per migration 006) with a composite primary key

**Given** RLS
**When** enabled on both tables
**Then** reads are public and writes role-gated (moderator/admin), mirroring AR6

**Given** the migration file
**When** reviewed
**Then** it is applied **manually by a human** via `supabase db push` (AR45) — no story automation applies it

**Technical notes:** Touches `supabase/migrations/` plus fabric Zod schema files under `src/api/v2/schemas/` (additive union change only, mirroring Epic 11 Story 11.2). `migration_event_type` enum ships with the four MVP values; Epic 13 extends via `ALTER TYPE … ADD VALUE` in its own migration file per the Extension contract (transaction constraint documented in-file). Test-first: extend the corpus-level suite with a schema-shape assertion where feasible; primary verification is the human-applied migration + Story 12.4's loader tests against the schema. **Must land (and be applied) before 12.4; no other story may bundle schema changes.**

---

### Story 12.4: `migrationJsonLoader` + migrate-script integration

**As a** backend engineer,
**I want** a loader that reads `MGR_*.json` fiches into Supabase, wiring sources into the Module 0 fabric,
**So that** the corpus is queryable with confidence scores like every other entity (FR80, AR15/AR17).

**Acceptance Criteria:**

**Given** `src/lib/afrik/loaders/`
**When** I create `migrationJsonLoader.ts` mirroring the existing `{entity}JsonLoader` pattern
**Then** it upserts `migration_events` + `migration_event_peoples` rows from validated fiches, converting camelCase JSON to snake_case columns

**Given** a fiche's `content.sources` and dated claims
**When** loaded
**Then** `sources` and `assertions` rows are written with `entity_type = 'migration'` and a `confidence_scores` row is seeded per event (reusing the existing fabric — no new sourcing tables)

**Given** `tsx scripts/migrateAfrikToDatabase.ts`
**When** extended with the migrations pass
**Then** running it loads the pilot corpus end-to-end and re-running is idempotent (upsert semantics)

**Given** a fiche that fails Story 12.1 validation
**When** the loader encounters it
**Then** it refuses to load and reports via `@/lib/api/logger` — never `console.*`

**Technical notes:** Touches `src/lib/afrik/loaders/migrationJsonLoader.ts` (new), `scripts/migrateAfrikToDatabase.ts` (extend, scoped). Test-first: `src/lib/afrik/loaders/__tests__/migrationJsonLoader.test.ts` using real fixture fiches (prefer fixtures over Supabase deep mocks — known mock-bug hotspot; do not touch the 6 pre-existing migrate-test failures). Depends on 12.2 (files) + 12.3 (schema applied).

---

### Story 12.5: `/v2/migrations` API endpoints + OpenAPI

**As a** third-party integrator,
**I want** documented list and detail endpoints for migration events,
**So that** the open-data promise extends to the spatio-temporal corpus (FR83, AR8/AR9/AR10-style, NFR38).

**Acceptance Criteria:**

**Given** the 3-layer pattern
**When** I create `src/app/api/v2/migrations/route.ts`, `src/app/api/v2/migrations/[id]/route.ts`, `src/api/v2/handlers/migrations.ts`, `src/api/v2/services/migrations.ts`, `src/api/v2/schemas/migrations.ts`
**Then** routes validate `from`, `to`, `eventType`, `peopleId`, `classificationStatus`, `group`, pagination params via Zod in the route layer, and set `s-maxage=86400, immutable` caching + CORS from `src/lib/api/cors.ts`

**Given** `GET /api/v2/migrations?from=-2000&to=500`
**When** it executes
**Then** events whose `[startYear, endYear]` intersects the range return as summaries (no geometry) in the `{ data, meta, errors }` envelope with `meta.license = "CC-BY-SA-4.0"`

**Given** `GET /api/v2/migrations/{id}`
**When** the id exists
**Then** the detail payload includes GeoJSON geometry, time range, peoples (batched join — one query, AR17), sources, narrative, debate, and `meta.confidence`; unknown ids return `404 NOT_FOUND`; an unknown `peopleId` filter returns `422 SEMANTIC_ERROR`

**Given** `src/lib/api/openapiV2.ts`
**When** the endpoints ship
**Then** both paths + schemas + error codes are documented in the same PR and the OpenAPI-diff gate passes

**Technical notes:** camelCase mapping in the service only (N3). Test-first: `src/api/v2/services/__tests__/migrations.test.ts`, `src/api/v2/handlers/__tests__/migrations.test.ts`, `src/app/api/v2/__tests__/migrations.test.ts` covering happy path, filters, intersect semantics (event straddling the range boundary), 404/422, envelope shape. Depends on 12.3/12.4; independent of UI stories.

---

### Story 12.6: `AfricaBasemap` foundation — geometry asset + projection utility

**As a** frontend engineer,
**I want** a zero-dependency Africa basemap component with a tested projection utility,
**So that** Epic 12 and Epic 13 share one lightweight map foundation that protects the Lighthouse ≥ 85 mobile gate (FR78, performance decision).

**Acceptance Criteria:**

**Given** Natural Earth 1:50m admin-0 public-domain data
**When** the basemap asset is generated once via an external tool run (e.g. `npx mapshaper` — NOT added to `package.json`) in equirectangular projection, simplified and committed
**Then** the committed SVG asset is ≤ 40 KB gzipped and a README beside it documents the exact reproduction steps and the source data license

**Given** `src/lib/atlas/projection.ts`
**When** I implement `projectLonLat(lon, lat, viewport)` as pure linear equirectangular math (no d3-geo, no runtime dependency)
**Then** unit tests verify known reference points map to expected SVG coordinates and the function is consistent with the asset's projection

**Given** `src/components/system/AfricaBasemap.tsx`
**When** rendered as a server component
**Then** it emits inline SVG styled exclusively via `--afh-atlas-*` tokens (aliases of existing palette — no new raw hex), accepts `children` layers, defaults to `aria-hidden="true"`, and keeps a fixed aspect ratio (reserved space, CLS 0)

**Given** a Storybook story at 430 / 720 / 800 px
**When** axe-core runs
**Then** zero serious/critical violations

**Technical notes:** Touches `src/components/system/AfricaBasemap.tsx` (+ co-located `AfricaBasemap.test.tsx` + `.stories.tsx`), `src/lib/atlas/projection.ts`, asset + README, token aliases in the existing token sheet. Test-first: `src/lib/atlas/__tests__/projection.test.ts`. Decision record: static SVG chosen over MapLibre GL (~215 KB gz) and d3-geo wrappers — rationale in the Performance section. No dependency on data stories; can proceed in parallel with 12.3–12.5.

---

### Story 12.7: `TimeScrubber` L3 component (owned pattern, reused by Epic 13)

**As a** reader using touch, keyboard, or a screen reader,
**I want** a time scrubber that is a proper ARIA slider with French era announcements,
**So that** time travel works identically for every input modality (FR84, UX-DR36/37, NFR23).

**Acceptance Criteria:**

**Given** `src/components/system/TimeScrubber.tsx` with props `{ min, max, value, onChange, step?, eraStep?, formatYear? }`
**When** rendered
**Then** it exposes `role="slider"`, `aria-label="Année"`, `aria-valuemin/max/now`, and `aria-valuetext` from `formatYearFr` ("500 av. J.-C." / "1200")

**Given** keyboard focus on the thumb
**When** Left/Right, PageUp/PageDown, Home/End are pressed
**Then** value changes by `step`, `eraStep`, and to bounds respectively; focus ring is the 2–3 px `--afh-gold` outline; the thumb tap target is ≥ 44 × 44 px

**Given** `prefers-reduced-motion: reduce`
**When** the value changes
**Then** thumb and track updates apply without transition animation; the component ships **no autoplay affordance** (manual scrubbing only at MVP)

**Given** `src/lib/atlas/formatYearFr.ts`
**When** formatting negative and positive years
**Then** BCE years render "N av. J.-C.", CE years render the bare year, both unit-tested

**Given** Storybook stories at 430 / 720 / 800 px (default, at-bounds, reduced-motion, disabled)
**When** axe-core runs
**Then** zero serious/critical violations

**Technical notes:** Touches `src/components/system/TimeScrubber.tsx` (+ co-located `TimeScrubber.test.tsx`, `.stories.tsx`), `src/lib/atlas/formatYearFr.ts`. Test-first: `TimeScrubber.test.tsx` (keyboard events, ARIA attributes through the public interface) + `src/lib/atlas/__tests__/formatYearFr.test.ts`. Build on the shadcn/Radix Slider primitive — wrap, don't fork (UX-DR48: no business logic in the component). Independent of data stories.

---

### Story 12.8: Atlas page shell + `MigrationNarrative` text-first equivalent

**As a** reader on any device or assistive technology,
**I want** the `/fr/migrations` page with a complete chronological narrative of every migration,
**So that** the module's information is fully readable before (and independently of) the interactive map (FR81, FR82-part, FR78-part, UX-DR47).

**Acceptance Criteria:**

**Given** `src/lib/routing.ts` and `src/lib/translations.ts`
**When** I add the `migrations` page type with slug `migrations` (French UI strings: "Frise des migrations", "Carte", "Récit")
**Then** `/fr/migrations` resolves under `src/app/[lang]/` and the top-bar nav links to it

**Given** `src/lib/migrationDataTransformer.ts`
**When** `transformMigrationData(raw)` runs on API detail payloads
**Then** it returns typed `MigrationsPageData` (list + narrative + scrubber bounds derived from corpus min/max), never throws on missing optional fields, and is unit-tested

**Given** the page with Tabs "Carte" / "Récit" (both panels SSR-rendered; tab toggles visibility only; "Carte" panel may show a static placeholder until Story 12.9)
**When** rendered with JavaScript disabled
**Then** the **Récit** panel is complete: every event's name (Fraunces), French-formatted period, phases in `migrationGroup` order, peoples via `AutonymExonymHeading` linked to `/fr/peuples/{slug}`, `ClassificationBadge`, debate text when contested, and per-paragraph `ConfidenceChip`s degrading to "voir les sources" links

**Given** the URL `?peuple=PPL_X`
**When** the page loads
**Then** the narrative and list filter to that people with a dismissible filter chip (UX-DR32)

**Given** mobile 430 px (working at 320 px)
**When** rendered
**Then** no horizontal scroll; line length 65–75 ch; breakpoints escalate at 720 / 800 px

**Technical notes:** Touches `src/app/[lang]/` page + `src/lib/routing.ts` + `src/lib/translations.ts` (scoped additions), `src/lib/migrationDataTransformer.ts` (new), `src/components/migrations/MigrationNarrative.tsx`, `MigrationEventCard.tsx`, `MigrationsAtlasView.tsx` shell (+ co-located tests + stories). Test-first: `src/lib/__tests__/migrationDataTransformer.test.ts`, `MigrationNarrative.test.tsx`, `MigrationEventCard.test.tsx`. Depends on 12.5 (API) + 12.2 corpus. **Release gate: 12.9 cannot merge before this story — the text equivalent ships in the same wave as the dataviz, never after.**

---

### Story 12.9: Interactive map — `MigrationPathLayer`, scrubber wiring, `MigrationDetailSheet`

**As a** reader,
**I want** to scrub through time and select migration paths on the map, opening a detail sheet with sources,
**So that** I can watch peoples move and interrogate every claim (FR78, FR79, FR82, UX-DR10/30).

**Acceptance Criteria:**

**Given** `MigrationsAtlasView` composing `AfricaBasemap` + `TimeScrubber` + `MigrationPathLayer` + the event list
**When** the scrubber value changes
**Then** events whose range contains the year switch to active styling (token + opacity + list marker — never color alone) and the `aria-live` region announces "N migrations actives vers {année}"

**Given** an event selected via list button or pointer tap on its path
**When** selection applies
**Then** the path gains wider stroke + text label, the list item shows `aria-pressed="true"`, and `MigrationDetailSheet` opens (bottom sheet < 720 px, side sheet ≥ 720 px) with period, `ClassificationBadge`, `ConfidenceChip`, peoples via `AutonymExonymHeading` linked to their fiches, and chips opening the lazy-loaded `SourceChainSheet`

**Given** the sheet is open
**When** Esc / swipe-down / scrim-tap / Android hardware back fires
**Then** the sheet closes, focus returns to the triggering list button, and scroll position is preserved (UX-DR29/30)

**Given** the URL
**When** scrubber year or selection changes
**Then** `?annee=` and `?migration=` reflect state — any view is shareable and browser back restores the previous state

**Given** `prefers-reduced-motion: reduce`
**When** any state changes
**Then** transitions are opacity-only ≤ 0.01 ms; nothing animates unattended (no autoplay exists)

**Given** Lighthouse CI on `/fr/migrations` (mobile profile)
**When** the route is added to the reference set
**Then** Performance ≥ 85, CLS ≤ 0.1, INP ≤ 200 ms on scrub and select

**Technical notes:** Touches `src/components/migrations/MigrationPathLayer.tsx`, `MigrationDetailSheet.tsx`, completes `MigrationsAtlasView.tsx`; client islands only (`"use client"` on scrubber/layer/sheet — basemap and narrative stay server-rendered); dynamic-import the sheets; Lighthouse workflow route addition. Test-first: `MigrationPathLayer.test.tsx`, `MigrationDetailSheet.test.tsx`, `MigrationsAtlasView.test.tsx` (selection state, URL sync, announcements via public interface). Depends on 12.6, 12.7, **12.8 (hard gate)**.

---

### Story 12.10: A11y hardening + CI gates for the atlas

**As a** user of assistive technology,
**I want** the full atlas journey verified by automated and manual accessibility checks wired into CI,
**So that** keyboard and screen-reader operation is a permanent guarantee, not a launch-day state (FR84, NFR18–NFR23, UX-DR35/43).

**Acceptance Criteria:**

**Given** the Playwright a11y workflow (`a11y.yml`)
**When** `/fr/migrations` is added (both tabs + sheet-open state)
**Then** axe-core reports zero serious/critical violations and the job blocks merges

**Given** a Playwright keyboard-only journey spec
**When** it runs (Tab to scrubber → arrow-scrub → Tab to list → Enter opens sheet → Tab through sheet → chip opens SourceChainSheet → Esc twice returns focus to the list button)
**Then** every step passes with no keyboard trap and visible focus at each stop

**Given** 200 % text zoom at 430 / 720 / 800 px
**When** the atlas renders
**Then** no horizontal scroll on body and no clipped content (UX-DR39)

**Given** the manual pass checklist (UX-DR43)
**When** executed once before release
**Then** VoiceOver (iOS) + NVDA results on the scrub-select-sources journey are recorded in the PR, including French pronunciation of endonyms via `lang` attributes

**Given** color-blindness simulation (deuteranopia, protanopia, tritanopia)
**When** applied to the map
**Then** active vs dimmed vs selected states remain distinguishable (stroke width + label + opacity carry the signal)

**Technical notes:** Touches the a11y workflow config + a new Playwright spec; component fixes land in their own components' files as needed (scoped). Test-first by nature (the failing axe/keyboard specs are written before fixes). Depends on 12.9. Manual results recorded per UX-DR45 PR checklist.

## Out of Scope

- **Map pan/zoom, tiles, WebGL (MapLibre GL)** — the fixed-view static SVG is the MVP decision; revisit only if a Growth feature genuinely needs cartographic navigation.
- **Autoplay / animated playback of migrations** — no play button at MVP; manual scrubbing only. If ever added, it is a reduced-motion-gated Growth feature.
- **Epic 13 event types** (colonial fragmentation, imposed-name events, displacement under colonization) — Epic 13 extends `migration_event_type` and consumes the basemap/scrubber; nothing in Epic 12 anticipates its content beyond the seams specified in the Extension contract.
- **Pinned-version URLs (`@v{n}`) and revision history for migration fiches** — the polymorphic fabric makes this additive later; MVP ships assertions + confidence + flags only.
- **Migrations section on people fiches (reverse linkage surface)** — the atlas links out to fiches; embedding migration timelines into `PeopleDetailViewV2` is deferred pending PO confirmation.
- **Contribution types for migration fiches** (`new_migration` / `update_migration` enum values and moderation flows) — flagging assertions works day one through the Module 0 fabric; structured contribution proposals are Growth.
- **Corpus expansion beyond the pilot** (Nilo-Saharan, Cushitic, remaining trade networks) — follows the same model/validator/loader pipeline as ongoing editorial work, not engineering stories.
- **Multi-language surfaces** — French only (`Language = "fr"`); no locale switch is reintroduced.
- **Visual polish beyond tokens + shadcn** — deferred to the designer-led redesign phase; this epic ships functional, accessible, token-compliant UI.

## Open Questions

1. **Route slug:** `/fr/migrations` is assumed here; the vision brief says "Frise des migrations" — should the slug be `frise-migrations` instead? (Slug changes after launch cost SEO; decide before Story 12.8.)
2. **Default tab on mobile:** map-first (enthusiasm, the module's promise) or narrative-first (text-first posture, faster LCP on 4G)? Spec assumes map-first with narrative one tap away — PO to confirm.
3. **Basemap geographic extent:** trade routes (trans-Saharan termini, Indian Ocean, Atlantic) extend beyond continental Africa. Should the committed basemap include the Arabian peninsula, Madagascar's maritime context, and Atlantic/Indian ocean margins, or clip to the continent with routes fading at the edge? Affects the one-time asset generation in Story 12.6.
4. **Pilot trade route choice:** trans-Saharan vs Indian Ocean vs Atlantic for the pilot corpus — best decided by which has the strongest reachable Tier 1/2 source base during Story 12.2 discovery; PO to confirm the priority.
5. **Scrubber step granularity:** year-steps vs century-steps for `step`/`eraStep` depend on the pilot corpus's actual dating spread (millennia for Bantu phases vs centuries for trade routes). Decide once 12.2 data exists; the component takes both as props either way.
6. **Generic rename before Epic 13:** per the Extension contract, the `migration` branding (`MGR_*` ids, `_meta.entity: "migration"`, `migration_events`/`migration_event_type`, `/v2/migrations`, `dataset/source/afrik/migrations/`) doubles as the generic spatio-temporal event namespace once Epic 13 adds non-migration types (`resistance`, `imposed_name`) — semantically loose for readers of the dataset tree. Renaming the foundation generically (`historical_events` / `EVT_*` / `/v2/events`) is cheap before 12.3 freezes the schema and 12.5 freezes the public API path, and costly after — PO to decide before those stories start; Epic 13's Open Question 1 waits on this answer.
