import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import {
  getAllAfrikLanguageFamilies,
  getAfrikLanguageFamilyById,
  getAfrikLanguageFamilyRoster,
  searchAfrikLanguageFamilies,
  countAfrikLanguageFamilies,
} from "../languageFamilies";
import { createServerClient } from "../../../server";

describe("AFRIK Language Families Queries", () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      single: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
      range: vi.fn(() => mockSupabase),
      or: vi.fn(() => mockSupabase),
      in: vi.fn(() => mockSupabase),
    };
    vi.clearAllMocks();
    (createServerClient as any).mockReturnValue(mockSupabase);
  });

  describe("getAllAfrikLanguageFamilies", () => {
    it("should return all language families", async () => {
      const mockData = [
        {
          id: "FLG_BANTU",
          name_fr: "Bantou",
          name_en: "Bantu",
          content: {},
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getAllAfrikLanguageFamilies();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("FLG_BANTU");
      expect(result[0].nameFr).toBe("Bantou");
    });

    // @req REQ-110
    it("should apply page/perPage as a range on the query", async () => {
      mockSupabase.range.mockResolvedValue({ data: [], error: null });

      await getAllAfrikLanguageFamilies(3, 10);

      expect(mockSupabase.range).toHaveBeenCalledWith(20, 29);
    });

    // The families facet narrows by country, and the narrowed set has to reach
    // the database or the page would be a page of everything with the filter
    // reapplied to it.
    // @req REQ-110
    it("should restrict the page to the requested ids before applying the range", async () => {
      mockSupabase.range.mockResolvedValue({ data: [], error: null });

      await getAllAfrikLanguageFamilies(1, 12, ["FLG_BANTU", "FLG_MANDE"]);

      expect(mockSupabase.in).toHaveBeenCalledWith("id", [
        "FLG_BANTU",
        "FLG_MANDE",
      ]);
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 11);
    });

    // `id=in.()` is not a filter PostgREST is specified to answer, so the
    // empty selection is settled here rather than guessed at over the wire.
    // @req REQ-110
    it("should answer an empty selection without asking the database anything", async () => {
      const result = await getAllAfrikLanguageFamilies(1, 12, []);

      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe("countAfrikLanguageFamilies", () => {
    // @req REQ-110
    it("should return the exact total row count via a head-only count query", async () => {
      mockSupabase.select.mockResolvedValue({ count: 24, error: null });

      const result = await countAfrikLanguageFamilies();

      expect(result).toBe(24);
      expect(mockSupabase.select).toHaveBeenCalledWith("*", {
        count: "exact",
        head: true,
      });
    });

    // @req REQ-110
    it("should count only the requested ids so a filtered list reports its own total", async () => {
      mockSupabase.in.mockResolvedValue({ count: 2, error: null });

      const result = await countAfrikLanguageFamilies([
        "FLG_BANTU",
        "FLG_MANDE",
      ]);

      expect(result).toBe(2);
      expect(mockSupabase.in).toHaveBeenCalledWith("id", [
        "FLG_BANTU",
        "FLG_MANDE",
      ]);
    });

    // @req REQ-110
    it("should report a total of zero for an empty selection without querying", async () => {
      const result = await countAfrikLanguageFamilies([]);

      expect(result).toBe(0);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe("getAfrikLanguageFamilyRoster", () => {
    // The corpus's own family list, which is what "unclassified" has to be
    // measured against — a page of it can only ever measure the page.
    // @req REQ-108
    it("should return every published family's id and name, ordered by name", async () => {
      mockSupabase.order.mockResolvedValue({
        data: [
          { id: "FLG_BANTU", name_fr: "Bantou" },
          { id: "FLG_MANDE", name_fr: "Mandé" },
        ],
        error: null,
      });

      const roster = await getAfrikLanguageFamilyRoster();

      expect(mockSupabase.select).toHaveBeenCalledWith("id, name_fr");
      expect(mockSupabase.order).toHaveBeenCalledWith("name_fr");
      expect(roster).toEqual([
        { id: "FLG_BANTU", nameFr: "Bantou" },
        { id: "FLG_MANDE", nameFr: "Mandé" },
      ]);
    });
  });

  describe("getAfrikLanguageFamilyById", () => {
    it("should return a language family by ID", async () => {
      const mockData = {
        id: "FLG_BANTU",
        name_fr: "Bantou",
        name_en: "Bantu",
        content: {},
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await getAfrikLanguageFamilyById("FLG_BANTU");

      expect(result).toBeDefined();
      expect(result?.id).toBe("FLG_BANTU");
    });

    it("should return null if not found", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await getAfrikLanguageFamilyById("FLG_NONEXISTENT");

      expect(result).toBeNull();
    });
  });

  describe("searchAfrikLanguageFamilies", () => {
    it("should search language families by query", async () => {
      const mockData = [
        {
          id: "FLG_BANTU",
          name_fr: "Bantou",
          name_en: "Bantu",
          content: {},
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await searchAfrikLanguageFamilies("Bantu");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("FLG_BANTU");
    });
  });
});
