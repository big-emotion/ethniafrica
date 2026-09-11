import type { Language } from "@/types/shared";

/**
 * What a fiche calls itself in a search result and on a shared card.
 *
 * Every form here is preposition-free by construction — `{name} — peuple
 * (Bénin, Togo)` rather than `{name}, peuple du Bénin`. French contracts the
 * preposition with the article and the article follows the country's gender
 * and initial, so a template that took one would have to carry a gender table
 * for 54 countries and would still mis-decline the first name it had not seen.
 * The parenthesis is idiomatic in reference works and costs the reader nothing.
 */
export interface FicheMetadataCopy {
  /** The descriptive half of a title; the product name is appended after it. */
  title: {
    people: (name: string, context: string | null) => string;
    peopleLinks: (name: string) => string;
    country: (name: string) => string;
    family: (name: string) => string;
    language: (name: string, context: string | null) => string;
    name: (name: string) => string;
  };
  /** Used only when the atlas fills no summary of its own. */
  lead: Record<
    "people" | "peopleLinks" | "country" | "family" | "language" | "name",
    string
  >;
  /** Facts the atlas actually holds, appended to the lead as clauses. */
  clause: {
    family: (familyName: string) => string;
    presence: (countryNames: string) => string;
    peopleCount: (count: number) => string;
    speakers: (peopleNames: string) => string;
  };
  /** The promise every page makes, and the one differentiator worth repeating. */
  trailer: string;
  /** Joins a list of names inside a title's parenthesis or a clause. */
  listSeparator: string;
}

const en: FicheMetadataCopy = {
  title: {
    people: (name, context) =>
      context ? `${name} — people (${context})` : `${name} — African people`,
    peopleLinks: (name) => `${name} — ties and kinship`,
    country: (name) => `${name} — peoples and languages`,
    family: (name) => `${name} — language family`,
    language: (name, context) =>
      context
        ? `${name} — language (${context})`
        : `${name} — African language`,
    name: (name) => `${name} — origin and history of the name`,
  },
  lead: {
    people: "African people",
    peopleLinks: "Ties, kinship and neighbours",
    country: "Peoples, languages and names",
    family: "African language family",
    language: "African language",
    name: "Origin, bearers and history of the name",
  },
  clause: {
    family: (familyName) => `language family: ${familyName}`,
    presence: (countryNames) => `present in ${countryNames}`,
    peopleCount: (count) => `${count} documented peoples`,
    speakers: (peopleNames) => `carried by the ${peopleNames}`,
  },
  trailer: "Every claim cites its source.",
  listSeparator: ", ",
};

const fr: FicheMetadataCopy = {
  title: {
    people: (name, context) =>
      context ? `${name} — peuple (${context})` : `${name} — peuple d'Afrique`,
    peopleLinks: (name) => `${name} — liens et parentés`,
    country: (name) => `${name} — peuples et langues`,
    family: (name) => `${name} — famille linguistique`,
    language: (name, context) =>
      context ? `${name} — langue (${context})` : `${name} — langue d'Afrique`,
    name: (name) => `${name} — origine et histoire du nom`,
  },
  lead: {
    people: "Peuple d'Afrique",
    peopleLinks: "Liens, parentés et voisinages",
    country: "Peuples, langues et noms",
    family: "Famille linguistique africaine",
    language: "Langue d'Afrique",
    name: "Origine, porteurs et histoire du nom",
  },
  clause: {
    family: (familyName) => `famille linguistique : ${familyName}`,
    presence: (countryNames) => `présence : ${countryNames}`,
    peopleCount: (count) => `${count} peuples documentés`,
    speakers: (peopleNames) => `porté par les ${peopleNames}`,
  },
  trailer: "Chaque affirmation cite sa source.",
  listSeparator: ", ",
};

// @req REQ-091
export const ficheMetadataCopy: Record<Language, FicheMetadataCopy> = {
  en,
  fr,
};
