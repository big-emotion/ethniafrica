import fs from "fs/promises";
import path from "path";
import type {
  PeopleSourceFindingCode,
  PeopleSourceTierAuditReport,
} from "./peopleSourceTierAudit";

export const PEOPLE_SOURCE_TIER_ARTIFACT_NAMES = {
  json: "people-source-tier-audit.json",
  markdown: "people-source-tier-audit.md",
  manifest: "people-source-tier-prismic-manifest.json",
} as const;

export interface PrismicEligibilityManifest {
  schemaVersion: 1;
  profiles: Array<{
    peopleId: string;
    filePath: string;
  }>;
}

export interface PeopleSourceTierArtifactPaths {
  json: string;
  markdown: string;
  manifest: string;
}

const FINDING_CODES: PeopleSourceFindingCode[] = [
  "PROFILE_PARSE_FAILURE",
  "SOURCE_MISSING",
  "SOURCE_MALFORMED",
  "SOURCE_UNTIERED",
  "SOURCE_LEGACY_STRING",
];

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function escapeMarkdownCell(value: string | number): string {
  return String(value).replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ");
}

function markdownTable(headers: string[], rows: Array<Array<string | number>>) {
  const header = `| ${headers.map(escapeMarkdownCell).join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map(
    (row) => `| ${row.map(escapeMarkdownCell).join(" | ")} |`
  );
  return [header, separator, ...body].join("\n");
}

function findingCounts(
  report: PeopleSourceTierAuditReport
): Map<PeopleSourceFindingCode, number> {
  const counts = new Map<PeopleSourceFindingCode, number>(
    FINDING_CODES.map((code) => [code, 0])
  );

  for (const profile of report.profiles) {
    for (const finding of profile.findings) {
      counts.set(finding.code, (counts.get(finding.code) ?? 0) + 1);
    }
  }

  return counts;
}

export function renderPeopleSourceTierAuditJson(
  report: PeopleSourceTierAuditReport
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderPeopleSourceTierAuditMarkdown(
  report: PeopleSourceTierAuditReport
): string {
  const counts = findingCounts(report);
  const deviationRows = report.countryDeviations.map((deviation) => [
    deviation.countryId,
    deviation.filePath,
    deviation.totalPercentage,
    deviation.deviationFrom100,
  ]);
  const countryParseFailureRows = report.countryParseFailures.map((failure) => [
    failure.countryId,
    failure.filePath,
    failure.error,
  ]);
  const profileRows = report.profiles.map((profile) => [
    profile.peopleId,
    profile.eligible ? "Eligible" : "Excluded",
    profile.filePath,
    profile.findings.map((finding) => finding.code).join(", ") || "None",
    profile.countryDeviations
      .map((deviation) => deviation.countryId)
      .join(", ") || "None",
    profile.countryParseFailures
      .map((failure) => failure.countryId)
      .join(", ") || "None",
  ]);

  const sections = [
    "# People Source Tier Audit",
    "## Summary",
    markdownTable(
      ["Metric", "Count"],
      [
        ["Total profiles", report.summary.totalProfiles],
        ["Eligible profiles", report.summary.eligibleProfiles],
        ["Excluded profiles", report.summary.ineligibleProfiles],
        ["Profile parse failures", report.summary.parseFailures],
        ["FR28-strict country deviations", report.summary.countryDeviations],
        ["Country parse failures", report.countryParseFailures.length],
      ]
    ),
    "## Source Tier Mix",
    markdownTable(
      ["Tier", "Sources"],
      [
        ["Officielle (official)", report.summary.tierCounts.official],
        ["Référencée (referenced)", report.summary.tierCounts.referenced],
        ["Non vérifiée (unverified)", report.summary.tierCounts.unverified],
      ]
    ),
    "## Finding Counts",
    markdownTable(
      ["Code", "Count"],
      FINDING_CODES.map((code) => [code, counts.get(code) ?? 0])
    ),
    "## FR28-strict Country Deviations",
    deviationRows.length > 0
      ? markdownTable(
          ["Country", "Path", "Total percentage", "Deviation from 100"],
          deviationRows
        )
      : "None.",
    "## Country Parse Failures",
    countryParseFailureRows.length > 0
      ? markdownTable(["Country", "Path", "Error"], countryParseFailureRows)
      : "None.",
    "## Profile Eligibility",
    profileRows.length > 0
      ? markdownTable(
          [
            "Profile",
            "Status",
            "Path",
            "Findings",
            "FR28-strict countries",
            "Country parse failures",
          ],
          profileRows
        )
      : "None.",
  ];

  return `${sections.join("\n\n")}\n`;
}

export function buildPrismicEligibilityManifest(
  report: PeopleSourceTierAuditReport
): PrismicEligibilityManifest {
  const profiles = report.profiles
    .filter((profile) => profile.eligible)
    .map((profile) => ({
      peopleId: profile.peopleId,
      filePath: profile.filePath,
    }))
    .sort(
      (left, right) =>
        compareText(left.peopleId, right.peopleId) ||
        compareText(left.filePath, right.filePath)
    );

  return {
    schemaVersion: 1,
    profiles,
  };
}

export function renderPrismicEligibilityManifest(
  report: PeopleSourceTierAuditReport
): string {
  return `${JSON.stringify(buildPrismicEligibilityManifest(report), null, 2)}\n`;
}

export async function writePeopleSourceTierAuditArtifacts(
  report: PeopleSourceTierAuditReport,
  outputDirectory: string
): Promise<PeopleSourceTierArtifactPaths> {
  const artifactPaths = {
    json: path.join(outputDirectory, PEOPLE_SOURCE_TIER_ARTIFACT_NAMES.json),
    markdown: path.join(
      outputDirectory,
      PEOPLE_SOURCE_TIER_ARTIFACT_NAMES.markdown
    ),
    manifest: path.join(
      outputDirectory,
      PEOPLE_SOURCE_TIER_ARTIFACT_NAMES.manifest
    ),
  };

  await fs.mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    fs.writeFile(
      artifactPaths.json,
      renderPeopleSourceTierAuditJson(report),
      "utf8"
    ),
    fs.writeFile(
      artifactPaths.markdown,
      renderPeopleSourceTierAuditMarkdown(report),
      "utf8"
    ),
    fs.writeFile(
      artifactPaths.manifest,
      renderPrismicEligibilityManifest(report),
      "utf8"
    ),
  ]);

  return artifactPaths;
}
