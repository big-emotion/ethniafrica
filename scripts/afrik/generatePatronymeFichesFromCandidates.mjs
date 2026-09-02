#!/usr/bin/env node
/**
 * Turns the anthroponym candidate queue into minimal `PAT_*` fiches.
 *
 * Wave 1 of docs/runbooks/anthroponym-coverage-plan.md. This is a generator
 * rather than an authoring pass because the transformation is deterministic:
 * the queue already holds every field a minimal fiche needs, and a script stays
 * re-runnable when the queue grows or a candidate is corrected.
 *
 * It creates coverage, not knowledge. Every generated fiche rests on a single
 * source — tier `unverified` × `source_kind: "ai_generated"`, which
 * recompute_confidence() scores at 0.2 — and declares a gap for every field the
 * queue cannot fill. Nothing here invents an etymology, a bearer, an alliance
 * or a caste; the research protocol
 * (docs/runbooks/anthroponym-fiche-research.md) is what fills those in.
 *
 * One fiche per distinct name, not per queued row: a name queued for five
 * countries becomes one fiche carrying five country attestations.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

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
const QUEUE = join(FICHES, "_candidates-by-country.json");

/**
 * The one source every generated fiche cites. Shared deliberately: the loader
 * keys sources by title and the database upserts them on it, so a per-fiche
 * variant would multiply rows describing the same origin. The per-country
 * research leads stay in the queue file, which this `notes` names.
 *
 * The key is a low-entropy slug on purpose. `generic-api-key` reads any field
 * ending in `Key` and flags values above entropy 3.5, which is how
 * `roscoe-1911-baganda` became four standing false positives in CI; a slug
 * below the threshold keeps 747 new fiches from becoming 747 more.
 */
const QUEUE_SOURCE_KEY = "afrik-candidate-queue";
const QUEUE_SOURCE = {
  sourceKey: QUEUE_SOURCE_KEY,
  title: "Corpus AFRIK — file d'attente des candidats anthroponymes",
  url: null,
  tier: "unverified",
  source_kind: "ai_generated",
  notes:
    "Origine : dataset/source/afrik/patronymes/_candidates-by-country.json, " +
    "file d'attente produite hors corpus et non vérifiée. Aucune source dédiée " +
    "n'a encore été consultée pour ce nom : la fiche existe pour la couverture, " +
    "pas pour ce qu'elle affirme. Les pistes de vérification par pays " +
    "(registres électoraux, instituts statistiques, travaux d'onomastique) sont " +
    "portées par le champ verificationLead de ce même fichier.",
};

const DIRECTIVES =
  "Fiche générée depuis la file d'attente des candidats (vague 1 du plan de " +
  "couverture anthroponymique). Elle ne porte aucune recherche : ne pas étendre " +
  "ses affirmations sans appliquer le protocole docs/runbooks/anthroponym-fiche-research.md.";

/**
 * What a name system settles on its own, and what it does not.
 *
 * `clan_name` and `totemic_clan` name a clan by definition, so the designated
 * unit follows; their mode of transmission does not, because a clan name can be
 * matrilineal (makua) as readily as patrilineal (mandingue). A non-hereditary
 * patronymic settles both: it is not transmitted, and it designates the one
 * person whose father it names — no lineage anyone belongs to. A nisba and a
 * praise name settle neither.
 */
const SYSTEM_DEFAULTS = {
  clan_name: { designatedSocialUnit: "clan", transmissionMode: null },
  totemic_clan: { designatedSocialUnit: "clan", transmissionMode: null },
  non_hereditary_patronymic: {
    designatedSocialUnit: "individual",
    transmissionMode: "non_hereditary",
  },
  nisba: { designatedSocialUnit: null, transmissionMode: null },
  praise_name: { designatedSocialUnit: null, transmissionMode: null },
};

const GENERATED_REASON =
  "Fiche générée depuis la file d'attente des candidats : le champ n'a pas été " +
  "renseigné faute de recherche, et attend le protocole de recherche par fiche.";

function deriveId(name) {
  const slug = name
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `PAT_${slug}`;
}

/** The queue rows for one name, in the order the countries appear. */
function groupByName(queue) {
  const byName = new Map();
  for (const country of queue.countries) {
    for (const entry of country.entries) {
      if (!byName.has(entry.name)) byName.set(entry.name, []);
      byName.get(entry.name).push({ ...entry, countryId: country.countryId });
    }
  }
  return byName;
}

/**
 * A name queued under two systems cannot become two fiches — `nameSystem` is
 * the discriminant of a single dossier. The most frequent value wins and the
 * disagreement is written down as a gap rather than resolved silently, because
 * which one is right is an editorial call this script is not equipped to make.
 */
