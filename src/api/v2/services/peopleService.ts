/**
 * People Service - Business logic for peoples
 */

import {
  getAfrikPeopleById,
  getAfrikPeoplesByIds,
  getAfrikPeoplesByLanguageFamily,
  getPaginatedAfrikPeoples,
} from "@/lib/supabase/queries/afrik/peoples";
import type { PeopleQueryFilters } from "@/lib/supabase/queries/afrik/peoples";
import { logger } from "@/lib/api/logger";
import { createServerClient } from "@/lib/supabase/server";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";
import type { PeopleNameIndexEntry } from "@/lib/people/associatedPeopleLinks";
import type { People } from "@/types/afrik";
import type { PaginatedResult } from "./countryService";
import { attachTranslation, type TranslatedEntity } from "./translations";

/**
 * Get paginated list of peoples
 */
// @req REQ-033
export async function getPeoples(
  page: number = 1,
  perPage: number = 20,
  filters: PeopleQueryFilters = {}
): Promise<PaginatedResult<People>> {
  return getPaginatedAfrikPeoples(page, perPage, filters);
}

/**
 * Get a single people by PPL_ ID
 * Note: Individual items use direct query for now (less critical than lists)
 *
 * `lang` other than the authored `fr` overlays the translation record and
 * carries its provenance on the entity (REQ-142).
 */
// @req REQ-019
// @req REQ-142
export async function getPeopleById(
  id: string,
  lang: TranslationLocale = "fr"
): Promise<TranslatedEntity<People> | null> {
  return attachTranslation("people", id, lang, await getAfrikPeopleById(id));
}

/**
 * Get peoples by language family
 * Note: Filtered queries use direct query for now (less critical than lists)
 */
// @req REQ-019
export async function getPeoplesByLanguageFamily(
  familyId: string
): Promise<People[]> {
  return await getAfrikPeoplesByLanguageFamily(familyId);
}

/**
 * Get the named peoples regardless of the family they carry.
 *
 * The family fiche resolves a macro-family's declared `associatedPeoples`
 * through this: those peoples carry a sub-family's id, so the by-family query
 * never reaches them (REQ-116).
 */
// @req REQ-116
export async function getPeoplesByIds(
  peopleIds: readonly string[]
): Promise<People[]> {
  return await getAfrikPeoplesByIds(peopleIds);
}

/**
 * Upper bound of the name index read.
 *
 * PostgREST caps an unbounded select at 1000 rows and reports no error, so an
 * unranged index would truncate the moment the corpus — 776 peoples today —
 * crossed that line, and the only symptom would be links quietly disappearing
 * from fiches. Ranged far above the corpus so that growth stays visible.
 */
const PEOPLE_NAME_INDEX_CEILING = 5000;

/**
 * Every people's id and main name, so a fiche can resolve a group it names in
 * prose to the fiche the corpus holds for it (REQ-150).
 *
 * `name_main` only. The appellation variants weigh 974 KB across the corpus,
 * and their exonyms are prose-tailed and self-referential — the Shona fiche
 * lists "Karanga (pour le sous-groupe dominant du plateau)" among its own
 * exonyms — so indexing them would make fiches resolve to themselves and to
 * each other wrongly. Id plus `name_main` is 14.1 KB for 776 rows.
 *
 * Server-only: the browser never reads the corpus from Supabase.
 */
// @req REQ-150
export async function getPeopleNameIndex(): Promise<PeopleNameIndexEntry[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_peoples")
    .select("id, name_main")
    .range(0, PEOPLE_NAME_INDEX_CEILING - 1);

  if (error) {
    // The caller renders its chips as plain text without an index, so a failed
    // read costs links rather than the chapter around them.
    logger.error("Error fetching the people name index", error);
    return [];
  }

  const index: PeopleNameIndexEntry[] = [];
  for (const row of (data ?? []) as Array<{
    id: string;
    name_main: string | null;
  }>) {
    const nameMain = row.name_main?.trim();
    // An entry with no name can never match anything a fiche mentions.
    if (!nameMain) continue;
    index.push({ id: row.id, nameMain });
  }
  return index;
}
