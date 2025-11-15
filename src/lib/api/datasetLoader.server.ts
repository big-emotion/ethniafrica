import { unstable_cache } from "next/cache";
import {
  RegionData,
  CountryData,
  EthnicityInCountry,
  EthnicityGlobalData,
  EthnicityInRegion,
} from "@/types/ethnicity";
import {
  getCountryName,
  getEthnicityName,
  getCountryKey,
  getEthnicityKey,
} from "@/lib/entityKeys";
import {
  getAllRegions as getAllRegionsFromSupabase,
  getRegionByCode as getRegionByCodeFromSupabase,
  getTotalPopulationAfrica as getTotalPopulationAfricaFromSupabase,
} from "@/lib/supabase/queries/regions";
import {
  getAllCountries as getAllCountriesFromSupabase,
  getCountryBySlug as getCountryBySlugFromSupabase,
  getCountriesByRegionCode as getCountriesByRegionCodeFromSupabase,
  getCountryWithDescription,
  getCountryAncientNames,
  getTopEthnicitiesForCountry,
  type Country,
} from "@/lib/supabase/queries/countries";
import {
  getAllEthnicities as getAllEthnicitiesFromSupabase,
  getEthnicityBySlug as getEthnicityBySlugFromSupabase,
  getEthnicityByName,
  getEthnicityLanguages,
  getEthnicitySources,
} from "@/lib/supabase/queries/ethnicities";
import {
  getPresencesByCountry as getPresencesByCountryFromSupabase,
  getPresencesByEthnicity as getPresencesByEthnicityFromSupabase,
} from "@/lib/supabase/queries/presences";

// Cache TTL: 24 heures (86400 secondes)
const CACHE_TTL = 86400;

// Obtenir la population totale de l'Afrique
async function _getTotalPopulationAfrica(): Promise<number> {
  return await getTotalPopulationAfricaFromSupabase();
}

export const getTotalPopulationAfrica = unstable_cache(
  _getTotalPopulationAfrica,
  ["total-population-africa"],
  {
    revalidate: CACHE_TTL,
    tags: ["population", "africa", "regions", "countries"], // Invalider quand les données changent
  }
);

// Obtenir toutes les régions
async function _getRegions(): Promise<
  Array<{ key: string; data: RegionData }>
> {
  const regions = await getAllRegionsFromSupabase();

  // Pour chaque région, charger le nombre de pays
  const regionsWithCountries = await Promise.all(
    regions.map(async (region) => {
      const countries = await getCountriesByRegionCodeFromSupabase(region.code);
      // Créer un objet countries avec les pays pour que Object.keys() fonctionne
      const countriesMap: Record<string, CountryData> = {};
      for (const country of countries) {
        countriesMap[country.name_fr] = {
          name: country.name_fr,
          population: country.population_2025,
          percentageInRegion: country.percentage_in_region || 0,
          percentageInAfrica: country.percentage_in_africa || 0,
          ethnicityCount: 0, // Sera calculé si nécessaire
        } as CountryData;
      }

      return {
        key: region.code,
        data: {
          name: region.name_fr,
          totalPopulation: region.total_population,
          countries: countriesMap,
          ethnicities: {}, // Will be loaded separately if needed
        },
      };
    })
  );

  return regionsWithCountries;
}

export const getRegions = unstable_cache(_getRegions, ["all-regions"], {
  revalidate: CACHE_TTL,
  tags: ["regions", "countries"], // Invalider aussi quand les pays changent
});

