import * as fs from "fs";
import * as path from "path";
import { normalizeToKey } from "../src/lib/normalize";

interface ParsedCountryData {
  countryName: string;
  region: string;
  ethnicities: ParsedEthnicity[];
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

interface SubgroupInfo {
  name: string;
  population: number;
  percentageInCountry: number;
  percentageInAfrica: number;
}

interface ParsedCountryDescription {
  countryName: string;
  region: string;
  ancientNames: string[];
  description: string;
  ethnicities: ParsedEthnicityDescription[];
}

interface ParsedEthnicityDescription {
  name: string;
  normalizedName: string;
  ancientName: string[];
  description: string;
}

interface MatchedEthnicity extends ParsedEthnicity {
  matchedDescription?: ParsedEthnicityDescription;
  matchedSubgroups: MatchedSubgroup[];
}

interface MatchedSubgroup extends SubgroupInfo {
  matchedDescription?: ParsedEthnicityDescription;
}

interface MatchedCountryData {
  countryName: string;
  region: string;
  countryDescription: ParsedCountryDescription | null;
  ethnicities: MatchedEthnicity[];
}

// Normaliser un nom pour le matching
function normalizeName(name: string): string {
  return normalizeToKey(name.toLowerCase());
}

// Calculer la similarité entre deux noms normalisés
function calculateSimilarity(name1: string, name2: string): number {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  // Correspondance exacte
  if (n1 === n2) return 1.0;

  // Correspondance partielle (un nom contient l'autre)
  if (n1.includes(n2) || n2.includes(n1)) return 0.8;

  // Correspondance par mots communs
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  const commonWords = words1.filter((w) => words2.includes(w));
  if (commonWords.length > 0) {
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  return 0;
}

// Trouver la meilleure correspondance pour une ethnie
function findBestMatch(
  ethnicityName: string,
  descriptions: ParsedEthnicityDescription[]
): ParsedEthnicityDescription | null {
  let bestMatch: ParsedEthnicityDescription | null = null;
  let bestScore = 0;

  const normalizedEthnicityName = normalizeName(ethnicityName);

  for (const desc of descriptions) {
    // Essayer avec le nom normalisé
    const score = calculateSimilarity(ethnicityName, desc.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = desc;
    }

    // Essayer aussi avec le nom normalisé stocké
    if (desc.normalizedName) {
      const normalizedScore = calculateSimilarity(
        normalizedEthnicityName,
        desc.normalizedName
      );
      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestMatch = desc;
      }
    }
  }

  // Seuil minimum de similarité (0.5)
  return bestScore >= 0.5 ? bestMatch : null;
}

// Fusionner les données CSV et descriptions
function matchData(
  csvData: ParsedCountryData,
  descriptionData: ParsedCountryDescription | null
): MatchedCountryData {
  const matched: MatchedCountryData = {
    countryName: csvData.countryName,
    region: csvData.region,
    countryDescription: descriptionData,
    ethnicities: [],
  };

  // Matcher les ethnies
  for (const ethnicity of csvData.ethnicities) {
    const matchedEthnicity: MatchedEthnicity = {
      ...ethnicity,
      matchedDescription: undefined,
      matchedSubgroups: [],
    };

    // Chercher une description correspondante
    if (descriptionData) {
      const matchedDesc = findBestMatch(
        ethnicity.groupName,
        descriptionData.ethnicities
      );
      if (matchedDesc) {
        matchedEthnicity.matchedDescription = matchedDesc;
        // Fusionner les descriptions si la description CSV est vide
        if (!matchedEthnicity.description && matchedDesc.description) {
          matchedEthnicity.description = matchedDesc.description;
        }
        // Fusionner les anciens noms si l'ancien nom CSV est vide
        if (
          !matchedEthnicity.ancientName &&
          matchedDesc.ancientName.length > 0
        ) {
          matchedEthnicity.ancientName = matchedDesc.ancientName.join(", ");
        }
      }
    }

    // Matcher les sous-groupes
    for (const subgroup of ethnicity.subGroups) {
      const matchedSubgroup: MatchedSubgroup = {
        ...subgroup,
        matchedDescription: undefined,
      };

      if (descriptionData) {
        const matchedSubDesc = findBestMatch(
          subgroup.name,
          descriptionData.ethnicities
        );
        if (matchedSubDesc) {
          matchedSubgroup.matchedDescription = matchedSubDesc;
        }
      }

      matchedEthnicity.matchedSubgroups.push(matchedSubgroup);
    }

    matched.ethnicities.push(matchedEthnicity);
  }

  return matched;
}

// Fonction principale
function main() {
  const parsedDir = path.join(process.cwd(), "dataset", "parsed");
  const outputDir = path.join(process.cwd(), "dataset", "matched");

  // Créer le dossier de sortie
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Charger tous les fichiers CSV parsés
  const csvFiles = fs
    .readdirSync(parsedDir)
    .filter(
      (f) =>
        f.endsWith(".json") &&
        !f.includes("_description") &&
        !f.includes("all_")
    );

  // Charger tous les fichiers de descriptions parsés
  const descFiles = fs
    .readdirSync(parsedDir)
    .filter((f) => f.endsWith("_description.json"));

  const allMatchedData: MatchedCountryData[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const csvFile of csvFiles) {
    const csvPath = path.join(parsedDir, csvFile);
    const csvData: ParsedCountryData = JSON.parse(
      fs.readFileSync(csvPath, "utf-8")
    );

    // Trouver le fichier de description correspondant
    const descFile = descFiles.find((f) =>
      f.includes(`${csvData.region}_${csvData.countryName}`)
    );

    let descriptionData: ParsedCountryDescription | null = null;
    if (descFile) {
      const descPath = path.join(parsedDir, descFile);
      descriptionData = JSON.parse(fs.readFileSync(descPath, "utf-8"));
    }

    console.log(`🔗 Matching ${csvData.region}/${csvData.countryName}...`);

    const matched = matchData(csvData, descriptionData);

    // Compter les matchings
    const matchedEthnicities = matched.ethnicities.filter(
      (e) => e.matchedDescription
    ).length;
    const totalEthnicities = matched.ethnicities.length;

    if (matchedEthnicities === totalEthnicities) {
      matchedCount++;
    } else {
      unmatchedCount++;
      console.log(
        `  ⚠️  ${matchedEthnicities}/${totalEthnicities} ethnies matchées`
      );
    }

    allMatchedData.push(matched);

    // Sauvegarder le fichier matché
    const outputPath = path.join(
      outputDir,
      `${csvData.region}_${csvData.countryName}_matched.json`
    );
    fs.writeFileSync(outputPath, JSON.stringify(matched, null, 2), "utf-8");
    console.log(`  ✓ Saved to ${outputPath}`);
  }

  // Sauvegarder un fichier global
  const globalOutputPath = path.join(outputDir, "all_matched.json");
  fs.writeFileSync(
    globalOutputPath,
    JSON.stringify(allMatchedData, null, 2),
    "utf-8"
  );

  console.log("\n✅ Matching terminé!");
  console.log(`📊 ${allMatchedData.length} pays traités`);
  console.log(`  ✓ ${matchedCount} pays avec toutes les ethnies matchées`);
  console.log(`  ⚠️  ${unmatchedCount} pays avec des ethnies non matchées`);
  console.log(`📁 Fichiers sauvegardés dans: ${outputDir}`);
}

main();
