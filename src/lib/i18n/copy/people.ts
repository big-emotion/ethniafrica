import type { Language } from "@/types/shared";

const en = {
  sections: {
    naming: "The name borne, the names imposed",
    mapGrammar: "Why the map draws no boundary",
    mapDerivation: "Derived from the distribution by country",
    origins: "Origins and formation",
    language: "Language",
    historicalAffiliation: "Historical affiliation",
    historicalRole: "Historical role",
    culture: "Culture and spirituality",
    neighbours: "Neighbouring peoples and organisation",
    distribution: "Geographic distribution",
    referenceYear: "Reference year: 2025",
    fragmentation: "Colonial fragmentation",
    fragmentationNote:
      "Derived from the people's presence in several countries",
    sources: "Sources",
  },
  reportSection: "Report this section",
  naming: {
    selfDesignation: "Self-designation",
    exonyms: "Exonyms",
    origin: "Where these names come from.",
    problematic: "Why these names are problematic.",
    contemporary: "Usage today.",
    sectionTitle: "Names and designations",
    pronunciation: (ipa: string) => `Phonetic pronunciation: ${ipa}`,
    collapse: "Show less",
    more: (count: number) => `+${count} more`,
  },
  field: {
    explanation: (count: number) =>
      `On a country fiche, the line closes because an administrative boundary is published and dated. Nothing comparable exists here: no corpus source states where this people's presence ends. What the corpus declares is ${count} populations by country. The map follows exactly that — one halo per country, whose area follows the population and whose border is zero. A closed outline would assert an inside and an outside that nobody can source.`,
    legend: "Decreasing density, no border",
    offMapOne:
      "One declared presence is outside the map, as the atlas covers only Africa:",
    offMapMany: (count: number) =>
      `${count} declared presences are outside the map, as the atlas covers only Africa:`,
  },
  originFields: {
    ancientOrigins: "Ancient origins",
    formationPeriod: "Formation period",
    migrationRoutes: "Migration routes",
    settlementZones: "Settlement areas",
    unifications: "Unifications and divisions",
    externalInfluences: "External influences",
    majorEvents: "Major events",
  },
  languageFields: {
    family: "Language family",
    main: "Main language",
    iso: "ISO codes",
    dialects: "Dialects",
    vehicularRole: "Vehicular role",
  },
  historyFields: {
    kingdoms: "Kingdoms and chiefdoms",
    neighbours: "Relations with neighbours",
    conflicts: "Conflicts and alliances",
    diaspora: "Diaspora",
  },
  cultureFields: {
    majorRites: "Major rites",
    symbols: "Symbols",
    artsAndMusic: "Arts and music",
    spiritualities: "Spiritualities",
  },
  relatedFields: {
    links: "Links",
    seeAll: "See all links",
    associatedGroups: "Associated groups",
    politicalSystem: "Traditional political system",
    clanOrganisation: "Clan organisation",
    ageGrades: "Age grades",
    lineages: "Role of lineages",
    religiousAuthority: "Religious authority",
  },
  external: {
    title: "External identifiers",
    description:
      "The corresponding records in the external registries referenced by this fiche.",
  },
  countries: {
    offMap: "outside the map",
    source: "Source",
    sourceMissing: "Source not recorded",
    reference: "ref.",
  },
  oral: {
    title: "Voices and accounts",
    description:
      "Attributed accounts, presented without confusing them with established historical facts.",
    attributed: (name: string) => `Account attributed to ${name}.`,
    anonymous: "Account attributed to a person who chose to remain anonymous.",
    linkedVariant: "Linked variant",
  },
  media: {
    title: "Media credits",
    description:
      "Author, licence and source page for each image or video attached to this fiche.",
    unknownAuthor: "Unknown author",
    licence: "Licence",
    sourcePage: "Source page",
  },
  ficheHead: {
    people: "people",
    reference: "ref.",
    presenceCountries: (count: number) =>
      `${count} ${count === 1 ? "country" : "countries"} of presence`,
    sourceAria: (name: string) => `for the ${name} fiche`,
  },
  presenceFacts: {
    description: (id: string) =>
      `${id} · declared presence, with no boundary line`,
    declaredPopulation: "Declared population",
    share: "Share of the whole people",
    haloTitle: "What the halo means",
    haloBody:
      "The radius follows the square root of the population, so the area follows the population. The border is zero: there is no boundary to read.",
    reference: "Ref.",
    readFull: "Read the full fiche",
  },
  atlas: {
    missingDistribution: (name: string) =>
      `Country distribution is not recorded for ${name}`,
    wholeArea: "Whole area",
    areaNoun: "this people's presence",
    noBoundary: "No boundary here.",
    presenceAndDensity: "A presence, and its density.",
  },
};

type PeopleCopy = typeof en;

