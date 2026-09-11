import { describe, expect, it } from "vitest";

import {
  WALLPAPER_FORMATS,
  findFormat,
  typeScaleFor,
} from "@/lib/wallpaper/formats";
import {
  LADDER_RUNG_IDS,
  findRung,
  scaleLadder,
} from "@/lib/i18n/copy/scaleLadder";
import { LOCALES } from "@/lib/locale";
import type { Language } from "@/types/shared";

describe("wallpaper formats", () => {
  // @req REQ-132
  it("offers a 4:5 portrait, because Meta's composer refuses a 9:16 file", () => {
    const portrait = findFormat("portrait");

    expect(portrait).toBeDefined();
    expect(portrait!.width / portrait!.height).toBeCloseTo(4 / 5, 3);
  });

  // @req REQ-132
  it("gives every format a distinct id and a usable canvas", () => {
    const ids = WALLPAPER_FORMATS.map((format) => format.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const format of WALLPAPER_FORMATS) {
      expect(format.width).toBeGreaterThanOrEqual(1080);
      expect(format.height).toBeGreaterThanOrEqual(630);
    }
  });

  /**
   * The composition is written once and scaled, so a 2560-wide desktop canvas
   * and a 1080-wide square must not need two sets of numbers kept in step.
   */
  // @req REQ-132
  it("scales type from the shorter side, so the composition survives every canvas", () => {
    const square = typeScaleFor({ id: "t", width: 1080, height: 1080 });
    const desktop = typeScaleFor({ id: "t", width: 2560, height: 1440 });

    expect(desktop.magnitude).toBeGreaterThan(square.magnitude);
    for (const scale of [square, desktop]) {
      expect(scale.magnitude).toBeGreaterThan(scale.subject);
      expect(scale.subject).toBeGreaterThan(scale.anchor);
      expect(scale.anchor).toBeGreaterThan(scale.footer);
    }
  });
});

describe("scale ladder", () => {
  // @req REQ-132
  it("keeps the same six rungs in the same order in both locales", () => {
    for (const locale of LOCALES) {
      const ids = scaleLadder[locale as Language].rungs.map((rung) => rung.id);
      expect(ids).toEqual(LADDER_RUNG_IDS);
    }
    expect(LADDER_RUNG_IDS).toHaveLength(6);
  });

  /**
   * A rung with no checkable anchor is a slogan, and on a sourced atlas a
   * slogan is a lie about the corpus. The ladder's whole claim is that each
   * magnitude rests on something dated.
   */
  // @req REQ-132
  it("gives every rung a dated anchor and a place to verify it", () => {
    // A year, or a century spelled out — the prose register writes "du
    // treizième au seizième siècle" where the fiche stores 1201 to 1600.
    const dated =
      /\d{3,4}|(?:onzième|douzième|treizième|quatorzième|quinzième|seizième|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth)/i;

    for (const locale of LOCALES) {
      for (const rung of scaleLadder[locale as Language].rungs) {
        expect(rung.anchor.length).toBeGreaterThan(30);
        expect(rung.provenance.length).toBeGreaterThan(10);
        expect(rung.anchor).toMatch(dated);
      }
    }
  });

  /**
   * Two of the six are outside the corpus. A sourced neighbour must not be
   * allowed to vouch for them, so the flag is data and the surface reads it.
   */
  // @req REQ-132
  it("marks the two rungs the corpus does not itself carry", () => {
    const outside = scaleLadder.fr.rungs
      .filter((rung) => !rung.anchoredInCorpus)
      .map((rung) => rung.id);

    expect(outside).toEqual(["border", "sapiens"]);

    // The badge carries the words; the provenance says where the fact is held
    // instead of repeating them. The surface printed "Hors corpus · Fait
    // historique, hors corpus" until the render was looked at.
    for (const id of outside) {
      expect(findRung("fr", id)!.provenance).not.toMatch(/hors corpus/i);
      expect(findRung("en", id)!.provenance).not.toMatch(/outside the corpus/i);
      expect(findRung("fr", id)!.provenance).toMatch(/hors de l’atlas/i);
      expect(findRung("en", id)!.provenance).toMatch(/outside the atlas/i);
    }

    // And a rung the corpus does carry names where in the corpus.
    for (const rung of scaleLadder.fr.rungs.filter((r) => r.anchoredInCorpus)) {
      expect(rung.provenance).toMatch(/^Corpus/);
    }
  });

  // @req REQ-145
  it("ends on the sentence the ladder exists to make unavoidable", () => {
    expect(scaleLadder.fr.reframe).toMatch(
      /la frontière est ce qu’il y a de plus récent/i
    );
    expect(scaleLadder.en.reframe).toMatch(/the border is the most recent/i);
  });
});
