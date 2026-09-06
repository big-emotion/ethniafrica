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
 * How a trail names each page of the site, per locale.
 *
 * Typed against `PageType` rather than left open, because the trail's rule is
 * that it never prints a segment it cannot name: a page type with no label
 * here would be a page whose trail silently truncates to nothing. The
 * compiler refusing an incomplete record is what turns that into a build
 * error instead of a missing crumb.
 */
const TRAIL_PAGE_LABELS: Record<Language, Record<PageType, string>> = {
  en: {
    countries: "Countries",
    families: "Families",
    peoples: "Peoples",
    languages: "Languages",
    search: "Search",
    doctrine: "Doctrine",
    about: "About",
    sources: "Sources",
    anecdotes: "Anecdotes",
    // The ethnonym index. "Names" is taken by the patronyme, the way « Noms »
    // is in French (DEC-038), so this crumb says what the page holds.
    names: "Ethnonyms",
    patronymes: "Names",
    compare: "Compare",
    migrations: "Migrations",
    quiz: "Quiz",
    // British spelling, and the same one the URL carries.
    colonization: "Colonisation & resistances",
    nommer: "Naming",
    dossierProportions: "True proportions",
    dossierPopulations: "Real weight",
    dossierRessources: "Resources",
    glossary: "Glossary",
    // The English hub labels live in the dictionary below rather than on
    // `ACCESS_MODE_LABELS`, which is French and read by ninety-odd callers
    // that take one shape from it; changing its shape would move all of
    // them for three words.
    atlasHub: "The atlas",
    dossiersHub: "The dossiers",
    jeuxHub: "Play",
  },
  fr: {
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
    // The trail names the destination in as few words as a phone can hold;
    // the menu carries the dossier's full title, which is a sentence.
    dossierProportions: "Proportions",
    dossierPopulations: "Populations",
    dossierRessources: "Ressources",
    glossary: "Glossaire",
    atlasHub: ACCESS_MODE_LABELS.atlas,
    dossiersHub: ACCESS_MODE_LABELS.dossiers,
    jeuxHub: ACCESS_MODE_LABELS.jeux,
  },
};

