/**
 * Extract clan-name review candidates from AFRIK people-fiche prose.
 *
 * The command is deliberately read-only with respect to the corpus. Its only
 * output is a review artifact outside dataset/source/afrik; a later, explicit
 * workflow owns any persistence into the PAT_* patronyme dimension.
 *
 * Usage: npx tsx scripts/extractClanNames.ts [output-path]
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import type {
  ClanNameCandidate,
  ClanNameReviewArtifact,
  FicheSource,
  LoadedPeopleFiche,
} from "./lib/clanNameTypes";
import { detectClanNameCandidates } from "./lib/clanNameDetection";
import { buildCoverageByFamily } from "./lib/clanNameReview";
import { resolveClanNameSourceTier } from "./lib/clanNameSourceTier";

const DEFAULT_PEOPLE_ROOT = path.join(
  __dirname,
  "../dataset/source/afrik/peuples"
);
const DEFAULT_OUTPUT_PATH = path.join(
  __dirname,
  "../.tmp/clan-name-candidates.json"
);

export interface ExtractClanNamesOptions {
  peopleRoot?: string;
  outputPath?: string;
}

export interface ExtractClanNamesResult {
  fichesScanned: number;
  outputPath: string;
  artifact: ClanNameReviewArtifact;
}

function assertOutputPathIsSafe(peopleRoot: string, outputPath: string): void {
  const afrikRoot = path.resolve(peopleRoot, "..");
  const resolvedOutput = path.resolve(outputPath);

  if (
    resolvedOutput === afrikRoot ||
    resolvedOutput.startsWith(`${afrikRoot}${path.sep}`)
  ) {
    throw new Error(
      `extractClanNames: refusing to write inside the AFRIK corpus (${afrikRoot})`
    );
  }
}

function walkPeopleFiles(root: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkPeopleFiles(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.startsWith("PPL_") &&
      entry.name.endsWith(".json")
    ) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function readPeopleFiches(peopleRoot: string): LoadedPeopleFiche[] {
  return walkPeopleFiles(peopleRoot).map((filePath) => {
    const fiche = JSON.parse(readFileSync(filePath, "utf8"));
    return {
      id: fiche.id,
      languageFamilyId: fiche.languageFamilyId,
      content: fiche.content ?? {},
    };
  });
}

function readFicheSources(fiche: LoadedPeopleFiche): FicheSource[] {
  const sources = fiche.content.sources;
  if (!Array.isArray(sources)) return [];

  return sources.filter(
    (source): source is FicheSource =>
      source !== null &&
      typeof source === "object" &&
      typeof (source as Record<string, unknown>).title === "string"
  );
}

function extractCandidates(fiches: LoadedPeopleFiche[]): ClanNameCandidate[] {
  const candidates = fiches.flatMap((fiche) => {
    const sourceResolution = resolveClanNameSourceTier(readFicheSources(fiche));

    return detectClanNameCandidates(fiche).map((candidate) => ({
      ...candidate,
      ...sourceResolution,
    }));
  });

  return candidates.sort((left, right) =>
    left.candidateId.localeCompare(right.candidateId, "en")
  );
}

/**
 * Walk the people corpus and write a deterministic review artifact.
 * Detection and provenance enrichment are composed into this shell by the
 * dependent ETNI-1456 sub-tasks.
 */
export function extractClanNamesToArtifact(
  options: ExtractClanNamesOptions = {}
): ExtractClanNamesResult {
  const peopleRoot = options.peopleRoot ?? DEFAULT_PEOPLE_ROOT;
  const outputPath = options.outputPath ?? DEFAULT_OUTPUT_PATH;
  assertOutputPathIsSafe(peopleRoot, outputPath);

  const fiches = readPeopleFiches(peopleRoot);
  const candidates = extractCandidates(fiches);
  const artifact: ClanNameReviewArtifact = {
    schemaVersion: 1,
    candidates,
    coverageByFamily: buildCoverageByFamily(fiches, candidates),
  };

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  return { fichesScanned: fiches.length, outputPath, artifact };
}

function main(): void {
  const outputPath = process.argv[2] ?? DEFAULT_OUTPUT_PATH;
  const result = extractClanNamesToArtifact({ outputPath });
  console.log(
    `Clan-name review artifact: ${result.artifact.candidates.length} candidates from ${result.fichesScanned} fiches -> ${result.outputPath}`
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
