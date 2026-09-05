/**
 * The four translation classes, declared leaf by leaf for the sixteen strict
 * models in public/modele-*.json (REQ-143, DEC-047).
 *
 * The corpus is 1.9M words whose subject is partly language itself, so one
 * treatment cannot fit every field. An autonym translated would repeat the
 * renaming the fiche exists to document; a source title translated stops
 * being citable; a claim *about* a word machine-translated comes out false
 * (PPL_ASANTE's "les chercheurs anglophones…" addresses the English reader
 * as a third party once translated). Hence four classes:
 *
 *   invariant        carried over verbatim — names, identifiers, citations
 *   translatable     narrative prose — translated, machine or human
 *   review_required  anything about the meaning of a word — translated, but
 *                    never published at machine provenance
 *   generated        authored per locale in code (quiz stems, prepositions,
 *                    admin-0 names) — never stored as translated data, which
 *                    is why no model leaf below carries it
 *
 * This file is configuration read by the translation command, the sidecar
 * rules and the coverage gate in scripts/validateAfrikData.ts; the gate is
 * what stops a model gaining a field this table does not know about.
 * Rationale, the class-3 narrowing and the PAT decision are in
 * docs/editorial/translation-classes.md.
 */

import { modelLeafPaths } from "./modelLeafPaths";

export type TranslationClass =
  "invariant" | "translatable" | "review_required" | "generated";

// @req REQ-143
export const STRICT_MODEL_FILES = [
  "modele-frontiere-coloniale.json",
  "modele-langue.json",
  "modele-linguistique.json",
  "modele-media.json",
  "modele-migration.json",
  "modele-nom-jamu.json",
  "modele-nom-nisba.json",
  "modele-nom-patronyme.json",
  "modele-nom-patronymique.json",
  "modele-nom-totemique.json",
  "modele-nom.json",
  "modele-pays.json",
  "modele-peuple.json",
  "modele-recit-oral.json",
  "modele-relation.json",
  "modele-source.json",
] as const;

export type StrictModelFile = (typeof STRICT_MODEL_FILES)[number];

type ClassTable = Readonly<Record<string, TranslationClass>>;

/** A structured source entry as the peuple/pays/langue/famille models cite it. */
function sourceEntry(prefix: string): ClassTable {
  return {
    [`${prefix}.title`]: "invariant",
    [`${prefix}.url`]: "invariant",
    [`${prefix}.tier`]: "invariant",
    [`${prefix}.notes`]: "translatable",
  };
}

/**
 * The four ONS_* naming-system models share one core; each adds at most three
 * subtype-only leaves (docs/design/naming-subtype-taxonomy.md).
 */
const NAMING_SYSTEM_CORE: ClassTable = {
  "_meta.*": "invariant",
  id: "invariant",
  nameMain: "invariant",
  namingSystem: "invariant",
  "attestedForms[].spelling": "invariant",
  ...sourceEntry("attestedForms[].attestation"),
  transmissionMode: "invariant",
  designatedSocialUnit: "invariant",
  "associatedPeoples[]": "invariant",
  "associatedCountries[]": "invariant",
  "origin.originType": "invariant",
  ...sourceEntry("origin.sources[]"),
};

// @req REQ-143
export const TRANSLATION_CLASSES: Readonly<
  Record<StrictModelFile, ClassTable>
