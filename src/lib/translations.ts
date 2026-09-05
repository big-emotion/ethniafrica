import { Language } from "@/types/shared";
import { PRODUCT_NAME, ATTRIBUTION_STRING } from "@/lib/brand";
import {
  CLASSIFICATION_LABELS,
  COLONIAL_EVENT_TYPE_LABELS,
  NAME_TYPE_LABELS,
  PATRONYME_VOCABULARY,
} from "@/lib/glossaire/vocabularies";
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
  languages: "Langues",
  search: "Recherche",
  doctrine: "Doctrine",
  about: "À propos",
  sources: "Sources",
  anecdotes: "Anecdotes",
  names: "Appellations",
  // The public word DEC-038 gives the patronyme, which is why the trail
  // reads "nom" where the code says `patronymes`. Plural because the crumb
  // points at the index, alongside "Peuples", "Pays" and "Appellations".
  patronymes: "Noms",
  compare: "Comparer",
  migrations: "Migrations",
  quiz: "Quiz",
  colonization: "Colonisation & résistances",
  // Shorter than the module's own label ("Qui a donné ce nom ?"), which is a
  // question and would wrap the crumb on a phone. The trail names the
  // destination; the menu asks the question.
  nommer: "Nommer",
  glossary: "Glossaire",
  atlasHub: ACCESS_MODE_LABELS.atlas,
  dossiersHub: ACCESS_MODE_LABELS.dossiers,
  jeuxHub: ACCESS_MODE_LABELS.jeux,
};

