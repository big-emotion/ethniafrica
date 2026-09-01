import { Language } from "@/types/shared";
import { PRODUCT_NAME, ATTRIBUTION_STRING } from "@/lib/brand";
import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";
import type { PageType } from "@/lib/routing";

/**
 * How a trail names each page of the site.
 *
 * Typed against `PageType` rather than left open, because the trail's rule is
 * that it never prints a segment it cannot name: a page type with no label
 * here would be a page whose trail silently truncates to nothing. The
 * compiler refusing an incomplete record is what turns that into a build
 * error instead of a missing crumb.
 */
const TRAIL_PAGE_LABELS: Record<PageType, string> = {
  countries: "Pays",
  families: "Familles",
  peoples: "Peuples",
  search: "Recherche",
  doctrine: "Doctrine",
  about: "À propos",
  anecdotes: "Anecdotes",
  names: "Appellations",
  compare: "Comparer",
  migrations: "Migrations",
  quiz: "Quiz",
  colonization: "Colonisation & résistances",
  atlasHub: ACCESS_MODE_LABELS.atlas,
  dossiersHub: ACCESS_MODE_LABELS.dossiers,
  jeuxHub: ACCESS_MODE_LABELS.jeux,
};

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
      // Not "tous droits réservés": the API meta and every citation this site
      // emits declare CC BY-SA 4.0, so the footer was contradicting the corpus
      // four hundred pixels below the citation block that licenses it.
      // Brand charter §2.
      copyright: `${PRODUCT_NAME} — corpus sous licence CC BY-SA 4.0.`,
      about: "À propos",
      // Left the header when it became three intentions rather than ten
      // destinations: the public API is a developer's entry, not a reading
      // one, so it belongs beside « À propos » and not on an axis.
      api: "API",
      legalNavigationLabel: "Informations légales",
      legalNotice: "Mentions légales",
      dataPolicy: "Politique de données",
      cookieSettings: "Gestion des cookies",
      accessibility: "Accessibilité",
      sitemap: "Plan du site",
      // The directory above the legal line. Its labels are the short forms —
      // « Pays », not « Les pays d'Afrique » — because a footer column is
      // read as a list of rubrics, not as a list of editorial titles.
      directory: {
        explorerHeading: "Explorer",
        countries: "Pays",
        peoples: "Peuples",
        families: "Familles",
        participateHeading: "Participer",
        contribute: "Contribuer",
        reportError: "Signaler une erreur",
        // The two pages that describe the project rather than the corpus. No
        // access mode lists them — an axis is a way into the corpus — so the
        // footer is where a reader now finds them, and the only place the
        // doctrine is reachable from the chrome at all.
        projectHeading: "Le projet",
        doctrine: "Doctrine éditoriale",
        about: "À propos",
        followHeading: "Nous suivre",
        followPending: "compte à venir",
      },
    },
    sitemapPage: {
      eyebrow: "Se repérer",
      title: "Plan du site",
      introduction:
        "Les rubriques du site et les chemins qui y mènent. Les fiches elles-mêmes ne sont pas listées ici : on y arrive par l'atlas ou par la recherche. Cette page suit l'ordre de l'atlas — famille linguistique, puis langue, peuple et pays — plutôt que l'ordre du menu.",
    },
    publicFlags: {
      title: "Tous les signalements",
      metadataTitle: `Tous les signalements — ${PRODUCT_NAME}`,
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
        general: "Signalement général",
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
      pageTitle: "Appellations",
      pageSubtitle:
        "Comment un peuple se nomme-t-il, et comment l'a-t-on nommé ? L'atlas rassemble les endonymes, les exonymes et les appellations imposées attachés à chaque peuple d'Afrique.",
      genealogyNote:
        "Vous cherchez l'origine d'un nom de famille ou d'un prénom ? Ce module ne couvre pas encore la généalogie des noms de personnes : il documente les noms de peuples (ethnonymes) — endonymes, exonymes et appellations imposées.",
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
      states: {
        failure:
          "Les migrations n'ont pas pu être chargées. Le problème vient de notre côté, pas d'un filtre.",
        failureRetry: "Réessayer",
        emptyUnpublished: "Aucune migration n'est encore publiée.",
        filteredEmpty: "Aucune migration ne correspond à ce filtre",
      },
    },
    colonization: {
      navLabel: "Colonisation & résistances",
      pageTitle: "Colonisation & résistances",
      pageSubtitle:
        "Fragmentations, frontières héritées, noms imposés, déplacements et résistances documentés peuple par peuple.",
      fragmentation: {
        title: "Peuples fragmentés par les frontières coloniales",
      },
      sources: {
        title: "Sources",
        linkLabel: "voir les sources",
      },
      timeline: {
        title: "Chronologie",
        eventTypeLabels: {
          fragmentation: "fragmentation",
          displacement: "déplacement forcé",
          imposed_name: "nom imposé",
          resistance: "résistance",
        },
        filterLegend: "Filtrer par type d'événement",
        openEventSuffix: "Entrée pour ouvrir",
        closeEventCard: "Fermer",
        peoplesJoiner: "et",
        table: {
          caption: "Chronologie des événements coloniaux",
          date: "Date",
          type: "Type",
          people: "Peuple",
          place: "Lieu",
          source: "Source",
          placeUndocumented: "Non documenté",
          sourceUndocumented: "Aucune source citée",
        },
        emptyState:
          "Aucun événement de colonisation ou de résistance n'est documenté pour le moment.",
      },
    },
    quiz: {
      navLabel: "Quiz",
      pageTitle: "Choisis ton parcours",
      pageSubtitle:
        "Un parcours par pays, un par famille linguistique, ou tout le continent — huit questions à chaque fois.",
      pickerLabel: "Choisir un parcours de quiz",
      scopePickerLegend: "Composer la partie",
      scopeCountryLabel: "Pays",
      scopeFamilyLabel: "Famille linguistique",
      scopeAnyCountry: "Tous les pays",
      scopeAnyFamily: "Toutes les familles",
      scopeThemeLabel: "Thème",
      scopeAnyTheme: "Tous les thèmes",
      scopeSubmit: "Lancer ce parcours",
      scopeHint:
        "Les trois se combinent. Un parcours sur un seul pays ou une seule famille pose des questions plus serrées : les mauvaises réponses y sont toutes plausibles. Sans thème, une partie n'en répète jamais un plus de deux fois.",
      scopeTooThin: "pas encore assez de questions pour une partie",
      scopeMixedHint:
        "Huit questions tirées de tout le corpus, des peuples les plus connus aux moins documentés.",
      scopeRandomHint: "Huit questions au hasard, sans ordre de difficulté.",
      playingScopePrefix: "Parcours :",
      leaveSession: "Quitter le quiz",
      seeScoreCard: "Voir la carte de score",
      questionCountSingular: "1 question disponible",
      questionCountPlural: "questions disponibles",
      comingSoon:
        "les questions de ce parcours arrivent — les fiches correspondantes sont en cours de vérification",
      validate: "Valider",
      questionProgressPrefix: "question",
      questionProgressSeparator: "sur",
      correctVerdict: "Bonne réponse !",
      incorrectVerdict: "Ce n'est pas ça",
      correctAnswerLabel: "Réponse : ",
      openSourceChain: "Ouvrir la chaîne de sources",
      nextQuestion: "Question suivante",
      seeScore: "Voir le score",
      loadingSession: "Chargement de la session…",
      emptySession:
        "Aucune question disponible pour ce parcours — réessaie plus tard.",
      backToPicker: "Choisir un autre parcours",
      sessionError:
        "Impossible de charger cette session — réessaie dans un instant.",
      scoreHeading: "Score",
      scoreFractionSeparator: "bonnes réponses sur",
      playAgain: "Rejouer",
      scoreCardExactAnswersSeparator: "réponses exactes sur",
      fichesEncounteredLabel: "Fiches rencontrées",
      shareScoreLabel: "Partager le score",
      copiedFeedback: "copié",
      ogSourcedLine: "chaque réponse est sourcée",
    },
    fieldProvenance: {
      missingLabel: "Donnée manquante",
      missingReason: "Le corpus ne renseigne pas ce champ pour cette fiche.",
      derivedLabel: "Valeur dérivée",
      derivedFromPrefix: "Dérivée de : ",
    },
    // `blurb` opens the hub page — it says what the axis holds, to a reader
    // who already chose it. `menuBlurb` opens the header panel — it says
    // when to choose the axis at all, to a reader still deciding. Two jobs,
    // so two sentences; both copied from docs/design/mockups, which is the
    // reference when code and mockup disagree (docs/design/README.md).
    //
    // Each blurb used to open on the reader's own trajectory — « Il arrive
    // avec un nom, il repart avec une fiche » — before naming the contents.
    // It read as a figure of speech where a hub page owes a description,
    // and it was the first sentence of three pages and their three meta
    // descriptions. The clause is gone; what the axis actually holds, which
    // was already the back half of every one of these, is now the whole of
    // it. The home's cards (AccessAxes) carry the same change.
    hubs: {
      atlas: {
        title: ACCESS_MODE_LABELS.atlas,
        // `title` keeps the short reader-facing label available to legacy
        // translation consumers. The band has a different job: it names the
        // page and what it leads into, so `pageTitle` remains descriptive.
        pageTitle: "Explorer les peuples d'Afrique",
        // « Le corpus » and « une entité » are the team's words for the
        // collection and for what it holds. Both name the thing from the
        // inside, and neither is glossed anywhere a reader passes through
        // (ETNI-857) — so the menu that is supposed to say where a click
        // lands was written in the vocabulary of the people who built it.
        blurb:
          "L'axe des fiches : peuples, pays, langues et familles linguistiques, chacun sous la sienne.",
        menuBlurb:
          "Quand on sait ce qu'on cherche — un peuple, un pays, une langue, un nom.",
        hubEntryName: "Le hub d'exploration",
      },
      dossiers: {
        title: ACCESS_MODE_LABELS.dossiers,
        pageTitle: "Comprendre les peuples d'Afrique",
        blurb:
          "L'axe des relations : d'où vient un nom, par où sont passés les peuples, et sur quelles sources l'atlas s'appuie.",
        menuBlurb:
          "Quand on veut savoir d'où vient ce qu'on lit — méthode, sources, temps long.",
        hubEntryName: "Le hub de lecture",
      },
      jeux: {
        title: ACCESS_MODE_LABELS.jeux,
        pageTitle: "Jouer avec les peuples d'Afrique",
        blurb:
          "L'axe de la mise à l'épreuve : des jeux et des quiz tirés des fiches, dont chaque réponse renvoie à la sienne.",
        menuBlurb:
          "Quand on veut se tester — mise en regard, écarts, rapprochements.",
        hubEntryName: "Le hub des jeux",
      },
      unavailableLabel: "Bientôt",
      menuLabel: "Trois chemins",
      // Names the row of facet links under the hub entry. The facets are
      // states of one page, so the menu says so rather than listing them
      // beside the hub as if they were three more destinations — which is
      // exactly how the three directories read before they were merged.
      facetsLabel: "Ses facettes",
    },
    trail: {
      pages: TRAIL_PAGE_LABELS,
      /** The root every trail opens on. Not a PageType: `/fr` addresses no module. */
      home: "Accueil",
      /**
       * How the trail names a path segment the slug table does not address.
       *
       * Two kinds of segment end up here. The first sits below a fiche
       * (`liens`, `score`). The second is a page that `PageType` deliberately
       * ignores: the legal notices, the account and admin screens, the error
       * report. Those address no module of the corpus, so giving them a
       * `PageType` would widen a union that means "an addressable resource"
       * into one that means "a URL that exists" — and `PAGE_TYPES` is read by
       * the routing charter and the sitemap, which would both start asserting
       * that the cookie policy is part of the atlas.
       *
       * A segment absent from this map is one the trail has no words for, and
       * the trail stops rather than print the raw path.
       */
      segments: {
        liens: "Liens",
        score: "Score",
        accessibilite: "Accessibilité",
        admin: "Administration",
        connexion: "Connexion",
        compte: "Compte",
        inscription: "Inscription",
        profil: "Profil",
        confidentialite: "Confidentialité",
        contribute: "Contribuer",
        "mentions-legales": "Mentions légales",
        "plan-du-site": "Plan du site",
        "politique-confidentialite": "Politique de confidentialité",
        "politique-de-donnees": "Politique de données",
        "report-error": "Signaler une erreur",
        signalements: "Signalements",
        // The comparison's own segment: `/fr/comparer/peuples/PPL_A,PPL_B`
        // names what is being compared before it names the pair.
        peuples: "Peuples",
        pays: "Pays",
        familles: "Familles",
      } as Record<string, string>,
      /**
       * Prefixes the fiche a reader arrived from. Provenance, not ancestry:
       * a country reached from a people fiche is not a child of that people,
       * so it is offered as a way back and never as a crumb.
       */
      backTo: "Retour à",
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
