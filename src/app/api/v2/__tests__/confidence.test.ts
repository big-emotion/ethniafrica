import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/confidence", () => ({
  getConfidenceHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { getConfidenceHandler } from "@/api/v2/handlers/confidence";
import { GET } from "../confidence/[entityType]/[entityId]/route";

describe("GET /api/v2/confidence/[entityType]/[entityId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with the envelope and confidence score on meta", async () => {
    vi.mocked(getConfidenceHandler).mockResolvedValue({
      data: {
        entityType: "people",
        entityId: "PPL_SHONA",
        score: 73,
        sourceCount: 4,
        avgSourceQuality: 0.81,
        lastHumanAuditAt: "2026-03-12T00:00:00.000Z",
        openFlagCount: 0,
        recomputedAt: "2026-05-01T00:00:00.000Z",
      },
      meta: {
        license: "CC-BY-SA-4.0",
        attribution: "Africa History — africahistory.org",
        confidence: 73,
      },
      errors: [],
    });

    const request = new NextRequest(
      "http://localhost/api/v2/confidence/people/PPL_SHONA"
    );
    const response = await GET(request, {
      params: Promise.resolve({ entityType: "people", entityId: "PPL_SHONA" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      score: 73,
      sourceCount: 4,
      avgSourceQuality: 0.81,
      openFlagCount: 0,
    });
    expect(body.meta.confidence).toBe(73);
    expect(getConfidenceHandler).toHaveBeenCalledWith("people", "PPL_SHONA");
  });

  it("returns 400 on invalid entityType", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/confidence/country/COM"
    );
    const response = await GET(request, {
      params: Promise.resolve({ entityType: "country", entityId: "COM" }),
    });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(getConfidenceHandler).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid entityId format", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/confidence/people/lowercase"
    );
    const response = await GET(request, {
      params: Promise.resolve({ entityType: "people", entityId: "lowercase" }),
    });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when entityType is 'people' but entityId starts with FLG_", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/confidence/people/FLG_BANTU"
    );
    const response = await GET(request, {
      params: Promise.resolve({
        entityType: "people",
        entityId: "FLG_BANTU",
      }),
    });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(body.errors[0].field).toBe("entityId");
    expect(getConfidenceHandler).not.toHaveBeenCalled();
  });

  it("returns 400 when entityType is 'language-family' but entityId starts with PPL_", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/confidence/language-family/PPL_SHONA"
    );
    const response = await GET(request, {
      params: Promise.resolve({
        entityType: "language-family",
        entityId: "PPL_SHONA",
      }),
    });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(body.errors[0].field).toBe("entityId");
    expect(getConfidenceHandler).not.toHaveBeenCalled();
  });

  it("returns 404 when no confidence row exists", async () => {
    vi.mocked(getConfidenceHandler).mockResolvedValue(null);
    const request = new NextRequest(
      "http://localhost/api/v2/confidence/people/PPL_UNKNOWN"
    );
    const response = await GET(request, {
      params: Promise.resolve({
        entityType: "people",
        entityId: "PPL_UNKNOWN",
      }),
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.errors[0].code).toBe("NOT_FOUND");
  });
});
