# V2 stabilisation — work plan and parallelisation map

Derived from the audit of 28 August 2026 (26 findings, 9 verified live on
`recette.africatlas.com`). This file exists so several agent sessions can pick
up units of that work at once without colliding.

**Read this before claiming a unit.** Every unit below names the files it owns.
Two sessions must never own the same file at the same time.

---

## Rules for any session taking a unit

1. **One worktree per session.** `EnterWorktree`, or `git worktree add
.claude/worktrees/<name>`. Never edit in the shared checkout — parallel
   sessions overwrite each other and switch branches under one another.
   Branch off `recette`, never off `main`.
2. **`recette` is protected.** Always branch and open a PR. Never push to it.
3. **The `@req` tax is real and blocking.** Touching any `src/**` file obliges
   you to annotate **every top-level export in it** with `// @req REQ-NNN`,
   including exports that were already there un-annotated. Each annotated id
   needs a matching annotation in some test file, and the id must exist in
   `docs/confluence-spec/req-catalog.json` (117 ids, max `REQ-120`). Budget it.
4. **`npm run lint:req` with no flag verifies nothing.** Always
   `npm run lint:req -- --base origin/recette`, or `--staged`.
5. **Green baseline.** The tree is at ~4900 passing tests, zero failures. Any
   red is yours.
6. **Never delete `docs/confluence-spec/*.json`** — a missing catalogue
   disarms the traceability gate silently.
7. **`validateAfrikData.ts` imports `src/lib/atlas/overlays.ts`.** A globe
   change can redden the data-integrity gate with the corpus untouched. Run
   `npx tsx scripts/validateAfrikData.ts` before pushing if you went near it.
8. **Do not run the corpus loader** (`scripts/migrateAfrikToDatabase.ts`)
   without explicit owner approval. It writes to a live database.

Useful ids: `REQ-091` fiches and routing · `REQ-119` field provenance ·
`REQ-116`/`REQ-117` atlas overlays and interaction · `REQ-114`/`REQ-106` hubs
and availability · `REQ-103` quiz · `REQ-120` games · `REQ-003` people fiche
content · `REQ-101` basemap.

---

## Status

**Lot 1 — done and merged.** PRs #447, #449, #451, #453, #454.

- The culture chapter now renders on all 789 people fiches (it rendered on
  none: the transform read an eleven-path nested shape the corpus never had).
- Four more declared fields reached the page for the first time —
  `originOfExonyms`, `contemporaryUsage`, `roleOfLineages`,
  `religiousAuthority`.
- The people fiche joined the parchment; `FicheSection` is now shared by all
  three fiches; `id="sources"` exists at last.
- `distributionByCountry[].note` is declared in the strict model and rendered
  (1063 notes across 486 fiches).
- The basemap fits its band, and marker placement crosses the same letterbox.
- The home band is pinned; a family's member peoples are links; the family
  fiche has a breadcrumb.

**Corpus re-synced to recette** on owner approval — 24 families, 789 peoples,
54 countries, 6 migrations, zero residual drift. Every record had been stale.

**Open:** #455 (macro-family declared peoples + atlas-charter §4 correction).

---

## Parallelisation map

Four streams can run at once. Lot 3 is the exception and is called out below.

| Stream                   | Units          | Files it owns                                                                                                                                                          |
| ------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — availability**     | 2.1, 2.2, 2.7a | `src/lib/hubs/moduleRegistry.ts`, `src/lib/hubs/moduleAvailability.ts`, `src/components/hubs/**`, `docs/design/atlas-charter.md` §3                                    |
| **B — fiche provenance** | 2.3, 2.4       | `src/components/country/CountryParchment.tsx`, `src/components/family/FamilyParchment.tsx`, `src/components/country/CountryRecordView.tsx`, `src/components/people/**` |
| **C — the globe**        | 2.5            | `src/hooks/use-globe-camera.ts`, `src/components/atlas/AtlasGlobe.tsx`, `src/lib/atlas/camera.ts`, `src/lib/atlas/targets.ts`                                          |
| **D — home geometry**    | 2.6            | `src/lib/home/axisGraphGeometry.ts`, `src/components/home/AxisModulePanel.tsx`, `src/components/home/AccessAxes.tsx`                                                   |
| **E — the quiz**         | all of lot 4   | `src/lib/quiz/**`, `src/components/quiz/**`, `scripts/lib/quiz*`, `scripts/generateQuizQuestions.ts`                                                                   |

