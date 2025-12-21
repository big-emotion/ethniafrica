import { describe, it, expect, beforeEach, vi } from "vitest";
import { migrateAfrikToDatabase } from "../migrateAfrikToDatabase";
import { loadAllLanguageFamilies } from "@/lib/afrik/loaders/languageFamilyLoader";
import { loadAllPeoples } from "@/lib/afrik/loaders/peopleLoader";
import { loadAllCountries } from "@/lib/afrik/loaders/countryLoader";
import { createAdminClient } from "@/lib/supabase/admin";

// Mock the loaders
vi.mock("@/lib/afrik/loaders/languageFamilyLoader");
vi.mock("@/lib/afrik/loaders/peopleLoader");
vi.mock("@/lib/afrik/loaders/countryLoader");
vi.mock("@/lib/supabase/admin");

describe("migrateAfrikToDatabase", () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    upsert: vi.fn(() => Promise.resolve({ error: null })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createAdminClient as any).mockReturnValue(mockSupabase);
  });

  describe("dry-run mode", () => {
    it("should validate data without inserting", async () => {
      const mockFamilies = [
        {
          id: "FLG_BANTU",
          nameFr: "Bantou",
          nameEn: "Bantu",
          content: {},
        },
      ];
      const mockPeoples = [
        {
          id: "PPL_SHONA",
          nameMain: "Shona",
          languageFamilyId: "FLG_BANTU",
          currentCountries: ["ZWE"],
          content: {},
        },
      ];
      const mockCountries = [
        {
          id: "ZWE",
          nameFr: "Zimbabwe",
          content: {},
        },
      ];

      (loadAllLanguageFamilies as any).mockResolvedValue(mockFamilies);
      (loadAllPeoples as any).mockResolvedValue(mockPeoples);
      (loadAllCountries as any).mockResolvedValue(mockCountries);

      const report = await migrateAfrikToDatabase(true);

      expect(report.languageFamilies.total).toBe(1);
      expect(report.languageFamilies.inserted).toBe(0);
      expect(report.peoples.total).toBe(1);
      expect(report.peoples.inserted).toBe(0);
      expect(report.countries.total).toBe(1);
      expect(report.countries.inserted).toBe(0);
      expect(report.relations.total).toBe(1);
      expect(report.relations.inserted).toBe(0);

      // Should not call upsert in dry-run
      expect(mockSupabase.upsert).not.toHaveBeenCalled();
    });
  });

  describe("insertion mode", () => {
    it("should insert language families successfully", async () => {
      const mockFamilies = [
        {
          id: "FLG_BANTU",
          nameFr: "Bantou",
          nameEn: "Bantu",
          content: {},
        },
      ];

      (loadAllLanguageFamilies as any).mockResolvedValue(mockFamilies);
      (loadAllPeoples as any).mockResolvedValue([]);
      (loadAllCountries as any).mockResolvedValue([]);

      const report = await migrateAfrikToDatabase(false);

      expect(report.languageFamilies.inserted).toBe(1);
      expect(report.languageFamilies.errors).toHaveLength(0);
      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it("should handle insertion errors gracefully", async () => {
      const mockFamilies = [
        {
          id: "FLG_BANTU",
          nameFr: "Bantou",
          content: {},
        },
      ];

      (loadAllLanguageFamilies as any).mockResolvedValue(mockFamilies);
      (loadAllPeoples as any).mockResolvedValue([]);
      (loadAllCountries as any).mockResolvedValue([]);

      mockSupabase.upsert.mockResolvedValueOnce({
        error: { message: "Duplicate key" },
      });

      const report = await migrateAfrikToDatabase(false);

      expect(report.languageFamilies.inserted).toBe(0);
      expect(report.languageFamilies.errors.length).toBeGreaterThan(0);
    });

    it("should insert in correct order (families → peoples → countries → relations)", async () => {
      const mockFamilies = [{ id: "FLG_BANTU", nameFr: "Bantou", content: {} }];
      const mockPeoples = [
        {
          id: "PPL_SHONA",
          nameMain: "Shona",
          languageFamilyId: "FLG_BANTU",
          content: {},
        },
      ];
      const mockCountries = [{ id: "ZWE", nameFr: "Zimbabwe", content: {} }];

      (loadAllLanguageFamilies as any).mockResolvedValue(mockFamilies);
      (loadAllPeoples as any).mockResolvedValue(mockPeoples);
      (loadAllCountries as any).mockResolvedValue(mockCountries);

      await migrateAfrikToDatabase(false);

      // Verify order: families first, then peoples, then countries
      const calls = mockSupabase.upsert.mock.calls;
      expect(calls).toBeDefined();
      expect(calls.length).toBeGreaterThanOrEqual(3);

      const firstCall = calls[0] as any;

      const secondCall = calls[1] as any;

      const thirdCall = calls[2] as any;
      expect(firstCall[0]?.id).toBe("FLG_BANTU");
      expect(secondCall[0]?.id).toBe("PPL_SHONA");
      expect(thirdCall[0]?.id).toBe("ZWE");
    });

    it("should insert relations correctly", async () => {
      const mockPeoples = [
        {
          id: "PPL_SHONA",
          nameMain: "Shona",
          languageFamilyId: "FLG_BANTU",
          currentCountries: ["ZWE", "MOZ"],
          content: {},
        },
      ];

      (loadAllLanguageFamilies as any).mockResolvedValue([]);
      (loadAllPeoples as any).mockResolvedValue(mockPeoples);
      (loadAllCountries as any).mockResolvedValue([]);

      const report = await migrateAfrikToDatabase(false);

      expect(report.relations.total).toBe(2);
      expect(report.relations.inserted).toBe(2);
    });
  });

  describe("error handling", () => {
    it("should handle missing foreign keys", async () => {
      const mockPeoples = [
        {
          id: "PPL_SHONA",
          nameMain: "Shona",
          languageFamilyId: "FLG_NONEXISTENT",
          content: {},
        },
      ];

      (loadAllLanguageFamilies as any).mockResolvedValue([]);
      (loadAllPeoples as any).mockResolvedValue(mockPeoples);
      (loadAllCountries as any).mockResolvedValue([]);

      mockSupabase.upsert.mockResolvedValueOnce({
        error: { message: "Foreign key violation" },
      });

      const report = await migrateAfrikToDatabase(false);

      expect(report.peoples.errors.length).toBeGreaterThan(0);
    });
  });
});
