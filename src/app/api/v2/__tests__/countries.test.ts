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

describe("API v2 - Countries Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/countries", () => {
    it("should return paginated countries", async () => {
      const mockResponse = {
        data: [{ id: "ZWE", nameFr: "Zimbabwe", content: {} }],
        meta: { total: 1, page: 1, perPage: 20, totalPages: 1 },
      };

      (listCountriesHandler as any).mockResolvedValue(mockResponse);

      const request = new NextRequest(
        "http://localhost/api/v2/countries?page=1&perPage=20"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.meta).toBeDefined();
    });

    it("should handle default pagination", async () => {
      const mockResponse = {
        data: [],
        meta: { total: 0, page: 1, perPage: 20, totalPages: 0 },
      };

      (listCountriesHandler as any).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost/api/v2/countries");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(listCountriesHandler).toHaveBeenCalledWith(1, 20);
    });

    it("should return 500 on error", async () => {
      (listCountriesHandler as any).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost/api/v2/countries");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
