import type { Language } from "@/types/shared";

const en = {
  loadingRequestedPage: "Loading the requested page",
  didYouKnow: "Did you know?",
  year: "Year",
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
};

type SystemCopy = typeof en;

const fr: SystemCopy = {
  loadingRequestedPage: "Chargement de la page demandée",
  didYouKnow: "Saviez-vous que",
  year: "Année",
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
};

// @req REQ-145
export const systemCopy: Record<Language, SystemCopy> = { en, fr };
