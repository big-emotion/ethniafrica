// (illustrative, not data) — shape-only fixture for nameRecordParser tests. Never loaded into Supabase.
// Invalid: "names" renamed to "nameEntries" — renamed sections must be rejected (strict model).
export const invalidRenamedSection = {
  _meta: {
    format: "AFRIK JSON v2",
    entity: "nom",
    directives:
      "Voir DIRECTIVES-AFRIK.md pour les règles de rédaction complètes.",
  },
  id: "PPL_TEST_A",
  entityType: "people",
  nameEntries: [
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
