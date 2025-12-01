import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const ETHNIES_ROOT = path.join(ROOT, "dataset", "source", "afrik", "ethnies");
const CACHE_DIR = path.join(ETHNIES_ROOT, "_cache_enrichissement");
const ETHNIES_A_ENRICHIR_PATH = path.join(
  ETHNIES_ROOT,
  "_ethnies_a_enrichir.csv"
);
const LOGS_DIR = path.join(ETHNIES_ROOT, "_logs_enrichissement");

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

function getEthniesWithoutCache(limit: number = 20): EthnieRow[] {
  const all = parseCsvEthnies();
  const withoutCache: EthnieRow[] = [];

  for (const ethnie of all) {
    if (loadCache(ethnie.ETH_ID) === null) {
      withoutCache.push(ethnie);
      if (withoutCache.length >= limit) break;
    }
  }

  return withoutCache;
}

function generateSearchUrls(
  ethnie: EthnieRow,
  codeISO?: string
): Record<string, string> {
  const urls: Record<string, string> = {};
  const nomEncoded = encodeURIComponent(ethnie.nom_ethnie);

  // Glottolog - recherche par nom ou code
  if (codeISO) {
    // Essayer de trouver le glottocode via recherche
    urls.glottolog = `https://glottolog.org/resource/languoid/id`;
  } else {
    urls.glottolog = `https://glottolog.org/resource/languoid/id`;
  }

  // Ethnologue - recherche par nom ou code ISO
  if (codeISO) {
    urls.ethnologue = `https://www.ethnologue.com/language/${codeISO}`;
  } else {
    urls.ethnologue = `https://www.ethnologue.com/search?q=${nomEncoded}`;
  }

  // UNESCO
  urls.unesco = `https://www.unesco.org/en/search?q=${nomEncoded}%20africa`;

  // Wikidata SPARQL
  urls.wikidata = `https://query.wikidata.org/sparql?query=SELECT%20?item%20?itemLabel%20?language%20?country%20WHERE%20%7B%20?item%20wdt:P31%20wd:Q41710%20.%20?item%20rdfs:label%20?itemLabel%20.%20FILTER(CONTAINS(LCASE(?itemLabel),%20%22${nomEncoded.toLowerCase()}%22))%20.%20OPTIONAL%20%7B%20?item%20wdt:P103%20?language%20%7D%20OPTIONAL%20%7B%20?item%20wdt:P17%20?country%20%7D%20%7D`;

  return urls;
}

function main() {
  console.log("=== Script d'enrichissement par batch ===\n");

  // Obtenir les ethnies sans cache (limite à 20 pour test)
  const ethniesToEnrich = getEthniesWithoutCache(20);

  console.log(`Ethnies à enrichir (sans cache) : ${ethniesToEnrich.length}\n`);

  if (ethniesToEnrich.length === 0) {
    console.log(
      "Toutes les ethnies ont déjà un cache. Exécuter consolidateEthnieData.ts et updateEthnieFiles.ts."
    );
    return;
  }

  console.log("Liste des ethnies à traiter :");
  for (const ethnie of ethniesToEnrich) {
    console.log(`  - ${ethnie.ETH_ID} (${ethnie.nom_ethnie})`);
  }

  console.log("\n=== Instructions pour Browserbase MCP ===\n");
  console.log("Pour chaque ethnie, utiliser Browserbase pour :\n");

  for (const ethnie of ethniesToEnrich) {
    const urls = generateSearchUrls(ethnie);
    console.log(`\n${ethnie.ETH_ID} (${ethnie.nom_ethnie}):`);
    console.log(`  1. Glottolog: ${urls.glottolog}`);
    console.log(`  2. Ethnologue: ${urls.ethnologue}`);
    console.log(`  3. UNESCO: ${urls.unesco}`);
    console.log(
      `  4. Sauvegarder dans: _cache_enrichissement/${ethnie.ETH_ID}.json`
    );
  }

  console.log("\n=== Après enrichissement ===\n");
  console.log("Exécuter:");
  console.log("  npx tsx scripts/consolidateEthnieData.ts");
  console.log("  npx tsx scripts/updateEthnieFiles.ts");
  console.log("  npx tsx scripts/generateEnrichmentReport.ts");
}

main();
