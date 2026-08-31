// (illustrative, not data) — shape-only fixture for nameRecordParser tests. Never loaded into Supabase.
export const validNameDossier = {
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
      meaning: "Nom illustratif de test",
      periodLabel: null,
      imposedBy: null,
      impositionPeriod: null,
      whyProblematic: null,
      contemporaryUsage: "Utilisé couramment (illustratif)",
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
    {
      nameText: "Testonyme colonial",
      nameType: "exonym",
      languageOfOrigin: null,
      meaning: null,
      periodLabel: "XIXe siècle (illustratif)",
      imposedBy: null,
      impositionPeriod: null,
      whyProblematic: null,
      contemporaryUsage: null,
      sortRank: 1,
      sources: [
        {
          title: "Titre illustratif Tier 2",
          author: "Auteur illustratif",
          year: 2019,
          url: "https://example.org/source-tier-2",
          tier: 2,
          notes:
            "Croisé via Wikipedia FR + EN, source primaire identifiée (illustratif)",
        },
      ],
    },
  ],
};
