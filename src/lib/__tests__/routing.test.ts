import { describe, expect, it } from "vitest";

import { getCountryRoute, getFamilyRoute } from "@/lib/routing";

describe("entity routes (ContextTriad, ETNI-818)", () => {
  // @req REQ-091
  it("builds a localized country fiche href", () => {
    expect(getCountryRoute("fr", "NGA")).toBe("/fr/pays/NGA");
  });

  // @req REQ-091
  it("builds a localized language-family fiche href", () => {
    expect(getFamilyRoute("fr", "FLG_NIGER_CONGO")).toBe(
      "/fr/familles/FLG_NIGER_CONGO"
    );
  });
});
