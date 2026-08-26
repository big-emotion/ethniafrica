import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  auditPeopleSourceTiers,
  discoverJsonFiles,
  type PeopleSourceTierAuditReport,
} from "../peopleSourceTierAudit";

let fixtureRoot: string;
let peopleDirectory: string;
let countryDirectory: string;

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function peopleProfile(
  id: string,
  sources: unknown,
  currentCountries: string[] = []
): Record<string, unknown> {
  return {
    id,
    currentCountries,
    content: { sources },
  };
}

function countryProfile(
  id: string,
  percentages: number[]
): Record<string, unknown> {
  return {
    id,
    content: {
      demographics: {
        peoples: percentages.map((percentageInCountry) => ({
          percentageInCountry,
        })),
      },
    },
  };
}

function profile(
  report: PeopleSourceTierAuditReport,
  peopleId: string
): PeopleSourceTierAuditReport["profiles"][number] {
  const result = report.profiles.find((item) => item.peopleId === peopleId);
  expect(result).toBeDefined();
  if (!result) {
    throw new Error(`Expected audit profile ${peopleId}`);
  }
  return result;
}

beforeEach(async () => {
  fixtureRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "people-source-tier-audit-")
  );
  peopleDirectory = path.join(fixtureRoot, "people");
  countryDirectory = path.join(fixtureRoot, "countries");
  await fs.mkdir(peopleDirectory, { recursive: true });
  await fs.mkdir(countryDirectory, { recursive: true });
});

afterEach(async () => {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
});

describe("discoverJsonFiles", () => {
  it("recursively discovers only JSON files in deterministic path order", async () => {
    await writeJson(path.join(peopleDirectory, "z/PPL_Z.json"), {});
    await writeJson(path.join(peopleDirectory, "a/PPL_B.json"), {});
    await writeJson(path.join(peopleDirectory, "a/nested/PPL_A.json"), {});
    await fs.writeFile(path.join(peopleDirectory, "ignored.txt"), "{}", "utf8");

    await expect(discoverJsonFiles(peopleDirectory)).resolves.toEqual([
      path.join(peopleDirectory, "a/nested/PPL_A.json"),
      path.join(peopleDirectory, "a/PPL_B.json"),
      path.join(peopleDirectory, "z/PPL_Z.json"),
    ]);
  });
});

