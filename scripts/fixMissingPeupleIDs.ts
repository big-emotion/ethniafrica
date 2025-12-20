#!/usr/bin/env tsx
/**
 * Script pour corriger les IDs de peuples manquants dans le CSV
 *
 * Extrait les informations des fichiers TXT et les ajoute au CSV peuple_demographie_globale.csv
 */

import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

interface CSVRow {
  id_peuple: string;
  nom_peuple: string;
  famille_linguistique: string;
  population_totale: string;
  nombre_de_pays: string;
  pays_principaux: string;
  population_afrique: string;
  annee_reference: string;
  source: string;
}

const AFRIK_ROOT = path.join(__dirname, "../dataset/source/afrik");
const PUBLIC_ROOT = path.join(__dirname, "../public");
const CSV_PATH = path.join(PUBLIC_ROOT, "peuple_demographie_globale.csv");

// Charger le CSV existant
function loadCSV(): CSVRow[] {
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true, // Permet des colonnes incohérentes
    relax_quotes: true,
  }) as CSVRow[];
}

// Échapper les valeurs CSV
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Sauvegarder le CSV
function saveCSV(rows: CSVRow[]): void {
  const headers = [
    "id_peuple",
    "nom_peuple",
    "famille_linguistique",
    "population_totale",
    "nombre_de_pays",
    "pays_principaux",
    "population_afrique",
    "annee_reference",
    "source",
  ];

  const lines: string[] = [];

  // En-tête
  lines.push(headers.join(","));

  // Données
  for (const row of rows) {
    const values = [
      escapeCSV(row.id_peuple || ""),
      escapeCSV(row.nom_peuple || ""),
      escapeCSV(row.famille_linguistique || ""),
      escapeCSV(row.population_totale || "0"),
      escapeCSV(row.nombre_de_pays || "0"),
      escapeCSV(row.pays_principaux || "N/A"),
      escapeCSV(row.population_afrique || "0"),
      escapeCSV(row.annee_reference || "2025"),
      escapeCSV(row.source || "N/A"),
    ];
    lines.push(values.join(","));
  }

  fs.writeFileSync(CSV_PATH, lines.join("\n") + "\n", "utf-8");
}

