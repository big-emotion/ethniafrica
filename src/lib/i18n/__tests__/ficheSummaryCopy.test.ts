import { describe, expect, it } from "vitest";

import { countryCopy } from "@/lib/i18n/copy/country";
import { peopleCopy } from "@/lib/i18n/copy/people";

describe("counted fiche summary copy (REQ-151)", () => {
  // @req REQ-151
  it("states the scope of every country count in both locales", () => {
    expect(countryCopy.fr.summary).toMatchObject({
      population: "Population du pays",
      peoplesDocumentedHere: "Peuples documentés ici",
      languagesDocumentedHere: "Langues documentées ici",
      familiesDocumentedHere: "Familles linguistiques documentées ici",
      namesReferencedHere: "Noms référencés ici",
    });
    expect(countryCopy.en.summary).toMatchObject({
      population: "Country population",
      peoplesDocumentedHere: "Peoples documented here",
      languagesDocumentedHere: "Languages documented here",
      familiesDocumentedHere: "Language families documented here",
      namesReferencedHere: "Names referenced here",
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
      namesReferencedHere: "Noms référencés ici",
    });
    expect(peopleCopy.en.summary).toMatchObject({
      persons: "Persons recorded for this people",
      countriesOfPresence: "Countries of documented presence",
      mainLanguage: "Main language",
      linguisticFamily: "Language family",
      namesReferencedHere: "Names referenced here",
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

    expect(countryCopy.fr.summary.missingData).toBe(
      "Non renseigné dans l’atlas"
    );
    expect(countryCopy.en.summary.missingData).toBe(
      "Not recorded in the atlas"
    );
    expect(peopleCopy.fr.summary.missingData).toBe(
      "Non renseigné dans l’atlas"
    );
    expect(peopleCopy.en.summary.missingData).toBe("Not recorded in the atlas");

    for (const summary of [
      countryCopy.fr.summary,
      countryCopy.en.summary,
      peopleCopy.fr.summary,
      peopleCopy.en.summary,
    ]) {
      expect(summary.missingData).toBeTruthy();
      expect(summary.factTier).toBeTruthy();
      expect(summary.missingData).not.toMatch(/\b(?:0|undefined|unknown)\b/i);
    }
  });
});
