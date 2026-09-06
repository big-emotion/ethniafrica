import { describe, expect, it } from "vitest";

import { buildCountryLanguageReconciliation } from "../lib/countryLanguageReconciliation";

describe("buildCountryLanguageReconciliation", () => {
  // @req REQ-001
  it("keeps dossier, reference, and reviewed-people code signals separate", () => {
    const result = buildCountryLanguageReconciliation({
      countryId: "COD",
      referenceArtifact:
        "docs/editorial/country-enrichment/sources/COD-glottolog-5.3.json",
      referenceEntries: [
        {
          glottocode: "alur1250",
          name: "Alur",
          iso639P3Code: "alz",
          level: "language",
        },
        {
          glottocode: "cong1236",
          name: "Congo Swahili",
          iso639P3Code: "swc",
          level: "language",
        },
        {
          glottocode: "ling1263",
          name: "Kinshasa Lingala",
          iso639P3Code: "lin",
          level: "language",
        },
      ],
      languageDossiers: [
        {
          id: "lin",
          isoCode639_3: "lin",
          glottocode: "ling1263",
          nameFr: "Lingala",
        },
        {
          id: "swh",
          isoCode639_3: "swh",
          glottocode: "swah1253",
          nameFr: "Swahili",
        },
      ],
      peopleEntries: [
        {
          id: "PPL_ALUR",
          isoCodes: ["alz"],
          review: { entityType: "people" },
        },
        {
          id: "PPL_ALUR_DUPLICATE",
          isoCodes: ["alz"],
          review: { entityType: "duplicate" },
        },
        {
          id: "PPL_SWAHILI",
          isoCodes: ["swa"],
          review: { entityType: "people" },
        },
        {
          id: "PPL_MBUNDA",
          isoCodes: ["mck"],
          review: { entityType: "rejected_link" },
        },
      ],
    });

    expect(result.summary).toEqual({
      referenceEntries: 3,
      localLanguageDossiers: 2,
      referenceEntriesWithExactDossier: 1,
      referenceEntriesWithReviewedPeopleCode: 1,
      referenceEntriesWithAnyLocalSignal: 2,
      reviewedPeopleIsoCodes: 2,
      reviewedPeopleIsoCodesMatchedToReference: 1,
      reviewedPeopleIsoCodesUnmatchedToReference: 1,
    });
    expect(result.localLanguageDossiers).toEqual([
      {
        id: "lin",
        nameFr: "Lingala",
        iso639P3Code: "lin",
        glottocode: "ling1263",
        matchStatus: "exact_reference",
        matchedReferenceGlottocodes: ["ling1263"],
      },
      {
        id: "swh",
        nameFr: "Swahili",
        iso639P3Code: "swh",
        glottocode: "swah1253",
        matchStatus: "outside_country_reference",
        matchedReferenceGlottocodes: [],
      },
    ]);
    expect(result.reviewedPeopleIsoCodes).toEqual([
      {
        iso639P3Code: "alz",
        peopleIds: ["PPL_ALUR"],
        matchStatus: "exact_reference",
        matchedReferenceEntries: [
          {
            glottocode: "alur1250",
            name: "Alur",
            level: "language",
          },
        ],
      },
      {
        iso639P3Code: "swa",
        peopleIds: ["PPL_SWAHILI"],
        matchStatus: "outside_country_reference",
        matchedReferenceEntries: [],
      },
    ]);
  });
});
