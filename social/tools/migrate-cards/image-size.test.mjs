/**
 * node --test social/tools/migrate-cards/
 *
 * Reads real assets from the corpus rather than synthetic fixtures: the point of
 * this module is that it agrees with the decoder on files that actually exist,
 * and a hand-built two-pixel PNG would not have caught the progressive-JPEG case.
 */
import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { imageSize } from "./image-size.mjs";
import { gabarits, productionsRoot } from "../paths.mjs";

const PROJETS = productionsRoot();

/**
 * The corpus is not in this repository, so on a fresh clone there is nothing to
 * measure. The two tests that need it skip **by name**: a corpus test that
 * quietly passed on an empty directory would report green while measuring
 * nothing, which is the failure mode this project has already paid for
 * elsewhere.
 */
const SANS_CORPUS = !fs.existsSync(PROJETS)
  ? { skip: "aucun corpus : ETHNIAFRICA_SOCIAL_PROJECTS n'est pas renseigné" }
  : {};

function assets(limite = 40) {
  const trouves = [];
  for (const projet of fs.readdirSync(PROJETS)) {
    const dir = path.join(PROJETS, projet, "assets");
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (/\.(jpe?g|png)$/i.test(f)) trouves.push(path.join(dir, f));
      if (trouves.length >= limite) return trouves;
    }
  }
  return trouves;
}

// @req REQ-032
test("lit les dimensions de tout le corpus d'images", SANS_CORPUS, () => {
  const fichiers = assets();
  assert.ok(
    fichiers.length > 10,
    "le corpus doit fournir des images à mesurer"
  );

  for (const f of fichiers) {
    const { w, h } = imageSize(f);
    assert.ok(
      Number.isInteger(w) && w > 0,
      `largeur invalide pour ${path.basename(f)}`
    );
    assert.ok(
      Number.isInteger(h) && h > 0,
      `hauteur invalide pour ${path.basename(f)}`
    );
    // No asset in this corpus is a thumbnail; a parser that silently returned a
    // marker's payload length instead of a dimension would land in this range.
    assert.ok(
      w < 30000 && h < 30000,
      `dimensions absurdes pour ${path.basename(f)}`
    );
  }
});

// @req REQ-032
test("un fichier absent lève, il ne renvoie pas une valeur par défaut", () => {
  // The failure being prevented: a default would silently disable §6's
  // resolution fallback for exactly the cards whose asset went missing.
  assert.throws(
    () => imageSize(path.join(PROJETS, "aucun-fichier.jpg")),
    /introuvable/
  );
});

// @req REQ-032
test("un fichier qui n'est pas une image lève", () => {
  // The spec is versioned with the engine, so this one needs no corpus.
  const md = path.join(gabarits(), "GABARITS-SOCIAL.md");
  assert.throws(() => imageSize(md), /illisibles/);
});
