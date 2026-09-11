import type { Language } from "@/types/shared";

const en = {
  pageTitle: "Languages",
  pageSubtitle:
    "The attested languages of Africa, classified by language family. The atlas lists 748 languages for 532 distinct names — several languages share the same name (for instance “Fulfulde”, which designates both fuf and fuv), hence the family and the ISO 639-3 identifier shown on every row.",
  unavailable:
    "The atlas's languages are temporarily unavailable. Try again in a moment.",
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
};

type LanguagesCopy = typeof en;

// Languages index (ETNI-1802/REQ-139). 748 languages for 532 distinct
// names — e.g. "Fulfulde" names both fuf and fuv — so the copy itself
// flags why every row needs a family + id, not just the name.
const fr: LanguagesCopy = {
  pageTitle: "Langues",
  pageSubtitle:
    "Les langues attestées d'Afrique, classées par famille linguistique. L’atlas recense 748 langues pour 532 noms distincts — plusieurs langues partagent un même nom (par exemple « Fulfulde », qui désigne à la fois le fuf et le fuv), d'où la famille et l'identifiant ISO 639-3 affichés sur chaque ligne.",
  unavailable:
    "Les langues de l’atlas sont momentanément indisponibles. Réessayez dans un instant.",
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
};

// @req REQ-145
export const languagesCopy: Record<Language, LanguagesCopy> = { en, fr };
