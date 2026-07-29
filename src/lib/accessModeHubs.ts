import type { Language } from "@/types/shared";
import { getLocalizedRoute, type PageType } from "@/lib/routing";

export type HubId = "explorer" | "comprendre" | "jouer";

export interface HubSurfaceLink {
  page: PageType;
  label: string;
  href: string;
}

export interface AccessModeHub {
  id: HubId;
  title: string;
  description: string;
  surfaces: HubSurfaceLink[];
  isVisible: boolean;
}

interface HubSurfaceDefinition {
  page: PageType;
  label: string;
}

interface HubDefinition {
  id: HubId;
  title: string;
  description: string;
  surfaces: HubSurfaceDefinition[];
}

const HUB_DEFINITIONS: HubDefinition[] = [
  {
    id: "explorer",
    title: "Explorer",
    description:
      "Parcourez les familles linguistiques, les peuples et les pays d'Afrique.",
    surfaces: [
      { page: "countries", label: "Pays" },
      { page: "families", label: "Familles linguistiques" },
      { page: "peoples", label: "Peuples" },
      { page: "search", label: "Recherche" },
    ],
  },
  {
    id: "comprendre",
    title: "Comprendre",
    description:
      "La doctrine éditoriale et le projet qui documentent nos choix.",
    surfaces: [
      { page: "doctrine", label: "Doctrine" },
      { page: "about", label: "À propos" },
    ],
  },
  {
    id: "jouer",
    title: "Jouer",
    description: "Des expériences interactives pour explorer autrement.",
    surfaces: [],
  },
];

export const isHubVisible = (surfaceCount: number): boolean => surfaceCount > 0;

export const getAccessModeHubs = (language: Language): AccessModeHub[] =>
  HUB_DEFINITIONS.map((hub) => {
    const surfaces = hub.surfaces.map((surface) => ({
      page: surface.page,
      label: surface.label,
      href: getLocalizedRoute(language, surface.page),
    }));

    return {
      id: hub.id,
      title: hub.title,
      description: hub.description,
      surfaces,
      isVisible: isHubVisible(surfaces.length),
    };
  });

export const getVisibleAccessModeHubs = (language: Language): AccessModeHub[] =>
  getAccessModeHubs(language).filter((hub) => hub.isVisible);
