import { describe, expect, it } from "vitest";

import { ficheHasTranslation } from "@/lib/seo/translationParity";

/**
 * The seam the fiche indexing reads through. Until ETNI-1826 lands the
 * translation records, the only locale a fiche exists in is the one the
 * corpus is written in.
 */
describe("ficheHasTranslation", () => {
  // @req REQ-141
  it("answers yes for the locale the corpus is written in", async () => {
    expect(await ficheHasTranslation("people", "PPL_YORUBA", "fr")).toBe(true);
  });

  // @req REQ-141
  it("answers no for English until a translation record can be read", async () => {
    expect(await ficheHasTranslation("people", "PPL_YORUBA", "en")).toBe(false);
  });
});
