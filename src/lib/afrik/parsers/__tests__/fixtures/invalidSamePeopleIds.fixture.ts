// (illustrative, not data) — shape-only fixture for relationParser tests. Never loaded into Supabase.
// Invalid: peopleIdA === peopleIdB — a relation cannot link a people to itself.
export const invalidSamePeopleIds = {
  id: "REL_TEST_INVALID_04",
  relationType: "migratory",
  peopleIdA: "PPL_TEST_A",
  peopleIdB: "PPL_TEST_A",
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
