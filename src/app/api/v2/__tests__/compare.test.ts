/**
 * Route-level tests for GET /api/v2/compare (ETNI-480).
 * Covers: happy path, each error (400/404/429), envelope shape, cache header.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, OPTIONS } from "../compare/route";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/compare", () => ({
  assembleComparison: vi.fn(),
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

import { assembleComparison } from "@/api/v2/handlers/compare";
import { applyRateLimit } from "@/lib/api/rate-limit";

const mockEntities = [
  {
    type: "peuple",
    id: "PPL_SHONA",
    label: "Shona",
    appellations: { autonym: "VaShona" },
    origins: null,
    organization: null,
    languages: null,
    culture: null,
    historicalRole: null,
    demography: null,
  },
  {
    type: "peuple",
    id: "PPL_ZULU",
    label: "Zulu",
    appellations: null,
    origins: null,
    organization: null,
    languages: null,
    culture: null,
    historicalRole: null,
    demography: null,
  },
];

describe("GET /api/v2/compare (route)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (applyRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  // ── happy path ──────────────────────────────────────────────────────────
  // @req REQ-084
  it("happy path — 200 with the createApiResponse envelope shape", async () => {
    (assembleComparison as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      entityType: "peoples",
      entities: mockEntities,
    });

    const req = new NextRequest(
      "http://localhost/api/v2/compare?type=peoples&ids=PPL_SHONA,PPL_ZULU"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.entityType).toBe("peoples");
    expect(body.data.entities).toEqual(mockEntities);
    expect(body.meta.license).toBe("CC-BY-SA-4.0");
    expect(body.meta.attribution).toBeDefined();
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors).toHaveLength(0);
  });

  // @req REQ-084
  it("happy path — passes parsed type + ids to assembleComparison", async () => {
    (assembleComparison as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      entityType: "countries",
      entities: [],
    });

    const req = new NextRequest(
      "http://localhost/api/v2/compare?type=countries&ids=ZWE,MOZ,ZAF"
    );
    await GET(req);

    expect(assembleComparison).toHaveBeenCalledWith({
      entityType: "countries",
      ids: ["ZWE", "MOZ", "ZAF"],
    });
  });

  // @req REQ-084
  it("sets Cache-Control: s-maxage=3600 on success", async () => {
    (assembleComparison as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      entityType: "peoples",
      entities: mockEntities,
    });

    const req = new NextRequest(
      "http://localhost/api/v2/compare?type=peoples&ids=PPL_SHONA,PPL_ZULU"
    );
    const res = await GET(req);

    expect(res.headers.get("Cache-Control")).toBe("s-maxage=3600");
  });

  // @req REQ-084
  it("applies CORS headers on success", async () => {
    (assembleComparison as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      entityType: "peoples",
      entities: mockEntities,
    });

    const req = new NextRequest(
      "http://localhost/api/v2/compare?type=peoples&ids=PPL_SHONA,PPL_ZULU"
    );
    const res = await GET(req);

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  // ── validation errors (400) ────────────────────────────────────────────
  // @req REQ-084
  it("invalid type — 400 VALIDATION_ERROR naming field 'type'", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/compare?type=bogus&ids=PPL_SHONA,PPL_ZULU"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(body.errors[0].field).toBe("type");
    expect(assembleComparison).not.toHaveBeenCalled();
  });

  // @req REQ-084
  it("single id — 400 VALIDATION_ERROR naming field 'ids'", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/compare?type=peoples&ids=PPL_SHONA"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(body.errors[0].field).toBe("ids");
  });

  // @req REQ-084
  it("more than 3 ids — 400 VALIDATION_ERROR naming field 'ids'", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/compare?type=peoples&ids=PPL_A,PPL_B,PPL_C,PPL_D"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.errors[0].field).toBe("ids");
  });

  // @req REQ-084
  it("duplicate ids — 400 VALIDATION_ERROR naming field 'ids'", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/compare?type=peoples&ids=PPL_SHONA,PPL_SHONA"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.errors[0].field).toBe("ids");
  });

  // @req REQ-084
  it("missing type — 400 VALIDATION_ERROR", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/compare?ids=PPL_SHONA,PPL_ZULU"
    );
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  // ── not found (404) ─────────────────────────────────────────────────────
  // @req REQ-084
  it("unknown id — 404 NOT_FOUND naming the missing id", async () => {
    (assembleComparison as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
      message: "Entity not found: PPL_UNKNOWN",
    });

    const req = new NextRequest(
      "http://localhost/api/v2/compare?type=peoples&ids=PPL_SHONA,PPL_UNKNOWN"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.errors[0].code).toBe("NOT_FOUND");
    expect(body.errors[0].message).toContain("PPL_UNKNOWN");
  });

  // ── rate limiting ───────────────────────────────────────────────────────
  // @req REQ-084
  it("rate-limit 429 — returns 429 with Retry-After and X-RateLimit-* headers", async () => {
    const rateLimitedResponse = new Response(
      JSON.stringify({ error: "rate_limited", retry_after_seconds: 30 }),
      {
        status: 429,
        headers: {
          "Retry-After": "30",
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Date.now() + 30000),
        },
      }
    );
    (applyRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(
      rateLimitedResponse
    );

    const req = new NextRequest(
      "http://localhost/api/v2/compare?type=peoples&ids=PPL_SHONA,PPL_ZULU"
    );
    const res = await GET(req);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(res.headers.get("X-RateLimit-Limit")).toBeDefined();
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(assembleComparison).not.toHaveBeenCalled();
  });

  // ── error handling ──────────────────────────────────────────────────────
  // @req REQ-084
  it("500 on handler error", async () => {
    (assembleComparison as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error")
    );

    const req = new NextRequest(
      "http://localhost/api/v2/compare?type=peoples&ids=PPL_SHONA,PPL_ZULU"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  // ── OPTIONS ─────────────────────────────────────────────────────────────
  // @req REQ-084
  it("OPTIONS — 204", async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(204);
  });
});
