import type {
  ClassificationStatus,
  LanguageFamily,
  PeopleReference,
} from "@/types/afrik";

export interface FamilyHeroData {
  id: string;
  nameFr: string;
  nameEn: string | null;
  classificationStatus: ClassificationStatus | null;
}

export interface FamilyDecolonialHeaderData {
  linkWithFamily: string | null;
  nameFr: string | null;
  nameEn: string | null;
  historicalAppellations: string[];
  originOfHistoricalTerm: string | null;
  whyProblematic: string | null;
  selfAppellation: string | null;
  contemporaryUsage: string | null;
  geographicArea: string | null;
  numberOfLanguages: number | null;
  totalSpeakers: number | null;
}

export interface FamilyGeneralInfoData {
  branches: string[];
  geographicArea: string | null;
  numberOfLanguages: number | null;
  totalSpeakers: number | null;
  associatedPeoples: PeopleReference[];
}

export interface FamilyLinguisticTraitsData {
  typology: string | null;
  phonologicalFeatures: string | null;
  relationsWithNeighbors: string | null;
  keyInnovations: string | null;
}

export interface FamilyHistoryData {
  probableOrigin: string | null;
  emergencePeriod: string | null;
  diffusion: string | null;
  historicalBreaks: string | null;
  contactZones: string | null;
  majorEvents: string | null;
}

export interface FamilyDistributionData {
  totalSpeakers: number | null;
  distributionByCountry: Record<string, number>;
}

export interface FamilyPageData {
  hero: FamilyHeroData;
  decolonialHeader: FamilyDecolonialHeaderData;
  generalInfo: FamilyGeneralInfoData;
  linguisticTraits: FamilyLinguisticTraitsData;
  history: FamilyHistoryData;
  distribution: FamilyDistributionData;
  sources: string[];
}

// @req REQ-047
export function transformFamilyHero(family: LanguageFamily): FamilyHeroData {
  return {
    id: family.id,
    nameFr: family.nameFr,
    nameEn: family.nameEn ?? null,
    classificationStatus: family.classificationStatus ?? null,
  };
}

// @req REQ-047
export function transformDecolonialHeader(
  family: LanguageFamily
): FamilyDecolonialHeaderData {
  const header = family.content?.decolonialHeader ?? {};

  return {
    linkWithFamily: header.linkWithFamily ?? null,
    nameFr: header.nameFr ?? null,
    nameEn: header.nameEn ?? null,
    historicalAppellations: header.historicalAppellations ?? [],
    originOfHistoricalTerm: header.originOfHistoricalTerm ?? null,
    whyProblematic: header.whyProblematic ?? null,
    selfAppellation: header.selfAppellation ?? null,
    contemporaryUsage: header.contemporaryUsage ?? null,
    geographicArea: header.geographicArea ?? null,
    numberOfLanguages: header.numberOfLanguages ?? null,
    totalSpeakers: header.totalSpeakers ?? null,
  };
}

// @req REQ-047
export function transformGeneralInfo(
  family: LanguageFamily
): FamilyGeneralInfoData {
  const content = family.content ?? {};
  const generalInfo = content.generalInfo ?? {};

  return {
    branches: generalInfo.branches ?? [],
    geographicArea: generalInfo.geographicArea ?? null,
    numberOfLanguages: generalInfo.numberOfLanguages ?? null,
    totalSpeakers: generalInfo.totalSpeakers ?? null,
    associatedPeoples:
      family.associatedPeoples ?? content.associatedPeoples ?? [],
  };
}

// @req REQ-047
export function transformLinguisticTraits(
  family: LanguageFamily
): FamilyLinguisticTraitsData {
  const traits = family.content?.linguisticCharacteristics ?? {};

  return {
    typology: traits.typology ?? null,
    phonologicalFeatures: traits.phonologicalFeatures ?? null,
    relationsWithNeighbors: traits.relationsWithNeighbors ?? null,
    keyInnovations: traits.keyInnovations ?? null,
  };
}

// @req REQ-047
export function transformHistory(family: LanguageFamily): FamilyHistoryData {
  const history = family.content?.historyAndOrigins ?? {};

  return {
    probableOrigin: history.probableOrigin ?? null,
    emergencePeriod: history.emergencePeriod ?? null,
    diffusion: history.diffusion ?? null,
    historicalBreaks: history.historicalBreaks ?? null,
    contactZones: history.contactZones ?? null,
    majorEvents: history.majorEvents ?? null,
  };
}

// @req REQ-047
export function transformDistribution(
  family: LanguageFamily
): FamilyDistributionData {
  const distribution = family.content?.distribution ?? {};

  return {
    totalSpeakers: distribution.totalSpeakers ?? null,
    distributionByCountry: distribution.distributionByCountry ?? {},
  };
}

// @req REQ-047
export function transformSources(family: LanguageFamily): string[] {
  return family.content?.sources ?? [];
}

// @req REQ-047
export function transformFamilyData(family: LanguageFamily): FamilyPageData {
  return {
    hero: transformFamilyHero(family),
    decolonialHeader: transformDecolonialHeader(family),
    generalInfo: transformGeneralInfo(family),
    linguisticTraits: transformLinguisticTraits(family),
    history: transformHistory(family),
    distribution: transformDistribution(family),
    sources: transformSources(family),
  };
}
