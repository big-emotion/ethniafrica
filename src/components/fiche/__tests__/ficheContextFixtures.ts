/**
 * One fiche per entity type, shared by the panel-registry and the sequence
 * suites so both assert the resolution matrix against the same corpus shape.
 *
 * Each payload carries every section `derivePanelSequence` gates on, so the
 * composer yields the entity's full inventory and the suites can isolate what
 * the registry itself drops.
 */

import type { PeopleNamesDossier } from "@/api/v2/schemas/names";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";
import type { CountryDistributionRow } from "@/lib/peopleDataTransformer";
import type {
  CountryDetail,
  LanguageFamilyDetail,
  PeopleDetail,
} from "@/types/afrik-frontend";
import type { SourcedRelation } from "@/types/relations";

// @req REQ-091
export const YORUBA: PeopleDetail = {
  id: "PPL_YORUBA",
  nameMain: "Yoruba",
  languageFamilyId: "FLG_NIGER_CONGO",
  currentCountries: ["NGA", "BEN"],
  ethnicities: ["Ọ̀yọ́"],
  origins: { ancientOrigins: "Ilé-Ifẹ̀" },
  languages: { mainLanguage: "yoruba", isoCodes: ["yor"] },
  historicalRole: { kingdomsOrChiefdoms: "Ọ̀yọ́" },
  culture: { spiritualities: "Olódùmarè, dieu créateur suprême" },
  demography: {
    totalPopulation: 42_000_000,
    referenceYear: 2025,
    source: "UNFPA, World Population Prospects 2025",
  },
  // All 789 people fiches carry sources, and the head's confidence chip links
  // to the footer they render. A fixture without them models a fiche the
  // corpus does not contain, and makes that citation dangle for a reason no
  // reader will ever meet.
  sources: [{ title: "SIL Ethnologue, Yoruba", url: null, tier: "unverified" }],
};

// @req REQ-091
export const NIGERIA: CountryDetail = {
  id: "NGA",
  nameFr: "Nigéria",
  nameCommonFr: "Nigéria",
  historicalNames: { precolonial: "Oyo, Bénin, Kanem-Bornou" },
  majorPeoples: [{ name: "Yoruba" }],
  historicalFacts: { colonization: "Protectorat britannique" },
  culture: { dominantReligions: "Islam, christianisme" },
  demographics: {
    peoples: [
      { name: "Yoruba", population: 38_000_000, percentageInCountry: 18 },
    ],
  },
  sources: [
    { title: "CIA World Factbook, 2025", url: null, tier: "unverified" },
  ],
};

// @req REQ-091
export const NIGER_CONGO: LanguageFamilyDetail = {
  id: "FLG_NIGER_CONGO",
  nameFr: "Niger-Congo",
  generalInfo: {
    numberOfLanguages: 1542,
    branches: ["Bénoué-Congo"],
    geographicArea: "Afrique subsaharienne",
  },
  linguisticCharacteristics: { typology: "Classes nominales" },
  associatedPeoples: [{ name: "Yoruba", peopleId: "PPL_YORUBA" }],
  historyAndOrigins: { probableOrigin: "Bassin du Niger" },
  sources: [{ title: "Glottolog 5.0", url: null, tier: "unverified" }],
};

// @req REQ-091
export const YORUBA_NAMES_DOSSIER: PeopleNamesDossier = {
  peopleId: "PPL_YORUBA",
  autonym: null,
  names: [
    {
      id: "name-1",
      nameText: "Yorùbá ènìyàn",
      nameType: "endonym",
      languageOfOrigin: "yor",
      meaning: null,
      periodLabel: null,
      imposition: null,
      assertionId: "assertion-1",
      sources: [],
      confidence: null,
    },
  ],
};

// @req REQ-091
export const YORUBA_DISTRIBUTIONS: CountryDistributionRow[] = [
  { country: "NGA", percentage: 70, populationFormatted: "29,4M" },
  { country: "BEN", percentage: 30, populationFormatted: "12,6M" },
];

// @req REQ-091
export const YORUBA_FRAGMENTATION: PeopleFragmentation = {
  peopleId: "PPL_YORUBA",
  autonym: null,
  exonym: "Yoruba",
  countryCount: 2,
  countries: [
    { iso3: "NGA", nameFr: "Nigéria", populationShare: 0.7, assertionId: null },
    { iso3: "BEN", nameFr: "Bénin", populationShare: 0.3, assertionId: null },
  ],
  borderPairs: [{ a: "NGA", b: "BEN" }],
};

// @req REQ-091
export const RELATIONS: SourcedRelation[] = [
  {
    id: "REL_YORUBA_FON_MIGRATION",
    relationType: "migratory",
    direction: "bidirectional",
    period: { startYear: 1600, endYear: 1700, label: "XVIIe siècle" },
    description: "Migration conjointe vers le golfe du Bénin.",
    sources: [],
    confidence: null,
    neighbor: { id: "PPL_FON", nameMain: "Fon", languageFamilyId: "FLG_KWA" },
  },
];
