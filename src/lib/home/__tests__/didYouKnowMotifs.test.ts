import { describe, expect, it } from "vitest";

import {
  DID_YOU_KNOW_MOTIFS,
  drawDidYouKnowMotif,
} from "@/lib/home/didYouKnowMotifs";

describe("drawDidYouKnowMotif", () => {
  // @req REQ-115
  it("keeps the three culturally identified backgrounds equally reachable", () => {
    expect(DID_YOU_KNOW_MOTIFS).toEqual([
      "mande-kora",
      "amazigh-fibula",
      "punu-mukudj",
    ]);

    expect(drawDidYouKnowMotif(() => 0)).toBe("mande-kora");
    expect(drawDidYouKnowMotif(() => 1 / 3 - Number.EPSILON)).toBe(
      "mande-kora"
    );
    expect(drawDidYouKnowMotif(() => 1 / 3)).toBe("amazigh-fibula");
    expect(drawDidYouKnowMotif(() => 2 / 3)).toBe("punu-mukudj");
    expect(drawDidYouKnowMotif(() => 0.999999)).toBe("punu-mukudj");
  });
});
