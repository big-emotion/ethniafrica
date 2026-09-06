import { classifyDepth } from "./anthroponymDepth";

interface SourceRecord {
  tier?: string;
  url?: string | null;
  source_kind?: string;
}

interface CountryPeopleEntry {
  name?: string;
  peopleId?: string;
  languageFamily?: string;
  languages?: string[];
  population?: number | null;
  percentageInCountry?: number | null;
}

interface CountryRecord {
  id?: string;
  nameFr?: string;
  nameOfficial?: string;
  content?: {
    historicalNames?: {
      formerNames?: unknown[];
      antiquity?: unknown;
      middleAges?: unknown;
      precolonial?: unknown;
      colonization?: unknown;
      contemporary?: unknown;
    };
    kingdoms?: unknown[];
    majorPeoples?: CountryPeopleEntry[];
    culture?: {
      mainLanguages?: unknown[];
      [key: string]: unknown;
    };
    historicalFacts?: {
      ancientPeriods?: unknown;
      middleAges?: unknown;
      precolonial?: unknown;
      colonization?: unknown;
      independenceStruggle?: unknown;
      postIndependence?: unknown;
    };
    sources?: SourceRecord[];
    demographics?: {
      totalPopulation?: number | null;
      referenceYear?: number | string | null;
      source?: string | null;
      peoples?: CountryPeopleEntry[];
    };
  };
}

interface LinkedPeopleRecord {
  id?: string;
  languageFamilyId?: string;
  currentCountries?: string[];
  content?: {
    appellations?: { currentCountries?: string[] };
    demography?: { distributionByCountry?: { country?: string }[] };
    languages?: { isoCodes?: string[] };
    sources?: SourceRecord[];
  };
}

interface PatronymRecord {
  id?: string;
  transmissionMode?: string;
  countries?: { countryId?: string; status?: string }[];
  sources?: SourceRecord[];
  origin?: {
    oralTraditions?: unknown[];
    writtenChronicles?: unknown[];
    linguisticReconstructions?: unknown[];
  };
}

export interface CountryEnrichmentMetricInput {
  countryId: string;
  country: CountryRecord;
  linkedPeoples: LinkedPeopleRecord[];
  languageDossierIds: Set<string>;
  patronyms: PatronymRecord[];
  references: {
    peopleGroups?: number | null;
    languages?: number | null;
    patronymQuota?: number | null;
  };
  peopleReview?: {
    totalRelations: number;
    reviewedRelations: number;
    pendingRelations: number;
    reviewCompletionPercent: number | null;
    reviewedByEntityType: Record<string, number>;
  } | null;
}

function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasContent);
  }
  return true;
}

function percentage(
  numerator: number,
  denominator: number | null | undefined,
  capAtHundred = false
): number | null {
  if (!denominator || denominator <= 0) return null;
  const value = (numerator / denominator) * 100;
  return Math.round((capAtHundred ? Math.min(value, 100) : value) * 10) / 10;
}

function sourceSummary(sources: SourceRecord[]) {
  const accepted = sources.filter((source) =>
    ["official", "referenced"].includes(source.tier ?? "")
  ).length;
  const withUrl = sources.filter((source) => Boolean(source.url)).length;

  return {
    total: sources.length,
    accepted,
    acceptedPercent: percentage(accepted, sources.length),
    withUrl,
    withUrlPercent: percentage(withUrl, sources.length),
    needsReview: sources.filter((source) => source.tier === "needs_review")
      .length,
  };
}

function isMacroLikePeople(id: string): boolean {
  return id.endsWith("_MACRO") || id === "PPL_BANTU";
}

export function peopleReferencesCountry(
  people: LinkedPeopleRecord,
  countryId: string
): boolean {
  return [
    ...(people.currentCountries ?? []),
    ...(people.content?.appellations?.currentCountries ?? []),
    ...(people.content?.demography?.distributionByCountry ?? []).map(
      (entry) => entry.country
    ),
  ].includes(countryId);
}

