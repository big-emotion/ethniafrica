/**
 * What the clan-name and named-person extractions share: walking the people
 * corpus, reading each fiche's prose with its path, anchoring every candidate to
 * the sentence it came from, resolving an inherited source tier, and writing the
 * review artifact without ever touching the corpus.
 *
 * Only the cue parsing differs between the two — which words announce a clan
 * list, which announce a person — and that stays in each detection module.
 * Everything here used to exist twice, and the tier rule in particular is one a
 * copy must never loosen on its own.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import type { SourceTier } from "../../src/types/sources";

export interface FicheSource {
  title: string;
  url?: string | null;
  tier?: string | null;
  notes?: string | null;
  source_kind?: string | null;
}

export interface LoadedPeopleFiche {
  id: string;
  languageFamilyId: string;
  content: Record<string, unknown>;
}

/** The fields every prose candidate carries, whatever kind of name it is. */
export interface ProseCandidate {
  candidateId: string;
  name: string;
  normalizedName: string;
  sourceFicheId: string;
  linguisticFamilyId: string;
  sourcePath: string;
  verbatimPassage: string;
  sourceCandidates: FicheSource[];
  inheritedTier: SourceTier | null;
  sourceKind: string | null;
  tierResolution: "single_source" | "uniform_bound_sources" | "review_required";
  reviewFlags: string[];
  reviewStatus: "unreviewed" | "approved" | "rejected";
}

type SourceResolution = Pick<
  ProseCandidate,
  | "sourceCandidates"
  | "inheritedTier"
  | "sourceKind"
  | "tierResolution"
  | "reviewFlags"
>;

/** Normalize identity only; the original spelling remains the display name. */
// @req REQ-126
// @req REQ-133
export function normalizeCandidateName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[’ʼ]/gu, "'")
    .replace(/[‐‑‒–—―]/gu, "-")
    .toLocaleLowerCase("fr")
    .trim()
    .replace(/\s+/gu, " ");
}

const NON_NARRATIVE_CONTENT_KEYS = new Set(["demography", "sources"]);

interface ProseString {
  sourcePath: string;
  value: string;
}

function collectProseStrings(
  value: unknown,
  sourcePath: string,
  strings: ProseString[]
): void {
  if (typeof value === "string") {
    strings.push({ sourcePath, value });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectProseStrings(item, `${sourcePath}[${index}]`, strings)
    );
    return;
  }

  if (value === null || typeof value !== "object") return;

  for (const key of Object.keys(value).sort()) {
    if (sourcePath === "content" && NON_NARRATIVE_CONTENT_KEYS.has(key)) {
      continue;
    }
    collectProseStrings(
      (value as Record<string, unknown>)[key],
      `${sourcePath}.${key}`,
      strings
    );
  }
}

function makeCandidateId(
  ficheId: string,
  sourcePath: string,
  normalizedName: string
): string {
  return [ficheId, sourcePath, normalizedName]
    .map((part) => encodeURIComponent(part))
    .join("::");
}

/**
 * Turns the names a detector finds in each passage into unreviewed candidates.
 * A candidate only ever comes from a real passage of the fiche, and a repeated
 * spelling variant is collapsed only inside the same fiche path. A detector's
 * extra fields (the person's role cue) land right after `normalizedName`, which
 * keeps the artifact's key order stable for reviewers diffing it.
 */
// @req REQ-126
// @req REQ-133
export function detectProseCandidates<Extra extends object>(
  fiche: LoadedPeopleFiche,
  occurrencesIn: (passage: string) => Array<{ name: string } & Extra>
): Array<ProseCandidate & Extra> {
  const strings: ProseString[] = [];
  collectProseStrings(fiche.content, "content", strings);

  const candidates: Array<ProseCandidate & Extra> = [];
  for (const { sourcePath, value: verbatimPassage } of strings) {
    const normalizedNamesAtPath = new Set<string>();

    for (const { name, ...extra } of occurrencesIn(verbatimPassage)) {
      const normalizedName = normalizeCandidateName(name);
      if (!normalizedName || normalizedNamesAtPath.has(normalizedName))
        continue;
      normalizedNamesAtPath.add(normalizedName);

      candidates.push({
        candidateId: makeCandidateId(fiche.id, sourcePath, normalizedName),
        name,
        normalizedName,
        ...(extra as Extra),
        sourceFicheId: fiche.id,
        linguisticFamilyId: fiche.languageFamilyId,
        sourcePath,
        verbatimPassage,
        sourceCandidates: [],
        inheritedTier: null,
        sourceKind: null,
        tierResolution: "review_required",
        reviewFlags: [],
        reviewStatus: "unreviewed",
      });
    }
  }

  return candidates;
}

