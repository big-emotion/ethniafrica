import type { Language } from "@/types/shared";

const en = {
  sourceTierNote:
    "Each source carries its tier — the authority it may be given.",
  /**
   * One word for one gesture, across every place a record offers it: the head,
   * the reading rail, and the band that closes the page. Three spellings of
   * the same invitation would read as three different things to do.
   */
  contribute: "Contribute",
  /**
   * The atlas is young and says so. A reader who has just read a thin chapter
   * is the one person who knows exactly what is missing from it, and the band
   * is where the page admits that out loud rather than leaving them to guess
   * whether corrections are wanted.
   */
  /**
   * The worded control that closes a tile. Words rather than a glyph, so the
   * reader knows what the press does before making it.
   */
  /**
   * The history timeline both records share. A people station is dated by
   * its regime word, because a people's history carries no date field.
   */
  chronology: {
    label: "Chronology",
    regime: {
      polity: "Precolonial",
      colonial: "Colonial",
      modern: "Contemporary",
    },
    groupedEntities: (count: number) => `${count} political entities`,
    since: (year: number) => `Since ${year}`,
    nameAtTheTime: "name",
    territoryName: "Name of the territory",
    etymology: "Where the name comes from",
    otherNames: "Other names the territory has carried",
    centres: "Centres",
  },
  tile: {
    more: "+ read more",
    less: "− fold",
  },
  amendable: {
    lead: "This page can be amended.",
    hint: "Correct a fact, report an error, add a source.",
  },
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
  },
};

type FicheCopy = typeof en;

const fr: FicheCopy = {
  sourceTierNote:
    "Chaque source porte son palier — l'autorité qu'on peut lui accorder.",
  contribute: "Contribuer",
  chronology: {
    label: "Chronologie",
    regime: {
      polity: "Précolonial",
      colonial: "Colonial",
      modern: "Contemporain",
    },
    groupedEntities: (count) => `${count} entités politiques`,
    since: (year) => `Depuis ${year}`,
    nameAtTheTime: "nom",
    territoryName: "Nom du territoire",
    etymology: "D'où vient le nom",
    otherNames: "Autres noms portés par le territoire",
    centres: "Centres",
  },
  tile: {
    more: "+ en savoir plus",
    less: "− replier",
  },
  amendable: {
    lead: "Cette page est amendable.",
    hint: "Corriger un fait, signaler une erreur, ajouter une source.",
  },
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
  },
};

// @req REQ-145
export const ficheCopy: Record<Language, FicheCopy> = { en, fr };