> = {
  "modele-frontiere-coloniale.json": {
    "_meta.*": "invariant",
    id: "invariant",
    // Locale-suffixed key: an English sidecar carries `title_en`, a rule the
    // sidecar layout (REQ-146) owns. The class is the same either way.
    title_fr: "translatable",
    reference_period: "invariant",
    "colonial_powers[]": "invariant",
    geometry_file: "invariant",
    simplification_note: "translatable",
    "sources[].reference": "invariant",
    "sources[].tier": "invariant",
    "sources[].notes": "translatable",
    license: "invariant",
  },

  "modele-langue.json": {
    "_meta.*": "invariant",
    id: "invariant",
    isoCode639_3: "invariant",
    glottocode: "invariant",
    nameFr: "invariant",
    nameEn: "invariant",
    "alternateNames[]": "invariant",
    "spellingAliases[]": "invariant",
    familyId: "invariant",
    "peoples[].name": "invariant",
    "peoples[].peopleId": "invariant",
    "content.vehicularRole": "invariant",
    "content.dialects[]": "invariant",
    "content.vitalityStatus.status": "invariant",
    "content.vitalityStatus.scale": "invariant",
    "content.vitalityStatus.asOf": "invariant",
    ...sourceEntry("content.sources[]"),
  },

  "modele-linguistique.json": {
    "_meta.*": "invariant",
    id: "invariant",
    nameFr: "invariant",
    nameEn: "invariant",
    classificationStatus: "invariant",
    "content.decolonialHeader.linkWithFamily": "translatable",
    "content.decolonialHeader.historicalAppellations[]": "invariant",
    "content.decolonialHeader.originOfHistoricalTerm": "review_required",
    "content.decolonialHeader.whyProblematic": "review_required",
    "content.decolonialHeader.selfAppellation": "invariant",
    "content.decolonialHeader.contemporaryUsage": "review_required",
    "content.decolonialHeader.geographicArea": "translatable",
    "content.decolonialHeader.numberOfLanguages": "invariant",
    "content.decolonialHeader.totalSpeakers": "invariant",
    "content.generalInfo.branches[]": "invariant",
    "content.generalInfo.geographicArea": "translatable",
    "content.generalInfo.numberOfLanguages": "invariant",
    "content.generalInfo.totalSpeakers": "invariant",
    "content.associatedPeoples[].name": "invariant",
    "content.associatedPeoples[].peopleId": "invariant",
    "content.linguisticCharacteristics.typology": "translatable",
    "content.linguisticCharacteristics.phonologicalFeatures": "translatable",
    "content.linguisticCharacteristics.relationsWithNeighbors": "translatable",
    "content.linguisticCharacteristics.keyInnovations": "translatable",
    "content.historyAndOrigins.probableOrigin": "translatable",
    "content.historyAndOrigins.emergencePeriod": "translatable",
    "content.historyAndOrigins.diffusion": "translatable",
    "content.historyAndOrigins.historicalBreaks": "translatable",
    "content.historyAndOrigins.contactZones": "translatable",
    "content.historyAndOrigins.majorEvents": "translatable",
    "content.distribution.totalSpeakers": "invariant",
    "content.distribution.distributionByCountry.*": "invariant",
    ...sourceEntry("content.sources[]"),
  },

  "modele-media.json": {
    "_meta.*": "invariant",
    id: "invariant",
    "links.languageFamilyId": "invariant",
    "links.languageId": "invariant",
    "links.peopleId": "invariant",
    "links.countryId": "invariant",
    author: "invariant",
    "licence.uri": "invariant",
    "sourcePage.url": "invariant",
    period: "translatable",
    depictionTiming: "invariant",
  },

  "modele-migration.json": {
    "_meta.*": "invariant",
    id: "invariant",
    // An event title ("Expansion bantoue"), not a proper name — the one
    // nameMain that translates. See CLASS_EXCEPTIONS.
    nameMain: "translatable",
    migrationGroup: "invariant",
    eventType: "invariant",
    classificationStatus: "invariant",
    "timeRange.startYear": "invariant",
    "timeRange.endYear": "invariant",
    "timeRange.datingNote": "translatable",
    "geometry.type": "invariant",
    "geometry.coordinates[]": "invariant",
    "peoplesInvolved[].id": "invariant",
    "peoplesInvolved[].role": "invariant",
    "content.summary": "translatable",
    "content.narrative": "translatable",
    "content.debate": "translatable",
    "content.sources[].year": "invariant",
    ...sourceEntry("content.sources[]"),
  },

  "modele-nom-jamu.json": NAMING_SYSTEM_CORE,

  "modele-nom-nisba.json": {
    ...NAMING_SYSTEM_CORE,
    nisbaSubtype: "invariant",
  },

  "modele-nom-patronyme.json": {
    "_meta.*": "invariant",
    id: "invariant",
    nameMain: "invariant",
    nameSystem: "invariant",
    "spellings[].spelling": "invariant",
    "spellings[].attestations[].countryId": "invariant",
    "spellings[].attestations[].sourceRefs[]": "invariant",
    transmissionMode: "invariant",
    designatedSocialUnit: "invariant",
    // A genealogical narrative attributed to a griot: prose about people and
    // places, translatable. The transcription is the account in its own
    // language and a locator — reviewed, like a récit-oral transcript.
    "origin.oralTraditions[].claim": "translatable",
    "origin.oralTraditions[].claimStatus": "invariant",
    "origin.oralTraditions[].griot": "invariant",
    "origin.oralTraditions[].transcription": "review_required",
    "origin.oralTraditions[].sourceRefs[]": "invariant",
    // origin.writtenChronicles[], origin.linguisticReconstructions[] and
    // casteOrSocialFunction are `[]` / null in the model; their shape comes
    // from the parser and is declared in PARSER_ONLY_LEAVES.
    "peoples[].peopleId": "invariant",
    "peoples[].status": "invariant",
    "peoples[].sourceRefs[]": "invariant",
    "countries[].countryId": "invariant",
    "countries[].status": "invariant",
    "countries[].sourceRefs[]": "invariant",
    "alliances[].targetPatronymeId": "invariant",
    "alliances[].allianceType": "invariant",
    "alliances[].sourceRefs[]": "invariant",
    "bearers[].status": "invariant",
    "bearers[].personId": "invariant",
    "bearers[].sourceRefs[]": "invariant",
    "homonyms[].label": "invariant",
    "homonyms[].entityType": "invariant",
    "homonyms[].entityId": "invariant",
    "homonyms[].distinction": "translatable",
    "homonyms[].sourceRefs[]": "invariant",
    "sources[].sourceKey": "invariant",
    "sources[].title": "invariant",
    "sources[].url": "invariant",
    "sources[].tier": "invariant",
    "sources[].source_kind": "invariant",
    "sources[].notes": "translatable",
    "gaps[].fieldPath": "invariant",
    "gaps[].reason": "translatable",
  },

  "modele-nom-patronymique.json": {
    ...NAMING_SYSTEM_CORE,
    patronymicChainDepth: "invariant",
  },

  "modele-nom-totemique.json": {
    ...NAMING_SYSTEM_CORE,
    totemicFoodProhibition: "translatable",
    "permittedGivenNames[]": "invariant",
    casteOrSocialFunction: "translatable",
  },

  "modele-nom.json": {
    "_meta.*": "invariant",
    id: "invariant",
    entityType: "invariant",
    "names[].nameText": "invariant",
    "names[].nameType": "invariant",
    "names[].languageOfOrigin": "invariant",
    "names[].meaning": "review_required",
    "names[].periodLabel": "translatable",
    "names[].imposedBy": "translatable",
    "names[].impositionPeriod": "translatable",
    "names[].whyProblematic": "review_required",
    "names[].contemporaryUsage": "review_required",
    "names[].sortRank": "invariant",
    "names[].sources[].author": "invariant",
    "names[].sources[].year": "invariant",
    ...sourceEntry("names[].sources[]"),
  },

  "modele-pays.json": {
    "_meta.*": "invariant",
    id: "invariant",
    // Locale-bound by its key; the English display name is class 4, read
    // from Admin0Country.name through getAdmin0Name(id, "en").
    nameFr: "invariant",
    // A protocol name whose English form is a convention of the state, not a
    // translation of the French one.
    nameOfficial: "review_required",
    summary: "translatable",
    etymology: "review_required",
    nameOriginActor: "translatable",
    // Colonial-era names have English forms of their own: Haute-Volta is
    // Upper Volta, not "High Volta".
    "content.historicalNames.formerNames[]": "review_required",
    "content.historicalNames.antiquity": "translatable",
    "content.historicalNames.middleAges": "translatable",
    "content.historicalNames.precolonial": "translatable",
    "content.historicalNames.colonization": "translatable",
    "content.historicalNames.contemporary": "translatable",
    "content.kingdoms[].name": "review_required",
    "content.kingdoms[].period": "translatable",
    "content.kingdoms[].dominantPeoples[]": "invariant",
    "content.kingdoms[].politicalCenters[]": "invariant",
    "content.kingdoms[].historicalRole": "translatable",
    "content.majorPeoples[].name": "invariant",
    "content.majorPeoples[].selfAppellation": "invariant",
    "content.majorPeoples[].exonyms[]": "invariant",
    "content.majorPeoples[].peopleId": "invariant",
    "content.majorPeoples[].mainRegion": "translatable",
    "content.majorPeoples[].languages[]": "invariant",
    "content.majorPeoples[].languageFamily": "invariant",
    "content.majorPeoples[].appellationRemarks": "review_required",
    "content.culture.mainLanguages[].name": "invariant",
    "content.culture.mainLanguages[].isoCode": "invariant",
    "content.culture.mainLanguages[].isPrimary": "invariant",
    "content.culture.culturalTraditions": "translatable",
    "content.culture.dominantReligions": "translatable",
    "content.culture.lifestyles": "translatable",
    "content.culture.socialOrganization": "translatable",
    "content.culture.regionalRelations": "translatable",
    "content.historicalFacts.ancientPeriods": "translatable",
    "content.historicalFacts.middleAges": "translatable",
    "content.historicalFacts.precolonial": "translatable",
    "content.historicalFacts.colonization": "translatable",
    "content.historicalFacts.independenceStruggle": "translatable",
    "content.historicalFacts.postIndependence": "translatable",
    ...sourceEntry("content.sources[]"),
    "content.demographics.totalPopulation": "invariant",
    "content.demographics.referenceYear": "invariant",
    "content.demographics.source": "invariant",
    "content.demographics.peoples[].name": "invariant",
    "content.demographics.peoples[].peopleId": "invariant",
    "content.demographics.peoples[].population": "invariant",
    "content.demographics.peoples[].referenceYear": "invariant",
    "content.demographics.peoples[].percentageInCountry": "invariant",
    "content.demographics.peoples[].percentageInAfrica": "invariant",
    "content.demographics.peoples[].region": "translatable",
    "content.demographics.peoples[].languageFamily": "invariant",
    "content.demographics.peoples[].mainLanguageCode": "invariant",
  },

  "modele-peuple.json": {
    "_meta.*": "invariant",
    id: "invariant",
    nameMain: "invariant",
    languageFamilyId: "invariant",
    "currentCountries[]": "invariant",
    classificationStatus: "invariant",
    "content.appellations.mainName": "invariant",
    "content.appellations.selfAppellation": "invariant",
    "content.appellations.exonyms[]": "invariant",
    "content.appellations.spellingAliases[]": "invariant",
    "content.appellations.originOfExonyms": "review_required",
    "content.appellations.whyProblematic": "review_required",
    "content.appellations.contemporaryUsage": "review_required",
    "content.appellations.peopleGroupId": "invariant",
    "content.appellations.peopleGroupLabel": "invariant",
    "content.ethnicities[]": "invariant",
    "content.origins.ancientOrigins": "translatable",
    "content.origins.formationPeriod": "translatable",
    "content.origins.migrationRoutes[]": "translatable",
    "content.origins.historicalSettlementZones[]": "translatable",
    "content.origins.unificationsOrDivisions": "translatable",
    "content.origins.externalInfluences": "translatable",
    "content.origins.majorHistoricalEvents": "translatable",
    "content.organization.traditionalPoliticalSystem": "translatable",
    "content.organization.clanOrganization": "translatable",
    "content.organization.ageClassSystems": "translatable",
    "content.organization.roleOfLineages": "translatable",
    "content.organization.religiousAuthority": "translatable",
    "content.languages.mainLanguage": "invariant",
    "content.languages.isoCodes[]": "invariant",
    "content.languages.dialects[]": "invariant",
    // The model shows null and the langue model an enum, but 800 fiches
    // write a paragraph here ("Le swahili est la langue nationale et…").
    // See CLASS_EXCEPTIONS.
    "content.languages.vehicularRole": "translatable",
    "content.externalIdentifiers.wikidataId": "invariant",
    "content.externalIdentifiers.glottocode": "invariant",
    "content.externalIdentifiers.iso639_3": "invariant",
    "content.historicalAffiliation.description": "translatable",
    ...sourceEntry("content.historicalAffiliation.sources[]"),
    "content.culture.majorRites": "translatable",
    "content.culture.symbols": "translatable",
    "content.culture.artsAndMusic": "translatable",
    "content.culture.spiritualities": "translatable",
    "content.historicalRole.kingdomsOrChiefdoms": "translatable",
    "content.historicalRole.relationsWithNeighbors": "translatable",
    "content.historicalRole.conflictsOrAlliances": "translatable",
    "content.historicalRole.diaspora": "translatable",
    "content.demography.totalPopulation": "invariant",
    "content.demography.referenceYear": "invariant",
    "content.demography.source": "invariant",
    "content.demography.distributionByCountry[].country": "invariant",
    "content.demography.distributionByCountry[].population": "invariant",
    "content.demography.distributionByCountry[].percentage": "invariant",
    "content.demography.distributionByCountry[].note": "translatable",
    ...sourceEntry("content.sources[]"),
  },

  "modele-recit-oral.json": {
    "_meta.*": "invariant",
    id: "invariant",
    "links.languageFamilyId": "invariant",
    "links.peopleId": "invariant",
    "links.countryId": "invariant",
    "links.assertionId": "invariant",
    "attribution.displayMode": "invariant",
    "attribution.displayName": "invariant",
    "attribution.community": "translatable",
    "attribution.collector": "invariant",
    "context.narrativeDate": "invariant",
    "context.placePrecision": "invariant",
    "context.languageCode": "invariant",
    "context.narrativeKind": "invariant",
    // An attributed account in its own language is never machine-published.
    "content.transcript": "review_required",
    "content.summary": "translatable",
    "content.mediaLocator": "invariant",
    variantOf: "invariant",
    visibility: "invariant",
    reviewStatus: "invariant",
    rightsStatus: "invariant",
  },

  "modele-relation.json": {
    "_meta.*": "invariant",
    id: "invariant",
    relationType: "invariant",
    peopleIdA: "invariant",
    peopleIdB: "invariant",
    direction: "invariant",
    "period.startYear": "invariant",
    "period.endYear": "invariant",
    "period.label": "translatable",
    description: "translatable",
    "sources[].author": "invariant",
    "sources[].year": "invariant",
    ...sourceEntry("sources[]"),
  },

  // A source and an assertion reference, not a fiche: citation metadata only.
  "modele-source.json": {
    "_meta.*": "invariant",
    "source.sourceKey": "invariant",
    "source.title": "invariant",
    "source.authors[]": "invariant",
    "source.publicationYear": "invariant",
    "source.sourceKind": "invariant",
    "source.identifiers.catalogue": "invariant",
    "source.publisher": "invariant",
    "source.url": "invariant",
    "assertionReference.sourceKey": "invariant",
    "assertionReference.locatorType": "invariant",
    "assertionReference.locatorValue": "invariant",
  },
};

