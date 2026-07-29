// (illustrative, not data) — shape-only fixture for nameRecordParser tests. Never loaded into Supabase.
// Invalid: a source entry omits the required tier field.
export const invalidSourceNoTier = {
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
      sources: [
        {
          title: "Titre illustratif sans tier",
          author: "Auteur illustratif",
          year: 2020,
          url: "https://example.org/source-no-tier",
          notes: "",
        },
      ],
    },
  ],
};
