/**
 * Extract draft name records from PPL fiches' content.appellations blocks.
 *
 * Story 8.4 (ETNI-468) — appellations extraction, first half of the
 * "source or drop" pipeline. This script never invents sourcing: it drafts
 * modele-nom.json-shaped candidates (sources: []) from existing fiche prose,
 * writes them to a working directory, and stops. Curation into
 * dataset/source/afrik/noms/ is a separate, human-reviewed editorial pass
 * (afrik-curator skill) that attaches Tier 1/2 sources or drops the draft.
 *
 * Mapping (content.appellations -> draft names[]):
 *   - selfAppellation      -> one `endonym` draft (sortRank 0)
 *   - exonyms[]            -> one `exonym` draft per entry (sortRank 1..n)
 *   - whyProblematic       -> copied onto every exonym draft (fiche-level
 *                             prose is not split per exonym in v1 fiches)
 *   - contemporaryUsage    -> copied onto every exonym draft, same reason
 *   - originOfExonyms      -> preserved verbatim as curator context
 *     (`originOfExonyms`), never auto-mapped into `imposedBy`: guessing a
 *     clean attribution string from free prose would be inventing data
 *
 * Usage:
 *   tsx scripts/extractNameRecordsFromFiches.ts
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const DEFAULT_PEUPLES_ROOT = path.join(
  __dirname,
  "../dataset/source/afrik/peuples"
);
const DEFAULT_OUTPUT_DIR = path.join(__dirname, "../.tmp/name-records-drafts");
const FORBIDDEN_OUTPUT_ROOT = path.join(
  __dirname,
  "../dataset/source/afrik/noms"
);

export interface FicheAppellations {
  selfAppellation?: string | null;
  exonyms?: string[] | null;
  originOfExonyms?: string | null;
  whyProblematic?: string | null;
  contemporaryUsage?: string | null;
}

export interface DraftNameRecordEntry {
  nameText: string;
  nameType: "endonym" | "exonym";
  languageOfOrigin: string | null;
  meaning: string | null;
  periodLabel: string | null;
  imposedBy: string | null;
  impositionPeriod: string | null;
  whyProblematic: string | null;
  contemporaryUsage: string | null;
  sortRank: number;
  sources: [];
  extractionSource: string;
  rawExonymText?: string;
  originOfExonyms?: string;
}

export interface DraftNameRecordDossier {
  _meta: {
    format: "AFRIK JSON v2";
    entity: "nom";
    directives: string;
    draft: true;
    draftNotice: string;
  };
  id: string;
  entityType: "people";
  names: DraftNameRecordEntry[];
}

export interface ExtractionStats {
  fichesScanned: number;
  fichesWithAppellations: number;
  fichesSkipped: number;
  draftsWritten: number;
  endonymDraftsWritten: number;
  exonymDraftsWritten: number;
}

const DRAFT_NOTICE =
  "Brouillon genere automatiquement depuis content.appellations — aucune source attachee. " +
  "Publication interdite tant qu'aucune source Tier 1/2 n'est citee (voir le skill afrik-curator).";

/**
 * Strips a trailing parenthetical from a raw exonym string, e.g.
 * "Nago (terme colonial francophone...)" -> "Nago". The full string is kept
 * separately as `rawExonymText` so no information is lost, only structured.
 */
function stripParenthetical(raw: string): string {
  const idx = raw.indexOf("(");
  if (idx === -1) return raw.trim();
  return raw.slice(0, idx).trim();
}

/**
 * Pure transform: content.appellations -> draft modele-nom.json-shaped
 * dossier, or null when there is nothing to draft. No filesystem access.
 */
export function draftNameRecordFromAppellations(
  peopleId: string,
  appellations: FicheAppellations
): DraftNameRecordDossier | null {
  const selfAppellation = appellations.selfAppellation?.trim() || null;
  const exonyms = (appellations.exonyms ?? []).filter(
    (e) => typeof e === "string" && e.trim() !== ""
  );

  if (!selfAppellation && exonyms.length === 0) {
    return null;
  }

  const names: DraftNameRecordEntry[] = [];
  let sortRank = 0;

  if (selfAppellation) {
    names.push({
      nameText: selfAppellation,
      nameType: "endonym",
      languageOfOrigin: null,
      meaning: null,
      periodLabel: null,
      imposedBy: null,
      impositionPeriod: null,
      whyProblematic: null,
      contemporaryUsage: null,
      sortRank: sortRank++,
      sources: [],
      extractionSource: "content.appellations.selfAppellation",
    });
  }

  exonyms.forEach((rawExonymText, i) => {
    const entry: DraftNameRecordEntry = {
      nameText: stripParenthetical(rawExonymText),
      nameType: "exonym",
      languageOfOrigin: null,
      meaning: null,
      periodLabel: null,
      imposedBy: null,
      impositionPeriod: null,
      whyProblematic: appellations.whyProblematic?.trim() || null,
      contemporaryUsage: appellations.contemporaryUsage?.trim() || null,
      sortRank: sortRank++,
      sources: [],
      extractionSource: `content.appellations.exonyms[${i}]`,
      rawExonymText,
    };
    if (appellations.originOfExonyms?.trim()) {
      entry.originOfExonyms = appellations.originOfExonyms.trim();
    }
    names.push(entry);
  });

  return {
    _meta: {
      format: "AFRIK JSON v2",
      entity: "nom",
      directives:
        "Voir DIRECTIVES-AFRIK.md pour les règles de rédaction complètes.",
      draft: true,
      draftNotice: DRAFT_NOTICE,
    },
    id: peopleId,
    entityType: "people",
    names,
  };
}

