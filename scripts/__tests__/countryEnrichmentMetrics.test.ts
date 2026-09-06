import { describe, expect, it } from "vitest";

import {
  buildCountryEnrichmentMetrics,
  peopleReferencesCountry,
} from "../lib/countryEnrichmentMetrics";

describe("buildCountryEnrichmentMetrics", () => {
  // @req REQ-032
  it("recognizes every country-link location used by people fiches", () => {
    expect(peopleReferencesCountry({ currentCountries: ["COD"] }, "COD")).toBe(
      true
    );
    expect(
      peopleReferencesCountry(
        { content: { appellations: { currentCountries: ["COD"] } } },
        "COD"
      )
    ).toBe(true);
    expect(
      peopleReferencesCountry(
        {
          content: {
            demography: { distributionByCountry: [{ country: "COD" }] },
          },
        },
        "COD"
      )
    ).toBe(true);
    expect(peopleReferencesCountry({ currentCountries: ["AGO"] }, "COD")).toBe(
      false
    );
  });

  // @req REQ-032
  it("keeps structural, inventory, and evidence coverage separate", () => {
    const metrics = buildCountryEnrichmentMetrics({
      countryId: "COD",
      country: {
        id: "COD",
        nameFr: "République démocratique du Congo",
        nameOfficial: "République démocratique du Congo (RDC)",
        content: {
          historicalNames: {
            formerNames: ["Zaïre"],
            antiquity: "Earlier period",
            middleAges: null,
            precolonial: null,
            colonization: "Colonial period",
            contemporary: null,
          },
          kingdoms: [{ name: "Kingdom" }],
          majorPeoples: [
            {
              name: "One",
              peopleId: "PPL_ONE",
              languageFamily: "FLG_A",
              languages: ["Alpha", "Beta"],
            },
            {
              name: "Two",
              peopleId: "PPL_TWO",
              languageFamily: "FLG_OLD",
              languages: ["Beta", "Gamma"],
            },
          ],
          culture: {},
          historicalFacts: {
            ancientPeriods: "Ancient",
            middleAges: null,
            precolonial: null,
            colonization: null,
            independenceStruggle: null,
            postIndependence: "Modern",
          },
          sources: [
            { tier: "official", url: "https://example.test/source" },
            { tier: "needs_review", url: null },
          ],
          demographics: {
            totalPopulation: 100,
            referenceYear: 2025,
            peoples: [
              { name: "One", peopleId: "PPL_ONE", percentageInCountry: 60 },
              { name: "Two", peopleId: "PPL_TWO", percentageInCountry: 20 },
              { name: "Other groups", percentageInCountry: 20 },
            ],
          },
        },
      },
      linkedPeoples: [
        {
          id: "PPL_ONE",
          languageFamilyId: "FLG_A",
          content: { languages: { isoCodes: ["aaa"] }, sources: [] },
        },
        {
          id: "PPL_TWO",
          languageFamilyId: "FLG_B",
          content: { languages: { isoCodes: ["bbb"] }, sources: [] },
        },
        {
          id: "PPL_GROUP_MACRO",
          languageFamilyId: "FLG_C",
          content: { languages: { isoCodes: ["ccc"] }, sources: [] },
        },
      ],
      languageDossierIds: new Set(["aaa", "ccc"]),
      patronyms: [
        {
          id: "PAT_ONE",
          transmissionMode: "patrilineal",
          countries: [{ countryId: "COD", status: "attested" }],
          sources: [{ source_kind: "academic" }],
          origin: { writtenChronicles: [{ claim: "Attested" }] },
        },
        {
          id: "PAT_TWO",
          transmissionMode: "other",
          countries: [{ countryId: "COD", status: "supposed" }],
          sources: [{ source_kind: "ai_generated" }],
          origin: {},
        },
        {
          id: "PAT_ELSEWHERE",
          countries: [{ countryId: "AGO", status: "attested" }],
          sources: [],
          origin: {},
        },
      ],
      references: {
        peopleGroups: 10,
        languages: 10,
        patronymQuota: 1,
      },
      peopleReview: {
        totalRelations: 3,
        reviewedRelations: 2,
        pendingRelations: 1,
        reviewCompletionPercent: 66.7,
        reviewedByEntityType: { people: 1, subgroup: 1 },
      },
    });

    expect(metrics.peoples).toMatchObject({
      linkedFiches: 3,
      macroLikeLinkedFiches: 1,
      featuredEntries: 2,
      featuredVsLinkedPercent: 66.7,
      rawReferenceUpperBoundPercent: 30,
      namedDemographicSharePercent: 80,
      catchAllDemographicSharePercent: 20,
      featuredFamilyMismatches: 1,
      editorialReview: {
        totalRelations: 3,
        reviewedRelations: 2,
        pendingRelations: 1,
        reviewCompletionPercent: 66.7,
        reviewedByEntityType: { people: 1, subgroup: 1 },
      },
    });
    expect(metrics.languages).toMatchObject({
      declaredMainLanguages: 0,
      featuredLanguageLabels: 3,
      candidateIsoCodes: 3,
      candidateIsoCodesWithDossiers: 2,
      dossierCoverageOfCandidateCodesPercent: 66.7,
      rawReferenceUpperBoundPercent: 30,
    });
    expect(metrics.patronyms).toMatchObject({
      directCountryFiches: 2,
      attested: 1,
      supposed: 1,
      quota: 1,
      quotaCompletionPercent: 100,
      documented: 1,
      queueOnly: 1,
      documentedPercent: 50,
    });
    expect(metrics.sources.countryFiche).toEqual({
      total: 2,
      accepted: 1,
      acceptedPercent: 50,
      withUrl: 1,
      withUrlPercent: 50,
      needsReview: 1,
    });
    expect(metrics.history).toMatchObject({
      historicalNameEntries: 1,
      historicalNamePeriodsFilled: 2,
      historicalNamePeriodsTotal: 5,
      historicalFactPeriodsFilled: 2,
      historicalFactPeriodsTotal: 6,
      declaredPoliticalEntities: 1,
    });
  });
});
