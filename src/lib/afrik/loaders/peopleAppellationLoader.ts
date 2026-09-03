/**
 * Derives name records from the appellations every people fiche already
 * carries, and writes them through the same sources → assertions →
 * name_records fabric the noms/ dossiers use (FR57).
 *
 * The atlas of appellations shipped reading only dataset/source/afrik/noms/,
 * a folder covering eleven peoples: seventeen rows for a corpus that names
 * 790. Each fiche's `content.appellations` block holds the autonym and the
 * exonyms already, so the gap was a missing loader, not missing editorial.
 *
 * Two decisions are worth stating because they are not the obvious ones.
 *
 * Provenance is the fiche's, not the name's. `name_records.assertion_id` is
 * NOT NULL by design — the atlas refuses to publish a name with no source —
 * and a fiche's appellations block carries no per-name citation. So a derived
 * record is anchored to the sources the fiche as a whole rests on. That is a
 * weaker claim than a noms/ dossier makes, which is exactly why the dossiers
 * are loaded after this and overwrite what they cover: a hand-sourced record
 * beats a derived one on the same (name, type) pair.
 *
 * Writes are batched per fiche rather than per name. The row-at-a-time shape
 * the dossier loader can afford for nineteen entries costs some seventeen
 * thousand round trips at four thousand, so each fiche resolves its sources,
 * its revision and its assertions in one query apiece.
 */
import { logger } from "@/lib/api/logger";
import { normalizeToKey } from "@/lib/normalize";
import { summarizeByCause } from "./defectSummary";
import {
  deriveAppellations,
  type DerivedAppellation,
} from "@/lib/afrik/parsers/appellationGrammar";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { FicheSource, People } from "@/types/afrik";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface AppellationLoadReport {
  total: number;
  inserted: number;
  /** Segments the grammar declined to read as a name, prefixed by fiche id. */
  rejected: string[];
  errors: string[];
}

// @req REQ-057
export function emptyAppellationLoadReport(): AppellationLoadReport {
  return { total: 0, inserted: 0, rejected: [], errors: [] };
}

function errorMessage(value: { message: string } | null | undefined): string {
  return value?.message ?? "unknown Supabase error";
}

/**
 * The fiche's sources, deduplicated by title: `sources.title` is the conflict
 * target, and Postgres refuses an upsert batch that hits the same row twice.
 */
function distinctSources(sources: FicheSource[] | undefined): FicheSource[] {
  const byTitle = new Map<string, FicheSource>();
  for (const source of sources ?? []) {
    if (source?.title && !byTitle.has(source.title)) {
      byTitle.set(source.title, source);
    }
  }
  return [...byTitle.values()];
}

async function resolveSourceIds(
  supabase: AdminClient,
  sources: FicheSource[]
): Promise<{ ids: string[] } | { error: string }> {
  if (sources.length === 0) {
    return { ids: [] };
  }

  const { data, error } = await supabase
    .from("sources")
    .upsert(
      sources.map((source) => ({
        title: source.title,
        url: source.url,
        // A fiche source declares neither, and inventing an author to satisfy
        // a column would be a fabricated citation.
        author: null,
        year: null,
        tier: source.tier === "needs_review" ? "unverified" : source.tier,
        notes: source.notes ?? null,
        added_at: new Date().toISOString(),
      })),
      { onConflict: "title" }
    )
    .select("id");

  if (error || !data) {
    return { error: errorMessage(error) };
  }
  return { ids: data.map((row) => row.id as string) };
}

