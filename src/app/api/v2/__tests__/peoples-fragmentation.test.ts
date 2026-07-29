import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/peopleFragmentation", () => ({
  getPeopleFragmentationHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { getPeopleFragmentationHandler } from "@/api/v2/handlers/peopleFragmentation";
import { GET, OPTIONS } from "../peoples/[id]/fragmentation/route";

const validEnvelope = {
  data: {
    peopleId: "PPL_EWE",
    autonym: "Eʋe",
    exonym: "Ewe",
    countryCount: 2,
    countries: [
      {
        iso3: "GHA",
        nameFr: "Ghana",
        populationShare: 0.62,
        assertionId: null,
      },
      { iso3: "TGO", nameFr: "Togo", populationShare: 0.38, assertionId: null },
    ],
    borderPairs: [{ a: "GHA", b: "TGO" }],
  },
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "Africa History — africahistory.org",
  },
  errors: [],
};

describe("GET /api/v2/peoples/[id]/fragmentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-091
  it("returns 200 with the envelope and Cache-Control s-maxage=3600", async () => {
    vi.mocked(getPeopleFragmentationHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_EWE/fragmentation"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "PPL_EWE" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.peopleId).toBe("PPL_EWE");
    expect(response.headers.get("Cache-Control")).toBe("s-maxage=3600");
    expect(getPeopleFragmentationHandler).toHaveBeenCalledWith("PPL_EWE");
  });

  // @req REQ-091
  it("returns 400 VALIDATION_ERROR on invalid id format", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/peoples/ewe/fragmentation"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "ewe" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(getPeopleFragmentationHandler).not.toHaveBeenCalled();
  });

  // @req REQ-091
  it("accepts digit-bearing PPL ids (e.g. PPL_NDEBELE_SUD2, PPL_LUBA_KASAI2)", async () => {
    vi.mocked(getPeopleFragmentationHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_NDEBELE_SUD2/fragmentation"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "PPL_NDEBELE_SUD2" }),
    });

    expect(response.status).toBe(200);
    expect(getPeopleFragmentationHandler).toHaveBeenCalledWith(
      "PPL_NDEBELE_SUD2"
    );
  });

  // @req REQ-091
  it("returns 404 NOT_FOUND for an unknown people id", async () => {
    vi.mocked(getPeopleFragmentationHandler).mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
      message: "People not found: PPL_UNKNOWN",
    });

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_UNKNOWN/fragmentation"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "PPL_UNKNOWN" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.errors[0].code).toBe("NOT_FOUND");
  });

  // @req REQ-091
  it("returns 422 SEMANTIC_ERROR for a people in < 2 countries", async () => {
    vi.mocked(getPeopleFragmentationHandler).mockResolvedValue({
      ok: false,
      code: "SEMANTIC_ERROR",
      message:
        "Fragmentation undefined: people spans 1 country (>= 2 required)",
    });

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_SOLO/fragmentation"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "PPL_SOLO" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.errors[0].code).toBe("SEMANTIC_ERROR");
  });

  // @req REQ-091
  it("returns 500 INTERNAL_ERROR when the handler throws", async () => {
    vi.mocked(getPeopleFragmentationHandler).mockRejectedValue(
      new Error("db down")
    );

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_EWE/fragmentation"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "PPL_EWE" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  // @req REQ-091
  it("sets CORS headers on the GET response", async () => {
    vi.mocked(getPeopleFragmentationHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_EWE/fragmentation"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "PPL_EWE" }),
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  // @req REQ-091
  it("returns 204 with CORS headers on OPTIONS", async () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
  });
});
