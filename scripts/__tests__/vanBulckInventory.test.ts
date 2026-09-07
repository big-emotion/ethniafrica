import { describe, expect, it } from "vitest";

import {
  extractVanBulckListFour,
  matchHistoricalInventoryToPeoples,
  simplifyVanBulckEthnonym,
} from "../lib/vanBulckInventory";

describe("extractVanBulckListFour", () => {
  // @req REQ-001
  it("extracts each printed column while excluding headings and prose", () => {
    const text = `
                       LISTE IV.
                    Noms    éthniques.

   On y trouve énumérés en ordre alphabétique.

       A               Baie               ba Binza
   Abulu               Balese             ba Bira
   Aka              ba Bali              wa Bito
   Asua            ba Beke               ba Budu
\f132            ORTHOGRAPHIE DES NOMS ETHNIQUES

        D                 bo Ganga                     ba Hulu
    Efe                   ba Goi                       wa Humu
\f                       LISTE V.
                   Noms linguistiques.
     Abulu-ti              li Bali
`;

    expect(
      extractVanBulckListFour(text, { firstPrintedPage: 131 }).map(
        ({ printedPage, rawLabel, simplifiedLabel }) => ({
          printedPage,
          rawLabel,
          simplifiedLabel,
        })
      )
    ).toEqual([
      { printedPage: 131, rawLabel: "Baie", simplifiedLabel: "Baie" },
      { printedPage: 131, rawLabel: "ba Binza", simplifiedLabel: "Binza" },
      { printedPage: 131, rawLabel: "Abulu", simplifiedLabel: "Abulu" },
      { printedPage: 131, rawLabel: "Balese", simplifiedLabel: "Balese" },
      { printedPage: 131, rawLabel: "ba Bira", simplifiedLabel: "Bira" },
      { printedPage: 131, rawLabel: "Aka", simplifiedLabel: "Aka" },
      { printedPage: 131, rawLabel: "ba Bali", simplifiedLabel: "Bali" },
      { printedPage: 131, rawLabel: "wa Bito", simplifiedLabel: "Bito" },
      { printedPage: 131, rawLabel: "Asua", simplifiedLabel: "Asua" },
      { printedPage: 131, rawLabel: "ba Beke", simplifiedLabel: "Beke" },
      { printedPage: 131, rawLabel: "ba Budu", simplifiedLabel: "Budu" },
      { printedPage: 132, rawLabel: "bo Ganga", simplifiedLabel: "Ganga" },
      { printedPage: 132, rawLabel: "ba Hulu", simplifiedLabel: "Hulu" },
      { printedPage: 132, rawLabel: "Efe", simplifiedLabel: "Efe" },
      { printedPage: 132, rawLabel: "ba Goi", simplifiedLabel: "Goi" },
      { printedPage: 132, rawLabel: "wa Humu", simplifiedLabel: "Humu" },
    ]);
  });
});

describe("simplifyVanBulckEthnonym", () => {
  // @req REQ-001
  it("removes grammatical prefixes but preserves multiword radicals", () => {
    expect(simplifyVanBulckEthnonym("ba Mbuti")).toBe("Mbuti");
    expect(simplifyVanBulckEthnonym("banya Rwanda")).toBe("Rwanda");
    expect(simplifyVanBulckEthnonym("ba<ma> Yombe")).toBe("Yombe");
    expect(simplifyVanBulckEthnonym("ba Luba Hemba")).toBe("Luba Hemba");
    expect(simplifyVanBulckEthnonym("ba Boma / Kongo")).toBe("Boma");
  });
});

describe("matchHistoricalInventoryToPeoples", () => {
  // @req REQ-001
  it("reports exact alias matches without choosing between ambiguous fiches", () => {
    const result = matchHistoricalInventoryToPeoples(
      [
        {
          sourceId: "VB1954-P134-001",
          printedPage: 134,
          rawLabel: "ba Mbuti",
          simplifiedLabel: "Mbuti",
        },
        {
          sourceId: "VB1954-P135-001",
          printedPage: 135,
          rawLabel: "tu Tshokwe",
          simplifiedLabel: "Tshokwe",
        },
        {
          sourceId: "VB1954-P136-001",
          printedPage: 136,
          rawLabel: "Yeki",
          simplifiedLabel: "Yeki",
        },
      ],
      [
        {
          id: "PPL_MBUTI",
          nameMain: "Mbuti",
          appellations: { spellingAliases: ["Bambuti"] },
        },
        {
          id: "PPL_CHOKWE",
          nameMain: "Chokwe",
          appellations: { exonyms: ["Tshokwe"] },
        },
        {
          id: "PPL_TSHOKWE",
          nameMain: "Tshokwe",
          appellations: { exonyms: ["Chokwe"] },
        },
      ]
    );

    expect(result.summary).toEqual({
      sourceEntries: 3,
      uniqueSourceLabels: 3,
      uniquelyMatchedEntries: 1,
      ambiguouslyMatchedEntries: 1,
      unmatchedEntries: 1,
      matchedLocalPeople: 3,
    });
    expect(result.matchedLocalPeopleIds).toEqual([
      "PPL_CHOKWE",
      "PPL_MBUTI",
      "PPL_TSHOKWE",
    ]);
    expect(result.entries).toMatchObject([
      { matchStatus: "unique", exactMatchIds: ["PPL_MBUTI"] },
      {
        matchStatus: "ambiguous",
        exactMatchIds: ["PPL_CHOKWE", "PPL_TSHOKWE"],
      },
      { matchStatus: "unmatched", exactMatchIds: [] },
    ]);
  });
});
