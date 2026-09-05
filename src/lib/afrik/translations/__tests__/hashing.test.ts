import { describe, expect, it } from "vitest";

import { classifierFor } from "../leafClassifier";
import {
  canonicalize,
  driftedPaths,
  fieldHashes,
  sha256,
  sourceHash,
  translatableLeaves,
} from "../hashing";

const classify = classifierFor("modele-peuple.json");

const ASANTE_SHAPED = {
  id: "PPL_ASANTE",
  nameMain: "Asante",
  languageFamilyId: "FLG_NIGERCONGO",
  currentCountries: ["GHA"],
  content: {
    appellations: {
      mainName: "Asante",
      selfAppellation: "Asante / Asantefo",
      exonyms: ["Ashanti (variante orthographique anglaise)", "Coromantee"],
      originOfExonyms: "Le terme Ashanti est une variante anglophone.",
      whyProblematic: null,
      contemporaryUsage: "Le terme Asante est officiel au Ghana.",
    },
    origins: {
      ancientOrigins: "Les Asante font partie du groupe Akan.",
      migrationRoutes: ["Depuis Bono-Manso vers Kumase"],
    },
    sources: [
      { title: "A title", url: "https://x", tier: "official", notes: "Note." },
    ],
  },
};

describe("translation hashing (REQ-146)", () => {
  // @req REQ-146
  it("canonicalizes key order so two spellings of one object hash alike", () => {
    expect(sha256(canonicalize({ b: 1, a: [{ d: 2, c: 3 }] }))).toBe(
      sha256(canonicalize({ a: [{ c: 3, d: 2 }], b: 1 }))
    );
  });

  // @req REQ-146
  it("lists the translatable and review-required string leaves with their concrete paths", () => {
    const leaves = translatableLeaves(ASANTE_SHAPED, classify);
    const paths = leaves.map((leaf) => leaf.path);

    expect(paths).toContain("content.origins.ancientOrigins");
    expect(paths).toContain("content.origins.migrationRoutes[0]");
    expect(paths).toContain("content.appellations.originOfExonyms");
    expect(paths).toContain("content.sources[0].notes");
    // Invariants never travel to the translator.
    expect(paths).not.toContain("nameMain");
    expect(paths).not.toContain("content.appellations.selfAppellation");
    expect(paths).not.toContain("content.sources[0].title");
    // A null leaf has nothing to translate.
    expect(paths).not.toContain("content.appellations.whyProblematic");
  });

  // @req REQ-146
  it("lists a glossed invariant only when it carries a gloss", () => {
    const leaves = translatableLeaves(ASANTE_SHAPED, classify);
    const glossed = leaves.filter((leaf) => leaf.class === "glossed_invariant");

    expect(glossed.map((leaf) => leaf.path)).toEqual([
      "content.appellations.exonyms[0]",
    ]);
  });

  // @req REQ-146
  it("keys field hashes by concrete path and keeps them sixteen hex characters", () => {
    const hashes = fieldHashes(ASANTE_SHAPED, classify);

    expect(hashes["content.origins.ancientOrigins"]).toMatch(/^[0-9a-f]{16}$/);
    expect(Object.keys(hashes)).not.toContain("nameMain");
  });

  // @req REQ-146
  it("changes the source hash when a translatable leaf changes", () => {
    const edited = structuredClone(ASANTE_SHAPED);
    edited.content.origins.ancientOrigins = "Texte révisé.";

    expect(sourceHash(edited, classify)).not.toBe(
      sourceHash(ASANTE_SHAPED, classify)
    );
    expect(sourceHash(ASANTE_SHAPED, classify)).toMatch(/^[0-9a-f]{64}$/);
  });

  // @req REQ-146
  it("never changes the source hash for a class-1 leaf, the name of a glossed invariant included", () => {
    const edited = structuredClone(ASANTE_SHAPED);
    edited.nameMain = "Ashanti";
    edited.content.appellations.selfAppellation = "Asantefo";
    edited.content.sources[0].title = "Another title";
    edited.content.appellations.exonyms[0] =
      "Ashantee (variante orthographique anglaise)";

    expect(sourceHash(edited, classify)).toBe(
      sourceHash(ASANTE_SHAPED, classify)
    );
  });

  // @req REQ-146
  it("changes the source hash when the gloss of a glossed invariant changes", () => {
    const edited = structuredClone(ASANTE_SHAPED);
    edited.content.appellations.exonyms[0] = "Ashanti (graphie coloniale)";

    expect(sourceHash(edited, classify)).not.toBe(
      sourceHash(ASANTE_SHAPED, classify)
    );
  });

  // @req REQ-146
  it("names the drifted paths against earlier field hashes, and only those", () => {
    const previous = fieldHashes(ASANTE_SHAPED, classify);
    const edited = structuredClone(ASANTE_SHAPED);
    edited.content.origins.ancientOrigins = "Texte révisé.";
    edited.content.origins.migrationRoutes.push("Nouvelle route");

    expect(driftedPaths(edited, previous, classify)).toEqual([
      "content.origins.ancientOrigins",
    ]);
    expect(driftedPaths(ASANTE_SHAPED, previous, classify)).toEqual([]);
  });
});
