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
import { API_ATTRIBUTION } from "@/api/v2/utils/response";

describe("API v2 - Single People Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/peoples/[id]", () => {
    // @req REQ-084
    it("should return a people by ID", async () => {
      const mockPeople = {
        id: "PPL_SHONA",
        nameMain: "Shona",
        languageFamilyId: "FLG_BANTU",
        currentCountries: ["ZWE"],
        content: {},
      };

      const mockEnvelope = {
        data: mockPeople,
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
        },
        errors: [],
      };
      vi.mocked(getPeopleHandler).mockResolvedValue(mockEnvelope);

      const request = new NextRequest(
        "http://localhost/api/v2/peoples/PPL_SHONA"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "PPL_SHONA" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEnvelope);
    });

    // @req REQ-084
    it("should return 400 for invalid ID format", async () => {
      const request = new NextRequest("http://localhost/api/v2/peoples/SHONA");
      const response = await GET(request, {
        params: Promise.resolve({ id: "SHONA" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        data: null,
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
        },
        errors: [
          {
            code: "VALIDATION_ERROR",
            message: "Invalid people ID format",
            field: "id",
          },
        ],
      });
    });

    // @req REQ-084
    it("should return 404 for non-existent people", async () => {
      vi.mocked(getPeopleHandler).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/v2/peoples/PPL_NONEXISTENT"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "PPL_NONEXISTENT" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        data: null,
        meta: {
          license: "CC-BY-SA-4.0",
          attribution: API_ATTRIBUTION,
        },
        errors: [{ code: "NOT_FOUND", message: "People not found" }],
      });
    });

    // @req REQ-084
    it("should return 500 when the handler fails", async () => {
      vi.mocked(getPeopleHandler).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest(
        "http://localhost/api/v2/peoples/PPL_SHONA"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "PPL_SHONA" }),
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
