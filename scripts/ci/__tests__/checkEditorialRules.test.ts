import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  checkAutonym,
  checkSourcesCount,
  checkDoctrineLinkCardSnapshot,
  extractAutonym,
  extractConfidence,
  extractClassificationStatus,
  extractSources,
  runEditorialRules,
  type Fiche,
  type RuleResult,
} from "../checkEditorialRules";

describe("checkEditorialRules — helpers", () => {
  describe("extractAutonym", () => {
    it("returns the top-level autonym when present", () => {
      const fiche: Fiche = {
        id: "PPL_TEST",
        autonym: "Babemba",
        content: {},
      };
      expect(extractAutonym(fiche)).toBe("Babemba");
    });

    it("falls back to content.appellations.selfAppellation for PPL fiches", () => {
      const fiche: Fiche = {
        id: "PPL_TEST",
        content: {
          appellations: { selfAppellation: "Baganda (sg. Muganda)" },
        },
      };
      expect(extractAutonym(fiche)).toBe("Baganda (sg. Muganda)");
    });

    it("falls back to content.decolonialHeader.selfAppellation for FLG fiches", () => {
      const fiche: Fiche = {
        id: "FLG_TEST",
        content: {
          decolonialHeader: { selfAppellation: "Bantu" },
        },
      };
      expect(extractAutonym(fiche)).toBe("Bantu");
    });

    it("returns null when no autonym source is present", () => {
      const fiche: Fiche = { id: "PPL_X", content: {} };
      expect(extractAutonym(fiche)).toBeNull();
    });

    it("returns null when selfAppellation is empty string", () => {
      const fiche: Fiche = {
        id: "PPL_X",
        content: { appellations: { selfAppellation: "" } },
      };
      expect(extractAutonym(fiche)).toBeNull();
    });
  });

  describe("extractConfidence", () => {
    it("returns top-level confidence value", () => {
      const fiche: Fiche = { id: "PPL_X", confidence: "high", content: {} };
      expect(extractConfidence(fiche)).toBe("high");
    });

    it("returns null when not set", () => {
      expect(extractConfidence({ id: "PPL_X", content: {} })).toBeNull();
    });
  });

  describe("extractClassificationStatus", () => {
    it("returns top-level classification_status value", () => {
      const fiche: Fiche = {
        id: "PPL_X",
        classification_status: "contested",
        content: {},
      };
      expect(extractClassificationStatus(fiche)).toBe("contested");
    });

    it("returns null when not set", () => {
      expect(
        extractClassificationStatus({ id: "PPL_X", content: {} })
      ).toBeNull();
    });
  });

  describe("extractSources", () => {
    it("returns content.sources array length", () => {
      const fiche: Fiche = {
        id: "PPL_X",
        content: { sources: ["a", "b", "c"] },
      };
      expect(extractSources(fiche)).toEqual(["a", "b", "c"]);
    });

    it("returns empty array when sources is missing", () => {
      expect(extractSources({ id: "PPL_X", content: {} })).toEqual([]);
    });
  });
});

describe("checkAutonym (Rule 1)", () => {
  it("passes when autonym is present, regardless of confidence", () => {
    const fiche: Fiche = {
      id: "PPL_X",
      confidence: "high",
      content: { appellations: { selfAppellation: "Test" } },
    };
    const r = checkAutonym(fiche, "PPL_X.json");
    expect(r).toBeNull();
  });

  it("warns when autonym missing and confidence < medium", () => {
    const fiche: Fiche = { id: "PPL_X", confidence: "low", content: {} };
    const r = checkAutonym(fiche, "PPL_X.json");
    expect(r).not.toBeNull();
    expect(r!.severity).toBe("warning");
    expect(r!.rule).toBe("autonym-required");
    expect(r!.file).toBe("PPL_X.json");
    expect(r!.slug).toBe("PPL_X");
  });

  it("errors when autonym missing and confidence >= medium", () => {
    const fiche: Fiche = { id: "PPL_X", confidence: "medium", content: {} };
    const r = checkAutonym(fiche, "PPL_X.json");
    expect(r).not.toBeNull();
    expect(r!.severity).toBe("error");
  });

  it("errors when autonym missing and confidence = high", () => {
    const fiche: Fiche = { id: "PPL_X", confidence: "high", content: {} };
    const r = checkAutonym(fiche, "PPL_X.json");
    expect(r!.severity).toBe("error");
  });

  it("warns (not errors) when autonym missing and confidence is null/missing", () => {
    const fiche: Fiche = { id: "PPL_X", content: {} };
    const r = checkAutonym(fiche, "PPL_X.json");
    expect(r!.severity).toBe("warning");
  });

  it("exempts country fiches (paths under pays/) from the autonym rule", () => {
    const fiche: Fiche = { id: "MAR", confidence: "high", content: {} };
    const r = checkAutonym(fiche, "dataset/source/afrik/pays/MAR.json");
    expect(r).toBeNull();
  });
});

