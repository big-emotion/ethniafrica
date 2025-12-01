import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
const PAYS_ROOT = path.join(ROOT, "dataset", "source", "afrik", "pays");
const PEUPLES_ROOT = path.join(ROOT, "dataset", "source", "afrik", "peuples");
const LOGS_ROOT = path.join(ROOT, "dataset", "source", "afrik", "logs");
const TRACKING_CSV = path.join(LOGS_ROOT, "peuples_reels_par_pays.csv");
const MODELE_PEUPLE = path.join(ROOT, "public", "modele-peuple.txt");
const CACHE_DIR = path.join(LOGS_ROOT, "_cache_web_search");

// Interfaces
interface RealPeople {
  name: string;
  alternativeNames: string[];
  type: "ethnie" | "clan" | "lignage" | "tribu" | "famille" | "sous-ethnie";
  parentPeople?: string; // Nom du peuple parent (si détecté)
  parentId?: string; // PPL_ID du parent (si existe)
  familyLinguistic?: string;
  region?: string;
  source: string;
}

interface DocumentedPeople {
  name: string;
  pplId: string | "N/A";
  familyLinguistic: string;
  iso6393?: string;
  region?: string;
  autoAppellation?: string;
  exonymes?: string;
}

interface MissingPeople {
  name: string;
  type: string;
  suggestedPplId: string;
  parentId?: string;
  parentName?: string;
  familyLinguistic: string;
  needsCreation: boolean;
  alternativeNames: string[];
  region?: string;
}

interface EnrichedPeopleData {
  nomPrincipal: string;
  autoAppellation: string;
  exonymes: string[];
  origineTermes?: string;
  termesProblematiques?: string;
  familleLinguistique: string;
  groupeEthnoLinguistique?: string;
  regionHistorique: string;
  paysActuels: string[];
  langues: { nom: string; iso6393: string }[];
  origines: string;
  migrations: string;
  organisation: string;
  culture: string;
  royaumes?: string;
  demographie: {
    total: number;
    parPays: Record<string, number>;
    annee: number;
    source: string;
  };
  sources: string[];
  parentId?: string; // PPL_ID du peuple parent
}

interface CountryTracking {
  code: string;
  nom: string;
  peuplesReels: string;
  peuplesDocumentes: number;
  couverture: string;
  peuplesACreer: string;
  priorite: string;
  statut: string;
}

interface Config {
  country?: string;
  all: boolean;
  priority?: string;
  force: boolean;
  dryRun: boolean;
  interactive: boolean;
}

// Configuration CLI
function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    all: false,
    force: false,
    dryRun: false,
    interactive: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--country" && args[i + 1]) {
      config.country = args[i + 1];
      i++;
    } else if (args[i] === "--all") {
      config.all = true;
    } else if (args[i] === "--priority" && args[i + 1]) {
      config.priority = args[i + 1];
      i++;
    } else if (args[i] === "--force") {
      config.force = true;
    } else if (args[i] === "--dry-run") {
      config.dryRun = true;
    } else if (args[i] === "--interactive") {
      config.interactive = true;
    }
  }

  return config;
}

// Étape 1 : Lire le CSV de suivi
function readTrackingCSV(): CountryTracking[] {
  if (!fs.existsSync(TRACKING_CSV)) {
    throw new Error(`Fichier de suivi non trouvé: ${TRACKING_CSV}`);
  }

  const content = fs.readFileSync(TRACKING_CSV, "utf-8");
  const lines = content
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("code_pays"));

  return lines.map((line) => {
    const parts = line.split(",");
    return {
      code: parts[0]?.trim() || "",
      nom: parts[1]?.trim() || "",
      peuplesReels: parts[2]?.trim() || "?",
      peuplesDocumentes: parseInt(parts[3]?.trim() || "0", 10),
      couverture: parts[4]?.trim() || "?",
      peuplesACreer: parts[5]?.trim() || "?",
      priorite: parts[6]?.trim() || "FAIBLE",
      statut: parts[7]?.trim() || "⏳ À traiter",
    };
  });
}

// ============================================================
// FONCTIONS DE RECHERCHE PAR SOURCE AUTORISÉE
// ============================================================

// Helper pour requêtes HTTP
async function httpGet(url: string): Promise<string> {
  try {
    const result = execSync(`curl -s -L "${url}"`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return result;
  } catch (e) {
    throw new Error(`HTTP GET failed: ${e}`);
  }
}

// 1. Wikidata SPARQL - Recherche peuples par pays
async function searchWikidata(
  countryCode: string,
  countryName: string
): Promise<RealPeople[]> {
  console.log(`    📊 Wikidata SPARQL...`);
  try {
    // Requête SPARQL pour trouver les groupes ethniques d'un pays
    const query = `
      SELECT ?ethnicGroup ?ethnicGroupLabel ?language ?languageLabel WHERE {
        ?country wdt:P297 "${countryCode}" .
        ?ethnicGroup wdt:P31/wdt:P279* wd:Q41710 .
        ?ethnicGroup wdt:P17 ?country .
        OPTIONAL { ?ethnicGroup wdt:P1412 ?language . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr" . }
      }
      LIMIT 100
    `
      .replace(/\s+/g, " ")
      .trim();

    const encodedQuery = encodeURIComponent(query);
    const url = `https://query.wikidata.org/sparql?query=${encodedQuery}&format=json`;

    const response = await httpGet(url);
    const data = JSON.parse(response);

    const peoples: RealPeople[] = [];
    if (data.results && data.results.bindings) {
      for (const binding of data.results.bindings) {
        const name = binding.ethnicGroupLabel?.value || "";
        if (name && name.length > 2) {
          peoples.push({
            name,
            alternativeNames: [],
            type: "ethnie",
            source: `Wikidata: ${binding.ethnicGroup?.value || ""}`,
          });
        }
      }
    }

    console.log(`      ✓ ${peoples.length} peuples trouvés`);
    return peoples;
  } catch (e) {
    console.log(`      ⚠ Erreur Wikidata: ${e}`);
    return [];
  }
}

// Helper pour obtenir le nom anglais du pays pour CIA Factbook
function getCIAFactbookCountryName(
  countryCode: string,
  countryName: string
): string {
  const mapping: Record<string, string> = {
    LBR: "liberia",
    COD: "congo-democratic-republic-of-the",
    CMR: "cameroon",
    NGA: "nigeria",
    ZAF: "south-africa",
    KEN: "kenya",
    TZA: "tanzania",
    UGA: "uganda",
    GHA: "ghana",
    CIV: "cote-divoire",
    SEN: "senegal",
    MLI: "mali",
    BFA: "burkina-faso",
    NER: "niger",
    TCD: "chad",
    SDN: "sudan",
    ETH: "ethiopia",
    SOM: "somalia",
    MOZ: "mozambique",
    AGO: "angola",
    ZMB: "zambia",
    MWI: "malawi",
    ZWE: "zimbabwe",
    BWA: "botswana",
    NAM: "namibia",
    GAB: "gabon",
    GNQ: "equatorial-guinea",
    CAF: "central-african-republic",
    RWA: "rwanda",
    BDI: "burundi",
    ERI: "eritrea",
    DJI: "djibouti",
    GIN: "guinea",
    GNB: "guinea-bissau",
    SLE: "sierra-leone",
    GMB: "gambia-the",
    CPV: "cape-verde",
    STP: "sao-tome-and-principe",
    MRT: "mauritania",
    DZA: "algeria",
    TUN: "tunisia",
    LBY: "libya",
    EGY: "egypt",
    MAR: "morocco",
    SSD: "south-sudan",
    COM: "comoros",
    MUS: "mauritius",
    SYC: "seychelles",
    MDG: "madagascar",
    SWZ: "eswatini",
    LSO: "lesotho",
    TGO: "togo",
    BEN: "benin",
  };

  return (
    mapping[countryCode] ||
    countryName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z-]/g, "")
  );
}