const fr: PeopleCopy = {
  sections: {
    naming: "Le nom porté, les noms subis",
    mapGrammar: "Pourquoi la carte ne trace pas de frontière",
    mapDerivation: "Dérivé de la répartition par pays",
    origins: "Origines & formation",
    language: "Langue",
    historicalAffiliation: "Filiation historique",
    historicalRole: "Rôle historique",
    culture: "Culture & spiritualité",
    neighbours: "Peuples voisins & organisation",
    distribution: "Répartition géographique",
    referenceYear: "Année de référence : 2025",
    fragmentation: "Fragmentation coloniale",
    fragmentationNote: "Dérivé de la présence du peuple dans plusieurs pays",
    sources: "Sources",
  },
  reportSection: "Signaler cette section",
  naming: {
    selfDesignation: "Auto-appellation",
    exonyms: "Exonymes",
    origin: "D'où viennent ces noms.",
    problematic: "Pourquoi ces noms posent problème.",
    contemporary: "L'usage aujourd'hui.",
    sectionTitle: "Noms & appellations",
    pronunciation: (ipa) => `Prononciation phonétique : ${ipa}`,
    collapse: "Réduire",
    more: (count) => `+${count} autres`,
  },
  field: {
    explanation: (count) =>
      `Sur la fiche d'un pays, le trait se referme parce qu'une frontière administrative est publiée et datée. Ici, rien de tel n'existe : aucune source du corpus ne dit où la présence de ce peuple s'arrête. Ce que le corpus déclare, ce sont ${count} populations par pays. La carte s'en tient exactement à cela — un halo par pays, dont l'aire suit la population et dont le bord vaut zéro. Un tracé fermé aurait affirmé un dedans et un dehors que personne ne peut sourcer.`,
    legend: "Densité décroissante, bord nul",
    offMapOne:
      "Une présence déclarée est hors carte, l'atlas ne couvrant que l'Afrique :",
    offMapMany: (count) =>
      `${count} présences déclarées sont hors carte, l'atlas ne couvrant que l'Afrique :`,
  },
  originFields: {
    ancientOrigins: "Origines anciennes",
    formationPeriod: "Période de formation",
    migrationRoutes: "Routes migratoires",
    settlementZones: "Zones de peuplement",
    unifications: "Unifications & divisions",
    externalInfluences: "Influences extérieures",
    majorEvents: "Événements majeurs",
  },
  languageFields: {
    family: "Famille linguistique",
    main: "Langue principale",
    iso: "Codes ISO",
    dialects: "Dialectes",
    vehicularRole: "Rôle véhiculaire",
  },
  historyFields: {
    kingdoms: "Royaumes & chefferies",
    neighbours: "Relations avec les voisins",
    conflicts: "Conflits & alliances",
    diaspora: "Diaspora",
  },
  cultureFields: {
    majorRites: "Rites majeurs",
    symbols: "Symboles",
    artsAndMusic: "Arts & musique",
    spiritualities: "Spiritualités",
  },
  relatedFields: {
    links: "Liens",
    seeAll: "Voir tous les liens",
    associatedGroups: "Groupes associés",
    politicalSystem: "Système politique traditionnel",
    clanOrganisation: "Organisation clanique",
    ageGrades: "Grades d'âge",
    lineages: "Rôle des lignages",
    religiousAuthority: "Autorité religieuse",
  },
  external: {
    title: "Identifiants externes",
    description:
      "Les fiches correspondantes dans les registres externes référencés par cette fiche.",
  },
  countries: {
    offMap: "hors carte",
    source: "Source",
    sourceMissing: "Source non renseignée",
    reference: "réf.",
  },
  oral: {
    title: "Voix & récits",
    description:
      "Des récits attribués, présentés sans les confondre avec des faits historiques établis.",
    attributed: (name) => `Récit attribué à ${name}.`,
    anonymous: "Récit attribué à une personne ayant choisi de rester anonyme.",
    linkedVariant: "Variante liée",
  },
  media: {
    title: "Crédits médias",
    description:
      "Auteur, licence et page d'origine de chaque image ou vidéo attachée à cette fiche.",
    unknownAuthor: "Auteur inconnu",
    licence: "Licence",
    sourcePage: "Page source",
  },
  ficheHead: {
    people: "personnes",
    reference: "réf.",
    presenceCountries: (count) => `${count} pays de présence`,
    sourceAria: (name) => `pour la fiche ${name}`,
  },
  presenceFacts: {
    description: (id) => `${id} · présence déclarée, sans tracé de limite`,
    declaredPopulation: "Population déclarée",
    share: "Part de l'ensemble du peuple",
    haloTitle: "Ce que le halo dit",
    haloBody:
      "Le rayon suit la racine de la population, donc l'aire suit la population. Le bord vaut zéro : il n'y a pas de limite à lire.",
    reference: "Réf.",
    readFull: "Lire la fiche complète",
  },
  atlas: {
    missingDistribution: (name) =>
      `Répartition par pays non renseignée pour ${name}`,
    wholeArea: "Toute l'aire",
    areaNoun: "présence",
    noBoundary: "Aucune frontière ici.",
    presenceAndDensity: "Une présence, et sa densité.",
  },
};

// @req REQ-145
export const peopleCopy: Record<Language, PeopleCopy> = { en, fr };
