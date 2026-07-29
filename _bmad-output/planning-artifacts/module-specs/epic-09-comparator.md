# Epic 9 — Interactive Comparator (Module #7)

Pillar: **Les liens (Links)** · Access mode: **Jouer (Play)** · Product module #7
Status: **Draft — PRD addendum (FR block FR59–FR64)**

---

## Module Goal

The Interactive Comparator lets any visitor place 2–3 entities of the same type — peoples, countries, or language families — side by side and read a structured comparison built **entirely from existing published fiche data**: identity (autonym/exonym), language family, countries of presence, demographics, cultural sections, and Module #0 confidence metadata. No new dataset, no new editorial claims: the comparator is a re-projection of what the fiches already say, including what they do **not** say ("non renseigné" is a first-class value). Every comparison has a stable shareable URL and an Open Graph card so it can be posted on WhatsApp, X, or Facebook — this is a primary "engagement platform, not consultative encyclopedia" lever for the continental-African and diaspora audience. Position in the module build order 7 → 8 → **9** → 10 → 11 → 12 → 13: Epic 9 starts after Epics 7–8 but owns no shared infrastructure and depends on neither; it consumes only fiche data and the Module 0 fabric, so it can slot forward if 7/8 slip.

## Fit & Dependencies

**Builds on (hard dependencies):**