// @req REQ-014
export const translations = {
  fr: {
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
        languages: "Langues",
        // Same public-facing word as the trail label (TRAIL_PAGE_LABELS.patronymes
        // above), distinct from "Appellations" so the two corpus entities never
        // read as one entry in a menu.
        patronymes: "Noms",
        participateHeading: "Participer",
        contribute: "Contribuer",
        reportError: "Signaler une erreur",
        // The two pages that describe the project rather than the corpus.
        // No access mode lists them — an axis is a way into the corpus — so
        // the footer is where a reader now finds them. Doctrine is reached
        // from here at one remove, through the link on the À propos page
        // itself, rather than as a fourth entry in this rubric.
        projectHeading: "Le projet",
        about: "À propos",
        sources: "Sources",
        glossary: "Glossaire",
        contact: "Contact",
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
    // Controlled vocabularies are labelled once, in the glossary's owner file,
    // and only pointed at from here (REQ-144).
    classification: CLASSIFICATION_LABELS.fr,
    names: {
      pageTitle: "Appellations",
      // The deck says what the page is; `purpose` below says why it exists.
      // They used to be one sentence printed twice — once in the head band and
      // again as the first paragraph under it — which read as a stutter and
      // still left unsaid what a reader comes here to do.
      pageSubtitle:
        "Les noms sous lesquels chaque peuple d'Afrique est désigné : ceux qu'il se donne, et ceux qu'on lui a donnés.",
      /**
       * Why the page exists, in the reader's terms.
       *
       * Naming a people is contested, and the corpus takes no side: it records
       * every attested form and says where each came from. Without this said
       * plainly, a reader meets three thousand forms and no reason for them —
       * and the page reads as a duplicate of the people fiches, which name one
       * autonym each and cannot be entered from a name heard elsewhere.
       */
      purpose:
        "Un peuple porte rarement un seul nom. Il en a un qu'il emploie lui-même, d'autres que ses voisins lui donnent, d'autres encore qu'une administration coloniale a fixés par écrit — et certains sont péjoratifs. Cette page les recense tous, pour qu'un nom entendu quelque part mène au peuple qu'il désigne, sans décider lequel est le bon.",
      // The note used to say the genealogy of personal names was "not covered
      // yet". It is: the patronyme fiches exist and now have their own route
      // (DEC-038), so the note points there instead of closing the door.
      genealogyNote:
        "Cette page documente les noms de peuples (ethnonymes) — endonymes, exonymes et appellations imposées. Vous cherchez l'origine d'un nom de famille ? C'est la dimension Nom, qui documente les systèmes de nommage des personnes.",
      searchLabel: "Rechercher un nom",
      searchPlaceholder:
        "Rechercher un nom (endonyme, exonyme, graphie historique...)",
      searchSubmit: "Rechercher",
      filtersLabel: "Filtrer par type de nom",
      // The four chips are the page's own vocabulary and were glossed nowhere
      // a reader passes through — « endonyme » and « exonyme » least of all,
      // and they are the two that carry the page's whole argument.
      filtersLegend:
        "Un endonyme est le nom qu'un peuple se donne ; un exonyme, celui que d'autres lui donnent ; une graphie historique, une forme fixée par écrit à une époque ; un nom imposé, une appellation attribuée de l'extérieur.",
      filters: {
        all: "tous",
        endonym: NAME_TYPE_LABELS.fr.endonym,
        exonym: NAME_TYPE_LABELS.fr.exonym,
        historical_spelling: NAME_TYPE_LABELS.fr.historical_spelling,
        // The chip is rendered only when the corpus holds a record of that
        // type, and it holds none — see migration 071.
        surname: NAME_TYPE_LABELS.fr.surname,
        // Plural on purpose: the chip narrows the list to a set ("noms
        // imposés 12") where the badge names one record ("nom imposé"). The
        // vocabulary value is the singular; this is its grammatical number,
        // not a second wording.
        imposed: "noms imposés",
      },
      activeFiltersLabel: "Filtres actifs",
      clearFilter: "Supprimer le filtre",
      resultCountSingular: "résultat",
      resultCountPlural: "résultats",
      // The listing names a range, not just a total: the page used to print
      // "3679 résultats" above 100 rendered rows.
      range: {
        none: "Aucune forme",
        of: "sur",
        formsSingular: "forme",
        formsPlural: "formes",
      },
      alsoWritten: "Aussi écrit :",
      bornBy: "Porté par",
      bornByOne: "Porté par un peuple",
      peoplesPlural: "peuples",
      problematicLabel: "Pourquoi ce nom pose problème :",
      pagination: {
        label: "Pagination de la nomenclature",
        previous: "Précédent",
        next: "Suivant",
        page: "Page",
      },
      emptyState: {
        spellingGuidance:
          "Vérifiez l'orthographe : un même nom peut varier selon la graphie historique ou la langue d'origine.",
        browseByTypeLabel: "Parcourir par type de nom :",
        clearFilters: "Retirer les filtres",
        reportMissing: "Signaler une donnée manquante",
      },
    },
    // Languages index (ETNI-1802/REQ-139). 748 languages for 532 distinct
    // names — e.g. "Fulfulde" names both fuf and fuv — so the copy itself
    // flags why every row needs a family + id, not just the name.
    languages: {
      pageTitle: "Langues",
      pageSubtitle:
        "Les langues attestées d'Afrique, classées par famille linguistique. Le corpus recense 748 langues pour 532 noms distincts — plusieurs langues partagent un même nom (par exemple « Fulfulde », qui désigne à la fois le fuf et le fuv), d'où la famille et l'identifiant ISO 639-3 affichés sur chaque ligne.",
      unavailable:
        "Les langues du corpus sont momentanément indisponibles. Réessayez dans un instant.",
      range: {
        none: "Aucune langue",
        of: "sur",
        languagesSingular: "langue",
        languagesPlural: "langues",
      },
      emptyState: "Aucune langue ne commence par cette lettre.",
      pagination: {
        label: "Pagination des langues",
        previous: "Précédent",
        next: "Suivant",
        page: "Page",
      },
    },
    // Patronyme fiche (ETNI-1464, REQ-133). Distinct from `names` above:
    // `names` covers ethnonyms (how a *people* is called); this covers
    // patronymes (the naming system a *person* is named under).
    //
    // The key is the internal word and the copy is the public one — DEC-038,
    // same split as `TRAIL_PAGE_LABELS.patronymes` above. Anything a reader
    // sees under this key says "nom", except where "patronyme" names one of
    // the five naming systems, which is onomastic vocabulary and not a label
    // for the axis.
    patronymes: {
      eyebrow: "Nom",
      nameSystemSectionTitle: "Le nom",
      nameSystemStatementPrefix: "Système de nommage :",
      nameSystemLabels: PATRONYME_VOCABULARY.fr.nameSystem,
      casteOrSocialFunctionLabel: "Caste ou fonction sociale",
      attestedFormsTitle: "Graphies attestées",
      spellingAttestedInPrefix: "attestée en",
      transmissionModeLabel: "Mode de transmission",
      transmissionModeLabels: PATRONYME_VOCABULARY.fr.transmissionMode,
      designatedSocialUnitLabel: "Unité sociale désignée",
      designatedSocialUnitLabels: PATRONYME_VOCABULARY.fr.designatedSocialUnit,
      totemicFoodProhibitionLabel: "Interdit alimentaire totémique",
      permittedGivenNamesLabel: "Prénoms autorisés",
      nisbaSubtypeLabel: "Type de nisba",
      nisbaSubtypeLabels: PATRONYME_VOCABULARY.fr.nisbaSubtype,
      originTitle: "Origine",
      // Three parallel lists, not one classification: the corpus can hold a
      // griot's account and a written chronicle for the same name without
      // either overruling the other.
      originOralTraditionsLabel: "Tradition orale griotique",
      originWrittenChroniclesLabel: "Chronique écrite",
      originLinguisticReconstructionsLabel: "Reconstruction linguistique",
      originClaimStatusLabels: PATRONYME_VOCABULARY.fr.originClaimStatus,
      // Attributed to the transcription and its griot rather than stated as
      // a bare fact: an oral chain of transmission is the source, and a
      // fiche that dropped that attribution would present a griot's telling
      // as if it were the corpus's own claim.
      griotOriginNote:
        "Cette origine est transmise par tradition orale griotique. Elle est présentée telle que transcrite, avec sa source et, lorsqu'il est documenté, le griot qui l'a transmise.",
      griotAttributionPrefix: "Transmis par",
      sourcesTitle: "Sources",
      alliancesTitle: "Alliances",
      // Says what the chapter is for. Fourteen dossiers out of some 790
      // record a pact, so a reader almost always meets this chapter empty,
      // and an empty chapter titled "Alliances" explained nothing.
      alliancesNote:
        "Les pactes qui lient ce nom à d'autres noms : une parenté à plaisanterie, où les porteurs des deux noms se doivent moquerie rituelle et assistance, et qui interdit le conflit entre eux. Chaque pacte est désigné par le terme que les sources emploient.",
      // The gloss that follows an attested term, keyed by the term. The term
      // itself stays on the page: it is what the sources say.
      allianceTermGlosses: {
        sanankuya: "parenté à plaisanterie mandingue",
      },
      allianceTypeFallback: "Alliance documentée",
      homonymsTitle: "Homonymes",
      // Same reason as the alliances note: the chapter is empty on nearly
      // every dossier, and its title alone reads as a dictionary rubric.
      homonymsNote:
        "Ce que la même chaîne de lettres désigne d'autre — un peuple, un lieu, un autre nom — sans lien démontré avec celui-ci. La liste évite qu'une ressemblance de forme se lise comme une filiation.",
      associationsTitle: "Peuples et pays concernés",
      associatedPeoplesLabel: "Peuples",
      associatedCountriesLabel: "Pays",
      // AC4: a non-hereditary patronymic works differently by region — the
      // fiche says so explicitly rather than let the reader assume the
      // hereditary-surname model that `nameSystem` elsewhere denies.
      nonHereditaryGuidance:
        "Ce patronyme n'est pas transmis de façon héréditaire : il ne se lit pas comme un nom de famille au sens européen. Sa portée varie selon la région — les peuples et pays ci-dessous indiquent où ce mode de nommage est documenté.",
      bearersTitle: "Porteurs et porteuses",
      // DEC-040: no code path derives a person's ethnic origin from this
      // patronyme, and this note states that editorial guarantee to the reader
      // rather than leave it implicit in what the list omits.
      //
      // It used to open on the eligibility class DEC-040 actually defines —
      // "des personnes publiques ou décédées" — which made a section that
      // simply lists who bears a name read as a search through the dead. The
      // guarantee is the point; who qualifies is a curation rule, and it is
      // stated second and without the word.
      bearersEditorialNote:
        "N'y figurent que des personnalités publiques ou historiques, et des personnes qui se sont elles-mêmes reconnues dans ce nom. La liste documente le nom : elle ne permet de déduire l'origine ethnique d'aucune personne qui le porte.",
      roleCategoryFallback: "Rôle non renseigné",
      // The name dimension as the people and country fiches carry it
      // (REQ-133, `docs/design/name-to-country-linking.md`). The country
      // labels are the load-bearing copy: the two lists answer different
      // questions, and only the wording keeps a reader from reading the
      // second as an attestation the corpus never made.
      onFiche: {
        peopleTitle: "Noms portés",
        peopleEmpty:
          "Le corpus ne rattache encore aucun nom à ce peuple. La dimension des noms vient d'ouvrir et ne couvre qu'une petite part de l'atlas.",
        peopleUnavailable:
          "Les noms portés n'ont pas pu être chargés. Le problème vient de notre côté, pas d'un corpus vide.",
        countryTitle: "Noms attestés",
        countryNote:
          "Deux registres distincts : ce qu'une source atteste dans ce pays, et ce que portent les peuples qui y vivent.",
        attestedLabel: "Attestés dans le pays",
        // Says both halves of the inference in the label itself — whose
        // names these are, and that no source places them here. A label
        // reading merely "Portés par les peuples" would let the chapter
        // title supply the missing word, and the word it would supply is
        // "attestés".
        reachLabel: "Portés par les peuples du pays, sans attestation ici",
        reachViaPrefix: "par",
        countryEmpty:
          "Le corpus n'atteste encore aucun nom dans ce pays, et aucun des peuples qui y vivent n'en porte de documenté.",
        countryUnavailable:
          "Les noms n'ont pas pu être chargés. Le problème vient de notre côté, pas d'un corpus vide.",
      },
      // The /fr/atlas/noms index (ETNI-1803, REQ-139) — the corpus-class
      // listing that leads to the fiches above. Kept nested here rather than
      // as a sibling top-level key: it is patronyme copy, distinct from
      // `fr.names` (the unrelated Appellations/ethnonym page).
      index: {
        pageTitle: "Noms",
        pageSubtitle:
          "Les systèmes de nommage des personnes documentés dans le corpus — noms de clan, patronymes non héréditaires, nisba et noms d'éloge.",
        unavailable:
          "Les noms n'ont pas pu être chargés. Le problème vient de notre côté, pas d'un corpus vide.",
        countSingular: "nom",
        countPlural: "noms",
        emptyState: "Aucun nom n'est encore documenté.",
        pagination: {
          label: "Pagination des noms",
          previous: "Précédent",
          next: "Suivant",
          page: "Page",
        },
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
        eventTypeLabels: COLONIAL_EVENT_TYPE_LABELS.fr,
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
      pageTitle: "Sur quoi veux-tu jouer ?",
      pageSubtitle:
        "Un pays, une famille de langues, un sujet — ou tout le continent. Huit questions à chaque fois.",
      scopeThemeHeading: "Un sujet",
      scopeCountryHeading: "Un pays",
      scopeFamilyHeading: "Une famille de langues",
      scopeCountryHint:
        "Touchez un pays : les sujets qu'il peut remplir se déplient.",
      scopeThemePanelHint: "Choisissez un sujet, ou jouez le pays entier.",
      scopeThemePanelNoTheme: "Jouer sans thème",
      scopeMixedHint:
        "Huit questions tirées de tout le corpus, des peuples les plus connus aux moins documentés.",
      scopeRandomHint: "Huit questions au hasard, sans ordre de difficulté.",
      leaveSession: "Quitter le quiz",
      seeScoreCard: "Voir la carte de score",
      comingSoon:
        "les questions de cette sélection arrivent — les fiches correspondantes sont en cours de vérification",
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
        "Aucune question disponible sur ce sujet — réessaie plus tard.",
      backToPicker: "Choisir autre chose",
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
    // `blurb` opens the hub page — it says what the axis holds, in the
    // register of the page it opens. `menuBlurb` opens the header panel,
    // directly above the tiles of that axis, and lists what those tiles are.
    // Two surfaces, so two sentences; both copied from docs/design/mockups,
    // which is the reference when code and mockup disagree
    // (docs/design/README.md).
    //
    // The panel sentence used to name the occasion instead of the contents —
    // « Quand on sait ce qu'on cherche », « Quand on veut se tester » — which
    // asks a reader looking straight at five unexplained tiles to work out
    // for themselves what those tiles hold. It now names the modules, and
    // `modulesNamedIn` keeps it honest as the registry changes.
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
        // Ordered by the corpus's own hierarchy — famille → langue → peuple →
        // pays — then the two axes that name rather than place. Both sentences
        // listed four of six classes, each omitting a different pair, so a
        // reader met a different atlas depending on whether they read the menu
        // or the page under it.
        blurb:
          "L'axe des fiches : familles linguistiques, langues, peuples, pays, appellations et noms, chacun sous la sienne.",
        menuBlurb:
          "Les fiches de familles, langues, peuples, pays, appellations et noms, plus la recherche.",
        hubEntryName: "Le hub d'exploration",
      },
      dossiers: {
        title: ACCESS_MODE_LABELS.dossiers,
        pageTitle: "Comprendre les peuples d'Afrique",
        blurb:
          "L'axe des relations : d'où vient un nom, par où sont passés les peuples, et sur quelles sources l'atlas s'appuie.",
        menuBlurb:
          "Qui a donné ces noms, des anecdotes sourcées, les migrations et la colonisation.",
        hubEntryName: "Le hub de lecture",
      },
      jeux: {
        title: ACCESS_MODE_LABELS.jeux,
        pageTitle: "Jouer avec les peuples d'Afrique",
        blurb:
          "L'axe de la mise à l'épreuve : des jeux et des quiz tirés des fiches, dont chaque réponse renvoie à la sienne.",
        menuBlurb:
          "Un quiz tiré des fiches, et un jeu sur la taille réelle des pays.",
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
        // `compte`, `inscription` and `profil` were removed with the pages
        // they named: there are no public accounts, so nothing registers, and
        // a segment nobody can reach needs no word.
        contribute: "Contribuer",
        "mentions-legales": "Mentions légales",
        "plan-du-site": "Plan du site",
        "politique-de-donnees": "Politique de données",
        "report-error": "Signaler une erreur",
        signalements: "Signalements",
        // The comparison's own segment: `/fr/comparer/peuples/PPL_A,PPL_B`
        // names what is being compared before it names the pair.
        peuples: "Peuples",
        pays: "Pays",
        familles: "Familles",
        // The five chapters of the Nommer dossier. They are segments rather
        // than page types on purpose (see NOMMER_CHAPTER_SLUGS in routing.ts),
        // so this map is the only place the trail can learn their words.
        "le-peuple": "Le peuple",
        "le-pays": "Le pays",
        "la-personne": "La personne",
        "la-langue": "La langue",
        "la-chose": "La chose",
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
