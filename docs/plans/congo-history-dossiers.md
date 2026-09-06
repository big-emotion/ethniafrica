# Congo history dossiers: implementation plan

Date: 2026-09-06. Builds on PR #892 and its eight-theme navigation.

## Scope and editorial approach

Deliver four French dossiers with English translation overlays: the Kongo kingdom, Luba political history, Lunda political history, and Kongo spiritualities. Each has two sourced chapters, complementary readings where useful, credited illustrations where available, and explicit limits. Distinguish political formations from peoples, historical connections from present borders, and origin narratives from dated events. Do not infer an individual's religion or ethnicity. No closed historical borders are invented.

This is an implementation and editorial work plan, not a replacement for the canonical Confluence requirements. Existing REQ-113/114 govern dossier reading and discovery; REQ-140/143 govern bilingual routes and translation classes.

## Task list

- [x] Phase 1: source research and corpus contracts.
- [x] Phase 2: bilingual reading and visible citations.
- [x] Phase 3: instance-specific fiche links.
- [x] Phase 4: catalog, routes, breadcrumbs and sitemap.
- [x] Phase 5: editorial, automated and browser validation.

## Priority adjustment — incorporate the existing recette dossiers

The user explicitly prioritised this session's architecture over the structure merged in PR #891. The eight themes own public discovery; the legacy database vertical remains an internal compatibility field and never creates a competing navigation. Keep existing dossier URLs, sources and substantive content. Adapt the common reader to the subject: numerical thesis figures and paired readings are optional, not prerequisites for a historical or spiritual dossier. Existing paired readings remain intact. Add tests before relaxing these constraints and align the model documentation. Connect the existing resources dossier to the relevant Congo context, and include the existing records in the regression/browser checks. This work stays in the current session rather than requiring a separate task.

## Phase 1 — source research and corpus contracts (test first)

First test the four dossier identifiers, strict parsing, declared source references, complementary readings, illustration provenance and absence of invented historical boundaries. Then author the French JSON records using the existing dossier model. Extend the editorial vertical enum with history and spirituality, including the database migration and API enum consistency; leave the eight navigation themes unchanged. Use UNESCO documentation, identifiable museum research and specialist scholarship. Mark approximate chronology and origin traditions explicitly. Record evidence and source access dates in an editorial worksheet.

## Phase 2 — bilingual reading and visible citations (test first)

First test English overlays against translation classes: identifiers, names, dates, source titles and URLs remain invariant; translatable prose changes; machine provenance remains visible; absent or invalid translation never silently impersonates English. Print the per-leaf classification before producing overlays. Keep unchanged numeric figure values in the source rather than creating machine translations of review-required leaves. Then support the new overlays in the dossier reader and localise its existing labels. Link each paragraph and reading to the sources it actually cites. Reuse the existing dossier components and image credit layout.

## Phase 3 — contextual fiche links (test first)

First test that an exact historical formation in an explicitly associated country links to its dossier, that the same dossier is shared across relevant fiches, and that unrelated or merely similarly named entries remain plain text. Then add exact contextual associations to the catalog, link country timeline headings, and add related history/spirituality links to the relevant people and country sections. Use current country IDs as discovery contexts, never as historical border claims. No regex-based cultural inference.

## Phase 4 — discovery (test first)

First test both locale routes, published theme availability, canonical breadcrumbs and sitemap entries. Then register the four dossiers with the existing module readiness and routing mechanisms. The spiritualities theme becomes visible because authored content exists. No new top-level menu item and no empty destination.

## Phase 5 — validation (test first where a behaviour changes)

Run dossier/parser/translation/association contracts, full unit tests on Node 20, TypeScript, ESLint, formatting, requirement annotations, dossier integrity and unused-code checks. Browser journeys start at 320–430 px, then 768/1199 px, then 1200/1440 px. Verify exact country-row links, people links, both locale readers, source anchors, credits, no horizontal overflow and the two-row desktop navigation limit. Inspect actual screenshots before reporting visual completion.

## Subsequent editorial lots

Mongo political organisations, Mangbetu formations, Zande formations and vodun require separate research and are not represented by placeholder public links in this first lot. The historical dossiers are bounded introductions; they do not claim exhaustive dynastic or territorial reconstructions.

## Result

Implemented in `codex/congo-history-dossiers`, based on PR #892. Four source dossiers and four machine-labelled English overlays are linked through the existing theme catalog. Existing recette content and URLs are preserved. See [publication notes](../editorial/congo-dossier-publication-notes.md) for editorial limits, translation decisions and the integration order.

Validation: the full unit suite passed (769 files, 7,764 tests; three files and 21 tests skipped). TypeScript, ESLint (existing warnings only), formatting, requirement annotations, dead-code ratchet, glossary and migration-file checks passed. Browser journeys and the two-row desktop menu were checked at the specified breakpoints. The additional deployment-packaging contract verifies that both source and translation files are included in dossier server traces. Database loading and deployment remain release steps after merge.
