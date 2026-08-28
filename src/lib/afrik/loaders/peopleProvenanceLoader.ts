/**
 * People provenance loader — writes the sources → fiche_revisions →
 * assertions fabric for the people corpus, then seeds confidence_scores
 * through `recompute_confidence`.
 *
 * The relation and migration loaders have done this since Epic 11; the people
 * path never did. `migrateAfrikToDatabase` writes `afrik_peoples.content` and
 * stops there, so 803 peoples carried a confidence score of exactly 0 and the
 * quiz rejected all 17 802 of its candidates on `no_assertion`. This closes
 * that gap for peoples.
 *
 * **Source attribution is at fiche level, deliberately.** A people fiche lists
 * its sources once, for the fiche; only `content.demography.source` names a
 * source per section, and it does so in prose ("Joshua Project (2025):
 * 14 000; recensement éthiopien 2007 (CSA): 11 500") that no reliable match
 * to a structured title exists for. Attaching the fiche's whole source set to
 * each field says what the corpus says — that this claim rests on this fiche's
 * documented sources. Fuzzy-matching prose to titles would manufacture a
 * precision the corpus does not have, which is the one thing the tier policy
 * forbids.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { logger } from "@/lib/api/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { ficheSourceEntries } from "@/lib/afrik/ficheSourceLabel";
import { isSourceTier } from "@/types/sources";

const PEOPLES_ROOT = join(process.cwd(), "dataset/source/afrik/peuples");

export type AdminClient = ReturnType<typeof createAdminClient>;

export interface PeopleProvenanceReport {
  total: number;
  assertionsWritten: number;
  skippedWithoutSources: number;
  errors: string[];
}

/** One claim a fiche makes, bound to the field path the surfaces read it from. */
export interface PeopleAssertionTarget {
  fieldPath: string;
  statement: string;
}

interface CountryShare {
  country?: string;
  countryNameFr?: string;
  percentage?: number;
  population?: number;
}

