# Field classes — the declaration, read as a human reads it

**The machine declaration wins.** `src/lib/i18n/translationClasses.ts` is the
one source for the four classes of DEC-047 (REQ-143): `TRANSLATION_CLASSES`
per strict model, `PARSER_ONLY_LEAVES` for the patronyme leaves the parser
accepts and the model does not show, `GLOSSED_INVARIANT_PATHS` for the
name-and-gloss split, `CLASS_EXCEPTIONS` for the six leaf names allowed to
differ between models, and `classOf(model, path)` to resolve one leaf. The
tables below are that declaration written out, and
`scripts/ci/__tests__/translatorSkillCharter.test.ts` asserts they are equal
to it, row for row. When the test fails, the declaration has moved: edit the
row it names, never the declaration to match this page. Rationale for every
non-obvious ruling is in `docs/editorial/translation-classes.md`.

## The four classes, in one line each

| Class             | Treatment                                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invariant`       | Carried over verbatim; `sidecarViolations` refuses a changed value. Identifiers, autonyms, exonyms, spelling aliases, source titles and URLs, ISO codes, numbers, dates, enum values, image paths.  |
| `translatable`    | Translated, by machine or by hand. Narrative prose: origins, organisation, culture, historical role, summaries, per-country notes, `sources[].notes`, `gaps[].reason`.                              |
| `review_required` | Translated, then read by a named human before publication. Anything whose subject is a word: `whyProblematic`, `originOfExonyms`, `contemporaryUsage`, `names[].meaning`, etymologies, transcripts. |
| `generated`       | Authored per locale in code — quiz stems, the locative preposition, the admin-0 country name, UI labels. Never stored as translated data; no model leaf carries it.                                 |

## Reading the tables

- A leaf is named in the model's own vocabulary: `content.sources[].title`
  names every source title however many sources the fiche holds; `_meta.*`
  names a subtree whose keys are authoring metadata.
- **glossed invariant** — the value may carry a parenthetical French gloss
  inside the invariant string ("Hottentots (pejoratif, colonial)"). The name
  outside the parentheses is compared verbatim by the gate; the parenthetical
  is prose and translates. `reference/review-rules.md` says when that gloss
  is class 2 and when it is class 3.
- **parser-only** — `modele-nom-patronyme.json` writes the leaf as `null` or
  `[]`; its shape comes from `src/lib/afrik/parsers/patronymeParser.ts` and
  the leaf is classed there so that PAT_DIABY's nine hundred characters of
  `casteOrSocialFunction.value` do not slip through unclassed.
- `nameFr` / `nameEn` on the family and language models are already a
  bilingual pair: reuse `nameEn`, never re-translate `nameFr`. A country's
  English name is class 4, read from `Admin0Country.name` through
  `getAdmin0Name(id, "en")` in `src/lib/atlas/overlays.ts`; the French
  `nameFr` is carried over, not translated.

## Which model a record follows

| Corpus directory         | ID form            | Model                                                                                                  |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------ |
| `peuples/<FLG_*>/`       | `PPL_*`            | `modele-peuple.json`                                                                                   |
| `pays/`                  | ISO 3166-1 alpha-3 | `modele-pays.json`                                                                                     |
| `famille_linguistique/`  | `FLG_*`            | `modele-linguistique.json`                                                                             |
| `langues/`               | ISO 639-3          | `modele-langue.json`                                                                                   |
| `patronymes/`            | `PAT_*`            | `modele-nom-patronyme.json`, plus `-jamu`, `-nisba`, `-patronymique`, `-totemique`                     |
| `noms/`                  | `PPL_*`            | `modele-nom.json` — the ethnonym dossier, not the patronym model                                       |
| `relations/`             | `REL_*`            | `modele-relation.json`                                                                                 |
| `migrations/`            | `MGR_*`            | `modele-migration.json`                                                                                |
| `systemes_onomastiques/` | `ONS_*`            | **none in `public/`** — see below                                                                      |
| (no fiches on disk yet)  | —                  | `modele-media.json`, `modele-source.json`, `modele-recit-oral.json`, `modele-frontiere-coloniale.json` |

**An `ONS_*` record is refused, not classified.** `dataset/source/afrik/systemes_onomastiques/`
holds one file, `ONS_TEMPLATE.json`, and no `public/modele-*.json` describes
it. The four naming-system models (`modele-nom-jamu.json` and siblings) share
the `NAMING_SYSTEM_CORE` table below, but a record that names no model has no
class for any of its leaves, and "a field with no declared class is reported,
not translated" (SKILL.md, rule 1) then applies to the whole record. Say so in
the output and stop; do not borrow the nearest model's table.

## The tables

Written out from the declaration by hand; there is no generator, the charter
contract test is what keeps them equal to it, row for row and model for model.

### modele-frontiere-coloniale.json

| Leaf                  | Class          | Note |
| --------------------- | -------------- | ---- |
| `_meta.*`             | `invariant`    |      |
| `id`                  | `invariant`    |      |
| `title_fr`            | `translatable` |      |
| `reference_period`    | `invariant`    |      |
| `colonial_powers[]`   | `invariant`    |      |
| `geometry_file`       | `invariant`    |      |
| `simplification_note` | `translatable` |      |
| `sources[].reference` | `invariant`    |      |
| `sources[].tier`      | `invariant`    |      |
| `sources[].notes`     | `translatable` |      |
| `license`             | `invariant`    |      |

### modele-langue.json

| Leaf                            | Class          | Note              |
| ------------------------------- | -------------- | ----------------- |
| `_meta.*`                       | `invariant`    |                   |
| `id`                            | `invariant`    |                   |
| `isoCode639_3`                  | `invariant`    |                   |
| `glottocode`                    | `invariant`    |                   |
| `nameFr`                        | `invariant`    |                   |
| `nameEn`                        | `invariant`    |                   |
| `alternateNames[]`              | `invariant`    | glossed invariant |
| `spellingAliases[]`             | `invariant`    | glossed invariant |
| `familyId`                      | `invariant`    |                   |
| `peoples[].name`                | `invariant`    |                   |
| `peoples[].peopleId`            | `invariant`    |                   |
| `content.vehicularRole`         | `invariant`    |                   |
| `content.dialects[]`            | `invariant`    | glossed invariant |
| `content.vitalityStatus.status` | `invariant`    |                   |
| `content.vitalityStatus.scale`  | `invariant`    |                   |
| `content.vitalityStatus.asOf`   | `invariant`    |                   |
| `content.sources[].title`       | `invariant`    |                   |
| `content.sources[].url`         | `invariant`    |                   |
| `content.sources[].tier`        | `invariant`    |                   |
| `content.sources[].notes`       | `translatable` |                   |

### modele-linguistique.json

| Leaf                                                       | Class             | Note              |
| ---------------------------------------------------------- | ----------------- | ----------------- |
| `_meta.*`                                                  | `invariant`       |                   |
| `id`                                                       | `invariant`       |                   |
| `nameFr`                                                   | `invariant`       |                   |
| `nameEn`                                                   | `invariant`       |                   |
| `classificationStatus`                                     | `invariant`       |                   |
| `content.decolonialHeader.linkWithFamily`                  | `translatable`    |                   |
| `content.decolonialHeader.historicalAppellations[]`        | `invariant`       | glossed invariant |
| `content.decolonialHeader.originOfHistoricalTerm`          | `review_required` |                   |
| `content.decolonialHeader.whyProblematic`                  | `review_required` |                   |
| `content.decolonialHeader.selfAppellation`                 | `invariant`       | glossed invariant |
| `content.decolonialHeader.contemporaryUsage`               | `review_required` |                   |
| `content.decolonialHeader.geographicArea`                  | `translatable`    |                   |
| `content.decolonialHeader.numberOfLanguages`               | `invariant`       |                   |
| `content.decolonialHeader.totalSpeakers`                   | `invariant`       |                   |
| `content.generalInfo.branches[]`                           | `invariant`       |                   |
| `content.generalInfo.geographicArea`                       | `translatable`    |                   |
| `content.generalInfo.numberOfLanguages`                    | `invariant`       |                   |
| `content.generalInfo.totalSpeakers`                        | `invariant`       |                   |
| `content.associatedPeoples[].name`                         | `invariant`       |                   |
| `content.associatedPeoples[].peopleId`                     | `invariant`       |                   |
| `content.linguisticCharacteristics.typology`               | `translatable`    |                   |
| `content.linguisticCharacteristics.phonologicalFeatures`   | `translatable`    |                   |
| `content.linguisticCharacteristics.relationsWithNeighbors` | `translatable`    |                   |
| `content.linguisticCharacteristics.keyInnovations`         | `translatable`    |                   |
| `content.historyAndOrigins.probableOrigin`                 | `translatable`    |                   |
| `content.historyAndOrigins.emergencePeriod`                | `translatable`    |                   |
| `content.historyAndOrigins.diffusion`                      | `translatable`    |                   |
| `content.historyAndOrigins.historicalBreaks`               | `translatable`    |                   |
| `content.historyAndOrigins.contactZones`                   | `translatable`    |                   |
| `content.historyAndOrigins.majorEvents`                    | `translatable`    |                   |
| `content.distribution.totalSpeakers`                       | `invariant`       |                   |
| `content.distribution.distributionByCountry.*`             | `invariant`       |                   |
| `content.sources[].title`                                  | `invariant`       |                   |
| `content.sources[].url`                                    | `invariant`       |                   |
| `content.sources[].tier`                                   | `invariant`       |                   |
| `content.sources[].notes`                                  | `translatable`    |                   |

### modele-media.json

| Leaf                     | Class          | Note |
| ------------------------ | -------------- | ---- |
| `_meta.*`                | `invariant`    |      |
| `id`                     | `invariant`    |      |
| `links.languageFamilyId` | `invariant`    |      |
| `links.languageId`       | `invariant`    |      |
| `links.peopleId`         | `invariant`    |      |
| `links.countryId`        | `invariant`    |      |
| `author`                 | `invariant`    |      |
| `licence.uri`            | `invariant`    |      |
| `sourcePage.url`         | `invariant`    |      |
| `period`                 | `translatable` |      |
| `depictionTiming`        | `invariant`    |      |

### modele-migration.json

| Leaf                      | Class          | Note |
| ------------------------- | -------------- | ---- |
| `_meta.*`                 | `invariant`    |      |
| `id`                      | `invariant`    |      |
| `nameMain`                | `translatable` |      |
| `migrationGroup`          | `invariant`    |      |
| `eventType`               | `invariant`    |      |
| `classificationStatus`    | `invariant`    |      |
| `timeRange.startYear`     | `invariant`    |      |
| `timeRange.endYear`       | `invariant`    |      |
| `timeRange.datingNote`    | `translatable` |      |
| `geometry.type`           | `invariant`    |      |
| `geometry.coordinates[]`  | `invariant`    |      |
| `peoplesInvolved[].id`    | `invariant`    |      |
| `peoplesInvolved[].role`  | `invariant`    |      |
| `content.summary`         | `translatable` |      |
| `content.narrative`       | `translatable` |      |
| `content.debate`          | `translatable` |      |
| `content.sources[].year`  | `invariant`    |      |
| `content.sources[].title` | `invariant`    |      |
| `content.sources[].url`   | `invariant`    |      |
| `content.sources[].tier`  | `invariant`    |      |
| `content.sources[].notes` | `translatable` |      |

### modele-nom-jamu.json

| Leaf                                | Class          | Note |
| ----------------------------------- | -------------- | ---- |
| `_meta.*`                           | `invariant`    |      |
| `id`                                | `invariant`    |      |
| `nameMain`                          | `invariant`    |      |
| `namingSystem`                      | `invariant`    |      |
| `attestedForms[].spelling`          | `invariant`    |      |
| `attestedForms[].attestation.title` | `invariant`    |      |
| `attestedForms[].attestation.url`   | `invariant`    |      |
| `attestedForms[].attestation.tier`  | `invariant`    |      |
| `attestedForms[].attestation.notes` | `translatable` |      |
| `transmissionMode`                  | `invariant`    |      |
| `designatedSocialUnit`              | `invariant`    |      |
| `associatedPeoples[]`               | `invariant`    |      |
| `associatedCountries[]`             | `invariant`    |      |
| `origin.originType`                 | `invariant`    |      |
| `origin.sources[].title`            | `invariant`    |      |
| `origin.sources[].url`              | `invariant`    |      |
| `origin.sources[].tier`             | `invariant`    |      |
| `origin.sources[].notes`            | `translatable` |      |

### modele-nom-nisba.json

| Leaf                                | Class          | Note |
| ----------------------------------- | -------------- | ---- |
| `_meta.*`                           | `invariant`    |      |
| `id`                                | `invariant`    |      |
| `nameMain`                          | `invariant`    |      |
| `namingSystem`                      | `invariant`    |      |
| `attestedForms[].spelling`          | `invariant`    |      |
| `attestedForms[].attestation.title` | `invariant`    |      |
| `attestedForms[].attestation.url`   | `invariant`    |      |
| `attestedForms[].attestation.tier`  | `invariant`    |      |
| `attestedForms[].attestation.notes` | `translatable` |      |
| `transmissionMode`                  | `invariant`    |      |
| `designatedSocialUnit`              | `invariant`    |      |
| `associatedPeoples[]`               | `invariant`    |      |
| `associatedCountries[]`             | `invariant`    |      |
| `origin.originType`                 | `invariant`    |      |
| `origin.sources[].title`            | `invariant`    |      |
| `origin.sources[].url`              | `invariant`    |      |
| `origin.sources[].tier`             | `invariant`    |      |
| `origin.sources[].notes`            | `translatable` |      |
| `nisbaSubtype`                      | `invariant`    |      |

### modele-nom-patronyme.json

| Leaf                                              | Class             | Note        |
| ------------------------------------------------- | ----------------- | ----------- |
| `_meta.*`                                         | `invariant`       |             |
| `id`                                              | `invariant`       |             |
| `nameMain`                                        | `invariant`       |             |
| `nameSystem`                                      | `invariant`       |             |
| `spellings[].spelling`                            | `invariant`       |             |
| `spellings[].attestations[].countryId`            | `invariant`       |             |
| `spellings[].attestations[].sourceRefs[]`         | `invariant`       |             |
| `transmissionMode`                                | `invariant`       |             |
| `designatedSocialUnit`                            | `invariant`       |             |
| `origin.oralTraditions[].claim`                   | `translatable`    |             |
| `origin.oralTraditions[].claimStatus`             | `invariant`       |             |
| `origin.oralTraditions[].griot`                   | `invariant`       |             |
| `origin.oralTraditions[].transcription`           | `review_required` |             |
| `origin.oralTraditions[].sourceRefs[]`            | `invariant`       |             |
| `peoples[].peopleId`                              | `invariant`       |             |
| `peoples[].status`                                | `invariant`       |             |
| `peoples[].sourceRefs[]`                          | `invariant`       |             |
| `countries[].countryId`                           | `invariant`       |             |
| `countries[].status`                              | `invariant`       |             |
| `countries[].sourceRefs[]`                        | `invariant`       |             |
| `alliances[].targetPatronymeId`                   | `invariant`       |             |
| `alliances[].allianceType`                        | `invariant`       |             |
| `alliances[].sourceRefs[]`                        | `invariant`       |             |
| `bearers[].status`                                | `invariant`       |             |
| `bearers[].personId`                              | `invariant`       |             |
| `bearers[].sourceRefs[]`                          | `invariant`       |             |
| `homonyms[].label`                                | `invariant`       |             |
| `homonyms[].entityType`                           | `invariant`       |             |
| `homonyms[].entityId`                             | `invariant`       |             |
| `homonyms[].distinction`                          | `translatable`    |             |
| `homonyms[].sourceRefs[]`                         | `invariant`       |             |
| `sources[].sourceKey`                             | `invariant`       |             |
| `sources[].title`                                 | `invariant`       |             |
| `sources[].url`                                   | `invariant`       |             |
| `sources[].tier`                                  | `invariant`       |             |
| `sources[].source_kind`                           | `invariant`       |             |
| `sources[].notes`                                 | `translatable`    |             |
| `gaps[].fieldPath`                                | `invariant`       |             |
| `gaps[].reason`                                   | `translatable`    |             |
| `casteOrSocialFunction.value`                     | `translatable`    | parser-only |
| `casteOrSocialFunction.sourceRefs[]`              | `invariant`       | parser-only |
| `origin.writtenChronicles[].claim`                | `translatable`    | parser-only |
| `origin.writtenChronicles[].claimStatus`          | `invariant`       | parser-only |
| `origin.writtenChronicles[].sourceRefs[]`         | `invariant`       | parser-only |
| `origin.linguisticReconstructions[].claim`        | `review_required` | parser-only |
| `origin.linguisticReconstructions[].claimStatus`  | `invariant`       | parser-only |
| `origin.linguisticReconstructions[].sourceRefs[]` | `invariant`       | parser-only |
| `bearers[].displayName`                           | `invariant`       | parser-only |
| `bearers[].description`                           | `translatable`    | parser-only |
| `bearers[].selfIdentificationSourceRef`           | `invariant`       | parser-only |
| `sources[].isSelfIdentification`                  | `invariant`       | parser-only |
| `patronymicChainDepth.generations`                | `invariant`       | parser-only |
| `patronymicChainDepth.sourceRefs[]`               | `invariant`       | parser-only |
| `nisbaSubtype.value`                              | `invariant`       | parser-only |
| `nisbaSubtype.sourceRefs[]`                       | `invariant`       | parser-only |
| `totemicFoodProhibition.value`                    | `translatable`    | parser-only |
| `totemicFoodProhibition.sourceRefs[]`             | `invariant`       | parser-only |
| `permittedGivenNames[].name`                      | `invariant`       | parser-only |
| `permittedGivenNames[].sourceRefs[]`              | `invariant`       | parser-only |

### modele-nom-patronymique.json

| Leaf                                | Class          | Note |
| ----------------------------------- | -------------- | ---- |
| `_meta.*`                           | `invariant`    |      |
| `id`                                | `invariant`    |      |
| `nameMain`                          | `invariant`    |      |
| `namingSystem`                      | `invariant`    |      |
| `attestedForms[].spelling`          | `invariant`    |      |
| `attestedForms[].attestation.title` | `invariant`    |      |
| `attestedForms[].attestation.url`   | `invariant`    |      |
| `attestedForms[].attestation.tier`  | `invariant`    |      |
| `attestedForms[].attestation.notes` | `translatable` |      |
| `transmissionMode`                  | `invariant`    |      |
| `designatedSocialUnit`              | `invariant`    |      |
| `associatedPeoples[]`               | `invariant`    |      |
| `associatedCountries[]`             | `invariant`    |      |
| `origin.originType`                 | `invariant`    |      |
| `origin.sources[].title`            | `invariant`    |      |
| `origin.sources[].url`              | `invariant`    |      |
| `origin.sources[].tier`             | `invariant`    |      |
| `origin.sources[].notes`            | `translatable` |      |
| `patronymicChainDepth`              | `invariant`    |      |

### modele-nom-totemique.json

| Leaf                                | Class          | Note |
| ----------------------------------- | -------------- | ---- |
| `_meta.*`                           | `invariant`    |      |
| `id`                                | `invariant`    |      |
| `nameMain`                          | `invariant`    |      |
| `namingSystem`                      | `invariant`    |      |
| `attestedForms[].spelling`          | `invariant`    |      |
| `attestedForms[].attestation.title` | `invariant`    |      |
| `attestedForms[].attestation.url`   | `invariant`    |      |
| `attestedForms[].attestation.tier`  | `invariant`    |      |
| `attestedForms[].attestation.notes` | `translatable` |      |
| `transmissionMode`                  | `invariant`    |      |
| `designatedSocialUnit`              | `invariant`    |      |
| `associatedPeoples[]`               | `invariant`    |      |
| `associatedCountries[]`             | `invariant`    |      |
| `origin.originType`                 | `invariant`    |      |
| `origin.sources[].title`            | `invariant`    |      |
| `origin.sources[].url`              | `invariant`    |      |
| `origin.sources[].tier`             | `invariant`    |      |
| `origin.sources[].notes`            | `translatable` |      |
| `totemicFoodProhibition`            | `translatable` |      |
| `permittedGivenNames[]`             | `invariant`    |      |
| `casteOrSocialFunction`             | `translatable` |      |

### modele-nom.json

| Leaf                        | Class             | Note |
| --------------------------- | ----------------- | ---- |
| `_meta.*`                   | `invariant`       |      |
| `id`                        | `invariant`       |      |
| `entityType`                | `invariant`       |      |
| `names[].nameText`          | `invariant`       |      |
| `names[].nameType`          | `invariant`       |      |
| `names[].languageOfOrigin`  | `invariant`       |      |
| `names[].meaning`           | `review_required` |      |
| `names[].periodLabel`       | `translatable`    |      |
| `names[].imposedBy`         | `translatable`    |      |
| `names[].impositionPeriod`  | `translatable`    |      |
| `names[].whyProblematic`    | `review_required` |      |
| `names[].contemporaryUsage` | `review_required` |      |
| `names[].sortRank`          | `invariant`       |      |
| `names[].sources[].author`  | `invariant`       |      |
| `names[].sources[].year`    | `invariant`       |      |
| `names[].sources[].title`   | `invariant`       |      |
| `names[].sources[].url`     | `invariant`       |      |
| `names[].sources[].tier`    | `invariant`       |      |
| `names[].sources[].notes`   | `translatable`    |      |

### modele-pays.json

| Leaf                                                 | Class             | Note              |
| ---------------------------------------------------- | ----------------- | ----------------- |
| `_meta.*`                                            | `invariant`       |                   |
| `id`                                                 | `invariant`       |                   |
| `nameFr`                                             | `invariant`       |                   |
| `nameOfficial`                                       | `review_required` |                   |
| `summary`                                            | `translatable`    |                   |
| `etymology`                                          | `review_required` |                   |
| `nameOriginActor`                                    | `translatable`    |                   |
| `content.historicalNames.formerNames[]`              | `review_required` |                   |
| `content.historicalNames.antiquity`                  | `translatable`    |                   |
| `content.historicalNames.middleAges`                 | `translatable`    |                   |
| `content.historicalNames.precolonial`                | `translatable`    |                   |
| `content.historicalNames.colonization`               | `translatable`    |                   |
| `content.historicalNames.contemporary`               | `translatable`    |                   |
| `content.kingdoms[].name`                            | `review_required` |                   |
| `content.kingdoms[].period`                          | `translatable`    |                   |
| `content.kingdoms[].dominantPeoples[]`               | `invariant`       | glossed invariant |
| `content.kingdoms[].politicalCenters[]`              | `invariant`       |                   |
| `content.kingdoms[].historicalRole`                  | `translatable`    |                   |
| `content.majorPeoples[].name`                        | `invariant`       |                   |
| `content.majorPeoples[].selfAppellation`             | `invariant`       | glossed invariant |
| `content.majorPeoples[].exonyms[]`                   | `invariant`       | glossed invariant |
| `content.majorPeoples[].peopleId`                    | `invariant`       |                   |
| `content.majorPeoples[].mainRegion`                  | `translatable`    |                   |
| `content.majorPeoples[].languages[]`                 | `invariant`       |                   |
| `content.majorPeoples[].languageFamily`              | `invariant`       |                   |
| `content.majorPeoples[].appellationRemarks`          | `review_required` |                   |
| `content.culture.mainLanguages[].name`               | `invariant`       |                   |
| `content.culture.mainLanguages[].isoCode`            | `invariant`       |                   |
| `content.culture.mainLanguages[].isPrimary`          | `invariant`       |                   |
| `content.culture.culturalTraditions`                 | `translatable`    |                   |
| `content.culture.dominantReligions`                  | `translatable`    |                   |
| `content.culture.lifestyles`                         | `translatable`    |                   |
| `content.culture.socialOrganization`                 | `translatable`    |                   |
| `content.culture.regionalRelations`                  | `translatable`    |                   |
| `content.historicalFacts.ancientPeriods`             | `translatable`    |                   |
| `content.historicalFacts.middleAges`                 | `translatable`    |                   |
| `content.historicalFacts.precolonial`                | `translatable`    |                   |
| `content.historicalFacts.colonization`               | `translatable`    |                   |
| `content.historicalFacts.independenceStruggle`       | `translatable`    |                   |
| `content.historicalFacts.postIndependence`           | `translatable`    |                   |
| `content.sources[].title`                            | `invariant`       |                   |
| `content.sources[].url`                              | `invariant`       |                   |
| `content.sources[].tier`                             | `invariant`       |                   |
| `content.sources[].notes`                            | `translatable`    |                   |
| `content.demographics.totalPopulation`               | `invariant`       |                   |
| `content.demographics.referenceYear`                 | `invariant`       |                   |
| `content.demographics.source`                        | `invariant`       |                   |
| `content.demographics.peoples[].name`                | `invariant`       |                   |
| `content.demographics.peoples[].peopleId`            | `invariant`       |                   |
| `content.demographics.peoples[].population`          | `invariant`       |                   |
| `content.demographics.peoples[].referenceYear`       | `invariant`       |                   |
| `content.demographics.peoples[].percentageInCountry` | `invariant`       |                   |
| `content.demographics.peoples[].percentageInAfrica`  | `invariant`       |                   |
| `content.demographics.peoples[].region`              | `translatable`    |                   |
| `content.demographics.peoples[].languageFamily`      | `invariant`       |                   |
| `content.demographics.peoples[].mainLanguageCode`    | `invariant`       |                   |

### modele-peuple.json

| Leaf                                                    | Class             | Note              |
| ------------------------------------------------------- | ----------------- | ----------------- |
| `_meta.*`                                               | `invariant`       |                   |
| `id`                                                    | `invariant`       |                   |
| `nameMain`                                              | `invariant`       |                   |
| `languageFamilyId`                                      | `invariant`       |                   |
| `currentCountries[]`                                    | `invariant`       |                   |
| `classificationStatus`                                  | `invariant`       |                   |
| `content.appellations.mainName`                         | `invariant`       |                   |
| `content.appellations.selfAppellation`                  | `invariant`       | glossed invariant |
| `content.appellations.exonyms[]`                        | `invariant`       | glossed invariant |
| `content.appellations.spellingAliases[]`                | `invariant`       | glossed invariant |
| `content.appellations.originOfExonyms`                  | `review_required` |                   |
| `content.appellations.whyProblematic`                   | `review_required` |                   |
| `content.appellations.contemporaryUsage`                | `review_required` |                   |
| `content.appellations.peopleGroupId`                    | `invariant`       |                   |
| `content.appellations.peopleGroupLabel`                 | `invariant`       |                   |
| `content.ethnicities[]`                                 | `invariant`       | glossed invariant |
| `content.origins.ancientOrigins`                        | `translatable`    |                   |
| `content.origins.formationPeriod`                       | `translatable`    |                   |
| `content.origins.migrationRoutes[]`                     | `translatable`    |                   |
| `content.origins.historicalSettlementZones[]`           | `translatable`    |                   |
| `content.origins.unificationsOrDivisions`               | `translatable`    |                   |
| `content.origins.externalInfluences`                    | `translatable`    |                   |
| `content.origins.majorHistoricalEvents`                 | `translatable`    |                   |
| `content.organization.traditionalPoliticalSystem`       | `translatable`    |                   |
| `content.organization.clanOrganization`                 | `translatable`    |                   |
| `content.organization.ageClassSystems`                  | `translatable`    |                   |
| `content.organization.roleOfLineages`                   | `translatable`    |                   |
| `content.organization.religiousAuthority`               | `translatable`    |                   |
| `content.languages.mainLanguage`                        | `invariant`       |                   |
| `content.languages.isoCodes[]`                          | `invariant`       |                   |
| `content.languages.dialects[]`                          | `invariant`       | glossed invariant |
| `content.languages.vehicularRole`                       | `translatable`    |                   |
| `content.externalIdentifiers.wikidataId`                | `invariant`       |                   |
| `content.externalIdentifiers.glottocode`                | `invariant`       |                   |
| `content.externalIdentifiers.iso639_3`                  | `invariant`       |                   |
| `content.historicalAffiliation.description`             | `translatable`    |                   |
| `content.historicalAffiliation.sources[].title`         | `invariant`       |                   |
| `content.historicalAffiliation.sources[].url`           | `invariant`       |                   |
| `content.historicalAffiliation.sources[].tier`          | `invariant`       |                   |
| `content.historicalAffiliation.sources[].notes`         | `translatable`    |                   |
| `content.culture.majorRites`                            | `translatable`    |                   |
| `content.culture.symbols`                               | `translatable`    |                   |
| `content.culture.artsAndMusic`                          | `translatable`    |                   |
| `content.culture.spiritualities`                        | `translatable`    |                   |
| `content.historicalRole.kingdomsOrChiefdoms`            | `translatable`    |                   |
| `content.historicalRole.relationsWithNeighbors`         | `translatable`    |                   |
| `content.historicalRole.conflictsOrAlliances`           | `translatable`    |                   |
| `content.historicalRole.diaspora`                       | `translatable`    |                   |
| `content.demography.totalPopulation`                    | `invariant`       |                   |
| `content.demography.referenceYear`                      | `invariant`       |                   |
| `content.demography.source`                             | `invariant`       |                   |
| `content.demography.distributionByCountry[].country`    | `invariant`       |                   |
| `content.demography.distributionByCountry[].population` | `invariant`       |                   |
| `content.demography.distributionByCountry[].percentage` | `invariant`       |                   |
| `content.demography.distributionByCountry[].note`       | `translatable`    |                   |
| `content.sources[].title`                               | `invariant`       |                   |
| `content.sources[].url`                                 | `invariant`       |                   |
| `content.sources[].tier`                                | `invariant`       |                   |
| `content.sources[].notes`                               | `translatable`    |                   |

### modele-recit-oral.json

| Leaf                      | Class             | Note |
| ------------------------- | ----------------- | ---- |
| `_meta.*`                 | `invariant`       |      |
| `id`                      | `invariant`       |      |
| `links.languageFamilyId`  | `invariant`       |      |
| `links.peopleId`          | `invariant`       |      |
| `links.countryId`         | `invariant`       |      |
| `links.assertionId`       | `invariant`       |      |
| `attribution.displayMode` | `invariant`       |      |
| `attribution.displayName` | `invariant`       |      |
| `attribution.community`   | `translatable`    |      |
| `attribution.collector`   | `invariant`       |      |
| `context.narrativeDate`   | `invariant`       |      |
| `context.placePrecision`  | `invariant`       |      |
| `context.languageCode`    | `invariant`       |      |
| `context.narrativeKind`   | `invariant`       |      |
| `content.transcript`      | `review_required` |      |
| `content.summary`         | `translatable`    |      |
| `content.mediaLocator`    | `invariant`       |      |
| `variantOf`               | `invariant`       |      |
| `visibility`              | `invariant`       |      |
| `reviewStatus`            | `invariant`       |      |
| `rightsStatus`            | `invariant`       |      |

### modele-relation.json

| Leaf               | Class          | Note |
| ------------------ | -------------- | ---- |
| `_meta.*`          | `invariant`    |      |
| `id`               | `invariant`    |      |
| `relationType`     | `invariant`    |      |
| `peopleIdA`        | `invariant`    |      |
| `peopleIdB`        | `invariant`    |      |
| `direction`        | `invariant`    |      |
| `period.startYear` | `invariant`    |      |
| `period.endYear`   | `invariant`    |      |
| `period.label`     | `translatable` |      |
| `description`      | `translatable` |      |
| `sources[].author` | `invariant`    |      |
| `sources[].year`   | `invariant`    |      |
| `sources[].title`  | `invariant`    |      |
| `sources[].url`    | `invariant`    |      |
| `sources[].tier`   | `invariant`    |      |
| `sources[].notes`  | `translatable` |      |

### modele-source.json

| Leaf                              | Class       | Note |
| --------------------------------- | ----------- | ---- |
| `_meta.*`                         | `invariant` |      |
| `source.sourceKey`                | `invariant` |      |
| `source.title`                    | `invariant` |      |
| `source.authors[]`                | `invariant` |      |
| `source.publicationYear`          | `invariant` |      |
| `source.sourceKind`               | `invariant` |      |
| `source.identifiers.catalogue`    | `invariant` |      |
| `source.publisher`                | `invariant` |      |
| `source.url`                      | `invariant` |      |
| `assertionReference.sourceKey`    | `invariant` |      |
| `assertionReference.locatorType`  | `invariant` |      |
| `assertionReference.locatorValue` | `invariant` |      |
