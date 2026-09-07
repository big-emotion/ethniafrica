import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  checkTranslatedText,
  checkTranslatedRecord,
  runGlossaryGate,
} from "../checkGlossary";

const RECORD = {
  file: "dataset/translations/en/peuples/FLG_KWA/PPL_YORUBA.json",
  record: "PPL_YORUBA",
  path: "content.presentation.summary",
};

/**
 * The glossary is a gate on terms, not a spell-checker on prose. It reports a
 * rendering that contradicts a fixed entry — a people written as a tribe, a
 * French term left standing in English — and names the record so the
 * translator can find it. A gate that fired on every sentence would be
 * switched off within a week, so the rules are deliberately narrow.
 */
describe("glossary gate — rules on one string", () => {
  // @req REQ-144
  it("reports a forbidden rendering and names the record and the path", () => {
    const findings = checkTranslatedText(
      "The Yoruba are a tribe of south-western Nigeria.",
      RECORD
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: "glossary-forbidden-rendering",
      severity: "error",
      file: RECORD.file,
      record: "PPL_YORUBA",
      path: "content.presentation.summary",
      termKey: "domain.peuple",
      rendered: "tribe",
      expected: "people",
    });
  });

  // @req REQ-144
  it("matches whole words only", () => {
    expect(
      checkTranslatedText(
        "Tribal affiliations contribute to the nisba; the distribution is shown.",
        RECORD
      )
    ).toEqual([]);
  });

  // The fiche must be able to name the word it retires: a class-3 passage
  // saying that colonial administrators wrote « tribe » is the doctrine at
  // work, not a breach of it.
  // @req REQ-144
  it("leaves a quoted mention alone", () => {
    for (const text of [
      "Colonial administrators wrote « tribe » on every census.",
      'The 1921 census used the heading "tribe" for the whole province.',
      "The word 'tribe' was imposed by the administration.",
      "The word “tribe” was imposed by the administration.",
    ]) {
      expect(checkTranslatedText(text, RECORD), text).toEqual([]);
    }
  });

  // @req REQ-144
  it("reports a French glossary term surviving in English prose", () => {
    const findings = checkTranslatedText(
      "The Bantu famille linguistique spans the continent.",
      RECORD
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: "glossary-untranslated-term",
      termKey: "domain.famille-linguistique",
      rendered: "famille linguistique",
      expected: "language family",
    });
  });

  // @req REQ-144
  it("never reports a term whose French and English are the same word", () => {
    expect(
      checkTranslatedText(
        "A nisba records origin; the jamu is a Mande clan name; the caste is named.",
        RECORD
      )
    ).toEqual([]);
  });

  // @req REQ-144
  it("reports each distinct breach once, with every term it hits", () => {
    const findings = checkTranslatedText(
      "An ethnic group and its tribes; the peuple is one people.",
      RECORD
    );

    expect(
      findings.map((finding) => `${finding.rule}:${finding.rendered}`).sort()
    ).toEqual([
      "glossary-forbidden-rendering:ethnic group",
      "glossary-forbidden-rendering:tribes",
      "glossary-untranslated-term:peuple",
    ]);
  });
});

describe("glossary gate — one translated record", () => {
  // @req REQ-144
  it("walks every string leaf and names its JSON path", () => {
    const findings = checkTranslatedRecord(
      {
        id: "PPL_YORUBA",
        content: {
          presentation: { summary: "A people of Nigeria." },
          history: { periods: [{ text: "The tribe migrated west." }] },
        },
      },
      RECORD.file
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].path).toBe("content.history.periods[0].text");
    expect(findings[0].record).toBe("PPL_YORUBA");
  });

  // The three class-3 fields are where a fiche discusses the very words the
  // glossary retires — why an exonym is problematic, where it came from, how
  // it is used today. Policing them would police the doctrine itself.
  // @req REQ-144
  it("exempts the fields where a retired word is legitimately discussed", () => {
    expect(
      checkTranslatedRecord(
        {
          id: "PPL_YORUBA",
          names: [
            {
              nameText: "Yoruba",
              whyProblematic: "Administrators filed the people as a tribe.",
              originOfExonyms: "The tribe label came from the census.",
              contemporaryUsage: "Still called a tribe in some textbooks.",
            },
          ],
        },
        RECORD.file
      )
    ).toEqual([]);
  });

  // @req REQ-144
  it("skips authoring metadata, identifiers and URLs", () => {
    expect(
      checkTranslatedRecord(
        {
          _meta: { directives: "Render the peuple as a tribe here." },
          id: "PPL_TRIBE",
          sources: [
            { sourceKey: "tribe-census", url: "https://example.org/tribe" },
          ],
        },
        RECORD.file
      )
    ).toEqual([]);
  });
});

