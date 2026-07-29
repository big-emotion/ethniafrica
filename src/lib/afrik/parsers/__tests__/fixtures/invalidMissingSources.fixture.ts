// (illustrative, not data) — shape-only fixture for relationParser tests. Never loaded into Supabase.
// Invalid: no sources entries — REL-5 "source or drop" is machine-enforced (FR74).
export const invalidMissingSources = {
  id: "REL_TEST_INVALID_02",
  relationType: "migratory",
  peopleIdA: "PPL_TEST_A",
  peopleIdB: "PPL_TEST_B",
  direction: "bidirectional",
  period: { startYear: null, endYear: null, label: "Illustratif" },
  description: "Fixture invalide illustrative.",
  sources: [],
};
