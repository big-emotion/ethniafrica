import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../v2/language-families/route";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/languageFamilies", () => ({
  listLanguageFamiliesHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { listLanguageFamiliesHandler } from "@/api/v2/handlers/languageFamilies";
import { API_ATTRIBUTION } from "@/api/v2/utils/response";

describe("API v2 - Language Families Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/language-families", () => {
    // @req REQ-084
    it("should return paginated language families", async () => {
      const mockResponse = {
        data: [{ id: "FLG_BANTU", nameFr: "Bantou", content: {} }],
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
          pagination: { total: 1, page: 1, perPage: 20, totalPages: 1 },
        },
        errors: [],
      };

      vi.mocked(listLanguageFamiliesHandler).mockResolvedValue(mockResponse);

      const request = new NextRequest(
        "http://localhost/api/v2/language-families"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
    });

    // @req REQ-084
    it("returns a 500 INTERNAL_ERROR envelope when the handler throws", async () => {
      vi.mocked(listLanguageFamiliesHandler).mockRejectedValue(
        new Error("database unavailable")
      );

      const request = new NextRequest(
        "http://localhost/api/v2/language-families"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        data: null,
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
        },
        errors: [{ code: "INTERNAL_ERROR", message: "Internal server error" }],
      });
    });
  });
});
