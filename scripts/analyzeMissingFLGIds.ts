#!/usr/bin/env tsx
/**
 * Script pour analyser les IDs manquants dans les fiches FLG
 * Identifie les IDs PPL manquants dans "2. Peuples associés"
 * et les IDs FLG manquants dans "Lien avec la famille linguistique"
 */

import * as fs from "fs";
import * as path from "path";

const AFRIK_ROOT = path.join(__dirname, "..", "dataset", "source", "afrik");
const FLG_DIR = path.join(AFRIK_ROOT, "famille_linguistique");
const PEUPLES_DIR = path.join(AFRIK_ROOT, "peuples");

interface MissingID {
  flgFile: string;
  lineNumber: number;
  lineContent: string;
  peupleName: string;
  missingPPL?: string;
  missingFLG?: string;
}

interface AnalysisResult {
  missingPPL: MissingID[];
  missingFLG: MissingID[];
  allPPLIds: Set<string>;
  allFLGIds: Set<string>;
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
      // Extraire l'ID du nom du fichier
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

// Analyser une fiche FLG pour trouver les IDs manquants
function analyzeFLGFile(
  filePath: string,
  allPPLIds: Set<string>,
  allFLGIds: Set<string>
): {
  missingPPL: MissingID[];
  missingFLG: MissingID[];
} {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const fileName = path.basename(filePath);
  const missingPPL: MissingID[] = [];
  const missingFLG: MissingID[] = [];

  let inPeuplesSection = false;
  const peupleIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Détecter la section "2. Peuples associés"
    if (line.match(/^# 2\.\s*Peuples associés/)) {
      inPeuplesSection = true;
      continue;
    }

    // Sortir de la section peuples si on arrive à la section suivante
    if (inPeuplesSection && line.match(/^# [3-9]\./)) {
      inPeuplesSection = false;
    }

    // Analyser les lignes de peuples
    if (inPeuplesSection) {
      const peupleMatch = line.match(
        /^-\s*Peuple\s+\d+\s*:\s*(.+?)(?:\s*\(PPL_[A-Z_0-9]+\))?\s*$/
      );
      if (peupleMatch) {
        const peupleContent = peupleMatch[1].trim();
        const hasPPL = line.includes("(PPL_");

        if (!hasPPL) {
          // Extraire le nom du peuple (avant les parenthèses ou descriptions)
          const peupleName = peupleContent
            .replace(/\s*\([^)]*\)\s*$/, "") // Enlever les parenthèses à la fin
            .replace(/\s*–.*$/, "") // Enlever les tirets et descriptions
            .trim();

          missingPPL.push({
            flgFile: fileName,
            lineNumber: lineNum,
            lineContent: line.trim(),
            peupleName: peupleName,
          });
        }
      }
    }

    // Analyser la ligne "Lien avec la famille linguistique"
    if (line.match(/^-?\s*Lien avec la famille linguistique\s*:/)) {
      const hasFLG = line.includes("(FLG_");
      const isEmpty = line.match(
        /^-?\s*Lien avec la famille linguistique\s*:\s*$/
      );

      if (!hasFLG && !isEmpty) {
        // Vérifier si c'est une famille racine (peut rester sans ID)
        const flgId = fileName.replace(".txt", "");
        const isRootFamily = [
          "FLG_NIGERCONGO",
          "FLG_NILOSAHARIENNE",
          "FLG_AFROASIATIQUE",
        ].includes(flgId);
        const isKhoisanMacro =
          flgId === "FLG_KHOISAN" && line.includes("Macro-groupe");

        if (!isRootFamily && !isKhoisanMacro) {
          missingFLG.push({
            flgFile: fileName,
            lineNumber: lineNum,
            lineContent: line.trim(),
            peupleName: "", // Pas applicable pour FLG
          });
        }
      }
    }
  }

  return { missingPPL, missingFLG };
}

// Rechercher un ID PPL correspondant pour un nom de peuple
function findPPLIdForPeuple(
  peupleName: string,
  flgId: string,
  allPPLIds: Set<string>
): string | null {
  // Normaliser le nom
  const normalized = peupleName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  // Chercher des correspondances exactes ou proches
  const candidates: string[] = [];

  for (const pplId of allPPLIds) {
    const pplName = pplId.replace("PPL_", "").replace(/_/g, "");
    const normalizedPPL = normalized.replace(/_/g, "");

    // Correspondance exacte
    if (pplName === normalizedPPL) {
      candidates.push(pplId);
    }
    // Correspondance partielle (commence par)
    else if (
      normalizedPPL.startsWith(pplName) ||
      pplName.startsWith(normalizedPPL)
    ) {
      candidates.push(pplId);
    }
  }

  // Si plusieurs candidats, préférer celui qui est dans la même famille linguistique
  if (candidates.length > 0) {
    // Vérifier si un candidat est dans le bon dossier FLG
    const flgDir = path.join(PEUPLES_DIR, flgId);
    if (fs.existsSync(flgDir)) {
      for (const candidate of candidates) {
        const candidateFile = path.join(flgDir, `${candidate}.txt`);
        if (fs.existsSync(candidateFile)) {
          return candidate;
        }
      }
    }

    // Sinon, retourner le premier candidat
    return candidates[0];
  }

  return null;
}

// Fonction principale
function main() {
  console.log("🔍 Analyse des IDs manquants dans les fiches FLG...\n");

  const allPPLIds = getAllPPLIds();
  const allFLGIds = getAllFLGIds();

  console.log(`✅ ${allPPLIds.size} IDs PPL trouvés`);
  console.log(`✅ ${allFLGIds.size} IDs FLG trouvés\n`);

  const flgFiles = fs
    .readdirSync(FLG_DIR)
    .filter((f) => f.startsWith("FLG_") && f.endsWith(".txt"));

  const allMissingPPL: MissingID[] = [];
  const allMissingFLG: MissingID[] = [];

  for (const file of flgFiles) {
    const filePath = path.join(FLG_DIR, file);
    const { missingPPL, missingFLG } = analyzeFLGFile(
      filePath,
      allPPLIds,
      allFLGIds
    );

    allMissingPPL.push(...missingPPL);
    allMissingFLG.push(...missingFLG);
  }

  // Chercher des IDs PPL correspondants
  console.log("📋 IDs PPL manquants trouvés :\n");
  for (const missing of allMissingPPL) {
    const flgId = missing.flgFile.replace(".txt", "");
    const suggestedId = findPPLIdForPeuple(
      missing.peupleName,
      flgId,
      allPPLIds
    );

    console.log(`  ${missing.flgFile}:${missing.lineNumber}`);
    console.log(`    Ligne: ${missing.lineContent}`);
    console.log(`    Peuple: "${missing.peupleName}"`);
    if (suggestedId) {
      console.log(`    💡 ID suggéré: ${suggestedId}`);
    } else {
      console.log(`    ⚠️  Aucun ID PPL trouvé`);
    }
    console.log();
  }

  console.log("\n📋 IDs FLG manquants trouvés :\n");
  for (const missing of allMissingFLG) {
    console.log(`  ${missing.flgFile}:${missing.lineNumber}`);
    console.log(`    Ligne: ${missing.lineContent}`);
    console.log();
  }

  // Générer un rapport JSON
  const report = {
    summary: {
      totalMissingPPL: allMissingPPL.length,
      totalMissingFLG: allMissingFLG.length,
    },
    missingPPL: allMissingPPL.map((m) => ({
      ...m,
      suggestedId: findPPLIdForPeuple(
        m.peupleName,
        m.flgFile.replace(".txt", ""),
        allPPLIds
      ),
    })),
    missingFLG: allMissingFLG,
  };

  const reportPath = path.join(
    AFRIK_ROOT,
    "logs",
    "missing_flg_ids_analysis.json"
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n✅ Rapport sauvegardé dans: ${reportPath}`);
  console.log(`\n📊 Résumé:`);
  console.log(`   - ${allMissingPPL.length} IDs PPL manquants`);
  console.log(`   - ${allMissingFLG.length} IDs FLG manquants`);
}

if (require.main === module) {
  main();
}
