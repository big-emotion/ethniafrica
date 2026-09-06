import { describe, expect, it } from "vitest";

import { translationViolations } from "../sidecarIntegrity";

const SOURCE = {
  id: "lin",
  nameFr: "Lingala",
  content: {
    vehicularRole: null,
    dialects: [],
    vitalityStatus: null,
    sources: [
      { title: "Glottolog", url: "https://g", tier: "official", notes: "Nom." },
    ],
  },
};

describe("translationViolations (REQ-143, REQ-146)", () => {
  // The walker sees `vitalityStatus: null` as a leaf at a path the model only
  // knows as a subtree; carried verbatim it is nothing to class.
  // @req REQ-146
  it("does not report a null subtree the sidecar carries verbatim", () => {
    const sidecar = structuredClone(SOURCE);
    sidecar.content.sources[0].notes = "Name.";

    expect(
      translationViolations({
        model: "modele-langue.json",
        source: SOURCE,
        sidecar,
      })
    ).toEqual([]);
  });

  // @req REQ-143
  it("still reports a changed invariant and an invented leaf", () => {
    const sidecar = structuredClone(SOURCE) as Record<string, unknown>;
    (sidecar as typeof SOURCE).nameFr = "Lingala language";
    (sidecar.content as Record<string, unknown>).invented = "x";

    expect(
      translationViolations({
        model: "modele-langue.json",
        source: SOURCE,
        sidecar,
      }).map((violation) => violation.path)
    ).toEqual(["nameFr", "content.invented"]);
  });

  // Stored for review, withheld by the overlay: not a storage finding.
  // @req REQ-143
  it("does not report a review-required leaf translated at machine provenance", () => {
    const source = {
      id: "PPL_X",
      content: { appellations: { originOfExonyms: "Origine." } },
    };
    const sidecar = {
      id: "PPL_X",
      content: { appellations: { originOfExonyms: "Origin." } },
    };

    expect(
      translationViolations({ model: "modele-peuple.json", source, sidecar })
    ).toEqual([]);
  });
});
