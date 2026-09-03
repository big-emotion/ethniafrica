import { describe, expect, it } from "vitest";

import {
  PEOPLE_NOTE_FIELDS,
  buildPeopleFicheNotes,
} from "@/components/people/peopleFicheNotes";
import type { FieldNote } from "@/lib/supabase/queries/afrik/module-zero-batch";

/**
 * Note numbers, allocated in reading order.
 *
 * The database returns assertions in whatever order it likes, and a reader
 * numbers what they read: a callout printing [4] above one printing [2] is not
 * a cosmetic defect, it is a claim about the document that is false.
 */

const note = (
  fieldPath: string,
  overrides: Partial<FieldNote> = {}
): FieldNote => ({
  fieldPath,
  assertionId: `a-${fieldPath}`,
  statement: "…",
  confidenceLevel: null,
  sources: [
    {
      id: "s-1",
      title: "Ethnologue",
      url: null,
      tier: "official",
      notes: null,
      author: null,
      year: null,
    },
  ],
  ...overrides,
});

describe("buildPeopleFicheNotes", () => {
  // @req REQ-019
  it("numbers in the fiche's reading order, not the order the database answered in", () => {
    const built = buildPeopleFicheNotes(
      [
        note("content.culture.majorRites"),
        note("content.origins.ancientOrigins"),
        note("content.historicalRole.kingdomsOrChiefdoms"),
      ],
      {}
    );

    expect(built.origin.ancientOrigins?.noteNumber).toBe(1);
    expect(built.history.kingdomsOrChiefdoms?.noteNumber).toBe(2);
    expect(built.culture.majorRites?.noteNumber).toBe(3);
  });

  /**
   * A field the corpus has not sourced simply carries no callout. It must not
   * consume a number either — a gap in the sequence would read as a note the
   * reader failed to find.
   */
  // @req REQ-019
  it("leaves no gap in the sequence for an unsourced field", () => {
    const built = buildPeopleFicheNotes(
      [note("content.origins.ancientOrigins"), note("content.culture.symbols")],
      {}
    );

    expect(built.origin.ancientOrigins?.noteNumber).toBe(1);
    expect(built.culture.symbols?.noteNumber).toBe(2);
    expect(built.culture.majorRites).toBeUndefined();
    expect(built.count).toBe(2);
  });

  // @req REQ-019
  it("names the field, so a callout has an accessible name rather than a bare number", () => {
    const built = buildPeopleFicheNotes(
      [note("content.culture.majorRites")],
      {}
    );

    expect(built.culture.majorRites?.fieldLabel).toBe("Rites majeurs");
  });

  /**
   * The bridge between the two registers: the callout is numbered by reading
   * order, its sources by the fiche's bibliography, and the panel is where a
   * reader sees the second number.
   */
  // @req REQ-019
  it("carries each source's bibliography number for the panel to show", () => {
    const built = buildPeopleFicheNotes([note("content.culture.majorRites")], {
      "s-1": 4,
    });

    expect(built.culture.majorRites?.numberBySourceId).toEqual({ "s-1": 4 });
  });

  /**
   * Derived from the field, never from the number: inserting a chapter
   * renumbers every note below it, and `#chip-…` links are already shareable —
   * the sheet opens itself when the hash matches.
   */
  // @req REQ-019
  it("anchors a note on its field, so a shared link survives a renumbering", () => {
    const built = buildPeopleFicheNotes(
      [note("content.culture.majorRites")],
      {}
    );

    expect(built.culture.majorRites?.anchorId).toBe(
      "chip-content-culture-majorrites"
    );
  });

  // @req REQ-019
  it("marks a contested assertion so the callout can say so", () => {
    const built = buildPeopleFicheNotes(
      [note("content.culture.symbols", { confidenceLevel: "contested" })],
      {}
    );

    expect(built.culture.symbols?.contested).toBe(true);
  });

  // @req REQ-019
  it("ignores a field path the fiche does not render, without failing", () => {
    const built = buildPeopleFicheNotes(
      [
        note("content.demography.distributionByCountry"),
        note("languageFamilyId"),
      ],
      {}
    );

    expect(built.count).toBe(0);
  });

  // @req REQ-019
  it("produces nothing for a fiche the corpus has not sourced", () => {
    const built = buildPeopleFicheNotes([], {});

    expect(built.count).toBe(0);
    expect(built.culture).toEqual({});
  });

  /**
   * The order constant is the single source of numbering, so it has to name
   * paths that exist. A typo here is silent: the field simply never gets a
   * callout.
   */
  // @req REQ-019
  it("declares every field under a section the fiche actually renders", () => {
    const sections = new Set(PEOPLE_NOTE_FIELDS.map((field) => field.section));

    expect([...sections].sort()).toEqual([
      "culture",
      "history",
      "language",
      "origin",
    ]);
    expect(PEOPLE_NOTE_FIELDS.every((field) => field.path.length > 0)).toBe(
      true
    );
  });
});
