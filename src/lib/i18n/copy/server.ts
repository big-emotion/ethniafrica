import type { Language } from "@/types/shared";

const en = {
  flags: {
    antibotFailed: "Anti-bot verification failed",
    antibotUnavailable:
      "Anti-bot verification is temporarily unavailable. Please try again later.",
    rateLimited: (seconds: number) =>
      `Report submission rate limit exceeded. Retry after ${seconds} seconds.`,
    illegalTransition:
      "This transition is not allowed from the current status.",
  },
  download: {
    summarySheet: "Summary",
    familiesSheet: "Families",
    peoplesSheet: "Peoples",
    countriesSheet: "Countries",
    relationsSheet: "Relations",
    languageFamilies: "Language families",
    peoples: "Peoples",
    countries: "Countries",
    name: "Name",
    mainName: "Main name",
    languageFamily: "Language family",
    country: "Country",
    etymology: "Etymology",
    peopleId: "People ID",
    countryId: "Country ID",
  },
};

type ServerCopy = typeof en;

const fr: ServerCopy = {
  flags: {
    antibotFailed: "vérification anti-robot échouée",
    antibotUnavailable:
      "vérification anti-robot temporairement indisponible, veuillez réessayer plus tard",
    rateLimited: (seconds) =>
      `Limite de soumission des signalements dépassée. Réessayez dans ${seconds} secondes.`,
    illegalTransition:
      "Cette transition n'est pas permise depuis l'état courant.",
  },
  download: {
    summarySheet: "Résumé",
    familiesSheet: "Familles",
    peoplesSheet: "Peuples",
    countriesSheet: "Pays",
    relationsSheet: "Relations",
    languageFamilies: "Familles linguistiques",
    peoples: "Peuples",
    countries: "Pays",
    name: "Nom",
    mainName: "Nom principal",
    languageFamily: "Famille linguistique",
    country: "Pays",
    etymology: "Étymologie",
    peopleId: "Peuple ID",
    countryId: "Pays ID",
  },
};

// @req REQ-145
export const serverCopy: Record<Language, ServerCopy> = { en, fr };
