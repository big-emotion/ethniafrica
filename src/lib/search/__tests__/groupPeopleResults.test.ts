import { describe, it, expect } from "vitest";

import { groupPeopleResults } from "@/lib/search/groupPeopleResults";
import type { SearchResult } from "@/types/afrik-frontend";

const people = (over: Partial<SearchResult>): SearchResult => ({
  type: "people",
  id: "X",
  name: "X",
  ...over,
});

describe("groupPeopleResults", () => {
  // @req REQ-002
  it("groups split fiches that share a peopleGroupId into one entry", () => {
    const results: SearchResult[] = [
      people({
        id: "PPL_FULANI",
        name: "Peul",
        peopleGroupId: "PGRP_FULANI",
        peopleGroupLabel: "Peul / Fulani",
      }),
      people({
        id: "PPL_FULANI_MASSINA",
        name: "Peul du Massina",
        peopleGroupId: "PGRP_FULANI",
        peopleGroupLabel: "Peul / Fulani",
      }),
    ];

    const grouped = groupPeopleResults(results);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({
      type: "peopleGroup",
      peopleGroupId: "PGRP_FULANI",
      peopleGroupLabel: "Peul / Fulani",
    });
    expect(
      grouped[0].type === "peopleGroup"
        ? grouped[0].members.map((m) => m.id)
        : []
    ).toEqual(["PPL_FULANI", "PPL_FULANI_MASSINA"]);
  });

  // @req REQ-002
  it("leaves a people result ungrouped when it is the only match for its group", () => {
    const results: SearchResult[] = [
      people({
        id: "PPL_FULANI",
        name: "Peul",
        peopleGroupId: "PGRP_FULANI",
        peopleGroupLabel: "Peul / Fulani",
      }),
    ];

    const grouped = groupPeopleResults(results);

    expect(grouped).toEqual(results);
  });

  // @req REQ-002
  it("leaves peoples without a peopleGroupId untouched", () => {
    const results: SearchResult[] = [people({ id: "PPL_BETE", name: "Bété" })];

    expect(groupPeopleResults(results)).toEqual(results);
  });

  // @req REQ-002
  it("leaves countries and language families untouched", () => {
    const results: SearchResult[] = [
      { type: "country", id: "CIV", name: "Côte d'Ivoire" },
      { type: "languageFamily", id: "FLG_NIGER_CONGO", name: "Niger-Congo" },
    ];

    expect(groupPeopleResults(results)).toEqual(results);
  });

  // @req REQ-002
  it("preserves the original position of the first member of a group", () => {
    const results: SearchResult[] = [
      { type: "country", id: "CIV", name: "Côte d'Ivoire" },
      people({
        id: "PPL_KONGO",
        name: "Kongo",
        peopleGroupId: "PGRP_KONGO",
        peopleGroupLabel: "Kongo",
      }),
      people({
        id: "PPL_KONGO_BRAZZA",
        name: "Kongo de Brazzaville",
        peopleGroupId: "PGRP_KONGO",
        peopleGroupLabel: "Kongo",
      }),
    ];

    const grouped = groupPeopleResults(results);

    expect(grouped.map((r) => r.type)).toEqual(["country", "peopleGroup"]);
  });

  // @req REQ-002
  it("keeps three or more split fiches of the same group in one entry", () => {
    const results: SearchResult[] = [
      people({
        id: "PPL_KONGO",
        name: "Kongo",
        peopleGroupId: "PGRP_KONGO",
        peopleGroupLabel: "Kongo",
      }),
      people({
        id: "PPL_KONGO_BRAZZA",
        name: "Kongo de Brazzaville",
        peopleGroupId: "PGRP_KONGO",
        peopleGroupLabel: "Kongo",
      }),
      people({
        id: "PPL_KONGO_CABINDA",
        name: "Kongo du Cabinda",
        peopleGroupId: "PGRP_KONGO",
        peopleGroupLabel: "Kongo",
      }),
    ];

    const grouped = groupPeopleResults(results);

    expect(grouped).toHaveLength(1);
    expect(
      grouped[0].type === "peopleGroup" ? grouped[0].members : []
    ).toHaveLength(3);
  });
});