describe("glossary gate — runner", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "glossary-gate-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function writeTranslated(relPath: string, record: unknown): void {
    const full = path.join(tmp, "dataset", "translations", "en", relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, JSON.stringify(record), "utf-8");
  }

  // Zero translated records exist on day one. The gate has to be green on an
  // empty set and say so, rather than pass because it found nothing to read.
  // @req REQ-144
  it("passes on an empty set and says how many records it scanned", () => {
    const result = runGlossaryGate({ repoRoot: tmp, uiDictionaries: [] });

    expect(result.exitCode).toBe(0);
    expect(result.findings).toEqual([]);
    expect(result.annotations.join("\n")).toContain(
      "0 translated records scanned"
    );
  });

  // @req REQ-144
  it("fails on a breach and emits a GitHub annotation naming the record", () => {
    writeTranslated("peuples/FLG_KWA/PPL_YORUBA.json", {
      id: "PPL_YORUBA",
      content: { presentation: { summary: "A tribe of Nigeria." } },
    });
    writeTranslated("peuples/FLG_KWA/PPL_FON.json", {
      id: "PPL_FON",
      content: { presentation: { summary: "A people of Benin." } },
    });

    const result = runGlossaryGate({ repoRoot: tmp, uiDictionaries: [] });

    expect(result.exitCode).toBe(1);
    expect(result.findings).toHaveLength(1);
    const annotation = result.annotations.find((line) =>
      line.startsWith("::error")
    );
    expect(annotation).toContain(
      "file=dataset/translations/en/peuples/FLG_KWA/PPL_YORUBA.json"
    );
    expect(annotation).toContain("title=glossary-forbidden-rendering");
    expect(annotation).toContain("PPL_YORUBA");
    expect(result.annotations.join("\n")).toContain(
      "2 translated records scanned"
    );
  });

  // @req REQ-144
  it("reports an unreadable translated record rather than skipping it", () => {
    const full = path.join(tmp, "dataset", "translations", "en", "PPL_X.json");
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, "{ not json", "utf-8");

    const result = runGlossaryGate({ repoRoot: tmp, uiDictionaries: [] });

    expect(result.exitCode).toBe(1);
    expect(result.findings[0].rule).toBe("json-parse");
  });

  // The UI dictionary is code, not corpus, and it is walked the same way: a
  // leaf is named by its dotted key so the fix is one search away.
  // @req REQ-144
  it("walks the English side of a UI dictionary and names the dotted key", () => {
    const result = runGlossaryGate({
      repoRoot: tmp,
      uiDictionaries: [
        {
          name: "src/lib/translations.ts",
          dictionary: {
            fr: { home: { title: "Les peuples d'Afrique" } },
            en: { home: { title: "The ethnic groups of Africa" } },
          },
        },
      ],
    });

    expect(result.exitCode).toBe(1);
    expect(result.findings[0]).toMatchObject({
      file: "src/lib/translations.ts",
      path: "en.home.title",
      rendered: "ethnic groups",
    });
  });

  // @req REQ-144
  it("notices, and does not fail, a dictionary that has no English side yet", () => {
    const result = runGlossaryGate({
      repoRoot: tmp,
      uiDictionaries: [
        {
          name: "src/lib/translations.ts",
          dictionary: { fr: { home: { title: "Les peuples" } } },
        },
      ],
    });

    expect(result.exitCode).toBe(0);
    expect(result.annotations.join("\n")).toMatch(
      /::notice.*src\/lib\/translations\.ts.*no "en" side/
    );
  });
});