function resolveNameSystem(rows) {
  const tally = new Map();
  for (const row of rows) {
    tally.set(row.nameSystem, (tally.get(row.nameSystem) ?? 0) + 1);
  }
  if (tally.size === 1)
    return { nameSystem: rows[0].nameSystem, conflict: null };

  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const detail = [...tally.keys()]
    .map(
      (system) =>
        `${system} (${rows
          .filter((r) => r.nameSystem === system)
          .map((r) => r.countryId)
          .join(", ")})`
    )
    .join(" ; ");
  return {
    nameSystem: ranked[0][0],
    conflict:
      `La file d'attente classe ce nom sous deux systèmes selon le pays — ${detail}. ` +
      `La valeur la plus fréquente (${ranked[0][0]}) a été retenue pour que la fiche existe ; ` +
      `l'arbitrage revient à la revue, et peut conclure qu'il s'agit de deux noms homographes.`,
  };
}

function buildSpellings(name, rows) {
  const attest = (countries) =>
    countries.map((countryId) => ({
      countryId,
      sourceRefs: [QUEUE_SOURCE_KEY],
    }));

  const spellings = [
    { spelling: name, attestations: attest(rows.map((r) => r.countryId)) },
  ];

  // A variant is attested only where it was queued, not everywhere the
  // canonical form is: the queue records spelling per country on purpose
  // (Jallow in Gambia is Diallo in Senegal).
  const variantCountries = new Map();
  for (const row of rows) {
    for (const variant of row.variants ?? []) {
      if (variant === name) continue;
      if (!variantCountries.has(variant)) variantCountries.set(variant, []);
      variantCountries.get(variant).push(row.countryId);
    }
  }
  for (const [variant, countries] of variantCountries) {
    spellings.push({ spelling: variant, attestations: attest(countries) });
  }
  return spellings;
}

function buildFiche(name, rows) {
  const { nameSystem, conflict } = resolveNameSystem(rows);
  const defaults = SYSTEM_DEFAULTS[nameSystem];

  const countryIds = [...new Set(rows.map((r) => r.countryId))];
  const peopleIds = [...new Set(rows.flatMap((r) => r.peopleIds ?? []))];

  const fiche = {
    _meta: {
      format: "AFRIK JSON v2",
      entity: "patronyme",
      directives: DIRECTIVES,
    },
    id: deriveId(name),
    nameMain: name,
    nameSystem,
    spellings: buildSpellings(name, rows),
    transmissionMode: defaults.transmissionMode ?? "other",
    designatedSocialUnit: defaults.designatedSocialUnit ?? "other",
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [],
    },
    peoples: peopleIds.map((peopleId) => ({
      peopleId,
      status: "attested",
      sourceRefs: [QUEUE_SOURCE_KEY],
    })),
    countries: countryIds.map((countryId) => ({
      countryId,
      status: "attested",
      sourceRefs: [QUEUE_SOURCE_KEY],
    })),
    alliances: [],
    casteOrSocialFunction: null,
    bearers: [],
    homonyms: [],
    sources: [QUEUE_SOURCE],
    gaps: [],
  };

  const gaps = [
    { fieldPath: "origin", reason: GENERATED_REASON },
    { fieldPath: "alliances", reason: GENERATED_REASON },
    { fieldPath: "casteOrSocialFunction", reason: GENERATED_REASON },
    { fieldPath: "bearers", reason: GENERATED_REASON },
    { fieldPath: "homonyms", reason: GENERATED_REASON },
  ];
  if (!defaults.transmissionMode) {
    gaps.push({
      fieldPath: "transmissionMode",
      reason:
        `Le système « ${nameSystem} » ne détermine pas à lui seul le mode de transmission : ` +
        GENERATED_REASON,
    });
  }
  if (!defaults.designatedSocialUnit) {
    gaps.push({
      fieldPath: "designatedSocialUnit",
      reason:
        `Le système « ${nameSystem} » ne détermine pas à lui seul l'unité sociale désignée : ` +
        GENERATED_REASON,
    });
  }
  if (peopleIds.length === 0) {
    gaps.push({
      fieldPath: "peoples",
      reason:
        "La file d'attente ne rattache ce nom à aucun peuple du corpus : soit le nom ne " +
        "désigne aucun groupe, soit le corpus ne porte pas de fiche pour la population " +
        "concernée. " +
        GENERATED_REASON,
    });
  }
  if (conflict) gaps.push({ fieldPath: "nameSystem", reason: conflict });

  fiche.gaps = gaps;
  return fiche;
}

/**
 * A skipped candidate must not take its country claims down with it.
 *
 * Nine of the twenty names the queue defers to a researched fiche are queued
 * for countries that fiche does not list — the Nguni batch was researched from
 * a Zimbabwe source and attests only ZWE, so Ndlovu, Mthethwa and Nxumalo, three
 * of the commonest surnames in South Africa, reached no South African page.
 * Dropping the candidate silently dropped twelve such attestations.
 *
 * The merge is additive and never rewrites research: a country the fiche
 * already claims keeps its own source, and a country only the queue claims is
 * appended citing the queue, so the weaker provenance stays visible per claim.
 * `peoples` is deliberately left alone — asserting which people bears a name is
 * an editorial claim, not a coverage one.
 */
