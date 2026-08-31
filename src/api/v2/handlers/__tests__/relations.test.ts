import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/v2/services/relations", () => ({
  getEgoNetworkOrNotFound: vi.fn(),
  listRelations: vi.fn(),
  getRelationById: vi.fn(),
  PeopleNotFoundError: class PeopleNotFoundError extends Error {
    constructor(pplId: string) {
      super(`People not found: ${pplId}`);
      this.name = "PeopleNotFoundError";
    }
  },
}));

import {
  getEgoNetworkHandler,
  listRelationsHandler,
  getRelationDetailHandler,
} from "@/api/v2/handlers/relations";
import {
  getEgoNetworkOrNotFound,
  listRelations,
  getRelationById,
  PeopleNotFoundError,
} from "@/api/v2/services/relations";
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
    id: "REL_A_B",
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

describe("getEgoNetworkHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-097
  it("returns ok:true with a sourced/derived envelope on success", async () => {
    vi.mocked(getEgoNetworkOrNotFound).mockResolvedValue({
      sourced: [sourcedRelation()],
      derived: [derivedLink()],
    });

    const result = await getEgoNetworkHandler("PPL_A", {
      includeDerived: true,
      limit: 24,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.data.peopleId).toBe("PPL_A");
      expect(result.envelope.data.sourced).toHaveLength(1);
      expect(result.envelope.data.sourced[0]).toEqual({
        relationId: "REL_TEST",
        type: "migratory",
        direction: "bidirectional",
        otherPeople: { id: "PPL_B", nameMain: "B", languageFamilyId: "FLG_X" },
        period: { startYear: 1300, endYear: 1800, label: "test" },
        description: "test",
        confidence: null,
      });
      expect(result.envelope.data.derived).toHaveLength(1);
      expect(result.envelope.data.derived[0]).toEqual({
        type: "linguistic",
        derived: true,
        basis: "sharedLanguageFamily",
        languageFamilyId: "FLG_X",
        otherPeople: { id: "PPL_D", nameMain: "D", languageFamilyId: "FLG_X" },
      });
      expect(result.envelope.meta.license).toBe("CC-BY-SA-4.0");
    }
  });

  // @req REQ-097
  it("filters the sourced collection by the types query param", async () => {
    vi.mocked(getEgoNetworkOrNotFound).mockResolvedValue({
      sourced: [
        sourcedRelation({ id: "REL_MIG", relationType: "migratory" }),
        sourcedRelation({ id: "REL_COM", relationType: "commercial" }),
      ],
      derived: [],
    });

    const result = await getEgoNetworkHandler("PPL_A", {
      types: ["commercial"],
      includeDerived: true,
      limit: 24,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.data.sourced).toHaveLength(1);
      expect(result.envelope.data.sourced[0].relationId).toBe("REL_COM");
    }
  });

  // @req REQ-097
  it("omits derived links when includeDerived is false", async () => {
    vi.mocked(getEgoNetworkOrNotFound).mockResolvedValue({
      sourced: [],
      derived: [derivedLink()],
    });

    const result = await getEgoNetworkHandler("PPL_A", {
      includeDerived: false,
      limit: 24,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.data.derived).toEqual([]);
    }
    expect(getEgoNetworkOrNotFound).toHaveBeenCalledWith("PPL_A", 24);
  });

  // @req REQ-097
  it("returns ok:false NOT_FOUND for an unknown people id", async () => {
    vi.mocked(getEgoNetworkOrNotFound).mockRejectedValue(
      new PeopleNotFoundError("PPL_UNKNOWN")
    );

    const result = await getEgoNetworkHandler("PPL_UNKNOWN", {
      includeDerived: true,
      limit: 24,
    });

    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "People not found: PPL_UNKNOWN",
    });
  });

  // @req REQ-097
  it("rethrows unexpected errors", async () => {
    vi.mocked(getEgoNetworkOrNotFound).mockRejectedValue(new Error("boom"));

    await expect(
      getEgoNetworkHandler("PPL_A", { includeDerived: true, limit: 24 })
    ).rejects.toThrow("boom");
  });
});

describe("listRelationsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-097
  it("returns a paginated envelope", async () => {
    vi.mocked(listRelations).mockResolvedValue({
      data: [publicRelationRecord()],
      total: 1,
    });

    const envelope = await listRelationsHandler({ limit: 20, offset: 0 });

    expect(envelope.data).toHaveLength(1);
    expect(envelope.meta.pagination).toEqual({
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
    });
    expect(envelope.meta.license).toBe("CC-BY-SA-4.0");
  });

  // @req REQ-097
  it("returns an empty envelope for an empty corpus", async () => {
    vi.mocked(listRelations).mockResolvedValue({ data: [], total: 0 });

    const envelope = await listRelationsHandler({ limit: 20, offset: 0 });

    expect(envelope.data).toEqual([]);
    expect(envelope.meta.pagination?.total).toBe(0);
  });

  // @req REQ-097
  it("passes filters through to the service", async () => {
    vi.mocked(listRelations).mockResolvedValue({ data: [], total: 0 });

    await listRelationsHandler({
      types: ["migratory"],
      peopleId: "PPL_A",
      periodFrom: 1400,
      periodTo: 1900,
      limit: 10,
      offset: 5,
    });

    expect(listRelations).toHaveBeenCalledWith({
      types: ["migratory"],
      peopleId: "PPL_A",
      periodFrom: 1400,
      periodTo: 1900,
      limit: 10,
      offset: 5,
    });
  });
});

describe("getRelationDetailHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-097
  it("returns ok:true with the relation detail envelope", async () => {
    vi.mocked(getRelationById).mockResolvedValue(publicRelationRecord());

    const result = await getRelationDetailHandler("REL_A_B");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.data.id).toBe("REL_A_B");
      expect(result.envelope.meta.license).toBe("CC-BY-SA-4.0");
    }
  });

  // @req REQ-097
  it("returns ok:false NOT_FOUND for an unknown relation id", async () => {
    vi.mocked(getRelationById).mockResolvedValue(null);

    const result = await getRelationDetailHandler("REL_UNKNOWN");

    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "Relation not found: REL_UNKNOWN",
    });
  });
});
