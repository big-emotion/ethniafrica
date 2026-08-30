import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

import { SEED_POOLS } from "../HomeHeroSeeds";

/**
 * The seed words are an editorial selection, so nothing in the type system
 * ties them to the corpus — and a first pass of this pool shipped four words
 * the corpus does not hold under those spellings ("Peul", "Massaï",
 * "Nilo-saharien", "Khoïsan"; the fiches read "Nilo-saharienne" and
 * "Khoïsan (macro-groupe non génétique)"). Each would have been a chip that
 * runs a query returning nothing, on the one screen that has to say the
 * corpus is not thin.
 *
 * The check reads `dataset/source/afrik/`, not Supabase: the atlas charter §4
 * is explicit that an interface may only call a field missing when it has
 * consulted the source of truth rather than a projection of it, and the same
 * holds for calling a name present.
 */

const CORPUS = join(process.cwd(), "dataset/source/afrik");

function jsonFilesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return jsonFilesUnder(path);
    return entry.endsWith(".json") ? [path] : [];
  });
}

function namesUnder(folder: string): Set<string> {
  const names = new Set<string>();
  for (const file of jsonFilesUnder(join(CORPUS, folder))) {
    const fiche = JSON.parse(readFileSync(file, "utf8"));
    for (const name of [fiche.nameMain, fiche.nameFr]) {
      if (typeof name === "string" && name) names.add(name);
    }
  }
  return names;
}

const NAMES_BY_KIND = {
  people: () => namesUnder("peuples"),
  country: () => namesUnder("pays"),
  languageFamily: () => namesUnder("famille_linguistique"),
} as const;

describe("home hero seed words", () => {
  // @req REQ-002
  it("names only entities the corpus actually holds", () => {
    const missing: string[] = [];

    for (const pool of SEED_POOLS) {
      const names = NAMES_BY_KIND[pool.kind as keyof typeof NAMES_BY_KIND]();
      for (const word of pool.words) {
        if (!names.has(word)) missing.push(`${pool.kind}: ${word}`);
      }
    }

    expect(missing).toEqual([]);
  });
});