// Obtenir une région spécifique
export async function getRegion(regionKey: string): Promise<RegionData | null> {
  const region = await getRegionByCodeFromSupabase(regionKey);
  if (!region) return null;

  // Load countries and ethnicities for this region
  const countries = await getCountriesByRegionCodeFromSupabase(regionKey);
  const countriesMap: Record<
    string,
    {
      name: string;
      population: number;
      percentageInRegion: number;
      percentageInAfrica: number;
      ethnicityCount: number;
    }
  > = {};
  for (const country of countries) {
    countriesMap[country.name_fr] = {
      name: country.name_fr,
      population: country.population_2025,
      percentageInRegion: country.percentage_in_region || 0,
      percentageInAfrica: country.percentage_in_africa || 0,
      ethnicityCount: 0, // Will be calculated if needed
    };
  }

  // Load ethnicities for this region
  const ethnicitiesList = await getEthnicitiesInRegion(regionKey);
  const ethnicitiesMap: Record<string, EthnicityInRegion> = {};
  for (const eth of ethnicitiesList) {
    ethnicitiesMap[eth.name] = {
      name: eth.name,
      totalPopulationInRegion: eth.totalPopulationInRegion,
      percentageInRegion: eth.percentageInRegion,
      percentageInAfrica: eth.percentageInAfrica,
    };
  }

  return {
    name: region.name_fr,
    totalPopulation: region.total_population,
    countries: countriesMap as Record<string, CountryData>,
    ethnicities: ethnicitiesMap,
  };
}

// Obtenir les pays d'une région
export async function getCountriesInRegion(regionKey: string): Promise<
  Array<{
    name: string;
    data: {
      population: number;
      percentageInRegion: number;
      percentageInAfrica: number;
    };
  }>
> {
  const countries = await getCountriesByRegionCodeFromSupabase(regionKey);
  return countries.map((country) => ({
    name: country.name_fr,
    data: {
      population: country.population_2025,
      percentageInRegion: country.percentage_in_region || 0,
      percentageInAfrica: country.percentage_in_africa || 0,
    },
  }));
}

// Obtenir les ethnies d'un pays
export async function getEthnicitiesInCountry(
  regionKey: string,
  countryName: string
): Promise<EthnicityInCountry[]> {
  // Find country by name
  const countrySlug = getCountryKey(countryName) || countryName;
  const country = await getCountryBySlugFromSupabase(countrySlug);
  if (!country) return [];

  const presences = await getPresencesByCountryFromSupabase(country.id);
  return presences.map((presence) => ({
    Ethnicity_or_Subgroup: presence.ethnicity.name_fr,
    "pourcentage dans la population du pays":
      presence.percentage_in_country?.toString() || "0",
    "population de l'ethnie estimée dans le pays":
      presence.population.toString(),
    "pourcentage dans la population totale d'Afrique":
      presence.percentage_in_africa?.toString() || "0",
  }));
}

