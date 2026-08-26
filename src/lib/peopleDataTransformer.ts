/**
 * People Data Transformer
 *
 * Transforms raw PeopleDetail data into structured props for each
 * UI component of the people detail page.
 */

import {
  ficheSourceEntries,
  type FicheSourceEntry,
} from "@/lib/afrik/ficheSourceLabel";
import type { PeopleDetail } from "@/types/afrik-frontend";
import type {
  OriginsSection,
  OrganizationSection,
  LanguagesSection,
  HistoricalRoleSection,
  DetailedCultureSection,
  GlobalDemographySection,
  ClassificationStatus,
  CountryId,
  LanguageFamilyId,
  PeopleId,
} from "@/types/afrik";
import type {
  PeopleNamesDossier,
  PeopleNameRecord,
} from "@/api/v2/schemas/names";
import type { NameRecordView } from "@/types/names";
import type { RelationBadgeType } from "@/lib/relationsDataTransformer";

// ==========================================
// OUTPUT TYPES
// ==========================================

export interface PeopleHeroData {
  peopleId: PeopleId;
  nameMain: string;
  selfAppellation?: string;
  exonyms: string[];
  languageFamilyId: LanguageFamilyId;
  languageFamilyName?: string;
  currentCountries: CountryId[];
  classificationStatus?: ClassificationStatus | null;
  whyProblematic?: string;
  historicalRegion?: string;
  ethnoLinguisticGroup?: string;
}

export interface PeopleOriginData {
  ancientOrigins?: string;
  formationPeriod?: string;
  migrationRoutes: string[];
  historicalSettlementZones: string[];
  unificationsOrDivisions?: string;
  externalInfluences?: string;
  majorHistoricalEvents?: string;
}

export interface PeopleLanguageData {
  mainLanguage?: string;
  isoCodes: string[];
  dialects: string[];
  vehicularRole?: string;
  languageFamilyId?: string;
  languageFamilyName?: string;
}

export interface PeopleHistoryData {
  kingdomsOrChiefdoms?: string;
  relationsWithNeighbors?: string;
  conflictsOrAlliances?: string;
  diaspora?: string;
}

export interface PeopleCultureData {
  supremeDeity?: string;
  intermediates: string[];
  initiation?: string;
  femaleInitiation?: string;
  funerary?: string;
  symbols: string[];
  music?: string;
  gastronomy?: string;
  christianityPercentage?: number;
  islamPercentage?: number;
  syncretism?: string;
}

export interface PeopleRelatedData {
  ethnicities: string[];
  politicalSystem?: string;
  clanOrganization?: string;
  ageClassSystems?: string;
}

/** One row of the fiche's "Liens" preview (Epic 11, FR72/FR75) — the full corpus lives at `/fr/peuples/{id}/liens`. */
export interface PeopleRelationPreviewItem {
  id: string;
  type: RelationBadgeType;
  derived: boolean;
  neighborName: string;
}

/** Read-time shape of the `/api/v2/peoples/{id}/relations` envelope's `data`, kept minimal on purpose. */
export interface EgoNetworkPreviewSource {
  sourced: Array<{
    relationId: string;
    type: string;
    otherPeople: { nameMain: string };
  }>;
  derived: Array<{ otherPeople: { id: string; nameMain: string } }>;
}

export interface CountryDistributionRow {
  country: CountryId;
  population?: number;
  populationFormatted?: string;
  percentage?: number;
}

export interface PeopleCountriesData {
  totalPopulation: number;
  totalPopulationFormatted: string;
  referenceYear?: number;
  distributions: CountryDistributionRow[];
  source?: string;
}

/** One name record shaped for `NameOriginCard`, plus the raw fields its `confidenceChip` slot needs. */
export interface PeopleNameRecordViewData {
  record: NameRecordView;
  confidenceScore: number | null;
  sourceCount: number;
  lastHumanAuditAt: string | null;
}

/** One historical spelling shaped for `NameSpellingHistory`, plus its own confidence-chip fields. */
export interface PeopleNameSpellingData {
  nameText: string;
  periodLabel: string | null;
  confidenceScore: number | null;
  sourceCount: number;
  lastHumanAuditAt: string | null;
}

export interface PeopleNamesData {
  autonym: string | null;
  endonyms: PeopleNameRecordViewData[];
  exonyms: PeopleNameRecordViewData[];
  spellingHistory: PeopleNameSpellingData[];
}

export interface PeoplePageData {
  hero: PeopleHeroData;
  origin: PeopleOriginData;
  language: PeopleLanguageData;
  history: PeopleHistoryData;
  culture: PeopleCultureData;
  relatedPeoples: PeopleRelatedData;
  countries: PeopleCountriesData;
  /** Each source keeps its own tier, url and notes — a joined line destroys all three. */
  sources: FicheSourceEntry[];
  names: PeopleNamesData | null;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Format population number: 40000000 → "40M", 500000 → "500K"
 */
// @req REQ-003
export function formatPeoplePopulation(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const formatted = m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
    return formatted.replace(".0M", "M");
  }
  if (n >= 1_000) {
    const k = Math.round(n / 1_000);
    return `${k}K`;
  }
  return String(n);
}

