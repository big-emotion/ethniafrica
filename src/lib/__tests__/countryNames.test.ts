import { describe, expect, it } from "vitest";

import { flagFromISO3, NEUTRAL_FLAG } from "@/lib/countryFlag";
import {
  getCountryCommonName,
  getFrenchCountryCommonName,
} from "@/lib/countryNames";
import { ALPHA3_TO_ALPHA2 } from "@/lib/isoCountryCodes";

describe("getFrenchCountryCommonName", () => {
  // @req REQ-001
  it("derives French names from ISO alpha-3 codes", () => {
    expect(getFrenchCountryCommonName("ZAF", "Republic of South Africa")).toBe(
      "Afrique du Sud"
    );
    expect(getFrenchCountryCommonName("SDN", "Republic of the Sudan")).toBe(
      "Soudan"
    );
  });

  // @req REQ-001
  it("maps supported ISO codes before resolving display names", () => {
    expect(getFrenchCountryCommonName("BFA", "Burkina Faso")).toBe(
      "Burkina Faso"
    );
  });

  // @req REQ-001
  it("uses the editorial country name when CLDR keeps a disambiguation label", () => {
    expect(
      getFrenchCountryCommonName("COD", "République démocratique du Congo")
    ).toBe("République démocratique du Congo");
  });

  // @req REQ-001
  it("returns the official name for an unknown code", () => {
    expect(getFrenchCountryCommonName("XXX", "République de Test")).toBe(
      "République de Test"
    );
  });
});

describe("getCountryCommonName", () => {
  // @req REQ-140
  it("names the country in the requested locale", () => {
    expect(getCountryCommonName("en", "ZAF", "Republic of South Africa")).toBe(
      "South Africa"
    );
    expect(getCountryCommonName("fr", "ZAF", "Republic of South Africa")).toBe(
      "Afrique du Sud"
    );
    expect(getCountryCommonName("en", "SDN", "Republic of the Sudan")).toBe(
      "Sudan"
    );
  });

  // @req REQ-140
  it("keeps the declared name when the atlas does not map the code", () => {
    expect(getCountryCommonName("en", "XXX", "Republic of Test")).toBe(
      "Republic of Test"
    );
  });

  // @req REQ-140
  it("prefers the editorial name over CLDR's city disambiguation", () => {
    expect(getCountryCommonName("fr", "COD", "RDC")).toBe(
      "République démocratique du Congo"
    );
    expect(getCountryCommonName("en", "COD", "DRC")).toBe(
      "Democratic Republic of the Congo"
    );
  });

  // Western Sahara, Mayotte and Réunion once had a flag and no localized name:
  // the flag and the name read two copies of the ISO table, and only one of
  // them had been extended. A flag with no name beside it is the drift.
  // @req REQ-140
  it("names every country that has a flag", () => {
    const declared = "declared name";
    const flaggedButUnnamed = Object.keys(ALPHA3_TO_ALPHA2).filter(
      (isoAlpha3) =>
        flagFromISO3(isoAlpha3) !== NEUTRAL_FLAG &&
        (["fr", "en"] as const).some(
          (lang) => getCountryCommonName(lang, isoAlpha3, declared) === declared
        )
    );
    expect(flaggedButUnnamed).toEqual([]);
  });

  // @req REQ-140
  it("matches the French-only compatibility accessor", () => {
    expect(getFrenchCountryCommonName("CIV", "Côte d'Ivoire")).toBe(
      getCountryCommonName("fr", "CIV", "Côte d'Ivoire")
    );
  });
});
