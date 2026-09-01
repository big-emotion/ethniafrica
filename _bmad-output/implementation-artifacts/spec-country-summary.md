---
title: 'Show a brief country summary in the Explorer map panel'
type: 'feature'
created: '2026-09-01'
status: 'in-review'
baseline_commit: '083c4f4cc59a4c70c54b8350995c24c9ad92fb5c'
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/docs/design/brand-charter.md'
  - '{project-root}/docs/design/atlas-charter.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Selecting another country on the globe of an Explorer country page currently shows only its name, flag, documented-people count, provenance, and link. The panel does not provide enough context to understand the selected country before opening its full fiche.

**Approach:** Enrich every selected-country panel with a compact, corpus-backed brief containing the national population and reference year plus up to three principal languages. Keep the documented-people count, provenance, flag, and full-fiche action, using the same facts in the mobile bottom sheet and larger-screen side panel.

## Boundaries & Constraints

**Always:** Develop test-first; keep the implementation simple; use only fields already loaded from `afrik_countries`; format population for French readers; label the population year; cap language output at three readable values; omit unavailable facts cleanly; preserve the panel's existing provenance wording, country flag, close behavior, non-modal interaction, scrolling, camera bias, and destination rules; treat mobile below 768 px first, then tablet 768–1199 px and desktop from 1200 px; keep all documentation, tests, code comments, and identifiers in English.

**Ask First:** Any database migration, API contract change, new network request, change to panel/camera dimensions, or introduction of a new country field not present in the corpus.

**Never:** Infer a capital or geographic region from unrelated fields; invent zero/unknown placeholders; turn the panel into a second full fiche; list every language or people; add hard-coded colours, spacing, or breakpoints; remove or weaken existing REQ-117 coverage.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Complete brief | Selected country has population, reference year, languages, and documented peoples | Panel shows a French-formatted population with year, at most three languages, documented-people count, provenance, and full-fiche action | N/A |
| Language fallback | `culture.mainLanguages` is empty but major peoples name languages | Panel uses the existing corpus-backed fallback and removes duplicates | N/A |
| Partial brief | Population or languages are absent | Available rows render; missing rows and empty labels do not | No `0`, `undefined`, blank chip, or invented text |
| Corpus silence | No documented-people count exists | Existing corpus-silence sentence remains visible alongside any available brief facts | Do not describe the country as having no peoples |
| Current fiche country | Selection returns to the country already being read | The same population/language brief is visible while the action still points to `#fiche` and declared provenance remains | No route reload |

</frozen-after-approval>

## Code Map

- `src/app/[lang]/explorer/pays/[slug]/page.tsx` -- loads the current country, the country collection, people counts, picker targets, and panel facts.
- `src/components/country/countryTargetFacts.tsx` -- builds the country-specific `AtlasTargetFacts` content shown after globe selection.
- `src/components/country/__tests__/countryTargetFacts.test.tsx` -- REQ-117 contract tests for current and alternate country panels.
- `src/lib/home/countrySynthesis.ts` -- existing, tested language derivation with `culture.mainLanguages` and major-people fallback.
- `src/components/atlas/AtlasFactsPanel.tsx` -- generic responsive shell; should require no layout change because enriched facts remain children of its scrollable body.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/country/__tests__/countryTargetFacts.test.tsx` -- add failing REQ-117 tests for formatted population/year, a maximum of three deduplicated languages, fallback language data, missing-field omission, and current/alternate country parity before changing production code.
- [x] `src/components/country/countryTargetFacts.tsx` -- extend the facts input with corpus-backed country briefs and render a small labelled facts grid without changing the generic panel shell.
- [x] `src/app/[lang]/explorer/pays/[slug]/page.tsx` -- retain the full country rows already fetched by the existing service, derive language briefs through the shared synthesis logic, and pass serializable brief data to the facts builder without another request.
- [x] `src/components/atlas/__tests__/AtlasFactsPanel.test.tsx` -- confirm enriched children remain available in both bottom-sheet and side-panel anchorings only if existing generic coverage does not already prove this contract.

**Acceptance Criteria:**
- Given a reader selects a country on the Explorer globe, when its panel opens, then population/year, up to three languages, documented-people context, provenance, flag, and the full-fiche action are visible or reachable by scrolling when the corpus supplies them.
- Given the same selection at 430 px, 768 px, and 1200 px, when the responsive anchoring changes, then the information is identical and the globe/panel geometry remains governed by the existing shared fractions.
- Given a fact is absent, when the panel renders, then it omits that row without presenting a fabricated value or breaking the remaining content.
- Given the reader returns to the fiche's own country, when the panel opens, then the enriched brief remains and the action points to `#fiche`.

## Spec Change Log

## Design Notes

The visual direction is a restrained editorial field note inside the existing atlas panel: short uppercase labels, readable left-aligned values, and no new decorative layer. The enrichment belongs in the scrollable body so the mobile bottom sheet remains capped at its existing height and the generic atlas panel stays domain-neutral.

## Verification

**Commands:**
- `npx vitest run src/components/country/__tests__/countryTargetFacts.test.tsx src/components/atlas/__tests__/AtlasFactsPanel.test.tsx` -- expected: focused panel contracts pass.
- `npm run typecheck` -- expected: server-to-client facts remain serializable and type-safe.
- `npm run lint -- --no-cache` -- expected: no lint or REQ annotation violations in changed source.
- `npm run lint:req` -- expected: all new or renamed tests carry valid requirement annotations.

**Manual checks:**
- Inspect a country selection at 430 px, 768 px, and 1200 px; confirm identical facts, readable scrolling, a visible selected country, and an accessible action.
