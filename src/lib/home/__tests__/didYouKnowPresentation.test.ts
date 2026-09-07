import { describe, expect, it } from "vitest";

import { SOURCE_TIER_LABELS } from "@/lib/glossaire/vocabularies";
import {
  DID_YOU_KNOW_TIER_LABEL,
  drawAnecdoteImageSide,
} from "@/lib/home/didYouKnowPresentation";
import { SOURCE_TIERS } from "@/types/sources";

describe("The anecdote band's source phrasing (REQ-113)", () => {
  // The band says « Source officielle » where a badge says « Officielle ».
  // That is one vocabulary read in a sentence, not a third wording of the
  // tiers — and this is what keeps it so: the literal stays (five consumers
  // index its `as const` type) but it may not drift from the glossary.
  // @req REQ-144
  it("is the tier vocabulary's own label, read in a sentence", () => {
    for (const tier of SOURCE_TIERS) {
      expect(DID_YOU_KNOW_TIER_LABEL[tier]).toBe(
        `Source ${SOURCE_TIER_LABELS.fr[tier].toLowerCase()}`
      );
    }
  });
});

describe("The anecdote band's opening side (REQ-113)", () => {
  // A `<` slipped to `<=`, or a comparison against the wrong bound, leaves
  // one of the two sides unreachable — and the band then looks fixed rather
  // than drawn, which is exactly what it exists not to be.
  // @req REQ-113
  it("can land on either half", () => {
    expect(drawAnecdoteImageSide(() => 0)).toBe("start");
    expect(drawAnecdoteImageSide(() => 0.499)).toBe("start");
    expect(drawAnecdoteImageSide(() => 0.5)).toBe("end");
    expect(drawAnecdoteImageSide(() => 0.999)).toBe("end");
  });
});
