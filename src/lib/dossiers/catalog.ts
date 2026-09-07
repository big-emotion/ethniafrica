import type { Language } from "@/types/shared";
import { MODULE_DEFINITIONS } from "@/lib/hubs/moduleRegistry";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import {
  isModuleOffered,
  type ModuleAvailabilityMap,
} from "@/lib/hubs/moduleOffer";
import { getDossierThemes, type DossierThemeId } from "@/lib/dossiers/themes";

interface Classification {
  id: string;
  primaryTheme: DossierThemeId;
  secondaryThemes: DossierThemeId[];
  format: "dossier" | "anecdote";
  summary: string;
}

// Publication readiness and canonical routes remain owned by moduleRegistry.
const CLASSIFICATIONS: Classification[] = [
  {
    id: "dossier-kongo",
    primaryTheme: "pouvoirs",
    secondaryThemes: ["spiritualites"],
    format: "dossier",
    summary:
      "Une capitale, des réseaux politiques et des transformations historiques.",
  },
  {
    id: "dossier-luba",
    primaryTheme: "pouvoirs",
    secondaryThemes: ["arts", "langues"],
    format: "dossier",
    summary: "Institutions, alliances et transmission de la mémoire politique.",
  },
  {
    id: "dossier-lunda",
    primaryTheme: "pouvoirs",
    secondaryThemes: ["parentes", "economies"],
    format: "dossier",
    summary:
      "Récits d’origine, alliances et recompositions des réseaux de pouvoir.",
  },
  {
    id: "dossier-spiritualites-kongo",
    primaryTheme: "spiritualites",
    secondaryThemes: ["arts"],
    format: "dossier",
    summary: "Minkisi, christianismes kongo et transformations des pratiques.",
  },

  {
    id: "dossier-proportions",
    primaryTheme: "pouvoirs",
    secondaryThemes: [],
    format: "dossier",
    summary:
      "Cartes, superficies et représentations des territoires africains.",
  },
  {
    id: "dossier-populations",
    primaryTheme: "parentes",
    secondaryThemes: ["migrations"],
    format: "dossier",
    summary: "Populations, dynamiques démographiques et sociétés africaines.",
  },
  {
    id: "dossier-ressources",
    primaryTheme: "economies",
    secondaryThemes: [],
    format: "dossier",
    summary: "Ressources naturelles, extraction et échanges économiques.",
  },
  {
    id: "nommer",
    primaryTheme: "noms",
    secondaryThemes: ["langues", "arts"],
    format: "dossier",
    summary:
      "Nommer un peuple, un pays, une personne, une langue ou une chose : qui donne le nom, et ce qu'il raconte.",
  },
  {
    id: "anecdotes",
    primaryTheme: "noms",
    secondaryThemes: [],
    format: "anecdote",
    summary: "Des histoires courtes et sourcées autour des noms d'Afrique.",
  },
  {
    id: "frise",
    primaryTheme: "migrations",
    secondaryThemes: [],
    format: "dossier",
    summary:
      "Premiers événements sourcés pour comprendre les déplacements des peuples.",
  },
  {
    id: "regards-colonisation",
    primaryTheme: "pouvoirs",
    secondaryThemes: ["noms"],
    format: "dossier",
    summary: "Frontières, noms imposés et résistances à la colonisation.",
  },
];

