import { describe, expect, it } from "vitest";

import type { DossierChapter, DossierChapterTranslation } from "../types";

/**
 * What an English sidecar owes the French chapter it renders (REQ-145).
 *
 * The suite reads the two records side by side and refuses four things: a
 * key the other side does not have, an empty or untranslated string, a
 * figure or a date that moved, and prose outside the register the brand
 * charter asks of English — no contractions, and a people never rendered as
 * a tribe or an ethnic group (REQ-144). The rules are the same for the five
 * chapters, so they are declared once and each chapter's test registers
 * them against its own pair.
 */

interface StringPair {
  where: string;
  fr: string;
  en: string;
}

/** Digit runs in reading order — "3 201" and "3,201" both give ["3", "201"]. */
const digitRuns = (text: string): string[] => text.match(/\d+/g) ?? [];

const wordCount = (text: string): number => (text.match(/\S+/g) ?? []).length;

/**
 * A proper name or a bare number is the same in both languages; anything
 * longer that comes back byte-identical was not translated.
 */
const UNTRANSLATED_ABOVE_WORDS = 3;

/**
 * Contractions, not possessives: "Bleek's grammar" is prose the register
 * allows, "it's" is not. Apostrophes inside names such as Ju|'hoansi carry
 * no listed ending and stay clear of it.
 */
const CONTRACTION_PATTERN =
  /\b(?:it|that|there|what|here|let|who|where|how)'s\b|n't\b|\w'(?:re|ll|ve)\b|\b(?:I|you|he|she|we|they|it|who)'d\b/i;

const sorted = (values: string[]): string[] => [...values].sort();

function structureFindings(
  fr: DossierChapter,
  en: DossierChapterTranslation
): string[] {
  const findings: string[] = [];

  if (en.key !== fr.key) findings.push(`key: ${en.key} renders ${fr.key}`);

  const frSections = sorted(fr.sections.map((section) => section.id));
  const enSections = sorted(Object.keys(en.sections));
  if (JSON.stringify(frSections) !== JSON.stringify(enSections)) {
    findings.push(
      `sections: French has [${frSections}], English has [${enSections}]`
    );
  }

  for (const section of fr.sections) {
    const translated = en.sections[section.id];
    if (!translated) continue;

    const frBlocks = sorted(section.blocks.map((block) => block.id));
    const enBlocks = sorted(Object.keys(translated.blocks));
    if (JSON.stringify(frBlocks) !== JSON.stringify(enBlocks)) {
      findings.push(
        `${section.id}/blocks: French has [${frBlocks}], English has [${enBlocks}]`
      );
    }

    if (Boolean(section.table) !== Boolean(translated.table)) {
      findings.push(`${section.id}/table: present on one side only`);
    } else if (section.table && translated.table) {
      if (section.table.columns.length !== translated.table.columns.length) {
        findings.push(`${section.id}/table: column count differs`);
      }
      if (section.table.rows.length !== translated.table.rows.length) {
        findings.push(`${section.id}/table: row count differs`);
      }
      section.table.rows.forEach((row, index) => {
        const cells = translated.table?.rows[index];
        if (cells && cells.length !== row.cells.length) {
          findings.push(`${section.id}/table/row ${index}: cell count differs`);
        }
      });
    }

    if (Boolean(section.pairs) !== Boolean(translated.pairs)) {
      findings.push(`${section.id}/pairs: present on one side only`);
    } else if (section.pairs?.length !== translated.pairs?.length) {
      findings.push(`${section.id}/pairs: pair count differs`);
    }
  }

  const frEntities = sorted(fr.entities.map((entity) => entity.id));
  const enEntities = sorted(Object.keys(en.entities));
  if (JSON.stringify(frEntities) !== JSON.stringify(enEntities)) {
    findings.push(
      `entities: French has [${frEntities}], English has [${enEntities}]`
    );
  }

  return findings;
}

