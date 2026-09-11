/**
 * Convert a `cards.json` from the retired shape to §10 of GABARITS-SOCIAL.md.
 *
 *     node social/tools/migrate-cards/migrate-cards.mjs            tous les projets
 *     node social/tools/migrate-cards/migrate-cards.mjs <Sujet>    un seul
 *     node social/tools/migrate-cards/migrate-cards.mjs --essai    n'écrit rien
 *
 * Idempotent: a deck already carrying `cartes` is left alone, so this can run on
 * every project repeatedly without churning the ones already done.
 *
 * A card it cannot convert is not guessed. It is written to `_a-trier/` beside
 * the deck, with the reason, and the deck keeps the rest.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { imageSize } from "./image-size.mjs";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const ATELIER = path.resolve(ICI, "../..");
const PROJETS = path.join(ATELIER, "Projects");

/**
 * The retired roles, and what §5 calls the same thing.
 *
 * `couverture` opened the deck and `cloture` closed it, which are the two cards
 * the spec renders full-frame in layout B. The middle cards are series cards.
 * A role outside this table is not inferred: it goes to `_a-trier/`.
 */
const ROLES = {
  couverture: "ouverture",
  cloture: "bascule",
  entree: "serie",
};

/**
 * A title that *is* a quantity. Layout C exists for these, so a wrong match
 * costs a composition.
 *
 * The card carries a figure when the number is the statement, not when a number
 * appears in a sentence. A first pass accepted any bare year and marked
 * « Depuis 2010, ils écrivent leur nom eux-mêmes » and « Un village retranché,
 * fondé vers 1600 » as figure cards. Both are prose with a date in them, and
 * both would have been pushed to C for nothing.
 *
 * So: a leading number, or a number bound to a unit. A year on its own no longer
 * qualifies — a title that really leads on a date starts with it.
 *
 * This is still a heuristic and it is treated as one. Every card it marks is
 * listed in the migration report, because whether a title is a figure is an
 * editorial reading and not a match.
 */
const CHIFFRE =
  /^\s*\d|\b\d[\d\s,.]*\s*(?:%|km²|km2|m²|millions?|milliards?|fois|siècles?)\b/i;

const PILIER_DEFAUT = "L'atlas";
const ACCENT_PAR_PILIER = {
  "L'atlas": "ocre",
  "Les dossiers": "teal",
  Jouer: "perv",
};

function estMigre(deck) {
  return Array.isArray(deck.cartes);
}

