import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  ACCENT_PAR_PILIER,
  PILIER_DEFAUT,
  decomposerCredit,
  dossiersASujet,
  lireArguments,
} from "./deck-migration.mjs";

// @req REQ-032
test("decomposerCredit splits the work, its holder and the named licence", () => {
  assert.deepEqual(
    decomposerCredit(["Photo d'un marché", "Wikimedia Commons · CC BY-SA 4.0"]),
    {
      credit: "Photo d'un marché",
      depot: "Wikimedia Commons",
      licence: "CC BY-SA 4.0",
    }
  );
});

// @req REQ-032
test("decomposerCredit reports no licence rather than guessing one", () => {
  assert.deepEqual(decomposerCredit(["Photo sans licence"]), {
    credit: "Photo sans licence",
    depot: "",
    licence: null,
  });
  assert.deepEqual(decomposerCredit(undefined), {
    credit: "",
    depot: "",
    licence: null,
  });
});

// @req REQ-032
test("the default pillar carries the ochre accent", () => {
  assert.equal(PILIER_DEFAUT, "L'atlas");
  assert.equal(ACCENT_PAR_PILIER[PILIER_DEFAUT], "ocre");
});

// @req REQ-032
test("lireArguments reads the dry-run flag and the single subject", () => {
  assert.deepEqual(lireArguments(["--essai", "Basotho"]), {
    essai: true,
    sujet: "Basotho",
  });
  assert.deepEqual(lireArguments([]), { essai: false, sujet: undefined });
});

// @req REQ-032
test("dossiersASujet lists subject folders, skipping _-prefixed ones only when asked", () => {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), "deck-migration-"));
  try {
    fs.mkdirSync(path.join(racine, "Basotho"));
    fs.mkdirSync(path.join(racine, "_Brouillon"));
    fs.writeFileSync(path.join(racine, "notes.txt"), "");

    const noms = (dossiers) => dossiers.map((d) => path.basename(d)).sort();

    assert.deepEqual(
      noms(dossiersASujet(racine, undefined, { ignorerSouligne: true })),
      ["Basotho"]
    );
    assert.deepEqual(
      noms(dossiersASujet(racine, undefined, { ignorerSouligne: false })),
      ["Basotho", "_Brouillon"]
    );
    assert.deepEqual(
      dossiersASujet(racine, "Basotho", { ignorerSouligne: true }),
      [path.join(racine, "Basotho")]
    );
  } finally {
    fs.rmSync(racine, { recursive: true, force: true });
  }
});
