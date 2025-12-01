#!/usr/bin/env tsx
/**
 * Script d'analyse pour l'ÉTAPE 5 - Sous-ethnies et Clans AFRIK
 * Parse _index_peuples_ethnies.txt et extrait tous les sous-groupes potentiels
 */

import * as fs from "fs";
import * as path from "path";

interface SubgroupEntry {
  peupleId: string;
  peupleName: string;
  familleLinguistique: string;
  ethnieParente?: string;
  ethnieId?: string;
  sousGroupeBrut: string;
  ligne: number;
  typeSuppose:
    | "SUB"
    | "CLN"
    | "SUB?"
    | "CLN?"
    | "IGNORE"
    | "AMBIGU"
    | "UNKNOWN";
  raison?: string;
}

interface ClassificationRules {
  subKeywords: string[];
  clanKeywords: string[];
  ignoreKeywords: string[];
  ambiguousPatterns: RegExp[];
}

const RULES: ClassificationRules = {
  subKeywords: [
    "sous-groupe",
    "sous-groupe",
    "sub-group",
    "sub-ethnic",
    "régional",
    "régionaux",
    "du nord",
    "du sud",
    "de l'est",
    "de l'ouest",
    "du centre",
    "variante",
    "variantes",
  ],
  clanKeywords: [
    "clan",
    "clans",
    "lignage",
    "lignages",
    "totem",
    "ancêtre",
    "maison royale",
    "segment matrimonial",
    "patrilinéaire",
    "matrilinéaire",
  ],
  ignoreKeywords: [
    "village",
    "villages",
    "district",
    "districts",
    "province",
    "provinces",
    "zone administrative",
    "terme colonial",
    "exonyme",
    "groupe religieux",
    "subdivision moderne",
  ],
  ambiguousPatterns: [
    /du nord|du sud|de l'est|de l'ouest/i,
    /régional|régionaux/i,
    /à préciser/i,
    /sous-groupes? à déterminer/i,
  ],
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function classifySubgroup(
  entry: string,
  ethnieParente?: string
): { type: SubgroupEntry["typeSuppose"]; raison: string } {
  const normalized = normalizeName(entry);

  // Vérifier IGNORE en premier
  for (const keyword of RULES.ignoreKeywords) {
    if (normalized.includes(keyword)) {
      return {
        type: "IGNORE",
        raison: `Contient le terme à ignorer: ${keyword}`,
      };
    }
  }

  // Vérifier CLAN
  for (const keyword of RULES.clanKeywords) {
    if (normalized.includes(keyword)) {
      return { type: "CLN", raison: `Contient le terme clanique: ${keyword}` };
    }
  }

  // Vérifier SUB explicite
  if (
    normalized.includes("sous-groupe") ||
    normalized.includes("sous-ethnie")
  ) {
    return {
      type: "SUB",
      raison: "Mention explicite de sous-groupe/sous-ethnie",
    };
  }

  // Vérifier patterns directionnels (AMBIGU)
  for (const pattern of RULES.ambiguousPatterns) {
    if (pattern.test(entry)) {
      // Si c'est juste directionnel sans autre info, c'est ambigu
      if (
        /^(du nord|du sud|de l'est|de l'ouest|du centre)$/i.test(entry.trim())
      ) {
        return {
          type: "SUB?",
          raison: "Subdivision directionnelle non confirmée",
        };
      }
      // Sinon, peut être SUB si accompagné d'autres infos
      if (RULES.subKeywords.some((k) => normalized.includes(k))) {
        return { type: "SUB", raison: "Subdivision régionale confirmée" };
      }
      return { type: "SUB?", raison: "Pattern ambigu détecté" };
    }
  }

  // Vérifier SUB par mots-clés
  for (const keyword of RULES.subKeywords) {
    if (normalized.includes(keyword)) {
      return {
        type: "SUB",
        raison: `Contient le terme de subdivision: ${keyword}`,
      };
    }
  }

  // Si "À préciser", c'est ambigu
  if (normalized.includes("à préciser") || normalized.includes("a préciser")) {
    return { type: "AMBIGU", raison: "Classification à préciser" };
  }

  return {
    type: "UNKNOWN",
    raison: "Classification non déterminée automatiquement",
  };
}

function extractEthniesFromIndex(): Map<string, string[]> {
  const ethniesMap = new Map<string, string[]>();
  const indexPath = path.join(
    __dirname,
    "../dataset/source/afrik/ethnies/_index_peuples_ethnies.txt"
  );
  const content = fs.readFileSync(indexPath, "utf-8");
  const lines = content.split("\n");

  let currentPeuple: string | null = null;
  let currentFLG: string | null = null;

  for (const line of lines) {
    // Détecter un nouveau peuple
    const peupleMatch = line.match(/^## PPL_(\w+) — FLG_(\w+)/);
    if (peupleMatch) {
      currentPeuple = peupleMatch[1];
      currentFLG = peupleMatch[2];
      continue;
    }

    // Détecter une ethnie (ligne commençant par "- ")
    if (line.trim().startsWith("- ") && currentPeuple) {
      const ethnieName = line.trim().substring(2).trim();
      if (!ethniesMap.has(currentPeuple)) {
        ethniesMap.set(currentPeuple, []);
      }
      ethniesMap.get(currentPeuple)!.push(ethnieName);
    }
  }

  return ethniesMap;
}

function extractIndividualNames(listText: string): string[] {
  // Extraire les noms individuels d'une liste comme "Sous-groupes : Dogbo, Tado, etc."
  const names: string[] = [];

  // Pattern pour "Sous-groupes : X, Y, Z, etc."
  const match = listText.match(/:\s*([^,]+(?:,\s*[^,]+)*)/);
  if (match) {
    const namesStr = match[1];
    // Séparer par virgules et nettoyer
    const parts = namesStr.split(",").map((s) => s.trim());
    for (const part of parts) {
      // Ignorer "etc.", "etc", et autres mots vides
      if (part && !/^(etc|etc\.|et autres?|and others?)$/i.test(part)) {
        names.push(part);
      }
    }
  }

  return names;
}

function analyzeIndex(): SubgroupEntry[] {
  const indexPath = path.join(
    __dirname,
    "../dataset/source/afrik/ethnies/_index_peuples_ethnies.txt"
  );
  const content = fs.readFileSync(indexPath, "utf-8");
  const lines = content.split("\n");

  const entries: SubgroupEntry[] = [];
  let currentPeuple: string | null = null;
  let currentPeupleName: string | null = null;
  let currentFLG: string | null = null;
  let currentEthnies: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Détecter un nouveau peuple
    const peupleMatch = line.match(/^## PPL_(\w+) — FLG_(\w+)/);
    if (peupleMatch) {
      currentPeuple = peupleMatch[1];
      currentFLG = peupleMatch[2];
      currentPeupleName = currentPeuple.replace(/_/g, " ");
      currentEthnies = [];
      continue;
    }

    // Détecter une ethnie principale (ligne commençant par "- " sans "Sous-groupes", "clans", etc.)
    if (line.trim().startsWith("- ") && currentPeuple) {
      const content = line.trim().substring(2).trim();

      // Ignorer les lignes qui sont clairement des ethnies principales
      if (
        !content.toLowerCase().includes("sous-groupe") &&
        !content.toLowerCase().includes("clan") &&
        !content.toLowerCase().includes("lignage") &&
        !content.toLowerCase().includes("à préciser") &&
        !content.toLowerCase().includes("divers")
      ) {
        currentEthnies.push(content);
        continue;
      }

      // C'est un sous-groupe potentiel
      const classification = classifySubgroup(content);

      // Chercher l'ethnie parente la plus probable
      let ethnieParente: string | undefined;
      let ethnieId: string | undefined;

      // Si on a des ethnies dans le contexte, prendre la dernière (la plus récente)
      if (currentEthnies.length > 0) {
        ethnieParente = currentEthnies[currentEthnies.length - 1];
        // Générer un ID probable
        const slug = ethnieParente
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "");
        ethnieId = `ETH_${slug}`;
      }

      // Si c'est une liste de sous-groupes (ex: "Sous-groupes : Dogbo, Tado, etc."), extraire chaque nom
      if (
        content.includes(":") &&
        (content.includes("Sous-groupes") || content.includes("sous-groupe"))
      ) {
        const individualNames = extractIndividualNames(content);
        if (individualNames.length > 0) {
          // Créer une entrée pour chaque nom individuel
          for (const name of individualNames) {
            entries.push({
              peupleId: currentPeuple!,
              peupleName: currentPeupleName!,
              familleLinguistique: currentFLG!,
              ethnieParente,
              ethnieId,
              sousGroupeBrut: name,
              ligne: lineNum,
              typeSuppose: "SUB",
              raison: "Extrait d'une liste de sous-groupes",
            });
          }
        } else {
          // Si on n'a pas pu extraire de noms individuels, garder l'entrée globale
          entries.push({
            peupleId: currentPeuple!,
            peupleName: currentPeupleName!,
            familleLinguistique: currentFLG!,
            ethnieParente,
            ethnieId,
            sousGroupeBrut: content,
            ligne: lineNum,
            typeSuppose: classification.type,
            raison: classification.raison,
          });
        }
      } else {
        // Entrée normale
        entries.push({
          peupleId: currentPeuple!,
          peupleName: currentPeupleName!,
          familleLinguistique: currentFLG!,
          ethnieParente,
          ethnieId,
          sousGroupeBrut: content,
          ligne: lineNum,
          typeSuppose: classification.type,
          raison: classification.raison,
        });
      }
    }
  }

  return entries;
}

function main() {
  console.log("🔍 Analyse de _index_peuples_ethnies.txt...\n");

  const entries = analyzeIndex();

  console.log(`📊 Total d'entrées analysées: ${entries.length}\n`);

  // Statistiques par type
  const stats = {
    SUB: 0,
    CLN: 0,
    "SUB?": 0,
    "CLN?": 0,
    IGNORE: 0,
    AMBIGU: 0,
    UNKNOWN: 0,
  };

  entries.forEach((entry) => {
    stats[entry.typeSuppose]++;
  });

  console.log("📈 Statistiques de classification:");
  Object.entries(stats).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Générer les fichiers de documentation
  const logsDir = path.join(__dirname, "../dataset/source/afrik/logs/ETAPE5");

  // TABLE_CLASSIFICATION_SOUS_ETHNIES.md
  let tableContent = "# Table de Classification des Sous-ethnies et Clans\n\n";
  tableContent += `Généré le: ${new Date().toISOString()}\n\n`;
  tableContent +=
    "| Peuple | FLG | Ethnie Parente | Sous-groupe Brut | Type | Raison | Ligne |\n";
  tableContent +=
    "|--------|-----|----------------|------------------|------|--------|-------|\n";

  entries.forEach((entry) => {
    tableContent += `| ${entry.peupleId} | ${entry.familleLinguistique} | ${entry.ethnieParente || "N/A"} | ${entry.sousGroupeBrut} | ${entry.typeSuppose} | ${entry.raison || ""} | ${entry.ligne} |\n`;
  });

  fs.writeFileSync(
    path.join(logsDir, "TABLE_CLASSIFICATION_SOUS_ETHNIES.md"),
    tableContent,
    "utf-8"
  );

  // CAS_AMBIGUS.md
  const ambigus = entries.filter(
    (e) =>
      e.typeSuppose === "AMBIGU" ||
      e.typeSuppose === "SUB?" ||
      e.typeSuppose === "CLN?"
  );
  let ambigusContent = "# Cas Ambigus - Classification Incertaine\n\n";
  ambigusContent += `Total: ${ambigus.length} cas\n\n`;
  ambigus.forEach((entry) => {
    ambigusContent += `## ${entry.peupleId} - Ligne ${entry.ligne}\n`;
    ambigusContent += `- Sous-groupe: ${entry.sousGroupeBrut}\n`;
    ambigusContent += `- Type supposé: ${entry.typeSuppose}\n`;
    ambigusContent += `- Raison: ${entry.raison}\n`;
    ambigusContent += `- Ethnie parente: ${entry.ethnieParente || "Non identifiée"}\n\n`;
  });

  fs.writeFileSync(
    path.join(logsDir, "CAS_AMBIGUS.md"),
    ambigusContent,
    "utf-8"
  );

  // IGNORE.md
  const ignores = entries.filter((e) => e.typeSuppose === "IGNORE");
  let ignoreContent = "# Entrées à Ignorer\n\n";
  ignoreContent += `Total: ${ignores.length} entrées\n\n`;
  ignores.forEach((entry) => {
    ignoreContent += `- **${entry.peupleId}** (ligne ${entry.ligne}): ${entry.sousGroupeBrut} - ${entry.raison}\n`;
  });

  fs.writeFileSync(path.join(logsDir, "IGNORE.md"), ignoreContent, "utf-8");

  // Générer un JSON pour traitement ultérieur
  const jsonPath = path.join(logsDir, "subgroups_analysis.json");
  fs.writeFileSync(jsonPath, JSON.stringify(entries, null, 2), "utf-8");

  console.log(`\n✅ Fichiers générés dans ${logsDir}:`);
  console.log("  - TABLE_CLASSIFICATION_SOUS_ETHNIES.md");
  console.log("  - CAS_AMBIGUS.md");
  console.log("  - IGNORE.md");
  console.log("  - subgroups_analysis.json");

  return entries;
}

if (require.main === module) {
  main();
}

export { analyzeIndex, classifySubgroup };
export type { SubgroupEntry };