**A and B share nothing. C and D share nothing with either.** E is independent
of all four.

**Lot 3 is a stop-the-world unit.** Its third PR moves every route and rewrites
the slug map; a 60-file diff touching routing cannot run while another session
edits components. Land lots 2 and 4 first, then give lot 3 the tree to itself.
Within lot 3, PR1 → PR2 → PR3 are strictly sequential; PR4/5/6 (the three
facets) can parallelise afterwards.

---

## Lot 2 — seven units

### 2.1 An editorial maturity state · stream A

**Decided by the owner: a module in preparation is not clickable, and the
doctrine goes in the charter.**

`ModuleAvailability` knows only `data` (live once its table has ≥ 1 row) and
`static` (always live). So the migrations timeline has 6 rows, declares itself
live, and renders badly; and the colonisation page is `static`, which makes it
_structurally impossible_ to mark as pending.

`moduleVisibilityCharter.test.ts` forbids any return to environment variables,
with the motive: _"a module that cannot be reached is not a module — it is
unmerged work."_ What we add is different and must be written as such: these
modules **are** reachable; they are **immature**. Maturity is a declared
property, never a switch.

1. Write the distinction into `docs/design/atlas-charter.md` §3 **before**
   coding, or it will be read as a return to feature flags. §3 currently says
   "there is no third state" — that sentence is what changes.
2. Add a declared field (e.g. `editorialReadiness: "ready" | "draft"`) to
   `HubModuleDefinition`, orthogonal to `availability`.
3. `getHubModules` returns `available: false` for a draft module. **No
   rendering work is needed** — `AccessModeHub` already renders an unavailable
   module as an inert `<div>` with the « Bientôt » chip.
4. Mark `frise` and `regards-colonisation` as draft. `noms` is already
   unavailable for free: `name_records` has 0 rows.
5. Extend `moduleVisibilityCharter.test.ts` to assert the new reason is not an
   environment switch.

### 2.2 The dead link to the names atlas · stream A

`src/components/hubs/ComprendreQuestionSpine.tsx` links `/fr/noms`
**unconditionally**, while the hub immediately below it shows « Bientôt » for
that same module. One page, two contradictory claims. Make the spine read the
same availability the hub does.

### 2.3 Rewrite the provenance notes · stream B

Roughly seventeen developer field paths are printed to readers:
`content.generalInfo · content.distribution`, `generalInfo.totalSpeakers`,
`content.etymology · nameOriginActor`, `content.culture`…

The intent comes from the charter and is right — say where a claim comes from.
The wording addresses a developer. Rewrite them in French, following the
people fiche, which already reads « Rubrique « appellations » de la fiche ».

Fix `CountryRecordView.tsx:89` while there: its note names a path the section
does not read.

### 2.4 Extend the missing-field marker · stream B

`FieldProvenanceMarker` (« Donnée manquante », « Valeur dérivée ») is used by
the family fiche only — zero occurrences under `components/country/` and
`components/people/`, where an empty section is silently omitted.

The country fiche argues for omission in a comment. That contradicts charter
§4, for which an empty field is information about the corpus. Rule in favour
of the charter.

> This unit was blocked until the corpus re-sync, because the marker was
> **lying** on the one fiche that used it — it reported a loader lag as an
> editorial silence. It is unblocked now.

### 2.5 The globe: stop the drift, recentre on the entity · stream C

