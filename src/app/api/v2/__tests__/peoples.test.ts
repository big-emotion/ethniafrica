// @req REQ-005
// @req REQ-033
// @req REQ-049
// @req REQ-077
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../v2/peoples/route";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/peoples", () => ({
  listPeoplesHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { listPeoplesHandler } from "@/api/v2/handlers/peoples";
import { API_ATTRIBUTION } from "@/api/v2/utils/response";

describe("API v2 - Peoples Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/peoples", () => {
    // @req REQ-084
    it("should return paginated peoples", async () => {
      const mockResponse = {
        data: [
          {
            id: "PPL_SHONA",
            nameMain: "Shona",
            languageFamilyId: "FLG_BANTU",
            currentCountries: [],
            content: {},
          },
        ],
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
          pagination: { total: 1, page: 1, perPage: 20, totalPages: 1 },
        },
        errors: [],
      };

      vi.mocked(listPeoplesHandler).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost/api/v2/peoples");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
    });

    // @req REQ-033
    it("should normalize and forward pagination and filters exactly once", async () => {
      vi.mocked(listPeoplesHandler).mockResolvedValue({
        data: [],
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
          pagination: { total: 0, page: 2, perPage: 25, totalPages: 0 },
        },
        errors: [],
      });

      const request = new NextRequest(
        "http://localhost/api/v2/peoples?page=2&perPage=25&search=%20shona%20&letter=s&languageFamilyId=FLG_BANTU"
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(listPeoplesHandler).toHaveBeenCalledTimes(1);
      expect(listPeoplesHandler).toHaveBeenCalledWith(2, 25, {
        search: "shona",
        initialLetter: "S",
        languageFamilyId: "FLG_BANTU",
      });
    });

    // @req REQ-033
    // @req REQ-084
    it("should return 400 for an invalid language family ID", async () => {
      const request = new NextRequest(
        "http://localhost/api/v2/peoples?languageFamilyId=invalid"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        data: null,
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
        },
        errors: [
          {
            code: "VALIDATION_ERROR",
            message: "Invalid language family ID format",
            field: "languageFamilyId",
          },
        ],
      });
      expect(listPeoplesHandler).not.toHaveBeenCalled();
    });

    // @req REQ-084
    it("should return 500 on error", async () => {
      vi.mocked(listPeoplesHandler).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost/api/v2/peoples");
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
