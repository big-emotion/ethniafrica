import type { Language } from "@/types/shared";

const en = {
  identifiers: "Identifiers",
  otherAttestedNames: "Other attested names",
  languageFamily: "Language family",
  speakers: "Speakers",
  dialects: "Dialects",
  vehicularRole: "Vehicular role",
  vitality: "Vitality",
  sources: "Sources",
  eyebrow: "Language",
  majorityVote: "majority vote of the sources",
};

type LanguageFicheCopy = typeof en;

const fr: LanguageFicheCopy = {
  identifiers: "Identifiants",
  otherAttestedNames: "Autres noms attestés",
  languageFamily: "Famille linguistique",
  speakers: "Locuteurs",
  dialects: "Dialectes",
  vehicularRole: "Rôle véhiculaire",
  vitality: "Vitalité",
  sources: "Sources",
  eyebrow: "Langue",
  majorityVote: "vote majoritaire des sources",
};

// @req REQ-145
export const languageFicheCopy: Record<Language, LanguageFicheCopy> = {
  en,
  fr,
};