- `use-globe-camera.ts` drifts at **0.1 rad/s** in its "no destination" branch,
  so every fiche spins until the reader chooses something, writing React state
  at 60 fps. Drift is already disabled for continent overlays — i.e. on the
  hubs, and nowhere else.
- The reader's drag is a **delta added on top of** the animated pose, so it
  fights a globe still turning under the finger.
- `recentre` cannot reset the drift: the hook owns `poseRef` internally and
  exposes no reset input. **This is a signature change, not a setting.**
- Recentring on the _entity_ needs an aggregate-bounds function that does not
  exist. `poseForTarget` and per-target `angularSpanDeg` do exist; the union
  of a family footprint or a people field does not.
- **`src/hooks/__tests__/use-globe-camera.test.ts` does not exist.** Write it.
  That absence is why the drift is constrained by nothing.

No wheel or pinch zoom exists anywhere — out of scope unless asked.

### 2.6 The Comprendre card collision · stream D

Above 860 px, four modules in an arc place « Premiers repères de migrations »
and « Regards : colonisation et résistances » at the **same y**, 189 px apart
for 220 px cards.

| Viewport  | Centre-to-centre | Result         |
| --------- | ---------------- | -------------- |
| 860 px    | 189 px           | 31 px overlap  |
| 960 px    | 212 px           | 8 px overlap   |
| 1024 px   | 227 px           | 7 px clearance |
| ≥ 1236 px | 265 px           | fine           |

Two defects in `axisGraphGeometry.ts`: the collision guard solves the
**vertical** axis only, and it measures against `REFERENCE_PANEL_WIDTH = 1140`
**hardcoded** instead of the real width. Fix both. Align the breakpoint on
**768 px**, the project rule, rather than 860.

Secondary: negative margins (−6, −10 px) collapse the card's three text lines
to 8 px then 4 px apart; labels at 15 px/600 need three lines in a slot that
reserves two (72 px).

### 2.7 Comprendre's representations

**a. The timeline · stream A.** The data is sound — 6 events, geometry and
narrative complete. The scrubber spans **4960 years linearly** and **opens on
1960**, where exactly **one** of six paths is active; Maji-Maji occupies 0.04 %
of the track. The registry already says so: _"six sourced events, not a
three-millennia timeline"_. **Owner's decision: replace nothing.** Mark it
draft (2.1) and leave the redesign out of this plan.

**b. Colonisation · stream A + a query fix.** Two of six events are colonial;
**zero** fragmentation, **zero** displacement, so two of four filters are
permanently empty. Mark it draft.

Independently of the draft flag, fix `peopleFragmentation.ts:213`: a
`limit 50` **with no ordering** over 803 peoples, then 3 queries per candidate
— roughly 25 arbitrary peoples out of 395 eligible, at ~150 uncached round
trips per view. That is a performance defect, not only an editorial one.

**c. The names atlas.** Stays unavailable. Record two defects that would
survive filling the table: `websearch_to_tsquery` does **no prefix matching**
(« Bamba » can never find « Bambara ») and `unaccent` is **not installed**
(« Yoruba » cannot find « Yorùbá »). Both verified against the database.

---

## Lot 3 — URL migration and the unified hub · stop-the-world

Owner's decisions: migrate **all three axes**, replace the three directories
outright with immediate redirects, implement directly and backfill the specs.

**The insight that sets the cost.** `getLocalizedRoute`, `getCountryRoute`,
`getPeopleRoute`, `getFamilyRoute` and `getModuleHref` already compose every
entity URL from one `SLUGS` map. Changing ~10 strings there migrates every
call site that goes through a helper **for free**. The ~268 hardcoded literals
are what bypassed the helpers — mostly tests.

Seven PRs, in order:

1. **Routing vocabulary**, no route moves, nothing visible. `resolveFamilyDeepLink`,
   `URLSearchParams` variants of the deep-link resolvers, delete
   `getSlugFromRoute` (it would answer `"explorer"` for every Explorer page),
   `src/lib/hubs/axisRoutes.ts`, and the round-trip contract test
   `getPageFromRoute(getLocalizedRoute(p)) === p` for every `PageType`.
