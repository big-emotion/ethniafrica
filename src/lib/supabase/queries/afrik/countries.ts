/**
 * Supabase queries for AFRIK countries
 */

import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";
import type { Country } from "@/types/afrik";

/**
 * Get all AFRIK countries with optional pagination
 */
// @req REQ-019
export async function getAllAfrikCountries(
  page?: number,
  perPage?: number
): Promise<Country[]> {
  const supabase = createServerClient();
  let query = supabase.from("afrik_countries").select("*").order("name_fr");

  if (page && perPage) {
    const start = (page - 1) * perPage;
    query = query.range(start, start + perPage - 1);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching AFRIK countries", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    nameFr: row.name_fr,
    nameOfficial: row.name_official || undefined,
    summary: row.summary || undefined,
    etymology: row.etymology || undefined,
    nameOriginActor: row.name_origin_actor || undefined,
    content: row.content || {},
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }));
}

/**
 * Every country's id and French name, and nothing else.
 *
 * `getAllAfrikCountries` answers the same question, and answering it that way
 * is what took the atlas hub down. Its `select("*")` ships the whole `content`
 * JSONB and both tsvector columns — 951 KB measured against recette — so that
 * `getCountryIndex` can keep 2 KB of names. The `/fr/atlas` layout reads that
 * index on every route in the subtree, fiches included, and past the ten-second
 * ceiling in `requestDeadline` the read simply aborts:
 *
 *     AbortError … at getAllAfrikCountries … at ExplorerLayout
 *
 * The layout catches it and hands the globe an empty country list, which is a
 * second, quieter failure: with nothing choosable, `AtlasGlobe` stops drawing
 * its 7px choice marks and pins a 22px marker on each overlay target instead.
 * The reader sees a dozen large dots appear and no message explaining them.
 *
 * So this is a narrower read rather than a longer deadline. The deadline is
 * doing its job; the payload was never justified.
 */
// @req REQ-116
export async function getAfrikCountryIndexRows(): Promise<
  Array<{ id: string; nameFr: string }>
> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_countries")
    .select("id, name_fr")
    .order("name_fr");

  if (error) {
    logger.error("Error fetching the AFRIK country index", error);
    throw error;
  }

  return (data || []).map((row) => ({ id: row.id, nameFr: row.name_fr }));
}

/**
 * Get a single AFRIK country by ISO code
 */
// @req REQ-019
export async function getAfrikCountryById(
  iso: string
): Promise<Country | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_countries")
    .select("*")
    .eq("id", iso)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    logger.error(`Error fetching AFRIK country ${iso}`, error);
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    nameFr: data.name_fr,
    nameOfficial: data.name_official || undefined,
    summary: data.summary || undefined,
    etymology: data.etymology || undefined,
    nameOriginActor: data.name_origin_actor || undefined,
    content: data.content || {},
    createdAt: data.created_at ? new Date(data.created_at) : undefined,
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  };
}

/**
 * The ids of every country in the corpus, and nothing else.
 *
 * The home's synthesis rail needs four countries out of fifty-four, drawn
 * at random. Reading them through getAllAfrikCountries would pull fifty-four
 * JSONB content blobs across the wire to render four cards — the ids cost a
 * single narrow column instead, and the four rows that win are fetched by
 * getAfrikCountriesByIds.
 */
// @req REQ-019
export async function getAfrikCountryIds(): Promise<string[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_countries")
    .select("id")
    .order("id");

  if (error) {
    logger.error("Error fetching AFRIK country ids", error);
    throw error;
  }

  return (data || []).map((row) => row.id);
}

/**
 * Fetch a handful of countries by id, in one round trip.
 *
 * Callers pass a short list — the rail passes four. A `.in()` filter is
 * measured in URL characters rather than in identifiers, so this is not a
 * general-purpose bulk read; keep the list small.
 */
// @req REQ-019
export async function getAfrikCountriesByIds(
  ids: string[]
): Promise<Country[]> {
  if (ids.length === 0) return [];

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_countries")
    .select("*")
    .in("id", ids);

  if (error) {
    logger.error("Error fetching AFRIK countries by id", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    nameFr: row.name_fr,
    nameOfficial: row.name_official || undefined,
    summary: row.summary || undefined,
    etymology: row.etymology || undefined,
    nameOriginActor: row.name_origin_actor || undefined,
    content: row.content || {},
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }));
}
