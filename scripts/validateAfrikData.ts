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

// ─── Exported ValidationResult (FR26-FR31) ───────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

// Legacy internal result shape (used by existing validation functions only)
interface LegacyValidationResult {
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
 * FR26 – Every subdirectory in peuples/ must correspond to an existing FLG JSON file.
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
    .filter((d) => d.isDirectory())
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
 * FR29 – ISO code validity:
 *   - content.languages.isoCodes entries must match /^[a-z]{3}$/ (ISO 639-3)
 *   - content.demography.distributionByCountry[].country must match /^[A-Z]{3}$/ (ISO 3166-1 α-3)
 */
export function checkIsoValidity(datasetRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const iso639Regex = /^[a-z]{3}$/;
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
      if (typeof code !== "string" || !iso639Regex.test(code)) {
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

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalSuccess = 0;

  for (const result of allLegacyResults) {
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

  // ── New integrity checks (FR26-FR31) ──────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("\n🔬 INTEGRITY CHECKS (FR26-FR31)\n");

  const datasetRoot = AFRIK_ROOT;
  // `soft: true` checks log their findings but do not fail the build. Used for
  // FR28 demographics while issue #105 (re-sourcing 30 countries' splits) is
  // open — flip back to enforced once #105 lands.
  const newChecks: Array<{
    name: string;
    result: ValidationResult;
    soft?: boolean;
  }> = [];

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
    soft: true,
  });

  console.log("FR29 – ISO validity...");
  newChecks.push({
    name: "FR29 ISO validity",
    result: checkIsoValidity(datasetRoot),
  });

  console.log("Orphan fiches...");
  newChecks.push({
    name: "Orphan fiches",
    result: checkOrphanFiches(datasetRoot),
  });

  if (process.env.CHECK_SOURCE_URLS === "true") {
    console.log("FR30/31 – Source URL check (nightly)...");
    newChecks.push({
      name: "FR30/31 Source URLs",
      result: await checkSourceUrls(datasetRoot),
    });
  }

  let newCheckFailed = false;
  for (const { name, result, soft } of newChecks) {
    const icon = result.ok ? "✅" : soft ? "⚠️ " : "❌";
    console.log(`${icon} ${name}${!result.ok && soft ? " (soft)" : ""}`);
    if (!result.ok) {
      if (!soft) {
        newCheckFailed = true;
      }
      const itemIcon = soft ? "⚠️ " : "❌";
      result.errors.forEach((e) => console.log(`   ${itemIcon} ${e}`));
    }
    result.warnings.forEach((w) => console.log(`   ⚠️  ${w}`));
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
  fs.writeFileSync(reportPath, JSON.stringify(allLegacyResults, null, 2));
  console.log(`\n📄 Rapport détaillé sauvegardé: ${reportPath}`);

  // Mettre à jour le workflow_status.csv (si présent)
  const workflowStatusPath = path.join(PUBLIC_ROOT, "workflow_status.csv");
  if (fs.existsSync(workflowStatusPath)) {
    const workflowContent = fs.readFileSync(workflowStatusPath, "utf-8");
    const updatedContent = workflowContent.replace(
      /validation,pending/g,
      `validation,${totalErrors === 0 ? "done" : "in_progress"}`
    );
    fs.writeFileSync(workflowStatusPath, updatedContent);
    console.log("✅ workflow_status.csv mis à jour");
  }

  process.exit(totalErrors > 0 || newCheckFailed ? 1 : 0);
}

// ESM-compatible direct invocation guard: true when run via tsx/node, false when imported by tests
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
