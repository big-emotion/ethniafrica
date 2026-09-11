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
import path from "node:path";
import test from "node:test";

import {
  gabarits,
  productionsRoot,
  publicationsRoot,
  repoRoot,
} from "./paths.mjs";

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
  withEnv({ ETHNIAFRICA_SOCIAL_OUTPUT: "/tmp/atelier-projets" }, () => {
    assert.equal(productionsRoot(), path.resolve("/tmp/atelier-projets"));
  });
});

// @req REQ-032
test("sans variable, les productions retombent dans le dépôt", () => {
  withEnv({ ETHNIAFRICA_SOCIAL_OUTPUT: null }, () => {
    assert.equal(productionsRoot(), path.join(repoRoot(), "output", "social"));
  });
});

// @req REQ-032
test("la racine des publications vient de sa propre variable", () => {
  // Two shelves, two variables. Deriving one from the other is what tied these
  // tools to a directory layout the repository is not allowed to describe.
  withEnv(
    { ETHNIAFRICA_SOCIAL_PUBLICATIONS: "/tmp/biblio-publications" },
    () => {
      assert.equal(
        publicationsRoot(),
        path.resolve("/tmp/biblio-publications")
      );
    }
  );
});

// @req REQ-032
test("sans variable, les publications sont absentes plutôt qu'inventées", () => {
  // Null, not a fallback path: a tool that walks published posts has nothing
  // sensible to walk in a fresh checkout, and must say so instead of reporting
  // an empty library as a complete one.
  withEnv({ ETHNIAFRICA_SOCIAL_PUBLICATIONS: null }, () => {
    assert.equal(publicationsRoot(), null);
  });
});

// @req REQ-032
test("la spec des gabarits est dans le dépôt, pas dans la bibliothèque", () => {
  assert.equal(
    gabarits(),
    path.join(repoRoot(), "docs", "design", "gabarits-social")
  );
});
