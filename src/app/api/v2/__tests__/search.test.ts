import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../v2/search/route";
import { NextRequest } from "next/server";

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

import { searchHandler } from "@/api/v2/handlers/search";

describe("API v2 - Search Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/search", () => {
    it("should return search results", async () => {
      const mockResults = [
        {
          type: "languageFamily" as const,
          id: "FLG_BANTU",
          data: { id: "FLG_BANTU", nameFr: "Bantou", content: {} },
        },
      ];

      (searchHandler as any).mockResolvedValue(mockResults);

      const request = new NextRequest(
        "http://localhost/api/v2/search?query=Bantu"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should filter by type", async () => {
      const mockResults = [
        {
          type: "country" as const,
          id: "ZWE",
          data: { id: "ZWE", nameFr: "Zimbabwe", content: {} },
        },
      ];

      (searchHandler as any).mockResolvedValue(mockResults);

      const request = new NextRequest(
        "http://localhost/api/v2/search?query=Zimbabwe&type=country"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((r: any) => r.type === "country")).toBe(true);
    });

    it("should return 500 on error", async () => {
      (searchHandler as any).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        "http://localhost/api/v2/search?query=test"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
