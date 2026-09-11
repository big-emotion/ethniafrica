/**
 * Recompute `etat-du-pipeline.md` from the library itself.
 *
 * The state file stays in the production library, not here: it describes work in
 * flight, and this repository holds the engine rather than the productions.
 *
 *     node social/tools/etat-pipeline/build-etat.mjs            lit et écrit l'état
 *     node social/tools/etat-pipeline/build-etat.mjs --migrer   réécrit aussi les post.md
 *
 * The state file is generated on every skill run and never edited by hand. A
 * hand-kept table answers « où j'en suis » with whatever was true the last time
 * somebody remembered to update it, which is the failure this replaces.
 *
 * The state of a subject lives in its own `post.md` header — one file, one place,
 * next to the work. This tool only aggregates; it invents nothing, and a subject
 * whose marker it cannot read is reported as unreadable rather than guessed.
 *
 * Both shelves it touches are named by environment variables rather than found
 * relative to this file, so nothing here describes a machine's directory layout.
 */
import fs from "node:fs";
import path from "node:path";

import {
  ETATS,
  etat,
  lireChamp,
  lireDate,
  lireEtat,
  lireTitre,
  normaliser,
} from "./etat.mjs";
import { productionsRoot, publicationsRoot } from "../paths.mjs";

// Two shelves, two variables, nothing derived from this file's own location.
// The tool used to compute both from `../..`, which stopped being true the day
// it was versioned — and stopped being true *silently*, because walking a
// directory that does not exist reports zero subjects rather than an error.
const LIBRAIRIE = publicationsRoot();
const SORTIE = path.join(productionsRoot(), "etat-du-pipeline.md");

const migrer = process.argv.includes("--migrer");

