import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/languages", () => ({
  getLanguageHandler: vi.fn(),
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

import { getLanguageHandler } from "@/api/v2/handlers/languages";
import { API_ATTRIBUTION, API_LICENSE } from "@/api/v2/utils/response";
import { GET, OPTIONS } from "../languages/[id]/route";

const validEnvelope = {
  data: {
    id: "yor",
    name: "Yoruba",
    nameProvenance: "sourced" as const,
    family: { id: "FLG_BENOUECONGO", name: "Bénoué-Congo" },
    speakingPeoples: [{ id: "PPL_YORUBA", name: "Yoruba" }],
    vehicularRole: "Langue véhiculaire régionale",
    vitalityStatus: {
      status: "Institutional",
      scale: "EGIDS",
      asOf: 2025,
    },
    sources: [
      {
        id: "SRC_GLOTTOLOG_YORUBA",
        title: "Glottolog 5.3 — Yoruba",
        url: "https://glottolog.org/resource/languoid/id/yoru1245",
        tier: "official" as const,
        notes: "Direct linguistic reference.",
      },
    ],
  },
  meta: {
    license: API_LICENSE,
    attribution: API_ATTRIBUTION,
  },
  errors: [],
};

describe("GET /api/v2/languages/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-136
  it("returns 200 with the licensed envelope and one-hour cache header", async () => {
    vi.mocked(getLanguageHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/v2/languages/yor"),
      { params: Promise.resolve({ id: "yor" }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(validEnvelope);
    expect(response.headers.get("Cache-Control")).toBe("s-maxage=3600");
    expect(getLanguageHandler).toHaveBeenCalledOnce();
    expect(getLanguageHandler).toHaveBeenCalledWith("yor");
  });

  // @req REQ-136
  it.each(["YOR", "yo", "yoru", "yo1"])(
    "returns 400 VALIDATION_ERROR for malformed id %s",
    async (id) => {
      const response = await GET(
        new NextRequest(`http://localhost/api/v2/languages/${id}`),
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
      expect(getLanguageHandler).not.toHaveBeenCalled();
    }
  );

  // @req REQ-136
  it("returns 404 NOT_FOUND for an unknown language", async () => {
    vi.mocked(getLanguageHandler).mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
      message: "Language not found: zzz",
    });

    const response = await GET(
      new NextRequest("http://localhost/api/v2/languages/zzz"),
      { params: Promise.resolve({ id: "zzz" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      data: null,
      errors: [
        {
          code: "NOT_FOUND",
          message: "Language not found: zzz",
        },
      ],
    });
  });

  // @req REQ-136
  it("returns 500 INTERNAL_ERROR when the handler throws", async () => {
    vi.mocked(getLanguageHandler).mockRejectedValue(
      new Error("database unavailable")
    );

    const response = await GET(
      new NextRequest("http://localhost/api/v2/languages/yor"),
      { params: Promise.resolve({ id: "yor" }) }
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

  // @req REQ-136
  it("sets CORS headers on GET", async () => {
    vi.mocked(getLanguageHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/v2/languages/yor"),
      { params: Promise.resolve({ id: "yor" }) }
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  // @req REQ-136
  it("returns 204 with CORS headers on OPTIONS", () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
