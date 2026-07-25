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

describe("API v2 - Peoples Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/peoples", () => {
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
        meta: { total: 1, page: 1, perPage: 20, totalPages: 1 },
      };

      vi.mocked(listPeoplesHandler).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost/api/v2/peoples");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    // @req REQ-033
    it("should normalize and forward pagination and filters exactly once", async () => {
      vi.mocked(listPeoplesHandler).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 2, perPage: 25, totalPages: 0 },
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
    it("should not forward an invalid language family ID", async () => {
      vi.mocked(listPeoplesHandler).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, perPage: 20, totalPages: 0 },
      });

      const request = new NextRequest(
        "http://localhost/api/v2/peoples?languageFamilyId=invalid"
      );

      await GET(request);

      expect(listPeoplesHandler).toHaveBeenCalledWith(1, 20, {});
    });

    it("should return 500 on error", async () => {
      vi.mocked(listPeoplesHandler).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost/api/v2/peoples");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
