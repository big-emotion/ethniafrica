# Epic 11 — Hidden Links Between Peoples (Relations Graph)

Pillar: **Links** · Module **#5** · Access modes: **Explore / Understand**
Status: **Draft — PRD addendum (FR block FR72–FR77)**

---

## Module Goal

Epic 11 ships the relations layer of Africa History: a typed, sourced graph of links between peoples — linguistic proximity **derived** from the AFRIK hierarchy, and migratory / commercial / religious relations recorded as **new Tier 1/2-sourced data**. The product promise is the "hidden link": two peoples far apart on the map turn out to be connected, and the connection is traceable to a verifiable source in one tap. The epic owns the people-relations data model (`modele-relation.json` strict model, `afrik_people_relations` table, validator gates) and the network-graph dataviz foundation — a mobile-first **ego-network** view centered on one people, never a full-corpus hairball. Data acquisition is the long pole: the dataset stories (strict model, validator extension, pilot sourced corpus) are the first, blocking wave; every UI story renders whatever corpus exists at that point. Accessibility is functional scope: every graph view ships with a complete list equivalent, keyboard edge-by-edge traversal, and screen-reader announcements — in the same story wave as the dataviz.

## Fit & Dependencies

**Position in build order:** `7 → 8 → 9 → 10 → **11** → 12 → 13`. Epic 11's UI wave starts after Epic 10; its data-acquisition stories (11.1–11.4) are explicitly allowed to start early, in parallel with Epics 7–10.

**Builds on (consumes):**

- **Module 0 fabric (Epic 1):** `sources`, `assertions`, `confidence_scores` tables (polymorphic `entity_type`/`entity_id` — extended with the `'relation'` entity type), `ConfidenceChip`, `ClassificationBadge`, `SourceChainSheet`. A relation's source chain opens in the same `SourceChainSheet` as any fiche assertion — no competing source UI.
- **Epic 0:** CI gates (`data-integrity.yml`, axe-core, Lighthouse CI, OpenAPI-diff) — Epic 11 adds checks and routes to existing gates, it does not create new pipelines.
- **Epic 2 reading surface:** `AutonymExonymHeading` (every people name in list and graph), Direction-D prose conventions, breadcrumbs/top-bar navigation, `--afh-*` tokens, Fraunces/Nunito type roles, `useListView` conventions. The people fiche (`PeopleDetailViewV2`, section `PeopleRelatedPeoplesSection`) is the entry point to the links surface.
- **Epic 3:** pinned versions apply to fiches only at MVP; the links page always renders live relations (see Out of Scope).
- **Epic 6:** `/v2` envelope (`{ data, meta, errors }`), error taxonomy, rate limits, OpenAPI spec discipline.

**Sibling shared-infra boundaries (do not violate):**

- Epic 7 owns the **hierarchical tree** dataviz — Epic 11 does not reuse or extend it; a network is not a tree.
- Epic 8 owns the naming/etymology model — Epic 11 displays names only through `AutonymExonymHeading`, never stores naming data.
- Epic 12 owns the spatio-temporal event model, Africa basemap, and timeline scrubber — Epic 11 stores period fields on relations but does **not** build any map or timeline UI.

**OWNS (provides to others):**

- The **people-relations data model**: `public/modele-relation.json` strict model, `dataset/source/afrik/relations/` source tree, `afrik_people_relations` table, relation validator rules, `/v2/relations` API surface.
- The **network-graph dataviz foundation**: `EgoNetworkGraph` L3 component and its accessibility contract (list equivalent + keyboard traversal + SR announcements). Any future module needing an ego-network view reuses this component.

## User Journeys

**Journey 1 — Amina, diaspora student, mobile 390 px.** Amina reads the fiche of a people she knows. In the "Liens" section she sees three relation rows with type badges and a "voir tous les liens" link. She opens `/fr/peuples/{slug}/liens`: the list loads instantly (SSR), grouped by relation type, each row showing the other people's autonym, the period, one line of context, and a `ConfidenceChip`. She taps a commercial relation → `SourceChainSheet` opens with the sources behind the claim. **Success moment:** "these two peoples traded across half the continent — and I can see the source."

**Journey 2 — Malik, curious explorer, mobile 430 px.** From the links page, Malik scrolls past the list to the ego-network graph (lazy-loaded below the list). His people sits at the center; neighbors are placed around it, edges styled by relation type (label + line style, never color alone). Derived linguistic-proximity links render dashed with the mention "dérivé de la hiérarchie AFRIK". He taps an edge → the relation detail opens with description, period, and sources. He taps the neighbor node → navigates to that people's own links page and keeps exploring. **Success moment:** a chain of two hops connects peoples he thought unrelated.

**Journey 3 — Nadia, screen-reader user, any viewport.** Nadia lands on the links page. The list — a real list, first in DOM order — gives her everything: type filters as accessible chips, each relation announced with type, other people, period, source count. If she enters the graph region, focus starts on the center node; arrow keys move edge by edge and each edge is announced ("Lien commercial avec {autonym}, XVᵉ–XVIIIᵉ siècle, 3 sources — Entrée pour ouvrir le détail" — structure illustrative, not data). Escape leaves the graph. **Success moment:** she gets the identical information the sighted user gets, in the same story wave, not as an afterthought.

## Functional Requirements

_This epic's allocated block is FR72–FR77. No other FR numbers are defined or modified here._

- **FR72:** Users can view, for any people fiche, the list of documented relations (migratory, commercial, religious) linking that people to other peoples, each with its type, period, description, sources, and confidence score

  **Given** a people with at least one relation record in `afrik_people_relations`
  **When** the user opens `/fr/peuples/{slug}/liens`
  **Then** every relation involving that people renders as a list row with type badge, the other people's autonym-first name, period label, one-line description, and a `ConfidenceChip` opening the relation's `SourceChainSheet`

  **Given** a people with zero relation records
  **When** the user opens the links page
  **Then** a calm empty state renders ("aucun lien documenté pour l'instant") with a link to the AFRIK-derived linguistic proximity list when available — never a broken or blank surface

