/**
 * Route-level tests for the `/v2` relations endpoints (Epic 11, Story 11.7,
 * ETNI-508) — written first per the story's acceptance criteria.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/relations", () => ({
  getEgoNetworkHandler: vi.fn(),
  listRelationsHandler: vi.fn(),
  getRelationDetailHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import {
  getEgoNetworkHandler,
  listRelationsHandler,
  getRelationDetailHandler,
} from "@/api/v2/handlers/relations";

import {
  GET as getEgoNetwork,
  OPTIONS as optionsEgoNetwork,
} from "../peoples/[id]/relations/route";
import {
  GET as listRelations,
  OPTIONS as optionsList,
} from "../relations/route";
import {
  GET as getRelationDetail,
  OPTIONS as optionsDetail,
} from "../relations/[id]/route";
import type { ApiEnvelope } from "@/api/v2/utils/response";
import type { PublicRelationRecord } from "@/types/relations";

const egoNetworkEnvelope = {
  data: {
    peopleId: "PPL_EWE",
    sourced: [
      {
        relationId: "REL_A",
        type: "commercial",
        direction: "bidirectional",
        otherPeople: { id: "PPL_B", nameMain: "B", languageFamilyId: "FLG_X" },
        period: { startYear: 1400, endYear: 1900, label: "test" },
        description: "test",
        confidence: null,
      },
    ],
    derived: [],
  },
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "EthniAfrica — ethniafrica.com",
  },
  errors: [],
};

const relationListEnvelope: ApiEnvelope<PublicRelationRecord[]> = {
  data: [
    {
      id: "REL_A",
      relationType: "commercial",
      peopleIdA: "PPL_A",
      peopleIdB: "PPL_B",
      direction: "bidirectional",
      period: { startYear: 1400, endYear: 1900, label: "test" },
      description: "test",
      sources: [],
      confidence: null,
    },
  ],
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "EthniAfrica — ethniafrica.com",
    pagination: { total: 1, page: 1, perPage: 20, totalPages: 1 },
  },
  errors: [],
};

const relationDetailEnvelope: ApiEnvelope<PublicRelationRecord> = {
  data: relationListEnvelope.data[0],
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "EthniAfrica — ethniafrica.com",
  },
  errors: [],
};

describe("GET /api/v2/peoples/[id]/relations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-097
  it("returns 200 with the ego-network envelope and Cache-Control s-maxage=3600", async () => {
    vi.mocked(getEgoNetworkHandler).mockResolvedValue({
      ok: true,
      envelope: egoNetworkEnvelope,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_EWE/relations"
    );
    const response = await getEgoNetwork(request, {
      params: Promise.resolve({ id: "PPL_EWE" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.peopleId).toBe("PPL_EWE");
    expect(body.meta.license).toBe("CC-BY-SA-4.0");
    expect(response.headers.get("Cache-Control")).toBe("s-maxage=3600");
  });

  // @req REQ-097
  it("passes parsed query params (types, includeDerived, limit) to the handler", async () => {
    vi.mocked(getEgoNetworkHandler).mockResolvedValue({
      ok: true,
      envelope: egoNetworkEnvelope,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_EWE/relations?types=migratory,commercial&includeDerived=false&limit=10"
    );
    await getEgoNetwork(request, {
      params: Promise.resolve({ id: "PPL_EWE" }),
    });

    expect(getEgoNetworkHandler).toHaveBeenCalledWith("PPL_EWE", {
      types: ["migratory", "commercial"],
      includeDerived: false,
      limit: 10,
    });
  });

  // @req REQ-097
  it("returns 400 VALIDATION_ERROR for a malformed people id", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/peoples/ewe/relations"
    );
    const response = await getEgoNetwork(request, {
      params: Promise.resolve({ id: "ewe" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(getEgoNetworkHandler).not.toHaveBeenCalled();
  });

  // @req REQ-097
  it("returns 400 VALIDATION_ERROR for an invalid limit", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_EWE/relations?limit=999"
    );
    const response = await getEgoNetwork(request, {
      params: Promise.resolve({ id: "PPL_EWE" }),
    });

    expect(response.status).toBe(400);
    expect(getEgoNetworkHandler).not.toHaveBeenCalled();
  });

  // @req REQ-097
  it("returns 404 NOT_FOUND for an unknown people id", async () => {
    vi.mocked(getEgoNetworkHandler).mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
      message: "People not found: PPL_UNKNOWN",
    });

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_UNKNOWN/relations"
    );
    const response = await getEgoNetwork(request, {
      params: Promise.resolve({ id: "PPL_UNKNOWN" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.errors[0].code).toBe("NOT_FOUND");
  });

  // @req REQ-097
  it("returns 500 INTERNAL_ERROR when the handler throws", async () => {
    vi.mocked(getEgoNetworkHandler).mockRejectedValue(new Error("db down"));

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_EWE/relations"
    );
    const response = await getEgoNetwork(request, {
      params: Promise.resolve({ id: "PPL_EWE" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  // @req REQ-097
  it("sets CORS headers and answers OPTIONS with 204", async () => {
    vi.mocked(getEgoNetworkHandler).mockResolvedValue({
      ok: true,
      envelope: egoNetworkEnvelope,
    });
    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_EWE/relations"
    );
    const response = await getEgoNetwork(request, {
      params: Promise.resolve({ id: "PPL_EWE" }),
    });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");

    const optionsResponse = optionsEgoNetwork();
    expect(optionsResponse.status).toBe(204);
  });
});

describe("GET /api/v2/relations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-097
  it("returns 200 with the paginated envelope and Cache-Control s-maxage=3600", async () => {
    vi.mocked(listRelationsHandler).mockResolvedValue(relationListEnvelope);

    const request = new NextRequest("http://localhost/api/v2/relations");
    const response = await listRelations(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta.pagination.total).toBe(1);
    expect(response.headers.get("Cache-Control")).toBe("s-maxage=3600");
  });

  // @req REQ-097
  it("returns 200 with an empty envelope for an empty corpus", async () => {
    vi.mocked(listRelationsHandler).mockResolvedValue({
      data: [],
      meta: {
        license: "CC-BY-SA-4.0",
        attribution: "EthniAfrica — ethniafrica.com",
        pagination: { total: 0, page: 1, perPage: 20, totalPages: 1 },
      },
      errors: [],
    });

    const request = new NextRequest("http://localhost/api/v2/relations");
    const response = await listRelations(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  // @req REQ-097
  it("passes filters (types, peopleId, periodFrom/To, limit, offset) to the handler", async () => {
    vi.mocked(listRelationsHandler).mockResolvedValue(relationListEnvelope);

    const request = new NextRequest(
      "http://localhost/api/v2/relations?types=migratory&peopleId=PPL_A&periodFrom=1400&periodTo=1900&limit=10&offset=5"
    );
    await listRelations(request);

    expect(listRelationsHandler).toHaveBeenCalledWith({
      types: ["migratory"],
      peopleId: "PPL_A",
      periodFrom: 1400,
      periodTo: 1900,
      limit: 10,
      offset: 5,
    });
  });

  // @req REQ-097
  it("returns 400 VALIDATION_ERROR for a malformed peopleId filter", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/relations?peopleId=ewe"
    );
    const response = await listRelations(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(listRelationsHandler).not.toHaveBeenCalled();
  });

  // @req REQ-097
  it("returns 400 VALIDATION_ERROR when periodFrom > periodTo", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/relations?periodFrom=1900&periodTo=1400"
    );
    const response = await listRelations(request);

    expect(response.status).toBe(400);
    expect(listRelationsHandler).not.toHaveBeenCalled();
  });

  // @req REQ-097
  it("returns 500 INTERNAL_ERROR when the handler throws", async () => {
    vi.mocked(listRelationsHandler).mockRejectedValue(new Error("db down"));

    const request = new NextRequest("http://localhost/api/v2/relations");
    const response = await listRelations(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  // @req REQ-097
  it("returns 204 with CORS headers on OPTIONS", () => {
    const response = optionsList();
    expect(response.status).toBe(204);
  });
});

describe("GET /api/v2/relations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-097
  it("returns 200 with the relation detail envelope and Cache-Control s-maxage=3600", async () => {
    vi.mocked(getRelationDetailHandler).mockResolvedValue({
      ok: true,
      envelope: relationDetailEnvelope,
    });

    const request = new NextRequest("http://localhost/api/v2/relations/REL_A");
    const response = await getRelationDetail(request, {
      params: Promise.resolve({ id: "REL_A" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe("REL_A");
    expect(response.headers.get("Cache-Control")).toBe("s-maxage=3600");
  });

  // @req REQ-097
  it("returns 400 VALIDATION_ERROR for a malformed relation id", async () => {
    const request = new NextRequest("http://localhost/api/v2/relations/ppl");
    const response = await getRelationDetail(request, {
      params: Promise.resolve({ id: "ppl" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(getRelationDetailHandler).not.toHaveBeenCalled();
  });

  // @req REQ-097
  it("returns 404 NOT_FOUND for an unknown relation id", async () => {
    vi.mocked(getRelationDetailHandler).mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
      message: "Relation not found: REL_UNKNOWN",
    });

    const request = new NextRequest(
      "http://localhost/api/v2/relations/REL_UNKNOWN"
    );
    const response = await getRelationDetail(request, {
      params: Promise.resolve({ id: "REL_UNKNOWN" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.errors[0].code).toBe("NOT_FOUND");
  });

  // @req REQ-097
  it("returns 500 INTERNAL_ERROR when the handler throws", async () => {
    vi.mocked(getRelationDetailHandler).mockRejectedValue(new Error("db down"));

    const request = new NextRequest("http://localhost/api/v2/relations/REL_A");
    const response = await getRelationDetail(request, {
      params: Promise.resolve({ id: "REL_A" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  // @req REQ-097
  it("returns 204 with CORS headers on OPTIONS", () => {
    const response = optionsDetail();
    expect(response.status).toBe(204);
  });
});
