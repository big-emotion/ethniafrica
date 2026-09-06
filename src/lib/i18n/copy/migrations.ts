import type { Language } from "@/types/shared";

const en = {
  navLabel: "Migrations",
  pageTitle: "Timeline of migrations",
  pageSubtitle:
    "The chronological account of every migration, settlement and trade route documented in the atlas.",
  tabs: {
    map: "Map",
    narrative: "Narrative",
  },
  mapPlaceholder: "The interactive map of migrations arrives with Story 12.9.",
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
};

type MigrationsCopy = typeof en;

const fr: MigrationsCopy = {
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
};

// @req REQ-145
export const migrationsCopy: Record<Language, MigrationsCopy> = { en, fr };
