#!/usr/bin/env tsx
/**
 * Script de validation des données AFRIK - Étape 6
 *
 * Vérifie :
 * 1. IDs cohérents (FLG_, PPL_, codes ISO)
 * 2. Langue → famille linguistique OK
 * 3. Peuple → pays OK
 * 4. Termes coloniaux contextualisés
 * 5. Sections TXT complètes
 * 6. Origines et appellations (exonymes/endonymes) enrichies
 */

import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

interface ValidationResult {
  category: string;
  status: "success" | "warning" | "error";
  message: string;
  details?: string[];
}

interface CSVRow {
  [key: string]: string;
}

const AFRIK_ROOT = path.join(__dirname, "../dataset/source/afrik");
const PUBLIC_ROOT = path.join(__dirname, "../public");

// Charger les CSV
function loadCSV(filePath: string): CSVRow[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // Permet des colonnes incohérentes
      relax_quotes: true,
    });
  } catch (error) {
    console.error(`Erreur lors du chargement de ${filePath}:`, error);
    return [];
  }
}

// Extraire les IDs d'un fichier TXT
function extractIDs(content: string): {
  flg?: string;
  ppl?: string;
  pays?: string;
  iso?: string;
} {
  const ids: { flg?: string; ppl?: string; pays?: string; iso?: string } = {};

  // FLG_
  const flgMatch = content.match(/FLG_[A-Z_]+/);
  if (flgMatch) ids.flg = flgMatch[0];

  // PPL_ - chercher d'abord l'ID complet dans la ligne "Identifiant peuple"
  const pplIdMatch = content.match(
    /Identifiant.*?peuple.*?:\s*(PPL_[A-Z_0-9,\s]+(?:,\s*PPL_[A-Z_0-9]+)*)/i
  );
  if (pplIdMatch) {
    ids.ppl = pplIdMatch[1].trim();
  } else {
    // Fallback : chercher dans "Identifiant :" ou "Identifiant peuple (ID) :"
    const pplIdMatch2 = content.match(
      /Identifiant.*?:\s*(PPL_[A-Z_0-9,\s]+(?:,\s*PPL_[A-Z_0-9]+)*)/i
    );
    if (pplIdMatch2) {
      ids.ppl = pplIdMatch2[1].trim();
    } else {
      // Fallback : chercher le premier PPL_ trouvé
      const pplMatch = content.match(/PPL_[A-Z_0-9]+/);
      if (pplMatch) ids.ppl = pplMatch[0];
    }
  }

  // Code pays ISO (3 lettres majuscules) - chercher spécifiquement dans la ligne "Identifiant pays"
  const paysIdMatch = content.match(/Identifiant pays.*?:\s*([A-Z]{3})/i);
  if (paysIdMatch) {
    ids.pays = paysIdMatch[1];
  } else {
    // Fallback : chercher un code pays ISO (3 lettres majuscules) mais exclure "ISO" lui-même
    const paysMatch = content.match(/\b([A-Z]{3})\b/);
    if (paysMatch && paysMatch[1].length === 3 && paysMatch[1] !== "ISO") {
      ids.pays = paysMatch[1];
    }
  }

  // Code ISO 639-3 (3 lettres minuscules)
  const isoMatch = content.match(/ISO 639-3[:\s]+([a-z]{3})/i);
  if (isoMatch) {
    ids.iso = isoMatch[1].toLowerCase();
  }

  return ids;
}

// Vérifier si une section est complète (non vide et pas juste "N/A")
function isSectionComplete(content: string, sectionTitle: string): boolean {
  const regex = new RegExp(
    `#+\\s*${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^#]*`,
    "i"
  );
  const match = content.match(regex);
  if (!match) return false;

  const sectionContent = match[0];
  // Vérifier qu'il y a du contenu significatif (pas juste "N/A", "-", ou vide)
  const meaningfulContent = sectionContent.split("\n").filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed &&
      !trimmed.match(
        /^[-:]?\s*(N\/A|Non applicable|N\/A|A compléter|\.\.\.)$/i
      ) &&
      trimmed.length > 3
    );
  });

  return meaningfulContent.length > 0;
}

