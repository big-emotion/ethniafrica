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

vi.mock("@/lib/search/searchQueryLog", () => ({
  searchQueryLog: { write: vi.fn().mockResolvedValue(undefined) },
}));

import { ftsSearchHandler } from "@/api/v2/handlers/search";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { searchQueryLog } from "@/lib/search/searchQueryLog";
import {
  buildSearchParams,
  mapSearchEnvelope,
} from "@/lib/search/searchEnvelope";

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
    attribution: "EthniAfrica — ethniafrica.com",
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

  // ── query log (ETNI-1419 / REQ-002) ────────────────────────────────────
  // @req REQ-002
  it("logs the query and result count exactly once per executed search", async () => {
    (ftsSearchHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockEnvelope
    );

    const req = new NextRequest("http://localhost/api/v2/search?q=Yoruba");
    await GET(req);

    expect(searchQueryLog.write).toHaveBeenCalledTimes(1);
    expect(searchQueryLog.write).toHaveBeenCalledWith({
      query: "Yoruba",
      resultCount: mockEnvelope.data.total,
    });
  });

  // @req REQ-002
  it("does not log a search that fails parameter validation", async () => {
    const req = new NextRequest("http://localhost/api/v2/search");
    await GET(req);

    expect(searchQueryLog.write).not.toHaveBeenCalled();
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

  // ── client/route contract ───────────────────────────────────────────────
  // The site's own callers went unnoticed for two releases while every search
  // 400ed, because each side was only ever tested against its own idea of the
  // query string. This drives the route with the URL the client actually
  // builds, so the two can no longer drift apart silently.
  describe("accepts the URLs the site's own callers build", () => {
    // @req REQ-002
    it("answers 200 to a request built by the shared client adapter", async () => {
      (ftsSearchHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockEnvelope
      );

      const params = buildSearchParams("bété", {
        limit: 6,
        classificationStatus: "contested",
        minConfidence: "0.5",
      });
      const res = await GET(
        new NextRequest(`http://localhost/api/v2/search?${params}`)
      );

      expect(res.status).toBe(200);
      expect(ftsSearchHandler).toHaveBeenCalledWith(
        expect.objectContaining({ q: "bété", limit: 6 })
      );
    });

    // @req REQ-002
    it("hands the adapter an envelope it can read back", async () => {
      (ftsSearchHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockEnvelope
      );

      const res = await GET(
        new NextRequest(
          `http://localhost/api/v2/search?${buildSearchParams("yoruba")}`
        )
      );

      expect(mapSearchEnvelope(await res.json())).toEqual([
        expect.objectContaining({ id: "PPL_YORUBA", name: "Yoruba" }),
      ]);
    });
  });

  describe("relation-scoped search", () => {
    // @req REQ-002
    it("accepts a language family as a search in its own right", async () => {
      (ftsSearchHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockEnvelope
      );

      const res = await GET(
        new NextRequest("http://localhost/api/v2/search?familyId=FLG_KROU")
      );

      expect(res.status).toBe(200);
      expect(ftsSearchHandler).toHaveBeenCalledWith(
        expect.objectContaining({ familyId: "FLG_KROU" })
      );
    });

    // @req REQ-002
    it("accepts a country as a search in its own right", async () => {
      (ftsSearchHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockEnvelope
      );

      const res = await GET(
        new NextRequest("http://localhost/api/v2/search?countryId=CIV")
      );

      expect(res.status).toBe(200);
      expect(ftsSearchHandler).toHaveBeenCalledWith(
        expect.objectContaining({ countryId: "CIV" })
      );
    });

    // @req REQ-002
    it("narrows a free-text query to a relation when both are given", async () => {
      (ftsSearchHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockEnvelope
      );

      await GET(
        new NextRequest(
          "http://localhost/api/v2/search?q=b%C3%A9t%C3%A9&familyId=FLG_KROU"
        )
      );

      expect(ftsSearchHandler).toHaveBeenCalledWith(
        expect.objectContaining({ q: "bété", familyId: "FLG_KROU" })
      );
    });

    // @req REQ-002
    it("rejects a family identifier that is not one", async () => {
      const res = await GET(
        new NextRequest("http://localhost/api/v2/search?familyId=krou")
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.errors[0].field).toBe("familyId");
    });

    // @req REQ-002
    it("rejects a country code that is not alpha-3", async () => {
      const res = await GET(
        new NextRequest("http://localhost/api/v2/search?countryId=CI")
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.errors[0].field).toBe("countryId");
    });

    // @req REQ-002
    it("still requires a query when no relation scopes it", async () => {
      const res = await GET(new NextRequest("http://localhost/api/v2/search"));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.errors[0].field).toBe("q");
    });
  });
});
