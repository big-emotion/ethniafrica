import type { Language } from "@/types/shared";

const en = {
  title: {
    ficheCountry: "country fiche",
    reference: "ref.",
  },
  brief: {
    aria: (name: string) => `${name} in brief`,
    eyebrow: "In brief",
    title: (name: string) => `${name} — cultural and historical overview`,
    formerNames: "Former names and designations",
  },
  sections: {
    etymology: "Etymology of the name",
    peoples: "Peoples of the country",
    kingdoms: "Kingdoms and political formations",
    namesHistory: "Names through history",
    historicalFacts: "Major historical facts",
    languages: "Languages",
    culture: "Culture and society",
    sources: "Sources",
  },
  peoples: {
    inhabitants: "inhabitants",
    documentedInhabitants: "documented inhabitants",
    count: (count: number) => `${count}+ peoples`,
    groupedCount: (count: number) => `${count} peoples`,
    coverage: (share: number) =>
      `The peoples documented here represent ${share}% of the country's population. The remainder is not yet distributed in the corpus.`,
    diversity: "Ethnolinguistic diversity",
    notDetailed: "not individually detailed",
    otherLanguages: (count: number) => `+ ${count} other languages`,
  },
  reportSection: "Report this section",
  sourcesReferences: "Sources and references",
  targetFacts: {
    written: "Fiche authored",
    derived: "Presence derived from people fiches",
    population: "Population",
    reference: "ref.",
    languages: "Main languages",
    boundary: (id: string) => `${id} · published boundary, drawn on appearance`,
    declaredPeoples: "Peoples declared by the fiche",
    firstEntries: "First entries",
    none: "No people is attached to this country in the corpus.",
    readFull: "Read the full fiche",
    documentedOne: "1 documented people",
    documentedMany: (count: string) => `${count} documented peoples`,
  },
};

type CountryCopy = typeof en;

const fr: CountryCopy = {
  title: { ficheCountry: "fiche pays", reference: "réf." },
  brief: {
    aria: (name) => `${name} en bref`,
    eyebrow: "En bref",
    title: (name) => `${name} — synthèse culturelle et historique`,
    formerNames: "Anciens noms et appellations",
  },
  sections: {
    etymology: "Étymologie du nom",
    peoples: "Peuples du pays",
    kingdoms: "Royaumes et formations politiques",
    namesHistory: "Noms à travers l'histoire",
    historicalFacts: "Faits historiques majeurs",
    languages: "Langues",
    culture: "Culture et société",
    sources: "Sources",
  },
  peoples: {
    inhabitants: "habitants",
    documentedInhabitants: "habitants documentés",
    count: (count) => `${count}+ peuples`,
    groupedCount: (count) => `${count} peuples`,
    coverage: (share) =>
      `Les peuples documentés ici représentent ${share}\u00a0% de la population du pays. Le reste n'est pas encore réparti dans le corpus.`,
    diversity: "Diversité ethnolinguistique",
    notDetailed: "non détaillée individuellement",
    otherLanguages: (count) => `+ ${count} autres langues`,
  },
  reportSection: "Signaler cette section",
  sourcesReferences: "Sources & Références",
  targetFacts: {
    written: "Fiche rédigée",
    derived: "Présence dérivée des fiches peuple",
    population: "Population",
    reference: "réf.",
    languages: "Langues principales",
    boundary: (id) => `${id} · frontière publiée, tracée à l'apparition`,
    declaredPeoples: "Peuples déclarés par la fiche",
    firstEntries: "Premières entrées",
    none: "Aucun peuple rattaché à ce pays dans le corpus.",
    readFull: "Lire la fiche complète",
    documentedOne: "1 peuple documenté",
    documentedMany: (count) => `${count} peuples documentés`,
  },
};

// @req REQ-145
export const countryCopy: Record<Language, CountryCopy> = { en, fr };
