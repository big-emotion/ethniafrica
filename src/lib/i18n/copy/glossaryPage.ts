import type { GlossaryFamily } from "@/lib/glossaire/types";
import type { Language } from "@/types/shared";

const en = {
  title: "Glossary",
  subtitle: (count: number) =>
    `The words the atlas uses to name. ${count} terms, each with an example from the atlas — or the reason why the atlas has none.`,
  familiesLabel: "The three families",
  familyCount: (count: number) => `${count} terms`,
  families: [
    { id: "origine", step: "Family 01", heading: "Where the name comes from" },
    { id: "objet", step: "Family 02", heading: "What is named" },
    { id: "effet", step: "Family 03", heading: "What naming produces" },
  ] satisfies Array<{ id: GlossaryFamily; step: string; heading: string }>,
  seenIn: "Seen in",
  fallback:
    "English definitions are awaiting editorial review. The French originals follow.",
};

type GlossaryPageCopy = typeof en;

const fr: GlossaryPageCopy = {
  title: "Glossaire",
  subtitle: (count) =>
    `Les mots avec lesquels l'atlas nomme. ${count} termes, chacun avec un exemple pris dans l’atlas — ou avec la raison pour laquelle l’atlas n'en a pas.`,
  familiesLabel: "Les trois familles",
  familyCount: (count) => `${count} termes`,
  families: [
    { id: "origine", step: "Famille 01", heading: "D'où vient le nom" },
    { id: "objet", step: "Famille 02", heading: "Ce qui est nommé" },
    { id: "effet", step: "Famille 03", heading: "Ce que nommer produit" },
  ],
  seenIn: "Vu dans",
  fallback: "",
};

// @req REQ-145
export const glossaryPageCopy: Record<Language, GlossaryPageCopy> = { en, fr };
