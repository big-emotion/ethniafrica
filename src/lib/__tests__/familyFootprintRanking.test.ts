import { describe, expect, it } from "vitest";

import {
  MEMBER_PEOPLES_SHOWN,
  rankFootprint,
  rankMemberPeoplesByReach,
} from "@/lib/familyFootprintRanking";
import { buildFamilyFootprintOverlay } from "@/lib/atlas/overlays";

describe("rankFootprint", () => {
  // @req REQ-116
  it("names each country in French and carries its share of the widest bar", () => {
    const overlay = buildFamilyFootprintOverlay(
      [["NGA", "BEN"], ["NGA", "TGO"], ["NGA"]],
      3
    );

    const rows = rankFootprint(overlay!.countries);

    expect(rows.map((r) => r.nameFr)).toEqual(["Nigeria", "Bénin", "Togo"]);
    expect(rows[0].barWidthPercent).toBe(100);
    expect(rows[1].barWidthPercent).toBeCloseTo(100 / 3, 5);
  });

  // @req REQ-116
  it("gives every row a flag", () => {
    const overlay = buildFamilyFootprintOverlay([["NGA", "ZAF"]], 1);
    const rows = rankFootprint(overlay!.countries);

    expect(rows.every((row) => row.flag.length > 0)).toBe(true);
  });

  // @req REQ-116
  it("keeps the overlay's order, which the globe and the picker also use", () => {
    const overlay = buildFamilyFootprintOverlay(
      [["TGO", "BEN", "NGA"], ["NGA"]],
      2
    );

    expect(rankFootprint(overlay!.countries).map((r) => r.countryId)).toEqual(
      overlay!.countries.map((c) => c.countryId)
    );
  });
});

describe("rankMemberPeoplesByReach", () => {
  const peoples = [
    { id: "PPL_A", nameMain: "Anaga", currentCountries: ["NGA"] },
    {
      id: "PPL_B",
      nameMain: "Bantou",
      currentCountries: ["NGA", "CMR", "GAB"],
    },
    { id: "PPL_C", nameMain: "Cible", currentCountries: ["NGA", "BEN"] },
  ];

  // @req REQ-116
  it("puts the most widespread people first", () => {
    // "Classés par étendue": reach across countries, not alphabet and not
    // corpus order, so the list opens on the peoples that carry the family
    // furthest.
    expect(rankMemberPeoplesByReach(peoples).map((p) => p.nameMain)).toEqual([
      "Bantou",
      "Cible",
      "Anaga",
    ]);
  });

  // @req REQ-116
  it("breaks ties on the name, so the list cannot reshuffle between renders", () => {
    const tied = [
      { id: "PPL_Z", nameMain: "Zarma", currentCountries: ["NER"] },
      { id: "PPL_A", nameMain: "Adja", currentCountries: ["BEN"] },
    ];

    expect(rankMemberPeoplesByReach(tied).map((p) => p.nameMain)).toEqual([
      "Adja",
      "Zarma",
    ]);
  });

  // @req REQ-116
  it("counts a country once per people", () => {
    const repeated = [
      { id: "PPL_R", nameMain: "Répété", currentCountries: ["NGA", "NGA"] },
    ];

    expect(rankMemberPeoplesByReach(repeated)[0].countryIds).toEqual(["NGA"]);
  });

  // @req REQ-116
  it("shows ten and says how many it is showing them out of", () => {
    const many = Array.from({ length: 24 }, (_, index) => ({
      id: `PPL_${index}`,
      nameMain: `Peuple ${String(index).padStart(2, "0")}`,
      currentCountries: ["NGA"],
    }));

    const ranked = rankMemberPeoplesByReach(many);
    expect(ranked).toHaveLength(MEMBER_PEOPLES_SHOWN);
  });

  // @req REQ-116
  it("shows them all when there are fewer than ten", () => {
    expect(rankMemberPeoplesByReach(peoples)).toHaveLength(3);
  });
});
