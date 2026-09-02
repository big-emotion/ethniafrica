import { describe, expect, it } from "vitest";

import { parsePersonFile } from "../personParser";

function validPersonDossier(overrides: Record<string, unknown> = {}) {
  return {
    _meta: {
      format: "AFRIK JSON v2",
      entity: "personne",
      directives: "Follow the AFRIK person fiche contract.",
    },
    id: "PER_TEST_01",
    fullName: "Personne illustrative de test",
    roleCategory: "historien",
    countryIds: ["MLI"],
    peopleLinks: [{ peopleId: "PPL_TEST_A", relationLabel: "membership" }],
    sources: [
      {
        title: "Titre illustratif",
        author: "Autrice illustrative",
        year: 2020,
        url: "https://example.org/source",
        tier: "official",
      },
    ],
    ...overrides,
  };
}

describe("parsePersonFile", () => {
  // @req REQ-137
  it("parses a valid person dossier into a typed PersonDossier", () => {
    const result = parsePersonFile(validPersonDossier());

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      id: "PER_TEST_01",
      roleCategory: "historien",
    });
  });

  // @req REQ-137
  it("names the two admissible relation labels when a link uses another one", () => {
    const result = parsePersonFile(
      validPersonDossier({
        peopleLinks: [{ peopleId: "PPL_TEST_A", relationLabel: "ancestry" }],
      })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: "peopleLinks.0.relationLabel",
        message: "relationLabel must be one of membership, observation",
      })
    );
  });

  // @req REQ-137
  it("names the tier vocabulary when a source carries a tier outside it", () => {
    const result = parsePersonFile(
      validPersonDossier({
        sources: [
          {
            title: "Titre illustratif",
            author: "Autrice illustrative",
            year: 2020,
            url: "https://example.org/source",
            tier: "tier-1",
          },
        ],
      })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: "sources.0.tier",
        message: "tier must be one of official, referenced, unverified",
      })
    );
  });
});
