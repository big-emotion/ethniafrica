// (illustrative, not data) — shape-only fixture for relationParser tests. Never loaded into Supabase.
export const validMigratoryRelation = {
  _meta: {
    format: "AFRIK JSON v2",
    entity: "relation",
    directives:
      "Voir DIRECTIVES-AFRIK.md pour les règles de rédaction complètes.",
  },
  id: "REL_TEST_MIGRATORY_01",
  relationType: "migratory",
  peopleIdA: "PPL_TEST_A",
  peopleIdB: "PPL_TEST_B",
  direction: "a_to_b",
  period: {
    startYear: 1200,
    endYear: 1450,
    label: "XIIIe-XVe siècle (illustratif)",
  },
  description: "Migration illustrative entre deux peuples fictifs pour test.",
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
};
