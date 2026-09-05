import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import {
  getAllAfrikCountries,
  getAfrikCountryById,
  getAfrikCountryIndexRows,
} from "../countries";
import { createServerClient } from "../../../server";

describe("AFRIK Countries Queries", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      textSearch: vi.fn(() => mockSupabase),
    };
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServerClient as any).mockReturnValue(mockSupabase);
  });

  describe("getAllAfrikCountries", () => {
    it("should return all countries", async () => {
      const mockData = [
        {
          id: "ZWE",
          name_fr: "Zimbabwe",
          etymology: null,
          name_origin_actor: null,
          content: {},
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getAllAfrikCountries();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("ZWE");
      expect(result[0].nameFr).toBe("Zimbabwe");
    });

    // @req REQ-143
    it("maps name_en onto nameEn for every listed country", async () => {
      mockSupabase.order.mockResolvedValue({
        data: [
          { id: "MAR", name_fr: "Maroc", name_en: "Morocco", content: {} },
          { id: "SDN", name_fr: "Soudan", name_en: "Sudan", content: {} },
        ],
        error: null,
      });

      const result = await getAllAfrikCountries();

      expect(result.map((country) => country.nameEn)).toEqual([
        "Morocco",
        "Sudan",
      ]);
    });

    it("should support pagination", async () => {
      mockSupabase.range.mockResolvedValue({ data: [], error: null });

      await getAllAfrikCountries(1, 10);

      expect(mockSupabase.range).toHaveBeenCalledWith(0, 9);
    });
  });

  describe("getAfrikCountryById", () => {
    it("should return a country by ISO code", async () => {
      const mockData = {
        id: "ZWE",
        name_fr: "Zimbabwe",
        content: {},
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await getAfrikCountryById("ZWE");

      expect(result).toBeDefined();
      expect(result?.id).toBe("ZWE");
    });

    // The corpus has held a distinct `nameOfficial` on all 54 fiches from the
    // start — FR33 fails the build when it merely repeats `nameFr` — but the
    // column did not exist and the row mapper dropped it, so `mapCountryDetail`
    // fell back to `nameFr` and every fiche printed its name twice.
    // @req REQ-019
    it("surfaces the official name distinct from the usual one", async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "ZAF",
          name_fr: "Afrique du Sud",
          name_official:
            "République d'Afrique du Sud (Republic of South Africa)",
          content: {},
        },
        error: null,
      });

      const result = await getAfrikCountryById("ZAF");

      expect(result?.nameOfficial).toBe(
        "République d'Afrique du Sud (Republic of South Africa)"
      );
    });

    // ETNI-1857: the English name is a column of its own (migration 082),
    // mirrored the way language families already expose theirs.
    // @req REQ-143
    it("surfaces the English name of ordinary use beside the French one", async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "TCD",
          name_fr: "Tchad",
          name_en: "Chad",
          content: {},
        },
        error: null,
      });

      const result = await getAfrikCountryById("TCD");

      expect(result?.nameFr).toBe("Tchad");
      expect(result?.nameEn).toBe("Chad");
    });

    // @req REQ-143
    it("leaves nameEn undefined until the corpus reload fills the column", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: "TCD", name_fr: "Tchad", name_en: null, content: {} },
        error: null,
      });

      const result = await getAfrikCountryById("TCD");

      expect(result?.nameEn).toBeUndefined();
    });

    it("should return null if not found", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await getAfrikCountryById("XXX");

      expect(result).toBeNull();
    });
  });

  describe("getAfrikCountryIndexRows", () => {
    // @req REQ-116
    it("asks the database for the two columns the index keeps", async () => {
      mockSupabase.order.mockResolvedValue({
        data: [
          { id: "COM", name_fr: "Comores" },
          { id: "NGA", name_fr: "Nigeria" },
        ],
        error: null,
      });

      const rows = await getAfrikCountryIndexRows();

      // The point of this reader: `select("*")` here shipped the whole
      // `content` JSONB — 951 KB on the corpus — to keep 2 KB of names.
      expect(mockSupabase.select).toHaveBeenCalledWith("id, name_fr");
      expect(rows).toEqual([
        { id: "COM", nameFr: "Comores" },
        { id: "NGA", nameFr: "Nigeria" },
      ]);
    });

    // @req REQ-116
    it("orders by the name a reader reads, not by the ISO code", async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      await getAfrikCountryIndexRows();

      expect(mockSupabase.order).toHaveBeenCalledWith("name_fr");
    });

    // @req REQ-116
    it("raises a failed read rather than reporting an empty corpus", async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: "AbortError: This operation was aborted" },
      });

      await expect(getAfrikCountryIndexRows()).rejects.toBeDefined();
    });
  });
});
