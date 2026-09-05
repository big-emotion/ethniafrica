import { describe, expect, it } from "vitest";

import { GLOSSARY_ENTRIES } from "@/lib/glossaire/entries";
import { GLOSSARY_DEFINITIONS_EN } from "@/lib/glossaire/entries.en";

const TRANSLATED_FIELDS = [
  "definition",
  "corpusExample",
  "absenceReason",
] as const;

/**
 * The names the glossary cites — peoples, persons, deities, the words whose
 * etymology it discusses. They are the invariant class of REQ-143: a
 * translation that rewrote one would repeat the renaming the atlas exists to
 * document. Language names are compared case-insensitively because English
 * capitalises them and French does not.
 */
const CITED_NAMES = [
  "Jieng",
  "Dinka",
  "Ovaherero",
  "otjiherero",
  "Kaffa",
  "qahwa",
  "kahve",
  "Hottentot",
  "khoekhoe",
  "Denka",
  "Bilād as-sūdān",
  "Kirinyaga",
  "kikuyu",
  "Mami Wata",
  "Keïta",
  "Coulibaly",
  "Soundiata",
];

const CONTRACTION =
  /\b\w+n[’']t\b|\b(?:it|that|there|who|what|he|she)[’']s\b|\b\w+[’'](?:ll|re|ve|d)\b/i;

const AMERICAN_SPELLING =
  /\b(?:organiz|recogniz|realiz|categoriz|coloniz|authoriz|anonymiz|analyz|civiliz|centraliz|standardiz|characteriz|emphasiz)\w*|\b(?:color|center|favor|honor|labor|behavior|licenses?)\b/i;

/** Every number in a text, thousands separators removed, so "3 201" and "3,201" agree. */
function figuresOf(text: string): string[] {
  return text.replace(/(\d)[\s,](?=\d{3}\b)/g, "$1").match(/\d+/g) ?? [];
}

/** A text with its quoted spans removed — a word under discussion is not a word in use. */
function unquoted(text: string): string {
  return text.replace(/«[^»]*»|“[^”]*”/g, "");
}

describe("the English glossary definitions", () => {
  // @req REQ-145
  it("cover exactly the French entries, field for field", () => {
    const frenchIds = GLOSSARY_ENTRIES.map((entry) => entry.id).sort();
    expect(Object.keys(GLOSSARY_DEFINITIONS_EN).sort()).toEqual(frenchIds);

    for (const entry of GLOSSARY_ENTRIES) {
      const english = GLOSSARY_DEFINITIONS_EN[entry.id];
      for (const field of TRANSLATED_FIELDS) {
        expect(english[field] !== undefined, `${entry.id}.${field}`).toBe(
          entry[field] !== undefined
        );
      }
    }
  });

  // An empty string or the French text copied over would satisfy the key
  // check and still leave the English reader with nothing: the gate is on
  // the value, not the key.
  // @req REQ-145
  it("translate every field rather than leaving it empty or French", () => {
    for (const entry of GLOSSARY_ENTRIES) {
      const english = GLOSSARY_DEFINITIONS_EN[entry.id];
      for (const field of TRANSLATED_FIELDS) {
        const french = entry[field];
        if (french === undefined) continue;
        expect(english[field], `${entry.id}.${field}`).not.toBe("");
        expect(english[field], `${entry.id}.${field}`).not.toBe(french);
      }
    }
  });

  // @req REQ-142
  it("declare machine provenance on every entry", () => {
    for (const entry of GLOSSARY_ENTRIES) {
      expect(GLOSSARY_DEFINITIONS_EN[entry.id].provenance, entry.id).toBe(
        "machine"
      );
    }
  });

  // @req REQ-143
  it("keep every figure and every cited name of the French", () => {
    for (const entry of GLOSSARY_ENTRIES) {
      const english = GLOSSARY_DEFINITIONS_EN[entry.id];
      for (const field of TRANSLATED_FIELDS) {
        const french = entry[field];
        const translated = english[field] ?? "";
        if (french === undefined) continue;
        expect(figuresOf(translated).sort(), `${entry.id}.${field}`).toEqual(
          figuresOf(french).sort()
        );
        for (const name of CITED_NAMES) {
          if (!french.toLowerCase().includes(name.toLowerCase())) continue;
          expect(translated.toLowerCase(), `${entry.id}.${field}`).toContain(
            name.toLowerCase()
          );
        }
      }
    }
  });

  // REQ-144's clause applied to the prose: the French may name the word it
  // retires, the English may quote it, and neither uses it.
  // @req REQ-144
  it("never use tribe or ethnic group outside quotation", () => {
    const offenders: string[] = [];
    for (const [id, english] of Object.entries(GLOSSARY_DEFINITIONS_EN)) {
      for (const field of TRANSLATED_FIELDS) {
        const text = english[field];
        if (text && /\btribes?\b|\bethnic groups?\b/i.test(unquoted(text))) {
          offenders.push(`${id}.${field}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  // British spelling and no contractions are the register the brand charter
  // §3 fixes for English; a machine draft slips into American forms and
  // apostrophes first.
  // @req REQ-145
  it("hold the English register", () => {
    const offenders: string[] = [];
    for (const [id, english] of Object.entries(GLOSSARY_DEFINITIONS_EN)) {
      for (const field of TRANSLATED_FIELDS) {
        const text = english[field];
        if (!text) continue;
        if (CONTRACTION.test(text))
          offenders.push(`${id}.${field}: contraction`);
        if (AMERICAN_SPELLING.test(text)) {
          offenders.push(`${id}.${field}: American spelling`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
