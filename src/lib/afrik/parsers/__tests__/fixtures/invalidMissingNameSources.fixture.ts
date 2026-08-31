// (illustrative, not data) — shape-only fixture for nameRecordParser tests. Never loaded into Supabase.
// Invalid: sources array is empty — at least one Tier 1/2 source is required.
export const invalidMissingNameSources = {
  _meta: {
    format: "AFRIK JSON v2",
    entity: "nom",
    directives:
      "Voir DIRECTIVES-AFRIK.md pour les règles de rédaction complètes.",
  },
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
      sources: [],
    },
  ],
};
