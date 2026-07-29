import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Language, LanguageFamily, People } from "@/types/afrik";

vi.mock("@/lib/supabase/queries/afrik/languageFamilies", () => ({
  getAfrikLanguageFamilyById: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/afrik/languages", () => ({
  getAfrikLanguagesByFamily: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getAfrikPeoplesByLanguageFamily: vi.fn(),
}));
vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
  getFamilyTreeSkeleton,
  getFamilyTreeBranch,
} from "../services/languageFamilyTreeService";
import { getAfrikLanguageFamilyById } from "@/lib/supabase/queries/afrik/languageFamilies";
import { getAfrikLanguagesByFamily } from "@/lib/supabase/queries/afrik/languages";
import { getAfrikPeoplesByLanguageFamily } from "@/lib/supabase/queries/afrik/peoples";
import { logger } from "@/lib/api/logger";

const mockFamily: LanguageFamily = {
  id: "FLG_BANTU",
  nameFr: "Bantou",
  nameEn: "Bantu",
  content: {},
};

const mockLanguages: Language[] = [
  { id: "kon", name: "Kikongo", familyId: "FLG_BANTU", content: {} },
  { id: "lin", name: "Lingala", familyId: "FLG_BANTU", content: {} },
];

function makePeople(id: string, nameMain: string, isoCodes: string[]): People {
  return {
    id,
    nameMain,
    languageFamilyId: "FLG_BANTU",
    currentCountries: [],
    classificationStatus: null,
    content: { languages: { isoCodes } },
  };
}

const mockPeoples: People[] = [
  makePeople("PPL_BAKONGO", "Bakongo", ["kon"]),
  makePeople("PPL_BALINGALA", "Balingala", ["lin"]),
  makePeople("PPL_BOTH", "Both", ["kon", "lin"]),
  makePeople("PPL_UNLINKED", "Unlinked", ["swa"]),
];

describe("languageFamilyTreeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFamilyTreeSkeleton", () => {
    // @req REQ-033
    it("returns family + branches with peopleCount and unlinkedPeopleCount using exactly three DB round-trips", async () => {
      vi.mocked(getAfrikLanguageFamilyById).mockResolvedValue(mockFamily);
      vi.mocked(getAfrikLanguagesByFamily).mockResolvedValue(mockLanguages);
      vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue(mockPeoples);

      const result = await getFamilyTreeSkeleton("FLG_BANTU");

      expect(getAfrikLanguageFamilyById).toHaveBeenCalledTimes(1);
      expect(getAfrikLanguagesByFamily).toHaveBeenCalledTimes(1);
      expect(getAfrikPeoplesByLanguageFamily).toHaveBeenCalledTimes(1);

      expect(result).not.toBeNull();
      expect(result?.family).toEqual(mockFamily);
      expect(result?.branches).toEqual([
        { iso639_3: "kon", name: "Kikongo", peopleCount: 2 },
        { iso639_3: "lin", name: "Lingala", peopleCount: 2 },
      ]);
      expect(result?.unlinkedPeopleCount).toBe(1);
    });

    // @req REQ-033
    it("counts a people under every matching language branch (multi-branch membership)", async () => {
      vi.mocked(getAfrikLanguageFamilyById).mockResolvedValue(mockFamily);
      vi.mocked(getAfrikLanguagesByFamily).mockResolvedValue(mockLanguages);
      vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue([
        makePeople("PPL_BOTH", "Both", ["kon", "lin"]),
      ]);

      const result = await getFamilyTreeSkeleton("FLG_BANTU");

      expect(result?.branches).toEqual([
        { iso639_3: "kon", name: "Kikongo", peopleCount: 1 },
        { iso639_3: "lin", name: "Lingala", peopleCount: 1 },
      ]);
      expect(result?.unlinkedPeopleCount).toBe(0);
    });

    // @req REQ-033
    it("returns null for an unknown family id without throwing, and logs via the logger", async () => {
      vi.mocked(getAfrikLanguageFamilyById).mockResolvedValue(null);

      const result = await getFamilyTreeSkeleton("FLG_UNKNOWN");

      expect(result).toBeNull();
      expect(getAfrikLanguagesByFamily).not.toHaveBeenCalled();
      expect(getAfrikPeoplesByLanguageFamily).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe("getFamilyTreeBranch", () => {
    // @req REQ-033
    it("returns the correct page of people nodes ordered by name_main for a language branch, consistent with skeleton peopleCount", async () => {
      vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue(mockPeoples);

      const result = await getFamilyTreeBranch(
        "FLG_BANTU",
        { language: "kon" },
        { limit: 10, offset: 0 }
      );

      expect(result.total).toBe(2);
      expect(result.nodes).toEqual([
        {
          id: "PPL_BAKONGO",
          nameMain: "Bakongo",
          classificationStatus: null,
        },
        { id: "PPL_BOTH", nameMain: "Both", classificationStatus: null },
      ]);
    });

    // @req REQ-033
    it("paginates with limit/offset", async () => {
      vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue(mockPeoples);

      const result = await getFamilyTreeBranch(
        "FLG_BANTU",
        { language: "kon" },
        { limit: 1, offset: 1 }
      );

      expect(result.total).toBe(2);
      expect(result.nodes).toEqual([
        { id: "PPL_BOTH", nameMain: "Both", classificationStatus: null },
      ]);
    });

    // @req REQ-033
    it("returns only peoples matching no branch language for group: unlinked", async () => {
      vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue(mockPeoples);
      vi.mocked(getAfrikLanguagesByFamily).mockResolvedValue(mockLanguages);

      const result = await getFamilyTreeBranch(
        "FLG_BANTU",
        { group: "unlinked" },
        { limit: 10, offset: 0 }
      );

      expect(result.total).toBe(1);
      expect(result.nodes).toEqual([
        {
          id: "PPL_UNLINKED",
          nameMain: "Unlinked",
          classificationStatus: null,
        },
      ]);
    });

    // @req REQ-033
    it("returns an empty result for an unknown family id without throwing, and logs via the logger", async () => {
      vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue([]);

      const result = await getFamilyTreeBranch(
        "FLG_UNKNOWN",
        { language: "kon" },
        { limit: 10, offset: 0 }
      );

      expect(result).toEqual({ nodes: [], total: 0 });
      expect(logger.warn).toHaveBeenCalled();
    });

    // @req REQ-033
    it("returns an empty result for an unknown language without throwing", async () => {
      vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue(mockPeoples);

      const result = await getFamilyTreeBranch(
        "FLG_BANTU",
        { language: "xyz" },
        { limit: 10, offset: 0 }
      );

      expect(result).toEqual({ nodes: [], total: 0 });
    });
  });
});