describe("checkSourcesCount (Rule 2)", () => {
  it("passes when classification_status is not contested/colonial-legacy", () => {
    const fiche: Fiche = {
      id: "PPL_X",
      classification_status: "stable",
      content: { sources: [] },
    };
    expect(checkSourcesCount(fiche, "PPL_X.json")).toBeNull();
  });

  it("passes when classification_status is missing", () => {
    const fiche: Fiche = { id: "PPL_X", content: { sources: [] } };
    expect(checkSourcesCount(fiche, "PPL_X.json")).toBeNull();
  });

  it("passes when contested and sources.length >= 2", () => {
    const fiche: Fiche = {
      id: "PPL_X",
      classification_status: "contested",
      content: { sources: ["a", "b"] },
    };
    expect(checkSourcesCount(fiche, "PPL_X.json")).toBeNull();
  });

  it("errors when contested and sources.length < 2", () => {
    const fiche: Fiche = {
      id: "PPL_X",
      classification_status: "contested",
      content: { sources: ["only-one"] },
    };
    const r = checkSourcesCount(fiche, "PPL_X.json");
    expect(r).not.toBeNull();
    expect(r!.severity).toBe("error");
    expect(r!.rule).toBe("sources-count");
    expect(r!.slug).toBe("PPL_X");
  });

  it("errors when colonial-legacy and sources.length < 2", () => {
    const fiche: Fiche = {
      id: "PPL_X",
      classification_status: "colonial-legacy",
      content: {},
    };
    const r = checkSourcesCount(fiche, "PPL_X.json");
    expect(r!.severity).toBe("error");
  });
});

describe("checkDoctrineLinkCardSnapshot (Rule 3)", () => {
  let tmpRepoRoot: string;

  beforeEach(() => {
    tmpRepoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "etni32-"));
  });

  afterEach(() => {
    fs.rmSync(tmpRepoRoot, { recursive: true, force: true });
  });

  it("returns a notice (severity=notice) when no DoctrineLinkCard test exists anywhere", () => {
    // Empty repo — no DoctrineLinkCard reference anywhere
    fs.mkdirSync(path.join(tmpRepoRoot, "src"));
    const r = checkDoctrineLinkCardSnapshot(
      { id: "PPL_X", classification_status: "contested", content: {} },
      "PPL_X.json",
      tmpRepoRoot
    );
    expect(r).not.toBeNull();
    expect(r!.severity).toBe("notice");
    expect(r!.rule).toBe("doctrine-link-card-snapshot");
  });

  it("skips fiches that are not contested/colonial-legacy", () => {
    const r = checkDoctrineLinkCardSnapshot(
      { id: "PPL_X", content: {} },
      "PPL_X.json",
      tmpRepoRoot
    );
    expect(r).toBeNull();
  });

  it("passes when a test file referencing DoctrineLinkCard exists", () => {
    const testDir = path.join(tmpRepoRoot, "src", "components");
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(
      path.join(testDir, "Section.test.tsx"),
      "import { DoctrineLinkCard } from '@/components/DoctrineLinkCard';\nexpect(...).toContain('DoctrineLinkCard');"
    );
    const r = checkDoctrineLinkCardSnapshot(
      { id: "PPL_X", classification_status: "contested", content: {} },
      "PPL_X.json",
      tmpRepoRoot
    );
    expect(r).toBeNull();
  });
});

