/**
 * Requêtes Supabase pour les pays
 */
import { createServerClient } from "../server";

import { AncientNameEntry } from "@/types/ethnicity";

export interface Country {
  id: string;
  slug: string;
  name_fr: string;
  name_en?: string;
  name_es?: string;
  name_pt?: string;
  iso_code_2?: string;
  iso_code_3?: string;
  region_id: string;
  population_2025: number;
  percentage_in_region?: number;
  percentage_in_africa?: number;
  description?: string;
  ancient_names?: string | unknown; // JSONB ou TEXT contenant du JSON
  created_at: string;
  updated_at: string;
}

/**
 * Obtenir tous les pays
 */
export async function getAllCountries(): Promise<Country[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .order("name_fr");

  if (error) {
    console.error("Error fetching countries:", error);
    throw error;
  }

  return data || [];
}

/**
 * Obtenir un pays par son slug
 */
export async function getCountryBySlug(slug: string): Promise<Country | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    console.error("Error fetching country:", error);
    throw error;
  }

  return data;
}

/**
 * Obtenir les pays d'une région
 */
export async function getCountriesByRegion(
  regionId: string
): Promise<Country[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .eq("region_id", regionId)
    .order("name_fr");

  if (error) {
    console.error("Error fetching countries by region:", error);
    throw error;
  }

  return data || [];
}

/**
 * Obtenir les pays d'une région par code de région
 */
export async function getCountriesByRegionCode(
  regionCode: string
): Promise<Country[]> {
  const supabase = createServerClient();
  // First get the region by code
  const { data: regionData, error: regionError } = await supabase
    .from("african_regions")
    .select("id")
    .eq("code", regionCode)
    .single();

  if (regionError || !regionData) {
    console.error("Error fetching region:", regionError);
    return [];
  }

  // Then get countries by region_id
  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .eq("region_id", regionData.id)
    .order("name_fr");

  if (error) {
    console.error("Error fetching countries by region code:", error);
    throw error;
  }

  return data || [];
}

/**
 * Obtenir un pays avec sa description
 */
export async function getCountryWithDescription(
  slug: string
): Promise<Country | null> {
  return await getCountryBySlug(slug);
}

/**
 * Obtenir les anciens noms d'un pays (nouveau format structuré)
 */
export async function getCountryAncientNames(
  slug: string
): Promise<AncientNameEntry[]> {
  const country = await getCountryBySlug(slug);
  if (!country || !country.ancient_names) return [];

  try {
    // Si c'est déjà un objet (JSONB), le retourner directement
    if (typeof country.ancient_names === "object") {
      return country.ancient_names as AncientNameEntry[];
    }

    // Si c'est une string, essayer de parser le JSON
    if (typeof country.ancient_names === "string") {
      // Essayer de parser comme JSON
      try {
        const parsed = JSON.parse(country.ancient_names);
        if (Array.isArray(parsed)) {
          return parsed as AncientNameEntry[];
        }
      } catch {
        // Si le parsing JSON échoue, c'est peut-être l'ancien format (séparé par virgules)
        // Convertir en nouveau format avec période vide
        const names = country.ancient_names
          .split(",")
          .map((n) => n.trim())
          .filter((n) => n.length > 0);
        return names.map((name) => ({ period: "", names: [name] }));
      }
    }
  } catch (error) {
    console.error("Error parsing ancient names:", error);
  }

  return [];
}

/**
 * Obtenir les top N ethnies d'un pays avec leurs langues
 */
export async function getTopEthnicitiesForCountry(
  slug: string,
  limit: number = 5
): Promise<
  Array<{
    name: string;
    languages: string[];
  }>
> {
  const supabase = createServerClient();
  const country = await getCountryBySlug(slug);
  if (!country) return [];

  // Récupérer les presences avec les ethnies et leurs langues
  const { data: presences, error } = await supabase
    .from("ethnic_group_presence")
    .select(
      `
      population,
      ethnic_groups!inner (
        id,
        name_fr,
        ethnic_group_languages (
          languages!inner (
            name_fr
          ),
          is_primary
        )
      )
    `
    )
    .eq("country_id", country.id)
    .order("population", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching top ethnicities:", error);
    return [];
  }

  return (
    presences?.map((presence: unknown) => {
      const p = presence as {
        ethnic_groups: {
          name_fr: string;
          ethnic_group_languages?: Array<{
            is_primary: boolean;
            languages: { name_fr: string };
          }>;
        };
      };
      const ethnicity = p.ethnic_groups;
      const languages = (ethnicity.ethnic_group_languages || [])
        .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
        .map((lang) => lang.languages.name_fr)
        .filter((name: string) => name);

      return {
        name: ethnicity.name_fr,
        languages: languages,
      };
    }) || []
  );
}
