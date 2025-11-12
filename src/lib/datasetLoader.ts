import {
  DatasetIndex,
  RegionData,
  EthnicityInCountry,
  EthnicityGlobalData,
} from "@/types/ethnicity";

let cachedIndex: DatasetIndex | null = null;

// Charger l'index.json
export async function loadDatasetIndex(): Promise<DatasetIndex> {
  if (cachedIndex) {
    return cachedIndex;
  }

  try {
    const response = await fetch("/dataset/index.json");
    if (!response.ok) {
      throw new Error("Failed to load dataset index");
    }
    const data = await response.json();
    cachedIndex = data as DatasetIndex;
    return cachedIndex;
  } catch (error) {
    console.error("Error loading dataset index:", error);
    throw error;
  }
}

// Obtenir toutes les régions
export async function getRegions(): Promise<
  Array<{ key: string; data: RegionData }>
> {
  const index = await loadDatasetIndex();
  return Object.entries(index.regions).map(([key, data]) => ({ key, data }));
}

// Obtenir une région spécifique
export async function getRegion(regionKey: string): Promise<RegionData | null> {
  const index = await loadDatasetIndex();
  return index.regions[regionKey] || null;
}

// Obtenir les pays d'une région
export async function getCountriesInRegion(
  regionKey: string
): Promise<Array<{ name: string; data: any }>> {
  const region = await getRegion(regionKey);
  if (!region) return [];

  return Object.entries(region.countries).map(([name, data]) => ({
    name,
    data,
  }));
}

// Obtenir les ethnies d'un pays
// Parser CSV qui gère correctement les valeurs entre guillemets
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Guillemet échappé (double guillemet)
        current += '"';
        i++; // Skip le prochain guillemet
      } else {
        // Toggle du mode guillemets
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Virgule en dehors des guillemets = séparateur
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Ajouter la dernière valeur
  values.push(current.trim());

  return values;
}

export async function getEthnicitiesInCountry(
  regionKey: string,
  countryName: string
): Promise<EthnicityInCountry[]> {
  try {
    // Encoder le nom du pays pour l'URL
    const encodedCountry = encodeURIComponent(countryName);
    const response = await fetch(
      `/dataset/${regionKey}/${encodedCountry}/groupes_ethniques.csv`
    );

    if (!response.ok) {
      throw new Error(`Failed to load ethnicities for ${countryName}`);
    }

    const text = await response.text();
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);
    const data: EthnicityInCountry[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || "";
      });
      data.push(obj as EthnicityInCountry);
    }

    return data;
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
} | null> {
  const region = await getRegion(regionKey);
  if (!region) return null;

  const countryData = region.countries[countryName];
  if (!countryData) return null;

  const ethnicitiesData = await getEthnicitiesInCountry(regionKey, countryName);

  const ethnicities = ethnicitiesData.map((eth) => ({
    name: eth.Ethnicity_or_Subgroup,
    population:
      parseFloat(eth["population de l'ethnie estimée dans le pays"]) || 0,
    percentageInCountry:
      parseFloat(eth["pourcentage dans la population du pays"]) || 0,
    percentageInRegion:
      ((parseFloat(eth["population de l'ethnie estimée dans le pays"]) || 0) /
        region.totalPopulation) *
      100,
    percentageInAfrica:
      parseFloat(eth["pourcentage dans la population totale d'Afrique"]) || 0,
  }));

  return {
    name: countryName,
    population: countryData.population,
    percentageInRegion: countryData.percentageInRegion,
    percentageInAfrica: countryData.percentageInAfrica,
    region: region.name,
    ethnicities: ethnicities.sort((a, b) => b.population - a.population),
  };
}

