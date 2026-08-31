// (illustrative, not data) — shape-only fixture for nameRecordParser tests. Never loaded into Supabase.
// Invalid: "_meta" section skipped entirely — skipped sections must be rejected (strict model).
export const invalidSkippedSection = {
  id: "PPL_TEST_A",
  entityType: "people",
  names: [
    {
      nameText: "Testonym",
      nameType: "endonym",
      languageOfOrigin: "swa",
      meaning: null,
      periodLabel: null,
      imposedBy: null,
      impositionPeriod: null,
      whyProblematic: null,
      contemporaryUsage: null,
      sortRank: 0,
      sources: [
        {
          title: "Titre illustratif Tier 1",
          author: "Auteur illustratif",
          year: 2020,
          url: "https://example.org/source-tier-1",
          tier: 1,
          notes: "",
        },
      ],
    },
  ],
};
