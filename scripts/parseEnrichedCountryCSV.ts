import * as fs from "fs";
import * as path from "path";

interface EnrichedCSVRow {
  Group: string;
  Sub_group: string;
  Population_2025: string;
  Percentage_in_country: string;
  Percentage_in_Africa: string;
  Language: string;
  Region: string;
  Sources: string;
  Ancient_Name: string;
  Description: string;
  Type_de_societe: string;
  Religion: string;
  Famille_linguistique: string;
  Statut_historique: string;
  Presence_regionale: string;
}

interface SubgroupInfo {
  name: string;
  population: number;
  percentageInCountry: number;
  percentageInAfrica: number;
}

interface ParsedEthnicity {
  groupName: string;
  subGroups: SubgroupInfo[];
  population: number;
  percentageInCountry: number;
  percentageInAfrica: number;
  languages: string[];
  region: string;
  sources: string[];
  ancientName: string;
  description: string;
  societyType: string;
  religion: string;
  linguisticFamily: string;
  historicalStatus: string;
  regionalPresence: string[];
  isGroupWithSubgroups: boolean;
}

interface ParsedCountryData {
  countryName: string;
  region: string;
  ethnicities: ParsedEthnicity[];
}

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

function parseCSV(content: string): EnrichedCSVRow[] {
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
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });
    return obj as unknown as EnrichedCSVRow;
  });
}

// Détecter les sous-groupes depuis le nom du groupe (pattern avec parenthèses)
function detectSubgroupsFromGroupName(groupName: string): {
  mainGroup: string;
  subgroups: string[];
} | null {
  const match = groupName.match(/^(.+?)\s*\((.+)\)$/);
  if (match) {
    const mainGroup = match[1].trim();
    const subgroupsStr = match[2].trim();
    const subgroups = subgroupsStr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return { mainGroup, subgroups };
  }
  return null;
}

