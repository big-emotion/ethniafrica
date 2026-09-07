/**
 * Builds the locale-specific corpus consumed by the quiz sweep.
 *
 * French uses the authored database rows unchanged. Another locale admits an
 * entity only when its translation record exists and has not drifted, then
 * applies the same translation-class overlay as the public fiche services.
 * This prevents an incomplete English corpus from silently producing French
 * questions in an English bank.
 */

import { driftedPaths } from "@/lib/afrik/translations/hashing";
import { classifierFor } from "@/lib/afrik/translations/leafClassifier";
import { overlayTranslation } from "@/lib/afrik/translations/overlayTranslation";
import type {
  TranslationEntityType,
  TranslationKind,
  TranslationRecord,
} from "@/lib/afrik/translations/types";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";

import type { CountryRow, PeopleRow } from "./quizFicheAdapter";

export interface QuizTranslationRow {
  entity_type: Extract<TranslationEntityType, "people" | "country">;
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

function asTranslationRecord(row: QuizTranslationRow): TranslationRecord {
  return {
    entityType: row.entity_type,
    entityId: row.entity_id,
    lang: row.lang,
    content: row.content,
    translationKind: row.translation_kind,
    translatedAt: row.translated_at,
    reviewedBy: row.reviewed_by ?? undefined,
    model: row.model ?? undefined,
    sourceHash: row.source_hash,
    fieldHashes: row.field_hashes ?? {},
    reviewRequired: row.review_required ?? [],
  };
}

function translationById(
  translations: QuizTranslationRow[],
  entityType: QuizTranslationRow["entity_type"],
  locale: TranslationLocale
) {
  return new Map(
    translations
      .filter((row) => row.entity_type === entityType && row.lang === locale)
      .map((row) => [row.entity_id, asTranslationRecord(row)])
  );
}

interface AuthoredPeopleRecord {
  id: string;
  nameMain: string;
  languageFamilyId: string | null;
  content: PeopleRow["content"];
}

// @req REQ-145
export function localizePeopleRows(
  rows: PeopleRow[],
  translations: QuizTranslationRow[],
  locale: TranslationLocale
): PeopleRow[] {
  if (locale === "fr") return rows;

  const byId = translationById(translations, "people", locale);
  const classify = classifierFor("modele-peuple.json");
  const localized: PeopleRow[] = [];

  for (const row of rows) {
    const record = byId.get(row.id);
    if (!record) continue;

    const authored: AuthoredPeopleRecord = {
      id: row.id,
      nameMain: row.name_main,
      languageFamilyId: row.language_family_id,
      content: row.content,
    };
    if (driftedPaths(authored, record.fieldHashes, classify).length > 0) {
      continue;
    }

    const overlaid = overlayTranslation(authored, record, classify);
    let content = overlaid.content;
    // T12 interprets whether an exonym is harmful or inaccurate. That field is
    // review-required and the public overlay keeps its French source for a
    // machine-only record; disable the template instead of leaking French.
    if (record.translationKind === "machine") {
      content = {
        ...content,
        appellations: {
          ...content?.appellations,
          whyProblematic: null,
        },
      };
    }

    localized.push({
      id: overlaid.id,
      name_main: overlaid.nameMain,
      language_family_id: overlaid.languageFamilyId,
      content,
    });
  }

  return localized;
}

interface AuthoredCountryRecord {
  id: string;
  nameFr: string;
  nameEn?: string | null;
  nameOfficial?: string | null;
  etymology: string | null;
  nameOriginActor: string | null;
  content: CountryRow["content"];
}

// @req REQ-145
export function localizeCountryRows(
  rows: CountryRow[],
  translations: QuizTranslationRow[],
  locale: TranslationLocale
): CountryRow[] {
  if (locale === "fr") return rows;

  const byId = translationById(translations, "country", locale);
  const classify = classifierFor("modele-pays.json");
  const localized: CountryRow[] = [];

  for (const row of rows) {
    const record = byId.get(row.id);
    if (!record || !row.name_en) continue;

    const authored: AuthoredCountryRecord = {
      id: row.id,
      nameFr: row.name_fr,
      nameEn: row.name_en,
      nameOfficial: row.name_official,
      etymology: row.etymology,
      nameOriginActor: row.name_origin_actor,
      content: row.content,
    };
    if (driftedPaths(authored, record.fieldHashes, classify).length > 0) {
      continue;
    }

    const overlaid = overlayTranslation(authored, record, classify);
    let etymology = overlaid.etymology;
    let content = overlaid.content;
    // T13 and T16 read review-required naming claims. The public overlay keeps
    // French for machine-only translations, which is unsuitable for an
    // English quiz bank, so those candidates are made unavailable.
    if (record.translationKind === "machine") {
      etymology = null;
      content = { ...content, kingdoms: [] };
    }

    localized.push({
      id: overlaid.id,
      name_fr: overlaid.nameEn,
      name_en: overlaid.nameEn,
      name_official: overlaid.nameOfficial,
      etymology,
      name_origin_actor: overlaid.nameOriginActor,
      content,
    });
  }

  return localized;
}