const ENGLISH_COPY: Record<string, { title: string; summary: string }> = {
  "dossier-kongo": {
    title: "The Kongo kingdom",
    summary: "A capital, political networks and historical change.",
  },
  "dossier-luba": {
    title: "Luba: power and memory",
    summary:
      "Institutions, alliances and the transmission of political memory.",
  },
  "dossier-lunda": {
    title: "Lunda: alliances and connections",
    summary: "Origin narratives, alliances and changing networks of power.",
  },
  "dossier-spiritualites-kongo": {
    title: "Kongo spiritualities: objects and change",
    summary: "Minkisi, Kongo Christianities and changing practices.",
  },

  nommer: {
    title: "Who gave this name?",
    summary:
      "Naming a people, a country, a person, a language or a thing: who gives the name, and what it tells us.",
  },
  anecdotes: {
    title: "Anecdotes",
    summary: "Short, sourced stories about names in Africa.",
  },
  frise: {
    title: "First migration landmarks",
    summary: "Sourced events for understanding the movements of peoples.",
  },
  "regards-colonisation": {
    title: "Colonisation and resistance",
    summary: "Borders, imposed names and resistance to colonisation.",
  },
  "dossier-proportions": {
    title: "The true proportions",
    summary: "Maps, areas and representations of African territories.",
  },
  "dossier-populations": {
    title: "The real weight",
    summary: "Populations, demographic change and African societies.",
  },
  "dossier-ressources": {
    title: "A geological scandal",
    summary: "Natural resources, extraction and economic exchange.",
  },
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr");

// @req REQ-114
export function getDossiers(
  filters: {
    theme?: string;
    language?: Language;
    query?: string;
    format?: Classification["format"];
  } = {},
  availability?: ModuleAvailabilityMap | null
) {
  const query = normalize(filters.query?.trim() ?? "");
  return CLASSIFICATIONS.flatMap((entry) => {
    const definition = MODULE_DEFINITIONS.find(
      (candidate) => candidate.id === entry.id
    );
    if (!definition || !isModuleOffered(definition, availability)) return [];
    const href = getModuleHref(definition, filters.language ?? "fr");
    if (!href) return [];
    if (entry.format !== (filters.format ?? "dossier")) return [];
    if (
      filters.theme &&
      entry.primaryTheme !== filters.theme &&
      !entry.secondaryThemes.some((theme) => theme === filters.theme)
    )
      return [];
    const copy =
      filters.language === "en"
        ? ENGLISH_COPY[entry.id]
        : { title: definition.name, summary: entry.summary };
    if (query && !normalize(`${copy.title} ${copy.summary}`).includes(query))
      return [];
    return [{ ...entry, ...copy, href }];
  });
}

// @req REQ-114
export function getPublishedThemes(
  availability?: ModuleAvailabilityMap | null,
  language: Language = "fr"
) {
  return getDossierThemes(language).filter(
    (theme) => getDossiers({ theme: theme.id }, availability).length > 0
  );
}

export interface FicheDossierContext {
  kind: "country" | "people" | "family" | "language" | "appellation" | "name";
  id: string;
  section: string;
}

// These are explanatory links shared by a fiche kind, not historical claims
// about every member. Instance-specific associations can additionally set id.
const FICHE_ASSOCIATIONS: Array<
  Omit<FicheDossierContext, "id"> & {
    id?: string;
    dossierId: string;
  }
> = [
  {
    kind: "country",
    id: "COG",
    section: "kingdom:Royaume Kongo",
    dossierId: "dossier-kongo",
  },
  {
    kind: "country",
    id: "AGO",
    section: "kingdom:Empire Lunda",
    dossierId: "dossier-lunda",
  },
  {
    kind: "country",
    id: "ZMB",
    section: "kingdom:Empire Lunda",
    dossierId: "dossier-lunda",
  },
  {
    kind: "country",
    id: "COD",
    section: "kingdom:Royaume Kongo",
    dossierId: "dossier-kongo",
  },
  {
    kind: "country",
    id: "AGO",
    section: "kingdom:Royaume Kongo",
    dossierId: "dossier-kongo",
  },
  {
    kind: "country",
    id: "COD",
    section: "kingdom:Empire Luba",
    dossierId: "dossier-luba",
  },
  {
    kind: "country",
    id: "COD",
    section: "kingdom:Empire Lunda",
    dossierId: "dossier-lunda",
  },
  {
    kind: "people",
    id: "PPL_KONGO",
    section: "history",
    dossierId: "dossier-kongo",
  },
  {
    kind: "people",
    id: "PPL_LUBA",
    section: "history",
    dossierId: "dossier-luba",
  },
  {
    kind: "people",
    id: "PPL_LUNDA",
    section: "history",
    dossierId: "dossier-lunda",
  },
  {
    kind: "people",
    id: "PPL_KONGO",
    section: "culture",
    dossierId: "dossier-spiritualites-kongo",
  },
  {
    kind: "country",
    id: "COD",
    section: "culture",
    dossierId: "dossier-spiritualites-kongo",
  },
  {
    kind: "country",
    id: "COD",
    section: "culture",
    dossierId: "dossier-ressources",
  },
  { kind: "country", section: "etymology", dossierId: "nommer" },
  { kind: "people", section: "appellations", dossierId: "nommer" },
  { kind: "family", section: "terminology", dossierId: "nommer" },
  { kind: "language", section: "appellations", dossierId: "nommer" },
  { kind: "appellation", section: "context", dossierId: "nommer" },
  { kind: "name", section: "naming-system", dossierId: "nommer" },
];

// @req REQ-114
export function getFicheDossiers(
  context: FicheDossierContext,
  availability?: ModuleAvailabilityMap | null,
  language: Language = "fr"
) {
  const ids = new Set(
    FICHE_ASSOCIATIONS.filter(
      (link) =>
        link.kind === context.kind &&
        link.section === context.section &&
        (!link.id || link.id === context.id)
    ).map((link) => link.dossierId)
  );
  return getDossiers({ language }, availability).filter((dossier) =>
    ids.has(dossier.id)
  );
}