// 2. CIA World Factbook - Via Browserbase (requiert agent)
// Cette fonction retourne les instructions pour l'agent
async function searchCIAFactbook(
  countryCode: string,
  countryName: string
): Promise<RealPeople[]> {
  console.log(`    🌐 CIA World Factbook (nécessite Browserbase)...`);
  const ciaCountryName = getCIAFactbookCountryName(countryCode, countryName);
  console.log(
    `      → URL: https://www.cia.gov/the-world-factbook/countries/${ciaCountryName}/`
  );
  console.log(
    `      → L'agent doit utiliser Browserbase pour extraire la section "People and Society > Ethnic groups"`
  );
  // Retourner vide car nécessite Browserbase
  return [];
}

// 3. Ethnologue (SIL) - Via recherche web ciblée
async function searchEthnologue(
  countryCode: string,
  countryName: string
): Promise<RealPeople[]> {
  console.log(`    📚 Ethnologue (SIL)...`);
  // Ethnologue n'a pas d'API publique, nécessite scraping ou recherche web
  // Retourner vide pour l'instant, sera complété par web_search ciblé
  return [];
}

// 4. UNESCO - Endpoint interne (non officiel)
async function searchUNESCO(
  countryCode: string,
  countryName: string
): Promise<RealPeople[]> {
  console.log(`    🏛️ UNESCO...`);
  // UNESCO endpoint nécessite des IDs de langues spécifiques
  // Retourner vide pour l'instant
  return [];
}

// 5. IWGIA - Via Browserbase (requiert agent)
async function searchIWGIA(
  countryCode: string,
  countryName: string
): Promise<RealPeople[]> {
  console.log(`    🌍 IWGIA (nécessite Browserbase)...`);
  console.log(`      → URL: https://www.iwgia.org/en/regions/africa`);
  console.log(
    `      → L'agent doit utiliser Browserbase pour rechercher "${countryName}"`
  );
  return [];
}

// 6. Encyclopaedia Africana - Via Browserbase (requiert agent)
async function searchEncyclopaediaAfricana(
  countryCode: string,
  countryName: string
): Promise<RealPeople[]> {
  console.log(`    📖 Encyclopaedia Africana (nécessite Browserbase)...`);
  console.log(
    `      → L'agent doit utiliser Browserbase pour rechercher "${countryName} ethnic groups"`
  );
  return [];
}

// 7. web_search fallback avec requêtes ciblées
async function searchWebSearchFallback(
  countryCode: string,
  countryName: string
): Promise<RealPeople[]> {
  console.log(`    🔍 web_search (fallback avec requêtes ciblées)...`);

  // Requêtes ciblées vers les sources autorisées
  const targetedQueries = [
    `${countryName} ethnic groups CIA World Factbook`,
    `${countryName} indigenous peoples Ethnologue SIL`,
    `${countryName} ethnic groups Wikipedia`,
    `"${countryName}" "ethnic groups" list`,
    `${countryName} tribes clans ethnic groups`,
  ];

  console.log(`      → Requêtes à exécuter par l'agent:`);
  for (const query of targetedQueries) {
    console.log(`        - "${query}"`);
  }

  // Retourner vide car nécessite web_search tool de l'agent
  return [];
}

