# Epic 7 — Language Family Page & Interactive Classification Tree

**Pillar: Explore · Module #2 — Language Family Page & Interactive Tree**
Status: Draft — PRD addendum (FR block FR47–FR52)

---

## Module Goal

Ship rich language-family (FLG) pages plus the flagship dataviz of the Explore pillar: an interactive, keyboard-navigable, screen-reader-complete hierarchical tree of the AFRIK classification (family → languages → peoples). The data already exists — 24 FLG fiches, the `afrik_languages` tier, and 924 people fiches in Supabase — but today it is only served as flat lists; the AFRIK hierarchy, the project's core intellectual contribution, is invisible. This epic makes that hierarchy explorable and _citable_: every node deep-links to its fiche, contested groupings carry their `ClassificationBadge`, and a server-rendered text-list equivalent delivers the same information without JavaScript — the a11y-first surface, not a fallback. Epic 7 also OWNS the reusable hierarchical-tree dataviz foundation (`HierarchyTree` in `src/components/system/`) that later Explore modules may reuse. Build-order position: Epic 7 is the **first** of the module wave 7 → 8 → 9 → 10 → 11 → 12 → 13 (data-acquisition stories of 11/12/13 may start early in parallel).

## Fit & Dependencies

**Builds on (existing, DONE or ready-for-dev):**

- **Epic 0 — Trustworthy Data Baseline:** CI data-integrity gates (`scripts/validateAfrikData.ts`, `data-integrity.yml`), structured logger, security headers, migrations runbook (AR45).
- **Epic 1 — Module 0 fabric:** `sources` / `assertions` / `confidence_scores` tables; `ConfidenceChip`, `ClassificationBadge`, `SourceChainSheet`, `DoctrineLinkCard` components (live under `src/components/source-transparency/`); `classification_status` enum on `afrik_language_families` and `afrik_peoples` (AR32); `--afh-*` design tokens.
- **Epic 2 — Reading surface conventions:** Carte vivante orchestrator pattern (`CountryDetailViewV2` precedent in `src/components/country/`), Direction D prose-with-inline-chips (UX-DR18), `AutonymExonymHeading`, breadcrumbs exposing the AFRIK hierarchy (UX-DR29), Lighthouse/axe CI gates.
- **Epic 3 — Pinned versions (already live on the family route):** `src/app/[lang]/familles/[slug]/page.tsx` already parses `@v{n}` slugs and renders revision snapshots. Epic 7's V2 orchestrator **must preserve** that snapshot path unchanged.

**Consumes from siblings (7–13):** nothing — Epic 7 is first in the wave.

**OWNS for others (shared-infra ownership map):**

- The **hierarchical-tree dataviz foundation**: `HierarchyTree` (WAI-ARIA tree pattern, roving tabindex, lazy branch loading) + `HierarchyTextIndex` (semantic nested-list equivalent), both generic and props-driven, in `src/components/system/`. Epics 9/10 may reuse them for grouped browsing surfaces. Epic 11's network graph and Epic 12's map/timeline are **separate** foundations owned by those epics — `HierarchyTree` renders strict hierarchies only and must not grow graph features.

**Does NOT own:** naming/etymology data model (Epic 8), people-relations model (Epic 11), spatio-temporal event model (Epic 12).

## User Journeys

**Journey 1 — Amina, diaspora student, mid-range Android (390 px, 4G).**
From the Bakongo people fiche she taps the breadcrumb "FLG_BANTU". The family page renders instantly (SSR): autonym-first hero, confidence chip, decolonial header explaining who coined the term "Bantu" and why the appellation history matters. She scrolls to "Classification" — a collapsed tree showing the family root and its language branches with people counts. She expands one branch; the peoples under it stream in (lazy load), each with its classification badge where contested. **Success moment:** she taps a people node and lands on its fiche — and the back button returns her to the same expanded branch.

**Journey 2 — M. Diallo, history teacher, NVDA screen-reader user on desktop.**
He opens `/fr/familles/FLG_MANDE` and activates the "voir en liste" view. The classification renders as nested semantic lists: family, then languages as sub-headings, then peoples as links — identical information to the tree, fully readable with arrow keys and heading navigation, zero JavaScript required. **Success moment:** he copies the list structure into his lesson plan and cites the page.

**Journey 3 — Curious reader on the families index.**
From `/fr/familles` she opens a family flagged `contested`. The `ClassificationBadge` on the hero links to the doctrine explanation; the tree shows which peoples inside the family are themselves contested. **Success moment:** she understands _that the classification itself is a debate_ — the decolonial point — without leaving the page.

## Functional Requirements

- **FR47:** Users can view a complete language-family fiche with structured sections (decolonial header, general information, linguistic characteristics, history and origins, speaker distribution, associated peoples, sources)

  **Given** a published FLG fiche
  **When** a visitor opens `/fr/familles/{id}`
  **Then** the page server-renders the sections of the strict model `public/modele-linguistique.json` in order — decolonial header (historical appellations, origin of the term, why problematic, self-appellation), general info, linguistic characteristics, history and origins, distribution, associated peoples, sources — omitting empty sections gracefully (UX-DR31)

  **Given** the fiche has a confidence score and classification status
  **When** the hero renders
  **Then** the fiche-level `ConfidenceChip` and (when status ≠ `consensual`) the `ClassificationBadge` appear above the fold (FR6, FR23)

  **Given** a pinned-version URL `/fr/familles/{id}@v{n}`
  **When** requested
  **Then** the snapshot renders through the existing revisions path exactly as today — the V2 layout must not regress pinned rendering (FR19)

