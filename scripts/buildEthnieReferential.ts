import * as fs from "fs";
import * as path from "path";
import { normalizeToKey } from "../src/lib/normalize";

type NiveauEthnie =
  | "ethnie_certaine"
  | "sous_ethnie_ou_clan"
  | "macro_ou_agrégat";

interface EthnieSourceRecord {
  PPL_ID: string;
  FLG_ID: string;
  ethnie_label_brut: string;
  source_index: boolean;
  source_inventaire: boolean;
  source_ppl_ethnies: boolean;
  source_labels: string; // concat des labels par source
  ETH_ID_proposé: string;
  fichier_ETH_existant: string | "";
  statut_generation: "existant" | "manquant" | "a_verifier";
  niveau: NiveauEthnie;
  notes_convergence: string;
}

const ROOT = process.cwd();
const ETHNIES_ROOT = path.join(ROOT, "dataset", "source", "afrik", "ethnies");
const PEUPLES_ROOT = path.join(ROOT, "dataset", "source", "afrik", "peuples");
const REFERENTIEL_PATH = path.join(ETHNIES_ROOT, "_referentiel_ethnies.csv");

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

function slugEthnieLabel(label: string): string {
  // Construit la partie SLUG_DU_NOM_ETHNIE à partir du label brut.
  const ascii = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const replaced = ascii
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return replaced.toUpperCase();
}

function normalizeLabelForKey(label: string): string {
  return normalizeToKey(label.toLowerCase());
}

function parseIndexFile(): EthnieSourceRecord[] {
  const indexPath = path.join(ETHNIES_ROOT, "_index_peuples_ethnies.txt");
  const content = readText(indexPath).split(/\r?\n/);

  const records: EthnieSourceRecord[] = [];
  let currentPPL: string | null = null;
  let currentFLG: string | null = null;

  for (const line of content) {
    const headerMatch = line.match(
      /^##\s+(PPL_[A-Z0-9_]+)\s+—\s+(FLG_[A-Z0-9_]+)/
    );
    if (headerMatch) {
      currentPPL = headerMatch[1];
      currentFLG = headerMatch[2];
      continue;
    }
    if (!currentPPL || !currentFLG) continue;
    const ethLineMatch = line.match(/^- (.+)$/);
    if (ethLineMatch) {
      const label = ethLineMatch[1].trim();
      if (!label) continue;
      records.push({
        PPL_ID: currentPPL,
        FLG_ID: currentFLG,
        ethnie_label_brut: label,
        source_index: true,
        source_inventaire: false,
        source_ppl_ethnies: false,
        source_labels: label,
        ETH_ID_proposé: "",
        fichier_ETH_existant: "",
        statut_generation: "manquant",
        niveau: "ethnie_certaine",
        notes_convergence: "",
      });
    }
  }

  return records;
}

function parseInventaireFile(existing: EthnieSourceRecord[]): void {
  const inventairePath = path.join(ETHNIES_ROOT, "_inventaire_initial.txt");
  const content = readText(inventairePath).split(/\r?\n/);

  let currentPPL: string | null = null;
  let currentFLG: string | null = null;

  for (const line of content) {
    const headerMatch = line.match(
      /^##\s+(PPL_[A-Z0-9_]+)\s+\((FLG_[A-Z0-9_]+)\)/
    );
    if (headerMatch) {
      currentPPL = headerMatch[1];
      currentFLG = headerMatch[2];
      continue;
    }
    if (!currentPPL || !currentFLG) continue;
    const ethLineMatch = line.match(/^- Ethnie\s+\d+:\s*(.+)$/);
    if (ethLineMatch) {
      const label = ethLineMatch[1].trim();
      if (!label) continue;
      upsertEthnieRecord(
        existing,
        currentPPL,
        currentFLG,
        label,
        "inventaire_initial"
      );
    }
  }
}

function parsePplEthniesFiles(existing: EthnieSourceRecord[]): void {
  const entries = fs.readdirSync(ETHNIES_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith("PPL_")) continue;
    const dirPath = path.join(ETHNIES_ROOT, entry.name);
    const files = fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith("_ethnies.txt"));
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const lines = readText(fullPath).split(/\r?\n/);
      let currentPPL: string | null = null;
      let currentFLG: string | null = null;

      for (const line of lines) {
        if (line.startsWith("# Peuple")) {
          const m = line.match(/PPL_([A-Z0-9_]+)/);
          if (m) currentPPL = `PPL_${m[1]}`;
        }
        if (line.startsWith("- Famille linguistique")) {
          const flg = line.match(/(FLG_[A-Z0-9_]+)/);
          if (flg) currentFLG = flg[1];
        }
        const ethMatch = line.match(/^- Ethnie\s*:\s*(.+)$/);
        if (ethMatch && currentPPL) {
          const label = ethMatch[1].trim();
          if (!label) continue;
          upsertEthnieRecord(
            existing,
            currentPPL,
            currentFLG ?? "",
            label,
            "ppl_ethnies"
          );
        }
      }
    }
  }
}

