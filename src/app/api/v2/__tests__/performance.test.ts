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
  ftsSearchHandler: vi.fn(),
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

vi.mock("@/lib/api/rate-limit", () => ({
  applyRateLimit: vi.fn().mockResolvedValue(null),
}));

import {
  listCountriesHandler,
  getCountryHandler,
} from "@/api/v2/handlers/countries";
import { ftsSearchHandler } from "@/api/v2/handlers/search";

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

      (listCountriesHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse
      );

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

      (getCountryHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockCountry
      );

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
      const countries = Array.from({ length: 50 }, (_, i) => ({
        id: `COU${i}`,
        nameFr: `Country ${i}`,
        content: {},
      }));
      const peoples = Array.from({ length: 50 }, (_, i) => ({
        id: `PPL_TEST${i}`,
        nameMain: `People ${i}`,
        languageFamilyId: "FLG_TEST",
        currentCountries: [],
        content: {},
      }));

      (ftsSearchHandler as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { peoples, countries, total: 100 },
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: "Africa History — africahistory.org",
        },
        errors: [],
      });

      const start = Date.now();
      const request = new NextRequest("http://localhost/api/v2/search?q=test");
      const response = await GET_SEARCH(request);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });
  });
});
