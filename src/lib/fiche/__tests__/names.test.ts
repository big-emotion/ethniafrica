import { describe, expect, it } from "vitest";

import {
  namesForCountry,
  namesForPeople,
} from "@/components/fiche/__tests__/corpusRecords";
import {
  NAME_INDEX_THRESHOLD,
  groupNamesBySystem,
  namesChapterTitle,
} from "@/lib/fiche/names";

/**
 * The names chapter says what it lists (operator ruling, 2026-09-12). "Noms
 * portés" and "Noms du pays" said neither whose names nor what kind. The
 * lists hold clan names, nisba, praise names and patronymics, so the title is
 * "personal names" unless every entry is a patronymic — the only case the
 * narrower word would be true of the whole list.
 */
describe("namesChapterTitle", () => {
  // Ovambo's eight names are all clan names.
  // @req REQ-133
  it("calls a list of clan names personal names", () => {
    expect(
      namesChapterTitle("people", namesForPeople("PPL_OVAMBO"), "fr")
    ).toBe("Noms de personnes rattachés à ce peuple");
  });

  // Hausa's sixteen names are all non-hereditary patronymics.
  // @req REQ-133
  it("narrows the title to patronymics only when every name is one", () => {
    expect(namesChapterTitle("people", namesForPeople("PPL_HAUSA"), "fr")).toBe(
      "Patronymes rattachés à ce peuple"
    );
    expect(
      namesChapterTitle("country", namesForPeople("PPL_HAUSA"), "en")
    ).toBe("Patronymics linked to this country");
  });

  // Somali mixes sixteen patronymics with four clan names.
  // @req REQ-133
  it("keeps the personal title when systems mix, or when nothing is listed", () => {
    expect(
      namesChapterTitle("people", namesForPeople("PPL_SOMALI"), "fr")
    ).toBe("Noms de personnes rattachés à ce peuple");
    expect(namesChapterTitle("country", [], "fr")).toBe(
      "Noms de personnes rattachés à ce pays"
    );
    expect(namesChapterTitle("country", null, "en")).toBe(
      "Personal names linked to this country"
    );
  });
});

describe("groupNamesBySystem", () => {
  // @req REQ-133
  it("files names under their system, the largest group first, each A–Z", () => {
    const groups = groupNamesBySystem(namesForPeople("PPL_SOMALI"), "fr");
    expect(groups.map((group) => [group.system, group.names.length])).toEqual([
      ["non_hereditary_patronymic", 16],
      ["clan_name", 4],
    ]);
    for (const group of groups) {
      const sorted = [...group.names].sort((a, b) =>
        a.nameMain.localeCompare(b.nameMain, "fr", { sensitivity: "base" })
      );
      expect(group.names).toEqual(sorted);
    }
  });

  // Nine countries hold more than 24 attested names; below that an index of
  // 26 letters is longer than the list it indexes.
  // @req REQ-133
  it("indexes only past 24 names, which the largest country lists reach", () => {
    expect(NAME_INDEX_THRESHOLD).toBe(24);
    expect(namesForCountry("NGA").length).toBeGreaterThan(NAME_INDEX_THRESHOLD);
    expect(namesForCountry("NAM").length).toBeLessThanOrEqual(
      NAME_INDEX_THRESHOLD
    );
  });
});
