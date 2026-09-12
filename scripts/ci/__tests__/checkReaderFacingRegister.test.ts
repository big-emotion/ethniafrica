import { describe, expect, it } from "vitest";

import {
  checkReaderFacingRegister,
  INTERNAL_REGISTER_PATTERNS_EN,
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

  // A translated sidecar publishes the same fields, in English, and a
  // machine translation of the workshop's vocabulary is still the workshop's
  // vocabulary.
  // @req REQ-146
  it("refuses the English rendering of curation vocabulary in a translated record", () => {
    const findings = checkReaderFacingRegister(
      {
        id: "PAT_X",
        gaps: [
          {
            fieldPath: "origin",
            reason:
              "Generated from the candidate queue: the field awaits the per-record research protocol.",
          },
        ],
      },
      "dataset/translations/en/patronymes/PAT_X.json",
      INTERNAL_REGISTER_PATTERNS_EN
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("gaps[0].reason");
  });

  // @req REQ-146
  it("keeps the language-neutral leaks — paths and identifiers — in the English list", () => {
    const findings = checkReaderFacingRegister(
      {
        id: "PAT_X",
        sources: [
          {
            sourceKey: "k",
            title: "Corpus AFRIK — PPL_DIOULA",
            notes:
              "Taken from dataset/source/afrik/peuples/FLG_MANDE/PPL_DIOULA.json.",
          },
        ],
      },
      "dataset/translations/en/patronymes/PAT_X.json",
      INTERNAL_REGISTER_PATTERNS_EN
    );

    expect(findings.map((f) => f.message)).toEqual([
      expect.stringContaining("sources[0].title"),
      expect.stringContaining("sources[0].notes"),
    ]);
  });

  // @req REQ-146
  it("accepts an English gap reason written for the reader", () => {
    expect(
      checkReaderFacingRegister(
        {
          id: "PAT_X",
          gaps: [
            {
              fieldPath: "origin",
              reason:
                "The atlas does not yet document the origin of this name: no dedicated source has been consulted.",
            },
          ],
        },
        "dataset/translations/en/patronymes/PAT_X.json",
        INTERNAL_REGISTER_PATTERNS_EN
      )
    ).toEqual([]);
  });

  // The tiering codemod wrote its own reasoning into 5 000 source notes —
  // which catalogue entry or domain ruling set the tier, or that nobody had
  // ruled yet. It reads as a sober English sentence and names no path, so the
  // gate let every one of them through to the reader.
  const TIER_PROVENANCE_NOTES = [
    "Tier resolved from the domain ruling for jstor.org.",
    "Tier inferred from published-citation shape (named author and publication year); no domain ruling applies.",
    "No URL and no recognisable citation shape; the tier awaits editorial review.",
    'Tier resolved from the authorized source catalogue entry "ethnologue".',
    "No domain ruling covers kanaga-at.com; the tier awaits editorial review.",
    // Curators who followed the codemod wrote the same reasoning by hand.
    "Resolved from the prior needs_review standing (no URL) once the museum's own announcement was located.",
    "Catalogued on the French national theses portal; tiered referenced as an identifiable, verifiable academic work.",
  ];

  // @req REQ-133
  it("refuses the tiering codemod's provenance sentences in a translated source note", () => {
    for (const notes of TIER_PROVENANCE_NOTES) {
      const findings = checkReaderFacingRegister(
        { id: "MWI", sources: [{ title: "Un titre", notes }] },
        "dataset/translations/en/pays/MWI.json",
        INTERNAL_REGISTER_PATTERNS_EN
      );

      expect(findings, notes).toHaveLength(1);
      expect(findings[0].message).toContain("sources[0].notes");
    }
  });

  // People, country and family fiches keep their sources under `content`, and
  // the Sources chapter renders them from there. Reading only the top-level
  // array — where name fiches keep theirs — left 854 fiches unchecked.
  // @req REQ-133
  it("reads the sources a people, country or family fiche keeps under content", () => {
    const findings = checkReaderFacingRegister(
      {
        id: "PPL_X",
        content: {
          sources: [{ title: "Un titre", notes: TIER_PROVENANCE_NOTES[2] }],
        },
      },
      "dataset/source/afrik/peuples/FLG_X/PPL_X.json"
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("content.sources[0].notes");
  });

  // A French fiche carries these sentences in English: the codemod wrote them
  // in one language whatever the fiche's own, so reading a French fiche with
  // the French list alone is how 3 291 of them passed.
  // @req REQ-133
  it("refuses an English provenance sentence inside a French source fiche", () => {
    const findings = checkReaderFacingRegister(
      {
        id: "PPL_X",
        sources: [{ title: "Un titre", notes: TIER_PROVENANCE_NOTES[0] }],
      },
      "dataset/source/afrik/peuples/FLG_X/PPL_X.json"
    );

    expect(findings).toHaveLength(1);
  });

  // @req REQ-133
  it("accepts a source note that mentions a domain without ruling on it", () => {
    expect(
      checkReaderFacingRegister(
        {
          id: "PPL_X",
          sources: [
            {
              title: "Carte ancienne",
              notes:
                "Map in the public domain, held and digitised by the Bibliothèque nationale de France.",
            },
          ],
        },
        "dataset/source/afrik/peuples/FLG_X/PPL_X.json"
      )
    ).toEqual([]);
  });
});
