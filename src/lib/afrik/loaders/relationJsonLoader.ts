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
import {
  findOrCreateAssertion,
  reseedConfidence,
  supabaseErrorMessage,
  upsertSource,
  upsertVersionOneRevision,
} from "@/lib/afrik/loaders/provenanceWriter";
import { createAdminClient } from "@/lib/supabase/admin";
import { sweepInParallel } from "@/lib/parallelSweep";
import type { RelationRecord } from "@/types/relations";

/**
 * How many relations are written at once.
 *
 * Each relation costs one round trip per cited source plus a revision, an
 * assertion, the relation row and a confidence recompute — 1 556 relations in a
 * `for` loop was several thousand calls end to end.
 *
 * Unlike the appellation stage, this one needs no lock ordering: sources are
 * upserted one row per statement, so a transaction never holds two source locks
 * at once and two relations citing the same pair cannot deadlock.
 *
 * @req REQ-032
 */
export const RELATION_LANES = 8;

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

/**
 * Reads and parses every dataset/source/afrik/relations/*.json file,
 * skipping files that fail the strict model (relationSchema via
 * parseRelationFile — see scripts/validateAfrikData.ts REL-1..REL-7).
 */
// @req REQ-032
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

async function upsertRelationRecord(
  supabase: AdminClient,
  relation: RelationRecord,
  report: RelationLoadReport
): Promise<void> {
  report.total += 1;

  const sourceIds: string[] = [];
  for (const source of relation.sources) {
    const result = await upsertSource(supabase, {
      title: source.title,
      author: source.author,
      year: source.year,
      url: source.url,
      tier: source.tier,
      notes: source.notes ?? null,
    });
    if ("error" in result) {
      report.errors.push(
        `${relation.id}: source "${source.title}" — ${result.error}`
      );
      return;
    }
    sourceIds.push(result.id);
  }

  const revision = await upsertVersionOneRevision(supabase, {
    entityType: "relation",
    entityId: relation.id,
    snapshot: relation,
  });
  if ("error" in revision) {
    report.errors.push(`${relation.id}: fiche revision — ${revision.error}`);
    return;
  }

  const assertion = await findOrCreateAssertion(supabase, {
    entityType: "relation",
    entityId: relation.id,
    fieldPath: "record",
    statement: relation.description,
    sourceIds,
    ficheRevisionId: revision.id,
  });
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
    report.errors.push(
      `${relation.id}: ${supabaseErrorMessage(relationError)}`
    );
    return;
  }

  report.inserted += 1;

  // Reseeded only once the relation row exists (see migration 030 §5), so a
  // rejected relation never gets a score for a record that is not there.
  await reseedConfidence(supabase, "relation", relation.id);
}

/**
 * Loads every dataset/source/afrik/relations/*.json record and writes
 * sources → assertions → afrik_people_relations for each, seeding
 * confidence_scores via recompute_confidence (FR72, AR44).
 */
// @req REQ-032
export async function loadRelations(
  supabase: AdminClient,
  relations: RelationRecord[] = loadAllRelationFiles()
): Promise<RelationLoadReport> {
  const report = createReport();

  const outcomes = await sweepInParallel(
    relations,
    RELATION_LANES,
    (relation) => upsertRelationRecord(supabase, relation, report)
  );

  outcomes.forEach((outcome, index) => {
    if (outcome instanceof Error) {
      report.errors.push(`${relations[index].id}: ${outcome.message}`);
    }
  });

  // Lanes settle in whatever order the database answers; the report is read and
  // diffed by hand, so it is ordered by relation rather than by luck.
  report.errors.sort();

  return report;
}