export interface ParserOnlyLeaf {
  model: StrictModelFile;
  path: string;
  class: TranslationClass;
  /** Repository path of the parser that defines the leaf, for the reader who asks where it comes from. */
  parser: string;
}

const PATRONYME_PARSER = "src/lib/afrik/parsers/patronymeParser.ts";

function patronymeLeaf(path: string, cls: TranslationClass): ParserOnlyLeaf {
  return {
    model: "modele-nom-patronyme.json",
    path,
    class: cls,
    parser: PATRONYME_PARSER,
  };
}

/**
 * Leaves a parser accepts that its model does not show.
 *
 * modele-nom-patronyme.json writes `casteOrSocialFunction: null` and two
 * origin arrays as `[]`, while patronymeParser.ts defines `{value, sourceRefs}`
 * and `{claim, claimStatus, sourceRefs}` for them — and PAT_DIABY carries 900
 * characters of prose in the first. checkPatronymeFicheModel validates against
 * the parser, so the model alone is not the contract and a declaration that
 * walked only the model would let that prose through unclassed. A model leaf
 * that is null or `[]` is covered by the parser-only leaves beneath it.
 */
// @req REQ-143
export const PARSER_ONLY_LEAVES: readonly ParserOnlyLeaf[] = [
  patronymeLeaf("casteOrSocialFunction.value", "translatable"),
  patronymeLeaf("casteOrSocialFunction.sourceRefs[]", "invariant"),
  patronymeLeaf("origin.writtenChronicles[].claim", "translatable"),
  patronymeLeaf("origin.writtenChronicles[].claimStatus", "invariant"),
  patronymeLeaf("origin.writtenChronicles[].sourceRefs[]", "invariant"),
  // A linguistic reconstruction is a claim about the word itself — the one
  // origin array whose claims are class 3.
  patronymeLeaf("origin.linguisticReconstructions[].claim", "review_required"),
  patronymeLeaf("origin.linguisticReconstructions[].claimStatus", "invariant"),
  patronymeLeaf("origin.linguisticReconstructions[].sourceRefs[]", "invariant"),
  patronymeLeaf("bearers[].displayName", "invariant"),
  patronymeLeaf("bearers[].description", "translatable"),
  patronymeLeaf("bearers[].selfIdentificationSourceRef", "invariant"),
  patronymeLeaf("sources[].isSelfIdentification", "invariant"),
  patronymeLeaf("patronymicChainDepth.generations", "invariant"),
  patronymeLeaf("patronymicChainDepth.sourceRefs[]", "invariant"),
  patronymeLeaf("nisbaSubtype.value", "invariant"),
  patronymeLeaf("nisbaSubtype.sourceRefs[]", "invariant"),
  patronymeLeaf("totemicFoodProhibition.value", "translatable"),
  patronymeLeaf("totemicFoodProhibition.sourceRefs[]", "invariant"),
  patronymeLeaf("permittedGivenNames[].name", "invariant"),
  patronymeLeaf("permittedGivenNames[].sourceRefs[]", "invariant"),
];