// Étape 2 : Recherche web exhaustive des peuples réels
// Utilise les sources autorisées dans l'ordre de priorité
async function searchAllPeoplesForCountry(
  countryCode: string,
  countryName: string,
  force: boolean = false
): Promise<RealPeople[]> {
  const cachePath = path.join(CACHE_DIR, `${countryCode}.json`);

  // Charger depuis cache si existe et pas force
  if (!force && fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
      console.log(`  ✓ Cache chargé: ${cached.peoples.length} peuples`);
      return cached.peoples as RealPeople[];
    } catch (e) {
      console.log(`  ⚠ Erreur lecture cache`);
    }
  }

  console.log(
    `  🔍 Recherche peuples réels pour ${countryName} (${countryCode})...`
  );
  console.log(`  Utilisation des sources autorisées (ordre de priorité):\n`);

  const allPeoples: RealPeople[] = [];
  const seenNames = new Set<string>();

  // 1. Wikidata SPARQL (API directe)
  const wikidataPeoples = await searchWikidata(countryCode, countryName);
  for (const people of wikidataPeoples) {
    const key = normalizePeopleName(people.name);
    if (!seenNames.has(key)) {
      seenNames.add(key);
      allPeoples.push(people);
    }
  }

  // 2. CIA World Factbook (nécessite Browserbase - instructions affichées)
  const ciaPeoples = await searchCIAFactbook(countryCode, countryName);
  // Les peuples seront ajoutés par l'agent via Browserbase

  // 3. Ethnologue (nécessite recherche web ciblée)
  const ethnologuePeoples = await searchEthnologue(countryCode, countryName);
  // Les peuples seront ajoutés par l'agent via web_search

  // 4. UNESCO (nécessite IDs de langues)
  const unescoPeoples = await searchUNESCO(countryCode, countryName);

  // 5. IWGIA (nécessite Browserbase - instructions affichées)
  const iwgiaPeoples = await searchIWGIA(countryCode, countryName);

  // 6. Encyclopaedia Africana (nécessite Browserbase - instructions affichées)
  const encyclopaediaPeoples = await searchEncyclopaediaAfricana(
    countryCode,
    countryName
  );

  // 7. web_search fallback avec requêtes ciblées
  const webSearchPeoples = await searchWebSearchFallback(
    countryCode,
    countryName
  );
  // Les peuples seront ajoutés par l'agent via web_search

  console.log(
    `\n  📊 Résultats initiaux: ${allPeoples.length} peuples trouvés`
  );
  console.log(
    `  ℹ️  Sources nécessitant l'agent (Browserbase/web_search) affichées ci-dessus\n`
  );

  // Sauvegarder dans cache (même si incomplet, sera complété par l'agent)
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const cachePath2 = path.join(CACHE_DIR, `${countryCode}.json`);
  fs.writeFileSync(
    cachePath2,
    JSON.stringify(
      {
        countryCode,
        countryName,
        peoples: allPeoples,
        timestamp: new Date().toISOString(),
        sourcesUsed: ["Wikidata"],
        sourcesPending: [
          "CIA Factbook",
          "Ethnologue",
          "UNESCO",
          "IWGIA",
          "Encyclopaedia Africana",
          "web_search",
        ],
      },
      null,
      2
    ),
    "utf-8"
  );

  return allPeoples;
}