// Obtenir les détails d'un pays avec calculs
export async function getCountryDetails(
  regionKey: string,
  countryName: string
): Promise<{
  name: string;
  population: number;
  percentageInRegion: number;
  percentageInAfrica: number;
  region: string;
  ethnicities: Array<{
    name: string;
    population: number;
    percentageInCountry: number;
    percentageInRegion: number;
    percentageInAfrica: number;
    isParent: boolean;
    parentName?: string;
    subgroups?: Array<{
      name: string;
      population: number;
      percentageInCountry: number;
      percentageInRegion: number;
      percentageInAfrica: number;
    }>;
  }>;
  description?: string;
  ancientNames?: Array<{ period: string; names: string[] }>; // Max 3 entrées pour le résumé
  allAncientNames?: Array<{ period: string; names: string[] }>; // Toutes les entrées pour la section détaillée
  ethnicGroupsSummary?: string; // Section 4
  notes?: string; // Section 6
  topEthnicities?: Array<{
    name: string;
    languages: string[];
  }>;
} | null> {
  const countrySlug = getCountryKey(countryName) || countryName;
  const country = await getCountryBySlugFromSupabase(countrySlug);
  if (!country) return null;

  const region = await getRegionByCodeFromSupabase(regionKey);
  if (!region) return null;

  const presences = await getPresencesByCountryFromSupabase(country.id);

  // Séparer les groupes parents et les sous-groupes
  const parentPresences = presences.filter(
    (presence) => !presence.ethnicity.parent_id
  );
  const subgroupPresences = presences.filter(
    (presence) => presence.ethnicity.parent_id
  );

  // Créer une map des sous-groupes par parent_id
  const subgroupsByParentId = new Map<
    string,
    Array<{
      name: string;
      population: number;
      percentageInCountry: number;
      percentageInRegion: number;
      percentageInAfrica: number;
    }>
  >();

  for (const presence of subgroupPresences) {
    if (!presence.ethnicity.parent_id) continue;
    const parentId = presence.ethnicity.parent_id;
    if (!subgroupsByParentId.has(parentId)) {
      subgroupsByParentId.set(parentId, []);
    }
    subgroupsByParentId.get(parentId)!.push({
      name: presence.ethnicity.name_fr,
      population: presence.population,
      percentageInCountry: presence.percentage_in_country || 0,
      percentageInRegion: presence.percentage_in_region || 0,
      percentageInAfrica: presence.percentage_in_africa || 0,
    });
  }

  // Construire la structure hiérarchique avec données enrichies
  const ethnicities = await Promise.all(
    parentPresences.map(async (presence) => {
      const subgroups = subgroupsByParentId.get(presence.ethnicity.id) || [];

      // Récupérer les langues et sources pour le groupe parent
      const languages = await getEthnicityLanguages(presence.ethnicity.slug);
      const sources = await getEthnicitySources(presence.ethnicity.slug);

      // Récupérer les données enrichies pour les sous-groupes
      const enrichedSubgroups = await Promise.all(
        subgroups.map(async (subgroup) => {
          // Trouver la présence correspondante au sous-groupe
          const subgroupPresence = subgroupPresences.find(
            (p) => p.ethnicity.name_fr === subgroup.name
          );
          if (!subgroupPresence) return subgroup;

          const subgroupLanguages = await getEthnicityLanguages(
            subgroupPresence.ethnicity.slug
          );
          const subgroupSources = await getEthnicitySources(
            subgroupPresence.ethnicity.slug
          );

          return {
            ...subgroup,
            language: subgroupLanguages[0]?.name || "",
            languages: subgroupLanguages.map((l) => l.name),
            region: subgroupPresence.region || "",
            sources: subgroupSources,
            ancientName: subgroupPresence.ethnicity.ancient_name || "",
            description: subgroupPresence.ethnicity.description || "",
            societyType: subgroupPresence.ethnicity.society_type || "",
            religion: subgroupPresence.ethnicity.religion || "",
            linguisticFamily:
              subgroupPresence.ethnicity.linguistic_family || "",
            historicalStatus:
              subgroupPresence.ethnicity.historical_status || "",
            regionalPresence:
              subgroupPresence.ethnicity.regional_presence || "",
          };
        })
      );

      return {
        name: presence.ethnicity.name_fr,
        population: presence.population,
        percentageInCountry: presence.percentage_in_country || 0,
        percentageInRegion: presence.percentage_in_region || 0,
        percentageInAfrica: presence.percentage_in_africa || 0,
        isParent: true,
        // Données enrichies
        language: languages[0]?.name || "",
        languages: languages.map((l) => l.name),
        region: presence.region || "",
        sources: sources,
        ancientName: presence.ethnicity.ancient_name || "",
        description: presence.ethnicity.description || "",
        societyType: presence.ethnicity.society_type || "",
        religion: presence.ethnicity.religion || "",
        linguisticFamily: presence.ethnicity.linguistic_family || "",
        historicalStatus: presence.ethnicity.historical_status || "",
        regionalPresence: presence.ethnicity.regional_presence || "",
        subgroups: enrichedSubgroups.length > 0 ? enrichedSubgroups : undefined,
      };
    })
  );

  // Ajouter les sous-groupes orphelins (parent supprimé ou non présent dans ce pays)
  const parentIds = new Set(parentPresences.map((p) => p.ethnicity.id));
  const orphanSubgroups = await Promise.all(
    subgroupPresences
      .filter(
        (presence) =>
          presence.ethnicity.parent_id &&
          !parentIds.has(presence.ethnicity.parent_id)
      )
      .map(async (presence) => {
        // Sous-groupe orphelin, l'afficher comme groupe normal
        const languages = await getEthnicityLanguages(presence.ethnicity.slug);
        const sources = await getEthnicitySources(presence.ethnicity.slug);

        return {
          name: presence.ethnicity.name_fr,
          population: presence.population,
          percentageInCountry: presence.percentage_in_country || 0,
          percentageInRegion: presence.percentage_in_region || 0,
          percentageInAfrica: presence.percentage_in_africa || 0,
          isParent: false,
          // Données enrichies
          language: languages[0]?.name || "",
          languages: languages.map((l) => l.name),
          region: presence.region || "",
          sources: sources,
          ancientName: presence.ethnicity.ancient_name || "",
          description: presence.ethnicity.description || "",
          societyType: presence.ethnicity.society_type || "",
          religion: presence.ethnicity.religion || "",
          linguisticFamily: presence.ethnicity.linguistic_family || "",
          historicalStatus: presence.ethnicity.historical_status || "",
          regionalPresence: presence.ethnicity.regional_presence || "",
          subgroups: undefined,
        };
      })
  );

  ethnicities.push(...orphanSubgroups);

  // Charger les données enrichies
  const enrichedCountry = await getCountryWithDescription(countrySlug);
  const ancientNames = enrichedCountry
    ? await getCountryAncientNames(countrySlug)
    : [];
  const topEthnicities = await getTopEthnicitiesForCountry(countrySlug, 5);

  return {
    name: country.name_fr,
    population: country.population_2025,
    percentageInRegion: country.percentage_in_region || 0,
    percentageInAfrica: country.percentage_in_africa || 0,
    region: region.name_fr,
    ethnicities: ethnicities.sort((a, b) => b.population - a.population),
    description: enrichedCountry?.description,
    ancientNames: ancientNames.slice(0, 3), // Max 3 entrées pour le résumé
    allAncientNames: ancientNames, // Toutes les entrées pour la section détaillée
    ethnicGroupsSummary:
      enrichedCountry && "ethnic_groups_summary" in enrichedCountry
        ? (enrichedCountry as Country).ethnic_groups_summary
        : undefined,
    notes:
      enrichedCountry && "notes" in enrichedCountry
        ? (enrichedCountry as Country).notes
        : undefined,
    topEthnicities: topEthnicities,
  };
}

