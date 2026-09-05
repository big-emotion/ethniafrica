import { describe, expect, it } from "vitest";

import { buildScaleFacts } from "@/lib/games/scaleFacts";
import { buildScaleFactsEn } from "@/lib/games/scaleFacts.en";
import { revealProvenanceEn } from "@/lib/games/revealProvenance.en";
import {
  figuresIn,
  frenchResidue,
  glossaryBreaches,
  readsAsUntranslated,
} from "@/test/englishBankParity";

/** The one place name the English keeps in French, being its name in English too. */
const PROPER_NAMES = ["Pointe des Almadies"];

const french = buildScaleFacts();
const english = buildScaleFactsEn();

describe("the English scale facts", () => {
  // @req REQ-145
  it("answers every French fact by id, and no other", () => {
    expect(Object.keys(english).sort()).toEqual(
      french.map((fact) => fact.id).sort()
    );
  });

  // @req REQ-145
  it("translates every headline and body instead of leaving the French in place", () => {
    for (const fact of french) {
      const counterpart = english[fact.id];
      expect(readsAsUntranslated(fact.headlineFr, counterpart.headlineEn)).toBe(
        false
      );
      expect(readsAsUntranslated(fact.bodyFr, counterpart.bodyEn)).toBe(false);
      expect(frenchResidue(counterpart.headlineEn, PROPER_NAMES)).toBeNull();
      expect(frenchResidue(counterpart.bodyEn, PROPER_NAMES)).toBeNull();
      expect(glossaryBreaches(counterpart.headlineEn)).toEqual([]);
      expect(glossaryBreaches(counterpart.bodyEn)).toEqual([]);
    }
  });

  /**
   * The bank's one rule is that every figure is measured, never typed. The
   * English fact is measured off the same outlines, so the two locales must
   * state the same numbers to the same rounding — a drift here means one
   * reader is shown a figure the other is not.
   */
  // @req REQ-145
  it("states exactly the figures the French fact measured", () => {
    for (const fact of french) {
      const counterpart = english[fact.id];
      expect(figuresIn(counterpart.headlineEn, "en")).toEqual(
        figuresIn(fact.headlineFr, "fr")
      );
      expect(figuresIn(counterpart.bodyEn, "en")).toEqual(
        figuresIn(fact.bodyFr, "fr")
      );
    }
  });

  // @req REQ-145
  it("rests on the same provenance path, worded in English", () => {
    for (const fact of french) {
      expect(english[fact.id].fieldPath).toBe(fact.fieldPath);
      expect(revealProvenanceEn(fact.fieldPath)).toBeTruthy();
    }
  });

  // @req REQ-142
  it("declares machine provenance on every fact", () => {
    for (const fact of Object.values(english)) {
      expect(fact.provenance).toBe("machine");
    }
  });

  // @req REQ-145
  it("names the far end of each comparison in its English form", () => {
    expect(english["largeur-afrique"].bodyEn).toContain("Beijing");
    expect(english["caire-le-cap"].headlineEn).toContain("Cairo");
    expect(english["afrique-groenland"].headlineEn).toContain("Greenland");
  });
});
