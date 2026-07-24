import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/countryService", () => ({
  getCountries: vi.fn(),
  getCountryById: vi.fn(),
}));

import { getCountries, getCountryById } from "../../services/countryService";
import { listCountriesHandler, getCountryHandler } from "../countries";

const ZIMBABWE = { id: "ZWE", name: "Zimbabwe" } as any;

describe("Countries Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listCountriesHandler", () => {
    it("should return paginated countries with metadata", async () => {
      vi.mocked(getCountries).mockResolvedValue({
        data: [ZIMBABWE],
        total: 54,
      });

      const response = await listCountriesHandler(1, 5);

      expect(getCountries).toHaveBeenCalledWith(1, 5);
      expect(response.data).toEqual([ZIMBABWE]);
      expect(response.meta).toEqual({
        total: 54,
        page: 1,
        perPage: 5,
        totalPages: 11,
      });
    });

    it("should handle default pagination", async () => {
      vi.mocked(getCountries).mockResolvedValue({ data: [], total: 0 });

      const response = await listCountriesHandler();

      expect(getCountries).toHaveBeenCalledWith(undefined, undefined);
      expect(response.data).toEqual([]);
      expect(response.meta?.page).toBe(1);
      expect(response.meta?.perPage).toBe(20);
    });
  });

  describe("getCountryHandler", () => {
    it("should return a country by ISO code", async () => {
      vi.mocked(getCountryById).mockResolvedValue(ZIMBABWE);

      const country = await getCountryHandler("ZWE");

      expect(getCountryById).toHaveBeenCalledWith("ZWE");
      expect(country?.id).toBe("ZWE");
    });

    it("should return null for non-existent country", async () => {
      vi.mocked(getCountryById).mockResolvedValue(null);

      const country = await getCountryHandler("XXX");

      expect(country).toBeNull();
    });
  });
});
