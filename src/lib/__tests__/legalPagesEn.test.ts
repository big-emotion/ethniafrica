import { describe, expect, it } from "vitest";

import { legalPages } from "@/lib/legal-pages";
import { legalPagesEn } from "@/lib/legal-pages.en";

type LegalDocumentKey = keyof typeof legalPages;

const DOCUMENT_KEYS = Object.keys(legalPages) as LegalDocumentKey[];

const CONTRACTION =
  /\b\w+n[’']t\b|\b(?:it|that|there|who|what|he|she)[’']s\b|\b\w+[’'](?:ll|re|ve|d)\b/i;

const AMERICAN_SPELLING =
  /\b(?:organiz|recogniz|realiz|categoriz|coloniz|authoriz|anonymiz|analyz|civiliz|centraliz|standardiz|characteriz|emphasiz)\w*|\b(?:color|center|favor|honor|labor|behavior|licenses?)\b/i;

/** Every number in a text, thousands separators removed, so "3 201" and "3,201" agree. */
function figuresOf(text: string): string[] {
  return text.replace(/(\d)[\s,](?=\d{3}\b)/g, "$1").match(/\d+/g) ?? [];
}

/** Email addresses and web addresses — the citations a legal page makes, verbatim in both locales. */
function webLocatorsOf(text: string): string[] {
  return (
    text.match(/[\w.-]+@[\w.-]+\.\w+|\b[a-z0-9-]+\.(?:com|org)(?:\/\S*)?/gi) ??
    []
  ).map((locator) => locator.replace(/[.,;]$/, ""));
}

/**
 * The French strings of one document paired with their English
 * counterparts, in reading order. The English opens with the translation
 * notice section, which has no French original, so the sections are
 * paired after it.
 */
function pairedStrings(key: LegalDocumentKey): [string, string, string][] {
  const french = legalPages[key];
  const english = legalPagesEn[key];
  const pairs: [string, string, string][] = [
    [`${key}.eyebrow`, french.eyebrow, english.eyebrow],
    [`${key}.title`, french.title, english.title],
    [`${key}.lastUpdated`, french.lastUpdated, english.lastUpdated],
    [`${key}.introduction`, french.introduction, english.introduction],
  ];
  french.sections.forEach((section, index) => {
    const translated = english.sections[index + 1];
    pairs.push([
      `${key}.sections[${index}].title`,
      section.title,
      translated.title,
    ]);
    section.paragraphs.forEach((paragraph, paragraphIndex) => {
      pairs.push([
        `${key}.sections[${index}].paragraphs[${paragraphIndex}]`,
        paragraph,
        translated.paragraphs[paragraphIndex],
      ]);
    });
  });
  return pairs;
}

describe("the English legal pages", () => {
  // @req REQ-145
  it("carry the three French documents with the same sections and paragraphs", () => {
    expect(Object.keys(legalPagesEn).sort()).toEqual([...DOCUMENT_KEYS].sort());

    for (const key of DOCUMENT_KEYS) {
      const french = legalPages[key];
      const english = legalPagesEn[key];
      expect(english.sections.length, key).toBe(french.sections.length + 1);
      french.sections.forEach((section, index) => {
        expect(
          english.sections[index + 1].paragraphs.length,
          `${key}.sections[${index}]`
        ).toBe(section.paragraphs.length);
      });
    }
  });

  // DEC-048: a machine translation says so, and a legal text says which
  // version binds. The notice leads the document so the reader meets it
  // before any clause.
  // @req REQ-142
  it("open every document with a notice that the French version prevails", () => {
    for (const key of DOCUMENT_KEYS) {
      const english = legalPagesEn[key];
      expect(english.provenance, key).toBe("machine");
      const [notice] = english.sections;
      expect(notice.paragraphs.join(" "), key).toMatch(/machine translation/i);
      expect(notice.paragraphs.join(" "), key).toMatch(
        /French version prevails/i
      );
    }
  });

  // @req REQ-145
  it("translate every string rather than leaving it empty or French", () => {
    for (const key of DOCUMENT_KEYS) {
      for (const [path, french, english] of pairedStrings(key)) {
        expect(english, path).not.toBe("");
        expect(english, path).not.toBe(french);
      }
    }
  });

  // A legal notice is only as good as its identifiers: addresses to write
  // to, registration numbers, licence URL and the date the text was last
  // revised must survive translation exactly.
  // @req REQ-143
  it("keep every figure, email address and web address of the French", () => {
    for (const key of DOCUMENT_KEYS) {
      for (const [path, french, english] of pairedStrings(key)) {
        expect(figuresOf(english).sort(), path).toEqual(
          figuresOf(french).sort()
        );
        expect(webLocatorsOf(english).sort(), path).toEqual(
          webLocatorsOf(french).sort()
        );
      }
    }
  });

  // @req REQ-145
  it("hold the English register", () => {
    const offenders: string[] = [];
    for (const key of DOCUMENT_KEYS) {
      for (const [path, , english] of pairedStrings(key)) {
        // A URL spells "licenses" the way its host does; only the prose is judged.
        const prose = webLocatorsOf(english).reduce(
          (text, locator) => text.replace(locator, ""),
          english
        );
        if (CONTRACTION.test(prose)) offenders.push(`${path}: contraction`);
        if (AMERICAN_SPELLING.test(prose)) {
          offenders.push(`${path}: American spelling`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
