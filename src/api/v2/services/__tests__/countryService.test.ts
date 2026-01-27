import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCountries, getCountryById } from "../countryService";

vi.mock("@/lib/supabase/queries/afrik/countries", () => ({
  getAllAfrikCountries: vi.fn(),
  getAfrikCountryById: vi.fn(),
}));

import {
  getAllAfrikCountries,
  getAfrikCountryById,
} from "@/lib/supabase/queries/afrik/countries";

// Mock global fetch
global.fetch = vi.fn();

/**
 * TDD Phase: RED
 * Test: Country Service - business logic for countries
 */
describe("Country Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    (global.fetch as any).mockClear();
  });

  describe("getCountries", () => {
    it("should return paginated countries", async () => {
      const mockCountries = Array.from({ length: 10 }, (_, i) => ({
        id: `COU${i}`,
        nameFr: `Country ${i}`,
        content: {},
      }));

      // Mock fetch response for internal route
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCountries,
      });

      const result = await getCountries(1, 5);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(5);
      expect(result.total).toBe(10);

      // Verify fetch was called with correct URL and tags
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/internal/countries"),
        expect.objectContaining({
          next: expect.objectContaining({
            tags: ["afrik-countries"],
            revalidate: 3600,
          }),
        })
      );
    });

    it("should handle pagination correctly", async () => {
      const mockCountries = Array.from({ length: 10 }, (_, i) => ({
        id: `COU${i}`,
        nameFr: `Country ${i}`,
        content: {},
      }));

      // Mock fetch response for internal route
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockCountries,
      });

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

      // Mock fetch response for internal route
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCountries,
      });

      const result = await getCountries(1, 1000);

      expect(result.data.length).toBe(result.total);
    });

    it("should fallback to direct query if fetch fails", async () => {
      const mockCountries = Array.from({ length: 10 }, (_, i) => ({
        id: `COU${i}`,
        nameFr: `Country ${i}`,
        content: {},
      }));

      // Mock fetch to fail
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));
      (getAllAfrikCountries as any).mockResolvedValue(mockCountries);

      const result = await getCountries(1, 5);

      expect(result.data.length).toBe(5);
      expect(result.total).toBe(10);
      // Verify fallback was used
      expect(getAllAfrikCountries).toHaveBeenCalled();
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
