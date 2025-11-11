import * as fs from "fs";
import * as path from "path";

interface CSVRow {
  Country: string;
  "population 2025 du pays": string;
  Ethnicity_or_Subgroup: string;
  "pourcentage dans la population du pays": string;
  "population de l'ethnie estimée dans le pays": string;
  "pourcentage dans la population totale d'Afrique": string;
}

interface CountryData {
  name: string;
  population: number;
  percentageInRegion: number;
  percentageInAfrica: number;
  ethnicityCount: number;
}

interface EthnicityInRegion {
  name: string;
  totalPopulationInRegion: number;
  percentageInRegion: number;
  percentageInAfrica: number;
}

interface RegionData {
  name: string;
  totalPopulation: number;
  countries: Record<string, CountryData>;
  ethnicities: Record<string, EthnicityInRegion>;
}

interface DatasetIndex {
  totalPopulationAfrica: number;
  regions: Record<string, RegionData>;
}

// Mapping des noms de fichiers vers les noms de régions
const REGION_MAPPING: Record<string, string> = {
  "afrique_du_nord_ethnies_2025.csv": "afrique_du_nord",
  "afrique_de_l_ouest_ethnies_2025.csv": "afrique_de_l_ouest",
  "afrique_centrale_ethnies_2025.csv": "afrique_centrale",
  "afrique_de_l_est_ethnies_2025.csv": "afrique_de_l_est",
  "afrique_australe_ethnies_2025.csv": "afrique_australe",
};

const REGION_NAMES: Record<string, string> = {
  afrique_du_nord: "Afrique du Nord",
  afrique_de_l_ouest: "Afrique de l'Ouest",
  afrique_centrale: "Afrique Centrale",
  afrique_de_l_est: "Afrique de l'Est",
  afrique_australe: "Afrique Australe",
};

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

function parseCSV(content: string): CSVRow[] {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0].replace(/^\ufeff/, "");
  const headers = parseCSVLine(headerLine).map((h) =>
    h.replace(/^"|"$/g, "").trim()
  );

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line).map((v) =>
      v.replace(/^"|"$/g, "").trim()
    );
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });
    return obj as CSVRow;
  });
}

function getRegionFromFilename(filename: string): string | null {
  return REGION_MAPPING[filename] || null;
}

