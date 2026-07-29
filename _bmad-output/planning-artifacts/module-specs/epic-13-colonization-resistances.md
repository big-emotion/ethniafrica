# Epic 13 — Colonization & Resistances (Module #8)

**Pillar:** Gazes (« Les regards ») · **Module:** #8 — Colonisation & résistances
**Status:** Draft — PRD addendum (FR block FR85–FR90)

---

## Module Goal

Module #8 is the flagship of the Gazes pillar: it shows _how_ colonization fragmented African peoples across arbitrary borders (one people split over 2–4 countries), displaced them, and imposed names on them — and, symmetrically, how peoples resisted through revolts, kingdoms' resistance, and cultural persistence. It ships as a narrative reading surface plus map overlays: a colonial-border overlay compared against peoples' presence areas, imposed-name records in their colonial context, and displacement / resistance events on the shared timeline. The module deliberately owns **no data foundation of its own**: it derives the fragmentation view from existing AFRIK relations (`afrik_people_countries` + per-country demography), extends the spatio-temporal event model owned by Epic 12 with four new event types, and consumes the imposed-name records owned by Epic 8. Editorial sensitivity is maximal here — every narrative binds to the editorial doctrine (FR22–FR25): classification status on every claim, multi-perspective on contested framings, and exclusion from children-targeted audience surfaces (FR90 — enforced structurally; Epic 10 exports no audience mechanism). The fragmentation view is derivable from data already in production and ships early; event-based narratives ship once Epic 12's model and a sourced corpus exist.

## Fit & Dependencies

**Position in build order:** Epic 13 is the **last** epic in the module sequence `7 → 8 → 9 → 10 → 11 → 12 → 13`. Its data-acquisition stories (13.3, 13.4) are explicitly allowed to start early, in parallel with Epics 11–12, because sourcing colonial-border geometries and a doctrine-compliant event corpus is the long pole. Its fragmentation stories (13.5, 13.7) depend only on data already in production and may also land ahead of Epic 12 completion.

**Builds on (Module 0 fabric + platform socle):**

- **Epic 0/1 — Sources & Verification fabric:** `sources`, `assertions`, `confidence_scores` tables; `ConfidenceChip`, `ClassificationBadge`, `SourceChainSheet`, `DoctrineLinkCard` L3 components. Every factual claim rendered by this module carries a `ConfidenceChip`; every colonial framing carries a `ClassificationBadge`; every source chain opens in `SourceChainSheet`.
- **Epic 2 — Reading surface:** Carte-vivante-style scrollable section orchestration, `AutonymExonymHeading` (endonym-first, `lang` attributes), Direction D prose-with-inline-chips, reading-density tokens, breadcrumbs.
- **Epic 3 — Pinned versions:** module narratives are fiche-adjacent editorial content; where a narrative cites a people fiche it links the pinned version the claim was verified against (`@v{n}`), so classroom citations stay stable.

**Consumes (sibling shared infra — ownership respected, never duplicated):**

- **Epic 12 (OWNER — spatio-temporal event model + Africa basemap + timeline scrubber):** Epic 13 defines **no competing event model, no second map, no second timeline**. It extends Epic 12's `migration_event_type` enum with `fragmentation`, `displacement`, `imposed_name`, `resistance` (migration story 13.1), renders its overlay through Epic 12's basemap layer-slot API, and feeds its events to the shared timeline through an Epic-13-owned marker layer (`EventTimelineMarkers`, 13.12) composed beside Epic 12's `TimeScrubber` — whose ARIA-slider contract is not extended. If the basemap cannot host an extra GeoJSON layer, that gap is fixed **in Epic 12**, not by adding a map library here.
- **Epic 8 (OWNER — naming/etymology data model, incl. imposed-name records):** the imposed-names section (13.10) reads Epic 8's records read-only and links back to the Names Atlas. Epic 13 stores no name data.
- **Epic 10 (no shared mechanism):** Epic 10 owns nothing shared and exports no audience-rules API (`quiz_*` tables and `segmentPolicy.ts` are module-private). The FR90 children exclusion is therefore enforced Epic-13-locally (no children-facing surface ever links this module — nav-rule test) plus structurally on Epic 10's side (children quiz questions are generated only from allowlisted `afrik_*` field paths — QZ-4 CI audit).

**Owns for others:** nothing structural. Epic 13's only reusable outputs are (a) the four new event-type enum values (available to any future module querying Epic 12's events), (b) the colonial-borders GeoJSON dataset + its strict model (reusable by any map surface), and (c) the `GazeEventNarrativeSection` component pattern (narrative-over-events, reusable by future Gazes modules).

## User Journeys

**Journey A — Amina, 24, diaspora reader (mobile, 390 px, 4G).**
Amina reads the Ewe people fiche (illustrative) on her phone. Below the countries section she sees « Un peuple, 2 pays — voir la fragmentation coloniale ». One tap opens the fragmentation view: a plain-language sentence, then a table of the countries the people is present in with demographic shares, each row ending in a `ConfidenceChip`. She taps a chip, sees the source chain (Ethnologue entry, year, resolvable URL), and closes it. **Success moment:** she can answer "which border cut through this people, and how do we know?" in under a minute, without a map ever loading.

**Journey B — Kofi, 41, history teacher (tablet, 720 px).**
Kofi opens `/fr/regards/colonisation-et-resistances` to prepare a class. He scrolls the doctrine-bound intro, toggles « afficher les frontières coloniales » on the Africa basemap and sees the partition borders drawn over peoples' presence areas; below the map, the same information as a border-crossings table he can screen-share. He scrubs the timeline to the 1890s (illustrative decade) and filters « résistances » events; each event card carries a `ClassificationBadge` and sources. **Success moment:** he copies a pinned-version citation of a resistance narrative into his lesson plan.

**Journey C — Nadia, 30, contributor (mobile, 430 px).**
Nadia reads a displacement event narrative she believes is framed incompletely. The event card's `ClassificationBadge` reads « contesté » and expands into the multi-perspective view: two documented positions, each with its own sources. She still disagrees, taps « signaler cette assertion » inside the `SourceChainSheet`, and files a flag with a counter-source (Epic 4 flow). **Success moment:** she receives a public flag URL — disagreement produced a public artifact, not a dead end.

## Functional Requirements

- **FR85:** Visitors can see, for any people present in more than one country, a fragmentation view showing the countries that divide it, the demographic share per country, and which of those inter-country borders are documented as colonial-era impositions

  **Given** a people fiche whose `afrik_people_countries` relation lists ≥ 2 countries
  **When** the visitor opens the fragmentation view (from the fiche or the module page)
  **Then** it lists every country of presence with its demographic share (from `demography.distributionByCountry`, 2025 reference year), each share ending in a `ConfidenceChip` bound to its assertion

  **Given** the colonial-borders dataset (Story 13.3) documents the colonial origin of a border between two listed countries
  **When** the fragmentation view renders
  **Then** that border pair is annotated with its colonial origin and source; border pairs with no sourced colonial-origin record carry **no** colonial annotation (source or drop)

  **Given** a people present in exactly one country
  **When** its fiche renders
  **Then** no fragmentation section appears (no empty-state noise)

