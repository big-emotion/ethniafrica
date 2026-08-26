/**
 * Relation JSON loader — reads dataset/source/afrik/relations/*.json and
 * writes each record into afrik_people_relations, sources, and one
 * assertions row (entity_type='relation', field_path='record'), then seeds
 * confidence_scores via recompute_confidence. See Epic 11 Story 11.5
 * (ETNI-506, FR72, AR44).
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

import { logger } from "@/lib/api/logger";
import { parseRelationFile } from "@/lib/afrik/parsers/relationParser";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RelationRecord, RelationSource } from "@/types/relations";

const AFRIK_ROOT = join(process.cwd(), "dataset/source/afrik");

export type AdminClient = ReturnType<typeof createAdminClient>;

export interface RelationLoadReport {
  total: number;
  inserted: number;
  errors: string[];
}

function createReport(): RelationLoadReport {
  return { total: 0, inserted: 0, errors: [] };
}

function errorMessage(value: { message: string } | null | undefined): string {
  return value?.message ?? "unknown Supabase error";
}

/**
 * Reads and parses every dataset/source/afrik/relations/*.json file,
 * skipping files that fail the strict model (relationSchema via
 * parseRelationFile — see scripts/validateAfrikData.ts REL-1..REL-7).
 */
export function loadAllRelationFiles(
  datasetRoot: string = AFRIK_ROOT
): RelationRecord[] {
  const relationsDir = join(datasetRoot, "relations");
  let files: string[];
  try {
    files = readdirSync(relationsDir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const relations: RelationRecord[] = [];
  for (const file of files) {
    const fullPath = join(relationsDir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(fullPath, "utf-8"));
    } catch (error) {
      logger.error(`Failed to read relation file ${file}`, error);
      continue;
    }

    const result = parseRelationFile(raw);
    if (!result.success || !result.data) {
      logger.error(`Failed to parse relation file ${file}`, undefined, {
        errors: result.errors,
      });
      continue;
    }

    relations.push(result.data);
  }

  return relations;
}

async function upsertSource(
  supabase: AdminClient,
  source: RelationSource
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("sources")
    .upsert(
      {
        title: source.title,
        author: source.author,
        year: source.year,
        url: source.url,
        tier: source.tier,
        notes: source.notes ?? null,
        added_at: new Date().toISOString(),
      },
      { onConflict: "title" }
    )
    .select("id")
    .single();

  if (error || !data) {
    return { error: errorMessage(error) };
  }
  return { id: data.id as string };
}

/**
 * Migration 020 made `assertions.fiche_revision_id` a NOT NULL FK so every
 * assertion is traceable to a published snapshot (R-2 / ASR-4), and seeded
 * version-1 placeholder revisions for the assertions that already existed.
 * Nothing then taught the loaders to create one, so every assertion insert
 * failed against a real database. This publishes the fiche as version 1,
 * following that same precedent; the unique key (entity_type, entity_id,
 * version) makes the upsert idempotent across re-runs.
 */
async function findOrCreateFicheRevision(
  supabase: AdminClient,
  relation: RelationRecord
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("fiche_revisions")
    .upsert(
      {
        entity_type: "relation",
        entity_id: relation.id,
        version: 1,
        content_snapshot: relation,
      },
      { onConflict: "entity_type,entity_id,version" }
    )
    .select("id")
    .single();

  if (error || !data) {
    return { error: errorMessage(error) };
  }
  return { id: data.id as string };
}

/**
 * assertions has no unique constraint on (entity_type, entity_id,
 * field_path), so idempotency on re-run is enforced here via
 * select-before-write rather than a database guarantee.
 */
async function findOrCreateAssertion(
  supabase: AdminClient,
  relationId: string,
  statement: string,
  sourceIds: string[],
  ficheRevisionId: string
): Promise<{ id: string } | { error: string }> {
  const { data: existing, error: selectError } = await supabase
    .from("assertions")
    .select("id")
    .eq("entity_type", "relation")
    .eq("entity_id", relationId)
    .eq("field_path", "record")
    .maybeSingle();

  if (selectError) {
    return { error: errorMessage(selectError) };
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("assertions")
      .update({ statement, source_ids: sourceIds })
      .eq("id", existing.id);

    if (updateError) {
      return { error: errorMessage(updateError) };
    }
    return { id: existing.id as string };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("assertions")
    .insert({
      entity_type: "relation",
      entity_id: relationId,
      field_path: "record",
      statement,
      source_ids: sourceIds,
      fiche_revision_id: ficheRevisionId,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: errorMessage(insertError) };
  }
  return { id: inserted.id as string };
}

async function upsertRelationRecord(
  supabase: AdminClient,
  relation: RelationRecord,
  report: RelationLoadReport
): Promise<void> {
  report.total += 1;

  const sourceIds: string[] = [];
  for (const source of relation.sources) {
    const result = await upsertSource(supabase, source);
    if ("error" in result) {
      report.errors.push(
        `${relation.id}: source "${source.title}" — ${result.error}`
      );
      return;
    }
    sourceIds.push(result.id);
  }

  const revision = await findOrCreateFicheRevision(supabase, relation);
  if ("error" in revision) {
    report.errors.push(`${relation.id}: fiche revision — ${revision.error}`);
    return;
  }

  const assertion = await findOrCreateAssertion(
    supabase,
    relation.id,
    relation.description,
    sourceIds,
    revision.id
  );
  if ("error" in assertion) {
    report.errors.push(`${relation.id}: assertion — ${assertion.error}`);
    return;
  }

  const { error: relationError } = await supabase
    .from("afrik_people_relations")
    .upsert(
      {
        id: relation.id,
        relation_type: relation.relationType,
        people_id_a: relation.peopleIdA,
        people_id_b: relation.peopleIdB,
        direction: relation.direction,
        period_start_year: relation.period.startYear,
        period_end_year: relation.period.endYear,
        period_label: relation.period.label,
        description: relation.description,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (relationError) {
    report.errors.push(`${relation.id}: ${errorMessage(relationError)}`);
    return;
  }

  report.inserted += 1;

  // recompute_confidence is fully polymorphic across entity types (see
  // supabase/migrations/030_people_relations.sql §5 fabric audit) — no
  // automatic per-INSERT trigger exists, so the loader seeds
  // confidence_scores explicitly. A failure here does not roll back the
  // relation write; it is logged so a human can re-run the recompute job.
  const { error: confidenceError } = await supabase.rpc(
    "recompute_confidence",
    { p_entity_type: "relation", p_entity_id: relation.id }
  );
  if (confidenceError) {
    logger.warn(`recompute_confidence failed for ${relation.id}`, {
      reason: errorMessage(confidenceError),
    });
  }
}

/**
 * Loads every dataset/source/afrik/relations/*.json record and writes
 * sources → assertions → afrik_people_relations for each, seeding
 * confidence_scores via recompute_confidence (FR72, AR44).
 */
export async function loadRelations(
  supabase: AdminClient,
  relations: RelationRecord[] = loadAllRelationFiles()
): Promise<RelationLoadReport> {
  const report = createReport();

  for (const relation of relations) {
    await upsertRelationRecord(supabase, relation, report);
  }

  return report;
}
