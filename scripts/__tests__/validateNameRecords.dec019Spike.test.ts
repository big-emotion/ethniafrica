// @req REQ-032
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const REAL_NOMS_DIR = join(
  __dirname,
  "..",
  "..",
  "dataset",
  "source",
  "afrik",
  "noms"
);

describe("real dataset state matches the ETNI-1197 / DEC-019 spike decision", () => {
  // @req REQ-032
  it("has no committed surname-type name records yet — Story 8.11 curation has not started", () => {
    const files = readdirSync(REAL_NOMS_DIR).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);

    const surnameEntries: string[] = [];
    for (const file of files) {
      const data = JSON.parse(readFileSync(join(REAL_NOMS_DIR, file), "utf-8"));
      for (const entry of data.names ?? []) {
        if (entry.nameType === "surname") {
          surnameEntries.push(`${file}:${entry.nameText}`);
        }
      }
    }

    expect(surnameEntries).toHaveLength(0);
  });
});
