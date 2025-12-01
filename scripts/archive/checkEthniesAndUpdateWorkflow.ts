import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const ETHNIES_ROOT = path.join(ROOT, "dataset", "source", "afrik", "ethnies");
const MODELE_ETHNIE_PATH = path.join(ROOT, "public", "modele-ethnie.txt");
const WORKFLOW_MD_PATH = path.join(ROOT, "public", "WORKFLOW_AFRIK_STATUS.md");
const WORKFLOW_CSV_PATH = path.join(ROOT, "public", "workflow_status.csv");

function readText(p: string): string {
  return fs.readFileSync(p, "utf-8");
}

function listEthFiles(): string[] {
  const result: string[] = [];
  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (
        entry.isFile() &&
        entry.name.startsWith("ETH_") &&
        entry.name.endsWith(".txt")
      ) {
        result.push(full);
      }
    }
  }
  walk(ETHNIES_ROOT);
  return result;
}

function checkStructure(): {
  total: number;
  conformes: number;
  nonConformes: string[];
} {
  const templateLines = readText(MODELE_ETHNIE_PATH)
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  const templateTitles = templateLines.filter((l) => l.startsWith("# "));

  const files = listEthFiles();
  const nonConformes: string[] = [];
  let conformes = 0;

  for (const file of files) {
    const lines = readText(file)
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0);
    const titles = lines.filter((l) => l.startsWith("# "));
    const ok =
      titles.length === templateTitles.length &&
      titles.every((t, idx) => t === templateTitles[idx]);
    if (ok) conformes++;
    else nonConformes.push(path.relative(ROOT, file));
  }

  return { total: files.length, conformes, nonConformes };
}

function updateWorkflowFiles() {
  // Mettre ethnie=done dans workflow_status.csv
  const csv = readText(WORKFLOW_CSV_PATH).split(/\r?\n/);
  const updatedCsv = csv.map((line) => {
    if (line.startsWith("ethnies,")) {
      return "ethnies,done";
    }
    return line;
  });
  fs.writeFileSync(WORKFLOW_CSV_PATH, updatedCsv.join("\n"), "utf-8");

  // Cocher Ethnies dans WORKFLOW_AFRIK_STATUS.md
  const mdLines = readText(WORKFLOW_MD_PATH).split(/\r?\n/);
  for (let i = 0; i < mdLines.length; i++) {
    if (mdLines[i].includes("- [ ] Ethnies")) {
      mdLines[i] = mdLines[i].replace("- [ ] Ethnies", "- [x] Ethnies");
    }
  }
  fs.writeFileSync(WORKFLOW_MD_PATH, mdLines.join("\n"), "utf-8");
}

function main() {
  const summary = checkStructure();

  console.log(
    `Contrôle structure ETH : ${summary.conformes}/${summary.total} conformes.`
  );
  if (summary.nonConformes.length > 0) {
    console.log("Fichiers non conformes (titres de sections) :");
    for (const f of summary.nonConformes) {
      console.log(` - ${f}`);
    }
  }

  updateWorkflowFiles();

  console.log(
    "WORKFLOW_AFRIK_STATUS.md et workflow_status.csv mis à jour pour l’étape Ethnies."
  );
}

main();
