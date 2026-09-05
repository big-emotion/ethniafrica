import { describe, expect, it } from "vitest";

import { DID_YOU_KNOW_FACTS } from "@/lib/home/didYouKnowFacts";
import {
  DID_YOU_KNOW_FACTS_EN,
  type DidYouKnowFactTranslation,
} from "@/lib/home/didYouKnowFacts.en";

const frenchById = new Map(DID_YOU_KNOW_FACTS.map((fact) => [fact.id, fact]));

/** A string long enough that an English copy identical to the French is a copy, not a proper name. */
const A_FEW_WORDS = 4;

/**
 * Country names spelt the same in both languages. Every other French label
 * on a country chip has an English form and must take it.
 */
const COUNTRY_NAMES_SHARED_BY_BOTH_LANGUAGES = new Set([
  "Angola",
  "Botswana",
  "Burkina Faso",
  "Burundi",
  "Congo",
  "Côte d'Ivoire",
  "Gabon",
  "Ghana",
  "Kenya",
  "Lesotho",
  "Liberia",
  "Madagascar",
  "Malawi",
  "Mali",
  "Mozambique",
  "Niger",
  "Nigeria",
  "Rwanda",
  "Sierra Leone",
  "Zimbabwe",
]);

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * The prose a reader of the English bank actually reads. Source titles,
 * URLs and people names are invariant and are checked separately.
 */
function translatedProse(entry: DidYouKnowFactTranslation): string[] {
  return [
    entry.headline,
    ...entry.body,
    ...(entry.sources ?? []).flatMap((source) =>
      source.notes ? [source.notes] : []
    ),
    ...entry.entities
      .filter((entity) => entity.kind !== "people")
      .map((entity) => entity.label),
  ];
}

describe("the English Saviez-vous bank — parity with the French (REQ-145)", () => {
  // @req REQ-145
  it("carries exactly the facts the French bank holds", () => {
    expect(Object.keys(DID_YOU_KNOW_FACTS_EN).sort()).toEqual(
      DID_YOU_KNOW_FACTS.map((fact) => fact.id).sort()
    );
  });

  // A paragraph left blank, or pasted from the French, would publish as
  // English. The proper-name exception covers a country label such as
  // « Mali »; anything longer than a few words identical to the French is a
  // paragraph nobody translated.
  // @req REQ-145
  it("translates every string rather than leaving one empty or French", () => {
    const untranslated: string[] = [];

    for (const [id, entry] of Object.entries(DID_YOU_KNOW_FACTS_EN)) {
      const french = frenchById.get(id)!;
      const frenchProse = new Set([
        french.headline,
        ...french.body,
        ...(french.sources ?? []).flatMap((source) =>
          source.notes ? [source.notes] : []
        ),
        ...french.entities.map((entity) => entity.label),
      ]);

      for (const text of translatedProse(entry)) {
        if (text.trim() === "") untranslated.push(`${id}: empty string`);
        if (wordCount(text) > A_FEW_WORDS && frenchProse.has(text)) {
          untranslated.push(`${id}: ${text.slice(0, 40)}…`);
        }
      }
    }

    expect(untranslated).toEqual([]);
  });

  // @req REQ-145
  it("keeps the shape of each fact: paragraphs, chips and citations in the same number and order", () => {
    for (const [id, entry] of Object.entries(DID_YOU_KNOW_FACTS_EN)) {
      const french = frenchById.get(id)!;

      expect(entry.body, id).toHaveLength(french.body.length);
      expect(entry.tier, id).toBe(french.tier);
      expect(
        entry.entities.map((entity) => `${entity.kind}:${entity.id}`),
        id
      ).toEqual(french.entities.map((entity) => `${entity.kind}:${entity.id}`));
      expect(entry.sources?.length, id).toBe(french.sources?.length);
      for (const [index, source] of (entry.sources ?? []).entries()) {
        const original = french.sources![index];
        expect(source.notes === undefined, `${id} source ${index}`).toBe(
          original.notes === undefined
        );
      }
    }
  });
});

