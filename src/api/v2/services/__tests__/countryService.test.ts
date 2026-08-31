import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCountries,
  getCountryById,
  getCountryIndex,
} from "../countryService";

vi.mock("@/lib/supabase/queries/afrik/countries", () => ({
  getAllAfrikCountries: vi.fn(),
  getAfrikCountryById: vi.fn(),
}));

import {
  getAllAfrikCountries,
  getAfrikCountryById,
} from "@/lib/supabase/queries/afrik/countries";

describe("Country Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCountries", () => {
    // @req REQ-019
    it("should return paginated countries", async () => {
      const mockCountries = Array.from({ length: 10 }, (_, i) => ({
        id: `COU${i}`,
        nameFr: `Country ${i}`,
        content: {},
      }));

      vi.mocked(getAllAfrikCountries).mockResolvedValue(mockCountries);

      const result = await getCountries(1, 5);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(5);
      expect(result.total).toBe(10);
      expect(getAllAfrikCountries).toHaveBeenCalled();
    });

    it("should handle pagination correctly", async () => {
      const mockCountries = Array.from({ length: 10 }, (_, i) => ({
        id: `COU${i}`,
        nameFr: `Country ${i}`,
        content: {},
      }));

      vi.mocked(getAllAfrikCountries).mockResolvedValue(mockCountries);

      const page1 = await getCountries(1, 2);
      vi.mocked(getAllAfrikCountries).mockResolvedValue(mockCountries);
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

      vi.mocked(getAllAfrikCountries).mockResolvedValue(mockCountries);

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

      vi.mocked(getAfrikCountryById).mockResolvedValue(mockCountry);

      const country = await getCountryById("ZWE");

      expect(country).toBeDefined();
      expect(country?.id).toBe("ZWE");
      expect(country?.nameFr).toBe("Zimbabwe");
    });

    it("should return null for non-existent country", async () => {
      vi.mocked(getAfrikCountryById).mockResolvedValue(null);

      const country = await getCountryById("XXX");

      expect(country).toBeNull();
    });
  });

  describe("getCountryIndex", () => {
    // @req REQ-116
    it("lists every country the corpus holds a fiche for, id and name only", async () => {
      vi.mocked(getAllAfrikCountries).mockResolvedValue([
        { id: "NGA", nameFr: "Nigeria", content: {} },
        { id: "COM", nameFr: "Comores", content: {} },
      ]);

      const index = await getCountryIndex();

      // COM has no admin-0 outline; the index is drawn from the corpus, so
      // it is listed all the same.
      expect(index).toEqual([
        { id: "NGA", nameFr: "Nigeria" },
        { id: "COM", nameFr: "Comores" },
      ]);
    });
  });
});
