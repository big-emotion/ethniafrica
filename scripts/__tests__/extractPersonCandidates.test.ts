// @req REQ-126
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { extractPersonCandidatesToArtifact } from "../extractPersonCandidates";

describe("extractPersonCandidatesToArtifact (ETNI-1387)", () => {
  let fixtureRoot: string;
  let peopleRoot: string;
  let reviewRoot: string;

  beforeEach(() => {
    fixtureRoot = join(
      __dirname,
      `tmp_person_candidates_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    peopleRoot = join(fixtureRoot, "dataset/source/afrik/peuples");
    reviewRoot = join(fixtureRoot, "review");

    mkdirSync(join(peopleRoot, "FLG_TEST"), { recursive: true });
    writeFileSync(
      join(peopleRoot, "FLG_TEST/PPL_TEST.json"),
      JSON.stringify({
        id: "PPL_TEST",
        languageFamilyId: "FLG_TEST",
        content: {
          historicalRole: {
            conflictsOrAlliances:
              "Capitulation du roi Nyabela le 8 juillet 1883.",
          },
          sources: [
            {
              title: "Source test",
              url: "https://www.unesco.org/test",
              tier: "official",
              notes: "",
            },
          ],
        },
      })
    );
  });

  afterEach(() => {
    if (existsSync(fixtureRoot)) {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  // @req REQ-126
  it("writes one deterministic unreviewed artifact, each candidate anchored to its verbatim sentence, without changing the corpus", () => {
    const outputPath = join(reviewRoot, "person-candidates.json");
    const sourcePath = join(peopleRoot, "FLG_TEST/PPL_TEST.json");
    const sourceBefore = readFileSync(sourcePath, "utf8");

    const result = extractPersonCandidatesToArtifact({
      peopleRoot,
      outputPath,
    });
    const firstWrite = readFileSync(outputPath, "utf8");
    extractPersonCandidatesToArtifact({ peopleRoot, outputPath });

    expect(result.fichesScanned).toBe(1);
    expect(readFileSync(outputPath, "utf8")).toBe(firstWrite);
    expect(readFileSync(sourcePath, "utf8")).toBe(sourceBefore);
    expect(JSON.parse(firstWrite)).toMatchObject({
      schemaVersion: 1,
      candidates: [
        {
          name: "Nyabela",
          normalizedName: "nyabela",
          roleCue: "roi",
          sourceFicheId: "PPL_TEST",
          linguisticFamilyId: "FLG_TEST",
          sourcePath: "content.historicalRole.conflictsOrAlliances",
          verbatimPassage: "Capitulation du roi Nyabela le 8 juillet 1883.",
          reviewStatus: "unreviewed",
        },
      ],
    });
  });

  // @req REQ-126
  it("rejects a candidate with no verbatim source sentence — it never appears in the output", () => {
    const outputPath = join(reviewRoot, "person-candidates.json");
    writeFileSync(
      join(peopleRoot, "FLG_TEST/PPL_EMPTY.json"),
      JSON.stringify({
        id: "PPL_EMPTY",
        languageFamilyId: "FLG_TEST",
        content: {
          historicalRole: {
            conflictsOrAlliances: "Un chef supervise chaque circonscription.",
          },
          sources: [],
        },
      })
    );

    const result = extractPersonCandidatesToArtifact({
      peopleRoot,
      outputPath,
    });

    expect(
      result.artifact.candidates.some(
        (candidate) => candidate.sourceFicheId === "PPL_EMPTY"
      )
    ).toBe(false);
  });

  // @req REQ-126
  it("only ever produces unreviewed candidates — human review is a blocking gate, not part of extraction", () => {
    const outputPath = join(reviewRoot, "person-candidates.json");

    const result = extractPersonCandidatesToArtifact({
      peopleRoot,
      outputPath,
    });

    expect(result.artifact.candidates.length).toBeGreaterThan(0);
    expect(
      result.artifact.candidates.every(
        (candidate) => candidate.reviewStatus === "unreviewed"
      )
    ).toBe(true);
  });

  // @req REQ-126
  it("refuses every output path inside dataset/source/afrik", () => {
    const outputPath = join(
      fixtureRoot,
      "dataset/source/afrik/generated/person-candidates.json"
    );

    expect(() =>
      extractPersonCandidatesToArtifact({ peopleRoot, outputPath })
    ).toThrow(/refusing to write inside the AFRIK corpus/i);
    expect(existsSync(outputPath)).toBe(false);
  });
});
