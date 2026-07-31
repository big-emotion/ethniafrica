import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Language, LanguageFamily, People } from "@/types/afrik";

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

// Query-level mocks (not the handler mock above) so the payload-size budget
// test below can drive the *real* handler → service → serialization chain —
// only the Supabase round-trips are faked (@req AC3 ETNI-463 review fix: a
// hand-built envelope wouldn't catch a regression re-adding `content`).
vi.mock("@/lib/supabase/queries/afrik/languageFamilies", () => ({
  getAfrikLanguageFamilyById: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/afrik/languages", () => ({
  getAfrikLanguagesByFamily: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getAfrikPeoplesByLanguageFamily: vi.fn(),
}));

import { getLanguageFamilyTreeHandler } from "@/api/v2/handlers/languageFamilyTree";
import { GET, OPTIONS } from "../language-families/[id]/tree/route";
import { getAfrikLanguageFamilyById } from "@/lib/supabase/queries/afrik/languageFamilies";
import { getAfrikLanguagesByFamily } from "@/lib/supabase/queries/afrik/languages";
import { getAfrikPeoplesByLanguageFamily } from "@/lib/supabase/queries/afrik/peoples";

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
    // Drives the real handler → getFamilyTreeSkeleton → createApiResponse
    // chain (only the Supabase queries below are mocked), so this budget
    // exercises the actual response shape rather than a hand-built stand-in.
    const { getLanguageFamilyTreeHandler: realHandler } = await vi.importActual<
      typeof import("@/api/v2/handlers/languageFamilyTree")
    >("@/api/v2/handlers/languageFamilyTree");

    const mockFamily: LanguageFamily = {
      id: "FLG_BANTU",
      nameFr: "Bantou",
      nameEn: "Bantu",
      classificationStatus: "consensual",
      content: {
        history:
          "Long editorial article text — deliberately excluded from the skeleton.",
      },
    };
    const mockLanguages: Language[] = REAL_BANTU_LANGUAGES.map((language) => ({
      id: language.iso639_3,
      name: language.name,
      familyId: "FLG_BANTU",
      content: {},
    }));
    const mockPeoples: People[] = Array.from(
      { length: TOTAL_PEOPLES },
      (_, index) => {
        const language =
          REAL_BANTU_LANGUAGES[index % REAL_BANTU_LANGUAGES.length];
        return {
          id: `PPL_${index}`,
          nameMain: `Peuple ${index}`,
          languageFamilyId: "FLG_BANTU",
          currentCountries: [],
          classificationStatus: null,
          content: { languages: { isoCodes: [language.iso639_3] } },
        };
      }
    );

    vi.mocked(getAfrikLanguageFamilyById).mockResolvedValue(mockFamily);
    vi.mocked(getAfrikLanguagesByFamily).mockResolvedValue(mockLanguages);
    vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue(mockPeoples);

    const result = await realHandler("FLG_BANTU");

    expect(result.ok).toBe(true);
    const body = JSON.stringify(result.ok ? result.envelope : null);

    expect(Buffer.byteLength(body, "utf-8")).toBeLessThanOrEqual(15 * 1024);
  });
});
