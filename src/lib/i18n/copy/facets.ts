import type { Language } from "@/types/shared";

const en = {
  navigation: "Atlas facets",
  filters: "Filters",
  filter: "Filter",
  removeFilter: "Remove filter",
  firstLetter: "First letter",
  allLetters: "All",
  previousPage: "Previous page",
  nextPage: "Next page",
  page: "Page",
  pagination: "Pagination for",
  topOfList: "at the top of the list",
  bottomOfList: "at the bottom of the list",
  to: "to",
  of: "of",
  perPage: "Per page",
  resultsPerPage: "Results per page",
  selectionEmptyCountry: "This selection documents nothing in this country.",
  alreadyNarrowed: "The list is already narrowed to this country.",
  narrowToCountry: "Narrow the list to this country",
  missingCountryData: "The atlas does not yet document any people by country.",
  showMap: "Show map",
  hideMap: "Hide map",
  areaNoun: "the atlas",
  definitions: {
    families: {
      label: "Families",
      sectionName: "Language families",
      eyebrow: "atlas · language families",
      title: "Language families",
      filterHint:
        "This list contains language families. Filters narrow it without changing its nature: filtering by country shows the families found in that country, not the country itself.",
    },
    languages: {
      label: "Languages",
      sectionName: "Languages",
      eyebrow: "atlas · languages of Africa",
      title: "The languages of Africa",
      filterHint:
        "This list contains languages. Filters narrow it without changing its nature: filtering by country shows the languages spoken there, not the country itself.",
    },
    peoples: {
      label: "Peoples",
      sectionName: "Peoples",
      eyebrow: "atlas · peoples of Africa",
      title: "The peoples of Africa",
      filterHint:
        "This list contains peoples. Filters narrow it without changing its nature: filtering by country shows the peoples documented for that country, not the country itself.",
    },
    countries: {
      label: "Countries",
      sectionName: "Countries",
      eyebrow: "atlas · countries of Africa",
      title: "The countries of Africa",
      filterHint:
        "This list contains countries. Filters narrow it without changing its nature: filtering by language family shows the countries where that family is found, not the family itself.",
    },
    patronymes: {
      label: "Names",
      sectionName: "Names",
      eyebrow: "atlas · names of Africa",
      title: "The names of Africa",
      filterHint:
        "This list contains names. Filters narrow it without changing its nature: filtering by people shows the names carried by that people, not the people itself.",
    },
  },
};

type FacetsCopy = typeof en;

const fr: FacetsCopy = {
  navigation: "Facettes de l'atlas",
  filters: "Filtres",
  filter: "Filtrer",
  removeFilter: "Retirer le filtre",
  firstLetter: "Première lettre",
  allLetters: "Tous",
  previousPage: "Page précédente",
  nextPage: "Page suivante",
  page: "Page",
  pagination: "Pagination des",
  topOfList: "en tête de liste",
  bottomOfList: "en pied de liste",
  to: "à",
  of: "sur",
  perPage: "Par page",
  resultsPerPage: "Résultats par page",
  selectionEmptyCountry: "Cette sélection ne documente rien dans ce pays.",
  alreadyNarrowed: "La liste est déjà réduite à ce pays.",
  narrowToCountry: "Réduire la liste à ce pays",
  missingCountryData: "L’atlas ne renseigne encore aucun peuple par pays.",
  showMap: "Afficher la carte",
  hideMap: "Masquer la carte",
  areaNoun: "l'atlas",
  definitions: {
    families: {
      label: "Familles",
      sectionName: "Familles linguistiques",
      eyebrow: "atlas · les familles linguistiques",
      title: "Familles linguistiques",
      filterHint:
        "La liste est faite de familles linguistiques. Les filtres la restreignent sans changer sa nature : filtrer par pays montre les familles présentes dans ce pays, pas le pays lui-même.",
    },
    languages: {
      label: "Langues",
      sectionName: "Langues",
      eyebrow: "atlas · les langues d'Afrique",
      title: "Les langues d'Afrique",
      filterHint:
        "La liste est faite de langues. Les filtres la restreignent sans changer sa nature : filtrer par pays montre les langues qu'on y parle, pas le pays lui-même.",
    },
    peoples: {
      label: "Peuples",
      sectionName: "Peuples",
      eyebrow: "atlas · les peuples d'Afrique",
      title: "Les peuples d'Afrique",
      filterHint:
        "La liste est faite de peuples. Les filtres la restreignent sans changer sa nature : filtrer par pays montre les peuples que ce pays documente, pas le pays lui-même.",
    },
    countries: {
      label: "Pays",
      sectionName: "Pays",
      eyebrow: "atlas · les pays d'Afrique",
      title: "Les pays d'Afrique",
      filterHint:
        "La liste est faite de pays. Les filtres la restreignent sans changer sa nature : filtrer par famille linguistique montre les pays où cette famille est présente, pas la famille elle-même.",
    },
    patronymes: {
      label: "Noms",
      sectionName: "Noms",
      eyebrow: "atlas · les noms d'Afrique",
      title: "Les noms d'Afrique",
      filterHint:
        "La liste est faite de noms. Les filtres la restreignent sans changer sa nature : filtrer par peuple montre les noms que ce peuple porte, pas le peuple lui-même.",
    },
  },
};

// @req REQ-145
export const facetsCopy: Record<Language, FacetsCopy> = { en, fr };
