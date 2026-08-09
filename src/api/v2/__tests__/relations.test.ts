import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  confidenceEntityTypeSchema,
  confidenceEntityIdSchema,
  confidenceParamsSchema,
} from "@/api/v2/schemas/confidence";

vi.mock("@/lib/supabase/queries/afrik/relations", () => ({
  getRelationsForPeople: vi.fn(),
  getDerivedLinguisticLinks: vi.fn(),
  peopleExists: vi.fn(),
  listRelationRecords: vi.fn(),
  getRelationRecordById: vi.fn(),
}));

import {
  getEgoNetwork,
  getEgoNetworkOrNotFound,
  listRelations,
  getRelationById,
  PeopleNotFoundError,
} from "@/api/v2/services/relations";
import {
  getRelationsForPeople,
  getDerivedLinguisticLinks,
  peopleExists,
  listRelationRecords,
  getRelationRecordById,
} from "@/lib/supabase/queries/afrik/relations";
import type {
  SourcedRelation,
  DerivedLinguisticLink,
  PublicRelationRecord,
} from "@/types/relations";

function sourcedRelation(
  overrides: Partial<SourcedRelation> = {}
): SourcedRelation {
  return {
    id: "REL_TEST",
    relationType: "migratory",
    direction: "bidirectional",
    period: { startYear: 1300, endYear: 1800, label: "test" },
    description: "test",
    sources: [],
    confidence: null,
    neighbor: { id: "PPL_B", nameMain: "B", languageFamilyId: "FLG_X" },
    ...overrides,
  };
}

function derivedLink(
  overrides: Partial<DerivedLinguisticLink> = {}
): DerivedLinguisticLink {
  return {
    derived: true,
    basis: "sharedLanguageFamily",
    neighbor: { id: "PPL_D", nameMain: "D", languageFamilyId: "FLG_X" },
    ...overrides,
  };
}

function publicRelationRecord(
  overrides: Partial<PublicRelationRecord> = {}
): PublicRelationRecord {
  return {
    id: "REL_TEST",
    relationType: "commercial",
    peopleIdA: "PPL_A",
    peopleIdB: "PPL_B",
    direction: "bidirectional",
    period: { startYear: 1400, endYear: 1900, label: "test" },
    description: "test",
    sources: [],
    confidence: null,
    ...overrides,
  };
}

describe("fabric entity_type union — 'relation' support (ETNI-503, Story 11.2)", () => {
  // @req REQ-091
  it("accepts 'relation' as a confidence entity type", () => {
    expect(confidenceEntityTypeSchema.safeParse("relation").success).toBe(true);
  });

  // @req REQ-091
  it("still accepts the pre-existing entity types (additive change only)", () => {
    expect(confidenceEntityTypeSchema.safeParse("people").success).toBe(true);
    expect(
      confidenceEntityTypeSchema.safeParse("language-family").success
    ).toBe(true);
  });

  // @req REQ-091
  it("accepts a REL_* entity id", () => {
    expect(
      confidenceEntityIdSchema.safeParse("REL_SONINKE_MANDE_TRADE").success
    ).toBe(true);
  });

  // @req REQ-091
  it("accepts a relation entityType paired with a REL_* entityId", () => {
    const result = confidenceParamsSchema.safeParse({
      entityType: "relation",
      entityId: "REL_SONINKE_MANDE_TRADE",
    });
    expect(result.success).toBe(true);
  });

  // @req REQ-091
  it("rejects a relation entityType paired with a mismatched prefix", () => {
    const result = confidenceParamsSchema.safeParse({
      entityType: "relation",
      entityId: "PPL_SONINKE",
    });
    expect(result.success).toBe(false);
  });
});