2. **`deriveTrail(pathname, entityLabel?)`** in `src/lib/navigation/`, plus a
   `t.trail` label map. Migrate the four breadcrumb call sites. **Never print a
   segment you cannot name.** Name the test `breadcrumbCharter.test.tsx` — any
   path containing "charter" is auto-enrolled in the contract suite.
   _Consequence to accept: the people fiche loses its family crumb. Assert in
   `ContextTriad` that the family stays reachable from the people fiche._
3. **The flip — atomic.** Nested `SLUGS`; `git mv` the route directories; a
   **second** redirect table, prefix-shaped, keeping the tail verbatim (the
   existing `RENAMED_HUB_SEGMENTS` regex matches exactly one segment on
   purpose — do not widen it); carry the six legacy vocabularies
   `SectionPageClient` redirects today or they die silently; delete
   `[section]/page.tsx`; codemod the literals; **add the guard test** that
   refuses those literals outside the middleware, `routing.ts` and the redirect
   test tables; derive `revalidate/route.ts` paths from `getLocalizedRoute`;
   add `alternates.canonical` to the three fiche routes, which declare none;
   ship `src/app/sitemap.ts` and `src/app/robots.ts` and **delete
   `public/robots.txt` in the same commit** — a `public/robots.txt` silently
   shadows `app/robots.ts`.
4. **Facet `peuples`**, 5. **facet `familles`**, 6. **facet `pays`** — these
   three can parallelise once 3 has landed.
5. **Map ↔ list reactivity, per-facet accent, mobile fallback.**

Design notes that save rediscovery:

- Three sibling **static** routes, not `explorer/[facet]` — a dynamic segment
  would swallow `/fr/explorer/recherche`. The facet switch is therefore three
  anchors: no JS needed, crawlable.
- Model the filter bar on **`RecherchePageContent`**, which is live and tested.
  **`SearchPageContent` is unreachable dead code** and contains a Radix crash
  (`<SelectItem value="">`).
- Copy `GameScopePicker`'s shape: a server component, `method="get"`, **native
  `<select name>`** — a shadcn `Select` renders no `name` and submits nothing.
  Reuse the `definedScope()` empty-string guard.
- **Do not inherit two bugs**: the `__all__` sentinel (only needed because
  shadcn forbids an empty `SelectItem`), and `region`/`sort` filtering 20
  already-fetched rows client-side.
- `DIRECTORY_ACCENT_CLASS` already maps people→terre, country→ocre,
  family→teal and scopes `--accent` to a subtree by class. The facet accent is
  already written.
- **Reuse `AtlasFactsPanel` unchanged.** A map click always yields a country —
  that is correct, a country being the only unit the three encodings share.
  The panel shows the intersection of the current facet and filters with that
  country. A **list row** click navigates to the fiche and opens no panel.
- `getLanguageFamilies` already paginates at the database. The gap is only in
  the client loader, and a server component closes it with no new pagination
  code. Fix `unclassifiedPeoplesCount` while there: it compares against the
  _current page's_ family ids and is already wrong on page 2.
- Country facet on peoples: pre-resolve ids against `afrik_people_countries`
  then `.in()`, the shape `peopleIdsInCountry` uses. Do **not** copy
  `afrikLoader.getPeoples`'s post-fetch filter, which has the bug.
- Import `AtlasGlobe` dynamically **once** at hub level, not per facet, or the
  WebGL context remounts on every switch. Copy `ExplorerContinent`'s
  `IntersectionObserver` gate.
- No `region` facet in v1: `afrik_countries` has no region column, and the
  5-region map in `RecherchePageContent` is hand-typed. That facet needs a
  corpus field first.

Silent failure modes to guard: redirect loops and double hops (table-driven
test, assert one hop and idempotence); `?country=//evil.com` open redirects
(keep the encoding rule in one implementation); `revalidate/route.ts` desyncing
with a cheerful 200; the sitemap's absence during the redirect window.