// Fonction helper pour sauvegarder les résultats additionnels (appelée par l'agent)
export function addSearchResults(
  countryCode: string,
  countryName: string,
  newPeoples: RealPeople[],
  source: string
): void {
  const cachePath = path.join(CACHE_DIR, `${countryCode}.json`);

  let existingPeoples: RealPeople[] = [];
  let sourcesUsed: string[] = [];
  let sourcesPending: string[] = [];

  // Charger cache existant
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
      existingPeoples = cached.peoples || [];
      sourcesUsed = cached.sourcesUsed || [];
      sourcesPending = cached.sourcesPending || [];
    } catch (e) {
      // Ignorer erreur
    }
  }

  // Ajouter nouveaux peuples (dédupliquer)
  const seenNames = new Set(
    existingPeoples.map((p) => normalizePeopleName(p.name))
  );
  for (const people of newPeoples) {
    const key = normalizePeopleName(people.name);
    if (!seenNames.has(key)) {
      seenNames.add(key);
      existingPeoples.push(people);
    }
  }

  // Mettre à jour sources
  if (!sourcesUsed.includes(source)) {
    sourcesUsed.push(source);
  }
  sourcesPending = sourcesPending.filter((s) => s !== source);

  // Sauvegarder
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  fs.writeFileSync(
    cachePath,
    JSON.stringify(
      {
        countryCode,
        countryName,
        peoples: existingPeoples,
        timestamp: new Date().toISOString(),
        sourcesUsed,
        sourcesPending,
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log(
    `  ✓ ${newPeoples.length} peuples ajoutés depuis ${source} (total: ${existingPeoples.length})`
  );
}

// Fonction helper pour sauvegarder les résultats de web_search (appelée par l'agent)
export function setSearchResults(
  countryCode: string,
  countryName: string,
  searchResults: string[],
  source: string = "web_search"
): void {
  const peoples = parseWebSearchResults(
    searchResults,
    countryCode,
    countryName
  );
  addSearchResults(countryCode, countryName, peoples, source);
}

// Fonction helper pour parser les résultats de web_search
function parseWebSearchResults(
  searchResults: string[],
  countryCode: string,
  countryName: string
): RealPeople[] {
  const peoples: RealPeople[] = [];
  const seenNames = new Set<string>();

  // Combiner tous les résultats
  const fullText = searchResults.join("\n").toLowerCase();

  // Patterns pour détecter les peuples
  const patterns = [
    // Listes avec tirets ou numéros
    /(?:^|\n)[\s\-•\d+.]+\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    // Après "peuples:", "ethnies:", etc.
    /(?:peuples?|ethnies?|groupes?|tribus?|clans?)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    // Dans des listes HTML ou markdown
    /<li>([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)<\/li>/gi,
    // Noms propres suivis de descriptions
    /\b([A-Z][a-z]{3,})\s+(?:est|sont|vivent|habite)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      const name = match[1].trim();
      const normalized = normalizePeopleName(name);

      // Filtrer les mots communs
      const commonWords = [
        "peuple",
        "ethnie",
        "groupe",
        "tribu",
        "clan",
        "lignage",
        "famille",
        "région",
        "pays",
        "afrique",
        "africain",
        "liste",
        "complet",
      ];
      if (commonWords.includes(name.toLowerCase()) || name.length < 3) {
        continue;
      }

      if (!seenNames.has(normalized)) {
        seenNames.add(normalized);

        // Chercher le contexte pour détecter type et hiérarchie
        const contextStart = Math.max(0, match.index - 200);
        const contextEnd = Math.min(fullText.length, match.index + 200);
        const context = fullText.substring(contextStart, contextEnd);

        let type: RealPeople["type"] = "ethnie";
        let parentPeople: string | undefined;
        let familyLinguistic: string | undefined;
        let region: string | undefined;

        // Détecter type
        if (context.includes("clan")) type = "clan";
        if (context.includes("lignage")) type = "lignage";
        if (context.includes("tribu")) type = "tribu";
        if (context.includes("famille")) type = "famille";
        if (
          context.includes("sous-ethnie") ||
          context.includes("sous-groupe")
        ) {
          type = "sous-ethnie";
        }

        // Détecter parent
        const parentPatterns = [
          /(?:sous-groupe|sous-ethnie|clan|tribu)\s+(?:de|du|des|de la|du groupe)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
          /([A-Z][a-z]+)\s+(?:est un|sont des)\s+(?:sous-groupe|sous-ethnie|clan)/i,
        ];

        for (const parentPattern of parentPatterns) {
          const parentMatch = context.match(parentPattern);
          if (parentMatch) {
            parentPeople = parentMatch[1];
            break;
          }
        }

        // Détecter famille linguistique
        const flgMatch = context.match(
          /(FLG_[A-Z0-9_]+|bantou|nilotique|mandé|krou|gur)/i
        );
        if (flgMatch) {
          if (flgMatch[1].startsWith("FLG_")) {
            familyLinguistic = flgMatch[1].toUpperCase();
          } else {
            // Mapper vers FLG
            const mapping: Record<string, string> = {
              bantou: "FLG_BANTU",
              nilotique: "FLG_NILOTIQUE",
              mandé: "FLG_MANDE",
              krou: "FLG_KROU",
              gur: "FLG_GUR",
            };
            familyLinguistic =
              mapping[flgMatch[1].toLowerCase()] || "FLG_UNKNOWN";
          }
        }

        peoples.push({
          name,
          alternativeNames: [],
          type,
          parentPeople,
          familyLinguistic,
          region,
          source: `web_search: ${countryName}`,
        });
      }
    }
  }

  // Dédupliquer et nettoyer
  return deduplicatePeoples(peoples);
}

function deduplicatePeoples(peoples: RealPeople[]): RealPeople[] {
  const seen = new Set<string>();
  const result: RealPeople[] = [];

  for (const people of peoples) {
    const key = normalizePeopleName(people.name);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(people);
    }
  }

  return result;
}

// Étape 3 : Parsing des peuples documentés
function parseDocumentedPeoples(countryCode: string): {
  documentedPeoples: DocumentedPeople[];
  countryName: string;
} {
  const filePath = path.join(PAYS_ROOT, `${countryCode}.txt`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier pays non trouvé: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);
  const documentedPeoples: DocumentedPeople[] = [];
  let countryName = "";
  let inPeuplesSection = false;
  let currentPeuple: Partial<DocumentedPeople> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extraire nom du pays
    if (line.startsWith("- Nom officiel actuel :")) {
      const match = line.match(/:\s*(.+?)(?:\s*\(|$)/);
      if (match) {
        countryName = match[1].trim();
      }
    }

    // Détecter section peuples
    if (line.match(/^#\s*3\.\s*Peuples majeurs/)) {
      inPeuplesSection = true;
      continue;
    }

    if (inPeuplesSection && line.match(/^#\s*[45]\./)) {
      inPeuplesSection = false;
      if (currentPeuple && currentPeuple.name) {
        documentedPeoples.push(currentPeuple as DocumentedPeople);
      }
      currentPeuple = null;
      continue;
    }

    if (inPeuplesSection) {
      if (line.match(/^-\s*Peuple\s+\d+\s*:/)) {
        if (currentPeuple && currentPeuple.name) {
          documentedPeoples.push(currentPeuple as DocumentedPeople);
        }
        currentPeuple = {};
      }

      if (currentPeuple) {
        const nomMatch = line.match(/^\s*-\s*Nom\s*:\s*(.+)$/);
        if (nomMatch) {
          currentPeuple.name = nomMatch[1].trim();
        }

        const pplMatch = line.match(
          /^\s*-\s*Identifiant peuple \(PPL_\)\s*:\s*(.+)$/
        );
        if (pplMatch) {
          const pplId = pplMatch[1].trim();
          currentPeuple.pplId =
            pplId === "N/A" || pplId.includes("non encore documenté")
              ? "N/A"
              : pplId;
        }

        const flgMatch = line.match(/^\s*-\s*Famille linguistique\s*:\s*(.+)$/);
        if (flgMatch) {
          const flgText = flgMatch[1].trim();
          const flgIdMatch = flgText.match(/(FLG_[A-Z0-9_]+)/);
          if (flgIdMatch) {
            currentPeuple.familyLinguistic = flgIdMatch[1];
          } else {
            currentPeuple.familyLinguistic = flgText;
          }
        }

        const langMatch = line.match(/^\s*-\s*Langues parlées\s*:\s*(.+)$/);
        if (langMatch) {
          const isoMatch = langMatch[1].match(/\(([a-z]{3}),\s*ISO\s*639-3\)/);
          if (isoMatch) {
            currentPeuple.iso6393 = isoMatch[1];
          }
        }

        const regionMatch = line.match(/^\s*-\s*Région principale\s*:\s*(.+)$/);
        if (regionMatch) {
          currentPeuple.region = regionMatch[1].trim();
        }

        const autoMatch = line.match(
          /^\s*-\s*Auto-appellation \(endonyme\)\s*:\s*(.+)$/
        );
        if (autoMatch) {
          currentPeuple.autoAppellation = autoMatch[1].trim();
        }

        const exoMatch = line.match(
          /^\s*-\s*Exonymes \/ appellations historiques\s*:\s*(.+)$/
        );
        if (exoMatch) {
          currentPeuple.exonymes = exoMatch[1].trim();
        }
      }
    }
  }

  if (currentPeuple && currentPeuple.name) {
    documentedPeoples.push(currentPeuple as DocumentedPeople);
  }

  return { documentedPeoples, countryName: countryName || countryCode };
}

// Étape 4 : Vérification des fiches existantes
function checkExistingPeopleFiles(): Map<
  string,
  { filePath: string; pplId: string }
> {
  const mapping = new Map<string, { filePath: string; pplId: string }>();

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        entry.isFile() &&
        entry.name.startsWith("PPL_") &&
        entry.name.endsWith(".txt")
      ) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split(/\r?\n/);

          let pplId = "";
          let name = "";

          for (const line of lines) {
            const idMatch = line.match(
              /^- Identifiant peuple \(ID\)\s*:\s*(.+)$/
            );
            if (idMatch) {
              pplId = idMatch[1].trim();
            }

            const nomMatch = line.match(
              /^- Nom principal du peuple\s*:\s*(.+)$/
            );
            if (nomMatch) {
              name = nomMatch[1].trim();
            }
          }

          if (!pplId) {
            pplId = entry.name.replace(".txt", "");
          }

          if (name) {
            const normalized = normalizePeopleName(name);
            mapping.set(normalized, { filePath: fullPath, pplId });
          }
        } catch (e) {
          // Ignorer erreurs
        }
      }
    }
  }

  walk(PEUPLES_ROOT);
  return mapping;
}

