/**
 * Query-layer tests for the FTS search.
 *
 * The peoples/countries branches run against a chained Supabase builder mock;
 * the families branch delegates to the existing ilike query, which is mocked
 * as a unit so this file asserts composition rather than re-testing it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("../languageFamilies", () => ({
  searchAfrikLanguageFamilies: vi.fn(),
}));

import { ftsSearchEntities } from "../search";
import { searchAfrikLanguageFamilies } from "../languageFamilies";
import { createServerClient } from "../../../server";

describe("ftsSearchEntities", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      in: vi.fn(() => mockSupabase),
      gte: vi.fn(() => mockSupabase),
      textSearch: vi.fn(() => mockSupabase),
      range: vi.fn(() => mockSupabase),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    };

    (createServerClient as any).mockReturnValue(mockSupabase);
    (searchAfrikLanguageFamilies as any).mockResolvedValue([]);
  });

  // @req REQ-002
  it("returns matching language families alongside peoples and countries", async () => {
    (searchAfrikLanguageFamilies as any).mockResolvedValue([
      { id: "FLG_NIGER_CONGO", nameFr: "Niger-Congo", content: {} },
    ]);

    const result = await ftsSearchEntities({
      q: "niger",
      limit: 20,
      offset: 0,
    });

    expect(searchAfrikLanguageFamilies).toHaveBeenCalledWith("niger");
    expect(result.families).toHaveLength(1);
    expect(result.families[0].id).toBe("FLG_NIGER_CONGO");
  });

  // @req REQ-002
  it("counts families in the reported total", async () => {
    (searchAfrikLanguageFamilies as any).mockResolvedValue([
      { id: "FLG_NIGER_CONGO", nameFr: "Niger-Congo", content: {} },
      { id: "FLG_BERBERE", nameFr: "Berbère", content: {} },
    ]);

    const result = await ftsSearchEntities({ q: "a", limit: 20, offset: 0 });

    expect(result.total).toBe(2);
  });

  // @req REQ-002
  it("searches peoples with the French websearch configuration", async () => {
    await ftsSearchEntities({ q: "bété", limit: 20, offset: 0 });

    expect(mockSupabase.textSearch).toHaveBeenCalledWith(
      "search_vector",
      "bété",
      { type: "websearch", config: "french" }
    );
  });
});
