import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../v2/language-families/route";
import { NextRequest } from "next/server";

// Only the Supabase-backed query layer is mocked; route -> handler -> service
// -> response run for real so the pagination contract is exercised end to end.
// @req REQ-110
vi.mock("@/lib/supabase/queries/afrik/languageFamilies", () => ({
  getAllAfrikLanguageFamilies: vi.fn(),
  getAfrikLanguageFamilyById: vi.fn(),
  countAfrikLanguageFamilies: vi.fn(),
  getAfrikLanguageFamilyRoster: vi.fn(),
}));

// The unclassified count is a corpus-scale aggregate the database answers, not
// a subtraction over the page being returned — so it is stubbed here rather
// than derived from the fixture the pagination contract pages through.
vi.mock("@/lib/supabase/queries/afrik/languageFamilyFacet", () => ({
  countUnclassifiedPeoples: vi.fn(async () => 0),
}));

// The service also computes per-family people counts (REQ-108) from the peoples
// query layer; stub it so this pagination-contract test stays isolated from
// Supabase, exactly like the language-families query layer above.
vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getAfrikPeoplesByLanguageFamily: vi.fn(),
  getPeopleCountsByLanguageFamily: vi.fn(async () => new Map()),
  UNCLASSIFIED_FAMILY_KEY: "__unclassified__",
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import {
  getAllAfrikLanguageFamilies,
  countAfrikLanguageFamilies,
  getAfrikLanguageFamilyRoster,
} from "@/lib/supabase/queries/afrik/languageFamilies";

const ALL_FAMILIES = Array.from({ length: 24 }, (_, i) => ({
  id: `FLG_${String(i).padStart(2, "0")}`,
  nameFr: `Famille ${i}`,
  content: {},
}));

describe("API v2 - Language Families pagination contract (REQ-110)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mirrors the real query layer: page/perPage are applied as a range
    // against the full dataset, exactly like Supabase's .range() would.
    vi.mocked(getAllAfrikLanguageFamilies).mockImplementation(
      async (page?: number, perPage?: number) => {
        if (!page || !perPage) return ALL_FAMILIES;
        const start = (page - 1) * perPage;
        return ALL_FAMILIES.slice(start, start + perPage);
      }
    );
    vi.mocked(countAfrikLanguageFamilies).mockResolvedValue(
      ALL_FAMILIES.length
    );
    vi.mocked(getAfrikLanguageFamilyRoster).mockResolvedValue(
      ALL_FAMILIES.map((family) => ({ id: family.id, nameFr: family.nameFr }))
    );
  });

  // @req REQ-110
  it("applies a requested perPage within the documented maximum", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/language-families?perPage=100"
    );
    const response = await GET(request);
    const body = await response.json();

    expect(body.data.length).toBe(24);
    expect(body.meta.perPage).toBe(100);
    expect(body.meta.total).toBe(24);
  });

  // @req REQ-110
  it("makes all 24 families reachable by paginating to the end", async () => {
    const seenIds = new Set<string>();
    let totalPages = 0;

    for (let page = 1; page <= 3; page++) {
      const request = new NextRequest(
        `http://localhost/api/v2/language-families?page=${page}&perPage=10`
      );
      const response = await GET(request);
      const body = await response.json();

      body.data.forEach((family: { id: string }) => seenIds.add(family.id));
      totalPages = body.meta.totalPages;
    }

    expect(totalPages).toBe(3);
    expect(seenIds.size).toBe(24);
  });

  // @req REQ-110
  it("caps perPage at the documented maximum and reports the applied value", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/language-families?perPage=250"
    );
    const response = await GET(request);
    const body = await response.json();

    expect(body.meta.perPage).toBe(100);
    expect(body.data.length).toBeLessThanOrEqual(100);
  });
});
