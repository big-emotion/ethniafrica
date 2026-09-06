import type { Language } from "@/types/shared";

const en = {
  page: {
    section: "Peoples",
    title: (name: string) => `Links for ${name}`,
    missingTitle: "Links not found — EthniAfrica",
    fallbackTitle: "Links — EthniAfrica",
    metadataTitle: (name: string) => `Links for ${name} — EthniAfrica`,
    description: (name: string) =>
      `Documented migratory, commercial and religious links between ${name} and neighbouring peoples, with their sources.`,
  },
  list: {
    filterGroup: "Filter by link type",
    removeFilter: (label: string) => `Remove ${label} filter`,
    clearFilters: "Clear all",
    empty: "No relations are documented yet.",
    derivedOnly:
      "Only linguistic proximity links derived from the AFRIK hierarchy are available at present.",
    derived: "derived from the AFRIK hierarchy",
    proseFallback:
      "Relation descriptions are awaiting English review. The French originals follow.",
    linkWith: (name: string) => `Link with ${name}`,
  },
  graph: {
    role: "relations graph",
    label: (name: string) => `Relations graph centred on ${name}`,
    intro: (name: string, count: number) =>
      `Relations graph centred on ${name}: ${count} links. Use the arrow keys to move through the links and Escape to leave.`,
    centre: (name: string) => `Centre: ${name}.`,
    edge: (type: string, name: string) => `${type} link with ${name}`,
    derived: "link derived from the AFRIK hierarchy, not sourced individually",
    sources: (count: number) =>
      `${count} ${count === 1 ? "source" : "sources"}`,
    derivedAction: "Press Enter to learn more about this derived link.",
    edgeAction: "Press Enter to open the details.",
    node: (name: string) => `Node ${name}. Press Enter to open this fiche.`,
    overflow: (count: number) => `+${count} more links; see the full list.`,
  },
  derivedBadge: "derived",
};

type RelationsCopy = typeof en;

const fr: RelationsCopy = {
  page: {
    section: "Peuples",
    title: (name) => `Liens de ${name}`,
    missingTitle: "Liens introuvables — EthniAfrica",
    fallbackTitle: "Liens — EthniAfrica",
    metadataTitle: (name) => `Liens de ${name} — EthniAfrica`,
    description: (name) =>
      `Liens migratoires, commerciaux et religieux documentés entre ${name} et les peuples voisins, avec leurs sources.`,
  },
  list: {
    filterGroup: "filtrer par type de lien",
    removeFilter: (label) => `retirer le filtre ${label}`,
    clearFilters: "tout effacer",
    empty: "Aucune relation documentée pour le moment.",
    derivedOnly:
      "Seuls des liens de proximité linguistique, dérivés de la hiérarchie AFRIK, sont disponibles pour l'instant.",
    derived: "dérivé de la hiérarchie AFRIK",
    proseFallback: "",
    linkWith: (name) => `Lien avec ${name}`,
  },
  graph: {
    role: "graphe de relations",
    label: (name) => `Graphe de relations centré sur ${name}`,
    intro: (name, count) =>
      `Graphe de relations centré sur ${name} : ${count} liens. Flèches pour parcourir les liens, Échap pour quitter.`,
    centre: (name) => `Centre : ${name}.`,
    edge: (type, name) => `Lien ${type} avec ${name}`,
    derived: "lien dérivé de la hiérarchie AFRIK, non sourcé individuellement",
    sources: (count) => `${count} sources`,
    derivedAction: "Entrée pour en savoir plus sur ce lien dérivé.",
    edgeAction: "Entrée pour ouvrir le détail.",
    node: (name) => `Nœud ${name}. Entrée pour naviguer vers cette fiche.`,
    overflow: (count) => `+${count} autres liens, voir la liste complète.`,
  },
  derivedBadge: "dérivé",
};

// @req REQ-145
export const relationsCopy: Record<Language, RelationsCopy> = { en, fr };
