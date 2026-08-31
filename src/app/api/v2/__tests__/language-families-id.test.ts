import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../v2/language-families/[id]/route";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/languageFamilies", () => ({
  getLanguageFamilyHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { getLanguageFamilyHandler } from "@/api/v2/handlers/languageFamilies";
import { API_ATTRIBUTION } from "@/api/v2/utils/response";

describe("API v2 - Single Language Family Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/language-families/[id]", () => {
    // @req REQ-084
    it("should return a language family by ID", async () => {
      const mockFamily = {
        id: "FLG_BANTU",
        nameFr: "Bantou",
        nameEn: "Bantu",
        content: {},
      };
      const mockResponse = {
        data: mockFamily,
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
        },
        errors: [],
      };

      vi.mocked(getLanguageFamilyHandler).mockResolvedValue(mockResponse);

      const request = new NextRequest(
        "http://localhost/api/v2/language-families/FLG_BANTU"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "FLG_BANTU" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
    });

    // @req REQ-033
    it("should expose canonical associated peoples at the top level", async () => {
      const associatedPeoples = [
        { name: "Amhara", peopleId: "PPL_AMHARA" },
        { name: "Oromo", peopleId: "PPL_OROMO" },
      ];
      const mockFamily = {
        id: "FLG_AFROASIATIQUE",
        nameFr: "Afro-asiatique",
        associatedPeoples,
        content: { associatedPeoples },
      };

      vi.mocked(getLanguageFamilyHandler).mockResolvedValue({
        data: mockFamily,
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
        },
        errors: [],
      });

      const request = new NextRequest(
        "http://localhost/api/v2/language-families/FLG_AFROASIATIQUE"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "FLG_AFROASIATIQUE" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.associatedPeoples).toEqual([
        { name: "Amhara", peopleId: "PPL_AMHARA" },
        { name: "Oromo", peopleId: "PPL_OROMO" },
      ]);
    });

    // @req REQ-084
    it("should return 400 for invalid ID format", async () => {
      const request = new NextRequest(
        "http://localhost/api/v2/language-families/BANTU"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "BANTU" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toEqual([
        {
          code: "VALIDATION_ERROR",
          message: "Invalid language family ID format",
          field: "id",
        },
      ]);
      expect(data.data).toBeNull();
    });

    // @req REQ-084
    it("should return 404 for non-existent language family", async () => {
      vi.mocked(getLanguageFamilyHandler).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/v2/language-families/FLG_NONEXISTENT"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "FLG_NONEXISTENT" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        data: null,
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
        },
        errors: [{ code: "NOT_FOUND", message: "Language family not found" }],
      });
    });

    // @req REQ-084
    it("returns a 500 INTERNAL_ERROR envelope when the handler throws", async () => {
      vi.mocked(getLanguageFamilyHandler).mockRejectedValue(
        new Error("database unavailable")
      );

      const request = new NextRequest(
        "http://localhost/api/v2/language-families/FLG_BANTU"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "FLG_BANTU" }),
      });
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
