import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAllPatronymeDossiers } from "../../src/lib/afrik/loaders/patronymeJsonLoader";

const FINDINGS_PATH = resolve(
  process.cwd(),
  "dataset/source/afrik/patronymes/_coverage-findings.json"
);
const EXPECTED_FINDINGS = {
  FLG_KHOISAN: "no_named_candidate_after_corpus_review",
  FLG_KXA: "system_present_entity_unresolved",
  FLG_SONGHAY: "positive_candidate",
  FLG_TUU: "system_present_entity_unresolved",
} as const;

interface CoverageEvidence {
  excerpt: string;
  fieldPath: string;
  file: string;
  name?: string;
  sourceReviewStatus: string;
  sourceTier: string;
}

interface CoverageFinding {
  candidateNames: string[];
  evidence: CoverageEvidence[];
  finding: string;
  linguisticFamilyId: string;
  readerExplanationFr: string;
  reviewedFiles: string[];
}

interface CoverageFindingsDocument {
  findings: CoverageFinding[];
  methodologyFr: string;
  reviewStatus: string;
  schemaVersion: number;
  subtask: string;
  ticket: string;
}

function readFindings(): CoverageFindingsDocument {
  return JSON.parse(
    readFileSync(FINDINGS_PATH, "utf8")
  ) as CoverageFindingsDocument;
}

function readCorpusJson(file: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), file), "utf8"));
}

function valueAtPath(value: unknown, fieldPath: string): unknown {
  const parts = Array.from(fieldPath.match(/[^.[\]]+/g) ?? []);
  return parts.reduce<unknown>((current, part) => {
    if (current === null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, value);
}

describe("ETNI-1686 reviewed patronyme coverage findings", () => {
  // @req REQ-134
  it("distinguishes positive, unresolved-system, and corpus-review findings", () => {
    const document = readFindings();
    const byFamily = Object.fromEntries(
      document.findings.map((finding) => [
        finding.linguisticFamilyId,
        finding.finding,
      ])
    );

    expect(document).toMatchObject({
      schemaVersion: 1,
      ticket: "ETNI-1461",
      subtask: "ETNI-1686",
      reviewStatus: "current_corpus_reviewed",
    });
    expect(byFamily).toEqual(EXPECTED_FINDINGS);
    expect(document.methodologyFr).toMatch(/ne prouve pas l'absence/i);
  });

  // @req REQ-134
  it("records the complete current family corpus and exact evidence passages", () => {
    const document = readFindings();

    for (const finding of document.findings) {
      const familyDirectory = resolve(
        process.cwd(),
        "dataset/source/afrik/peuples",
        finding.linguisticFamilyId
      );
      const currentFiles = readdirSync(familyDirectory)
        .filter((file) => file.endsWith(".json"))
        .map((file) =>
          join("dataset/source/afrik/peuples", finding.linguisticFamilyId, file)
        )
        .sort();

      expect(finding.reviewedFiles).toEqual(currentFiles);
      expect(finding.readerExplanationFr).toMatch(/corpus/i);

      for (const evidence of finding.evidence) {
        expect(finding.reviewedFiles).toContain(evidence.file);
        expect(basename(evidence.file)).toMatch(/^PPL_[A-Z0-9_]+\.json$/);
        expect(evidence.sourceTier).toBe("unresolved");
        expect(evidence.sourceReviewStatus).toBe("review_required");
        expect(
          valueAtPath(readCorpusJson(evidence.file), evidence.fieldPath)
        ).toBe(evidence.excerpt);
      }
    }
  });

  // @req REQ-134
  it("keeps candidate names separate from systems that lack a stable entity", () => {
    const document = readFindings();
    const byFamily = new Map(
      document.findings.map((finding) => [finding.linguisticFamilyId, finding])
    );
    const songhay = byFamily.get("FLG_SONGHAY");

    expect(songhay.candidateNames).toEqual(["Kurtey", "Taguru"]);
    expect(songhay.evidence.map(({ name }) => name)).toEqual([
      "Kurtey",
      "Taguru",
    ]);
    expect(songhay.evidence[0].excerpt).toContain("Kurtey");
    expect(songhay.evidence[1].excerpt).toContain("Taguru");

    for (const familyId of ["FLG_KHOISAN", "FLG_KXA", "FLG_TUU"]) {
      const finding = byFamily.get(familyId);
      expect(finding.candidateNames).toEqual([]);
      expect(finding.readerExplanationFr).toMatch(
        /ne permet pas|ne prouve pas/i
      );
    }
  });

  // @req REQ-134
  it("keeps the reviewed findings artifact outside PAT_* discovery", () => {
    const datasetRoot = mkdtempSync(join(tmpdir(), "etni-1686-findings-"));
    const patronymeRoot = join(datasetRoot, "patronymes");

    try {
      mkdirSync(patronymeRoot, { recursive: true });
      writeFileSync(
        join(patronymeRoot, "_coverage-findings.json"),
        readFileSync(FINDINGS_PATH)
      );

      expect(loadAllPatronymeDossiers(datasetRoot)).toEqual({
        dossiers: [],
        errors: [],
      });
    } finally {
      if (existsSync(datasetRoot)) {
        rmSync(datasetRoot, { recursive: true, force: true });
      }
    }
  });
});
