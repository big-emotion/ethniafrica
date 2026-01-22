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

describe("API v2 - Single Country Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/countries/[iso]", () => {
    it("should return a country by ISO code", async () => {
      const mockCountry = {
        id: "ZWE",
        nameFr: "Zimbabwe",
        content: {},
      };

      (getCountryHandler as any).mockResolvedValue(mockCountry);

      const request = new NextRequest("http://localhost/api/v2/countries/ZWE");
      const response = await GET(request, {
        params: Promise.resolve({ iso: "ZWE" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe("ZWE");
    });

    it("should return 400 for invalid ISO format", async () => {
      const request = new NextRequest("http://localhost/api/v2/countries/zw");
      const response = await GET(request, {
        params: Promise.resolve({ iso: "zw" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid");
    });

    it("should return 404 for non-existent country", async () => {
      (getCountryHandler as any).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/v2/countries/XXX");
      const response = await GET(request, {
        params: Promise.resolve({ iso: "XXX" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Country not found");
    });

    it("should return 500 on error", async () => {
      (getCountryHandler as any).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost/api/v2/countries/ZWE");
      const response = await GET(request, {
        params: Promise.resolve({ iso: "ZWE" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
