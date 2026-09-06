import type { Language } from "@/types/shared";

const en = {
  countries: {
    lede: (total: string, selected: string, filtered: boolean) =>
      `${total} countries in the corpus${filtered ? ` · ${selected} in this selection` : ""}. Choose one on the globe or in the list to open its fiche.`,
    documentedPeoples: "documented peoples",
    submit: "Apply",
    searchLabel: "Search countries",
    searchPlaceholder: "Country name or identifier",
    family: "Language family",
    allFamilies: "All families",
    sort: "Sort",
    alphabetical: "Name (A → Z)",
    documentedPeoplesDescending: "Documented peoples (descending)",
    documentedPeoplesSort: "Sort: documented peoples",
    empty: "No corpus country matches this selection.",
    listLabel: "Countries",
  },
  peoples: {
    singular: "people",
    plural: "peoples",
    lede: (total: string, singular: boolean) =>
      `${total} ${singular ? "people" : "peoples"} in this selection. Choose a country on the globe to see those documented there.`,
    familyFilter: "Family",
    letterFilter: "Letter",
    searchLabel: "Search peoples",
    searchPlaceholder: "People name",
    country: "Country",
    allCountries: "All countries",
    family: "Language family",
    allFamilies: "All families",
    empty: "No corpus people matches this selection.",
    reset: "Return to all peoples",
    listLabel: "Peoples",
  },
  families: {
    plural: "families",
    lede: (total: string, countryName?: string) =>
      `${total} families ${countryName ? `documented in ${countryName}` : "in the corpus"}. Choose a country on the globe to see which are spoken there.`,
    searchLabel: "Search language families",
    searchPlaceholder: "Family name or identifier",
    country: "Country",
    allCountries: "All countries",
    empty: "No language family matches this selection.",
    peopleCount: (total: string, singular: boolean) =>
      `${total} ${singular ? "people" : "peoples"} in the corpus`,
    unclassified: (total: string) =>
      `${total} peoples not classified under a published language family.`,
    listLabel: "Language families",
  },
  languages: {
    familyFilter: "Family",
    letterFilter: "Letter",
    lede: (total: string, singular: boolean) =>
      `${total} ${singular ? "language" : "languages"} in this selection. Choose a country on the globe to see those spoken there.`,
    searchLabel: "Search languages",
    searchPlaceholder: "Language name or ISO 639-3 code",
    country: "Country",
    allCountries: "All countries",
    family: "Language family",
    allFamilies: "All families",
    empty: "No corpus language matches this selection.",
    reset: "Return to all languages",
    listLabel: "Languages",
  },
  names: {
    singular: "name",
    plural: "names",
    countryFilter: "Country",
    systemFilter: "Naming system",
    letterFilter: "Letter",
    lede: (total: string, singular: boolean) =>
      `${total} ${singular ? "name" : "names"} in this selection. Choose a country on the globe to see those attested there.`,
    searchLabel: "Search names",
    searchPlaceholder: "Name or attested spelling",
    people: "People",
    allPeoples: "All peoples",
    country: "Country",
    allCountries: "All countries",
    system: "Naming system",
    allSystems: "All systems",
    empty: "No corpus name matches this selection.",
    reset: "Return to all names",
    listLabel: "Names",
  },
};

type FacetDirectoriesCopy = typeof en;

const fr: FacetDirectoriesCopy = {
  countries: {
    lede: (total, selected, filtered) =>
      `${total} pays au corpus${filtered ? ` · ${selected} dans cette sélection` : ""}. Choisissez-en un sur le globe ou dans la liste pour ouvrir sa fiche.`,
    documentedPeoples: "peuples documentés",
    submit: "Appliquer",
    searchLabel: "Rechercher un pays",
    searchPlaceholder: "Nom ou identifiant du pays",
    family: "Famille linguistique",
    allFamilies: "Toutes les familles",
    sort: "Tri",
    alphabetical: "Nom (A → Z)",
    documentedPeoplesDescending: "Peuples documentés (décroissant)",
    documentedPeoplesSort: "Tri : peuples documentés",
    empty: "Aucun pays du corpus ne répond à cette sélection.",
    listLabel: "Pays",
  },
  peoples: {
    singular: "peuple",
    plural: "peuples",
    lede: (total, singular) =>
      `${total} ${singular ? "peuple" : "peuples"} dans cette sélection. Choisissez un pays sur le globe pour voir ceux qu'il documente.`,
    familyFilter: "Famille",
    letterFilter: "Lettre",
    searchLabel: "Rechercher un peuple",
    searchPlaceholder: "Nom du peuple",
    country: "Pays",
    allCountries: "Tous les pays",
    family: "Famille linguistique",
    allFamilies: "Toutes les familles",
    empty: "Aucun peuple du corpus ne répond à cette sélection.",
    reset: "Revenir à tous les peuples",
    listLabel: "Peuples",
  },
  families: {
    plural: "familles",
    lede: (total, countryName) =>
      `${total} familles ${countryName ? `documentées en ${countryName}` : "au corpus"}. Choisissez un pays sur le globe pour voir lesquelles s'y parlent.`,
    searchLabel: "Rechercher une famille linguistique",
    searchPlaceholder: "Nom ou identifiant de la famille",
    country: "Pays",
    allCountries: "Tous les pays",
    empty: "Aucune famille linguistique ne répond à cette sélection.",
    peopleCount: (total) => `${total} peuples au corpus`,
    unclassified: (total) =>
      `${total} peuples non classés dans une famille linguistique publiée.`,
    listLabel: "Familles linguistiques",
  },
  languages: {
    familyFilter: "Famille",
    letterFilter: "Lettre",
    lede: (total, singular) =>
      `${total} ${singular ? "langue" : "langues"} dans cette sélection. Choisissez un pays sur le globe pour voir celles qu'on y parle.`,
    searchLabel: "Rechercher une langue",
    searchPlaceholder: "Nom de la langue, code ISO 639-3",
    country: "Pays",
    allCountries: "Tous les pays",
    family: "Famille linguistique",
    allFamilies: "Toutes les familles",
    empty: "Aucune langue du corpus ne répond à cette sélection.",
    reset: "Revenir à toutes les langues",
    listLabel: "Langues",
  },
  names: {
    singular: "nom",
    plural: "noms",
    countryFilter: "Pays",
    systemFilter: "Système",
    letterFilter: "Lettre",
    lede: (total, singular) =>
      `${total} ${singular ? "nom" : "noms"} dans cette sélection. Choisissez un pays sur le globe pour voir ceux qu'il atteste.`,
    searchLabel: "Rechercher un nom",
    searchPlaceholder: "Nom, graphie attestée",
    people: "Peuple",
    allPeoples: "Tous les peuples",
    country: "Pays",
    allCountries: "Tous les pays",
    system: "Système de nommage",
    allSystems: "Tous les systèmes",
    empty: "Aucun nom du corpus ne répond à cette sélection.",
    reset: "Revenir à tous les noms",
    listLabel: "Noms",
  },
};

// @req REQ-141
export const facetDirectoriesCopy: Record<Language, FacetDirectoriesCopy> = {
  en,
  fr,
};