function normalizePeopleName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Étape 5 : Identification des peuples manquants
function identifyMissingPeoples(
  realPeoples: RealPeople[],
  documentedPeoples: DocumentedPeople[],
  existingFiles: Map<string, { filePath: string; pplId: string }>,
  countryCode: string
): MissingPeople[] {
  const missing: MissingPeople[] = [];
  const documentedNames = new Set(
    documentedPeoples.map((p) => normalizePeopleName(p.name))
  );

  for (const real of realPeoples) {
    const normalized = normalizePeopleName(real.name);

    // Vérifier si déjà documenté
    if (documentedNames.has(normalized)) {
      continue;
    }

    // Vérifier si fichier existe
    const existing = existingFiles.get(normalized);
    if (existing) {
      continue;
    }

    // Chercher parent ID si parent existe
    let parentId: string | undefined;
    if (real.parentPeople) {
      const parentNormalized = normalizePeopleName(real.parentPeople);
      const parentFile = existingFiles.get(parentNormalized);
      if (parentFile) {
        parentId = parentFile.pplId;
      }
    }

    // Générer PPL_ID
    const pplId = generatePeopleId(real.name);

    missing.push({
      name: real.name,
      type: real.type,
      suggestedPplId: pplId,
      parentId,
      parentName: real.parentPeople,
      familyLinguistic: real.familyLinguistic || "FLG_UNKNOWN",
      needsCreation: true,
      alternativeNames: real.alternativeNames,
      region: real.region,
    });
  }

  return missing;
}

function generatePeopleId(peopleName: string): string {
  const normalized = peopleName
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return `PPL_${normalized}`;
}

// Étape 6 : Résumé avant création
function displaySummary(
  countryCode: string,
  countryName: string,
  realPeoples: RealPeople[],
  documentedPeoples: DocumentedPeople[],
  missingPeoples: MissingPeople[]
): void {
  console.log(`\n${"=".repeat(70)}`);
  console.log(
    `=== RÉSUMÉ POUR ${countryName.toUpperCase()} (${countryCode}) ===`
  );
  console.log(`${"=".repeat(70)}\n`);

  console.log(`Peuples réels trouvés sur internet : ${realPeoples.length}`);
  console.log(
    `Peuples documentés dans fiche pays : ${documentedPeoples.length}`
  );
  console.log(`Peuples manquants à créer : ${missingPeoples.length}\n`);

  if (missingPeoples.length > 0) {
    console.log(`Liste des peuples manquants :\n`);
    for (let i = 0; i < missingPeoples.length; i++) {
      const missing = missingPeoples[i];
      let line = `${i + 1}. ${missing.name} (type: ${missing.type})`;
      if (missing.parentName) {
        line += ` [parent: ${missing.parentName}${missing.parentId ? ` (${missing.parentId})` : ""}]`;
      }
      console.log(`   ${line}`);
    }
  } else {
    console.log(`✓ Tous les peuples réels sont déjà documentés !\n`);
  }

  console.log(`${"=".repeat(70)}\n`);
}

// Étape 7 : Enrichissement des données (via web_search)
// NOTE: Cette fonction doit être appelée par l'agent avec web_search
async function enrichPeopleData(
  peopleName: string,
  countryName: string,
  parentName?: string
): Promise<EnrichedPeopleData | null> {
  const cachePath = path.join(
    LOGS_ROOT,
    "_cache_enrichis",
    `${generatePeopleId(peopleName)}.json`
  );

  // Charger depuis cache si existe
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
      console.log(`  ✓ Cache enrichi chargé pour ${peopleName}`);
      return cached as EnrichedPeopleData;
    } catch (e) {
      // Ignorer erreur
    }
  }

  // Requêtes de recherche
  const queries = [
    `${peopleName} origines migrations appellations ${countryName}`,
    `${peopleName} ${countryName} histoire culture`,
    `${peopleName} langue ISO 639-3`,
  ];

  console.log(`  🔍 Enrichissement: ${peopleName}...`);
  console.log(`    Requêtes: ${queries.join(", ")}`);

  // NOTE: web_search doit être appelé par l'agent
  // L'agent doit appeler web_search pour chaque requête et utiliser setEnrichmentResults()
  return null;
}

// Fonction helper pour sauvegarder les résultats d'enrichissement (appelée par l'agent)
export function setEnrichmentResults(
  peopleName: string,
  searchResults: string[]
): EnrichedPeopleData | null {
  // Parser les résultats pour extraire les données
  const fullText = searchResults.join("\n");

  // Extraire informations de base
  const data: EnrichedPeopleData = {
    nomPrincipal: peopleName,
    autoAppellation: peopleName,
    exonymes: [],
    familleLinguistique: "FLG_UNKNOWN",
    regionHistorique: "N/A",
    paysActuels: [],
    langues: [],
    origines: "N/A",
    migrations: "N/A",
    organisation: "N/A",
    culture: "N/A",
    demographie: {
      total: 0,
      parPays: {},
      annee: 2025,
      source: "Recherche web",
    },
    sources: ["Recherche web"],
  };

  // Parser auto-appellation
  const autoMatch = fullText.match(
    /(?:auto-appellation|endonyme|se nomment|s'appellent)[\s:]+([A-Z][a-z]+)/i
  );
  if (autoMatch) {
    data.autoAppellation = autoMatch[1];
  }

  // Parser langue ISO 639-3
  const isoMatch = fullText.match(/ISO\s*639-3[:\s]+([a-z]{3})/i);
  if (isoMatch) {
    const langName =
      fullText.match(/([A-Z][a-z]+)\s+\([a-z]{3}\)/)?.[1] || peopleName;
    data.langues.push({ nom: langName, iso6393: isoMatch[1] });
  }

  // Parser famille linguistique
  const flgMatch = fullText.match(/(FLG_[A-Z0-9_]+|bantou|nilotique|mandé)/i);
  if (flgMatch) {
    if (flgMatch[1].startsWith("FLG_")) {
      data.familleLinguistique = flgMatch[1].toUpperCase();
    } else {
      const mapping: Record<string, string> = {
        bantou: "FLG_BANTU",
        nilotique: "FLG_NILOTIQUE",
        mandé: "FLG_MANDE",
      };
      data.familleLinguistique =
        mapping[flgMatch[1].toLowerCase()] || "FLG_UNKNOWN";
    }
  }

  // Extraire origines (chercher sections sur origines)
  const originesMatch = fullText.match(
    /(?:origines?|origine)[\s:]+(.{100,500})/i
  );
  if (originesMatch) {
    data.origines = originesMatch[1].substring(0, 500).trim();
  }

  // Sauvegarder dans cache
  const cacheDir = path.join(LOGS_ROOT, "_cache_enrichis");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const cachePath = path.join(cacheDir, `${generatePeopleId(peopleName)}.json`);
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), "utf-8");

  return data;
}

