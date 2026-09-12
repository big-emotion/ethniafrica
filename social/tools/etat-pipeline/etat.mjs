/**
 * The four states a subject can be in, and how a post.md is read into one.
 *
 * Kept separate from the generator so the parsing can be tested without touching
 * the library. Everything here is a pure function of text.
 */

/**
 * The only four states. A fifth is not a nuance, it is a state nobody can act on.
 *
 * The order is the order the operator needs them in when they ask what to do
 * next: what is ready to post, then what is stuck, then what is only an idea,
 * then what is already out and needs nothing.
 */
export const ETATS = [
  { cle: "valide", marqueur: "🟢", libelle: "Validé, en attente" },
  { cle: "traitement", marqueur: "🟡", libelle: "En traitement" },
  { cle: "brouillon", marqueur: "⚪️", libelle: "Brouillon" },
  { cle: "publie", marqueur: "✅", libelle: "Publié" },
];

/**
 * Markers the library already carries, mapped onto the four.
 *
 * The collision matters more than the rest of this file. Before 2026-09-10, 🟢
 * meant *published* — eight live posts say so. Under the new scheme 🟢 means
 * "verified and rendered, not yet published". Reading the old files with the new
 * legend would present eight published videos as waiting to go out, and the
 * obvious next action would be to publish them a second time.
 *
 * « À produire » becomes 🟡 rather than ⚪️ because those subjects have their copy
 * written and are waiting on a render, which is the definition of in-treatment.
 *
 * 🔴 « Bloqué » is not a fourth state. A blocked subject is in treatment with a
 * named obstacle, and the obstacle belongs in the blockage column where it can be
 * read, not in a marker that only says « no ».
 */
const LEGACY = new Map([
  ["🟢 Publié", "publie"],
  ["✅ Publié", "publie"],
  ["🟡 En traitement", "traitement"],
  ["⚪️ À produire", "traitement"],
  ["🔴 Bloqué", "traitement"],
  ["⚪️ Brouillon", "brouillon"],
  ["🟢 Validé, en attente", "valide"],
  ["🟢 Validé", "valide"],
]);

const PAR_CLE = new Map(ETATS.map((e) => [e.cle, e]));

/** The `**🟢 Publié** · publication : 2026-09-05` line, whatever dialect it speaks. */
export function lireEtat(texte) {
  const m = texte.match(/^\*\*(.+?)\*\*/m);
  if (!m) return null;
  const brut = m[1].trim();
  if (LEGACY.has(brut)) return LEGACY.get(brut);
  // An unknown marker is not silently treated as a draft: a subject whose state
  // cannot be read is a subject the operator cannot be told the truth about.
  return null;
}

/** A cell of the two-column table at the top of a post.md. */
export function lireChamp(texte, nom) {
  const m = texte.match(
    new RegExp(`^\\|\\s*${nom}\\s*\\|\\s*(.+?)\\s*\\|`, "mi")
  );
  return m ? m[1].trim() : null;
}

/** The title, which is the first heading and the name the operator recognises. */
export function lireTitre(texte) {
  const m = texte.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

/** The publication date, when the header carries one. */
export function lireDate(texte) {
  const m = texte.match(/publication\s*:\s*(\d{4}-\d{2}-\d{2})/i);
  return m ? m[1] : null;
}

/**
 * Rewrite a post.md header to the canonical marker for its state.
 *
 * Idempotent: a header already canonical comes back byte-identical, so the
 * generator can be run on every skill invocation without churning the library.
 */
export function normaliser(texte) {
  const cle = lireEtat(texte);
  if (!cle) return texte;
  const { marqueur, libelle } = PAR_CLE.get(cle);
  return texte.replace(/^\*\*(.+?)\*\*/m, `**${marqueur} ${libelle}**`);
}

export function etat(cle) {
  return PAR_CLE.get(cle);
}
