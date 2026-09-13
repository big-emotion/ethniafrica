/**
 * What the two retired-schema migrations share: reading a credit, the pillar
 * defaults, the command line and the subject folders.
 *
 * `migrate-cards` and `migrate-scenes` each carried a copy, and a licence
 * pattern that drifts between two copies decides which images block the render
 * gate for one deck and not the other.
 */
import fs from "node:fs";
import path from "node:path";

const LICENCE =
  /(CC0|CC BY-SA \d(?:\.\d)?|CC BY-ND[\w.\- ]*|CC BY-NC[\w.\- ]*|CC BY \d(?:\.\d)?|domaine public|public domain|licence ouverte|open licence)/i;

export const PILIER_DEFAUT = "L'atlas";

export const ACCENT_PAR_PILIER = {
  "L'atlas": "ocre",
  "Les dossiers": "teal",
  Jouer: "perv",
};

/** The credit lines the retired shape carried, split into the fields §10 names. */
export function decomposerCredit(lignes) {
  const texte = (lignes ?? []).join(" · ");
  const licence = texte.match(LICENCE)?.[1] ?? null;

  // The first line described the work, the last named its holder and licence.
  // Anything else is left in `credit` rather than split on a guess.
  const [premiere, ...reste] = lignes ?? [];
  const derniere = reste.length ? reste[reste.length - 1] : "";

  return {
    credit: (premiere ?? "").trim(),
    depot: derniere
      .replace(LICENCE, "")
      .replace(/[·,\s]+$/, "")
      .trim(),
    licence,
  };
}

export function lireArguments(args) {
  return {
    essai: args.includes("--essai"),
    sujet: args.find((a) => !a.startsWith("--")),
  };
}

/**
 * One named subject, or every subject folder under the root.
 *
 * `ignorerSouligne` is a parameter because the two tools already disagreed:
 * the cards migration skips `_`-prefixed folders, the scenes migration walks
 * them. Unifying either way would change which decks a run touches.
 */
export function dossiersASujet(racine, sujet, { ignorerSouligne }) {
  if (sujet) return [path.join(racine, sujet)];
  return fs
    .readdirSync(racine, { withFileTypes: true })
    .filter(
      (e) => e.isDirectory() && !(ignorerSouligne && e.name.startsWith("_"))
    )
    .map((e) => path.join(racine, e.name));
}
