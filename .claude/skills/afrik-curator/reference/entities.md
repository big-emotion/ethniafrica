# The corpus classes

Every fiche is one JSON file on disk under `dataset/source/afrik/`. That file is the source
of truth; Supabase is a projection of it.

Shapes below are the model's, condensed. Read the model itself before writing — it is the
contract `validateAfrikData.ts` enforces.

## People — `PPL_*` → `peuples/<FLG_*>/PPL_*.json` — 800 fiches

Model `public/modele-peuple.json`.

Top level: `id`, `nameMain`, `languageFamilyId`, `currentCountries[]`,
`classificationStatus`, `content`.

`content` rubrics: `appellations`, `ethnicities`, `origins`, `organization`, `languages`,
`externalIdentifiers`, `historicalAffiliation`, `culture`, `historicalRole`, `demography`,
`sources`.

Each of those rubrics is a **chapter** of the fiche: it is printed whether or not the corpus
fills it, and an unfilled one is marked. An optional field _inside_ a rubric is not — see
"Chapter or field" below.

`culture` has two valid shapes: the simplified four-field form (about 96 % of fiches) and an
extended six-subsection form. Choose by the richness of the evidence, not by preference.

## Country — ISO 3166-1 alpha-3 → `pays/<ISO3>.json` — 54 fiches

Model `public/modele-pays.json`.

Top level: `id`, `nameFr`, `nameOfficial`, `summary`, `etymology`, `nameOriginActor`,
`content`.

`content` rubrics: `historicalNames`, `kingdoms`, `majorPeoples`, `culture`,
`historicalFacts`, `sources`, `demographics`.

`demographics.peoples[].percentageInCountry` must total 100 %.

## Linguistic family — `FLG_*` → `famille_linguistique/FLG_*.json` — 24 fiches

Model `public/modele-linguistique.json`.

Top level: `id`, `nameFr`, `nameEn`, `classificationStatus`, `content`.

`content` rubrics: `decolonialHeader`, `generalInfo`, `associatedPeoples`,
`linguisticCharacteristics`, `historyAndOrigins`, `distribution`, `sources`.

`associatedPeoples` wants 5–10 representative entries, each with a valid `peopleId`.

Alongside the fiches, `famille_linguistique/langue_par_famille.csv` carries 71 rows sourced
from Glottolog. Where a fiche and a CSV row describe the same language, the fiche wins.

## Language — ISO 639-3 → `langues/<iso>.json` — 24 fiches

Model `public/modele-langue.json`. Not to be confused with the family model.

Top level: `id` (the ISO code, matching the filename), `isoCode639_3`, `glottocode`,
`nameFr`, `nameEn`, `alternateNames[]`, `spellingAliases[]`, `familyId`, `peoples[]`,
`content`.

`content` has exactly four rubrics: `vehicularRole`, `dialects[]`, `vitalityStatus`,
`sources[]`.

`vehicularRole` is an enum: `vehicular | non_vehicular | national_official |
regional_lingua_franca`. `vitalityStatus` is `{ status, scale, asOf }` where scale is EGIDS
or UNESCO.

**State of the corpus:** `glottocode` and `nameEn` are filled on all 24. Everything optional
— `alternateNames`, `dialects`, `vitalityStatus`, `vehicularRole`, `peoples` — is filled on
exactly one fiche (`yor`), and `spellingAliases` on none. A further 53 languages exist in the
database from the CSV alone, with no fiche.

`validateAfrikData.ts` `LNG-schema` requires the top-level and `content` key sets to match
the model exactly. Enrichment fills values; it does not add keys.

## Name / patronyme — `PAT_*` → `patronymes/PAT_*.json` — 30 dossiers

Model `public/modele-nom-patronyme.json`, with four subtype variants: `-jamu`, `-nisba`,
`-patronymique`, `-totemique`. **The variants use different key names** — `namingSystem` and
`attestedForms` where the main model says `nameSystem` and `spellings`. The fiche route
serves the main model.

All 16 keys sit at the **root**; there is no `content` wrapper:

`id`, `nameMain`, `nameSystem`, `spellings`, `transmissionMode`, `designatedSocialUnit`,
`origin`, `peoples`, `countries`, `alliances`, `casteOrSocialFunction`, `bearers`,
`homonyms`, `sources`, `gaps`.

