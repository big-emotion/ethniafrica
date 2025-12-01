import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const ETHNIES_ROOT = path.join(ROOT, "dataset", "source", "afrik", "ethnies");
const CACHE_DIR = path.join(ETHNIES_ROOT, "_cache_enrichissement");
const ETHNIES_A_ENRICHIR_PATH = path.join(
  ETHNIES_ROOT,
  "_ethnies_a_enrichir.csv"
);

interface EthnieRow {
  ETH_ID: string;
  PPL_ID: string;
  FLG_ID: string;
  nom_ethnie: string;
  fichier_ETH_canonique: string;
  priorite: "phare" | "normal";
}

interface CacheEntry {
  ETH_ID: string;
  timestamp: string;
  sources: Record<string, unknown>;
  consolidated?: unknown;
}

function parseCsvEthnies(): EthnieRow[] {
  const content = fs.readFileSync(ETHNIES_A_ENRICHIR_PATH, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const [headerLine, ...dataLines] = lines;
  const headers = headerLine.split(",");

  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  const rows: EthnieRow[] = [];

  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    if (cols.length < headers.length) continue;

    const get = (name: string): string => {
      const idx = headers.indexOf(name);
      if (idx === -1) return "";
      return cols[idx] ?? "";
    };

    rows.push({
      ETH_ID: get("ETH_ID"),
      PPL_ID: get("PPL_ID"),
      FLG_ID: get("FLG_ID"),
      nom_ethnie: get("nom_ethnie"),
      fichier_ETH_canonique: get("fichier_ETH_canonique"),
      priorite: (get("priorite") as "phare" | "normal") || "normal",
    });
  }

  return rows;
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

function saveCache(entry: CacheEntry) {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  const cachePath = path.join(CACHE_DIR, `${entry.ETH_ID}.json`);
  fs.writeFileSync(cachePath, JSON.stringify(entry, null, 2), "utf-8");
}

function getEthniesWithoutCache(limit?: number): EthnieRow[] {
  const all = parseCsvEthnies();
  const withoutCache: EthnieRow[] = [];

  for (const ethnie of all) {
    const cached = loadCache(ethnie.ETH_ID);
    if (!cached || !cached.consolidated) {
      withoutCache.push(ethnie);
      if (limit && withoutCache.length >= limit) break;
    }
  }

  return withoutCache;
}

function main() {
  console.log("=== Script d'enrichissement automatisé ===\n");

  // Obtenir les ethnies sans cache consolidé
  const ethniesToEnrich = getEthniesWithoutCache(50);

  console.log(
    `Ethnies à enrichir (sans cache consolidé) : ${ethniesToEnrich.length}\n`
  );

  if (ethniesToEnrich.length === 0) {
    console.log("Toutes les ethnies ont déjà un cache consolidé.");
    console.log("Exécuter: npx tsx scripts/updateEthnieFiles.ts");
    return;
  }

  console.log("Liste des ethnies à traiter (premiers 20):");
  for (let i = 0; i < Math.min(20, ethniesToEnrich.length); i++) {
    const ethnie = ethniesToEnrich[i];
    console.log(
      `  ${i + 1}. ${ethnie.ETH_ID} (${ethnie.nom_ethnie}) - ${ethnie.FLG_ID}`
    );
  }

  console.log("\n=== Instructions ===\n");
  console.log("Ce script identifie les ethnies à enrichir.");
  console.log("Pour enrichir automatiquement avec Browserbase MCP:");
  console.log("  1. Utiliser les outils Browserbase MCP pour chaque ethnie");
  console.log(
    "  2. Sauvegarder les données dans _cache_enrichissement/[ETH_ID].json"
  );
  console.log("  3. Exécuter: npx tsx scripts/consolidateEthnieData.ts");
  console.log("  4. Exécuter: npx tsx scripts/updateEthnieFiles.ts");
  console.log("  5. Exécuter: npx tsx scripts/generateEnrichmentReport.ts");
}

main();
