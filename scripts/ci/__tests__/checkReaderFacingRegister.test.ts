import { describe, expect, it } from "vitest";

import {
  checkReaderFacingRegister,
  readerFacingProseFields,
} from "../checkEditorialRules";

const FICHE = "dataset/source/afrik/patronymes/PAT_BAMBA_CLAN.json";

/**
 * A fiche has two registers and only one of them is published. The corpus
 * carries the curator's working notes — where a passage was read, which tier
 * is still unresolved, what the next research pass owes — and the fiche
 * surface renders `gaps[].reason` and the `sources[]` entries verbatim. So
 * every one of those notes reached the reader: a name fiche told its visitor
 * that a field awaited "le protocole de recherche par fiche" and cited
 * `dataset/source/afrik/peuples/FLG_MANDE/PPL_DIOULA.json#content.organization.clanOrganization`
 * as a source.
 *
 * The rule does not ask the curator to stop taking notes. It asks that the
 * notes rendered to a reader speak to the reader.
 */
describe("editorial rules — reader-facing register", () => {
  // @req REQ-133
  it("refuses a repository path in a gap reason", () => {
    const findings = checkReaderFacingRegister(
      {
        id: "PAT_X",
        gaps: [
          {
            fieldPath: "bearers",
            reason:
              "Origine : dataset/source/afrik/patronymes/_candidates-by-country.json.",
          },
        ],
      },
      FICHE
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("error");
    expect(findings[0].rule).toBe("reader-facing-register");
    expect(findings[0].message).toContain("gaps[0].reason");
  });

  // @req REQ-133
  it("refuses a JSON field path in a source note", () => {
    const findings = checkReaderFacingRegister(
      {
        id: "PAT_X",
        sources: [
          {
            sourceKey: "k",
            title: "Un titre lisible",
            notes:
              "Passage source : PPL_DIOULA.json#content.organization.clanOrganization.",
          },
        ],
      },
      FICHE
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("sources[0].notes");
  });

  // @req REQ-133
  it("refuses a raw corpus identifier in a source title", () => {
    const findings = checkReaderFacingRegister(
      {
        id: "PAT_X",
        sources: [{ sourceKey: "k", title: "Corpus AFRIK — PPL_DIOULA" }],
      },
      FICHE
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("sources[0].title");
  });

  // "fiche PAT_* existante" reached 468 readers because the identifier
  // pattern wanted a letter after the underscore.
  // @req REQ-133
  it("refuses a wildcard corpus identifier in a gap reason", () => {
    const findings = checkReaderFacingRegister(
      {
        id: "PAT_X",
        gaps: [
          {
            fieldPath: "alliances",
            reason:
              "Aucune paire documentée dont les deux noms disposent de fiches PAT_* distinctes.",
          },
        ],
      },
      FICHE
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("PAT_*");
  });

  // The vocabulary of the pipeline is the subtler leak: it carries no path and
  // no identifier, so it reads as prose — and tells the reader about a queue,
  // a research protocol and a review backlog that are none of their business.
  // @req REQ-133
  it("refuses curation vocabulary even when it reads as ordinary prose", () => {
    const findings = checkReaderFacingRegister(
      {
        id: "PAT_X",
        gaps: [
          {
            fieldPath: "origin",
            reason:
              "Fiche générée depuis la file d'attente des candidats : le champ n'a pas été renseigné faute de recherche, et attend le protocole de recherche par fiche.",
          },
        ],
      },
      FICHE
    );

    expect(findings).toHaveLength(1);
  });

  // @req REQ-133
  it("accepts a gap reason written for the reader", () => {
    expect(
      checkReaderFacingRegister(
        {
          id: "PAT_X",
          gaps: [
            {
              fieldPath: "origin",
              reason:
                "L'atlas ne documente pas encore l'origine de ce nom : aucune source dédiée n'a été consultée.",
            },
          ],
          sources: [
            {
              sourceKey: "k",
              title: "Bamadaba — dictionnaire des noms claniques",
              notes: "Annexe onomastique du dictionnaire bambara-français.",
            },
          ],
        },
        FICHE
      )
    ).toEqual([]);
  });

  // A name fiche nests its sources one level deeper. The first version of this
  // rule read only the top-level `sources`, and the two `noms/` fiches that
  // cite a people file by its repository path went on citing it.
  // @req REQ-133
  it("reads sources nested inside a name entry", () => {
    const findings = checkReaderFacingRegister(
      {
        id: "wol",
        names: [
          {
            sources: [
              {
                sourceKey: "k",
                title: "Un titre",
                notes:
                  "Source déjà citée dans dataset/source/afrik/peuples/FLG_ATLANTIQUE/PPL_WOLOF.json.",
              },
            ],
          },
        ],
      },
      "dataset/source/afrik/noms/PPL_WOLOF.json"
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("names[0].sources[0].notes");
  });

  // `_candidates-by-country.json` and its siblings are the curator's own
  // worksheets, not fiches: nothing loads them and nothing renders them. A
  // rule that audited them would be asking working notes to stop being
  // working notes.
  // @req REQ-133
  it("leaves the curator's worksheets alone", () => {
    expect(
      checkReaderFacingRegister(
        {
          entries: [
            {
              corpusPassages: [
                {
                  file: "dataset/source/afrik/peuples/FLG_MANDE/PPL_DIOULA.json",
                },
              ],
            },
          ],
        },
        "dataset/source/afrik/patronymes/_candidates-by-country.json"
      )
    ).toEqual([]);
  });

  // @req REQ-133
  it("names every reader-facing prose field it found", () => {
    const fields = readerFacingProseFields({
      gaps: [{ reason: "a" }],
      sources: [{ title: "b", notes: "c" }],
      names: [{ sources: [{ title: "d" }] }],
    });

    expect(fields.map((f) => f.path)).toEqual([
      "gaps[0].reason",
      "sources[0].title",
      "sources[0].notes",
      "names[0].sources[0].title",
    ]);
  });
});
