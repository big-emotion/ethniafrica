#!/usr/bin/env tsx
/**
 * Writes the sources → fiche_revisions → assertions fabric for the people
 * corpus and seeds confidence_scores.
 *
 * The relation and migration loaders have done this since Epic 11; the people
 * path never did, so every people carried a confidence score of exactly 0.
 * All decision logic lives in `src/lib/afrik/loaders/peopleProvenanceLoader.ts`
 * (pure, unit tested); this file is the thin Supabase I/O shell.
 *
 * This raises confidence from zero. It does **not** make a fiche quiz-eligible:
 * FR65 also requires `last_human_audit_at`, without which the score is capped
 * at 0.80, and an audit is an editorial act no loader may forge.
 *
 * Two-step rollout, recette first — both Supabase projects label their
 * environment "production", so read the URL, not the word.
 *
 * Local DRY-RUN: with Supabase env vars missing, logs a notice and exits 0 —
 * the same convention as `scripts/generateQuizQuestions.ts`.
 */

import path from "node:path";

import { createAdminClient } from "../src/lib/supabase/admin";
import { logger } from "../src/lib/api/logger";
import {
  loadAllPeopleFiles,
  loadPeopleProvenance,
} from "../src/lib/afrik/loaders/peopleProvenanceLoader";

export async function main(): Promise<void> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    logger.warn(
      "DRY RUN: Supabase env vars missing — skipping people provenance load",
      { script: "loadPeopleProvenance" }
    );
    return;
  }

  // `--limit=N` writes the first N fiches only. A corpus-wide run touches
  // thousands of rows across four tables, so proving the write contract on a
  // handful first is cheaper than discovering a rejected column at fiche 700.
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

  const all = loadAllPeopleFiles();
  const peoples = Number.isFinite(limit) ? all.slice(0, limit) : all;

  logger.info("People provenance load starting", {
    script: "loadPeopleProvenance",
    // The host, not the word "production": both Supabase projects use it.
    target: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host,
    fiches: peoples.length,
    corpus: all.length,
  });

  const report = await loadPeopleProvenance(createAdminClient(), peoples);

  logger.info("People provenance load completed", {
    script: "loadPeopleProvenance",
    fiches: report.total,
    assertions_written: report.assertionsWritten,
    skipped_without_sources: report.skippedWithoutSources,
    error_count: report.errors.length,
  });

  if (report.errors.length > 0) {
    // Listed rather than counted: a source that failed to upsert leaves that
    // fiche without provenance, and which fiche it was is the whole point.
    logger.error("People provenance load reported errors", undefined, {
      script: "loadPeopleProvenance",
      errors: report.errors.slice(0, 50),
    });
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  main().catch((err) => {
    logger.error("loadPeopleProvenance crashed", err, {
      script: "loadPeopleProvenance",
    });
    process.exit(1);
  });
}
