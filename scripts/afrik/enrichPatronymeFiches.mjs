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

  // A fiche the research pass silently skipped is the exact failure this whole
  // exercise exists to correct, so the two sets must match before anything is
  // written.
  //
  // "The two sets" is the selection pass's roster, not everything on disk. The
  // coverage waves write PAT_* fiches from the candidate queue through a
  // different pipeline, and there are now 777 files against these 30 dossiers;
  // comparing against the directory made every one of those a missing research
  // entry and this script exited 1 without writing anything. _manifest.json is
  // the selection pass's own record of what it produced, so it is what this
  // table owes an entry for.
  const onDisk = readdirSync(FICHES)
    .filter((f) => f.startsWith("PAT_") && f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
  const selected = JSON.parse(
    readFileSync(join(FICHES, "_manifest.json"), "utf8")
  ).entries.map(({ id }) => id);
  const researched = new Set(Object.keys(RESEARCH));
  for (const id of selected) {
    if (!researched.has(id)) errors.push(`${id}: fiche has no research entry`);
  }
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
      "nisbaSubtype",
      "patronymicChainDepth",
      "totemicFoodProhibition",
      "permittedGivenNames",
    ]) {
      if (claims[field] === undefined) continue;
      fiche[field] = claims[field];
      filledFields += 1;
    }

    // Research can extend the reach of a name, not only explain it: a dated
    // attestation in a country the selection pass never saw belongs in the
    // fiche's own associations. These two merge rather than overwrite, because
    // the coverage waves append to the same arrays from a different table —
    // overwriting would silently delete their entries on the next run here.
    for (const [field, key] of [
      ["peoples", "peopleId"],
      ["countries", "countryId"],
    ]) {
      if (claims[field] === undefined) continue;
      const existing = new Map(
        (fiche[field] ?? []).map((entry) => [entry[key], entry])
      );
      for (const entry of claims[field]) {
        const already = existing.get(entry[key]);
        // An association both waves attest keeps both citations. Dropping the
        // researched one because the queue got there first would leave the
        // weaker source standing alone for a claim a stronger one also makes.
        if (already) {
          already.sourceRefs = [
            ...new Set([...(already.sourceRefs ?? []), ...entry.sourceRefs]),
          ];
          continue;
        }
        existing.set(entry[key], entry);
      }
      fiche[field] = [...existing.values()];
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
    `${enriched} fiches enriched, ${filledFields} fields written, ${remainingGaps} gaps remaining`
  );
  if (errors.length) process.exit(1);
}

await main();