/**
 * The English dictionary, written first because it is the one the type is
 * read off: `fr` is declared against `typeof en`, so a key present in one
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
  footer: {
    attribution: ATTRIBUTION_STRING,
    partnerLogoAlt: "BIG EMOTION",
    copyright: `${PRODUCT_NAME} — corpus published under the CC BY-SA 4.0 licence.`,
    about: "About",
    api: "API",
    legalNavigationLabel: "Legal information",
    legalNotice: "Legal notice",
    dataPolicy: "Data policy",
    cookieSettings: "Cookie settings",
    accessibility: "Accessibility",
    sitemap: "Sitemap",
    directory: {
      explorerHeading: "Explore",
      countries: "Countries",
      peoples: "Peoples",
      families: "Families",
      languages: "Languages",
      patronymes: "Names",
      participateHeading: "Take part",
      contribute: "Contribute",
      reportError: "Report an error",
      projectHeading: "The project",
      about: "About",
      sources: "Sources",
      glossary: "Glossary",
      contact: "Contact",
      followHeading: "Follow us",
      followPending: "account to come",
    },
  },
  sitemapPage: {
    eyebrow: "Find your way",
    title: "Sitemap",
    introduction:
      "The site's sections and the paths that lead to them. The fiches themselves are not listed here: they are reached through the atlas or through the search. This page follows the order of the atlas — language family, then language, people and country — rather than the order of the menu.",
  },
  publicFlags: {
    title: "All reports",
    metadataTitle: `All reports — ${PRODUCT_NAME}`,
    metadataDescription:
      "Editorial transparency — browse the reports sent in by the community",
    introduction:
      "This public queue makes visible the editorial follow-up of the reports sent in by the community.",
    queueLabel: "Public queue of reports",
    filters: {
      statuses: "Statuses",
      kinds: "Report types",
      targets: "Targets",
    },
    statuses: {
      open: "Open",
      under_review: "Under review",
      accepted: "Accepted",
      rejected: "Rejected",
      withdrawn: "Withdrawn",
      duplicate: "Duplicate",
    },
    kinds: {
      inaccurate: "Inaccurate information",
      "missing-source": "Missing source",
      "broken-url": "Broken URL",
      offensive: "Offensive content",
      "correction-proposal": "Proposed correction",
      other: "Other",
    },
    targets: {
      assertion: "Assertion",
      source: "Source",
      fiche_section: "Fiche section",
      classification: "Classification",
      general: "General report",
    },
    entities: {
      people: "People",
      country: "Country",
      language: "Language",
      language_family: "Language family",
      source: "Source",
      fiche_section: "Fiche section",
      classification: "Classification",
    },
    anonymous: "anonymous",
    loading: "Loading the reports…",
    loadError: "The reports could not be loaded.",
    empty: "no report matches these filters",
    reset: "reset",
    loadingMore: "Loading…",
    retry: "Try again",
    loadMore: "Show more reports",
  },
  classification: CLASSIFICATION_LABELS.en,
  names: {
    pageTitle: "Ethnonyms",
    pageSubtitle:
      "The names under which each people of Africa is designated: those it gives itself, and those it has been given.",
    purpose:
      "A people rarely bears a single name. It has one it uses itself, others its neighbours give it, others still that a colonial administration fixed in writing — and some are pejorative. This page lists them all, so that a name heard somewhere leads to the people it designates, without deciding which one is right.",
    genealogyNote:
      "This page documents the names of peoples (ethnonyms) — endonyms, exonyms and imposed names. Looking for the origin of a family name? That is the Name dimension, which documents the naming systems of persons.",
    searchLabel: "Search a name",
    searchPlaceholder:
      "Search a name (endonym, exonym, historical spelling...)",
    searchSubmit: "Search",
    filtersLabel: "Filter by name type",
    filtersLegend:
      "An endonym is the name a people gives itself; an exonym, the one others give it; a historical spelling, a form fixed in writing at a given time; an imposed name, a designation assigned from outside.",
    filters: {
      all: "all",
      endonym: NAME_TYPE_LABELS.en.endonym,
      exonym: NAME_TYPE_LABELS.en.exonym,
      historical_spelling: NAME_TYPE_LABELS.en.historical_spelling,
      surname: NAME_TYPE_LABELS.en.surname,
      imposed: "imposed names",
    },
    activeFiltersLabel: "Active filters",
    clearFilter: "Remove the filter",
    resultCountSingular: "result",
    resultCountPlural: "results",
    range: {
      none: "No form",
      of: "of",
      formsSingular: "form",
      formsPlural: "forms",
    },
    alsoWritten: "Also written:",
    bornBy: "Borne by",
    bornByOne: "Borne by one people",
    peoplesPlural: "peoples",
    problematicLabel: "Why this name is problematic:",
    pagination: {
      label: "Nomenclature pagination",
      previous: "Previous",
      next: "Next",
      page: "Page",
    },
    emptyState: {
      spellingGuidance:
        "Check the spelling: the same name can vary with its historical spelling or its language of origin.",
      browseByTypeLabel: "Browse by name type:",
      clearFilters: "Remove the filters",
      reportMissing: "Report missing data",
    },
  },
  languages: {
    pageTitle: "Languages",
    pageSubtitle:
      "The attested languages of Africa, classified by language family. The corpus lists 748 languages for 532 distinct names — several languages share the same name (for instance “Fulfulde”, which designates both fuf and fuv), hence the family and the ISO 639-3 identifier shown on every row.",
    unavailable:
      "The corpus's languages are temporarily unavailable. Try again in a moment.",
    range: {
      none: "No language",
      of: "of",
      languagesSingular: "language",
      languagesPlural: "languages",
    },
    emptyState: "No language begins with this letter.",
    pagination: {
      label: "Languages pagination",
      previous: "Previous",
      next: "Next",
      page: "Page",
    },
  },
  patronymes: {
    eyebrow: "Name",
    nameSystemSectionTitle: "The name",
    nameSystemStatementPrefix: "Naming system:",
    nameSystemLabels: PATRONYME_VOCABULARY.en.nameSystem,
    // What the fiche rests on, said in the head rather than left to the
    // reader to count at the bottom of the dossier. The tier word itself is
    // never written here: it comes from the shared glossary, so the three
    // labels the atlas publishes cannot fork per surface.
    //
    // The machine-written share is its own clause because provenance is not
    // authority (Source Tier Policy): a fiche can cite four works, three of
    // them machine-written, and still rest on a referenced one.
    sourceStanding: {
      countOne: "1 source cited",
      countMany: "{count} sources cited",
      aiShareOne: ", one of them written by an artificial intelligence",
      aiShareMany: ", {count} of them written by an artificial intelligence",
      // Says what the atlas has not established, never why the workshop has
      // not established it yet.
      assembling:
        "This fiche is still being assembled: what it states remains to be confirmed.",
    },
    casteOrSocialFunctionLabel: "Caste or social function",
    attestedFormsTitle: "Attested spellings",
    spellingAttestedInPrefix: "attested in",
    transmissionModeLabel: "Mode of transmission",
    transmissionModeLabels: PATRONYME_VOCABULARY.en.transmissionMode,
    designatedSocialUnitLabel: "Designated social unit",
    designatedSocialUnitLabels: PATRONYME_VOCABULARY.en.designatedSocialUnit,
    totemicFoodProhibitionLabel: "Totemic food prohibition",
    permittedGivenNamesLabel: "Permitted given names",
    nisbaSubtypeLabel: "Nisba type",
    nisbaSubtypeLabels: PATRONYME_VOCABULARY.en.nisbaSubtype,
    originTitle: "Origin",
    originOralTraditionsLabel: "Griot oral tradition",
    originWrittenChroniclesLabel: "Written chronicle",
    originLinguisticReconstructionsLabel: "Linguistic reconstruction",
    originClaimStatusLabels: PATRONYME_VOCABULARY.en.originClaimStatus,
    griotOriginNote:
      "This origin is transmitted by griot oral tradition. It is presented as transcribed, with its source and, where documented, the griot who transmitted it.",
    griotAttributionPrefix: "Transmitted by",
    sourcesTitle: "Sources",
    alliancesTitle: "Alliances",
    alliancesNote:
      "Pacts linking this name to other names: a joking relationship in which the bearers of both names owe one another ritual mockery and assistance, and which forbids conflict between them. Each pact keeps the term used by its sources.",
    allianceTermGlosses: {
      sanankuya: "Mande joking relationship",
    },
    allianceTypeFallback: "Documented alliance",
    homonymsTitle: "Homonyms",
    homonymsNote:
      "What the same sequence of letters designates elsewhere — a people, a place or another name — without a demonstrated link to this one. The list prevents a resemblance in form from being read as descent.",
    associationsTitle: "Peoples and countries concerned",
    associatedPeoplesLabel: "Peoples",
    associatedCountriesLabel: "Countries",
    nonHereditaryGuidance:
      "This patronym is not transmitted by heredity: it does not read as a family name in the European sense. Its reach varies by region — the peoples and countries below indicate where this mode of naming is documented.",
    bearersTitle: "Bearers",
    bearersEditorialNote:
      "Only public or historical figures appear here, along with persons who have recognised themselves in this name. The list documents the name: it allows no inference about the ethnic origin of anyone who bears it.",
    roleCategoryFallback: "Role not recorded",
    onFiche: {
      peopleTitle: "Names borne",
      peopleEmpty:
        "The corpus does not yet attach any name to this people. The names dimension has just opened and covers only a small part of the atlas.",
      peopleUnavailable:
        "The names borne could not be loaded. The problem is on our side, not an empty corpus.",
      countryTitle: "Attested names",
      countryNote:
        "Two distinct registers: what a source attests in this country, and what the peoples who live there bear.",
      attestedLabel: "Attested in the country",
      reachLabel: "Borne by the country's peoples, with no attestation here",
      reachViaPrefix: "via",
      countryEmpty:
        "The corpus does not yet attest any name in this country, and none of the peoples who live there bears a documented one.",
      countryUnavailable:
        "The names could not be loaded. The problem is on our side, not an empty corpus.",
    },
    index: {
      pageTitle: "Names",
      pageSubtitle:
        "The naming systems of persons documented in the corpus — clan names, non-hereditary patronymics, nisba and praise names.",
      unavailable:
        "The names could not be loaded. The problem is on our side, not an empty corpus.",
      countSingular: "name",
      countPlural: "names",
      emptyState: "No name is documented yet.",
      pagination: {
        label: "Names pagination",
        previous: "Previous",
        next: "Next",
        page: "Page",
      },
    },
  },
  migrations: {
    navLabel: "Migrations",
    pageTitle: "Timeline of migrations",
    pageSubtitle:
      "The chronological account of every migration, settlement and trade route documented in the atlas.",
    tabs: {
      map: "Map",
      narrative: "Narrative",
    },
    mapPlaceholder:
      "The interactive map of migrations arrives with Story 12.9.",
    debateLabel: "Historiographical debate",
    peoplesLabel: "Peoples concerned",
    sourcesCountSingular: "source",
    sourcesCountPlural: "sources",
    filterChip: {
      label: "Filtered on",
      clear: "Remove the filter",
    },
    emptyState: "No migration matches this filter.",
    states: {
      failure:
        "The migrations could not be loaded. The problem is on our side, not a filter.",
      failureRetry: "Try again",
      emptyUnpublished: "No migration is published yet.",
      filteredEmpty: "No migration matches this filter",
    },
  },
  colonization: {
    navLabel: "Colonisation & resistances",
    pageTitle: "Colonisation & resistances",
    pageSubtitle:
      "Fragmentations, inherited borders, imposed names, displacements and resistances, documented people by people.",
    fragmentation: {
      title: "Peoples fragmented by colonial borders",
    },
    sources: {
      title: "Sources",
      linkLabel: "see the sources",
    },
    timeline: {
      title: "Chronology",
      eventTypeLabels: COLONIAL_EVENT_TYPE_LABELS.en,
      filterLegend: "Filter by event type",
      openEventSuffix: "Enter to open",
      closeEventCard: "Close",
      peoplesJoiner: "and",
      table: {
        caption: "Chronology of colonial events",
        date: "Date",
        type: "Type",
        people: "People",
        place: "Place",
        source: "Source",
        placeUndocumented: "Undocumented",
        sourceUndocumented: "No source cited",
      },
      emptyState:
        "No colonisation or resistance event is documented for the moment.",
    },
  },
  quiz: {
    navLabel: "Quiz",
    pageTitle: "What do you want to play on?",
    pageSubtitle:
      "A country, a family of languages, a topic — or the whole continent. Eight questions each time.",
    scopeThemeHeading: "A topic",
    scopeCountryHeading: "A country",
    scopeFamilyHeading: "A family of languages",
    scopeCountryHint: "Tap a country: the topics it can fill unfold.",
    scopeThemePanelHint: "Choose a topic, or play the whole country.",
    scopeThemePanelNoTheme: "Play without a theme",
    scopeMixedHint:
      "Eight questions drawn from the whole corpus, from the best-known peoples to the least documented.",
    scopeRandomHint: "Eight questions at random, in no order of difficulty.",
    leaveSession: "Leave the quiz",
    seeScoreCard: "See the score card",
    comingSoon:
      "the questions for this selection are on their way — the corresponding fiches are being verified",
    validate: "Confirm",
    questionProgressPrefix: "question",
    questionProgressSeparator: "of",
    correctVerdict: "Correct!",
    incorrectVerdict: "Not quite",
    correctAnswerLabel: "Answer: ",
    openSourceChain: "Open the chain of sources",
    nextQuestion: "Next question",
    seeScore: "See the score",
    loadingSession: "Loading the session…",
    emptySession: "No question is available on this topic — try again later.",
    backToPicker: "Choose something else",
    sessionError: "This session could not be loaded — try again in a moment.",
    scoreHeading: "Score",
    scoreFractionSeparator: "correct answers out of",
    playAgain: "Play again",
    scoreCardExactAnswersSeparator: "exact answers out of",
    fichesEncounteredLabel: "Fiches encountered",
    shareScoreLabel: "Share the score",
    copiedFeedback: "copied",
    ogSourcedLine: "every answer is sourced",
  },
  fieldProvenance: {
    missingLabel: "Missing data",
    missingReason: "The corpus does not record this field for this fiche.",
    derivedLabel: "Derived value",
    derivedFromPrefix: "Derived from: ",
  },
  hubs: {
    atlas: {
      title: TRAIL_PAGE_LABELS.en.atlasHub,
      pageTitle: "Explore the peoples of Africa",
      blurb:
        "The fiche axis: language families, languages, peoples, countries, ethnonyms and names, each under its own.",
      menuBlurb:
        "The fiches of families, languages, peoples, countries, ethnonyms and names, plus the search.",
      hubEntryName: "The exploration hub",
    },
    dossiers: {
      title: TRAIL_PAGE_LABELS.en.dossiersHub,
      pageTitle: "Understand the peoples of Africa",
      blurb:
        "The relations axis: where a name comes from, where the peoples passed, and which sources the atlas rests on.",
      menuBlurb:
        "Who gave these names, sourced anecdotes, the migrations and colonisation.",
      hubEntryName: "The reading hub",
    },
    jeux: {
      title: TRAIL_PAGE_LABELS.en.jeuxHub,
      pageTitle: "Play with the peoples of Africa",
      blurb:
        "The testing axis: games and quizzes drawn from the fiches, each answer leading back to its own.",
      menuBlurb:
        "A quiz drawn from the fiches, and a game on the true size of countries.",
      hubEntryName: "The games hub",
    },
    unavailableLabel: "Coming soon",
    menuLabel: "Three paths",
    facetsLabel: "Its facets",
  },
  trail: {
    pages: TRAIL_PAGE_LABELS.en,
    home: "Home",
    // Keyed by the English URL tails (DEC-049): `deriveTrail` looks a
    // segment up by the word in the address, so an English trail can only
    // name what this map spells the English way. The French map below is
    // keyed by the French tails, and the two key sets differ on purpose.
    segments: {
      links: "Links",
      score: "Score",
      accessibility: "Accessibility",
      admin: "Administration",
      connexion: "Sign in",
      contact: "Contact",
      contribute: "Contribute",
      "legal-notice": "Legal notice",
      sitemap: "Sitemap",
      "data-policy": "Data policy",
      "report-error": "Report an error",
      reports: "Reports",
      peoples: "Peoples",
      countries: "Countries",
      families: "Families",
      "the-people": "The people",
      "the-country": "The country",
      "the-person": "The person",
      "the-language": "The language",
      "the-thing": "The thing",
    } as Record<string, string>,
    backTo: "Back to",
  },
};

/**
 * The shape both locales share. Not exported: consumers take it from
 * `getTranslation`, and the parity is enforced here by the `fr` declaration.
 */
