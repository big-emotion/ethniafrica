import { describe, it, expect } from "vitest";
import { loadCountry, loadAllCountries } from "../countryLoader";

/**
 * TDD Phase: RED
 * Test: Country loader - reads country files from filesystem
 */
describe("Country Loader", () => {
  describe("loadCountry", () => {
    it("should load a country by ISO code", async () => {
      const result = await loadCountry("ZWE");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe("ZWE");
      expect(result.data?.nameFr).toContain("Zimbabwe");
    });

    it("should return error for non-existent country", async () => {
      const result = await loadCountry("XXX");

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].type).toBe("parse_failure");
    });

    it("should cache loaded countries", async () => {
      const result1 = await loadCountry("ZWE");
      const result2 = await loadCountry("ZWE");

      // Should return same reference (cached)
      expect(result1.data).toBe(result2.data);
    });
  });

  describe("loadAllCountries", () => {
    it("should load all country files", async () => {
      const countries = await loadAllCountries();

      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(0);

      // Check that we have the expected countries
      const zimbabwe = countries.find((c) => c.id === "ZWE");
      expect(zimbabwe).toBeDefined();
    });

    it("should return valid Country objects", async () => {
      const countries = await loadAllCountries();

      for (const country of countries.slice(0, 5)) {
        expect(country).toHaveProperty("id");
        expect(country).toHaveProperty("nameFr");
        expect(country).toHaveProperty("content");
        expect(country.id).toMatch(/^[A-Z]{3}$/);
      }
    });

    // ETNI-1290: nameFr is the name of ordinary use, nameOfficial the
    // protocol name — see docs/adr/0008-country-namefr-common-name.md.
    // @req REQ-033
    it("should surface nameFr as the name of ordinary use, distinct from nameOfficial, for every country", async () => {
      const countries = await loadAllCountries();

      for (const country of countries) {
        expect(country.nameFr).toBeTruthy();
        if (country.nameOfficial) {
          expect(country.nameFr).not.toBe(country.nameOfficial);
        }
      }
    });

    // @req REQ-033
    it("should surface the documented ADR-0008 exceptions correctly", async () => {
      const countries = await loadAllCountries();
      const byId = Object.fromEntries(countries.map((c) => [c.id, c]));

      expect(byId.NGA?.nameFr).toBe("Nigeria");
      expect(byId.COD?.nameFr).toBe("République démocratique du Congo");
      expect(byId.COG?.nameFr).toBe("Congo");
      // The two Congos must stay distinguishable without extra display logic.
      expect(byId.COD?.nameFr).not.toBe(byId.COG?.nameFr);
    });

    // ETNI-1857: an English reader typing "Chad" reached nothing, because the
    // corpus held only "Tchad". `nameEn` is corpus data (class 1, REQ-143),
    // not a display-time lookup.
    // @req REQ-143
    it("should carry an English name of ordinary use on every country", async () => {
      const countries = await loadAllCountries();

      expect(countries).toHaveLength(54);
      for (const country of countries) {
        expect(country.nameEn, country.id).toMatch(/\S/);
      }
    });

    // The convention (docs/editorial/translation-classes.md): the state's own
    // English usage, not the Natural Earth wording the atlas asset carries.
    // @req REQ-143
    it("should follow the state's own English usage where it differs from the cartographic asset", async () => {
      const countries = await loadAllCountries();
      const byId = Object.fromEntries(countries.map((c) => [c.id, c]));

      expect(byId.TCD?.nameEn).toBe("Chad");
      expect(byId.CIV?.nameEn).toBe("Côte d'Ivoire");
      expect(byId.CPV?.nameEn).toBe("Cabo Verde");
      expect(byId.SWZ?.nameEn).toBe("Eswatini");
      expect(byId.GMB?.nameEn).toBe("The Gambia");
      expect(byId.COD?.nameEn).toBe("Democratic Republic of the Congo");
      expect(byId.COG?.nameEn).toBe("Republic of the Congo");
      expect(byId.ZAF?.nameEn).toBe("South Africa");
    });
  });
});