/** The credit lines the retired shape carried, split into the fields §10 names. */
function decomposerCredit(lignes) {
  const LICENCE =
    /(CC0|CC BY-SA \d(?:\.\d)?|CC BY-ND[\w.\- ]*|CC BY-NC[\w.\- ]*|CC BY \d(?:\.\d)?|domaine public|public domain|licence ouverte|open licence)/i;

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

function convertirCarte(carte, assets, rapport) {
  const rang = carte.rank;
  const role = ROLES[carte.role];
  if (!role) {
    return {
      rejet: { rang, motif: `rôle inconnu : ${JSON.stringify(carte.role)}` },
    };
  }

  const fichier = carte.asset;
  if (!fichier) {
    return { rejet: { rang, motif: "aucune image" } };
  }

  let taille;
  try {
    // Read from the file, never from the JSON. §6 turns on these two integers.
    taille = imageSize(path.join(assets, fichier));
  } catch (e) {
    return { rejet: { rang, motif: e.message } };
  }

  const { credit, depot, licence } = decomposerCredit(carte.credit);
  if (!licence) {
    rapport.sansLicence.push(`${rang} · ${fichier}`);
  }

  // §10 has one title, one precision and one punchline. The retired shape spread
  // them over different fields depending on the card, so the mapping is written
  // out per case rather than chained through `??` — a fallback chain quietly
  // picked `question` over `nom` on the covers and put the hook where the names
  // belonged.
  const texte = (v) => (Array.isArray(v) ? v.join(" ") : (v ?? ""));

  // A figure card kept the number in `chiffre` and its caption in `legende`.
  const figure = typeof carte.chiffre === "string" ? carte.chiffre.trim() : "";

  let titre, precision, punchline;
  if (figure) {
    titre = figure;
    precision = texte(carte.legende);
    punchline = texte(carte.titre ?? carte.nom);
  } else if (carte.role === "couverture") {
    // The cover leads on the names; the question is the hook that follows them.
    titre = texte(carte.nom ?? carte.titre);
    precision = texte(carte.lieu);
    punchline = texte(carte.question);
  } else {
    titre = texte(carte.titre ?? carte.nom);
    precision = texte(carte.lieu);
    punchline = texte(carte.legende);
  }

  const chiffre = figure ? true : CHIFFRE.test(titre);
  if (chiffre && !figure) {
    rapport.chiffreDeduit.push(`${rang} \u00b7 ${titre}`);
  }

  // Hand-set line breaks become an engine wrap to §3's measure. That may fall
  // elsewhere, so it is reported rather than done quietly.
  for (const [champ, valeur] of Object.entries(carte)) {
    if (Array.isArray(valeur) && champ !== "credit") {
      rapport.retoursForces.push(
        `${rang} \u00b7 ${champ} \u00b7 ${valeur.join(" / ")}`
      );
    }
  }

  return {
    carte: {
      rang,
      role,
      titre,
      chiffre,
      precision,
      punchline,
      corps: carte.corps ?? "",
      source: carte.source ?? "",
      image: {
        fichier,
        w: taille.w,
        h: taille.h,
        cadrage: "50% 50%",
        credit,
        depot,
        licence: licence ?? "",
      },
      disposition: "auto",
      // §10 — null lets the engine wrap on §3's measure. A cut is written by hand
      // only where it carries meaning, and `--coupes` restores the three the
      // corpus already had.
      coupe: null,
      // Kept rather than dropped: the plaque is real composed content and the
      // engine will need it. Dropping it during a schema move would delete
      // approved copy, which this migration is forbidden to do.
      ...(carte.plaque ? { plaque: carte.plaque } : {}),
    },
  };
}

function convertir(deck, assets, rapport) {
  const pilier = deck.pillar ?? PILIER_DEFAUT;
  const cartes = [];
  const rejets = [];

  for (const carte of deck.cards ?? []) {
    const { carte: convertie, rejet } = convertirCarte(carte, assets, rapport);
    if (rejet) rejets.push({ ...rejet, original: carte });
    else cartes.push(convertie);
  }

  return {
    migre: {
      campagne: deck.campaign,
      pilier,
      accent: ACCENT_PAR_PILIER[pilier] ?? "ocre",
      fond: "nuit",
      // Left null on purpose. §7 says the output licence is the most viral of
      // the lot, computed at render from the licences actually composed. Writing
      // a value here would be the copy the spec forbids, and it would go stale
      // the first time a card changes its image.
      licence_sortie: null,
      serie: deck.serie,
      lien: deck.link,
      outDir: deck.outDir,
      ...(deck.exception ? { exception: deck.exception } : {}),
      cartes,
    },
    rejets,
  };
}

function migrerProjet(dossier, essai, rapport) {
  const fichier = path.join(dossier, "cards.json");
  if (!fs.existsSync(fichier)) return;

  const deck = JSON.parse(fs.readFileSync(fichier, "utf8"));
  const nom = path.basename(dossier);

  if (estMigre(deck)) {
    rapport.dejaFaits.push(nom);
    return;
  }

  const { migre, rejets } = convertir(
    deck,
    path.join(dossier, "assets"),
    rapport
  );
  rapport.migres.push({
    nom,
    cartes: migre.cartes.length,
    rejets: rejets.length,
  });

  if (essai) return;

  fs.writeFileSync(fichier, JSON.stringify(migre, null, 2) + "\n");

  if (rejets.length) {
    const trier = path.join(dossier, "_a-trier");
    fs.mkdirSync(trier, { recursive: true });
    for (const r of rejets) {
      fs.writeFileSync(
        path.join(trier, `carte-${String(r.rang).padStart(2, "0")}.json`),
        JSON.stringify({ motif: r.motif, carte: r.original }, null, 2) + "\n"
      );
      rapport.rejets.push(`${nom} · carte ${r.rang} · ${r.motif}`);
    }
  }
}

const args = process.argv.slice(2);
const essai = args.includes("--essai");
const sujet = args.find((a) => !a.startsWith("--"));

const rapport = {
  migres: [],
  dejaFaits: [],
  rejets: [],
  chiffreDeduit: [],
  sansLicence: [],
  retoursForces: [],
};

const dossiers = sujet
  ? [path.join(PROJETS, sujet)]
  : fs
      .readdirSync(PROJETS, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
      .map((e) => path.join(PROJETS, e.name));

for (const d of dossiers) migrerProjet(d, essai, rapport);

console.log(essai ? "ESSAI — rien n'est écrit\n" : "");
console.log(
  `${rapport.migres.length} deck(s) migré(s), ${rapport.dejaFaits.length} déjà au schéma §10`
);
for (const m of rapport.migres) {
  console.log(
    `  ${m.nom} — ${m.cartes} cartes${m.rejets ? `, ${m.rejets} en _a-trier/` : ""}`
  );
}
if (rapport.rejets.length) {
  console.log(`\ncartes non converties (${rapport.rejets.length}) :`);
  for (const r of rapport.rejets) console.log("  " + r);
}
if (rapport.chiffreDeduit.length) {
  console.log(
    `\n« chiffre » déduit — à relire, c'est une décision éditoriale (${rapport.chiffreDeduit.length}) :`
  );
  for (const c of rapport.chiffreDeduit) console.log("  " + c);
}
if (rapport.retoursForces.length) {
  console.log(
    `\nretours à la ligne posés à la main, désormais calculés par le moteur — ` +
      `à relire (${rapport.retoursForces.length}) :`
  );
  for (const r of rapport.retoursForces) console.log("  " + r);
}
if (rapport.sansLicence.length) {
  console.log(
    `\nsans licence nommée — bloquera la porte 1 (${rapport.sansLicence.length}) :`
  );
  for (const s of rapport.sansLicence) console.log("  " + s);
}
