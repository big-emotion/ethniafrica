/**
 * Translation service — the overlay read path the five single-entity
 * services share (REQ-142).
 *
 * `fr` is the authored locale: nothing is queried and the entity is handed
 * back by reference. Any other locale reads one record and overlays it under
 * the class doctrine. A read failure — the table not yet migrated on this
 * project, a timeout — degrades to the authored record with a logged error:
 * a fiche must never 500 because its translation could not be read.
 */

import { logger } from "@/lib/api/logger";
import { driftedPaths } from "@/lib/afrik/translations/hashing";
import { classifierFor } from "@/lib/afrik/translations/leafClassifier";
import { overlayTranslation } from "@/lib/afrik/translations/overlayTranslation";
import {
  modelForEntity,
  type TranslationEntityType,
  type TranslationProvenance,
  type TranslationRecord,
} from "@/lib/afrik/translations/types";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";
import { getAfrikTranslation } from "@/lib/supabase/queries/afrik/translations";

export interface Translated<T> {
  record: T;
  translation: TranslationProvenance | null;
}

/** An entity as a service returns it once a locale other than `fr` was asked for. */
export type TranslatedEntity<T> = T & {
  translation?: TranslationProvenance | null;
};

async function readRecord(
  entityType: TranslationEntityType,
  id: string,
  lang: TranslationLocale
): Promise<TranslationRecord | null> {
  try {
    return await getAfrikTranslation(entityType, id, lang);
  } catch (error) {
    logger.error(
      `Translation read failed for ${entityType}/${id}/${lang}; serving the authored record`,
      error
    );
    return null;
  }
}

// @req REQ-142
export async function withTranslation<T extends object>(
  entityType: TranslationEntityType,
  id: string,
  lang: TranslationLocale,
  authored: T
): Promise<Translated<T>> {
  if (lang === "fr") return { record: authored, translation: null };

  const record = await readRecord(entityType, id, lang);
  if (!record) return { record: authored, translation: null };

  const classify = classifierFor(
    modelForEntity(entityType, authored as Record<string, unknown>)
  );

  return {
    record: overlayTranslation(authored, record, classify),
    translation: {
      kind: record.translationKind,
      translatedAt: record.translatedAt,
      reviewedBy: record.reviewedBy ?? null,
      stale: driftedPaths(authored, record.fieldHashes, classify).length > 0,
    },
  };
}

/**
 * The shape the five services return: the authored entity itself for `fr`,
 * so every existing caller sees exactly what it saw; the overlaid entity
 * carrying its provenance for any other locale.
 */
// @req REQ-142
export async function attachTranslation<T extends object>(
  entityType: TranslationEntityType,
  id: string,
  lang: TranslationLocale,
  authored: T | null
): Promise<TranslatedEntity<T> | null> {
  if (!authored || lang === "fr") return authored;
  const { record, translation } = await withTranslation(
    entityType,
    id,
    lang,
    authored
  );
  return { ...record, translation };
}
