import type { Language } from "@/types/shared";
import { getLocalizedRoute, type PageType } from "@/lib/routing";

export type ModuleCategory = "explorer" | "comprendre" | "jouer";
export type ModuleState = "live" | "soon";
export type ModuleAccent = "ocre" | "teal" | "terre" | "perv";

export interface HomeModule {
  id: string;
  title: string;
  category: ModuleCategory;
  accent: ModuleAccent;
  illustration: string;
  state: ModuleState;
  href: string | null;
}

interface ModuleDefinition {
  id: string;
  title: string;
  category: ModuleCategory;
  accent: ModuleAccent;
  illustration: string;
  page: PageType | null;
}

// The ten module entries driving the light-home filterable grid (14.7,
// FR92). Five reuse the demo pill concepts dropped from the night hero
// (arbre → familles, noms, liens, frise, comparer); a module is `live`
// only once `page` resolves to a real localized route — otherwise it
// renders as «Bientôt» (soon).
const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: "peuples",
    title: "Les peuples d'Afrique",
    category: "explorer",
    accent: "ocre",
    illustration: "users",
    page: "peoples",
  },
  {
    id: "pays",
    title: "Les pays d'Afrique",
    category: "explorer",
    accent: "teal",
    illustration: "globe",
    page: "countries",
  },
  {
    id: "familles",
    title: "L'arbre des familles",
    category: "explorer",
    accent: "terre",
    illustration: "network",
    page: "families",
  },
  {
    id: "recherche",
    title: "Recherche libre",
    category: "explorer",
    accent: "perv",
    illustration: "search",
    page: "search",
  },
  {
    id: "noms",
    title: "D'où vient un nom ?",
    category: "explorer",
    accent: "ocre",
    illustration: "tag",
    page: "names",
  },
  {
    id: "doctrine",
    title: "La doctrine éditoriale",
    category: "comprendre",
    accent: "teal",
    illustration: "book-open",
    page: "doctrine",
  },
  {
    id: "about",
    title: "À propos du projet",
    category: "comprendre",
    accent: "terre",
    illustration: "info",
    page: "about",
  },
  {
    id: "frise",
    title: "3 000 ans de migrations",
    category: "comprendre",
    accent: "perv",
    illustration: "history",
    page: null,
  },
  {
    id: "liens",
    title: "Les liens invisibles",
    category: "jouer",
    accent: "ocre",
    illustration: "link-2",
    page: null,
  },
  {
    id: "comparer",
    title: "Comparer deux peuples",
    category: "jouer",
    accent: "teal",
    illustration: "git-compare",
    page: null,
  },
];

export const isModuleLive = (page: PageType | null): boolean => page !== null;

export const getHomeModules = (language: Language): HomeModule[] =>
  MODULE_DEFINITIONS.map((def) => ({
    id: def.id,
    title: def.title,
    category: def.category,
    accent: def.accent,
    illustration: def.illustration,
    state: isModuleLive(def.page) ? "live" : "soon",
    href: def.page ? getLocalizedRoute(language, def.page) : null,
  }));

export const getModuleCategories = (): ModuleCategory[] =>
  Array.from(new Set(MODULE_DEFINITIONS.map((def) => def.category)));
