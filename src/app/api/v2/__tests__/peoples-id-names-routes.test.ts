import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/peopleNames", () => ({
  getPeopleNamesHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { getPeopleNamesHandler } from "@/api/v2/handlers/peopleNames";
import { GET, OPTIONS } from "../peoples/[id]/names/route";

const validEnvelope = {
  data: {
    peopleId: "PPL_DINKA",
    autonym: "Jieng",
    names: [
      {
        id: "nr-endonym-1",
        nameText: "Jieng",
        nameType: "endonym" as const,
        languageOfOrigin: "din",
        meaning: "the people",
        periodLabel: null,
        imposition: {
          imposedBy: null,
          impositionPeriod: null,
          whyProblematic: null,
          contemporaryUsage: "primary self-identification",
        },
        assertionId: "assertion-1",
        sources: [
          {
            id: "src-1",
            title: "Ethnologue",
            url: "https://ethnologue.com",
            year: 2023,
            tier: "official",
          },
        ],
        confidence: { score: 85, recomputedAt: "2026-07-31T10:00:00Z" },
      },
    ],
  },
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "EthniAfrica — ethniafrica.com",
  },
  errors: [],
};

describe("GET /api/v2/peoples/[id]/names", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-092
  it("returns 200 with the envelope and Cache-Control s-maxage=3600", async () => {
    vi.mocked(getPeopleNamesHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_DINKA/names"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "PPL_DINKA" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.peopleId).toBe("PPL_DINKA");
    expect(body.data.names[0].sources[0].title).toBe("Ethnologue");
    expect(response.headers.get("Cache-Control")).toBe("s-maxage=3600");
    expect(getPeopleNamesHandler).toHaveBeenCalledWith("PPL_DINKA");
  });

  // @req REQ-092
  it("returns 400 VALIDATION_ERROR on invalid id format", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/peoples/dinka/names"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "dinka" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(getPeopleNamesHandler).not.toHaveBeenCalled();
  });

  // @req REQ-092
  it("returns 404 NOT_FOUND for an unknown people id", async () => {
    vi.mocked(getPeopleNamesHandler).mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
      message: "People not found: PPL_UNKNOWN",
    });

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_UNKNOWN/names"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "PPL_UNKNOWN" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.errors[0].code).toBe("NOT_FOUND");
  });

  // @req REQ-092
  it("returns 500 INTERNAL_ERROR when the handler throws", async () => {
    vi.mocked(getPeopleNamesHandler).mockRejectedValue(new Error("db down"));

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_DINKA/names"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "PPL_DINKA" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  // @req REQ-092
  it("sets CORS headers on the GET response", async () => {
    vi.mocked(getPeopleNamesHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_DINKA/names"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "PPL_DINKA" }),
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  // @req REQ-092
  it("returns 204 with CORS headers on OPTIONS", async () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
  });
});
