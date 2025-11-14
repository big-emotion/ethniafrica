import {
  RegionData,
  EthnicityInCountry,
  EthnicityGlobalData,
} from "@/types/ethnicity";

// Obtenir la population totale de l'Afrique
export async function getTotalPopulationAfrica(): Promise<number> {
  try {
    const response = await fetch("/api/stats");
    if (!response.ok) {
      throw new Error("Failed to load total population");
    }
    const data = await response.json();
    return data.totalPopulation || 0;
  } catch (error) {
    console.error("Error loading total population:", error);
    return 0;
  }
}

// Obtenir toutes les régions
export async function getRegions(): Promise<
  Array<{ key: string; data: RegionData }>
> {
  try {
    const response = await fetch("/api/regions");
    if (!response.ok) {
      throw new Error("Failed to load regions");
    }
    const data = await response.json();
    return data.regions || [];
  } catch (error) {
    console.error("Error loading regions:", error);
    return [];
  }
}

// Obtenir une région spécifique
export async function getRegion(regionKey: string): Promise<RegionData | null> {
  try {
    const response = await fetch(`/api/regions/${regionKey}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.region || null;
  } catch (error) {
    console.error(`Error loading region ${regionKey}:`, error);
    return null;
  }
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
  try {
    const response = await fetch(`/api/regions/${regionKey}/countries`);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.countries || [];
  } catch (error) {
    console.error(`Error loading countries for region ${regionKey}:`, error);
    return [];
  }
}

// Obtenir les ethnies d'un pays
export async function getEthnicitiesInCountry(
  regionKey: string,
  countryName: string
): Promise<EthnicityInCountry[]> {
  try {
    const encodedCountry = encodeURIComponent(countryName);
    const response = await fetch(`/api/countries/${encodedCountry}`);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    // Convertir les données de l'API vers le format EthnicityInCountry
    return (data.ethnicities || []).map(
      (eth: {
        name: string;
        percentageInCountry?: number;
        population?: number;
        percentageInAfrica?: number;
      }) => ({
        Ethnicity_or_Subgroup: eth.name,
        "pourcentage dans la population du pays":
          eth.percentageInCountry?.toString() || "0",
        "population de l'ethnie estimée dans le pays":
          eth.population?.toString() || "0",
        "pourcentage dans la population totale d'Afrique":
          eth.percentageInAfrica?.toString() || "0",
      })
    );
  } catch (error) {
    console.error(`Error loading ethnicities for ${countryName}:`, error);
    return [];
  }
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
  }>;
  description?: string;
  ancientNames?: string[]; // Max 3 pour le résumé
  allAncientNames?: string[]; // Tous pour la section détaillée
  topEthnicities?: Array<{
    name: string;
    languages: string[];
  }>;
} | null> {
  try {
    const encodedCountry = encodeURIComponent(countryName);
    const response = await fetch(`/api/countries/${encodedCountry}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return {
      name: data.name || countryName,
      population: data.population || 0,
      percentageInRegion: data.percentageInRegion || 0,
      percentageInAfrica: data.percentageInAfrica || 0,
      region: data.region || "",
      ethnicities: data.ethnicities || [],
      description: data.description,
      ancientNames: data.ancientNames,
      allAncientNames: data.allAncientNames,
      topEthnicities: data.topEthnicities,
    };
  } catch (error) {
    console.error(`Error loading country details for ${countryName}:`, error);
    return null;
  }
}

// Obtenir les détails d'une ethnie globale (tous pays)
export async function getEthnicityGlobalDetails(
  ethnicityName: string
): Promise<EthnicityGlobalData | null> {
  try {
    const encodedEthnicity = encodeURIComponent(ethnicityName);
    const response = await fetch(`/api/ethnicities/${encodedEthnicity}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      `Error loading ethnicity details for ${ethnicityName}:`,
      error
    );
    return null;
  }
}

// Obtenir la région d'un pays
export async function getCountryRegion(
  countryName: string
): Promise<string | null> {
  try {
    const encodedCountry = encodeURIComponent(countryName);
    const response = await fetch(`/api/countries/${encodedCountry}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    // Extraire la région depuis les données
    // On peut aussi utiliser l'API regions pour trouver la région
    const regions = await getRegions();
    for (const region of regions) {
      const countries = await getCountriesInRegion(region.key);
      if (countries.some((c) => c.name === countryName)) {
        return region.key;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error loading region for country ${countryName}:`, error);
    return null;
  }
}

// Obtenir toutes les ethnies d'une région
export async function getEthnicitiesInRegion(regionKey: string) {
  const region = await getRegion(regionKey);
  if (!region) return [];

  return Object.entries(region.ethnicities || {})
    .map(
      ([name, data]: [
        string,
        { totalPopulation?: number; percentageInAfrica?: number },
      ]) => ({
        name,
        ...data,
      })
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Obtenir tous les pays
export async function getAllCountries(): Promise<
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
  try {
    const response = await fetch("/api/countries");
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.countries || [];
  } catch (error) {
    console.error("Error loading all countries:", error);
    return [];
  }
}

// Obtenir toutes les ethnies
export async function getAllEthnicities(): Promise<
  Array<{
    name: string;
    key: string;
    totalPopulation: number;
    percentageInAfrica: number;
    countryCount: number;
  }>
> {
  try {
    const response = await fetch("/api/ethnicities");
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.ethnicities || [];
  } catch (error) {
    console.error("Error loading all ethnicities:", error);
    return [];
  }
}
