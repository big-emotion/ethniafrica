interface SourceRecord {
  tier?: string;
  url?: string | null;
}

interface CountryPeopleSurfaceEntry {
  peopleId?: string;
  languageFamily?: string;
}

interface CountryRecord {
  content?: {
    majorPeoples?: CountryPeopleSurfaceEntry[];
    demographics?: { peoples?: CountryPeopleSurfaceEntry[] };
  };
}

export interface ReconciliationPeopleRecord {
  id?: string;
  nameMain?: string;
  languageFamilyId?: string;
  currentCountries?: string[];
  content?: {
    appellations?: {
      mainName?: string;
      selfAppellation?: string;
      currentCountries?: string[];
    };
    languages?: {
      mainLanguage?: string;
      isoCodes?: string[];
    };
    demography?: {
      distributionByCountry?: { country?: string }[];
    };
    sources?: SourceRecord[];
  };
}

export interface CountryPeopleLedgerEntry {
  id: string;
  nameMain: string | null;
  selfAppellation: string | null;
  languageFamilyId: string | null;
  isoCodes: string[];
  linkEvidence: {
    topLevelCurrentCountries: boolean;
    appellationsCurrentCountries: boolean;
    demographyDistribution: boolean;
  };
  countrySurfaces: {
    featured: boolean;
    demographic: boolean;
  };
  sourceEvidence: {
    total: number;
    accepted: number;
    needsReview: number;
    unverified: number;
    withUrl: number;
  };
  sharedIsoCodes: { isoCode: string; peopleIds: string[] }[];
  automatedFlags: string[];
}

interface BuildCountryPeopleLedgerInput {
  countryId: string;
  country: CountryRecord;
  peoples: ReconciliationPeopleRecord[];
}

const ACCEPTED_SOURCE_TIERS = new Set(["official", "referenced"]);

function isMacroLike(id: string): boolean {
  return id.endsWith("_MACRO") || id === "PPL_BANTU";
}

