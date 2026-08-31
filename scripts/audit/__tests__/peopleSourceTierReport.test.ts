import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  PEOPLE_SOURCE_TIER_ARTIFACT_NAMES,
  buildPrismicEligibilityManifest,
  renderPeopleSourceTierAuditJson,
  renderPeopleSourceTierAuditMarkdown,
  renderPrismicEligibilityManifest,
  writePeopleSourceTierAuditArtifacts,
} from "../peopleSourceTierReport";
import {
  DEFAULT_COUNTRY_DIRECTORY,
  DEFAULT_OUTPUT_DIRECTORY,
  DEFAULT_PEOPLE_DIRECTORY,
  getPeopleSourceTierAuditExitCode,
  parsePeopleSourceTierAuditArgs,
  runPeopleSourceTierAudit,
} from "../runPeopleSourceTierAudit";
import type { PeopleSourceTierAuditReport } from "../peopleSourceTierAudit";

let fixtureRoot: string;

const auditReport: PeopleSourceTierAuditReport = {
  peopleDirectory: "dataset/source/afrik/peuples",
  countryDirectory: "dataset/source/afrik/pays",
  profiles: [
    {
      peopleId: "PPL_ZULU",
      filePath: "dataset/source/afrik/peuples/FLG_BANTU/PPL_ZULU.json",
      parseSuccess: true,
      currentCountries: ["ZAF"],
      sourceCount: 1,
      tierCounts: { official: 1, referenced: 0, unverified: 0 },
      findings: [],
      countryDeviations: [],
      countryParseFailures: [],
      eligible: true,
    },
    {
      peopleId: "PPL_BAMBARA",
      filePath: "dataset/source/afrik/peuples/FLG_MANDE/PPL_BAMBARA.json",
      parseSuccess: true,
      currentCountries: ["MLI"],
      sourceCount: 0,
      tierCounts: { official: 0, referenced: 0, unverified: 0 },
      findings: [
        {
          code: "SOURCE_MISSING",
          message: "The people profile must contain at least one source",
        },
      ],
      countryDeviations: [
        {
          countryId: "MLI",
          filePath: "dataset/source/afrik/pays/MLI.json",
          totalPercentage: 98,
          deviationFrom100: -2,
        },
      ],
      countryParseFailures: [],
      eligible: false,
    },
    {
      peopleId: "PPL_AKAN",
      filePath: "dataset/source/afrik/peuples/FLG_NIGER_CONGO/PPL_AKAN.json",
      parseSuccess: true,
      currentCountries: ["GHA"],
      sourceCount: 1,
      tierCounts: { official: 1, referenced: 0, unverified: 0 },
      findings: [],
      countryDeviations: [],
      countryParseFailures: [],
      eligible: true,
    },
  ],
  countryDeviations: [
    {
      countryId: "MLI",
      filePath: "dataset/source/afrik/pays/MLI.json",
      totalPercentage: 98,
      deviationFrom100: -2,
    },
  ],
  countryParseFailures: [
    {
      countryId: "COD",
      filePath: "dataset/source/afrik/pays/COD.json",
      error: "Country demographics.peoples must be an array",
    },
  ],
  summary: {
    totalProfiles: 3,
    eligibleProfiles: 2,
    ineligibleProfiles: 1,
    parseFailures: 0,
    countryDeviations: 1,
    tierCounts: { official: 2, referenced: 0, unverified: 0 },
  },
};

beforeEach(async () => {
  fixtureRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "people-source-tier-report-")
  );
});

afterEach(async () => {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
});

describe("people source tier report rendering", () => {
  it("renders deterministic pretty JSON without runtime metadata", () => {
    const first = renderPeopleSourceTierAuditJson(auditReport);
    const second = renderPeopleSourceTierAuditJson(auditReport);

    expect(first).toBe(second);
    expect(first).toBe(`${JSON.stringify(auditReport, null, 2)}\n`);
    expect(first).not.toContain("generatedAt");
  });

  it("renders a readable Markdown summary with stable findings and eligibility details", () => {
    const markdown = renderPeopleSourceTierAuditMarkdown(auditReport);

    expect(markdown).toContain("# People Source Tier Audit");
    expect(markdown).toContain("| Total profiles | 3 |");
    expect(markdown).toContain("| SOURCE_MISSING | 1 |");
    expect(markdown).toContain("| SOURCE_UNTIERED | 0 |");
    expect(markdown).toContain("| Officielle (official) | 2 |");
    expect(markdown).toContain(
      "| MLI | dataset/source/afrik/pays/MLI.json | 98 | -2 |"
    );
    expect(markdown).toContain(
      "| COD | dataset/source/afrik/pays/COD.json | Country demographics.peoples must be an array |"
    );
    expect(markdown).toContain(
      "| PPL_BAMBARA | Excluded | dataset/source/afrik/peuples/FLG_MANDE/PPL_BAMBARA.json | SOURCE_MISSING | MLI | None |"
    );
    expect(markdown).toContain(
      "| PPL_ZULU | Eligible | dataset/source/afrik/peuples/FLG_BANTU/PPL_ZULU.json | None | None | None |"
    );
  });

  it("builds a versioned, sorted manifest containing only eligible profiles", () => {
    const manifest = buildPrismicEligibilityManifest(auditReport);

    expect(manifest).toEqual({
      schemaVersion: 1,
      profiles: [
        {
          peopleId: "PPL_AKAN",
          filePath:
            "dataset/source/afrik/peuples/FLG_NIGER_CONGO/PPL_AKAN.json",
        },
        {
          peopleId: "PPL_ZULU",
          filePath: "dataset/source/afrik/peuples/FLG_BANTU/PPL_ZULU.json",
        },
      ],
    });
    expect(renderPrismicEligibilityManifest(auditReport)).toBe(
      `${JSON.stringify(manifest, null, 2)}\n`
    );
  });
});