export interface GlossedInvariantPath {
  model: StrictModelFile;
  path: string;
}

/**
 * Class-1 leaves whose values carry a parenthetical French gloss —
 * "Hottentots (péjoratif, colonial)", "Jie (Ngijie)", "Clan Oyoko (clan royal
 * fondateur)". The name before the parenthesis is the invariant; the gloss is
 * prose and translates. The translation command and the curator skill read
 * this one list so they cannot disagree about which leaves it applies to.
 *
 * `content.languages.mainLanguage` and `majorPeoples[].languages[]` are not
 * here on purpose: their parenthesis holds an ISO code, which is invariant.
 */
// @req REQ-143
export const GLOSSED_INVARIANT_PATHS: readonly GlossedInvariantPath[] = [
  { model: "modele-peuple.json", path: "content.appellations.selfAppellation" },
  { model: "modele-peuple.json", path: "content.appellations.exonyms[]" },
  {
    model: "modele-peuple.json",
    path: "content.appellations.spellingAliases[]",
  },
  { model: "modele-peuple.json", path: "content.ethnicities[]" },
  { model: "modele-peuple.json", path: "content.languages.dialects[]" },
  { model: "modele-pays.json", path: "content.majorPeoples[].selfAppellation" },
  { model: "modele-pays.json", path: "content.majorPeoples[].exonyms[]" },
  { model: "modele-pays.json", path: "content.kingdoms[].dominantPeoples[]" },
  {
    model: "modele-linguistique.json",
    path: "content.decolonialHeader.historicalAppellations[]",
  },
  {
    model: "modele-linguistique.json",
    path: "content.decolonialHeader.selfAppellation",
  },
  { model: "modele-langue.json", path: "alternateNames[]" },
  { model: "modele-langue.json", path: "spellingAliases[]" },
  { model: "modele-langue.json", path: "content.dialects[]" },
];

