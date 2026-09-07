import { describe, expect, it } from "vitest";

import {
  ONWARD_MAX_LINKS,
  buildOnwardLinks,
  type OnwardGroup,
} from "@/lib/fiche/onwardLinks";
import { getCountryRoute, getFamilyRoute } from "@/lib/routing";

const family: OnwardGroup = {
  kind: "language-family",
  max: 1,
  targets: [{ id: "FLG_NIGERO_CONGOLAIS", name: "Nigéro-congolais" }],
};

const languages: OnwardGroup = {
  kind: "language",
  max: 2,
  targets: [
    { id: "yor", name: "Yoruba" },
    { id: "ijn", name: "Kalabari" },
  ],
};

const countries: OnwardGroup = {
  kind: "country",
  max: 2,
  targets: [
    { id: "NGA", name: "Nigeria" },
    { id: "BEN", name: "Bénin" },
  ],
};

describe("buildOnwardLinks", () => {
  // @req REQ-091
  it("offers one link of every declared kind before a second of any", () => {
    const links = buildOnwardLinks([family, languages, countries], "fr");

    expect(links.slice(0, 3).map((link) => link.kind)).toEqual([
      "language-family",
      "language",
      "country",
    ]);
  });

  // @req REQ-091
  it("addresses each target through its own fiche route", () => {
    const links = buildOnwardLinks([family, countries], "fr");

    expect(links).toContainEqual({
      kind: "language-family",
      name: "Nigéro-congolais",
      href: getFamilyRoute("fr", "FLG_NIGERO_CONGOLAIS"),
    });
    expect(links).toContainEqual({
      kind: "country",
      name: "Nigeria",
      href: getCountryRoute("fr", "NGA"),
    });
  });

  // @req REQ-091
  it("never carries more links than a reader will weigh at the foot of a fiche", () => {
    const peoples: OnwardGroup = {
      kind: "people",
      max: 8,
      targets: Array.from({ length: 8 }, (_, index) => ({
        id: `PPL_${index}`,
        name: `Peuple ${index}`,
      })),
    };

    expect(buildOnwardLinks([peoples], "fr")).toHaveLength(ONWARD_MAX_LINKS);
  });

  // @req REQ-091
  it("holds a kind to the quota its group declares", () => {
    const links = buildOnwardLinks([countries, languages], "fr");

    expect(links.filter((link) => link.kind === "country")).toHaveLength(2);
  });

  // @req REQ-091
  it("does not send the reader back to the fiche they are already on", () => {
    const links = buildOnwardLinks([countries], "fr", {
      kind: "country",
      id: "NGA",
    });

    expect(links.map((link) => link.href)).toEqual([
      getCountryRoute("fr", "BEN"),
    ]);
  });

  // @req REQ-091
  it("keeps one link per destination when a relation is declared twice", () => {
    const twice: OnwardGroup = {
      kind: "country",
      max: 4,
      targets: [
        { id: "NGA", name: "Nigeria" },
        { id: "NGA", name: "Nigéria" },
      ],
    };

    expect(buildOnwardLinks([twice], "fr")).toHaveLength(1);
  });

  // @req REQ-091
  it("drops a target the corpus names only by its identifier", () => {
    const unnamed: OnwardGroup = {
      kind: "people",
      max: 2,
      targets: [
        { id: "PPL_FON", name: "PPL_FON" },
        { id: "PPL_EWE", name: "Éwé" },
      ],
    };

    expect(buildOnwardLinks([unnamed], "fr").map((link) => link.name)).toEqual([
      "Éwé",
    ]);
  });

  // @req REQ-091
  it("drops a target with no name to show the reader", () => {
    const blank: OnwardGroup = {
      kind: "people",
      max: 2,
      targets: [
        { id: "PPL_FON", name: "   " },
        { id: "PPL_EWE", name: "Éwé" },
      ],
    };

    expect(buildOnwardLinks([blank], "fr")).toHaveLength(1);
  });

  // @req REQ-091
  it("returns nothing when the corpus declares no relation at all", () => {
    expect(
      buildOnwardLinks(
        [
          { kind: "country", max: 2, targets: [] },
          { kind: "language", max: 2, targets: [] },
        ],
        "fr"
      )
    ).toEqual([]);
  });
});
