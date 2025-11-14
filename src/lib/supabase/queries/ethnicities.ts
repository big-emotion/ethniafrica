/**
 * Requêtes Supabase pour les ethnies
 */
import { createServerClient } from "../server";

export interface Ethnicity {
  id: string;
  slug: string;
  name_fr: string;
  name_en?: string;
  name_es?: string;
  name_pt?: string;
  parent_id?: string;
  total_population?: number;
  percentage_in_africa?: number;
  description?: string;
  ancient_name?: string;
  society_type?: string;
  religion?: string;
  linguistic_family?: string;
  historical_status?: string;
  regional_presence?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Obtenir toutes les ethnies
 */
export async function getAllEthnicities(): Promise<Ethnicity[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ethnic_groups")
    .select("*")
    .order("name_fr");

  if (error) {
    console.error("Error fetching ethnicities:", error);
    throw error;
  }

  return data || [];
}

/**
 * Obtenir une ethnie par son slug
 */
export async function getEthnicityBySlug(
  slug: string
): Promise<Ethnicity | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ethnic_groups")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    console.error("Error fetching ethnicity:", error);
    throw error;
  }

  return data;
}

/**
 * Obtenir les ethnies d'un pays
 */
export async function getEthnicitiesByCountry(
  countryId: string
): Promise<Array<Ethnicity & { presence: EthnicityPresence }>> {
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
    console.error("Error fetching ethnicities by country:", error);
    throw error;
  }

  interface PresenceWithGroup {
    id: string;
    population: number;
    percentage_in_country?: number;
    percentage_in_region?: number;
    percentage_in_africa?: number;
    ethnic_groups: Ethnicity;
  }

  return (
    data?.map((presence: PresenceWithGroup) => ({
      ...presence.ethnic_groups,
      presence: {
        id: presence.id,
        population: presence.population,
        percentage_in_country: presence.percentage_in_country,
        percentage_in_region: presence.percentage_in_region,
        percentage_in_africa: presence.percentage_in_africa,
      },
    })) || []
  );
}

export interface EthnicityPresence {
  id: string;
  population: number;
  percentage_in_country?: number;
  percentage_in_region?: number;
  percentage_in_africa?: number;
}

/**
 * Obtenir une ethnie avec toutes ses informations enrichies
 */
export async function getEthnicityWithDescription(
  slug: string
): Promise<Ethnicity | null> {
  return await getEthnicityBySlug(slug);
}

/**
 * Obtenir les langues d'une ethnie avec indicateur primaire
 */
export async function getEthnicityLanguages(slug: string): Promise<
  Array<{
    name: string;
    isPrimary: boolean;
  }>
> {
  const supabase = createServerClient();
  const ethnicity = await getEthnicityBySlug(slug);
  if (!ethnicity) return [];

  const { data, error } = await supabase
    .from("ethnic_group_languages")
    .select(
      `
      is_primary,
      languages!inner (
        name_fr
      )
    `
    )
    .eq("ethnic_group_id", ethnicity.id)
    .order("is_primary", { ascending: false });

  if (error) {
    console.error("Error fetching ethnicity languages:", error);
    return [];
  }

  return (
    data?.map((item: unknown) => {
      const i = item as {
        is_primary: boolean;
        languages: { name_fr: string };
      };
      return {
        name: i.languages.name_fr,
        isPrimary: i.is_primary || false,
      };
    }) || []
  );
}

/**
 * Obtenir les top N langues d'une ethnie
 */
export async function getTopLanguagesForEthnicity(
  slug: string,
  limit: number = 5
): Promise<string[]> {
  const languages = await getEthnicityLanguages(slug);
  return languages
    .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
    .slice(0, limit)
    .map((lang) => lang.name);
}

/**
 * Obtenir les sous-groupes d'une ethnie (si c'est un groupe parent)
 */
export async function getEthnicitySubgroups(
  slug: string
): Promise<Ethnicity[]> {
  const supabase = createServerClient();
  const ethnicity = await getEthnicityBySlug(slug);
  if (!ethnicity) return [];

  const { data, error } = await supabase
    .from("ethnic_groups")
    .select("*")
    .eq("parent_id", ethnicity.id)
    .order("name_fr");

  if (error) {
    console.error("Error fetching subgroups:", error);
    return [];
  }

  return data || [];
}

/**
 * Obtenir le parent d'une ethnie (si c'est un sous-groupe)
 */
export async function getEthnicityParent(
  slug: string
): Promise<Ethnicity | null> {
  const ethnicity = await getEthnicityBySlug(slug);
  if (!ethnicity || !ethnicity.parent_id) return null;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ethnic_groups")
    .select("*")
    .eq("id", ethnicity.parent_id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching parent ethnicity:", error);
    return null;
  }

  return data;
}

/**
 * Obtenir les sources d'une ethnie
 */
export async function getEthnicitySources(slug: string): Promise<string[]> {
  const supabase = createServerClient();
  const ethnicity = await getEthnicityBySlug(slug);
  if (!ethnicity) return [];

  const { data, error } = await supabase
    .from("ethnic_group_sources")
    .select(
      `
      sources!inner (
        title
      )
    `
    )
    .eq("ethnic_group_id", ethnicity.id);

  if (error) {
    console.error("Error fetching ethnicity sources:", error);
    return [];
  }

  return (
    data
      ?.map((item: unknown) => {
        const i = item as {
          sources: { title: string };
        };
        return i.sources.title;
      })
      .filter((title: string) => title) || []
  );
}

/**
 * Obtenir toutes les ethnies incluant les sous-groupes (pour compteur)
 */
export async function getAllEthnicitiesIncludingSubgroups(): Promise<
  Ethnicity[]
> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ethnic_groups")
    .select("*")
    .order("name_fr");

  if (error) {
    console.error("Error fetching all ethnicities:", error);
    throw error;
  }

  return data || [];
}
