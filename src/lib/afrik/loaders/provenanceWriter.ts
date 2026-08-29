/**
 * Writing the sources → fiche_revisions → assertions fabric for one fiche,
 * whatever kind of fiche it is.
 *
 * Extracted from `peopleProvenanceLoader` when countries needed the same thing.
 * Every step here is about the Module 0 fabric and none of it is about peoples:
 * what a fiche *claims* is the caller's business, and it hands the claims in as
 * `targets`. Duplicating this for a second entity type would have meant two
 * places for the idempotence rules to drift, and those rules are the reason a
 * re-run is safe.
 */

import { logger } from "@/lib/api/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { ficheSourceEntries } from "@/lib/afrik/ficheSourceLabel";
import { isSourceTier } from "@/types/sources";

export type AdminClient = ReturnType<typeof createAdminClient>;

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
  entityType: string,
  entityId: string,
  snapshot: unknown
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("fiche_revisions")
    .upsert(
      {
        entity_type: entityType,
        entity_id: entityId,
        version: 1,
        content_snapshot: snapshot,
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
  entityType: string,
  entityId: string,
  target: AssertionTarget,
  sourceIds: string[],
  ficheRevisionId: string
): Promise<{ id: string } | { error: string }> {
  const { data: existing, error: selectError } = await supabase
    .from("assertions")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
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
      entity_type: entityType,
      entity_id: entityId,
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
    const result = await upsertFicheSource(supabase, source);
    if ("error" in result) {
      report.errors.push(
        `${fiche.entityId}: source "${source.label}" — ${result.error}`
      );
      return;
    }
    sourceIds.push(result.id);
  }

  const revision = await findOrCreateFicheRevision(
    supabase,
    fiche.entityType,
    fiche.entityId,
    fiche.snapshot
  );
  if ("error" in revision) {
    report.errors.push(`${fiche.entityId}: fiche revision — ${revision.error}`);
    return;
  }

  for (const target of fiche.targets) {
    const assertion = await findOrCreateAssertion(
      supabase,
      fiche.entityType,
      fiche.entityId,
      target,
      sourceIds,
      revision.id
    );
    if ("error" in assertion) {
      report.errors.push(
        `${fiche.entityId}: assertion ${target.fieldPath} — ${assertion.error}`
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
      p_entity_type: fiche.entityType,
      p_entity_id: fiche.entityId,
    }
  );
  if (confidenceError) {
    logger.warn(`recompute_confidence failed for ${fiche.entityId}`, {
      reason: errorMessage(confidenceError),
    });
  }
}
