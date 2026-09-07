import { NAME_TYPE_LABELS } from "@/lib/glossaire/vocabularies";
import type { Language } from "@/types/shared";

/**
 * The ethnonym index — how a *people* is called. Distinct from
 * `patronymes.ts`, which covers the naming system a *person* is named under.
 */
const en = {
  pageTitle: "Ethnonyms",
  pageSubtitle:
    "The names under which each people of Africa is designated: those it gives itself, and those it has been given.",
  purpose:
    "A people rarely bears a single name. It has one it uses itself, others its neighbours give it, others still that a colonial administration fixed in writing — and some are pejorative. This page lists them all, so that a name heard somewhere leads to the people it designates, without deciding which one is right.",
  genealogyNote:
    "This page documents the names of peoples (ethnonyms) — endonyms, exonyms and imposed names. Looking for the origin of a family name? That is the Name dimension, which documents the naming systems of persons.",
  searchLabel: "Search a name",
  searchPlaceholder: "Search a name (endonym, exonym, historical spelling...)",
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
};

type NamesCopy = typeof en;

const fr: NamesCopy = {
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
};

// @req REQ-145
export const namesCopy: Record<Language, NamesCopy> = { en, fr };
