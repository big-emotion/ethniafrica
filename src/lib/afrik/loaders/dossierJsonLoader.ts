/**
 * Dossier JSON loader — reads dataset/source/afrik/dossiers/*.json, validates
 * each fiche against the strict model, then upserts it into afrik_dossiers.
 *
 * Simpler than the patronyme loader by one whole axis: a dossier has no
 * normalized lookup tables and no reference graph into the rest of the corpus,
 * so there is nothing to link and nothing to resolve. Everything a page renders
 * travels in `content`, which is why migration 082 pulls only three
 * discriminants out of it.
 *
 * A fiche that fails the parser is reported and skipped, never partially
 * loaded. Half a dossier is worse than none: the missing half is always the
 * counter-reading, because it is the one the model puts last.
 */
import { logger } from "@/lib/api/logger";
import type { Dossier } from "@/lib/afrik/parsers/dossierTypes";
import { readDossierCorpus } from "@/lib/dossiers/corpus";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface DossierBatch {
  dossiers: Dossier[];
  errors: string[];
}

export interface DossierLoadReport {
  total: number;
  inserted: number;
  chapters: number;
  errors: string[];
}

interface DossierLoadOptions {
  dryRun?: boolean;
}

// @req REQ-114
export function loadAllDossiers(): DossierBatch {
  return readDossierCorpus();
}

// @req REQ-114
export async function loadDossiers(
  supabase: AdminClient,
  batch: DossierBatch,
  options: DossierLoadOptions = {}
): Promise<DossierLoadReport> {
  const report: DossierLoadReport = {
    total: batch.dossiers.length,
    inserted: 0,
    chapters: 0,
    errors: [...batch.errors],
  };

  if (options.dryRun) {
    report.chapters = batch.dossiers.reduce(
      (count, dossier) => count + dossier.chapters.length,
      0
    );
    return report;
  }

  for (const dossier of batch.dossiers) {
    const { error } = await supabase.from("afrik_dossiers").upsert(
      {
        id: dossier.id,
        vertical: dossier.vertical,
        slug: dossier.slug,
        published_on: dossier.publishedOn,
        content: {
          title: dossier.title,
          question: dossier.question,
          standfirst: dossier.standfirst,
          thesis: dossier.thesis,
          chapters: dossier.chapters,
          sources: dossier.sources,
          gaps: dossier.gaps,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      // Surfaced rather than swallowed: a PostgREST error eaten here reads
      // downstream as an empty corpus, which is a failure mode this repo has
      // already paid for once.
      report.errors.push(`${dossier.id}: ${error.message}`);
      logger.error("afrik dossier upsert failed", {
        dossierId: dossier.id,
        message: error.message,
      });
      continue;
    }

    report.inserted += 1;
    report.chapters += dossier.chapters.length;
  }

  return report;
}
