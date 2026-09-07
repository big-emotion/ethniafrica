import { describe, expect, it } from "vitest";

import { diffFamilyArchive } from "../lib/familyArchiveDiff";

const ARCHIVE = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)
- Auto-appellation : Tamazight

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
- Branches : Nord, Touareg

# 2. Peuples associés
- Kabyles, Touaregs

# 3. Caractéristiques linguistiques
- État construit et annexion, ordre VSO.

# 4. Histoire et origines

## 4.1. Origine et classification linguistique
- Rattachement afro-asiatique discuté.

## 4.2. Origines géographiques et archéologiques
- Gabriel Camps (1987) associe le proto-berbère au Néolithique capsien, 9000 av. JC.
- Cheikh Anta Diop conteste la séparation entre Afrique du Nord et Afrique subsaharienne.

# 5. Répartition géographique et démographie
- Algérie, Maroc.

# 6. Sources
- Camps, Gabriel (1987)
`;

function fiche(content: Record<string, unknown>) {
  return { id: "FLG_TEST", content };
}

describe("diffFamilyArchive", () => {
  /**
   * The berber case: the archive section is substantial and the JSON target is
   * `{}`. It is the loudest possible signal and the only one a character ratio
   * would have caught.
   */
  // @req REQ-148
  it("flags a section whose target is empty", () => {
    const diff = diffFamilyArchive(
      "FLG_TEST",
      ARCHIVE,
      fiche({
        historyAndOrigins: {},
        linguisticCharacteristics: { typology: "État construit, ordre VSO." },
      })
    );
    const history = diff.sections.find(
      (s) => s.target === "content.historyAndOrigins"
    );
    expect(history?.emptyTarget).toBe(true);
    const linguistics = diff.sections.find(
      (s) => s.target === "content.linguisticCharacteristics"
    );
    expect(linguistics?.emptyTarget).toBe(false);
  });

  /**
   * The signal a ratio cannot give: the ten other families kept their sections
   * and lost their contents. Named anchors are what shows that.
   */
  // @req REQ-148
  it("reports the years, names and citations the JSON no longer carries", () => {
    const diff = diffFamilyArchive(
      "FLG_TEST",
      ARCHIVE,
      fiche({ historyAndOrigins: { probableOrigin: "Développement in situ." } })
    );
    const history = diff.sections.find(
      (s) => s.target === "content.historyAndOrigins"
    );
    expect(history?.missingAnchors).toContain("1987");
    expect(history?.missingAnchors).toContain("9000");
    expect(history?.missingAnchors.join(" ")).toMatch(/gabriel camps/i);
    expect(history?.missingAnchors.join(" ")).toMatch(/cheikh anta/i);
  });

  // @req REQ-148
  it("finds an anchor the JSON words differently", () => {
    const diff = diffFamilyArchive(
      "FLG_TEST",
      ARCHIVE,
      fiche({
        historyAndOrigins: {
          probableOrigin:
            "Gabriel Camps (1987) rattache le proto-berbère au capsien, vers 9000 av. J.-C. ; Cheikh Anta Diop conteste la coupure.",
        },
      })
    );
    const history = diff.sections.find(
      (s) => s.target === "content.historyAndOrigins"
    );
    expect(history?.missingAnchors).not.toContain("1987");
    expect(history?.missingAnchors).not.toContain("9000");
  });

  /**
   * "150 000 locuteurs" contains no year. A bare four-digit scan reads two out
   * of it, and the ratchet would then be counting thousands separators.
   */
  // @req REQ-148
  it("does not mistake a thousands separator for a year", () => {
    const archive = ARCHIVE.replace(
      "- Algérie, Maroc.",
      "- Algérie, Maroc : 150 000 locuteurs recensés."
    );
    const diff = diffFamilyArchive("FLG_TEST", archive, fiche({}));
    const distribution = diff.sections.find(
      (s) => s.target === "content.distribution"
    );
    expect(distribution?.missingAnchors).not.toContain("000");
    expect(distribution?.missingAnchors).not.toContain("150");
  });

  // @req REQ-148
  it("keeps a three-digit year that is not a separator artefact", () => {
    const archive = ARCHIVE.replace(
      "- Rattachement afro-asiatique discuté.",
      "- Dynastie rustamide, 776-909."
    );
    const diff = diffFamilyArchive("FLG_TEST", archive, fiche({}));
    const history = diff.sections.find(
      (s) => s.target === "content.historyAndOrigins"
    );
    expect(history?.missingAnchors).toContain("776");
    expect(history?.missingAnchors).toContain("909");
  });

  // @req REQ-148
  it("names the sub-headings of a section that vanished whole", () => {
    const diff = diffFamilyArchive(
      "FLG_TEST",
      ARCHIVE,
      fiche({ historyAndOrigins: {} })
    );
    const history = diff.sections.find(
      (s) => s.target === "content.historyAndOrigins"
    );
    expect(history?.missingSubheadings.join(" ")).toMatch(
      /Origines géographiques et archéologiques/
    );
  });

  /**
   * Restored content rewords its subject, so a title-word search reports it
   * absent while every claim it covers is present. A signal that stays red on
   * correct work teaches people to ignore the signal.
   */
  // @req REQ-148
  it("stops naming sub-headings once the section carries prose again", () => {
    const diff = diffFamilyArchive(
      "FLG_TEST",
      ARCHIVE,
      fiche({
        historyAndOrigins: {
          probableOrigin:
            "Gabriel Camps (1987) rattache le proto-berbère au capsien, vers 9000 av. J.-C.",
        },
      })
    );
    const history = diff.sections.find(
      (s) => s.target === "content.historyAndOrigins"
    );
    expect(history?.missingSubheadings).toEqual([]);
  });

  // @req REQ-148
  it("does not crash on an archive missing a heading it expects", () => {
    const diff = diffFamilyArchive("FLG_TEST", "# Famille linguistique\n", {
      id: "FLG_TEST",
      content: {},
    });
    expect(diff.sections.every((s) => s.archiveChars === 0)).toBe(true);
    expect(diff.totalMissingAnchors).toBe(0);
  });

  /**
   * The ratchet reads this output on every run, so two runs over the same
   * inputs must produce the same numbers — otherwise the gate would flap.
   */
  // @req REQ-148
  it("is deterministic", () => {
    const target = fiche({ historyAndOrigins: { probableOrigin: "x" } });
    expect(diffFamilyArchive("FLG_TEST", ARCHIVE, target)).toEqual(
      diffFamilyArchive("FLG_TEST", ARCHIVE, target)
    );
  });
});