/**
 * The part of a glossed value that must survive translation untouched: every
 * parenthetical stripped, so "Jieng (pluriel) / Muonyjang (singulier)" keeps
 * both names and releases both glosses.
 */
// @req REQ-143
export function glossedInvariantName(value: string): string {
  return value.replace(/\s*\([^)]*\)/g, "").trim();
}

// @req REQ-143
export function isGlossedInvariant(
  model: StrictModelFile,
  path: string
): boolean {
  return GLOSSED_INVARIANT_PATHS.some(
    (entry) => entry.model === model && entry.path === path
  );
}

export interface ClassException {
  leafName: string;
  reason: string;
}

/**
 * Leaf names that legitimately carry different classes in different models.
 * The consistency test refuses any other divergence, so a new one has to be
 * argued here rather than slipped into a table.
 */
// @req REQ-143
export const CLASS_EXCEPTIONS: readonly ClassException[] = [
  {
    leafName: "nameMain",
    reason:
      "a people, a name or a naming system is a proper name (invariant); a migration's nameMain is an event title (translatable)",
  },
  {
    leafName: "claim",
    reason:
      "oral traditions and written chronicles narrate (translatable); a linguistic reconstruction is a claim about the word (review_required)",
  },
  {
    leafName: "value",
    reason:
      "the parser's {value, sourceRefs} wrapper holds prose under casteOrSocialFunction and totemicFoodProhibition, an enum under nisbaSubtype",
  },
  {
    leafName: "label",
    reason:
      "relation.period.label is a French period wording (translatable); a patronyme homonym's label is the homonymous string itself (invariant)",
  },
  {
    leafName: "vehicularRole",
    reason:
      "an enum on the langue model (invariant), a paragraph on the peuple model (translatable)",
  },
  {
    leafName: "name",
    reason:
      "a people's or a language's name is a proper name (invariant); a kingdom's name has conventional English forms — Royaume du Kongo is the Kingdom of Kongo (review_required)",
  },
];

