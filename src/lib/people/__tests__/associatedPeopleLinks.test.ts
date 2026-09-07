import { describe, expect, it } from "vitest";

import {
  resolveAssociatedPeoples,
  type PeopleNameIndexEntry,
} from "@/lib/people/associatedPeopleLinks";

const shonaNeighbours: PeopleNameIndexEntry[] = [
  { id: "PPL_NDEBELE", nameMain: "Ndébélé" },
  { id: "PPL_TONGA", nameMain: "Tonga" },
];

describe("resolveAssociatedPeoples (REQ-150)", () => {
  // @req REQ-150
  it("matches the name before an em dash gloss", () => {
    const [ndebele] = resolveAssociatedPeoples(
      ["Ndebele — voisins du sud-ouest du Zimbabwe"],
      shonaNeighbours
    );
    expect(ndebele.peopleId).toBe("PPL_NDEBELE");
  });

  // @req REQ-150
  it("matches the name before an en dash gloss", () => {
    const [tonga] = resolveAssociatedPeoples(
      ["Tonga – riverains du Zambèze"],
      shonaNeighbours
    );
    expect(tonga.peopleId).toBe("PPL_TONGA");
  });

  // @req REQ-150
  it("matches the name before a spaced hyphen gloss", () => {
    const [tonga] = resolveAssociatedPeoples(
      ["Tonga - riverains du Zambèze"],
      shonaNeighbours
    );
    expect(tonga.peopleId).toBe("PPL_TONGA");
  });

  // @req REQ-150
  it("matches the name before a parenthesised gloss", () => {
    const [tonga] = resolveAssociatedPeoples(
      ["Tonga (vallée du Zambèze)"],
      shonaNeighbours
    );
    expect(tonga.peopleId).toBe("PPL_TONGA");
  });

  // @req REQ-150
  it("matches an entry that carries no gloss at all", () => {
    const [tonga] = resolveAssociatedPeoples(["  Tonga  "], shonaNeighbours);
    expect(tonga.peopleId).toBe("PPL_TONGA");
  });

  // @req REQ-150
  it("matches across accents and case", () => {
    const [ndebele] = resolveAssociatedPeoples(
      ["NDEBELE — exonyme courant"],
      shonaNeighbours
    );
    expect(ndebele.peopleId).toBe("PPL_NDEBELE");
  });

  // @req REQ-150
  it("matches across internal punctuation and spacing", () => {
    const [bantuSud] = resolveAssociatedPeoples(
      ["Bantou-Sud — ensemble régional"],
      [{ id: "PPL_BANTOU_SUD", nameMain: "Bantou Sud" }]
    );
    expect(bantuSud.peopleId).toBe("PPL_BANTOU_SUD");
  });

  // @req REQ-150
  it("resolves nothing when two fiches carry the same name", () => {
    const [ambiguous] = resolveAssociatedPeoples(
      ["Tonga — homonymie non tranchée par le corpus"],
      [
        { id: "PPL_TONGA_ZAMBEZE", nameMain: "Tonga" },
        { id: "PPL_TONGA_MALAWI", nameMain: "Tónga" },
      ]
    );
    expect(ambiguous).toStrictEqual({
      label: "Tonga — homonymie non tranchée par le corpus",
    });
  });

  // @req REQ-150
  it("never links a people to its own fiche", () => {
    const [self] = resolveAssociatedPeoples(
      ["Tonga — le peuple de la fiche elle-même"],
      shonaNeighbours,
      "PPL_TONGA"
    );
    expect(self).toStrictEqual({
      label: "Tonga — le peuple de la fiche elle-même",
    });
  });

  // @req REQ-150
  it("returns a sub-group with no fiche as an unlinked entry", () => {
    const [karanga] = resolveAssociatedPeoples(
      ["Karanga — sous-groupe dominant du centre-sud du Zimbabwe"],
      shonaNeighbours
    );
    expect(karanga).toStrictEqual({
      label: "Karanga — sous-groupe dominant du centre-sud du Zimbabwe",
    });
  });

  // @req REQ-150
  it("keeps the whole corpus entry as the label, prose tail included", () => {
    const entry =
      "Ndebele — voisins du sud-ouest du Zimbabwe, arrivés au XIXe siècle";
    const [ndebele] = resolveAssociatedPeoples([entry], shonaNeighbours);
    expect(ndebele).toStrictEqual({ label: entry, peopleId: "PPL_NDEBELE" });
  });

  // @req REQ-150
  it("preserves the order and the count of the corpus entries", () => {
    const entries = [
      "Karanga — sous-groupe du centre-sud",
      "Ndebele — voisins du sud-ouest",
      "Zezuru — sous-groupe du centre",
      "Tonga (vallée du Zambèze)",
    ];
    const associated = resolveAssociatedPeoples(entries, shonaNeighbours);
    expect(associated.map((group) => group.label)).toEqual(entries);
    expect(associated.map((group) => group.peopleId)).toEqual([
      undefined,
      "PPL_NDEBELE",
      undefined,
      "PPL_TONGA",
    ]);
  });

  // @req REQ-150
  it("returns nothing for an empty list of entries", () => {
    expect(resolveAssociatedPeoples([], shonaNeighbours)).toEqual([]);
  });

  // @req REQ-150
  it("leaves every entry unlinked when the index is empty", () => {
    expect(resolveAssociatedPeoples(["Ndebele — voisins"], [])).toStrictEqual([
      { label: "Ndebele — voisins" },
    ]);
  });

  // @req REQ-150
  it("resolves nothing for a blank entry", () => {
    expect(
      resolveAssociatedPeoples(["   "], [{ id: "PPL_VIDE", nameMain: "  " }])
    ).toStrictEqual([{ label: "   " }]);
  });
});