// Obtenir les détails d'une ethnie globale (tous pays)
export async function getEthnicityGlobalDetails(
  ethnicityName: string
): Promise<EthnicityGlobalData | null> {
  // Essayer d'abord de convertir le nom en clé
  const ethnicitySlug = getEthnicityKey(ethnicityName);
  let ethnicity = null;

  // 1. Si on a une clé, chercher par slug
  if (ethnicitySlug) {
    ethnicity = await getEthnicityBySlugFromSupabase(ethnicitySlug);
  }

  // 2. Si pas trouvé, essayer de chercher par slug en normalisant en minuscules
  if (!ethnicity) {
    const normalizedSlug = ethnicityName.toLowerCase().trim();
    ethnicity = await getEthnicityBySlugFromSupabase(normalizedSlug);
  }

  // 3. Si toujours pas trouvé, chercher par nom exact
  if (!ethnicity) {
    ethnicity = await getEthnicityByName(ethnicityName);
  }

  if (!ethnicity) return null;

  const presences = await getPresencesByEthnicityFromSupabase(ethnicity.id);
  const countries = presences.map((presence) => ({
    country: presence.country.name_fr,
    region: presence.region.name_fr,
    population: presence.population,
    percentageInCountry: presence.percentage_in_country || 0,
    percentageInRegion: presence.percentage_in_region || 0,
    percentageInAfrica: presence.percentage_in_africa || 0,
  }));

  // Calculate regions summary
  const regionsMap = new Map<
    string,
    { totalPopulation: number; ethnicityPopulation: number }
  >();
  for (const presence of presences) {
    const regionName = presence.region.name_fr;
    const existing = regionsMap.get(regionName) || {
      totalPopulation: 0,
      ethnicityPopulation: 0,
    };
    existing.ethnicityPopulation += presence.population;
    // Get region total population (we need to fetch it)
    const region = await getRegionByCodeFromSupabase(presence.region.code);
    if (region) {
      existing.totalPopulation = region.total_population;
    }
    regionsMap.set(regionName, existing);
  }

  const regions = Array.from(regionsMap.entries()).map(([name, data]) => ({
    name,
    totalPopulation: data.totalPopulation,
    ethnicityPopulation: data.ethnicityPopulation,
    percentageInRegion:
      data.totalPopulation > 0
        ? (data.ethnicityPopulation / data.totalPopulation) * 100
        : 0,
  }));

  return {
    name: ethnicity.name_fr,
    totalPopulation: ethnicity.total_population || 0,
    percentageInAfrica: ethnicity.percentage_in_africa || 0,
    countries: countries.sort((a, b) => b.population - a.population),
    regions,
  };
}

