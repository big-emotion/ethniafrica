/**
 * The one read on `afrik_translations`: a single record by its primary key.
 *
 * Lists, facets and search stay authored-French and never touch this table —
 * a translation row is the size of the fiche it translates, and recette's
 * free egress quota has been exhausted once already by whole-fiche reads.
 */

import { logger } from "@/lib/api/logger";
import type {
  TranslationEntityType,
  TranslationKind,
  TranslationRecord,
} from "@/lib/afrik/translations/types";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";
import { createServerClient } from "../../server";

interface TranslationRow {
  entity_type: TranslationEntityType;
  entity_id: string;
  lang: TranslationLocale;
  content: Record<string, unknown>;
  translation_kind: TranslationKind;
  translated_at: string;
  reviewed_by: string | null;
  model: string | null;
  source_hash: string;
  field_hashes: Record<string, string> | null;
  review_required: string[] | null;
}

// @req REQ-142
export async function getAfrikTranslation(
  entityType: TranslationEntityType,
  entityId: string,
  lang: TranslationLocale
): Promise<TranslationRecord | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_translations")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("lang", lang)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error(
      `Error fetching AFRIK translation ${entityType}/${entityId}/${lang}`,
      error
    );
    throw error;
  }

  if (!data) return null;

  const row = data as TranslationRow;
  return {
    entityType: row.entity_type,
    entityId: row.entity_id,
    lang: row.lang,
    content: row.content ?? {},
    translationKind: row.translation_kind,
    translatedAt: row.translated_at,
    reviewedBy: row.reviewed_by ?? undefined,
    model: row.model ?? undefined,
    sourceHash: row.source_hash,
    fieldHashes: row.field_hashes ?? {},
    reviewRequired: row.review_required ?? [],
  };
}