function assertOutputDirIsSafe(outputDir: string): void {
  const resolved = path.resolve(outputDir);
  const forbidden = path.resolve(FORBIDDEN_OUTPUT_ROOT);
  if (resolved === forbidden || resolved.startsWith(forbidden + path.sep)) {
    throw new Error(
      `extractNameRecordsFromFiches: refusing to write drafts into ${FORBIDDEN_OUTPUT_ROOT} — ` +
        "drafts must land in a working directory; curated files reach " +
        "dataset/source/afrik/noms/ only via the afrik-curator editorial pass."
    );
  }
}

function walkPplFiles(root: string, out: string[]): void {
  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkPplFiles(full, out);
    } else if (
      entry.isFile() &&
      entry.name.startsWith("PPL_") &&
      entry.name.endsWith(".json")
    ) {
      out.push(full);
    }
  }
}

/**
 * Walks `peuplesRoot` for PPL_*.json fiches, drafts a name-record dossier
 * from each fiche's content.appellations (when present), and writes each
 * draft to `outputDir` (one file per people, named `${peopleId}.json`).
 * Never writes to dataset/source/afrik/noms/ (see assertOutputDirIsSafe).
 */
export function extractNameRecordsFromFiches(
  peuplesRoot: string = DEFAULT_PEUPLES_ROOT,
  outputDir: string = DEFAULT_OUTPUT_DIR
): ExtractionStats {
  assertOutputDirIsSafe(outputDir);

  const stats: ExtractionStats = {
    fichesScanned: 0,
    fichesWithAppellations: 0,
    fichesSkipped: 0,
    draftsWritten: 0,
    endonymDraftsWritten: 0,
    exonymDraftsWritten: 0,
  };

  const files: string[] = [];
  walkPplFiles(peuplesRoot, files);

  mkdirSync(outputDir, { recursive: true });

  for (const file of files) {
    stats.fichesScanned += 1;
    const fiche = JSON.parse(readFileSync(file, "utf8"));
    const peopleId: string = fiche.id;
    const appellations: FicheAppellations | undefined =
      fiche.content?.appellations;

    if (!appellations) {
      stats.fichesSkipped += 1;
      continue;
    }

    const draft = draftNameRecordFromAppellations(peopleId, appellations);
    if (!draft) {
      stats.fichesSkipped += 1;
      continue;
    }

    stats.fichesWithAppellations += 1;
    stats.draftsWritten += 1;
    for (const name of draft.names) {
      if (name.nameType === "endonym") stats.endonymDraftsWritten += 1;
      if (name.nameType === "exonym") stats.exonymDraftsWritten += 1;
    }

    const outPath = path.join(outputDir, `${peopleId}.json`);
    writeFileSync(outPath, JSON.stringify(draft, null, 2) + "\n", "utf8");
  }

  return stats;
}

function main(): void {
  const stats = extractNameRecordsFromFiches();
  console.log("Name-record extraction complete.");
  console.log(`  Fiches scanned:            ${stats.fichesScanned}`);
  console.log(`  Fiches with appellations:  ${stats.fichesWithAppellations}`);
  console.log(`  Fiches skipped (no data):  ${stats.fichesSkipped}`);
  console.log(`  Draft dossiers written:    ${stats.draftsWritten}`);
  console.log(`  Endonym drafts:            ${stats.endonymDraftsWritten}`);
  console.log(`  Exonym drafts:             ${stats.exonymDraftsWritten}`);
  console.log(`  Output directory:          ${DEFAULT_OUTPUT_DIR}`);
  console.log(
    "  Next step: curate via the afrik-curator skill — attach Tier 1/2 " +
      "sources, drop unsourceable claims, then PR the result into " +
      "dataset/source/afrik/noms/."
  );
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