function upsertEthnieRecord(
  records: EthnieSourceRecord[],
  PPL_ID: string,
  FLG_ID: string,
  label: string,
  source: "inventaire_initial" | "ppl_ethnies"
): void {
  const key = `${PPL_ID}|${normalizeLabelForKey(label)}`;
  let rec = records.find(
    (r) =>
      r.PPL_ID === PPL_ID &&
      normalizeLabelForKey(r.ethnie_label_brut) === normalizeLabelForKey(label)
  );

  if (!rec) {
    rec = {
      PPL_ID,
      FLG_ID,
      ethnie_label_brut: label,
      source_index: false,
      source_inventaire: false,
      source_ppl_ethnies: false,
      source_labels: label,
      ETH_ID_proposé: "",
      fichier_ETH_existant: "",
      statut_generation: "manquant",
      niveau: "ethnie_certaine",
      notes_convergence: "",
    };
    records.push(rec);
  } else {
    if (!rec.FLG_ID && FLG_ID) rec.FLG_ID = FLG_ID;
  }

  if (source === "inventaire_initial") {
    rec.source_inventaire = true;
  } else if (source === "ppl_ethnies") {
    rec.source_ppl_ethnies = true;
  }

  if (!rec.source_labels.includes(label)) {
    rec.source_labels += ` | ${label}`;
  }
}

function classifyNiveau(label: string): NiveauEthnie {
  const lower = label.toLowerCase();
  const keywordsSous = [
    "sous-groupe",
    "sous groupes",
    "sous-groupes",
    "clan",
    "clans",
    "lignage",
    "lignages",
    "villages",
    "village",
    "communautés",
    "communauté",
    "littoraux",
    "villages fluviaux",
  ];
  const keywordsMacro = [
    "autres groupes",
    "autres sous-groupes",
    "etc.",
    "ensemble des",
    "ensembles",
    "groupes bantous divers",
    "variantes linguistiques",
    "aucune ethnie",
  ];
  if (keywordsMacro.some((k) => lower.includes(k))) {
    return "macro_ou_agrégat";
  }
  if (keywordsSous.some((k) => lower.includes(k))) {
    return "sous_ethnie_ou_clan";
  }
  // Heuristique : lignes extrêmement longues contenant de nombreuses virgules
  const commaCount = (label.match(/,/g) || []).length;
  if (commaCount >= 5) {
    return "macro_ou_agrégat";
  }
  return "ethnie_certaine";
}

function attachEthFiles(records: EthnieSourceRecord[]): void {
  const ethFiles: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.isFile() &&
        entry.name.startsWith("ETH_") &&
        entry.name.endsWith(".txt")
      ) {
        ethFiles.push(full);
      }
    }
  }

  walk(ETHNIES_ROOT);

  for (const file of ethFiles) {
    const lines = readText(file).split(/\r?\n/);
    let ethId = "";
    let nomPrincipal = "";
    let pplId = "";

    for (const line of lines) {
      if (!ethId) {
        const m = line.match(
          /^- Identifiant ethnie \(ID\)\s*:\s*(ETH_[A-Z0-9_]+)/
        );
        if (m) ethId = m[1];
      }
      if (!nomPrincipal) {
        const m = line.match(/^- Nom principal\s*:\s*(.+)$/);
        if (m) nomPrincipal = m[1].trim();
      }
      if (!pplId) {
        const m = line.match(
          /^- Identifiant peuple \(ID\)\s*:\s*(PPL_[A-Z0-9_]+)/
        );
        if (m) pplId = m[1];
      }
    }

    if (!ethId) {
      // Tenter de déduire à partir du nom de fichier
      const base = path.basename(file, ".txt");
      if (base.startsWith("ETH_")) {
        ethId = base;
      }
    }

    if (!pplId && ethId.startsWith("ETH_")) {
      const parts = ethId.split("_");
      if (parts.length >= 2) {
        const racine = parts[1];
        pplId = `PPL_${racine}`;
      }
    }

    if (!pplId || !nomPrincipal) {
      // Ne pas tenter de lier si trop incertain
      continue;
    }

    const keyLabel = normalizeLabelForKey(nomPrincipal);
    const candidates = records.filter(
      (r) =>
        r.PPL_ID === pplId &&
        normalizeLabelForKey(r.ethnie_label_brut) === keyLabel
    );

    if (candidates.length === 0) {
      // Essayer un match plus lâche : même PPL, même racine d'ETH
      const ethParts = ethId.split("_").slice(2).join("_");
      const loEth = ethParts.toLowerCase();
      const loose = records.filter(
        (r) =>
          r.PPL_ID === pplId &&
          normalizeLabelForKey(r.ethnie_label_brut).includes(loEth)
      );
      if (loose.length === 1) {
        const rec = loose[0];
        rec.fichier_ETH_existant = path.relative(ROOT, file);
        rec.ETH_ID_proposé = ethId;
        rec.statut_generation = "existant";
      } else {
        // Inconnu → nouvelle entrée minimale pour suivi
        records.push({
          PPL_ID: pplId,
          FLG_ID: "",
          ethnie_label_brut: nomPrincipal,
          source_index: false,
          source_inventaire: false,
          source_ppl_ethnies: false,
          source_labels: nomPrincipal,
          ETH_ID_proposé: ethId,
          fichier_ETH_existant: path.relative(ROOT, file),
          statut_generation: "existant",
          niveau: "ethnie_certaine",
          notes_convergence:
            "ETH existant sans entrée explicite dans l’index/inventaire.",
        });
      }
    } else {
      for (const rec of candidates) {
        rec.fichier_ETH_existant = path.relative(ROOT, file);
        rec.ETH_ID_proposé = ethId;
        rec.statut_generation = "existant";
      }
    }
  }
}

