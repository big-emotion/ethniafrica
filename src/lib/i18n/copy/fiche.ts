import type { Language } from "@/types/shared";

const en = {
  sourceTierNote:
    "Each source carries its tier — the authority it may be given.",
  archivedCapture: (version: number) =>
    `This content is an archived capture (v${version}) and will never be changed.`,
  unreadableField:
    "This field cannot be read: the fiche stored it in a form the display cannot render.",
  auditDisclaimer: {
    never: "fiche not audited — read with care",
    stale: (date: string) => `last verification: ${date} · verify again`,
    region: "verification warning",
    close: "close the warning",
  },
  chapterBar: {
    aria: "Fiche chapters",
    summary: "Contents",
    toggle: (position: number, count: number, title: string) =>
      `Fiche contents — chapter ${position} of ${count}: ${title}`,
    report: "Report",
  },
};

type FicheCopy = typeof en;

const fr: FicheCopy = {
  sourceTierNote:
    "Chaque source porte son palier — l'autorité qu'on peut lui accorder.",
  archivedCapture: (version) =>
    `Ce contenu est une capture archivée (v${version}) et ne sera jamais modifié.`,
  unreadableField:
    "Ce champ n'est pas lisible : la fiche l'a enregistré sous une forme que l'affichage ne sait pas rendre.",
  auditDisclaimer: {
    never: "fiche non auditée — lire avec précaution",
    stale: (date) => `dernière vérification : ${date} · à re-vérifier`,
    region: "avertissement vérification",
    close: "fermer l'avertissement",
  },
  chapterBar: {
    aria: "Chapitres de la fiche",
    summary: "Sommaire",
    toggle: (position, count, title) =>
      `Sommaire de la fiche — chapitre ${position} sur ${count} : ${title}`,
    report: "Signaler",
  },
};

// @req REQ-145
export const ficheCopy: Record<Language, FicheCopy> = { en, fr };
