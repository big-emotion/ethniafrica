import { Language } from "@/types/shared";
import { PRODUCT_NAME, ATTRIBUTION_STRING } from "@/lib/brand";

// @req REQ-014
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
    publicFlags: {
      title: "Tous les signalements",
      metadataTitle: "Tous les signalements — Africa History",
      metadataDescription:
        "Transparence éditoriale — explorez les signalements de la communauté",
      introduction:
        "Cette file publique rend visible le suivi éditorial des signalements transmis par la communauté.",
      queueLabel: "File publique des signalements",
      filters: {
        statuses: "Statuts",
        kinds: "Types de signalement",
        targets: "Cibles",
      },
      statuses: {
        open: "Ouvert",
        under_review: "En cours d’examen",
        accepted: "Accepté",
        rejected: "Rejeté",
        withdrawn: "Retiré",
        duplicate: "Doublon",
      },
      kinds: {
        inaccurate: "Information inexacte",
        "missing-source": "Source manquante",
        "broken-url": "URL brisée",
        offensive: "Contenu offensant",
        "correction-proposal": "Proposition de correction",
        other: "Autre",
      },
      targets: {
        assertion: "Assertion",
        source: "Source",
        fiche_section: "Section de fiche",
        classification: "Classification",
      },
      entities: {
        people: "Peuple",
        country: "Pays",
        language: "Langue",
        language_family: "Famille linguistique",
        source: "Source",
        fiche_section: "Section de fiche",
        classification: "Classification",
      },
      anonymous: "anonyme",
      loading: "Chargement des signalements…",
      loadError: "Impossible de charger les signalements.",
      empty: "aucun signalement ne correspond à ces filtres",
      reset: "réinitialiser",
      loadingMore: "Chargement…",
      retry: "Réessayer",
      loadMore: "Afficher plus de signalements",
    },
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

// @req REQ-014
export const getTranslation = (lang: Language) => translations[lang];

/**
 * Localized labels and tooltips for the `classification_status` enum.
 * Used by the ClassificationBadge component (ETNI-178).
 */
// @req REQ-023
export const classificationLabels = translations.fr.classification;