describe("relations service — two-query ego network (Story 11.6, ETNI-507)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-093
  it("composes sourced and derived collections from exactly two query-layer calls", async () => {
    vi.mocked(getRelationsForPeople).mockResolvedValue([sourcedRelation()]);
    vi.mocked(getDerivedLinguisticLinks).mockResolvedValue([derivedLink()]);

    const result = await getEgoNetwork("PPL_A");

    expect(result.sourced).toHaveLength(1);
    expect(result.derived).toHaveLength(1);
    expect(getRelationsForPeople).toHaveBeenCalledTimes(1);
    expect(getDerivedLinguisticLinks).toHaveBeenCalledTimes(1);
    expect(getRelationsForPeople).toHaveBeenCalledWith("PPL_A");
  });

  // @req REQ-093
  it("carries derived: true and basis: sharedLanguageFamily with no period/description/sources on derived links", async () => {
    vi.mocked(getRelationsForPeople).mockResolvedValue([]);
    vi.mocked(getDerivedLinguisticLinks).mockResolvedValue([derivedLink()]);

    const result = await getEgoNetwork("PPL_A");

    expect(result.derived[0]).toEqual({
      derived: true,
      basis: "sharedLanguageFamily",
      neighbor: { id: "PPL_D", nameMain: "D", languageFamilyId: "FLG_X" },
    });
    expect(result.derived[0]).not.toHaveProperty("period");
    expect(result.derived[0]).not.toHaveProperty("description");
    expect(result.derived[0]).not.toHaveProperty("sources");
  });

  // @req REQ-093
  it("guarantees by construction that derived excludes peoples already in the sourced set", async () => {
    vi.mocked(getRelationsForPeople).mockResolvedValue([
      sourcedRelation({
        neighbor: {
          id: "PPL_SHARED",
          nameMain: "Shared",
          languageFamilyId: "FLG_X",
        },
      }),
    ]);
    // Simulates a query-layer implementation that failed to exclude
    // PPL_SHARED — the service must still guarantee the split.
    vi.mocked(getDerivedLinguisticLinks).mockResolvedValue([
      derivedLink({
        neighbor: {
          id: "PPL_SHARED",
          nameMain: "Shared",
          languageFamilyId: "FLG_X",
        },
      }),
      derivedLink({
        neighbor: {
          id: "PPL_OTHER",
          nameMain: "Other",
          languageFamilyId: "FLG_X",
        },
      }),
    ]);

    const result = await getEgoNetwork("PPL_A");

    expect(result.derived.map((d) => d.neighbor.id)).toEqual(["PPL_OTHER"]);
  });

  // @req REQ-093
  it("passes the derived-link limit through to the query layer", async () => {
    vi.mocked(getRelationsForPeople).mockResolvedValue([]);
    vi.mocked(getDerivedLinguisticLinks).mockResolvedValue([]);

    await getEgoNetwork("PPL_A", 10);

    expect(getDerivedLinguisticLinks).toHaveBeenCalledWith("PPL_A", 10);
  });

  // @req REQ-093
  it("returns two empty arrays — never null, never throws — for a people with no relations and no family peers", async () => {
    vi.mocked(getRelationsForPeople).mockResolvedValue([]);
    vi.mocked(getDerivedLinguisticLinks).mockResolvedValue([]);

    const result = await getEgoNetwork("PPL_LONELY");

    expect(result.sourced).toEqual([]);
    expect(result.derived).toEqual([]);
  });
});

describe("getEgoNetworkOrNotFound — 404 for unknown people (Story 11.7, ETNI-508)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-097
  it("throws PeopleNotFoundError for an unknown people id, without calling the relation queries", async () => {
    vi.mocked(peopleExists).mockResolvedValue(false);

    await expect(getEgoNetworkOrNotFound("PPL_UNKNOWN")).rejects.toThrow(
      PeopleNotFoundError
    );
    expect(getRelationsForPeople).not.toHaveBeenCalled();
    expect(getDerivedLinguisticLinks).not.toHaveBeenCalled();
  });

  // @req REQ-097
  it("returns the ego network for a known people, even with zero relations", async () => {
    vi.mocked(peopleExists).mockResolvedValue(true);
    vi.mocked(getRelationsForPeople).mockResolvedValue([]);
    vi.mocked(getDerivedLinguisticLinks).mockResolvedValue([]);

    const result = await getEgoNetworkOrNotFound("PPL_LONELY");

    expect(result).toEqual({ sourced: [], derived: [] });
  });

  // @req REQ-097
  it("passes the derived-link limit through", async () => {
    vi.mocked(peopleExists).mockResolvedValue(true);
    vi.mocked(getRelationsForPeople).mockResolvedValue([]);
    vi.mocked(getDerivedLinguisticLinks).mockResolvedValue([]);

    await getEgoNetworkOrNotFound("PPL_A", 10);

    expect(getDerivedLinguisticLinks).toHaveBeenCalledWith("PPL_A", 10);
  });
});

describe("listRelations (Story 11.7, ETNI-508)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-097
  it("delegates to the query layer and returns its result verbatim", async () => {
    vi.mocked(listRelationRecords).mockResolvedValue({
      data: [publicRelationRecord()],
      total: 1,
    });

    const result = await listRelations({ limit: 20, offset: 0 });

    expect(listRelationRecords).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  // @req REQ-097
  it("returns an empty result for an empty corpus", async () => {
    vi.mocked(listRelationRecords).mockResolvedValue({ data: [], total: 0 });

    const result = await listRelations({ limit: 20, offset: 0 });

    expect(result).toEqual({ data: [], total: 0 });
  });
});

describe("getRelationById (Story 11.7, ETNI-508)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-097
  it("returns the record when found", async () => {
    vi.mocked(getRelationRecordById).mockResolvedValue(
      publicRelationRecord({ id: "REL_A_B" })
    );

    const result = await getRelationById("REL_A_B");

    expect(getRelationRecordById).toHaveBeenCalledWith("REL_A_B");
    expect(result?.id).toBe("REL_A_B");
  });

  // @req REQ-097
  it("returns null for an unknown relation id", async () => {
    vi.mocked(getRelationRecordById).mockResolvedValue(null);

    const result = await getRelationById("REL_UNKNOWN");

    expect(result).toBeNull();
  });
});
