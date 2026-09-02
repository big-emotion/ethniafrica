#!/usr/bin/env node
/**
 * Merges the researched claims of `patronymeResearch.data.mjs` into the 30
 * `PAT_*` fiches and rewrites their `gaps` to match what research actually
 * established.
 *
 * Why a merge script rather than 30 hand-edited fiches: the sources are shared.
 * Niane 1960 backs twelve Mande fiches, Roscoe 1911 backs four Baganda ones,
 * and `patronymeJsonLoader` keys sources by title and rejects the batch if the
 * same title appears with a conflicting tier, URL or provenance. A single
 * source table makes that invariant structural instead of a thing to remember.
 *
 * A field research did not establish is not written. It keeps a `gaps` entry,
 * and the reason is rewritten to say what was searched and did not turn up —
 * a searched-and-absent gap is a finding; a never-looked gap is a to-do.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

import { SOURCES, RESEARCH } from "./patronymeResearch.data.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FICHES = join(
  HERE,
  "..",
  "..",
  "dataset",
  "source",
  "afrik",
  "patronymes"
);

/** Fields whose emptiness the fiches declare as a gap. */
const GAPPABLE = [
  "transmissionMode",
  "origin",
  "alliances",
  "casteOrSocialFunction",
  "bearers",
  "homonyms",
];

function isEmpty(fiche, field) {
  const value = fiche[field];
  if (field === "origin") {
    return (
      value.oralTraditions.length === 0 &&
      value.writtenChronicles.length === 0 &&
      value.linguisticReconstructions.length === 0
    );
  }
  if (field === "transmissionMode") return value === "other";
  if (Array.isArray(value)) return value.length === 0;
  return value === null || value === undefined;
}

function resolveSources(sourceKeys, ficheId) {
  return sourceKeys.map((key) => {
    const source = SOURCES[key];
    if (!source) throw new Error(`${ficheId}: unknown source key "${key}"`);
    return { sourceKey: key, ...source };
  });
}

/** Every sourceRef used anywhere in the fiche must resolve to a declared source. */
function collectRefs(node, into = new Set()) {
  if (Array.isArray(node)) {
    node.forEach((child) => collectRefs(child, into));
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "sourceRefs" && Array.isArray(value))
        value.forEach((r) => into.add(r));
      else collectRefs(value, into);
    }
  }
  return into;
}

async function main() {
  const errors = [];
  let enriched = 0;
  let filledFields = 0;
  let remainingGaps = 0;
  const prettierConfig = await prettier.resolveConfig(
    join(FICHES, "PAT_KEITA.json")
  );

  // A research entry with no fiche is still a hard failure: it means a claim
  // was written for a name the corpus does not carry.
  //
  // The reverse direction stopped being one when the candidate queue landed.
  // A fiche with no research entry used to mean the pass had silently skipped
  // it; it now means the queue has generated a fiche this pass has not reached
  // yet, which is the ordinary state of the corpus and not an error. It is
  // reported as a count so the size of the backlog stays visible.
  const onDisk = readdirSync(FICHES)
    .filter((f) => f.startsWith("PAT_") && f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
  const researched = new Set(Object.keys(RESEARCH));
  const awaitingResearch = onDisk.filter((id) => !researched.has(id)).length;
  for (const id of researched) {
    if (!onDisk.includes(id)) errors.push(`${id}: research entry has no fiche`);
  }
  if (errors.length) {
    for (const e of errors) console.error(`ERROR ${e}`);
    process.exit(1);
  }

  for (const [ficheId, claims] of Object.entries(RESEARCH)) {
    const path = join(FICHES, `${ficheId}.json`);
    const fiche = JSON.parse(readFileSync(path, "utf8"));

    // The source table is authoritative for the keys it declares, so a re-run
    // after correcting a tier or a source_kind propagates rather than skipping.
    // The corpus-derived entry the selection pass wrote is left untouched.
    const researchedSources = resolveSources(claims.sourceKeys, ficheId);
    const byKey = new Map(researchedSources.map((s) => [s.sourceKey, s]));
    fiche.sources = fiche.sources.map((s) => byKey.get(s.sourceKey) ?? s);
    const present = new Set(fiche.sources.map((s) => s.sourceKey));
    for (const source of researchedSources) {
      if (!present.has(source.sourceKey)) fiche.sources.push(source);
    }

    for (const field of [
      "transmissionMode",
      "designatedSocialUnit",
      "origin",
      "alliances",
      "casteOrSocialFunction",
      "bearers",
      "homonyms",
      "spellings",
      // A people or a country association is itself a claim, and research can
      // replace the corpus passage that carried it with a dedicated source.
      "peoples",
      "countries",
      "nisbaSubtype",
      "patronymicChainDepth",
      "totemicFoodProhibition",
      "permittedGivenNames",
    ]) {
      if (claims[field] === undefined) continue;
      fiche[field] = claims[field];
      filledFields += 1;
    }

    const declared = new Set(fiche.sources.map((s) => s.sourceKey));
    for (const ref of collectRefs(fiche)) {
      if (!declared.has(ref))
        errors.push(`${ficheId}: sourceRef "${ref}" has no source entry`);
    }

    // The mirror invariant: a source nothing cites is a citation the fiche no
    // longer makes. Dropping a claim must drop its source, or the fiche keeps
    // advertising provenance for something it does not say.
    const cited = collectRefs(fiche);
    fiche.sources = fiche.sources.filter((s) => cited.has(s.sourceKey));

    fiche.gaps = GAPPABLE.filter((field) => isEmpty(fiche, field)).map(
      (field) => ({
        fieldPath: field,
        reason:
          claims.gapReasons?.[field] ??
          `Aucune source dédiée trouvée pour ce champ lors de la passe de recherche.`,
      })
    );
    remainingGaps += fiche.gaps.length;

    const formatted = await prettier.format(JSON.stringify(fiche), {
      ...prettierConfig,
      parser: "json",
    });
    writeFileSync(path, formatted, "utf8");
    enriched += 1;
  }

  for (const e of errors) console.error(`ERROR ${e}`);
  console.log(
    `${enriched} fiches enriched, ${filledFields} fields written, ` +
      `${remainingGaps} gaps remaining, ${awaitingResearch} fiches awaiting research`
  );
  if (errors.length) process.exit(1);
}

await main();
