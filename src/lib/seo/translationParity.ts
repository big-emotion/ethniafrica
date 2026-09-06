import type { FicheKind } from "@/lib/seo/ficheCanonical";
import type { TranslationEntityType } from "@/lib/afrik/translations/types";
import {
  getAfrikTranslation,
  getAfrikTranslationIds,
} from "@/lib/supabase/queries/afrik/translations";
import type { Language } from "@/types/shared";

/**
 * The locale the corpus is written in. A fiche always exists in it; every
 * other locale needs a translation record before the fiche counts as
 * existing there.
 */
// @req REQ-141
export const CORPUS_LOCALE: Language = "fr";

const TRANSLATION_ENTITY_BY_FICHE: Record<FicheKind, TranslationEntityType> = {
  country: "country",
  people: "people",
  family: "language_family",
  language: "language",
  name: "patronyme",
  peopleLinks: "people",
};

/** Whether a fiche has authored content in a locale. */
// @req REQ-141
export async function ficheHasTranslation(
  kind: FicheKind,
  id: string,
  lang: Language
): Promise<boolean> {
  if (lang === CORPUS_LOCALE) return true;

  return (
    (await getAfrikTranslation(TRANSLATION_ENTITY_BY_FICHE[kind], id, lang)) !==
    null
  );
}

/** Filter a fiche class with one store read, for the sitemap. */
// @req REQ-141
// @req REQ-142
export async function ficheIdsWithTranslation(
  kind: FicheKind,
  ids: readonly string[],
  lang: Language
): Promise<string[]> {
  if (lang === CORPUS_LOCALE) return [...ids];

  const translated = new Set(
    await getAfrikTranslationIds(TRANSLATION_ENTITY_BY_FICHE[kind], lang)
  );
  return ids.filter((id) => translated.has(id));
}
