import { describe, expect, it } from "vitest";

import { COLONIAL_EVENT_TYPES } from "@/lib/afrik/migrationEventTypes";
import { GLOSSARY_ENTRIES } from "@/lib/glossaire/entries";
import { GLOSSARY_TERMS, type GlossaryTerm } from "@/lib/glossaire/terms";
import {
  ACCESS_MODE_LABELS_BY_LOCALE,
  CLASSIFICATION_LABELS,
  COLONIAL_EVENT_TYPE_LABELS,
  NAME_TYPE_LABELS,
  PATRONYME_VOCABULARY,
  RELATION_TYPE_LABELS,
  SOURCE_TIER_LABELS,
  SOURCE_PENDING_REVIEW_LABEL,
} from "@/lib/glossaire/vocabularies";
import { ACCESS_MODES } from "@/lib/hubs/moduleRegistry";
import { SOURCE_TIERS } from "@/types/sources";

const byKey = new Map(GLOSSARY_TERMS.map((term) => [term.key, term]));

function termWithFrench(fr: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find(
    (term) => term.fr.toLowerCase() === fr.toLowerCase()
  );
}

function wholeWord(phrase: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${phrase}(?![\\p{L}\\p{N}])`, "iu");
}

describe("the bilingual glossary (REQ-144)", () => {
  // A key is how the gate names a divergence and how the translator skill
  // quotes a ruling. Two terms under one key would make the report ambiguous.
  // @req REQ-144
  it("gives every term one key, in dotted kebab-case, and both languages", () => {
    expect(byKey.size).toBe(GLOSSARY_TERMS.length);

    for (const term of GLOSSARY_TERMS) {
      // `<family>.<value>`: the family is kebab-case, the value is whatever
      // identifier the vocabulary already uses (snake_case, camelCase, or a
      // kebab-case entry id), so the key stays greppable back to its source.
      expect(term.key).toMatch(/^[a-z]+(-[a-z]+)*(\.[A-Za-z0-9_-]+)+$/);
      expect(term.fr.trim(), term.key).not.toBe("");
      expect(term.en.trim(), term.key).not.toBe("");
    }
  });

  // REQ-144's own clause: « peuple renders as people, never tribe, never
  // ethnic group ». Both alternatives carry the colonial framing the project
  // exists to refuse, so the ruling is machine-readable rather than prose.
  // @req REQ-144
  it("rules that a peuple is a people, never a tribe nor an ethnic group", () => {
    const peuple = termWithFrench("peuple");

    expect(peuple?.key).toBe("domain.peuple");
    expect(peuple?.en).toBe("people");
    expect(peuple?.forbiddenEn).toEqual(
      expect.arrayContaining([
        "tribe",
        "tribes",
        "ethnic group",
        "ethnic groups",
      ])
    );
  });

  // The one entry allowed to render as "Tribe" is the one that exists to
  // retire the word — the reader-facing glossary defines it in order to say
  // the atlas never uses it.
  // @req REQ-144
  it("never renders a term as a forbidden word, except the entry that retires it", () => {
    const forbidden = GLOSSARY_TERMS.flatMap((term) => term.forbiddenEn ?? []);
    expect(forbidden.length).toBeGreaterThan(0);

    const offenders = GLOSSARY_TERMS.filter(
      (term) =>
        term.key !== "entry.tribu" &&
        forbidden.some((word) => wholeWord(word).test(term.en))
    ).map((term) => term.key);

    expect(offenders).toEqual([]);
    expect(byKey.get("entry.tribu")?.en).toBe("Tribe");
  });

  // The domain terms the ticket names. `autonyme`, `exonyme` and `ethnonyme`
  // are not retyped: the reader-facing glossary already carries them, and a
  // second rendering here would be the competing list the requirement
  // forbids — `ethnonyme` therefore reads "Name of a people", as that glossary
  // rules, rather than the Greek calque.
  // @req REQ-144
  it("fixes the domain terms the atlas is written in", () => {
    const expected: Array<[string, string]> = [
      ["peuple", "people"],
      ["famille linguistique", "language family"],
      ["autonyme", "autonym"],
      ["exonyme", "exonym"],
      ["ethnonyme", "name of a people"],
      ["appellation", "name"],
      ["récit oral", "oral narrative"],
      ["héritage colonial", "colonial legacy"],
      ["patronyme", "family name"],
    ];

    for (const [fr, en] of expected) {
      expect(termWithFrench(fr)?.en.toLowerCase(), fr).toBe(en);
    }
    expect(termWithFrench("famille linguistique")?.forbiddenEn).toContain(
      "linguistic family"
    );
  });

  // AC4: a controlled vocabulary already labelled in code is the glossary's
  // entry, not a second list beside it. Every value of every vocabulary must
  // therefore be reachable from the term table, exactly once — so a
  // vocabulary added elsewhere fails here until it joins.
  // @req REQ-144
  it("carries every controlled vocabulary value exactly once", () => {
    const expectedKeys = [
      ...SOURCE_TIERS.map((tier) => `source-tier.${tier}`),
      "source-tier.needs_review",
      ...Object.keys(CLASSIFICATION_LABELS.fr).map(
        (status) => `classification.${status}`
      ),
      ...Object.keys(RELATION_TYPE_LABELS.fr).map(
        (type) => `relation-type.${type}`
      ),
      ...Object.keys(NAME_TYPE_LABELS.fr).map((type) => `name-type.${type}`),
      ...Object.entries(PATRONYME_VOCABULARY.fr).flatMap(([map, labels]) =>
        Object.keys(labels).map((value) => `patronyme.${map}.${value}`)
      ),
      ...ACCESS_MODES.map((mode) => `access-mode.${mode}`),
      ...COLONIAL_EVENT_TYPES.map((type) => `colonial-event.${type}`),
      ...GLOSSARY_ENTRIES.map((entry) => `entry.${entry.id}`),
    ];

    const actualKeys = GLOSSARY_TERMS.map((term) => term.key);
    for (const key of expectedKeys) {
      expect(
        actualKeys.filter((candidate) => candidate === key),
        key
      ).toHaveLength(1);
    }

    const domainKeys = actualKeys.filter((key) => key.startsWith("domain."));
    expect(new Set(actualKeys)).toEqual(
      new Set([...expectedKeys, ...domainKeys])
    );
  });

  // @req REQ-144
  it("reads each vocabulary value through the locale-keyed record, not a copy", () => {
    expect(byKey.get("source-tier.official")?.fr).toBe(
      SOURCE_TIER_LABELS.fr.official
    );
    expect(byKey.get("source-tier.official")?.en).toBe(
      SOURCE_TIER_LABELS.en.official
    );
    expect(byKey.get("source-tier.needs_review")?.en).toBe(
      SOURCE_PENDING_REVIEW_LABEL.en
    );
    expect(byKey.get("classification.colonial-legacy")?.en).toBe(
      CLASSIFICATION_LABELS.en["colonial-legacy"].label
    );
    expect(byKey.get("colonial-event.imposed_name")?.en).toBe(
      COLONIAL_EVENT_TYPE_LABELS.en.imposed_name
    );
    expect(byKey.get("access-mode.jeux")?.en).toBe(
      ACCESS_MODE_LABELS_BY_LOCALE.en.jeux
    );
    expect(byKey.get("entry.autonyme")?.en).toBe(
      GLOSSARY_ENTRIES.find((entry) => entry.id === "autonyme")?.en
    );
  });

  // One French term, one English rendering. "Autre" may legitimately be
  // "Other" in three vocabularies; what may not happen is the same French
  // word reading two different ways in English depending on the surface.
  // @req REQ-144
  it("never gives one French term two English renderings", () => {
    const renderings = new Map<string, Set<string>>();
    for (const term of GLOSSARY_TERMS) {
      const fr = term.fr.toLowerCase();
      const en = term.en.toLowerCase();
      renderings.set(fr, (renderings.get(fr) ?? new Set()).add(en));
    }

    const divergent = [...renderings.entries()]
      .filter(([, ens]) => ens.size > 1)
      .map(([fr, ens]) => `${fr} → ${[...ens].join(" | ")}`);

    expect(divergent).toEqual([]);
  });

  // @req REQ-144
  it("keys every vocabulary identically in both locales", () => {
    const pairs: Array<[string, object, object]> = [
      ["source tiers", SOURCE_TIER_LABELS.fr, SOURCE_TIER_LABELS.en],
      ["classification", CLASSIFICATION_LABELS.fr, CLASSIFICATION_LABELS.en],
      ["relation types", RELATION_TYPE_LABELS.fr, RELATION_TYPE_LABELS.en],
      ["name types", NAME_TYPE_LABELS.fr, NAME_TYPE_LABELS.en],
      [
        "colonial events",
        COLONIAL_EVENT_TYPE_LABELS.fr,
        COLONIAL_EVENT_TYPE_LABELS.en,
      ],
      [
        "access modes",
        ACCESS_MODE_LABELS_BY_LOCALE.fr,
        ACCESS_MODE_LABELS_BY_LOCALE.en,
      ],
      ...Object.keys(PATRONYME_VOCABULARY.fr).map(
        (map): [string, object, object] => [
          `patronyme.${map}`,
          PATRONYME_VOCABULARY.fr[map as keyof typeof PATRONYME_VOCABULARY.fr],
          PATRONYME_VOCABULARY.en[map as keyof typeof PATRONYME_VOCABULARY.en],
        ]
      ),
    ];

    for (const [name, fr, en] of pairs) {
      expect(Object.keys(en).sort(), name).toEqual(Object.keys(fr).sort());
    }
  });

  // The nisba by tribal affiliation is an Arabic onomastic category, not the
  // ethnographic label the glossary forbids; the ruling has to say so where
  // a translator will read it, or the two look like a contradiction.
  // @req REQ-144
  it("explains the one controlled value that sounds like a forbidden word", () => {
    const tribal = byKey.get("patronyme.nisbaSubtype.tribal");
    expect(tribal?.en).toBe("Tribal");
    expect(tribal?.note).toMatch(/nisba/i);
  });
});
