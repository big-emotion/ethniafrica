/**
 * Persists loaded languages into `afrik_languages`, keeping the two
 * provenances distinguishable and the load idempotent.
 *
 * A CSV language is upserted with its authoritative name and written through
 * the shared Module 0 fabric (`provenanceWriter`) so its Glottolog source is
 * retrievable the same way a people's or a country's sources are. A derived
 * language cites nothing, so — exactly as an unsourced people or country fiche
 * does — it gets no assertion at all: crediting it with one would raise a
 * confidence score on the strength of a guess.
 */
import {
  emptyProvenanceReport,
  writeFicheProvenance,
  type AdminClient,
} from "@/lib/afrik/loaders/provenanceWriter";
import type { LanguageRecord } from "@/lib/afrik/loaders/languageCsvLoader";

export interface LanguageLoadReport {
  total: number;
  inserted: number;
  sourced: number;
  derived: number;
  perFamily: Record<string, number>;
  errors: string[];
}

// @req REQ-136
export function emptyLanguageLoadReport(): LanguageLoadReport {
  return {
    total: 0,
    inserted: 0,
    sourced: 0,
    derived: 0,
    perFamily: {},
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
 * Upserts every language into `afrik_languages` (keyed on its ISO 639-3 id,
 * so a second run updates rather than duplicates), then writes the sources →
 * fiche_revisions → assertions fabric for the sourced ones.
 */
// @req REQ-136
export async function loadLanguages(
  supabase: AdminClient,
  languages: LanguageRecord[]
): Promise<LanguageLoadReport> {
  const report = emptyLanguageLoadReport();
  report.total = languages.length;
  const provenanceReport = emptyProvenanceReport();

  for (const language of languages) {
    const { error } = await supabase.from("afrik_languages").upsert(
      {
        id: language.id,
        name: language.name,
        family_id: language.familyId ?? null,
        content: { nameProvenance: language.nameProvenance },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      report.errors.push(`${language.id}: ${errorMessage(error)}`);
      continue;
    }

    report.inserted += 1;
    if (language.nameProvenance === "sourced") {
      report.sourced += 1;
    } else {
      report.derived += 1;
    }
    if (language.familyId) {
      report.perFamily[language.familyId] =
        (report.perFamily[language.familyId] ?? 0) + 1;
    }

    if (language.nameProvenance === "sourced" && language.source) {
      await writeFicheProvenance(
        supabase,
        {
          entityType: "language",
          entityId: language.id,
          snapshot: language,
          rawSources: [language.source],
          targets: [{ fieldPath: "name", statement: language.name }],
        },
        provenanceReport
      );
    }
  }

  report.errors.push(...provenanceReport.errors);
  return report;
}
