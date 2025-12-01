import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const ETHNIES_ROOT = path.join(ROOT, "dataset", "source", "afrik", "ethnies");
const CACHE_DIR = path.join(ETHNIES_ROOT, "_cache_enrichissement");

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

function consolidateData(entry: CacheEntry): CacheEntry["consolidated"] {
  const consolidated: CacheEntry["consolidated"] = {
    sources_utilisees: [],
  };

  // Règle : codes ISO 639-3 nécessitent au moins 2 sources
  const isoCodes: string[] = [];
  if (entry.sources.glottolog?.data?.code_iso) {
    isoCodes.push(entry.sources.glottolog.data.code_iso as string);
    consolidated.sources_utilisees!.push("Glottolog");
  }
  if (entry.sources.ethnologue?.data?.code_iso) {
    isoCodes.push(entry.sources.ethnologue.data.code_iso as string);
    if (!consolidated.sources_utilisees!.includes("Ethnologue (SIL)")) {
      consolidated.sources_utilisees!.push("Ethnologue (SIL)");
    }
  }

  // Prendre le code ISO le plus fréquent (ou le premier si un seul)
  if (isoCodes.length >= 1) {
    const counts = isoCodes.reduce(
      (acc, code) => {
        acc[code] = (acc[code] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    consolidated.code_iso = Object.entries(counts).sort(
      (a, b) => b[1] - a[1]
    )[0][0];
  }

  // Langue principale : priorité Glottolog > Ethnologue
  consolidated.langue_principale =
    (entry.sources.glottolog?.data?.langue as string | undefined) ||
    (entry.sources.ethnologue?.data?.langue as string | undefined) ||
    undefined;

  // Famille linguistique : priorité Glottolog > Ethnologue > UNESCO
  consolidated.famille_linguistique =
    (entry.sources.glottolog?.data?.famille as string | undefined) ||
    (entry.sources.ethnologue?.data?.famille as string | undefined) ||
    (entry.sources.unesco?.data?.famille as string | undefined) ||
    undefined;

  // Pays principaux : nécessitent au moins 2 sources pour confirmation
  const paysSources: string[][] = [];
  if (entry.sources.glottolog?.data?.pays) {
    const pays = entry.sources.glottolog.data.pays;
    paysSources.push(
      Array.isArray(pays) ? (pays as string[]) : [pays as string]
    );
  }
  if (entry.sources.ethnologue?.data?.pays) {
    const pays = entry.sources.ethnologue.data.pays;
    paysSources.push(
      Array.isArray(pays) ? (pays as string[]) : [pays as string]
    );
  }
  if (entry.sources.cia?.data?.pays) {
    const pays = entry.sources.cia.data.pays;
    paysSources.push(
      Array.isArray(pays) ? (pays as string[]) : [pays as string]
    );
  }

  if (paysSources.length >= 2) {
    // Intersection des pays mentionnés dans au moins 2 sources
    const allPays = paysSources.flat();
    const counts = allPays.reduce(
      (acc, pays) => {
        acc[pays] = (acc[pays] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    consolidated.pays_principaux = Object.entries(counts)
      .filter(([_, count]) => count >= 2)
      .map(([pays, _]) => pays);
  } else if (paysSources.length === 1) {
    consolidated.pays_principaux = paysSources[0];
  }

  // Région générale : une seule source suffit
  consolidated.region_generale =
    (entry.sources.glottolog?.data?.region as string | undefined) ||
    (entry.sources.ethnologue?.data?.region as string | undefined) ||
    (entry.sources.unesco?.data?.region as string | undefined) ||
    undefined;

  // Résumé historique : une source académique forte suffit
  consolidated.resume_historique =
    (entry.sources.glottolog?.data?.historique as string | undefined) ||
    (entry.sources.ethnologue?.data?.historique as string | undefined) ||
    (entry.sources.unesco?.data?.historique as string | undefined) ||
    (entry.sources.academique?.[0]?.data?.historique as string | undefined) ||
    undefined;

  // Auto-appellation : priorité Glottolog > Ethnologue
  consolidated.auto_appellation =
    (entry.sources.glottolog?.data?.auto_appellation as string | undefined) ||
    (entry.sources.ethnologue?.data?.auto_appellation as string | undefined) ||
    undefined;

  // Origine du nom : une source académique suffit
  consolidated.origine_nom =
    (entry.sources.glottolog?.data?.origine_nom as string | undefined) ||
    (entry.sources.academique?.[0]?.data?.origine_nom as string | undefined) ||
    undefined;

  // Exonymes : une source académique suffit, mais doit être contextualisée
  if (entry.sources.academique?.[0]?.data?.exonymes) {
    consolidated.exonymes_contextualises = Array.isArray(
      entry.sources.academique[0].data.exonymes
    )
      ? entry.sources.academique[0].data.exonymes
      : [entry.sources.academique[0].data.exonymes];
  }

  // Ajouter les sources utilisées
  if (entry.sources.unesco?.success) {
    if (!consolidated.sources_utilisees!.includes("UNESCO")) {
      consolidated.sources_utilisees!.push("UNESCO");
    }
  }
  if (entry.sources.cia?.success) {
    if (!consolidated.sources_utilisees!.includes("CIA World Factbook")) {
      consolidated.sources_utilisees!.push("CIA World Factbook");
    }
  }
  if (entry.sources.academique && entry.sources.academique.length > 0) {
    entry.sources.academique.forEach((src) => {
      if (
        src.data?.source_name &&
        !consolidated.sources_utilisees!.includes(
          src.data.source_name as string
        )
      ) {
        consolidated.sources_utilisees!.push(src.data.source_name as string);
      }
    });
  }

  return consolidated;
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

  let consolidated = 0;
  let errors = 0;

  for (const file of cacheFiles) {
    try {
      const entry = loadCache(file.replace(".json", ""));
      if (!entry) continue;

      const consolidatedData = consolidateData(entry);
      if (consolidatedData) {
        entry.consolidated = consolidatedData;
        const cachePath = path.join(CACHE_DIR, file);
        fs.writeFileSync(cachePath, JSON.stringify(entry, null, 2), "utf-8");
        consolidated++;
      }
    } catch (error) {
      console.error(`Error consolidating ${file}:`, error);
      errors++;
    }
  }

  console.log(`\nConsolidation complete:`);
  console.log(`  - Consolidated: ${consolidated}`);
  console.log(`  - Errors: ${errors}`);
}

main();
