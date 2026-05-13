# AFRIK strict models — compact reference

Source of truth: `public/modele-peuple.json`, `public/modele-pays.json`, `public/modele-linguistique.json`.
Read the relevant model file in full before emitting an output JSON — these summaries are for orientation only.

## People (`modele-peuple.json`)

```
PPL_*
├── id, nameMain, languageFamilyId, currentCountries[]
└── content
    ├── appellations { mainName, selfAppellation, exonyms[], originOfExonyms, whyProblematic, contemporaryUsage }
    ├── ethnicities[]
    ├── origins { ancientOrigins, formationPeriod, migrationRoutes[], historicalSettlementZones[],
    │             unificationsOrDivisions, externalInfluences, majorHistoricalEvents }
    ├── organization { traditionalPoliticalSystem, clanOrganization, ageClassSystems,
    │                  roleOfLineages, religiousAuthority }
    ├── languages { mainLanguage, isoCodes[], dialects[], vehicularRole }
    ├── culture (simplified OR extended — see directives §11)
    ├── historicalRole { kingdomsOrChiefdoms, relationsWithNeighbors, conflictsOrAlliances, diaspora }
    ├── demography { totalPopulation, referenceYear=2025, source, distributionByCountry[] }
    └── sources[]
```

`distributionByCountry[] = { country: ISO3, population: int, percentage: float }` — percentages total 100.

## Country (`modele-pays.json`)

```
{ISO3}
├── id, nameFr, nameOfficial, etymology, nameOriginActor
└── content
    ├── historicalNames { antiquity, middleAges, precolonial, colonization, contemporary }
    ├── kingdoms[] { name, period, dominantPeoples[], politicalCenters[], historicalRole }
    ├── majorPeoples[] { name, selfAppellation, exonyms[], peopleId, mainRegion,
    │                    languages[], languageFamily, appellationRemarks }
    ├── culture { mainLanguages[], culturalTraditions, dominantReligions,
    │             lifestyles, socialOrganization, regionalRelations }
    ├── historicalFacts { ancientPeriods, middleAges, precolonial, colonization,
    │                     independenceStruggle, postIndependence }
    ├── sources[]
    └── demographics
        └── peoples[] { name, peopleId, population, percentageInCountry,
                        percentageInAfrica, region, languageFamily, mainLanguageCode }
```

`demographics.peoples[].percentageInCountry` totals 100.

## Linguistic family (`modele-linguistique.json`)

```
FLG_*
├── id, nameFr, nameEn
└── content
    ├── decolonialHeader { linkWithFamily, historicalAppellations[], originOfHistoricalTerm,
    │                      whyProblematic, selfAppellation, contemporaryUsage,
    │                      geographicArea, numberOfLanguages, totalSpeakers }
    ├── generalInfo { branches[], geographicArea, numberOfLanguages, totalSpeakers }
    ├── associatedPeoples[] { name, peopleId }   ← 5–10 entries, peopleId never null
    ├── linguisticCharacteristics { typology, phonologicalFeatures,
    │                               relationsWithNeighbors, keyInnovations }
    ├── historyAndOrigins { probableOrigin, emergencePeriod, diffusion,
    │                       historicalBreaks, contactZones, majorEvents }
    ├── distribution { totalSpeakers, distributionByCountry: { ISO3: speakers } }
    └── sources[]
```

## Rule of thumb

When in doubt, open the matching `modele-*.json` and mirror it exactly. Extra keys, missing keys, or renamed keys break the parser.
