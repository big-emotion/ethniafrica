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

/**
 * The floor every country must clear. Below it the build fails: a country with
 * fewer than ten candidates cannot reach the coverage target at all.
 */
const MINIMUM_PER_COUNTRY = 10;

/**
 * Quota per country, above the floor. A flat ten would give Nigeria and the
 * Seychelles the same representation, which is not "fairly proportioned" in any
 * reading — so the largest populations carry more names.
 *
 * Bands are population, not corpus weight. Summing the corpus's own
 * `distributionByCountry` double-counts, because a macro-people and its
 * sub-peoples are both attested in the same country: that sum puts Burundi
 * ahead of Algeria, which no population figure does. The banding is therefore
 * declared here rather than derived.
 *
 * Checked 2026-09-02 against UN World Population Prospects 2024 revision,
 * medium variant, mid-2025 estimates — the corpus's own demographic reference
 * year. The four ≥ 100M are Nigeria 237.5M, Ethiopia 135.5M, Egypt 118.4M and
 * the DRC 112.8M, with Tanzania next at 70.5M, so that band is not close to a
 * boundary. Fifteen countries clear 25M, from Tanzania down to Mali at 25.2M.
 * Burkina Faso was declared in the ≥ 25M band and sits at 24.1M; it has been
 * moved down. Nothing in the base band reaches 25M — the highest are Malawi
 * 22.2M, Zambia 21.9M and Chad 21.0M — so no country is owed a promotion.
 *
 * Re-check when a WPP revision lands, not on every corpus change: the bands
 * move on population, and Mali (25.2M) and Burkina Faso (24.1M) are the two
 * that a revision could flip.
 */
const QUOTA_100M_PLUS = 30;
const QUOTA_25M_PLUS = 20;

const QUOTAS = {
  // ≥ 100M
  NGA: QUOTA_100M_PLUS,
  COD: QUOTA_100M_PLUS,
  ETH: QUOTA_100M_PLUS,
  EGY: QUOTA_100M_PLUS,
  // ≥ 25M
  TZA: QUOTA_25M_PLUS,
  ZAF: QUOTA_25M_PLUS,
  KEN: QUOTA_25M_PLUS,
  UGA: QUOTA_25M_PLUS,
  SDN: QUOTA_25M_PLUS,
  DZA: QUOTA_25M_PLUS,
  MAR: QUOTA_25M_PLUS,
  AGO: QUOTA_25M_PLUS,
  GHA: QUOTA_25M_PLUS,
  MOZ: QUOTA_25M_PLUS,
  CIV: QUOTA_25M_PLUS,
  MDG: QUOTA_25M_PLUS,
  CMR: QUOTA_25M_PLUS,
  NER: QUOTA_25M_PLUS,
  MLI: QUOTA_25M_PLUS,
};

const quotaFor = (countryId) => QUOTAS[countryId] ?? MINIMUM_PER_COUNTRY;

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
      quota: quotaFor(countryId),
      deficit: Math.max(0, quotaFor(countryId) - entries.length),
      entries,
    });
  }

  const missing = [...knownCountries].filter(
    (id) => !Object.prototype.hasOwnProperty.call(COUNTRY_CANDIDATES, id)
  );
  if (missing.length)
    errors.push(`no candidates for: ${missing.sort().join(", ")}`);

  const total = countries.reduce((n, c) => n + c.entries.length, 0);
  const quotaTotal = countries.reduce((n, c) => n + c.quota, 0);
  const deficitTotal = countries.reduce((n, c) => n + c.deficit, 0);

  const manifest = {
    schemaVersion: 1,
    reviewStatus: "candidates_pending_verification",
    generatedBy: "scripts/afrik/buildAnthroponymCandidates.mjs",
    countryCount: countries.length,
    candidateCount: total,
    quotaTotal,
    // Not an error: the queue fills over successive waves, and this is the
    // meter that says how much of it is left.
    deficitTotal,
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
  console.log(`quota ${quotaTotal}, deficit ${deficitTotal}`);
  for (const country of countries.filter((c) => c.deficit > 0)) {
    console.log(
      `  ${country.countryId}: ${country.entries.length}/${country.quota} (+${country.deficit})`
    );
  }
  if (errors.length) process.exit(1);
}

await build();
