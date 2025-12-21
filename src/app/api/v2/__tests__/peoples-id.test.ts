import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../v2/peoples/[id]/route";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/peoples", () => ({
  getPeopleHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { getPeopleHandler } from "@/api/v2/handlers/peoples";

describe("API v2 - Single People Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/peoples/[id]", () => {
    it("should return a people by ID", async () => {
      const mockPeople = {
        id: "PPL_SHONA",
        nameMain: "Shona",
        languageFamilyId: "FLG_BANTU",
        currentCountries: ["ZWE"],
        content: {},
      };

      (getPeopleHandler as any).mockResolvedValue(mockPeople);

      const request = new NextRequest(
        "http://localhost/api/v2/peoples/PPL_SHONA"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "PPL_SHONA" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe("PPL_SHONA");
    });

    it("should return 400 for invalid ID format", async () => {
      const request = new NextRequest("http://localhost/api/v2/peoples/SHONA");
      const response = await GET(request, {
        params: Promise.resolve({ id: "SHONA" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid");
    });

    it("should return 404 for non-existent people", async () => {
      (getPeopleHandler as any).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/v2/peoples/PPL_NONEXISTENT"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "PPL_NONEXISTENT" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("People not found");
    });
  });
});
