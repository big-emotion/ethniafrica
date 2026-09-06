import type { Language } from "@/types/shared";

const en = {
  description:
    "The corpus bibliography: every source on which the fiches rely, with its standing and the material that cites it.",
  sorts: {
    titre: "Title",
    annee: "Year, newest first",
    ajout: "Added to the corpus, newest first",
  },
  labels: {
    search: "Search sources",
    searchPlaceholder: "Title or author",
    standing: "Standing",
    anyStanding: "All standings",
    provenance: "Provenance",
    anyProvenance: "All provenance types",
    decade: "Decade",
    anyDecade: "All decades",
    sort: "Sort by",
    activeSort: "Sort",
  },
  selection: (total: string, singular: boolean) =>
    `${total} ${singular ? "source" : "sources"} in this selection. ` +
    `Each states its standing and the reason for that standing.`,
  provenanceNote: (withKind: string, total: string) =>
    `Provenance is recorded for only ${withKind} sources out of ${total}. ` +
    `Filtering by it shows what has already been classified, not the state of the whole corpus.`,
  empty: "No corpus source matches this selection.",
  reset: "Return to all sources",
  referenceBibliography: "The project's reference bibliography",
};

type SourcesDirectoryCopy = typeof en;

const fr: SourcesDirectoryCopy = {
  description:
    "La bibliographie du corpus : chaque source sur laquelle reposent les fiches, avec son degré d'autorité et ce qui la cite.",
  sorts: {
    titre: "Titre",
    annee: "Année, la plus récente d'abord",
    ajout: "Ajout au corpus, le plus récent d'abord",
  },
  labels: {
    search: "Rechercher une source",
    searchPlaceholder: "Titre ou auteur",
    standing: "Autorité",
    anyStanding: "Toutes les autorités",
    provenance: "Provenance",
    anyProvenance: "Toutes les provenances",
    decade: "Décennie",
    anyDecade: "Toutes les décennies",
    sort: "Trier par",
    activeSort: "Tri",
  },
  selection: (total: string, singular: boolean) =>
    `${total} ${singular ? "source" : "sources"} dans cette sélection. ` +
    `Chacune porte son degré d'autorité, et la raison de ce degré.`,
  provenanceNote: (withKind: string, total: string) =>
    `La provenance n'est renseignée que pour ${withKind} sources sur ${total} : ` +
    `filtrer dessus ne montre pas l'état du corpus, seulement ce qui a déjà été qualifié.`,
  empty: "Aucune source du corpus ne répond à cette sélection.",
  reset: "Revenir à toutes les sources",
  referenceBibliography: "La bibliographie de référence du projet",
};

// @req REQ-141
export const sourcesDirectoryCopy: Record<Language, SourcesDirectoryCopy> = {
  en,
  fr,
};
