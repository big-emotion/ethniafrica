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

export type Language = 'en' | 'fr' | 'es' | 'pt';

export type ViewMode = 'country' | 'ethnicity' | 'statistics';
