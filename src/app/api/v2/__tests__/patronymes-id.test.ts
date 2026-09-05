import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/patronymes", () => ({
  getPatronymeHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => {
    const response = new Response(null, { status: 204 });
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { getPatronymeHandler } from "@/api/v2/handlers/patronymes";
import { API_ATTRIBUTION, API_LICENSE } from "@/api/v2/utils/response";
import { GET, OPTIONS } from "../patronymes/[id]/route";

const validEnvelope = {
  data: {
    id: "PAT_KEITA",
    nameMain: "Keita",
    nameSystem: "clan_name" as const,
    casteOrSocialFunction: "horon",
    content: { nameMain: "Keita", transmissionMode: "patrilineal" },
    associatedPeoples: [],
    associatedCountries: [],
    bearers: [],
    alliances: [],
  },
  meta: {
    license: API_LICENSE,
    attribution: API_ATTRIBUTION,
  },
  errors: [],
};

describe("GET /api/v2/patronymes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-133
  it("returns 200 with the licensed envelope and one-hour cache header", async () => {
    vi.mocked(getPatronymeHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/v2/patronymes/PAT_KEITA"),
      { params: Promise.resolve({ id: "PAT_KEITA" }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(validEnvelope);
    expect(response.headers.get("Cache-Control")).toBe("s-maxage=3600");
    expect(getPatronymeHandler).toHaveBeenCalledOnce();
    expect(getPatronymeHandler).toHaveBeenCalledWith("PAT_KEITA");
  });

  // @req REQ-133
  it.each(["", "keita", "PAT-KEITA", "PAT_ké"])(
    "returns 400 VALIDATION_ERROR for malformed id %s",
    async (id) => {
      const response = await GET(
        new NextRequest(`http://localhost/api/v2/patronymes/${id}`),
        { params: Promise.resolve({ id }) }
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        data: null,
        errors: [
          {
            code: "VALIDATION_ERROR",
            field: "id",
          },
        ],
      });
      expect(getPatronymeHandler).not.toHaveBeenCalled();
    }
  );

  // @req REQ-133
  it("returns 404 NOT_FOUND for an unknown patronyme", async () => {
    vi.mocked(getPatronymeHandler).mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
      message: "Patronyme not found: PAT_UNKNOWN",
    });

    const response = await GET(
      new NextRequest("http://localhost/api/v2/patronymes/PAT_UNKNOWN"),
      { params: Promise.resolve({ id: "PAT_UNKNOWN" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      data: null,
      errors: [
        {
          code: "NOT_FOUND",
          message: "Patronyme not found: PAT_UNKNOWN",
        },
      ],
    });
  });

  // @req REQ-133
  it("returns 500 INTERNAL_ERROR when the handler throws", async () => {
    vi.mocked(getPatronymeHandler).mockRejectedValue(
      new Error("database unavailable")
    );

    const response = await GET(
      new NextRequest("http://localhost/api/v2/patronymes/PAT_KEITA"),
      { params: Promise.resolve({ id: "PAT_KEITA" }) }
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      data: null,
      errors: [
        {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        },
      ],
    });
  });

  // @req REQ-133
  it("sets CORS headers on GET", async () => {
    vi.mocked(getPatronymeHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/v2/patronymes/PAT_KEITA"),
      { params: Promise.resolve({ id: "PAT_KEITA" }) }
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  // @req REQ-133
  it("returns 204 with CORS headers on OPTIONS", () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