/**
 * Subtrees whose keys are data rather than schema. `_meta` on every model;
 * the ISO-keyed speaker map on the family model.
 */
const ISO_KEYED_MAPS: Partial<Record<StrictModelFile, readonly string[]>> = {
  "modele-linguistique.json": ["content.distribution.distributionByCountry"],
};

/** The leaf paths a declaration for `model` must cover, from the model's JSON. */
// @req REQ-143
export function modelLeaves(
  model: StrictModelFile,
  modelJson: unknown
): string[] {
  return modelLeafPaths(modelJson, ["_meta", ...(ISO_KEYED_MAPS[model] ?? [])]);
}

function isUnder(path: string, parent: string): boolean {
  return (
    path === parent ||
    path.startsWith(`${parent}.`) ||
    path.startsWith(`${parent}[`)
  );
}

/**
 * The class of one leaf, or undefined when the declaration does not know it.
 * A concrete path (`content.exonyms[]`, `_meta.format`,
 * `content.distribution.distributionByCountry.GHA`) resolves through the
 * table, then the parser-only leaves, then a wildcard subtree.
 */
// @req REQ-143
export function classOf(
  model: StrictModelFile,
  path: string
): TranslationClass | undefined {
  const declared = TRANSLATION_CLASSES[model][path];
  if (declared) return declared;

  const parserOnly = PARSER_ONLY_LEAVES.find(
    (leaf) => leaf.model === model && leaf.path === path
  );
  if (parserOnly) return parserOnly.class;

  for (const [declaredPath, cls] of Object.entries(
    TRANSLATION_CLASSES[model]
  )) {
    if (!declaredPath.endsWith(".*")) continue;
    if (isUnder(path, declaredPath.slice(0, -2))) return cls;
  }
  return undefined;
}

export interface CoverageGaps {
  /** Model leaves the declaration does not classify. */
  undeclared: string[];
  /** Declared paths the model no longer has (or parser-only paths the model does show). */
  dead: string[];
}

/** What separates the model from its declaration — empty both ways when they agree. */
// @req REQ-143
export function coverageGaps(
  model: StrictModelFile,
  modelJson: unknown
): CoverageGaps {
  const leaves = modelLeaves(model, modelJson);
  const parserOnly = PARSER_ONLY_LEAVES.filter((leaf) => leaf.model === model);
  const table = TRANSLATION_CLASSES[model];

  const undeclared = leaves.filter(
    (leaf) =>
      !table[leaf] && !parserOnly.some((entry) => isUnder(entry.path, leaf))
  );
  const dead = [
    ...Object.keys(table).filter((path) => !leaves.includes(path)),
    ...parserOnly
      .map((entry) => entry.path)
      .filter((path) => leaves.includes(path)),
  ];

  return { undeclared, dead };
}
