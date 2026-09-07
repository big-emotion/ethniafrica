import { describe, expect, it } from "vitest";

import { DID_YOU_KNOW_FACTS_EN } from "@/lib/home/didYouKnowFacts.en";
import { DID_YOU_KNOW_ILLUSTRATIONS } from "@/lib/home/didYouKnowIllustrations";
import {
  DID_YOU_KNOW_ILLUSTRATIONS_EN,
  type DidYouKnowIllustrationTranslation,
} from "@/lib/home/didYouKnowIllustrations.en";

function isPlate(
  translation: DidYouKnowIllustrationTranslation
): translation is Extract<
  DidYouKnowIllustrationTranslation,
  { kind: "plate" }
> {
  return translation.kind === "plate";
}

describe("the English anecdote illustrations — parity with the French (REQ-145)", () => {
  // @req REQ-145
  it("describes exactly the illustrations the French bank holds", () => {
    expect(Object.keys(DID_YOU_KNOW_ILLUSTRATIONS_EN).sort()).toEqual(
      Object.keys(DID_YOU_KNOW_ILLUSTRATIONS).sort()
    );
  });

  // A French alt served to an English reader is a screen reader switching
  // language mid-page; an empty one is a picture that says nothing.
  // @req REQ-145
  it("gives every illustration an English alt of its own", () => {
    for (const [id, translation] of Object.entries(
      DID_YOU_KNOW_ILLUSTRATIONS_EN
    )) {
      const french = DID_YOU_KNOW_ILLUSTRATIONS[id];

      expect(translation.kind, id).toBe(french.kind);
      expect(translation.alt.length, id).toBeGreaterThan(20);
      expect(translation.alt, id).not.toBe(french.alt);
    }
  });

  // The plate prints who gave the name in half a line; that line is prose.
  // @req REQ-145
  it("translates the origin line of every drawn plate", () => {
    for (const [id, translation] of Object.entries(
      DID_YOU_KNOW_ILLUSTRATIONS_EN
    )) {
      const french = DID_YOU_KNOW_ILLUSTRATIONS[id];
      if (!isPlate(translation) || french.kind !== "plate") continue;

      expect(translation.givenBy.trim(), id).not.toBe("");
      expect(translation.givenBy, id).not.toBe(french.givenBy);
    }
  });

  // Mirrors the French bank's own rule: an alt that repeats the headline
  // tells a screen reader what it has already been read.
  // @req REQ-113
  it("describes what the picture shows rather than repeating the English headline", () => {
    const echoes = Object.entries(DID_YOU_KNOW_ILLUSTRATIONS_EN)
      .filter(
        ([id, translation]) =>
          translation.alt === DID_YOU_KNOW_FACTS_EN[id]?.headline
      )
      .map(([id]) => id);

    expect(echoes).toEqual([]);
  });

  // @req REQ-142
  it("declares machine provenance on every illustration", () => {
    for (const translation of Object.values(DID_YOU_KNOW_ILLUSTRATIONS_EN)) {
      expect(translation.provenance).toBe("machine");
    }
  });
});

describe("the English anecdote illustrations — invariants (REQ-143)", () => {
  // The two names on a plate are the exonym and the autonym the anecdote is
  // about. The sidecar does not carry them, but its alt has to read them
  // out — spelt exactly as the French module holds them.
  // @req REQ-143
  it("reads both names of a drawn plate verbatim", () => {
    for (const [id, translation] of Object.entries(
      DID_YOU_KNOW_ILLUSTRATIONS_EN
    )) {
      const french = DID_YOU_KNOW_ILLUSTRATIONS[id];
      if (!isPlate(translation) || french.kind !== "plate") continue;

      expect(translation.alt, id).toContain(french.given);
      expect(translation.alt, id).toContain(french.own);
    }
  });
});
