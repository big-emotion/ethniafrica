import type { Language } from "@/types/shared";

const en = {
  sourceTierNote:
    "Each source carries its tier — the authority it may be given.",
  archivedCapture: (version: number) =>
    `This content is an archived capture (v${version}) and will never be changed.`,
  unreadableField:
    "This field cannot be read: the page stored it in a form the display cannot render.",
  auditDisclaimer: {
    never: "page not audited — read with care",
    stale: (date: string) => `last verification: ${date} · verify again`,
    region: "verification warning",
    close: "close the warning",
  },
  onward: {
    title: "Continue",
    kind: {
      people: "People",
      country: "Country",
      "language-family": "Language family",
      language: "Language",
      name: "Name borne",
    },
  },
  chapterBar: {
    aria: "Page chapters",
    summary: "Contents",
    /**
     * The label said "chapter 2 of 9". It went with the counter the bar used
     * to show: a record's chapters are not a sequence anyone walks in order,
     * and a position out of a total answered a question nobody asked. Naming
     * the chapter in view is the part that was doing work.
     */
    toggle: (title: string) => `Page contents — ${title}`,
    report: "Report",
    contribute: "Contribute",
  },
};

type FicheCopy = typeof en;

const fr: FicheCopy = {
  sourceTierNote:
    "Chaque source porte son palier — l'autorité qu'on peut lui accorder.",
  archivedCapture: (version) =>
    `Ce contenu est une capture archivée (v${version}) et ne sera jamais modifié.`,
  unreadableField:
    "Ce champ n'est pas lisible : la page l'a enregistré sous une forme que l'affichage ne sait pas rendre.",
  auditDisclaimer: {
    never: "page non auditée — lire avec précaution",
    stale: (date) => `dernière vérification : ${date} · à re-vérifier`,
    region: "avertissement vérification",
    close: "fermer l'avertissement",
  },
  onward: {
    title: "Poursuivre",
    kind: {
      people: "Peuple",
      country: "Pays",
      "language-family": "Famille linguistique",
      language: "Langue",
      name: "Patronyme",
    },
  },
  chapterBar: {
    aria: "Chapitres de la page",
    summary: "Sommaire",
    toggle: (title) => `Sommaire de la page — ${title}`,
    report: "Signaler",
    contribute: "Contribuer",
  },
};

// @req REQ-145
export const ficheCopy: Record<Language, FicheCopy> = { en, fr };
