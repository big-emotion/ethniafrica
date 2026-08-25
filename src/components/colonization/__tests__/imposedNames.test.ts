import { describe, it, expect } from "vitest";

import { mapImposedNames } from "../imposedNames";
import {
  EMPTY_DOSSIER,
  SONINKE_WITHOUT_IMPOSED_NAME,
  YORUBA_WITH_IMPOSED_NAME,
} from "./imposedNamesFixtures";

describe("mapImposedNames", () => {
  // @req REQ-104
  it("returns one view model per people that has an imposed-name record, endonym paired with imposed name", () => {
    const result = mapImposedNames([YORUBA_WITH_IMPOSED_NAME]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      peopleId: "PPL_YORUBA",
      endonym: "Ọmọ Yorùbá",
      endonymLanguage: "yo",
      imposedName: "Nago",
      imposedBy: "administration coloniale portugaise",
      impositionPeriod: "XIXe siècle",
      whyProblematic:
        "Nom donné par les négriers portugais aux personnes déportées, effaçant l'auto-désignation Yorùbá.",
      confidenceScore: 78,
      sourceCount: 1,
      lastHumanAuditAt: "2026-01-15T00:00:00.000Z",
    });
    expect(result[0].atlasHref).toContain("PPL_YORUBA");
  });

  // @req REQ-104
  it("omits a people with no imposed-name record — nothing derived or invented", () => {
    const result = mapImposedNames([SONINKE_WITHOUT_IMPOSED_NAME]);
    expect(result).toHaveLength(0);
  });

  // @req REQ-104
  it("omits a people with an entirely empty dossier", () => {
    const result = mapImposedNames([EMPTY_DOSSIER]);
    expect(result).toHaveLength(0);
  });

  // @req REQ-104
  it("returns an empty array for an empty input, never throwing", () => {
    expect(mapImposedNames([])).toEqual([]);
  });

  // @req REQ-104
  it("filters a mixed list down to only the peoples with imposed-name records", () => {
    const result = mapImposedNames([
      YORUBA_WITH_IMPOSED_NAME,
      SONINKE_WITHOUT_IMPOSED_NAME,
    ]);
    expect(result.map((r) => r.peopleId)).toEqual(["PPL_YORUBA"]);
  });
});
