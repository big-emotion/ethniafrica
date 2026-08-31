// @req REQ-133
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { extractClanNamesToArtifact } from "../extractClanNames";

describe("extractClanNamesToArtifact (ETNI-1456)", () => {
  let fixtureRoot: string;
  let peopleRoot: string;
  let reviewRoot: string;

  beforeEach(() => {
    fixtureRoot = join(
      __dirname,
      `tmp_clan_names_${Date.now()}_${Math.random().toString(36).slice(2)}`
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
          organization: {
            clanOrganization: "Les clans Diallo et Barry sont attestés.",
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

  // @req REQ-133
  it("writes one machine-readable review artifact outside the AFRIK corpus", () => {
    const outputPath = join(reviewRoot, "clan-name-candidates.json");

    const result = extractClanNamesToArtifact({ peopleRoot, outputPath });

    expect(result.fichesScanned).toBe(1);
    expect(existsSync(outputPath)).toBe(true);
    expect(JSON.parse(readFileSync(outputPath, "utf8"))).toMatchObject({
      schemaVersion: 1,
      candidates: [],
      coverageByFamily: [
        {
          linguisticFamilyId: "FLG_TEST",
          fichesScanned: 1,
          candidateOccurrences: 0,
          distinctNames: 0,
        },
      ],
    });
  });

  // @req REQ-133
  it("refuses every output path inside dataset/source/afrik", () => {
    const outputPath = join(
      fixtureRoot,
      "dataset/source/afrik/generated/clan-name-candidates.json"
    );

    expect(() =>
      extractClanNamesToArtifact({ peopleRoot, outputPath })
    ).toThrow(/refusing to write inside the AFRIK corpus/i);
    expect(existsSync(outputPath)).toBe(false);
  });
});
