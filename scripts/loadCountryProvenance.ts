#!/usr/bin/env tsx
/**
 * Writes the sources → fiche_revisions → assertions fabric for the 54 country
 * fiches and seeds their confidence scores.
 *
 * `migrateAfrikToDatabase` writes `afrik_countries` rows and nothing else, so
 * before this ran there was not one assertion and not one confidence score for
 * any country — and FR66 refuses a question whose field path has no assertion
 * behind it. The country templates could not have generated a single question
 * without this, whatever the corpus held.
 *
 * All decision logic lives in `src/lib/afrik/loaders/countryProvenanceLoader.ts`
 * (pure, unit tested); this file is the thin Supabase I/O shell, exactly as
 * `loadPeopleProvenance.ts` is for peoples.
 *
 * Raising confidence is not the same as making a fiche quiz-eligible: FR65 also
 * needs at least one source at tier `official` or `referenced`, which is an
 * editorial fact no loader may invent.
 *
 * Two-step rollout, recette first — both Supabase projects label their
 * environment "production", so read the URL, not the word.
 *
 * Local DRY-RUN: with Supabase env vars missing, logs a notice and exits 0 —
 * the same convention as `scripts/generateQuizQuestions.ts`. A green exit is
 * therefore not evidence that anything ran; read the log line.
 */

import path from "node:path";

import { createAdminClient } from "../src/lib/supabase/admin";
import { logger } from "../src/lib/api/logger";
import {
  loadAllCountryFiles,
  loadCountryProvenance,
} from "../src/lib/afrik/loaders/countryProvenanceLoader";

export async function main(): Promise<void> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    logger.warn(
      "DRY RUN: Supabase env vars missing — skipping country provenance load",
      { script: "loadCountryProvenance" }
    );
    return;
  }

  const countries = loadAllCountryFiles();

  logger.info("Country provenance load starting", {
    script: "loadCountryProvenance",
    // The host, not the word "production": both Supabase projects use it.
    target: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host,
    fiches: countries.length,
  });

  const report = await loadCountryProvenance(createAdminClient(), countries);

  logger.info("Country provenance load completed", {
    script: "loadCountryProvenance",
    fiches: report.total,
    assertions_written: report.assertionsWritten,
    skipped_without_sources: report.skippedWithoutSources,
    error_count: report.errors.length,
  });

  if (report.errors.length > 0) {
    // Listed rather than counted: a source that failed to upsert leaves that
    // fiche without provenance, and which fiche it was is the whole point.
    logger.error("Country provenance load reported errors", undefined, {
      script: "loadCountryProvenance",
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
    logger.error("loadCountryProvenance crashed", err, {
      script: "loadCountryProvenance",
    });
    process.exit(1);
  });
}
