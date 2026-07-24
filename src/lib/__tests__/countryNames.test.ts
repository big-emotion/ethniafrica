import { describe, expect, it } from "vitest";

import { getFrenchCountryCommonName } from "@/lib/countryNames";

describe("getFrenchCountryCommonName", () => {
  // @req REQ-001
  it("derives the canonical French common name from an ISO alpha-3 code", () => {
    expect(
      getFrenchCountryCommonName(
        "ZAF",
        "République d'Afrique du Sud (Republic of South Africa)"
      )
    ).toBe("Afrique du Sud");
  });

  // @req REQ-001
  it("maps supported ISO alpha-3 codes before resolving their display name", () => {
    expect(getFrenchCountryCommonName("BFA", "Burkina Faso")).toBe(
      "Burkina Faso"
    );
  });

  // @req REQ-001
  it("returns the official name when the ISO alpha-3 code is unknown", () => {
    expect(getFrenchCountryCommonName("XXX", "République de Test")).toBe(
      "République de Test"
    );
  });
});
