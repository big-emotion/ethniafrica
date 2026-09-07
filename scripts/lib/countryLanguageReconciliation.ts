interface ReferenceLanguageEntry {
  glottocode: string;
  name: string;
  iso639P3Code: string | null;
  level: string;
}

interface LocalLanguageDossier {
  id: string;
  isoCode639_3?: string;
  glottocode?: string;
  nameFr?: string;
}

interface PeopleLanguageEntry {
  id: string;
  isoCodes: string[];
  review: { entityType: string };
}

interface CountryLanguageReconciliationInput {
  countryId: string;
  referenceArtifact: string;
  referenceEntries: ReferenceLanguageEntry[];
  languageDossiers: LocalLanguageDossier[];
  peopleEntries: PeopleLanguageEntry[];
}

const REVIEWED_PEOPLE_ENTITY_TYPES = new Set(["people", "subgroup"]);

function normalizedCode(value: string | undefined): string | null {
  const code = value?.trim().toLowerCase();
  return code || null;
}

export function buildCountryLanguageReconciliation({
  countryId,
  referenceArtifact,
  referenceEntries,
  languageDossiers,
  peopleEntries,
}: CountryLanguageReconciliationInput) {
  const localLanguageDossiers = languageDossiers
    .map((dossier) => {
      const iso639P3Code = normalizedCode(dossier.isoCode639_3);
      const glottocode = normalizedCode(dossier.glottocode);
      const matches = referenceEntries.filter(
        (entry) =>
          (glottocode && entry.glottocode === glottocode) ||
          (iso639P3Code && entry.iso639P3Code === iso639P3Code)
      );

      return {
        id: dossier.id,
        nameFr: dossier.nameFr ?? null,
        iso639P3Code,
        glottocode,
        matchStatus:
          matches.length > 0 ? "exact_reference" : "outside_country_reference",
        matchedReferenceGlottocodes: matches
          .map((entry) => entry.glottocode)
          .sort(),
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id, "en"));

  const reviewedPeopleByCode = new Map<string, Set<string>>();
  for (const people of peopleEntries) {
    if (!REVIEWED_PEOPLE_ENTITY_TYPES.has(people.review.entityType)) continue;
    for (const rawCode of people.isoCodes) {
      const code = normalizedCode(rawCode);
      if (!code) continue;
      const peopleIds = reviewedPeopleByCode.get(code) ?? new Set<string>();
      peopleIds.add(people.id);
      reviewedPeopleByCode.set(code, peopleIds);
    }
  }

  const reviewedPeopleIsoCodes = [...reviewedPeopleByCode.entries()]
    .map(([iso639P3Code, peopleIds]) => {
      const matches = referenceEntries.filter(
        (entry) => entry.iso639P3Code === iso639P3Code
      );
      return {
        iso639P3Code,
        peopleIds: [...peopleIds].sort(),
        matchStatus:
          matches.length > 0 ? "exact_reference" : "outside_country_reference",
        matchedReferenceEntries: matches
          .map((entry) => ({
            glottocode: entry.glottocode,
            name: entry.name,
            level: entry.level,
          }))
          .sort(
            (left, right) =>
              left.name.localeCompare(right.name, "en") ||
              left.glottocode.localeCompare(right.glottocode, "en")
          ),
      };
    })
    .sort((left, right) =>
      left.iso639P3Code.localeCompare(right.iso639P3Code, "en")
    );

  const dossierGlottocodes = new Set(
    localLanguageDossiers.flatMap((dossier) =>
      dossier.matchStatus === "exact_reference"
        ? dossier.matchedReferenceGlottocodes
        : []
    )
  );
  const reviewedPeopleReferenceGlottocodes = new Set(
    reviewedPeopleIsoCodes.flatMap((code) =>
      code.matchedReferenceEntries.map((entry) => entry.glottocode)
    )
  );

  return {
    schemaVersion: 1,
    countryId,
    referenceArtifact,
    methodology: {
      scope:
        "Exact ISO 639-3 and Glottocode reconciliation only; names and aliases are not promoted automatically.",
      reviewedPeopleScope:
        "Only people and subgroup proposals are included. Duplicate, macro-category, language-label, and rejected country-link records are excluded.",
      caveats: [
        "A language dossier outside this country reference may still be globally valid.",
        "A people-language code does not prove that every member uses that language or that the people and language have identical boundaries.",
        "Macrolanguage, standardized-language, and regional-variety identifiers require editorial review even when their names are similar.",
      ],
    },
    summary: {
      referenceEntries: referenceEntries.length,
      localLanguageDossiers: localLanguageDossiers.length,
      referenceEntriesWithExactDossier: dossierGlottocodes.size,
      referenceEntriesWithReviewedPeopleCode:
        reviewedPeopleReferenceGlottocodes.size,
      referenceEntriesWithAnyLocalSignal: new Set([
        ...dossierGlottocodes,
        ...reviewedPeopleReferenceGlottocodes,
      ]).size,
      reviewedPeopleIsoCodes: reviewedPeopleIsoCodes.length,
      reviewedPeopleIsoCodesMatchedToReference: reviewedPeopleIsoCodes.filter(
        (code) => code.matchStatus === "exact_reference"
      ).length,
      reviewedPeopleIsoCodesUnmatchedToReference: reviewedPeopleIsoCodes.filter(
        (code) => code.matchStatus === "outside_country_reference"
      ).length,
    },
    localLanguageDossiers,
    reviewedPeopleIsoCodes,
  };
}
