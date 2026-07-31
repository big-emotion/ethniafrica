import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/languageFamilyTree", () => ({
  getLanguageFamilyTreeHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { getLanguageFamilyTreeHandler } from "@/api/v2/handlers/languageFamilyTree";
import { GET, OPTIONS } from "../language-families/[id]/tree/route";

const validEnvelope = {
  data: {
    family: {
      id: "FLG_BANTU",
      nameFr: "Bantou",
      nameEn: "Bantu",
      content: {},
    },
    branches: [{ iso639_3: "swa", name: "Swahili", peopleCount: 3 }],
    unlinkedPeopleCount: 1,
  },
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "Africa History — africahistory.org",
  },
  errors: [],
};

describe("GET /api/v2/language-families/[id]/tree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-033
  it("returns 200 with the envelope and Cache-Control s-maxage=86400", async () => {
    vi.mocked(getLanguageFamilyTreeHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/language-families/FLG_BANTU/tree"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_BANTU" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.family.id).toBe("FLG_BANTU");
    expect(body.data.branches).toHaveLength(1);
    expect(body.data.unlinkedPeopleCount).toBe(1);
    expect(response.headers.get("Cache-Control")).toBe("s-maxage=86400");
    expect(getLanguageFamilyTreeHandler).toHaveBeenCalledWith("FLG_BANTU");
  });

  // @req REQ-033
  it("returns 400 VALIDATION_ERROR on invalid id format", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/language-families/bantu/tree"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "bantu" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(getLanguageFamilyTreeHandler).not.toHaveBeenCalled();
  });

  // @req REQ-033
  it("returns 404 NOT_FOUND for an unknown family id", async () => {
    vi.mocked(getLanguageFamilyTreeHandler).mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
      message: "Language family not found: FLG_UNKNOWN",
    });

    const request = new NextRequest(
      "http://localhost/api/v2/language-families/FLG_UNKNOWN/tree"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_UNKNOWN" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.errors[0].code).toBe("NOT_FOUND");
  });

  // @req REQ-033
  it("returns 500 INTERNAL_ERROR when the handler throws", async () => {
    vi.mocked(getLanguageFamilyTreeHandler).mockRejectedValue(
      new Error("db down")
    );

    const request = new NextRequest(
      "http://localhost/api/v2/language-families/FLG_BANTU/tree"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_BANTU" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  // @req REQ-033
  it("sets CORS headers on the GET response", async () => {
    vi.mocked(getLanguageFamilyTreeHandler).mockResolvedValue({
      ok: true,
      envelope: validEnvelope,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/language-families/FLG_BANTU/tree"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_BANTU" }),
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  // @req REQ-033
  it("returns 204 with CORS headers on OPTIONS", async () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
  });
});

// ETNI-463 (7.11) AC3 — tree-skeleton payload size budget.
// FLG_BANTU is the largest family with real seeded language/people data
// (6 languages in langue_par_famille.csv, 174 associated peoples fiches) —
// see dataset/source/afrik/famille_linguistique/langue_par_famille.csv and
// dataset/source/afrik/peuples/FLG_BANTU/. The skeleton's `family` field is
// deliberately trimmed to id/names/status (no editorial `content` JSONB —
// see languageFamilyTreeService.getFamilyTreeSkeleton) so this budget holds
// regardless of how large the family's article content grows.
describe("GET /api/v2/language-families/[id]/tree — payload size budget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const REAL_BANTU_LANGUAGES = [
    { iso639_3: "lin", name: "Lingala" },
    { iso639_3: "kin", name: "Kinyarwanda" },
    { iso639_3: "run", name: "Kirundi" },
    { iso639_3: "sna", name: "Shona" },
    { iso639_3: "zul", name: "Zulu" },
    { iso639_3: "zdj", name: "Comorien (Shingazidja)" },
  ];
  const TOTAL_PEOPLES = 174;

  // @req REQ-047
  it("keeps the largest family's tree skeleton response at or under 15 KB", async () => {
    const perBranch = Math.ceil(TOTAL_PEOPLES / REAL_BANTU_LANGUAGES.length);
    const largestFamilySkeleton = {
      data: {
        family: {
          id: "FLG_BANTU",
          nameFr: "Bantou",
          nameEn: "Bantu",
          classificationStatus: "consensual" as const,
        },
        branches: REAL_BANTU_LANGUAGES.map((language) => ({
          ...language,
          peopleCount: perBranch,
        })),
        unlinkedPeopleCount: 0,
      },
      meta: {
        license: "CC-BY-SA-4.0",
        attribution: "Africa History — africahistory.org",
      },
      errors: [],
    };

    vi.mocked(getLanguageFamilyTreeHandler).mockResolvedValue({
      ok: true,
      envelope: largestFamilySkeleton,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/language-families/FLG_BANTU/tree"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "FLG_BANTU" }),
    });
    const body = await response.text();

    expect(Buffer.byteLength(body, "utf-8")).toBeLessThanOrEqual(15 * 1024);
  });
});