/** Every French string beside its English counterpart, where both exist. */
function stringPairs(
  fr: DossierChapter,
  en: DossierChapterTranslation
): StringPair[] {
  const pairs: StringPair[] = [
    { where: "title", fr: fr.title, en: en.title },
    { where: "question", fr: fr.question, en: en.question },
    { where: "standfirst", fr: fr.standfirst.text, en: en.standfirst },
    { where: "measure.value", fr: fr.measure.value, en: en.measure.value },
    { where: "measure.unit", fr: fr.measure.unit, en: en.measure.unit },
  ];

  for (const section of fr.sections) {
    const translated = en.sections[section.id];
    if (!translated) continue;
    const at = (leaf: string) => `${section.id}/${leaf}`;

    pairs.push(
      {
        where: at("stepLabel"),
        fr: section.stepLabel,
        en: translated.stepLabel,
      },
      { where: at("heading"), fr: section.heading, en: translated.heading }
    );
    for (const block of section.blocks) {
      pairs.push({
        where: at(block.id),
        fr: block.text,
        en: translated.blocks[block.id] ?? "",
      });
    }
    if (section.table && translated.table) {
      pairs.push({
        where: at("table.caption"),
        fr: section.table.caption,
        en: translated.table.caption,
      });
      section.table.columns.forEach((column, index) => {
        pairs.push({
          where: at(`table.columns[${index}]`),
          fr: column,
          en: translated.table?.columns[index] ?? "",
        });
      });
      section.table.rows.forEach((row, rowIndex) => {
        row.cells.forEach((cell, cellIndex) => {
          pairs.push({
            where: at(`table.rows[${rowIndex}][${cellIndex}]`),
            fr: cell,
            en: translated.table?.rows[rowIndex]?.[cellIndex] ?? "",
          });
        });
      });
    }
    (section.pairs ?? []).forEach((pair, index) => {
      const translatedPair = translated.pairs?.[index];
      if (pair.endonymGloss !== null) {
        pairs.push({
          where: at(`pairs[${index}].endonymGloss`),
          fr: pair.endonymGloss,
          en: translatedPair?.endonymGloss ?? "",
        });
      }
      pairs.push({
        where: at(`pairs[${index}].imposedBy`),
        fr: pair.imposedBy,
        en: translatedPair?.imposedBy ?? "",
      });
    });
  }

  for (const entity of fr.entities) {
    pairs.push({
      where: `entities/${entity.id}`,
      fr: entity.label,
      en: en.entities[entity.id] ?? "",
    });
  }

  return pairs;
}

// @req REQ-145
export function describeChapterParity(
  fr: DossierChapter,
  en: DossierChapterTranslation
): void {
  describe(`the English sidecar of ${fr.key}`, () => {
    // @req REQ-145
    it("mirrors every French key and nothing else", () => {
      expect(structureFindings(fr, en)).toEqual([]);
    });

    // @req REQ-142
    it("declares its locale and how it was translated", () => {
      expect(en.locale).toBe("en");
      expect(["human", "machine_reviewed", "machine"]).toContain(en.provenance);
    });

    // @req REQ-145
    it("leaves no string empty, and none untranslated beyond a few words", () => {
      const findings = stringPairs(fr, en)
        .filter(
          ({ fr: source, en: target }) =>
            target.trim() === "" ||
            (wordCount(source) > UNTRANSLATED_ABOVE_WORDS && target === source)
        )
        .map(({ where }) => where);
      expect(findings).toEqual([]);
    });

    // The dossier argues from counts and dates, so a translation that moved
    // one would be a different claim wearing the same citation.
    // @req REQ-145
    it("carries every figure and date the French states, in order", () => {
      const findings = stringPairs(fr, en)
        .filter(
          ({ fr: source, en: target }) =>
            JSON.stringify(digitRuns(source)) !==
            JSON.stringify(digitRuns(target))
        )
        .map(
          ({ where, fr: source, en: target }) =>
            `${where}: ${digitRuns(source)} → ${digitRuns(target)}`
        );
      expect(findings).toEqual([]);
    });

    // @req REQ-143
    it("keeps a people's label verbatim", () => {
      for (const entity of fr.entities) {
        if (entity.kind !== "people") continue;
        expect(en.entities[entity.id], entity.id).toBe(entity.label);
      }
    });

    // "tribe" is allowed only where the French itself says « tribu » — the
    // nisba row names what an Arab name can refer to, and that is not a
    // rendering of « peuple ».
    // @req REQ-144
    it("writes without contractions and never renders a people as a tribe", () => {
      const findings = stringPairs(fr, en)
        .filter(
          ({ fr: source, en: target }) =>
            CONTRACTION_PATTERN.test(target) ||
            /\bethnic groups?\b/i.test(target) ||
            (/\btrib/i.test(target) && !/\btribu/i.test(source))
        )
        .map(({ where }) => where);
      expect(findings).toEqual([]);
    });
  });
}