describe("the English Saviez-vous bank — invariants (REQ-143)", () => {
  // A people's name is the subject of the anecdote; translating it repeats
  // the renaming the fact documents. A citation translated stops being
  // findable.
  // @req REQ-143
  it("keeps people names, source titles, URLs and tiers verbatim", () => {
    for (const [id, entry] of Object.entries(DID_YOU_KNOW_FACTS_EN)) {
      const french = frenchById.get(id)!;

      for (const [index, entity] of entry.entities.entries()) {
        if (entity.kind === "people") {
          expect(entity.label, `${id} chip ${index}`).toBe(
            french.entities[index].label
          );
        }
      }
      for (const [index, source] of (entry.sources ?? []).entries()) {
        const original = french.sources![index];
        expect(source.title, `${id} source ${index}`).toBe(original.title);
        expect(source.url, `${id} source ${index}`).toBe(original.url);
        expect(source.tier, `${id} source ${index}`).toBe(original.tier);
      }
    }
  });

  // Measured against the French chip rather than a list of French names to
  // avoid: a new country added to the bank is checked the day it arrives.
  // @req REQ-143
  it("gives every country chip its English name", () => {
    for (const [id, entry] of Object.entries(DID_YOU_KNOW_FACTS_EN)) {
      const french = frenchById.get(id)!;

      for (const [index, entity] of entry.entities.entries()) {
        if (entity.kind !== "country") continue;
        const frenchLabel = french.entities[index].label;
        const where = `${id} chip ${index} (${frenchLabel})`;

        expect(entity.label.trim(), where).not.toBe("");
        if (COUNTRY_NAMES_SHARED_BY_BOTH_LANGUAGES.has(frenchLabel)) {
          expect(entity.label, where).toBe(frenchLabel);
        } else {
          expect(entity.label, where).not.toBe(frenchLabel);
        }
      }
    }
  });
});

describe("the English Saviez-vous bank — provenance and register", () => {
  // Agent-produced translations are published as such (DEC-048); a bank that
  // said otherwise would claim a review nobody made.
  // @req REQ-142
  it("declares machine provenance on every fact", () => {
    for (const entry of Object.values(DID_YOU_KNOW_FACTS_EN)) {
      expect(entry.provenance).toBe("machine");
    }
  });

  // The glossary's own rulings: peuple renders as people, famille
  // linguistique as language family. The colonial vocabulary the anecdotes
  // dismantle must not come back through the translation.
  // @req REQ-144
  it("never renders peuple as tribe or ethnic group, nor famille linguistique as linguistic family", () => {
    const offenders: string[] = [];

    for (const [id, entry] of Object.entries(DID_YOU_KNOW_FACTS_EN)) {
      for (const text of translatedProse(entry)) {
        if (
          /\b(tribes?|tribal|ethnic groups?|linguistic famil(y|ies))\b/i.test(
            text
          )
        ) {
          offenders.push(`${id}: ${text.slice(0, 60)}…`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  // The English register the glossary fixes: British spelling, no
  // contractions in editorial prose.
  // @req REQ-144
  it("writes British English without contractions", () => {
    const contraction =
      /\b(?:don|doesn|isn|aren|wasn|weren|can|won|didn|hasn|haven|couldn|wouldn|shouldn)'t\b|\b(?:it|that|there|what|who)'s\b|\b(?:they|we|you)'re\b|\b(?:I|you|we|they)'(?:ve|ll)\b/i;
    // Case-sensitive on purpose: « American Colonization Society » is a
    // proper name and keeps its own spelling.
    const americanSpelling =
      /\b(?:colors?|colored|centers?|centered|honors?|honored|favors?|favored|neighbors?|travelers?|defense|(?:organ|colon|standard|recogn|categor|civil|islam|roman|critic|emphas|character|institutional|stigmat)iz\w+)\b/;
    const offenders: string[] = [];

    for (const [id, entry] of Object.entries(DID_YOU_KNOW_FACTS_EN)) {
      for (const text of translatedProse(entry)) {
        const hit = text.match(contraction) ?? text.match(americanSpelling);
        if (hit) offenders.push(`${id}: ${hit[0]}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