// Obtenir les détails d'une ethnie globale (tous pays)
export async function getEthnicityGlobalDetails(
  ethnicityName: string
): Promise<EthnicityGlobalData | null> {
  const index = await loadDatasetIndex();

  let totalPopulation = 0;
  let totalPercentageAfrica = 0;
  const countriesData: EthnicityGlobalData["countries"] = [];

  // Parcourir toutes les régions
  for (const [regionKey, region] of Object.entries(index.regions)) {
    // Vérifier si l'ethnie existe dans cette région
    const ethnicityInRegion = region.ethnicities[ethnicityName];
    if (!ethnicityInRegion) continue;

    totalPercentageAfrica += ethnicityInRegion.percentageInAfrica;

    // Parcourir tous les pays de la région pour trouver ceux qui ont cette ethnie
    for (const [countryName, countryData] of Object.entries(region.countries)) {
      const ethnicities = await getEthnicitiesInCountry(regionKey, countryName);
      const ethnicityData = ethnicities.find(
        (e) => e.Ethnicity_or_Subgroup === ethnicityName
      );

      if (ethnicityData) {
        const pop =
          parseFloat(
            ethnicityData["population de l'ethnie estimée dans le pays"]
          ) || 0;
        totalPopulation += pop;

        const percentageInCountry =
          parseFloat(ethnicityData["pourcentage dans la population du pays"]) ||
          0;
        const percentageInRegion = (pop / region.totalPopulation) * 100;
        const percentageInAfrica =
          parseFloat(
            ethnicityData["pourcentage dans la population totale d'Afrique"]
          ) || 0;

        countriesData.push({
          country: countryName,
          region: region.name,
          population: pop,
          percentageInCountry,
          percentageInRegion,
          percentageInAfrica,
        });
      }
    }
  }

  if (countriesData.length === 0) return null;

  // Calculer la population totale dans chaque région
  const regionPopulations = new Map<string, number>();
  countriesData.forEach((item) => {
    const current = regionPopulations.get(item.region) || 0;
    regionPopulations.set(item.region, current + item.population);
  });

  return {
    name: ethnicityName,
    totalPopulation,
    percentageInAfrica: totalPercentageAfrica,
    countries: countriesData.sort((a, b) => b.population - a.population),
  };
}

// Obtenir la région d'un pays
export async function getCountryRegion(
  countryName: string
): Promise<string | null> {
  const index = await loadDatasetIndex();

  for (const [regionKey, region] of Object.entries(index.regions)) {
    if (region.countries[countryName]) {
      return regionKey;
    }
  }

  return null;
}

// Obtenir toutes les ethnies d'une région
export async function getEthnicitiesInRegion(regionKey: string) {
  const region = await getRegion(regionKey);
  if (!region) return [];

  return Object.entries(region.ethnicities)
    .map(([name, data]) => ({
      name,
      ...data,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Obtenir tous les pays
export async function getAllCountries(): Promise<
  Array<{
    name: string;
    region: string;
    regionName: string;
    data: any;
  }>
> {
  const index = await loadDatasetIndex();
  const countries: Array<{
    name: string;
    region: string;
    regionName: string;
    data: any;
  }> = [];

  for (const [regionKey, region] of Object.entries(index.regions)) {
    for (const [countryName, countryData] of Object.entries(region.countries)) {
      countries.push({
        name: countryName,
        region: regionKey,
        regionName: region.name,
        data: countryData,
      });
    }
  }

  return countries.sort((a, b) => a.name.localeCompare(b.name));
}

// Obtenir toutes les ethnies
export async function getAllEthnicities(): Promise<
  Array<{
    name: string;
    totalPopulation: number;
    percentageInAfrica: number;
    countryCount: number;
  }>
> {
  const index = await loadDatasetIndex();
  const ethnicitiesMap = new Map<
    string,
    {
      totalPopulation: number;
      percentageInAfrica: number;
      countries: Set<string>;
    }
  >();

  // Parcourir toutes les régions et tous les pays pour trouver les ethnies réelles
  for (const [regionKey, region] of Object.entries(index.regions)) {
    for (const countryName of Object.keys(region.countries)) {
      const ethnicities = await getEthnicitiesInCountry(regionKey, countryName);

      for (const ethnicity of ethnicities) {
        const ethName = ethnicity.Ethnicity_or_Subgroup;

        if (!ethnicitiesMap.has(ethName)) {
          ethnicitiesMap.set(ethName, {
            totalPopulation: 0,
            percentageInAfrica: 0,
            countries: new Set(),
          });
        }

        const eth = ethnicitiesMap.get(ethName)!;
        const pop =
          parseFloat(
            ethnicity["population de l'ethnie estimée dans le pays"]
          ) || 0;
        const pctAfrica =
          parseFloat(
            ethnicity["pourcentage dans la population totale d'Afrique"]
          ) || 0;

        eth.totalPopulation += pop;
        eth.percentageInAfrica += pctAfrica;
        eth.countries.add(countryName);
      }
    }
  }

  return Array.from(ethnicitiesMap.entries())
    .map(([name, data]) => ({
      name,
      totalPopulation: data.totalPopulation,
      percentageInAfrica: data.percentageInAfrica,
      countryCount: data.countries.size,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