describe("runEditorialRules — end-to-end", () => {
  let tmpRoot: string;
  let datasetDir: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "etni32-e2e-"));
    datasetDir = path.join(tmpRoot, "dataset", "source", "afrik");
    fs.mkdirSync(path.join(datasetDir, "peuples", "FLG_BANTU"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(datasetDir, "famille_linguistique"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(datasetDir, "pays"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function writeFiche(relPath: string, fiche: object): void {
    const full = path.join(datasetDir, relPath);
    fs.writeFileSync(full, JSON.stringify(fiche, null, 2));
  }

  it("returns exitCode 0 with no findings on clean dataset", () => {
    writeFiche("peuples/FLG_BANTU/PPL_CLEAN.json", {
      id: "PPL_CLEAN",
      content: {
        appellations: { selfAppellation: "Test endonym" },
        sources: ["one", "two"],
      },
    });
    const r = runEditorialRules({ repoRoot: tmpRoot });
    expect(r.exitCode).toBe(0);
    // Only notices allowed
    expect(r.findings.filter((f) => f.severity !== "notice")).toHaveLength(0);
  });

  it("returns non-zero exitCode when a Rule 1 error is detected", () => {
    writeFiche("peuples/FLG_BANTU/PPL_BAD.json", {
      id: "PPL_BAD",
      confidence: "high",
      content: { sources: ["a"] },
    });
    const r = runEditorialRules({ repoRoot: tmpRoot });
    expect(r.exitCode).toBe(1);
    expect(
      r.findings.some(
        (f) => f.rule === "autonym-required" && f.severity === "error"
      )
    ).toBe(true);
  });

  it("returns exitCode 0 when only a Rule 1 warning is detected", () => {
    writeFiche("peuples/FLG_BANTU/PPL_WARN.json", {
      id: "PPL_WARN",
      confidence: "low",
      content: { sources: ["a", "b"] },
    });
    const r = runEditorialRules({ repoRoot: tmpRoot });
    expect(r.exitCode).toBe(0);
    expect(
      r.findings.some(
        (f) => f.rule === "autonym-required" && f.severity === "warning"
      )
    ).toBe(true);
  });

  it("returns non-zero exitCode when a Rule 2 error is detected", () => {
    writeFiche("peuples/FLG_BANTU/PPL_CONTESTED.json", {
      id: "PPL_CONTESTED",
      classification_status: "contested",
      content: {
        appellations: { selfAppellation: "Endonym present" },
        sources: ["only-one"],
      },
    });
    const r = runEditorialRules({ repoRoot: tmpRoot });
    expect(r.exitCode).toBe(1);
    expect(
      r.findings.some(
        (f) => f.rule === "sources-count" && f.severity === "error"
      )
    ).toBe(true);
  });

  it("emits a notice (not error) for Rule 3 when DoctrineLinkCard test is missing", () => {
    writeFiche("peuples/FLG_BANTU/PPL_COLONIAL.json", {
      id: "PPL_COLONIAL",
      classification_status: "colonial-legacy",
      content: {
        appellations: { selfAppellation: "Endonym present" },
        sources: ["a", "b"],
      },
    });
    const r = runEditorialRules({ repoRoot: tmpRoot });
    expect(r.exitCode).toBe(0);
    expect(
      r.findings.some(
        (f) =>
          f.rule === "doctrine-link-card-snapshot" && f.severity === "notice"
      )
    ).toBe(true);
  });

  it("emits PR-annotation lines for every finding", () => {
    writeFiche("peuples/FLG_BANTU/PPL_BAD.json", {
      id: "PPL_BAD",
      confidence: "high",
      content: { sources: ["a"] },
    });
    const r = runEditorialRules({ repoRoot: tmpRoot });
    expect(r.annotations.length).toBeGreaterThan(0);
    expect(r.annotations.some((line) => line.startsWith("::error"))).toBe(true);
    // Every annotation must reference the fiche path and the rule
    expect(r.annotations.some((line) => line.includes("PPL_BAD.json"))).toBe(
      true
    );
    expect(
      r.annotations.some((line) => line.includes("autonym-required"))
    ).toBe(true);
  });

  it("handles malformed JSON gracefully without crashing", () => {
    fs.writeFileSync(
      path.join(datasetDir, "peuples", "FLG_BANTU", "PPL_BROKEN.json"),
      "{ not valid json"
    );
    const r = runEditorialRules({ repoRoot: tmpRoot });
    // Treated as an error finding rather than a crash
    expect(
      r.findings.some((f) => f.rule === "json-parse" && f.severity === "error")
    ).toBe(true);
    expect(r.exitCode).toBe(1);
  });
});

// Type-check helper: the RuleResult type should be exported and shaped as
// expected.
const _typeCheck: RuleResult = {
  rule: "autonym-required",
  severity: "warning",
  file: "x",
  slug: "x",
  message: "x",
};
void _typeCheck;
