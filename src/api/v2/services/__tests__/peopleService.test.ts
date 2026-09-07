import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPeoples,
  getPeopleById,
  getPeoplesByLanguageFamily,
  getPeopleNameIndex,
} from "../peopleService";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/supabase/queries/afrik/translations", () => ({
  getAfrikTranslation: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getPaginatedAfrikPeoples: vi.fn(),
  getAfrikPeopleById: vi.fn(),
  getAfrikPeoplesByLanguageFamily: vi.fn(),
}));

import {
  getPaginatedAfrikPeoples,
  getAfrikPeopleById,
  getAfrikPeoplesByLanguageFamily,
} from "@/lib/supabase/queries/afrik/peoples";
import { getAfrikTranslation } from "@/lib/supabase/queries/afrik/translations";

describe("People Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPeoples", () => {
    // @req REQ-033
    it("should delegate pagination and filters to the database query", async () => {
      const mockPeoples = [
        {
          id: "PPL_SHONA",
          nameMain: "Shona",
          languageFamilyId: "FLG_BANTU",
          currentCountries: ["ZWE"],
          content: {},
        },
      ];
      vi.mocked(getPaginatedAfrikPeoples).mockResolvedValue({
        data: mockPeoples,
        total: 924,
      });

      const filters = {
        search: "shona",
        initialLetter: "S",
        languageFamilyId: "FLG_BANTU",
      };
      const result = await getPeoples(3, 25, filters);

      expect(getPaginatedAfrikPeoples).toHaveBeenCalledTimes(1);
      expect(getPaginatedAfrikPeoples).toHaveBeenCalledWith(3, 25, filters);
      expect(result).toEqual({ data: mockPeoples, total: 924 });
    });
  });

  describe("getPeopleById", () => {
    // @req REQ-019
    it("should return a people by PPL_ ID", async () => {
      const mockPeople = {
        id: "PPL_SHONA",
        nameMain: "Shona",
        languageFamilyId: "FLG_BANTU",
        currentCountries: ["ZWE"],
        content: {},
      };

      vi.mocked(getAfrikPeopleById).mockResolvedValue(mockPeople);

      const people = await getPeopleById("PPL_SHONA");

      expect(people).toBeDefined();
      expect(people?.id).toBe("PPL_SHONA");
      expect(people?.nameMain).toBe("Shona");
    });

    // @req REQ-019
    it("should return null for non-existent people", async () => {
      vi.mocked(getAfrikPeopleById).mockResolvedValue(null);

      const people = await getPeopleById("PPL_NONEXISTENT");

      expect(people).toBeNull();
    });

    // @req REQ-142
    it("overlays the English record and carries its provenance when asked for en", async () => {
      vi.mocked(getAfrikPeopleById).mockResolvedValue({
        id: "PPL_SHONA",
        nameMain: "Shona",
        languageFamilyId: "FLG_BANTU",
        currentCountries: ["ZWE"],
        content: { origins: { ancientOrigins: "Les Shona…" } },
      });
      vi.mocked(getAfrikTranslation).mockResolvedValue({
        entityType: "people",
        entityId: "PPL_SHONA",
        lang: "en",
        content: { content: { origins: { ancientOrigins: "The Shona…" } } },
        translationKind: "machine",
        translatedAt: "2026-09-05T10:00:00.000Z",
        sourceHash: "d".repeat(64),
        fieldHashes: {},
        reviewRequired: [],
      });

      const people = await getPeopleById("PPL_SHONA", "en");

      expect(getAfrikTranslation).toHaveBeenCalledWith(
        "people",
        "PPL_SHONA",
        "en"
      );
      expect(people?.content.origins?.ancientOrigins).toBe("The Shona…");
      expect(people?.nameMain).toBe("Shona");
      expect(people?.translation).toMatchObject({ kind: "machine" });
    });

    // @req REQ-142
    it("never queries a translation for the authored locale", async () => {
      vi.mocked(getAfrikPeopleById).mockResolvedValue({
        id: "PPL_SHONA",
        nameMain: "Shona",
        languageFamilyId: "FLG_BANTU",
        currentCountries: ["ZWE"],
        content: {},
      });

      await getPeopleById("PPL_SHONA");

      expect(getAfrikTranslation).not.toHaveBeenCalled();
    });
  });

  describe("getPeoplesByLanguageFamily", () => {
    // @req REQ-019
    it("should return peoples by language family", async () => {
      const mockPeoples = [
        {
          id: "PPL_SHONA",
          nameMain: "Shona",
          languageFamilyId: "FLG_BANTU",
          currentCountries: ["ZWE"],
          content: {},
        },
      ];

      vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue(mockPeoples);

      const peoples = await getPeoplesByLanguageFamily("FLG_BANTU");

      expect(Array.isArray(peoples)).toBe(true);
      expect(peoples.length).toBe(1);
      expect(peoples[0].languageFamilyId).toBe("FLG_BANTU");
    });
  });

  describe("getPeopleNameIndex", () => {
    /**
     * A PostgREST builder stub that resolves on `range()` — the index is read
     * with an explicit window, so a stub resolving on `select()` would never
     * be awaited by the code under test.
     */
    function indexTable(response: {
      data?: Array<Record<string, unknown>> | null;
      error?: { message: string } | null;
    }) {
      type RangeRead = (
        start: number,
        end: number
      ) => Promise<{
        data: Array<Record<string, unknown>> | null;
        error: { message: string } | null;
      }>;
      const range = vi.fn<RangeRead>(() =>
        Promise.resolve({
          data: response.data ?? null,
          error: response.error ?? null,
        })
      );
      const select = vi.fn();
      const builder = { select, range };
      select.mockReturnValue(builder);
      return builder;
    }

    // @req REQ-150
    it("carries every people's id and name, and nothing else", async () => {
      fromMock.mockReturnValue(
        indexTable({
          data: [
            { id: "PPL_SHONA", name_main: "Shona" },
            { id: "PPL_BAMANA", name_main: "Bamana" },
          ],
        })
      );

      const index = await getPeopleNameIndex();

      expect(index).toEqual([
        { id: "PPL_SHONA", nameMain: "Shona" },
        { id: "PPL_BAMANA", nameMain: "Bamana" },
      ]);
    });

    // @req REQ-150
    it("skips a people whose name_main is missing or blank", async () => {
      fromMock.mockReturnValue(
        indexTable({
          data: [
            { id: "PPL_SHONA", name_main: "Shona" },
            { id: "PPL_NAMELESS", name_main: null },
            { id: "PPL_BLANK", name_main: "   " },
          ],
        })
      );

      const index = await getPeopleNameIndex();

      expect(index.map((entry) => entry.id)).toEqual(["PPL_SHONA"]);
    });

    // @req REQ-150
    it("reads a window wider than the silent 1000-row cap", async () => {
      const table = indexTable({ data: [] });
      fromMock.mockReturnValue(table);

      await getPeopleNameIndex();

      // Without an explicit range PostgREST truncates at 1000 rows and reports
      // no error; the corpus holds 776 peoples today.
      expect(table.range).toHaveBeenCalledTimes(1);
      const [start, end] = table.range.mock.calls[0];
      expect(start).toBe(0);
      expect(end).toBeGreaterThan(1000);
    });

    // @req REQ-150
    it("degrades to an empty index when the read fails", async () => {
      fromMock.mockReturnValue(
        indexTable({ data: null, error: { message: "connection reset" } })
      );

      // The fiche renders its chips as plain text without the index, so a
      // failed read costs links rather than the chapter.
      await expect(getPeopleNameIndex()).resolves.toEqual([]);
    });
  });
});
