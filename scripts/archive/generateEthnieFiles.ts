import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const ETHNIES_ROOT = path.join(ROOT, "dataset", "source", "afrik", "ethnies");
const PEUPLES_ROOT = path.join(ROOT, "dataset", "source", "afrik", "peuples");
const REFERENTIEL_PATH = path.join(ETHNIES_ROOT, "_referentiel_ethnies.csv");
const MODELE_ETHNIE_PATH = path.join(ROOT, "public", "modele-ethnie.txt");

interface ReferentielRow {
  PPL_ID: string;
  FLG_ID: string;
  ethnie_label_brut: string;
  source_index: boolean;
  source_inventaire: boolean;
  source_ppl_ethnies: boolean;
  source_labels: string;
  ETH_ID_proposé: string;
  fichier_ETH_existant: string;
  statut_generation: "existant" | "manquant" | "a_verifier";
  niveau: "ethnie_certaine" | "sous_ethnie_ou_clan" | "macro_ou_agrégat";
  notes_convergence: string;
}

interface PeupleMeta {
  id: string;
  nomPrincipal: string;
  familleId: string; // FLG_xxx
  familleLabel: string;
  langue: string;
  iso6393: string;
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

function parseCsvReferentiel(): ReferentielRow[] {
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

  const rows: ReferentielRow[] = [];

  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    if (cols.length < headers.length) continue;
    const get = (name: string): string => {
      const idx = headers.indexOf(name);
      if (idx === -1) return "";
      return cols[idx] ?? "";
    };
    const boolFrom = (name: string): boolean => get(name) === "1";

    rows.push({
      PPL_ID: get("PPL_ID"),
      FLG_ID: get("FLG_ID"),
      ethnie_label_brut: get("ethnie_label_brut"),
      source_index: boolFrom("source_index"),
      source_inventaire: boolFrom("source_inventaire"),
      source_ppl_ethnies: boolFrom("source_ppl_ethnies"),
      source_labels: get("source_labels"),
      ETH_ID_proposé: get("ETH_ID_proposé"),
      fichier_ETH_existant: get("fichier_ETH_existant"),
      statut_generation: (get("statut_generation") ||
        "manquant") as ReferentielRow["statut_generation"],
      niveau: (get("niveau") || "ethnie_certaine") as ReferentielRow["niveau"],
      notes_convergence: get("notes_convergence"),
    });
  }

  return rows;
}

function buildPeuplesMeta(): Map<string, PeupleMeta> {
  const meta = new Map<string, PeupleMeta>();

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.isFile() &&
        entry.name.startsWith("PPL_") &&
        entry.name.endsWith(".txt")
      ) {
        const id = entry.name.replace(/\.txt$/, "");
        const m = parsePeupleFile(full, id);
        meta.set(id, m);
      }
    }
  }

  walk(PEUPLES_ROOT);
  return meta;
}

function parsePeupleFile(filePath: string, id: string): PeupleMeta {
  const lines = readText(filePath).split(/\r?\n/);
  let nomPrincipal = "";
  let familleId = "";
  let familleLabel = "";
  let langue = "";
  let iso6393 = "";

  for (const line of lines) {
    if (!nomPrincipal) {
      const m =
        line.match(/Nom principal du peuple\s*:\s*(.+)$/) ||
        line.match(/- Nom principal\s*:\s*(.+)$/);
      if (m) {
        nomPrincipal = m[1].trim();
      }
    }
    if (!familleId || !familleLabel) {
      const m =
        line.match(/Famille linguistique principale\s*:\s*(.+)$/) ||
        line.match(/Famille linguistique\s*:\s*(.+)$/);
      if (m) {
        const txt = m[1];
        const flg = txt.match(/(FLG_[A-Z0-9_]+)/);
        if (flg) {
          familleId = flg[1];
          familleLabel = txt.replace(flg[1], "").replace(/[()]/g, "").trim();
        } else {
          familleLabel = txt.trim();
        }
      }
    }
    if (!langue) {
      const m =
        line.match(/Langue principale\s*:\s*(.+)$/) ||
        line.match(/Langue\s*:\s*(.+)$/);
      if (m) {
        langue = m[1].trim();
      }
    }
    if (!iso6393) {
      const m = line.match(/Codes? ISO.*:\s*([a-z]{3})/);
      if (m) {
        iso6393 = m[1];
      }
    }
  }

  if (!nomPrincipal) {
    // fallback: racine PPL_
    nomPrincipal = id.replace(/^PPL_/, "");
  }

  return {
    id,
    nomPrincipal,
    familleId,
    familleLabel,
    langue,
    iso6393,
  };
}

function fillTemplateForEthnie(
  templateLines: string[],
  row: ReferentielRow,
  peupleMeta: PeupleMeta | undefined
): string {
  const lines = templateLines.slice();

  const peupleName =
    peupleMeta?.nomPrincipal || row.PPL_ID.replace(/^PPL_/, "");
  const familleId = row.FLG_ID || peupleMeta?.familleId || "N/A";
  const familleLabel = peupleMeta?.familleLabel || "N/A";
  const langue = peupleMeta?.langue || "N/A";
  const iso = peupleMeta?.iso6393 || "N/A";

  // Le modèle est stable : on remplace directement les premières lignes de méta-données.
  if (lines.length >= 12) {
    lines[1] = `- Nom principal : ${row.ethnie_label_brut}`;
    lines[2] = `- Identifiant ethnie (ID) : ${row.ETH_ID_proposé}`;
    lines[3] = "- Auto-appellation : N/A";
    lines[4] =
      "- Exonymes et termes coloniaux (connotation, origine, contextualisation) : N/A";
    lines[5] = `- Peuple d’appartenance : ${peupleName}`;
    lines[6] = `- Identifiant peuple (ID) : ${row.PPL_ID}`;
    lines[7] = `- Langue parlée : ${langue}`;
    lines[8] = `- Code ISO 639-3 : ${iso}`;
    lines[9] = `- Famille linguistique : ${familleLabel}`;
    lines[10] = `- Identifiant famille linguistique (FLG) : ${familleId}`;
  }

  // Remplir tous les autres champs vides avec N/A
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*-\s+[^:]+:\s*)$/);
    if (m) {
      lines[i] = `${m[1]}N/A`;
    }
  }

  return lines.join("\n");
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function main() {
  const referentiel = parseCsvReferentiel();
  const peuplesMeta = buildPeuplesMeta();
  const templateLines = readText(MODELE_ETHNIE_PATH).split(/\r?\n/);

  let created = 0;

  for (const row of referentiel) {
    if (row.niveau !== "ethnie_certaine") continue;
    if (!row.ETH_ID_proposé) continue;
    if (!row.PPL_ID) continue;

    const pplDir = path.join(ETHNIES_ROOT, row.PPL_ID);
    ensureDir(pplDir);
    const targetPath = path.join(pplDir, `${row.ETH_ID_proposé}.txt`);

    const peupleMeta = peuplesMeta.get(row.PPL_ID);
    const content = fillTemplateForEthnie(templateLines, row, peupleMeta);
    fs.writeFileSync(targetPath, content, "utf-8");
    created++;
  }

  console.log(
    `Génération des fiches ethnies terminée. Fichiers créés ou régénérés : ${created}.`
  );
}

main();
