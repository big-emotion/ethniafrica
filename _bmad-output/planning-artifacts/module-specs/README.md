# Module Specs — Epics 7–13 (PRD Addendum FR47–FR90)

Implementation-grade specifications for the seven product modules that follow the platform socle (epics 0–6, ETNI-1..84). Each spec is self-sufficient: FR block with Given/When/Then acceptance criteria, data model & sourcing plan, API surface, UX components, WCAG 2.1 AA accessibility model, TDD test plan, and an 8–12 story breakdown in the `epics.md` format.

Authored 2026-07-29 from `product-brief-vision.md`, cross-audited for FR collisions, shared-infra ownership, Source Tier discipline and a11y coverage. Module #10 (conversational assistant) is deliberately deferred (recurring inference cost).

## The seven epics

| Epic | Module                                     | Spec                                           | Pillar        | FR block  | Stories | New infra                                                                                                |
| ---- | ------------------------------------------ | ---------------------------------------------- | ------------- | --------- | ------- | -------------------------------------------------------------------------------------------------------- |
| 7    | #2 Language family page + interactive tree | [epic-07](epic-07-language-family-explorer.md) | Explorer      | FR47–FR52 | 11      | — (owns `HierarchyTree` foundation)                                                                      |
| 8    | #4 Names Atlas                             | [epic-08](epic-08-names-atlas.md)              | Noms          | FR53–FR58 | 12      | `name_records` table, `modele-nom.json` dataset                                                          |
| 9    | #7 Interactive comparator                  | [epic-09](epic-09-comparator.md)               | Liens / Jouer | FR59–FR64 | 11      | — (owns OG share-card pattern)                                                                           |
| 10   | #9 Smart quiz                              | [epic-10](epic-10-smart-quiz.md)               | Jouer         | FR65–FR71 | 11      | `quiz_questions`, `quiz_generation_runs` tables                                                          |
| 11   | #5 Hidden links graph                      | [epic-11](epic-11-hidden-links-graph.md)       | Liens         | FR72–FR77 | 11      | `afrik_people_relations` table, `modele-relation.json` dataset                                           |
| 12   | #6 African migrations timeline             | [epic-12](epic-12-migrations-timeline.md)      | Liens         | FR78–FR84 | 10      | `migration_events` tables, `modele-migration.json` dataset, `AfricaBasemap` + `TimeScrubber` foundations |
| 13   | #8 Colonization & resistances              | [epic-13](epic-13-colonization-resistances.md) | Regards       | FR85–FR90 | 12      | colonial-border overlay dataset (extends Epic 12's event model)                                          |
| 14   | Home « Carte vivante »                     | [epic-14](epic-14-home-carte-vivante.md)       | Entry surface | FR91–FR95 | 6       | `--afh-night-*` token group, `DottedContinent` canvas                                                    |

Total: 84 stories. Every dataviz ships its text-first equivalent in the same story wave (release-gated), zero new runtime dependencies (each graphics/stack choice is documented with alternatives against the Lighthouse mobile ≥ 85 budget).

## Recommended delivery order

Epic numbering is identity, not sequence. The recommended order balances data readiness, dependency graph and product enthusiasm:

1. **Epic 7** — data fully exists (24 FLG in Supabase); lightest; delivers the Explorer flagship.
2. **Kick off data acquisition early, in parallel**: stories 8.4 (name curation wave 1), 11.4 (relation pilot corpus), 12.2 (migration pilot corpus), 13.3/13.4 (colonial borders + event corpus). These "source or drop" curation stories are the long pole of epics 8/11/12/13 and are UI-independent.
3. **Epic 9** — existing data only; brings the first social-share loop (OG cards).
4. **Epic 8** — high emotional value ("where does my name come from?"); PRD already lists it in Growth.
5. **Epic 10** — the all-public entry door; benefits from every fiche audited in the meantime (questions are confidence-gated).
6. **Epic 12** — highest product enthusiasm; ships once its pilot corpus and basemap/scrubber foundations land.
7. **Epic 11** then **Epic 13** — 11 rides its corpus; 13 reuses 12's event model + 8's imposed names. Note: 13.5/13.7 (fragmentation view) is derivable from existing `afrik_people_countries` data and can ship earlier if the Gazes pillar needs an early flagship (PRD placed Module #8 in Growth for its ideological leverage).

## Cross-epic coordination items (from the audit)

Settle these before the affected schema stories merge:

- **Epic 12 ↔ 13 contract seam (riskiest interface)**: event-type enum name, endpoint path, `modele-migration.json` extensibility for the four colonial event types, timeline marker capability, basemap pan/zoom. Joint review before either schema story merges.
- **Module 0 fabric `entity_type` is TEXT, not a Postgres enum** (verified: `009_module_zero_fabric.sql`). All specs were converged on TEXT + Zod-union extension (Epic 11 Story 11.2 is the house template).
- **Migration numbers**: head is 027 at authoring time; specs use `0NN` placeholders. Reserve a number block per epic at implementation kickoff.
- **Design tokens**: `--afh-colonial(-bg)` / `--afh-green` do not exist in the implemented sheet — only `--afh-color-colonial(-bg)` / `--afh-color-green`. Either add L2 aliases in the Epic 1-owned sheet once, or keep the `--afh-color-*` names.
- **OG-image pattern**: Epic 9 owns it (next/og `ImageResponse` + font subset); Epic 10 must reuse the same assets, not duplicate them.
- **Pillar taxonomy**: settle the access-mode naming once (see Phase 2 below) before the nav/IA stories (9.4, 10.8, 12.8, 13.9).
- **Schema-story test discipline**: adopt Story 8.1's DDL-contract-test pattern for every schema story.

## Phase 2 — information architecture redesign (framing only, not specced)

**Pulled forward (2026-07-29):** the product owner validated the prototype's hero + three entry points visually; the home page itself is now specced as [Epic 14](epic-14-home-carte-vivante.md) (pixel-fidelity reproduction, screenshots + reference HTML under `assets/`). The rest below remains Phase 2 framing.

Once the modules exist and are functionally accessible, the site's flat navigation gets redesigned around the vision brief's **three access modes**, with a designer:

- **Explorer** — atlas surfaces: countries, families + tree, peoples, Names Atlas.
- **Comprendre** — narrative surfaces: migrations timeline, hidden links, colonization & resistances, doctrine.
- **Jouer** — engagement surfaces: quiz, comparator.

Home page becomes three large CTAs (one per mode) instead of the current flat page list; existing pages (Pays, Famille, Peuple, À propos, Doctrine, API) regroup under these hubs (API/docs stay developer-facing). Positioning: an engagement platform — interactive, playful, shareable (OG loops from Epics 9/10) — not a consultative "Wikipédia bis". Accessibility is functional scope now; visual identity work belongs to this later phase.

## Open questions needing product-owner decisions

Each spec ends with its own Open Questions section. The ones worth deciding soonest:

1. Epic 12↔13 seam (above) — decide at implementation kickoff of either epic.
2. Curation wave sizing (8.4): which starter set of peoples for name records — all 924 is unrealistic for one wave.
3. Language detail pages (`/fr/langues/{iso}`): fast-follow on Epic 7's service layer, or full Growth module (also gates Epic 9's "languages" comparison scope).
4. FLG→FLG parent hierarchy: nest the 24 families under Glottolog-sourced parents, or keep flat.