export function buildCountryEnrichmentMetrics({
  countryId,
  country,
  linkedPeoples,
  languageDossierIds,
  patronyms,
  references,
  peopleReview,
}: CountryEnrichmentMetricInput) {
  const content = country.content ?? {};
  const majorPeoples = content.majorPeoples ?? [];
  const demographicPeoples = content.demographics?.peoples ?? [];
  const namedDemographicRows = demographicPeoples.filter(
    (entry) =>
      Boolean(entry.peopleId) &&
      !/\b(autres?|others?)\b/i.test(entry.name ?? "")
  );
  const catchAllDemographicRows = demographicPeoples.filter(
    (entry) => !namedDemographicRows.includes(entry)
  );

  const linkedPeopleById = new Map(
    linkedPeoples
      .filter((people) => people.id)
      .map((people) => [people.id as string, people])
  );
  const familyMismatches = majorPeoples.filter((entry) => {
    const peopleFamily = entry.peopleId
      ? linkedPeopleById.get(entry.peopleId)?.languageFamilyId
      : undefined;
    return Boolean(
      entry.languageFamily &&
      peopleFamily &&
      entry.languageFamily !== peopleFamily
    );
  });

  const featuredLanguageLabels = new Set(
    majorPeoples
      .flatMap((entry) => entry.languages ?? [])
      .map((language) => language.trim().toLocaleLowerCase("fr"))
      .filter(Boolean)
  );
  const candidateIsoCodes = new Set(
    linkedPeoples
      .flatMap((people) => people.content?.languages?.isoCodes ?? [])
      .map((code) => code.trim().toLowerCase())
      .filter(Boolean)
  );
  const candidateCodesWithDossiers = [...candidateIsoCodes].filter((code) =>
    languageDossierIds.has(code)
  );

  const directPatronyms = patronyms.filter((patronym) =>
    (patronym.countries ?? []).some(
      (country) => country.countryId === countryId
    )
  );
  const patronymStages = directPatronyms.map((patronym) =>
    classifyDepth(patronym)
  );
  const countryStatuses = directPatronyms.flatMap((patronym) =>
    (patronym.countries ?? [])
      .filter((country) => country.countryId === countryId)
      .map((country) => country.status)
  );

  const historicalNames = content.historicalNames ?? {};
  const historicalNamePeriods = [
    historicalNames.antiquity,
    historicalNames.middleAges,
    historicalNames.precolonial,
    historicalNames.colonization,
    historicalNames.contemporary,
  ];
  const historicalFacts = content.historicalFacts ?? {};
  const historicalFactPeriods = [
    historicalFacts.ancientPeriods,
    historicalFacts.middleAges,
    historicalFacts.precolonial,
    historicalFacts.colonization,
    historicalFacts.independenceStruggle,
    historicalFacts.postIndependence,
  ];

  const structuralSections = [
    country.nameFr,
    content.historicalNames,
    content.kingdoms,
    content.majorPeoples,
    content.culture,
    content.historicalFacts,
    content.sources,
    content.demographics,
  ];
  const peopleSources = linkedPeoples.flatMap(
    (people) => people.content?.sources ?? []
  );
  const documentedPatronyms = patronymStages.filter(
    (stage) => stage === "documented"
  ).length;

  return {
    countryId,
    identity: {
      nameFr: country.nameFr ?? null,
      nameOfficial: country.nameOfficial ?? null,
    },
    structural: {
      filledSections: structuralSections.filter(hasContent).length,
      totalSections: structuralSections.length,
      filledSectionsPercent: percentage(
        structuralSections.filter(hasContent).length,
        structuralSections.length
      ),
    },
    peoples: {
      linkedFiches: linkedPeoples.length,
      macroLikeLinkedFiches: linkedPeoples.filter((people) =>
        isMacroLikePeople(people.id ?? "")
      ).length,
      featuredEntries: majorPeoples.length,
      demographicNamedEntries: namedDemographicRows.length,
      featuredVsLinkedPercent: percentage(
        majorPeoples.length,
        linkedPeoples.length
      ),
      referenceCount: references.peopleGroups ?? null,
      rawReferenceUpperBoundPercent: percentage(
        linkedPeoples.length,
        references.peopleGroups
      ),
      namedDemographicSharePercent:
        Math.round(
          namedDemographicRows.reduce(
            (sum, entry) => sum + (entry.percentageInCountry ?? 0),
            0
          ) * 10
        ) / 10,
      catchAllDemographicSharePercent:
        Math.round(
          catchAllDemographicRows.reduce(
            (sum, entry) => sum + (entry.percentageInCountry ?? 0),
            0
          ) * 10
        ) / 10,
      demographicPercentageSum:
        Math.round(
          demographicPeoples.reduce(
            (sum, entry) => sum + (entry.percentageInCountry ?? 0),
            0
          ) * 10
        ) / 10,
      demographicRowsWithPopulation: demographicPeoples.filter(
        (entry) => typeof entry.population === "number" && entry.population > 0
      ).length,
      featuredFamilyMismatches: familyMismatches.length,
      featuredFamilyMismatchIds: familyMismatches
        .map((entry) => entry.peopleId)
        .filter((id): id is string => Boolean(id)),
      editorialReview: peopleReview ?? null,
    },
    languages: {
      declaredMainLanguages: content.culture?.mainLanguages?.length ?? 0,
      featuredLanguageLabels: featuredLanguageLabels.size,
      candidateIsoCodes: candidateIsoCodes.size,
      candidateIsoCodesWithDossiers: candidateCodesWithDossiers.length,
      dossierCoverageOfCandidateCodesPercent: percentage(
        candidateCodesWithDossiers.length,
        candidateIsoCodes.size
      ),
      referenceCount: references.languages ?? null,
      rawReferenceUpperBoundPercent: percentage(
        candidateIsoCodes.size,
        references.languages
      ),
    },
    history: {
      historicalNameEntries: historicalNames.formerNames?.length ?? 0,
      historicalNamePeriodsFilled:
        historicalNamePeriods.filter(hasContent).length,
      historicalNamePeriodsTotal: historicalNamePeriods.length,
      historicalFactPeriodsFilled:
        historicalFactPeriods.filter(hasContent).length,
      historicalFactPeriodsTotal: historicalFactPeriods.length,
      declaredPoliticalEntities: content.kingdoms?.length ?? 0,
    },
    patronyms: {
      directCountryFiches: directPatronyms.length,
      attested: countryStatuses.filter((status) => status === "attested")
        .length,
      supposed: countryStatuses.filter((status) => status === "supposed")
        .length,
      quota: references.patronymQuota ?? null,
      quotaCompletionPercent: percentage(
        directPatronyms.length,
        references.patronymQuota,
        true
      ),
      queueOnly: patronymStages.filter((stage) => stage === "queue-only")
        .length,
      unsourcedOrigin: patronymStages.filter(
        (stage) => stage === "unsourced-origin"
      ).length,
      undeclaredTransmission: patronymStages.filter(
        (stage) => stage === "undeclared-transmission"
      ).length,
      documented: documentedPatronyms,
      documentedPercent: percentage(
        documentedPatronyms,
        directPatronyms.length
      ),
    },
    sources: {
      countryFiche: sourceSummary(content.sources ?? []),
      linkedPeopleFiches: sourceSummary(peopleSources),
    },
    population: {
      total: content.demographics?.totalPopulation ?? null,
      referenceYear: content.demographics?.referenceYear ?? null,
      source: content.demographics?.source ?? null,
    },
  };
}
