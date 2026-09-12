/**
 * Where the Node tools read and write, now that they are versioned.
 *
 *     node --test social/tools/
 *
 * These tools used to sit inside the production library, so `../..` was the
 * workshop and `../../..` was the library root. Both derivations broke the
 * moment the tools moved into a repository, and they broke silently: a walk over
 * a directory that does not exist returns nothing, which reads exactly like a
 * library with no subjects in it.
 *
 * So each root is named outright by an environment variable. The assertions
 * below are that nothing is derived from a file's own location any more.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  gabarits,
  loadEnvLocal,
  productionsRoot,
  publicationsRoot,
  repoRoot,
} from "./paths.mjs";

/** Writes an env file in a scratch directory and returns its path. */
function envFile(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ethni-env-"));
  const file = path.join(dir, ".env.local");
  fs.writeFileSync(file, contents, "utf8");
  return file;
}

function withEnv(vars, run) {
  const previous = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    if (value === null) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

// @req REQ-032
test("la racine des productions vient de la variable", () => {
  withEnv({ ETHNIAFRICA_SOCIAL_PROJECTS: "/tmp/atelier-projets" }, () => {
    assert.equal(productionsRoot(), path.resolve("/tmp/atelier-projets"));
  });
});

// @req REQ-032
test("sans variable, les productions retombent dans le dépôt", () => {
  withEnv({ ETHNIAFRICA_SOCIAL_PROJECTS: null }, () => {
    assert.equal(productionsRoot(), path.join(repoRoot(), "output", "social"));
  });
});

// @req REQ-032
test("la racine des publications vient de sa propre variable", () => {
  // Two shelves, two variables. Deriving one from the other is what tied these
  // tools to a directory layout the repository is not allowed to describe.
  withEnv({ ETHNIAFRICA_SOCIAL_POSTS: "/tmp/biblio-publications" }, () => {
    assert.equal(publicationsRoot(), path.resolve("/tmp/biblio-publications"));
  });
});

// @req REQ-032
test("sans variable, les publications sont absentes plutôt qu'inventées", () => {
  // Null, not a fallback path: a tool that walks published posts has nothing
  // sensible to walk in a fresh checkout, and must say so instead of reporting
  // an empty library as a complete one.
  withEnv({ ETHNIAFRICA_SOCIAL_POSTS: null }, () => {
    assert.equal(publicationsRoot(), null);
  });
});

// @req REQ-032
test("une variable absente de l'environnement est prise dans .env.local", () => {
  // `.env.local` is the repository's own convention, and plain `node` does not
  // parse it. Without this the same two directories would have to be declared a
  // second time in a shell profile.
  delete process.env.ETHNI_TEST_REMPLIE;
  try {
    loadEnvLocal(envFile("ETHNI_TEST_REMPLIE=depuis-le-fichier\n"));
    assert.equal(process.env.ETHNI_TEST_REMPLIE, "depuis-le-fichier");
  } finally {
    delete process.env.ETHNI_TEST_REMPLIE;
  }
});

// @req REQ-032
test("l'environnement l'emporte sur le fichier", () => {
  process.env.ETHNI_TEST_PRIORITE = "depuis-le-shell";
  try {
    loadEnvLocal(envFile("ETHNI_TEST_PRIORITE=depuis-le-fichier\n"));
    assert.equal(process.env.ETHNI_TEST_PRIORITE, "depuis-le-shell");
  } finally {
    delete process.env.ETHNI_TEST_PRIORITE;
  }
});

// @req REQ-032
test("une valeur vide n'est pas une valeur", () => {
  // `.env.example` ships every key empty. Read as a setting it would mask the
  // shell and turn « not configured » into « configured to nothing », which the
  // resolver reads as its fallback.
  delete process.env.ETHNI_TEST_VIDE;
  try {
    loadEnvLocal(envFile("# un commentaire\n\nETHNI_TEST_VIDE=\n"));
    assert.equal(process.env.ETHNI_TEST_VIDE, undefined);
  } finally {
    delete process.env.ETHNI_TEST_VIDE;
  }
});

// @req REQ-032
test("les guillemets qui entourent un chemin sont retirés", () => {
  delete process.env.ETHNI_TEST_CITE;
  try {
    loadEnvLocal(envFile('export ETHNI_TEST_CITE="/un/chemin avec espace"\n'));
    assert.equal(process.env.ETHNI_TEST_CITE, "/un/chemin avec espace");
  } finally {
    delete process.env.ETHNI_TEST_CITE;
  }
});

// @req REQ-032
test("un fichier absent n'est pas une erreur", () => {
  assert.doesNotThrow(() => loadEnvLocal("/aucun/fichier/ici.env"));
});

// @req REQ-032
test("la spec des gabarits est dans le dépôt, pas dans la bibliothèque", () => {
  assert.equal(
    gabarits(),
    path.join(repoRoot(), "docs", "design", "gabarits-social")
  );
});
