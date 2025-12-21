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

describe("API v2 - Language Families Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/language-families", () => {
    it("should return paginated language families", async () => {
      const mockResponse = {
        data: [{ id: "FLG_BANTU", nameFr: "Bantou", content: {} }],
        meta: { total: 1, page: 1, perPage: 20, totalPages: 1 },
      };

      (listLanguageFamiliesHandler as any).mockResolvedValue(mockResponse);

      const request = new NextRequest(
        "http://localhost/api/v2/language-families"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });
});
