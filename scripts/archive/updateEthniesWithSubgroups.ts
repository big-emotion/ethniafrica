#!/usr/bin/env tsx
/**
 * Script pour mettre à jour les fichiers ETH_*.txt avec les références aux sous-ethnies et clans générés
 */

import * as fs from "fs";
import * as path from "path";
import { SubgroupEntry } from "./analyzeSubgroupsETAPE5";

function findEthnieFile(ethnieName: string, peupleId: string): string | null {
  const ethniesDir = path.join(__dirname, "../dataset/source/afrik/ethnies");
  const peupleDir = path.join(ethniesDir, `PPL_${peupleId}`);

  if (!fs.existsSync(peupleDir)) {
    return null;
  }

  const files = fs
    .readdirSync(peupleDir)
    .filter((f) => f.startsWith("ETH_") && f.endsWith(".txt"));

  // Essayer de trouver un fichier qui correspond
  const ethnieSlug = ethnieName
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_");

  for (const file of files) {
    const fileSlug = file.replace("ETH_", "").replace(".txt", "");
    if (fileSlug.includes(ethnieSlug) || ethnieSlug.includes(fileSlug)) {
      return path.join(peupleDir, file);
    }
  }

  return null;
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

function updateEthnieFile(
  filePath: string,
  subgroups: SubgroupEntry[],
  ethnieName: string
): void {
  let content = fs.readFileSync(filePath, "utf-8");

  // Extraire les sous-ethnies et clans pour cette ethnie
  const subEthnies = subgroups.filter(
    (s) =>
      s.ethnieParente === ethnieName &&
      (s.typeSuppose === "SUB" || s.typeSuppose === "SUB?")
  );
  const clans = subgroups.filter(
    (s) =>
      s.ethnieParente === ethnieName &&
      (s.typeSuppose === "CLN" || s.typeSuppose === "CLN?")
  );

  if (subEthnies.length === 0 && clans.length === 0) {
    return; // Rien à mettre à jour
  }

  // Construire le contenu de la section "Sous-groupes internes"
  let sectionContent = "# 1. Sous-groupes internes\n";

  if (subEthnies.length > 0) {
    sectionContent += "- Sous-ethnies :\n";
    for (const sub of subEthnies) {
      const ethnieInfo = findEthnieFile(sub.ethnieParente || "", sub.peupleId);
      const ethnieId = ethnieInfo
        ? path.basename(ethnieInfo, ".txt")
        : `ETH_${slugify(sub.ethnieParente || sub.peupleId)}`;
      const subId = `SUB_${ethnieId}_${slugify(sub.sousGroupeBrut)}`;
      sectionContent += `  - Nom : ${sub.sousGroupeBrut}\n`;
      sectionContent += `  - Identifiant (SUB_) : ${subId}\n`;
    }
  } else {
    sectionContent += "- Sous-ethnies :N/A\n";
    sectionContent += "  - Nom :N/A\n";
    sectionContent += "  - Identifiant (SUB_) :N/A\n";
  }

  if (clans.length > 0) {
    sectionContent += "- Clans :\n";
    for (const clan of clans) {
      const ethnieInfo = findEthnieFile(
        clan.ethnieParente || "",
        clan.peupleId
      );
      const ethnieId = ethnieInfo
        ? path.basename(ethnieInfo, ".txt")
        : `ETH_${slugify(clan.ethnieParente || clan.peupleId)}`;
      const clanId = `CLN_${ethnieId}_${slugify(clan.sousGroupeBrut)}`;
      sectionContent += `  - Nom : ${clan.sousGroupeBrut}\n`;
      sectionContent += `  - Identifiant (CLN_) : ${clanId}\n`;
    }
    sectionContent += "- Lignages :\n";
    for (const clan of clans) {
      const ethnieInfo = findEthnieFile(
        clan.ethnieParente || "",
        clan.peupleId
      );
      const ethnieId = ethnieInfo
        ? path.basename(ethnieInfo, ".txt")
        : `ETH_${slugify(clan.ethnieParente || clan.peupleId)}`;
      const clanId = `CLN_${ethnieId}_${slugify(clan.sousGroupeBrut)}`;
      sectionContent += `  - Nom : ${clan.sousGroupeBrut}\n`;
      sectionContent += `  - Identifiant (CLN_) : ${clanId}\n`;
    }
  } else {
    sectionContent += "- Clans :N/A\n";
    sectionContent += "  - Nom :N/A\n";
    sectionContent += "  - Identifiant (CLN_) :N/A\n";
    sectionContent += "- Lignages :N/A\n";
    sectionContent += "  - Nom :N/A\n";
    sectionContent += "  - Identifiant (CLN_) :N/A\n";
  }

  // Remplacer la section existante
  const sectionRegex = /# 1\. Sous-groupes internes[\s\S]*?(?=# 2\.|$)/;
  if (sectionRegex.test(content)) {
    content = content.replace(sectionRegex, sectionContent + "\n");
  } else {
    // Insérer après la ligne de famille linguistique
    const insertPoint = content.indexOf("# 1. Sous-groupes internes");
    if (insertPoint !== -1) {
      const before = content.substring(0, insertPoint);
      const after = content.substring(insertPoint);
      const afterSection = after.match(/# 2\./);
      if (afterSection) {
        content =
          before + sectionContent + "\n" + after.substring(afterSection.index!);
      }
    }
  }

  fs.writeFileSync(filePath, content, "utf-8");
}

function main() {
  console.log(
    "🔄 Mise à jour des fichiers ETH_*.txt avec les sous-ethnies et clans...\n"
  );

  const analysisPath = path.join(
    __dirname,
    "../dataset/source/afrik/logs/ETAPE5/subgroups_analysis.json"
  );
  const entries: SubgroupEntry[] = JSON.parse(
    fs.readFileSync(analysisPath, "utf-8")
  );

  // Grouper par ethnie parente
  const byEthnie = new Map<string, SubgroupEntry[]>();

  for (const entry of entries) {
    if (entry.ethnieParente && entry.typeSuppose !== "IGNORE") {
      if (!byEthnie.has(entry.ethnieParente)) {
        byEthnie.set(entry.ethnieParente, []);
      }
      byEthnie.get(entry.ethnieParente)!.push(entry);
    }
  }

  let updatedCount = 0;

  for (const [ethnieName, subgroups] of byEthnie.entries()) {
    // Trouver le peuple le plus fréquent dans les sous-groupes
    const peupleCounts = new Map<string, number>();
    for (const sub of subgroups) {
      peupleCounts.set(sub.peupleId, (peupleCounts.get(sub.peupleId) || 0) + 1);
    }
    const mostCommonPeuple = Array.from(peupleCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0][0];

    const ethnieFile = findEthnieFile(ethnieName, mostCommonPeuple);
    if (ethnieFile) {
      updateEthnieFile(ethnieFile, subgroups, ethnieName);
      updatedCount++;
      console.log(`✅ Mis à jour: ${path.basename(ethnieFile)}`);
    } else {
      console.log(
        `⚠️  Fichier non trouvé pour: ${ethnieName} (PPL_${mostCommonPeuple})`
      );
    }
  }

  console.log(`\n📊 Total de fichiers mis à jour: ${updatedCount}`);
}

if (require.main === module) {
  main();
}
