#!/usr/bin/env tsx
/**
 * Script pour valider que tous les IDs PPL et FLG dans les fiches FLG
 * existent dans les fichiers correspondants
 */

import * as fs from "fs";
import * as path from "path";

const AFRIK_ROOT = path.join(__dirname, "..", "dataset", "source", "afrik");
const FLG_DIR = path.join(AFRIK_ROOT, "famille_linguistique");
const PEUPLES_DIR = path.join(AFRIK_ROOT, "peuples");

interface ValidationError {
  flgFile: string;
  lineNumber: number;
  id: string;
  type: "PPL" | "FLG";
  message: string;
}

// Extraire tous les IDs PPL des fichiers peuples
function getAllPPLIds(): Set<string> {
  const pplIds = new Set<string>();

  if (!fs.existsSync(PEUPLES_DIR)) {
    return pplIds;
  }

  const dirs = fs
    .readdirSync(PEUPLES_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory());

  for (const dir of dirs) {
    const files = fs
      .readdirSync(path.join(PEUPLES_DIR, dir.name))
      .filter((f) => f.startsWith("PPL_") && f.endsWith(".txt"));

    for (const file of files) {
      const id = file.replace(".txt", "");
      pplIds.add(id);

      // Pour les fichiers avec virgules (macros), ajouter aussi les IDs individuels
      if (id.includes(",")) {
        const individualIds = id.split(",").map((s) => s.trim());
        individualIds.forEach((id) => pplIds.add(id));
      }
    }
  }

  return pplIds;
}

// Extraire tous les IDs FLG
function getAllFLGIds(): Set<string> {
  const flgIds = new Set<string>();

  if (!fs.existsSync(FLG_DIR)) {
    return flgIds;
  }

  const files = fs
    .readdirSync(FLG_DIR)
    .filter((f) => f.startsWith("FLG_") && f.endsWith(".txt"));

  for (const file of files) {
    const id = file.replace(".txt", "");
    flgIds.add(id);
  }

  return flgIds;
}

// Extraire tous les IDs PPL d'une fiche FLG
function extractPPLIds(
  content: string,
  fileName: string
): Array<{ id: string; lineNumber: number }> {
  const lines = content.split("\n");
  const pplIds: Array<{ id: string; lineNumber: number }> = [];

  let inPeuplesSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^# 2\.\s*Peuples associés/)) {
      inPeuplesSection = true;
      continue;
    }

    if (inPeuplesSection && line.match(/^# [3-9]\./)) {
      inPeuplesSection = false;
    }

    if (inPeuplesSection) {
      const pplMatch = line.match(/\(PPL_([A-Z_0-9]+)\)/);
      if (pplMatch) {
        pplIds.push({
          id: `PPL_${pplMatch[1]}`,
          lineNumber: i + 1,
        });
      }
    }
  }

  return pplIds;
}

// Extraire tous les IDs FLG d'une fiche FLG
function extractFLGIds(
  content: string,
  fileName: string
): Array<{ id: string; lineNumber: number }> {
  const lines = content.split("\n");
  const flgIds: Array<{ id: string; lineNumber: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^-?\s*Lien avec la famille linguistique\s*:/)) {
      const flgMatch = line.match(/\(FLG_([A-Z_]+)\)/);
      if (flgMatch) {
        flgIds.push({
          id: `FLG_${flgMatch[1]}`,
          lineNumber: i + 1,
        });
      }
    }
  }

  return flgIds;
}

// Fonction principale
function main() {
  console.log("🔍 Validation des IDs dans les fiches FLG...\n");

  const allPPLIds = getAllPPLIds();
  const allFLGIds = getAllFLGIds();

  console.log(`✅ ${allPPLIds.size} IDs PPL référencés`);
  console.log(`✅ ${allFLGIds.size} IDs FLG référencés\n`);

  const flgFiles = fs
    .readdirSync(FLG_DIR)
    .filter((f) => f.startsWith("FLG_") && f.endsWith(".txt"));

  const errors: ValidationError[] = [];

  for (const file of flgFiles) {
    const filePath = path.join(FLG_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // Valider les IDs PPL
    const pplIds = extractPPLIds(content, file);
    for (const { id, lineNumber } of pplIds) {
      if (!allPPLIds.has(id)) {
        errors.push({
          flgFile: file,
          lineNumber,
          id,
          type: "PPL",
          message: `ID PPL ${id} n'existe pas dans les fichiers peuples`,
        });
      }
    }

    // Valider les IDs FLG
    const flgIds = extractFLGIds(content, file);
    for (const { id, lineNumber } of flgIds) {
      if (!allFLGIds.has(id)) {
        errors.push({
          flgFile: file,
          lineNumber,
          id,
          type: "FLG",
          message: `ID FLG ${id} n'existe pas dans les fichiers familles linguistiques`,
        });
      }
    }
  }

  if (errors.length === 0) {
    console.log("✅ Tous les IDs sont valides !\n");
  } else {
    console.log(`❌ ${errors.length} erreur(s) trouvée(s) :\n`);
    for (const error of errors) {
      console.log(`  ${error.flgFile}:${error.lineNumber}`);
      console.log(`    ${error.type} ${error.id}: ${error.message}`);
      console.log();
    }
  }

  // Générer un rapport JSON
  const report = {
    summary: {
      totalErrors: errors.length,
      totalPPLIds: allPPLIds.size,
      totalFLGIds: allFLGIds.size,
    },
    errors,
  };

  const reportPath = path.join(AFRIK_ROOT, "logs", "flg_ids_validation.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n✅ Rapport sauvegardé dans: ${reportPath}`);

  process.exit(errors.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}