function assignEthIdsAndNiveaux(records: EthnieSourceRecord[]): void {
  for (const rec of records) {
    // Niveau
    rec.niveau = classifyNiveau(rec.ethnie_label_brut);

    // ETH_ID proposé si absent et niveau ethnie_certaine
    if (!rec.ETH_ID_proposé && rec.niveau === "ethnie_certaine") {
      const racine = rec.PPL_ID.replace(/^PPL_/, "");
      const slug = slugEthnieLabel(rec.ethnie_label_brut);
      rec.ETH_ID_proposé = `ETH_${racine}_${slug}`;
    }
  }
}

function dedupeRecords(records: EthnieSourceRecord[]): EthnieSourceRecord[] {
  const byKey = new Map<string, EthnieSourceRecord>();

  for (const rec of records) {
    const key = `${rec.PPL_ID}|${normalizeLabelForKey(rec.ethnie_label_brut)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...rec });
    } else {
      existing.source_index = existing.source_index || rec.source_index;
      existing.source_inventaire =
        existing.source_inventaire || rec.source_inventaire;
      existing.source_ppl_ethnies =
        existing.source_ppl_ethnies || rec.source_ppl_ethnies;
      if (!existing.FLG_ID && rec.FLG_ID) existing.FLG_ID = rec.FLG_ID;
      if (rec.fichier_ETH_existant && !existing.fichier_ETH_existant) {
        existing.fichier_ETH_existant = rec.fichier_ETH_existant;
      }
      if (!existing.ETH_ID_proposé && rec.ETH_ID_proposé) {
        existing.ETH_ID_proposé = rec.ETH_ID_proposé;
      }
      if (
        existing.statut_generation !== "existant" &&
        rec.statut_generation === "existant"
      ) {
        existing.statut_generation = "existant";
      }
      if (existing.notes_convergence && rec.notes_convergence) {
        if (!existing.notes_convergence.includes(rec.notes_convergence)) {
          existing.notes_convergence += ` | ${rec.notes_convergence}`;
        }
      } else if (!existing.notes_convergence && rec.notes_convergence) {
        existing.notes_convergence = rec.notes_convergence;
      }
      if (!existing.source_labels.includes(rec.ethnie_label_brut)) {
        existing.source_labels += ` | ${rec.ethnie_label_brut}`;
      }
    }
  }

  return Array.from(byKey.values());
}

function writeReferentiel(records: EthnieSourceRecord[]): void {
  const header = [
    "PPL_ID",
    "FLG_ID",
    "ethnie_label_brut",
    "source_index",
    "source_inventaire",
    "source_ppl_ethnies",
    "source_labels",
    "ETH_ID_proposé",
    "fichier_ETH_existant",
    "statut_generation",
    "niveau",
    "notes_convergence",
  ];

  const lines = [header.join(",")];

  for (const rec of records) {
    const row = [
      rec.PPL_ID,
      rec.FLG_ID,
      rec.ethnie_label_brut.replace(/"/g, '""'),
      rec.source_index ? "1" : "0",
      rec.source_inventaire ? "1" : "0",
      rec.source_ppl_ethnies ? "1" : "0",
      rec.source_labels.replace(/"/g, '""'),
      rec.ETH_ID_proposé,
      rec.fichier_ETH_existant,
      rec.statut_generation,
      rec.niveau,
      rec.notes_convergence.replace(/"/g, '""'),
    ];
    const csvLine = row
      .map((v) => {
        if (v === undefined || v === null) return "";
        if (v.includes(",") || v.includes('"') || v.includes("|")) {
          return `"${v}"`;
        }
        return v;
      })
      .join(",");
    lines.push(csvLine);
  }

  fs.writeFileSync(REFERENTIEL_PATH, lines.join("\n"), "utf-8");

  console.log(
    `Référentiel ethnies écrit dans ${path.relative(ROOT, REFERENTIEL_PATH)} (${records.length} lignes).`
  );
}

function main() {
  const recordsFromIndex = parseIndexFile();
  parseInventaireFile(recordsFromIndex);
  parsePplEthniesFiles(recordsFromIndex);
  attachEthFiles(recordsFromIndex);
  assignEthIdsAndNiveaux(recordsFromIndex);
  const deduped = dedupeRecords(recordsFromIndex);
  writeReferentiel(deduped);
}

main();
