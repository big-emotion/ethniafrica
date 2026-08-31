import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { parseNameRecordFile } from "../nameRecordParser";
import { validNameDossier } from "./fixtures/validNameDossier.fixture";
import { invalidExtraTopLevelSection } from "./fixtures/invalidExtraTopLevelSection.fixture";
import { invalidRenamedSection } from "./fixtures/invalidRenamedSection.fixture";
import { invalidSkippedSection } from "./fixtures/invalidSkippedSection.fixture";
import { invalidUnknownNameType } from "./fixtures/invalidUnknownNameType.fixture";
import { invalidMissingNameSources } from "./fixtures/invalidMissingNameSources.fixture";
import { invalidSourceNoTier } from "./fixtures/invalidSourceNoTier.fixture";
import { invalidImposedMissingWhyProblematic } from "./fixtures/invalidImposedMissingWhyProblematic.fixture";
import { validImposedWithWhyProblematic } from "./fixtures/validImposedWithWhyProblematic.fixture";

describe("parseNameRecordFile", () => {
  // @req REQ-056
  it("parses a valid name dossier fixture into typed name records", () => {
    const result = parseNameRecordFile(validNameDossier);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      id: "PPL_TEST_A",
      entityType: "people",
    });
    expect(result.data?.names).toHaveLength(2);
    expect(result.data?.names[0]).toMatchObject({
      nameType: "endonym",
      sortRank: 0,
    });
    // The fixture still carries the legacy numeric tiers; the parser
    // normalises them onto the tier vocabulary.
    expect(result.data?.names[0].sources[0].tier).toBe("official");
    expect(result.data?.names[1].sources[0].tier).toBe("referenced");
  });

  // @req REQ-056
  it("rejects a document with an extra, unrecognized top-level section", () => {
    const result = parseNameRecordFile(invalidExtraTopLevelSection);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  // @req REQ-056
  it("rejects a document with a renamed section (names -> nameEntries)", () => {
    const result = parseNameRecordFile(invalidRenamedSection);

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "names" })
    );
  });

  // @req REQ-056
  it("rejects a document that skips a required section (_meta)", () => {
    const result = parseNameRecordFile(invalidSkippedSection);

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "_meta" })
    );
  });

  // @req REQ-056
  it("rejects an unknown nameType", () => {
    const result = parseNameRecordFile(invalidUnknownNameType);

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "names.0.nameType" })
    );
  });

  // @req REQ-056
  it("rejects a name entry with no sources", () => {
    const result = parseNameRecordFile(invalidMissingNameSources);

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "names.0.sources" })
    );
  });

  // @req REQ-057
  it("rejects a source without a tier", () => {
    const result = parseNameRecordFile(invalidSourceNoTier);

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "names.0.sources.0.tier" })
    );
  });

  // @req REQ-056 FR56-imposed
  it("rejects a record with imposedBy set and whyProblematic empty (FR56-imposed)", () => {
    const result = parseNameRecordFile(invalidImposedMissingWhyProblematic);

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: "names.0.whyProblematic",
        message: expect.stringContaining("FR56-imposed"),
      })
    );
  });

  // @req REQ-056 FR56-imposed
  it("parses a record with imposedBy set and whyProblematic populated", () => {
    const result = parseNameRecordFile(validImposedWithWhyProblematic);

    expect(result.success).toBe(true);
    expect(result.data?.names[0]).toMatchObject({
      imposedBy: "Administration coloniale (illustratif)",
    });
  });

  // @req REQ-056
  it("round-trips the illustrative example under dataset/source/afrik/noms/", () => {
    const exampleDir = path.join(
      __dirname,
      "../../../../../dataset/source/afrik/noms"
    );
    const exampleFiles = fs
      .readdirSync(exampleDir)
      .filter((file) => file.endsWith(".json"));

    expect(exampleFiles.length).toBeGreaterThan(0);

    for (const file of exampleFiles) {
      const raw = JSON.parse(
        fs.readFileSync(path.join(exampleDir, file), "utf-8")
      );
      const result = parseNameRecordFile(raw);
      expect(result.success).toBe(true);
    }
  });
});