// Étape 8 : Création des fiches peuples
function loadPeopleTemplate(): string {
  if (!fs.existsSync(MODELE_PEUPLE)) {
    throw new Error(`Modèle non trouvé: ${MODELE_PEUPLE}`);
  }
  return fs.readFileSync(MODELE_PEUPLE, "utf-8");
}

function fillPeopleTemplate(
  template: string,
  data: EnrichedPeopleData,
  pplId: string
): string {
  let result = template;

  // Section 0: Informations de base
  result = result.replace(
    /- Nom principal du peuple\s*:/,
    `- Nom principal du peuple : ${data.nomPrincipal || "N/A"}`
  );
  result = result.replace(
    /- Auto-appellation \(endonyme\)\s*:/,
    `- Auto-appellation (endonyme) : ${data.autoAppellation || "N/A"}`
  );
  result = result.replace(
    /- Exonymes \/ appellations historiques\s*:/,
    `- Exonymes / appellations historiques : ${data.exonymes.join(", ") || "N/A"}`
  );
  result = result.replace(
    /- Origine des termes \(exonymes\)\s*:/,
    `- Origine des termes (exonymes) : ${data.origineTermes || "N/A"}`
  );
  result = result.replace(
    /- Pourquoi certains termes posent problème/,
    `- Pourquoi certains termes posent problème (si applicable) : ${data.termesProblematiques || "N/A"}`
  );
  result = result.replace(
    /- Usage contemporain des appellations\s*:/,
    `- Usage contemporain des appellations : N/A`
  );
  result = result.replace(
    /- Famille linguistique principale\s*:/,
    `- Famille linguistique principale : ${data.familleLinguistique || "N/A"}`
  );
  result = result.replace(
    /- Groupe ethno-linguistique\s*:/,
    `- Groupe ethno-linguistique : ${data.groupeEthnoLinguistique || "N/A"}`
  );
  result = result.replace(
    /- Région historique\s*:/,
    `- Région historique : ${data.regionHistorique || "N/A"}`
  );

  const paysActuelsText = Array.isArray(data.paysActuels)
    ? data.paysActuels.join(", ")
    : typeof data.paysActuels === "string"
      ? data.paysActuels
      : "N/A";
  result = result.replace(
    /- Pays actuels\s*:/,
    `- Pays actuels : ${paysActuelsText}`
  );
  result = result.replace(
    /- Identifiant peuple \(ID\)\s*:/,
    `- Identifiant peuple (ID) : ${pplId}`
  );

  // Section 1: Ethnies incluses (si parent, mentionner)
  if (data.parentId) {
    result = result.replace(
      /- Ethnie 1\s*:/,
      `- Ethnie 1 : ${data.nomPrincipal} (sous-groupe de ${data.parentId})`
    );
  } else {
    result = result.replace(
      /- Ethnie 1\s*:/,
      `- Ethnie 1 : ${data.nomPrincipal || "N/A"}`
    );
  }
  result = result.replace(/- Ethnie 2\s*:/, `- Ethnie 2 : N/A`);
  result = result.replace(/- Ethnie 3\s*:/, `- Ethnie 3 : N/A`);

  // Section 2: Origines
  result = result.replace(
    /- Origines anciennes[^:]*:/,
    `- Origines anciennes (théories archéologiques, linguistiques, génétiques) : ${data.origines || "N/A"}`
  );
  result = result.replace(
    /- Période de formation estimée\s*:/,
    `- Période de formation estimée : N/A`
  );
  result = result.replace(
    /- Routes migratoires principales\s*:/,
    `- Routes migratoires principales : ${data.migrations || "N/A"}`
  );
  result = result.replace(
    /- Zones d'établissement historiques\s*:/,
    `- Zones d'établissement historiques : ${data.regionHistorique || "N/A"}`
  );
  result = result.replace(
    /- Unifications \/ divisions\s*:/,
    `- Unifications / divisions : N/A`
  );
  result = result.replace(
    /- Influences externes[^:]*:/,
    `- Influences externes (peuples voisins, colonisation, commerce) : N/A`
  );
  result = result.replace(
    /- Événements historiques majeurs[^:]*:/,
    `- Événements historiques majeurs ayant façonné le peuple : N/A`
  );

  // Section 3: Organisation
  result = result.replace(
    /- Système politique traditionnel\s*:/,
    `- Système politique traditionnel : ${data.organisation || "N/A"}`
  );
  result = result.replace(
    /- Organisation clanique\s*:/,
    `- Organisation clanique : N/A`
  );
  result = result.replace(
    /- Rôle des lignages\s*:/,
    `- Rôle des lignages : N/A`
  );
  result = result.replace(
    /- Autorité religieuse\s*:/,
    `- Autorité religieuse : N/A`
  );

  // Section 4: Langues
  const languesText =
    data.langues.length > 0
      ? data.langues.map((l) => `${l.nom} (${l.iso6393})`).join(", ")
      : "N/A";
  result = result.replace(
    /- Langue principale\s*:/,
    `- Langue principale : ${languesText}`
  );
  result = result.replace(
    /- Codes ISO\s*:/,
    `- Codes ISO : ${data.langues.map((l) => l.iso6393).join(", ") || "N/A"}`
  );
  result = result.replace(/- Dialectes\s*:/, `- Dialectes : N/A`);
  result = result.replace(/- Rôle véhiculaire\s*:/, `- Rôle véhiculaire : N/A`);

  // Section 5: Culture
  result = result.replace(
    /- Rites majeurs\s*:/,
    `- Rites majeurs : ${data.culture || "N/A"}`
  );
  result = result.replace(/- Symboles\s*:/, `- Symboles : N/A`);
  result = result.replace(/- Arts et musique\s*:/, `- Arts et musique : N/A`);
  result = result.replace(/- Spiritualités\s*:/, `- Spiritualités : N/A`);

  // Section 6: Rôle historique
  result = result.replace(
    /- Royaumes \/ chefferies\s*:/,
    `- Royaumes / chefferies : ${data.royaumes || "N/A"}`
  );
  result = result.replace(
    /- Relations avec peuples voisins\s*:/,
    `- Relations avec peuples voisins : N/A`
  );
  result = result.replace(
    /- Conflits \/ alliances\s*:/,
    `- Conflits / alliances : N/A`
  );
  result = result.replace(/- Diaspora\s*:/, `- Diaspora : N/A`);

  // Section 7: Démographie
  const demTotal = data.demographie?.total || 0;
  const demParPays = data.demographie?.parPays
    ? Object.entries(data.demographie.parPays)
        .map(([pays, pop]) => `${pays}: ${pop.toLocaleString()}`)
        .join("; ")
    : "N/A";
  result = result.replace(
    /- Population totale \(tous pays\)\s*:/,
    `- Population totale (tous pays) : ${demTotal.toLocaleString() || "N/A"}`
  );
  result = result.replace(
    /- Répartition par pays\s*:/,
    `- Répartition par pays : ${demParPays}`
  );
  result = result.replace(
    /- Année de référence\s*:/,
    `- Année de référence : ${data.demographie?.annee || 2025}`
  );
  result = result.replace(
    /- Source\s*:/,
    `- Source : ${data.demographie?.source || data.sources.join("; ") || "N/A"}`
  );

  // Section 8: Sources
  const sourcesText =
    data.sources.length > 0
      ? data.sources.map((s) => `- ${s}`).join("\n")
      : "- N/A";
  result = result.replace(
    /# 8\. Sources\n- \[Titre\] – \[Auteur\/URL\]/,
    `# 8. Sources\n${sourcesText}`
  );

  return result;
}

