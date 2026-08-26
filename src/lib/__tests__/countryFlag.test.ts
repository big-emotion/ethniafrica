import { describe, expect, it } from "vitest";
import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";
import {
  ALPHA3_TO_ALPHA2,
  COUNTRIES_WITHOUT_ISO_FLAG,
  flagFromISO3,
  NATURAL_EARTH_ALIASES,
  NEUTRAL_FLAG,
  regionalIndicators,
} from "@/lib/countryFlag";

describe("countryFlag", () => {
  // @req REQ-116
  it("turns an alpha-3 code into its regional-indicator flag", () => {
    expect(flagFromISO3("NGA")).toBe("🇳🇬");
    expect(flagFromISO3("ZAF")).toBe("🇿🇦");
    expect(flagFromISO3("CIV")).toBe("🇨🇮");
  });

  // @req REQ-116
  it("accepts lowercase input", () => {
    expect(flagFromISO3("nga")).toBe(flagFromISO3("NGA"));
  });

  // @req REQ-116
  it("returns the neutral flag for a code it does not know", () => {
    // The family footprint ranks whatever the corpus hands it; an unmapped
    // code must degrade to a placeholder rather than to an empty cell that
    // silently collapses the ranking's flag column.
    expect(flagFromISO3("XXX")).toBe("🏳");
    expect(flagFromISO3("")).toBe("🏳");
  });

  // @req REQ-116
  it("maps every country the admin-0 asset can draw, bar the coded exception", () => {
    // The footprint ranking renders one flag per country the globe tinted.
    // A country drawable but unmapped would show a placeholder next to a real
    // shape — so the two tables have to stay in step.
    const unmapped = Object.keys(AFRICA_ADMIN0).filter(
      (code) => flagFromISO3(code) === NEUTRAL_FLAG
    );
    expect(unmapped).toEqual([...COUNTRIES_WITHOUT_ISO_FLAG]);
  });

  // @req REQ-116
  it("resolves the asset's Natural Earth codes onto ISO flags", () => {
    // The admin-0 asset spells these two Natural Earth's way; the corpus spells
    // them ISO's way. Both have to reach the same flag.
    expect(flagFromISO3("SAH")).toBe(flagFromISO3("ESH"));
    expect(flagFromISO3("SDS")).toBe(flagFromISO3("SSD"));
    expect(flagFromISO3("SSD")).toBe("🇸🇸");
  });

  // @req REQ-116
  it("gives Somaliland the neutral flag rather than Somalia's", () => {
    // Somaliland has no ISO 3166-1 code and no emoji flag. Borrowing Somalia's
    // would make the page assert a sovereignty claim; the neutral flag reports
    // the true state, which is that no code exists.
    expect(flagFromISO3("SOL")).toBe(NEUTRAL_FLAG);
    expect(flagFromISO3("SOL")).not.toBe(flagFromISO3("SOM"));
  });

  // @req REQ-116
  it("keeps aliases pointing at codes the ISO table actually holds", () => {
    const dangling = Object.entries(NATURAL_EARTH_ALIASES).filter(
      ([, iso]) => !ALPHA3_TO_ALPHA2[iso]
    );
    expect(dangling).toEqual([]);
  });

  // @req REQ-116
  it("holds only well-formed alpha-2 values", () => {
    const malformed = Object.entries(ALPHA3_TO_ALPHA2).filter(
      ([iso3, alpha2]) => !/^[A-Z]{3}$/.test(iso3) || !/^[A-Z]{2}$/.test(alpha2)
    );
    expect(malformed).toEqual([]);
  });

  // @req REQ-116
  it("never maps two countries onto the same flag", () => {
    const alpha2s = Object.values(ALPHA3_TO_ALPHA2);
    expect(new Set(alpha2s).size).toBe(alpha2s.length);
  });

  // @req REQ-116
  it("builds a flag from any two-letter code", () => {
    expect(regionalIndicators("NG")).toBe("🇳🇬");
  });
});
