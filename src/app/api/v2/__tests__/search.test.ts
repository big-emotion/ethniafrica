/**
 * Route-level tests for GET /api/v2/search (ETNI-38).
 * Covers: happy path, empty query, invalid params, filter combinations,
 * rate-limit 429 response, and 500 error.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, OPTIONS } from "../../v2/search/route";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/search", () => ({
  ftsSearchHandler: vi.fn(),
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

import { ftsSearchHandler } from "@/api/v2/handlers/search";
import { applyRateLimit } from "@/lib/api/rate-limit";

const mockEnvelope = {
  data: {
    peoples: [
      {
        id: "PPL_YORUBA",
        nameMain: "Yoruba",
        languageFamilyId: "FLG_NIGER_CONGO",
        currentCountries: ["NGA"],
        content: {},
      },
    ],
    countries: [],
    total: 1,
  },
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "Africa History — africahistory.org",
  },
  errors: [],
};

describe("GET /api/v2/search (route)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (applyRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  // ── happy path ──────────────────────────────────────────────────────────
  it("happy path — 200 with proper envelope shape", async () => {
    (ftsSearchHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope
    );

    const req = new NextRequest("http://localhost/api/v2/search?q=Yoruba");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.peoples).toBeDefined();
    expect(body.data.countries).toBeDefined();
    expect(typeof body.data.total).toBe("number");
    expect(body.meta.license).toBe("CC-BY-SA-4.0");
    expect(Array.isArray(body.errors)).toBe(true);
  });

  it("happy path — passes q, limit, offset to handler", async () => {
    (ftsSearchHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope
    );

    const req = new NextRequest(
      "http://localhost/api/v2/search?q=Bantu&limit=10&offset=20"
    );
    await GET(req);

    expect(ftsSearchHandler).toHaveBeenCalledWith(
      expect.objectContaining({ q: "Bantu", limit: 10, offset: 20 })
    );
  });

  // ── empty query ─────────────────────────────────────────────────────────
  it("empty query — 400 INVALID_PARAM when q is missing", async () => {
    const req = new NextRequest("http://localhost/api/v2/search");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.errors).toBeDefined();
    expect(body.errors[0].code).toBe("INVALID_PARAM");
  });

  it("empty string q — 400 INVALID_PARAM", async () => {
    const req = new NextRequest("http://localhost/api/v2/search?q=");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  // ── invalid params ──────────────────────────────────────────────────────
  it("invalid limit — 400 INVALID_PARAM", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/search?q=Bantu&limit=notanumber"
    );
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it("limit > 50 — clamped to 50 and handled", async () => {
    (ftsSearchHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope
    );

    const req = new NextRequest(
      "http://localhost/api/v2/search?q=Bantu&limit=200"
    );
    await GET(req);

    expect(ftsSearchHandler).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    );
  });

  it("invalid minConfidence — 400 INVALID_PARAM", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/search?q=Bantu&minConfidence=abc"
    );
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it("minConfidence out of range [0,1] — 400 INVALID_PARAM", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/search?q=Bantu&minConfidence=1.5"
    );
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it("invalid classificationStatus — 400 INVALID_PARAM", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/search?q=Bantu&classificationStatus=bogus"
    );
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  // ── filter combinations ─────────────────────────────────────────────────
  it("filter combination — passes classificationStatus to handler", async () => {
    (ftsSearchHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope
    );

    const req = new NextRequest(
      "http://localhost/api/v2/search?q=Bantu&classificationStatus=consensual"
    );
    await GET(req);

    expect(ftsSearchHandler).toHaveBeenCalledWith(
      expect.objectContaining({ classificationStatus: "consensual" })
    );
  });

  it("filter combination — passes minConfidence to handler", async () => {
    (ftsSearchHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope
    );

    const req = new NextRequest(
      "http://localhost/api/v2/search?q=Bantu&minConfidence=0.7"
    );
    await GET(req);

    expect(ftsSearchHandler).toHaveBeenCalledWith(
      expect.objectContaining({ minConfidence: 0.7 })
    );
  });

  it("filter combination — passes sinceVerifiedAfter to handler", async () => {
    (ftsSearchHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope
    );

    const req = new NextRequest(
      "http://localhost/api/v2/search?q=Bantu&sinceVerifiedAfter=2026-01-01"
    );
    await GET(req);

    expect(ftsSearchHandler).toHaveBeenCalledWith(
      expect.objectContaining({ sinceVerifiedAfter: "2026-01-01" })
    );
  });

  // ── rate limiting ───────────────────────────────────────────────────────
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

    const req = new NextRequest("http://localhost/api/v2/search?q=Bantu");
    const res = await GET(req);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(res.headers.get("X-RateLimit-Limit")).toBeDefined();
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  // ── error handling ──────────────────────────────────────────────────────
  it("500 on handler error", async () => {
    (ftsSearchHandler as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error")
    );

    const req = new NextRequest("http://localhost/api/v2/search?q=Bantu");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.errors).toBeDefined();
  });

  // ── OPTIONS ─────────────────────────────────────────────────────────────
  it("OPTIONS — 204 with CORS headers", async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(204);
  });
});