async function createPeopleFile(
  people: MissingPeople,
  enrichedData: EnrichedPeopleData | null,
  config: Config,
  countryCode: string
): Promise<string | null> {
  if (config.dryRun) {
    console.log(`  [DRY-RUN] Créerait: ${people.suggestedPplId}.txt`);
    return null;
  }

  // Vérifier si fichier existe déjà (ne jamais écraser)
  const flgDir = path.join(PEUPLES_ROOT, people.familyLinguistic);
  if (!fs.existsSync(flgDir)) {
    fs.mkdirSync(flgDir, { recursive: true });
  }

  const filePath = path.join(flgDir, `${people.suggestedPplId}.txt`);

  if (fs.existsSync(filePath)) {
    console.log(`  ⏸ Fichier existe déjà: ${filePath}, skip`);
    return filePath;
  }

  // Charger modèle
  const template = loadPeopleTemplate();

  // Préparer données
  let data: EnrichedPeopleData;
  if (enrichedData) {
    data = enrichedData;
  } else {
    // Données minimales
    data = {
      nomPrincipal: people.name,
      autoAppellation: people.name,
      exonymes: people.alternativeNames,
      familleLinguistique: people.familyLinguistic,
      regionHistorique: people.region || "N/A",
      paysActuels: [countryCode],
      langues: [],
      origines: "N/A",
      migrations: "N/A",
      organisation: "N/A",
      culture: "N/A",
      demographie: { total: 0, parPays: {}, annee: 2025, source: "N/A" },
      sources: ["Recherche web"],
      parentId: people.parentId,
    };
  }

  // Remplir template
  const content = fillPeopleTemplate(template, data, people.suggestedPplId);

  // Sauvegarder
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`  ✓ Fichier créé: ${filePath}`);

  // Si parent existe, mettre à jour fiche parent
  if (people.parentId) {
    await updateParentFile(people.parentId, people.name, people.suggestedPplId);
  }

  return filePath;
}

// Mettre à jour fiche parent pour ajouter enfant
async function updateParentFile(
  parentId: string,
  childName: string,
  childId: string
): Promise<void> {
  // Trouver fichier parent
  const parentFiles = checkExistingPeopleFiles();
  let parentFilePath: string | null = null;

  for (const [_, info] of parentFiles) {
    if (info.pplId === parentId) {
      parentFilePath = info.filePath;
      break;
    }
  }

  if (!parentFilePath || !fs.existsSync(parentFilePath)) {
    console.log(`  ⚠ Fichier parent ${parentId} non trouvé, skip mise à jour`);
    return;
  }

  // Lire fichier parent
  let content = fs.readFileSync(parentFilePath, "utf-8");
  const lines = content.split(/\r?\n/);

  // Chercher section "1. Ethnies incluses"
  let inEthniesSection = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^#\s*1\.\s*Ethnies incluses/)) {
      inEthniesSection = true;
      continue;
    }
    if (inEthniesSection && lines[i].match(/^#\s*\d+\./)) {
      break;
    }

    // Chercher première ligne "Ethnie X : N/A"
    if (inEthniesSection && lines[i].match(/^-\s*Ethnie\s+\d+\s*:\s*N\/A/)) {
      lines[i] = lines[i].replace(/N\/A/, `${childName} (${childId})`);
      content = lines.join("\n");
      fs.writeFileSync(parentFilePath, content, "utf-8");
      console.log(`  ✓ Fiche parent ${parentId} mise à jour avec ${childName}`);
      break;
    }
  }
}

// Étape 9 : Mise à jour fiche pays (optionnel, ajouter nouveaux peuples)
async function updateCountryFile(
  countryCode: string,
  newPeoples: MissingPeople[],
  config: Config
): Promise<void> {
  if (config.dryRun || newPeoples.length === 0) {
    return;
  }

  // Pour l'instant, on ne modifie pas automatiquement les fiches pays
  // L'utilisateur peut le faire manuellement si nécessaire
  console.log(
    `  ℹ ${newPeoples.length} nouveau(x) peuple(x) créé(s) - fiche pays non modifiée automatiquement`
  );
}

