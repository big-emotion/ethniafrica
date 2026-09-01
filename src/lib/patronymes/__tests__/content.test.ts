import { describe, expect, it } from "vitest";

import {
  readAttestedForms,
  readDesignatedSocialUnit,
  readFiliationClaims,
  readNisbaSubtype,
  readOrigin,
  readPermittedGivenNames,
  readTotemicFoodProhibition,
  readTransmissionMode,
} from "@/lib/patronymes/content";

describe("patronyme content readers (REQ-133)", () => {
  // @req REQ-133
  it("reads attested forms with their attestation source", () => {
    const forms = readAttestedForms({
      attestedForms: [
        {
          spelling: "Keïta",
          attestation: {
            title: "Charte du Manden",
            url: null,
            tier: "referenced",
          },
        },
        { spelling: "not an object" },
      ],
    });
    expect(forms).toEqual([
      {
        spelling: "Keïta",
        attestation: {
          title: "Charte du Manden",
          url: null,
          tier: "referenced",
        },
      },
    ]);
  });

  // @req REQ-133
  it("returns an empty list when attestedForms is absent or malformed", () => {
    expect(readAttestedForms({})).toEqual([]);
    expect(readAttestedForms({ attestedForms: "not-an-array" })).toEqual([]);
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
  it("reads an origin with its type, sources and optional griot attribution", () => {
    const origin = readOrigin({
      origin: {
        originType: "griot_oral_tradition",
        sources: [
          { title: "Récit de Fadama Diarra", url: null, tier: "unverified" },
        ],
        griot: "Fadama Diarra",
      },
    });
    expect(origin).toEqual({
      originType: "griot_oral_tradition",
      sources: [
        { title: "Récit de Fadama Diarra", url: null, tier: "unverified" },
      ],
      griot: "Fadama Diarra",
    });
  });

  // @req REQ-133
  it("returns null when origin is absent or its type is unrecognised", () => {
    expect(readOrigin({})).toBe(null);
    expect(readOrigin({ origin: { originType: "invented" } })).toBe(null);
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
  it("reads filiation claims alongside their competing account (AC2)", () => {
    const claims = readFiliationClaims({
      filiationClaims: [
        {
          claim: "Descendance de Soundiata Keïta",
          competingAccount:
            "Contestée par une partie de l'historiographie académique",
          sources: [
            { title: "Charte du Manden", url: null, tier: "referenced" },
          ],
        },
      ],
    });
    expect(claims).toEqual([
      {
        claim: "Descendance de Soundiata Keïta",
        competingAccount:
          "Contestée par une partie de l'historiographie académique",
        sources: [{ title: "Charte du Manden", url: null, tier: "referenced" }],
      },
    ]);
  });

  // @req REQ-133
  it("returns an empty list when filiationClaims is absent or malformed", () => {
    expect(readFiliationClaims({})).toEqual([]);
    expect(readFiliationClaims({ filiationClaims: [{ claim: 42 }] })).toEqual(
      []
    );
  });
});