// Extraire les informations d'un fichier TXT
function extractPeupleData(filePath: string, fileId: string): CSVRow | null {
  const content = fs.readFileSync(filePath, "utf-8");

  // Extraire le nom principal
  const nomMatch =
    content.match(/- Nom principal du peuple\s*:\s*(.+)$/m) ||
    content.match(/Nom principal du peuple\s*:\s*(.+)$/m);
  const nomPrincipal = nomMatch
    ? nomMatch[1].trim()
    : fileId.replace(/^PPL_/, "").replace(/_/g, " ");

  // Extraire la famille linguistique
  const flgMatch = content.match(
    /Famille linguistique principale\s*:\s*(.+)$/m
  );
  let familleLinguistique = "";
  if (flgMatch) {
    const flgText = flgMatch[1];
    const flgIdMatch = flgText.match(/(FLG_[A-Z0-9_]+)/);
    familleLinguistique = flgIdMatch ? flgIdMatch[1] : "";
  }

  // Extraire la population totale
  const popMatch = content.match(
    /Population totale \(tous pays\)\s*:\s*([0-9,\s]+)/m
  );
  let populationTotale = "0";
  if (popMatch) {
    populationTotale = popMatch[1].replace(/[,\s]/g, "");
  }

  // Extraire la répartition par pays pour compter le nombre de pays
  const repartitionMatch = content.match(
    /Répartition par pays\s*:([\s\S]+?)(?=\n#{1,3}|\n- [A-Z]|$)/
  );
  let nombreDePays = "0";
  let paysPrincipaux = "N/A";
  if (repartitionMatch) {
    const paysLines = repartitionMatch[1]
      .split("\n")
      .filter((line) => line.trim().startsWith("-"));
    nombreDePays = paysLines.length > 0 ? String(paysLines.length) : "0";

    // Extraire les codes pays
    const paysCodes: string[] = [];
    for (const line of paysLines) {
      const codeMatch = line.match(/\b([A-Z]{3})\b/);
      if (codeMatch) {
        const code = codeMatch[1];
        // Exclure les codes non-pays
        if (
          ![
            "ISO",
            "CIA",
            "SIL",
            "ONU",
            "AOF",
            "UPC",
            "RCA",
            "RDC",
            "DRC",
          ].includes(code)
        ) {
          paysCodes.push(code);
        }
      }
    }
    if (paysCodes.length > 0) {
      paysPrincipaux = paysCodes.join(", ");
      nombreDePays = String(paysCodes.length);
    }
  }

  // Extraire l'année de référence
  const anneeMatch = content.match(/Année de référence\s*:\s*(\d{4})/m);
  const anneeReference = anneeMatch ? anneeMatch[1] : "2025";

  // Extraire la source
  const sourceMatch = content.match(/Source\s*:\s*(.+)$/m);
  const source = sourceMatch ? sourceMatch[1].trim() : "N/A";

  return {
    id_peuple: fileId,
    nom_peuple: nomPrincipal,
    famille_linguistique: familleLinguistique,
    population_totale: populationTotale,
    nombre_de_pays: nombreDePays,
    pays_principaux: paysPrincipaux,
    population_afrique: populationTotale, // Par défaut, même valeur
    annee_reference: anneeReference,
    source: source,
  };
}

// Fonction principale
function main() {
  console.log("🔧 Correction des IDs de peuples manquants dans le CSV\n");
  console.log("=".repeat(60));

  // Charger le CSV existant
  const existingRows = loadCSV();
  const existingIds = new Set(existingRows.map((row) => row.id_peuple));

  console.log(`\n📊 CSV actuel : ${existingRows.length} entrées`);

  // Trouver tous les fichiers TXT de peuples
  const peuplesDirs = fs
    .readdirSync(path.join(AFRIK_ROOT, "peuples"), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory());

  const missingEntries: CSVRow[] = [];
  let totalFiles = 0;

  for (const dir of peuplesDirs) {
    const pplFiles = fs
      .readdirSync(path.join(AFRIK_ROOT, "peuples", dir.name))
      .filter((f) => f.startsWith("PPL_") && f.endsWith(".txt"));

    for (const file of pplFiles) {
      totalFiles++;
      const fileId = file.replace(".txt", "");

      // Vérifier si l'ID existe déjà dans le CSV
      // Pour les fichiers macro avec virgules, on garde l'ID complet
      if (!existingIds.has(fileId)) {
        const filePath = path.join(AFRIK_ROOT, "peuples", dir.name, file);

        const entry = extractPeupleData(filePath, fileId);
        if (entry) {
          missingEntries.push(entry);
        }
      }
    }
  }

  console.log(`📁 Fichiers TXT trouvés : ${totalFiles}`);
  console.log(`❌ IDs manquants dans le CSV : ${missingEntries.length}`);

  if (missingEntries.length === 0) {
    console.log("\n✅ Aucun ID manquant à ajouter !");
    return;
  }

  // Afficher quelques exemples
  console.log("\n📋 Exemples d'entrées à ajouter :");
  missingEntries.slice(0, 5).forEach((entry) => {
    console.log(
      `   - ${entry.id_peuple}: ${entry.nom_peuple} (${entry.famille_linguistique || "N/A"}) - Pop: ${entry.population_totale}`
    );
  });

  // Ajouter les entrées manquantes
  const allRows = [...existingRows, ...missingEntries];

  // Trier par ID
  allRows.sort((a, b) => a.id_peuple.localeCompare(b.id_peuple));

  // Sauvegarder
  saveCSV(allRows);

  console.log(`\n✅ ${missingEntries.length} entrées ajoutées au CSV`);
  console.log(`📊 Nouveau total : ${allRows.length} entrées`);
  console.log(`\n💾 CSV sauvegardé : ${CSV_PATH}`);
}

main();
