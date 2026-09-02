import { describe, expect, it } from "vitest";

import { NOMMER_BIBLIOGRAPHY } from "@/lib/dossiers/nommer/bibliography";
import { NOMMER_CHAPTERS } from "@/lib/dossiers/nommer/chapters";
import { GLOSSARY_ENTRIES } from "@/lib/glossaire/entries";

const ids = new Set(GLOSSARY_ENTRIES.map((entry) => entry.id));

describe("the glossary", () => {
  // Ids are public anchors — a chapter links `#terme-endonyme`, and a fiche
  // will. A duplicate would make one of the two unreachable.
  // @req REQ-144
  it("gives every term one id, in kebab-case", () => {
    expect(ids.size).toBe(GLOSSARY_ENTRIES.length);

    for (const entry of GLOSSARY_ENTRIES) {
      expect(entry.id, entry.fr).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  // @req REQ-144
  it("names every term in both languages, and defines it", () => {
    for (const entry of GLOSSARY_ENTRIES) {
      expect(entry.fr, entry.id).not.toBe("");
      expect(entry.en, entry.id).not.toBe("");
      expect(entry.definition, entry.id).not.toBe("");
    }
  });

  // REQ-144's own clause: « peuple renders as people, never tribe, never
  // ethnic group ». The clause is about *rendering*, so it is asserted on the
  // English term — the field a translation would read — rather than on the
  // French prose, which has to be able to name the word it retires. The one
  // entry allowed to render as "Tribe" is the one that exists to retire it.
  // @req REQ-144
  it("never renders a people as a tribe or an ethnic group", () => {
    const offenders = GLOSSARY_ENTRIES.filter(
      (entry) =>
        entry.id !== "tribu" && /\btribes?\b|\bethnic group\b/i.test(entry.en)
    ).map((entry) => entry.id);

    expect(offenders).toEqual([]);
    expect(GLOSSARY_ENTRIES.find((entry) => entry.id === "ethnonyme")?.en).toBe(
      "Name of a people"
    );
    expect(GLOSSARY_ENTRIES.find((entry) => entry.id === "tribu")?.en).toBe(
      "Tribe"
    );
  });

  // Alphabetical inside each family, because a glossary is looked up rather
  // than read through. The families themselves are ordered by the three
  // questions a reader arrives with, so they are not sorted.
  // @req REQ-144
  it("sorts each family alphabetically", () => {
    for (const family of ["origine", "objet", "effet"] as const) {
      const terms = GLOSSARY_ENTRIES.filter(
        (entry) => entry.family === family
      ).map((entry) => entry.id);

      expect(terms, family).toEqual([...terms].sort());
    }
  });

  // A glossary that only defined what the corpus already carries would shrink
  // the vocabulary to fit the collection; one that defined everything without
  // saying so would let a reader assume the corpus is fuller than it is.
  // @req REQ-144
  it("either shows an example from the corpus or says why it cannot", () => {
    for (const entry of GLOSSARY_ENTRIES) {
      if (entry.corpusPresence === "instantiated") {
        expect(entry.corpusExample, entry.id).toBeTruthy();
      } else {
        expect(entry.absenceReason, entry.id).toBeTruthy();
      }
    }
  });

  // @req REQ-144
  it("resolves every cross-reference it makes", () => {
    const dangling: string[] = [];

    for (const entry of GLOSSARY_ENTRIES) {
      for (const other of entry.seeAlso ?? []) {
        if (!ids.has(other)) dangling.push(`${entry.id} → ${other}`);
      }
      for (const key of entry.sourceRefs ?? []) {
        if (!NOMMER_BIBLIOGRAPHY[key]) dangling.push(`${entry.id} → ${key}`);
      }
      if (entry.chapterRef) {
        const chapter = NOMMER_CHAPTERS.find(
          (candidate) => candidate.key === entry.chapterRef
        );
        if (!chapter) dangling.push(`${entry.id} → ${entry.chapterRef}`);
      }
    }

    expect(dangling).toEqual([]);
  });

  // A term never points at itself: an entry whose "voir aussi" loops back is
  // a dead link a reader clicks once and never again.
  // @req REQ-144
  it("never points a term at itself", () => {
    for (const entry of GLOSSARY_ENTRIES) {
      expect(entry.seeAlso ?? [], entry.id).not.toContain(entry.id);
    }
  });
});
