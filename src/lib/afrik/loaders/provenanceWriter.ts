/**
 * Writing the sources → fiche_revisions → assertions fabric, whatever kind of
 * fiche or record it is.
 *
 * Extracted from `peopleProvenanceLoader` when countries needed the same thing,
 * then again when the name-record, relation, migration, person and patronyme
 * loaders were found carrying five private copies of the same three writers.
 * Every step here is about the Module 0 fabric and none of it is about one
 * entity: what a record *claims* is the caller's business. One copy is the
 * point — the idempotence rules are the reason a re-run is safe, and five
 * copies were five places for them to drift.
 *
 * What genuinely differs between callers is a parameter, never a branch on the
 * entity type: which source columns a model carries, whether a revision is
 * stamped, and whether an assertion is anchored to a revision at all.
 */

import { logger } from "@/lib/api/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { ficheSourceEntries } from "@/lib/afrik/ficheSourceLabel";
import { isSourceTier } from "@/types/sources";

export type AdminClient = ReturnType<typeof createAdminClient>;

type WriteResult = { id: string } | { error: string };

/** One claim a fiche makes, bound to the field path the surfaces read it from. */
export interface AssertionTarget {
  fieldPath: string;
  statement: string;
}

export interface ProvenanceReport {
  total: number;
  assertionsWritten: number;
  skippedWithoutSources: number;
  errors: string[];
}

// @req REQ-121
export function emptyProvenanceReport(): ProvenanceReport {
  return {
    total: 0,
    assertionsWritten: 0,
    skippedWithoutSources: 0,
    errors: [],
  };
}

/**
 * Reads the message off a PostgREST error, a thrown Error, or nothing at all.
 * PostgREST can answer with neither data nor error, which is why a fallback
 * exists rather than a non-null assertion.
 */
// @req REQ-121
export function supabaseErrorMessage(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }
  return value instanceof Error ? value.message : "unknown Supabase error";
}

/** A `sources` row exactly as one fiche model maps it; `title` is the key. */
export type SourceRow = { title: string } & Record<string, unknown>;

/**
 * Upserts on `title`, adding only `added_at`. The caller owns the column list
 * on purpose: an upsert leaves a column it does not send untouched, so a model
 * with no author field must not send `author: null` over the author another
 * model recorded for the same title.
 */
// @req REQ-121
export async function upsertSource(
  supabase: AdminClient,
  row: SourceRow
): Promise<WriteResult> {
  const { data, error } = await supabase
    .from("sources")
    .upsert(
      { ...row, added_at: new Date().toISOString() },
      { onConflict: "title" }
    )
    .select("id")
    .single();

  if (error || !data) return { error: supabaseErrorMessage(error) };
  return { id: data.id as string };
}

export interface VersionOneRevision {
  entityType: string;
  entityId: string;
  /** Stored verbatim as the snapshot the assertions point at. */
  snapshot: unknown;
  /**
   * The patronyme loader stamps `published_at` on every run; the others leave
   * the column to whatever the row already holds. Kept apart rather than
   * unified because unifying would rewrite existing rows either way.
   */
  stampPublishedAt?: boolean;
}

/**
 * Migration 020 made `assertions.fiche_revision_id` a NOT NULL FK so every
 * assertion is traceable to a published snapshot, and seeded version-1
 * placeholders for the assertions that already existed. Nothing then taught
 * the loaders to create one, so every assertion insert failed against a real
 * database. This publishes the record as version 1 on that same precedent; the
 * unique key (entity_type, entity_id, version) keeps it idempotent.
 */
// @req REQ-121
export async function upsertVersionOneRevision(
  supabase: AdminClient,
  revision: VersionOneRevision
): Promise<WriteResult> {
  const { data, error } = await supabase
    .from("fiche_revisions")
    .upsert(
      {
        entity_type: revision.entityType,
        entity_id: revision.entityId,
        version: 1,
        content_snapshot: revision.snapshot,
        ...(revision.stampPublishedAt
          ? { published_at: new Date().toISOString() }
          : {}),
      },
      { onConflict: "entity_type,entity_id,version" }
    )
    .select("id")
    .single();

  if (error || !data) return { error: supabaseErrorMessage(error) };
  return { id: data.id as string };
}

/**
 * For a record that annotates an entity rather than being one — a name dossier
 * attached to a people, say. That entity's revisions belong to moderation
 * (migration 051), so this attaches to the latest one and only stands up a
 * version-1 placeholder when none exists. Upserting version 1 instead would
 * overwrite a moderated snapshot with the placeholder.
 */
// @req REQ-121
export async function findLatestOrCreatePlaceholderRevision(
  supabase: AdminClient,
  entityType: string,
  entityId: string,
  placeholderSnapshot: unknown
): Promise<WriteResult> {
  const { data: existing, error: selectError } = await supabase
    .from("fiche_revisions")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) return { error: supabaseErrorMessage(selectError) };
  if (existing) return { id: existing.id as string };

  const { data: inserted, error: insertError } = await supabase
    .from("fiche_revisions")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      version: 1,
      content_snapshot: placeholderSnapshot,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: supabaseErrorMessage(insertError) };
  }
  return { id: inserted.id as string };
}