/**
 * Extract short display form from a selfAppellation string.
 * "Ọmọ Oòduà (singulier), Yorùbá (pluriel)" → "Ọmọ Oòduà · Yorùbá"
 */
// @req REQ-003
export function extractAppellationShort(selfAppellation?: string): string {
  if (!selfAppellation) return "";
  const parts = selfAppellation.match(/([^(,]+?)\s*\(/g);
  if (parts) {
    return parts.map((p) => p.replace(/\s*\($/, "").trim()).join(" · ");
  }
  return selfAppellation.trim();
}

// ==========================================
// TRANSFORM FUNCTIONS
// ==========================================

// @req REQ-003
export function transformPeopleHero(raw: PeopleDetail): PeopleHeroData {
  return {
    peopleId: raw.id,
    nameMain: raw.nameMain,
    selfAppellation: raw.appellations?.selfAppellation,
    exonyms: raw.appellations?.exonyms ?? [],
    languageFamilyId: raw.languageFamilyId,
    languageFamilyName: raw.languageFamilyName,
    currentCountries: raw.currentCountries ?? [],
    classificationStatus: raw.classificationStatus,
    whyProblematic: raw.appellations?.whyProblematic,
    historicalRegion: raw.appellations?.historicalRegion,
    ethnoLinguisticGroup: raw.appellations?.ethnoLinguisticGroup,
  };
}

// @req REQ-003
export function transformPeopleOrigins(
  origins?: OriginsSection
): PeopleOriginData {
  return {
    ancientOrigins: origins?.ancientOrigins,
    formationPeriod: origins?.formationPeriod,
    migrationRoutes: origins?.migrationRoutes ?? [],
    historicalSettlementZones: origins?.historicalSettlementZones ?? [],
    unificationsOrDivisions: origins?.unificationsOrDivisions,
    externalInfluences: origins?.externalInfluences,
    majorHistoricalEvents: origins?.majorHistoricalEvents,
  };
}

// @req REQ-003
export function transformPeopleLanguages(
  languages?: LanguagesSection,
  languageFamilyId?: string,
  languageFamilyName?: string
): PeopleLanguageData {
  return {
    mainLanguage: languages?.mainLanguage,
    isoCodes: languages?.isoCodes ?? [],
    dialects: languages?.dialects ?? [],
    vehicularRole: languages?.vehicularRole,
    languageFamilyId,
    languageFamilyName,
  };
}

// @req REQ-003
export function transformPeopleHistory(
  historicalRole?: HistoricalRoleSection
): PeopleHistoryData {
  return {
    kingdomsOrChiefdoms: historicalRole?.kingdomsOrChiefdoms,
    relationsWithNeighbors: historicalRole?.relationsWithNeighbors,
    conflictsOrAlliances: historicalRole?.conflictsOrAlliances,
    diaspora: historicalRole?.diaspora,
  };
}

// @req REQ-003
export function transformPeopleCulture(
  culture?: DetailedCultureSection
): PeopleCultureData {
  if (!culture) {
    return {
      supremeDeity: undefined,
      intermediates: [],
      initiation: undefined,
      femaleInitiation: undefined,
      funerary: undefined,
      symbols: [],
      music: undefined,
      gastronomy: undefined,
      christianityPercentage: undefined,
      islamPercentage: undefined,
      syncretism: undefined,
    };
  }

  const deity = culture.divinitiesAndSpirits?.supremeDeity;
  const supremeDeity = deity?.name ?? deity?.endonym;

  const intermediates = (
    culture.divinitiesAndSpirits?.intermediateDivinities ?? []
  )
    .map((d) => d.name ?? d.endonym ?? "")
    .filter(Boolean);

  const symbols = (culture.symbolsAndArts?.symbols ?? []).map((s) => s.name);

  return {
    supremeDeity,
    intermediates,
    initiation: culture.ritesAndPractices?.initiationRites?.maleInitiation,
    femaleInitiation:
      culture.ritesAndPractices?.initiationRites?.femaleInitiation,
    funerary: culture.ritesAndPractices?.funeraryRites?.wake,
    symbols,
    music: culture.symbolsAndArts?.artsAndMusic?.musicalInstruments,
    gastronomy: culture.symbolsAndArts?.gastronomy?.emblematicDishes,
    christianityPercentage:
      culture.contemporarySpirituality?.christianity?.percentageOfPopulation,
    islamPercentage:
      culture.contemporarySpirituality?.islam?.percentageOfPopulation,
    syncretism:
      culture.contemporarySpirituality?.religiousSyncretism
        ?.coexistenceOfPractices,
  };
}

// @req REQ-097
export function transformPeopleRelatedPeoples(
  ethnicities?: string[],
  organization?: OrganizationSection
): PeopleRelatedData {
  return {
    ethnicities: ethnicities ?? [],
    politicalSystem: organization?.traditionalPoliticalSystem,
    clanOrganization: organization?.clanOrganization,
    ageClassSystems: organization?.ageClassSystems,
  };
}

// @req REQ-097
export function transformEgoNetworkPreview(
  network: EgoNetworkPreviewSource
): PeopleRelationPreviewItem[] {
  return [
    ...network.sourced.map((relation) => ({
      id: relation.relationId,
      type: relation.type as RelationBadgeType,
      derived: false,
      neighborName: relation.otherPeople.nameMain,
    })),
    ...network.derived.map((link) => ({
      id: `derived_${link.otherPeople.id}`,
      type: "linguistic" as const,
      derived: true,
      neighborName: link.otherPeople.nameMain,
    })),
  ];
}

// @req REQ-003
export function transformPeopleCountries(
  demography?: GlobalDemographySection
): PeopleCountriesData {
  const totalPopulation = demography?.totalPopulation ?? 0;

  const distributions: CountryDistributionRow[] = (
    demography?.distributionByCountry ?? []
  ).map((d) => ({
    country: d.country,
    population: d.population,
    populationFormatted:
      d.population != null ? formatPeoplePopulation(d.population) : undefined,
    percentage: d.percentage,
  }));

  return {
    totalPopulation,
    totalPopulationFormatted: formatPeoplePopulation(totalPopulation),
    referenceYear: demography?.referenceYear,
    distributions,
    source: demography?.source,
  };
}

/**
 * Shape one `PeopleNameRecord` (API view) into a `NameOriginCard`-compatible
 * `NameRecordView` plus the raw confidence fields its chip slot needs. The
 * card and the chip are composed by the caller (`PeopleNamesSection`) —
 * this transformer stays free of JSX.
 */
// @req REQ-054
export function transformPeopleNameRecord(
  entry: PeopleNameRecord
): PeopleNameRecordViewData {
  return {
    record: {
      nameText: entry.nameText,
      nameType: entry.nameType,
      languageOfOrigin: entry.languageOfOrigin,
      meaning: entry.meaning,
      periodLabel: entry.periodLabel,
      imposedBy: entry.imposition?.imposedBy ?? null,
      impositionPeriod: entry.imposition?.impositionPeriod ?? null,
      whyProblematic: entry.imposition?.whyProblematic ?? null,
      contemporaryUsage: entry.imposition?.contemporaryUsage ?? null,
    },
    confidenceScore: entry.confidence?.score ?? null,
    sourceCount: entry.sources.length,
    lastHumanAuditAt: entry.confidence?.recomputedAt ?? null,
  };
}

/**
 * Shape a `PeopleNamesDossier` (GET /v2/peoples/{id}/names) into the
 * endonyms-first `names` payload for `PeopleNamesSection`. Returns `null`
 * when there is nothing to show (UX-DR31) — the section omits itself
 * entirely rather than rendering an empty shell.
 */
// @req REQ-054
export function transformPeopleNames(
  dossier?: PeopleNamesDossier | null
): PeopleNamesData | null {
  if (!dossier || dossier.names.length === 0) return null;

  const endonyms = dossier.names
    .filter((n) => n.nameType === "endonym")
    .map(transformPeopleNameRecord);
  const exonyms = dossier.names
    .filter((n) => n.nameType === "exonym")
    .map(transformPeopleNameRecord);
  const spellingHistory: PeopleNameSpellingData[] = dossier.names
    .filter((n) => n.nameType === "historical_spelling")
    .map((n) => ({
      nameText: n.nameText,
      periodLabel: n.periodLabel,
      confidenceScore: n.confidence?.score ?? null,
      sourceCount: n.sources.length,
      lastHumanAuditAt: n.confidence?.recomputedAt ?? null,
    }));

  if (
    endonyms.length === 0 &&
    exonyms.length === 0 &&
    spellingHistory.length === 0
  ) {
    return null;
  }

  return {
    autonym: dossier.autonym,
    endonyms,
    exonyms,
    spellingHistory,
  };
}

/** Fetches the names dossier for a people from the fiche's data flow (GET /v2/peoples/{id}/names). */
// @req REQ-054
export async function fetchPeopleNamesDossier(
  peopleId: string
): Promise<PeopleNamesDossier | null> {
  const response = await fetch(`/api/v2/peoples/${peopleId}/names`);
  if (!response.ok) return null;
  const body = await response.json();
  return (body.data ?? null) as PeopleNamesDossier | null;
}

// ==========================================
// MAIN TRANSFORM
// ==========================================

// @req REQ-003
export function transformPeopleData(
  raw: PeopleDetail,
  namesDossier?: PeopleNamesDossier | null
): PeoplePageData {
  const sources = ficheSourceEntries(raw.sources);

  return {
    hero: transformPeopleHero(raw),
    origin: transformPeopleOrigins(raw.origins),
    language: transformPeopleLanguages(
      raw.languages,
      raw.languageFamilyId,
      raw.languageFamilyName
    ),
    history: transformPeopleHistory(raw.historicalRole),
    culture: transformPeopleCulture(raw.culture),
    relatedPeoples: transformPeopleRelatedPeoples(
      raw.ethnicities,
      raw.organization
    ),
    countries: transformPeopleCountries(raw.demography),
    sources,
    names: transformPeopleNames(namesDossier),
  };
}
