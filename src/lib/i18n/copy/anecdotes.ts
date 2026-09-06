import type {
  DidYouKnowEntityKind,
  DidYouKnowTier,
} from "@/lib/home/didYouKnowFacts";
import type { Language } from "@/types/shared";

const en = {
  homeEyebrow: "Did you know",
  homeMore: "Read more anecdotes",
  pageTitle: "Anecdotes",
  pageSubtitle:
    "African names, one by one: who gave them, when, and what they covered.",
  pageKicker: "Every name was given by someone",
  empty: "No anecdotes are published at the moment.",
  savedCount: (count: number) =>
    `${count} anecdote${count === 1 ? "" : "s"} saved on this device`,
  entityLabels: {
    people: "People",
    country: "Country",
    family: "Language family",
  } satisfies Record<DidYouKnowEntityKind, string>,
  tierLabels: {
    official: "Official source",
    referenced: "Referenced source",
    unverified: "Unverified source",
  } satisfies Record<DidYouKnowTier, string>,
  file: "file",
  licence: "licence",
  factReliability: "Fact reliability",
  missingProvenance:
    "Provenance to document — this fact predates the sources field.",
  nextAnnouncement: (headline: string) => `Next anecdote: ${headline}`,
  next: "Next",
  marked: "Anecdote saved",
  mark: "This anecdote is interesting",
  share: "Share",
  dispute: "I dispute this anecdote",
  linkCopied: "Link copied",
  copyLink: "Copy link",
};

type AnecdotesCopy = typeof en;

const fr: AnecdotesCopy = {
  homeEyebrow: "Saviez-vous que",
  homeMore: "Lire d'autres anecdotes",
  pageTitle: "Anecdotes",
  pageSubtitle:
    "Des noms d'Afrique pris un par un : qui les a donnés, quand, et ce qu'ils recouvraient.",
  pageKicker: "Chaque nom a été donné par quelqu'un",
  empty: "Aucune anecdote n'est publiée pour le moment.",
  savedCount: (count) =>
    `${count} anecdote${count > 1 ? "s" : ""} retenue${count > 1 ? "s" : ""} sur cet appareil`,
  entityLabels: {
    people: "Peuple",
    country: "Pays",
    family: "Famille linguistique",
  },
  tierLabels: {
    official: "Source officielle",
    referenced: "Source référencée",
    unverified: "Source non vérifiée",
  },
  file: "fichier",
  licence: "licence",
  factReliability: "Fiabilité du fait",
  missingProvenance:
    "Provenance à documenter — ce fait est antérieur au champ de sources.",
  nextAnnouncement: (headline) => `Anecdote suivante : ${headline}`,
  next: "Suivant",
  marked: "Anecdote retenue",
  mark: "Cette anecdote est intéressante",
  share: "Partager",
  dispute: "Je conteste cette anecdote",
  linkCopied: "Lien copié",
  copyLink: "Copier le lien",
};

// @req REQ-145
export const anecdotesCopy: Record<Language, AnecdotesCopy> = { en, fr };