const SOURCE_TIERS: readonly SourceTier[] = [
  "official",
  "referenced",
  "unverified",
];

const REVIEW_FLAGS = ["source_tier_unresolved", "source_review_required"];

function isSourceTier(tier: unknown): tier is SourceTier {
  return SOURCE_TIERS.includes(tier as SourceTier);
}

function isWikipediaSource(source: FicheSource): boolean {
  return (
    /\bwikipedia\b/i.test(source.title) ||
    /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)?wikipedia\.org(?:[/:?#]|$)/i.test(
      source.url ?? ""
    )
  );
}

function reviewRequired(sourceCandidates: FicheSource[]): SourceResolution {
  return {
    sourceCandidates: [...sourceCandidates],
    inheritedTier: null,
    sourceKind: null,
    tierResolution: "review_required",
    reviewFlags: [...REVIEW_FLAGS],
  };
}

/**
 * Resolves provenance only when sources are explicitly bound to the passage.
 * Fiche-level sources cannot identify which citation supports which prose, so
 * they always leave the tier to a reviewer. The tier inherited is always one the
 * fiche already carries, never the ai_generated source_kind (REQ-126).
 */
// @req REQ-126
// @req REQ-133
export function resolveInheritedSourceTier(
  ficheSources: FicheSource[],
  passageBoundSources?: FicheSource[]
): SourceResolution {
  if (!passageBoundSources?.length) {
    return reviewRequired(ficheSources);
  }

  if (passageBoundSources.every(isWikipediaSource)) {
    return reviewRequired(passageBoundSources);
  }

  const inheritedTier = passageBoundSources[0].tier;
  if (
    !isSourceTier(inheritedTier) ||
    passageBoundSources.some((source) => source.tier !== inheritedTier)
  ) {
    return reviewRequired(passageBoundSources);
  }

  const sourceKind = passageBoundSources[0].source_kind ?? null;
  if (
    passageBoundSources.some(
      (source) => (source.source_kind ?? null) !== sourceKind
    )
  ) {
    return reviewRequired(passageBoundSources);
  }

  return {
    sourceCandidates: [...passageBoundSources],
    inheritedTier,
    sourceKind,
    tierResolution:
      passageBoundSources.length === 1
        ? "single_source"
        : "uniform_bound_sources",
    reviewFlags: [],
  };
}

function assertOutputPathIsSafe(
  commandName: string,
  peopleRoot: string,
  outputPath: string
): void {
  const afrikRoot = path.resolve(peopleRoot, "..");
  const resolvedOutput = path.resolve(outputPath);

  if (
    resolvedOutput === afrikRoot ||
    resolvedOutput.startsWith(`${afrikRoot}${path.sep}`)
  ) {
    throw new Error(
      `${commandName}: refusing to write inside the AFRIK corpus (${afrikRoot})`
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

export interface CandidateArtifactRun<Candidate, Artifact> {
  /** Named in the refusal, so a failing CI log says which command tried. */
  commandName: string;
  peopleRoot: string;
  outputPath: string;
  detect: (fiche: LoadedPeopleFiche) => Candidate[];
  buildArtifact: (
    fiches: LoadedPeopleFiche[],
    candidates: Candidate[]
  ) => Artifact;
}

/**
 * Walks the people corpus and writes a deterministic review artifact outside
 * it. Refuses before reading anything when the output would land inside the
 * AFRIK corpus, and never writes to the corpus or the database.
 */
// @req REQ-126
// @req REQ-133
export function writeCandidateArtifact<
  Candidate extends ProseCandidate,
  Artifact,
>(
  run: CandidateArtifactRun<Candidate, Artifact>
): { fichesScanned: number; outputPath: string; artifact: Artifact } {
  assertOutputPathIsSafe(run.commandName, run.peopleRoot, run.outputPath);

  const fiches = readPeopleFiches(run.peopleRoot);
  const candidates = fiches
    .flatMap((fiche) => {
      const sourceResolution = resolveInheritedSourceTier(
        readFicheSources(fiche)
      );
      return run
        .detect(fiche)
        .map((candidate) => ({ ...candidate, ...sourceResolution }));
    })
    .sort((left, right) =>
      left.candidateId.localeCompare(right.candidateId, "en")
    );
  const artifact = run.buildArtifact(fiches, candidates);

  mkdirSync(path.dirname(run.outputPath), { recursive: true });
  writeFileSync(
    run.outputPath,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8"
  );

  return { fichesScanned: fiches.length, outputPath: run.outputPath, artifact };
}