Nested shapes:

```
spellings[]  = { spelling, attestations[] = { countryId, sourceRefs[] } }
origin       = { oralTraditions[], writtenChronicles[], linguisticReconstructions[] }
peoples[]    = { peopleId, status, sourceRefs[] }     status: attested | supposed
countries[]  = { countryId, status, sourceRefs[] }
sources[]    = { sourceKey, title, url, tier, source_kind, notes }
gaps[]       = { fieldPath, reason }
casteOrSocialFunction = null | { value, sourceRefs[] }
```

`nameSystem` values in use: `clan_name` (18), `non_hereditary_patronymic` (4),
`totemic_clan` (4), `nisba` (2), `praise_name` (2).
`transmissionMode`: `patrilineal` (13), `other` (13), `non_hereditary` (4).

**State of the corpus:** `spellings`, `sources`, `gaps`, `designatedSocialUnit` and
`transmissionMode` are filled on all 30. `origin` (all three lists), `bearers`, `alliances`,
`homonyms` and `casteOrSocialFunction` are empty on all 30.

Two rules specific to this class:

- **`gaps[]` is rendered to the reader.** It is the fiche's own account of its silence,
  field by field, in prose an editor wrote. When a pass fills a field, remove its gap entry;
  when a field stays empty, its reason must still be true.
- **`bearers` is governed by DEC-040.** No living named individual unless they have publicly
  self-identified, cited as their own statement. Its emptiness on 30/30 is deliberate, not a
  gap to close casually.

## Ethnonym dossier — `PPL_*` → `noms/PPL_*.json` — 11 dossiers

Model `public/modele-nom.json`. Despite the filename, this is **not** the patronym model.

Top level: `id` (a `PPL_*`), `entityType: "people"`, `names[]`.

Each entry: `nameText`, `nameType` (`endonym | exonym | historical_spelling | surname`),
`languageOfOrigin`, `meaning`, `periodLabel`, `imposedBy`, `impositionPeriod`,
`whyProblematic`, `contemporaryUsage`, `sortRank`, `sources[]`.

These rows land in `name_records` and surface as the _Appellations_ module. Most rows there
are not written here: about 3 679 are derived from the `content.appellations` of people
fiches, and the derivation currently inserts `meaning`, `imposedBy` and `impositionPeriod`
as null (ETNI-1821). Writing a dossier here is how those fields get real values.

The model still shows the legacy numeric `"tier": 1`. Write the string scale instead.

## Relation — `REL_*` → `relations/REL_*.json` — 12 fiches

Model `public/modele-relation.json`. Flat: `id`, `relationType`, `peopleIdA`, `peopleIdB`,
`direction`, `period`, `description`, `sources`.

A relation is directed or mutual; check `direction` before asserting reciprocity.

## Migration — `MGR_*` → `migrations/MGR_*.json` — 6 fiches

Model `public/modele-migration.json`. `content` rubrics: `summary`, `narrative`, `debate`,
`sources`.

`debate` exists because a migration account is usually contested. Use it rather than
flattening competing scholarship into `narrative`.

## Other models on disk

`modele-source.json`, `modele-media.json`, `modele-recit-oral.json`,
`modele-frontiere-coloniale.json`, and `systemes_onomastiques/` (`ONS_*`, one fiche).

## Chapter or field — the distinction that governs empty values

The two granularities are deliberately not the same rule, and getting them the wrong way
round produces the two opposite failures.

- A **chapter** — a rubric of the model, like `origins` or `culture` — is one every fiche is
  structurally expected to fill. Its emptiness is a fact about the corpus, so the fiche says
  so, and the interface prints the chapter with a missing-data marker.
- A **field inside a block** — an exonym, a `whyProblematic` — is optional by design.
  Marking it would report a gap the model never opened.

`isStructurallyExpectedField` in `src/lib/fieldProvenance.ts` is what answers this, per
class, against the model.

Any value shown to a reader is one of three things and the interface says which: **declared**
by the fiche, **derived** from other fiches, or **missing**. A derived value never overrides
a declared one.