// Étape 10 : Mise à jour CSV de suivi
function updateTrackingCSV(
  countryCode: string,
  newCount: number,
  status: string
): void {
  const countries = readTrackingCSV();
  const country = countries.find((c) => c.code === countryCode);

  if (country) {
    country.peuplesDocumentes = newCount;
    country.statut = status;

    // Recalculer couverture si peuples réels connus
    if (country.peuplesReels && country.peuplesReels !== "?") {
      const realNum = parseInt(country.peuplesReels.replace("+", "")) || 0;
      if (realNum > 0) {
        const coverage = (newCount / realNum) * 100;
        country.couverture = `${Math.round(coverage * 10) / 10}%`;
      }
    }
  }

  // Réécrire CSV
  const lines = [
    "code_pays,nom_pays,peuples_reels_estimes,peuples_documentes,couverture_pourcent,peuples_a_creer,priorite,statut",
  ];

  for (const c of countries) {
    lines.push(
      `${c.code},${c.nom},${c.peuplesReels},${c.peuplesDocumentes},${c.couverture},${c.peuplesACreer},${c.priorite},${c.statut}`
    );
  }

  fs.writeFileSync(TRACKING_CSV, lines.join("\n") + "\n", "utf-8");
}

// Fonction principale pour un pays
async function syncCountry(countryCode: string, config: Config): Promise<void> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`=== SYNCHRONISATION : ${countryCode} ===`);
  console.log(`${"=".repeat(70)}\n`);

  try {
    // Mettre à jour statut
    updateTrackingCSV(countryCode, 0, "🔄 En cours");

    // Étape 1: Parser peuples documentés
    console.log("Étape 1: Parsing peuples documentés...");
    const { documentedPeoples, countryName } =
      parseDocumentedPeoples(countryCode);
    console.log(`  ✓ ${documentedPeoples.length} peuples documentés trouvés\n`);

    // Étape 2: Recherche web peuples réels
    console.log("Étape 2: Recherche web peuples réels...");
    const realPeoples = await searchAllPeoplesForCountry(
      countryCode,
      countryName,
      config.force
    );

    if (realPeoples.length === 0) {
      console.log(
        `  ⚠ Aucun peuple trouvé - nécessite recherche web via agent\n`
      );
      console.log(
        `  → L'agent doit appeler web_search avec les requêtes listées ci-dessus\n`
      );
      return;
    }

    console.log(`  ✓ ${realPeoples.length} peuples réels trouvés\n`);

    // Étape 3: Vérifier fiches existantes
    console.log("Étape 3: Vérification fiches existantes...");
    const existingFiles = checkExistingPeopleFiles();
    console.log(`  ✓ ${existingFiles.size} fiches peuples existantes\n`);

    // Étape 4: Identifier peuples manquants
    console.log("Étape 4: Identification peuples manquants...");
    const missingPeoples = identifyMissingPeoples(
      realPeoples,
      documentedPeoples,
      existingFiles,
      countryCode
    );
    console.log(`  ✓ ${missingPeoples.length} peuples manquants identifiés\n`);

    // Étape 5: Afficher résumé
    displaySummary(
      countryCode,
      countryName,
      realPeoples,
      documentedPeoples,
      missingPeoples
    );

    // Mode interactif : demander validation
    if (config.interactive && missingPeoples.length > 0) {
      console.log(`\n⚠ Mode interactif activé - création suspendue`);
      console.log(`  Utilisez --dry-run pour voir ce qui serait créé`);
      return;
    }

    // Étape 6: Enrichir et créer fiches
    if (missingPeoples.length > 0 && !config.dryRun) {
      console.log("Étape 6: Enrichissement et création des fiches...\n");

      // Trier : créer d'abord les parents, puis les enfants
      const parents = missingPeoples.filter((p) => !p.parentId);
      const children = missingPeoples.filter((p) => p.parentId);
      const ordered = [...parents, ...children];

      for (const missing of ordered) {
        console.log(
          `  Traitement: ${missing.name} (${missing.suggestedPplId})`
        );
        if (missing.parentName) {
          console.log(
            `    Parent: ${missing.parentName}${missing.parentId ? ` (${missing.parentId})` : ""}`
          );
        }

        const enrichedData = await enrichPeopleData(
          missing.name,
          countryName,
          missing.parentName
        );
        if (enrichedData && !enrichedData.paysActuels.includes(countryCode)) {
          enrichedData.paysActuels.push(countryCode);
        }
        await createPeopleFile(missing, enrichedData, config, countryCode);

        // Pause entre peuples pour éviter surcharge
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Mettre à jour CSV
    const finalCount = documentedPeoples.length + missingPeoples.length;
    updateTrackingCSV(countryCode, finalCount, "✅ Terminé");

    console.log(`\n✓ Synchronisation terminée pour ${countryCode}\n`);
  } catch (e) {
    console.error(`\n✗ Erreur pour ${countryCode}: ${e}\n`);
    updateTrackingCSV(countryCode, 0, "❌ Erreur");
    throw e;
  }
}

// Main
async function main() {
  const config = parseArgs();

  console.log("=== Script de synchronisation peuples avec recherche web ===\n");
  console.log("Configuration:");
  console.log(`  - Pays: ${config.country || "Tous"}`);
  console.log(`  - Force: ${config.force}`);
  console.log(`  - Dry-run: ${config.dryRun}`);
  console.log(`  - Interactive: ${config.interactive}\n`);

  // Créer dossiers si nécessaire
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  if (config.country) {
    // Mode single
    await syncCountry(config.country, config);
  } else if (config.all || config.priority) {
    // Mode batch
    const countries = readTrackingCSV();
    let filtered = countries;

    if (config.priority) {
      filtered = countries.filter((c) => c.priorite === config.priority);
    }

    // Trier par priorité
    const priorityOrder = { CRITIQUE: 0, HAUTE: 1, MOYENNE: 2, FAIBLE: 3 };
    filtered.sort((a, b) => {
      const aPrio =
        priorityOrder[a.priorite as keyof typeof priorityOrder] || 3;
      const bPrio =
        priorityOrder[b.priorite as keyof typeof priorityOrder] || 3;
      return aPrio - bPrio;
    });

    console.log(`Traitement de ${filtered.length} pays...\n`);

    for (const country of filtered) {
      await syncCountry(country.code, config);

      // Pause entre pays
      if (filtered.indexOf(country) < filtered.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  } else {
    console.log(
      "⚠ Spécifier --country [CODE], --all, ou --priority [PRIORITY]"
    );
  }
}

main().catch(console.error);
