import { describe, expect, it } from "vitest";

import { buildFicheSourceRegister } from "@/lib/fiche/ficheSourceRegister";
import type { FicheSourceEntry } from "@/lib/afrik/ficheSourceLabel";

/**
 * A fiche's bibliography, numbered so a note callout has something to point at.
 *
 * Two sets meet here and neither is authoritative alone. The fiche JSON says
 * which sources the editors declared, and in what order — that is the list the
 * reader already sees at the foot of the page. The `sources` table says what an
 * assertion actually cites, with the identifiers a link needs. They overlap
 * heavily, because the loader wrote the table *from* the JSON, but they can
 * drift, and every rule below is about which way the drift is allowed to fall.
 */

const declared = (
  label: string,
  extra: Partial<FicheSourceEntry> = {}
): FicheSourceEntry => ({
  label,
  url: null,
  standing: "referenced",
  ...extra,
});

describe("buildFicheSourceRegister", () => {
  // @req REQ-092
  it("numbers the declared sources in the order the fiche declares them", () => {
    const register = buildFicheSourceRegister(
      [declared("Ethnologue"), declared("Glottolog"), declared("UNESCO")],
      []
    );

    expect(
      register.entries.map((entry) => [entry.number, entry.label])
    ).toEqual([
      [1, "Ethnologue"],
      [2, "Glottolog"],
      [3, "UNESCO"],
    ]);
  });

  /**
   * The loader upserts on `title`, so the normalised title is the join the two
   * sets already share — matching on anything else would invent a second
   * identity for the same work.
   */
  // @req REQ-092
  it("matches a cited source to its declared entry on the normalised title", () => {
    const register = buildFicheSourceRegister(
      [declared("  Ethnologue,  27th   edition ")],
      [{ id: "src-1", title: "ethnologue, 27th edition" }]
    );

    expect(register.entries).toHaveLength(1);
    expect(register.entries[0]).toMatchObject({
      number: 1,
      sourceId: "src-1",
    });
    expect(register.numberBySourceId["src-1"]).toBe(1);
  });

  /**
   * The rule that cannot bend: a note cites a source by id, so a cited source
   * with no number would leave a callout pointing at nothing.
   */
  // @req REQ-092
  it("adds a cited source the fiche never declared, rather than dropping it", () => {
    const register = buildFicheSourceRegister(
      [declared("Ethnologue")],
      [
        {
          id: "src-9",
          title: "Murdock, Africa: Its Peoples",
          url: "https://x.test",
        },
      ]
    );

    expect(register.entries).toHaveLength(2);
    expect(register.entries[1]).toMatchObject({
      number: 2,
      label: "Murdock, Africa: Its Peoples",
      sourceId: "src-9",
      url: "https://x.test",
    });
  });

  /**
   * The mirror rule: the declared list is what the fiche asserts it rests on,
   * and a directory that quietly deleted an entry nothing happens to cite would
   * be rewriting that assertion.
   */
  // @req REQ-092
  it("keeps a declared source that nothing cites, without a number in the id map", () => {
    const register = buildFicheSourceRegister(
      [declared("Ethnologue"), declared("An out-of-print monograph")],
      [{ id: "src-1", title: "Ethnologue" }]
    );

    expect(register.entries).toHaveLength(2);
    expect(register.entries[1].sourceId).toBeUndefined();
    expect(Object.keys(register.numberBySourceId)).toEqual(["src-1"]);
  });

  /**
   * `sources_title_key UNIQUE (title)` folds two homonymous works onto one row,
   * so the register folds them onto one number for the same reason — showing
   * "3" and "7" for what the database calls one source would promise a
   * distinction it cannot keep.
   */
  // @req REQ-092
  it("folds two declarations of the same title onto one number", () => {
    const register = buildFicheSourceRegister(
      [declared("Ethnologue"), declared("ETHNOLOGUE")],
      []
    );

    expect(register.entries).toHaveLength(1);
    expect(register.entries[0].number).toBe(1);
  });

  // @req REQ-092
  it("takes the standing of an unclassified cited source as awaiting review", () => {
    const register = buildFicheSourceRegister(
      [],
      [{ id: "src-2", title: "A source nobody tiered", tier: null }]
    );

    expect(register.entries[0].standing).toBe("needs_review");
  });

  // @req REQ-092
  it("returns an empty register for a fiche with neither list", () => {
    expect(buildFicheSourceRegister([], [])).toEqual({
      entries: [],
      numberBySourceId: {},
    });
  });

  /**
   * The declared entry is the one the reader already knows; the table only
   * fills what it left blank, so a re-sourcing cannot silently retitle a fiche's
   * bibliography.
   */
  // @req REQ-092
  it("lets the table fill a blank, never overwrite a declaration", () => {
    const register = buildFicheSourceRegister(
      [declared("Ethnologue", { url: null, notes: "Catalogue entry." })],
      [{ id: "src-1", title: "Ethnologue", url: "https://ethnologue.com" }]
    );

    expect(register.entries[0]).toMatchObject({
      label: "Ethnologue",
      url: "https://ethnologue.com",
      notes: "Catalogue entry.",
    });
  });
});
