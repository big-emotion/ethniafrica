import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/languageFamilyTree", () => ({
  getFamilyTreeBranchHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { getFamilyTreeBranchHandler } from "@/api/v2/handlers/languageFamilyTree";
import { GET, OPTIONS } from "../language-families/[id]/tree/branch/route";

const validEnvelope = {
  data: [
    { id: "PPL_BAKONGO", nameMain: "Bakongo", classificationStatus: null },
    { id: "PPL_BOTH", nameMain: "Both", classificationStatus: null },
  ],
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "Africa History — africahistory.org",
    pagination: { total: 2, page: 1, perPage: 20 },
  },
  errors: [],
};

function makeRequest(path: string) {
  return new NextRequest(
    `http://localhost/api/v2/language-families/FLG_BANTU/tree/branch${path}`
  );
}

describe("GET /api/v2/language-families/[id]/tree/branch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-034
  it("returns 200 with paginated people nodes, meta.pagination.total and Cache-Control s-maxage=3600 for ?language=", async () => {
    vi.mocked(getFamilyTreeBranchHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const request = makeRequest("?language=kon&limit=20&offset=0");
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_BANTU" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.pagination.total).toBe(2);
    expect(response.headers.get("Cache-Control")).toBe("s-maxage=3600");
    expect(getFamilyTreeBranchHandler).toHaveBeenCalledWith(
      "FLG_BANTU",
      { language: "kon" },
      { limit: 20, offset: 0 }
    );
  });

  // @req REQ-034
  it("returns 200 with the unlinked-peoples group and identical pagination semantics for ?group=unlinked", async () => {
    vi.mocked(getFamilyTreeBranchHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const request = makeRequest("?group=unlinked&limit=10&offset=5");
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_BANTU" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.pagination.total).toBe(2);
    expect(getFamilyTreeBranchHandler).toHaveBeenCalledWith(
      "FLG_BANTU",
      { group: "unlinked" },
      { limit: 10, offset: 5 }
    );
  });

  // @req REQ-034
  it("applies default limit=20 and offset=0 when omitted", async () => {
    vi.mocked(getFamilyTreeBranchHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const request = makeRequest("?language=kon");
    await GET(request, { params: Promise.resolve({ id: "FLG_BANTU" }) });

    expect(getFamilyTreeBranchHandler).toHaveBeenCalledWith(
      "FLG_BANTU",
      { language: "kon" },
      { limit: 20, offset: 0 }
    );
  });

  // @req REQ-034
  it("returns 422 SEMANTIC_ERROR for a valid ISO 639-3 language that is not a language of this family", async () => {
    vi.mocked(getFamilyTreeBranchHandler).mockResolvedValue({
      ok: false,
      code: "SEMANTIC_ERROR",
      message: 'Language "swa" is not a language of family FLG_BANTU',
    });

    const request = makeRequest("?language=swa");
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_BANTU" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.errors[0].code).toBe("SEMANTIC_ERROR");
  });

  // @req REQ-034
  it("returns 400 VALIDATION_ERROR for a malformed family id", async () => {
    const request = makeRequest("?language=kon");
    const response = await GET(request, {
      params: Promise.resolve({ id: "bantu" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(getFamilyTreeBranchHandler).not.toHaveBeenCalled();
  });

  // @req REQ-034
  it("returns 400 VALIDATION_ERROR for a non-ISO language code", async () => {
    const request = makeRequest("?language=Kongo");
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_BANTU" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(getFamilyTreeBranchHandler).not.toHaveBeenCalled();
  });

  // @req REQ-034
  it("returns 400 VALIDATION_ERROR for a negative limit", async () => {
    const request = makeRequest("?language=kon&limit=-5");
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_BANTU" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(getFamilyTreeBranchHandler).not.toHaveBeenCalled();
  });

  // @req REQ-034
  it("returns 400 VALIDATION_ERROR when neither language nor group is given", async () => {
    const request = makeRequest("");
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_BANTU" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(getFamilyTreeBranchHandler).not.toHaveBeenCalled();
  });

  // @req REQ-034
  it("returns 400 VALIDATION_ERROR when both language and group are given", async () => {
    const request = makeRequest("?language=kon&group=unlinked");
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_BANTU" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(getFamilyTreeBranchHandler).not.toHaveBeenCalled();
  });

  // @req REQ-034
  it("returns 500 INTERNAL_ERROR when the handler throws", async () => {
    vi.mocked(getFamilyTreeBranchHandler).mockRejectedValue(
      new Error("db down")
    );

    const request = makeRequest("?language=kon");
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_BANTU" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  // @req REQ-034
  it("sets CORS headers on the GET response", async () => {
    vi.mocked(getFamilyTreeBranchHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const request = makeRequest("?language=kon");
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_BANTU" }),
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  // @req REQ-034
  it("returns 204 on OPTIONS", async () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
  });
});