// Détecter les sous-groupes depuis Sub_group (virgules)
function detectSubgroupsFromSubGroup(subGroup: string): string[] {
  if (!subGroup || subGroup.trim() === "") return [];
  return subGroup
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Calculer la population d'un sous-groupe (répartition égale si pas de pourcentages)
function calculateSubgroupPopulation(
  totalPopulation: number,
  subgroupIndex: number,
  totalSubgroups: number
): number {
  return Math.round(totalPopulation / totalSubgroups);
}

// Parser un fichier CSV enrichi pour un pays
function parseCountryCSV(
  csvPath: string,
  countryName: string,
  region: string
): ParsedCountryData {
  const content = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(content);

  const ethnicities: ParsedEthnicity[] = [];

  for (const row of rows) {
    if (!row.Group || row.Group.trim() === "") continue;

    const population = parseFloat(row.Population_2025) || 0;
    const percentageInCountry = parseFloat(row.Percentage_in_country) || 0;
    const percentageInAfrica = parseFloat(row.Percentage_in_Africa) || 0;

    // Détecter les sous-groupes
    const groupNameWithParens = detectSubgroupsFromGroupName(row.Group);
    const subGroupsFromSubGroup = detectSubgroupsFromSubGroup(row.Sub_group);

    let mainGroupName: string;
    let subgroups: string[] = [];
    let isGroupWithSubgroups = false;

    if (groupNameWithParens) {
      // Pattern avec parenthèses dans Group
      mainGroupName = groupNameWithParens.mainGroup;
      subgroups = groupNameWithParens.subgroups;
      isGroupWithSubgroups = subgroups.length > 0;
    } else if (subGroupsFromSubGroup.length > 1) {
      // Pattern avec virgules dans Sub_group
      mainGroupName = row.Group.trim();
      subgroups = subGroupsFromSubGroup;
      isGroupWithSubgroups = true;
    } else {
      // Pas de sous-groupes
      mainGroupName = row.Group.trim();
      isGroupWithSubgroups = false;
    }

    // Parser les langues
    const languages = row.Language
      ? row.Language.split(",")
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
      : [];

    // Parser les sources
    const sources = row.Sources
      ? row.Sources.split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

    // Parser la présence régionale
    const regionalPresence = row.Presence_regionale
      ? row.Presence_regionale.split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
      : [];

    // Créer l'entité principale
    const ethnicity: ParsedEthnicity = {
      groupName: mainGroupName,
      subGroups: [],
      population,
      percentageInCountry,
      percentageInAfrica,
      languages,
      region: row.Region || "",
      sources,
      ancientName: row.Ancient_Name || "",
      description: row.Description || "",
      societyType: row.Type_de_societe || "",
      religion: row.Religion || "",
      linguisticFamily: row.Famille_linguistique || "",
      historicalStatus: row.Statut_historique || "",
      regionalPresence,
      isGroupWithSubgroups,
    };

    // Si c'est un groupe avec sous-groupes, créer les sous-groupes
    if (isGroupWithSubgroups && subgroups.length > 0) {
      for (let i = 0; i < subgroups.length; i++) {
        const subgroupName = subgroups[i];
        const subgroupPopulation = calculateSubgroupPopulation(
          population,
          i,
          subgroups.length
        );
        const subgroupPercentageInCountry =
          (subgroupPopulation / (population / percentageInCountry)) * 100 || 0;
        const subgroupPercentageInAfrica =
          (subgroupPopulation / (population / percentageInAfrica)) * 100 || 0;

        ethnicity.subGroups.push({
          name: subgroupName,
          population: subgroupPopulation,
          percentageInCountry: subgroupPercentageInCountry,
          percentageInAfrica: subgroupPercentageInAfrica,
        });
      }
    }

    ethnicities.push(ethnicity);
  }

  return {
    countryName,
    region,
    ethnicities,
  };
}

// Fonction principale
function main() {
  const sourceDir = path.join(process.cwd(), "dataset", "source");
  const outputDir = path.join(process.cwd(), "dataset", "parsed");

  // Créer le dossier de sortie
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const allParsedData: ParsedCountryData[] = [];

  // Parcourir les dossiers de régions
  const regions = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const regionDir of regions) {
    if (!regionDir.isDirectory()) continue;

    const region = regionDir.name;
    const regionPath = path.join(sourceDir, region);

    // Parcourir les dossiers de pays
    const countries = fs.readdirSync(regionPath, { withFileTypes: true });
    for (const countryDir of countries) {
      if (!countryDir.isDirectory()) continue;

      const countryName = countryDir.name;
      const countryPath = path.join(regionPath, countryName);

      // Chercher le fichier CSV selon la règle :
      // 1. Si un fichier *_ethnies_complet.csv existe, on l'utilise (et on ignore les autres)
      // 2. Sinon, on cherche n'importe quel autre fichier CSV
      let csvFiles = fs
        .readdirSync(countryPath)
        .filter((f) => f.endsWith(".csv") && f.includes("_ethnies_complet"));

      if (csvFiles.length === 0) {
        // Aucun fichier _ethnies_complet trouvé, chercher n'importe quel CSV
        csvFiles = fs
          .readdirSync(countryPath)
          .filter((f) => f.endsWith(".csv"));
      }

      if (csvFiles.length === 0) {
        console.warn(
          `⚠️  Aucun fichier CSV trouvé pour ${countryName} dans ${region}`
        );
        continue;
      }

      const csvPath = path.join(countryPath, csvFiles[0]);
      console.log(`📄 Parsing ${region}/${countryName}...`);

      try {
        const parsedData = parseCountryCSV(csvPath, countryName, region);
        allParsedData.push(parsedData);

        // Sauvegarder le JSON parsé
        const outputPath = path.join(
          outputDir,
          `${region}_${countryName}.json`
        );
        fs.writeFileSync(
          outputPath,
          JSON.stringify(parsedData, null, 2),
          "utf-8"
        );
        console.log(`  ✓ Parsed and saved to ${outputPath}`);
      } catch (error) {
        console.error(
          `  ✗ Erreur lors du parsing de ${countryName}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  // Sauvegarder un fichier global
  const globalOutputPath = path.join(outputDir, "all_countries.json");
  fs.writeFileSync(
    globalOutputPath,
    JSON.stringify(allParsedData, null, 2),
    "utf-8"
  );

  console.log("\n✅ Parsing terminé!");
  console.log(`📊 ${allParsedData.length} pays parsés`);
  console.log(`📁 Fichiers sauvegardés dans: ${outputDir}`);
}

main();
