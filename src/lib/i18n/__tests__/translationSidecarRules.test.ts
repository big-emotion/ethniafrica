import { describe, expect, it } from "vitest";

import {
  sidecarViolations,
  type TranslationKind,
} from "../translationSidecarRules";

// The shape PPL_ASANTE has in the corpus, cut down to the leaves the rules
// discriminate on. Values are the fiche's own.
const asante = {
  id: "PPL_ASANTE",
  nameMain: "Asante",
  currentCountries: ["GHA", "CIV"],
  content: {
    appellations: {
      selfAppellation: "Asante / Asantefo",
      exonyms: [
        "Ashanti (variante orthographique anglaise)",
        "Coromantee (terme jamaïcain)",
      ],
      whyProblematic:
        "Les chercheurs anglophones utilisent les deux formes de façon interchangeable.",
    },
    origins: {
      ancientOrigins: "Les Asante font partie du grand groupe Akan.",
    },
    sources: [
      { title: "Wilks, Asante in the Nineteenth Century", tier: "referenced" },
    ],
  },
};

function violations(
  sidecar: Record<string, unknown>,
  translationKind: TranslationKind = "human"
) {
  return sidecarViolations({
    model: "modele-peuple.json",
    source: asante,
    sidecar,
    translationKind,
  });
}

describe("sidecarViolations — class 1 (REQ-143 AC1)", () => {
  // @req REQ-143
  it("accepts an invariant leaf carried over unchanged", () => {
    expect(
      violations({
        id: "PPL_ASANTE",
        nameMain: "Asante",
        content: { appellations: { selfAppellation: "Asante / Asantefo" } },
      })
    ).toEqual([]);
  });

  // @req REQ-143
  it("refuses an autonym, an exonym or a source title that the translation changed", () => {
    const found = violations({
      nameMain: "Ashanti",
      content: {
        appellations: { selfAppellation: "Asante people" },
        sources: [{ title: "Wilks, The Asante in the 19th Century" }],
      },
    });
    expect(found.map((v) => `${v.rule} ${v.path}`)).toEqual([
      "invariant-changed nameMain",
      "invariant-changed content.appellations.selfAppellation",
      "invariant-changed content.sources[0].title",
    ]);
  });

  // @req REQ-143
  it("lets a glossed invariant translate its parenthetical while the name stays", () => {
    expect(
      violations({
        content: {
          appellations: {
            exonyms: [
              "Ashanti (English spelling variant)",
              "Coromantee (Jamaican term)",
            ],
          },
        },
      })
    ).toEqual([]);

    const renamed = violations({
      content: {
        appellations: { exonyms: ["Ashantee (English spelling variant)"] },
      },
    });
    expect(renamed.map((v) => v.path)).toEqual([
      "content.appellations.exonyms[0]",
    ]);
  });
});

describe("sidecarViolations — class 3 (REQ-143 AC2)", () => {
  const reviewed = {
    content: {
      appellations: {
        whyProblematic:
          "Anglophone scholarship uses both spellings interchangeably.",
      },
    },
  };

  // @req REQ-143
  it("refuses a review-required leaf at machine provenance", () => {
    const found = violations(reviewed, "machine");
    expect(found).toHaveLength(1);
    expect(found[0].rule).toBe("review-required-at-machine");
    expect(found[0].path).toBe("content.appellations.whyProblematic");
  });

  // @req REQ-143
  it("publishes the same leaf once a human has reviewed or written it", () => {
    expect(violations(reviewed, "machine_reviewed")).toEqual([]);
    expect(violations(reviewed, "human")).toEqual([]);
  });

  // @req REQ-143
  it("publishes translatable prose at machine provenance", () => {
    expect(
      violations(
        {
          content: {
            origins: { ancientOrigins: "The Asante belong to the Akan group." },
          },
        },
        "machine"
      )
    ).toEqual([]);
  });
});

describe("sidecarViolations — shape", () => {
  // @req REQ-143
  it("refuses a leaf the model does not declare", () => {
    const found = violations({ content: { appellations: { nickname: "x" } } });
    expect(found.map((v) => `${v.rule} ${v.path}`)).toEqual([
      "undeclared-path content.appellations.nickname",
    ]);
  });
});