- **FR86:** Visitors can overlay documented colonial partition borders on the Africa basemap and compare them visually with peoples' presence areas

  **Given** the module page with the Epic 12 basemap rendered
  **When** the visitor activates « afficher les frontières coloniales »
  **Then** the sourced colonial-border layer draws over the basemap with a legend identifying the layer, its reference period, and its source (Tier 1/2)

  **Given** the overlay is active
  **When** the visitor consults the page without the map (screen reader, JS failure, data-saver)
  **Then** a border-crossings table presenting the same information (which borders, which peoples they cross, sources) is present in the document — not behind the toggle

- **FR87:** Visitors can view sourced displacement events (colonial-era forced displacements and deportations) for a people on the shared timeline and map, each with classification status and sources

  **Given** the event corpus contains events of type `displacement` linked to a people
  **When** the visitor filters the module timeline by « déplacements »
  **Then** each event renders with date (or date range), location, affected people (endonym-first via `AutonymExonymHeading`), `ClassificationBadge`, and a `ConfidenceChip` opening its source chain

  **Given** no sourced displacement event exists for a people
  **When** its narrative section renders
  **Then** the section states calmly that no documented event is recorded yet — it never fabricates or extrapolates content

- **FR88:** Visitors can see, within the colonization context, the names imposed on a people by colonial administrations — endonym presented first, imposed name explicitly marked, with an explanation of why it is problematic

  **Given** Epic 8 imposed-name records exist for a people
  **When** the imposed-names section renders
  **Then** each record shows the endonym first (Fraunces, `lang` attribute), the imposed name visually marked with the `--afh-colonial` token, the why-problematic explanation, and a link to the full Names Atlas record (Epic 8 surface)

  **Given** Epic 8 has no imposed-name record for a people
  **When** the section renders
  **Then** the people is omitted from the imposed-names index — Epic 13 never derives or invents name records

