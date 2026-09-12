import { describe, expect, it } from "vitest";

import { countryCopy } from "@/lib/i18n/copy/country";
import { peopleCopy } from "@/lib/i18n/copy/people";

describe("counted fiche summary copy (REQ-151)", () => {
  // @req REQ-155
  it("keeps the new people chapter labels in both locale dictionaries", () => {
    expect(peopleCopy.fr.chapterDetails).toMatchObject({
      historyChronology: "Chronologie historique",
      historyUndated: "Non daté",
      historyRole: "Rôle historique",
      cultureRitesAndSymbols: "Rites & symboles",
    });
    expect(peopleCopy.en.chapterDetails).toMatchObject({
      historyChronology: "Historical chronology",
      historyUndated: "Undated",
      historyRole: "Historical role",
      cultureRitesAndSymbols: "Rites and symbols",
    });
    expect(peopleCopy.fr.chapterDetails.associatedGroups(2)).toBe(
      "2 groupes associés"
    );
    expect(peopleCopy.fr.chapterDetails.documentedRelations(1)).toBe(
      "1 relation documentée"
    );
    expect(peopleCopy.en.chapterDetails.associatedGroups(2)).toBe(
      "2 associated groups"
    );
    expect(peopleCopy.en.chapterDetails.documentedRelations(1)).toBe(
      "1 documented relation"
    );
  });

  /**
   * The scope used to be folded into the label, so every count read as a
   * sentence: "Peuples documentés ici" above the number 3. Under a figure
   * that is a name, and a name wants to be short. The qualification moves to
   * a line of its own beneath, which is where a reader looks for it, and
   * which leaves room to say something different when the count is absent.
   */
  // @req REQ-151
  it("splits every country count into a name, its scope and its silence", () => {
    expect(countryCopy.fr.summary.figures).toMatchObject({
      population: { label: "habitants", absent: "population non renseignée" },
      peoples: {
        label: "peuples",
        scope: "documentés ici",
        absent: "aucun peuple documenté ici",
      },
      languages: {
        label: "langues",
        scope: "documentées ici",
        absent: "aucune langue documentée ici",
      },
      families: {
        label: "familles linguistiques",
        scope: "documentées ici",
        absent: "aucune famille documentée ici",
      },
      names: {
        label: "noms",
        scope: "référencés ici",
        absent: "aucun nom référencé ici",
      },
    });
    expect(countryCopy.en.summary.figures).toMatchObject({
      population: { label: "inhabitants", absent: "population not recorded" },
      peoples: {
        label: "peoples",
        scope: "documented here",
        absent: "no people documented here",
      },
      languages: {
        label: "languages",
        scope: "documented here",
        absent: "no language documented here",
      },
      families: {
        label: "language families",
        scope: "documented here",
        absent: "no language family documented here",
      },
      names: {
        label: "names",
        scope: "referenced here",
        absent: "no name referenced here",
      },
    });
    expect(countryCopy.fr.summary.title).toBe("En bref");
    expect(countryCopy.en.summary.title).toBe("In brief");
  });

  // @req REQ-151
  it("states the scope of the people counts and distinguishes text facts", () => {
    expect(peopleCopy.fr.summary).toMatchObject({
      persons: "Personnes déclarées pour ce peuple",
      countriesOfPresence: "Pays de présence documentée",
      mainLanguage: "Langue principale",
      linguisticFamily: "Famille linguistique",
      namesReferencedHere: "Noms portés référencés ici",
    });
    expect(peopleCopy.en.summary).toMatchObject({
      persons: "Persons recorded for this people",
      countriesOfPresence: "Countries of documented presence",
      mainLanguage: "Main language",
      linguisticFamily: "Language family",
      namesReferencedHere: "Names borne and referenced here",
    });
    expect(peopleCopy.fr.summary.title).toBe("En bref");
    expect(peopleCopy.en.summary.title).toBe("In brief");
  });

  // @req REQ-151
  it("labels reference years, absent figures, and source tier without a fabricated value", () => {
    expect(countryCopy.fr.summary.referenceYear(2025)).toBe(
      "Année de référence : 2025"
    );
    expect(countryCopy.en.summary.referenceYear(2025)).toBe(
      "Reference year: 2025"
    );
    expect(peopleCopy.fr.summary.referenceYear(2025)).toBe(
      "Année de référence : 2025"
    );
    expect(peopleCopy.en.summary.referenceYear(2025)).toBe(
      "Reference year: 2025"
    );

    // The people record still states its silence as one sentence for all five
    // slots. The country record now says it once per count, in words that fit
    // the count, which is why only one of the two keeps this key.
    expect(peopleCopy.fr.summary.missingData).toBe(
      "Non renseigné dans l’atlas"
    );
    expect(peopleCopy.en.summary.missingData).toBe("Not recorded in the atlas");

    for (const summary of [peopleCopy.fr.summary, peopleCopy.en.summary]) {
      expect(summary.missingData).toBeTruthy();
      expect(summary.missingData).not.toMatch(/\b(?:0|undefined|unknown)\b/i);
    }

    // Whatever a count's silence is called, it never reads as a measurement.
    for (const locale of [countryCopy.fr, countryCopy.en]) {
      for (const figure of Object.values(locale.summary.figures)) {
        expect(figure.absent).toBeTruthy();
        expect(figure.absent).not.toMatch(/\b(?:0|undefined|unknown)\b/i);
      }
    }

    for (const summary of [
      countryCopy.fr.summary,
      countryCopy.en.summary,
      peopleCopy.fr.summary,
      peopleCopy.en.summary,
    ]) {
      expect(summary.factTier).toBeTruthy();
    }
  });
});
