import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const ETHNIES_ROOT = path.join(ROOT, "dataset", "source", "afrik", "ethnies");
const ETHNIES_A_ENRICHIR_PATH = path.join(
  ETHNIES_ROOT,
  "_ethnies_a_enrichir.csv"
);
const CACHE_DIR = path.join(ETHNIES_ROOT, "_cache_enrichissement");
const LOGS_DIR = path.join(ETHNIES_ROOT, "_logs_enrichissement");

interface EthnieRow {
  ETH_ID: string;
  PPL_ID: string;
  FLG_ID: string;
  nom_ethnie: string;
  fichier_ETH_canonique: string;
  priorite: "phare" | "normal";
}

interface SourceData {
  url: string;
  data: Record<string, unknown>;
  timestamp: string;
  success: boolean;
  error?: string;
}

interface CacheEntry {
  ETH_ID: string;
  timestamp: string;
  sources: {
    glottolog?: SourceData;
    ethnologue?: SourceData;
    unesco?: SourceData;
    cia?: SourceData;
    academique?: SourceData[];
  };
  consolidated?: {
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
  };
}

// Sources autorisées selon le plan
const SOURCES_AUTORISEES = {
  glottolog: {
    baseUrl: "https://glottolog.org",
    priority: 1,
  },
  ethnologue: {
    baseUrl: "https://www.ethnologue.com",
    priority: 2,
  },
  unesco: {
    baseUrl: "https://www.unesco.org",
    priority: 3,
  },
  cia: {
    baseUrl: "https://www.cia.gov/the-world-factbook",
    priority: 5,
  },
};

function ensureDirs() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
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

function groupByBatch(ethnies: EthnieRow[]): Map<string, EthnieRow[]> {
  const batches = new Map<string, EthnieRow[]>();

  // Grouper par famille linguistique (FLG_ID)
  for (const ethnie of ethnies) {
    // FLG_ID contient déjà "FLG_", donc on l'utilise directement
    const batchKey = ethnie.FLG_ID || "FLG_UNKNOWN";
    if (!batches.has(batchKey)) {
      batches.set(batchKey, []);
    }
    batches.get(batchKey)!.push(ethnie);
  }

  return batches;
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
  const cachePath = path.join(CACHE_DIR, `${entry.ETH_ID}.json`);
  fs.writeFileSync(cachePath, JSON.stringify(entry, null, 2), "utf-8");
}

function createBatchLog(batchId: string): string {
  return path.join(LOGS_DIR, `batch_${batchId}.md`);
}

function writeBatchLog(batchId: string, content: string) {
  const logPath = createBatchLog(batchId);
  fs.writeFileSync(logPath, content, "utf-8");
}

function generateSearchUrls(ethnie: EthnieRow): Record<string, string> {
  const urls: Record<string, string> = {};

  // Glottolog - recherche par nom de langue/ethnie
  urls.glottolog = `${SOURCES_AUTORISEES.glottolog.baseUrl}/resource/languoid/id`;

  // Ethnologue - recherche par nom
  urls.ethnologue = `${SOURCES_AUTORISEES.ethnologue.baseUrl}/search?q=${encodeURIComponent(ethnie.nom_ethnie)}`;

  // UNESCO - recherche générale
  urls.unesco = `${SOURCES_AUTORISEES.unesco.baseUrl}/en/search?q=${encodeURIComponent(ethnie.nom_ethnie + " africa")}`;

  // CIA - nécessite le pays, on le laisse vide pour l'instant
  urls.cia = `${SOURCES_AUTORISEES.cia.baseUrl}/`;

  return urls;
}

function main() {
  ensureDirs();

  const ethnies = parseCsvEthnies();
  console.log(`Total ethnies à enrichir: ${ethnies.length}`);

  // Séparer les ethnies phares des autres
  const ethniesPhares = ethnies.filter((e) => e.priorite === "phare");
  const ethniesNormales = ethnies.filter((e) => e.priorite === "normal");

  console.log(`Ethnies phares: ${ethniesPhares.length}`);
  console.log(`Ethnies normales: ${ethniesNormales.length}`);

  // Grouper par batch (famille linguistique)
  const batches = groupByBatch(ethnies);

  console.log(`\nBatches créés: ${batches.size}`);
  for (const [batchId, batchEthnies] of batches.entries()) {
    console.log(`  ${batchId}: ${batchEthnies.length} ethnies`);
  }

  // Créer un fichier de planification pour chaque batch
  const planDir = path.join(ETHNIES_ROOT, "_plan_enrichissement");
  if (!fs.existsSync(planDir)) {
    fs.mkdirSync(planDir, { recursive: true });
  }

  for (const [batchId, batchEthnies] of batches.entries()) {
    const planPath = path.join(
      planDir,
      `${batchId.replace(/[^A-Z0-9_]/g, "_")}.json`
    );
    const plan = {
      batchId,
      flgId: batchId,
      totalEthnies: batchEthnies.length,
      ethnies: batchEthnies.map((e) => ({
        ETH_ID: e.ETH_ID,
        nom_ethnie: e.nom_ethnie,
        PPL_ID: e.PPL_ID,
        fichier_ETH: e.fichier_ETH_canonique,
        urls: generateSearchUrls(e),
        cacheExists: loadCache(e.ETH_ID) !== null,
      })),
    };
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf-8");
  }

  console.log(`\nPlans de batch créés dans: ${planDir}`);
  console.log(
    `\nProchaine étape: utiliser les outils Browserbase MCP pour enrichir chaque ethnie.`
  );
}

main();
