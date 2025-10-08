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
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj as EthnicityData;
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
