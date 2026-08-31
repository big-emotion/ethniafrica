import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../v2/countries/[iso]/route";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/countries", () => ({
  getCountryHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { getCountryHandler } from "@/api/v2/handlers/countries";
import { API_ATTRIBUTION } from "@/api/v2/utils/response";

const ENVELOPE_META = {
  license: "CC-BY-SA-4.0",
  attribution: API_ATTRIBUTION,
};

describe("API v2 - Single Country Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/countries/[iso]", () => {
    // @req REQ-084
    it("returns a country in the canonical envelope", async () => {
      const mockCountry = {
        id: "ZWE",
        nameFr: "Zimbabwe",
        content: {},
      };
      const mockResponse = {
        data: mockCountry,
        meta: ENVELOPE_META,
        errors: [],
      };

      vi.mocked(getCountryHandler).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost/api/v2/countries/ZWE");
      const response = await GET(request, {
        params: Promise.resolve({ iso: "ZWE" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
    });

    // @req REQ-084
    it("returns a 400 VALIDATION_ERROR envelope for invalid ISO format", async () => {
      const request = new NextRequest("http://localhost/api/v2/countries/zw");
      const response = await GET(request, {
        params: Promise.resolve({ iso: "zw" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        data: null,
        meta: ENVELOPE_META,
        errors: [
          {
            code: "VALIDATION_ERROR",
            message: "Invalid country ISO code format",
            field: "iso",
          },
        ],
      });
    });

    // @req REQ-084
    it("returns a 404 NOT_FOUND envelope for a non-existent country", async () => {
      vi.mocked(getCountryHandler).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/v2/countries/XXX");
      const response = await GET(request, {
        params: Promise.resolve({ iso: "XXX" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        data: null,
        meta: ENVELOPE_META,
        errors: [{ code: "NOT_FOUND", message: "Country not found" }],
      });
    });

    // @req REQ-084
    it("returns a 500 INTERNAL_ERROR envelope when the handler throws", async () => {
      vi.mocked(getCountryHandler).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost/api/v2/countries/ZWE");
      const response = await GET(request, {
        params: Promise.resolve({ iso: "ZWE" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        data: null,
        meta: ENVELOPE_META,
        errors: [{ code: "INTERNAL_ERROR", message: "Internal server error" }],
      });
    });
  });
});
