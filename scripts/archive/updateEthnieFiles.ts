import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const ETHNIES_ROOT = path.join(ROOT, "dataset", "source", "afrik", "ethnies");
const CACHE_DIR = path.join(ETHNIES_ROOT, "_cache_enrichissement");
const MODELE_PATH = path.join(ROOT, "public", "modele-ethnie.txt");

interface ConsolidatedData {
  langue_principale?: string;
  code_iso?: string;
  famille_linguistique?: string;
  pays_principaux?: string[];
  region_generale?: string;
  resume_historique?: string;
  origine_nom?: string;
  auto_appellation?: string;
  exonymes_contextualises?: string[];
  sources_utilisees?: string[];
}

interface CacheEntry {
  ETH_ID: string;
  consolidated?: ConsolidatedData;
}

function loadCache(ethId: string): CacheEntry | null {
  const cachePath = path.join(CACHE_DIR, `${ethId}.json`);
  if (!fs.existsSync(cachePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(cachePath, "utf-8");
    return JSON.parse(content) as CacheEntry;
  } catch {
    return null;
  }
}

function findEthnieFile(ethId: string): string | null {
  // Chercher dans tous les dossiers PPL_*
  const ethniesDir = ETHNIES_ROOT;
  const dirs = fs
    .readdirSync(ethniesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("PPL_"))
    .map((d) => d.name);

  for (const dir of dirs) {
    const filePath = path.join(ethniesDir, dir, `${ethId}.txt`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

function updateEthnieFile(ethId: string, data: ConsolidatedData): boolean {
  const filePath = findEthnieFile(ethId);
  if (!filePath) {
    console.warn(`File not found for ${ethId}`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf-8");

  // Mettre à jour l'en-tête
  if (data.langue_principale && content.includes("- Langue parlée :")) {
    const match = content.match(/- Langue parlée :[^\n]*/);
    if (match && match[0].includes("N/A")) {
      content = content.replace(
        match[0],
        `- Langue parlée : ${data.langue_principale}`
      );
    }
  }

  if (data.code_iso && content.includes("- Code ISO 639-3 :")) {
    const match = content.match(/- Code ISO 639-3 :[^\n]*/);
    if (match && (match[0].includes("N/A") || !match[0].trim().endsWith(":"))) {
      content = content.replace(
        match[0],
        `- Code ISO 639-3 : ${data.code_iso}`
      );
    }
  }

  if (
    data.famille_linguistique &&
    content.includes("- Famille linguistique :")
  ) {
    const match = content.match(/- Famille linguistique :[^\n]*/);
    if (match && match[0].includes("N/A")) {
      content = content.replace(
        match[0],
        `- Famille linguistique : ${data.famille_linguistique}`
      );
    }
  }

  if (data.auto_appellation && content.includes("- Auto-appellation :")) {
    const match = content.match(/- Auto-appellation :[^\n]*/);
    if (match && match[0].includes("N/A")) {
      content = content.replace(
        match[0],
        `- Auto-appellation : ${data.auto_appellation}`
      );
    }
  }

  // Mettre à jour les exonymes
  if (
    data.exonymes_contextualises &&
    data.exonymes_contextualises.length > 0 &&
    content.includes("- Exonymes et termes coloniaux")
  ) {
    const exonymesText = data.exonymes_contextualises.join(" ; ");
    const match = content.match(/- Exonymes et termes coloniaux[^\n]*/);
    if (match && match[0].includes("N/A")) {
      content = content.replace(
        match[0],
        `- Exonymes et termes coloniaux (connotation, origine, contextualisation) : ${exonymesText}`
      );
    }
  }

  // Mettre à jour la section 2. Origines et histoire
  if (
    data.resume_historique &&
    content.includes("# 2. Origines et histoire du groupe")
  ) {
    // Remplacer les N/A dans les sous-sections
    const naPattern = /- Origines anciennes :N\/A/;
    if (naPattern.test(content)) {
      const firstSentence =
        data.resume_historique.split(".")[0] || data.resume_historique;
      content = content.replace(
        naPattern,
        `- Origines anciennes : ${firstSentence}.`
      );
    }
  }

  // Mettre à jour la section 3. Territoires
  if (data.pays_principaux && data.pays_principaux.length > 0) {
    const paysText = data.pays_principaux.join(", ");
    if (content.includes("- Pays :N/A")) {
      content = content.replace(
        new RegExp("- Pays :N/A"),
        `- Pays : ${paysText}`
      );
    }
    if (
      data.region_generale &&
      content.includes("- Régions principales :N/A")
    ) {
      content = content.replace(
        new RegExp("- Régions principales :N/A"),
        `- Régions principales : ${data.region_generale}`
      );
    }
  }

  // Mettre à jour la section 8. Sources
  if (data.sources_utilisees && data.sources_utilisees.length > 0) {
    const sourcesSection = "# 8. Sources";
    const sourcesIndex = content.indexOf(sourcesSection);
    if (sourcesIndex !== -1) {
      const afterSources = content.substring(
        sourcesIndex + sourcesSection.length
      );
      const nextSectionIndex = afterSources.search(/^# \d+\./m);
      const sourcesContent =
        nextSectionIndex !== -1
          ? afterSources.substring(0, nextSectionIndex)
          : afterSources;

      // Vérifier si les sources sont déjà listées
      const existingSources = data.sources_utilisees.filter((src) =>
        sourcesContent.includes(src)
      );
      const newSources = data.sources_utilisees.filter(
        (src) => !sourcesContent.includes(src)
      );

      if (newSources.length > 0) {
        const newSourcesText = newSources
          .map((src) => `- ${src} – [URL]`)
          .join("\n");
        // Ajouter après la ligne "- [Titre] – [Auteur/URL]"
        if (sourcesContent.includes("- [Titre] – [Auteur/URL]")) {
          content = content.replace(
            "- [Titre] – [Auteur/URL]",
            `- [Titre] – [Auteur/URL]\n${newSourcesText}`
          );
        } else {
          // Ajouter à la fin de la section Sources
          const insertPos =
            sourcesIndex + sourcesSection.length + sourcesContent.length;
          content =
            content.substring(0, insertPos) +
            "\n" +
            newSourcesText +
            content.substring(insertPos);
        }
      }
    }
  }

  fs.writeFileSync(filePath, content, "utf-8");
  return true;
}

function main() {
  if (!fs.existsSync(CACHE_DIR)) {
    console.log(`Cache directory does not exist: ${CACHE_DIR}`);
    return;
  }

  const cacheFiles = fs
    .readdirSync(CACHE_DIR)
    .filter((f) => f.endsWith(".json"));
  console.log(`Found ${cacheFiles.length} cache files`);

  let updated = 0;
  let errors = 0;
  let skipped = 0;

  for (const file of cacheFiles) {
    try {
      const ethId = file.replace(".json", "");
      const entry = loadCache(ethId);
      if (!entry || !entry.consolidated) {
        skipped++;
        continue;
      }

      if (updateEthnieFile(ethId, entry.consolidated)) {
        updated++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error updating ${file}:`, error);
      errors++;
    }
  }

  console.log(`\nUpdate complete:`);
  console.log(`  - Updated: ${updated}`);
  console.log(`  - Skipped: ${skipped}`);
  console.log(`  - Errors: ${errors}`);
}

main();