type UiDictionary = typeof en;

const fr: UiDictionary = {
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
      // Kept for `NameTypeBadge`, which labels a record of that type. The
      // filter chip it once fed is now rendered only when the corpus holds
      // such a record, and it holds none — see migration 071.
      surname: NAME_TYPE_LABELS.fr.surname,
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
    sourceStanding: {
      countOne: "1 source citée",
      countMany: "{count} sources citées",
      aiShareOne: ", dont une rédigée par une intelligence artificielle",
      aiShareMany: ", dont {count} rédigées par une intelligence artificielle",
      // Says what the atlas has not established, never why the workshop has
      // not established it yet.
      assembling:
        "Cette fiche est en cours de constitution : ce qu'elle avance reste à confirmer.",
    },
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
    alliancesNote:
      "Les pactes qui lient ce nom à d'autres noms : une parenté à plaisanterie, où les porteurs des deux noms se doivent moquerie rituelle et assistance, et qui interdit le conflit entre eux. Chaque pacte est désigné par le terme que les sources emploient.",
    allianceTermGlosses: {
      sanankuya: "parenté à plaisanterie mandingue",
    },
    allianceTypeFallback: "Alliance documentée",
    homonymsTitle: "Homonymes",
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
    pages: TRAIL_PAGE_LABELS.fr,
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
      contact: "Contact",
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
};

/**
 * Typed `Record<Language, …>` on purpose: with `noImplicitAny: false`, an
 * untyped literal let `translations["en"]` compile and return `undefined`,
 * which is how the header would have thrown on `/en` under a green build.
 */
// @req REQ-014
export const translations: Record<Language, UiDictionary> = { en, fr };

// @req REQ-014
export const getTranslation = (lang: Language): UiDictionary =>
  translations[lang];

/**
 * Localized labels and tooltips for the `classification_status` enum.
 * Used by the ClassificationBadge component (ETNI-178).
 */
// @req REQ-023
export const classificationLabels = translations.fr.classification;
