import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";
import type { PageType } from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * How a trail names each page of the site, per locale.
 *
 * Typed against `PageType` rather than left open, because the trail's rule is
 * that it never prints a segment it cannot name: a page type with no label
 * here would be a page whose trail silently truncates to nothing. The
 * compiler refusing an incomplete record is what turns that into a build
 * error instead of a missing crumb.
 *
 * Exported for the hubs dictionary, whose English titles are these labels.
 */
// @req REQ-145
export const TRAIL_PAGE_LABELS: Record<Language, Record<PageType, string>> = {
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
    dossierKongo: "The Kongo kingdom",
    dossierLuba: "Luba: power and memory",
    dossierLunda: "Lunda: alliances and connections",
    dossierSpiritualitesKongo: "Kongo spiritualities: objects and change",
    glossary: "Glossary",
    // The English hub labels live in the dictionary rather than on
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
    dossierProportions: "Proportions",
    dossierPopulations: "Populations",
    dossierRessources: "Ressources",
    dossierKongo: "Le royaume Kongo",
    dossierLuba: "Luba : pouvoir et mémoire",
    dossierLunda: "Lunda : alliances et circulations",
    dossierSpiritualitesKongo:
      "Spiritualités kongo : objets et transformations",
    glossary: "Glossaire",
    atlasHub: ACCESS_MODE_LABELS.atlas,
    dossiersHub: ACCESS_MODE_LABELS.dossiers,
    jeuxHub: ACCESS_MODE_LABELS.jeux,
  },
};

const en = {
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
};

type TrailCopy = typeof en;

const fr: TrailCopy = {
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
};

// @req REQ-145
export const trailCopy: Record<Language, TrailCopy> = { en, fr };
