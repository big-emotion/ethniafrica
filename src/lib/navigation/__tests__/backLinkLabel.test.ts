import { describe, expect, it } from "vitest";

import { backLinkLabel } from "@/lib/navigation/deriveTrail";
import { getTranslation } from "@/lib/translations";

/**
 * The return link names where the reader came from, in the language of the
 * page they are on. It used to read the French dictionary from inside its
 * body, so an English country fiche would have offered « Retour à Yoruba ».
 */
describe("backLinkLabel", () => {
  // @req REQ-091
  it("prefixes the label in the page's own locale", () => {
    expect(backLinkLabel("fr", "Yoruba")).toBe(
      `${getTranslation("fr").trail.backTo} Yoruba`
    );
    expect(backLinkLabel("en", "Yoruba")).toBe(
      `${getTranslation("en").trail.backTo} Yoruba`
    );
  });

  // @req REQ-091
  it("differs between the two locales, so the dictionary is really read", () => {
    expect(backLinkLabel("en", "Yoruba")).not.toBe(
      backLinkLabel("fr", "Yoruba")
    );
  });
});
