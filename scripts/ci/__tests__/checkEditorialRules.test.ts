import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  checkAutonym,
  checkChronologySymmetry,
  checkSourcesCount,
  checkDoctrineLinkCardSnapshot,
  checkUndatedPolityCeiling,
  UNDATED_POLITY_CEILING,
  escapeWorkflowCommand,
  extractAutonym,
  extractConfidence,
  extractClassificationStatus,
  extractSources,
  formatAnnotation,
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

    // The corpus writes camelCase: the loader reads `people.classificationStatus`
    // (migrateAfrikToDatabase.ts:244) and validateAfrikData already validates
    // that spelling on migration, relation and nom fiches. Reading only the
    // snake_case form made Rule 2 match nothing while reporting green.
    // @req REQ-023
    it("returns the top-level camelCase classificationStatus the corpus writes", () => {
      const fiche: Fiche = {
        id: "FLG_X",
        classificationStatus: "colonial-legacy",
        content: {},
      };
      expect(extractClassificationStatus(fiche)).toBe("colonial-legacy");
    });

    // @req REQ-023
    it("prefers the snake_case spelling when a fiche carries both", () => {
      const fiche: Fiche = {
        id: "PPL_X",
        classification_status: "contested",
        classificationStatus: "reconstructive",
        content: {},
      };
      expect(extractClassificationStatus(fiche)).toBe("contested");
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
    const r = checkAutonym(
      fiche,
      "dataset/source/afrik/peuples/FLG_X/PPL_X.json"
    );
    expect(r).toBeNull();
  });

  it("warns when autonym missing and confidence < medium", () => {
    const fiche: Fiche = { id: "PPL_X", confidence: "low", content: {} };
    const r = checkAutonym(
      fiche,
      "dataset/source/afrik/peuples/FLG_X/PPL_X.json"
    );
    expect(r).not.toBeNull();
    expect(r!.severity).toBe("warning");
    expect(r!.rule).toBe("autonym-required");
    expect(r!.file).toBe("dataset/source/afrik/peuples/FLG_X/PPL_X.json");
    expect(r!.slug).toBe("PPL_X");
  });

  it("errors when autonym missing and confidence >= medium", () => {
    const fiche: Fiche = { id: "PPL_X", confidence: "medium", content: {} };
    const r = checkAutonym(
      fiche,
      "dataset/source/afrik/peuples/FLG_X/PPL_X.json"
    );
    expect(r).not.toBeNull();
    expect(r!.severity).toBe("error");
  });

  it("errors when autonym missing and confidence = high", () => {
    const fiche: Fiche = { id: "PPL_X", confidence: "high", content: {} };
    const r = checkAutonym(
      fiche,
      "dataset/source/afrik/peuples/FLG_X/PPL_X.json"
    );
    expect(r!.severity).toBe("error");
  });

  it("warns (not errors) when autonym missing and confidence is null/missing", () => {
    const fiche: Fiche = { id: "PPL_X", content: {} };
    const r = checkAutonym(
      fiche,
      "dataset/source/afrik/peuples/FLG_X/PPL_X.json"
    );
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

  // ETNI-1359: the whole rule was unreachable from the corpus. Every PPL and
  // FLG fiche spells the field `classificationStatus`, so a fiche could be
  // published as colonial-legacy on a single source and this gate would still
  // report green.
  // @req REQ-023
  it("errors when a camelCase contested fiche carries fewer than 2 sources", () => {
    const fiche: Fiche = {
      id: "PPL_CORPUS",
      classificationStatus: "contested",
      content: { sources: ["only-one"] },
    };
    const r = checkSourcesCount(fiche, "PPL_CORPUS.json");
    expect(r).not.toBeNull();
    expect(r!.severity).toBe("error");
    expect(r!.rule).toBe("sources-count");
    expect(r!.slug).toBe("PPL_CORPUS");
  });

  // @req REQ-023
  it("passes when a camelCase contested fiche carries 2 sources", () => {
    const fiche: Fiche = {
      id: "PPL_CORPUS",
      classificationStatus: "contested",
      content: { sources: ["a", "b"] },
    };
    expect(checkSourcesCount(fiche, "PPL_CORPUS.json")).toBeNull();
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

describe("checkChronologySymmetry (Rule 6)", () => {
  function countryFiche(kingdoms: unknown[]): Fiche {
    return { id: "TST", content: { kingdoms } } as unknown as Fiche;
  }

  const datedColony = {
    name: "Protectorat britannique",
    period: "1894 - 1962",
    entryType: "colonial",
    timeRange: { startYear: 1894, endYear: 1962, precision: "year" },
  };
  const undatedPolity = {
    name: "Royaume du Buganda",
    period: "Précolonial - présent",
    entryType: "polity",
  };

  // @req REQ-148
  it("reports a polity left undated beside a dated colonial administration", () => {
    const findings = checkChronologySymmetry(
      countryFiche([undatedPolity, datedColony]),
      "dataset/source/afrik/pays/TST.json"
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("warning");
    expect(findings[0].rule).toBe("chronology-symmetry");
    expect(findings[0].message).toContain("Royaume du Buganda");
    expect(findings[0].message).toContain("Protectorat britannique");
  });

  /**
   * The rule is about asymmetry, not completeness. A country that dates
   * nothing is incomplete; a country that dates only its coloniser is making
   * a statement, and that is the one worth stopping.
   */
  // @req REQ-148
  it("says nothing when the country dates none of its entries", () => {
    expect(
      checkChronologySymmetry(
        countryFiche([
          undatedPolity,
          {
            name: "Colonie test",
            period: "Précolonial",
            entryType: "colonial",
          },
        ]),
        "dataset/source/afrik/pays/TST.json"
      )
    ).toEqual([]);
  });

  // @req REQ-148
  it("says nothing when every polity is dated", () => {
    expect(
      checkChronologySymmetry(
        countryFiche([
          {
            name: "Royaume du Buganda",
            period: "XIVe siècle - présent",
            entryType: "polity",
            timeRange: { startYear: 1301, ongoing: true, precision: "century" },
          },
          datedColony,
        ]),
        "dataset/source/afrik/pays/TST.json"
      )
    ).toEqual([]);
  });

  // @req REQ-148
  it("counts each undated polity, not each country", () => {
    const findings = checkChronologySymmetry(
      countryFiche([undatedPolity, { ...undatedPolity }, datedColony]),
      "dataset/source/afrik/pays/TST.json"
    );
    expect(findings).toHaveLength(2);
  });

  // @req REQ-148
  it("ignores an undated colonial entry — the rule measures the other side", () => {
    expect(
      checkChronologySymmetry(
        countryFiche([
          {
            name: "Colonie sans date",
            period: "Précolonial",
            entryType: "colonial",
          },
          datedColony,
        ]),
        "dataset/source/afrik/pays/TST.json"
      )
    ).toEqual([]);
  });

  // @req REQ-148
  it("does not apply to a fiche that is not a country", () => {
    expect(
      checkChronologySymmetry(
        countryFiche([undatedPolity, datedColony]),
        "dataset/source/afrik/peuples/FLG_BANTU/PPL_TEST.json"
      )
    ).toEqual([]);
  });

  // @req REQ-148
  it("does not apply to a country without kingdoms", () => {
    expect(
      checkChronologySymmetry(
        { id: "TST", content: {} } as unknown as Fiche,
        "dataset/source/afrik/pays/TST.json"
      )
    ).toEqual([]);
  });
});

describe("the ratchet on the real corpus", () => {
  /**
   * The assertion the constant exists for. Without it `UNDATED_POLITY_CEILING`
   * would be a number in a file that nothing compares to anything, and the
   * burn-down would be a claim rather than a measurement.
   */
  // @req REQ-148
  it("sits exactly on the recorded ceiling", () => {
    const result = runEditorialRules({
      repoRoot: path.join(__dirname, "../../.."),
      undatedPolityCeiling: UNDATED_POLITY_CEILING,
    });
    const ratchet = result.findings.filter(
      (f) => f.slug === "UNDATED_POLITY_CEILING"
    );
    expect(ratchet.map((f) => f.message)).toEqual([]);
  });

  // @req REQ-148
  it("is not armed for a caller that does not ask for it", () => {
    const result = runEditorialRules({
      repoRoot: path.join(__dirname, "../../.."),
    });
    expect(
      result.findings.some((f) => f.slug === "UNDATED_POLITY_CEILING")
    ).toBe(false);
  });
});

describe("checkUndatedPolityCeiling (the ratchet)", () => {
  // @req REQ-148
  it("passes when the corpus sits exactly at the recorded ceiling", () => {
    expect(checkUndatedPolityCeiling(77, 77)).toBeNull();
  });

  // @req REQ-148
  it("fails when a pass reintroduces an undated polity", () => {
    const finding = checkUndatedPolityCeiling(78, 77);
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toMatch(/78/);
  });

  /**
   * A ceiling left standing above the real count is a licence to climb back
   * to it, so falling below it fails too — the editorial pass that closed an
   * entry lowers the constant in the same change.
   */
  // @req REQ-148
  it("fails when the ceiling is left above the real count", () => {
    const finding = checkUndatedPolityCeiling(70, 77);
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toMatch(/70/);
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

  // @req REQ-146
  it("walks the English translations tree with the English register list", () => {
    writeFiche("peuples/FLG_BANTU/PPL_CLEAN.json", {
      id: "PPL_CLEAN",
      content: {
        appellations: { selfAppellation: "Test endonym" },
        sources: ["one", "two"],
      },
    });
    const sidecar = path.join(
      tmpRoot,
      "dataset",
      "translations",
      "en",
      "patronymes",
      "PAT_LEAK.json"
    );
    fs.mkdirSync(path.dirname(sidecar), { recursive: true });
    fs.writeFileSync(
      sidecar,
      JSON.stringify({
        id: "PAT_LEAK",
        gaps: [
          {
            fieldPath: "origin",
            reason:
              "Generated from the candidate queue; awaits the research protocol.",
          },
        ],
        _translation: { kind: "machine" },
      })
    );

    const r = runEditorialRules({ repoRoot: tmpRoot });

    expect(r.exitCode).toBe(1);
    expect(r.findings).toEqual([
      expect.objectContaining({
        rule: "reader-facing-register",
        severity: "error",
        file: path.join(
          "dataset",
          "translations",
          "en",
          "patronymes",
          "PAT_LEAK.json"
        ),
      }),
    ]);
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

describe("escapeWorkflowCommand", () => {
  it("escapes % first to avoid double-escaping later substitutions", () => {
    expect(escapeWorkflowCommand("100%")).toBe("100%25");
  });

  it("escapes carriage return and newline", () => {
    expect(escapeWorkflowCommand("a\r\nb")).toBe("a%0D%0Ab");
  });

  it("escapes colon and comma", () => {
    expect(escapeWorkflowCommand("a,b:c")).toBe("a%2Cb%3Ac");
  });

  it("escapes all special chars together with correct ordering", () => {
    // % must be escaped first; a literal `%0A` in the input becomes `%250A`,
    // not a real newline.
    expect(escapeWorkflowCommand("%0A\n,:")).toBe("%250A%0A%2C%3A");
  });
});

describe("formatAnnotation — workflow-command safety", () => {
  it("escapes commas and colons in the title", () => {
    const r: RuleResult = {
      rule: "autonym-required",
      severity: "error",
      file: "dataset/source/afrik/peuples/FLG_BANTU/PPL_X.json",
      slug: "PPL_X,evil::injection",
      message: "boom",
    };
    const line = formatAnnotation(r);
    // The raw `,` and `::` must not appear inside the title segment — they
    // would otherwise let a crafted slug forge a fake annotation field.
    expect(line).toContain(
      "title=autonym-required%3A%3APPL_X%2Cevil%3A%3Ainjection"
    );
    expect(line).not.toContain("title=autonym-required::PPL_X,");
  });

  it("escapes newlines and percent signs in the message", () => {
    const r: RuleResult = {
      rule: "sources-count",
      severity: "warning",
      file: "x.json",
      slug: "PPL_Y",
      message: "line1\nline2 100%",
    };
    const line = formatAnnotation(r);
    expect(line).toContain("%0A");
    expect(line).toContain("100%25");
    expect(line).not.toMatch(/\n/);
  });

  it("preserves file path with forward slashes and does not escape it", () => {
    const r: RuleResult = {
      rule: "autonym-required",
      severity: "error",
      file: "dataset/source/afrik/peuples/FLG_BANTU/PPL_X.json",
      slug: "PPL_X",
      message: "msg",
    };
    const line = formatAnnotation(r);
    expect(line).toContain(
      "file=dataset/source/afrik/peuples/FLG_BANTU/PPL_X.json"
    );
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
