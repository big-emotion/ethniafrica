/**
 * Convert a `scenes.json` from the retired video schema to §10 cards.
 *
 *     node social/tools/migrate-scenes/migrate-scenes.mjs            tous les projets
 *     node social/tools/migrate-scenes/migrate-scenes.mjs <Sujet>    un seul
 *     node social/tools/migrate-scenes/migrate-scenes.mjs --essai    n'écrit rien
 *
 * Writes `cartes.json` beside `scenes.json` rather than replacing it: the retired
 * file still drives `ethni_render.py` until the assembly moves over, and a
 * migration that deletes its own input has no way back.
 *
 * Idempotent. A scene it cannot convert is never guessed — it goes to `_a-trier/`
 * with the reason, and the rest of the deck converts.
 *
 * ## The retired shape
 *
 * A scene carries `bg`, `credit`, and either `ouverture` (the opening scene) or
 * `cards[]` — on-screen text pieces, each with a role:
 *
 * | Rôle | Ce qu'il portait | §10 |
 * | --- | --- | --- |
 * | `serie`   | la ligne de série, identique sur tout le deck | `deck.serie` |
 * | `mot`     | le mot examiné, avec son `sens`               | `titre` + `precision` |
 * | `forme`   | une forme du nom, avec son `attestation`      | `titre` + `precision` |
 * | `chiffre` | le nombre, avec sa `legende`                  | `titre` + `chiffre: true` |
 * | `corps`   | **une liste de lignes parallèles**            | aucun — voir `_a-trier/` |
 */
import fs from "node:fs";
import path from "node:path";

import { imageSize } from "../migrate-cards/image-size.mjs";
import {
  ACCENT_PAR_PILIER,
  PILIER_DEFAUT,
  decomposerCredit,
  dossiersASujet,
  lireArguments,
} from "../deck-migration.mjs";
import { productionsRoot } from "../paths.mjs";

const PROJETS = productionsRoot();

/** The series line, which the retired schema repeated on every scene. */
function serieDuDeck(doc) {
  for (const scene of doc.scenes ?? []) {
    for (const c of scene.cards ?? []) {
      if (c.role === "serie" && typeof c.text === "string") {
        return c.text.replace(/\s*·\s*série\s*$/i, "").trim();
      }
    }
  }
  return null;
}

function convertirScene(scene, index, dossier, rapport) {
  const rang = index + 1;

  const asset = scene.bg?.asset;
  if (!asset) {
    return { rejet: { rang, motif: "aucune image de fond" } };
  }
  let taille;
  try {
    taille = imageSize(path.join(dossier, "assets", asset));
  } catch (e) {
    return { rejet: { rang, motif: e.message } };
  }

  const { credit, depot, licence } = decomposerCredit(scene.credit);
  if (!licence) rapport.sansLicence.push(`${rang} · ${asset}`);

  const base = {
    rang,
    image: {
      fichier: asset,
      w: taille.w,
      h: taille.h,
      cadrage: "50% 50%",
      identite: "",
      credit,
      depot,
      licence: licence ?? "",
    },
    coupe: null,
    corps_paires: null,
    pivot: null,
    disposition: "auto",
  };

  // The opening scene carries its own shape.
  if (scene.ouverture) {
    const o = scene.ouverture;
    return {
      carte: {
        ...base,
        role: "ouverture",
        titre: o.nom ?? "",
        chiffre: false,
        precision: o.lieu ?? "",
        punchline: o.question ?? "",
        corps: o.corps ?? "",
        source: "",
      },
    };
  }

  const cards = (scene.cards ?? []).filter((c) => c.role !== "serie");

  // A scene with nothing but the series line is a photograph carrying spoken
  // narration — the commonest video scene there is. Its text fields are empty
  // and §6 puts it full frame, which is what it already was.
  if (!cards.length) {
    return {
      carte: {
        ...base,
        role: "serie",
        titre: "",
        chiffre: false,
        precision: "",
        punchline: "",
        corps: "",
        source: "",
      },
    };
  }

  // A body that is a list of parallel lines — « Mosotho · une personne », then
  // « Basotho · le peuple » — is a structure §10 has no field for. `coupe` forces
  // a *title*'s breaks, not a body's. Joining the lines into a paragraph would
  // destroy the parallel that is the whole point of the scene, so it is refused
  // rather than flattened.
  // §10 — a list of parallel lines is a `corps_paires`: the vertical alignment is
  // the content, and it is what makes « Mosotho » and « Basotho » read as one word
  // at two numbers. The retired schema already separated a term from its gloss
  // with « · », so the split is a reading rather than a guess.
  const liste = cards.find((c) => Array.isArray(c.text));
  let corpsPaires = null;
  if (liste) {
    const paires = liste.text.map((ligne) => {
      const i = ligne.indexOf(" · ");
      return i === -1
        ? null
        : [ligne.slice(0, i).trim(), ligne.slice(i + 3).trim()];
    });

    if (paires.some((x) => x === null)) {
      const mauvaise = liste.text[paires.findIndex((x) => x === null)];
      return {
        rejet: {
          rang,
          motif:
            `« ${mauvaise} » n'est pas un couple terme · glose — ` +
            `écris-la en deux parties, ou sors la scène de \`corps_paires\``,
        },
      };
    }
    if (paires.length < 2 || paires.length > 4) {
      return {
        rejet: {
          rang,
          motif:
            `${paires.length} paires, et §10 en veut 2 à 4 — au-delà la ` +
            `démonstration devient un tableau. Coupe la scène en deux`,
        },
      };
    }
    corpsPaires = paires;
  }

  // A pair table can be the whole of a scene: « Mosotho · une personne » and its
  // three siblings need no headline above them, the alignment carries the point.
  const vedette = cards.find((c) =>
    ["mot", "forme", "chiffre"].includes(c.role)
  );
  if (!vedette && !corpsPaires) {
    return {
      rejet: {
        rang,
        motif: `aucun rôle connu parmi ${cards.map((c) => c.role).join(", ")}`,
      },
    };
  }

  const corps = cards.find(
    (c) => c.role === "corps" && typeof c.text === "string"
  );

  return {
    carte: {
      ...base,
      role: "serie",
      titre: vedette ? vedette.text : "",
      chiffre: vedette ? vedette.role === "chiffre" : false,
      // Each role kept its gloss under a different key, and each says the same
      // thing: what the word above means.
      precision: vedette
        ? (vedette.sens ?? vedette.attestation ?? vedette.legende ?? "")
        : "",
      punchline: "",
      corps: corpsPaires ? "" : (corps?.text ?? ""),
      ...(corpsPaires ? { corps_paires: corpsPaires } : {}),
      source: "",
      // The retired schema tied a card's arrival to a spoken word. That is
      // editorial timing and it is carried over rather than recomputed.
      ...(vedette?.cue ? { cue: vedette.cue } : {}),
    },
  };
}