export interface AssertionWrite {
  entityType: string;
  entityId: string;
  fieldPath: string;
  statement: string;
  sourceIds: string[];
  /**
   * `null` sends no revision at all. Only the person loader does this, and the
   * column has been NOT NULL since migration 020 — it is a defect carried over
   * unchanged, not a supported mode.
   */
  ficheRevisionId: string | null;
}

/**
 * `assertions` carries no unique constraint on (entity_type, entity_id,
 * field_path), so re-runs are made idempotent by reading before writing. An
 * existing assertion keeps the revision it was first anchored to.
 */
// @req REQ-121
export async function findOrCreateAssertion(
  supabase: AdminClient,
  assertion: AssertionWrite
): Promise<WriteResult> {
  const { data: existing, error: selectError } = await supabase
    .from("assertions")
    .select("id")
    .eq("entity_type", assertion.entityType)
    .eq("entity_id", assertion.entityId)
    .eq("field_path", assertion.fieldPath)
    .maybeSingle();

  if (selectError) return { error: supabaseErrorMessage(selectError) };

  if (existing) {
    const { error: updateError } = await supabase
      .from("assertions")
      .update({
        statement: assertion.statement,
        source_ids: assertion.sourceIds,
      })
      .eq("id", existing.id);
    if (updateError) return { error: supabaseErrorMessage(updateError) };
    return { id: existing.id as string };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("assertions")
    .insert({
      entity_type: assertion.entityType,
      entity_id: assertion.entityId,
      field_path: assertion.fieldPath,
      statement: assertion.statement,
      source_ids: assertion.sourceIds,
      ...(assertion.ficheRevisionId === null
        ? {}
        : { fiche_revision_id: assertion.ficheRevisionId }),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: supabaseErrorMessage(insertError) };
  }
  return { id: inserted.id as string };
}

/**
 * `recompute_confidence` is polymorphic across entity types and no per-INSERT
 * trigger calls it, so the loaders seed `confidence_scores` themselves. A
 * failure is logged rather than rolled back, so a human can re-run the job.
 */
// @req REQ-121
export async function reseedConfidence(
  supabase: AdminClient,
  entityType: string,
  entityId: string
): Promise<void> {
  const { error } = await supabase.rpc("recompute_confidence", {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) {
    logger.warn(`recompute_confidence failed for ${entityId}`, {
      reason: supabaseErrorMessage(error),
    });
  }
}

export interface FicheProvenance {
  entityType: string;
  entityId: string;
  /** Stored verbatim as the revision snapshot the assertions point at. */
  snapshot: unknown;
  /** `content.sources`, in whatever shape the fiche model writes it. */
  rawSources: unknown;
  targets: AssertionTarget[];
}

/**
 * Writes one fiche's sources, revision and assertions, then reseeds its
 * confidence score.
 *
 * A fiche citing nothing gets no assertion at all: an assertion with an empty
 * source list would raise the subject's confidence on the strength of having
 * claimed something, which is the opposite of what the score means.
 */
// @req REQ-121
export async function writeFicheProvenance(
  supabase: AdminClient,
  fiche: FicheProvenance,
  report: ProvenanceReport
): Promise<void> {
  report.total += 1;

  const sources = ficheSourceEntries(
    fiche.rawSources as Parameters<typeof ficheSourceEntries>[0]
  );
  if (sources.length === 0) {
    report.skippedWithoutSources += 1;
    return;
  }

  const sourceIds: string[] = [];
  for (const source of sources) {
    // `needs_review` is not a tier and must not be stored as one: folding it
    // onto `unverified` would state a judgement nobody has made.
    const result = await upsertSource(supabase, {
      title: source.label,
      url: source.url,
      tier: isSourceTier(source.standing) ? source.standing : null,
      notes: source.notes ?? null,
    });
    if ("error" in result) {
      report.errors.push(
        `${fiche.entityId}: source "${source.label}" — ${result.error}`
      );
      return;
    }
    sourceIds.push(result.id);
  }

  const revision = await upsertVersionOneRevision(supabase, {
    entityType: fiche.entityType,
    entityId: fiche.entityId,
    snapshot: fiche.snapshot,
  });
  if ("error" in revision) {
    report.errors.push(`${fiche.entityId}: fiche revision — ${revision.error}`);
    return;
  }

  for (const target of fiche.targets) {
    const assertion = await findOrCreateAssertion(supabase, {
      entityType: fiche.entityType,
      entityId: fiche.entityId,
      fieldPath: target.fieldPath,
      statement: target.statement,
      sourceIds,
      ficheRevisionId: revision.id,
    });
    if ("error" in assertion) {
      report.errors.push(
        `${fiche.entityId}: assertion ${target.fieldPath} — ${assertion.error}`
      );
      continue;
    }
    report.assertionsWritten += 1;
  }

  await reseedConfidence(supabase, fiche.entityType, fiche.entityId);
}
