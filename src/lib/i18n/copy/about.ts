import type { AccessMode } from "@/lib/hubs/moduleRegistry";
import type { Language } from "@/types/shared";

/**
 * The About page's three access-mode cards, in both locales (REQ-145).
 *
 * **A slice, not the whole surface.** `AboutPageContent` still holds its own
 * copy inline, which predates `check:copy-literals` and is grandfathered by
 * the gate's diff against the previous file. These three descriptions moved
 * out because they had to change — the Mercator game was renamed, and the
 * page's own contract (REQ-132, `AboutPageContent.test.tsx`) is that each card
 * names the modules sitting behind it, so a renamed module makes the sentence
 * wrong. Touching a French literal there is what the gate refuses, and it is
 * right: this is reader-facing copy.
 *
 * The rest of that file is the next slice's work, not this change's.
 */

export interface AccessModeCardCopy {
  id: AccessMode;
  label: string;
  description: string;
  accentClass: string;
}

/**
 * The accent each axis carries, per the atlas charter's one-accent-per-surface
 * rule. Declared alongside the copy because a card is the pair.
 */
const ACCENT_CLASS: Record<AccessMode, string> = {
  atlas: "afh-accent-ocre",
  dossiers: "afh-accent-teal",
  jeux: "afh-accent-perv",
};

// @req REQ-132
// @req REQ-145
export const accessModeCards: Record<Language, AccessModeCardCopy[]> = {
  en: [
    {
      id: "atlas",
      label: "The atlas",
      description:
        "The site's fiches: families, languages, peoples, countries, designations and names, plus free search.",
      accentClass: ACCENT_CLASS.atlas,
    },
    {
      id: "dossiers",
      label: "Dossiers",
      description:
        "Sourced anecdotes, initial migration landmarks and a dossier on colonisation.",
      accentClass: ACCENT_CLASS.dossiers,
    },
    {
      id: "jeux",
      label: "Play",
      description:
        "A quiz drawn from the fiches, and the Mercator projection cut down to size.",
      accentClass: ACCENT_CLASS.jeux,
    },
  ],
  fr: [
    {
      id: "atlas",
      label: "L'atlas",
      description:
        "Les fiches du site : familles linguistiques, langues, peuples, pays et noms, plus la recherche libre.",
      accentClass: ACCENT_CLASS.atlas,
    },
    {
      id: "dossiers",
      label: "Les dossiers",
      description:
        "Des anecdotes sourcées, les premiers repères de migrations et un dossier sur la colonisation.",
      accentClass: ACCENT_CLASS.dossiers,
    },
    {
      id: "jeux",
      label: "Jouer",
      description:
        "Un quiz tiré des fiches, et la projection de Mercator remise à sa juste taille.",
      accentClass: ACCENT_CLASS.jeux,
    },
  ],
};