describe("people source tier artifact writing", () => {
  it("creates the output directory and writes exactly the three named artifacts", async () => {
    const outputDirectory = path.join(fixtureRoot, "nested", "logs");

    const artifactPaths = await writePeopleSourceTierAuditArtifacts(
      auditReport,
      outputDirectory
    );

    await expect(fs.readdir(outputDirectory)).resolves.toEqual(
      Object.values(PEOPLE_SOURCE_TIER_ARTIFACT_NAMES).sort()
    );
    expect(artifactPaths).toEqual({
      json: path.join(outputDirectory, PEOPLE_SOURCE_TIER_ARTIFACT_NAMES.json),
      markdown: path.join(
        outputDirectory,
        PEOPLE_SOURCE_TIER_ARTIFACT_NAMES.markdown
      ),
      manifest: path.join(
        outputDirectory,
        PEOPLE_SOURCE_TIER_ARTIFACT_NAMES.manifest
      ),
    });
    await expect(fs.readFile(artifactPaths.json, "utf8")).resolves.toBe(
      renderPeopleSourceTierAuditJson(auditReport)
    );
    await expect(fs.readFile(artifactPaths.markdown, "utf8")).resolves.toBe(
      renderPeopleSourceTierAuditMarkdown(auditReport)
    );
    await expect(fs.readFile(artifactPaths.manifest, "utf8")).resolves.toBe(
      renderPrismicEligibilityManifest(auditReport)
    );
  });
});

describe("people source tier audit CLI behavior", () => {
  it("uses repository defaults and accepts explicit path flags", () => {
    expect(parsePeopleSourceTierAuditArgs([])).toEqual({
      peopleDirectory: DEFAULT_PEOPLE_DIRECTORY,
      countryDirectory: DEFAULT_COUNTRY_DIRECTORY,
      outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
      check: false,
    });
    expect(
      parsePeopleSourceTierAuditArgs([
        "--people",
        "people",
        "--countries",
        "countries",
        "--output",
        "logs",
        "--check",
      ])
    ).toEqual({
      peopleDirectory: "people",
      countryDirectory: "countries",
      outputDirectory: "logs",
      check: true,
    });
  });

  it("only fails check mode for exclusions or country parse failures", () => {
    expect(getPeopleSourceTierAuditExitCode(auditReport, false)).toBe(0);
    expect(getPeopleSourceTierAuditExitCode(auditReport, true)).toBe(1);

    const countryFailureOnlyReport = {
      ...auditReport,
      profiles: auditReport.profiles.filter((profile) => profile.eligible),
      summary: {
        ...auditReport.summary,
        totalProfiles: 2,
        eligibleProfiles: 2,
        ineligibleProfiles: 0,
        countryDeviations: 0,
      },
      countryDeviations: [],
    };
    expect(
      getPeopleSourceTierAuditExitCode(countryFailureOnlyReport, true)
    ).toBe(1);

    const compliantReport = {
      ...countryFailureOnlyReport,
      countryParseFailures: [],
    };
    expect(getPeopleSourceTierAuditExitCode(compliantReport, true)).toBe(0);
  });

  it("writes artifacts before returning a non-zero check status", async () => {
    const peopleDirectory = path.join(fixtureRoot, "people");
    const countryDirectory = path.join(fixtureRoot, "countries");
    const outputDirectory = path.join(fixtureRoot, "logs");
    await fs.mkdir(peopleDirectory, { recursive: true });
    await fs.mkdir(countryDirectory, { recursive: true });
    await fs.writeFile(
      path.join(peopleDirectory, "PPL_EXCLUDED.json"),
      JSON.stringify({
        id: "PPL_EXCLUDED",
        currentCountries: [],
        content: { sources: [] },
      }),
      "utf8"
    );

    const result = await runPeopleSourceTierAudit({
      peopleDirectory,
      countryDirectory,
      outputDirectory,
      check: true,
    });

    expect(result.exitCode).toBe(1);
    expect(result.report.summary.ineligibleProfiles).toBe(1);
    await expect(fs.readdir(outputDirectory)).resolves.toEqual(
      Object.values(PEOPLE_SOURCE_TIER_ARTIFACT_NAMES).sort()
    );
  });
});