// Vérifier la contextualisation des termes coloniaux
function hasColonialTermContext(content: string): boolean {
  const colonialIndicators = [
    /Pourquoi.*pose.*problème/i,
    /origine.*terme/i,
    /exonyme/i,
    /endonyme/i,
    /auto-appellation/i,
    /usage contemporain/i,
    /colonial/i,
    /péjoratif/i,
  ];

  return colonialIndicators.some((regex) => regex.test(content));
}

// Vérifier l'enrichissement des origines et appellations
function hasEnrichedOrigins(content: string): boolean {
  const originIndicators = [
    /Origines anciennes/i,
    /Routes migratoires/i,
    /Période de formation/i,
    /Zones d'établissement/i,
    /Auto-appellation/i,
    /Exonymes/i,
    /Appellations historiques/i,
  ];

  const hasIndicators = originIndicators.some((regex) => regex.test(content));
  if (!hasIndicators) return false;

  // Vérifier qu'il y a du contenu réel (pas juste les titres)
  const originSection = content.match(/#\s*2\.\s*Origines[^#]*/i);
  if (!originSection) return false;

  const meaningfulLines = originSection[0].split("\n").filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed &&
      !trimmed.match(
        /^[-:]?\s*(N\/A|Non applicable|N\/A|A compléter|\.\.\.)$/i
      ) &&
      !trimmed.match(/^#+\s*/) &&
      trimmed.length > 10
    );
  });

  return meaningfulLines.length >= 3;
}

