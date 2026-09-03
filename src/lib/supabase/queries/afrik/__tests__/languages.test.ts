import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import {
  getAfrikLanguageById,
  getAfrikLanguagesByFamily,
  getAfrikSpeakingPeoples,
  listAfrikLanguages,
} from "../languages";
import { createServerClient } from "../../../server";

interface MockSupabase {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
}

describe("AFRIK Languages Queries", () => {
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
      maybeSingle: vi.fn(),
      in: vi.fn(),
      range: vi.fn(),
    };
    vi.clearAllMocks();
    vi.mocked(createServerClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createServerClient>
    );
  });

  describe("getAfrikLanguagesByFamily", () => {
    // @req REQ-033
    it("returns the family's languages mapped to camelCase, ordered by name", async () => {
      const mockData = [
        {
          id: "kon",
          name: "Kikongo",
          family_id: "FLG_BANTU",
          content: { dialects: ["Kizombo"] },
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];
      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getAfrikLanguagesByFamily("FLG_BANTU");

      expect(mockSupabase.from).toHaveBeenCalledWith("afrik_languages");
      expect(mockSupabase.eq).toHaveBeenCalledWith("family_id", "FLG_BANTU");
      expect(mockSupabase.order).toHaveBeenCalledWith("name");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "kon",
        name: "Kikongo",
        familyId: "FLG_BANTU",
        content: { dialects: ["Kizombo"] },
      });
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    // @req REQ-033
    it("returns [] for an unknown family id without throwing", async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      const result = await getAfrikLanguagesByFamily("FLG_NONEXISTENT");

      expect(result).toEqual([]);
    });

    // @req REQ-033
    it("returns [] when data is null", async () => {
      mockSupabase.order.mockResolvedValue({ data: null, error: null });

      const result = await getAfrikLanguagesByFamily("FLG_BANTU");

      expect(result).toEqual([]);
    });

    // @req REQ-033
    it("logs via logger and throws on a Supabase error", async () => {
      const dbError = new Error("db down");
      mockSupabase.order.mockResolvedValue({ data: null, error: dbError });

      await expect(getAfrikLanguagesByFamily("FLG_BANTU")).rejects.toThrow(
        "db down"
      );
    });
  });

  describe("getAfrikLanguageById", () => {
    // @req REQ-136
    it("returns the language, its family, and its content", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          id: "yor",
          name: "Yoruba",
          family_id: "FLG_BENOUECONGO",
          content: { nameProvenance: "sourced" },
          spelling_aliases: ["Yorouba"],
          family: {
            id: "FLG_BENOUECONGO",
            name_fr: "Bénoué-Congo",
          },
        },
        error: null,
      });

      const result = await getAfrikLanguageById("yor");

      expect(mockSupabase.from).toHaveBeenCalledWith("afrik_languages");
      expect(mockSupabase.select).toHaveBeenCalledWith(
        "id, name, family_id, content, spelling_aliases, family:afrik_language_families(id, name_fr)"
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "yor");
      expect(result).toEqual({
        id: "yor",
        name: "Yoruba",
        family: { id: "FLG_BENOUECONGO", name: "Bénoué-Congo" },
        content: { nameProvenance: "sourced" },
        spellingAliases: ["Yorouba"],
      });
    });

    // @req REQ-136
    it("returns null for an unknown language id", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      await expect(getAfrikLanguageById("zzz")).resolves.toBeNull();
    });
  });

  describe("getAfrikSpeakingPeoples", () => {
    // @req REQ-136
    it("reads speaker ids only from afrik_people_languages and hydrates them in one batch", async () => {
      mockSupabase.eq.mockResolvedValue({
        data: [{ people_id: "PPL_YORUBA" }, { people_id: "PPL_NAGO" }],
        error: null,
      });
      mockSupabase.in.mockResolvedValue({
        data: [
          { id: "PPL_YORUBA", name_main: "Yoruba" },
          { id: "PPL_NAGO", name_main: "Nago" },
        ],
        error: null,
      });

      const result = await getAfrikSpeakingPeoples("yor");

      expect(mockSupabase.from).toHaveBeenNthCalledWith(
        1,
        "afrik_people_languages"
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith("language_id", "yor");
      expect(mockSupabase.from).toHaveBeenNthCalledWith(2, "afrik_peoples");
      expect(mockSupabase.in).toHaveBeenCalledWith("id", [
        "PPL_YORUBA",
        "PPL_NAGO",
      ]);
      expect(result).toEqual([
        { id: "PPL_YORUBA", name: "Yoruba" },
        { id: "PPL_NAGO", name: "Nago" },
      ]);
    });

    // @req REQ-136
    it("uses a bounded two-query plan for a language spoken by 40 peoples", async () => {
      const links = Array.from({ length: 40 }, (_, index) => ({
        people_id: `PPL_${index}`,
      }));
      const peoples = links.map(({ people_id: id }) => ({
        id,
        name_main: `People ${id}`,
      }));
      mockSupabase.eq.mockResolvedValue({ data: links, error: null });
      mockSupabase.in.mockResolvedValue({ data: peoples, error: null });

      const result = await getAfrikSpeakingPeoples("swa");

      expect(result).toHaveLength(40);
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
      expect(mockSupabase.in).toHaveBeenCalledTimes(1);
      expect(mockSupabase.in).toHaveBeenCalledWith(
        "id",
        links.map(({ people_id }) => people_id)
      );
    });

    // @req REQ-136
    it("does not query peoples when the language has no relations", async () => {
      mockSupabase.eq.mockResolvedValue({ data: [], error: null });

      const result = await getAfrikSpeakingPeoples("zzz");

      expect(result).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(mockSupabase.in).not.toHaveBeenCalled();
    });
  });

  describe("listAfrikLanguages", () => {
    // @req REQ-136
    it("returns rows ordered by family then name, with total and pageCount", async () => {
      const mockData = [
        {
          id: "kon",
          name: "Kikongo",
          family_id: "FLG_BANTU",
          family: { id: "FLG_BANTU", name_fr: "Bantou" },
        },
        {
          id: "swa",
          name: "Swahili",
          family_id: "FLG_BANTU",
          family: { id: "FLG_BANTU", name_fr: "Bantou" },
        },
      ];
      mockSupabase.range.mockResolvedValue({
        data: mockData,
        error: null,
        count: 748,
      });

      const result = await listAfrikLanguages();

      expect(mockSupabase.from).toHaveBeenCalledWith("afrik_languages");
      expect(mockSupabase.order).toHaveBeenNthCalledWith(1, "family_id");
      expect(mockSupabase.order).toHaveBeenNthCalledWith(2, "name");
      expect(result.languages).toEqual([
        {
          id: "kon",
          name: "Kikongo",
          family: { id: "FLG_BANTU", name: "Bantou" },
        },
        {
          id: "swa",
          name: "Swahili",
          family: { id: "FLG_BANTU", name: "Bantou" },
        },
      ]);
      expect(result.total).toBe(748);
      expect(result.pageCount).toBe(16);
    });

    // @req REQ-136
    it("keeps homonyms distinguishable by id and family", async () => {
      const mockData = [
        {
          id: "fuf",
          name: "Fulfulde",
          family_id: "FLG_ATLANTIQUE",
          family: { id: "FLG_ATLANTIQUE", name_fr: "Atlantique" },
        },
        {
          id: "fuv",
          name: "Fulfulde",
          family_id: "FLG_MANDE",
          family: { id: "FLG_MANDE", name_fr: "Mandé" },
        },
      ];
      mockSupabase.range.mockResolvedValue({
        data: mockData,
        error: null,
        count: 2,
      });

      const result = await listAfrikLanguages();

      expect(result.languages).toHaveLength(2);
      expect(result.languages[0].id).not.toBe(result.languages[1].id);
      expect(result.languages[0].family.id).not.toBe(
        result.languages[1].family.id
      );
      expect(result.languages.every((row) => row.name === "Fulfulde")).toBe(
        true
      );
    });

    // @req REQ-136
    it("maps page/perPage to the correct .range() bounds", async () => {
      mockSupabase.range.mockResolvedValue({ data: [], error: null, count: 0 });

      await listAfrikLanguages({ page: 3, perPage: 20 });

      expect(mockSupabase.range).toHaveBeenCalledWith(40, 59);
    });

    // @req REQ-136
    it("logs via logger and throws on a Supabase error", async () => {
      const dbError = new Error("db down");
      mockSupabase.range.mockResolvedValue({
        data: null,
        error: dbError,
        count: null,
      });

      await expect(listAfrikLanguages()).rejects.toThrow("db down");
    });

    // @req REQ-136
    it("falls back to family_id when a family fails to hydrate", async () => {
      mockSupabase.range.mockResolvedValue({
        data: [
          {
            id: "orphan",
            name: "Orphan",
            family_id: "FLG_UNKNOWN",
            family: null,
          },
        ],
        error: null,
        count: 1,
      });

      const result = await listAfrikLanguages();

      expect(result.languages[0].family).toEqual({
        id: "FLG_UNKNOWN",
        name: "FLG_UNKNOWN",
      });
    });
  });
});
