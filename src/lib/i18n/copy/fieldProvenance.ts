import type { Language } from "@/types/shared";

const en = {
  missingLabel: "Missing data",
  missingReason: "The atlas does not record this field for this page.",
  derivedLabel: "Derived value",
  derivedFromPrefix: "Derived from: ",
};

type FieldProvenanceCopy = typeof en;

const fr: FieldProvenanceCopy = {
  missingLabel: "Donnée manquante",
  missingReason: "L’atlas ne renseigne pas ce champ pour cette page.",
  derivedLabel: "Valeur dérivée",
  derivedFromPrefix: "Dérivée de : ",
};

// @req REQ-145
export const fieldProvenanceCopy: Record<Language, FieldProvenanceCopy> = {
  en,
  fr,
};
