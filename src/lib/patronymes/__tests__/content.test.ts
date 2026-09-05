import { describe, expect, it } from "vitest";

import {
  readAlliances,
  readCorpusBearers,
  readDesignatedSocialUnit,
  readGaps,
  readHomonyms,
  readNisbaSubtype,
  readOrigin,
  readPatronymeSources,
  readPermittedGivenNames,
  readSpellings,
  readTotemicFoodProhibition,
  readTransmissionMode,
} from "@/lib/patronymes/content";

describe("patronyme content readers (REQ-133)", () => {
  // @req REQ-133
  it("reads each spelling with the countries attesting it", () => {
    const forms = readSpellings({
      spellings: [
        {
          spelling: "Camara",
          attestations: [
            { countryId: "LBR", sourceRefs: ["corpus-ppl-vai-organisation"] },
            { countryId: "SLE", sourceRefs: ["corpus-ppl-vai-organisation"] },
          ],
        },
        "not an object",
      ],
    });
    expect(forms).toEqual([{ spelling: "Camara", countryIds: ["LBR", "SLE"] }]);
  });

  // @req REQ-133
  it("does not repeat a country attesting the same spelling twice", () => {
    const forms = readSpellings({
      spellings: [
        {
          spelling: "Camara",
          attestations: [
            { countryId: "MLI", sourceRefs: ["a"] },
            { countryId: "MLI", sourceRefs: ["b"] },
          ],
        },
      ],
    });
    expect(forms).toEqual([{ spelling: "Camara", countryIds: ["MLI"] }]);
  });

  // @req REQ-133
  it("reads nothing from the retired attestedForms key", () => {
    // The key the fiche read for months, which no dossier has ever written.
    expect(readSpellings({ attestedForms: [{ spelling: "Keïta" }] })).toEqual(
      []
    );
    expect(readSpellings({})).toEqual([]);
    expect(readSpellings({ spellings: "not-an-array" })).toEqual([]);
  });

  // @req REQ-133
  it("reads a non-hereditary transmission mode, written by four dossiers", () => {
    expect(readTransmissionMode({ transmissionMode: "non_hereditary" })).toBe(
      "non_hereditary"
    );
  });

  // @req REQ-133
  it("reads the bearers a dossier names by displayName, and skips the rest", () => {
    expect(
      readCorpusBearers({
        bearers: [
          {
            status: "deceased",
            displayName: "Soundiata Keïta",
            sourceRefs: [],
          },
          { status: "deceased", personId: "PER_1", sourceRefs: [] },
          { displayName: "   " },
          "not an object",
        ],
      })
    ).toEqual([{ displayName: "Soundiata Keïta" }]);
  });

  // @req REQ-133
  it("reads the gap notes an editor wrote for the fields left empty", () => {
    expect(
      readGaps({
        gaps: [
          { fieldPath: "alliances", reason: "Aucune alliance documentée." },
          { fieldPath: "bearers" },
          "not an object",
        ],
      })
    ).toEqual([
      { fieldPath: "alliances", reason: "Aucune alliance documentée." },
    ]);
  });

  // @req REQ-133
  it("reads the dossier's own sources", () => {
    expect(
      readPatronymeSources({
        sources: [
          {
            sourceKey: "corpus-ppl-vai",
            title: "Fiche PPL_VAI",
            url: null,
            tier: "referenced",
            notes: "Passage clanique.",
          },
        ],
      })
    ).toEqual([
      {
        title: "Fiche PPL_VAI",
        url: null,
        tier: "referenced",
        notes: "Passage clanique.",
      },
    ]);
  });

  // @req REQ-133
  it("reads alliances by their attested term", () => {
    expect(
      readAlliances({
        alliances: [
          { targetPatronymeId: "PAT_TRAORE", allianceType: "sanankuya" },
          { allianceType: "orphaned" },
        ],
      })
    ).toEqual([{ targetPatronymeId: "PAT_TRAORE", allianceType: "sanankuya" }]);
  });

  // @req REQ-133
  it("reads homonyms with what distinguishes them", () => {
    expect(
      readHomonyms({
        homonyms: [
          {
            label: "Bambara",
            entityType: "people",
            distinction: "Peuple mandé, sans lien étymologique démontré.",
          },
        ],
      })
    ).toEqual([
      {
        label: "Bambara",
        entityType: "people",
        distinction: "Peuple mandé, sans lien étymologique démontré.",
      },
    ]);
  });

  // @req REQ-133
  it("reads a known transmission mode", () => {
    expect(readTransmissionMode({ transmissionMode: "patrilineal" })).toBe(
      "patrilineal"
    );
  });

  // @req REQ-133
  it("returns null for an unrecognised or absent transmission mode", () => {
    expect(readTransmissionMode({ transmissionMode: "unknown-value" })).toBe(
      null
    );
    expect(readTransmissionMode({})).toBe(null);
  });

  // @req REQ-133
  it("reads a known designated social unit", () => {
    expect(readDesignatedSocialUnit({ designatedSocialUnit: "lineage" })).toBe(
      "lineage"
    );
  });

  // @req REQ-133
  it("returns null for an unrecognised designated social unit", () => {
    expect(readDesignatedSocialUnit({ designatedSocialUnit: "nope" })).toBe(
      null
    );
  });

  // @req REQ-133
  it("reads the three origin strands the corpus actually writes", () => {
    const origin = readOrigin({
      origin: {
        oralTraditions: [
          {
            claim: "Le nom vient du Mandé.",
            claimStatus: "contested",
            griot: "Fadama Diarra",
            transcription: "Monteil 1962, p. 44",
          },
        ],
        writtenChronicles: [{ claim: "Cité dans la Charte du Manden." }],
        linguisticReconstructions: [],
      },
    });

    expect(origin.oralTraditions).toEqual([
      {
        claim: "Le nom vient du Mandé.",
        claimStatus: "contested",
        griot: "Fadama Diarra",
        transcription: "Monteil 1962, p. 44",
      },
    ]);
    expect(origin.writtenChronicles).toEqual([
      {
        claim: "Cité dans la Charte du Manden.",
        claimStatus: null,
        griot: null,
        transcription: null,
      },
    ]);
    expect(origin.linguisticReconstructions).toEqual([]);
  });

  // @req REQ-133
  it("keeps an oral tradition and a written chronicle side by side", () => {
    const origin = readOrigin({
      origin: {
        oralTraditions: [{ claim: "Version griotique." }],
        writtenChronicles: [{ claim: "Version chroniquée." }],
      },
    });

    // Two testimonies about one name, neither overruling the other — the
    // reason the corpus writes three lists rather than one classification.
    expect(origin.oralTraditions).toHaveLength(1);
    expect(origin.writtenChronicles).toHaveLength(1);
  });

  // @req REQ-133
  it("returns three empty strands rather than null when origin is absent", () => {
    expect(readOrigin({})).toEqual({
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [],
    });
    // The shape the reader used to require, which no dossier has ever had.
    expect(
      readOrigin({ origin: { originType: "griot_oral_tradition" } })
    ).toEqual({
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [],
    });
  });

  // @req REQ-133
  it("reads the totemic-clan subtype fields", () => {
    expect(
      readTotemicFoodProhibition({ totemicFoodProhibition: "Hyène" })
    ).toBe("Hyène");
    expect(
      readPermittedGivenNames({ permittedGivenNames: ["Aissata", "Boubou"] })
    ).toEqual(["Aissata", "Boubou"]);
  });

  // @req REQ-133
  it("returns empty/null for absent totemic-clan fields", () => {
    expect(readTotemicFoodProhibition({})).toBe(null);
    expect(readPermittedGivenNames({})).toEqual([]);
  });

  // @req REQ-133
  it("reads the nisba subtype", () => {
    expect(readNisbaSubtype({ nisbaSubtype: "geographic" })).toBe("geographic");
  });

  // @req REQ-133
  it("returns null for an unrecognised nisba subtype", () => {
    expect(readNisbaSubtype({ nisbaSubtype: "invented" })).toBe(null);
  });

  // @req REQ-133
  it("reads a claimed filiation as an origin strand, where the corpus puts it", () => {
    // There is no `filiationClaims` reader any more: the key it read appears
    // in no model, no parser and no dossier, so the section that depended on
    // it could never render. A contested descent claim is an oral tradition
    // with a claimStatus, which is where the corpus has always written it.
    const origin = readOrigin({
      origin: {
        oralTraditions: [
          {
            claim: "Descendance de Soundiata Keïta",
            claimStatus: "contested",
          },
        ],
      },
    });

    expect(origin.oralTraditions[0]).toMatchObject({
      claim: "Descendance de Soundiata Keïta",
      claimStatus: "contested",
    });
  });
});
