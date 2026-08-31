import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

import {
  FALLBACK_SEED_WORDS,
  SEED_WORD_MAX_LENGTH,
} from "@/lib/home/seedWords";

/**
 * The chips now draw their words from the corpus per request, so the words a
 * reader sees are true by construction. These are the *fallback* dozen, kept
 * for the request where the database answers with nothing — and they are the
 * ones nothing else checks: no type ties them to the corpus, and a first pass
 * of this pool shipped four words the corpus does not hold under those
 * spellings ("Peul", "Massaï",
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

describe("home hero fallback seed words", () => {
  // @req REQ-002
  it("names only entities the corpus actually holds", () => {
    const missing: string[] = [];

    for (const [kind, words] of Object.entries(FALLBACK_SEED_WORDS)) {
      const names = NAMES_BY_KIND[kind as keyof typeof NAMES_BY_KIND]();
      for (const word of words) {
        if (!names.has(word)) missing.push(`${kind}: ${word}`);
      }
    }

    expect(missing).toEqual([]);
  });

  // The fallback is served straight to a chip, so it lives under the same
  // measure as a drawn word: one name too long and the row that is supposed
  // to rescue the band is the row that breaks it at 430px.
  // @req REQ-002
  it("keeps every fallback word within a chip's measure", () => {
    for (const words of Object.values(FALLBACK_SEED_WORDS)) {
      for (const word of words) {
        expect(word.length).toBeLessThanOrEqual(SEED_WORD_MAX_LENGTH);
      }
    }
  });
});