export interface PeopleFiche {
  id: string;
  content?: {
    appellations?: { selfAppellation?: string };
    demography?: { distributionByCountry?: CountryShare[] };
    languages?: { mainLanguage?: string; isoCodes?: string[] };
    sources?: unknown;
    [key: string]: unknown;
  };
  languageFamilyId?: string;
  [key: string]: unknown;
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

/**
 * The country a people is principally present in — the same reduction
 * `resolveCurrentAnswer` performs for template T3, so a statement written here
 * and the staleness check that later reads it cannot disagree.
 */
function principalCountry(shares: CountryShare[] | undefined): string | null {
  if (!Array.isArray(shares) || shares.length === 0) return null;
  const largest = shares.reduce((widest, current) =>
    (current.population ?? current.percentage ?? 0) >
    (widest.population ?? widest.percentage ?? 0)
      ? current
      : widest
  );
  return nonEmpty(largest.countryNameFr) ?? nonEmpty(largest.country);
}

/**
 * The claims a fiche actually makes, among the five field paths the quiz and
 * the games read.
 *
 * A field the fiche leaves empty yields no assertion. Writing one anyway would
 * record a claim nobody made and hand `recompute_confidence` a source count
 * the fiche has not earned.
 */
// @req REQ-092
export function peopleAssertionTargets(
  people: PeopleFiche
): PeopleAssertionTarget[] {
  const content = people.content ?? {};
  const targets: PeopleAssertionTarget[] = [];

  const family = nonEmpty(people.languageFamilyId);
  if (family)
    targets.push({ fieldPath: "languageFamilyId", statement: family });

  const autonym = nonEmpty(content.appellations?.selfAppellation);
  if (autonym) {
    targets.push({
      fieldPath: "content.appellations.selfAppellation",
      statement: autonym,
    });
  }

  const country = principalCountry(content.demography?.distributionByCountry);
  if (country) {
    targets.push({
      fieldPath: "content.demography.distributionByCountry",
      statement: country,
    });
  }

  const language = nonEmpty(content.languages?.mainLanguage);
  if (language) {
    targets.push({
      fieldPath: "content.languages.mainLanguage",
      statement: language,
    });
  }

  const isoCode = nonEmpty(content.languages?.isoCodes?.[0]);
  if (isoCode) {
    targets.push({
      fieldPath: "content.languages.isoCodes",
      statement: isoCode,
    });
  }

  return targets;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "unknown error";
}

/**
 * `sources.tier` accepts the three tiers or NULL. `needs_review` is not a tier
 * and must not be stored as one: folding it onto `unverified` would state a
 * judgement nobody has made, so it goes in with no tier at all.
 */
async function upsertFicheSource(
  supabase: AdminClient,
  source: {
    label: string;
    url: string | null;
    standing: string;
    notes?: string;
  }
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("sources")
    .upsert(
      {
        title: source.label,
        url: source.url,
        tier: isSourceTier(source.standing) ? source.standing : null,
        notes: source.notes ?? null,
        added_at: new Date().toISOString(),
      },
      { onConflict: "title" }
    )
    .select("id")
    .single();

  if (error || !data) return { error: errorMessage(error) };
  return { id: data.id as string };
}

/**
 * Migration 020 made `assertions.fiche_revision_id` a NOT NULL FK, so every
 * assertion has to point at a published snapshot. The unique key
 * (entity_type, entity_id, version) keeps this idempotent across re-runs.
 */
async function findOrCreateFicheRevision(
  supabase: AdminClient,
  people: PeopleFiche
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("fiche_revisions")
    .upsert(
      {
        entity_type: "people",
        entity_id: people.id,
        version: 1,
        content_snapshot: people,
      },
      { onConflict: "entity_type,entity_id,version" }
    )
    .select("id")
    .single();

  if (error || !data) return { error: errorMessage(error) };
  return { id: data.id as string };
}

/**
 * `assertions` carries no unique constraint on (entity_type, entity_id,
 * field_path), so re-runs are made idempotent here by reading before writing —
 * the same compromise the relation loader makes.
 */
async function findOrCreateAssertion(
  supabase: AdminClient,
  peopleId: string,
  target: PeopleAssertionTarget,
  sourceIds: string[],
  ficheRevisionId: string
): Promise<{ id: string } | { error: string }> {
  const { data: existing, error: selectError } = await supabase
    .from("assertions")
    .select("id")
    .eq("entity_type", "people")
    .eq("entity_id", peopleId)
    .eq("field_path", target.fieldPath)
    .maybeSingle();

  if (selectError) return { error: errorMessage(selectError) };

  if (existing) {
    const { error: updateError } = await supabase
      .from("assertions")
      .update({ statement: target.statement, source_ids: sourceIds })
      .eq("id", existing.id);
    if (updateError) return { error: errorMessage(updateError) };
    return { id: existing.id as string };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("assertions")
    .insert({
      entity_type: "people",
      entity_id: peopleId,
      field_path: target.fieldPath,
      statement: target.statement,
      source_ids: sourceIds,
      fiche_revision_id: ficheRevisionId,
    })
    .select("id")
    .single();

  if (insertError || !inserted) return { error: errorMessage(insertError) };
  return { id: inserted.id as string };
}

async function writePeopleProvenance(
  supabase: AdminClient,
  people: PeopleFiche,
  report: PeopleProvenanceReport
): Promise<void> {
  report.total += 1;

  const ficheSources = ficheSourceEntries(
    people.content?.sources as Parameters<typeof ficheSourceEntries>[0]
  );
  if (ficheSources.length === 0) {
    // A fiche citing nothing gets no assertion. An assertion with an empty
    // source list would raise this people's confidence on the strength of
    // having claimed something, which is the opposite of what the score means.
    report.skippedWithoutSources += 1;
    return;
  }

  const sourceIds: string[] = [];
  for (const source of ficheSources) {
    const result = await upsertFicheSource(supabase, source);
    if ("error" in result) {
      report.errors.push(
        `${people.id}: source "${source.label}" — ${result.error}`
      );
      return;
    }
    sourceIds.push(result.id);
  }

  const revision = await findOrCreateFicheRevision(supabase, people);
  if ("error" in revision) {
    report.errors.push(`${people.id}: fiche revision — ${revision.error}`);
    return;
  }

  for (const target of peopleAssertionTargets(people)) {
    const assertion = await findOrCreateAssertion(
      supabase,
      people.id,
      target,
      sourceIds,
      revision.id
    );
    if ("error" in assertion) {
      report.errors.push(
        `${people.id}: assertion ${target.fieldPath} — ${assertion.error}`
      );
      continue;
    }
    report.assertionsWritten += 1;
  }

  // No per-INSERT trigger exists; the loader seeds confidence_scores itself,
  // exactly as the relation loader does. A failure is logged rather than
  // rolled back, so a human can re-run the recompute job.
  const { error: confidenceError } = await supabase.rpc(
    "recompute_confidence",
    {
      p_entity_type: "people",
      p_entity_id: people.id,
    }
  );
  if (confidenceError) {
    logger.warn(`recompute_confidence failed for ${people.id}`, {
      reason: errorMessage(confidenceError),
    });
  }
}

/** Every `dataset/source/afrik/peuples/<FLG_*>/PPL_*.json` fiche, in corpus order. */
// @req REQ-092
export function loadAllPeopleFiles(root: string = PEOPLES_ROOT): PeopleFiche[] {
  const peoples: PeopleFiche[] = [];
  for (const dir of readdirSync(root)) {
    const familyDir = join(root, dir);
    if (!statSync(familyDir).isDirectory()) continue;
    for (const file of readdirSync(familyDir)) {
      if (!file.endsWith(".json")) continue;
      const parsed = JSON.parse(
        readFileSync(join(familyDir, file), "utf-8")
      ) as PeopleFiche;
      if (parsed?.id) peoples.push(parsed);
    }
  }
  return peoples;
}

/**
 * Writes sources → fiche_revisions → assertions for every people fiche and
 * seeds confidence_scores.
 *
 * This raises confidence from zero; it does **not** make a fiche quiz-eligible
 * on its own. FR65 also requires `last_human_audit_at`, and the score is
 * capped at 0.80 without one — an audit is an editorial act and no loader may
 * forge it.
 */
// @req REQ-092
export async function loadPeopleProvenance(
  supabase: AdminClient,
  peoples: PeopleFiche[] = loadAllPeopleFiles()
): Promise<PeopleProvenanceReport> {
  const report: PeopleProvenanceReport = {
    total: 0,
    assertionsWritten: 0,
    skippedWithoutSources: 0,
    errors: [],
  };

  for (const people of peoples) {
    await writePeopleProvenance(supabase, people, report);
  }

  return report;
}
