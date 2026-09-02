#!/usr/bin/env node
/**
 * Emits the per-country anthroponym candidate manifest consumed by the fiche
 * authoring workflow.
 *
 * The AFRIK corpus documents clan *organisation*, not anthroponymy: only ~30
 * usable name candidates were extractable from its prose (ETNI-1680). Reaching
 * ten high-frequency anthroponyms per country therefore requires knowledge the
 * corpus does not hold, so every entry here defaults to the weakest provenance
 * the Source Tier policy defines — tier `unverified` combined with
 * `source_kind: "ai_generated"`, which recompute_confidence() scores at 0.2.
 * Nothing is suppressed for being weak; it is labelled and left to verification.
 *
 * Each entry carries a `verificationLead` naming the *kind* of source a
 * researcher should consult. Leads are deliberately not URLs: a fabricated
 * citation is worse than a named research direction.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

import { COUNTRY_CANDIDATES } from "./anthroponymCandidates.data.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, "..", "..", "dataset", "source", "afrik");
const OUT = join(CORPUS, "patronymes", "_candidates-by-country.json");

const NAME_SYSTEMS = new Set([
  "clan_name",
  "non_hereditary_patronymic",
  "nisba",
  "praise_name",
  "totemic_clan",
]);

const MINIMUM_PER_COUNTRY = 10;

function corpusCountryIds() {
  return new Set(
    readdirSync(join(CORPUS, "pays"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
  );
}

/** People id -> the ISO3 codes the corpus attests that people in. */
function peopleAttestations() {
  const attestations = new Map();
  const familyDirs = readdirSync(join(CORPUS, "peuples"), {
    withFileTypes: true,
  })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const family of familyDirs) {
    const dir = join(CORPUS, "peuples", family);
    for (const file of readdirSync(dir).filter((f) => f.startsWith("PPL_"))) {
      const fiche = JSON.parse(readFileSync(join(dir, file), "utf8"));
      const countries = (fiche.content?.demography?.distributionByCountry ?? [])
        .map((row) => row.country)
        .filter(Boolean);
      attestations.set(fiche.id, new Set(countries));
    }
  }
  return attestations;
}

async function build() {
  const knownCountries = corpusCountryIds();
  const attestations = peopleAttestations();
  const errors = [];
  const warnings = [];
  const countries = [];

  for (const [countryId, block] of Object.entries(COUNTRY_CANDIDATES)) {
    if (!knownCountries.has(countryId)) {
      errors.push(`${countryId}: no country fiche in the corpus`);
      continue;
    }
    if (block.names.length < MINIMUM_PER_COUNTRY) {
      errors.push(
        `${countryId}: ${block.names.length} names, ${MINIMUM_PER_COUNTRY} required`
      );
    }

    const seen = new Set();
    const entries = block.names.map(
      ([name, nameSystem, peopleIds = [], variants = []]) => {
        if (!NAME_SYSTEMS.has(nameSystem)) {
          errors.push(
            `${countryId}/${name}: unknown nameSystem "${nameSystem}"`
          );
        }
        const key = name.toLowerCase();
        if (seen.has(key)) errors.push(`${countryId}: "${name}" listed twice`);
        seen.add(key);

        for (const id of peopleIds) {
          if (!attestations.has(id)) {
            errors.push(`${countryId}/${name}: unknown people id ${id}`);
          } else if (!attestations.get(id).has(countryId)) {
            warnings.push(
              `${countryId}/${name}: ${id} is not attested in ${countryId}`
            );
          }
        }

        return {
          name,
          nameSystem,
          variants,
          peopleIds,
          countryId,
          provenance: {
            tier: "unverified",
            source_kind: "ai_generated",
            confidenceWeight: 0.2,
          },
          verificationLead: block.verificationLead,
          reviewStatus: "candidate_pending_verification",
        };
      }
    );

    countries.push({
      countryId,
      dominantNameSystem: block.dominantNameSystem,
      onomasticNote: block.onomasticNote,
      verificationLead: block.verificationLead,
      entries,
    });
  }

  const missing = [...knownCountries].filter(
    (id) => !Object.prototype.hasOwnProperty.call(COUNTRY_CANDIDATES, id)
  );
  if (missing.length)
    errors.push(`no candidates for: ${missing.sort().join(", ")}`);

  const total = countries.reduce((n, c) => n + c.entries.length, 0);

  const manifest = {
    schemaVersion: 1,
    reviewStatus: "candidates_pending_verification",
    generatedBy: "scripts/afrik/buildAnthroponymCandidates.mjs",
    countryCount: countries.length,
    candidateCount: total,
    methodologyFr:
      "Le corpus AFRIK documente l'organisation clanique, pas l'anthroponymie : " +
      "l'extraction de la prose n'a livré que 30 candidats exploitables (ETNI-1680). " +
      "Cette liste étend la couverture à au moins dix anthroponymes de haute fréquence " +
      "par pays à partir de connaissances externes au corpus. Conformément à la " +
      "politique Source Tier, rien n'est écarté pour faiblesse : chaque entrée porte " +
      "le tier le plus bas (unverified × ai_generated = 0.2) et reste un candidat " +
      "tant qu'une source dédiée ne l'a pas établie. Le classement est un classement " +
      "d'attestation, pas un décompte de porteurs : aucune table publique de fréquence " +
      "patronymique ne couvre la majorité des 54 pays.",
    defaultProvenance: {
      tier: "unverified",
      source_kind: "ai_generated",
      confidenceWeight: 0.2,
    },
    countries,
  };

  // Formatted through prettier so a regeneration stays idempotent under
  // `format:check` rather than needing a .prettierignore exception.
  const formatted = await prettier.format(JSON.stringify(manifest), {
    ...(await prettier.resolveConfig(OUT)),
    parser: "json",
  });
  writeFileSync(OUT, formatted, "utf8");

  for (const w of warnings) console.warn(`warn  ${w}`);
  for (const e of errors) console.error(`ERROR ${e}`);
  console.log(
    `${total} candidates across ${countries.length} countries -> ${OUT.replace(/.*ethniafrica\//, "")}`
  );
  if (errors.length) process.exit(1);
}

await build();
