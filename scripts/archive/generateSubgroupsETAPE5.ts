#!/usr/bin/env tsx
/**
 * Script de génération pour l'ÉTAPE 5 - Sous-ethnies et Clans AFRIK
 * Génère les fichiers SUB_*.txt et CLN_*.txt à partir de l'analyse
 */

import * as fs from "fs";
import * as path from "path";
import { SubgroupEntry } from "./analyzeSubgroupsETAPE5";

interface EthnieInfo {
  id: string;
  nom: string;
  peupleId: string;
  familleLinguistique: string;
  langue?: string;
  codeISO?: string;
}

function slugify(text: string): string {
  return text
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function findEthnieInfo(
  ethnieName: string,
  peupleId: string
): EthnieInfo | null {
  // Chercher le fichier ETH_*.txt correspondant
  const ethniesDir = path.join(__dirname, "../dataset/source/afrik/ethnies");
  const peupleDir = path.join(ethniesDir, `PPL_${peupleId}`);

  if (!fs.existsSync(peupleDir)) {
    return null;
  }

  // Lister les fichiers ETH_*.txt dans le dossier du peuple
  const files = fs
    .readdirSync(peupleDir)
    .filter((f) => f.startsWith("ETH_") && f.endsWith(".txt"));

  // Essayer de trouver un fichier qui correspond au nom de l'ethnie
  const ethnieSlug = slugify(ethnieName);
  for (const file of files) {
    const fileSlug = file.replace("ETH_", "").replace(".txt", "");
    if (fileSlug.includes(ethnieSlug) || ethnieSlug.includes(fileSlug)) {
      // Lire le fichier pour extraire les infos
      const filePath = path.join(peupleDir, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // Extraire les informations de base
      const nomMatch = content.match(/- Nom principal :\s*(.+)/);
      const peupleMatch = content.match(/- Identifiant peuple \(ID\) :\s*(.+)/);
      const flgMatch = content.match(
        /- Identifiant famille linguistique \(FLG\) :\s*(.+)/
      );
      const langueMatch = content.match(/- Langue parlée :\s*(.+)/);
      const codeMatch = content.match(/- Code ISO 639-3 :\s*(.+)/);

      return {
        id: file.replace(".txt", ""),
        nom: nomMatch ? nomMatch[1].trim() : ethnieName,
        peupleId: peupleMatch ? peupleMatch[1].trim() : peupleId,
        familleLinguistique: flgMatch ? flgMatch[1].trim() : "",
        langue: langueMatch ? langueMatch[1].trim() : undefined,
        codeISO: codeMatch ? codeMatch[1].trim() : undefined,
      };
    }
  }

  return null;
}

function generateSubEthnieFile(
  entry: SubgroupEntry,
  ethnieInfo: EthnieInfo | null
): string {
  const modelePath = path.join(__dirname, "../public/modele-sous-ethnie.txt");
  const modele = fs.readFileSync(modelePath, "utf-8");

  const subId = `SUB_${ethnieInfo?.id || slugify(entry.ethnieParente || entry.peupleId)}_${slugify(entry.sousGroupeBrut)}`;

  let content = modele
    .replace(/- Nom principal :/, `- Nom principal : ${entry.sousGroupeBrut}`)
    .replace(
      /- Identifiant sous-ethnie \(ID\) :/,
      `- Identifiant sous-ethnie (ID) : ${subId}`
    )
    .replace(/- Auto-appellation :/, `- Auto-appellation : N/A`)
    .replace(
      /- Exonymes et termes coloniaux/,
      `- Exonymes et termes coloniaux (connotation, origine, contextualisation) : N/A`
    )
    .replace(
      /- Ethnie parente :/,
      `- Ethnie parente : ${entry.ethnieParente || "N/A"}`
    )
    .replace(
      /- Identifiant ethnie parente \(ETH_\) :/,
      `- Identifiant ethnie parente (ETH_) : ${entry.ethnieId || "N/A"}`
    )
    .replace(
      /- Peuple d'appartenance :/,
      `- Peuple d'appartenance : ${entry.peupleName}`
    )
    .replace(
      /- Identifiant peuple \(ID\) :/,
      `- Identifiant peuple (ID) : PPL_${entry.peupleId}`
    )
    .replace(
      /- Langue parlée :/,
      `- Langue parlée : ${ethnieInfo?.langue || "N/A"}`
    )
    .replace(
      /- Code ISO 639-3 :/,
      `- Code ISO 639-3 : ${ethnieInfo?.codeISO || "N/A"}`
    )
    .replace(
      /- Famille linguistique :/,
      `- Famille linguistique : ${ethnieInfo?.familleLinguistique || entry.familleLinguistique}`
    )
    .replace(
      /- Identifiant famille linguistique \(FLG\) :/,
      `- Identifiant famille linguistique (FLG) : FLG_${entry.familleLinguistique}`
    );

  // Remplacer tous les autres champs par N/A
  content = content.replace(/:\s*$/gm, ": N/A");

  return content;
}

function generateClanFile(
  entry: SubgroupEntry,
  ethnieInfo: EthnieInfo | null
): string {
  const modelePath = path.join(__dirname, "../public/modele-clan.txt");
  const modele = fs.readFileSync(modelePath, "utf-8");

  const clanId = `CLN_${ethnieInfo?.id || slugify(entry.ethnieParente || entry.peupleId)}_${slugify(entry.sousGroupeBrut)}`;

  let content = modele
    .replace(/- Nom principal :/, `- Nom principal : ${entry.sousGroupeBrut}`)
    .replace(
      /- Identifiant clan \(ID\) :/,
      `- Identifiant clan (ID) : ${clanId}`
    )
    .replace(/- Auto-appellation :/, `- Auto-appellation : N/A`)
    .replace(
      /- Exonymes et termes coloniaux/,
      `- Exonymes et termes coloniaux (connotation, origine, contextualisation) : N/A`
    )
    .replace(
      /- Sous-ethnie parente \(si applicable\) :/,
      `- Sous-ethnie parente (si applicable) : N/A`
    )
    .replace(
      /- Identifiant sous-ethnie parente \(SUB_\) :/,
      `- Identifiant sous-ethnie parente (SUB_) : N/A`
    )
    .replace(
      /- Ethnie parente :/,
      `- Ethnie parente : ${entry.ethnieParente || "N/A"}`
    )
    .replace(
      /- Identifiant ethnie parente \(ETH_\) :/,
      `- Identifiant ethnie parente (ETH_) : ${entry.ethnieId || "N/A"}`
    )
    .replace(
      /- Peuple d'appartenance :/,
      `- Peuple d'appartenance : ${entry.peupleName}`
    )
    .replace(
      /- Identifiant peuple \(ID\) :/,
      `- Identifiant peuple (ID) : PPL_${entry.peupleId}`
    )
    .replace(
      /- Langue parlée :/,
      `- Langue parlée : ${ethnieInfo?.langue || "N/A"}`
    )
    .replace(
      /- Code ISO 639-3 :/,
      `- Code ISO 639-3 : ${ethnieInfo?.codeISO || "N/A"}`
    )
    .replace(
      /- Famille linguistique :/,
      `- Famille linguistique : ${ethnieInfo?.familleLinguistique || entry.familleLinguistique}`
    )
    .replace(
      /- Identifiant famille linguistique \(FLG\) :/,
      `- Identifiant famille linguistique (FLG) : FLG_${entry.familleLinguistique}`
    );

  // Remplacer tous les autres champs par N/A
  content = content.replace(/:\s*$/gm, ": N/A");

  return content;
}

function main() {
  console.log("🚀 Génération des fichiers SUB_*.txt et CLN_*.txt...\n");

  const analysisPath = path.join(
    __dirname,
    "../dataset/source/afrik/logs/ETAPE5/subgroups_analysis.json"
  );
  const entries: SubgroupEntry[] = JSON.parse(
    fs.readFileSync(analysisPath, "utf-8")
  );

  const sousEthniesDir = path.join(
    __dirname,
    "../dataset/source/afrik/sous_ethnies"
  );
  const clansDir = path.join(__dirname, "../dataset/source/afrik/clans");
  const ambigusDir = path.join(__dirname, "../dataset/source/afrik/ambigus");

  // Filtrer les entrées à ignorer
  const toProcess = entries.filter((e) => e.typeSuppose !== "IGNORE");

  let subCount = 0;
  let clanCount = 0;
  let ambiguCount = 0;

  for (const entry of toProcess) {
    // Chercher les infos de l'ethnie parente
    const ethnieInfo = entry.ethnieParente
      ? findEthnieInfo(entry.ethnieParente, entry.peupleId)
      : null;

    if (entry.typeSuppose === "SUB" || entry.typeSuppose === "SUB?") {
      const content = generateSubEthnieFile(entry, ethnieInfo);
      const subId = `SUB_${ethnieInfo?.id || slugify(entry.ethnieParente || entry.peupleId)}_${slugify(entry.sousGroupeBrut)}`;
      const fileName =
        entry.typeSuppose === "SUB?"
          ? `SUB?_${subId.replace("SUB_", "")}.txt`
          : `${subId}.txt`;
      const filePath =
        entry.typeSuppose === "SUB?"
          ? path.join(ambigusDir, fileName)
          : path.join(sousEthniesDir, fileName);

      fs.writeFileSync(filePath, content, "utf-8");
      subCount++;
      console.log(`✅ Généré: ${fileName}`);
    } else if (entry.typeSuppose === "CLN" || entry.typeSuppose === "CLN?") {
      const content = generateClanFile(entry, ethnieInfo);
      const clanId = `CLN_${ethnieInfo?.id || slugify(entry.ethnieParente || entry.peupleId)}_${slugify(entry.sousGroupeBrut)}`;
      const fileName =
        entry.typeSuppose === "CLN?"
          ? `CLN?_${clanId.replace("CLN_", "")}.txt`
          : `${clanId}.txt`;
      const filePath =
        entry.typeSuppose === "CLN?"
          ? path.join(ambigusDir, fileName)
          : path.join(clansDir, fileName);

      fs.writeFileSync(filePath, content, "utf-8");
      clanCount++;
      console.log(`✅ Généré: ${fileName}`);
    } else if (
      entry.typeSuppose === "AMBIGU" ||
      entry.typeSuppose === "UNKNOWN"
    ) {
      // Créer un fichier dans ambigus/ avec une note
      const content = `# ${entry.sousGroupeBrut}\n\n**À VALIDER – classification incertaine**\n\n- Peuple: PPL_${entry.peupleId}\n- Ethnie parente: ${entry.ethnieParente || "Non identifiée"}\n- Raison: ${entry.raison || "Classification non déterminée"}\n- Ligne source: ${entry.ligne}\n\n`;
      const fileName = `AMBIGU_${slugify(entry.peupleId)}_${slugify(entry.sousGroupeBrut)}.txt`;
      fs.writeFileSync(path.join(ambigusDir, fileName), content, "utf-8");
      ambiguCount++;
      console.log(`⚠️  Ambigu: ${fileName}`);
    }
  }

  console.log(`\n📊 Statistiques:`);
  console.log(`  Sous-ethnies (SUB): ${subCount}`);
  console.log(`  Clans (CLN): ${clanCount}`);
  console.log(`  Ambigus: ${ambiguCount}`);
  console.log(`  Total généré: ${subCount + clanCount + ambiguCount}`);
}

if (require.main === module) {
  main();
}

export { generateSubEthnieFile, generateClanFile };