- **Epic 0** — data baseline (AR21 cleanup done, CI integrity gates green): cross-fiche comparison is meaningless on a dirty dataset. Also: security headers, Sentry, logger, Lighthouse/axe CI harness that Epic 9 stories hook into.
- **Epic 1 (Module #0 fabric)** — `confidence_scores` table (read via the existing `getConfidenceMap` batching in `src/lib/supabase/queries/afrik/module-zero-batch.ts`), `classification_status` enum, and the L3 primitives `ConfidenceChip`, `ClassificationBadge`, `SourceChainSheet`. The comparator renders these — it never re-implements confidence display.
- **Epic 2 (reading surface)** — `AutonymExonymHeading` (endonym-first names everywhere, lint-enforced per UX-DR49 #1), `/v2/search` (entity picker autocomplete for peoples and countries), reading-surface conventions (Direction D tone, `--afh-*` tokens, 430/720/800 breakpoints, calm empty states per UX-DR31).
- **Epic 6 (API conventions)** — `{ data, meta, errors }` envelope, error-code taxonomy, OpenAPI spec discipline at `src/lib/api/openapiV2.ts`, rate-limit substrate.

**Soft dependency:**

- **Epic 3 (pinned versions)** — comparisons always render **current** revisions. Pinned-version comparison (`@v{n}` columns) is explicitly out of scope; the URL scheme leaves room for it (see Out of Scope).

**Sibling shared-infra map (respected):** Epic 9 consumes existing fiche data + Module 0 fabric **only**. It does not touch Epic 7's tree dataviz, Epic 8's naming/etymology model, Epic 11's relations graph, or Epic 12/13's event model. Where the comparator shows a name or an imposed-name context, it shows the fiche's existing `appellations` / `historicalNames` content as plain fiche data — Epic 8 owns any richer naming model.

**Epic 9 OWNS (for later epics to reuse):**

- The **comparison URL scheme** `/fr/comparer/{type}/{id1}/{id2}[/{id3}]` and its canonicalization rules.
- The **OG-card generation pattern** (static template + dynamic text via `next/og` `ImageResponse`) — Epic 10 (quiz share cards) is expected to reuse this exact pattern and its font/brand assets rather than introduce a second one.
- The `EntityComparePicker` + sticky compare bar interaction pattern (reusable wherever "pick N entities" is needed later).

## User Journeys

**Journey 1 — The shared link (engagement loop, mobile 390 px, 4G).**
Dieudonné, 19, Kinshasa, receives a WhatsApp message. The preview card shows two names in Fraunces — the autonyms of two peoples _(illustrative)_ — with "Africa History · comparaison" branding. He taps. The comparison page server-renders fast on his entry-level Android: two stacked entity cards with confidence chips, then section-by-section rows (langues, pays de présence, démographie…). One cell reads "non renseigné" — he learns the site does not pretend to know. Success moment: he taps "partager" and forwards the same URL to his study group; the link he sends reconstructs the exact same comparison.

**Journey 2 — The educator builds a comparison (mobile-first authoring).**
Aïcha, teacher in Dakar, opens `/fr/comparer` on her phone. She picks "peuples", types three letters in the search field, adds a first people — a sticky bar at the bottom shows "1/3 sélectionné · comparer". She adds a second, taps "comparer" in the sticky bar. She reads the comparison, checks each entity's confidence score side by side (identical visual weight — no winner), and taps "copier le lien". Success moment: the URL goes into her course document; six months later it still renders the same comparison against the then-current fiches.

**Journey 3 — Screen-reader parity (NVDA, keyboard only).**
Marc uses NVDA. On the comparison page the entity headers are announced as column headers, each attribute as a row header; a missing value is read as "non renseigné pour {autonym}". He never encounters a keyboard trap; the share button announces "copié" politely after activation. Success moment: he can state, unaided, which of the two compared fiches documents its demography and which does not — the exact same information a sighted user gets.

## Functional Requirements

- **FR59:** Users can select 2–3 published entities of a single type (peoples, countries, or language families) and view a structured side-by-side comparison built exclusively from existing fiche data

  **Given** the picker page `/fr/comparer` on a 430 px viewport
  **When** the user selects entity type "peuples" and adds two entities via search
  **Then** a sticky compare bar shows the selection count and a "comparer" action that navigates to the comparison URL

  **Given** a selection of 2 entities of type "peuples"
  **When** the user attempts to add a country as a third entity
  **Then** the picker prevents it — only entities of the already-selected type are offered (type is fixed at first selection until cleared)

  **Given** a comparison page for 3 valid published entities
  **When** it renders
  **Then** every displayed value is traceable to a section of the underlying fiches — the comparator introduces no computed claims beyond arithmetic presentation of existing values (no estimates, no interpolation, no rankings)

- **FR60:** Users can see each compared entity's fiche-level confidence score, source count, last-verified date, and classification status side by side, presented with identical visual weight and no ranking or verdict between entities

  **Given** two compared fiches with confidence scores 82 % and 41 % _(illustrative)_
  **When** the comparison renders
  **Then** each column shows its own `ConfidenceChip` (score · source count · verified date) and `ClassificationBadge` directly under the entity heading, above the fold, with no highlighting, ordering, arrow, or color treatment that designates one entity as "better"

  **Given** a compared entity with no `confidence_scores` row
  **When** the comparison renders
  **Then** its confidence cell shows the Epic 1 unaudited-fiche treatment ("fiche non auditée") — never a fabricated score, never an empty gap

- **FR61:** Comparison cells whose underlying fiche section or field is absent display "non renseigné"; the system never fabricates, estimates, or fills a missing value, and a row missing for only some entities remains visible

  **Given** entity A documents `content.demography` and entity B does not
  **When** the demography row renders
  **Then** A's cell shows the fiche value and B's cell shows "non renseigné" with screen-reader context "non renseigné pour {autonym B}" — the row is not dropped

  **Given** a section absent from **all** compared fiches
  **When** the comparison renders
  **Then** that row is omitted entirely (no empty-noise rows)

  **Given** a numeric row (e.g., population) where one value is missing
  **When** the row renders
  **Then** no delta, total, or ratio involving the missing value is computed or displayed

- **FR62:** Every comparison has a stable shareable URL of the form `/fr/comparer/{type}/{id1}/{id2}[/{id3}]` that fully reconstructs the comparison from the path alone

  **Given** the URL `/fr/comparer/peuples/PPL_YORUBA/PPL_ZULU` _(illustrative)_
  **When** it is opened in a fresh session with no prior state
  **Then** the exact comparison renders — entity order in the path is the display order (left→right / top→bottom)

  **Given** a URL containing an unknown ID, duplicate IDs, mixed types, or fewer than 2 / more than 3 IDs
  **When** requested
  **Then** the calm 404 page renders (UX-DR31) with the comparator URL pattern explained and a link to `/fr/comparer`

  **Given** any comparison page
  **When** its `<head>` is inspected
  **Then** it carries `robots: noindex, follow` and a self-referencing canonical (the combinatorial URL space is deliberately kept out of the search index; fiche pages remain the indexed surface)

- **FR63:** Users can share a comparison to social networks with an Open Graph image generated from a static template plus dynamic entity text

  **Given** a comparison URL posted to a platform that fetches OG metadata
  **When** the platform requests the page
  **Then** it receives `og:title`, `og:description`, `og:url`, and an `og:image` (1200 × 630) rendered from the static comparator template with the entities' autonyms (exonym secondary), entity type, and the product attribution — no data beyond what the fiches contain

  **Given** the share bar on the comparison page
  **When** the user activates "partager" on a device exposing `navigator.share`
  **Then** the native share sheet opens with the canonical URL; otherwise "copier le lien" copies it and confirms with "copié" via an `aria-live="polite"` region

- **FR64:** Third-party integrators can retrieve any comparison payload via a documented `GET /v2/compare` endpoint following the standard response envelope

  **Given** `GET /v2/compare?type=peoples&ids=PPL_YORUBA,PPL_ZULU` _(illustrative)_
  **When** the request succeeds
  **Then** the response is `{ data: { entityType, entities: [...] }, meta: { license, attribution }, errors: [] }` with camelCase fields, explicit `null` for missing sections (never omitted keys), and per-entity confidence metadata

  **Given** invalid parameters (bad type, wrong ID count, duplicates)
  **When** requested
  **Then** the response is `400 VALIDATION_ERROR` with `field` pointing at the offending parameter; an unknown entity ID returns `404 NOT_FOUND`

  **Given** the OpenAPI spec at `src/lib/api/openapiV2.ts`
  **When** the endpoint ships
  **Then** the spec documents path, params, response schema, and error codes in the same PR, and the OpenAPI-diff CI gate passes

## Data Model & Sourcing

**No new dataset. No new Supabase tables. No migration.** This is a deliberate KISS decision:

- Comparisons are **stateless** — the URL is the entire state. A persisted `comparisons` table (saved comparisons, view counts) was considered and rejected: it adds writes, GDPR surface, moderation surface, and — via view counts — would violate the dignity rule (UX-DR49 #5, no engagement metrics). Nothing in FR59–FR64 needs persistence.
- The comparator **reads only**: `afrik_peoples`, `afrik_countries`, `afrik_language_families`, `afrik_people_countries` (canonical English table names per migration 006 — the French names do not exist), plus Module 0's `confidence_scores` and the `classification_status` columns. All reads go through existing services / query helpers; confidence is fetched via the existing batch helper (`getConfidenceMap`-style, `module-zero-batch.ts`) — no N+1 (AR17).

**AFRIK dependencies — comparable-row registry.** Rows are derived strictly from the strict-model sections (`public/modele-peuple.json`, `modele-pays.json`, `modele-linguistique.json`). The registry is code (a typed constant in the transformer), not data:

| Entity type | Comparable rows (source: strict-model keys)                                                                                                                                                                                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `peuples`   | identity (`nameMain` + `content.appellations` endonym/exonym), `languageFamilyId` (family link), `currentCountries` (presence links), `content.languages`, `content.origins` (presence + excerpt), `content.organization`, `content.culture`, `content.historicalRole`, `content.demography` (2025 reference year), fiche confidence + classification |
| `pays`      | identity (`nameFr` / `nameOfficial`), `etymology` + `nameOriginActor`, `content.historicalNames`, `content.kingdoms`, `content.majorPeoples` (links), `content.culture`, `content.historicalFacts`, `content.demographics`, fiche confidence + classification                                                                                         |
| `familles`  | identity (`nameFr` / `nameEn`), `content.decolonialHeader`, `content.generalInfo`, `content.associatedPeoples` (links + count), `content.linguisticCharacteristics`, `content.historyAndOrigins`, `content.distribution`, fiche confidence + classification                                                                                           |

**Individual languages (ISO 639-3) are not a comparable type at MVP.** The vision brief says "peuples, pays, langues", but individual languages have **no fiche** (no `modele-langue.json`, no `/v2/languages` endpoint, no language page). "Built entirely from existing fiche data" therefore resolves the linguistic axis to **language families** (which have fiches). Adding individual languages would require a new strict model file + `validateAfrikData.ts` extension + a sourcing campaign — a blocking data-acquisition effort belonging to a future decision, not this epic (see Open Questions).

**Source Tier policy application.** The comparator adds **zero claims**, so it adds zero sources: every displayed value inherits the sourcing of its fiche, surfaced through Module 0 (`ConfidenceChip` → `SourceChainSheet`). "Source or drop" applies transitively — if a fiche value lacks sourcing, that is Module 0's problem to surface (unaudited treatment), never the comparator's to mask. Any example content in this spec, in stories, in Storybook fixtures, and in tests is **(illustrative, not data)** and must never ship as seeded content.

**FR28-style integrity rules.** None new. The comparator renders demographic values verbatim; it must **not** re-validate, re-normalize, or "fix" sums client-side — the FR28 gate owns that upstream. One display rule: demography rows always carry the fiche's reference year label ("réf. 2025") so side-by-side numbers are not misread as same-source measurements when audit dates differ.

## API Surface

One new public endpoint, strict 3-layer pattern:

```
src/app/api/v2/compare/route.ts          → parsing (Zod), CORS, caching
  ↓
src/api/v2/handlers/compare.ts           → business logic: type dispatch, ID validation, assembly
  ↓
src/api/v2/services/comparisonService.ts → batched Supabase reads (entities + confidence map)
```

- **`GET /v2/compare`** — query params: `type` ∈ `peoples | countries | language-families` (kebab-case, matching existing route vocabulary), `ids` = comma-separated list of 2–3 canonical AFRIK IDs. Zod schema at `src/api/v2/schemas/compare.ts` (never inline in the route).
- **Response envelope** (camelCase, snake_case never leaks past the service layer):

```jsonc
// (illustrative, not data)
{
  "data": {
    "entityType": "peoples",
    "entities": [
      {
        "id": "PPL_X",
        "autonym": "…",
        "exonym": "…",
        "url": "/fr/peuples/…",
        "classificationStatus": "consensual",
        "confidence": {
          "score": 82,
          "sourceCount": 4,
          "lastHumanAuditAt": "2026-05-01T00:00:00Z",
          "openFlagCount": 0,
        },
        "sections": {
          "languageFamily": { "id": "FLG_…", "name": "…" },
          "currentCountries": ["…"],
          "origins": "…",
          "demography": null, // absent section ⇒ explicit null, key always present
          // … remaining registry keys, always present
        },
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

- **Errors** (taxonomy AR9): `400 VALIDATION_ERROR` (bad `type`, ID count ≠ 2–3, duplicates, malformed IDs — with `field`), `404 NOT_FOUND` (any unknown ID; the message names the missing ID), `429 RATE_LIMITED` (anonymous 60 req/min class), `500 INTERNAL_ERROR`.
- **Caching:** `s-maxage=3600` (aligned with people fiches — the most volatile input; AR18). No `no-store`, no auth: public read.
- **OpenAPI:** `src/lib/api/openapiV2.ts` updated in the same PR as the route (NFR38); OpenAPI-diff CI gate must pass. The web page itself does **not** call `/v2/compare` — it server-renders through the same handler function directly (one assembly code path, two transports).

## UX & Components

All components live in `src/components/compare/` (domain folder, mirroring `src/components/country/`), composed from shadcn/ui + existing L3 primitives. **Visual specification is deliberately minimal** — `--afh-*` tokens and shadcn defaults only; visual polish is deferred to the designer-led redesign phase. Functional a11y is maximal (next section).

**Type roles:** entity names via `AutonymExonymHeading` (Fraunces 900 autonym / Nunito Sans 500 exonym — never re-implemented); row labels `--afh-text-h3` Nunito Sans 600; cell values `--afh-text-body` Nunito Sans 400; "non renseigné" `--afh-text-soft` on `--afh-bg-warm`.

**Layout (mobile-first, breakpoints 430 / 720 / 800):**

- **< 720 px (canonical 430, minimum 320):** NOT a wide table. Picker = stacked selected-entity cards + sticky bottom compare bar. Comparison = sticky top strip with the 2–3 entity names (mini headers), then attribute-grouped stacking: each row renders its label once, then one value card per entity in selection order. Semantics: `<dl>` per section (see A11y). No horizontal body scroll, ever.
- **720–799 px:** 2-up column grid; 3-entity comparisons keep row-grouped stacking for the third column or switch to the overflow container below.
- **≥ 800 px:** true side-by-side grid inside the 800 px reading max-width (2 or 3 columns); rendered as a semantic `<table>`. If 3 columns cannot fit a row's content, the row's own container scrolls (`<div role="region" aria-label tabindex="0">`), never the body.

**New L3 components (props sketches):**

| Component             | Props (sketch)                                                                                                   | Notes                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `EntityComparePicker` | `{ entityType: CompareEntityType \| null, selected: CompareEntityRef[], max: 3, onAdd, onRemove, onTypeChange }` | Search-backed for peuples/pays (reuses `/v2/search`); static list (24 items) for familles. Client island.              |
| `CompareStickyBar`    | `{ selected: CompareEntityRef[], min: 2, max: 3, compareHref: string \| null }`                                  | Sticky bottom bar; "N/3 sélectionnés · comparer"; disabled until 2 selected; ≥ 44 px targets.                          |
| `ComparisonView`      | `{ data: ComparisonPageData }`                                                                                   | Server component orchestrator; consumes `transformComparisonData` output; renders `<dl>` (mobile) / `<table>` (≥ 800). |
| `CompareEntityHeader` | `{ entity: ComparisonColumn, sticky?: boolean }`                                                                 | `AutonymExonymHeading` variant `card` + `ConfidenceChip` + `ClassificationBadge`; link back to the fiche.              |
| `CompareSectionRow`   | `{ row: ComparisonRow, entities: ComparisonColumn[] }`                                                           | One comparable attribute across columns; drops itself when all values are null.                                        |
| `CompareValueCell`    | `{ value: ComparisonValue \| null, entity: ComparisonColumn }`                                                   | Renders value, entity links, or the "non renseigné" state with sr-only entity context.                                 |
| `CompareShareBar`     | `{ canonicalUrl: string }`                                                                                       | "partager" (native share when available) + "copier le lien" + "copié" `aria-live` confirmation. Client island.         |

**Data flow:** `src/lib/comparisonDataTransformer.ts` exports `transformComparisonData(entities: CompareEntityPayload[]): ComparisonPageData` — pure, unit-tested, mirroring the `countryDataTransformer` precedent. Components carry no business logic (UX-DR48).

**Microcopy (French UI, English code):** "comparer" · "ajouter à la comparaison" · "retirer" · "non renseigné" · "copier le lien" · "copié" · "partager" · "fiche non auditée" · "réf. 2025". Tone per UX-DR34: librarian, no exclamation marks, no verdict language ("plus grand que", "meilleur") anywhere.

**Storybook (`@storybook/react-vite`, NFR37):** every component above ships `*.stories.tsx` at 430 / 720 / 800 px with loaded / empty ("non renseigné" everywhere) / unaudited / 3-entity states, fixtures marked _(illustrative, not data)_; axe-core runs on each story.

## Accessibility (WCAG 2.1 AA)

Accessibility is functional scope here, not polish. The **text-first equivalent is the primary DOM**, not a fallback: the comparison is authored as semantic text structure, and any future visual embellishment (bars, sparklines) may only be an `aria-hidden` decoration of values already present as text.

**Surface 1 — Entity picker (`/fr/comparer`):**

- _Keyboard:_ search input follows the WAI-ARIA combobox pattern (`role="combobox"` + `aria-expanded` + `role="listbox"` results; Arrow keys navigate, Enter adds, Esc closes the list). Selected-entity cards each expose a "retirer {autonym}" button in tab order. The sticky bar's "comparer" control is a real `<a>`/`<button>`, reachable in DOM order (bar is sticky visually, positioned at the end of `<main>` in DOM). No keyboard trap.
- _Screen reader:_ each add/remove updates an `aria-live="polite"` region: "{autonym} ajouté à la comparaison, 2 sur 3" / "retiré". Type selector is a labelled radio group ("peuples", "pays", "familles linguistiques").
- _Text-first equivalent:_ the selection state is a plain list ("Sélection : X, Y") rendered above the sticky bar — the same information with zero interaction.

**Surface 2 — Comparison view:**

- _Semantic model:_ ≥ 800 px renders a real `<table>` with `<caption>` ("Comparaison de {A} et {B}"), `<th scope="col">` entity headers and `<th scope="row">` attribute headers — SR users get native table navigation. < 720 px renders per-section `<h2>` + `<dl>` where each `<dt>` is "{row label} — {autonym}" and `<dd>` the value; identical information, linearized. This dual rendering **is** the text-first deliverable and ships in the same story as the layout (Story 9.6), not after.
- _Missing values:_ "non renseigné" is real text (never an empty cell, never color/dash alone) with sr-only suffix "pour {autonym}" (FR61).
- _Confidence:_ `ConfidenceChip` carries its Epic 1 `aria-label` contract (full semantic: score, source count, date); opening `SourceChainSheet` from a chip keeps its Epic 1 focus-trap/return-focus behavior unchanged.
- _Keyboard:_ skip-to-content link; any horizontally scrollable row container is `role="region"` + `aria-label` + `tabindex="0"` (scrollable by arrow keys); Esc closes any sheet.
- _Announcements:_ page `<h1>` is "Comparaison : {A} · {B} (· {C})" with autonyms `lang`-tagged via `AutonymExonymHeading` semantics (UX-DR38).

**Surface 3 — Share bar:** "copié" confirmed via `aria-live="polite"`; clipboard-permission-denied falls back to a selectable URL field with hint (UX-DR12 precedent).

**Reduced motion:** sticky bar and any transition consume `--afh-duration-*` tokens, which resolve to 0.01 ms opacity-only under `prefers-reduced-motion: reduce` (UX-DR4). No motion carries meaning.

**CI gate:** the a11y workflow (Epic 0 `a11y.yml`, axe-core via Playwright) adds two routes: `/fr/comparer` and one seeded comparison URL _(illustrative sample IDs from staging data)_ — zero serious/critical violations blocks merge. Story-level axe runs cover every `src/components/compare/*.stories.tsx`.

## Performance

Gate: Lighthouse mobile ≥ 85 (Performance) on the comparator routes, added to the existing `lighthouse.yml` matrix.

- **Zero new runtime dependencies.** OG images use `ImageResponse` from **`next/og`, which is built into Next.js** — this is the decision. Alternatives considered: `@vercel/og` (same engine, now redundant as a separate package — rejected: adds a dependency for nothing), `satori` + `@resvg/resvg-js` directly (more control, two native deps, more surface — rejected: over-engineering for a static-template card), headless-browser screenshots (heavy, slow, infra — rejected). KISS verdict: the built-in wins on every axis.
- **SSR-first:** picker and comparison pages are server-rendered; the only client islands are `EntityComparePicker` (picker page only) and `CompareShareBar` (≈ 1 KB). The comparison view itself ships no interactive JS of its own — chips/sheets reuse Epic 1 bundles already cached from fiche visits.
- **Data cost:** one batched entity fetch + one batched confidence fetch per request (AR17 pattern); comparison page ISR `revalidate: 3600` aligned with fiche caching; `/v2/compare` `s-maxage=3600`.
- **OG route cost:** `opengraph-image.tsx` colocated with the comparison route; two font subsets (Fraunces 600, Nunito Sans 400, TTF — satori does not read WOFF2) loaded once at module scope; `Cache-Control` 1 day (a card may lag a fiche edit by a day — acceptable, the page itself stays fresh).
- **Budget check in AC:** comparison page total JS added by this epic ≤ 15 KB gzipped over a fiche page baseline; no CLS from sticky elements (space reserved).

## Test Plan (TDD)

TDD is mandatory: every story below names its failing-test file(s), written **before** implementation (red → green → refactor). Placement per project conventions:

| Layer                    | Test file                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| Transformer (unit)       | `src/lib/__tests__/comparisonDataTransformer.test.ts`                                        |
| OG card data prep (unit) | `src/lib/__tests__/comparisonOgCard.test.ts`                                                 |
| Routing extension (unit) | `src/lib/__tests__/routing.test.ts` (extend)                                                 |
| Service                  | `src/api/v2/services/__tests__/comparisonService.test.ts`                                    |
| Handler                  | `src/api/v2/handlers/__tests__/compare.test.ts`                                              |
| API route                | `src/app/api/v2/__tests__/compare.test.ts`                                                   |
| Components               | `src/components/compare/__tests__/components.test.tsx` (mirrors the Carte vivante precedent) |

Rules: prefer real fixtures over deep Supabase mocks (fixtures marked _(illustrative, not data)_); component tests exercise the public interface (render + roles + labels), including axe assertions on the table/`<dl>` semantics; the 6 + 4 pre-existing failures stay out of scope; `make check` green (no **new** failures) before any story is done.

## Epic 9 Definition

### Epic 9: Interactive Comparator (Module #7)

Visitors compare 2–3 peoples, countries, or language families side by side — built entirely from existing fiche data with Module 0 confidence shown per entity, "non renseigné" for anything a fiche does not document, a stable shareable URL for every comparison, and an Open Graph card that makes comparisons postable on social networks.

**FRs covered:** FR59, FR60, FR61, FR62, FR63, FR64

**Key deliverables:** `comparisonDataTransformer` + comparable-row registry derived from the strict models · `GET /v2/compare` (3-layer + Zod + OpenAPI) · `/fr/comparer` picker (stacked cards + sticky compare bar, combobox pattern) · `/fr/comparer/{type}/{id1}/{id2}[/{id3}]` SSR comparison page (`<table>` ≥ 800 px / `<dl>` mobile — text-first primary DOM) · side-by-side `ConfidenceChip`/`ClassificationBadge` with no-verdict rule · OG card via built-in `next/og` `ImageResponse` (zero new dependencies) · share bar (native share + copy) · Storybook stories 430/720/800 · axe-core + Lighthouse CI routes added.

**Depends on:** Epic 0 (data baseline + CI harness), Epic 1 (`confidence_scores`, `ConfidenceChip`, `ClassificationBadge`, `SourceChainSheet`), Epic 2 (`AutonymExonymHeading`, `/v2/search`, reading-surface conventions), Epic 6 (envelope + OpenAPI discipline). Position 7 → 8 → **9** → 10 → 11 → 12 → 13; owns no shared dataviz/data-model foundation and can start as soon as Epics 1–2 surfaces exist.
**Enables:** Epic 10 (reuses the OG-card pattern and picker interaction), social-share engagement loop.

## Stories

Ordering: no schema/migration stories exist (no new tables — deliberate). Wave 1 = pure lib (9.1), wave 2 = service → handler/route/OpenAPI (9.2–9.3), wave 3 = routing + pages + UI (9.4–9.8), wave 4 = share/OG + CI gates (9.9–9.11). Accessibility text-first semantics ship inside 9.6 (same wave as the layout), not as a follow-up.

---

### Story 9.1: `comparisonDataTransformer` + comparable-row registry

**As a** frontend engineer,
**I want** a pure transformer that turns 2–3 same-type fiche payloads into aligned comparison columns and rows,
**So that** every comparator surface (page, API, OG card) renders from one type-safe shape with uniform missing-value semantics (FR59, FR61).

**Acceptance Criteria:**

**Given** `src/lib/comparisonDataTransformer.ts` does not exist
**When** I create it test-first with `src/lib/__tests__/comparisonDataTransformer.test.ts`
**Then** it exports `transformComparisonData(entities: CompareEntityPayload[]): ComparisonPageData` plus a typed `COMPARABLE_ROWS` registry per entity type derived from the strict-model keys (peuple: appellations/origins/organization/languages/culture/historicalRole/demography…; pays: historicalNames/kingdoms/majorPeoples/culture/historicalFacts/demographics; famille: decolonialHeader/generalInfo/associatedPeoples/linguisticCharacteristics/historyAndOrigins/distribution)

**Given** an entity payload missing a section
**When** transformed
**Then** the corresponding cell value is an explicit `null` (key always present) and a row null for **all** entities is excluded from `rows` — the transformer never throws on sparse fiches

**Given** mixed entity types, fewer than 2 or more than 3 entities, or duplicate IDs
**When** `transformComparisonData` is called
**Then** it throws a typed error (`ComparisonInputError`) — upstream layers translate it to 400/404

**Given** the test suite
**When** run
**Then** ≥ 25 tests pass covering all three entity types, full/sparse/empty fixtures _(illustrative, not data)_, and the no-derived-claims rule (no computed deltas or rankings anywhere in the output shape)

**Technical notes:** New: `src/lib/comparisonDataTransformer.ts`, `src/types/compare.ts`. Test first: `src/lib/__tests__/comparisonDataTransformer.test.ts`. Mirrors `src/lib/countryDataTransformer.ts` precedent. No I/O — pure functions only. Blocking for every other story.

---

### Story 9.2: `comparisonService` batched reads

**As a** backend engineer,
**I want** a service that fetches 2–3 entities of one type plus their confidence rows in batched queries,
**So that** comparison assembly is N+1-free and reuses canonical query paths (FR59, FR60, AR17).

**Acceptance Criteria:**

**Given** `src/api/v2/services/comparisonService.ts` does not exist
**When** I create it test-first
**Then** it exposes `getComparisonEntities(type, ids)` performing exactly one batched entity read (via the existing `peopleService` / `countryService` / `languageFamilyService` query paths against `afrik_peoples` / `afrik_countries` / `afrik_language_families`) and one batched confidence read (existing `module-zero-batch.ts` map helper)

**Given** an ID with no matching row
**When** fetched
**Then** the service returns a result identifying the missing ID (no partial silent success) so the handler can emit `404 NOT_FOUND` naming it

**Given** an entity with no `confidence_scores` row
**When** fetched
**Then** its confidence field is `null` (renders as the Epic 1 unaudited treatment downstream) — never a default score

**Given** service tests with fixtures _(illustrative, not data)_
**When** `npm run api-tests` runs
**Then** query-count assertions prove ≤ 2 Supabase round-trips per comparison, and all errors log via `@/lib/api/logger` (never `console.*`)

**Technical notes:** New: `src/api/v2/services/comparisonService.ts`. Test first: `src/api/v2/services/__tests__/comparisonService.test.ts`. snake_case→camelCase mapping happens here (nothing leaks past services). Depends on 9.1 types only; blocking for 9.3.

---

### Story 9.3: `GET /v2/compare` handler + route + OpenAPI

**As a** third-party integrator,
**I want** a documented public comparison endpoint with the standard envelope,
**So that** comparisons are reusable open data, not a web-only feature (FR64, AR8, AR9, NFR38).

**Acceptance Criteria:**

**Given** the 3-layer pattern
**When** I create `src/app/api/v2/compare/route.ts`, `src/api/v2/handlers/compare.ts`, and `src/api/v2/schemas/compare.ts` test-first
**Then** the route validates `type` ∈ `peoples | countries | language-families` and `ids` (2–3 comma-separated, no duplicates) via Zod in the route layer, applies CORS from `src/lib/api/cors.ts`, and sets `s-maxage=3600`

**Given** a valid request
**When** handled
**Then** the response is `createApiResponse`-built `{ data: { entityType, entities }, meta: { license: "CC-BY-SA-4.0", attribution }, errors: [] }` with explicit `null` section values and ISO-8601 dates

**Given** invalid params / unknown ID / rate-limit breach
**When** requested
**Then** responses are `400 VALIDATION_ERROR` (with `field`), `404 NOT_FOUND` (message names the missing ID), `429 RATE_LIMITED` (with `Retry-After` + `X-RateLimit-*`) respectively — via `createApiError`, no hand-built envelopes

**Given** `src/lib/api/openapiV2.ts`
**When** the endpoint lands
**Then** the spec documents path + params + response schema + error codes in the same PR and the OpenAPI-diff CI gate passes

**Technical notes:** New: route/handler/schema files above. Tests first: `src/api/v2/handlers/__tests__/compare.test.ts` + `src/app/api/v2/__tests__/compare.test.ts` (happy path, each error, envelope shape, cache header). Handler exposes an internal `assembleComparison()` reused by the SSR page in 9.4 (one code path, two transports). Depends on 9.1 + 9.2.

---

### Story 9.4: Comparison routes + SSR page shell + metadata

**As a** reader,
**I want** stable `/fr/comparer/...` URLs that server-render a comparison from the path alone,
**So that** any shared link reconstructs the exact comparison, fast, on 4G mobile (FR62, NFR1).

**Acceptance Criteria:**

**Given** `src/lib/routing.ts` with `PageType = "countries" | "families" | "peoples" | "search"`
**When** I extend it test-first
**Then** `"compare"` is added with FR slug `comparer` (SLUGS + SLUG_TO_PAGE both updated; French-only — no locale switch reintroduced) and existing routing tests still pass

**Given** the App Router
**When** I create `src/app/[lang]/comparer/page.tsx` (picker shell, populated in 9.5) and `src/app/[lang]/comparer/[entityType]/[...ids]/page.tsx`
**Then** the catch-all validates segment shape server-side (`entityType` ∈ `peuples|pays|familles`, 2–3 IDs, no duplicates), calls `assembleComparison()` (9.3) directly — not via HTTP — and renders `ComparisonView` with ISR `revalidate: 3600`

**Given** an invalid comparison URL
**When** requested
**Then** `notFound()` renders the calm 404 (UX-DR31) — a follow-up line explains the URL pattern and links `/fr/comparer`

**Given** any comparison page `<head>`
**When** generated via `generateMetadata`
**Then** it carries a French `<title>` ("Comparaison : {A} · {B}"), description, `robots: noindex, follow`, self-canonical, and OG/Twitter tags (image wired in 9.9)

**Technical notes:** Modifies: `src/lib/routing.ts`. New: the two page files + `loading.tsx` reuse. Tests first: `src/lib/__tests__/routing.test.ts` (extend) + a page-level render test in `src/components/compare/__tests__/components.test.tsx` for the not-found branches. Entity order in path = display order; no reorder redirects (each ordering is its own stable URL — documented in code comment). Depends on 9.3.

---

### Story 9.5: `EntityComparePicker` + `CompareStickyBar` (mobile-first picker)

**As a** visitor on a phone,
**I want** to pick 2–3 same-type entities via search with a sticky compare bar,
**So that** building a comparison is a one-hand, stacked-cards flow — never a wide table (FR59, UX-DR29, UX-DR32).

**Acceptance Criteria:**

**Given** `/fr/comparer` at 430 px (and 320 px minimum)
**When** it renders
**Then** a labelled type radio group ("peuples" / "pays" / "familles linguistiques") precedes a search field; selected entities render as stacked cards each with a "retirer {autonym}" button; a sticky bottom `CompareStickyBar` shows "N/3 sélectionnés" and a "comparer" action disabled below 2 selections — no horizontal scroll

**Given** type "peuples" or "pays"
**When** the user types ≥ 2 characters
**Then** suggestions come from `/v2/search` (max 6, per UX-DR32) via TanStack Query; type "familles" renders the 24 FLG entries as a static filterable list — no search round-trip

**Given** a first entity is selected
**When** the user browses suggestions
**Then** only entities of the locked type are offered until the selection is cleared; adding a 4th is impossible (control disabled with explanation "3 maximum")

**Given** the combobox interaction
**When** driven by keyboard only
**Then** the WAI-ARIA combobox pattern holds (arrows, Enter adds, Esc closes) and each add/remove announces via `aria-live="polite"` ("{autonym} ajouté à la comparaison, 2 sur 3")

**Given** Storybook stories at 430 / 720 / 800 px
**When** axe-core runs
**Then** zero serious/critical violations

**Technical notes:** New: `src/components/compare/EntityComparePicker.tsx`, `CompareStickyBar.tsx`, hook `src/hooks/use-compare-selection.ts` (client state; no global store). Tests first in `src/components/compare/__tests__/components.test.tsx` (roles, keyboard, live-region, max-3 rule). All entity names render through `AutonymExonymHeading` (lint rule UX-DR49 #1). Sticky bar sits at end of `<main>` in DOM. Depends on 9.4 shell; `/v2/search` is Epic 2 (done).

---

### Story 9.6: `ComparisonView` orchestrator — stacked `<dl>` mobile / semantic `<table>` desktop (text-first primary DOM)

**As a** reader (sighted or using assistive technology),
**I want** the comparison rendered as semantic text structure — description lists on mobile, a real table on desktop,
**So that** the side-by-side information is identical for every reader; the text structure IS the deliverable, not a fallback (FR59, FR61, FR43, FR44, UX-DR36).

**Acceptance Criteria:**

**Given** a valid comparison at < 720 px
**When** rendered
**Then** a sticky top strip shows the 2–3 entity mini-headers, and content stacks per section: `<h2>` section title, then a `<dl>` where each `<dt>` reads "{row label} — {autonym}" and each `<dd>` the value — reading order groups values of one row together (comparison preserved when linearized)

**Given** ≥ 800 px
**When** rendered
**Then** the same data renders as a `<table>` with `<caption>`, `<th scope="col">` per entity (via `CompareEntityHeader`), `<th scope="row">` per attribute, inside the 800 px reading max-width; any overflowing row scrolls inside its own `role="region"` `aria-label` `tabindex="0"` container — the body never scrolls horizontally

**Given** a cell whose fiche section is absent
**When** rendered by `CompareValueCell`
**Then** it shows the text "non renseigné" (`--afh-text-soft` on `--afh-bg-warm`) with sr-only "pour {autonym}"; a row null for all entities does not render; no delta or total involving a missing value ever renders

**Given** relational rows (languageFamily, currentCountries, majorPeoples, associatedPeoples)
**When** rendered
**Then** values are links to the corresponding fiches (FR4 navigation continuity)

**Given** demography rows
**When** rendered
**Then** values are shown verbatim from the fiche with the "réf. 2025" caption — no client-side normalization, no invented figures

**Given** Storybook stories (2-up, 3-up, sparse, all-null-rows-dropped) at 430 / 720 / 800 px
**When** axe-core runs
**Then** zero serious/critical violations, and table/dl semantics are asserted in component tests

**Technical notes:** New: `src/components/compare/ComparisonView.tsx`, `CompareSectionRow.tsx`, `CompareValueCell.tsx`, `index.ts` barrel. Server components (no client JS). Tests first in `src/components/compare/__tests__/components.test.tsx` (semantics via Testing Library roles: `table`, `columnheader`, `rowheader`, `definition`). Consumes 9.1 output. Depends on 9.1, 9.4.

---

### Story 9.7: Side-by-side confidence — `CompareEntityHeader` with no-verdict rule

**As a** visitor,
**I want** each compared entity's confidence score, source count, verification date, and classification shown side by side with identical visual weight,
**So that** transparency travels into the comparison without becoming a ranking (FR60, FR6, UX-DR8, UX-DR9, dignity rule UX-DR49 #5).

**Acceptance Criteria:**

**Given** entity headers render
**When** compared entities have different scores (e.g., 82 % vs 41 % _(illustrative)_)
**Then** each `CompareEntityHeader` shows its own `ConfidenceChip` (score · N sources · vérifié date, full Epic 1 `aria-label` contract) and `ClassificationBadge` above the fold, with **no** highlighting, sorting, arrows, deltas, or color emphasis distinguishing higher from lower — asserted by a test that the rendered output contains no comparative markup or copy

**Given** an entity without a `confidence_scores` row
**When** rendered
**Then** the header shows the Epic 1 unaudited treatment ("fiche non auditée") in the chip slot — the slot is never empty, never fabricated

**Given** a chip is tapped/activated (Enter/Space)
**When** the interaction completes
**Then** the Epic 1 `SourceChainSheet` opens for that fiche with its standard focus trap and return-focus behavior — the comparator adds no bespoke sheet

**Given** a caption below the confidence band
**When** rendered
**Then** a tertiary link "comment ce score est calculé" points to the Epic 1 confidence explainer (FR11 surface)

**Technical notes:** New: `src/components/compare/CompareEntityHeader.tsx`. Tests first in `src/components/compare/__tests__/components.test.tsx` (unaudited state, no-verdict assertion, chip aria-label passthrough). Reuses Epic 1 components as-is — zero re-implementation. Depends on 9.6.

---

### Story 9.8: Comparator keyboard/SR journey pass + axe CI routes

**As a** keyboard and screen-reader user,
**I want** the full picker → comparison → share journey operable and announced in French,
**So that** the comparator meets WCAG 2.1 AA as functional scope, gated in CI (FR44, NFR18–NFR22, UX-DR43).

**Acceptance Criteria:**

**Given** the a11y CI workflow (Epic 0 `a11y.yml`, axe-core via Playwright)
**When** I add `/fr/comparer` and one seeded comparison route _(illustrative staging IDs)_ to its route list
**Then** zero serious/critical violations blocks merge on both routes

**Given** a keyboard-only pass of the full journey (type → search → add ×2 → compare → open a chip sheet → close → share)
**When** executed and documented per the PR checklist (UX-DR45)
**Then** no keyboard trap exists, focus is always visible (2 px `--afh-gold` outline), and skip-to-content works on both pages

**Given** NVDA or VoiceOver in French
**When** traversing a comparison
**Then** entity autonyms are pronounced via their `lang` attributes, missing values read "non renseigné pour {autonym}", and the manual pass on the defining flow is recorded in the PR

**Given** 200 % zoom at 320 / 430 / 720 / 800 px and `prefers-reduced-motion: reduce`
**When** checked
**Then** no horizontal body scroll appears and all comparator motion resolves to the reduced-motion tokens

**Technical notes:** Modifies: a11y workflow route list only. Test first: extend `src/components/compare/__tests__/components.test.tsx` with axe assertions (vitest-axe on rendered ComparisonView + picker) before wiring CI. This story is the same wave as 9.5–9.7 (a11y ships with the surface, not after); it is the release gate for the UI wave. Depends on 9.5, 9.6, 9.7.

---

### Story 9.9: OG comparison card via `next/og` `ImageResponse`

**As a** visitor sharing a comparison,
**I want** the link to unfurl into a branded card with the compared autonyms,
**So that** a comparison posted on social networks carries the endonym-first posture into the feed (FR63, AR30).

**Acceptance Criteria:**

**Given** the decision record in this spec (built-in `next/og` chosen over `@vercel/og` package / raw satori+resvg / browser screenshots)
**When** I implement `src/app/[lang]/comparer/[entityType]/[...ids]/opengraph-image.tsx`
**Then** it renders a 1200 × 630 card from a static template + dynamic text — autonyms (Fraunces 600 subset) with exonyms secondary (Nunito Sans 400 subset), entity-type label, per-entity confidence score as plain text, and the product attribution from the brand source of truth (AR30) — with **zero new package.json dependencies**

**Given** the card data
**When** assembled
**Then** it comes from a pure `buildComparisonOgCard(data: ComparisonPageData): OgCardProps` in `src/lib/comparisonOgCard.ts`, unit-tested first — long autonyms truncate with ellipsis at a tested character budget, "fiche non auditée" replaces a missing score, and nothing beyond fiche data appears

**Given** an invalid comparison path
**When** the OG route is hit
**Then** it returns 404 (no fallback card for non-existent comparisons)

**Given** the page metadata (9.4)
**When** a crawler fetches a comparison URL
**Then** `og:image`, `og:title`, `og:description`, `og:url`, and `twitter:card=summary_large_image` resolve; the image response carries `Cache-Control` of 1 day

**Technical notes:** New: `opengraph-image.tsx`, `src/lib/comparisonOgCard.ts`, TTF font subsets under `src/app/[lang]/comparer/_fonts/` (satori cannot read WOFF2; subsets kept < 100 KB each). Test first: `src/lib/__tests__/comparisonOgCard.test.ts` (pure data prep — truncation, unaudited, attribution); the `ImageResponse` render itself is smoke-checked manually + via the Lighthouse run. Depends on 9.1, 9.4.

---

### Story 9.10: `CompareShareBar` — native share + copy link

**As a** visitor,
**I want** one-tap sharing of the comparison URL,
**So that** the engagement loop (read → compare → share) closes on mobile (FR63, UX-DR12 precedent, UX-DR27).

**Acceptance Criteria:**

**Given** a comparison page on a device exposing `navigator.share`
**When** "partager" is activated
**Then** the native share sheet opens with the canonical comparison URL and the French title

**Given** no Web Share support (desktop)
**When** "copier le lien" is activated
**Then** the URL is written to the clipboard and "copié" is confirmed in an `aria-live="polite"` region — calm, inline, no toast on the reading surface

**Given** clipboard permission is denied
**When** copy fails
**Then** a selectable read-only URL field appears with the hint "sélectionner manuellement" — never a dead end

**Given** the share bar
**When** rendered at 430 px
**Then** targets are ≥ 44 × 44 px, buttons are text-labelled (no icon-only per UX-DR26), and the client-island JS cost is ≤ 2 KB gzipped

**Technical notes:** New: `src/components/compare/CompareShareBar.tsx` (`"use client"`). Tests first in `src/components/compare/__tests__/components.test.tsx` (share/copy/denied branches with stubbed `navigator`). Storybook story at 430/720/800. Entry-point placement in global nav is a PO decision (see Open Questions) — this story ships the on-page affordance only. Depends on 9.4; pairs with 9.9.

---

### Story 9.11: Performance gate — Lighthouse routes, bundle budget, Storybook coverage check

**As a** maintainer,
**I want** the comparator held to the same CI budgets as the fiches,
**So that** the engagement surface never degrades the 4G mobile experience the audience depends on (NFR1, NFR37, UX-DR46, AR20).

**Acceptance Criteria:**

**Given** the Lighthouse CI workflow (Epic 0 `lighthouse.yml`)
**When** I add `/fr/comparer` and a seeded comparison route _(illustrative staging IDs)_ to its matrix
**Then** Performance ≥ 85 (mobile profile) blocks merge on both, with LCP ≤ 2.5 s / CLS ≤ 0.1 / INP ≤ 200 ms

**Given** the comparison page bundle
**When** analyzed against a people-fiche baseline
**Then** epic-added client JS is ≤ 15 KB gzipped (picker island excluded — picker page measured separately), documented in the PR

**Given** sticky elements (compare bar, entity strip)
**When** the page loads
**Then** space is reserved — CLS contribution 0 from stickies

**Given** the Storybook missing-story CI check (NFR37)
**When** run
**Then** every component in `src/components/compare/` has a story at 430 / 720 / 800 px and `npm run build-storybook` passes

**Technical notes:** Modifies: `lighthouse.yml` matrix only; no app code expected (this story is the measurement + any resulting fixes). Test-first framing: the failing state is the CI gate itself (red on route addition before optimizations land). Final story of the epic; depends on all UI stories.

---

## Out of Scope

- **Individual-language (ISO 639-3) comparison** — no language fiche exists (no `modele-langue.json`, no `/v2/languages`, no language page). Requires a new strict model + `validateAfrikData.ts` extension + sourcing campaign before it can exist; deferred pending the Open Question below.
- **Pinned-version comparison** (`@v{n}` columns) — comparisons always render current revisions; the URL scheme does not preclude adding `@v{n}` per ID at Growth.
- **Saved / named comparisons, comparison history, view counts, "most compared" lists** — stateless by design; counts would violate the dignity rule (UX-DR49 #5).
- **Cross-type comparison** (a people vs a country) — same-type only; cross-type is a category error, not a feature.
- **More than 3 entities** — layout and OG template are designed for 2–3; 4+ is a different product decision.
- **Verdict/diff visualizations** (bars scaling one entity against another, "winner" highlights, similarity scores) — conflicts with the no-ranking posture; any future dataviz must keep the text structure primary.
- **Comparison export (PDF/CSV)** — Growth; the stable URL + `/v2/compare` cover reuse at MVP.
- **Visual polish beyond tokens + shadcn defaults** — deferred to the designer-led redesign phase; this epic ships functionally complete, visually minimal.

## Open Questions

1. **"Langues" scope (PO decision):** the vision brief promises "peuples, pays, langues côte-à-côte". Does language-family comparison satisfy the linguistic axis at MVP, or does the PO want an individual-language fiche surface first (a new strict model + dataset + sourcing effort — a separate epic-level dependency)?
2. **Global-nav entry point:** UX-DR29 fixes the top-bar items (pays · peuples · familles · about · doctrine · API). Does "comparer" join the top bar, live under a future "Jouer" grouping, or remain reachable via fiche-level links + direct URL only at MVP?
3. **Fiche-level entry affordance:** should people/country/family fiches gain a tertiary "comparer" link (touches Epic 2's `PeopleDetailViewV2` and the country page)? Proposed as a one-line follow-up story once the PO confirms placement.
4. **OG card branding:** the card must carry the product name, but naming ("Africa History") is still a working title. Confirm the AR30 brand single-source-of-truth (`src/lib/brand.ts` or env) exists before 9.9, or accept the working name baked into the template with a tracked rebrand task.
5. **Row order & editorial labels:** the comparable-row registry derives rows from the strict models, but the display order and French row labels ("origines", "organisation sociale", …) deserve an editorial pass — confirm with the content owner before 9.6 freezes them.
