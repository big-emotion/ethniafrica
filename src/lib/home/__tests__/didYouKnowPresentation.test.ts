import { describe, expect, it } from "vitest";

import { drawAnecdoteImageSide } from "@/lib/home/didYouKnowPresentation";

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
