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

interface LegacyCSVRow {
  Ethnicity_or_Subgroup: string;
  "pourcentage dans la population du pays": string;
  "population de l'ethnie estimée dans le pays": string;
  "pourcentage dans la population totale d'Afrique": string;
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

function parseLegacyCSV(content: string): LegacyCSVRow[] {
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
    return obj as unknown as LegacyCSVRow;
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

// Détecter le format CSV en analysant les en-têtes
function detectCSVFormat(content: string): "enriched" | "legacy" {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length < 1) return "enriched"; // Default

  const headerLine = lines[0].replace(/^\ufeff/, "");
  const headers = parseCSVLine(headerLine).map((h) =>
    h.replace(/^"|"$/g, "").trim()
  );

  // Détecter le format enrichi
  if (
    headers.includes("Group") &&
    headers.includes("Population_2025") &&
    headers.includes("Percentage_in_country")
  ) {
    return "enriched";
  }

  // Détecter le format legacy
  if (
    headers.includes("Ethnicity_or_Subgroup") &&
    headers.includes("pourcentage dans la population du pays") &&
    headers.includes("population de l'ethnie estimée dans le pays")
  ) {
    return "legacy";
  }

  // Par défaut, essayer le format enrichi
  return "enriched";
}

// Détecter les sous-groupes dans le format legacy (pattern avec slash)
function detectSubgroupsFromLegacyName(name: string): {
  mainGroup: string;
  subgroups: string[];
} | null {
  // Pattern avec slash : "Basarwa/San" → groupe "Basarwa", sous-groupe "San"
  if (name.includes("/")) {
    const parts = name
      .split("/")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length >= 2) {
      return {
        mainGroup: parts[0],
        subgroups: parts.slice(1),
      };
    }
  }
  return null;
}

// Parser un fichier CSV legacy pour un pays
function parseLegacyCountryCSV(
  csvPath: string,
  countryName: string,
  region: string
): ParsedCountryData {
  const content = fs.readFileSync(csvPath, "utf-8");
  const rows = parseLegacyCSV(content);

  const ethnicities: ParsedEthnicity[] = [];

  for (const row of rows) {
    if (
      !row["Ethnicity_or_Subgroup"] ||
      row["Ethnicity_or_Subgroup"].trim() === ""
    ) {
      continue;
    }

    const ethnicityName = row["Ethnicity_or_Subgroup"].trim();

    // Parser les valeurs numériques (gérer les virgules et points)
    const populationStr = row["population de l'ethnie estimée dans le pays"]
      .replace(/,/g, "")
      .replace(/\s/g, "");
    const population = parseFloat(populationStr) || 0;

    const percentageInCountryStr = row["pourcentage dans la population du pays"]
      .replace(/,/g, ".")
      .replace(/\s/g, "");
    const percentageInCountry = parseFloat(percentageInCountryStr) || 0;

    const percentageInAfricaStr = row[
      "pourcentage dans la population totale d'Afrique"
    ]
      .replace(/,/g, ".")
      .replace(/\s/g, "");
    const percentageInAfrica = parseFloat(percentageInAfricaStr) || 0;

    // Détecter les sous-groupes (pattern avec slash)
    const subgroupsInfo = detectSubgroupsFromLegacyName(ethnicityName);

    if (subgroupsInfo) {
      // Créer le groupe principal
      const mainGroup: ParsedEthnicity = {
        groupName: subgroupsInfo.mainGroup,
        subGroups: [],
        population: 0, // La population sera répartie entre les sous-groupes
        percentageInCountry: 0,
        percentageInAfrica: 0,
        languages: [],
        region: "",
        sources: [],
        ancientName: "",
        description: "",
        societyType: "",
        religion: "",
        linguisticFamily: "",
        historicalStatus: "",
        regionalPresence: [],
        isGroupWithSubgroups: true,
      };

      // Créer les sous-groupes avec répartition égale de la population
      const subgroupCount = subgroupsInfo.subgroups.length;
      for (let i = 0; i < subgroupsInfo.subgroups.length; i++) {
        const subgroupName = subgroupsInfo.subgroups[i];
        const subgroupPopulation = Math.round(population / subgroupCount);
        // Calculer les pourcentages proportionnellement à la population
        // Si la population totale du pays est P, alors percentageInCountry = (population / P) * 100
        // Donc P = (population / percentageInCountry) * 100
        // Pour le sous-groupe : subgroupPercentageInCountry = (subgroupPopulation / P) * 100
        // = (subgroupPopulation / ((population / percentageInCountry) * 100)) * 100
        // = (subgroupPopulation * percentageInCountry) / population
        const subgroupPercentageInCountry =
          population > 0
            ? (subgroupPopulation * percentageInCountry) / population
            : 0;
        const subgroupPercentageInAfrica =
          population > 0
            ? (subgroupPopulation * percentageInAfrica) / population
            : 0;

        mainGroup.subGroups.push({
          name: subgroupName,
          population: subgroupPopulation,
          percentageInCountry: subgroupPercentageInCountry,
          percentageInAfrica: subgroupPercentageInAfrica,
        });
      }

      // Calculer la population totale du groupe (somme des sous-groupes)
      mainGroup.population = mainGroup.subGroups.reduce(
        (sum, sg) => sum + sg.population,
        0
      );
      mainGroup.percentageInCountry = mainGroup.subGroups.reduce(
        (sum, sg) => sum + sg.percentageInCountry,
        0
      );
      mainGroup.percentageInAfrica = mainGroup.subGroups.reduce(
        (sum, sg) => sum + sg.percentageInAfrica,
        0
      );

      ethnicities.push(mainGroup);
    } else {
      // Pas de sous-groupes, créer une entité simple
      const ethnicity: ParsedEthnicity = {
        groupName: ethnicityName,
        subGroups: [],
        population,
        percentageInCountry,
        percentageInAfrica,
        languages: [],
        region: "",
        sources: [],
        ancientName: "",
        description: "",
        societyType: "",
        religion: "",
        linguisticFamily: "",
        historicalStatus: "",
        regionalPresence: [],
        isGroupWithSubgroups: false,
      };

      ethnicities.push(ethnicity);
    }
  }

  return {
    countryName,
    region,
    ethnicities,
  };
}

