import { describe, it, expect, beforeEach } from "vitest";
import { listCountriesHandler, getCountryHandler } from "../countries";
import { clearCountryCache } from "@/lib/afrik/loaders/countryLoader";

/**
 * TDD Phase: RED
 * Test: Countries Handler - API handlers for countries
 */
describe("Countries Handler", () => {
  beforeEach(() => {
    clearCountryCache();
  });

  describe("listCountriesHandler", () => {
    it("should return paginated countries with metadata", async () => {
      const response = await listCountriesHandler(1, 5);

      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.meta).toBeDefined();
      expect(response.meta?.total).toBeGreaterThan(0);
      expect(response.meta?.page).toBe(1);
      expect(response.meta?.perPage).toBe(5);
    });

    it("should handle default pagination", async () => {
      const response = await listCountriesHandler();

      expect(response.meta?.page).toBe(1);
      expect(response.meta?.perPage).toBe(20);
    });
  });

  describe("getCountryHandler", () => {
    it("should return a country by ISO code", async () => {
      const country = await getCountryHandler("ZWE");

      expect(country).toBeDefined();
      expect(country?.id).toBe("ZWE");
    });

    it("should return null for non-existent country", async () => {
      const country = await getCountryHandler("XXX");

      expect(country).toBeNull();
    });
  });
});
