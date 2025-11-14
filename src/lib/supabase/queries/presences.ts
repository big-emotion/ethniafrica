/**
 * Requêtes Supabase pour les présences d'ethnies
 */
import { createServerClient } from "../server";

export interface Presence {
  id: string;
  ethnic_group_id: string;
  country_id: string;
  population: number;
  percentage_in_country?: number;
  percentage_in_region?: number;
  percentage_in_africa?: number;
  created_at: string;
  updated_at: string;
}

export interface PresenceWithCountry extends Presence {
  country: {
    id: string;
    name_fr: string;
    slug: string;
    region_id: string;
  };
  region: {
    id: string;
    code: string;
    name_fr: string;
  };
}

export interface PresenceWithEthnicity extends Presence {
  ethnicity: {
    id: string;
    name_fr: string;
    slug: string;
    parent_id?: string | null;
  };
}

/**
 * Obtenir toutes les présences d'une ethnie
 */
export async function getPresencesByEthnicity(
  ethnicityId: string
): Promise<PresenceWithCountry[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ethnic_group_presence")
    .select(
      `
      *,
      countries!inner (
        *,
        african_regions (*)
      )
    `
    )
    .eq("ethnic_group_id", ethnicityId);

  if (error) {
    console.error("Error fetching presences by ethnicity:", error);
    throw error;
  }

  return (data?.map((presence) => ({
    ...presence,
    country: presence.countries,
    region: presence.countries?.african_regions,
  })) || []) as PresenceWithCountry[];
}

/**
 * Obtenir toutes les présences d'un pays
 */
export async function getPresencesByCountry(
  countryId: string
): Promise<PresenceWithEthnicity[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ethnic_group_presence")
    .select(
      `
      *,
      ethnic_groups (*)
    `
    )
    .eq("country_id", countryId);

  if (error) {
    console.error("Error fetching presences by country:", error);
    throw error;
  }

  return (data?.map((presence) => ({
    ...presence,
    ethnicity: presence.ethnic_groups,
  })) || []) as PresenceWithEthnicity[];
}

/**
 * Obtenir une présence spécifique (ethnie + pays)
 */
export async function getPresence(
  ethnicityId: string,
  countryId: string
): Promise<Presence | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ethnic_group_presence")
    .select("*")
    .eq("ethnic_group_id", ethnicityId)
    .eq("country_id", countryId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    console.error("Error fetching presence:", error);
    throw error;
  }

  return data;
}
