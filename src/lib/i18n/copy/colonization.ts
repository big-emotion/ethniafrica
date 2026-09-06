import { COLONIAL_EVENT_TYPE_LABELS } from "@/lib/glossaire/vocabularies";
import type { Language } from "@/types/shared";

const en = {
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
};

type ColonizationCopy = typeof en;

const fr: ColonizationCopy = {
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
};

// @req REQ-145
export const colonizationCopy: Record<Language, ColonizationCopy> = { en, fr };
