import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import {
  getAfrikLanguageById,
  getAfrikLanguagesByFamily,
  getAfrikSpeakingPeoples,
} from "../languages";
import { createServerClient } from "../../../server";

interface MockSupabase {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
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
        "id, name, family_id, content, family:afrik_language_families(id, name_fr)"
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "yor");
      expect(result).toEqual({
        id: "yor",
        name: "Yoruba",
        family: { id: "FLG_BENOUECONGO", name: "Bénoué-Congo" },
        content: { nameProvenance: "sourced" },
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
});
