import { pathToFileURL } from "url";
import { logger } from "@/lib/api/logger";
import {
  auditPeopleSourceTiers,
  type PeopleSourceTierAuditReport,
} from "./peopleSourceTierAudit";
import {
  writePeopleSourceTierAuditArtifacts,
  type PeopleSourceTierArtifactPaths,
} from "./peopleSourceTierReport";

export const DEFAULT_PEOPLE_DIRECTORY = "dataset/source/afrik/peuples";
export const DEFAULT_COUNTRY_DIRECTORY = "dataset/source/afrik/pays";
export const DEFAULT_OUTPUT_DIRECTORY = "dataset/source/afrik/logs";

export interface PeopleSourceTierAuditOptions {
  peopleDirectory: string;
  countryDirectory: string;
  outputDirectory: string;
  check: boolean;
}

export interface PeopleSourceTierAuditRunResult {
  report: PeopleSourceTierAuditReport;
  artifacts: PeopleSourceTierArtifactPaths;
  exitCode: number;
}

function requiredFlagValue(
  args: string[],
  index: number,
  flag: string
): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a path`);
  }
  return value;
}

export function parsePeopleSourceTierAuditArgs(
  args: string[]
): PeopleSourceTierAuditOptions {
  const options: PeopleSourceTierAuditOptions = {
    peopleDirectory: DEFAULT_PEOPLE_DIRECTORY,
    countryDirectory: DEFAULT_COUNTRY_DIRECTORY,
    outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
    check: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--check") {
      options.check = true;
      continue;
    }
    if (argument === "--people") {
      options.peopleDirectory = requiredFlagValue(args, index, argument);
      index += 1;
      continue;
    }
    if (argument === "--countries") {
      options.countryDirectory = requiredFlagValue(args, index, argument);
      index += 1;
      continue;
    }
    if (argument === "--output") {
      options.outputDirectory = requiredFlagValue(args, index, argument);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

export function getPeopleSourceTierAuditExitCode(
  report: PeopleSourceTierAuditReport,
  check: boolean
): number {
  if (!check) return 0;
  return report.summary.ineligibleProfiles > 0 ||
    report.countryParseFailures.length > 0
    ? 1
    : 0;
}

export async function runPeopleSourceTierAudit(
  options: PeopleSourceTierAuditOptions
): Promise<PeopleSourceTierAuditRunResult> {
  const report = await auditPeopleSourceTiers(
    options.peopleDirectory,
    options.countryDirectory
  );
  const artifacts = await writePeopleSourceTierAuditArtifacts(
    report,
    options.outputDirectory
  );

  return {
    report,
    artifacts,
    exitCode: getPeopleSourceTierAuditExitCode(report, options.check),
  };
}

async function main(): Promise<void> {
  try {
    const options = parsePeopleSourceTierAuditArgs(process.argv.slice(2));
    const result = await runPeopleSourceTierAudit(options);
    logger.info("People source tier audit artifacts written", {
      totalProfiles: result.report.summary.totalProfiles,
      eligibleProfiles: result.report.summary.eligibleProfiles,
      ineligibleProfiles: result.report.summary.ineligibleProfiles,
      countryParseFailures: result.report.countryParseFailures.length,
      outputDirectory: options.outputDirectory,
    });

    if (result.exitCode !== 0) {
      logger.warn("People source tier audit check found migration blockers", {
        ineligibleProfiles: result.report.summary.ineligibleProfiles,
        countryParseFailures: result.report.countryParseFailures.length,
      });
    }
    process.exitCode = result.exitCode;
  } catch (error) {
    logger.error("People source tier audit failed", error);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main();
}
