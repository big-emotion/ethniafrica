import { describe, expect, it } from "vitest";

import { loadAllPatronymeDossiers } from "../../src/lib/afrik/loaders/patronymeJsonLoader";
import type { PatronymeDossier } from "../../src/lib/afrik/parsers/patronymeTypes";
import {
  corpusPatronymeReferenceIds,
  findPatronymeLoaderBlockers,
} from "../ci/checkAfrikLoaderPreflight";

const references = corpusPatronymeReferenceIds();

function dossierNamed(id: string): PatronymeDossier {
  const dossier = loadAllPatronymeDossiers().dossiers.find(
    (candidate) => candidate.id === id
  );
  if (!dossier) throw new Error(`${id} is missing from the corpus`);
  return structuredClone(dossier);
}

describe("AFRIK patronyme loader preflight", () => {
  // @req REQ-133
  it("clears the corpus as committed", () => {
    expect(findPatronymeLoaderBlockers()).toEqual([]);
  });

  // @req REQ-134
  it("refuses one work cited by two fiches under different locators", () => {
    const zuma = dossierNamed("PAT_ZUMA");
    const mirror = dossierNamed("PAT_ZUMA");
    mirror.id = "PAT_ZUMA_MIRROR";
    mirror.sources[0].url = "https://example.org/a-second-locator";

    const blockers = findPatronymeLoaderBlockers({
      dossiers: [zuma, mirror],
      errors: [],
    });

    expect(blockers).toContain(
      `PAT_ZUMA_MIRROR.sources: conflicting source "${mirror.sources[0].title}" tier, URL, or provenance`
    );
  });

  // @req REQ-134
  it("refuses an attestation in a country the corpus does not model", () => {
    const zuma = dossierNamed("PAT_ZUMA");
    zuma.countries = [
      {
        countryId: "ESP",
        status: "attested",
        sourceRefs: [zuma.sources[0].sourceKey],
      },
    ];

    const blockers = findPatronymeLoaderBlockers(
      { dossiers: [zuma], errors: [] },
      references
    );

    expect(blockers).toContain(
      "PAT_ZUMA.countries[0].countryId: ESP does not exist"
    );
  });
});
