import { expect, it } from "vitest";

import { ficheSourceLabel } from "@/lib/afrik/ficheSourceLabel";

// @req REQ-092
it("hides an old source-title tier suffix while stored fiches are refreshed", () => {
  expect(
    ficheSourceLabel({
      title: "UNSD M49 – Codes normalisés – [tier 1]",
      url: "https://unstats.un.org/unsd/methodology/m49/",
      tier: "official",
    })
  ).toBe("UNSD M49 – Codes normalisés");
});
