import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");
const script = join(projectRoot, "scripts/afrik/initCountryEnrichment.ts");
const temporaryDirs: string[] = [];

interface CommandResult {
  status: number;
  output: string;
}

function runInit(args: string[]): CommandResult {
  try {
    return {
      status: 0,
      output: execFileSync("npx", ["tsx", script, ...args], {
        cwd: projectRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    const failure = error as {
      status?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      status: failure.status ?? 1,
      output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
    };
  }
}

function makeTrackerDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "country-init-"));
  temporaryDirs.push(directory);
  return directory;
}

afterEach(() => {
  while (temporaryDirs.length > 0) {
    rmSync(temporaryDirs.pop() as string, { recursive: true, force: true });
  }
});

describe("initCountryEnrichment", () => {
  // @req REQ-032
  it("rejects an identifier that is not ISO 3166-1 alpha-3", () => {
    const result = runInit(["CO", "--tracker-dir", makeTrackerDir()]);

    expect(result.status).toBe(1);
    expect(result.output).toContain("ISO3");
  });

  // @req REQ-032
  it("refuses a country that has no source fiche", () => {
    const result = runInit(["ZZZ", "--tracker-dir", makeTrackerDir()]);

    expect(result.status).toBe(1);
    expect(result.output).toContain("fiche");
  });

  // @req REQ-032
  it("creates the tracker and the people ledger from the source fiche", () => {
    const trackerDir = makeTrackerDir();

    expect(runInit(["cod", "--tracker-dir", trackerDir]).status).toBe(0);

    const tracker = JSON.parse(
      readFileSync(join(trackerDir, "COD.json"), "utf8")
    );
    const ledger = JSON.parse(
      readFileSync(join(trackerDir, "COD-peoples.json"), "utf8")
    );

    expect(tracker.countryId).toBe("COD");
    expect(tracker.countryName).toBe("République démocratique du Congo");
    expect(tracker.workstreams).toHaveLength(10);
    expect(tracker.databaseSync.status).toBe("not_verified");
    expect(tracker.scorePolicy).toBe("vector_only_no_global_score");
    expect(ledger.countryId).toBe("COD");
    expect(ledger.entries.length).toBeGreaterThan(0);
    expect(ledger.summary.editorialReview).toMatchObject({
      totalRelations: ledger.entries.length,
      reviewedRelations: 0,
      reviewCompletionPercent: 0,
    });
    expect(tracker.snapshot.peoples.editorialReview).toEqual(
      ledger.summary.editorialReview
    );
  });

  // @req REQ-032
  it("fills the snapshot from the corpus with the existing metric calculator", () => {
    const trackerDir = makeTrackerDir();
    runInit(["COD", "--tracker-dir", trackerDir]);

    const { snapshot } = JSON.parse(
      readFileSync(join(trackerDir, "COD.json"), "utf8")
    );

    expect(snapshot.countryId).toBe("COD");
    expect(snapshot.structural.filledSections).toBeGreaterThan(0);
    expect(snapshot.peoples.linkedFiches).toBeGreaterThan(0);
  });

  // @req REQ-032
  it("quotes no inventory percentage while the reference denominators are empty", () => {
    const trackerDir = makeTrackerDir();
    runInit(["COD", "--tracker-dir", trackerDir]);

    const tracker = JSON.parse(
      readFileSync(join(trackerDir, "COD.json"), "utf8")
    );

    expect(tracker.snapshot.peoples.rawReferenceUpperBoundPercent).toBeNull();
    expect(tracker.snapshot.languages.rawReferenceUpperBoundPercent).toBeNull();
  });

  // @req REQ-032
  it("refuses to overwrite an existing tracker", () => {
    const trackerDir = makeTrackerDir();
    writeFileSync(join(trackerDir, "COD.json"), '{"countryId":"COD"}\n');

    const result = runInit(["COD", "--tracker-dir", trackerDir]);

    expect(result.status).toBe(1);
    expect(result.output).toContain("--force");
    expect(readFileSync(join(trackerDir, "COD.json"), "utf8")).toBe(
      '{"countryId":"COD"}\n'
    );
  });

  // @req REQ-032
  it("overwrites the tracker only when --force is given", () => {
    const trackerDir = makeTrackerDir();
    writeFileSync(join(trackerDir, "COD.json"), '{"countryId":"COD"}\n');

    expect(
      runInit(["COD", "--tracker-dir", trackerDir, "--force"]).status
    ).toBe(0);
    expect(
      JSON.parse(readFileSync(join(trackerDir, "COD.json"), "utf8")).workstreams
    ).toHaveLength(10);
  });

  // @req REQ-032
  it("preserves every review decision already recorded in the people ledger", () => {
    const trackerDir = makeTrackerDir();
    runInit(["COD", "--tracker-dir", trackerDir]);
    const ledgerPath = join(trackerDir, "COD-peoples.json");
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
    const reviewedId = ledger.entries[0].id;
    ledger.entries[0].review = { status: "resolved", entityType: "people" };
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);

    runInit(["COD", "--tracker-dir", trackerDir, "--force"]);

    const refreshed = JSON.parse(readFileSync(ledgerPath, "utf8"));
    expect(
      refreshed.entries.find((entry: { id: string }) => entry.id === reviewedId)
        .review
    ).toEqual({ status: "resolved", entityType: "people" });
  });

  // @req REQ-032
  it("produces identical output apart from the update date", () => {
    const first = makeTrackerDir();
    const second = makeTrackerDir();
    runInit(["COD", "--tracker-dir", first]);
    runInit(["COD", "--tracker-dir", second]);

    const strip = (directory: string, file: string) =>
      readFileSync(join(directory, file), "utf8").replace(
        /"updatedAt": "[^"]*"/g,
        '"updatedAt": "<date>"'
      );

    expect(strip(second, "COD.json")).toBe(strip(first, "COD.json"));
    expect(strip(second, "COD-peoples.json")).toBe(
      strip(first, "COD-peoples.json")
    );
  });
});
