import type { Language } from "@/types/shared";

const en = {
  verifyBadge: {
    label: "source to verify",
    reason: "Source URL unreachable for at least 7 consecutive days.",
  },
  sourceChain: {
    title: "Source chain",
    description: "Assertion details, confidence level and verifiable sources.",
    position: "Position",
    confidence: "Confidence level",
    confidenceSummary: (count: number, auditedAt: string | null) =>
      `Calculated from ${count} ${count === 1 ? "source" : "sources"}${
        auditedAt
          ? ` · last human audit on ${auditedAt}`
          : " · never audited by a person"
      }.`,
    openReports: (count: number) =>
      `${count} open ${count === 1 ? "report" : "reports"} on this assertion.`,
    sources: "Sources",
    viewInBibliography: "View in the bibliography",
    brokenLink: (date: string) => `unresolved link — reported on ${date}`,
    reportSource: "Report this source",
    revisionHistory: "View revision history",
    reportProblem: "Report a problem",
    citeAssertion: "Cite this assertion",
  },
  pinnedVersion: {
    regionLabel: "pinned version indicator",
    live: "view the live version",
    liveAfterCorrections: "view live version",
    title: "Pinned version",
    dated: (date: string) => ` dated ${date}`,
    corrections: (count: number) =>
      `Since this pinned version, ${count} ${count === 1 ? "assertion has" : "assertions have"} been corrected`,
    expand: "expand pinned version indicator",
    collapse: "collapse pinned version indicator",
  },
  revisionHistory: {
    sectionTitle: "History",
    title: "Revision history",
    description:
      "List of all revisions published for this fiche, with date, moderator and reason.",
    loading: "Loading…",
    loadError: "Unable to load the history.",
    retry: "Try again",
    empty: "No published revision — initial fiche",
    showLess: "Show less",
    showMore: "Show more",
    loadMore: "Load more",
  },
};

type SourceTransparencyCopy = typeof en;

const fr: SourceTransparencyCopy = {
  verifyBadge: {
    label: "source à vérifier",
    reason: "URL de la source injoignable depuis au moins 7 jours consécutifs.",
  },
  sourceChain: {
    title: "Chaîne des sources",
    description:
      "Détails de l'assertion, niveau de confiance et sources vérifiables.",
    position: "Position",
    confidence: "Niveau de confiance",
    confidenceSummary: (count, auditedAt) =>
      `Calculé à partir de ${count} source${count > 1 ? "s" : ""}${
        auditedAt
          ? ` · dernier audit humain le ${auditedAt}`
          : " · jamais audité par un humain"
      }.`,
    openReports: (count) =>
      `${count} signalement${count > 1 ? "s" : ""} ouvert${
        count > 1 ? "s" : ""
      } sur cette assertion.`,
    sources: "Sources",
    viewInBibliography: "Voir dans la bibliographie",
    brokenLink: (date) => `lien non résolu — signalé le ${date}`,
    reportSource: "Signaler cette source",
    revisionHistory: "Voir l'historique des révisions",
    reportProblem: "Signaler un problème",
    citeAssertion: "Citer cette assertion",
  },
  pinnedVersion: {
    regionLabel: "indicateur de version figée",
    live: "voir la version vivante",
    liveAfterCorrections: "voir version vivante",
    title: "Version figée",
    dated: (date) => ` du ${date}`,
    corrections: (count) =>
      `Depuis cette version figée, ${count} ${count === 1 ? "assertion a" : "assertions ont"} été corrigée${count === 1 ? "" : "s"}`,
    expand: "développer l’indicateur de version figée",
    collapse: "réduire l’indicateur de version figée",
  },
  revisionHistory: {
    sectionTitle: "Historique",
    title: "Historique des révisions",
    description:
      "Liste de toutes les révisions publiées pour cette fiche, avec date, modérateur et raison.",
    loading: "Chargement…",
    loadError: "Impossible de charger l'historique.",
    retry: "Réessayer",
    empty: "Aucune révision publiée — fiche initiale",
    showLess: "Voir moins",
    showMore: "Voir plus",
    loadMore: "Charger plus",
  },
};

// @req REQ-145
export const sourceTransparencyCopy: Record<Language, SourceTransparencyCopy> =
  {
    en,
    fr,
  };
