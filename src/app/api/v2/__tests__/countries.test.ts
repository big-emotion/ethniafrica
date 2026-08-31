import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../v2/countries/route";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/countries", () => ({
  listCountriesHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { listCountriesHandler } from "@/api/v2/handlers/countries";
import { API_ATTRIBUTION } from "@/api/v2/utils/response";

const ENVELOPE_META = {
  license: "CC-BY-SA-4.0",
  attribution: API_ATTRIBUTION,
};

describe("API v2 - Countries Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/countries", () => {
    // @req REQ-084
    it("returns paginated countries in the canonical envelope", async () => {
      const mockResponse = {
        data: [{ id: "ZWE", nameFr: "Zimbabwe", content: {} }],
        meta: {
          ...ENVELOPE_META,
          pagination: { total: 1, page: 1, perPage: 20, totalPages: 1 },
        },
        errors: [],
      };

      vi.mocked(listCountriesHandler).mockResolvedValue(mockResponse);

      const request = new NextRequest(
        "http://localhost/api/v2/countries?page=1&perPage=20"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
    });

    // @req REQ-084
    it("should handle default pagination", async () => {
      const mockResponse = {
        data: [],
        meta: {
          ...ENVELOPE_META,
          pagination: { total: 0, page: 1, perPage: 20, totalPages: 0 },
        },
        errors: [],
      };

      vi.mocked(listCountriesHandler).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost/api/v2/countries");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(listCountriesHandler).toHaveBeenCalledWith(1, 20);
    });

    // @req REQ-084
    it("returns a 500 INTERNAL_ERROR envelope when the handler throws", async () => {
      vi.mocked(listCountriesHandler).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost/api/v2/countries");
      const response = await GET(request);
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
