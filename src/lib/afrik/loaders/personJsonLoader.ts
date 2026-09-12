/**
 * Person JSON loader — reads dataset/source/afrik/personnes/*.json and writes
 * each fiche's sources, assertion and person row (plus its people/country
 * joins) into the Module 0 fabric + persons schema (ARCH-018, migration 057).
 * See ETNI-1382/ETNI-1586.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

import { logger } from "@/lib/api/logger";
import { parsePersonFile } from "@/lib/afrik/parsers/personParser";
import {
  findOrCreateAssertion,
  supabaseErrorMessage,
  upsertSource,
} from "@/lib/afrik/loaders/provenanceWriter";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PersonDossier } from "@/types/persons";

const AFRIK_ROOT = join(process.cwd(), "dataset/source/afrik");

export type AdminClient = ReturnType<typeof createAdminClient>;

export interface PersonLoadReport {
  total: number;
  inserted: number;
  dropped: string[];
  errors: string[];
}

function createReport(): PersonLoadReport {
  return { total: 0, inserted: 0, dropped: [], errors: [] };
}

function isIllustrative(raw: unknown): boolean {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { _meta?: { illustrative?: boolean } })._meta?.illustrative === true
  );
}

/**
 * Reads and parses every dataset/source/afrik/personnes/*.json fiche,
 * skipping illustrative fixtures and files that fail the strict model.
 * `datasetRoot` is the AFRIK dataset root (parent of `personnes/`), matching
 * the convention of loadAllNameRecordDossiers.
 */
// @req REQ-137
export function loadAllPersonDossiers(
  datasetRoot: string = AFRIK_ROOT
): PersonDossier[] {
  const personnesDir = join(datasetRoot, "personnes");
  let files: string[];
  try {
    files = readdirSync(personnesDir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const dossiers: PersonDossier[] = [];
  for (const file of files) {
    const fullPath = join(personnesDir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(fullPath, "utf-8"));
    } catch (error) {
      logger.error(`Failed to read person file ${file}`, error);
      continue;
    }

    if (isIllustrative(raw)) {
      continue;
    }

    const result = parsePersonFile(raw);
    if (!result.success || !result.data) {
      logger.error(`Failed to parse person file ${file}`, undefined, {
        errors: result.errors,
      });
      continue;
    }

    dossiers.push(result.data);
  }

  return dossiers;
}

async function writePersonPeoplesJoins(
  supabase: AdminClient,
  dossier: PersonDossier
): Promise<{ error: string } | null> {
  for (const link of dossier.peopleLinks) {
    const { error } = await supabase.from("person_peoples").upsert(
      {
        person_id: dossier.id,
        people_id: link.peopleId,
        relation_label: link.relationLabel,
      },
      { onConflict: "person_id,people_id" }
    );
    if (error) {
      return { error: supabaseErrorMessage(error) };
    }
  }
  return null;
}

async function writePersonCountriesJoins(
  supabase: AdminClient,
  dossier: PersonDossier
): Promise<{ error: string } | null> {
  for (const countryId of dossier.countryIds) {
    const { error } = await supabase
      .from("person_countries")
      .upsert(
        { person_id: dossier.id, country_id: countryId },
        { onConflict: "person_id,country_id" }
      );
    if (error) {
      return { error: supabaseErrorMessage(error) };
    }
  }
  return null;
}

async function upsertPersonDossier(
  supabase: AdminClient,
  dossier: PersonDossier,
  report: PersonLoadReport
): Promise<void> {
  report.total += 1;

  const sourceIds: string[] = [];
  for (const source of dossier.sources) {
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
        `${dossier.id}: source "${source.title}" — ${result.error}`
      );
      return;
    }
    sourceIds.push(result.id);
  }

  // No revision is written for a person, so the assertion carries none. The
  // column is NOT NULL since migration 020; this is a known defect kept as-is
  // by the writer consolidation, not a mode to copy.
  const assertion = await findOrCreateAssertion(supabase, {
    entityType: "person",
    entityId: dossier.id,
    fieldPath: "person",
    statement: dossier.fullName,
    sourceIds,
    ficheRevisionId: null,
  });
  if ("error" in assertion) {
    report.errors.push(`${dossier.id}: assertion — ${assertion.error}`);
    return;
  }

  const { error: personError } = await supabase.from("persons").upsert(
    {
      id: dossier.id,
      full_name: dossier.fullName,
      role_category: dossier.roleCategory,
      assertion_id: assertion.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (personError) {
    const reason = supabaseErrorMessage(personError);
    logger.warn(`persons row rejected for ${dossier.id}`, { reason });
    report.dropped.push(`${dossier.id}: ${reason}`);
    return;
  }

  const peoplesError = await writePersonPeoplesJoins(supabase, dossier);
  if (peoplesError) {
    report.errors.push(`${dossier.id}: person_peoples — ${peoplesError.error}`);
    return;
  }

  const countriesError = await writePersonCountriesJoins(supabase, dossier);
  if (countriesError) {
    report.errors.push(
      `${dossier.id}: person_countries — ${countriesError.error}`
    );
    return;
  }

  report.inserted += 1;
}

/**
 * Loads every non-illustrative dataset/source/afrik/personnes/*.json fiche
 * and writes sources -> assertion -> persons + person_peoples +
 * person_countries for each (ARCH-018, Module 0 fabric). Trigger rejections
 * (sourceless assertions, defense in depth against enforce_person_sources())
 * are logged and skipped; remaining fiches still load.
 */
// @req REQ-137
export async function loadPersons(
  supabase: AdminClient,
  dossiers: PersonDossier[] = loadAllPersonDossiers()
): Promise<PersonLoadReport> {
  const report = createReport();

  for (const dossier of dossiers) {
    await upsertPersonDossier(supabase, dossier, report);
  }

  return report;
}
