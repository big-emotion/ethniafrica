import { PRODUCT_NAME } from "@/lib/brand";
import type { Language } from "@/types/shared";

const en = {
  title: "All reports",
  metadataTitle: `All reports — ${PRODUCT_NAME}`,
  metadataDescription:
    "Editorial transparency — browse the reports sent in by the community",
  introduction:
    "This public queue makes visible the editorial follow-up of the reports sent in by the community.",
  queueLabel: "Public queue of reports",
  filters: {
    statuses: "Statuses",
    kinds: "Report types",
    targets: "Targets",
  },
  statuses: {
    open: "Open",
    under_review: "Under review",
    accepted: "Accepted",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
    duplicate: "Duplicate",
  },
  statusDescriptions: {
    open: "in progress — editorial review",
    under_review: "in progress — editorial review",
    accepted: "accepted · page updated",
    rejected: "rejected",
    duplicate: "duplicate",
    withdrawn: "withdrawn",
  },
  kinds: {
    inaccurate: "Inaccurate information",
    "missing-source": "Missing source",
    "broken-url": "Broken URL",
    offensive: "Offensive content",
    "correction-proposal": "Proposed correction",
    other: "Other",
  },
  targets: {
    assertion: "Assertion",
    source: "Source",
    fiche_section: "Page section",
    classification: "Classification",
    general: "General report",
  },
  entities: {
    people: "People",
    country: "Country",
    language: "Language",
    language_family: "Language family",
    source: "Source",
    fiche_section: "Page section",
    classification: "Classification",
  },
  anonymous: "anonymous",
  loading: "Loading the reports…",
  loadError: "The reports could not be loaded.",
  empty: "no report matches these filters",
  reset: "reset",
  loadingMore: "Loading…",
  retry: "Try again",
  loadMore: "Show more reports",
};

type PublicFlagsCopy = typeof en;

const fr: PublicFlagsCopy = {
  title: "Tous les signalements",
  metadataTitle: `Tous les signalements — ${PRODUCT_NAME}`,
  metadataDescription:
    "Transparence éditoriale — explorez les signalements de la communauté",
  introduction:
    "Cette file publique rend visible le suivi éditorial des signalements transmis par la communauté.",
  queueLabel: "File publique des signalements",
  filters: {
    statuses: "Statuts",
    kinds: "Types de signalement",
    targets: "Cibles",
  },
  statuses: {
    open: "Ouvert",
    under_review: "En cours d’examen",
    accepted: "Accepté",
    rejected: "Rejeté",
    withdrawn: "Retiré",
    duplicate: "Doublon",
  },
  statusDescriptions: {
    open: "en cours — examen par l'équipe éditoriale",
    under_review: "en cours — examen par l'équipe éditoriale",
    accepted: "acceptée · page mise à jour",
    rejected: "rejetée",
    duplicate: "doublon",
    withdrawn: "retirée",
  },
  kinds: {
    inaccurate: "Information inexacte",
    "missing-source": "Source manquante",
    "broken-url": "URL brisée",
    offensive: "Contenu offensant",
    "correction-proposal": "Proposition de correction",
    other: "Autre",
  },
  targets: {
    assertion: "Assertion",
    source: "Source",
    fiche_section: "Section de page",
    classification: "Classification",
    general: "Signalement général",
  },
  entities: {
    people: "Peuple",
    country: "Pays",
    language: "Langue",
    language_family: "Famille linguistique",
    source: "Source",
    fiche_section: "Section de page",
    classification: "Classification",
  },
  anonymous: "anonyme",
  loading: "Chargement des signalements…",
  loadError: "Impossible de charger les signalements.",
  empty: "aucun signalement ne correspond à ces filtres",
  reset: "réinitialiser",
  loadingMore: "Chargement…",
  retry: "Réessayer",
  loadMore: "Afficher plus de signalements",
};

// @req REQ-145
export const publicFlagsCopy: Record<Language, PublicFlagsCopy> = { en, fr };
