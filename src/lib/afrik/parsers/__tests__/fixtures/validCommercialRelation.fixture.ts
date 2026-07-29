// (illustrative, not data) — shape-only fixture for relationParser tests. Never loaded into Supabase.
export const validCommercialRelation = {
  _meta: {
    format: "AFRIK JSON v2",
    entity: "relation",
    directives:
      "Voir DIRECTIVES-AFRIK.md pour les règles de rédaction complètes.",
  },
  id: "REL_TEST_COMMERCIAL_01",
  relationType: "commercial",
  peopleIdA: "PPL_TEST_C",
  peopleIdB: "PPL_TEST_D",
  direction: "bidirectional",
  period: {
    startYear: null,
    endYear: null,
    label: "Période indéterminée (illustratif)",
  },
  description: "Échanges commerciaux illustratifs pour test.",
  sources: [
    {
      title: "Titre illustratif Tier 2",
      author: "Auteur illustratif",
      year: 2019,
      url: "https://example.org/source-tier-2-primary",
      tier: 2,
      notes:
        "Tier 2 : source primaire repérée via Wikipedia FR + EN (illustratif).",
    },
  ],
};
