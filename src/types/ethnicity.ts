export interface EthnicityData {
  Country: string;
  "population 2025 du pays": string;
  Ethnicity_or_Subgroup: string;
  "pourcentage dans la population du pays": string;
  "population de l'ethnie estimée dans le pays": string;
  "pourcentage dans la population totale d'Afrique": string;
}

export interface CountryData {
  name: string;
  population: number;
  groups: EthnicityGroup[];
}

export interface EthnicityGroup {
  name: string;
  percentage: number;
  population: number;
  africaPercentage: number;
  isSubgroup: boolean;
  countries: string[];
}

export type Language = "en" | "fr" | "es" | "pt";

export type ViewMode = "region" | "country" | "ethnicity";

// Types pour la nouvelle structure dataset
export interface RegionData {
  name: string;
  totalPopulation: number;
  countries: Record<string, CountryData>;
  ethnicities: Record<string, EthnicityInRegion>;
}

export interface CountryData {
  name: string;
  population: number;
  percentageInRegion: number;
  percentageInAfrica: number;
  ethnicityCount: number;
}

export interface EthnicityInRegion {
  name: string;
  totalPopulationInRegion: number;
  percentageInRegion: number;
  percentageInAfrica: number;
}

export interface DatasetIndex {
  totalPopulationAfrica: number;
  regions: Record<string, RegionData>;
}

// Types pour les données d'ethnie par pays
export interface EthnicityInCountry {
  Ethnicity_or_Subgroup: string;
  "pourcentage dans la population du pays": string;
  "population de l'ethnie estimée dans le pays": string;
  "pourcentage dans la population totale d'Afrique": string;
}

// Types pour les données d'ethnie globale
export interface EthnicityGlobalData {
  name: string;
  totalPopulation: number;
  percentageInAfrica: number;
  countries: Array<{
    country: string;
    region: string;
    population: number;
    percentageInCountry: number;
    percentageInRegion: number;
    percentageInAfrica: number;
  }>;
  regions?: Array<{
    name: string;
    totalPopulation: number;
    ethnicityPopulation: number;
    percentageInRegion: number;
  }>;
}

// Types pour les données enrichies
export interface AncientNameEntry {
  period: string;
  names: string[];
}

export interface EnrichedCountry {
  description?: string;
  ancientNames?: AncientNameEntry[]; // Max 3 entrées
  topEthnicities?: Array<{
    name: string;
    languages: string[];
  }>;
}

// Types pour la structure hiérarchique des ethnies
export interface SubgroupInfo {
  name: string;
  population: number;
  percentageInCountry: number;
  percentageInRegion: number;
  percentageInAfrica: number;
}

export interface EthnicityWithSubgroups {
  name: string;
  population: number;
  percentageInCountry: number;
  percentageInRegion: number;
  percentageInAfrica: number;
  isParent: boolean;
  parentName?: string;
  subgroups?: SubgroupInfo[];
}

export interface EnrichedEthnicity {
  description?: string;
  ancientName?: string[]; // Max 3
  societyType?: string;
  religion?: string;
  linguisticFamily?: string;
  historicalStatus?: string;
  regionalPresence?: string;
  languages?: Array<{ name: string; isPrimary: boolean }>;
  topLanguages?: string[]; // Top 5
  parentId?: string;
  subgroups?: EnrichedEthnicity[];
  isSubgroup?: boolean;
}