function migrerProjet(dossier, essai, rapport) {
  const source = path.join(dossier, "scenes.json");
  if (!fs.existsSync(source)) return;

  const cible = path.join(dossier, "cartes.json");
  if (fs.existsSync(cible)) {
    rapport.dejaFaits.push(path.basename(dossier));
    return;
  }

  const doc = JSON.parse(fs.readFileSync(source, "utf8"));
  const cartes = [];
  const rejets = [];

  (doc.scenes ?? []).forEach((scene, i) => {
    const { carte, rejet } = convertirScene(scene, i, dossier, rapport);
    if (rejet) rejets.push({ ...rejet, original: scene });
    else cartes.push(carte);
  });

  // Ranks are renumbered over what actually converted, so the sequence has no
  // hole — a hole would read as a lost scene rather than a refused one.
  cartes.forEach((c, i) => {
    c.rang = i + 1;
  });
  if (cartes.length) cartes[cartes.length - 1].role = "bascule";

  const nom = path.basename(dossier);
  rapport.migres.push({ nom, cartes: cartes.length, rejets: rejets.length });

  // Collected before the dry-run exit: a run that reports a count without a
  // motive hides the one thing it exists to show.
  for (const r of rejets) {
    rapport.rejets.push(`${nom} · scène ${r.rang} · ${r.motif}`);
  }

  if (essai) return;

  const serie = serieDuDeck(doc);
  fs.writeFileSync(
    cible,
    JSON.stringify(
      {
        campagne: nom.toLowerCase(),
        pilier: PILIER_DEFAUT,
        accent: ACCENT_PAR_PILIER[PILIER_DEFAUT],
        fond: "nuit",
        licence_sortie: null,
        serie,
        cartes,
      },
      null,
      2
    ) + "\n"
  );

  if (rejets.length) {
    const trier = path.join(dossier, "_a-trier");
    fs.mkdirSync(trier, { recursive: true });
    for (const r of rejets) {
      fs.writeFileSync(
        path.join(trier, `scene-${String(r.rang).padStart(2, "0")}.json`),
        JSON.stringify({ motif: r.motif, scene: r.original }, null, 2) + "\n"
      );
    }
  }
}

const { essai, sujet } = lireArguments(process.argv.slice(2));

const rapport = { migres: [], dejaFaits: [], rejets: [], sansLicence: [] };

const dossiers = dossiersASujet(PROJETS, sujet, { ignorerSouligne: false });

for (const d of dossiers) migrerProjet(d, essai, rapport);

console.log(essai ? "ESSAI — rien n'est écrit\n" : "");
console.log(
  `${rapport.migres.length} deck(s) migré(s), ${rapport.dejaFaits.length} déjà fait(s)`
);
for (const m of rapport.migres) {
  console.log(
    `  ${m.nom} — ${m.cartes} scènes${m.rejets ? `, ${m.rejets} en _a-trier/` : ""}`
  );
}
if (rapport.rejets.length) {
  console.log(`\nscènes non converties (${rapport.rejets.length}) :`);
  for (const r of rapport.rejets) console.log("  " + r);
}
if (rapport.sansLicence.length) {
  console.log(
    `\nsans licence nommée — bloquera la porte 1 (${rapport.sansLicence.length}) :`
  );
  for (const s of rapport.sansLicence.slice(0, 12)) console.log("  " + s);
}