- **FR48:** Users can explore an interactive hierarchical tree of the AFRIK classification (family → languages → peoples) on each family page, with branches collapsed by default on mobile and large branches loaded lazily

  **Given** a family page on a mobile viewport (< 720 px)
  **When** the classification section renders
  **Then** the tree shows the family root plus its language branches collapsed, each labelled with its people count, and no people nodes are fetched yet

  **Given** a language branch with many peoples (the Bantu family is the reference large case)
  **When** the user expands the branch
  **Then** its people nodes load lazily via the branch API, paginated, with an inline "charger la suite (N restants)" affordance — the initial page payload never embeds the full 924-people corpus

  **Given** peoples of the family whose language linkage resolves to no language row in `afrik_languages`
  **When** the tree renders
  **Then** they appear under an explicit group node "peuples sans langue référencée (N)" — never silently dropped, never attached to an invented language node

- **FR49:** Users can read a text-list equivalent of the classification tree that carries the same information as the tree — structure, counts, classification badges, and deep links — and is fully operable without JavaScript

  **Given** a family page requested with JavaScript disabled
  **When** the classification section renders
  **Then** a server-rendered nested-list index (family → languages → peoples) is present with every deep link functional and every classification badge visible

  **Given** a visitor using the interactive tree
  **When** they activate the "voir en liste" toggle
  **Then** the same data renders as the text index, the choice persists for the session, and no data is refetched

- **FR50:** Users can navigate from any people node of the tree or list to its fiche, and from the family page to its countries of distribution, and return to the same expanded branch

  **Given** an expanded language branch
  **When** the user activates a people node
  **Then** they navigate to `/fr/peuples/{id}` and browser back restores the family page with the same branch expanded and scroll position preserved (UX-DR29)

  **Given** a branch expanded in the tree
  **When** the user copies the page URL
  **Then** the URL encodes the expansion state (e.g. `?branche={iso639_3}`) and opening it restores that branch expanded — every explored state is shareable

  **Given** the distribution section lists countries
  **When** a country entry is activated
  **Then** it deep-links to `/fr/pays/{iso3}`

- **FR51:** Users can see classification-status badges on contested, colonial-legacy, or reconstructive families and peoples directly on tree and list nodes, with the inline explanation per FR23

  **Given** a people with `classification_status` ≠ `consensual`
  **When** its node renders in the tree or the text index
  **Then** the `ClassificationBadge` (Epic 1) renders beside the name — icon + text + color, never color alone (UX-DR39), never red (UX-DR3)

  **Given** a family with `classification_status` ≠ `consensual`
  **When** the tree root renders
  **Then** the badge appears on the root node and links to the doctrine explanation (`DoctrineLinkCard` pattern)

- **FR52:** The system validates classification-tree integrity — every language row references a valid family, every people-language linkage references a valid ISO 639-3 code, and peoples without a resolvable language linkage are reported explicitly

  **Given** `scripts/validateAfrikData.ts` runs (locally or in `data-integrity.yml`)
  **When** an `afrik_languages` row references a non-existent `family_id`, or a people's `content.languages.isoCodes` entry is not a valid ISO 639-3 code
  **Then** the validator reports an FR52 error and CI blocks the merge (FR32 pattern)

  **Given** peoples whose `isoCodes` match no language row of their family
  **When** the validator runs
  **Then** it emits a per-family FR52-coverage report (linked / unlinked counts) as a soft warning — a data-quality signal, not a hard gate, until the language tier is complete

## Data Model & Sourcing

**AFRIK dependencies (existing — no new dataset type):**

| Table                     | Role in the tree        | Key columns used                                                                                      |
| ------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `afrik_language_families` | Root nodes (24 rows)    | `id`, `name_fr`, `name_en`, `classification_status`, `content` (JSONB per `modele-linguistique.json`) |
| `afrik_languages`         | Middle tier             | `id` (ISO 639-3), `name`, `family_id`, `content`                                                      |
| `afrik_peoples`           | Leaf nodes (924 rows)   | `id`, `name_main`, `language_family_id`, `classification_status`, `content.languages.isoCodes`        |
| `afrik_people_countries`  | Distribution deep links | `people_id`, `country_id`                                                                             |

