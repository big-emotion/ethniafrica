import { describe, expect, it } from "vitest";

import {
  buildCountryPeopleLedger,
  mergeCountryPeopleReviews,
  summarizeCountryPeopleReviews,
} from "../lib/countryPeopleReconciliation";

describe("buildCountryPeopleLedger", () => {
  // @req REQ-032
  it("keeps link evidence, review signals, and editorial decisions separate", () => {
    const ledger = buildCountryPeopleLedger({
      countryId: "COD",
      country: {
        content: {
          majorPeoples: [
            {
              peopleId: "PPL_ONE",
              languageFamily: "FLG_OLD",
            },
          ],
          demographics: {
            peoples: [{ peopleId: "PPL_ONE" }],
          },
        },
      },
      peoples: [
        {
          id: "PPL_ONE",
          nameMain: "Lingala",
          languageFamilyId: "FLG_ONE",
          currentCountries: ["COD"],
          content: {
            appellations: {
              selfAppellation: "People One",
              currentCountries: ["COD"],
            },
            languages: {
              mainLanguage: "Lingala",
              isoCodes: ["aaa"],
            },
            demography: {
              distributionByCountry: [{ country: "COD" }],
            },
            sources: [
              { tier: "official", url: "https://example.test/one" },
              { tier: "needs_review" },
            ],
          },
        },
        {
          id: "PPL_TWO_MACRO",
          nameMain: "Two macro",
          languageFamilyId: "FLG_TWO",
          content: {
            appellations: { selfAppellation: "Two" },
            languages: { isoCodes: ["AAA"] },
            demography: {
              distributionByCountry: [{ country: "COD" }],
            },
            sources: [],
          },
        },
      ],
    });

    expect(ledger.summary).toEqual({
      totalEntries: 2,
      fullyLinkedEntries: 1,
      incompleteLinkEntries: 1,
      macroLikeEntries: 1,
      nameLanguageLabelMatches: 1,
      entriesWithoutAcceptedSource: 1,
      sharedIsoCodeClusters: 1,
      featuredFamilyMismatches: 1,
      entriesRequiringReview: 2,
    });
    expect(ledger.entries[0]).toMatchObject({
      id: "PPL_ONE",
      selfAppellation: "People One",
      isoCodes: ["aaa"],
      linkEvidence: {
        topLevelCurrentCountries: true,
        appellationsCurrentCountries: true,
        demographyDistribution: true,
      },
      countrySurfaces: { featured: true, demographic: true },
      sourceEvidence: {
        total: 2,
        accepted: 1,
        needsReview: 1,
        unverified: 0,
      },
      sharedIsoCodes: [{ isoCode: "aaa", peopleIds: ["PPL_TWO_MACRO"] }],
      automatedFlags: [
        "featured_family_mismatch",
        "name_matches_language_label",
        "shared_iso_code",
      ],
    });
    expect(ledger.entries[1].automatedFlags).toEqual([
      "incomplete_country_link",
      "macro_like",
      "no_accepted_source",
      "shared_iso_code",
    ]);
    expect(ledger.sharedIsoCodeClusters).toEqual([
      { isoCode: "aaa", peopleIds: ["PPL_ONE", "PPL_TWO_MACRO"] },
    ]);
    expect(ledger.entries[0]).not.toHaveProperty("review");
  });
});

describe("mergeCountryPeopleReviews", () => {
  // @req REQ-032
  it("preserves an existing manual review for a still-linked entry", () => {
    const entries = [
      { id: "PPL_ONE", nameMain: "Updated name", automatedFlags: [] },
      { id: "PPL_TWO", nameMain: "Two", automatedFlags: [] },
    ];

    expect(
      mergeCountryPeopleReviews(entries, [
        {
          id: "PPL_ONE",
          nameMain: "Old name",
          review: {
            status: "in_review",
            entityType: "people",
            notes: "Keep this decision.",
          },
        },
        {
          id: "PPL_STALE",
          review: { status: "resolved" },
        },
      ])
    ).toEqual([
      {
        id: "PPL_ONE",
        nameMain: "Updated name",
        automatedFlags: [],
        review: {
          status: "in_review",
          entityType: "people",
          notes: "Keep this decision.",
        },
      },
      {
        id: "PPL_TWO",
        nameMain: "Two",
        automatedFlags: [],
        review: {
          status: "pending",
          entityType: "unknown",
          canonicalPeopleId: null,
          parentPeopleId: null,
          decision: null,
          notes: null,
          sources: [],
        },
      },
    ]);
  });
});

describe("summarizeCountryPeopleReviews", () => {
  // @req REQ-032
  it("reports review progress and classifications without inventing a people count", () => {
    expect(
      summarizeCountryPeopleReviews([
        {
          id: "PPL_ONE",
          review: { status: "in_review", entityType: "people" },
        },
        {
          id: "PPL_TWO",
          review: { status: "resolved", entityType: "subgroup" },
        },
        {
          id: "PPL_THREE",
          review: { status: "pending", entityType: "unknown" },
        },
      ])
    ).toEqual({
      totalRelations: 3,
      reviewedRelations: 2,
      pendingRelations: 1,
      reviewCompletionPercent: 66.7,
      reviewedByEntityType: {
        people: 1,
        subgroup: 1,
      },
    });
  });

  // @req REQ-032
  it("returns a null percentage when no relation exists", () => {
    expect(summarizeCountryPeopleReviews([])).toMatchObject({
      totalRelations: 0,
      reviewedRelations: 0,
      pendingRelations: 0,
      reviewCompletionPercent: null,
      reviewedByEntityType: {},
    });
  });
});