---

## Lot 4 — the quiz by entity · stream E

Owner's decisions: group by country / family / mixed / random, in eights, with
an entity picker. **Verdict from the game-design skill: no per-people track**,
and no "people + neighbours" fallback either — scoping to a people's near pool
would produce the hardest possible session with no difficulty ladder, which is
the opposite of a track.

The number that reframes it: **11 879 rows are 2 504 distinct questions**,
duplicated across 4–5 audiences. Dropping audiences does not shrink the bank;
it reveals its real size. Say so when the count on the hub changes.

| Track              | Viable?                   | Cost                                  |
| ------------------ | ------------------------- | ------------------------------------- |
| Per **country**    | **54 / 54** reach 8 items | query change                          |
| Per **family**     | **22 / 23**               | query change                          |
| **Mixed / random** | yes                       | drop the filter; already Fisher-Yates |
| Per **people**     | **0 / 621** (max 5 items) | out of scope                          |

Provenance is already derivable: family at **100 %**, country at **99.5 %**,
through existing joins. **No migration needed** — and note that migrations
040–042 are pending, so anything new would land behind them.

1. **Fix the capping predicate first.** `quizFicheAdapter.ts:143` filters on
   `percentage`; the corpus writes `population`. The "which country does this
   people live in" template therefore exists for **20 peoples instead of 621**
   — the single most relevant template for a country track. `src/lib/games/
corpus.ts:17` already records the trap: _"a people's share of a country is
   a population count, not a percentage."_
2. **Carry population into the quiz fixture.** `GamePeopleFixture` has
   `totalPopulation`; `QuizPeopleFixture` does not. **789 of 789** fiches carry
   a usable value. This is what makes the charter's difficulty ladder
   computable — deciles inside the scoped pool, a session of 8 ascending —
   which _replaces_ the meaning difficulty loses when audiences go.
3. **Rescope the distractor pools.** They are frozen into `options_fr` at
   generation, drawn corpus-wide, so a "peuples du Ghana" track keeps
   pan-African wrong answers.
4. **One regeneration** covers all three. Two passes would be waste.
   `--rebuild`, per `docs/runbooks/quiz-bank-regeneration.md`.
5. **Converge on `GameScopePicker`** — it already does country and family,
   with no JS. Its own comment says why it did not reuse the quiz picker:
   _"its segments are audiences — children, teens, adults — not places or
   families."_
6. **Khoïsan** (1 people, 4 items) is absorbed by 2.1's maturity state: shown,
   marked unplayable.
7. **A session exit.** There is **no way out of a running quiz** — no
   breadcrumb, no abandon, no link back. With an entity picker, a player who
   picks the wrong country is trapped for eight questions. Ship it in the same
   lot.
8. **Two-column answers.** No technical obstacle: the options render in a
   single column at every breakpoint with no responsive variant. Keep the
   44 px targets, and the charter rule that everything fits above the fold at
   430 px.

---

## Debts

- **Confluence backfill.** Four decisions are owed: the editorial maturity
  state, axis-nested URLs, the atlas-charter §4 correction, and the corpus
  re-sync.
- **The sync runbook is unrunnable as written.** `docs/runbooks/afrik-data-sync.md`
  documents `npx tsx scripts/migrateAfrikToDatabase.ts`, but the script imports
  `src/lib/supabase/admin.ts`, which imports `server-only`, which throws
  outside a React Server Component. It runs only as
  `node --conditions=react-server --import ./node_modules/tsx/dist/loader.mjs`,
  on Node ≥ 22. The runbook needs that line.
- **The basemap fix was never verified by eye** at 430 / 768 / 1512 px, nor
  that a click lands on the country under the pointer. PR #453 merged first.
  That is the class of defect no unit test catches.
- **Eight relations of 1541 were not inserted** by the re-sync, with no error
  reported. Unexplained.