describe("auditPeopleSourceTiers", () => {
  it("reports parse failures and leaves source files unchanged", async () => {
    const validPath = path.join(peopleDirectory, "PPL_VALID.json");
    const invalidPath = path.join(peopleDirectory, "PPL_INVALID.json");
    await writeJson(
      validPath,
      peopleProfile("PPL_VALID", [
        {
          title: "UN source",
          url: "https://data.un.org/example",
          tier: "official",
        },
      ])
    );
    await fs.writeFile(invalidPath, "{ invalid", "utf8");
    const before = await Promise.all([
      fs.readFile(validPath, "utf8"),
      fs.readFile(invalidPath, "utf8"),
    ]);

    const report = await auditPeopleSourceTiers(
      peopleDirectory,
      countryDirectory
    );

    expect(profile(report, "PPL_VALID").eligible).toBe(true);
    expect(
      report.profiles.find((item) => item.filePath === invalidPath)
    ).toEqual(
      expect.objectContaining({
        parseSuccess: false,
        eligible: false,
        findings: [expect.objectContaining({ code: "PROFILE_PARSE_FAILURE" })],
      })
    );
    await expect(
      Promise.all([
        fs.readFile(validPath, "utf8"),
        fs.readFile(invalidPath, "utf8"),
      ])
    ).resolves.toEqual(before);
  });

  // @req REQ-092
  it("accepts any explicitly tiered source and flags one with no title", async () => {
    await writeJson(
      path.join(peopleDirectory, "PPL_GOOD.json"),
      peopleProfile("PPL_GOOD", [
        {
          title: "Glottolog language record",
          url: "https://glottolog.org/resource/languoid/id/example",
          tier: "official",
        },
        {
          title: "Community account of the naming dispute",
          url: "https://example.org/community",
          tier: "unverified",
        },
        {
          title: "Monograph with no online edition",
          url: null,
          tier: "referenced",
        },
      ])
    );
    await writeJson(
      path.join(peopleDirectory, "PPL_BAD.json"),
      peopleProfile("PPL_BAD", [
        {
          title: "",
          url: "https://example.com/untitled",
          tier: "official",
        },
      ])
    );

    const report = await auditPeopleSourceTiers(
      peopleDirectory,
      countryDirectory
    );

    expect(profile(report, "PPL_GOOD")).toEqual(
      expect.objectContaining({ eligible: true, findings: [] })
    );
    expect(profile(report, "PPL_GOOD").tierCounts).toEqual({
      official: 1,
      referenced: 1,
      unverified: 1,
    });
    expect(profile(report, "PPL_BAD").findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "SOURCE_MALFORMED" }),
      ])
    );
    expect(profile(report, "PPL_BAD").eligible).toBe(false);
  });

  // @req REQ-092
  it("flags a legacy string source and a tier left at needs_review", async () => {
    await writeJson(
      path.join(peopleDirectory, "PPL_LEGACY.json"),
      peopleProfile("PPL_LEGACY", [
        "SIL Ethnologue — Example",
        {
          title: "Recensements nationaux sud-africains",
          url: null,
          tier: "needs_review",
        },
      ])
    );

    const result = profile(
      await auditPeopleSourceTiers(peopleDirectory, countryDirectory),
      "PPL_LEGACY"
    );

    expect(result.findings).toEqual([
      expect.objectContaining({ code: "SOURCE_LEGACY_STRING", sourceIndex: 0 }),
      expect.objectContaining({ code: "SOURCE_UNTIERED", sourceIndex: 1 }),
    ]);
    expect(result.eligible).toBe(false);
  });

  it("distinguishes missing and malformed source blocks", async () => {
    await writeJson(path.join(peopleDirectory, "PPL_MISSING.json"), {
      id: "PPL_MISSING",
      content: {},
    });
    await writeJson(
      path.join(peopleDirectory, "PPL_MALFORMED.json"),
      peopleProfile("PPL_MALFORMED", { title: "not an array" })
    );

    const report = await auditPeopleSourceTiers(
      peopleDirectory,
      countryDirectory
    );

    expect(profile(report, "PPL_MISSING").findings[0].code).toBe(
      "SOURCE_MISSING"
    );
    expect(profile(report, "PPL_MALFORMED").findings[0].code).toBe(
      "SOURCE_MALFORMED"
    );
  });

  // @req REQ-092
  it("cites Wikipedia as a source at the unverified tier rather than rejecting it", async () => {
    await writeJson(
      path.join(peopleDirectory, "PPL_WIKIPEDIA_SOURCE.json"),
      peopleProfile("PPL_WIKIPEDIA_SOURCE", [
        {
          title: "Wikipedia article",
          url: "https://en.wikipedia.org/wiki/Example",
          tier: "unverified",
          notes: "Compared the EN and FR language editions.",
        },
      ])
    );

    const result = profile(
      await auditPeopleSourceTiers(peopleDirectory, countryDirectory),
      "PPL_WIKIPEDIA_SOURCE"
    );

    expect(result.findings).toEqual([]);
    expect(result.eligible).toBe(true);
  });

  it("reports deterministic FR28-strict country deviations and blocks associated profiles", async () => {
    await writeJson(
      path.join(countryDirectory, "nested/ZWE.json"),
      countryProfile("ZWE", [80, 18])
    );
    await writeJson(
      path.join(countryDirectory, "COM.json"),
      countryProfile("COM", [99, 2])
    );
    await writeJson(
      path.join(countryDirectory, "BEN.json"),
      countryProfile("BEN", [60, 40])
    );
    await writeJson(
      path.join(peopleDirectory, "PPL_BLOCKED.json"),
      peopleProfile(
        "PPL_BLOCKED",
        [
          {
            title: "IWGIA profile",
            url: "https://iwgia.org/en/example.html",
            tier: "official",
          },
        ],
        ["ZWE", "BEN"]
      )
    );
    await writeJson(
      path.join(peopleDirectory, "PPL_EDGE.json"),
      peopleProfile(
        "PPL_EDGE",
        [
          {
            title: "CIA profile",
            url: "https://www.cia.gov/the-world-factbook/example",
            tier: "official",
          },
        ],
        ["COM"]
      )
    );

    const report = await auditPeopleSourceTiers(
      peopleDirectory,
      countryDirectory
    );

    expect(report.countryDeviations).toEqual([
      {
        countryId: "ZWE",
        filePath: path.join(countryDirectory, "nested/ZWE.json"),
        totalPercentage: 98,
        deviationFrom100: -2,
      },
    ]);
    expect(profile(report, "PPL_BLOCKED")).toEqual(
      expect.objectContaining({
        eligible: false,
        countryDeviations: [expect.objectContaining({ countryId: "ZWE" })],
      })
    );
    expect(profile(report, "PPL_EDGE").eligible).toBe(true);
  });

  it("associates referenced country parse failures and blocks eligibility", async () => {
    await fs.writeFile(
      path.join(countryDirectory, "ZWE.json"),
      "{ invalid",
      "utf8"
    );
    await writeJson(
      path.join(peopleDirectory, "PPL_BLOCKED.json"),
      peopleProfile(
        "PPL_BLOCKED",
        [
          {
            title: "UN record",
            url: "https://data.un.org/example",
            tier: "official",
          },
        ],
        ["ZWE"]
      )
    );

    const report = await auditPeopleSourceTiers(
      peopleDirectory,
      countryDirectory
    );
    const result = profile(report, "PPL_BLOCKED");

    expect(result.countryParseFailures).toEqual([
      expect.objectContaining({
        countryId: "ZWE",
        filePath: path.join(countryDirectory, "ZWE.json"),
      }),
    ]);
    expect(result.eligible).toBe(false);
  });

  it("skips countries without an FR28 demographic record", async () => {
    await writeJson(path.join(countryDirectory, "MDG.json"), {
      id: "MDG",
      content: {
        demographics: null,
      },
    });
    await writeJson(
      path.join(peopleDirectory, "PPL_MALAGASY.json"),
      peopleProfile(
        "PPL_MALAGASY",
        [
          {
            title: "UN record",
            url: "https://data.un.org/example",
            tier: "official",
          },
        ],
        ["MDG"]
      )
    );

    const report = await auditPeopleSourceTiers(
      peopleDirectory,
      countryDirectory
    );

    expect(report.countryParseFailures).toEqual([]);
    expect(report.countryDeviations).toEqual([]);
    expect(profile(report, "PPL_MALAGASY").eligible).toBe(true);
  });

  it("returns profiles and summary counts in deterministic order", async () => {
    await writeJson(
      path.join(peopleDirectory, "z/PPL_Z.json"),
      peopleProfile("PPL_Z", [])
    );
    await writeJson(
      path.join(peopleDirectory, "a/PPL_A.json"),
      peopleProfile("PPL_A", [
        {
          title: "UNFPA record",
          url: "https://example.unfpa.org/resource",
          tier: "official",
        },
      ])
    );

    const report = await auditPeopleSourceTiers(
      peopleDirectory,
      countryDirectory
    );

    expect(report.profiles.map((item) => item.peopleId)).toEqual([
      "PPL_A",
      "PPL_Z",
    ]);
    expect(report.summary).toEqual({
      totalProfiles: 2,
      eligibleProfiles: 1,
      ineligibleProfiles: 1,
      parseFailures: 0,
      countryDeviations: 0,
      tierCounts: { official: 1, referenced: 0, unverified: 0 },
    });
  });
});
