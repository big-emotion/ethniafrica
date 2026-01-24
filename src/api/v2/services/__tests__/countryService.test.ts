import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCountries, getCountryById } from "../countryService";

vi.mock("@/lib/supabase/queries/afrik/countries", () => ({
  getAllAfrikCountries: vi.fn(),
  getAfrikCountryById: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
}));

import {
  getAllAfrikCountries,
  getAfrikCountryById,
} from "@/lib/supabase/queries/afrik/countries";

/**
 * TDD Phase: RED
 * Test: Country Service - business logic for countries
 */
describe("Country Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCountries", () => {
    it("should return paginated countries", async () => {
      const mockCountries = Array.from({ length: 10 }, (_, i) => ({
        id: `COU${i}`,
        nameFr: `Country ${i}`,
        content: {},
      }));

      (getAllAfrikCountries as any).mockResolvedValue(mockCountries);

      const result = await getCountries(1, 5);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(5);
      expect(result.total).toBe(10);
    });

    it("should handle pagination correctly", async () => {
      const mockCountries = Array.from({ length: 10 }, (_, i) => ({
        id: `COU${i}`,
        nameFr: `Country ${i}`,
        content: {},
      }));

      (getAllAfrikCountries as any).mockResolvedValue(mockCountries);

      const page1 = await getCountries(1, 2);
      const page2 = await getCountries(2, 2);

      expect(page1.data.length).toBe(2);
      expect(page2.data.length).toBe(2);
      expect(page1.data[0]?.id).not.toBe(page2.data[0]?.id);
    });

    it("should return all countries when perPage is large", async () => {
      const mockCountries = Array.from({ length: 10 }, (_, i) => ({
        id: `COU${i}`,
        nameFr: `Country ${i}`,
        content: {},
      }));

      (getAllAfrikCountries as any).mockResolvedValue(mockCountries);

      const result = await getCountries(1, 1000);

      expect(result.data.length).toBe(result.total);
    });
  });

  describe("getCountryById", () => {
    it("should return a country by ISO code", async () => {
      const mockCountry = {
        id: "ZWE",
        nameFr: "Zimbabwe",
        content: {},
      };

      (getAfrikCountryById as any).mockResolvedValue(mockCountry);

      const country = await getCountryById("ZWE");

      expect(country).toBeDefined();
      expect(country?.id).toBe("ZWE");
      expect(country?.nameFr).toBe("Zimbabwe");
    });

    it("should return null for non-existent country", async () => {
      (getAfrikCountryById as any).mockResolvedValue(null);

      const country = await getCountryById("XXX");

      expect(country).toBeNull();
    });
  });
});
