// @req REQ-126
import { describe, expect, it } from "vitest";

import {
  detectPersonCandidates,
  normalizePersonName,
} from "../lib/personCandidateDetection";
import type { LoadedPeopleFiche } from "../lib/personCandidateTypes";

function makeFiche(
  content: Record<string, unknown>,
  id = "PPL_TEST",
  languageFamilyId = "FLG_TEST"
): LoadedPeopleFiche {
  return { id, languageFamilyId, content };
}

describe("detectPersonCandidates", () => {
  // @req REQ-126
  it("anchors a candidate to the verbatim sentence carrying a role cue and a name", () => {
    const passage =
      "Guerre de Mapoch (1882-1883) : capitulation du roi Nyabela le 8 juillet 1883.";

    const candidates = detectPersonCandidates(
      makeFiche({ historicalRole: { conflictsOrAlliances: passage } })
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      name: "Nyabela",
      normalizedName: "nyabela",
      roleCue: "roi",
      sourceFicheId: "PPL_TEST",
      linguisticFamilyId: "FLG_TEST",
      sourcePath: "content.historicalRole.conflictsOrAlliances",
      verbatimPassage: passage,
      sourceCandidates: [],
      inheritedTier: null,
      sourceKind: null,
      tierResolution: "review_required",
      reviewFlags: [],
      reviewStatus: "unreviewed",
    });
  });

  // @req REQ-126
  it("rejects a role cue with no name attached — no candidate without a verbatim sentence", () => {
    const passage =
      "Un chef supervise chaque circonscription selon des regles coutumieres anciennes.";

    const candidates = detectPersonCandidates(
      makeFiche({ organization: { traditionalPoliticalSystem: passage } })
    );

    expect(candidates).toHaveLength(0);
  });

  // @req REQ-126
  it("captures a filler word between the cue and the name", () => {
    const passage =
      "Monarchie duale : roi actuel Makhosoke succede a la lignee Manala.";

    const candidates = detectPersonCandidates(
      makeFiche({ organization: { traditionalPoliticalSystem: passage } })
    );

    expect(candidates.map(({ name }) => name)).toEqual(["Makhosoke"]);
    expect(candidates[0].verbatimPassage).toBe(passage);
  });

  // @req REQ-126
  it("emits one candidate per distinct name and deduplicates repeats at the same path", () => {
    const passage =
      "Leur ancetre eponyme, le roi Ndebele, fils du roi Mabhudu, rompit avec le groupe Mbo.";

    const candidates = detectPersonCandidates(
      makeFiche({ origins: { ancientOrigins: passage } })
    );

    expect(candidates.map(({ name }) => name)).toEqual(["Ndebele", "Mabhudu"]);
    expect(new Set(candidates.map(({ candidateId }) => candidateId)).size).toBe(
      2
    );
  });

  // @req REQ-126
  it("skips the demography and sources sections, mirroring the AFRIK non-narrative fields", () => {
    const candidates = detectPersonCandidates(
      makeFiche({
        demography: { note: "Le roi Ahmadou domine ce chiffre." },
        sources: [{ title: "Le roi Ahmadou est cite ici." }],
        culture: { note: "Aucune mention de personne ici." },
      })
    );

    expect(candidates).toHaveLength(0);
  });

  // @req REQ-126
  it("normalizes case and accents while preserving the first display spelling", () => {
    expect(normalizePersonName(" Nyabéla ")).toBe("nyabela");
    expect(normalizePersonName("NYABELA")).toBe("nyabela");
  });
});
