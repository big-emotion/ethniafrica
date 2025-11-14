import * as fs from "fs";
import * as path from "path";
import { normalizeToKey } from "../src/lib/normalize";

interface ParsedCountryDescription {
  countryName: string;
  region: string;
  ancientNames: string[]; // Max 3
  description: string;
  ethnicities: ParsedEthnicityDescription[];
}

interface ParsedEthnicityDescription {
  name: string;
  normalizedName: string;
  ancientName: string[]; // Max 3
  description: string;
}

// Normaliser un nom pour le matching
function normalizeName(name: string): string {
  return normalizeToKey(name.toLowerCase());
}

// Parser un fichier de description texte libre
function parseDescriptionFile(
  filePath: string,
  countryName: string,
  region: string
): ParsedCountryDescription | null {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").map((line) => line.trim());

  const result: ParsedCountryDescription = {
    countryName,
    region,
    ancientNames: [],
    description: "",
    ethnicities: [],
  };

  let currentSection: "country" | "ethnicities" | null = null;
  let currentEthnicity: ParsedEthnicityDescription | null = null;
  let collectingDescription = false;
  let descriptionLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Détecter la section PAYS
    if (line.match(/^#+\s*PAYS/i)) {
      currentSection = "country";
      collectingDescription = false;
      descriptionLines = [];
      continue;
    }

    // Détecter la section ETHNIES
    if (line.match(/^#+\s*ETHNIES/i)) {
      currentSection = "ethnicities";
      // Sauvegarder l'ethnie en cours si elle existe
      if (currentEthnicity) {
        currentEthnicity.description = descriptionLines.join("\n").trim();
        result.ethnicities.push(currentEthnicity);
        currentEthnicity = null;
      }
      collectingDescription = false;
      descriptionLines = [];
      continue;
    }

    // Dans la section PAYS
    if (currentSection === "country") {
      // Détecter les anciennes appellations
      if (line.match(/^###?\s*Anciennes?\s+appellations?/i)) {
        collectingDescription = false;
        descriptionLines = [];
        // Lire les lignes suivantes jusqu'à la prochaine section
        i++;
        while (i < lines.length && !lines[i].match(/^###/)) {
          const appellationLine = lines[i];
          if (appellationLine.startsWith("-")) {
            const appellation = appellationLine
              .replace(/^-\s*/, "")
              .replace(/\s*\([^)]*\)$/, "")
              .trim();
            if (appellation && result.ancientNames.length < 3) {
              result.ancientNames.push(appellation);
            }
          }
          i++;
        }
        i--; // Revenir en arrière car la boucle va incrémenter
        continue;
      }

      // Détecter la description du pays
      if (line.match(/^###?\s*Description/i)) {
        collectingDescription = true;
        descriptionLines = [];
        continue;
      }

      // Collecter la description
      if (collectingDescription && line && !line.match(/^#/)) {
        descriptionLines.push(line);
      }
    }

    // Dans la section ETHNIES
    if (currentSection === "ethnicities") {
      // Détecter une nouvelle ethnie (### Nom de l'ethnie)
      if (line.match(/^###\s+(.+)$/)) {
        // Sauvegarder l'ethnie précédente si elle existe
        if (currentEthnicity) {
          currentEthnicity.description = descriptionLines.join("\n").trim();
          result.ethnicities.push(currentEthnicity);
        }

        const match = line.match(/^###\s+(.+)$/);
        if (match) {
          const ethnicityName = match[1].trim();
          currentEthnicity = {
            name: ethnicityName,
            normalizedName: normalizeName(ethnicityName),
            ancientName: [],
            description: "",
          };
          collectingDescription = false;
          descriptionLines = [];
        }
        continue;
      }

      // Détecter l'ancien nom d'une ethnie
      if (currentEthnicity && line.match(/^\*\*Ancien\s+nom\*\*:/i)) {
        const ancientNameLine = line.replace(/^\*\*Ancien\s+nom\*\*:\s*/i, "");
        if (ancientNameLine && currentEthnicity.ancientName.length < 3) {
          // Peut contenir plusieurs noms séparés par des virgules
          const names = ancientNameLine
            .split(",")
            .map((n) => n.trim())
            .filter((n) => n.length > 0)
            .slice(0, 3 - currentEthnicity.ancientName.length);
          currentEthnicity.ancientName.push(...names);
        }
        continue;
      }

      // Détecter la description d'une ethnie
      if (currentEthnicity && line.match(/^\*\*Description\*\*:/i)) {
        collectingDescription = true;
        descriptionLines = [];
        const descLine = line.replace(/^\*\*Description\*\*:\s*/i, "");
        if (descLine) {
          descriptionLines.push(descLine);
        }
        continue;
      }

      // Collecter la description de l'ethnie
      if (
        currentEthnicity &&
        collectingDescription &&
        line &&
        !line.match(/^###/) &&
        !line.match(/^\*\*/)
      ) {
        descriptionLines.push(line);
      }
    }
  }

  // Sauvegarder la dernière ethnie
  if (currentEthnicity) {
    currentEthnicity.description = descriptionLines.join("\n").trim();
    result.ethnicities.push(currentEthnicity);
  }

  // Finaliser la description du pays
  result.description = descriptionLines.join("\n").trim();

  // Si pas de description trouvée, essayer de la trouver autrement
  if (!result.description && currentSection === "country") {
    // Chercher toutes les lignes après "Description" jusqu'à "ETHNIES"
    const descStart = lines.findIndex((l) => l.match(/^###?\s*Description/i));
    const ethStart = lines.findIndex((l) => l.match(/^#+\s*ETHNIES/i));
    if (descStart !== -1 && ethStart !== -1) {
      result.description = lines
        .slice(descStart + 1, ethStart)
        .filter((l) => l && !l.match(/^###/))
        .join("\n")
        .trim();
    }
  }

  return result;
}

// Fonction principale
function main() {
  const sourceDir = path.join(process.cwd(), "dataset", "source");
  const outputDir = path.join(process.cwd(), "dataset", "parsed");

  // Créer le dossier de sortie
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const allParsedDescriptions: ParsedCountryDescription[] = [];

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

      // Chercher le fichier de description (.txt)
      const txtFiles = fs
        .readdirSync(countryPath)
        .filter((f) => f.endsWith(".txt"));

      if (txtFiles.length === 0) {
        console.warn(
          `⚠️  Aucun fichier de description trouvé pour ${countryName} dans ${region}`
        );
        continue;
      }

      const txtPath = path.join(countryPath, txtFiles[0]);
      console.log(`📄 Parsing description ${region}/${countryName}...`);

      try {
        const parsedDescription = parseDescriptionFile(
          txtPath,
          countryName,
          region
        );
        if (parsedDescription) {
          allParsedDescriptions.push(parsedDescription);

          // Sauvegarder le JSON parsé
          const outputPath = path.join(
            outputDir,
            `${region}_${countryName}_description.json`
          );
          fs.writeFileSync(
            outputPath,
            JSON.stringify(parsedDescription, null, 2),
            "utf-8"
          );
          console.log(`  ✓ Parsed and saved to ${outputPath}`);
          console.log(
            `    - ${parsedDescription.ancientNames.length} anciennes appellations`
          );
          console.log(
            `    - ${parsedDescription.ethnicities.length} ethnies avec descriptions`
          );
        }
      } catch (error) {
        console.error(
          `  ✗ Erreur lors du parsing de la description de ${countryName}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  // Sauvegarder un fichier global
  const globalOutputPath = path.join(outputDir, "all_descriptions.json");
  fs.writeFileSync(
    globalOutputPath,
    JSON.stringify(allParsedDescriptions, null, 2),
    "utf-8"
  );

  console.log("\n✅ Parsing des descriptions terminé!");
  console.log(
    `📊 ${allParsedDescriptions.length} pays avec descriptions parsés`
  );
  console.log(`📁 Fichiers sauvegardés dans: ${outputDir}`);
}

main();