The tree is **assembled, not stored**: peoples attach under the language rows of their family whose `id` appears in their `content.languages.isoCodes`; non-matching peoples form the explicit "unlinked" group. No denormalized tree table, no materialized view — at 924 peoples / 24 families the service-layer grouping is well within NFR3 budgets (KISS; revisit only if NFR16's 10× scale breaks it, which pagination already anticipates).

**No new strict model file is required** — `public/modele-linguistique.json` and `public/modele-peuple.json` already carry every field the tree consumes. Consequently the blocking data stories for this epic are the **validator extension (FR52)** and the **language-tier audit** (Story 7.2), not a model-authoring story.

**Migration sketch** (numbered placeholder — next free number, `028` as of this writing; idempotent; applied by a human via `supabase db push` per AR45):

```sql
-- 0NN_language_tree_support.sql
-- 006 already indexes afrik_languages(family_id), afrik_peoples(language_family_id),
-- and name_main standalone — no FK index is missing. The single addition is the
-- composite serving branch pagination's ORDER BY name_main within one family.
-- Speculative at 924 rows (the planner may ignore it); added as a cheap, idempotent
-- forward bet on NFR16's 10× scale.
CREATE INDEX IF NOT EXISTS idx_afrik_peoples_family_name
  ON afrik_peoples(language_family_id, name_main);
```

No new tables, no new columns, no enum changes. `classification_status` already exists on families and peoples (migration 010 / AR32); the language tier has none — see Open Questions.

**Source Tier policy application ("source or drop"):**

- Every `afrik_languages` row surfaced in the tree must be traceable to **Tier 1** (Glottolog or SIL Ethnologue — the canonical authorities for ISO 639-3 and genetic classification) or **Tier 2** (primary source located via ≥ 2 Wikipedia language versions, primary URL cited, path recorded in `notes`). A language row that cannot be backed is **removed from the dataset**, and its peoples fall into the explicit "unlinked" group — the tree never displays an unsourced classification claim.
- Story 7.2 performs this audit. It produces a gap report, not invented rows: if the audit finds a family whose language tier is empty, the tree for that family renders root → "peuples sans langue référencée (N)" honestly.
- Example node path — _FLG_BANTU → kikongo → PPL_BAKONGO_ — is **(illustrative, not data)**: the actual membership must come from the audited dataset, never from this spec.

**FR52 integrity rules (FR28-style):** hard-gate — invalid `family_id` FKs, malformed ISO 639-3 codes, duplicate language ids; soft warning — per-family people→language coverage below 100 %. The soft warning hardens into a gate only by an explicit later decision (mirror of the FR28 [95,105] → [99,101] tightening path, `docs/adr/0001`).

## API Surface

Two new read endpoints, both following the 3-layer pattern (route → handler → service), both anonymous-read with IP rate limiting, both wrapped in the AR8 envelope `{ data, meta: { license, attribution, ... }, errors: [] }` via `createApiResponse` in `src/api/v2/utils/response.ts`. Zod param schemas live in `src/api/v2/schemas/` (never inline in routes). Every route change updates `src/lib/api/openapiV2.ts` in the same PR (NFR29, NFR38).

| Path                                         | Method | Purpose                                                                                                                                                          | Cache                                     |
| -------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `/api/v2/language-families/{id}/tree`        | GET    | Tree skeleton: family root (name, status, confidence ref) + language branches with `peopleCount` + `unlinkedPeopleCount`. No people nodes.                       | `s-maxage=86400` (stable-reference class) |
| `/api/v2/language-families/{id}/tree/branch` | GET    | Children of one branch: `?language={iso639_3}` or `?group=unlinked`, plus `limit`/`offset`. Returns people nodes `{ id, nameMain, classificationStatus, href }`. | `s-maxage=3600` (peoples class)           |

Layering:

```
src/app/api/v2/language-families/[id]/tree/route.ts          → parsing, CORS (src/lib/api/cors.ts), cache headers
src/app/api/v2/language-families/[id]/tree/branch/route.ts
  ↓
src/api/v2/handlers/languageFamilyTree.ts                    → business logic (grouping, unlinked bucket, 404/422)
  ↓
src/api/v2/services/languageFamilyTreeService.ts             → Supabase queries via src/lib/supabase/queries/afrik/
```

Error semantics (AR9): unknown `{id}` → `404 NOT_FOUND`; `language` param that is well-formed ISO 639-3 but not a language of this family → `422 SEMANTIC_ERROR`; malformed params → `400 VALIDATION_ERROR`; anonymous limit exceeded → `429 RATE_LIMITED` with `Retry-After` + `X-RateLimit-*`.

N+1 discipline (AR17): the skeleton service issues exactly three queries (family, languages by family, peoples by family) and groups in memory — never one query per language. The branch service issues one paginated peoples query.

## UX & Components

Visual specification is deliberately minimal (tokens + shadcn/ui; visual polish is deferred to the designer-led redesign phase). Functional a11y is maximal — see next section.

**New components:**

| Component                    | Location                                               | Role                                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HierarchyTree`              | `src/components/system/HierarchyTree.tsx`              | **Owned foundation.** Generic WAI-ARIA tree: roving tabindex, `aria-expanded`, lazy `loadChildren`. No business logic (UX-DR48) — data arrives via props/callback.                                   |
| `HierarchyTextIndex`         | `src/components/system/HierarchyTextIndex.tsx`         | **Owned foundation.** Semantic nested `<ol>` rendering of the same node shape. SSR-first; zero JS.                                                                                                   |
| `LanguageFamilyDetailViewV2` | `src/components/family/LanguageFamilyDetailViewV2.tsx` | Carte vivante orchestrator replacing `LanguageFamilyDetailView` in the live route (pinned snapshot path preserved).                                                                                  |
| Section components           | `src/components/family/`                               | `FamilyHero`, `FamilyDecolonialHeader`, `FamilyLinguisticTraits`, `FamilyHistorySection`, `FamilyDistributionSection`, `FamilyClassificationTreeSection`, `FamilySourcesFooter` + `index.ts` barrel. |
| `familyDataTransformer`      | `src/lib/familyDataTransformer.ts`                     | Pure transformer `LanguageFamily → FamilyPageData` (mirrors `countryDataTransformer.ts`).                                                                                                            |

**`HierarchyTree` props sketch:**

```ts
interface HierarchyNode {
  id: string;
  label: string;
  labelLang?: string; // ISO 639-3 for lang= attribute (UX-DR38)
  badge?: ClassificationStatus | null;
  href?: string; // leaf deep link; absent on branch nodes
  childCount?: number; // renders "(N)" and drives expandability
  children?: HierarchyNode[]; // preloaded children (SSR skeleton)
}

interface HierarchyTreeProps {
  root: HierarchyNode;
  loadChildren?: (node: HierarchyNode) => Promise<HierarchyNode[]>; // lazy branches
  defaultExpandedIds?: string[]; // from URL ?branche=
  onExpandedChange?: (ids: string[]) => void; // syncs URL state
  labelledById: string; // aria-labelledby target
}
```

People labels render through `AutonymExonymHeading` variant `inline` (UX-DR49 rule 1 — no bare people-name strings). Lazy fetching uses TanStack Query in the family-page wrapper, not inside `HierarchyTree`.

**Tokens & type:** reuse `--afh-*` only; new additions limited to `--afh-tree-indent`, `--afh-tree-guide` (guide-line color, from `--afh-border`), `--afh-tree-node-min-h: 44px` (touch target, UX-DR37). Family name in hero: Fraunces weight 900 with `lang` attribute where the label is an endonym; tree/list nodes, counts, badges: Nunito Sans. No raw hex, no raw px outside tokens.

**Breakpoints (mobile-first 320–430 px first):** mobile < 720 px — tree collapsed to root + language tier, single column, "voir en liste" toggle above the tree; tablet `md` 720 px — same structure, wider indent; desktop `xl` 800 px — reading-surface max-width cap, tree may render with the first branch pre-expanded when the URL requests it. All media queries `min-width` only.

**Storybook (`@storybook/react-vite`, AR40):** every new component ships a story at 430 / 720 / 800 px. `HierarchyTree` stories cover: skeleton-only, expanded branch, lazy-loading state, unlinked group, badge-carrying nodes, keyboard demo. `HierarchyTextIndex` story renders the same fixture for visual parity review.

**French UI copy (app is French-only, `Language = "fr"`):** "classification", "voir en liste" / "voir en arbre", "développer" / "réduire", "N peuples", "peuples sans langue référencée", "charger la suite (N restants)", "branche chargée" (live-region), badges per Epic 1 copy. Tone per UX-DR34 (librarian, action infinitives, no exclamation marks).

## Accessibility (WCAG 2.1 AA)

Accessibility is functional scope for this epic: the text-first equivalent ships **in the same story wave as the tree** (Stories 7.8/7.9/7.10), and the tree itself must be independently operable.

**Surface 1 — `HierarchyTextIndex` (the text-first equivalent, first-class deliverable):**

- Server-rendered nested `<ol>`/`<li>` with real `<a>` links — the same nodes, counts, badges, and deep links as the tree. This is the default content when JS is absent and the target of the "voir en liste" toggle. It is _the_ citable, printable, crawlable form of the classification — not a degraded copy.
- Language sub-headings are list items with visible text, people links carry `AutonymExonymHeading` inline semantics; endonym labels carry `lang="{iso-639-3}"` (UX-DR38).
- Fully operable with screen-reader list/heading navigation; zero interactive JS required.

**Surface 2 — `HierarchyTree` (interactive tree):**

- Roles: container `role="tree"` + `aria-labelledby`; nodes `role="treeitem"` with `aria-level`, `aria-setsize`, `aria-posinset`; branch nodes `aria-expanded="true|false"`; child groups `role="group"`.
- Keyboard model (WAI-ARIA APG tree, roving tabindex — one tab stop for the whole tree):
  - `↓` / `↑` — next / previous visible node
  - `→` — expand collapsed branch, else move to first child
  - `←` — collapse expanded branch, else move to parent
  - `Home` / `End` — first / last visible node
  - `Enter` / `Space` — activate: follow leaf deep link, or toggle branch
  - No keyboard trap; `Tab` leaves the tree (NFR19)
- Screen-reader announcements (French): branch focus — "Kikongo _(illustrative)_, branche, 12 peuples, réduite. Entrée pour développer."; after lazy load completes — `aria-live="polite"` region announces "branche chargée — N peuples"; loading state sets `aria-busy="true"` on the branch node.
- Focus indicator 2–3 px `--afh-gold` outline, never clipped (UX-DR37); touch targets ≥ 44 × 44 px via `--afh-tree-node-min-h`.
- View toggle is a real `<button>` pair with `aria-pressed`; toggling moves focus to the newly shown view's container.

**Reduced motion:** expand/collapse is instant (no height animation) under `prefers-reduced-motion: reduce`; default motion is a ≤ 200 ms opacity-only reveal (UX-DR4 — no scroll-triggered animation, ever). Zoom: layout reflows without horizontal scroll at 200 % text zoom on all breakpoints (UX-DR39).

**Color independence:** classification badges pair icon + text + color (UX-DR39); tree guide-lines are decorative (`aria-hidden`).

**CI gate:** axe-core runs on every new Storybook story (zero serious/critical) and `a11y.yml` (`@axe-core/playwright`) adds `/fr/familles/{sample}` to its route set — both blocking (AR20, UX-DR35). Manual pass per UX-DR43: keyboard-only full journey + NVDA and VoiceOver in French on the tree and the text index before the epic closes.

## Performance

Gate: Lighthouse mobile ≥ 85 on `/fr/familles/{sample}`, added to `lighthouse.yml` reference routes (AR20). Strategy:

- **SSR-first, JS-second.** The page's LCP element is the SSR hero; the classification section server-renders the `HierarchyTextIndex` and the tree _skeleton_ (root + language tier — small, 24 families × tens of branches). The interactive `HierarchyTree` hydrates as a client island behind `next/dynamic` — it is not in the initial route bundle.
- **Lazy branches.** People nodes are fetched only on expansion via `/tree/branch`, paginated (default `limit=50`). The Bantu family never ships as one payload. Expanded-state URL restoration fetches only the requested branch.
- **Budgets:** `HierarchyTree` + wrapper JS ≤ 8 KB gzipped (same class as `SourceChainSheet`, UX-DR46); tree-skeleton JSON ≤ 15 KB for the largest family; CLS ≤ 0.1 — expansion reserves space via `min-height` on the group container while `aria-busy`.
- **Caching:** skeleton endpoint `s-maxage=86400` (stable-reference class, NFR5); branch endpoint `s-maxage=3600` (peoples class, AR18). Both are pure GETs, edge-cacheable.
- **New dependencies: zero.** Explicit decision — alternatives considered:
  - `react-arborist` / `react-complex-tree`: full virtualized tree libraries. Rejected: 30–60 KB gzipped, their a11y models would still need auditing against UX-DR35/41, and our max visible node count per branch page (50) needs no virtualization.
  - `d3-hierarchy` / `react-d3-tree`: node-link diagram layout engines. Rejected: the AFRIK tree is an indented hierarchy (file-explorer form), not a node-link diagram; d3 solves layout math we do not have and solves none of the keyboard/SR work we do have.
  - **Chosen (KISS):** hand-rolled WAI-ARIA APG tree over shadcn/Radix styling primitives — the pattern is small, fully specified by the APG, and becomes owned foundation code other epics reuse without a dependency tax.

## Test Plan (TDD)

Every story writes its failing test file first (Red → Green → Refactor). Placement per project conventions:

| Layer                            | Test files                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Migration DDL contract           | `scripts/__tests__/languageTreeMigration.test.ts` (7.1 — static assertions on the SQL text, 8.1 pattern)                |
| Validator (FR52)                 | `scripts/__tests__/validateAfrikData.treeIntegrity.test.ts`                                                             |
| Supabase queries                 | `src/lib/supabase/queries/afrik/__tests__/languages.test.ts`                                                            |
| Service + handler                | `src/api/v2/__tests__/languageFamilyTree.test.ts`                                                                       |
| Routes (envelope, cache, errors) | `src/app/api/v2/__tests__/languageFamilyTreeRoutes.test.ts`                                                             |
| Transformer                      | `src/lib/__tests__/familyDataTransformer.test.ts`                                                                       |
| Foundation components            | `src/components/system/__tests__/HierarchyTree.test.tsx`, `src/components/system/__tests__/HierarchyTextIndex.test.tsx` |
| Family page components           | `src/components/family/__tests__/components.test.tsx`                                                                   |
| Page integration                 | `src/app/[lang]/familles/__tests__/page.test.tsx` (extend existing)                                                     |

Rules: real AFRIK fixtures over deep Supabase mocks (known mock-layer bug source); component tests exercise the public interface — keyboard events, ARIA state, rendered links — never internal state; axe-core assertions in component tests for both tree and text index; the 6 + 4 pre-existing failures stay out of scope (AR41). `make check` green before any story is declared done.

## Epic 7 Definition

**Epic goal:** Visitors explore the AFRIK classification as a first-class surface — rich FLG pages with decolonial framing, plus an interactive, accessible hierarchical tree (family → languages → peoples) whose text-list equivalent, deep links, and classification badges make the hierarchy explorable, citable, and honest about its own contested edges.

**FRs covered:** FR47, FR48, FR49, FR50, FR51, FR52

**Key deliverables:** `HierarchyTree` + `HierarchyTextIndex` owned dataviz foundation in `src/components/system/` · `LanguageFamilyDetailViewV2` + 7 section components + `familyDataTransformer` · `/v2/language-families/{id}/tree` + `/tree/branch` endpoints (3-layer, OpenAPI updated) · migration `0NN_language_tree_support.sql` (one composite pagination index — 006 already covers the FK indexes) · FR52 tree-integrity validator + CI wiring · language-tier source audit (Tier 1/2, source-or-drop) · Lighthouse + axe routes extended with `/fr/familles/{sample}`.

**Depends on:** Epic 0 (validator + CI gates), Epic 1 (`ConfidenceChip`, `ClassificationBadge`, `SourceChainSheet`, `classification_status`, `--afh-*` tokens), Epic 2 (reading-surface conventions, `AutonymExonymHeading`, breadcrumbs), Epic 3 (pinned-version rendering already live on the family route — must be preserved, not rebuilt).
**Enables:** Epics 8–13 (first module of the wave; tree foundation reusable by 9/10; family pages become link targets for Atlas of Names and migration modules).

## Stories

Dependency ordering: 7.1 (migration) first and alone → 7.2 (blocking data/validator) → 7.3 (queries/services) → 7.4–7.5 (handlers/routes + OpenAPI) → 7.6 (transformer) → 7.7–7.10 (UI; 7.8 text index and 7.9 tree are the same wave) → 7.11 (gates). Story 7.2 **blocks** 7.9/7.10 shipping to production but not their development against fixtures.

---

### Story 7.1: Migration — branch-pagination composite index

**As a** backend engineer,
**I want** an idempotent migration adding the composite index branch pagination sorts on,
**So that** paginated branch queries (`language_family_id` filter + `name_main` order) stay within NFR3 latency budgets at 10× corpus scale (NFR16) — a forward bet, since at 924 rows the 006 indexes already cover every lookup the tree assembly makes.

**Acceptance Criteria:**

**Given** a failing test at `scripts/__tests__/languageTreeMigration.test.ts` written first (static DDL-contract assertions on the SQL text, same discipline as Story 8.1)
**When** I add `supabase/migrations/0NN_language_tree_support.sql` (next free number; migrations currently end at `027`)
**Then** it creates only `idx_afrik_peoples_family_name` on `afrik_peoples(language_family_id, name_main)` with `IF NOT EXISTS` — and does **not** re-declare `idx_afrik_languages_family_id` or `idx_afrik_peoples_family_id`, both already created by 006

**Given** the migration is applied twice
**When** `supabase db push` re-runs it
**Then** it succeeds with no error (idempotent)

**Given** the AR45 runbook
**When** the migration lands
**Then** it is applied manually by a human to staging then prod — never auto-applied — and the PR description records the apply checklist

**Technical notes:** Touches `supabase/migrations/` + `scripts/__tests__/languageTreeMigration.test.ts` (DDL-contract test, 8.1 pattern); the dependent query tests in 7.3 assert the query shapes this index serves. MUST merge before 7.3.

---

### Story 7.2: Tree-integrity validator (FR52) + language-tier source audit — BLOCKING

**As a** data steward,
**I want** `validateAfrikData.ts` to check classification-tree integrity and a sourced audit of the `afrik_languages` tier,
**So that** the tree only ever renders classification claims backed by Tier 1/2 sources — source or drop, never invent (FR52, FR32, AR44).

**Acceptance Criteria:**

**Given** a failing test at `scripts/__tests__/validateAfrikData.treeIntegrity.test.ts` written first
**When** I extend `scripts/validateAfrikData.ts` with FR52 checks
**Then** it hard-errors on: `afrik_languages.family_id` not matching an existing family; malformed or duplicate ISO 639-3 language ids; people `content.languages.isoCodes` entries that are not valid ISO 639-3 (reusing the FR29 code list)

**Given** peoples whose `isoCodes` match no language row of their family
**When** the validator runs
**Then** it emits an FR52-coverage soft warning per family (`linked / unlinked / total`), mirroring the FR28 / FR28-strict two-band pattern

**Given** the language-tier audit
**When** I review every `afrik_languages` row (and the `langue_par_famille.csv` source data) against Glottolog / SIL Ethnologue (Tier 1) or a Wikipedia-located primary source (Tier 2, ≥ 2 language versions, primary URL cited)
**Then** unverifiable rows are removed from the dataset and DB, each removal is recorded in the audit report, and no new language rows are invented to fill gaps

**Given** `data-integrity.yml`
**When** the FR52 checks land
**Then** the CI gate runs them pre-merge and nightly, blocking on hard errors (FR32)

**Technical notes:** Touches `scripts/validateAfrikData.ts`, `scripts/__tests__/validateAfrikData.treeIntegrity.test.ts`, `.github/workflows/data-integrity.yml`, dataset files under `dataset/source/afrik/`. The audit half is editorial work under the `afrik-curator` discipline — sources are recorded per the Source Tier policy with `tier` fields. **Blocks production shipping of 7.9/7.10.** 1–3 days including the audit pass over ~24 families.

---

### Story 7.3: Languages query module + tree service

**As a** backend engineer,
**I want** a `languages.ts` AFRIK query module and a `languageFamilyTreeService`,
**So that** the tree skeleton and branches are assembled from exactly three batched queries with no N+1 (AR17).

**Acceptance Criteria:**

**Given** failing tests at `src/lib/supabase/queries/afrik/__tests__/languages.test.ts` and `src/api/v2/__tests__/languageFamilyTree.test.ts` written first
**When** I create `src/lib/supabase/queries/afrik/languages.ts` (`getAfrikLanguagesByFamily`) and `src/api/v2/services/languageFamilyTreeService.ts`
**Then** `getFamilyTreeSkeleton(familyId)` returns `{ family, branches: [{ iso639_3, name, peopleCount }], unlinkedPeopleCount }` from three queries total (family, languages-by-family, peoples-by-family) grouped in memory

**Given** `getFamilyTreeBranch(familyId, { language | group: "unlinked" }, { limit, offset })`
**When** called
**Then** it returns paginated people nodes `{ id, nameMain, classificationStatus }` ordered by `name_main`, and a people appearing in several of the family's languages appears under each matching branch (skeleton counts document this rule)

**Given** an unknown family id
**When** either function runs
**Then** it returns `null` / empty result without throwing, logging through `@/lib/api/logger` (never `console.*`)

**Technical notes:** Touches `src/lib/supabase/queries/afrik/languages.ts`, `src/api/v2/services/languageFamilyTreeService.ts` + the two test files. Follows the mapping conventions of `languageFamilies.ts` (snake_case → camelCase in the query layer). Depends on 7.1. Blocks 7.4/7.5.

---

### Story 7.4: `/v2/language-families/{id}/tree` endpoint + OpenAPI

**As a** frontend engineer,
**I want** a tree-skeleton endpoint in the AR8 envelope,
**So that** the family page and any third-party consumer read the classification hierarchy from the public API (FR48, FR33).

**Acceptance Criteria:**

**Given** a failing test at `src/app/api/v2/__tests__/languageFamilyTreeRoutes.test.ts` written first
**When** I create `src/app/api/v2/language-families/[id]/tree/route.ts` + handler `src/api/v2/handlers/languageFamilyTree.ts`
**Then** `GET` returns `{ data: { family, branches, unlinkedPeopleCount }, meta: { license: "CC-BY-SA-4.0", attribution }, errors: [] }` with `Cache-Control: s-maxage=86400` and CORS from `src/lib/api/cors.ts`

**Given** an unknown `{id}`
**When** requested
**Then** the response is `404 NOT_FOUND` in the AR9 error shape

**Given** the OpenAPI spec at `src/lib/api/openapiV2.ts`
**When** the endpoint lands
**Then** the spec documents path, params, response schema, and error codes in the same PR, and the OpenAPI-diff CI gate passes (NFR29, NFR38)

**Technical notes:** Touches route + handler files, `src/api/v2/schemas/` (Zod param schema — never inline in the route), `src/lib/api/openapiV2.ts`, test file above. Depends on 7.3.

---

### Story 7.5: `/v2/language-families/{id}/tree/branch` lazy-branch endpoint + OpenAPI

**As a** frontend engineer,
**I want** a paginated branch endpoint,
**So that** large branches (Bantu case) load lazily and the initial page payload stays small (FR48, NFR3).

**Acceptance Criteria:**

**Given** failing route tests (same file as 7.4) written first
**When** I create `src/app/api/v2/language-families/[id]/tree/branch/route.ts` reusing handler + service from 7.3/7.4
**Then** `GET ?language={iso}&limit&offset` returns paginated people nodes with `total` in `meta.pagination`, `Cache-Control: s-maxage=3600`

**Given** `?group=unlinked`
**When** requested
**Then** the endpoint returns the unlinked-peoples group with identical pagination semantics

**Given** a `language` param that is valid ISO 639-3 but not a language of this family
**When** requested
**Then** the response is `422 SEMANTIC_ERROR`; malformed params return `400 VALIDATION_ERROR`; both documented in OpenAPI in the same PR

**Technical notes:** Touches branch route, handler, Zod schema, `openapiV2.ts`, route tests. Depends on 7.3; parallel with 7.4 after the handler skeleton exists.

---

### Story 7.6: `familyDataTransformer`

**As a** frontend engineer,
**I want** a pure transformer mapping `LanguageFamily` to a structured `FamilyPageData` shape,
**So that** section components receive type-safe, UI-ready data without per-component mapping (mirrors `countryDataTransformer` / Story 2.2 pattern).

**Acceptance Criteria:**

**Given** a failing suite at `src/lib/__tests__/familyDataTransformer.test.ts` written first
**When** I create `src/lib/familyDataTransformer.ts`
**Then** it exports `transformFamilyData(raw: LanguageFamily): FamilyPageData` with section payloads `hero`, `decolonialHeader`, `generalInfo`, `linguisticTraits`, `history`, `distribution`, `sources`, each backed by a named, independently tested helper

**Given** a fiche with missing or nullable JSONB fields
**When** transformed
**Then** every payload has sensible defaults (empty arrays, nulls) — never throws

**Given** the strict model `public/modele-linguistique.json`
**When** I compare the transformer's field coverage
**Then** every model section is either mapped or explicitly listed as intentionally unmapped in the test file

**Technical notes:** Touches `src/lib/familyDataTransformer.ts` + test file. Pure function, no Supabase import. No dependency on 7.3–7.5 (works from the existing `LanguageFamily` type) — can run in parallel with the API stories.

---

### Story 7.7: `LanguageFamilyDetailViewV2` orchestrator + section components (FR47)

**As a** reader,
**I want** a scrollable, decolonial-header-first family fiche following the Carte vivante pattern,
**So that** I read the family's full story — appellation history included — with confidence and classification visible above the fold (FR47, FR6, FR23).

**Acceptance Criteria:**

**Given** failing component tests at `src/components/family/__tests__/components.test.tsx` written first
**When** I create `LanguageFamilyDetailViewV2.tsx` + `FamilyHero`, `FamilyDecolonialHeader`, `FamilyLinguisticTraits`, `FamilyHistorySection`, `FamilyDistributionSection`, `FamilyClassificationTreeSection` (shell — filled in 7.10), `FamilySourcesFooter` + barrel
**Then** the orchestrator consumes `transformFamilyData` (7.6) and renders every non-empty section via SSR, empty sections omitted per UX-DR31

**Given** the hero
**When** rendered
**Then** it shows the family name (Fraunces 900, `lang` attribute when the label is an endonym), fiche-level `ConfidenceChip`, and `ClassificationBadge` when status ≠ `consensual`; prose sections carry inline `ConfidenceChip`s per Direction D (UX-DR18) opening `SourceChainSheet`

**Given** the live route `src/app/[lang]/familles/[slug]/page.tsx`
**When** the V2 orchestrator replaces `LanguageFamilyDetailView`
**Then** the pinned-version (`@v{n}`) snapshot path renders unchanged and `src/app/[lang]/familles/__tests__/page.test.tsx` still passes

**Given** distribution entries
**When** a country is activated
**Then** it deep-links to `/fr/pays/{iso3}` (FR50)

**Given** Storybook stories at 430 / 720 / 800 px for each section
**When** axe-core runs
**Then** zero serious/critical violations

**Technical notes:** Touches `src/components/family/**`, `src/app/[lang]/familles/[slug]/page.tsx`, stories, tests above. Mobile-first review at 320–430 px before merge. Depends on 7.6; the tree section ships as an SSR shell here and is completed in 7.10.

---

### Story 7.8: `HierarchyTextIndex` — text-first classification equivalent (FR49)

**As a** reader using assistive technology or a no-JS client,
**I want** a server-rendered nested-list index of the classification carrying the same information as the tree,
**So that** the hierarchy is fully readable, linkable, and printable with zero JavaScript — a first-class surface, not a fallback (FR49, FR44).

**Acceptance Criteria:**

**Given** a failing test at `src/components/system/__tests__/HierarchyTextIndex.test.tsx` written first
**When** I create `src/components/system/HierarchyTextIndex.tsx` consuming the generic `HierarchyNode` shape
**Then** it renders semantic nested `<ol>`/`<li>` with real `<a>` deep links, people counts, `ClassificationBadge` per flagged node, and `lang` attributes on endonym labels — no `"use client"`, no event handlers

**Given** the unlinked group
**When** present in the data
**Then** it renders as "peuples sans langue référencée (N)" with its peoples listed identically to language branches

**Given** a Storybook story at 430 / 720 / 800 px using the same fixture as the tree stories
**When** axe-core runs
**Then** zero serious/critical violations, and the fixture parity makes tree-vs-list information equivalence reviewable

**Technical notes:** Touches `src/components/system/HierarchyTextIndex.tsx`, test, story. Same wave as 7.9 — neither merges to the family page without the other (7.10 wires both). Defines the shared `HierarchyNode` type (exported from `src/components/system/`).

---

### Story 7.9: `HierarchyTree` — owned interactive tree foundation (FR48, FR51)

**As a** reader,
**I want** a keyboard-navigable, screen-reader-complete interactive tree component,
**So that** I explore branches of any hierarchy with full WAI-ARIA tree semantics — the reusable dataviz foundation this epic owns for later modules (FR48, FR44, NFR18/19).

**Acceptance Criteria:**

**Given** a failing test at `src/components/system/__tests__/HierarchyTree.test.tsx` written first (keyboard + ARIA assertions through the public interface)
**When** I create `src/components/system/HierarchyTree.tsx` per the props sketch
**Then** it renders `role="tree"` / `role="treeitem"` / `role="group"` with `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded`, and a roving tabindex (single tab stop)

**Given** keyboard input
**When** I use `↑ ↓ → ← Home End Enter Space`
**Then** navigation, expand/collapse, and leaf activation behave per the APG tree pattern with no keyboard trap, and `Enter` on a leaf follows its `href`

**Given** a branch with `loadChildren`
**When** expanded
**Then** the node sets `aria-busy="true"`, reserves group space (CLS ≤ 0.1), and on resolution announces "branche chargée — N peuples" via an `aria-live="polite"` region; load failure renders a calm inline "réessayer" affordance (UX-DR31)

**Given** `prefers-reduced-motion: reduce`
**When** a branch toggles
**Then** the reveal is instant; default motion is opacity-only ≤ 200 ms

**Given** nodes with `badge`
**When** rendered
**Then** `ClassificationBadge` appears beside the label — icon + text + color, never color alone (FR51, UX-DR39)

**Given** Storybook stories at 430 / 720 / 800 px (skeleton, expanded, lazy-loading, unlinked group, badges)
**When** axe-core runs
**Then** zero serious/critical violations; component JS ≤ 8 KB gzipped

**Technical notes:** Touches `src/components/system/HierarchyTree.tsx`, tests, stories. Zero new npm dependencies (decision documented in Performance section). No business logic — data via props/`loadChildren` only (UX-DR48). Same wave as 7.8. Blocks 7.10.

---

### Story 7.10: Family-page tree integration — lazy branches, view toggle, deep-link state (FR48, FR49, FR50)

**As a** reader on mobile,
**I want** the classification section to combine the collapsed tree, the text-index toggle, lazy branch loading, and shareable expansion state,
**So that** I explore even the largest family on a 4G connection and share exactly what I found (FR48, FR49, FR50).

**Acceptance Criteria:**

**Given** failing tests extending `src/components/family/__tests__/components.test.tsx` and `src/app/[lang]/familles/__tests__/page.test.tsx` written first
**When** I complete `FamilyClassificationTreeSection`
**Then** the SSR output contains the `HierarchyTextIndex` and the tree skeleton (root + language tier from `/tree` data fetched server-side); `HierarchyTree` hydrates behind `next/dynamic` with the text index as the no-JS content

**Given** a mobile viewport (< 720 px)
**When** the section renders
**Then** all branches are collapsed by default and no `/tree/branch` request has fired

**Given** a branch expansion
**When** the user expands
**Then** children load via TanStack Query against `/tree/branch` with pagination and "charger la suite (N restants)"; the URL updates to `?branche={iso}` (replace, no history spam); opening a URL with `?branche=` restores that branch expanded and scrolls the section into view

**Given** navigation to a people fiche and back
**When** the user returns via browser back
**Then** the expanded branch and scroll position are restored (UX-DR29 — back is never hijacked)

**Given** the "voir en liste" / "voir en arbre" toggle
**When** activated
**Then** the view switches without refetching, persists for the session (`sessionStorage`), and focus moves to the shown view's container

**Technical notes:** Touches `src/components/family/FamilyClassificationTreeSection.tsx`, family page wiring, tests above. Depends on 7.4, 7.5, 7.8, 7.9. Production release additionally gated by 7.2 (audited language tier). French copy strings listed in UX & Components.

---

### Story 7.11: A11y + performance gates for the family surface

**As a** maintainer,
**I want** the CI gates extended to the family route and the manual assistive-technology pass executed,
**So that** the flagship dataviz cannot regress silently (NFR18–NFR23, UX-DR35, UX-DR43, AR20).

**Acceptance Criteria:**

**Given** `lighthouse.yml` and `a11y.yml`
**When** I add `/fr/familles/{sample}` (a large-family sample) to both route sets
**Then** Lighthouse mobile Performance ≥ 85 and axe-core zero serious/critical are blocking on that route

**Given** the manual UX-DR43 pass
**When** executed on the tree and the text index (keyboard-only full journey; NVDA on Windows Firefox; VoiceOver on iOS Safari, in French; 200 % zoom; `prefers-reduced-motion` check)
**Then** findings are filed as issues and blocking findings are fixed before the epic closes

**Given** the tree-skeleton payload for the largest family
**When** measured in CI (simple size assertion in the route test)
**Then** it is ≤ 15 KB JSON, and the `HierarchyTree` chunk ≤ 8 KB gzipped

**Technical notes:** Touches `.github/workflows/lighthouse.yml`, `.github/workflows/a11y.yml`, size assertions in `src/app/api/v2/__tests__/languageFamilyTreeRoutes.test.ts`. Depends on 7.10. Closes the epic.

---

## Out of Scope

- **Language detail pages** — language nodes are branch nodes, not link targets; a `/fr/langues/{iso}` surface is a Growth candidate (see Open Questions).
- **FLG → FLG parent nesting in the tree** — the fiche's `decolonialHeader.linkWithFamily` stays prose; modelling a `parent_family_id` requires its own Glottolog-sourced audit (Open Question 1).
- **Cross-family "whole classification" mega-tree** on `/fr/familles` — the index page keeps its list; per-family trees only at MVP.
- **Tree search / filter / type-ahead** inside the tree widget.
- **Node-link diagram, radial, or zoomable visual forms** — deferred to the designer-led redesign phase; this epic ships the indented-hierarchy form only.
- **Pinned versions of tree state** — `?branche=` shares expansion, not content snapshots; snapshot semantics remain fiche-level (Epic 3).
- **Network-graph reuse** — Epic 11 owns relations dataviz; `HierarchyTree` will not grow cycle/graph support.
- **Classification editing / contribution flows from the tree** — flagging stays per-assertion via `SourceChainSheet` (Epic 4).
- **Dark mode, visual polish, custom iconography** — tokens-only styling now; redesign phase later.

## Open Questions

1. **FLG → FLG parent hierarchy:** `linkWithFamily` prose implies nesting (e.g. a family described as a sub-branch of another — _(illustrative)_). Should we add a sourced `parent_family_id` (Glottolog Tier 1 audit required) and nest family roots, or keep the 24 families flat permanently? Affects tree depth, breadcrumbs, and Epic 8 naming records.
2. **Language-tier classification status:** AR32 defines `classification_status` on peoples and families only. Do contested _language_ memberships (a language whose family assignment is debated) need the enum + badge on `afrik_languages`, and who sources those judgements?
3. **Multi-language peoples counting rule:** a people whose `isoCodes` span several languages of the family appears under each branch (spec'd in 7.3). Should the family-level people count deduplicate, and should the node visually mark "also under N other branches"? Needs a product decision on what the count _means_ to readers.
4. **Language detail pages:** once the tree makes languages visible, readers will tap them. Is a minimal `/fr/langues/{iso}` page a fast-follow (extending this epic's service layer) or a full Growth module?
5. **`langue_par_famille.csv` authority:** is this CSV the intended source of truth for the language tier, or a legacy artifact superseded by `afrik_languages`? Story 7.2's audit needs the ruling before reconciling the two.
