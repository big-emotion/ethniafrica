/**
 * Extract named-person review candidates from AFRIK people-fiche prose
 * (DEC-031, ETNI-1387).
 *
 * The command is deliberately read-only with respect to the corpus and never
 * touches Supabase. Its only output is a review artifact outside
 * dataset/source/afrik; publication into the `persons` table (migration 057)
 * is a later, explicit step gated on a human setting reviewStatus to
 * "approved" — see scripts/lib/personCandidateReview.ts and
 * docs/runbooks/person-extraction.md.
 *
 * Usage: npx tsx scripts/extractPersonCandidates.ts [output-path]
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import type {
  FicheSource,
  LoadedPeopleFiche,
  PersonCandidate,
  PersonCandidateReviewArtifact,
} from "./lib/personCandidateTypes";
import { detectPersonCandidates } from "./lib/personCandidateDetection";
import { resolvePersonSourceTier } from "./lib/personCandidateSourceTier";

const DEFAULT_PEOPLE_ROOT = path.join(
  __dirname,
  "../dataset/source/afrik/peuples"
);
const DEFAULT_OUTPUT_PATH = path.join(
  __dirname,
  "../.tmp/person-candidates.json"
);

export interface ExtractPersonCandidatesOptions {
  peopleRoot?: string;
  outputPath?: string;
}

export interface ExtractPersonCandidatesResult {
  fichesScanned: number;
  outputPath: string;
  artifact: PersonCandidateReviewArtifact;
}

function assertOutputPathIsSafe(peopleRoot: string, outputPath: string): void {
  const afrikRoot = path.resolve(peopleRoot, "..");
  const resolvedOutput = path.resolve(outputPath);

  if (
    resolvedOutput === afrikRoot ||
    resolvedOutput.startsWith(`${afrikRoot}${path.sep}`)
  ) {
    throw new Error(
      `extractPersonCandidates: refusing to write inside the AFRIK corpus (${afrikRoot})`
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

function extractCandidates(fiches: LoadedPeopleFiche[]): PersonCandidate[] {
  const candidates = fiches.flatMap((fiche) => {
    const sourceResolution = resolvePersonSourceTier(readFicheSources(fiche));

    return detectPersonCandidates(fiche).map((candidate) => ({
      ...candidate,
      ...sourceResolution,
    }));
  });

  return candidates.sort((left, right) =>
    left.candidateId.localeCompare(right.candidateId, "en")
  );
}

/**
 * Walk the people corpus and write a deterministic review artifact. Every
 * candidate is anchored to a verbatim sentence (REQ-126, AC1) and starts
 * "unreviewed" — this function never writes to the database or the corpus.
 */
export function extractPersonCandidatesToArtifact(
  options: ExtractPersonCandidatesOptions = {}
): ExtractPersonCandidatesResult {
  const peopleRoot = options.peopleRoot ?? DEFAULT_PEOPLE_ROOT;
  const outputPath = options.outputPath ?? DEFAULT_OUTPUT_PATH;
  assertOutputPathIsSafe(peopleRoot, outputPath);

  const fiches = readPeopleFiches(peopleRoot);
  const candidates = extractCandidates(fiches);
  const artifact: PersonCandidateReviewArtifact = {
    schemaVersion: 1,
    candidates,
  };

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  return { fichesScanned: fiches.length, outputPath, artifact };
}

function main(): void {
  const outputPath = process.argv[2] ?? DEFAULT_OUTPUT_PATH;
  const result = extractPersonCandidatesToArtifact({ outputPath });
  console.log(
    `Person review artifact: ${result.artifact.candidates.length} candidates from ${result.fichesScanned} fiches -> ${result.outputPath}`
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
