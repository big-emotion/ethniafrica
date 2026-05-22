import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { mockRevalidateTag, mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidateTag: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidateTag: mockRevalidateTag,
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/api/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { POST, OPTIONS } from "../route";

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  return {
    headers: new Headers({ "Content-Type": "application/json", ...headers }),
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

const VALID_SECRET = "test-webhook-secret";
const AUTH = { Authorization: `Bearer ${VALID_SECRET}` };

const PEOPLE_PAYLOAD = {
  entity_type: "people",
  entity_id: "PPL_YORUBA",
  slug: "ppl_yoruba",
};

describe("POST /api/internal/revalidate", () => {
  const originalEnv = process.env.SUPABASE_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_WEBHOOK_SECRET = VALID_SECRET;
  });

  afterEach(() => {
    process.env.SUPABASE_WEBHOOK_SECRET = originalEnv;
  });

  describe("authentication", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const response = await POST(makeRequest(PEOPLE_PAYLOAD));
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });

    it("returns 401 when Authorization header has wrong secret", async () => {
      const response = await POST(
        makeRequest(PEOPLE_PAYLOAD, { Authorization: "Bearer wrong-secret" })
      );
      expect(response.status).toBe(401);
    });

    it("returns 401 when SUPABASE_WEBHOOK_SECRET env var is not set", async () => {
      delete process.env.SUPABASE_WEBHOOK_SECRET;
      const response = await POST(makeRequest(PEOPLE_PAYLOAD, AUTH));
      expect(response.status).toBe(401);
    });

    it("does not call revalidate functions on auth failure", async () => {
      await POST(makeRequest(PEOPLE_PAYLOAD));
      expect(mockRevalidateTag).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("payload validation", () => {
    it("returns 400 when entity_type is missing", async () => {
      const response = await POST(
        makeRequest({ entity_id: "PPL_YORUBA", slug: "ppl_yoruba" }, AUTH)
      );
      expect(response.status).toBe(400);
    });

    it("returns 400 when entity_id is missing", async () => {
      const response = await POST(
        makeRequest({ entity_type: "people", slug: "ppl_yoruba" }, AUTH)
      );
      expect(response.status).toBe(400);
    });

    it("returns 400 when slug is missing", async () => {
      const response = await POST(
        makeRequest({ entity_type: "people", entity_id: "PPL_YORUBA" }, AUTH)
      );
      expect(response.status).toBe(400);
    });

    it("returns 400 when entity_type is empty string", async () => {
      const response = await POST(
        makeRequest(
          { entity_type: "", entity_id: "PPL_YORUBA", slug: "ppl_yoruba" },
          AUTH
        )
      );
      expect(response.status).toBe(400);
    });
  });

  describe("cache invalidation — entity_type=people", () => {
    it("returns 200 with success=true", async () => {
      const response = await POST(makeRequest(PEOPLE_PAYLOAD, AUTH));
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });

    it("invalidates the afrik-peoples tag", async () => {
      await POST(makeRequest(PEOPLE_PAYLOAD, AUTH));
      expect(mockRevalidateTag).toHaveBeenCalledWith("afrik-peoples", "max");
    });

    it("revalidates the /fr/peuples path", async () => {
      await POST(makeRequest(PEOPLE_PAYLOAD, AUTH));
      expect(mockRevalidatePath).toHaveBeenCalledWith("/fr/peuples");
    });

    it("includes invalidated tags in response", async () => {
      const response = await POST(makeRequest(PEOPLE_PAYLOAD, AUTH));
      const json = await response.json();
      expect(Array.isArray(json.invalidated.tags)).toBe(true);
      expect(json.invalidated.tags).toContain("afrik-peoples");
    });
  });

  describe("cache invalidation — entity_type=language_family", () => {
    const FAMILY_PAYLOAD = {
      entity_type: "language_family",
      entity_id: "FLG_BANTU",
      slug: "flg_bantu",
    };

    it("invalidates the afrik-language-families tag", async () => {
      await POST(makeRequest(FAMILY_PAYLOAD, AUTH));
      expect(mockRevalidateTag).toHaveBeenCalledWith(
        "afrik-language-families",
        "max"
      );
    });

    it("revalidates the /fr/familles path", async () => {
      await POST(makeRequest(FAMILY_PAYLOAD, AUTH));
      expect(mockRevalidatePath).toHaveBeenCalledWith("/fr/familles");
    });
  });

  describe("cache invalidation — entity_type=country", () => {
    const COUNTRY_PAYLOAD = {
      entity_type: "country",
      entity_id: "COM",
      slug: "com",
    };

    it("invalidates the afrik-countries tag", async () => {
      await POST(makeRequest(COUNTRY_PAYLOAD, AUTH));
      expect(mockRevalidateTag).toHaveBeenCalledWith("afrik-countries", "max");
    });

    it("revalidates the /fr/pays path", async () => {
      await POST(makeRequest(COUNTRY_PAYLOAD, AUTH));
      expect(mockRevalidatePath).toHaveBeenCalledWith("/fr/pays");
    });
  });

  describe("stable-reference tag invalidation (AR18)", () => {
    it("always invalidates afrik-language-families stable-ref tag", async () => {
      await POST(makeRequest(PEOPLE_PAYLOAD, AUTH));
      expect(mockRevalidateTag).toHaveBeenCalledWith(
        "afrik-language-families",
        "max"
      );
    });

    it("always invalidates afrik-countries stable-ref tag", async () => {
      await POST(makeRequest(PEOPLE_PAYLOAD, AUTH));
      expect(mockRevalidateTag).toHaveBeenCalledWith("afrik-countries", "max");
    });

    it("returns 200 for an unknown entity_type and still invalidates stable refs", async () => {
      const response = await POST(
        makeRequest(
          {
            entity_type: "unknown_type",
            entity_id: "XYZ_123",
            slug: "xyz_123",
          },
          AUTH
        )
      );
      expect(response.status).toBe(200);
      expect(mockRevalidateTag).toHaveBeenCalledWith(
        "afrik-language-families",
        "max"
      );
      expect(mockRevalidateTag).toHaveBeenCalledWith("afrik-countries", "max");
    });
  });

  describe("OPTIONS", () => {
    it("returns 204 with CORS headers", () => {
      const response = OPTIONS();
      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
        "POST"
      );
    });
  });
});
