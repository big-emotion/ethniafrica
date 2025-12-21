import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../v2/countries/route";
import { GET as GET_SINGLE } from "../../v2/countries/[iso]/route";
import { GET as GET_SEARCH } from "../../v2/search/route";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/countries", () => ({
  listCountriesHandler: vi.fn(),
  getCountryHandler: vi.fn(),
}));

vi.mock("@/api/v2/handlers/search", () => ({
  searchHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import {
  listCountriesHandler,
  getCountryHandler,
} from "@/api/v2/handlers/countries";
import { searchHandler } from "@/api/v2/handlers/search";

describe("API v2 - Performance Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Response time", () => {
    it("should respond to paginated list in < 500ms", async () => {
      const mockResponse = {
        data: Array.from({ length: 20 }, (_, i) => ({
          id: `COU${i}`,
          nameFr: `Country ${i}`,
          content: {},
        })),
        meta: { total: 54, page: 1, perPage: 20, totalPages: 3 },
      };

      (listCountriesHandler as any).mockResolvedValue(mockResponse);

      const start = Date.now();
      const request = new NextRequest(
        "http://localhost/api/v2/countries?page=1&perPage=20"
      );
      const response = await GET(request);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    it("should respond to single item in < 200ms", async () => {
      const mockCountry = {
        id: "ZWE",
        nameFr: "Zimbabwe",
        content: {},
      };

      (getCountryHandler as any).mockResolvedValue(mockCountry);

      const start = Date.now();
      const request = new NextRequest("http://localhost/api/v2/countries/ZWE");
      const response = await GET_SINGLE(request, {
        params: Promise.resolve({ iso: "ZWE" }),
      });
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200);
    });

    it("should respond to search in < 1s for large datasets", async () => {
      const mockResults = Array.from({ length: 100 }, (_, i) => ({
        type: "country" as const,
        id: `COU${i}`,
        data: { id: `COU${i}`, nameFr: `Country ${i}`, content: {} },
      }));

      (searchHandler as any).mockResolvedValue(mockResults);

      const start = Date.now();
      const request = new NextRequest(
        "http://localhost/api/v2/search?query=test"
      );
      const response = await GET_SEARCH(request);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });
  });
});
