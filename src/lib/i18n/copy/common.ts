import { ATTRIBUTION_STRING, PRODUCT_NAME } from "@/lib/brand";
import type { Language } from "@/types/shared";

/**
 * The flat, site-wide strings that no single surface owns.
 *
 * Every dictionary is written English first because that is the one the type
 * is read off: `fr` is declared against `typeof en`, so a key present in one
 * locale and absent in the other fails to compile rather than rendering
 * `undefined` on half the site. No `as const`, so the strings widen and the
 * French can differ in every value while matching in every key.
 *
 * Register (brand charter §Voice, English side): British spelling, present
 * tense, declarative, no contractions. « Fiche » and « dossier » stay as
 * they are — they are the product's own words in both languages.
 */
const en = {
  title: PRODUCT_NAME,
  // Drawn into the social-card images, so it is read far more often than it
  // is seen on the site.
  subtitle:
    "Encyclopaedia of the peoples, languages, language families, countries, ethnonyms and names of Africa",
  byCountry: "By country",
  byPeople: "By people",
  byFamily: "By language family",
  statistics: "Statistics",
  searchPlaceholder: "Search families, peoples or countries...",
  population: "Population",
  percentage: "Percentage",
  country: "Country",
  countries: "Countries",
  people: "People",
  peoples: "Peoples",
  languageFamily: "Language family",
  languageFamilies: "Language families",
  subgroup: "Subgroup",
  totalPopulation: "Total population 2025",
  inCountry: "In the country",
  inAfrica: "In Africa",
  showingResults: "Showing",
  of: "of",
  results: "results",
  noResults: "No results found",
  sortBy: "Sort by",
  filterBy: "Filter by",
  all: "All",
  viewDetails: "View details",
  close: "Close",
  whyThisSite: "Why this site?",
  madeWithEmotion: ATTRIBUTION_STRING,
};

type CommonCopy = typeof en;

const fr: CommonCopy = {
  title: PRODUCT_NAME,
  // Drawn into the social-card images (opengraph-image.tsx,
  // twitter-image.tsx), so it is read far more often than it is seen on the
  // site. Held to the six corpus classes by siteDescription.test.ts.
  subtitle:
    "Encyclopédie des peuples, langues, familles linguistiques, pays, appellations et noms d'Afrique",
  byCountry: "Par Pays",
  byPeople: "Par Peuple",
  byFamily: "Par Famille Linguistique",
  statistics: "Statistiques",
  searchPlaceholder: "Rechercher familles, peuples ou pays...",
  population: "Population",
  percentage: "Pourcentage",
  country: "Pays",
  countries: "Pays",
  people: "Peuple",
  peoples: "Peuples",
  languageFamily: "Famille Linguistique",
  languageFamilies: "Familles Linguistiques",
  subgroup: "Sous-groupe",
  totalPopulation: "Population Totale 2025",
  inCountry: "Dans le Pays",
  inAfrica: "En Afrique",
  showingResults: "Affichage de",
  of: "sur",
  results: "résultats",
  noResults: "Aucun résultat trouvé",
  sortBy: "Trier par",
  filterBy: "Filtrer par",
  all: "Tous",
  viewDetails: "Voir Détails",
  close: "Fermer",
  whyThisSite: "Pourquoi ce site ?",
  madeWithEmotion: ATTRIBUTION_STRING,
};

// @req REQ-145
export const commonCopy: Record<Language, CommonCopy> = { en, fr };
