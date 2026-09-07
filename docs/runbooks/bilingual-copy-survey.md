# Bilingual copy survey

Last audited: 2026-09-07  
Scope: ETNI-1855 / ETNI-1874  
Target branch: `recette`

## Outcome

The reader-facing copy audit found and corrected the remaining locale leaks in active application surfaces. The copy-literal survey moved from 443 candidates in 81 files to 316 candidates in 52 files. The remaining candidates are classified below; they are not 316 known English UI defects.

French remains the fail-closed behavior:

- a missing or invalid `SITE_LOCALE_MODE` resolves to `fr-only`;
- the default locale remains French in `fr-only` and `bilingual-fr-default`;
- server endpoints reject invalid locale input by falling back to French;
- no database migration, production configuration change, or production deployment is part of this work.

## Corrected active surfaces

- Admin sign-in, moderation queue, API-key management, and revision publication dialog.
- Report detail and verification pages.
- Contact, moderation, anti-bot, and spreadsheet-download server responses.
- Loading, forbidden, source-verification, pinned-version, and revision-history states.
- People-note labels, country-fiche generated labels, colonial-fragmentation evidence, and atlas targets.
- Comparison Open Graph cards and the Nommer dossier's derogatory-exonym marker.

Each corrected surface has an English regression test while its existing French assertions remain in place.

## Residual classification

`npm run check:copy-literals` reports the following exhaustive classification at this revision. Counts are AST candidates, not rendered strings.

| Classification                                                                           | Candidates |  Files | Disposition                                                                                                   |
| ---------------------------------------------------------------------------------------- | ---------: | -----: | ------------------------------------------------------------------------------------------------------------- |
| Locale-complete copy stored inline or in parallel FR/EN data                             |        165 |     32 | Already selects by locale; architectural consolidation may happen later without blocking English publication. |
| Developer API documentation and OpenAPI descriptions                                     |         58 |      6 | Not reader-facing application UI; outside ETNI-1855.                                                          |
| Dormant or unrouted components and helpers                                               |         46 |      6 | No production caller; retain until their owning feature is revived or removed.                                |
| Quiz/corpus policy owned by ETNI-1856                                                    |         26 |      2 | Translate and review with the corpus wave, preserving editorial provenance.                                   |
| Parsing rules, French validation source text, brand constants, and safe-default metadata |         21 |      6 | Intentional French input matching or fail-closed defaults; adapters localize reader-facing output.            |
| **Total**                                                                                |    **316** | **52** | Fully adjudicated.                                                                                            |

### Locale-complete files (165)

- `src/components/pages/SourcesPageContent.tsx` (52)
- `src/components/home/PurposeBlocks.tsx` (19)
- `src/components/pages/AboutPageContent.tsx` (17)
- `src/lib/hubs/moduleRegistry.ts` (8)
- `src/components/search/DominantAnswerPanel.tsx` (7)
- `src/components/pages/RecherchePageContent.tsx` (5)
- `src/lib/hubs/facets.ts` (5)
- `src/components/dossiers/DossierDirectory.tsx` (4)
- `src/components/dossiers/nommer/ThesisMeasures.tsx` (4)
- `src/components/people/peopleFallbackNote.ts` (4)
- `src/components/source-transparency/DoctrineLinkCard.tsx` (4)
- `src/lib/familyFootprintSource.ts` (4)
- `src/components/dossiers/DossierNavigation.tsx` (3)
- `src/components/names/NameOriginCard.tsx` (3)
- `src/components/search/SearchModalV2.tsx` (3)
- `src/components/source-transparency/ConfidenceChip.tsx` (3)
- `src/app/[lang]/sources/[id]/page.tsx` (2)
- `src/components/search/SearchPivotCard.tsx` (2)
- `src/components/search/SearchResultCard.tsx` (2)
- `src/lib/atlas/targets.ts` (2)
- `src/app/[lang]/doctrine/page.tsx` (1)
- `src/app/[lang]/dossiers/page.tsx` (1)
- `src/components/dossiers/DossierPage.tsx` (1)
- `src/components/dossiers/nommer/NamePairGrid.tsx` (1)
- `src/components/home/HomeCorpusCounts.tsx` (1)
- `src/components/home/HomeHero.tsx` (1)
- `src/components/layout/LanguageSwitcher.tsx` (1)
- `src/components/layout/SiteHeader.tsx` (1)
- `src/components/migrations/MigrationDetailSheet.tsx` (1)
- `src/components/search/SearchLensBar.tsx` (1)
- `src/lib/search/personResultLabels.ts` (1)
- `src/lib/search/searchVocabulary.ts` (1)

### Developer documentation files (58)

- `src/app/docs/api/versioning/page.tsx` (27)
- `src/lib/api/openapiV2.ts` (12)
- `src/app/docs/api/page.tsx` (8)
- `src/app/docs/api/v2/page.tsx` (5)
- `src/lib/api/openapiV2Tags.ts` (5)
- `src/app/api/docs/route.ts` (1)

### Dormant or unrouted files (46)

- `src/components/oral-narratives/OralNarrativeForms.tsx` (34)
- `src/components/colonization/BorderCrossingTable.tsx` (3)
- `src/components/colonization/GazeEventNarrativeSection.tsx` (3)
- `src/lib/revisions/publishRevision.ts` (3)
- `src/components/colonization/ImposedNameList.tsx` (2)
- `src/components/colonization/EventTimelineMarkers.tsx` (1)

### ETNI-1856 files (26)

- `src/lib/quiz/questionTemplates.ts` (22)
- `src/lib/quiz/segmentPolicy.ts` (4)

### Intentional language-processing and safe-default files (21)

- `src/lib/validations/contact.ts` (11)
- `src/lib/afrik/parsers/appellationGrammar.ts` (4)
- `src/lib/atlas/countryPreposition.ts` (2)
- `src/lib/brand.ts` (2)
- `src/app/layout.tsx` (1)
- `src/lib/countryDataTransformer.ts` (1)

## Re-running the audit

Run:

```sh
npm run check:copy-literals
npm run check:translation-parity -- --base origin/recette
```

The literal survey remains informational because it deliberately sees editorial content, language-processing inputs, and parallel bilingual dictionaries. Translation parity is the blocking structural gate for changed copy modules.