async function resolveFicheRevisionId(
  supabase: AdminClient,
  peopleId: string
): Promise<{ id: string } | { error: string }> {
  const { data: existing, error: selectError } = await supabase
    .from("fiche_revisions")
    .select("id")
    .eq("entity_type", "people")
    .eq("entity_id", peopleId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    return { error: errorMessage(selectError) };
  }
  if (existing) {
    return { id: existing.id as string };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("fiche_revisions")
    .insert({
      entity_type: "people",
      entity_id: peopleId,
      version: 1,
      content_snapshot: {
        source: "peopleAppellationLoader",
        note: "Placeholder revision anchoring appellations derived from the people fiche; the fiche itself is canonical, not a moderation-authored revision.",
      },
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: errorMessage(insertError) };
  }
  return { id: inserted.id as string };
}

function fieldPathFor(entry: DerivedAppellation): string {
  return `names.${entry.nameType}.${normalizeToKey(entry.nameText)}`;
}

/**
 * Returns one assertion id per entry, reusing the assertions already written
 * for this fiche and inserting only what is missing.
 */
async function resolveAssertionIds(
  supabase: AdminClient,
  peopleId: string,
  entries: DerivedAppellation[],
  sourceIds: string[],
  ficheRevisionId: string
): Promise<{ byFieldPath: Map<string, string> } | { error: string }> {
  const fieldPaths = entries.map(fieldPathFor);

  const { data: existing, error: selectError } = await supabase
    .from("assertions")
    .select("id, field_path")
    .eq("entity_type", "people")
    .eq("entity_id", peopleId)
    .in("field_path", fieldPaths);

  if (selectError) {
    return { error: errorMessage(selectError) };
  }

  const byFieldPath = new Map<string, string>(
    (existing ?? []).map((row) => [row.field_path as string, row.id as string])
  );

  const missing = entries.filter(
    (entry) => !byFieldPath.has(fieldPathFor(entry))
  );
  if (missing.length === 0) {
    return { byFieldPath };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("assertions")
    .insert(
      missing.map((entry) => ({
        entity_type: "people",
        entity_id: peopleId,
        field_path: fieldPathFor(entry),
        statement: entry.nameText,
        source_ids: sourceIds,
        fiche_revision_id: ficheRevisionId,
      }))
    )
    .select("id, field_path");

  if (insertError || !inserted) {
    return { error: errorMessage(insertError) };
  }

  for (const row of inserted) {
    byFieldPath.set(row.field_path as string, row.id as string);
  }
  return { byFieldPath };
}

async function loadOneFiche(
  supabase: AdminClient,
  people: People,
  report: AppellationLoadReport
): Promise<void> {
  const { entries, rejected } = deriveAppellations({
    selfAppellation: people.content?.appellations?.selfAppellation,
    exonyms: people.content?.appellations?.exonyms,
  });

  for (const segment of rejected) {
    report.rejected.push(`${people.id}: ${segment}`);
  }
  if (entries.length === 0) {
    return;
  }
  report.total += entries.length;

  const sources = distinctSources(people.content?.sources);
  if (sources.length === 0) {
    // The assertion trigger rejects a sourceless claim, and rightly so.
    report.errors.push(`${people.id}: fiche declares no source`);
    return;
  }

  const resolvedSources = await resolveSourceIds(supabase, sources);
  if ("error" in resolvedSources) {
    report.errors.push(`${people.id}: sources — ${resolvedSources.error}`);
    return;
  }

  const revision = await resolveFicheRevisionId(supabase, people.id);
  if ("error" in revision) {
    report.errors.push(`${people.id}: fiche_revisions — ${revision.error}`);
    return;
  }

  const assertions = await resolveAssertionIds(
    supabase,
    people.id,
    entries,
    resolvedSources.ids,
    revision.id
  );
  if ("error" in assertions) {
    report.errors.push(`${people.id}: assertions — ${assertions.error}`);
    return;
  }

  const rows = entries.flatMap((entry) => {
    const assertionId = assertions.byFieldPath.get(fieldPathFor(entry));
    if (!assertionId) {
      report.errors.push(`${people.id}: no assertion for ${entry.nameText}`);
      return [];
    }

    return [
      {
        entity_type: "people",
        entity_id: people.id,
        name_text: entry.nameText,
        name_type: entry.nameType,
        language_of_origin: null,
        meaning: null,
        period_label: null,
        imposed_by: null,
        imposition_period: null,
        // The fiche explains its exonyms once, for all of them at once.
        why_problematic:
          entry.nameType === "endonym"
            ? null
            : (people.content?.appellations?.whyProblematic ?? null),
        contemporary_usage: entry.gloss,
        assertion_id: assertionId,
        sort_rank: entry.sortRank,
        updated_at: new Date().toISOString(),
      },
    ];
  });

  const { error } = await supabase
    .from("name_records")
    .upsert(rows, { onConflict: "entity_type,entity_id,name_text,name_type" });

  if (error) {
    report.errors.push(`${people.id}: name_records — ${errorMessage(error)}`);
    return;
  }

  report.inserted += rows.length;
}

// @req REQ-057
export async function loadPeopleAppellations(
  supabase: AdminClient,
  peoples: People[]
): Promise<AppellationLoadReport> {
  const report = emptyAppellationLoadReport();

  for (const people of peoples) {
    await loadOneFiche(supabase, people, report);
  }

  // The whole list, not a ten-item sample. These are the fiches a curator has
  // to open, and a sample of ten out of eighty-eight names the same handful of
  // peoples on every run while the other seventy-eight stay invisible.
  if (report.rejected.length > 0) {
    logger.warn(
      "Appellation segments the grammar declined to read as a name — fix the fiche rather than widening the grammar",
      { count: report.rejected.length, fiches: report.rejected }
    );
  }

  if (report.errors.length > 0) {
    logger.warn("Appellations the database refused", {
      count: report.errors.length,
      byCause: summarizeByCause(report.errors),
    });
  }

  return report;
}
