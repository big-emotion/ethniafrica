/**
 * node --test social/tools/etat-pipeline/
 *
 * Node's own runner, so the atelier gains no dependency to check a text parser.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  lireChamp,
  lireDate,
  lireEtat,
  lireTitre,
  normaliser,
} from "./etat.mjs";

const PUBLIE_ANCIEN = `# Lingala — le bobangi et les missionnaires

**🟢 Publié** · publication : 2026-09-05

| | |
| --- | --- |
| Sujet | Langue · lingala |
| Pilier | Mythe déconstruit |
`;

const A_PRODUIRE = `# Au Malawi, le lac Nyasa s'appelle le lac Lac.

**⚪️ À produire**

| | |
| --- | --- |
| Pilier | La carte cachée |
`;

test("l'ancien 🟢 veut dire publié, pas prêt à publier", () => {
  // The whole reason this mapping exists. Reading the old marker with the new
  // legend would offer eight live videos as ready to post.
  assert.equal(lireEtat(PUBLIE_ANCIEN), "publie");
});

test("« à produire » est un traitement, pas un brouillon", () => {
  assert.equal(lireEtat(A_PRODUIRE), "traitement");
});

test("bloqué est un traitement avec un obstacle nommé ailleurs", () => {
  assert.equal(lireEtat("# X\n\n**🔴 Bloqué**\n"), "traitement");
});

test("un marqueur illisible ne se devine pas", () => {
  assert.equal(lireEtat("# X\n\n**🚀 Prêt pour la lune**\n"), null);
});

test("la normalisation réécrit l'ancien marqueur", () => {
  assert.match(
    normaliser(PUBLIE_ANCIEN),
    /^\*\*✅ Publié\*\* · publication : 2026-09-05$/m
  );
});

test("la normalisation est idempotente", () => {
  const une = normaliser(PUBLIE_ANCIEN);
  assert.equal(normaliser(une), une);
});

test("un marqueur illisible laisse le fichier intact", () => {
  const inconnu = "# X\n\n**🚀 Prêt pour la lune**\n";
  assert.equal(normaliser(inconnu), inconnu);
});

test("le titre, le pilier et la date se lisent", () => {
  assert.equal(
    lireTitre(PUBLIE_ANCIEN),
    "Lingala — le bobangi et les missionnaires"
  );
  assert.equal(lireChamp(PUBLIE_ANCIEN, "Pilier"), "Mythe déconstruit");
  assert.equal(lireChamp(PUBLIE_ANCIEN, "Sujet"), "Langue · lingala");
  assert.equal(lireDate(PUBLIE_ANCIEN), "2026-09-05");
});

test("un post sans date n'en invente pas une", () => {
  assert.equal(lireDate(A_PRODUIRE), null);
});