- **FR73:** The system derives linguistic-proximity links between peoples from the AFRIK hierarchy (shared language family) and always distinguishes derived links from sourced relation records

  **Given** two peoples sharing the same `languageFamilyId`
  **When** the relations API computes the ego network for one of them
  **Then** the other appears as a `derived: true` linguistic-proximity link with no stored row, no invented period, and no source list — labelled "dérivé de la hiérarchie AFRIK"

  **Given** a relation JSON file with `relationType: "linguistic"`
  **When** the validator runs
  **Then** the file is rejected (linguistic proximity is derived-only; storing it as a sourced record is a data-integrity error)

- **FR74:** The system validates that every relation record conforms to the strict relation model and carries at least one Tier 1 or Tier 2 source; CI blocks merges that introduce non-conforming records

  **Given** a relation file missing a `sources` entry, or citing only Tier 3 material
  **When** `tsx scripts/validateAfrikData.ts` runs (locally or in `data-integrity.yml`)
  **Then** the run fails with rule id REL-5 and the offending file path — "source or drop" is machine-enforced

  **Given** a relation referencing a PPL id that does not exist, or referencing the same people twice
  **When** the validator runs
  **Then** the run fails with rule ids REL-2 / REL-3 respectively

- **FR75:** Users can explore an ego-network graph centered on one people showing its direct relations, with a complete list equivalent carrying the same information on the same page

  **Given** the links page at 430 px
  **When** it renders
  **Then** the relations list renders first (SSR) and the ego-network graph hydrates below it as progressive enhancement; both show the same relation set and respond to the same type filters

  **Given** a people with more neighbors than the graph density cap (24)
  **When** the graph renders
  **Then** it shows the 24 highest-confidence neighbors plus an overflow affordance "+ N autres — voir la liste" anchoring to the list; the list always shows everything

- **FR76:** Users relying on assistive technology can traverse the relations graph edge-by-edge via keyboard, with screen-reader announcements for every node and edge (WCAG 2.1 AA)

  **Given** keyboard focus enters the graph region
  **When** the user presses Arrow Right / Arrow Left
  **Then** focus moves to the next / previous edge (sorted by type, then autonym) and an `aria-live="polite"` region announces the edge's type, target people, period, and source count

  **Given** focus is on an edge
  **When** the user presses Enter
  **Then** the relation detail (`SourceChainSheet`) opens; Escape closes it and returns focus to the same edge; Escape from the graph itself exits to the next page element — no keyboard trap

- **FR77:** Third-party integrators can read relation records and derived linguistic-proximity links via documented `/v2` endpoints with attribution metadata

  **Given** `GET /api/v2/peoples/{id}/relations`
  **When** the request succeeds
  **Then** the response uses the `{ data, meta, errors }` envelope with `meta.license = "CC-BY-SA-4.0"`, separates `sourced` and `derived` collections, and is described in the OpenAPI spec at `src/lib/api/openapiV2.ts`

  **Given** an unknown PPL id
  **When** the endpoint is called
  **Then** the response is `404 NOT_FOUND` per the 9-code error taxonomy

## Data Model & Sourcing

### AFRIK dependencies

