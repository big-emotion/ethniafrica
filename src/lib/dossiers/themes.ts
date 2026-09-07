import type { Language } from "@/types/shared";
import { getLocalizedRoute } from "@/lib/routing";

/** Stable editorial themes; reading formats and atlas entities are separate. */
// @req REQ-114
export const DOSSIER_THEMES = [
  {
    id: "pouvoirs",
    label: "Pouvoirs et territoires",
    description:
      "Royaumes, chefferies, institutions, frontières et résistances.",
  },
  {
    id: "migrations",
    label: "Migrations et diasporas",
    description: "Déplacements, installations et histoires des diasporas.",
  },
  {
    id: "spiritualites",
    label: "Spiritualités et croyances",
    description: "Divinités, esprits, rites et transformations des croyances.",
  },
  {
    id: "parentes",
    label: "Parentés et sociétés",
    description: "Clans, lignages, alliances et institutions sociales.",
  },
  {
    id: "langues",
    label: "Langues et transmission",
    description:
      "Langues, écritures, oralité et transmission entre générations.",
  },
  {
    id: "noms",
    label: "Noms et identités",
    description:
      "Appellations, noms de personnes et histoires de la nomination.",
  },
  {
    id: "arts",
    label: "Arts et savoirs",
    description: "Objets, textiles, musiques et savoir-faire transmis.",
  },
  {
    id: "economies",
    label: "Économies et échanges",
    description: "Modes de subsistance, marchés et réseaux commerciaux.",
  },
] as const;

export type DossierThemeId = (typeof DOSSIER_THEMES)[number]["id"];

// @req REQ-114
export function getDossierThemeHref(
  theme: string,
  language: Language = "fr"
): string {
  return `${getLocalizedRoute(language, "dossiersHub")}/themes/${encodeURIComponent(theme)}`;
}

const ENGLISH_THEMES: Record<
  DossierThemeId,
  { label: string; description: string }
> = {
  pouvoirs: {
    label: "Power and territories",
    description: "Kingdoms, chiefdoms, institutions, borders and resistance.",
  },
  migrations: {
    label: "Migrations and diasporas",
    description: "Movements, settlements and histories of diasporas.",
  },
  spiritualites: {
    label: "Spiritualities and beliefs",
    description: "Divinities, spirits, rites and changing beliefs.",
  },
  parentes: {
    label: "Kinship and societies",
    description: "Clans, lineages, alliances and social institutions.",
  },
  langues: {
    label: "Languages and transmission",
    description:
      "Languages, scripts, oral traditions and transmission between generations.",
  },
  noms: {
    label: "Names and identities",
    description: "Appellations, personal names and histories of naming.",
  },
  arts: {
    label: "Arts and knowledge",
    description: "Objects, textiles, music and inherited skills.",
  },
  economies: {
    label: "Economies and exchange",
    description: "Livelihoods, markets and trading networks.",
  },
};

// @req REQ-140
export function getDossierThemes(language: Language = "fr") {
  return DOSSIER_THEMES.map((theme) => ({
    ...theme,
    ...(language === "en" ? ENGLISH_THEMES[theme.id] : {}),
  }));
}
