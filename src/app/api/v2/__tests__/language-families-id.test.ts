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

describe("API v2 - Single Language Family Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/language-families/[id]", () => {
    it("should return a language family by ID", async () => {
      const mockFamily = {
        id: "FLG_BANTU",
        nameFr: "Bantou",
        nameEn: "Bantu",
        content: {},
      };

      (getLanguageFamilyHandler as any).mockResolvedValue(mockFamily);

      const request = new NextRequest(
        "http://localhost/api/v2/language-families/FLG_BANTU"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "FLG_BANTU" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe("FLG_BANTU");
    });

    it("should return 400 for invalid ID format", async () => {
      const request = new NextRequest(
        "http://localhost/api/v2/language-families/BANTU"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "BANTU" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid");
    });

    it("should return 404 for non-existent language family", async () => {
      (getLanguageFamilyHandler as any).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/v2/language-families/FLG_NONEXISTENT"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "FLG_NONEXISTENT" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Language family not found");
    });
  });
});
