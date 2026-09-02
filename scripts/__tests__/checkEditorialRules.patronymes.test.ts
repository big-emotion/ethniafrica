import { describe, expect, it } from "vitest";

import {
  checkAutonym,
  checkPatronymeSourceRefs,
  isEthnographicFiche,
  runEditorialRules,
} from "../ci/checkEditorialRules";

const KEITA = "dataset/source/afrik/patronymes/PAT_KEITA.json";

describe("editorial rules — scope", () => {
  // The autonym rule was applied to everything that was not a country, so it
  // fired on 24 language fiches and 32 patronyme files, none of which has a
  // self-appellation to give. Eighty-nine advisory warnings that mean nothing
  // crowd out the ones that do.
  // @req REQ-133
  it("asks for an autonym only of the entities that have one", () => {
    expect(
      isEthnographicFiche("dataset/source/afrik/peuples/FLG_MANDE/PPL_X.json")
    ).toBe(true);
    expect(
      isEthnographicFiche(
        "dataset/source/afrik/famille_linguistique/FLG_X.json"
      )
    ).toBe(true);
    expect(isEthnographicFiche("dataset/source/afrik/langues/wol.json")).toBe(
      false
    );
    expect(isEthnographicFiche(KEITA)).toBe(false);
    expect(isEthnographicFiche("dataset/source/afrik/pays/NGA.json")).toBe(
      false
    );
  });

  // @req REQ-136
  it("raises no autonym finding against a language fiche", () => {
    expect(
      checkAutonym({ id: "wol" }, "dataset/source/afrik/langues/wol.json")
    ).toBeNull();
  });
});

describe("editorial rules — a patronyme's claims cite its own sources", () => {
  // Patronymes are the one corpus class where provenance attaches to the
  // claim. A `sourceRefs` entry naming a key the dossier does not declare is
  // a claim that cites nothing, and it renders as though it were sourced.
  // @req REQ-133
  it("flags a claim citing a source key the dossier does not declare", () => {
    const findings = checkPatronymeSourceRefs(
      {
        id: "PAT_X",
        sources: [{ sourceKey: "declared", title: "S", url: null }],
        peoples: [
          { peopleId: "PPL_X", status: "attested", sourceRefs: ["ghost"] },
        ],
      },
      KEITA
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("error");
    expect(findings[0].message).toContain("ghost");
  });

  // @req REQ-133
  it("accepts a claim whose reference resolves", () => {
    expect(
      checkPatronymeSourceRefs(
        {
          id: "PAT_X",
          sources: [{ sourceKey: "declared", title: "S", url: null }],
          peoples: [
            { peopleId: "PPL_X", status: "attested", sourceRefs: ["declared"] },
          ],
        },
        KEITA
      )
    ).toEqual([]);
  });

  // @req REQ-133
  it("reaches a reference nested inside a spelling attestation", () => {
    const findings = checkPatronymeSourceRefs(
      {
        id: "PAT_X",
        sources: [{ sourceKey: "declared", title: "S", url: null }],
        spellings: [
          {
            spelling: "Keita",
            attestations: [{ countryId: "MLI", sourceRefs: ["ghost"] }],
          },
        ],
      },
      KEITA
    );

    expect(findings).toHaveLength(1);
  });
});

describe("editorial rules — against the shipped corpus", () => {
  // @req REQ-133
  it("passes every rule on the corpus as it stands", () => {
    const result = runEditorialRules({ repoRoot: process.cwd() });

    expect(result.findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  // The point of the scoping fix: the gate's output is now signal.
  // @req REQ-133
  it("raises no inapplicable autonym warning on a language or a name", () => {
    const result = runEditorialRules({ repoRoot: process.cwd() });

    const inapplicable = result.findings.filter(
      (f) =>
        f.rule === "autonym-required" &&
        (f.file.includes("/langues/") || f.file.includes("/patronymes/"))
    );

    expect(inapplicable).toEqual([]);
  });
});
