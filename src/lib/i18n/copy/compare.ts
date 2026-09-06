import type { CompareEntityType as PickerEntityType } from "@/hooks/use-compare-selection";
import type { CompareEntityType } from "@/types/compare";
import type { Language } from "@/types/shared";

const en = {
  title: "Compare",
  pickerIntroduction:
    "Choose two or three fiches of the same type, then start the comparison.",
  entityTypeLegend: "Entity type to compare",
  entityTypes: {
    peoples: "peoples",
    countries: "countries",
    "language-families": "language families",
  } satisfies Record<PickerEntityType, string>,
  search: (kind: string) => `Search ${kind}`,
  searchPlaceholder: (kind: string) => `Search ${kind}…`,
  suggestions: (kind: string) => `${kind} suggestions`,
  maximum: (count: number) => `${count} maximum`,
  selectedEntities: "Selected entities",
  remove: (name: string) => `remove ${name}`,
  selectionRegion: "Comparison selection",
  selectedCount: (count: number, maximum: number) =>
    `${count}/${maximum} selected`,
  compare: "compare",
  addedAnnouncement: (name: string, count: number, maximum: number) =>
    `${name} added to the comparison, ${count} of ${maximum}`,
  removedAnnouncement: (name: string, count: number, maximum: number) =>
    `${name} removed from the comparison, ${count} of ${maximum}`,
  rowTitles: {
    peuple: {
      appellations: "Names",
      origins: "Origins and formation",
      organization: "Neighbouring peoples and organisation",
      languages: "Language",
      culture: "Culture and spiritualities",
      historicalRole: "Historical role",
      demography: "Geographical distribution",
    },
    pays: {
      historicalNames: "Names through history",
      kingdoms: "Kingdoms and civilisations",
      majorPeoples: "Peoples and demography",
      culture: "Culture and society",
      historicalFacts: "Major historical facts",
      demographics: "Peoples and demography",
    },
    famille: {
      decolonialHeader: "Names and decolonisation",
      generalInfo: "General information",
      associatedPeoples: "Associated peoples",
      linguisticCharacteristics: "Language characteristics",
      historyAndOrigins: "History and origins",
      distribution: "Geographical distribution",
    },
  } satisfies Record<CompareEntityType, Record<string, string>>,
  caption: (labels: string) => `Comparison of ${labels}`,
  listJoiner: "and",
  tableLabel: "Comparison table",
  comparedAttribute: "Compared attribute",
  missing: "not provided",
  missingFor: (name: string) => ` for ${name}`,
  referenceYear: "ref. 2025",
  viewSources: "view sources",
  editorialConfidence: (name: string) => `Editorial confidence — ${name}`,
  scoreExplainer: "how this score is calculated",
  share: "Share",
  copyLink: "Copy link",
  copied: "copied",
  selectManually: "select manually",
  metadataTitle: (labels: string) => `Comparison: ${labels}`,
  metadataDescription: (labels: string) =>
    `Comparison of AFRIK fiches: ${labels}. Identity, languages, demography and editorial confidence side by side.`,
  metadataImageAlt: "AFRIK comparison",
  notFoundTitle: "Comparison not found",
  notFoundBeforePattern:
    "This comparison does not exist. Comparison URLs follow the format",
  notFoundAfterPattern:
    "(2 to 3 identifiers of the same type: peoples, countries or language families, without duplicates).",
  startComparison: "Start a comparison",
  reportBrokenUrl: "Report a broken URL",
};

type CompareCopy = typeof en;

const fr: CompareCopy = {
  title: "Comparer",
  pickerIntroduction:
    "Choisissez deux ou trois fiches du même type, puis lancez la comparaison.",
  entityTypeLegend: "Type d'entité à comparer",
  entityTypes: {
    peoples: "peuples",
    countries: "pays",
    "language-families": "familles linguistiques",
  },
  search: (kind) => `Rechercher ${kind}`,
  searchPlaceholder: (kind) => `Rechercher ${kind}…`,
  suggestions: (kind) => `Suggestions ${kind}`,
  maximum: (count) => `${count} maximum`,
  selectedEntities: "Entités sélectionnées",
  remove: (name) => `retirer ${name}`,
  selectionRegion: "Sélection de comparaison",
  selectedCount: (count, maximum) => `${count}/${maximum} sélectionnés`,
  compare: "comparer",
  addedAnnouncement: (name, count, maximum) =>
    `${name} ajouté à la comparaison, ${count} sur ${maximum}`,
  removedAnnouncement: (name, count, maximum) =>
    `${name} retiré de la comparaison, ${count} sur ${maximum}`,
  rowTitles: {
    peuple: {
      appellations: "Noms & appellations",
      origins: "Origines & formation",
      organization: "Peuples voisins & organisation",
      languages: "Langue",
      culture: "Culture & spiritualité",
      historicalRole: "Rôle historique",
      demography: "Répartition géographique",
    },
    pays: {
      historicalNames: "Noms à travers l'histoire",
      kingdoms: "Royaumes & Civilisations",
      majorPeoples: "Peuples & Démographie",
      culture: "Culture & Société",
      historicalFacts: "Faits historiques majeurs",
      demographics: "Peuples & Démographie",
    },
    famille: {
      decolonialHeader: "Appellations et décolonisation",
      generalInfo: "Informations générales",
      associatedPeoples: "Peuples associés",
      linguisticCharacteristics: "Caractéristiques linguistiques",
      historyAndOrigins: "Histoire et origines",
      distribution: "Répartition géographique",
    },
  },
  caption: (labels) => `Comparaison de ${labels}`,
  listJoiner: "et",
  tableLabel: "Tableau de comparaison",
  comparedAttribute: "Attribut comparé",
  missing: "non renseigné",
  missingFor: (name) => ` pour ${name}`,
  referenceYear: "réf. 2025",
  viewSources: "voir les sources",
  editorialConfidence: (name) => `Confiance éditoriale — ${name}`,
  scoreExplainer: "comment ce score est calculé",
  share: "Partager",
  copyLink: "Copier le lien",
  copied: "copié",
  selectManually: "sélectionner manuellement",
  metadataTitle: (labels) => `Comparaison : ${labels}`,
  metadataDescription: (labels) =>
    `Comparaison de fiches AFRIK : ${labels}. Identité, langues, démographie et confiance éditoriale côte à côte.`,
  metadataImageAlt: "Comparaison AFRIK",
  notFoundTitle: "Comparaison introuvable",
  notFoundBeforePattern:
    "Cette comparaison n'existe pas. Les URLs de comparaison suivent le format",
  notFoundAfterPattern:
    "(2 à 3 identifiants du même type : peuples, pays ou familles linguistiques, sans doublon).",
  startComparison: "Commencer une comparaison",
  reportBrokenUrl: "Signaler une URL cassée",
};

// @req REQ-145
export const compareCopy: Record<Language, CompareCopy> = { en, fr };
