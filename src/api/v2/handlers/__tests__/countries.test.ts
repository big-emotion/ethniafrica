import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/v2/services/countryService", () => ({
  getCountries: vi.fn(),
  getCountryById: vi.fn(),
}));

import {
  listCountriesHandler,
  getCountryHandler,
} from "@/api/v2/handlers/countries";
import { getCountries, getCountryById } from "@/api/v2/services/countryService";
import { API_ATTRIBUTION } from "@/api/v2/utils/response";
import type { Country } from "@/types/afrik";

const ZIMBABWE: Country = {
  id: "ZWE",
  nameFr: "Zimbabwe",
  content: {},
};

const ENVELOPE_META = {
  license: "CC-BY-SA-4.0",
  attribution: API_ATTRIBUTION,
};

describe("Countries Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listCountriesHandler", () => {
    // @req REQ-084
    it("returns countries in the canonical envelope with pagination metadata", async () => {
      vi.mocked(getCountries).mockResolvedValue({
        data: [ZIMBABWE],
        total: 54,
      });

      const response = await listCountriesHandler(1, 5);

      expect(getCountries).toHaveBeenCalledWith(1, 5);
      expect(response).toEqual({
        data: [ZIMBABWE],
        meta: {
          ...ENVELOPE_META,
          pagination: {
            total: 54,
            page: 1,
            perPage: 5,
            totalPages: 11,
          },
        },
        errors: [],
      });
    });

    // @req REQ-084
    it("should handle default pagination", async () => {
      vi.mocked(getCountries).mockResolvedValue({ data: [], total: 0 });

      const response = await listCountriesHandler();

      expect(getCountries).toHaveBeenCalledWith(undefined, undefined);
      expect(response.data).toEqual([]);
      expect(response.meta.pagination).toEqual({
        total: 0,
        page: 1,
        perPage: 20,
        totalPages: 0,
      });
      expect(response.errors).toEqual([]);
    });
  });

  describe("getCountryHandler", () => {
    // @req REQ-084
    it("returns a country in the canonical envelope", async () => {
      vi.mocked(getCountryById).mockResolvedValue(ZIMBABWE);

      const response = await getCountryHandler("ZWE");

      expect(getCountryById).toHaveBeenCalledWith("ZWE");
      expect(response).toEqual({
        data: ZIMBABWE,
        meta: ENVELOPE_META,
        errors: [],
      });
    });

    // @req REQ-084
    it("should return null for non-existent country", async () => {
      vi.mocked(getCountryById).mockResolvedValue(null);

      const country = await getCountryHandler("XXX");

      expect(country).toBeNull();
    });
  });
});