// Validation 1: IDs cohérents
function validateIDs(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Charger les CSV pour vérifier la cohérence
  const famillesCSV = loadCSV(
    path.join(AFRIK_ROOT, "famille_linguistique/famille_linguistique.csv")
  );
  const peuplesCSV = loadCSV(
    path.join(PUBLIC_ROOT, "peuple_demographie_globale.csv")
  );
  const paysCSV = loadCSV(path.join(PUBLIC_ROOT, "pays_demographie.csv"));

  const flgIds = new Set(
    famillesCSV.map((row) => row.id_famille).filter(Boolean)
  );
  const pplIds = new Set(
    peuplesCSV.map((row) => row.id_peuple).filter(Boolean)
  );
  const paysIds = new Set(paysCSV.map((row) => row.id_pays).filter(Boolean));

  // Vérifier les familles linguistiques
  const flgFiles = fs
    .readdirSync(path.join(AFRIK_ROOT, "famille_linguistique"))
    .filter((f) => f.startsWith("FLG_") && f.endsWith(".txt"));

  for (const file of flgFiles) {
    const filePath = path.join(AFRIK_ROOT, "famille_linguistique", file);
    const content = fs.readFileSync(filePath, "utf-8");
    const ids = extractIDs(content);
    const expectedId = file.replace(".txt", "");

    if (ids.flg && ids.flg !== expectedId) {
      errors.push(
        `FLG ${file}: ID dans le fichier (${ids.flg}) ne correspond pas au nom du fichier (${expectedId})`
      );
    }

    if (!flgIds.has(expectedId)) {
      warnings.push(
        `FLG ${file}: ID ${expectedId} absent du CSV famille_linguistique.csv`
      );
    }
  }

  // Vérifier les peuples
  const peuplesDirs = fs
    .readdirSync(path.join(AFRIK_ROOT, "peuples"), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory());

  for (const dir of peuplesDirs) {
    const pplFiles = fs
      .readdirSync(path.join(AFRIK_ROOT, "peuples", dir.name))
      .filter((f) => f.startsWith("PPL_") && f.endsWith(".txt"));

    for (const file of pplFiles) {
      const filePath = path.join(AFRIK_ROOT, "peuples", dir.name, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const ids = extractIDs(content);
      const expectedId = file.replace(".txt", "");

      // Pour les fichiers macro (avec virgules dans le nom), accepter si l'ID correspond au nom complet
      if (ids.ppl && ids.ppl !== expectedId) {
        // Si le nom du fichier contient des virgules, c'est un fichier macro
        // L'ID doit correspondre exactement au nom du fichier
        if (expectedId.includes(",") && ids.ppl === expectedId) {
          // C'est bon, l'ID correspond au nom complet
        } else if (!expectedId.includes(",")) {
          // Fichier simple, l'ID doit correspondre exactement
          errors.push(
            `PPL ${file}: ID dans le fichier (${ids.ppl}) ne correspond pas au nom du fichier (${expectedId})`
          );
        } else {
          // Fichier macro mais l'ID ne correspond pas
          errors.push(
            `PPL ${file}: ID dans le fichier (${ids.ppl}) ne correspond pas au nom du fichier (${expectedId})`
          );
        }
      }

      if (!pplIds.has(expectedId)) {
        warnings.push(
          `PPL ${file}: ID ${expectedId} absent du CSV peuple_demographie_globale.csv`
        );
      }
    }
  }

  // Vérifier les pays
  const paysFiles = fs
    .readdirSync(path.join(AFRIK_ROOT, "pays"))
    .filter((f) => f.endsWith(".txt"));

  for (const file of paysFiles) {
    const filePath = path.join(AFRIK_ROOT, "pays", file);
    const content = fs.readFileSync(filePath, "utf-8");
    const ids = extractIDs(content);
    const expectedId = file.replace(".txt", "").toUpperCase();

    if (ids.pays && ids.pays !== expectedId) {
      errors.push(
        `Pays ${file}: ID dans le fichier (${ids.pays}) ne correspond pas au nom du fichier (${expectedId})`
      );
    }

    if (!paysIds.has(expectedId)) {
      warnings.push(
        `Pays ${file}: ID ${expectedId} absent du CSV pays_demographie.csv`
      );
    }
  }

  results.push({
    category: "IDs cohérents",
    status:
      errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "success",
    message:
      errors.length > 0
        ? `${errors.length} erreur(s) trouvée(s)`
        : warnings.length > 0
          ? `${warnings.length} avertissement(s) trouvé(s)`
          : "Tous les IDs sont cohérents",
    details: [...errors, ...warnings],
  });

  return results;
}

// Validation 2: Langue → famille linguistique
function validateLanguageFamily(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const errors: string[] = [];

  const famillesCSV = loadCSV(
    path.join(AFRIK_ROOT, "famille_linguistique/famille_linguistique.csv")
  );

  // Créer un index langue → famille
  const langueToFamille = new Map<string, string>();
  for (const row of famillesCSV) {
    if (row.code_iso && row.id_famille) {
      langueToFamille.set(row.code_iso.toLowerCase(), row.id_famille);
    }
  }

  // Vérifier dans les fichiers peuples
  const peuplesDirs = fs
    .readdirSync(path.join(AFRIK_ROOT, "peuples"), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory());

  for (const dir of peuplesDirs) {
    const pplFiles = fs
      .readdirSync(path.join(AFRIK_ROOT, "peuples", dir.name))
      .filter((f) => f.startsWith("PPL_") && f.endsWith(".txt"));

    for (const file of pplFiles) {
      const filePath = path.join(AFRIK_ROOT, "peuples", dir.name, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const ids = extractIDs(content);

      if (ids.iso && ids.flg) {
        const expectedFamille = langueToFamille.get(ids.iso);
        if (expectedFamille && expectedFamille !== ids.flg) {
          errors.push(
            `PPL ${file}: Langue ${ids.iso} devrait être dans ${expectedFamille}, mais fichier indique ${ids.flg}`
          );
        }
      }
    }
  }

  results.push({
    category: "Langue → famille linguistique",
    status: errors.length > 0 ? "error" : "success",
    message:
      errors.length > 0
        ? `${errors.length} incohérence(s) trouvée(s)`
        : "Toutes les langues sont correctement liées à leur famille linguistique",
    details: errors,
  });

  return results;
}

// Validation 3: Peuple → pays
function validatePeuplePays(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const paysCSV = loadCSV(path.join(PUBLIC_ROOT, "pays_demographie.csv"));
  const paysIds = new Set(paysCSV.map((row) => row.id_pays).filter(Boolean));

  // Vérifier dans les fichiers peuples
  const peuplesDirs = fs
    .readdirSync(path.join(AFRIK_ROOT, "peuples"), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory());

  for (const dir of peuplesDirs) {
    const pplFiles = fs
      .readdirSync(path.join(AFRIK_ROOT, "peuples", dir.name))
      .filter((f) => f.startsWith("PPL_") && f.endsWith(".txt"));

    for (const file of pplFiles) {
      const filePath = path.join(AFRIK_ROOT, "peuples", dir.name, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // Extraire les codes pays mentionnés
      const paysMatches = content.matchAll(/\b([A-Z]{3})\b/g);
      const paysMentionnes = new Set<string>();
      for (const match of paysMatches) {
        const code = match[1];
        if (code.length === 3 && code === code.toUpperCase()) {
          paysMentionnes.add(code);
        }
      }

      // Vérifier que les codes pays existent
      for (const code of paysMentionnes) {
        if (!paysIds.has(code)) {
          warnings.push(
            `PPL ${file}: Code pays ${code} mentionné mais absent du CSV pays_demographie.csv`
          );
        }
      }
    }
  }

  results.push({
    category: "Peuple → pays",
    status:
      errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "success",
    message:
      errors.length > 0
        ? `${errors.length} erreur(s) trouvée(s)`
        : warnings.length > 0
          ? `${warnings.length} avertissement(s) trouvé(s)`
          : "Tous les peuples sont correctement liés aux pays",
    details: [...errors, ...warnings],
  });

  return results;
}

// Validation 4: Termes coloniaux contextualisés
function validateColonialTerms(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const filesWithoutContext: string[] = [];

  // Vérifier les familles linguistiques
  const flgFiles = fs
    .readdirSync(path.join(AFRIK_ROOT, "famille_linguistique"))
    .filter((f) => f.startsWith("FLG_") && f.endsWith(".txt"));

  for (const file of flgFiles) {
    const filePath = path.join(AFRIK_ROOT, "famille_linguistique", file);
    const content = fs.readFileSync(filePath, "utf-8");

    // Vérifier si le fichier mentionne des termes coloniaux
    const hasColonialTerms =
      /(exonyme|colonial|péjoratif|appellation.*historique)/i.test(content);

    if (hasColonialTerms && !hasColonialTermContext(content)) {
      filesWithoutContext.push(`FLG ${file}`);
    }
  }

  // Vérifier les peuples
  const peuplesDirs = fs
    .readdirSync(path.join(AFRIK_ROOT, "peuples"), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory());

  for (const dir of peuplesDirs) {
    const pplFiles = fs
      .readdirSync(path.join(AFRIK_ROOT, "peuples", dir.name))
      .filter((f) => f.startsWith("PPL_") && f.endsWith(".txt"));

    for (const file of pplFiles) {
      const filePath = path.join(AFRIK_ROOT, "peuples", dir.name, file);
      const content = fs.readFileSync(filePath, "utf-8");

      const hasColonialTerms =
        /(exonyme|colonial|péjoratif|appellation.*historique)/i.test(content);

      if (hasColonialTerms && !hasColonialTermContext(content)) {
        filesWithoutContext.push(`PPL ${file}`);
      }
    }
  }

  results.push({
    category: "Termes coloniaux contextualisés",
    status: filesWithoutContext.length > 0 ? "warning" : "success",
    message:
      filesWithoutContext.length > 0
        ? `${filesWithoutContext.length} fichier(s) avec termes coloniaux non contextualisés`
        : "Tous les termes coloniaux sont correctement contextualisés",
    details: filesWithoutContext,
  });

  return results;
}

// Validation 5: Sections TXT complètes
function validateCompleteSections(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const incompleteFiles: string[] = [];

  const requiredSections = {
    famille_linguistique: [
      "Informations générales",
      "Peuples associés",
      "Caractéristiques linguistiques",
      "Histoire et origines",
      "Répartition géographique",
      "Sources",
    ],
    peuple: [
      "Nom du peuple",
      "Origines, migrations et formation du peuple",
      "Organisation et structure interne",
      "Langues et sous-familles",
      "Culture, rites et traditions",
      "Rôle historique",
      "Démographie globale",
      "Sources",
    ],
    pays: [
      "Nom du pays",
      "Appellations historiques",
      "Civilisations, royaumes",
      "Peuples majeurs",
      "Culture, modes de vie",
      "Faits historiques",
      "Sources",
    ],
  };

  // Vérifier les familles linguistiques
  const flgFiles = fs
    .readdirSync(path.join(AFRIK_ROOT, "famille_linguistique"))
    .filter((f) => f.startsWith("FLG_") && f.endsWith(".txt"));

  for (const file of flgFiles) {
    const filePath = path.join(AFRIK_ROOT, "famille_linguistique", file);
    const content = fs.readFileSync(filePath, "utf-8");

    const missingSections = requiredSections.famille_linguistique.filter(
      (section) => !isSectionComplete(content, section)
    );

    if (missingSections.length > 0) {
      incompleteFiles.push(
        `FLG ${file}: sections manquantes/incomplètes: ${missingSections.join(", ")}`
      );
    }
  }

  // Vérifier les peuples
  const peuplesDirs = fs
    .readdirSync(path.join(AFRIK_ROOT, "peuples"), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory());

  for (const dir of peuplesDirs) {
    const pplFiles = fs
      .readdirSync(path.join(AFRIK_ROOT, "peuples", dir.name))
      .filter((f) => f.startsWith("PPL_") && f.endsWith(".txt"));

    for (const file of pplFiles) {
      const filePath = path.join(AFRIK_ROOT, "peuples", dir.name, file);
      const content = fs.readFileSync(filePath, "utf-8");

      const missingSections = requiredSections.peuple.filter(
        (section) => !isSectionComplete(content, section)
      );

      if (missingSections.length > 0) {
        incompleteFiles.push(
          `PPL ${file}: sections manquantes/incomplètes: ${missingSections.join(", ")}`
        );
      }
    }
  }

  // Vérifier les pays
  const paysFiles = fs
    .readdirSync(path.join(AFRIK_ROOT, "pays"))
    .filter((f) => f.endsWith(".txt"));

  for (const file of paysFiles) {
    const filePath = path.join(AFRIK_ROOT, "pays", file);
    const content = fs.readFileSync(filePath, "utf-8");

    const missingSections = requiredSections.pays.filter(
      (section) => !isSectionComplete(content, section)
    );

    if (missingSections.length > 0) {
      incompleteFiles.push(
        `Pays ${file}: sections manquantes/incomplètes: ${missingSections.join(", ")}`
      );
    }
  }

  results.push({
    category: "Sections TXT complètes",
    status: incompleteFiles.length > 0 ? "warning" : "success",
    message:
      incompleteFiles.length > 0
        ? `${incompleteFiles.length} fichier(s) avec sections incomplètes`
        : "Toutes les sections sont complètes",
    details: incompleteFiles.slice(0, 50), // Limiter à 50 pour la lisibilité
  });

  return results;
}

// Validation 6: Origines et appellations enrichies
function validateEnrichedOrigins(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const notEnriched: string[] = [];

  // Vérifier les peuples
  const peuplesDirs = fs
    .readdirSync(path.join(AFRIK_ROOT, "peuples"), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory());

  for (const dir of peuplesDirs) {
    const pplFiles = fs
      .readdirSync(path.join(AFRIK_ROOT, "peuples", dir.name))
      .filter((f) => f.startsWith("PPL_") && f.endsWith(".txt"));

    for (const file of pplFiles) {
      const filePath = path.join(AFRIK_ROOT, "peuples", dir.name, file);
      const content = fs.readFileSync(filePath, "utf-8");

      if (!hasEnrichedOrigins(content)) {
        notEnriched.push(`PPL ${file}`);
      }
    }
  }

  results.push({
    category: "Origines et appellations enrichies",
    status: notEnriched.length > 0 ? "warning" : "success",
    message:
      notEnriched.length > 0
        ? `${notEnriched.length} fichier(s) peuple avec origines/appellations non enrichies`
        : "Toutes les origines et appellations sont enrichies",
    details: notEnriched.slice(0, 50), // Limiter à 50 pour la lisibilité
  });

  return results;
}

// Fonction principale
function main() {
  console.log("🔍 Validation des données AFRIK - Étape 6\n");
  console.log("=".repeat(60));

  const allResults: ValidationResult[] = [];

  // Exécuter toutes les validations
  console.log("\n1️⃣ Validation des IDs cohérents...");
  allResults.push(...validateIDs());

  console.log("2️⃣ Validation Langue → famille linguistique...");
  allResults.push(...validateLanguageFamily());

  console.log("3️⃣ Validation Peuple → pays...");
  allResults.push(...validatePeuplePays());

  console.log("4️⃣ Validation termes coloniaux contextualisés...");
  allResults.push(...validateColonialTerms());

  console.log("5️⃣ Validation sections TXT complètes...");
  allResults.push(...validateCompleteSections());

  console.log("6️⃣ Validation origines et appellations enrichies...");
  allResults.push(...validateEnrichedOrigins());

  // Afficher les résultats
  console.log("\n" + "=".repeat(60));
  console.log("\n📊 RÉSULTATS DE LA VALIDATION\n");

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalSuccess = 0;

  for (const result of allResults) {
    const icon =
      result.status === "success"
        ? "✅"
        : result.status === "warning"
          ? "⚠️"
          : "❌";
    console.log(`${icon} ${result.category}: ${result.message}`);

    if (result.status === "error") totalErrors++;
    else if (result.status === "warning") totalWarnings++;
    else totalSuccess++;

    if (
      result.details &&
      result.details.length > 0 &&
      result.details.length <= 10
    ) {
      result.details.forEach((detail) => console.log(`   - ${detail}`));
    } else if (result.details && result.details.length > 10) {
      console.log(
        `   ... (${result.details.length} détails, affichage limité)`
      );
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`\n📈 RÉSUMÉ:`);
  console.log(`   ✅ Succès: ${totalSuccess}`);
  console.log(`   ⚠️  Avertissements: ${totalWarnings}`);
  console.log(`   ❌ Erreurs: ${totalErrors}`);

  // Générer un rapport JSON
  const reportPath = path.join(
    __dirname,
    "../dataset/source/afrik/logs/validation_report.json"
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`\n📄 Rapport détaillé sauvegardé: ${reportPath}`);

  // Mettre à jour le workflow_status.csv
  const workflowStatusPath = path.join(PUBLIC_ROOT, "workflow_status.csv");
  const workflowContent = fs.readFileSync(workflowStatusPath, "utf-8");
  const updatedContent = workflowContent.replace(
    /validation,pending/g,
    `validation,${totalErrors === 0 ? "done" : "in_progress"}`
  );
  fs.writeFileSync(workflowStatusPath, updatedContent);
  console.log("✅ workflow_status.csv mis à jour");

  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
