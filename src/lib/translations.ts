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
    footer: {
      attribution: ATTRIBUTION_STRING,
      partnerLogoAlt: "BIG EMOTION",
      copyright: "EthniAfrica. Tous droits réservés.",
      legalNavigationLabel: "Informations légales",
      legalNotice: "Mentions légales",
      dataPolicy: "Politique de données",
      cookieSettings: "Gestion des cookies",
      accessibility: "Accessibilité",
    },
    legalPages: {
      legalNotice: {
        eyebrow: "Informations essentielles",
        title: "Mentions légales",
        lastUpdated: "Dernière mise à jour : 25 juillet 2026",
        introduction:
          "Cette page présente l’éditeur, le responsable de publication et l’hébergeur d’EthniAfrica.",
        sections: [
          {
            title: "Éditeur du site",
            paragraphs: [
              "EthniAfrica est édité par BIG EMOTION, SASU (société par actions simplifiée à associé unique) au capital de 500 €.",
              "Siège social : 14 rue Bausset, 75015 Paris, France. RCS Paris : 983 423 351. TVA intracommunautaire : FR30983423351.",
              "Contact : hello@big-emotion.com.",
            ],
          },
          {
            title: "Directeur de la publication",
            paragraphs: ["Jean-Noé Kollo, président de BIG EMOTION."],
          },
          {
            title: "Conception et réalisation",
            paragraphs: [
              "La conception et la réalisation du site ont été confiées à l’agence BIG EMOTION.",
              "Site web : big-emotion.com.",
              "Courriel : hello@big-emotion.com.",
            ],
          },
          {
            title: "Hébergement",
            paragraphs: [
              "Le site est hébergé et distribué par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Les services applicatifs et les données du projet sont configurés selon les régions documentées dans l’infrastructure d’EthniAfrica.",
            ],
          },
          {
            title: "Propriété intellectuelle",
            paragraphs: [
              "La structure, l’identité visuelle, les textes éditoriaux, les interfaces et le code du site sont protégés par le droit de la propriété intellectuelle, sous réserve des licences expressément indiquées dans le dépôt du projet.",
              "Les données, citations, marques, documents et visuels provenant de tiers restent la propriété de leurs titulaires. Leur présence sur EthniAfrica n’emporte aucun transfert de droits.",
            ],
          },
          {
            title: "Responsabilité éditoriale",
            paragraphs: [
              "EthniAfrica documente des réalités historiques, linguistiques et culturelles susceptibles d’évoluer ou de faire l’objet de débats. Le projet publie ses sources et rend visibles les signalements afin de permettre la correction et la discussion documentée.",
            ],
          },
        ],
      },
      dataPolicy: {
        eyebrow: "Vie privée et transparence",
        title: "Politique de données",
        lastUpdated: "Dernière mise à jour : 25 juillet 2026",
        introduction:
          "EthniAfrica limite la collecte de données personnelles au strict nécessaire et distingue clairement les données du compte, les contributions éditoriales et les mesures techniques.",
        sections: [
          {
            title: "Responsable du traitement",
            paragraphs: [
              "Le responsable du traitement est BIG EMOTION, 14 rue Bausset, 75015 Paris, France. Pour toute question ou demande relative aux données personnelles : contact@ethniafrica.com.",
            ],
          },
          {
            title: "Données traitées",
            paragraphs: [
              "Lors de la création d’un compte, EthniAfrica peut traiter une adresse e-mail, un nom d’affichage, les informations nécessaires à l’authentification et la confirmation d’âge.",
              "Les contributions, corrections et signalements sont conservés avec les informations nécessaires à leur instruction et à la transparence éditoriale. Les journaux techniques peuvent contenir des informations limitées liées au fonctionnement et à la sécurité du service.",
              "Les préférences de consentement sont enregistrées dans le navigateur pour mémoriser les choix effectués.",
            ],
          },
          {
            title: "Finalités et bases légales",
            paragraphs: [
              "Les données de compte servent à fournir l’accès aux fonctionnalités de contribution. Les signalements et journaux éditoriaux répondent à l’intérêt légitime de fiabilité, de sécurité et de transparence du projet.",
              "La mesure d’audience Plausible n’est activée qu’après consentement. La préférence fonctionnelle contrôle l’association d’un contexte utilisateur à Sentry ; sans elle, ce contexte est effacé. Les diagnostics techniques strictement nécessaires à la sécurité et à la stabilité peuvent être traités au titre de l’intérêt légitime.",
              "Les choix de consentement peuvent être modifiés à tout moment depuis « Gestion des cookies » dans le pied de page.",
            ],
          },
          {
            title: "Services et sous-traitants",
            paragraphs: [
              "Supabase fournit l’authentification et l’hébergement de la base de données. Vercel assure l’hébergement et la distribution de l’application.",
              "Plausible Analytics fournit, après consentement, des statistiques de fréquentation sans cookie publicitaire. Sentry peut recevoir un contexte technique limité et expurgé des données personnelles identifiables afin de diagnostiquer les erreurs.",
              "Aucune donnée personnelle n’est vendue, louée ou utilisée à des fins de profilage publicitaire.",
            ],
          },
          {
            title: "Durées de conservation",
            paragraphs: [
              "Le profil contributeur est conservé tant que le compte reste actif, puis supprimé dans les trente jours suivant une demande de clôture.",
              "Les contributions et signalements peuvent être conservés dans le journal éditorial ; ils sont anonymisés lorsqu’un compte est effacé. Les journaux d’erreurs Sentry sont conservés au maximum trente jours. Les préférences de consentement expirent après douze mois.",
            ],
          },
          {
            title: "Mineurs",
            paragraphs: [
              "Les fonctionnalités de contribution sont réservées aux personnes âgées d’au moins seize ans. Entre treize et quinze ans, la participation nécessite le consentement explicite et vérifiable d’un parent ou représentant légal, selon la législation applicable.",
            ],
          },
          {
            title: "Droits et réclamation",
            paragraphs: [
              "Toute personne dispose, selon sa situation, de droits d’accès, de rectification, d’effacement, d’opposition, de limitation et de portabilité. Ces droits peuvent être exercés à l’adresse contact@ethniafrica.com.",
              "Une réclamation peut également être adressée à la Commission nationale de l’informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, France.",
            ],
          },
        ],
      },
      accessibility: {
        eyebrow: "Un atlas ouvert à toutes et tous",
        title: "Accessibilité",
        lastUpdated: "Dernière mise à jour : 25 juillet 2026",
        introduction:
          "EthniAfrica vise une expérience utilisable sur mobile, au clavier et avec les technologies d’assistance. Cette déclaration décrit l’état actuel du site sans le surestimer.",
        sections: [
          {
            title: "État de conformité",
            paragraphs: [
              "EthniAfrica n’a pas encore fait l’objet d’un audit d’accessibilité complet par un tiers. Le site ne revendique donc aucun taux de conformité au RGAA ou aux WCAG à ce stade.",
            ],
          },
          {
            title: "Mesures déjà en place",
            paragraphs: [
              "Les interfaces principales utilisent des titres structurés, des libellés explicites, des zones de navigation identifiables et des contrôles accessibles au clavier.",
              "Les composants sont conçus en mobile-first, les contrastes sont vérifiés dans le système de design et les animations essentielles respectent la préférence de réduction des mouvements.",
            ],
          },
          {
            title: "Limites connues",
            paragraphs: [
              "Certains graphiques, contenus historiques et parcours plus anciens peuvent encore nécessiter une description alternative ou une navigation clavier améliorée.",
              "L’équipe poursuit l’évaluation des parcours et corrige en priorité les obstacles qui empêchent l’accès à une information ou à une fonctionnalité.",
            ],
          },
          {
            title: "Signaler un obstacle",
            paragraphs: [
              "Pour signaler un problème d’accessibilité, écrivez à contact@ethniafrica.com en indiquant la page concernée, l’appareil ou la technologie d’assistance utilisée et la difficulté rencontrée.",
            ],
          },
        ],
      },
    },
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
    names: {
      pageTitle: "Noms & appellations",
      pageSubtitle:
        "Parcourez, filtrez et recherchez les noms de peuples référencés dans l'atlas.",
      searchLabel: "Rechercher un nom",
      searchPlaceholder:
        "Rechercher un nom (endonyme, exonyme, graphie historique...)",
      searchSubmit: "Rechercher",
      filters: {
        endonym: "endonyme",
        exonym: "exonyme",
        historical_spelling: "graphie historique",
        surname: "patronyme",
        imposed: "noms imposés",
      },
      activeFiltersLabel: "Filtres actifs",
      clearFilter: "Supprimer le filtre",
      resultCountSingular: "résultat",
      resultCountPlural: "résultats",
      emptyState: {
        spellingGuidance:
          "Vérifiez l'orthographe : un même nom peut varier selon la graphie historique ou la langue d'origine.",
        browseByTypeLabel: "Parcourir par type de nom :",
        reportMissing: "Signaler une donnée manquante",
      },
    },
    migrations: {
      navLabel: "Migrations",
      pageTitle: "Frise des migrations",
      pageSubtitle:
        "Le récit chronologique de chaque migration, peuplement et route commerciale documenté dans l'atlas.",
      tabs: {
        map: "Carte",
        narrative: "Récit",
      },
      mapPlaceholder:
        "La carte interactive des migrations arrive avec la Story 12.9.",
      debateLabel: "Débat historiographique",
      peoplesLabel: "Peuples concernés",
      sourcesCountSingular: "source",
      sourcesCountPlural: "sources",
      filterChip: {
        label: "Filtré sur",
        clear: "Retirer le filtre",
      },
      emptyState: "Aucune migration ne correspond à ce filtre.",
    },
    quiz: {
      navLabel: "Quiz",
      pageTitle: "Choisis ton parcours",
      pageSubtitle:
        "Un quiz adapté à ton profil, avec un nombre de questions honnête pour chaque parcours.",
      pickerLabel: "Choisir un parcours de quiz",
      segments: {
        children: "enfants",
        teens: "ados",
        adults: "adultes",
        university: "étudiants",
        professionals: "professionnels",
      },
      questionCountSingular: "1 question disponible",
      questionCountPlural: "questions disponibles",
      comingSoon:
        "les questions de ce parcours arrivent — les fiches correspondantes sont en cours de vérification",
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
