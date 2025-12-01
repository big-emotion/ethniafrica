import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const ETHNIES_ROOT = path.join(ROOT, "dataset", "source", "afrik", "ethnies");
const CACHE_DIR = path.join(ETHNIES_ROOT, "_cache_enrichissement");
const ETHNIES_A_ENRICHIR_PATH = path.join(
  ETHNIES_ROOT,
  "_ethnies_a_enrichir.csv"
);
const REPORT_PATH = path.join(
  ROOT,
  "docs",
  "RAPPORT_ETHNIES_ENRICHIES_ETAPE4.md"
);

interface CacheEntry {
  ETH_ID: string;
  timestamp: string;
  sources: Record<string, unknown>;
  consolidated?: unknown;
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

function countTotalEthnies(): number {
  if (!fs.existsSync(ETHNIES_A_ENRICHIR_PATH)) {
    return 0;
  }
  const content = fs.readFileSync(ETHNIES_A_ENRICHIR_PATH, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.length - 1; // Exclure l'en-tête
}

function generateReport(): string {
  const totalEthnies = countTotalEthnies();

  if (!fs.existsSync(CACHE_DIR)) {
    return `# Rapport — Enrichissement des ethnies (Étape 4 AFRIK)

**Date** : ${new Date().toISOString().split("T")[0]}

## État général

- **Total ethnies à enrichir** : ${totalEthnies}
- **Ethnies enrichies** : 0
- **Ethnies partiellement enrichies** : 0
- **Ethnies non enrichies** : ${totalEthnies}

## Statut

Le processus d'enrichissement n'a pas encore commencé. Aucun cache d'enrichissement trouvé.

## Prochaines étapes

1. Utiliser Browserbase MCP pour enrichir les ethnies phares (19 ethnies)
2. Étendre progressivement aux autres ethnies par batch
3. Consolider les données avec \`scripts/consolidateEthnieData.ts\`
4. Mettre à jour les fichiers avec \`scripts/updateEthnieFiles.ts\`
`;
  }

  const cacheFiles = fs
    .readdirSync(CACHE_DIR)
    .filter((f) => f.endsWith(".json"));
  const enriched: string[] = [];
  const partial: string[] = [];
  const bySource: Record<string, number> = {};

  for (const file of cacheFiles) {
    const ethId = file.replace(".json", "");
    const entry = loadCache(ethId);
    if (!entry) continue;

    const hasConsolidated = !!entry.consolidated;
    const sourceCount = Object.keys(entry.sources || {}).length;

    if (hasConsolidated && sourceCount >= 2) {
      enriched.push(ethId);
    } else if (sourceCount >= 1) {
      partial.push(ethId);
    }

    // Compter les sources utilisées
    for (const sourceName of Object.keys(entry.sources || {})) {
      bySource[sourceName] = (bySource[sourceName] || 0) + 1;
    }
  }

  const notEnriched = totalEthnies - enriched.length - partial.length;

  let report = `# Rapport — Enrichissement des ethnies (Étape 4 AFRIK)

**Date** : ${new Date().toISOString().split("T")[0]}

## État général

- **Total ethnies à enrichir** : ${totalEthnies}
- **Ethnies enrichies** : ${enriched.length} (${((enriched.length / totalEthnies) * 100).toFixed(1)}%)
- **Ethnies partiellement enrichies** : ${partial.length} (${((partial.length / totalEthnies) * 100).toFixed(1)}%)
- **Ethnies non enrichies** : ${notEnriched} (${((notEnriched / totalEthnies) * 100).toFixed(1)}%)

## Statistiques par source

`;

  for (const [source, count] of Object.entries(bySource).sort(
    (a, b) => b[1] - a[1]
  )) {
    report += `- **${source}** : ${count} ethnies\n`;
  }

  report += `\n## Ethnies enrichies (${enriched.length})\n\n`;
  if (enriched.length > 0) {
    for (const ethId of enriched.slice(0, 50)) {
      report += `- ${ethId}\n`;
    }
    if (enriched.length > 50) {
      report += `\n... et ${enriched.length - 50} autres\n`;
    }
  } else {
    report += `Aucune ethnie complètement enrichie pour le moment.\n`;
  }

  report += `\n## Ethnies partiellement enrichies (${partial.length})\n\n`;
  if (partial.length > 0) {
    for (const ethId of partial.slice(0, 50)) {
      report += `- ${ethId}\n`;
    }
    if (partial.length > 50) {
      report += `\n... et ${partial.length - 50} autres\n`;
    }
  } else {
    report += `Aucune ethnie partiellement enrichie pour le moment.\n`;
  }

  report += `\n## Prochaines étapes

1. Continuer l'enrichissement avec Browserbase MCP
2. Consolider les données : \`npx tsx scripts/consolidateEthnieData.ts\`
3. Mettre à jour les fichiers : \`npx tsx scripts/updateEthnieFiles.ts\`
4. Vérifier la conformité avec \`modele-ethnie.txt\`
5. Mettre à jour \`WORKFLOW_AFRIK_STATUS.md\` et \`workflow_status.csv\`
`;

  return report;
}

function main() {
  const report = generateReport();
  fs.writeFileSync(REPORT_PATH, report, "utf-8");
  console.log(`Rapport généré : ${REPORT_PATH}`);
  console.log("\n" + report);
}

main();
