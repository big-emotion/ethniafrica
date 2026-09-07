import type { Language } from "@/types/shared";

const en = {
  loadingRequestedPage: "Loading the requested page",
  didYouKnow: "Did you know?",
  year: "Year",
  classification: "Classification",
  peopleOne: "1 people",
  peopleMany: "peoples",
  unlinkedPeople: "peoples without a referenced language",
  branchLoaded: "branch loaded",
  loadFailed: "This branch could not be loaded.",
  retry: "try again",
  loadMore: "load more",
  remaining: "remaining",
  didYouKnowEntity: {
    people: "People",
    country: "Country",
    family: "Language family",
  },
  sourceTier: {
    official: "Official source",
    referenced: "Referenced source",
    unverified: "Unverified source",
  },
  citation: {
    eyebrow: "Reference",
    title: "Cite this fiche",
    description: "A ready-to-copy reference with its version and access date.",
    versionLabel: "Fiche version",
    liveVersion: "Living version",
    pinnedVersion: "Pinned version",
    liveDescription: "Citation of the living version.",
    pinnedDescription: "Citation of the pinned version",
    format: "Format",
    textFormat: "Plain text",
    accessed: "Accessed",
    preview: "Citation",
    copy: "Copy citation",
    printable: "Printable version",
    copied: "copied",
    manualCopy: "select manually",
    sharingLicence: "Sharing licence",
  },
};

type SystemCopy = typeof en;

const fr: SystemCopy = {
  loadingRequestedPage: "Chargement de la page demandée",
  didYouKnow: "Saviez-vous que",
  year: "Année",
  classification: "Classification",
  peopleOne: "1 peuple",
  peopleMany: "peuples",
  unlinkedPeople: "peuples sans langue référencée",
  branchLoaded: "branche chargée",
  loadFailed: "Le chargement de cette branche a échoué.",
  retry: "réessayer",
  loadMore: "charger la suite",
  remaining: "restants",
  didYouKnowEntity: {
    people: "Peuple",
    country: "Pays",
    family: "Famille linguistique",
  },
  sourceTier: {
    official: "Source officielle",
    referenced: "Source référencée",
    unverified: "Source non vérifiée",
  },
  citation: {
    eyebrow: "Référence",
    title: "Citer cette fiche",
    description:
      "Une référence prête à copier, avec sa version et sa date de consultation.",
    versionLabel: "Version de la fiche",
    liveVersion: "Version vivante",
    pinnedVersion: "Version figée",
    liveDescription: "Citation de la version vivante.",
    pinnedDescription: "Citation de la version figée",
    format: "Format",
    textFormat: "Texte brut",
    accessed: "Consulté le",
    preview: "Citation",
    copy: "Copier la citation",
    printable: "Version imprimable",
    copied: "copié",
    manualCopy: "sélectionner manuellement",
    sharingLicence: "Licence de partage",
  },
};

// @req REQ-145
export const systemCopy: Record<Language, SystemCopy> = { en, fr };