function normalizeLabel(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .replace(/\b(langue|language|peuple|people|groupe|group)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function possiblyUsesLanguageAsPeopleLabel(
  name: string | undefined,
  mainLanguage: string | undefined
): boolean {
  const peopleLabel = normalizeLabel(name);
  const languageLabel = normalizeLabel(mainLanguage);
  if (peopleLabel.length < 4 || languageLabel.length < 4) return false;

  return (
    peopleLabel === languageLabel ||
    peopleLabel.includes(languageLabel) ||
    languageLabel.includes(peopleLabel)
  );
}

export function buildCountryPeopleLedger({
  countryId,
  country,
  peoples,
}: BuildCountryPeopleLedgerInput) {
  const featuredEntries = country.content?.majorPeoples ?? [];
  const demographicEntries = country.content?.demographics?.peoples ?? [];
  const featuredIds = new Set(
    featuredEntries
      .map((entry) => entry.peopleId)
      .filter((id): id is string => Boolean(id))
  );
  const demographicIds = new Set(
    demographicEntries
      .map((entry) => entry.peopleId)
      .filter((id): id is string => Boolean(id))
  );
  const featuredFamilies = new Map(
    featuredEntries
      .filter((entry) => entry.peopleId && entry.languageFamily)
      .map((entry) => [
        entry.peopleId as string,
        entry.languageFamily as string,
      ])
  );

  const isoCodeToPeopleIds = new Map<string, string[]>();
  for (const people of peoples) {
    if (!people.id) continue;
    const codes = new Set(
      (people.content?.languages?.isoCodes ?? [])
        .map((code) => code.trim().toLowerCase())
        .filter(Boolean)
    );
    for (const code of codes) {
      const ids = isoCodeToPeopleIds.get(code) ?? [];
      ids.push(people.id);
      isoCodeToPeopleIds.set(code, ids);
    }
  }

  const entries: CountryPeopleLedgerEntry[] = peoples
    .filter((people): people is ReconciliationPeopleRecord & { id: string } =>
      Boolean(people.id)
    )
    .map((people) => {
      const sources = people.content?.sources ?? [];
      const isoCodes = [
        ...new Set(
          (people.content?.languages?.isoCodes ?? [])
            .map((code) => code.trim().toLowerCase())
            .filter(Boolean)
        ),
      ].sort();
      const linkEvidence = {
        topLevelCurrentCountries: (people.currentCountries ?? []).includes(
          countryId
        ),
        appellationsCurrentCountries: (
          people.content?.appellations?.currentCountries ?? []
        ).includes(countryId),
        demographyDistribution: (
          people.content?.demography?.distributionByCountry ?? []
        ).some((distribution) => distribution.country === countryId),
      };
      const sharedIsoCodes = isoCodes.flatMap((isoCode) => {
        const peopleIds = (isoCodeToPeopleIds.get(isoCode) ?? [])
          .filter((id) => id !== people.id)
          .sort();
        return peopleIds.length > 0 ? [{ isoCode, peopleIds }] : [];
      });
      const automatedFlags: string[] = [];
      const featuredFamily = featuredFamilies.get(people.id);
      if (
        featuredFamily &&
        people.languageFamilyId &&
        featuredFamily !== people.languageFamilyId
      ) {
        automatedFlags.push("featured_family_mismatch");
      }
      if (Object.values(linkEvidence).some((value) => !value)) {
        automatedFlags.push("incomplete_country_link");
      }
      if (isMacroLike(people.id)) automatedFlags.push("macro_like");
      if (
        !sources.some((source) => ACCEPTED_SOURCE_TIERS.has(source.tier ?? ""))
      ) {
        automatedFlags.push("no_accepted_source");
      }
      if (
        possiblyUsesLanguageAsPeopleLabel(
          people.nameMain ?? people.content?.appellations?.mainName,
          people.content?.languages?.mainLanguage
        )
      ) {
        automatedFlags.push("name_matches_language_label");
      }
      if (sharedIsoCodes.length > 0) automatedFlags.push("shared_iso_code");

      return {
        id: people.id,
        nameMain:
          people.nameMain ?? people.content?.appellations?.mainName ?? null,
        selfAppellation: people.content?.appellations?.selfAppellation ?? null,
        languageFamilyId: people.languageFamilyId ?? null,
        isoCodes,
        linkEvidence,
        countrySurfaces: {
          featured: featuredIds.has(people.id),
          demographic: demographicIds.has(people.id),
        },
        sourceEvidence: {
          total: sources.length,
          accepted: sources.filter((source) =>
            ACCEPTED_SOURCE_TIERS.has(source.tier ?? "")
          ).length,
          needsReview: sources.filter(
            (source) => source.tier === "needs_review"
          ).length,
          unverified: sources.filter((source) => source.tier === "unverified")
            .length,
          withUrl: sources.filter((source) => Boolean(source.url)).length,
        },
        sharedIsoCodes,
        automatedFlags,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  const sharedIsoCodeClusters = [...isoCodeToPeopleIds.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([isoCode, peopleIds]) => ({
      isoCode,
      peopleIds: [...peopleIds].sort(),
    }))
    .sort((left, right) => left.isoCode.localeCompare(right.isoCode));

  return {
    summary: {
      totalEntries: entries.length,
      fullyLinkedEntries: entries.filter((entry) =>
        Object.values(entry.linkEvidence).every(Boolean)
      ).length,
      incompleteLinkEntries: entries.filter((entry) =>
        entry.automatedFlags.includes("incomplete_country_link")
      ).length,
      macroLikeEntries: entries.filter((entry) =>
        entry.automatedFlags.includes("macro_like")
      ).length,
      nameLanguageLabelMatches: entries.filter((entry) =>
        entry.automatedFlags.includes("name_matches_language_label")
      ).length,
      entriesWithoutAcceptedSource: entries.filter((entry) =>
        entry.automatedFlags.includes("no_accepted_source")
      ).length,
      sharedIsoCodeClusters: sharedIsoCodeClusters.length,
      featuredFamilyMismatches: entries.filter((entry) =>
        entry.automatedFlags.includes("featured_family_mismatch")
      ).length,
      entriesRequiringReview: entries.filter(
        (entry) => entry.automatedFlags.length > 0
      ).length,
    },
    sharedIsoCodeClusters,
    entries,
  };
}

interface ReviewableEntry {
  id: string;
}

interface ExistingReviewableEntry extends ReviewableEntry {
  review?: unknown;
  [key: string]: unknown;
}

interface ReviewSummaryEntry extends ReviewableEntry {
  review?: {
    status?: string;
    entityType?: string;
  };
}

const DEFAULT_REVIEW = {
  status: "pending",
  entityType: "unknown",
  canonicalPeopleId: null,
  parentPeopleId: null,
  decision: null,
  notes: null,
  sources: [],
};

export function mergeCountryPeopleReviews<T extends ReviewableEntry>(
  generatedEntries: T[],
  existingEntries: ExistingReviewableEntry[]
): (T & { review: unknown })[] {
  const existingReviews = new Map(
    existingEntries
      .filter((entry) => entry.review !== undefined)
      .map((entry) => [entry.id, entry.review])
  );

  return generatedEntries.map((entry) => ({
    ...entry,
    review: existingReviews.get(entry.id) ?? { ...DEFAULT_REVIEW },
  }));
}

export function summarizeCountryPeopleReviews(entries: ReviewSummaryEntry[]): {
  totalRelations: number;
  reviewedRelations: number;
  pendingRelations: number;
  reviewCompletionPercent: number | null;
  reviewedByEntityType: Record<string, number>;
} {
  const reviewedEntries = entries.filter(
    (entry) => entry.review?.status && entry.review.status !== "pending"
  );
  const reviewedByEntityType: Record<string, number> = {};

  for (const entry of reviewedEntries) {
    const entityType = entry.review?.entityType;
    if (!entityType || entityType === "unknown") continue;
    reviewedByEntityType[entityType] =
      (reviewedByEntityType[entityType] ?? 0) + 1;
  }

  return {
    totalRelations: entries.length,
    reviewedRelations: reviewedEntries.length,
    pendingRelations: entries.length - reviewedEntries.length,
    reviewCompletionPercent:
      entries.length === 0
        ? null
        : Math.round((reviewedEntries.length / entries.length) * 1000) / 10,
    reviewedByEntityType,
  };
}