function* postsMd(racine) {
  for (const e of fs.readdirSync(racine, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(racine, e.name);
    if (e.isDirectory()) yield* postsMd(p);
    else if (e.name === "post.md") yield p;
  }
}

/**
 * What stands between this subject and publication, in the operator's words.
 *
 * Read from the files rather than from a field somebody has to remember to fill:
 * a blockage nobody wrote down is exactly the blockage that gets rediscovered
 * three weeks later.
 */
function blocage(dossier, texte, cle) {
  if (cle === "publie") return "";
  if (cle === "valide") return "";

  // A `Blocage` row in the header wins over anything inferred. The three subjects
  // that carried the retired 🔴 marker had no reason recorded anywhere, and a
  // marker that only says « no » is what this field replaces.
  const declare = lireChamp(texte, "Blocage");
  if (declare && declare !== "—") return declare;

  const bloqueurs = fs
    .readdirSync(dossier)
    .filter((n) => /^BLOQU/i.test(n))
    .map((n) =>
      n
        .replace(/^BLOQUÉ?-/i, "")
        .replace(/\.md$/, "")
        .replace(/-/g, " ")
    );
  if (bloqueurs.length) return bloqueurs.join(" · ");

  const a = (sous) =>
    fs.existsSync(path.join(dossier, sous)) &&
    fs.readdirSync(path.join(dossier, sous)).some((n) => !n.startsWith("."));
  if (!a("images") && !a("video")) return "aucun rendu";
  if (!a("images")) return "images non rendues";

  // §7 and §11 — a note to the operator left in a printed field blocks the card.
  if (/à\s+(nommer|confirmer|compléter|vérifier)/i.test(texte)) {
    return "une mention interne subsiste dans le texte";
  }
  if (cle === "brouillon") return "rien n'est vérifié ni écrit en entier";
  return "à vérifier";
}

/** The one thing to do next. Never a menu. */
function prochaineAction(cle, blocageTexte) {
  if (cle === "publie") return "—";
  if (cle === "valide") return "publier, puis renseigner la section Diffusion";
  if (cle === "brouillon") return "lancer `structure` pour écrire les cartes";
  if (blocageTexte === "aucun rendu" || blocageTexte === "images non rendues") {
    return "lancer `produire`";
  }
  // The blockage already reads in its own column; repeating it as the action
  // doubles the width of the table and says nothing new.
  return "lever le blocage";
}

function collecter() {
  // Say it rather than return an empty tally. A state file listing zero subjects
  // is indistinguishable from a library with nothing in it, and it is the file
  // three skills read to answer « où j'en suis ».
  if (LIBRAIRIE === null) {
    console.error(
      "ETHNIAFRICA_SOCIAL_PUBLICATIONS n'est pas renseignée — " +
        "impossible de dire où en sont les sujets publiés."
    );
    process.exit(1);
  }
  if (!fs.existsSync(LIBRAIRIE)) {
    console.error(`introuvable : ${LIBRAIRIE}`);
    process.exit(1);
  }
  const sujets = [];
  const illisibles = [];

  for (const fichier of postsMd(LIBRAIRIE)) {
    const texte = fs.readFileSync(fichier, "utf8");
    const cle = lireEtat(texte);
    const relatif = path.relative(LIBRAIRIE, path.dirname(fichier));

    if (!cle) {
      illisibles.push(relatif);
      continue;
    }
    if (migrer) {
      const normalise = normaliser(texte);
      if (normalise !== texte) fs.writeFileSync(fichier, normalise);
    }

    const b = blocage(path.dirname(fichier), texte, cle);
    sujets.push({
      titre: lireTitre(texte) ?? path.basename(path.dirname(fichier)),
      pilier: lireChamp(texte, "Pilier") ?? "—",
      cle,
      blocage: b || "—",
      action: prochaineAction(cle, b),
      date:
        lireDate(texte) ??
        fs.statSync(fichier).mtime.toISOString().slice(0, 10),
      chemin: relatif,
    });
  }
  return { sujets, illisibles };
}

function rendre({ sujets, illisibles }) {
  const rang = Object.fromEntries(ETATS.map((e, i) => [e.cle, i]));
  sujets.sort(
    (a, b) => rang[a.cle] - rang[b.cle] || b.date.localeCompare(a.date)
  );

  const compte = (cle) => sujets.filter((s) => s.cle === cle).length;
  const aujourdhui = new Date().toISOString().slice(0, 10);

  const lignes = [
    "# État du pipeline",
    "",
    "**Fichier généré. Ne pas l'éditer à la main.**",
    "Produit par `social/tools/etat-pipeline/build-etat.mjs`, qui lit l'en-tête de",
    "chaque `post.md`. L'état d'un sujet se change dans son `post.md`, jamais ici.",
    "",
    `Recalculé le ${aujourdhui}.`,
    "",
    "## Décompte",
    "",
    "| | État | Sujets |",
    "| --- | --- | --- |",
    ...ETATS.map((e) => `| ${e.marqueur} | ${e.libelle} | ${compte(e.cle)} |`),
    `| | **Total** | **${sujets.length}** |`,
    "",
  ];

  if (illisibles.length) {
    lignes.push(
      "## En-têtes illisibles",
      "",
      "Ces sujets ne déclarent aucun des quatre états. Ils ne sont comptés nulle part,",
      "parce qu'un sujet dont l'état est deviné est un sujet sur lequel on ment.",
      "",
      ...illisibles.map((c) => `- \`${c}\``),
      ""
    );
  }

  lignes.push(
    "## Les sujets",
    "",
    "Dans l'ordre où ils se traitent : ce qui est prêt à partir, ce qui bloque, ce qui",
    "n'est qu'une idée, puis ce qui est déjà en ligne.",
    "",
    "| | Sujet | Pilier | Ce qui bloque | Prochaine action | Depuis |",
    "| --- | --- | --- | --- | --- | --- |",
    ...sujets.map(
      (s) =>
        `| ${etat(s.cle).marqueur} | ${s.titre} | ${s.pilier} | ${s.blocage} | ${s.action} | ${s.date} |`
    ),
    ""
  );

  return lignes.join("\n");
}

const releve = collecter();
fs.writeFileSync(SORTIE, rendre(releve));

const compte = (cle) => releve.sujets.filter((s) => s.cle === cle).length;
console.log(
  `${releve.sujets.length} sujets → ${SORTIE}\n` +
    ETATS.map((e) => `  ${e.marqueur} ${e.libelle} : ${compte(e.cle)}`).join(
      "\n"
    ) +
    (releve.illisibles.length
      ? `\n  en-têtes illisibles : ${releve.illisibles.length}`
      : "")
);