// Parser un fichier CSV enrichi pour un pays
function parseCountryCSV(
  csvPath: string,
  countryName: string,
  region: string
): ParsedCountryData {
  const content = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(content);

  // Map pour regrouper les lignes par Group
  const groupMap = new Map<
    string,
    {
      rows: EnrichedCSVRow[];
      totalPopulation: number;
      totalPercentageInCountry: number;
      totalPercentageInAfrica: number;
      allLanguages: Set<string>;
      allSources: Set<string>;
      allRegions: Set<string>;
      allRegionalPresence: Set<string>;
    }
  >();

  // Première passe : regrouper les lignes par Group
  for (const row of rows) {
    if (!row.Group || row.Group.trim() === "") continue;

    const groupName = row.Group.trim();
    const population = parseFloat(row.Population_2025) || 0;
    const percentageInCountry = parseFloat(row.Percentage_in_country) || 0;
    const percentageInAfrica = parseFloat(row.Percentage_in_Africa) || 0;

    // Détecter les sous-groupes dans le nom du groupe (pattern avec parenthèses)
    const groupNameWithParens = detectSubgroupsFromGroupName(groupName);
    const actualGroupName = groupNameWithParens
      ? groupNameWithParens.mainGroup
      : groupName;

    if (!groupMap.has(actualGroupName)) {
      groupMap.set(actualGroupName, {
        rows: [],
        totalPopulation: 0,
        totalPercentageInCountry: 0,
        totalPercentageInAfrica: 0,
        allLanguages: new Set(),
        allSources: new Set(),
        allRegions: new Set(),
        allRegionalPresence: new Set(),
      });
    }

    const groupData = groupMap.get(actualGroupName)!;
    groupData.rows.push(row);
    groupData.totalPopulation += population;
    groupData.totalPercentageInCountry += percentageInCountry;
    groupData.totalPercentageInAfrica += percentageInAfrica;

    // Collecter les langues
    if (row.Language) {
      row.Language.split(",")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .forEach((l) => groupData.allLanguages.add(l));
    }

    // Collecter les sources
    if (row.Sources) {
      row.Sources.split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .forEach((s) => groupData.allSources.add(s));
    }

    // Collecter les régions
    if (row.Region) {
      groupData.allRegions.add(row.Region.trim());
    }

    // Collecter la présence régionale
    if (row.Presence_regionale) {
      row.Presence_regionale.split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .forEach((p) => groupData.allRegionalPresence.add(p));
    }
  }

  // Deuxième passe : créer les entités regroupées
  const ethnicities: ParsedEthnicity[] = [];

  for (const [groupName, groupData] of groupMap.entries()) {
    // Si plusieurs lignes avec le même Group, créer un groupe parent avec sous-groupes
    const hasMultipleRows = groupData.rows.length > 1;
    const hasSubGroups = groupData.rows.some(
      (row) => row.Sub_group && row.Sub_group.trim() !== ""
    );

    if (hasMultipleRows && hasSubGroups) {
      // Créer un groupe parent avec sous-groupes
      const subGroups: SubgroupInfo[] = [];

      for (const row of groupData.rows) {
        if (!row.Sub_group || row.Sub_group.trim() === "") continue;

        const subgroupName = row.Sub_group.trim();
        const subgroupPopulation = parseFloat(row.Population_2025) || 0;
        const subgroupPercentageInCountry =
          parseFloat(row.Percentage_in_country) || 0;
        const subgroupPercentageInAfrica =
          parseFloat(row.Percentage_in_Africa) || 0;

        subGroups.push({
          name: subgroupName,
          population: subgroupPopulation,
          percentageInCountry: subgroupPercentageInCountry,
          percentageInAfrica: subgroupPercentageInAfrica,
        });
      }

      // Prendre les métadonnées de la première ligne (ou fusionner)
      const firstRow = groupData.rows[0];

      const ethnicity: ParsedEthnicity = {
        groupName,
        subGroups,
        population: groupData.totalPopulation,
        percentageInCountry: groupData.totalPercentageInCountry,
        percentageInAfrica: groupData.totalPercentageInAfrica,
        languages: Array.from(groupData.allLanguages),
        region: Array.from(groupData.allRegions).join(", "),
        sources: Array.from(groupData.allSources),
        ancientName: firstRow.Ancient_Name || "",
        description: firstRow.Description || "",
        societyType: firstRow.Type_de_societe || "",
        religion: firstRow.Religion || "",
        linguisticFamily: firstRow.Famille_linguistique || "",
        historicalStatus: firstRow.Statut_historique || "",
        regionalPresence: Array.from(groupData.allRegionalPresence),
        isGroupWithSubgroups: true,
      };

      ethnicities.push(ethnicity);
    } else {
      // Traiter comme une entité simple (une seule ligne ou pas de sous-groupes)
      for (const row of groupData.rows) {
        const population = parseFloat(row.Population_2025) || 0;
        const percentageInCountry = parseFloat(row.Percentage_in_country) || 0;
        const percentageInAfrica = parseFloat(row.Percentage_in_Africa) || 0;

        // Détecter les sous-groupes dans le nom du groupe ou Sub_group
        // PRIORITÉ : Utiliser Sub_group si disponible avec plusieurs éléments, sinon utiliser les parenthèses dans Group
        const groupNameWithParens = detectSubgroupsFromGroupName(row.Group);
        const subGroupsFromSubGroup = detectSubgroupsFromSubGroup(
          row.Sub_group
        );

        let mainGroupName: string;
        let subgroups: string[] = [];
        let isGroupWithSubgroups = false;

        if (subGroupsFromSubGroup.length > 1) {
          // Priorité 1 : Sub_group contient plusieurs sous-groupes
          // Si le nom du groupe a des parenthèses, utiliser le nom principal sans parenthèses
          mainGroupName = groupNameWithParens
            ? groupNameWithParens.mainGroup
            : row.Group.trim();
          subgroups = subGroupsFromSubGroup;
          isGroupWithSubgroups = true;
        } else if (groupNameWithParens) {
          // Priorité 2 : Utiliser les parenthèses dans le nom du groupe
          mainGroupName = groupNameWithParens.mainGroup;
          subgroups = groupNameWithParens.subgroups;
          isGroupWithSubgroups = subgroups.length > 0;
        } else {
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
            // CORRECTION : Calcul correct des pourcentages
            // Le pourcentage d'un sous-groupe = (population du sous-groupe / population du groupe) * pourcentage du groupe
            const subgroupPercentageInCountry =
              population > 0
                ? (subgroupPopulation / population) * percentageInCountry
                : 0;
            const subgroupPercentageInAfrica =
              population > 0
                ? (subgroupPopulation / population) * percentageInAfrica
                : 0;

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
    }
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
      // 2. Sinon, chercher groupes_ethniques.csv (format ancien)
      // 3. Sinon, chercher n'importe quel autre fichier CSV
      const csvFiles = fs
        .readdirSync(countryPath)
        .filter((f) => f.endsWith(".csv") && f.includes("_ethnies_complet"));

      let csvPath: string | null = null;
      let csvFormat: "enriched" | "legacy" | null = null;

      if (csvFiles.length > 0) {
        // Priorité 1 : Format nouveau
        csvPath = path.join(countryPath, csvFiles[0]);
        const content = fs.readFileSync(csvPath, "utf-8");
        csvFormat = detectCSVFormat(content);
      } else {
        // Priorité 2 : Format ancien (groupes_ethniques.csv)
        const legacyFiles = fs
          .readdirSync(countryPath)
          .filter((f) => f.endsWith(".csv") && f === "groupes_ethniques.csv");

        if (legacyFiles.length > 0) {
          csvPath = path.join(countryPath, legacyFiles[0]);
          const content = fs.readFileSync(csvPath, "utf-8");
          csvFormat = detectCSVFormat(content);
        } else {
          // Priorité 3 : N'importe quel autre CSV
          const allCsvFiles = fs
            .readdirSync(countryPath)
            .filter((f) => f.endsWith(".csv"));

          if (allCsvFiles.length > 0) {
            csvPath = path.join(countryPath, allCsvFiles[0]);
            const content = fs.readFileSync(csvPath, "utf-8");
            csvFormat = detectCSVFormat(content);
          }
        }
      }

      if (!csvPath || !csvFormat) {
        console.warn(
          `⚠️  Aucun fichier CSV trouvé pour ${countryName} dans ${region}`
        );
        continue;
      }

      console.log(
        `📄 Parsing ${region}/${countryName} (format: ${csvFormat})...`
      );

      try {
        let parsedData: ParsedCountryData;

        if (csvFormat === "legacy") {
          parsedData = parseLegacyCountryCSV(csvPath, countryName, region);
        } else {
          parsedData = parseCountryCSV(csvPath, countryName, region);
        }

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
