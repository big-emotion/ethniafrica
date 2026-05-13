import { Language } from "@/types/shared";
import { PRODUCT_NAME, ATTRIBUTION_STRING } from "@/lib/brand";

export const translations = {
  fr: {
    title: PRODUCT_NAME,
    subtitle:
      "Encyclopédie des peuples, langues et familles linguistiques dans 55 pays africains",
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
    classification: {
      consensual: {
        label: "Consensuel",
        tooltip:
          "Classification largement consensuelle dans la littérature scientifique.",
      },
      contested: {
        label: "Contesté",
        tooltip: "Classification faisant l'objet de débats académiques.",
      },
      "colonial-legacy": {
        label: "Héritage colonial",
        tooltip:
          "Catégorie héritée de la période coloniale, conservée et expliquée selon notre cadre éditorial.",
      },
      reconstructive: {
        label: "Reconstructif",
        tooltip:
          "Classification reconstruite à partir de sources fragmentaires.",
      },
    },
  },
};

export const getTranslation = (lang: Language) => translations[lang];

/**
 * Localized labels and tooltips for the `classification_status` enum.
 * Used by the ClassificationBadge component (ETNI-178).
 */
export const classificationLabels = translations.fr.classification;
