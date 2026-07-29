// (illustrative, not data) — shape-only fixture for nameRecordParser tests. Never loaded into Supabase.
// Valid counterpart: imposedBy is set AND whyProblematic is populated (FR56-imposed satisfied).
export const validImposedWithWhyProblematic = {
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
      nameText: "Testonyme colonial imposé",
      nameType: "exonym",
      languageOfOrigin: null,
      meaning: null,
      periodLabel: "Période coloniale (illustratif)",
      imposedBy: "Administration coloniale (illustratif)",
      impositionPeriod: "XIXe siècle (illustratif)",
      whyProblematic:
        "Nom imposé pendant la colonisation, dépréciatif dans son usage d'origine (illustratif).",
      contemporaryUsage: null,
      sortRank: 1,
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