function mergeQueuedCountries(fiche, queuedCountryIds) {
  const held = new Set((fiche.countries ?? []).map((c) => c.countryId));
  const added = queuedCountryIds.filter((id) => !held.has(id));
  if (added.length === 0) return [];

  for (const countryId of added) {
    fiche.countries.push({
      countryId,
      status: "attested",
      sourceRefs: [QUEUE_SOURCE_KEY],
    });
  }
  if (!fiche.sources.some((s) => s.sourceKey === QUEUE_SOURCE_KEY)) {
    fiche.sources.push(QUEUE_SOURCE);
  }
  return added;
}

async function main() {
  const queue = JSON.parse(readFileSync(QUEUE, "utf8"));
  const byName = groupByName(queue);

  const existingIds = new Map();
  const existingByName = new Map();
  for (const file of readdirSync(FICHES).filter((f) =>
    /^PAT_[A-Z0-9_]+\.json$/.test(f)
  )) {
    const fiche = JSON.parse(readFileSync(join(FICHES, file), "utf8"));
    // A fiche this script wrote on an earlier run cites nothing but the queue.
    // Treating those as "already present" would make the second run defer every
    // name to its own output and write nothing, so they are regenerated instead
    // — which is what makes a corrected queue propagate.
    const isGenerated = (fiche.sources ?? []).every(
      (source) => source.sourceKey === QUEUE_SOURCE_KEY
    );
    if (isGenerated) continue;
    existingIds.set(fiche.id, fiche);
    existingByName.set(fiche.nameMain.toLowerCase(), fiche.id);
  }

  const prettierConfig = await prettier.resolveConfig(QUEUE);
  const skippedResearched = [];
  const skippedWithinBatch = [];
  const conflicts = [];
  const mergedCountries = [];
  const pendingMerges = new Map();
  const generatedIds = new Map();
  let written = 0;

  for (const [name, rows] of byName) {
    const id = deriveId(name);

    // The 30 researched fiches are never overwritten. An id match is the
    // obvious case; a nameMain match under a different id (PAT_BAMBA against
    // the researched PAT_BAMBA_CLAN) is the same duplication wearing a
    // different filename, and would leave the corpus with two fiches for one
    // name, the second one empty.
    const heldBy = existingIds.has(id)
      ? id
      : existingByName.get(name.toLowerCase());
    if (heldBy) {
      skippedResearched.push(`${name} -> ${id} (deferred to ${heldBy})`);
      const target = existingIds.get(heldBy);
      const added = mergeQueuedCountries(
        target,
        rows.map((r) => r.countryId)
      );
      if (added.length) {
        mergedCountries.push(`${heldBy}: +${added.join(", ")}`);
        pendingMerges.set(heldBy, target);
      }
      continue;
    }
    if (generatedIds.has(id)) {
      skippedWithinBatch.push(
        `${name} and ${generatedIds.get(id)} both derive ${id}`
      );
      continue;
    }

    const fiche = buildFiche(name, rows);
    if (fiche.gaps.some((g) => g.fieldPath === "nameSystem")) {
      conflicts.push(`${name}: ${fiche.nameSystem} retained`);
    }

    const formatted = await prettier.format(JSON.stringify(fiche), {
      ...prettierConfig,
      parser: "json",
    });
    writeFileSync(join(FICHES, `${id}.json`), formatted, "utf8");
    generatedIds.set(id, name);
    written += 1;
  }

  for (const [id, fiche] of pendingMerges) {
    const formatted = await prettier.format(JSON.stringify(fiche), {
      ...prettierConfig,
      parser: "json",
    });
    writeFileSync(join(FICHES, `${id}.json`), formatted, "utf8");
  }

  console.log(`${byName.size} distinct names in the queue`);
  console.log(`${written} fiches written`);
  if (mergedCountries.length) {
    console.log(
      `${mergedCountries.length} researched fiches gained a queued country:\n  ` +
        mergedCountries.join("\n  ")
    );
  }
  console.log(
    `${skippedResearched.length} skipped, already researched:\n  ` +
      skippedResearched.join("\n  ")
  );
  if (skippedWithinBatch.length) {
    console.log(
      `${skippedWithinBatch.length} skipped, id collision inside the batch:\n  ` +
        skippedWithinBatch.join("\n  ")
    );
  }
  if (conflicts.length) {
    console.log(
      `${conflicts.length} nameSystem disagreements, recorded as a gap:\n  ` +
        conflicts.join("\n  ")
    );
  }
}

await main();
