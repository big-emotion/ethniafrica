/**
 * Route-level tests for GET /api/v2/names (ETNI-471).
 * Covers: happy path, filter param passthrough, validation errors,
 * rate-limit 429 response, and 500 error.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, OPTIONS } from "../names/route";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/names", () => ({
  listNamesHandler: vi.fn(),
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

import { listNamesHandler } from "@/api/v2/handlers/names";
import { applyRateLimit } from "@/lib/api/rate-limit";

const mockEnvelope = {
  data: {
    names: [
      {
        id: "11111111-1111-1111-1111-111111111111",
        peopleId: "PPL_JIENG",
        nameText: "Jieng",
        nameType: "endonym",
        languageOfOrigin: "din",
        meaning: "the people",
        periodLabel: null,
        imposedBy: null,
        impositionPeriod: null,
        whyProblematic: null,
        contemporaryUsage: null,
        sortRank: 0,
        people: {
          id: "PPL_JIENG",
          nameMain: "Jieng",
          autonym: "Jieng",
          slug: "PPL_JIENG",
        },
      },
    ],
    total: 1,
  },
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "EthniAfrica — ethniafrica.com",
  },
  errors: [],
};

describe("GET /api/v2/names (route)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (applyRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  // ── happy path ──────────────────────────────────────────────────────────
  // @req REQ-057
  it("happy path — 200 with proper envelope shape", async () => {
    (listNamesHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope
    );

    const req = new NextRequest("http://localhost/api/v2/names?q=jieng");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.names).toBeDefined();
    expect(typeof body.data.total).toBe("number");
    expect(body.meta.license).toBe("CC-BY-SA-4.0");
    expect(Array.isArray(body.errors)).toBe(true);
  });

  // @req REQ-057
  it("happy path — no params, defaults applied", async () => {
    (listNamesHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope
    );

    const req = new NextRequest("http://localhost/api/v2/names");
    await GET(req);

    expect(listNamesHandler).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0, imposedOnly: false })
    );
  });

  // @req REQ-057
  it("passes q, nameType, peopleId, letter, limit, offset to the handler", async () => {
    (listNamesHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope
    );

    const req = new NextRequest(
      "http://localhost/api/v2/names?q=jieng&nameType=endonym&peopleId=PPL_JIENG&letter=J&limit=10&offset=5"
    );
    await GET(req);

    expect(listNamesHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "jieng",
        nameType: "endonym",
        peopleId: "PPL_JIENG",
        letter: "J",
        limit: 10,
        offset: 5,
      })
    );
  });

  // ── imposedOnly ─────────────────────────────────────────────────────────
  // @req REQ-057
  it("imposedOnly=true — normalised to boolean true", async () => {
    (listNamesHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope
    );

    const req = new NextRequest(
      "http://localhost/api/v2/names?imposedOnly=true"
    );
    await GET(req);

    expect(listNamesHandler).toHaveBeenCalledWith(
      expect.objectContaining({ imposedOnly: true })
    );
  });

  // ── validation errors ───────────────────────────────────────────────────
  // @req REQ-057
  it("invalid nameType — 400 VALIDATION_ERROR", async () => {
    const req = new NextRequest("http://localhost/api/v2/names?nameType=bogus");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(listNamesHandler).not.toHaveBeenCalled();
  });

  // @req REQ-057
  it("invalid imposedOnly — 400 VALIDATION_ERROR", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/names?imposedOnly=yes"
    );
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  // @req REQ-057
  it("malformed peopleId — 400 VALIDATION_ERROR", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/names?peopleId=not-a-people-id"
    );
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  // @req REQ-057
  it("letter with more than one character — 400 VALIDATION_ERROR", async () => {
    const req = new NextRequest("http://localhost/api/v2/names?letter=AB");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  // @req REQ-057
  it("limit > 100 — 400 VALIDATION_ERROR", async () => {
    const req = new NextRequest("http://localhost/api/v2/names?limit=200");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  // @req REQ-057
  it("negative offset — 400 VALIDATION_ERROR", async () => {
    const req = new NextRequest("http://localhost/api/v2/names?offset=-1");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  // ── rate limiting (AR11) ────────────────────────────────────────────────
  // @req REQ-057
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

    const req = new NextRequest("http://localhost/api/v2/names");
    const res = await GET(req);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(res.headers.get("X-RateLimit-Limit")).toBeDefined();
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(listNamesHandler).not.toHaveBeenCalled();
  });

  // ── error handling ──────────────────────────────────────────────────────
  // @req REQ-057
  it("500 on handler error", async () => {
    (listNamesHandler as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error")
    );

    const req = new NextRequest("http://localhost/api/v2/names");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  // ── OPTIONS ─────────────────────────────────────────────────────────────
  // @req REQ-057
  it("OPTIONS — 204 with CORS headers", async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(204);
  });
});