function main() {
  const sourceDir = path.join(process.cwd(), "dataset", "source");
  const resultDir = path.join(process.cwd(), "dataset", "result");

  // Nettoyer le dossier result
  if (fs.existsSync(resultDir)) {
    fs.rmSync(resultDir, { recursive: true });
  }
  fs.mkdirSync(resultDir, { recursive: true });

  const datasetIndex: DatasetIndex = {
    totalPopulationAfrica: 0,
    regions: {},
  };

  // Étape 1: Lire tous les fichiers CSV et collecter les données
  const allRows: Array<CSVRow & { region: string }> = [];
  const countryPopulations = new Map<string, number>(); // Pour éviter les doublons
  const allRegions = new Set<string>();

  const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".csv"));

  for (const file of files) {
    const region = getRegionFromFilename(file);
    if (!region) {
      console.warn(`Fichier ignoré (région inconnue): ${file}`);
      continue;
    }

    allRegions.add(region);
    const filePath = path.join(sourceDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const rows = parseCSV(content);

    for (const row of rows) {
      if (!row.Country || !row.Ethnicity_or_Subgroup) continue;

      const country = row.Country.trim();
      const population = parseFloat(row["population 2025 du pays"]) || 0;

      // Stocker la population unique de chaque pays
      if (!countryPopulations.has(country)) {
        countryPopulations.set(country, population);
      }

      allRows.push({
        ...row,
        region,
      });
    }
  }

  // Calculer la population totale de l'Afrique
  datasetIndex.totalPopulationAfrica = Array.from(
    countryPopulations.values()
  ).reduce((sum, pop) => sum + pop, 0);

  // Étape 2: Organiser les données par région
  for (const region of allRegions) {
    const regionRows = allRows.filter((r) => r.region === region);

    // Calculer la population totale de la région
    const regionCountries = new Set(regionRows.map((r) => r.Country.trim()));
    const regionTotalPopulation = Array.from(regionCountries).reduce(
      (sum, country) => {
        const pop = countryPopulations.get(country) || 0;
        return sum + pop;
      },
      0
    );

    const regionData: RegionData = {
      name: REGION_NAMES[region] || region,
      totalPopulation: regionTotalPopulation,
      countries: {},
      ethnicities: {},
    };

    // Traiter les pays de la région
    const countriesInRegion = new Map<
      string,
      {
        population: number;
        ethnicities: Set<string>;
      }
    >();

    for (const row of regionRows) {
      const country = row.Country.trim();
      const ethnicity = row.Ethnicity_or_Subgroup.trim();

      if (!countriesInRegion.has(country)) {
        countriesInRegion.set(country, {
          population: countryPopulations.get(country) || 0,
          ethnicities: new Set(),
        });
      }

      const countryData = countriesInRegion.get(country)!;
      if (
        !ethnicity.includes("sous-groupe") &&
        !ethnicity.includes("(sous-groupe)")
      ) {
        countryData.ethnicities.add(ethnicity);
      }
    }

    // Calculer les statistiques des pays
    for (const [country, data] of countriesInRegion.entries()) {
      const population = data.population;
      const percentageInRegion = (population / regionTotalPopulation) * 100;
      const percentageInAfrica =
        (population / datasetIndex.totalPopulationAfrica) * 100;

      regionData.countries[country] = {
        name: country,
        population,
        percentageInRegion,
        percentageInAfrica,
        ethnicityCount: data.ethnicities.size,
      };
    }

    // Traiter les ethnies de la région
    const ethnicitiesInRegion = new Map<
      string,
      {
        totalPopulation: number;
        totalPercentageAfrica: number;
      }
    >();

    // Obtenir les clés exactes du premier row pour s'assurer d'utiliser les bonnes clés
    const firstRowForEthnies = regionRows[0];
    if (firstRowForEthnies) {
      const keys = Object.keys(firstRowForEthnies);
      const keyPopEthnie =
        keys.find(
          (k) => k.includes("population de l") && k.includes("ethnie estimée")
        ) || "population de l'ethnie estimée dans le pays";
      const keyPctAfrica =
        keys.find((k) => k.includes("pourcentage dans la population totale")) ||
        "pourcentage dans la population totale d'Afrique";

      for (const row of regionRows) {
        const ethnicity = row.Ethnicity_or_Subgroup.trim();
        if (
          ethnicity.includes("sous-groupe") ||
          ethnicity.includes("(sous-groupe)")
        ) {
          continue;
        }

        // Utiliser les clés exactes trouvées
        const pop = parseFloat((row as any)[keyPopEthnie] || "0") || 0;
        const pctAfrica = parseFloat((row as any)[keyPctAfrica] || "0") || 0;

        if (!ethnicitiesInRegion.has(ethnicity)) {
          ethnicitiesInRegion.set(ethnicity, {
            totalPopulation: 0,
            totalPercentageAfrica: 0,
          });
        }

        const ethData = ethnicitiesInRegion.get(ethnicity)!;
        ethData.totalPopulation += pop;
        ethData.totalPercentageAfrica += pctAfrica;
      }
    }

    // Calculer les statistiques des ethnies
    for (const [ethnicity, data] of ethnicitiesInRegion.entries()) {
      const percentageInRegion =
        (data.totalPopulation / regionTotalPopulation) * 100;

      regionData.ethnicities[ethnicity] = {
        name: ethnicity,
        totalPopulationInRegion: data.totalPopulation,
        percentageInRegion,
        percentageInAfrica: data.totalPercentageAfrica,
      };
    }

    datasetIndex.regions[region] = regionData;

    // Étape 3: Créer la structure de dossiers et fichiers CSV par pays
    const regionDir = path.join(resultDir, region);
    fs.mkdirSync(regionDir, { recursive: true });

    for (const country of regionCountries) {
      const countryDir = path.join(regionDir, country);
      fs.mkdirSync(countryDir, { recursive: true });

      const countryRows = regionRows.filter(
        (r) => r.Country.trim() === country
      );

      // Obtenir les clés exactes du premier row pour s'assurer d'utiliser les bonnes clés
      const firstRow = countryRows[0];
      if (!firstRow) continue;

      // Trouver les clés exactes en parcourant les propriétés de l'objet
      const keys = Object.keys(firstRow);
      const keyPctCountry =
        keys.find((k) =>
          k.includes("pourcentage dans la population du pays")
        ) || "pourcentage dans la population du pays";
      const keyPopEthnie =
        keys.find(
          (k) => k.includes("population de l") && k.includes("ethnie estimée")
        ) || "population de l'ethnie estimée dans le pays";
      const keyPctAfrica =
        keys.find((k) => k.includes("pourcentage dans la population totale")) ||
        "pourcentage dans la population totale d'Afrique";

      const ethnicityRows = countryRows
        .filter((r) => {
          const eth = r.Ethnicity_or_Subgroup.trim();
          return !eth.includes("sous-groupe") && !eth.includes("(sous-groupe)");
        })
        .map((r) => {
          // Récupérer les valeurs en utilisant les clés exactes trouvées
          const pctCountry = (r as any)[keyPctCountry] || "";
          const popEthnie = (r as any)[keyPopEthnie] || "";
          const pctAfrica = (r as any)[keyPctAfrica] || "";

          return {
            Ethnicity_or_Subgroup: r.Ethnicity_or_Subgroup.trim(),
            pctCountry: pctCountry.toString(),
            popEthnie: popEthnie.toString(),
            pctAfrica: pctAfrica.toString(),
          };
        });

      // Créer le fichier CSV pour ce pays
      const csvHeader =
        "Ethnicity_or_Subgroup,pourcentage dans la population du pays,population de l'ethnie estimée dans le pays,pourcentage dans la population totale d'Afrique\n";
      const csvRows = ethnicityRows
        .map((row) => {
          return `${row.Ethnicity_or_Subgroup},${row.pctCountry},${row.popEthnie},${row.pctAfrica}`;
        })
        .join("\n");

      const csvContent = csvHeader + csvRows;
      fs.writeFileSync(
        path.join(countryDir, "groupes_ethniques.csv"),
        csvContent,
        "utf-8"
      );
    }
  }

  // Étape 4: Écrire l'index.json
  fs.writeFileSync(
    path.join(resultDir, "index.json"),
    JSON.stringify(datasetIndex, null, 2),
    "utf-8"
  );

  // Étape 5: Copier vers public/dataset pour Next.js
  const publicDatasetDir = path.join(process.cwd(), "public", "dataset");
  if (fs.existsSync(publicDatasetDir)) {
    fs.rmSync(publicDatasetDir, { recursive: true });
  }
  fs.mkdirSync(publicDatasetDir, { recursive: true });

  // Copier récursivement tous les fichiers
  function copyRecursive(src: string, dest: string) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats!.isDirectory();

    if (isDirectory) {
      fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach((childItemName) => {
        copyRecursive(
          path.join(src, childItemName),
          path.join(dest, childItemName)
        );
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  copyRecursive(resultDir, publicDatasetDir);

  console.log("✅ Parsing terminé avec succès!");
  console.log(`📊 ${allRegions.size} régions traitées`);
  console.log(
    `🌍 Population totale Afrique: ${datasetIndex.totalPopulationAfrica.toLocaleString()}`
  );
  console.log(`📁 Structure créée dans: ${resultDir}`);
  console.log(`📦 Fichiers copiés vers: ${publicDatasetDir}`);
}

main();
