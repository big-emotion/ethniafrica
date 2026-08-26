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
import { pathToFileURL } from "url";
import { parse } from "csv-parse/sync";
import { evaluateSourceUrl } from "@/lib/sources/authorized-source-catalog";
import { parseRelationFile } from "../src/lib/afrik/parsers/relationParser";
import { parseNameRecordFile } from "../src/lib/afrik/parsers/nameRecordParser";

// ─── Exported ValidationResult (FR26-FR31) ───────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

// Legacy internal result shape (used by existing validation functions only)
export interface LegacyValidationResult {
  category: string;
  status: "success" | "warning" | "error";
  message: string;
  details?: string[];
}

interface CSVRow {
  [key: string]: string;
}

interface LanguageCsvRow {
  id_langue?: string;
  code_iso_639_3?: string;
  id_famille?: string;
}

const AFRIK_ROOT = path.join(__dirname, "../dataset/source/afrik");
const PUBLIC_ROOT = path.join(__dirname, "../public");
const ISO_639_3_PATTERN = /^[a-z]{3}$/;

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
function validateIDs(): LegacyValidationResult[] {
  const results: LegacyValidationResult[] = [];
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
function validateLanguageFamily(): LegacyValidationResult[] {
  const results: LegacyValidationResult[] = [];
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
function validatePeuplePays(): LegacyValidationResult[] {
  const results: LegacyValidationResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const paysCSV = loadCSV(path.join(PUBLIC_ROOT, "pays_demographie.csv"));
  const paysIds = new Set(paysCSV.map((row) => row.id_pays).filter(Boolean));

  // Acronymes d'organisations et autres codes à exclure (faux positifs)
  const excludedCodes = new Set([
    // Organisations internationales
    "ISO", // ISO 639-3
    "CIA", // CIA World Factbook
    "SIL", // SIL Ethnologue
    "ONU", // Organisation des Nations Unies
    "UNFPA", // Fonds des Nations Unies pour la population (mais c'est 5 lettres)
    "UNHCR", // Haut Commissariat des Nations Unies (mais c'est 5 lettres)
    "IDP", // Internally Displaced Persons
    "CSV", // Comma-Separated Values (format de fichier)

    // Codes pays obsolètes ou non-ISO
    "RCA", // République Centrafricaine (code obsolète, le code ISO est CAF)
    "RDC", // République Démocratique du Congo (code obsolète, le code ISO est COD)
    "DRC", // Democratic Republic of Congo (code obsolète, le code ISO est COD)
    "CAR", // Central African Republic (code obsolète, le code ISO est CAF)

    // Territoires français (pas des pays indépendants)
    "MYT", // Mayotte
    "REU", // La Réunion
    "TOM", // Territoires d'Outre-Mer (terme historique)

    // Pays non-africains
    "USA", // États-Unis
    "UK", // Royaume-Uni (mais c'est 2 lettres)
    "EU", // Union Européenne (mais c'est 2 lettres)
    "OMN", // Oman

    // Abréviations politiques/organisationnelles (Algérie)
    "FLN", // Front de Libération Nationale
    "FFS", // Front des Forces Socialistes
    "ALN", // Armée de Libération Nationale
    "MAK", // Mouvement pour l'Autonomie de la Kabylie
    "PUF", // Parti (abréviation)
    "MCB", // Mouvement (abréviation)
    "HCA", // Haut Commissariat (abréviation)
    "BNF", // (abréviation)
    "ONS", // Office National des Statistiques (Algérie)
    "ADN", // (abréviation)
    "III", // (abréviation)

    // Autres abréviations
    "AOF", // Afrique-Occidentale Française (terme historique)
    "UPC", // Union des Populations du Cameroun / abréviations diverses
    "FCT", // Federal Capital Territory (Nigeria, pas un pays)
    "CSA", // (abréviation)
    "LRA", // Lord's Resistance Army (groupe armé, pas un pays)

    // Préfixes AFRIK
    "FLG", // Famille Linguistique (préfixe)
    "PPL", // Peuple (préfixe)
    "ID", // Identifiant (mais c'est 2 lettres)
  ]);

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

      // Extraire les codes pays mentionnés avec un contexte plus précis
      // Chercher dans des sections spécifiques : "Pays actuels", "Identifiant pays", "Répartition par pays", etc.
      const paysMentionnes = new Set<string>();

      // 1. Chercher dans la section "Identifiant pays"
      const identifiantPaysMatch = content.match(
        /Identifiant pays.*?:\s*([A-Z]{3})/i
      );
      if (identifiantPaysMatch) {
        paysMentionnes.add(identifiantPaysMatch[1]);
      }

      // 2. Chercher dans "Pays actuels" ou "Répartition par pays"
      const paysActuelsSection = content.match(
        /(?:Pays actuels|Répartition par pays|Répartition géographique)[^#]*/i
      );
      if (paysActuelsSection) {
        const codesInSection =
          paysActuelsSection[0].matchAll(/\b([A-Z]{3})\b/g);
        for (const match of codesInSection) {
          const code = match[1];
          if (!excludedCodes.has(code) && code.length === 3) {
            paysMentionnes.add(code);
          }
        }
      }

      // 3. Chercher dans les listes de pays (format " - Pays : CODE" ou "Pays : CODE")
      const paysListMatches = content.matchAll(
        /(?:^|\n)\s*[-•]\s*(?:[^:]*:)?\s*([A-Z]{3})\b/gm
      );
      for (const match of paysListMatches) {
        const code = match[1];
        if (!excludedCodes.has(code) && code.length === 3) {
          // Vérifier que ce n'est pas dans un contexte d'organisation
          const context = match[0].toLowerCase();
          if (
            !context.includes("iso") &&
            !context.includes("cia") &&
            !context.includes("sil") &&
            !context.includes("onu") &&
            !context.includes("factbook") &&
            !context.includes("ethnologue")
          ) {
            paysMentionnes.add(code);
          }
        }
      }

      // 4. Chercher les codes pays isolés (hors contexte d'organisation)
      // Format: "CODE" ou "CODE," ou "CODE)" ou "CODE." suivi d'un espace ou fin de ligne
      const isolatedCodes = content.matchAll(/\b([A-Z]{3})\b(?=[\s,.)\n]|$)/g);
      for (const match of isolatedCodes) {
        const code = match[1];
        const matchIndex = match.index || 0;
        const beforeContext = content
          .substring(Math.max(0, matchIndex - 20), matchIndex)
          .toLowerCase();
        const afterContext = content
          .substring(matchIndex + 3, Math.min(content.length, matchIndex + 23))
          .toLowerCase();

        // Exclure si c'est dans un contexte d'organisation
        if (
          excludedCodes.has(code) ||
          beforeContext.includes("iso 639") ||
          beforeContext.includes("cia world") ||
          beforeContext.includes("sil ethnologue") ||
          beforeContext.includes("onu") ||
          afterContext.includes("factbook") ||
          afterContext.includes("ethnologue") ||
          afterContext.includes("639-3")
        ) {
          continue;
        }

        // Ne garder que les codes qui ressemblent à des codes pays (pas dans des phrases)
        if (code.length === 3 && !excludedCodes.has(code)) {
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
function validateColonialTerms(): LegacyValidationResult[] {
  const results: LegacyValidationResult[] = [];
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
function validateCompleteSections(): LegacyValidationResult[] {
  const results: LegacyValidationResult[] = [];
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
function validateEnrichedOrigins(): LegacyValidationResult[] {
  const results: LegacyValidationResult[] = [];
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

// ─── New validation functions (FR26-FR31) ────────────────────────────────────

/** Collect all PPL JSON files under peuples/, returning {flgFolder, file, fullPath} */
function collectPplFiles(
  datasetRoot: string
): Array<{ flgFolder: string; file: string; fullPath: string }> {
  const peuplesDir = path.join(datasetRoot, "peuples");
  if (!fs.existsSync(peuplesDir)) return [];

  const results: Array<{ flgFolder: string; file: string; fullPath: string }> =
    [];
  const entries = fs.readdirSync(peuplesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const subDir = path.join(peuplesDir, entry.name);
    const jsonFiles = fs.readdirSync(subDir).filter((f) => f.endsWith(".json"));
    for (const file of jsonFiles) {
      results.push({
        flgFolder: entry.name,
        file,
        fullPath: path.join(subDir, file),
      });
    }
  }
  return results;
}

/** Return the set of FLG ids that have a corresponding JSON file */
function loadFlgIds(datasetRoot: string): Set<string> {
  const flgDir = path.join(datasetRoot, "famille_linguistique");
  if (!fs.existsSync(flgDir)) return new Set();
  return new Set(
    fs
      .readdirSync(flgDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.basename(f, ".json"))
  );
}

/**
 * FR26 – Every FLG subdirectory in peuples/ must correspond to an existing FLG JSON file.
 */
export function checkFlgFolderMatch(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const peuplesDir = path.join(datasetRoot, "peuples");
  if (!fs.existsSync(peuplesDir)) {
    return { ok: true, errors: [], warnings: [] };
  }

  const flgIds = loadFlgIds(datasetRoot);
  const subDirs = fs
    .readdirSync(peuplesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("FLG_"))
    .map((d) => d.name);

  for (const dir of subDirs) {
    if (!flgIds.has(dir)) {
      errors.push(
        `peuples/${dir}: no matching FLG JSON file in famille_linguistique/`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * FR27 – No two PPL JSON files may share the same `id` field.
 */
export function checkPplDuplicates(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const seen = new Map<string, string>(); // id → first file path

  for (const { fullPath } of collectPplFiles(datasetRoot)) {
    let data: { id?: string };
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${fullPath}: could not parse JSON`);
      continue;
    }
    if (!data.id) continue;
    if (seen.has(data.id)) {
      errors.push(
        `Duplicate PPL id "${data.id}" in ${fullPath} (first seen in ${seen.get(data.id)})`
      );
    } else {
      seen.set(data.id, fullPath);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * FR28 – For each pays JSON, the sum of peoples[].percentageInCountry must be [95, 105].
 *
 * Tolerance bands (transition plan — see docs/adr/0001-fr28-demographic-tolerance.md):
 *   - Hard gate (this function):     [95, 105] — errors, fails validation.
 *   - Strict warning (checkPopulationSumsStrict): [99, 101] — warnings only.
 * The strict warning is the doctrinal target; the hard gate will be tightened
 * once all country fiches land inside [99, 101].
 */
export function checkPopulationSums(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const paysDir = path.join(datasetRoot, "pays");
  if (!fs.existsSync(paysDir)) {
    return { ok: true, errors: [], warnings: [] };
  }

  const jsonFiles = fs.readdirSync(paysDir).filter((f) => f.endsWith(".json"));
  for (const file of jsonFiles) {
    const fullPath = path.join(paysDir, file);
    let data: {
      id?: string;
      content?: {
        demographics?: {
          peoples?: Array<{ percentageInCountry?: number }>;
        };
      };
    };
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${file}: could not parse JSON`);
      continue;
    }

    const peoples = data?.content?.demographics?.peoples;
    if (!peoples || peoples.length === 0) continue;

    const sum = peoples.reduce(
      (acc, p) => acc + (p.percentageInCountry ?? 0),
      0
    );
    if (sum < 95 || sum > 105) {
      const countryId = data.id ?? path.basename(file, ".json");
      errors.push(
        `${countryId}: population percentages sum to ${sum.toFixed(2)}% (expected 95–105%)`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * FR28-strict – Doctrinal target band [99, 101].
 *
 * Reports a pays JSON whose peoples[].percentageInCountry sum falls outside
 * [99, 101] but inside the FR28 hard gate [95, 105]. Advisory while ~30
 * countries' splits were being re-sourced; enforced since the whole corpus
 * landed inside the target band, so a fiche can no longer drift back out.
 */
export function checkPopulationSumsStrict(
  datasetRoot: string
): ValidationResult {
  const errors: string[] = [];

  const paysDir = path.join(datasetRoot, "pays");
  if (!fs.existsSync(paysDir)) {
    return { ok: true, errors: [], warnings: [] };
  }

  const jsonFiles = fs.readdirSync(paysDir).filter((f) => f.endsWith(".json"));
  for (const file of jsonFiles) {
    const fullPath = path.join(paysDir, file);
    let data: {
      id?: string;
      content?: {
        demographics?: {
          peoples?: Array<{ percentageInCountry?: number }>;
        };
      };
    };
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      // FR28 already reports parse failures; stay silent here to avoid duplicates.
      continue;
    }

    const peoples = data?.content?.demographics?.peoples;
    if (!peoples || peoples.length === 0) continue;

    const sum = peoples.reduce(
      (acc, p) => acc + (p.percentageInCountry ?? 0),
      0
    );
    if (sum < 99 || sum > 101) {
      const countryId = data.id ?? path.basename(file, ".json");
      errors.push(
        `${countryId}: population percentages sum to ${sum.toFixed(2)}% (strict target 99–101%)`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings: [] };
}

/**
 * FR29 – ISO code validity:
 *   - content.languages.isoCodes entries must match /^[a-z]{3}$/ (ISO 639-3)
 *   - content.demography.distributionByCountry[].country must match /^[A-Z]{3}$/ (ISO 3166-1 α-3)
 */
export function checkIsoValidity(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const iso3166Regex = /^[A-Z]{3}$/;

  for (const { file, fullPath } of collectPplFiles(datasetRoot)) {
    let data: {
      content?: {
        languages?: { isoCodes?: unknown[] };
        demography?: {
          distributionByCountry?: Array<{ country?: unknown }>;
        };
      };
    };
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${file}: could not parse JSON`);
      continue;
    }

    // Check ISO 639-3 language codes
    const isoCodes = data?.content?.languages?.isoCodes ?? [];
    for (const code of isoCodes) {
      if (typeof code !== "string" || !ISO_639_3_PATTERN.test(code)) {
        errors.push(
          `${file}: invalid ISO 639-3 language code "${code}" (expected 3 lowercase letters)`
        );
      }
    }

    // Check ISO 3166-1 α-3 country codes
    const distribution = data?.content?.demography?.distributionByCountry ?? [];
    for (const entry of distribution) {
      const country = (entry as { country?: unknown }).country;
      if (typeof country !== "string" || !iso3166Regex.test(country)) {
        errors.push(
          `${file}: invalid ISO 3166-1 α-3 country code "${country}" (expected 3 uppercase letters)`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Collect all FLG_*.json files under famille_linguistique/, returning {file, fullPath} */
function collectFlgFiles(
  datasetRoot: string
): Array<{ file: string; fullPath: string }> {
  const flgDir = path.join(datasetRoot, "famille_linguistique");
  if (!fs.existsSync(flgDir)) return [];

  return fs
    .readdirSync(flgDir)
    .filter((f) => f.startsWith("FLG_") && f.endsWith(".json"))
    .map((file) => ({ file, fullPath: path.join(flgDir, file) }));
}

/**
 * FR90 – Family structural completeness:
 *   - content.generalInfo.branches must be a non-empty array of non-empty strings.
 *   - content.distribution.distributionByCountry must be a non-empty object whose
 *     keys are valid ISO 3166-1 α-3 codes and whose values are positive numbers.
 *
 * A language family is a top-level AFRIK entity: a fiche that declares neither its
 * internal branches nor where it is spoken can only ever show a reconstruction
 * (ETNI-1289). REQ-119 already renders an empty value as "missing" in the UI; this
 * check turns that same gap into a build-time gate so it cannot silently return.
 */
export function checkFamilyStructuralCompleteness(
  datasetRoot: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const iso3166Regex = /^[A-Z]{3}$/;

  for (const { file, fullPath } of collectFlgFiles(datasetRoot)) {
    let data: {
      content?: {
        generalInfo?: { branches?: unknown };
        distribution?: { distributionByCountry?: unknown };
      };
    };
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${file}: could not parse JSON`);
      continue;
    }

    const branches = data?.content?.generalInfo?.branches;
    if (
      !Array.isArray(branches) ||
      branches.length === 0 ||
      branches.some((b) => typeof b !== "string" || b.trim() === "")
    ) {
      errors.push(
        `${file}: content.generalInfo.branches must be a non-empty array of non-empty strings`
      );
    }

    const distribution = data?.content?.distribution?.distributionByCountry;
    if (
      !distribution ||
      typeof distribution !== "object" ||
      Array.isArray(distribution) ||
      Object.keys(distribution).length === 0
    ) {
      errors.push(
        `${file}: content.distribution.distributionByCountry must be a non-empty object`
      );
      continue;
    }

    for (const [country, speakers] of Object.entries(
      distribution as Record<string, unknown>
    )) {
      if (!iso3166Regex.test(country)) {
        errors.push(
          `${file}: content.distribution.distributionByCountry has invalid ISO 3166-1 α-3 country code "${country}"`
        );
      }
      if (typeof speakers !== "number" || speakers <= 0) {
        errors.push(
          `${file}: content.distribution.distributionByCountry["${country}"] must be a positive number`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function collectJsonFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];

  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }
  return files;
}

function sourceUrls(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value.match(/https?:\/\/[^\s)\]}>\",]+/g) ?? [];
}

/**
 * Reports how a citation will be labelled. Nothing here is an error: under the
 * source doctrine a weak source is published and tiered `unverified`, and the
 * fiche's confidence follows from the tiers it rests on. The blocking gate is
 * "every source carries a tier", which W2-P3 ratchets as the corpus is
 * classified — not "this source is not good enough".
 */
function checkSourceTier(
  file: string,
  sourcePath: string,
  sourceValue: unknown,
  warnings: string[]
) {
  const urls = sourceUrls(sourceValue);
  if (urls.length === 0) {
    warnings.push(
      `${file}: ${sourcePath} carries no URL, so it cannot be tiered from the catalogue`
    );
    return;
  }

  for (const url of urls) {
    const outcome = evaluateSourceUrl(url);
    if (outcome.tier !== "unverified") continue;

    warnings.push(
      `${file}: ${sourcePath} cites \"${outcome.key}\", which publishes at tier unverified`
    );
  }
}

function checkSourcesInValue(
  file: string,
  value: unknown,
  valuePath: string,
  warnings: string[]
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      checkSourcesInValue(file, item, `${valuePath}[${index}]`, warnings);
    });
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = valuePath ? `${valuePath}.${key}` : key;
    if (key === "sources" && Array.isArray(child)) {
      child.forEach((source, index) => {
        const sourcePath = `${childPath}[${index}]`;
        if (typeof source === "string") {
          checkSourceTier(file, sourcePath, source, warnings);
          return;
        }

        if (source && typeof source === "object") {
          const record = source as { url?: unknown; reference?: unknown };
          checkSourceTier(
            file,
            sourcePath,
            typeof record.url === "string" ? record.url : record.reference,
            warnings
          );
          return;
        }

        checkSourceTier(file, sourcePath, source, warnings);
      });
    }
    checkSourcesInValue(file, child, childPath, warnings);
  }
}

function loadLanguageCsv(datasetRoot: string): {
  rows: LanguageCsvRow[];
  error?: string;
} {
  const csvPath = path.join(
    datasetRoot,
    "famille_linguistique",
    "langue_par_famille.csv"
  );

  if (!fs.existsSync(csvPath)) {
    return {
      rows: [],
      error: `FR52: language CSV not found at ${csvPath}`,
    };
  }

  try {
    const rows: LanguageCsvRow[] = parse(fs.readFileSync(csvPath, "utf-8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return { rows };
  } catch {
    return {
      rows: [],
      error: `FR52: could not parse language CSV at ${csvPath}`,
    };
  }
}

/**
 * FR52 – Classification-tree hard gate.
 *
 * The language CSV is authoritative while the live afrik_languages table is
 * empty. Every language row must point to an existing family and carry a
 * unique, valid ISO 639-3 code. People language codes follow the FR29 pattern.
 */
export function checkTreeIntegrity(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { rows, error } = loadLanguageCsv(datasetRoot);
  const familyIds = loadFlgIds(datasetRoot);
  const seenLanguageCodes = new Map<string, string>();

  if (error) {
    errors.push(error);
  }

  for (const row of rows) {
    const rowId = row.id_langue ?? "(unknown)";
    const isoCode = row.code_iso_639_3 ?? "";
    const familyId = row.id_famille ?? "";

    if (!ISO_639_3_PATTERN.test(isoCode)) {
      errors.push(
        `FR52 language row "${rowId}": invalid ISO 639-3 code "${isoCode}" (expected 3 lowercase letters)`
      );
    } else {
      const firstRowId = seenLanguageCodes.get(isoCode);
      if (firstRowId) {
        errors.push(
          `FR52 language rows "${firstRowId}" and "${rowId}": duplicate ISO 639-3 code "${isoCode}"`
        );
      } else {
        seenLanguageCodes.set(isoCode, rowId);
      }
    }

    if (!familyIds.has(familyId)) {
      errors.push(
        `FR52 language "${isoCode}": family "${familyId}" has no matching FLG JSON file`
      );
    }
  }

  for (const { file, fullPath } of collectPplFiles(datasetRoot)) {
    let data: { content?: { languages?: { isoCodes?: unknown[] } } };
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`FR52 ${file}: could not parse JSON`);
      continue;
    }

    const isoCodes = data?.content?.languages?.isoCodes ?? [];
    for (const code of isoCodes) {
      if (typeof code !== "string" || !ISO_639_3_PATTERN.test(code)) {
        errors.push(
          `FR52 ${file}: invalid ISO 639-3 language code "${code}" (expected 3 lowercase letters)`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * FR52-coverage – Per-family people-to-language coverage.
 *
 * This is informational until the language tier is complete, so it always
 * returns ok:true and warns only for families with unlinked peoples.
 */
export function checkTreeCoverage(datasetRoot: string): ValidationResult {
  const { rows } = loadLanguageCsv(datasetRoot);
  const languageCodesByFamily = new Map<string, Set<string>>();
  const coverageByFamily = new Map<
    string,
    { linked: number; unlinked: number }
  >();

  for (const row of rows) {
    const familyId = row.id_famille ?? "";
    const isoCode = row.code_iso_639_3 ?? "";
    if (!familyId || !ISO_639_3_PATTERN.test(isoCode)) continue;

    const codes = languageCodesByFamily.get(familyId) ?? new Set<string>();
    codes.add(isoCode);
    languageCodesByFamily.set(familyId, codes);
  }

  for (const { fullPath } of collectPplFiles(datasetRoot)) {
    let data: {
      languageFamilyId?: unknown;
      content?: { languages?: { isoCodes?: unknown[] } };
    };
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      continue;
    }

    if (typeof data.languageFamilyId !== "string") continue;

    const familyId = data.languageFamilyId;
    const familyCodes =
      languageCodesByFamily.get(familyId) ?? new Set<string>();
    const peopleCodes = data?.content?.languages?.isoCodes ?? [];
    const linked = peopleCodes.some(
      (code) => typeof code === "string" && familyCodes.has(code)
    );
    const counts = coverageByFamily.get(familyId) ?? {
      linked: 0,
      unlinked: 0,
    };

    if (linked) {
      counts.linked++;
    } else {
      counts.unlinked++;
    }
    coverageByFamily.set(familyId, counts);
  }

  const warnings = [...coverageByFamily.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .filter(([, counts]) => counts.unlinked > 0)
    .map(([familyId, counts]) => {
      const total = counts.linked + counts.unlinked;
      return `FR52-coverage ${familyId}: ${counts.linked} linked / ${counts.unlinked} unlinked / ${total} total`;
    });

  return { ok: true, errors: [], warnings };
}

/**
 * Source tiers – resolves every cited URL through the authorised source
 * catalogue and reports which citations will publish as `unverified`. No
 * citation is refused: the tier is the signal.
 */
export function checkAuthorizedSourceTiers(
  datasetRoot: string
): ValidationResult {
  const warnings: string[] = [];

  for (const fullPath of collectJsonFiles(datasetRoot)) {
    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      continue;
    }

    checkSourcesInValue(
      path.relative(datasetRoot, fullPath),
      data,
      "",
      warnings
    );
  }

  return { ok: true, errors: [], warnings };
}

/**
 * FR30 + FR31 – Source URL resolvability (nightly only).
 * Skipped unless process.env.CHECK_SOURCE_URLS === "true".
 * Writes results to dataset/source-url-health.log (two levels above datasetRoot,
 * i.e. path.join(datasetRoot, "../..", "source-url-health.log")).
 */
export async function checkSourceUrls(
  datasetRoot: string
): Promise<ValidationResult> {
  if (process.env.CHECK_SOURCE_URLS !== "true") {
    return { ok: true, errors: [], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const urlRegex = /https?:\/\/[^\s"')]+/g;

  // Collect unique URLs from all PPL sources.
  // FR30 targets "verified fiches" — the current PPL JSON schema has no `verified` field,
  // so all fiches are swept. Add a filter here if a `verified` field is introduced.
  const uniqueUrls = new Set<string>();
  for (const { fullPath } of collectPplFiles(datasetRoot)) {
    let data: { content?: { sources?: unknown[] } };
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      continue;
    }
    const sources = data?.content?.sources ?? [];
    for (const source of sources) {
      if (typeof source !== "string") continue;
      const matches = source.match(urlRegex);
      if (matches) {
        for (const url of matches) uniqueUrls.add(url);
      }
    }
  }

  // Also sweep relation source URLs (REL-5/REL-7, Story 11.3).
  for (const { fullPath } of collectRelationFiles(datasetRoot)) {
    let data: RawRelationFile;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      continue;
    }
    for (const source of data.sources ?? []) {
      if (typeof source?.url !== "string") continue;
      const matches = source.url.match(urlRegex);
      if (matches) {
        for (const url of matches) uniqueUrls.add(url);
      }
    }
  }

  // HEAD-check each URL with a fresh AbortController per request
  const logLines: string[] = [];

  for (const url of uniqueUrls) {
    const controller = new AbortController();
    const ts = new Date().toISOString();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        logLines.push(`[${ts}] OK ${url}`);
      } else {
        logLines.push(`[${ts}] FAIL ${url} (HTTP ${res.status})`);
        errors.push(`URL unreachable (HTTP ${res.status}): ${url}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      logLines.push(`[${ts}] FAIL ${url} (${(err as Error).message})`);
      errors.push(`URL unreachable: ${url}`);
    }
  }

  // Write log file: dataset/source-url-health.log
  // datasetRoot = <repo>/dataset/source/afrik  →  go up two levels to reach dataset/
  const logPath = path.join(datasetRoot, "../..", "source-url-health.log");
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(
    logPath,
    logLines.join("\n") + (logLines.length ? "\n" : "")
  );

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * FR32 – population/percentageInCountry consistency.
 *
 * For each entry under `content.demographics.peoples` in `pays/*.json`,
 * if BOTH `population` and `percentageInCountry` are present, the implied
 * percentage `(population / country_total) × 100` must agree with the stated
 * `percentageInCountry` within 2 percentage points.
 *
 * Registered as `soft: true` (warning, not failure) for now: the country
 * page transformer (`src/lib/countryDataTransformer.ts`) reads
 * `p.population` directly to compute per-row counts and `totalPopulation`.
 * Deleting drifting `population` values today collapses those values to 0
 * on the country page. Flip to a hard gate once the transformer is updated
 * to derive population from `percentageInCountry × country total`.
 *
 * Country totals are loaded from `public/pays_demographie.csv`
 * (UN/UNFPA 2025). If a country has no row in that CSV, the check is skipped
 * for that country with a warning (no invented data). Issue #129 owns ZAF.
 *
 * Per issue #130 KISS option 2, the `population` field is the optional one:
 * when both are present and drift > 2 pp, delete `population`. See
 * `scripts/checkPopulationPercentageDrift.ts`.
 */
const FR32_DRIFT_PP = 2;
const FR32_ZAF_SOFT = new Set(["ZAF"]); // owned by issue #129

export function checkPopulationPercentageDrift(
  datasetRoot: string,
  paysCsvPath: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const paysDir = path.join(datasetRoot, "pays");
  if (!fs.existsSync(paysDir)) {
    return { ok: true, errors, warnings };
  }

  // Load country totals from CSV (id_pays → population_totale_2025).
  const totals = new Map<string, number>();
  if (fs.existsSync(paysCsvPath)) {
    const rows = loadCSV(paysCsvPath);
    for (const row of rows) {
      const id = row.id_pays;
      const pop = Number(row.population_totale_2025);
      if (id && Number.isFinite(pop) && pop > 0) totals.set(id, pop);
    }
  } else {
    warnings.push(
      `FR32: country totals CSV not found at ${paysCsvPath} — check skipped`
    );
    return { ok: true, errors, warnings };
  }

  const files = fs.readdirSync(paysDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const id = path.basename(file, ".json");
    const total = totals.get(id);
    if (!total) {
      warnings.push(
        `FR32 ${id}: no row in pays_demographie.csv — drift check skipped (no invented total)`
      );
      continue;
    }

    let data: {
      content?: {
        demographics?: {
          peoples?: Array<{
            name?: string;
            population?: number;
            percentageInCountry?: number;
          }>;
        };
      };
    };
    try {
      data = JSON.parse(fs.readFileSync(path.join(paysDir, file), "utf-8"));
    } catch {
      warnings.push(`FR32 ${file}: could not parse JSON`);
      continue;
    }

    const peoples = data?.content?.demographics?.peoples ?? [];
    for (const entry of peoples) {
      if (typeof entry?.population !== "number") continue;
      if (typeof entry?.percentageInCountry !== "number") continue;
      const implied = (entry.population / total) * 100;
      const drift = Math.abs(implied - entry.percentageInCountry);
      if (drift > FR32_DRIFT_PP) {
        const msg = `FR32 ${id}/${entry.name ?? "(unnamed)"}: population ${entry.population} implies ${implied.toFixed(2)}% but percentageInCountry is ${entry.percentageInCountry}% (drift ${drift.toFixed(2)} pp > ${FR32_DRIFT_PP} pp threshold) — drop the population field (see scripts/checkPopulationPercentageDrift.ts)`;
        if (FR32_ZAF_SOFT.has(id)) {
          warnings.push(msg + " [soft: owned by issue #129]");
        } else {
          errors.push(msg);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * FR33 — `nameFr` must hold the country's name of ordinary use, not a
 * duplicate of `nameOfficial` (the protocol name). See
 * docs/adr/0008-country-namefr-common-name.md.
 *
 * Hard gate: `nameFr` must be a non-empty string, and when `nameOfficial`
 * is also present, the two must differ.
 */
export function checkCountryNameFrDistinctFromOfficial(
  datasetRoot: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const paysDir = path.join(datasetRoot, "pays");
  if (!fs.existsSync(paysDir)) {
    return { ok: true, errors, warnings };
  }

  const files = fs.readdirSync(paysDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const id = path.basename(file, ".json");

    let data: { id?: string; nameFr?: string; nameOfficial?: string };
    try {
      data = JSON.parse(fs.readFileSync(path.join(paysDir, file), "utf-8"));
    } catch {
      warnings.push(`FR33 ${file}: could not parse JSON`);
      continue;
    }

    const countryId = data.id ?? id;

    if (typeof data.nameFr !== "string" || data.nameFr.trim() === "") {
      errors.push(`FR33 ${countryId}: nameFr is missing or empty`);
      continue;
    }

    if (
      typeof data.nameOfficial === "string" &&
      data.nameOfficial.trim() !== "" &&
      data.nameFr === data.nameOfficial
    ) {
      errors.push(
        `FR33 ${countryId}: nameFr duplicates nameOfficial ("${data.nameFr}") — nameFr must hold the name of ordinary use, not the protocol name`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Collect all colonial-border layer metadata JSON files under geo/colonial_borders/ */
function collectColonialBorderLayers(
  datasetRoot: string
): Array<{ file: string; fullPath: string; dir: string }> {
  const layersDir = path.join(datasetRoot, "geo", "colonial_borders");
  if (!fs.existsSync(layersDir)) return [];

  return fs
    .readdirSync(layersDir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => ({
      file,
      fullPath: path.join(layersDir, file),
      dir: layersDir,
    }));
}

interface ColonialBorderSource {
  reference?: unknown;
  tier?: unknown;
  notes?: unknown;
}

interface ColonialBorderLayer {
  id?: string;
  colonial_powers?: unknown[];
  geometry_file?: string;
  sources?: ColonialBorderSource[];
}

/** Check whether a GeoJSON geometry's rings (Polygon/MultiPolygon) are closed. */
function ringIsClosed(ring: unknown): boolean {
  if (!Array.isArray(ring) || ring.length < 2) return false;
  const first = ring[0];
  const last = ring[ring.length - 1];
  return JSON.stringify(first) === JSON.stringify(last);
}

const GEOJSON_GEOMETRY_TYPES = new Set([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
]);

/** Validate a parsed GeoJSON document is a FeatureCollection with well-formed geometries. */
function validateGeoJson(data: unknown): string[] {
  const errors: string[] = [];
  const doc = data as { type?: unknown; features?: unknown };

  if (doc?.type !== "FeatureCollection" || !Array.isArray(doc.features)) {
    errors.push("not a GeoJSON FeatureCollection with a features[] array");
    return errors;
  }

  for (const feature of doc.features as unknown[]) {
    const geometry = (
      feature as { geometry?: { type?: unknown; coordinates?: unknown } }
    )?.geometry;
    const geomType = geometry?.type;

    if (typeof geomType !== "string" || !GEOJSON_GEOMETRY_TYPES.has(geomType)) {
      errors.push(`feature has invalid or missing geometry type "${geomType}"`);
      continue;
    }

    if (geomType === "Polygon") {
      const rings = (geometry?.coordinates ?? []) as unknown[];
      for (const ring of rings) {
        if (!ringIsClosed(ring)) {
          errors.push(
            "Polygon ring is not closed (first and last coordinate differ)"
          );
        }
      }
    } else if (geomType === "MultiPolygon") {
      const polygons = (geometry?.coordinates ?? []) as unknown[];
      for (const rings of polygons) {
        for (const ring of rings as unknown[]) {
          if (!ringIsClosed(ring)) {
            errors.push(
              "MultiPolygon ring is not closed (first and last coordinate differ)"
            );
          }
        }
      }
    }
  }

  return errors;
}

/**
 * CR1 – Every colonial-border layer must carry ≥ 1 source with tier 1 or 2;
 * Tier-2 entries must carry the Wikipedia-path audit trail in `notes`;
 * Wikipedia itself is never a citable `reference`; geometry must parse as
 * valid GeoJSON (FeatureCollection, closed rings).
 */
export function checkColonialBorderCr1(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const { file, fullPath, dir } of collectColonialBorderLayers(
    datasetRoot
  )) {
    let data: ColonialBorderLayer;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${file}: could not parse JSON`);
      continue;
    }

    const layerId = data.id ?? file;
    const sources = data.sources ?? [];

    if (sources.length === 0) {
      errors.push(
        `CR1: ${layerId}: missing sources[] — at least one Tier 1 or Tier 2 source is required`
      );
    }

    for (const source of sources) {
      const reference =
        typeof source.reference === "string" ? source.reference : "";
      const notes = typeof source.notes === "string" ? source.notes : "";
      const tier = source.tier;

      if (/wikipedia\.org/i.test(reference)) {
        errors.push(
          `CR1: ${layerId}: Wikipedia cited directly as a source (forbidden — Tier 3): "${reference}"`
        );
        continue;
      }

      if (tier !== 1 && tier !== 2) {
        errors.push(
          `CR1: ${layerId}: source with invalid tier "${tier}" — only tier 1 or 2 is allowed`
        );
        continue;
      }

      if (tier === 2 && !/wikipedia/i.test(notes)) {
        errors.push(
          `CR1: ${layerId}: tier 2 source missing the Wikipedia cross-check path in notes`
        );
      }
    }

    if (!data.geometry_file) {
      errors.push(`CR1: ${layerId}: missing geometry_file`);
      continue;
    }

    const geometryPath = path.join(dir, data.geometry_file);
    if (!fs.existsSync(geometryPath)) {
      errors.push(
        `CR1: ${layerId}: geometry_file "${data.geometry_file}" not found`
      );
      continue;
    }

    let geometry: unknown;
    try {
      geometry = JSON.parse(fs.readFileSync(geometryPath, "utf-8"));
    } catch {
      errors.push(
        `CR1: ${layerId}: geometry_file "${data.geometry_file}" is not valid JSON`
      );
      continue;
    }

    const geoJsonErrors = validateGeoJson(geometry);
    for (const geoJsonError of geoJsonErrors) {
      errors.push(`CR1: ${layerId}: invalid GeoJSON — ${geoJsonError}`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * CR2 – Every ISO 3166-1 alpha-3 code referenced in a colonial-border layer's
 * `colonial_powers` must be a known country id (present in
 * `public/pays_demographie.csv`, the `afrik_countries` source of truth).
 */
export function checkColonialBorderCr2(
  datasetRoot: string,
  paysCsvPath: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const layers = collectColonialBorderLayers(datasetRoot);
  if (layers.length === 0) {
    return { ok: true, errors, warnings };
  }

  const iso3166Regex = /^[A-Z]{3}$/;
  const knownCountryIds = new Set(
    loadCSV(paysCsvPath)
      .map((row) => row.id_pays)
      .filter(Boolean)
  );

  for (const { file, fullPath } of layers) {
    let data: ColonialBorderLayer;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${file}: could not parse JSON`);
      continue;
    }

    const layerId = data.id ?? file;
    const colonialPowers = data.colonial_powers ?? [];

    for (const code of colonialPowers) {
      if (typeof code !== "string" || !iso3166Regex.test(code)) {
        errors.push(
          `CR2: ${layerId}: invalid ISO 3166-1 α-3 country code "${code}" (expected 3 uppercase letters)`
        );
        continue;
      }
      if (!knownCountryIds.has(code)) {
        errors.push(
          `CR2: ${layerId}: unknown ISO 3166-1 α-3 country code "${code}" — not found in afrik_countries`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * FR80 – Migration event integrity (Story 12.1).
 *
 * Validates every dataset/source/afrik/migrations/*.json fiche against the
 * strict model public/modele-migration.json: id format/uniqueness,
 * classificationStatus, the open eventType enum (read from the model file —
 * never duplicated here), time-range coherence, Tier 1/2 sourcing, resolvable
 * PPL references, valid GeoJSON geometry, and exact key match with the model.
 */

const MIGRATION_CLASSIFICATION_STATUSES = new Set([
  "consensual",
  "contested",
  "colonial-legacy",
  "reconstructive",
]);

const MGR_ID_REGEX = /^MGR_[A-Z0-9_]+$/;

const MIGRATION_GEOMETRY_BBOX = {
  minLon: -30,
  maxLon: 80,
  minLat: -40,
  maxLat: 40,
};

interface MigrationSource {
  title?: unknown;
  url?: unknown;
  year?: unknown;
  tier?: unknown;
  notes?: unknown;
}

interface MigrationFiche {
  id?: unknown;
  classificationStatus?: unknown;
  eventType?: unknown;
  timeRange?: {
    startYear?: unknown;
    endYear?: unknown;
    datingNote?: unknown;
  };
  geometry?: { type?: unknown; coordinates?: unknown };
  peoplesInvolved?: Array<{ id?: unknown; role?: unknown }>;
  content?: {
    debate?: unknown;
    sources?: MigrationSource[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Return the set of PPL ids declared across dataset/source/afrik/peuples/**. */
function loadPplIds(datasetRoot: string): Set<string> {
  const ids = new Set<string>();
  for (const { fullPath } of collectPplFiles(datasetRoot)) {
    try {
      const data = JSON.parse(fs.readFileSync(fullPath, "utf-8")) as {
        id?: string;
      };
      if (data.id) ids.add(data.id);
    } catch {
      // Parse failures are surfaced by FR27/other checks; stay silent here.
    }
  }
  return ids;
}

function isMigrationPosition(pos: unknown): pos is [number, number] {
  return (
    Array.isArray(pos) &&
    pos.length >= 2 &&
    typeof pos[0] === "number" &&
    typeof pos[1] === "number"
  );
}

function isValidMigrationGeometry(geometry: unknown): geometry is {
  type: string;
  coordinates: unknown;
} {
  if (!geometry || typeof geometry !== "object") return false;
  const { type, coordinates } = geometry as {
    type?: unknown;
    coordinates?: unknown;
  };

  if (type === "LineString") {
    return (
      Array.isArray(coordinates) &&
      coordinates.length >= 2 &&
      coordinates.every(isMigrationPosition)
    );
  }
  if (type === "MultiLineString") {
    return (
      Array.isArray(coordinates) &&
      coordinates.length >= 1 &&
      coordinates.every(
        (line) =>
          Array.isArray(line) &&
          line.length >= 2 &&
          line.every(isMigrationPosition)
      )
    );
  }
  if (type === "Polygon") {
    return (
      Array.isArray(coordinates) &&
      coordinates.length >= 1 &&
      coordinates.every(
        (ring) =>
          Array.isArray(ring) &&
          ring.length >= 4 &&
          ring.every(isMigrationPosition)
      )
    );
  }
  return false;
}

/** Flatten a validated migration geometry's coordinates into a flat position list. */
function collectMigrationPositions(geometry: {
  type: string;
  coordinates: unknown;
}): Array<[number, number]> {
  const { type, coordinates } = geometry;
  if (type === "LineString") return coordinates as Array<[number, number]>;
  if (type === "MultiLineString") {
    return (coordinates as Array<Array<[number, number]>>).flat();
  }
  if (type === "Polygon") {
    return (coordinates as Array<Array<[number, number]>>).flat();
  }
  return [];
}

export function validateMigrationEvents(
  datasetRoot: string,
  modelPath: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const migrationsDir = path.join(datasetRoot, "migrations");
  if (!fs.existsSync(migrationsDir)) {
    return { ok: true, errors: [], warnings: [] };
  }

  if (!fs.existsSync(modelPath)) {
    return {
      ok: false,
      errors: [`Migration model not found at ${modelPath}`],
      warnings: [],
    };
  }

  let model: {
    _meta?: { eventTypeEnum?: unknown };
    content?: Record<string, unknown>;
    [key: string]: unknown;
  };
  try {
    model = JSON.parse(fs.readFileSync(modelPath, "utf-8"));
  } catch {
    return {
      ok: false,
      errors: [`Could not parse migration model at ${modelPath}`],
      warnings: [],
    };
  }

  const eventTypeEnum = new Set(
    Array.isArray(model._meta?.eventTypeEnum) ? model._meta.eventTypeEnum : []
  );
  const modelTopKeys = new Set(Object.keys(model).filter((k) => k !== "_meta"));
  const modelContentKeys = new Set(Object.keys(model.content ?? {}));

  const pplIds = loadPplIds(datasetRoot);
  const currentYear = new Date().getFullYear();
  const seenIds = new Map<string, string>();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    let data: MigrationFiche;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      errors.push(`${file}: could not parse JSON`);
      continue;
    }

    // Key match — no skipped, renamed, or invented sections.
    const ficheTopKeys = new Set(
      Object.keys(data).filter((k) => k !== "_meta")
    );
    const missingTop = [...modelTopKeys].filter((k) => !ficheTopKeys.has(k));
    const extraTop = [...ficheTopKeys].filter((k) => !modelTopKeys.has(k));
    if (missingTop.length || extraTop.length) {
      errors.push(
        `${file}: top-level keys do not match modele-migration.json (missing: ${
          missingTop.join(", ") || "none"
        }; unexpected: ${extraTop.join(", ") || "none"})`
      );
    }
    if (data.content && typeof data.content === "object") {
      const ficheContentKeys = new Set(Object.keys(data.content));
      const missingContent = [...modelContentKeys].filter(
        (k) => !ficheContentKeys.has(k)
      );
      const extraContent = [...ficheContentKeys].filter(
        (k) => !modelContentKeys.has(k)
      );
      if (missingContent.length || extraContent.length) {
        errors.push(
          `${file}: content keys do not match modele-migration.json (missing: ${
            missingContent.join(", ") || "none"
          }; unexpected: ${extraContent.join(", ") || "none"})`
        );
      }
    }

    // id format + uniqueness.
    const id = typeof data.id === "string" ? data.id : undefined;
    if (!id || !MGR_ID_REGEX.test(id)) {
      errors.push(`${file}: id "${data.id}" does not match ^MGR_[A-Z0-9_]+$`);
    } else if (seenIds.has(id)) {
      errors.push(
        `${file}: duplicate migration id "${id}" (first seen in ${seenIds.get(id)})`
      );
    } else {
      seenIds.set(id, file);
    }

    // classificationStatus.
    const classificationStatus =
      typeof data.classificationStatus === "string"
        ? data.classificationStatus
        : undefined;
    if (
      !classificationStatus ||
      !MIGRATION_CLASSIFICATION_STATUSES.has(classificationStatus)
    ) {
      errors.push(
        `${file}: classificationStatus "${data.classificationStatus}" is missing or invalid`
      );
    }

    // eventType — open enum, values read from the model file only.
    const eventType =
      typeof data.eventType === "string" ? data.eventType : undefined;
    if (!eventType || !eventTypeEnum.has(eventType)) {
      errors.push(
        `${file}: eventType "${data.eventType}" is missing or not in the allowed set from modele-migration.json`
      );
    }

    // timeRange coherence.
    const startYear = data.timeRange?.startYear;
    const endYear = data.timeRange?.endYear;
    if (!Number.isInteger(startYear) || !Number.isInteger(endYear)) {
      errors.push(
        `${file}: timeRange.startYear and timeRange.endYear must be integers`
      );
    } else {
      const start = startYear as number;
      const end = endYear as number;
      if (start > end) {
        errors.push(
          `${file}: timeRange.startYear (${start}) is after timeRange.endYear (${end})`
        );
      }
      if (
        start < -10000 ||
        start > currentYear ||
        end < -10000 ||
        end > currentYear
      ) {
        errors.push(
          `${file}: timeRange years must be within [-10000, ${currentYear}]`
        );
      }
    }

    const sources = Array.isArray(data.content?.sources)
      ? (data.content!.sources as MigrationSource[])
      : [];
    const isContested = classificationStatus === "contested";
    const isColonialLegacy = classificationStatus === "colonial-legacy";

    if ((isContested || isColonialLegacy) && sources.length < 2) {
      errors.push(
        `${file}: classificationStatus "${classificationStatus}" requires at least 2 sources`
      );
    }

    if (isContested) {
      const datingNote = data.timeRange?.datingNote;
      if (typeof datingNote !== "string" || !datingNote.trim()) {
        errors.push(
          `${file}: contested events require a non-empty timeRange.datingNote`
        );
      }
      const debate = data.content?.debate;
      if (typeof debate !== "string" || !debate.trim()) {
        errors.push(
          `${file}: contested events require a non-empty content.debate`
        );
      }
    }

    sources.forEach((source, i) => {
      if (source.tier !== 1 && source.tier !== 2) {
        errors.push(
          `${file}: content.sources[${i}] must record tier: 1 or tier: 2`
        );
      } else if (
        source.tier === 2 &&
        (typeof source.notes !== "string" || !source.notes.trim())
      ) {
        errors.push(
          `${file}: content.sources[${i}] is Tier 2 and requires non-empty notes`
        );
      }
    });

    // peoplesInvolved — every id must resolve to an existing PPL fiche.
    const peoplesInvolved = Array.isArray(data.peoplesInvolved)
      ? data.peoplesInvolved
      : [];
    peoplesInvolved.forEach((p, i) => {
      const pplId = typeof p?.id === "string" ? p.id : undefined;
      if (!pplId || !pplIds.has(pplId)) {
        errors.push(
          `${file}: peoplesInvolved[${i}].id "${p?.id}" does not resolve to an existing PPL fiche`
        );
      }
    });

    // geometry — valid GeoJSON; out-of-bbox coordinates are a warning, not an error.
    if (!isValidMigrationGeometry(data.geometry)) {
      errors.push(
        `${file}: geometry is not a valid GeoJSON LineString/MultiLineString/Polygon`
      );
    } else {
      const positions = collectMigrationPositions(data.geometry);
      const outOfBbox = positions.some(
        ([lon, lat]) =>
          lon < MIGRATION_GEOMETRY_BBOX.minLon ||
          lon > MIGRATION_GEOMETRY_BBOX.maxLon ||
          lat < MIGRATION_GEOMETRY_BBOX.minLat ||
          lat > MIGRATION_GEOMETRY_BBOX.maxLat
      );
      if (outOfBbox) {
        warnings.push(
          `${file}: geometry has coordinates outside the Africa + maritime-margin bbox (lon [-30,80], lat [-40,40])`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * CR3-CR5 – Colonial-event validator rules (Epic 13, Story 13.4).
 * Scoped to the four colonization eventTypes (fragmentation, displacement,
 * imposed_name, resistance) among dataset/source/afrik/migrations/*.json.
 */

const COLONIAL_EVENT_TYPES = new Set([
  "fragmentation",
  "displacement",
  "imposed_name",
  "resistance",
]);

/** Every dataset/source/afrik/migrations/*.json fiche, parsed (silently skips unparsable files). */
function collectMigrationFiches(
  datasetRoot: string
): Array<{ file: string; data: MigrationFiche }> {
  const migrationsDir = path.join(datasetRoot, "migrations");
  if (!fs.existsSync(migrationsDir)) return [];

  const results: Array<{ file: string; data: MigrationFiche }> = [];
  for (const file of fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".json"))) {
    try {
      const data = JSON.parse(
        fs.readFileSync(path.join(migrationsDir, file), "utf-8")
      );
      results.push({ file, data });
    } catch {
      // Parse failures are surfaced by FR80; stay silent here.
    }
  }
  return results;
}

/** PPL ids whose dataset/source/afrik/noms/ record has ≥1 entry with a non-empty imposedBy (Epic 8 imposed-name record). */
function loadImposedNamePplIds(datasetRoot: string): Set<string> {
  const ids = new Set<string>();
  for (const { fullPath } of collectNameRecordFiles(datasetRoot)) {
    try {
      const data = JSON.parse(
        fs.readFileSync(fullPath, "utf-8")
      ) as RawNameRecordFile;
      const names = Array.isArray(data.names) ? data.names : [];
      const hasImposedEntry = names.some(
        (n) => typeof n?.imposedBy === "string" && n.imposedBy.trim() !== ""
      );
      if (hasImposedEntry && typeof data.id === "string") {
        ids.add(data.id);
      }
    } catch {
      // Parse failures are surfaced by the name-record checks; stay silent here.
    }
  }
  return ids;
}

/**
 * CR3 – Every imposed_name event must reference, via peoplesInvolved, a PPL
 * id backed by an existing Epic 8 imposed-name record (a
 * dataset/source/afrik/noms/ dossier with ≥1 entry carrying imposedBy).
 * Events with no such record are rejected.
 */
export function checkColonialEventCr3(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const fiches = collectMigrationFiches(datasetRoot);
  if (fiches.length === 0) return { ok: true, errors, warnings };

  const imposedNamePplIds = loadImposedNamePplIds(datasetRoot);

  for (const { file, data } of fiches) {
    if (data.eventType !== "imposed_name") continue;

    const peoplesInvolved = Array.isArray(data.peoplesInvolved)
      ? data.peoplesInvolved
      : [];
    const referencesRecord = peoplesInvolved.some(
      (p) => typeof p?.id === "string" && imposedNamePplIds.has(p.id)
    );

    if (!referencesRecord) {
      const ids = peoplesInvolved.map((p) => p?.id ?? "?").join(", ");
      errors.push(
        `CR3: ${file}: imposed_name event does not reference an existing Epic 8 imposed-name record — none of peoplesInvolved [${ids}] has a dataset/source/afrik/noms/ record with an imposed name entry`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * CR4 – Every colonial event carries ≥1 Tier 1/2 source (Wikipedia forbidden
 * as a direct citation; Tier 2 requires the Wikipedia cross-check path in
 * notes), and ≥2 valid sources when classificationStatus is "contested" or
 * "colonial-legacy".
 */
export function checkColonialEventCr4(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const fiches = collectMigrationFiches(datasetRoot);
  if (fiches.length === 0) return { ok: true, errors, warnings };

  for (const { file, data } of fiches) {
    const eventType = typeof data.eventType === "string" ? data.eventType : "";
    if (!COLONIAL_EVENT_TYPES.has(eventType)) continue;

    const sources = Array.isArray(data.content?.sources)
      ? (data.content!.sources as MigrationSource[])
      : [];
    const classificationStatus =
      typeof data.classificationStatus === "string"
        ? data.classificationStatus
        : undefined;

    const validSources = sources.filter((s) => s.tier === 1 || s.tier === 2);
    if (validSources.length === 0) {
      errors.push(
        `CR4: ${file}: no source with tier 1 or tier 2 — at least one Tier 1/2 source is required`
      );
    }

    sources.forEach((source, i) => {
      const url = typeof source.url === "string" ? source.url : "";
      if (/wikipedia\.org/i.test(url)) {
        errors.push(
          `CR4: ${file}: content.sources[${i}] cites Wikipedia directly (forbidden — Tier 3): "${url}"`
        );
        return;
      }
      if (source.tier !== 1 && source.tier !== 2) {
        errors.push(
          `CR4: ${file}: content.sources[${i}] must record tier: 1 or tier: 2`
        );
        return;
      }
      const notes = typeof source.notes === "string" ? source.notes : "";
      if (source.tier === 2 && !/wikipedia/i.test(notes)) {
        errors.push(
          `CR4: ${file}: content.sources[${i}] is Tier 2 and requires the Wikipedia cross-check path in notes`
        );
      }
    });

    const requiresTwoSources =
      classificationStatus === "contested" ||
      classificationStatus === "colonial-legacy";
    if (requiresTwoSources && validSources.length < 2) {
      errors.push(
        `CR4: ${file}: classificationStatus "${classificationStatus}" requires at least 2 Tier 1/2 sources (found ${validSources.length})`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * CR5 – Every colonial event carries a date/date-range (timeRange years or a
 * non-empty datingNote), a valid geometry, ≥1 peoplesInvolved entry resolving
 * to an existing PPL fiche, and a valid classificationStatus. Does not fail
 * merely because a given colonial eventType has zero fiches (FR87 empty state).
 */
export function checkColonialEventCr5(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const fiches = collectMigrationFiches(datasetRoot);
  if (fiches.length === 0) return { ok: true, errors, warnings };

  const pplIds = loadPplIds(datasetRoot);

  for (const { file, data } of fiches) {
    const eventType = typeof data.eventType === "string" ? data.eventType : "";
    if (!COLONIAL_EVENT_TYPES.has(eventType)) continue;

    const startYear = data.timeRange?.startYear;
    const endYear = data.timeRange?.endYear;
    const datingNote = data.timeRange?.datingNote;
    const hasYears = Number.isInteger(startYear) && Number.isInteger(endYear);
    const hasDatingNote =
      typeof datingNote === "string" && datingNote.trim() !== "";
    if (!hasYears && !hasDatingNote) {
      errors.push(
        `CR5: ${file}: missing timeRange — startYear/endYear (integers) or a non-empty datingNote is required`
      );
    }

    if (!isValidMigrationGeometry(data.geometry)) {
      errors.push(`CR5: ${file}: missing or invalid geometry/location`);
    }

    const peoplesInvolved = Array.isArray(data.peoplesInvolved)
      ? data.peoplesInvolved
      : [];
    if (peoplesInvolved.length === 0) {
      errors.push(
        `CR5: ${file}: peoplesInvolved is empty — at least one linked entity is required`
      );
    } else {
      peoplesInvolved.forEach((p, i) => {
        const pplId = typeof p?.id === "string" ? p.id : undefined;
        if (!pplId || !pplIds.has(pplId)) {
          errors.push(
            `CR5: ${file}: peoplesInvolved[${i}].id "${p?.id}" does not resolve to an existing PPL fiche`
          );
        }
      });
    }

    const classificationStatus =
      typeof data.classificationStatus === "string"
        ? data.classificationStatus
        : undefined;
    if (
      !classificationStatus ||
      !MIGRATION_CLASSIFICATION_STATUSES.has(classificationStatus)
    ) {
      errors.push(`CR5: ${file}: classificationStatus is missing or invalid`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Orphan fiches – PPL files whose parent folder doesn't exist as a FLG JSON.
 * (Complements FR26 from the PPL perspective.)
 */
export function checkOrphanFiches(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const flgIds = loadFlgIds(datasetRoot);

  for (const { flgFolder, file, fullPath } of collectPplFiles(datasetRoot)) {
    if (!flgIds.has(flgFolder)) {
      errors.push(
        `${file}: orphan PPL file – parent folder "${flgFolder}" has no matching FLG JSON (${fullPath})`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * REL-1..REL-7 – Relation validator (Epic 11, Story 11.3, FR73/FR74/FR32).
 * Validates dataset/source/afrik/relations/*.json against public/modele-relation.json.
 */

interface RawRelationSource {
  title?: unknown;
  author?: unknown;
  year?: unknown;
  url?: unknown;
  tier?: unknown;
  notes?: unknown;
}

interface RawRelationFile {
  id?: unknown;
  relationType?: unknown;
  peopleIdA?: unknown;
  peopleIdB?: unknown;
  period?: { startYear?: unknown; endYear?: unknown };
  sources?: RawRelationSource[];
}

/** List every dataset/source/afrik/relations/*.json file path. Empty when the dir is absent. */
function collectRelationFiles(
  datasetRoot: string
): Array<{ file: string; fullPath: string }> {
  const relationsDir = path.join(datasetRoot, "relations");
  if (!fs.existsSync(relationsDir)) return [];
  return fs
    .readdirSync(relationsDir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => ({ file, fullPath: path.join(relationsDir, file) }));
}

/** Map a zod issue path (from relationSchema) to the REL rule id it corresponds to. */
function relationIssueRuleId(issuePath: string): string {
  if (issuePath === "id") return "REL-1";
  if (issuePath === "relationType" || issuePath === "peopleIdB") return "REL-3";
  if (issuePath.startsWith("period")) return "REL-4";
  if (issuePath === "description") return "REL-7";
  return "REL-MODEL";
}

/**
 * REL-1 (id format), REL-3 (peopleIdA≠peopleIdB, relationType enum),
 * REL-4 (period.startYear≤endYear), REL-7 (description non-empty,
 * sources[].url present + well-formed). Reuses the 11.1 parser
 * (relationSchema via parseRelationFile) rather than reimplementing it.
 */
export function checkRelationModel(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const { file, fullPath } of collectRelationFiles(datasetRoot)) {
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      errors.push(`${file}: could not parse JSON`);
      continue;
    }

    const parsed = parseRelationFile(raw);
    if (!parsed.success) {
      for (const issue of parsed.errors ?? []) {
        errors.push(
          `${relationIssueRuleId(issue.path)}: ${file}: ${issue.path} — ${issue.message}`
        );
      }
      continue;
    }

    parsed.data!.sources.forEach((source, i) => {
      try {
        new URL(source.url);
      } catch {
        errors.push(
          `REL-7: ${file}: sources[${i}].url is not a well-formed URL: "${source.url}"`
        );
      }
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * REL-2 – peopleIdA and peopleIdB must each resolve to an existing PPL fiche.
 */
export function checkRelationReferences(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const files = collectRelationFiles(datasetRoot);
  if (files.length === 0) return { ok: true, errors, warnings };

  const pplIds = loadPplIds(datasetRoot);

  for (const { file, fullPath } of files) {
    let data: RawRelationFile;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${file}: could not parse JSON`);
      continue;
    }

    const a = typeof data.peopleIdA === "string" ? data.peopleIdA : undefined;
    const b = typeof data.peopleIdB === "string" ? data.peopleIdB : undefined;

    if (!a || !pplIds.has(a)) {
      errors.push(
        `REL-2: ${file}: peopleIdA "${data.peopleIdA}" does not resolve to an existing PPL fiche`
      );
    }
    if (!b || !pplIds.has(b)) {
      errors.push(
        `REL-2: ${file}: peopleIdB "${data.peopleIdB}" does not resolve to an existing PPL fiche`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * REL-5 – At least one Tier 1|2 source; every Tier 2 source records a
 * non-empty Wikipedia cross-check note.
 */
export function checkRelationSources(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const { file, fullPath } of collectRelationFiles(datasetRoot)) {
    let data: RawRelationFile;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${file}: could not parse JSON`);
      continue;
    }

    const sources = Array.isArray(data.sources) ? data.sources : [];
    const hasValidTierSource = sources.some(
      (s) => s?.tier === 1 || s?.tier === 2
    );
    if (!hasValidTierSource) {
      errors.push(
        `REL-5: ${file}: no source with tier 1 or tier 2 — at least one Tier 1/2 source is required`
      );
    }

    sources.forEach((source, i) => {
      if (
        source?.tier === 2 &&
        (typeof source.notes !== "string" || !source.notes.trim())
      ) {
        errors.push(
          `REL-5: ${file}: sources[${i}] is Tier 2 and requires a non-empty Wikipedia cross-check note in "notes"`
        );
      }
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** True when two periods (null = open-ended) overlap. */
function relationPeriodsOverlap(
  aStart: number | null,
  aEnd: number | null,
  bStart: number | null,
  bEnd: number | null
): boolean {
  const s1 = aStart ?? -Infinity;
  const e1 = aEnd ?? Infinity;
  const s2 = bStart ?? -Infinity;
  const e2 = bEnd ?? Infinity;
  return s1 <= e2 && s2 <= e1;
}

/** Unordered pair key for {peopleIdA, peopleIdB}. */
function relationPairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

/**
 * REL-1 (HARD) – relation ids must be unique across the corpus.
 * REL-6 (SOFT) – same unordered people pair + same relationType + overlapping
 * period across two files is a duplicate-suspect warning (never an error).
 */
export function checkRelationDuplicates(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  interface RelationRecordForDuplicates {
    file: string;
    peopleIdA?: string;
    peopleIdB?: string;
    relationType?: string;
    startYear: number | null;
    endYear: number | null;
  }

  const seenIds = new Map<string, string>();
  const records: RelationRecordForDuplicates[] = [];

  for (const { file, fullPath } of collectRelationFiles(datasetRoot)) {
    let data: RawRelationFile;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${file}: could not parse JSON`);
      continue;
    }

    const id = typeof data.id === "string" ? data.id : undefined;
    if (id) {
      if (seenIds.has(id)) {
        errors.push(
          `REL-1: duplicate relation id "${id}" in ${file} (first seen in ${seenIds.get(id)})`
        );
      } else {
        seenIds.set(id, file);
      }
    }

    records.push({
      file,
      peopleIdA:
        typeof data.peopleIdA === "string" ? data.peopleIdA : undefined,
      peopleIdB:
        typeof data.peopleIdB === "string" ? data.peopleIdB : undefined,
      relationType:
        typeof data.relationType === "string" ? data.relationType : undefined,
      startYear:
        typeof data.period?.startYear === "number"
          ? data.period.startYear
          : null,
      endYear:
        typeof data.period?.endYear === "number" ? data.period.endYear : null,
    });
  }

  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const r1 = records[i];
      const r2 = records[j];
      if (!r1.peopleIdA || !r1.peopleIdB || !r2.peopleIdA || !r2.peopleIdB)
        continue;
      if (!r1.relationType || r1.relationType !== r2.relationType) continue;
      if (
        relationPairKey(r1.peopleIdA, r1.peopleIdB) !==
        relationPairKey(r2.peopleIdA, r2.peopleIdB)
      )
        continue;
      if (
        relationPeriodsOverlap(
          r1.startYear,
          r1.endYear,
          r2.startYear,
          r2.endYear
        )
      ) {
        warnings.push(
          `REL-6: ${r1.file} and ${r2.file} share the same people pair, relationType "${r1.relationType}", and overlapping periods — possible duplicate`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * FR53-FR57 – Name-record validator (Epic 8, Story 8.3).
 * Validates dataset/source/afrik/noms/*.json against public/modele-nom.json.
 */

interface RawNameRecordSource {
  title?: unknown;
  author?: unknown;
  year?: unknown;
  url?: unknown;
  tier?: unknown;
  notes?: unknown;
}

interface RawNameRecordEntry {
  nameText?: unknown;
  nameType?: unknown;
  languageOfOrigin?: unknown;
  meaning?: unknown;
  imposedBy?: unknown;
  whyProblematic?: unknown;
  sources?: RawNameRecordSource[];
}

interface RawNameRecordFile {
  id?: unknown;
  entityType?: unknown;
  names?: RawNameRecordEntry[];
}

/** List every dataset/source/afrik/noms/*.json file path. Empty when the dir is absent. */
function collectNameRecordFiles(
  datasetRoot: string
): Array<{ file: string; fullPath: string }> {
  const nomsDir = path.join(datasetRoot, "noms");
  if (!fs.existsSync(nomsDir)) return [];
  return fs
    .readdirSync(nomsDir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => ({ file, fullPath: path.join(nomsDir, file) }));
}

/** Map a zod issue path (from nameRecordDossierSchema) to the FR-name rule id it corresponds to. */
function nameRecordIssueRuleId(issuePath: string): string {
  if (issuePath.includes("languageOfOrigin")) return "FR55-iso";
  if (issuePath.includes("whyProblematic")) return "FR56-imposed";
  return "NAME-MODEL";
}

/**
 * FR55-iso (languageOfOrigin, when present, must be a valid ISO 639-3 code)
 * and FR56-imposed (imposedBy set ⇒ whyProblematic non-empty) — reuses the
 * 8.2 parser (parseNameRecordFile) rather than reimplementing its schema.
 */
export function checkNameRecordModel(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const { file, fullPath } of collectNameRecordFiles(datasetRoot)) {
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      errors.push(`${file}: could not parse JSON`);
      continue;
    }

    const parsed = parseNameRecordFile(raw);
    if (!parsed.success) {
      for (const issue of parsed.errors ?? []) {
        errors.push(
          `${nameRecordIssueRuleId(issue.path)}: ${file}: ${issue.path} — ${issue.message}`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * FR57-source – every name record cites ≥1 source with tier 1 or 2; every
 * Tier 2 source records a non-empty Wikipedia cross-check note in "notes"
 * (auditable chain required).
 */
export function checkNameRecordSources(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const { file, fullPath } of collectNameRecordFiles(datasetRoot)) {
    let data: RawNameRecordFile;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${file}: could not parse JSON`);
      continue;
    }

    const names = Array.isArray(data.names) ? data.names : [];
    names.forEach((entry, i) => {
      const sources = Array.isArray(entry?.sources) ? entry.sources : [];
      const hasValidTierSource = sources.some(
        (s) => s?.tier === 1 || s?.tier === 2
      );
      if (!hasValidTierSource) {
        errors.push(
          `FR57-source: ${file}: names[${i}] has no source with tier 1 or tier 2 — at least one Tier 1/2 source is required`
        );
      }

      sources.forEach((source, j) => {
        if (
          source?.tier === 2 &&
          (typeof source.notes !== "string" || !source.notes.trim())
        ) {
          errors.push(
            `FR57-source: ${file}: names[${i}].sources[${j}] is Tier 2 and requires a non-empty Wikipedia cross-check note in "notes"`
          );
        }
      });
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * FR54-endonym – every people covered by the atlas dataset has ≥1 endonym
 * record (AR33 echo).
 */
export function checkNameRecordEndonymCoverage(
  datasetRoot: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const { file, fullPath } of collectNameRecordFiles(datasetRoot)) {
    let data: RawNameRecordFile;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${file}: could not parse JSON`);
      continue;
    }

    const names = Array.isArray(data.names) ? data.names : [];
    const hasEndonym = names.some((entry) => entry?.nameType === "endonym");
    if (!hasEndonym) {
      errors.push(
        `FR54-endonym: ${file}: people "${data.id}" has no endonym record — every people covered by the atlas must have ≥1 endonym`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * FR53-ref – peopleId (dossier id) must resolve to an existing PPL fiche
 * under dataset/source/afrik/peuples/** (no orphan name files).
 */
export function checkNameRecordReferences(
  datasetRoot: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const files = collectNameRecordFiles(datasetRoot);
  if (files.length === 0) return { ok: true, errors, warnings };

  const pplIds = loadPplIds(datasetRoot);

  for (const { file, fullPath } of files) {
    let data: RawNameRecordFile;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${file}: could not parse JSON`);
      continue;
    }

    const id = typeof data.id === "string" ? data.id : undefined;
    if (!id || !pplIds.has(id)) {
      errors.push(
        `FR53-ref: ${file}: peopleId "${data.id}" does not resolve to an existing PPL fiche`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * FR55-surname – a surname record must document its basis: non-empty
 * "meaning", or an explicit connection statement in the sources[].notes of
 * at least one source (Story 8.11 — a bare name-to-people pairing with no
 * documented basis is invalid; source it or drop it).
 */
export function checkNameRecordSurnameConnection(
  datasetRoot: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const { file, fullPath } of collectNameRecordFiles(datasetRoot)) {
    let data: RawNameRecordFile;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${file}: could not parse JSON`);
      continue;
    }

    const names = Array.isArray(data.names) ? data.names : [];
    names.forEach((entry, i) => {
      if (entry?.nameType !== "surname") return;

      const hasMeaning =
        typeof entry.meaning === "string" && entry.meaning.trim() !== "";
      const sources = Array.isArray(entry?.sources) ? entry.sources : [];
      const hasConnectionStatement = sources.some(
        (s) => typeof s?.notes === "string" && s.notes.trim() !== ""
      );

      if (!hasMeaning && !hasConnectionStatement) {
        errors.push(
          `FR55-surname: ${file}: names[${i}] is a surname record with no documented basis — "meaning" or an explicit connection statement in sources[].notes is required`
        );
      }
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * FR53-dup – no duplicate (peopleId, nameText, nameType) across the dataset.
 */
export function checkNameRecordDuplicates(
  datasetRoot: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const seen = new Map<string, string>();

  for (const { file, fullPath } of collectNameRecordFiles(datasetRoot)) {
    let data: RawNameRecordFile;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      warnings.push(`${file}: could not parse JSON`);
      continue;
    }

    const peopleId = typeof data.id === "string" ? data.id : "";
    const names = Array.isArray(data.names) ? data.names : [];

    for (const entry of names) {
      const nameText =
        typeof entry?.nameText === "string" ? entry.nameText : "";
      const nameType =
        typeof entry?.nameType === "string" ? entry.nameType : "";
      const key = `${peopleId}|${nameText}|${nameType}`;

      if (seen.has(key)) {
        errors.push(
          `FR53-dup: ${file}: duplicate name record (peopleId="${peopleId}", nameText="${nameText}", nameType="${nameType}") also declared in ${seen.get(key)}`
        );
      } else {
        seen.set(key, file);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

// ─── Run summary ─────────────────────────────────────────────────────────────

/**
 * Checks whose findings are reported without failing the build.
 *
 * FR52-coverage stays advisory while the people-to-language linkage backlog is
 * burned down (FLG_NIGERCONGO 0/179 linked). FR28 and FR28-strict left this set
 * once every country's percentageInCountry split landed inside [99, 101]:
 * softening a check is a deliberate, visible decision, not a flag buried in a
 * registration.
 */
export const SOFT_CHECK_NAMES: ReadonlySet<string> = new Set([
  "FR52-coverage People-to-language coverage",
]);

export interface IntegrityCheck {
  name: string;
  result: ValidationResult;
}

export interface ValidationReportEntry {
  kind: "legacy" | "integrity";
  name: string;
  ok: boolean;
  soft: boolean;
  errors: string[];
  warnings: string[];
  details?: string[];
}

export interface ValidationSummary {
  checksRun: number;
  checksPassed: number;
  warningCount: number;
  errorCount: number;
  failed: boolean;
  checks: ValidationReportEntry[];
}

/**
 * Folds the legacy per-category results and the FR26–FR52 integrity checks into
 * one entry list, then counts it.
 *
 * The two families report in different shapes and the summary used to count
 * only the first, so a run executing 34 integrity checks and emitting thousands
 * of warnings still printed "Succès: 6 · Avertissements: 0" and persisted only
 * the legacy six — an operator reading either saw a clean corpus.
 *
 * A soft check's findings are counted as warnings and never fail the run; an
 * enforced check's findings are errors and do.
 */
export function summarizeValidationRun(
  legacyResults: LegacyValidationResult[],
  integrityChecks: IntegrityCheck[]
): ValidationSummary {
  const checks: ValidationReportEntry[] = [];

  for (const result of legacyResults) {
    checks.push({
      kind: "legacy",
      name: result.category,
      ok: result.status === "success",
      soft: false,
      errors: result.status === "error" ? [result.message] : [],
      warnings: result.status === "warning" ? [result.message] : [],
      details: result.details,
    });
  }

  for (const { name, result } of integrityChecks) {
    const soft = SOFT_CHECK_NAMES.has(name);
    checks.push({
      kind: "integrity",
      name,
      ok: result.ok,
      soft,
      errors: soft ? [] : result.errors,
      warnings: soft ? [...result.warnings, ...result.errors] : result.warnings,
    });
  }

  return {
    checksRun: checks.length,
    checksPassed: checks.filter((c) => c.ok).length,
    warningCount: checks.reduce((n, c) => n + c.warnings.length, 0),
    errorCount: checks.reduce((n, c) => n + c.errors.length, 0),
    failed: checks.some((c) => !c.ok && !c.soft),
    checks,
  };
}

// ─── main() ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 Validation des données AFRIK - Étape 6\n");
  console.log("=".repeat(60));

  const allLegacyResults: LegacyValidationResult[] = [];

  // Exécuter toutes les validations legacy
  console.log("\n1️⃣ Validation des IDs cohérents...");
  allLegacyResults.push(...validateIDs());

  console.log("2️⃣ Validation Langue → famille linguistique...");
  allLegacyResults.push(...validateLanguageFamily());

  console.log("3️⃣ Validation Peuple → pays...");
  allLegacyResults.push(...validatePeuplePays());

  console.log("4️⃣ Validation termes coloniaux contextualisés...");
  allLegacyResults.push(...validateColonialTerms());

  console.log("5️⃣ Validation sections TXT complètes...");
  allLegacyResults.push(...validateCompleteSections());

  console.log("6️⃣ Validation origines et appellations enrichies...");
  allLegacyResults.push(...validateEnrichedOrigins());

  // Afficher les résultats legacy
  console.log("\n" + "=".repeat(60));
  console.log("\n📊 RÉSULTATS DE LA VALIDATION\n");

  for (const result of allLegacyResults) {
    const icon =
      result.status === "success"
        ? "✅"
        : result.status === "warning"
          ? "⚠️"
          : "❌";
    console.log(`${icon} ${result.category}: ${result.message}`);

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

  // ── New integrity checks (FR26-FR52) ──────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("\n🔬 INTEGRITY CHECKS (FR26-FR52)\n");

  const datasetRoot = AFRIK_ROOT;
  // Which of these are advisory is declared once, in SOFT_CHECK_NAMES.
  const newChecks: IntegrityCheck[] = [];

  console.log("FR26 – FLG folder match...");
  newChecks.push({
    name: "FR26 FLG folder match",
    result: checkFlgFolderMatch(datasetRoot),
  });

  console.log("FR27 – PPL duplicates...");
  newChecks.push({
    name: "FR27 PPL duplicates",
    result: checkPplDuplicates(datasetRoot),
  });

  console.log("FR28 – Population sums...");
  newChecks.push({
    name: "FR28 Population sums",
    result: checkPopulationSums(datasetRoot),
  });

  console.log("FR28-strict – Population sums (target 99–101%)...");
  newChecks.push({
    name: "FR28-strict Population sums (target 99–101%)",
    result: checkPopulationSumsStrict(datasetRoot),
  });

  console.log("FR29 – ISO validity...");
  newChecks.push({
    name: "FR29 ISO validity",
    result: checkIsoValidity(datasetRoot),
  });

  console.log(
    "FR90 – Family structural completeness (branches + distribution)..."
  );
  newChecks.push({
    name: "FR90 Family structural completeness",
    result: checkFamilyStructuralCompleteness(datasetRoot),
  });

  console.log("Source catalogue tiers...");
  newChecks.push({
    name: "Source catalogue tiers",
    result: checkAuthorizedSourceTiers(datasetRoot),
  });

  console.log("FR52 – Classification-tree integrity...");
  newChecks.push({
    name: "FR52 Classification-tree integrity",
    result: checkTreeIntegrity(datasetRoot),
  });

  console.log("FR52-coverage – People-to-language coverage...");
  newChecks.push({
    name: "FR52-coverage People-to-language coverage",
    result: checkTreeCoverage(datasetRoot),
  });

  console.log("FR32 – population/percentageInCountry drift...");
  newChecks.push({
    name: "FR32 population/percentageInCountry drift",
    result: checkPopulationPercentageDrift(
      datasetRoot,
      path.join(PUBLIC_ROOT, "pays_demographie.csv")
    ),
  });

  console.log("FR33 – nameFr distinct from nameOfficial...");
  newChecks.push({
    name: "FR33 nameFr distinct from nameOfficial",
    result: checkCountryNameFrDistinctFromOfficial(datasetRoot),
  });

  console.log("Orphan fiches...");
  newChecks.push({
    name: "Orphan fiches",
    result: checkOrphanFiches(datasetRoot),
  });

  console.log("FR80 – Migration events...");
  newChecks.push({
    name: "FR80 Migration events",
    result: validateMigrationEvents(
      datasetRoot,
      path.join(PUBLIC_ROOT, "modele-migration.json")
    ),
  });

  console.log("CR1 – Colonial-border source tier + GeoJSON validity...");
  newChecks.push({
    name: "CR1 Colonial-border source tier + GeoJSON validity",
    result: checkColonialBorderCr1(datasetRoot),
  });

  console.log("CR2 – Colonial-border ISO validity...");
  newChecks.push({
    name: "CR2 Colonial-border ISO validity",
    result: checkColonialBorderCr2(
      datasetRoot,
      path.join(PUBLIC_ROOT, "pays_demographie.csv")
    ),
  });

  console.log("CR3 – Colonial-event imposed_name → Epic 8 name record...");
  newChecks.push({
    name: "CR3 Colonial-event imposed_name reference",
    result: checkColonialEventCr3(datasetRoot),
  });

  console.log("CR4 – Colonial-event Tier 1/2 source gate...");
  newChecks.push({
    name: "CR4 Colonial-event source gate",
    result: checkColonialEventCr4(datasetRoot),
  });

  console.log("CR5 – Colonial-event structural completeness...");
  newChecks.push({
    name: "CR5 Colonial-event structural completeness",
    result: checkColonialEventCr5(datasetRoot),
  });

  console.log("REL-1/3/4/7 – Relation model...");
  newChecks.push({
    name: "REL-1/3/4/7 Relation model",
    result: checkRelationModel(datasetRoot),
  });

  console.log("REL-2 – Relation PPL references...");
  newChecks.push({
    name: "REL-2 Relation PPL references",
    result: checkRelationReferences(datasetRoot),
  });

  console.log("REL-5 – Relation sources...");
  newChecks.push({
    name: "REL-5 Relation sources",
    result: checkRelationSources(datasetRoot),
  });

  console.log("REL-1/REL-6 – Relation duplicates + overlap...");
  newChecks.push({
    name: "REL-1/REL-6 Relation duplicates",
    result: checkRelationDuplicates(datasetRoot),
  });

  console.log(
    "FR55-iso/FR56-imposed – Name record model (ISO validity + imposed contextualization)..."
  );
  newChecks.push({
    name: "FR55-iso/FR56-imposed Name record model",
    result: checkNameRecordModel(datasetRoot),
  });

  console.log(
    "FR57-source – Name record sources (Tier 1/2 + Wikipedia cross-check)..."
  );
  newChecks.push({
    name: "FR57-source Name record sources",
    result: checkNameRecordSources(datasetRoot),
  });

  console.log("FR54-endonym – Name record endonym coverage...");
  newChecks.push({
    name: "FR54-endonym Name record endonym coverage",
    result: checkNameRecordEndonymCoverage(datasetRoot),
  });

  console.log("FR53-ref – Name record peopleId references...");
  newChecks.push({
    name: "FR53-ref Name record peopleId references",
    result: checkNameRecordReferences(datasetRoot),
  });

  console.log("FR53-dup – Name record duplicates...");
  newChecks.push({
    name: "FR53-dup Name record duplicates",
    result: checkNameRecordDuplicates(datasetRoot),
  });

  console.log("FR55-surname – Surname record documented basis...");
  newChecks.push({
    name: "FR55-surname Name record surname connection",
    result: checkNameRecordSurnameConnection(datasetRoot),
  });

  if (process.env.CHECK_SOURCE_URLS === "true") {
    console.log("FR30/31 – Source URL check (nightly)...");
    newChecks.push({
      name: "FR30/31 Source URLs",
      result: await checkSourceUrls(datasetRoot),
    });
  }

  const summary = summarizeValidationRun(allLegacyResults, newChecks);

  for (const check of summary.checks) {
    if (check.kind !== "integrity") continue;
    const icon = check.ok ? "✅" : check.soft ? "⚠️ " : "❌";
    console.log(
      `${icon} ${check.name}${!check.ok && check.soft ? " (soft)" : ""}`
    );
    check.errors.forEach((e) => console.log(`   ❌ ${e}`));
    check.warnings.forEach((w) => console.log(`   ⚠️  ${w}`));
  }

  console.log("\n" + "=".repeat(60));
  console.log(`\n📈 RÉSUMÉ:`);
  console.log(
    `   ✅ Succès: ${summary.checksPassed}/${summary.checksRun} contrôles`
  );
  console.log(`   ⚠️  Avertissements: ${summary.warningCount}`);
  console.log(`   ❌ Erreurs: ${summary.errorCount}`);

  // Générer un rapport JSON
  const reportPath = path.join(
    __dirname,
    "../dataset/source/afrik/logs/validation_report.json"
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(`\n📄 Rapport détaillé sauvegardé: ${reportPath}`);

  // Mettre à jour le workflow_status.csv (si présent)
  const workflowStatusPath = path.join(PUBLIC_ROOT, "workflow_status.csv");
  if (fs.existsSync(workflowStatusPath)) {
    const workflowContent = fs.readFileSync(workflowStatusPath, "utf-8");
    const updatedContent = workflowContent.replace(
      /validation,pending/g,
      `validation,${summary.errorCount === 0 ? "done" : "in_progress"}`
    );
    fs.writeFileSync(workflowStatusPath, updatedContent);
    console.log("✅ workflow_status.csv mis à jour");
  }

  process.exit(summary.failed ? 1 : 0);
}

// ESM-compatible direct invocation guard: true when run via tsx/node, false when imported by tests
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
