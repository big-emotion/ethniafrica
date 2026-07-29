// (illustrative, not data) — shape-only fixture for relationParser tests. Never loaded into Supabase.
// Invalid: "linguistic" is derived-only (FR73) and must never be stored as a relationType.
export const invalidLinguisticRelationType = {
  id: "REL_TEST_INVALID_01",
  relationType: "linguistic",
  peopleIdA: "PPL_TEST_A",
  peopleIdB: "PPL_TEST_B",
  direction: "bidirectional",
  period: { startYear: null, endYear: null, label: "Illustratif" },
  description: "Fixture invalide illustrative.",
  sources: [
    {
      title: "Titre illustratif",
      author: "Auteur illustratif",
      year: 2020,
      url: "https://example.org/source",
      tier: 1,
      notes: "",
    },
  ],
};