// Obtenir les ethnies d'une région
export async function getEthnicitiesInRegion(regionKey: string) {
  // Get all countries in the region, then get all ethnicities from those countries
  const countries = await getCountriesByRegionCodeFromSupabase(regionKey);
  const ethnicityMap = new Map<
    string,
    {
      name: string;
      totalPopulationInRegion: number;
      percentageInRegion: number;
      percentageInAfrica: number;
    }
  >();

  for (const country of countries) {
    const presences = await getPresencesByCountryFromSupabase(country.id);
    for (const presence of presences) {
      // Ne compter que les groupes parents (pas les sous-groupes) pour éviter les doublons
      // Les sous-groupes seront inclus dans la population de leur parent
      if (presence.ethnicity.parent_id) {
        continue; // Skip subgroups
      }

      const ethName = presence.ethnicity.name_fr;
      const existing = ethnicityMap.get(ethName);
      if (existing) {
        existing.totalPopulationInRegion += presence.population;
      } else {
        ethnicityMap.set(ethName, {
          name: ethName,
          totalPopulationInRegion: presence.population,
          percentageInRegion: presence.percentage_in_region || 0,
          percentageInAfrica: presence.percentage_in_africa || 0,
        });
      }
    }
  }

  const region = await getRegionByCodeFromSupabase(regionKey);
  const totalPopulation = region?.total_population || 1;

  return Array.from(ethnicityMap.values())
    .map((eth) => ({
      ...eth,
      percentageInRegion: (eth.totalPopulationInRegion / totalPopulation) * 100,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Obtenir tous les pays
async function _getAllCountries(): Promise<
  Array<{
    name: string;
    key: string;
    region: string;
    regionName: string;
    data: {
      population: number;
      percentageInRegion: number;
      percentageInAfrica: number;
      ethnicityCount: number;
    };
  }>
> {
  const countries = await getAllCountriesFromSupabase();
  const regions = await getAllRegionsFromSupabase();
  const regionMap = new Map(regions.map((r) => [r.id, r]));

  const result = [];
  for (const country of countries) {
    const region = regionMap.get(country.region_id);
    const presences = await getPresencesByCountryFromSupabase(country.id);

    // Compter comme dans getCountryDetails : groupes parents + sous-groupes orphelins
    const parentPresences = presences.filter(
      (presence) => !presence.ethnicity.parent_id
    );
    const subgroupPresences = presences.filter(
      (presence) => presence.ethnicity.parent_id
    );

    // Identifier les sous-groupes orphelins (parent non présent dans ce pays)
    const parentIds = new Set(parentPresences.map((p) => p.ethnicity.id));
    const orphanSubgroups = subgroupPresences.filter(
      (presence) =>
        presence.ethnicity.parent_id &&
        !parentIds.has(presence.ethnicity.parent_id)
    );

    // Compter : groupes parents + sous-groupes orphelins
    const ethnicityCount = parentPresences.length + orphanSubgroups.length;

    result.push({
      name: country.name_fr,
      key: country.slug,
      region: region?.code || "",
      regionName: region?.name_fr || "",
      data: {
        population: country.population_2025,
        percentageInRegion: country.percentage_in_region || 0,
        percentageInAfrica: country.percentage_in_africa || 0,
        ethnicityCount: ethnicityCount, // Groupes parents + sous-groupes orphelins
      },
    });
  }
  return result;
}

export const getAllCountries = unstable_cache(
  _getAllCountries,
  ["all-countries"],
  {
    revalidate: CACHE_TTL,
    tags: ["countries", "regions"], // Invalider aussi quand les régions changent
  }
);

// Obtenir toutes les ethnies (incluant les sous-groupes)
async function _getAllEthnicities(): Promise<
  Array<{
    name: string;
    key: string;
    totalPopulation: number;
    percentageInAfrica: number;
    countryCount: number;
  }>
> {
  const ethnicities = await getAllEthnicitiesFromSupabase();
  const result = [];
  for (const ethnicity of ethnicities) {
    const presences = await getPresencesByEthnicityFromSupabase(ethnicity.id);
    const uniqueCountries = new Set(presences.map((p) => p.country.id));
    result.push({
      name: ethnicity.name_fr,
      key: ethnicity.slug,
      totalPopulation: ethnicity.total_population || 0,
      percentageInAfrica: ethnicity.percentage_in_africa || 0,
      countryCount: uniqueCountries.size,
    });
  }
  return result;
}

export const getAllEthnicities = unstable_cache(
  _getAllEthnicities,
  ["all-ethnicities"],
  {
    revalidate: CACHE_TTL,
    tags: ["ethnicities"],
  }
);

// Obtenir la région d'un pays
export async function getCountryRegion(
  countryNameOrKey: string
): Promise<{ regionKey: string; regionName: string } | null> {
  const countrySlug = getCountryKey(countryNameOrKey) || countryNameOrKey;
  const country = await getCountryBySlugFromSupabase(countrySlug);
  if (!country) return null;

  // Get region from country.region_id
  const regions = await getAllRegionsFromSupabase();
  const region = regions.find((r) => r.id === country.region_id);
  if (!region) return null;

  return {
    regionKey: region.code,
    regionName: region.name_fr,
  };
}

// Obtenir les détails d'un pays par clé
export async function getCountryDetailsByKey(countryKey: string): Promise<{
  name: string;
  population: number;
  percentageInRegion: number;
  percentageInAfrica: number;
  region: string;
  ethnicities: Array<{
    name: string;
    population: number;
    percentageInCountry: number;
    percentageInRegion: number;
    percentageInAfrica: number;
    isParent: boolean;
    parentName?: string;
    subgroups?: Array<{
      name: string;
      population: number;
      percentageInCountry: number;
      percentageInRegion: number;
      percentageInAfrica: number;
    }>;
  }>;
  description?: string;
  ancientNames?: Array<{ period: string; names: string[] }>; // Max 3 entrées pour le résumé
  allAncientNames?: Array<{ period: string; names: string[] }>; // Toutes les entrées pour la section détaillée
  ethnicGroupsSummary?: string; // Section 4
  notes?: string; // Section 6
  topEthnicities?: Array<{
    name: string;
    languages: string[];
  }>;
} | null> {
  const country = await getCountryBySlugFromSupabase(countryKey);
  if (!country) return null;

  // Get region from country.region_id
  const regions = await getAllRegionsFromSupabase();
  const region = regions.find((r) => r.id === country.region_id);
  if (!region) return null;

  const presences = await getPresencesByCountryFromSupabase(country.id);

  // Séparer les groupes parents et les sous-groupes
  const parentPresences = presences.filter(
    (presence) => !presence.ethnicity.parent_id
  );
  const subgroupPresences = presences.filter(
    (presence) => presence.ethnicity.parent_id
  );

  // Créer une map des sous-groupes par parent_id
  const subgroupsByParentId = new Map<
    string,
    Array<{
      name: string;
      population: number;
      percentageInCountry: number;
      percentageInRegion: number;
      percentageInAfrica: number;
    }>
  >();

  for (const presence of subgroupPresences) {
    if (!presence.ethnicity.parent_id) continue;
    const parentId = presence.ethnicity.parent_id;
    if (!subgroupsByParentId.has(parentId)) {
      subgroupsByParentId.set(parentId, []);
    }
    subgroupsByParentId.get(parentId)!.push({
      name: presence.ethnicity.name_fr,
      population: presence.population,
      percentageInCountry: presence.percentage_in_country || 0,
      percentageInRegion: presence.percentage_in_region || 0,
      percentageInAfrica: presence.percentage_in_africa || 0,
    });
  }

  // Construire la structure hiérarchique
  const ethnicities = parentPresences.map((presence) => {
    const subgroups = subgroupsByParentId.get(presence.ethnicity.id) || [];
    return {
      name: presence.ethnicity.name_fr,
      population: presence.population,
      percentageInCountry: presence.percentage_in_country || 0,
      percentageInRegion: presence.percentage_in_region || 0,
      percentageInAfrica: presence.percentage_in_africa || 0,
      isParent: true,
      subgroups: subgroups.length > 0 ? subgroups : undefined,
    };
  });

  // Ajouter les sous-groupes orphelins (parent supprimé ou non présent dans ce pays)
  const parentIds = new Set(parentPresences.map((p) => p.ethnicity.id));
  for (const presence of subgroupPresences) {
    if (
      presence.ethnicity.parent_id &&
      !parentIds.has(presence.ethnicity.parent_id)
    ) {
      // Sous-groupe orphelin, l'afficher comme groupe normal
      ethnicities.push({
        name: presence.ethnicity.name_fr,
        population: presence.population,
        percentageInCountry: presence.percentage_in_country || 0,
        percentageInRegion: presence.percentage_in_region || 0,
        percentageInAfrica: presence.percentage_in_africa || 0,
        isParent: false,
        subgroups: undefined,
      });
    }
  }

  // Charger les données enrichies
  const enrichedCountry = await getCountryWithDescription(countryKey);
  const ancientNames = enrichedCountry
    ? await getCountryAncientNames(countryKey)
    : [];
  const topEthnicities = await getTopEthnicitiesForCountry(countryKey, 5);

  return {
    name: country.name_fr,
    population: country.population_2025,
    percentageInRegion: country.percentage_in_region || 0,
    percentageInAfrica: country.percentage_in_africa || 0,
    region: region.name_fr,
    ethnicities: ethnicities.sort((a, b) => b.population - a.population),
    description: enrichedCountry?.description,
    ancientNames: ancientNames.slice(0, 3), // Max 3 entrées pour le résumé
    allAncientNames: ancientNames, // Toutes les entrées pour la section détaillée
    ethnicGroupsSummary:
      enrichedCountry && "ethnic_groups_summary" in enrichedCountry
        ? (enrichedCountry as Country).ethnic_groups_summary
        : undefined,
    notes:
      enrichedCountry && "notes" in enrichedCountry
        ? (enrichedCountry as Country).notes
        : undefined,
    topEthnicities: topEthnicities,
  };
}

// Obtenir les détails d'une ethnie par clé
export async function getEthnicityGlobalDetailsByKey(
  ethnicityKey: string
): Promise<EthnicityGlobalData | null> {
  const ethnicity = await getEthnicityBySlugFromSupabase(ethnicityKey);
  if (!ethnicity) return null;

  return await getEthnicityGlobalDetails(ethnicity.name_fr);
}
