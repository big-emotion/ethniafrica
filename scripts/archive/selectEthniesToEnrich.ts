import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const ETHNIES_ROOT = path.join(ROOT, "dataset", "source", "afrik", "ethnies");
const REFERENTIEL_PATH = path.join(ETHNIES_ROOT, "_referentiel_ethnies.csv");
const OUTPUT_PATH = path.join(ETHNIES_ROOT, "_ethnies_a_enrichir.csv");

type Niveau =
  | "ethnie_certaine"
  | "sous_ethnie_ou_clan"
  | "macro_ou_agrégat"
  | string;

interface Row {
  PPL_ID: string;
  FLG_ID: string;
  ethnie_label_brut: string;
  ETH_ID_proposé: string;
  niveau: Niveau;
}

const ETHNIES_PHARES = new Set<string>([
  "ETH_LUBA",
  "ETH_MONGO",
  "ETH_KONGO",
  "ETH_YOMBE",
  "ETH_VILI",
  "ETH_FANG",
  "ETH_EWONDO",
  "ETH_BAMILEKE_BAF",
  "ETH_SHONA",
  "ETH_ZULU",
  "ETH_XHOSA",
  "ETH_EWE",
  "ETH_IGBO",
  "ETH_YORUBA",
  "ETH_TUAREG_KEL_AIR",
  "ETH_MASAAI",
  "ETH_DINKA",
  "ETH_OROMO",
  "ETH_SOMALI",
]);

function readText(p: string): string {
  return fs.readFileSync(p, "utf-8");
}

function parseCsvReferentiel(): Row[] {
  const content = readText(REFERENTIEL_PATH);
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

  const rows: Row[] = [];

  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    if (cols.length < headers.length) continue;

    const get = (name: string): string => {
      const idx = headers.indexOf(name);
      if (idx === -1) return "";
      return cols[idx] ?? "";
    };

    rows.push({
      PPL_ID: get("PPL_ID"),
      FLG_ID: get("FLG_ID"),
      ethnie_label_brut: get("ethnie_label_brut"),
      ETH_ID_proposé: get("ETH_ID_proposé"),
      niveau: (get("niveau") || "") as Niveau,
    });
  }

  return rows;
}

function main() {
  const all = parseCsvReferentiel();

  const filtered = all.filter(
    (r) => r.niveau === "ethnie_certaine" && r.ETH_ID_proposé
  );

  const header = [
    "ETH_ID",
    "PPL_ID",
    "FLG_ID",
    "nom_ethnie",
    "fichier_ETH_canonique",
    "priorite",
  ];
  const lines = [header.join(",")];

  for (const r of filtered) {
    const ethId = r.ETH_ID_proposé;
    const pplId = r.PPL_ID;
    const flgId = r.FLG_ID;
    const nom = r.ethnie_label_brut.replace(/"/g, '""');
    const fichierCanonique = path
      .join("dataset", "source", "afrik", "ethnies", pplId, `${ethId}.txt`)
      .replace(/\\/g, "/");
    const priorite = ETHNIES_PHARES.has(ethId) ? "phare" : "normal";

    const row = [
      ethId,
      pplId,
      flgId,
      nom.includes(",") ? `"${nom}"` : nom,
      fichierCanonique,
      priorite,
    ];
    lines.push(row.join(","));
  }

  fs.writeFileSync(OUTPUT_PATH, lines.join("\n"), "utf-8");

  console.log(
    `Liste des ethnies à enrichir écrite dans ${path.relative(
      ROOT,
      OUTPUT_PATH
    )} (${filtered.length} entrées).`
  );
}

main();
