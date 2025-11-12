import { EthnicityData } from '@/types/ethnicity';

const CSV_FILES = [
  '/data/afrique_du_nord_ethnies_2025.csv',
  '/data/afrique_de_l_ouest_ethnies_2025.csv',
  '/data/afrique_centrale_ethnies_2025.csv',
  '/data/afrique_de_l_est_ethnies_2025.csv',
  '/data/afrique_australe_ethnies_2025.csv',
];

export const parseCSV = (text: string): EthnicityData[] => {
  const lines = text.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.replace(/^\ufeff/, '').trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj as unknown as EthnicityData;
  });
};

export const loadAllCSVData = async (): Promise<EthnicityData[]> => {
  const allData: EthnicityData[] = [];
  
  for (const file of CSV_FILES) {
    try {
      const response = await fetch(file);
      const text = await response.text();
      const data = parseCSV(text);
      allData.push(...data);
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
    }
  }
  
  return allData;
};

export const getCountries = (data: EthnicityData[]): string[] => {
  const countries = new Set(data.map(d => d.Country).filter(Boolean));
  return Array.from(countries).sort();
};

export const getEthnicGroups = (data: EthnicityData[]) => {
  const groups = new Map<string, {
    countries: Set<string>;
    totalPopulation: number;
    africaPercentage: number;
  }>();

  data.forEach(row => {
    if (row.Ethnicity_or_Subgroup && !row.Ethnicity_or_Subgroup.includes('sous-groupe')) {
      const name = row.Ethnicity_or_Subgroup;
      
      if (!groups.has(name)) {
        groups.set(name, {
          countries: new Set(),
          totalPopulation: 0,
          africaPercentage: 0,
        });
      }
      
      const group = groups.get(name)!;
      group.countries.add(row.Country);
      
      const pop = parseFloat(row["population de l'ethnie estimée dans le pays"]) || 0;
      const africaPct = parseFloat(row["pourcentage dans la population totale d'Afrique"]) || 0;
      
      group.totalPopulation += pop;
      group.africaPercentage += africaPct;
    }
  });

  return Array.from(groups.entries())
    .map(([name, data]) => ({
      name,
      countries: Array.from(data.countries),
      totalPopulation: data.totalPopulation,
      africaPercentage: data.africaPercentage,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

// Fonction pour obtenir les détails complets d'un pays
export const getCountryDetails = (data: EthnicityData[], countryName: string) => {
  const countryData = data.filter(row => row.Country === countryName);
  if (countryData.length === 0) return null;

  const firstRow = countryData[0];
  const population = parseFloat(firstRow["population 2025 du pays"]) || 0;

  const ethnicities = countryData
    .filter(row => row.Ethnicity_or_Subgroup && !row.Ethnicity_or_Subgroup.includes('sous-groupe'))
    .map(row => ({
      name: row.Ethnicity_or_Subgroup,
      population: parseFloat(row["population de l'ethnie estimée dans le pays"]) || 0,
      percentageInCountry: parseFloat(row["pourcentage dans la population du pays"]) || 0,
      percentageInAfrica: parseFloat(row["pourcentage dans la population totale d'Afrique"]) || 0,
    }))
    .sort((a, b) => b.population - a.population);

  return {
    name: countryName,
    population,
    ethnicities,
    ethnicityCount: ethnicities.length,
  };
};

// Fonction pour obtenir les détails complets d'une ethnie
export const getEthnicityDetails = (data: EthnicityData[], ethnicityName: string) => {
  const ethnicityData = data.filter(row => 
    row.Ethnicity_or_Subgroup === ethnicityName && 
    !row.Ethnicity_or_Subgroup.includes('sous-groupe')
  );
  
  if (ethnicityData.length === 0) return null;

  let totalPopulation = 0;
  let totalAfricaPercentage = 0;
  const countries = new Map<string, {
    population: number;
    percentageInCountry: number;
    percentageInAfrica: number;
  }>();

  ethnicityData.forEach(row => {
    const pop = parseFloat(row["population de l'ethnie estimée dans le pays"]) || 0;
    const pctCountry = parseFloat(row["pourcentage dans la population du pays"]) || 0;
    const pctAfrica = parseFloat(row["pourcentage dans la population totale d'Afrique"]) || 0;
    
    totalPopulation += pop;
    totalAfricaPercentage += pctAfrica;
    
    if (row.Country) {
      countries.set(row.Country, {
        population: pop,
        percentageInCountry: pctCountry,
        percentageInAfrica: pctAfrica,
      });
    }
  });

  const countriesList = Array.from(countries.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.population - a.population);

  return {
    name: ethnicityName,
    totalPopulation,
    percentageInAfrica: totalAfricaPercentage,
    countries: countriesList,
    countryCount: countriesList.length,
  };
};

// Fonction pour obtenir la région d'un pays
export const getCountryRegion = (countryName: string): string => {
  const northAfrica = [
    "Algérie", "Maroc", "Tunisie", "Égypte", "Libye", "Soudan", "Mauritanie", "Sahara occidental"
  ];
  const westAfrica = [
    "Bénin", "Burkina Faso", "Cabo Verde", "Côte d'Ivoire", "Gambie", "Ghana",
    "Guinée", "Guinée-Bissau", "Liberia", "Mali", "Niger", "Nigeria",
    "Sénégal", "Sierra Leone", "Togo"
  ];
  const centralAfrica = [
    "Cameroun", "République centrafricaine", "Tchad", "Congo (Brazzaville)",
    "Congo (RDC)", "Gabon", "Guinée équatoriale", "São Tomé-et-Príncipe"
  ];
  const eastAfrica = [
    "Burundi", "Comores", "Djibouti", "Érythrée", "Éthiopie", "Kenya",
    "Madagascar", "Malawi", "Maurice", "Mozambique", "Ouganda", "Rwanda",
    "Seychelles", "Somalie", "Soudan du Sud", "Tanzanie"
  ];

  if (northAfrica.some(c => countryName.includes(c))) return "north";
  if (westAfrica.some(c => countryName.includes(c))) return "west";
  if (centralAfrica.some(c => countryName.includes(c))) return "central";
  if (eastAfrica.some(c => countryName.includes(c))) return "east";
  return "south";
};
