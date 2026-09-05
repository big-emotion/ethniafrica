import { describe, expect, it } from "vitest";

import { NOMMER_CHAPTERS } from "@/lib/dossiers/nommer/chapters";
import { NOMMER_CHAPTERS_EN } from "@/lib/dossiers/nommer/chapters/index.en";

/**
 * The English index is what the wiring PR will look a chapter up in, so it
 * has to answer for exactly the chapters the French index declares — no
 * chapter left without a sidecar, none keyed under the wrong slug.
 */
describe("the English index of the Nommer chapters", () => {
  // @req REQ-145
  it("holds one sidecar per French chapter, under the chapter's own key", () => {
    const frenchKeys = NOMMER_CHAPTERS.map((chapter) => chapter.key);
    expect(Object.keys(NOMMER_CHAPTERS_EN).sort()).toEqual(
      [...frenchKeys].sort()
    );
    for (const key of frenchKeys) {
      expect(NOMMER_CHAPTERS_EN[key].key).toBe(key);
    }
  });

  // Agent-produced under DEC-048: every chapter says so until a human has
  // read it, and the reader-facing marker is driven by this value alone.
  // @req REQ-142
  it("declares every chapter as machine-translated English", () => {
    for (const sidecar of Object.values(NOMMER_CHAPTERS_EN)) {
      expect(sidecar.locale).toBe("en");
      expect(sidecar.provenance).toBe("machine");
    }
  });
});