- **FR89:** Visitors can view sourced resistance events (revolts, kingdoms' resistance, cultural persistence) for a people, each with classification status and sources

  **Given** the event corpus contains events of type `resistance`
  **When** the resistance section renders
  **Then** events display as narrative cards in chronological order, each with `ClassificationBadge`, `ConfidenceChip`, and the actors named endonym-first

  **Given** a resistance event whose framing is contested between documented historiographies
  **When** its card renders
  **Then** the multi-perspective view (FR24 pattern) presents each documented position with its own sources — never a single synthesized verdict

- **FR90:** Every colonization & resistance narrative surface must display the classification status of each claim, present the multi-perspective view for contested framings, link the editorial-doctrine version in force, and be excluded from children-targeted audience surfaces

  **Given** any narrative section of the module
  **When** it renders a claim backed by the data model
  **Then** the claim carries a `ConfidenceChip` (source-attached rule UX-DR49 #2) and, when its classification is not `consensual`, a `ClassificationBadge` plus a `DoctrineLinkCard` in the section footer

  **Given** any children-facing surface (today: the Epic 10 quiz « enfants » segment; any future children-targeted index)
  **When** its navigation, indexes, and cross-links are built
  **Then** the module route and its event content are never linked or surfaced there — enforced by an Epic-13-owned nav-rule test (no children-facing surface references `/fr/regards/colonisation-et-resistances`) and by Epic 10's structural guarantee (children questions read only allowlisted `afrik_*` field paths, so event-derived content is unreachable; a QZ-4-style CI assertion verifies zero violations in the active bank)

  **Given** a narrative revision is published
  **When** the revision record is written
  **Then** it records the doctrine version in force (FR25 pattern), visible from the narrative's revision history

## Data Model & Sourcing

### AFRIK dependencies (existing, read-only)

| Source                                                                            | Used for                                                                                                          |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `afrik_people_countries` (people_id ↔ country_id)                                 | Which countries a people spans — the fragmentation skeleton                                                       |
| `afrik_peoples.content → demography.distributionByCountry`                        | Per-country demographic shares (2025 reference year, FR28-gated)                                                  |
| `afrik_peoples.content → appellations` (exonyms, originOfExonyms, whyProblematic) | Cross-links from fragmentation view to naming context (display only; canonical imposed-name records are Epic 8's) |
| `afrik_countries`                                                                 | Country names (fr), ISO 3166-1 alpha-3                                                                            |
| `migration_events` + `migration_event_peoples` (Epic 12)                          | Storage of all Epic 13 events — no new event table here                                                           |
| Epic 8 imposed-name tables (name per Epic 8 spec)                                 | Imposed-name records — read-only                                                                                  |

### New Supabase schema — enum extension only, no new table

Epic 13 creates **no new table**. Its single migration extends Epic 12's event-type enum:

```sql
-- supabase/migrations/0NN_colonization_event_types.sql
-- NN = next free number at implementation time (after Epic 12's migrations land).
-- Idempotent; applied by a human via `supabase db push` (AR45 runbook — no auto-migrate).
-- Enum type name per the Epic 12 spec: migration_event_type (created by Epic 12's schema migration).

ALTER TYPE migration_event_type ADD VALUE IF NOT EXISTS 'fragmentation';
ALTER TYPE migration_event_type ADD VALUE IF NOT EXISTS 'displacement';
ALTER TYPE migration_event_type ADD VALUE IF NOT EXISTS 'imposed_name';
ALTER TYPE migration_event_type ADD VALUE IF NOT EXISTS 'resistance';
```

### New dataset type 1 — colonial-border overlay (blocking stories 13.2 + 13.3)

A new dataset type requires, per project rule, a **strict model file + validator extension as explicit blocking stories**:

- **Strict model:** `public/modele-frontiere-coloniale.json` — metadata envelope for one border layer: `id`, `title_fr`, `reference_period` (ISO year range), `colonial_powers` (contextual, endonym-aware phrasing), `geometry_file` (relative path to GeoJSON), `simplification_note`, `sources[]` (each with `tier: 1 | 2`, Tier-2 entries recording the Wikipedia language versions cross-checked in `notes`), `license`.
- **Data location:** `dataset/source/afrik/geo/colonial_borders/{layer}.json` (metadata, strict model) + `{layer}.geojson` (geometry). Build step copies simplified geometry to `public/geo/colonial-borders/{layer}.geojson` for client consumption.
- **Sourcing:** Tier 1/2 only — candidate origins are academic historical-boundary datasets surfaced through UNESCO General History of Africa volumes or peer-reviewed historical-GIS publications (discovery via Wikipedia is allowed only to locate the primary dataset, per Source Tier policy). **If no Tier 1/2 boundary dataset with a compatible license is found, the overlay does not ship — the border-crossings table (FR85, derivable from `afrik_people_countries`) still does.** Source or drop, applied at the feature level.

### New dataset type 2 — colonization & resistance event corpus (blocking story 13.4)

Events are authored in **Epic 12's event fiche format** (`public/modele-migration.json`, `MGR_*` identifiers, `dataset/source/afrik/migrations/` — owned there; Epic 13 adds no second format), using the four new `eventType` values. Because the model's `eventType` enum is closed and Epic 12's FR80 validator hard-errors on values outside it, **Story 13.1 extends `public/modele-migration.json`'s `eventType` enum, the FR80 enum check, and the exported TS union in the same PR as the DB enum** — corpus authoring cannot start before that lands. Story 13.4 then extends `scripts/validateAfrikData.ts` with type-specific rules. Every event claim follows Source Tier policy; a people/place/date that cannot be cited at Tier 1/2 is dropped, never estimated. Example event subjects such as "Maji Maji uprising" or "Berlin Conference partition" appearing anywhere in stories or fixtures are **(illustrative, not data)** — the shipped corpus contains only what Story 13.4 sources.

### Integrity rules (FR28-style, enforced in `validateAfrikData.ts`)

| Rule    | Check                                                                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CR1** | Every colonial-border layer has ≥ 1 source with `tier: 1` or `tier: 2`; Tier-2 entries carry the Wikipedia-path audit trail in `notes`; geometry parses as valid GeoJSON (`FeatureCollection`, closed rings) |
| **CR2** | Every ISO 3166-1 alpha-3 code referenced by a border feature or event exists in `afrik_countries` (FR29 pattern)                                                                                             |
| **CR3** | Every event of type `imposed_name` references an existing Epic 8 imposed-name record id — Epic 13 stores no name payload of its own                                                                          |
| **CR4** | Every event of the four new types has a date or date range with `start ≤ end`, ≥ 1 Tier 1/2 source, and ≥ 2 sources when `classification_status ∈ {contested, colonial-legacy}` (AR32 pattern)               |
| **CR5** | Fragmentation derivation consumes only fiches passing the FR28 demographic gate; it introduces no new tolerance band of its own                                                                              |

These checks join the existing `data-integrity.yml` blocking CI gate (FR32 pattern).

## API Surface

All endpoints follow the 3-layer pattern (route → handler → service), the AR8 envelope `{ data, meta: { license, attribution, ... }, errors: [] }`, the AR9 error taxonomy, and Zod validation in the route layer (schemas under `src/api/v2/schemas/`). **Every route change updates `src/lib/api/openapiV2.ts` in the same PR** (NFR29/NFR38); the OpenAPI-diff CI gate must pass.

### New endpoint — `GET /api/v2/peoples/{id}/fragmentation`

- **Layers:** `src/app/api/v2/peoples/[id]/fragmentation/route.ts` → `src/api/v2/handlers/peopleFragmentation.ts` → `src/api/v2/services/peopleFragmentation.ts`
- **Params:** `id` (PPL identifier, Zod-validated). No pagination (bounded: a people spans ≤ ~4 countries).
- **Response `data` shape (schema, not data — country values illustrative):**

```jsonc
{
  "peopleId": "PPL_X",
  "autonym": "…",
  "exonym": "…",
  "countryCount": 2,
  "countries": [
    {
      "iso3": "GHA",
      "nameFr": "Ghana",
      "populationShare": 0.62,
      "assertionId": "…",
    },
  ],
  "borderPairs": [
    {
      "a": "GHA",
      "b": "TGO",
      "colonialOrigin": { "layerId": "…", "sourceIds": ["…"] },
    },
  ],
}
```

`colonialOrigin` is present **only** when the border dataset documents it (source or drop). `meta.confidence` carries the fiche-level confidence per AR8.

- **Cache:** `s-maxage=3600` (people-data class, AR18). **Errors:** `404 NOT_FOUND` (unknown PPL), `422 SEMANTIC_ERROR` (people present in < 2 countries — fragmentation undefined).
- **N+1 discipline:** shares and assertion ids resolved via one batched query per collection (`getCountryRelationsMap()` pattern, AR17).

### Additive extension — Epic 12's `GET /v2/migrations` endpoint

Epic 12 owns `GET /v2/migrations` (list, with an `eventType` filter) and `GET /v2/migrations/{id}`. Epic 13's change is **additive only** (NFR31): the `eventType` filter enum gains `fragmentation | displacement | imposed_name | resistance`; the `MigrationEvent` / `MigrationEventSummary` response schemas are untouched. The OpenAPI `eventType` enum is updated; no envelope change, so the OpenAPI-diff gate passes without an `api-breaking` trailer.

### Deliberately not an API endpoint — colonial-border geometry

The overlay GeoJSON is served as a **static versioned asset** at `public/geo/colonial-borders/{layer}.geojson` with license + attribution embedded in the file's `metadata` member. Rationale (KISS): geometry is immutable reference data consumed by one client component; a `/v2/geo/*` endpoint would add three layers, a spec section, and cache config for zero added capability — the static file is already open data. Revisit only if a third-party consumer requests negotiated access (Growth).

## UX & Components

Visual specification is deliberately minimal (tokens + shadcn primitives — visual polish deferred to the designer-led redesign phase); functional accessibility is maximal. All components live under `src/components/colonization/` (domain folder per UX-DR48; generic L3 primitives stay in `src/components/system/`). Breakpoints mobile-first **430 / 720 / 800** (project convention); design and review start at 320–430 px. Every component ships a Storybook story (`@storybook/react-vite`) at 430 / 720 / 800 px with axe-core checks.

| Component                   | Props sketch                                                                            | Notes                                                                                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FragmentationView`         | `{ fragmentation: PeopleFragmentation; variant: "fiche-section" \| "module-index" }`    | Semantic `<table>` of countries + shares; each row ends in a `ConfidenceChip`; heading via `AutonymExonymHeading` (endonym-first enforced)                                                                               |
| `ColonialBorderOverlay`     | `{ layer: ColonialBorderLayer; visible: boolean; onToggleAction: () => void }`          | Renders into Epic 12's basemap layer slot; stroke color `--afh-colonial` (muted brick — contextual marker, **never** alarm red per UX-DR3); toggle is a real `<button aria-pressed>`                                     |
| `BorderCrossingTable`       | `{ crossings: BorderCrossing[] }`                                                       | **Text-first equivalent of the overlay** — always in the DOM, not gated by the toggle                                                                                                                                    |
| `GazeEventNarrativeSection` | `{ eventType: "displacement" \| "resistance"; events: ColonialEvent[]; title: string }` | Narrative cards, Direction D prose-with-chips; `ClassificationBadge` + multi-perspective block when contested; `DoctrineLinkCard` in footer                                                                              |
| `ImposedNameList`           | `{ records: ImposedNameRecord[] }`                                                      | Type imported from Epic 8; endonym first (Fraunces 900 + `lang`), imposed name marked with `--afh-colonial` + explicit text label « nom imposé » (never color alone, UX-DR39)                                            |
| `EventChronologyTable`      | `{ events: ColonialEvent[] }`                                                           | **Text-first equivalent of the timeline** — chronological `<table>` with date, type, people, place, sources link                                                                                                         |
| `EventTimelineMarkers`      | `{ events: ColonialEvent[]; onOpenEventAction: (id: string) => void }`                  | Epic-13-owned marker layer composed **beside** Epic 12's `TimeScrubber` (whose ARIA-slider contract — `min/max/value/onChange` — is not extended); markers are real `<button>`s, focusable in DOM order                  |
| `ColonizationModulePage`    | orchestrator                                                                            | Scrollable sections (Carte vivante pattern): doctrine-bound intro → fragmentation index → map + overlay → imposed names → displacement → resistances → sources footer; data via `src/lib/colonizationDataTransformer.ts` |

**Tokens:** reuse the existing `--afh-colonial` / `--afh-colonial-bg` pair (already defined for colonial-context markers) plus standard `--afh-*` surface/type/space tokens. No new token unless the overlay stroke needs a dedicated alias (`--afh-colonial-border: var(--afh-colonial)`). No raw hex, no raw px in components.

**Type roles:** Fraunces — section headings, endonyms, quoted assertions; Nunito Sans — body, tables, chips, legend. Body line-height ≥ 1.6, prose line length 65–75 ch (UX-DR2).

**Copy (French UI, English code):** « Colonisation & résistances » · « Un peuple, N pays » · « afficher les frontières coloniales » · « nom imposé » · « déplacements forcés » · « résistances » · « voir les sources » · « signaler cette assertion ». Tone per UX-DR34 (librarian, not marketer; no alarm language).

## Accessibility (WCAG 2.1 AA)

Accessibility is functional scope: **the text-first equivalent of every dataviz ships in the same story as the dataviz**, is a first-class deliverable, and carries the full information — never a fallback stub.

**Map + colonial-border overlay (13.8):**

- _Keyboard:_ the toggle is a native `<button aria-pressed>`; the legend is a list of focusable items; no interaction requires pointer gestures on the map canvas itself — Epic 12's basemap is a fixed single-continent view with no pan/zoom (explicitly out of Epic 12's scope), so none is required here either.
- _Screen reader:_ the map region is `role="img"` with an `aria-label` summarizing the layer (« carte de l'Afrique avec superposition des frontières coloniales, période AAAA–AAAA »); the adjacent `BorderCrossingTable` is announced as the data table carrying the same information; toggling announces state via the button's `aria-pressed`.
- _Text-first equivalent:_ `BorderCrossingTable` — always rendered, source links included, same story wave.
- _Reduced motion:_ no animated border drawing; layer appears/disappears with an opacity crossfade that resolves to instant under `prefers-reduced-motion: reduce` (UX-DR4).

**Timeline events (13.12):**

- _Keyboard:_ the scrubber's keyboard model is Epic 12's `TimeScrubber` ARIA-slider contract, untouched; event markers are rendered by the Epic-13-owned `EventTimelineMarkers` layer and are focusable in DOM order; Enter/Space opens the event card; Esc returns focus to the marker.
- _Screen reader:_ each marker announces « événement {type}, {date}, {peuple} — Entrée pour ouvrir » (UX-DR41 pattern); the filter control announces the active type filter.
- _Text-first equivalent:_ `EventChronologyTable`, same story, full data (dates, types, peoples endonym-first, places, source-chain links).
- _Reduced motion:_ no auto-advance, no scroll-triggered animation — ever (UX-DR4).

**Fragmentation view + narrative sections (13.7, 13.10, 13.11):**

- Native semantic HTML: `<table>` with `<caption>` and `scope`d headers for shares; headings via `AutonymExonymHeading` (renders real `<h2>/<h3>`, `lang={iso-639-3}` so screen readers pronounce endonyms correctly, UX-DR38); chips and badges inherit their audited a11y contracts from Epic 1.
- Multi-perspective blocks use `<section>` with per-position headings — positions are navigable landmarks, not visually-styled divs.
- Contrast: body ≥ 4.5:1; `--afh-colonial` on `--afh-colonial-bg` pairing verified in the contrast snapshot test before first use at body size.

**CI gate:** all new stories join the axe-core Vitest gate (zero serious/critical); `/fr/regards/colonisation-et-resistances` is added to the `a11y.yml` Playwright + axe route matrix; one manual pass (VoiceOver iOS + NVDA, in French) on the overlay-toggle and event-card journeys before the epic closes (NFR20, UX-DR43).

## Performance

Gate: Lighthouse mobile ≥ 85 (perf), 100 (a11y) on `/fr/regards/colonisation-et-resistances`, added to the `lighthouse.yml` matrix (13.12).

- **SSR first:** narrative sections, fragmentation tables, `BorderCrossingTable`, and `EventChronologyTable` are server-rendered — the page is fully informative before any client JS (UX-DR47). Map + timeline are client islands.
- **Lazy overlay:** `ColonialBorderOverlay` and its GeoJSON load via `next/dynamic` on first toggle activation (or on idle after LCP) — never in the initial bundle. The basemap itself is Epic 12's bundle budget.
- **Geometry budget:** each border layer GeoJSON ≤ 150 KB gzipped, achieved by coordinate-precision reduction + topology-preserving simplification at build time; the simplification note is recorded in the layer's strict-model metadata (transparency about geometric approximation).
- **New npm dependencies: none.** Decision: reuse Epic 12's map stack for overlay rendering. Alternatives considered — (a) adding `react-leaflet`/`maplibre-gl` directly in this module: rejected, duplicates Epic 12's foundation and doubles map bundle cost; (b) server-side-rendered inline SVG map: rejected as the primary path because it forfeits the shared basemap/timeline interaction contract, though it remains the documented fallback if Epic 12's layer-slot API cannot ship in time. If geometry simplification needs tooling, it runs as a build-time script using `mapshaper` **as a devDependency only** (never shipped to the client) — the only candidate dependency, dev-scoped, with the alternative (pre-simplified source files committed as-is) preferred when the source dataset is already small.
- **Envelope discipline:** `/v2/peoples/{id}/fragmentation` responds < 300 ms p95 cached (NFR3); payload is bounded (≤ 4 countries).

## Test Plan (TDD)

TDD is mandatory: each story writes its failing test file **before** implementation (Red → Green → Refactor). Placement per project conventions:

| Layer                     | Location                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Validator rules (CR1–CR5) | `scripts/__tests__/validateAfrikData.colonialBorders.test.ts`, `scripts/__tests__/validateAfrikData.colonialEvents.test.ts`                                              |
| Transformer / lib         | `src/lib/__tests__/colonizationDataTransformer.test.ts`                                                                                                                  |
| Handler + service         | `src/api/v2/__tests__/peopleFragmentation.test.ts`, `src/api/v2/__tests__/events.colonialTypes.test.ts`                                                                  |
| API route                 | `src/app/api/v2/__tests__/peoples-fragmentation.test.ts`                                                                                                                 |
| Components                | co-located `src/components/colonization/__tests__/*.test.tsx` (Testing Library + axe-core, behavior through the public interface — no internals poking, no over-mocking) |

Fixtures are real-shaped AFRIK fixtures (never live Supabase in unit tests; mock only at the service boundary — the known Supabase-mock failure trap). `make check` green (no NEW failures vs the pre-existing set) before any story is declared done.

## Epic 13 Definition

**Epic goal:** Visitors explore how colonization fragmented, displaced, and renamed African peoples — and how peoples resisted — through a doctrine-bound narrative surface, a colonial-border overlay on the shared Africa basemap, and sourced events on the shared timeline; every claim carries classification status and a tappable source chain, with a text-first equivalent for every dataviz.

**FRs covered:** FR85, FR86, FR87, FR88, FR89, FR90

**Key deliverables:** event-type extension (`fragmentation`, `displacement`, `imposed_name`, `resistance`) across Epic 12's `migration_event_type` DB enum, `public/modele-migration.json` `eventType` enum, FR80 validator, and exported TS union — in lockstep · colonial-borders dataset (strict model `public/modele-frontiere-coloniale.json` + validator rules CR1–CR5 + sourced GeoJSON) · sourced event corpus in Epic 12's format · `GET /v2/peoples/{id}/fragmentation` + additive `eventType`-filter extension on `GET /v2/migrations` + OpenAPI updates · `FragmentationView`, `ColonialBorderOverlay` + `BorderCrossingTable`, `GazeEventNarrativeSection`, `ImposedNameList`, `EventTimelineMarkers`, `EventChronologyTable`, `ColonizationModulePage` at `/fr/regards/colonisation-et-resistances` · Lighthouse + axe CI matrix extension · FR90 children-surface exclusion (nav-rule test + QZ-4-style CI audit).

**Depends on:** Epic 0/1 (Module 0 fabric: sources/assertions/confidence, ConfidenceChip, ClassificationBadge, SourceChainSheet, DoctrineLinkCard), Epic 2 (reading surface + AutonymExonymHeading), Epic 3 (pinned-version citations), Epic 8 (imposed-name records), Epic 12 (event model + basemap + timeline). Epic 10 is **not** a dependency — it exports no audience mechanism; FR90's exclusion is enforced locally (see FR90). Data-acquisition stories 13.3/13.4 may start early in parallel with Epics 11–12; fragmentation stories 13.5/13.7 depend only on production data.

**Enables:** future Gazes-pillar modules (narrative-over-events pattern), richer Names Atlas cross-links.

## Stories

### Story 13.1: Event-type enum extension migration

**As a** backend engineer,
**I want** Epic 12's `migration_event_type` enum extended with the four colonization event types via an idempotent migration, in lockstep with the strict model, the FR80 validator, and the TS union,
**So that** all Epic 13 events live in the shared spatio-temporal model with no competing schema (FR87, FR89).

**Acceptance Criteria:**

**Given** Epic 12's event model migration is applied
**When** I add `supabase/migrations/0NN_colonization_event_types.sql` (NN = next free number)
**Then** it uses `ALTER TYPE migration_event_type ADD VALUE IF NOT EXISTS` for `fragmentation`, `displacement`, `imposed_name`, `resistance` and re-applying it is a no-op

**Given** Epic 12's strict model `public/modele-migration.json` and its FR80 validator (closed `eventType` enum — unknown values hard-error)
**When** I extend the model's `eventType` enum and the FR80 enum check with the four new values in the same PR
**Then** a fixture fiche using each new type passes validation, a fiche using an unknown type still fails, and no other FR80 rule is loosened

**Given** the shared TypeScript event-type union (owned by Epic 12)
**When** I extend it with the four values in a single exported source of truth
**Then** a unit test asserts the TS union, the migration's enum labels, and `modele-migration.json`'s `eventType` enum stay in lockstep

**Given** the AR45 runbook
**When** the migration ships
**Then** it is applied manually via `supabase db push` by a human — never auto-applied

**Technical notes:** touches `supabase/migrations/0NN_colonization_event_types.sql`, `public/modele-migration.json` (`eventType` enum), `scripts/validateAfrikData.ts` (FR80 enum check only), and Epic 12's exported event-type TS union (names per the Epic 12 spec: `migration_event_type`, `migration_events`). Test-first: `src/lib/afrik/__tests__/colonialEventTypes.test.ts`. **Type-extension story — lands first and alone; blocks 13.4, 13.6, 13.11, 13.12.**

---

### Story 13.2: Colonial-border strict model + validator rules

**As a** data curator,
**I want** a strict model file for colonial-border layers and `validateAfrikData.ts` rules CR1–CR2,
**So that** no unsourced or malformed border geometry can ever enter the dataset (FR86, FR32 pattern).

**Acceptance Criteria:**

**Given** no model exists for border layers
**When** I create `public/modele-frontiere-coloniale.json`
**Then** it prescribes `id`, `title_fr`, `reference_period`, `colonial_powers`, `geometry_file`, `simplification_note`, `sources[]` (with mandatory `tier: 1 | 2` and Tier-2 Wikipedia-path `notes`), `license` — no section skippable, none inventable

**Given** a border-layer file violating CR1 (missing Tier 1/2 source) or CR2 (unknown ISO code) or with invalid GeoJSON
**When** `tsx scripts/validateAfrikData.ts` runs
**Then** validation fails with a rule-named error, and the `data-integrity.yml` CI gate blocks the merge

**Given** a conformant fixture layer marked "(illustrative, not data)"
**When** the validator runs on it
**Then** it passes — proving the rules accept valid input

**Technical notes:** touches `public/modele-frontiere-coloniale.json`, `scripts/validateAfrikData.ts`, `.github/workflows/data-integrity.yml` (path glob only). Test-first: `scripts/__tests__/validateAfrikData.colonialBorders.test.ts` with valid/invalid fixtures. **Blocking story for 13.3 and 13.8.**

---

### Story 13.3: Colonial partition boundaries — data acquisition (source or drop)

**As a** data curator,
**I want** at least one Tier 1/2-sourced colonial partition boundary layer acquired, licensed, and validated,
**So that** the border overlay and fragmentation annotations rest on verifiable primary sources — or do not ship (FR85, FR86).

**Acceptance Criteria:**

**Given** the Source Tier policy
**When** I research candidate boundary datasets (academic historical-GIS publications, UNESCO General History of Africa cartography; Wikipedia used only as discovery meta-source across ≥ 2 language versions)
**Then** each acquired layer records its primary source, tier, license compatibility with CC-BY-SA-4.0 redistribution, and reference period in the strict-model metadata

**Given** an acquired layer
**When** committed under `dataset/source/afrik/geo/colonial_borders/` and simplified to `public/geo/colonial-borders/{layer}.geojson`
**Then** `tsx scripts/validateAfrikData.ts` passes CR1–CR2 and the gzipped public file is ≤ 150 KB

**Given** no compatible Tier 1/2 dataset is found by the sourcing deadline
**When** the epic proceeds
**Then** the overlay stories (13.8 map layer) are descoped and the decision is recorded — the border-crossings information ships from `afrik_people_countries` derivation alone; **no boundary is ever hand-drawn or invented**

**Technical notes:** touches `dataset/source/afrik/geo/colonial_borders/**`, `public/geo/colonial-borders/**`. Test = validator run green in CI on the committed files (`scripts/__tests__/validateAfrikData.colonialBorders.test.ts` fixtures extended with one real layer). **Blocking, may start early in parallel with Epics 11–12. Depends on 13.2.**

---

### Story 13.4: Colonization & resistance event corpus — authoring + validator rules (source or drop)

**As a** data curator,
**I want** a sourced corpus of `fragmentation` / `displacement` / `imposed_name` / `resistance` events authored in Epic 12's event format, gated by validator rules CR3–CR4,
**So that** every event narrative is verifiable at Tier 1/2 and doctrine-compliant before any UI consumes it (FR87, FR89, FR90).

**Acceptance Criteria:**

**Given** Epic 12's event fiche format and the four new types (13.1)
**When** I author events under `dataset/source/afrik/migrations/` (Epic 12's dataset location, `MGR_*` identifiers)
**Then** each event carries date/date-range, location, linked entities (PPL/ISO codes), `classification_status`, and ≥ 1 Tier 1/2 source (≥ 2 when contested or colonial-legacy — CR4)

**Given** an event of type `imposed_name`
**When** validated
**Then** it references an existing Epic 8 imposed-name record id (CR3) — events with no Epic 8 record are rejected

**Given** any claim that cannot be backed at Tier 1/2
**When** authoring
**Then** the claim is dropped, never estimated; corpus size is whatever survives sourcing (an empty type section is acceptable and renders the FR87 empty state)

**Technical notes:** touches `scripts/validateAfrikData.ts` (CR3–CR5), event dataset files (`dataset/source/afrik/migrations/`), `.github/workflows/data-integrity.yml` glob. Test-first: `scripts/__tests__/validateAfrikData.colonialEvents.test.ts`. **Blocking for 13.6, 13.11, 13.12; may start early once 13.1 and Epic 12's format are stable. Editorial-sensitivity ceiling: contested framings get multi-perspective source sets at authoring time, not at render time.**

---

### Story 13.5: Fragmentation service + `GET /v2/peoples/{id}/fragmentation`

**As a** frontend engineer,
**I want** a 3-layer API endpoint deriving a people's fragmentation from `afrik_people_countries` + demography,
**So that** the fragmentation view ships early from data already in production (FR85).

**Acceptance Criteria:**

**Given** the 3-layer pattern
**When** I create `src/app/api/v2/peoples/[id]/fragmentation/route.ts` + `src/api/v2/handlers/peopleFragmentation.ts` + `src/api/v2/services/peopleFragmentation.ts` + Zod schema `src/api/v2/schemas/peopleFragmentation.ts`
**Then** the route validates `id`, sets CORS via `src/lib/api/cors.ts`, and caches `s-maxage=3600`

**Given** a people spanning ≥ 2 countries
**When** the handler runs
**Then** the AR8 envelope returns countries with `populationShare` + `assertionId` (batched queries, AR17) and `borderPairs` annotated with `colonialOrigin` **only** where the 13.3 dataset documents it

**Given** a people in < 2 countries or an unknown id
**When** requested
**Then** the response is `422 SEMANTIC_ERROR` / `404 NOT_FOUND` per AR9

**Given** the OpenAPI spec
**When** the endpoint lands
**Then** `src/lib/api/openapiV2.ts` documents path, params, envelope, and error codes in the same PR; the OpenAPI-diff gate passes

**Technical notes:** logger via `@/lib/api/logger`; no `console.*`. Test-first: `src/api/v2/__tests__/peopleFragmentation.test.ts` (handler+service, fixture-based) then `src/app/api/v2/__tests__/peoples-fragmentation.test.ts` (route). Depends only on production data; `colonialOrigin` enrichment activates when 13.3 lands (payload field optional from day one — additive, NFR31). **Ships early.**

---

### Story 13.6: Events read surface — additive `eventType` filter

**As a** frontend engineer,
**I want** Epic 12's `GET /v2/migrations` endpoint to accept the four new values in its `eventType` filter,
**So that** module surfaces query displacement/resistance/fragmentation/imposed-name events through the shared API (FR87, FR89).

**Acceptance Criteria:**

**Given** Epic 12's migrations route/handler/service (`src/app/api/v2/migrations/route.ts` → `src/api/v2/handlers/migrations.ts` → `src/api/v2/services/migrations.ts`)
**When** I extend the `eventType` Zod filter enum (`src/api/v2/schemas/migrations.ts`) and service mapping with the four values
**Then** filtering by each value returns only events of that type, `MigrationEventSummary` response shape and envelope unchanged (additive only, NFR31)

**Given** the OpenAPI spec
**When** the filter enum is extended
**Then** the spec update ships in the same PR and the OpenAPI-diff gate passes **without** an `api-breaking` trailer

**Given** an unknown `eventType` value
**When** requested
**Then** `400 VALIDATION_ERROR` — behavior identical to Epic 12's existing contract

**Technical notes:** touches `src/api/v2/schemas/migrations.ts`, `src/api/v2/handlers/migrations.ts`, `src/api/v2/services/migrations.ts` + `src/lib/api/openapiV2.ts` (`eventType` enum on the `/v2/migrations` list operation). Test-first: `src/api/v2/__tests__/events.colonialTypes.test.ts`. Depends on 13.1 + 13.4 (fixtures) + Epic 12's endpoint being shipped.

---

### Story 13.7: `FragmentationView` component + people-fiche section

**As a** reader,
**I want** a text-first fragmentation view on the people fiche and the module index,
**So that** I see which borders divide a people, with every share traceable to its source (FR85, FR90).

**Acceptance Criteria:**

**Given** `FragmentationView` with props `{ fragmentation, variant }`
**When** it renders `variant="fiche-section"` for a people spanning ≥ 2 countries
**Then** a semantic `<table>` (caption + scoped headers) lists countries and shares, each row ending in a `ConfidenceChip` opening `SourceChainSheet`; the heading uses `AutonymExonymHeading` (endonym-first, `lang` attribute)

**Given** a border pair with a documented `colonialOrigin`
**When** rendered
**Then** the annotation appears with the `--afh-colonial` marker + text label « frontière issue du partage colonial » (never color alone); pairs without a record show nothing

**Given** a people in one country
**When** the fiche renders
**Then** the section is absent (no empty-state)

**Given** Storybook stories at 430 / 720 / 800 px
**When** axe-core runs
**Then** zero serious/critical violations; mobile 430 px renders without horizontal scroll

**Technical notes:** new `src/components/colonization/FragmentationView.tsx` + `.stories.tsx`; small insertion point in `PeopleDetailViewV2` (conditional section, data via TanStack Query or SSR fetch of 13.5). Test-first: `src/components/colonization/__tests__/FragmentationView.test.tsx`. Depends on 13.5. **This story IS the text-first deliverable for FR85 — no map involved.**

---

### Story 13.8: Colonial-border overlay + `BorderCrossingTable`

**As a** reader,
**I want** the colonial-border layer toggleable on the Africa basemap with an equivalent data table always present,
**So that** I can compare imposed borders with peoples' territories visually or textually, at my choice (FR86, FR90).

**Acceptance Criteria:**

**Given** Epic 12's basemap layer-slot API
**When** `ColonialBorderOverlay` mounts with a 13.3 layer
**Then** borders draw in `--afh-colonial` with a legend naming the layer, period, and source; the toggle is a `<button aria-pressed>` labeled « afficher les frontières coloniales »

**Given** the page renders (SSR, before any JS)
**When** I inspect the DOM
**Then** `BorderCrossingTable` is present with the same information (border pairs, peoples crossed, source links) regardless of toggle state

**Given** `prefers-reduced-motion: reduce`
**When** toggling
**Then** the layer appears instantly — no draw animation

**Given** the overlay bundle
**When** the page loads
**Then** overlay code + GeoJSON load lazily (dynamic import after LCP or on first toggle); Lighthouse mobile perf on the module route stays ≥ 85

**Technical notes:** new `src/components/colonization/ColonialBorderOverlay.tsx`, `BorderCrossingTable.tsx` + stories. Test-first: `src/components/colonization/__tests__/ColonialBorderOverlay.test.tsx` + `BorderCrossingTable.test.tsx`. Depends on 13.3 + Epic 12 basemap. If 13.3 descopes (no sourced layer), only `BorderCrossingTable` ships, fed by 13.5 border pairs.

---

### Story 13.9: Module page `/fr/regards/colonisation-et-resistances`

**As a** reader,
**I want** a doctrine-bound module page assembling fragmentation, map, names, and event sections,
**So that** the Gazes flagship is one coherent, citable narrative surface (FR90).

**Acceptance Criteria:**

**Given** the App Router
**When** I add the route under `src/app/[lang]/` with the FR slug `regards/colonisation-et-resistances` registered in `src/lib/routing.ts` (French-only, `Language = "fr"` — no locale switch reintroduced)
**Then** `ColonizationModulePage` orchestrates SSR sections: doctrine intro (with `DoctrineLinkCard` linking the doctrine version in force), fragmentation index, map section, imposed-names, displacement, resistances, sources footer — sections gracefully omit when their data is absent

**Given** the FR90 children-exclusion rule (Epic 10 exports no shared audience mechanism)
**When** navigation entries and cross-link surfaces are built
**Then** no children-facing surface links this route — asserted by an Epic-13-owned nav-rule unit test — and the QZ-4-style CI assertion (FR90) verifies no active children-segment quiz question references event-derived content (structurally unreachable: Epic 10's children templates read only allowlisted `afrik_*` field paths)

**Given** transformer discipline
**When** the page assembles data
**Then** it flows through `src/lib/colonizationDataTransformer.ts` (pure, unit-tested — Carte vivante pattern), never per-component ad-hoc mapping

**Given** mobile 430 px
**When** the page renders
**Then** no horizontal scroll; breadcrumbs, top-bar nav entry, and metadata (canonical URL, `schema.org/Article`) present

**Technical notes:** touches `src/app/[lang]/.../page.tsx` (per routing conventions), `src/lib/routing.ts`, `src/lib/translations.ts` (French strings), new `src/components/colonization/ColonizationModulePage.tsx`, `src/lib/colonizationDataTransformer.ts`. Test-first: `src/lib/__tests__/colonizationDataTransformer.test.ts` + `src/components/colonization/__tests__/ColonizationModulePage.test.tsx`. Depends on 13.7 (first section); later sections integrate as 13.8/13.10/13.11/13.12 land.

---

### Story 13.10: Imposed-names section (consumes Epic 8)

**As a** reader,
**I want** the names imposed under colonization shown in context, endonym first, linking to the Names Atlas,
**So that** naming violence is documented without Epic 13 duplicating any name data (FR88, FR90).

**Acceptance Criteria:**

**Given** Epic 8 imposed-name records for peoples in the module scope
**When** `ImposedNameList` renders
**Then** each entry shows the endonym first (Fraunces 900, `lang` attribute), the imposed name marked `--afh-colonial` + text label « nom imposé », the why-problematic explanation, a `ConfidenceChip`, and a link to the Epic 8 Names Atlas record

**Given** a people with no Epic 8 record
**When** the section renders
**Then** the people is absent — no record is derived from `appellations` prose or invented

**Given** Storybook stories at 430 / 720 / 800 px
**When** axe-core runs
**Then** zero serious/critical violations

**Technical notes:** new `src/components/colonization/ImposedNameList.tsx` + stories; reads via Epic 8's query/service surface (read-only import — no new query duplication). Test-first: `src/components/colonization/__tests__/ImposedNameList.test.tsx` with Epic 8-shaped fixtures. Depends on Epic 8 shipped.

---

### Story 13.11: Displacement & resistance narrative sections

**As a** reader,
**I want** sourced displacement and resistance narratives with classification status and multi-perspective on contested framings,
**So that** both colonial violence and African agency are documented to the same evidentiary standard (FR87, FR89, FR90).

**Acceptance Criteria:**

**Given** `GazeEventNarrativeSection` with `eventType="displacement"` and `eventType="resistance"`
**When** each renders events from 13.4 (via 13.6)
**Then** chronological narrative cards show date, place, people (endonym-first), prose with a `ConfidenceChip` per paragraph (Direction D), and a `ClassificationBadge` when not consensual

**Given** a contested event
**When** its card expands
**Then** the multi-perspective view presents each documented position with its own source set (FR24 pattern), and a `DoctrineLinkCard` appears in the section footer

**Given** an event type with zero surviving corpus entries
**When** the section renders
**Then** a calm empty state states no documented event is recorded yet (UX-DR31 tone — no invented content, no apology theater)

**Given** Storybook stories at 430 / 720 / 800 px
**When** axe-core runs
**Then** zero serious/critical violations

**Technical notes:** new `src/components/colonization/GazeEventNarrativeSection.tsx` + stories; wired into 13.9's orchestrator. Test-first: `src/components/colonization/__tests__/GazeEventNarrativeSection.test.tsx`. Depends on 13.4 + 13.6.

---

### Story 13.12: Timeline integration + `EventChronologyTable` + CI gates

**As a** reader,
**I want** the four event types rendered as an Epic-13-owned marker layer beside the shared timeline scrubber, with a full chronological table equivalent, and the module wired into the CI quality gates,
**So that** the temporal story is explorable by everyone and the module cannot regress silently (FR87, FR89, FR43, FR44).

**Acceptance Criteria:**

**Given** the Epic-13-owned `EventTimelineMarkers` layer composed beside Epic 12's `TimeScrubber` on the module page (the scrubber's ARIA-slider contract — `min/max/value/onChange` — is not extended)
**When** it loads events filtered to the four types (via 13.6)
**Then** markers are keyboard-focusable in DOM order, announce « événement {type}, {date}, {peuple} — Entrée pour ouvrir », and open the event card; type filters are accessible controls

**Given** the same page, with or without JS
**When** I inspect the DOM
**Then** `EventChronologyTable` presents every event (date, type, people endonym-first, place, source link) as a semantic table — same story wave, same information

**Given** `prefers-reduced-motion: reduce`
**When** interacting with timeline or filters
**Then** no auto-advance, no scroll-triggered animation

**Given** the CI matrices
**When** this story lands
**Then** `/fr/regards/colonisation-et-resistances` is added to `lighthouse.yml` (mobile perf ≥ 85, a11y 100) and `a11y.yml` (axe zero serious/critical), and one manual VoiceOver + NVDA pass in French on the overlay-toggle and event-card journeys is recorded

**Technical notes:** new `src/components/colonization/EventTimelineMarkers.tsx` + `EventChronologyTable.tsx` + stories; `TimeScrubber` consumed as-is per Epic 12's component contract (no marker API added to it); CI files `.github/workflows/lighthouse.yml` + `a11y.yml` (route lists only). Test-first: `src/components/colonization/__tests__/EventTimelineMarkers.test.tsx` + `EventChronologyTable.test.tsx`. Depends on 13.4, 13.6, 13.9, Epic 12 timeline. Closes the epic.

## Out of Scope

- **Any new event model, basemap, timeline, or network-graph foundation** — owned by Epics 12 and 11; Epic 13 only extends/consumes.
- **Imposed-name data authoring or schema** — owned by Epic 8; Epic 13 renders and links.
- **A `/v2/geo/*` API for border geometry** — static versioned GeoJSON suffices at MVP (decision recorded in API Surface); revisit on third-party demand at Growth.
- **Animated "border evolution over time" morphing maps** — Growth; MVP ships at most static period layers.
- **Pre-colonial polities cartography, slave-trade routes cartography** — belongs to Epic 12's migration-frise scope or future Gazes modules, not this one.
- **Children-adapted retelling of colonization content** — explicitly excluded (FR90); any future adaptation is an Epic 10-governed editorial project with the advisory board.
- **Country-fiche colonization sections rework** — existing `HistoryTimeline` / `HistoricalFactsSection` on the country page are untouched; cross-links only.
- **Visual polish beyond tokens + shadcn** — deferred to the designer-led redesign phase; this epic ships functional, accessible, token-compliant surfaces.
- **Multilingual surfaces** — French only (`Language = "fr"`); no locale switch reintroduced.

## Open Questions

1. **Epic 12 basemap layer-slot contract:** the naming items are now aligned with the final Epic 12 spec (`migration_events` / `migration_event_peoples`, `migration_event_type`, `dataset/source/afrik/migrations/` + `modele-migration.json`, `GET /v2/migrations`, `TimeScrubber` ARIA-slider props). What remains open is how `AfricaBasemap` hosts the colonial-border GeoJSON layer — composition beside the basemap per `MigrationsAtlasView`'s layering pattern vs. an explicit layer-slot prop; 13.8 must confirm with Epic 12 before implementation, and any gap is fixed **in Epic 12** (per Fit & Dependencies).
2. **Which colonial partition snapshot(s) ship at MVP:** a single reference-period layer vs. several dated layers — depends on what Tier 1/2 boundary datasets with CC-BY-SA-compatible licenses actually exist (13.3 outcome); product owner arbitrates scope vs. sourcing cost.
3. **Fragmentation share semantics:** `demography.distributionByCountry` expresses a people's distribution — the PO must confirm whether the fragmentation view displays share-of-people-total per country, share-of-country-population, or both, and the exact French labels for each.
4. **Advisory-board sign-off:** does the module's doctrine-bound intro (the framing text on colonization itself) require advisory-board approval before first publication, per the doctrine-change process (AR31)?
5. **Shared audience policy (optional, PO call):** Epic 10's final spec exports no audience-rules mechanism (`quiz_*` tables and `segmentPolicy.ts` are module-private), so FR90 is enforced Epic-13-locally (nav-rule test + QZ-4-style CI audit — see FR90). If a platform-wide `adult_general` flag is ever wanted, it must be added as an explicit exported deliverable to Epic 10 Story 10.4 — the product owner decides whether opening Epic 10's scope for that is worth it.
6. **URL slug confirmation:** `/fr/regards/colonisation-et-resistances` assumes a `regards` pillar segment in `src/lib/routing.ts`; confirm whether the Gazes pillar gets a shared segment (affecting Epics 9–13) or module pages are top-level.
7. **`--afh-colonial` at body-text sizes:** the token pair was specified for markers/badges; if 13.10 uses it on running text, the contrast snapshot must confirm ≥ 4.5:1 or a darker text-variant token must be added to the Epic 1-owned token sheet.
