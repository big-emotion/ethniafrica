import type { Language } from "@/types/shared";

const en = {
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
};

type SourceTransparencyCopy = typeof en;

const fr: SourceTransparencyCopy = {
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
};

// @req REQ-145
export const sourceTransparencyCopy: Record<Language, SourceTransparencyCopy> =
  {
    en,
    fr,
  };
