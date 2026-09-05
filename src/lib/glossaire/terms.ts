/**
 * The bilingual glossary, in one declared file (REQ-144).
 *
 * A term is either written here — the handful of domain words the atlas is
 * composed in, which no controlled vocabulary carries — or assembled from a
 * record that already labels a closed set somewhere else: the reader-facing
 * glossary entries, the source tiers, the classification statuses, the
 * relation and name types, the patronyme sub-vocabularies, the colonial event
 * types, the access modes. Nothing is retyped: a vocabulary's label is the
 * glossary's entry, so the two cannot disagree.
 *
 * TypeScript rather than JSON on purpose. A JSON file could not import the
 * vocabularies and would be the second competing list the requirement
 * forbids; a human reads this file top to bottom, and the gate
 * (`scripts/ci/checkGlossary.ts`) imports it.
 *
 * What the gate can and cannot see: it reports a rendering that contradicts a
 * fixed entry — a `forbiddenEn` word, or the French term left standing in
 * English. A paraphrase that is neither ("oral account" for récit oral) is
 * invisible to it by design; the glossary is a gate on terms, not a
 * spell-checker on prose, and a gate that fires on every sentence gets
 * switched off.
 */

import { COLONIAL_EVENT_TYPES } from "@/lib/afrik/migrationEventTypes";
import { GLOSSARY_ENTRIES } from "@/lib/glossaire/entries";
import {
  ACCESS_MODE_LABELS_BY_LOCALE,
  CLASSIFICATION_LABELS,
  COLONIAL_EVENT_TYPE_LABELS,
  NAME_TYPE_LABELS,
  PATRONYME_VOCABULARY,
  RELATION_TYPE_LABELS,
  SOURCE_PENDING_REVIEW_LABEL,
  SOURCE_TIER_LABELS,
  type GlossaryLocale,
  type PatronymeVocabulary,
} from "@/lib/glossaire/vocabularies";
import { ACCESS_MODES } from "@/lib/hubs/moduleRegistry";
import { SOURCE_TIERS } from "@/types/sources";

export interface GlossaryTerm {
  /** `<family>.<value>`, e.g. `source-tier.official`, `entry.endonyme`. */
  key: string;
  fr: string;
  en: string;
  /**
   * English words that must never stand for this term. Whole-word,
   * case-insensitive; the gate reports each one it finds outside a quotation.
   */
  forbiddenEn?: string[];
  /** Why the ruling is what it is, for the translator who meets it. */
  note?: string;
}

/**
 * The words the atlas is written in, which no controlled vocabulary carries.
 *
 * `autonyme`, `exonyme` and `ethnonyme` are deliberately absent: the
 * reader-facing glossary (`entries.ts`) already defines them, and a second
 * rendering here would be a competing list.
 */
const DOMAIN_TERMS: GlossaryTerm[] = [
  {
    key: "domain.peuple",
    fr: "peuple",
    en: "people",
    forbiddenEn: ["tribe", "tribes", "ethnic group", "ethnic groups"],
    note: "Both alternatives carry the colonial framing the atlas exists to refuse: one hierarchises, the other essentialises. A people is a people.",
  },
  {
    key: "domain.famille-linguistique",
    fr: "famille linguistique",
    en: "language family",
    forbiddenEn: ["linguistic family"],
    note: "The established term in English-language linguistics is « language family »; « linguistic family » is a calque of the French.",
  },
  {
    key: "domain.appellation",
    fr: "appellation",
    en: "name",
    note: "The Appellations surface lists the names a people is known by. In English the plain word does the work; « appellation » reads as a wine label.",
  },
  {
    key: "domain.recit-oral",
    fr: "récit oral",
    en: "oral narrative",
    note: "An oral narrative is a source in its own right, cited with its teller. « Oral tradition » names the practice, not the record.",
  },
];

function fromRecord<Key extends string>(
  family: string,
  record: Record<GlossaryLocale, Record<Key, string>>,
  notes: Partial<Record<Key, string>> = {}
): GlossaryTerm[] {
  return (Object.keys(record.fr) as Key[]).map((value) => ({
    key: `${family}.${value}`,
    fr: record.fr[value],
    en: record.en[value],
    ...(notes[value] ? { note: notes[value] } : {}),
  }));
}

function patronymeTerms(
  map: keyof PatronymeVocabulary,
  notes: Record<string, string> = {}
): GlossaryTerm[] {
  // Widened to `Record<string, string>`: the five maps have five key unions
  // and the glossary needs their labels, not their types. The terms test
  // checks every key it cares about.
  return fromRecord<string>(
    `patronyme.${map}`,
    {
      fr: PATRONYME_VOCABULARY.fr[map] as Record<string, string>,
      en: PATRONYME_VOCABULARY.en[map] as Record<string, string>,
    },
    notes
  );
}

// @req REQ-144
export const GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  ...DOMAIN_TERMS,

  ...GLOSSARY_ENTRIES.map((entry) => ({
    key: `entry.${entry.id}`,
    fr: entry.fr,
    en: entry.en,
  })),

  ...SOURCE_TIERS.map((tier) => ({
    key: `source-tier.${tier}`,
    fr: SOURCE_TIER_LABELS.fr[tier],
    en: SOURCE_TIER_LABELS.en[tier],
  })),
  {
    key: "source-tier.needs_review",
    fr: SOURCE_PENDING_REVIEW_LABEL.fr,
    en: SOURCE_PENDING_REVIEW_LABEL.en,
    note: "Not a tier. A source nobody has ruled on is not a source ruled weak.",
  },

  ...(
    Object.keys(CLASSIFICATION_LABELS.fr) as Array<
      keyof typeof CLASSIFICATION_LABELS.fr
    >
  ).map((status) => ({
    key: `classification.${status}`,
    fr: CLASSIFICATION_LABELS.fr[status].label,
    en: CLASSIFICATION_LABELS.en[status].label,
  })),

  ...fromRecord("relation-type", RELATION_TYPE_LABELS),

  ...fromRecord("name-type", NAME_TYPE_LABELS, {
    surname:
      "A surname in the English sense; the axis itself is « Nom » (DEC-038), never « patronym ».",
  }),

  ...patronymeTerms("nameSystem"),
  ...patronymeTerms("transmissionMode"),
  ...patronymeTerms("designatedSocialUnit"),
  ...patronymeTerms("nisbaSubtype", {
    tribal:
      "A nisba by tribal affiliation (nisba qabaliyya) is a category of Arabic onomastics, the name of a naming practice — not an ethnographic label for the people who bear it.",
  }),
  ...patronymeTerms("originClaimStatus"),

  ...ACCESS_MODES.map((mode) => ({
    key: `access-mode.${mode}`,
    fr: ACCESS_MODE_LABELS_BY_LOCALE.fr[mode],
    en: ACCESS_MODE_LABELS_BY_LOCALE.en[mode],
  })),

  ...COLONIAL_EVENT_TYPES.map((type) => ({
    key: `colonial-event.${type}`,
    fr: COLONIAL_EVENT_TYPE_LABELS.fr[type],
    en: COLONIAL_EVENT_TYPE_LABELS.en[type],
  })),
];
