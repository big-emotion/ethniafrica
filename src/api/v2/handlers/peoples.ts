/**
 * Peoples Handler - API handlers for peoples
 */

import { pageNumberedListEnvelope } from "@/api/v2/handlers/listEnvelope";
import { getPeoples, getPeopleById } from "../services/peopleService";
import {
  getPatronymesBorneByPeople,
  type PatronymeLinkSummary,
} from "../services/patronymeFicheLinks";
import type { PeopleQueryFilters } from "@/lib/supabase/queries/afrik/peoples";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";
import type { People } from "@/types/afrik";
import { createApiResponse, type ApiEnvelope } from "../utils/response";

/**
 * A people, with the fifth corpus dimension attached.
 *
 * The key is `patronymes` and not `names` because this resource already
 * publishes a `names` dossier at `/api/v2/peoples/{id}/names` — the ethnonyms,
 * what the people is *called*. These are the names its members *bear*, which
 * migration 053 deliberately calls patronymes for exactly this reason.
 */
export interface PeopleWithPatronymes extends People {
  patronymes: PatronymeLinkSummary[];
}

/**
 * List peoples with pagination
 */
// @req REQ-084
export async function listPeoplesHandler(
  page?: number,
  perPage?: number,
  filters: PeopleQueryFilters = {}
): Promise<ApiEnvelope<People[]>> {
  const { data, total } = await getPeoples(page, perPage, filters);
  return pageNumberedListEnvelope(data, { total, page, perPage });
}

/**
 * Get a single people by PPL_ ID
 *
 * The names are read only once the people is known to exist, so a 404 costs
 * one query rather than two. A failure to read them is not swallowed into an
 * empty list: on a surface whose whole argument is provenance, reporting a
 * dropped query as "the corpus holds no name" is the worse of the two
 * failures.
 */
// @req REQ-084
// @req REQ-133
// @req REQ-142
export async function getPeopleHandler(
  id: string,
  lang: TranslationLocale = "fr"
): Promise<ApiEnvelope<PeopleWithPatronymes> | null> {
  const people = await getPeopleById(id, lang);
  if (!people) return null;

  // Provenance travels on the envelope, never inside the record it describes.
  const { translation, ...entity } = people;
  const patronymes = await getPatronymesBorneByPeople(id);
  return createApiResponse({ ...entity, patronymes }, { translation });
}
