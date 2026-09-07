import { describe, expect, it } from "vitest";

import { getAdmin0Name } from "@/lib/atlas/overlays";
import { buildOnwardLinks } from "@/lib/fiche/onwardLinks";
import {
  countryOnwardGroups,
  countryTargets,
  familyOnwardGroups,
  languageOnwardGroups,
  patronymeOnwardGroups,
  peopleOnwardGroups,
} from "@/lib/fiche/onwardGroups";

/** What the block ends up offering, which is the only thing a reader sees. */
function offered(groups: ReturnType<typeof peopleOnwardGroups>) {
  return buildOnwardLinks(groups, "fr").map((link) => link.kind);
}

describe("countryTargets", () => {
  // @req REQ-091
  it("names a country rather than repeating its code", () => {
    // The name is the admin-0 asset's own, not a spelling this test chooses:
    // the block must agree with the globe that draws the same country.
    expect(countryTargets(["NGA"], "fr")).toEqual([
      { id: "NGA", name: getAdmin0Name("NGA", "fr") },
    ]);
    expect(getAdmin0Name("NGA", "fr")).not.toBe("NGA");
  });

  // @req REQ-091
  it("drops a code the atlas cannot name, rather than printing the code", () => {
    expect(countryTargets(["NGA", "ZZZ"], "fr").map((t) => t.id)).toEqual([
      "NGA",
    ]);
  });

  // @req REQ-091
  it("keeps one entry when a people declares a country twice", () => {
    expect(countryTargets(["NGA", "NGA"], "fr")).toHaveLength(1);
  });
});

describe("peopleOnwardGroups", () => {
  const full = peopleOnwardGroups({
    family: { id: "FLG_NIGERO_CONGOLAIS", name: "Nigéro-congolais" },
    languages: [{ id: "yor", name: "Yoruba" }],
    countryCodes: ["NGA", "BEN"],
    sameFamilyPeoples: [
      { id: "PPL_EWE", nameMain: "Éwé" },
      { id: "PPL_FON", nameMain: "Fon" },
    ],
    borneNames: [{ id: "PAT_ADEYEMI", nameMain: "Adéyemi" }],
    language: "fr",
  });

  // @req REQ-091
  it("offers the five kinds a people is related to, one of each first", () => {
    expect(offered(full)).toEqual([
      "language-family",
      "language",
      "country",
      "people",
      "name",
    ]);
  });

  // @req REQ-091
  it("offers nothing at all when the corpus declares no relation", () => {
    const bare = peopleOnwardGroups({
      family: null,
      languages: [],
      countryCodes: [],
      sameFamilyPeoples: [],
      borneNames: [],
      language: "fr",
    });

    expect(buildOnwardLinks(bare, "fr")).toEqual([]);
  });
});

describe("patronymeOnwardGroups", () => {
  // @req REQ-091
  it("leads to the people who bear it, the countries, and its own kin", () => {
    const groups = patronymeOnwardGroups({
      bearerPeoples: [{ id: "PPL_MANDING", nameMain: "Manding" }],
      countries: [{ id: "GIN", name: "Guinée" }],
      sameSystemNames: [{ id: "PAT_TOURE", nameMain: "Touré" }],
      language: "fr",
    });

    expect(offered(groups)).toEqual(["people", "country", "name"]);
  });
});

describe("countryOnwardGroups", () => {
  const roster = new Map([["FLG_NIGERCONGO", "Nigéro-congolais"]]);

  // @req REQ-091
  it("leads to the peoples the fiche documents and the families they sit in", () => {
    const groups = countryOnwardGroups({
      demographicPeoples: [
        {
          peopleId: "PPL_YORUBA",
          name: "Yoruba",
          percentageInCountry: 21,
          languageFamily: "FLG_NIGERCONGO",
        },
        { peopleId: "PPL_IGBO", name: "Igbo", percentageInCountry: 18 },
      ],
      majorPeoples: [],
      familyNamesById: roster,
      language: "fr",
    });

    expect(offered(groups)).toEqual(["people", "language-family", "people"]);
  });

  // @req REQ-091
  it("leads with the people the fiche gives the largest declared share", () => {
    const groups = countryOnwardGroups({
      demographicPeoples: [
        { peopleId: "PPL_IGBO", name: "Igbo", percentageInCountry: 18 },
        { peopleId: "PPL_YORUBA", name: "Yoruba", percentageInCountry: 21 },
      ],
      majorPeoples: [],
      familyNamesById: roster,
      language: "fr",
    });

    expect(buildOnwardLinks(groups, "fr")[0]?.name).toBe("Yoruba");
  });

  /**
   * South Africa, measured: its demographic table is five census categories
   * with no identifier on any of them, and every linkable people it has lives
   * in `majorPeoples`. Reading one chapter left that fiche with no way out.
   */
  // @req REQ-091
  it("falls through to the major peoples when the census table names none", () => {
    const groups = countryOnwardGroups({
      demographicPeoples: [
        { peopleId: null, name: "Africains noirs", percentageInCountry: 81.4 },
        { peopleId: null, name: "Métis (Coloureds)", percentageInCountry: 8.2 },
      ],
      majorPeoples: [
        {
          peopleId: "PPL_ZULU",
          name: "Zulu",
          languageFamily: "FLG_NIGERCONGO",
        },
        { peopleId: "PPL_XHOSA", name: "Xhosa" },
      ],
      familyNamesById: roster,
      language: "fr",
    });

    expect(buildOnwardLinks(groups, "fr").map((link) => link.name)).toEqual([
      "Zulu",
      "Nigéro-congolais",
      "Xhosa",
    ]);
  });

  // @req REQ-091
  it("drops a family the roster cannot name", () => {
    const groups = countryOnwardGroups({
      demographicPeoples: [
        {
          peopleId: "PPL_YORUBA",
          name: "Yoruba",
          languageFamily: "FLG_UNKNOWN_TO_THE_ROSTER",
        },
      ],
      majorPeoples: [],
      familyNamesById: roster,
      language: "fr",
    });

    expect(buildOnwardLinks(groups, "fr").map((link) => link.kind)).toEqual([
      "people",
    ]);
  });
});

describe("familyOnwardGroups", () => {
  // @req REQ-091
  it("leads to the family's languages and to the peoples it gathers", () => {
    const groups = familyOnwardGroups({
      languages: [{ id: "yor", name: "Yoruba" }],
      peoples: [{ id: "PPL_YORUBA", nameMain: "Yoruba" }],
      language: "fr",
    });

    expect(offered(groups)).toEqual(["language", "people"]);
  });
});

describe("languageOnwardGroups", () => {
  // @req REQ-091
  it("leads up to its family and out to the peoples who speak it", () => {
    const groups = languageOnwardGroups({
      family: { id: "FLG_NIGERO_CONGOLAIS", name: "Nigéro-congolais" },
      speakingPeoples: [{ id: "PPL_YORUBA", name: "Yoruba" }],
      language: "fr",
    });

    expect(offered(groups)).toEqual(["language-family", "people"]);
  });

  // @req REQ-091
  it("drops a family the join could only name by its identifier", () => {
    const groups = languageOnwardGroups({
      family: { id: "FLG_KROU", name: "FLG_KROU" },
      speakingPeoples: [],
      language: "fr",
    });

    expect(buildOnwardLinks(groups, "fr")).toEqual([]);
  });
});
