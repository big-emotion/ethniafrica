import { describe, expect, it } from "vitest";

import { revealProvenanceFr } from "@/lib/games/revealProvenance";
import { MERCATOR_PROVENANCE_PATH } from "@/lib/games/rounds/mercatorRound";
import { TEMPLATE_FIELD_PATHS } from "@/lib/quiz/segmentPolicy";

describe("revealProvenanceFr", () => {
  /**
   * The gate that keeps the raw path from coming back. A template added
   * without a French wording used to fall through to printing
   * `content.culture.majorRites` at the player; now it fails here instead,
   * which is the only moment anyone is still looking.
   */
  // @req REQ-120
  it("words every field path a quiz template can emit", () => {
    const unworded = Object.entries(TEMPLATE_FIELD_PATHS)
      .filter(([, fieldPath]) => revealProvenanceFr(fieldPath) === null)
      .map(([templateId]) => templateId);

    expect(unworded).toEqual([]);
  });

  // @req REQ-120
  it("words the atlas outlines Mercator measures itself against", () => {
    expect(revealProvenanceFr(MERCATOR_PROVENANCE_PATH)).toBe(
      "les tracés de frontières publiés par l'atlas"
    );
  });

  /**
   * Never a fallback that shows the path. A round whose provenance has no
   * wording says nothing rather than saying it in schema — the reveal drops
   * the line, and the test above is what stops that from going unnoticed.
   */
  // @req REQ-120
  it("returns nothing at all for a path it cannot word", () => {
    expect(revealProvenanceFr("content.somethingNobodyWorded")).toBeNull();
  });

  // @req REQ-120
  it("reads as the tail of a sentence, so the reveal can introduce it", () => {
    expect(revealProvenanceFr("content.appellations.selfAppellation")).toBe(
      "l'auto-appellation déclarée par la fiche"
    );
  });
});