- `afrik_peoples` (PPL ids, `languageFamilyId`, autonym data) — FK target and derivation input.
- `afrik_language_families` — family labels for derived-link explanations.
- Module 0 fabric: `assertions` + `confidence_scores` accept `entity_type = 'relation'` (the fabric's `entity_type` is TEXT per `009_module_zero_fabric.sql`, so this is a **new accepted value**, not a schema change; Zod schemas and the `recompute_confidence` function must accept it — coordination point with Epic 1 code, verified in Story 11.2).

### New dataset type — strict model (BLOCKING STORY 11.1)

A relation is a first-class AFRIK entity. New strict model at **`public/modele-relation.json`** (AFRIK JSON v2), one JSON file per relation under **`dataset/source/afrik/relations/REL_*.json`**:

```jsonc
{
  "_meta": {
    "format": "AFRIK JSON v2",
    "entity": "relation",
    "directives": "Voir DIRECTIVES-AFRIK.md",
  },
  "id": "REL_<UNIQUE_SLUG>", // ^REL_[A-Z0-9_]+$
  "relationType": "migratory | commercial | religious",
  "peopleIdA": "PPL_<...>", // must exist in the PPL corpus
  "peopleIdB": "PPL_<...>", // must exist; A ≠ B
  "direction": "a_to_b | b_to_a | bidirectional",
  "period": {
    "startYear": 1400, // integer, negative = BCE, nullable
    "endYear": 1800, // integer, nullable, startYear ≤ endYear
    "label": "<libellé français de la période>",
  },
  "description": "<une à trois phrases en français, factuel, sans superlatif>",
  "sources": [
    {
      "title": "<...>",
      "author": "<...>",
      "year": 0,
      "url": "<résolvable>",
      "tier": 1, // 1 or 2 ONLY
      "notes": "<Tier 2: chemin Wikipedia (versions linguistiques croisées)>",
    },
  ],
}
```

_(All field values above are shape documentation — illustrative, not data.)_ `linguistic` is **not** an allowed `relationType`: linguistic proximity is derived at read time from `languageFamilyId` and never stored (FR73).

### New Supabase table — migration sketch (Story 11.2)

Migration file `supabase/migrations/0NN_people_relations.sql` — **`0NN` is a placeholder: take the next free number at implementation time (migrations currently reach 027)**. Idempotent, applied by a human via `supabase db push` per the AR45 runbook — never auto-applied.

```sql
-- 0NN_people_relations.sql — Epic 11 relations model (idempotent)
DO $$ BEGIN
  CREATE TYPE relation_type AS ENUM ('migratory', 'commercial', 'religious');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE relation_direction AS ENUM ('a_to_b', 'b_to_a', 'bidirectional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS afrik_people_relations (
  id                 TEXT PRIMARY KEY CHECK (id ~ '^REL_[A-Z0-9_]+$'),
  relation_type      relation_type NOT NULL,
  people_id_a        TEXT NOT NULL REFERENCES afrik_peoples(id),
  people_id_b        TEXT NOT NULL REFERENCES afrik_peoples(id),
  direction          relation_direction NOT NULL DEFAULT 'bidirectional',
  period_start_year  INTEGER,
  period_end_year    INTEGER,
  period_label       TEXT,
  description        TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (people_id_a <> people_id_b),
  CHECK (period_start_year IS NULL OR period_end_year IS NULL
         OR period_start_year <= period_end_year)
);

CREATE INDEX IF NOT EXISTS idx_people_relations_a    ON afrik_people_relations(people_id_a);
CREATE INDEX IF NOT EXISTS idx_people_relations_b    ON afrik_people_relations(people_id_b);
CREATE INDEX IF NOT EXISTS idx_people_relations_type ON afrik_people_relations(relation_type);

ALTER TABLE afrik_people_relations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY people_relations_public_read
    ON afrik_people_relations FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Writes: service-role only (loader script) — no INSERT/UPDATE policy for anon/authenticated.
```

Sources attach through the Module 0 fabric: the loader writes one `assertions` row per relation (`entity_type = 'relation'`, `entity_id = REL id`, `field_path = 'record'`) referencing the relation's `sources`, and seeds a `confidence_scores` row. Finer per-field assertions are Growth.

### Validator extension — FR28-style integrity rules (BLOCKING STORY 11.3)

New checks in `scripts/validateAfrikData.ts`, reported under the FR74 umbrella, run in `data-integrity.yml` pre-merge + nightly:

| Rule      | Gate | Statement                                                                                                         |
| --------- | ---- | ----------------------------------------------------------------------------------------------------------------- |
| **REL-1** | hard | `id` matches `^REL_[A-Z0-9_]+$` and is unique across `dataset/source/afrik/relations/`                            |
| **REL-2** | hard | `peopleIdA` and `peopleIdB` both exist in the PPL corpus                                                          |
| **REL-3** | hard | `peopleIdA ≠ peopleIdB`; `relationType ∈ {migratory, commercial, religious}` (`linguistic` stored → error, FR73)  |
| **REL-4** | hard | `period.startYear ≤ period.endYear` when both present; both integers                                              |
| **REL-5** | hard | ≥ 1 `sources` entry with `tier: 1` or `tier: 2`; every Tier 2 entry records its Wikipedia cross-check in `notes`  |
| **REL-6** | soft | Same unordered people pair + same `relationType` + overlapping period in two files → duplicate-suspect warning    |
| **REL-7** | hard | `description` non-empty; every `sources.url` present and well-formed (resolvability joins the FR30 nightly sweep) |

### Source Tier policy application

The Source Tier policy (CLAUDE.md) applies verbatim: **Tier 1** (UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA) cited directly; **Tier 2** primary sources surfaced via ≥ 2 Wikipedia language versions, citing the primary source only, path recorded in `notes`; **Tier 3 forbidden**. Migratory / commercial / religious relations are historical claims — **NOT derivable, never inferable by an agent**. If no Tier 1/2 source supports a candidate relation, the relation is **not created** ("source or drop"). This spec contains **zero** relation data; the pilot corpus is produced by the editorial story 11.4 (with the `afrik-curator` skill), and any example in this document or in Storybook fixtures is marked "(illustrative, not data)" and never migrated to the database.

## API Surface

Three new read endpoints, strict 3-layer pattern, all responses via `createApiResponse` / `createApiError`:

| Path                             | Method | Purpose                                                                          | Cache           |
| -------------------------------- | ------ | -------------------------------------------------------------------------------- | --------------- |
| `/api/v2/peoples/{id}/relations` | GET    | Ego network for one people: `sourced[]` + `derived[]` collections                | `s-maxage=3600` |
| `/api/v2/relations`              | GET    | Paginated relation records; filters `type`, `peopleId`, `periodFrom`, `periodTo` | `s-maxage=3600` |
| `/api/v2/relations/{id}`         | GET    | Single relation detail incl. full source chain + confidence                      | `s-maxage=3600` |

**Layering:**

```
src/app/api/v2/relations/route.ts                → parsing (Zod), CORS, Cache-Control
src/app/api/v2/relations/[id]/route.ts
src/app/api/v2/peoples/[id]/relations/route.ts
  ↓
src/api/v2/handlers/relations.ts                 → business logic incl. derived-link computation policy
  ↓
src/api/v2/services/relations.ts                 → Supabase queries (batched, no N+1)
src/api/v2/schemas/relations.ts                  → Zod param/response schemas (never inline in routes)
```

**Envelope (shape sketch, camelCase, ISO-8601 dates):**

```jsonc
{
  "data": {
    "peopleId": "PPL_X",
    "sourced": [
      {
        "relationId": "REL_X",
        "type": "commercial",
        "direction": "bidirectional",
        "otherPeople": { "id": "PPL_Y", "autonym": "…", "slug": "…" },
        "period": { "startYear": null, "endYear": null, "label": "…" },
        "description": "…",
        "confidence": { "score": 0, "sourceCount": 0, "verifiedAt": null },
      },
    ],
    "derived": [
      {
        "type": "linguistic",
        "derived": true,
        "basis": "sharedLanguageFamily",
        "languageFamilyId": "FLG_X",
        "otherPeople": { "id": "PPL_Z", "autonym": "…", "slug": "…" },
      },
    ],
  },
  "meta": {
    "license": "CC-BY-SA-4.0",
    "attribution": "Africa History — <url>",
  },
  "errors": [],
}
```

Query params on the ego endpoint: `types` (CSV of relation types + `linguistic`), `includeDerived` (default `true`), `limit` on derived links (default 24 — same-family sets can be large; the full derived set is available via the family page, owned by Epic 7's tree, not duplicated here). Errors follow the 9-code taxonomy (`VALIDATION_ERROR`, `NOT_FOUND`, `SEMANTIC_ERROR` for a well-formed but unknown `peopleId` filter, `RATE_LIMITED`, …). Anonymous rate limits apply unchanged.

**OpenAPI:** every endpoint, param, envelope, and error registered in `src/lib/api/openapiV2.ts` in the same PR (NFR38); the OpenAPI-diff CI gate must pass. Derived links documented as computed, non-citable entities (no `pinned_url`).

## UX & Components

Visual specification is deliberately minimal (tokens + shadcn primitives); a designer pass is deferred to the redesign phase. Functional a11y is maximal (next section). All components live in `src/components/relations/` (new domain folder), composed from shadcn/ui + Module 0 L3 primitives. No component carries business logic (UX-DR48): data arrives via props; fetching lives in the page (RSC) or TanStack Query hooks.

**New L3 components:**

```ts
// RelationTypeBadge — icon+text+color, never color alone (UX-DR39)
type RelationTypeBadgeProps = {
  type: "linguistic" | "migratory" | "commercial" | "religious";
  derived?: boolean; // renders "dérivé" suffix + dashed border style
  size?: "inline" | "card";
};

// RelationsList — THE text-first equivalent; SSR; first in DOM order
type RelationsListProps = {
  centerPeople: { id: string; autonym: string; slug: string };
  items: RelationListItem[]; // sourced + derived, pre-merged, pre-sorted
  activeTypes: RelationType[]; // filter chips per UX-DR32 (always visible, dismissible ×, URL-reflected)
  onOpenRelation: (relationId: string) => void; // opens SourceChainSheet
};

// EgoNetworkGraph — client-only, lazy-loaded; static radial layout (no physics)
type EgoNetworkGraphProps = {
  center: GraphNode;
  edges: GraphEdge[]; // same data as RelationsList items, cap 24 + overflow
  onEdgeActivate: (relationId: string | null) => void; // null = derived link → explains basis
  onNodeActivate: (peopleSlug: string) => void; // navigate to that people's links page
};
```

**Page:** `/fr/peuples/{slug}/liens` — new sub-route of the people fiche; slug segment `liens` added to `src/lib/routing.ts` (fr-only, per the French-only rule; no locale switch reintroduced). Entry point: the fiche's `PeopleRelatedPeoplesSection` (Epic 2) gains a "voir tous les liens →" link plus up to 3 relation rows — additive, no redesign of the section. Data mapped by a small pure transformer `src/lib/relationsDataTransformer.ts` (Carte vivante precedent).

**Design tokens** (added to the `--afh-*` sheet; hues reference the existing calm palette — no new colors, no red):

```css
--afh-relation-linguistic: var(--afh-green); /* derived, dashed stroke */
--afh-relation-migratory: var(--afh-earth);
--afh-relation-commercial: var(--afh-gold);
--afh-relation-religious: var(--afh-terracotta);
--afh-relation-derived-dash: 4 3; /* SVG stroke-dasharray */
```

**Type roles:** people names render through `AutonymExonymHeading` variant `inline`/`card` (Fraunces 900 autonym + `lang` attribute, Nunito Sans exonym); all graph labels, badges, filters, and descriptions are Nunito Sans body/caption roles.

**Breakpoints (mobile-first 430 / 720 / 800):** at ≤ 430 px the list is primary and the graph renders full-width below it (square viewport, max-height 60 vh); at 720 px the graph gains room; at ≥ 800 px list and graph sit in a two-column layout (list left, graph right), reading-surface max-width respected. No horizontal body scroll at any width from 320 px.

**Storybook (`@storybook/react-vite`):** every new component ships stories at 430 / 720 / 800 px with fixture data marked "(illustrative, not data)": `RelationTypeBadge` (all types × derived), `RelationsList` (populated / filtered / empty / derived-only), `EgoNetworkGraph` (3 edges / 24-edge cap + overflow / keyboard-focus states / reduced-motion). axe-core runs on all stories in CI.

## Accessibility (WCAG 2.1 AA)

Accessibility is functional scope: the list equivalent ships in the same story wave as the graph, as a first-class deliverable.

### Surface 1 — `RelationsList` + type filters (the text-first equivalent)

- **Content parity:** the list carries every data point the graph shows — including derived links and the overflow beyond the graph's 24-neighbor cap. The graph never shows anything the list lacks.
- **Semantics:** `<ul>` of `<li>` rows; each row is a link/button pair (people link + `ConfidenceChip` button opening `SourceChainSheet`); filters are toggle buttons with `aria-pressed`, grouped under a `role="group"` labelled "filtrer par type de lien"; filter state reflected in the URL (shareable, UX-DR32).
- **Keyboard:** natural tab order; no roving widget needed; Enter/Space on chips and rows; focus visible per UX-DR37 (2–3 px `--afh-gold` outline).
- **SR:** each row's accessible name: type + target people (with `lang` attribute on the autonym) + period + source count; derived rows append "lien dérivé de la hiérarchie AFRIK, non sourcé individuellement".

### Surface 2 — `EgoNetworkGraph`

- **Keyboard model:** the graph container is one tab stop (`role="application"`, `aria-roledescription="graphe de relations"`, French `aria-label` naming the center people). Focus enters on the center node. Arrow Right/Left cycles edges (sorted by type, then autonym — same order as the list). Enter on an edge opens the relation detail; Enter on the focused neighbor node navigates to that people's links page. Home returns focus to the center node. Escape exits the graph to the next focusable element. No keyboard trap (NFR19).
- **SR model:** edges and nodes are real focusable SVG elements with `aria-label`s; a visually-hidden `aria-live="polite"` region mirrors each focus move: "Lien {type} avec {autonym}, {période}, {n} sources. Entrée pour ouvrir le détail." (structure illustrative, not data). On graph entry: "Graphe de relations centré sur {autonym} : {n} liens. Flèches pour parcourir les liens, Échap pour quitter." The list remains the primary SR reading path; the graph is fully operable but never the only path.
- **Visual encoding independence:** every edge pairs color + line style (solid = sourced, dashed = derived) + a text label chip; type is never conveyed by color alone (UX-DR39); monochrome print keeps meaning.
- **Touch:** every node/edge hit area ≥ 44 × 44 px via transparent padding shapes, even when the drawn glyph is smaller.

### Surface 3 — relation detail (`SourceChainSheet`, owned by Epic 1)

Reused as-is: `role="dialog"`, `aria-modal`, focus trap, return-focus-on-close (back to the triggering chip, list row, or graph edge), Esc / swipe-down / scrim-tap / hardware-back dismissal.

### Reduced motion & CI gate

- The layout is static radial — there is no force simulation to disable. The only motion (400 ms mount fade, 200 ms sheet slide) resolves to 0.01 ms opacity-only under `prefers-reduced-motion: reduce` (UX-DR4). Focus movement is instant in all modes. No animation carries meaning (NFR23).
- **axe-core CI:** all `src/components/relations/**` stories join the Vitest axe-core gate (zero serious/critical); `/fr/peuples/{sample}/liens` joins the `a11y.yml` Playwright axe-core route list. Manual pass per UX-DR43 (keyboard-only journey, VoiceOver + TalkBack + NVDA in French, 200 % zoom, reduced-motion check) before the epic closes.

## Performance

Gate: Lighthouse mobile ≥ 85 on `/fr/peuples/{sample}/liens`, added to the `lighthouse.yml` route list.

- **SSR-first, graph-last:** the list is server-rendered — LCP is text, no dataviz in the critical path. `EgoNetworkGraph` loads via `next/dynamic` (`ssr: false`) after the list is interactive; its absence loses nothing functionally (the list is complete).
- **New runtime dependencies: NONE — explicit decision.** An ego network with ≤ 24 neighbors needs a deterministic radial placement (grouped by type around a circle), which is ~100 lines of plain SVG + trigonometry. Alternatives considered: `d3-force` (~15–30 KB gz, non-deterministic layouts, physics we don't need at depth 1), `cytoscape` / `reagraph` (70 KB+ gz, WebGL/canvas complexity, poor SSR and a11y story). KISS verdict: hand-rolled SVG wins on bundle, determinism (stable keyboard order = stable visual order), and accessibility (real DOM nodes). Revisit only if full-graph exploration (Growth) demands force layouts — that decision belongs to the Growth spec, not MVP.
- **JS budget:** `EgoNetworkGraph` module ≤ 10 KB gz (same discipline as `SourceChainSheet`'s 8 KB); `RelationTypeBadge` + list interactivity ≤ 3 KB gz.
- **Query discipline:** ego endpoint = 2 batched queries (relations where `people_id_a = ? OR people_id_b = ?`; then one `IN`-batched fetch of neighbor peoples + confidence via a `getRelationsMap(peopleIds)` helper following the `getCountryRelationsMap()` precedent). No per-edge queries. Derived links = one indexed query on `languageFamilyId` with `limit`.
- **Caching:** `s-maxage=3600` on all three endpoints (relation data changes at editorial cadence); page uses ISR `revalidate: 3600`.
- **CLS:** graph container reserves its aspect-ratio box before hydration (CLS ≤ 0.1).

## Test Plan (TDD)

TDD is mandatory: each story writes its named failing test file(s) before implementation (Red → Green → Refactor). Placement per project conventions:

| Layer               | Test file (written first)                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| Relation parser/Zod | `src/lib/afrik/parsers/__tests__/relationParser.test.ts`                                        |
| Validator rules     | `scripts/__tests__/validateRelations.test.ts`                                                   |
| Loader              | `src/lib/afrik/loaders/__tests__/relationJsonLoader.test.ts`                                    |
| Supabase queries    | `src/lib/supabase/queries/afrik/__tests__/relations.test.ts`                                    |
| Handlers/services   | `src/api/v2/__tests__/relations.test.ts`                                                        |
| API routes          | `src/app/api/v2/__tests__/relations.route.test.ts`                                              |
| Transformer         | `src/lib/__tests__/relationsDataTransformer.test.ts`                                            |
| Components          | `src/components/relations/__tests__/{RelationTypeBadge,RelationsList,EgoNetworkGraph}.test.tsx` |

Component tests exercise the public interface (render + interaction via Testing Library), including the keyboard traversal contract and axe-core assertions — no internals poking, no over-mocking. Real JSON fixtures (marked illustrative) over deep Supabase mocks for parser/loader tests. Known pre-existing failures (6 migrate + 4 handler) stay out of scope. `make check` green before every story closes.

## Epic 11 Definition

**Epic goal:** Readers uncover documented, sourced links between peoples — migratory, commercial, religious — plus AFRIK-derived linguistic proximity, through a mobile-first ego-network graph whose complete list equivalent, keyboard traversal, and screen-reader narration make the "hidden links" promise accessible to everyone; every sourced edge traces to Tier 1/2 sources through the Module 0 fabric.

**FRs covered:** FR72, FR73, FR74, FR75, FR76, FR77

**Key deliverables:** `public/modele-relation.json` strict model + relation parser · REL-1..REL-7 validator rules wired into `data-integrity.yml` · pilot sourced relation corpus under `dataset/source/afrik/relations/` · migration `0NN_people_relations.sql` (`afrik_people_relations`, RLS, fabric `entity_type='relation'`) · relation loader + assertions/confidence seeding · `/v2/relations`, `/v2/relations/{id}`, `/v2/peoples/{id}/relations` endpoints + OpenAPI · `RelationTypeBadge`, `RelationsList`, `EgoNetworkGraph` L3 components · `/fr/peuples/{slug}/liens` page (list-first, graph progressive) · a11y contract (list parity + keyboard + SR) · zero new runtime dependencies.

**Depends on:** Epic 0 (CI gates), Epic 1 (fabric tables + `ConfidenceChip`/`SourceChainSheet`), Epic 2 (people fiche + `AutonymExonymHeading` + routing), Epic 6 (API conventions). Build order: after Epic 10; stories 11.1–11.4 may start early in parallel.
**Enables:** any future consumer of the people-relations model or the network-graph foundation (Growth full-graph exploration; potential cross-links from Epics 12–13 surfaces).

## Stories

### Story 11.1: Strict relation model + parser (`modele-relation.json`)

**As a** data curator,
**I want** a strict AFRIK JSON v2 model for people relations plus a typed parser,
**So that** every relation record has one non-negotiable shape before any data is authored (FR74, AR44).

**Acceptance Criteria:**

**Given** `public/modele-relation.json` does not exist
**When** I create it following the `_meta`/sections discipline of `modele-peuple.json`
**Then** it defines exactly the fields of the Data Model section (id, relationType, peopleIdA/B, direction, period, description, sources with `tier`) — no extra, no missing sections

**Given** a failing test file `src/lib/afrik/parsers/__tests__/relationParser.test.ts` written first
**When** I implement `src/lib/afrik/parsers/relationParser.ts` (Zod schema + `parseRelationFile`) and `src/types/relations.ts` (`RelationRecord`, `RelationType`)
**Then** valid fixtures parse to a typed `RelationRecord`; fixtures with `relationType: "linguistic"`, missing sources, `tier: 3`, or `peopleIdA === peopleIdB` are rejected with field-level errors

**Given** the parser fixtures
**When** reviewed
**Then** every fixture value is marked "(illustrative, not data)" in the fixture file header and none is ever loaded into Supabase

Technical notes: touches `public/modele-relation.json`, `src/lib/afrik/parsers/relationParser.ts`, `src/types/relations.ts`, parser fixtures under `src/lib/afrik/parsers/__tests__/fixtures/`. Test file first: `relationParser.test.ts`. **BLOCKING — first story of the epic; no dependency on other epics' in-flight work.** May start before Epics 7–10 finish.

---

### Story 11.2: Migration `0NN_people_relations.sql` + fabric extension

**As a** platform engineer,
**I want** the `afrik_people_relations` table with RLS plus fabric acceptance of `entity_type = 'relation'`,
**So that** relation records persist with the same security and sourcing fabric as every other entity (FR72, FR74, AR2, AR6).

**Acceptance Criteria:**

**Given** migrations currently end at `027`
**When** I add `supabase/migrations/0NN_people_relations.sql` (next free number)
**Then** it creates `relation_type` + `relation_direction` enums, the `afrik_people_relations` table with FK/CHECK constraints and indexes exactly per the Data Model sketch, is idempotent (safe to re-run), and is applied by a human via `supabase db push` — never automatically

**Given** the Module 0 fabric (`assertions`, `confidence_scores` with TEXT `entity_type`)
**When** I audit fabric Zod schemas and `recompute_confidence` for hard-coded entity-type lists
**Then** `'relation'` is accepted end-to-end (schema unions extended where needed), with a failing test first in `src/api/v2/__tests__/relations.test.ts` covering the extended union

**Given** RLS
**When** an anonymous client selects from `afrik_people_relations`
**Then** reads succeed and writes fail (service-role loader only)

Technical notes: touches `supabase/migrations/0NN_people_relations.sql`, fabric Zod schema files under `src/api/v2/schemas/` (additive union change only). **Schema story — runs FIRST and alone in the implementation wave; 11.5+ depend on it.** Independent of 11.1 (can parallelize).

---

### Story 11.3: Validator relation rules (REL-1..REL-7) + CI gate

**As a** maintainer,
**I want** `scripts/validateAfrikData.ts` to enforce the REL-1..REL-7 rules on `dataset/source/afrik/relations/`,
**So that** a relation without Tier 1/2 sources or with broken references can never merge (FR73, FR74, FR32).

**Acceptance Criteria:**

**Given** a failing test file `scripts/__tests__/validateRelations.test.ts` written first, with fixtures for each rule
**When** I implement `checkRelationModel`, `checkRelationReferences`, `checkRelationSources`, `checkRelationDuplicates` following the existing `ValidationResult` pattern
**Then** each REL rule fails/warns exactly per the Data Model table, reporting rule id + file path, hard rules failing the run and REL-6 emitting a warning only

**Given** the `data-integrity.yml` workflow
**When** the relation checks are registered in the validator's main run
**Then** a PR introducing a non-conforming relation file is blocked in CI, and the nightly FR30 URL sweep includes relation source URLs

**Given** an empty `dataset/source/afrik/relations/` directory
**When** the validator runs
**Then** it passes (zero relations is a valid state — UI stories build on whatever corpus exists)

Technical notes: touches `scripts/validateAfrikData.ts` (additive functions + main-run wiring), `scripts/__tests__/validateRelations.test.ts` (first), reuses the parser from 11.1. **BLOCKING for 11.4 — the corpus story must land against a working gate.** Depends on 11.1.

---

### Story 11.4: Pilot sourced relation corpus (data acquisition — long pole)

**As a** data curator,
**I want** an initial corpus of relation records among a small pilot set of well-documented peoples, every record Tier 1/2-sourced,
**So that** the UI stories render real, defensible data instead of placeholders (FR72, FR74).

**Acceptance Criteria:**

**Given** a pilot people set agreed with the product owner (see Open Questions; candidates are peoples whose fiches already hold high confidence scores and rich `historicalRole` sections)
**When** relations are researched with the `afrik-curator` skill under the Source Tier policy
**Then** each documented migratory / commercial / religious link becomes one `dataset/source/afrik/relations/REL_*.json` file; any candidate link lacking a Tier 1/2 source is **dropped, not authored** — no exceptions

**Given** the authored corpus
**When** `tsx scripts/validateAfrikData.ts` runs
**Then** zero REL-rule failures; every Tier 2 source records its Wikipedia cross-check path in `notes`

**Given** the corpus size
**When** the story closes
**Then** ≥ 10 relation records exist spanning ≥ 2 relation types (a floor for meaningful UI, not a target — quality over count), and a short English note in the PR describes the sourcing method per record type

Technical notes: touches `dataset/source/afrik/relations/*.json` only. No code. **BLOCKING for meaningful UI (11.8–11.11 render whatever exists, but epic sign-off requires this corpus). Editorial effort — the long pole; start as early as possible, parallel to 11.2/11.3.** Depends on 11.1 + 11.3.

---

### Story 11.5: Relation JSON loader + migration-script wiring

**As a** platform engineer,
**I want** `relationJsonLoader.ts` loading validated relation files into Supabase with fabric rows,
**So that** the dataset tree remains the single source of truth and the DB mirrors it exactly (FR72, AR44 consistency rule).

**Acceptance Criteria:**

**Given** a failing test file `src/lib/afrik/loaders/__tests__/relationJsonLoader.test.ts` written first (real fixtures, minimal Supabase mocking at the client boundary only)
**When** I implement `src/lib/afrik/loaders/relationJsonLoader.ts`
**Then** it upserts `afrik_people_relations` rows from `dataset/source/afrik/relations/`, writes one `assertions` row per relation (`entity_type='relation'`, `field_path='record'`, sources carried through), and seeds `confidence_scores` for new relations

**Given** `scripts/migrateAfrikToDatabase.ts`
**When** the relations step is registered
**Then** running the script is idempotent (re-run causes no duplicates) and logs through `@/lib/api/logger`, and a relation deleted from the source tree is flagged by the script as a DB orphan (report-only at MVP)

Technical notes: touches `src/lib/afrik/loaders/relationJsonLoader.ts`, `scripts/migrateAfrikToDatabase.ts` (additive step). Uses admin client server-side only. Depends on 11.1 + 11.2; independent of UI.

---

### Story 11.6: Relations service + derived linguistic proximity

**As a** backend engineer,
**I want** batched relation queries plus read-time derivation of linguistic-proximity links,
**So that** the ego network is served in two queries with the derived/sourced split guaranteed by construction (FR73, NFR3, N+1 discipline).

**Acceptance Criteria:**

**Given** failing tests first in `src/lib/supabase/queries/afrik/__tests__/relations.test.ts` and `src/api/v2/__tests__/relations.test.ts`
**When** I implement `src/lib/supabase/queries/afrik/relations.ts` and `src/api/v2/services/relations.ts`
**Then** `getRelationsForPeople(pplId)` returns all rows where the people is side A or B with neighbor fiche data + confidence batch-fetched via a `getRelationsMap(peopleIds)` helper (no per-edge queries), and `getDerivedLinguisticLinks(pplId, limit)` returns same-family peoples via one indexed query, excluding peoples already linked by a sourced relation

**Given** derived links
**When** returned by the service
**Then** each carries `derived: true` and `basis: "sharedLanguageFamily"`, with no period, no description, and no sources fields — the shape difference is structural, not a flag on a shared type

**Given** a people with no relations and no family peers
**When** queried
**Then** both collections return empty arrays — never null, never throws

Technical notes: touches `src/lib/supabase/queries/afrik/relations.ts`, `src/api/v2/services/relations.ts`. Depends on 11.2 (+ 11.5 for integration-level fixtures). Precedes handlers/routes.

---

### Story 11.7: `/v2` relations endpoints + OpenAPI registration

**As a** third-party integrator,
**I want** documented relations endpoints in the public API,
**So that** the relations dataset is reusable open data from day one (FR77, FR33, NFR29, NFR38).

**Acceptance Criteria:**

**Given** a failing test file `src/app/api/v2/__tests__/relations.route.test.ts` written first
**When** I create the three routes + `src/api/v2/handlers/relations.ts` + `src/api/v2/schemas/relations.ts` per the API Surface section
**Then** each returns the `{ data, meta, errors }` envelope with `meta.license = "CC-BY-SA-4.0"`, validates params in the route layer via Zod (`types`, `includeDerived`, `limit`, `offset`, `peopleId`, `periodFrom/To`), sets `s-maxage=3600` + CORS headers, and answers `404 NOT_FOUND` for unknown ids and `400 VALIDATION_ERROR` for bad params

**Given** the OpenAPI spec at `src/lib/api/openapiV2.ts`
**When** the endpoints are registered in the same PR
**Then** paths, params, response schemas (sourced vs derived shapes), and error codes are complete and the OpenAPI-diff CI gate passes

**Given** `npm run api-tests`
**When** executed
**Then** tests cover happy path, empty corpus, filters, derived-only people, unknown id, invalid params — all green

Technical notes: touches `src/app/api/v2/relations/route.ts`, `src/app/api/v2/relations/[id]/route.ts`, `src/app/api/v2/peoples/[id]/relations/route.ts`, handlers/schemas, `src/lib/api/openapiV2.ts`. Depends on 11.6. Last backend story; UI stories consume these endpoints.

---

### Story 11.8: `RelationTypeBadge` + `RelationsList` L3 components (text-first foundation)

**As a** reader,
**I want** a complete, filterable relations list with type badges and confidence chips,
**So that** the full relations information is readable by everyone before any graph exists (FR72, FR75 list-parity, UX-DR32, UX-DR48).

**Acceptance Criteria:**

**Given** failing tests first in `src/components/relations/__tests__/RelationTypeBadge.test.tsx` and `RelationsList.test.tsx`
**When** I implement both components plus `src/lib/relationsDataTransformer.ts` (with `src/lib/__tests__/relationsDataTransformer.test.ts` first)
**Then** the list renders sourced and derived items per the UX section: `AutonymExonymHeading` inline for names, `RelationTypeBadge` pairing icon + text + `--afh-relation-*` color (never color alone), period label, description, `ConfidenceChip` on sourced rows opening `SourceChainSheet`, "dérivé de la hiérarchie AFRIK" caption on derived rows

**Given** the type filter chips
**When** toggled
**Then** filtering applies with `aria-pressed` state, active filters dismissible with `×`, "tout effacer" link, and the filter state serialized to the URL (shareable)

**Given** Storybook stories at 430 / 720 / 800 px with fixtures marked "(illustrative, not data)"
**When** axe-core runs in CI
**Then** zero serious/critical violations; empty and derived-only states render calm French copy per UX-DR31

Technical notes: touches `src/components/relations/{RelationTypeBadge,RelationsList,index}.tsx`, `src/lib/relationsDataTransformer.ts`, stories, tokens addition to the `--afh-*` sheet. Depends on 11.7 (types/shapes) + Epic 1 primitives + Epic 2 `AutonymExonymHeading`. First UI story — ships before the graph by design.

---

### Story 11.9: Links page `/fr/peuples/{slug}/liens` (list-first, SSR)

**As a** reader on mobile,
**I want** a dedicated links page for each people, reachable from its fiche,
**So that** I can explore all of a people's documented links without leaving the reading experience (FR72, FR75, FR43).

**Acceptance Criteria:**

**Given** a failing route-level test first (page renders list from a fixture payload) colocated per component-test conventions
**When** I add the page under `src/app/[lang]/.../liens` and register the `liens` segment in `src/lib/routing.ts`
**Then** the page server-renders `RelationsList` with breadcrumb (AFRIK hierarchy per UX-DR29), French metadata, ISR `revalidate: 3600`, and a calm empty state when the corpus has no relations for this people

**Given** the people fiche's `PeopleRelatedPeoplesSection`
**When** the people has relation records
**Then** the section additively shows up to 3 relation rows + "voir tous les liens →" linking to the page; with zero records the section is unchanged (no dead link)

**Given** mobile 320–430 px
**When** the page renders
**Then** no horizontal scroll, tap targets ≥ 44 px, layout escalates at 720 / 800 px per the UX section

Technical notes: touches `src/app/[lang]/[section]/[item]/liens/page.tsx` (path adapted to the existing segment structure), `src/lib/routing.ts` (additive slug), `PeopleRelatedPeoplesSection` (additive block). UI copy French. Depends on 11.7 + 11.8.

---

### Story 11.10: `EgoNetworkGraph` L3 component (keyboard + SR complete)

**As a** reader,
**I want** an ego-network graph centered on one people with full keyboard traversal and screen-reader narration,
**So that** the hidden-links promise is visual AND non-visually operable in the same deliverable (FR75, FR76, NFR18, NFR19, NFR23).

**Acceptance Criteria:**

**Given** a failing test file `src/components/relations/__tests__/EgoNetworkGraph.test.tsx` written first, covering rendering, the 24-neighbor cap + overflow, keyboard traversal order, announcements, and axe-core
**When** I implement `EgoNetworkGraph.tsx` as plain SVG with a deterministic radial layout grouped by relation type — **zero new npm dependencies**
**Then** edges render with `--afh-relation-*` stroke + dash pattern for derived + text label chip; nodes render autonym labels with `lang` attributes; hit areas ≥ 44 × 44 px

**Given** keyboard focus enters the graph (`role="application"`, French `aria-label` and `aria-roledescription`)
**When** the user presses Arrow Right/Left, Enter, Home, Escape
**Then** the full keyboard model of the Accessibility section is honored — edge cycling in list order, Enter opens relation detail / navigates on node, Home recenters, Escape exits, no trap — and each focus move is announced via the `aria-live="polite"` region

**Given** `prefers-reduced-motion: reduce`
**When** the graph mounts
**Then** the mount fade resolves to 0.01 ms opacity-only and no other motion exists

**Given** Storybook stories at 430 / 720 / 800 px
**When** axe-core runs
**Then** zero serious/critical violations, including in keyboard-focused states

Technical notes: touches `src/components/relations/EgoNetworkGraph.tsx` + stories. Pure presentational (props in, callbacks out — UX-DR48). Depends on 11.8 (shared item shapes + badges). The list equivalent already shipped (11.8/11.9) — same wave, list first.

---

### Story 11.11: Graph integration + performance & a11y CI gates

**As a** maintainer,
**I want** the graph wired into the links page behind lazy loading, with Lighthouse and axe-core gates on the route,
**So that** the dataviz never degrades the mobile reading experience and regressions block merge (FR75, NFR1, UX-DR46, AR20).

**Acceptance Criteria:**

**Given** the links page from 11.9
**When** `EgoNetworkGraph` is integrated via `next/dynamic` (`ssr: false`) below the list, with a reserved aspect-ratio container
**Then** the SSR HTML contains the complete list before any graph code loads, CLS ≤ 0.1, and edge/node activation opens `SourceChainSheet` / navigates with return-focus behavior verified

**Given** `lighthouse.yml` and `a11y.yml`
**When** `/fr/peuples/{sample}/liens` is added to both route lists
**Then** Lighthouse mobile performance ≥ 85 and axe-core zero serious/critical pass in CI on the route

**Given** the bundle
**When** analyzed (`next build` output)
**Then** the lazy graph chunk is ≤ 10 KB gz and no new runtime dependency appears in `package.json`

**Given** the manual a11y pass (UX-DR43)
**When** performed on the links page (keyboard-only journey + VoiceOver + TalkBack + NVDA in French + 200 % zoom + reduced-motion)
**Then** findings are logged and blocking issues fixed before the epic closes

Technical notes: touches links page integration, `.github/workflows/lighthouse.yml` + `a11y.yml` (additive routes), no new components. Failing integration test first in the page's colocated test. Depends on 11.9 + 11.10. Final story — closes the epic.

## Out of Scope

- **Full-graph exploration** (all-corpus network, force layouts, clustering) — desktop/Growth; would require a dataviz dependency decision deferred to that spec.
- **2-hop ego networks** (`depth=2`) — Growth; MVP is direct links only (the list's people links already enable hop-by-hop exploration).
- **Map or timeline rendering of relations** — Epic 12 owns the Africa basemap and timeline scrubber; Epic 11 stores period fields but draws neither.
- **Relation editing/contribution UI** — relations are authored in the dataset tree via the curator workflow at MVP; contributor-proposed relations (a `new_relation` contribution type) is a product decision left open.
- **Pinned versions of relation records** — fiche snapshots (Epic 3) do not embed relations at MVP; the links page always shows live data.
- **Per-field assertions on relations** (`field_path` granularity beyond `'record'`), relation-level flags UX beyond what the polymorphic fabric gives for free, shared-language (ISO 639-3-level) proximity derivation, and any engagement metrics on the graph (forbidden by the dignity rule UX-DR49 regardless).
- **Visual polish beyond tokens + shadcn** — deferred to the designer-led redesign phase; this epic maximizes functional a11y, not aesthetics.

## Open Questions

1. **Pilot corpus selection (product owner + curator):** which peoples anchor the pilot? Proposed criterion — peoples with high existing confidence scores and rich, already-sourced `historicalRole` sections — but the actual list is an editorial decision to make with the `afrik-curator` workflow before 11.4 starts.
2. **Directionality semantics:** is `direction` meaningful for commercial and religious relations, or only migratory? MVP models all three with a default of `bidirectional`; confirm whether religious relations need an influence-direction nuance before the model freezes (changing `modele-relation.json` after corpus authoring is costly).
3. **Contribution pathway:** should relations enter the Epic 4 flag/correction workflow at MVP (the polymorphic fabric makes flags on `entity_type='relation'` nearly free), and should a `new_relation` contribution type be added to the contributions enum?
4. **Derived-link breadth:** same `languageFamilyId` can yield very large derived sets inside big families (e.g. FLG-level granularity only). Is the `limit`+ranking approach (MVP) acceptable, or should derivation wait for a branch-level hierarchy refinement (which would belong to the AFRIK model, not this epic)?
5. **Corpus growth target:** what relation count / people coverage constitutes "MVP done" for the dataset beyond the ≥ 10-record pilot floor? This drives how long the data-acquisition long pole runs in parallel with Epics 12–13.
