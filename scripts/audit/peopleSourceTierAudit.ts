import fs from "fs/promises";
import path from "path";

/**
 * Under the Source Tier Policy nothing is forbidden and everything is
 * labelled, so the audit no longer reports "this source is too weak to
 * publish". What it reports is a source that carries no stated authority:
 * a legacy string, a malformed entry, or a tier left at `needs_review`.
 */
export type PeopleSourceFindingCode =
  | "PROFILE_PARSE_FAILURE"
  | "SOURCE_MISSING"
  | "SOURCE_MALFORMED"
  | "SOURCE_UNTIERED"
  | "SOURCE_LEGACY_STRING";

export type PeopleSourceTier = "official" | "referenced" | "unverified";

export interface PeopleSourceFinding {
  code: PeopleSourceFindingCode;
  message: string;
  sourceIndex?: number;
}

export type SourceTierCounts = Record<PeopleSourceTier, number>;

export interface CountryFr28StrictDeviation {
  countryId: string;
  filePath: string;
  totalPercentage: number;
  deviationFrom100: number;
}

export interface CountryAuditParseFailure {
  countryId: string;
  filePath: string;
  error: string;
}

export interface PeopleSourceProfileAudit {
  peopleId: string;
  filePath: string;
  parseSuccess: boolean;
  parseError?: string;
  currentCountries: string[];
  sourceCount: number;
  tierCounts: SourceTierCounts;
  findings: PeopleSourceFinding[];
  countryDeviations: CountryFr28StrictDeviation[];
  countryParseFailures: CountryAuditParseFailure[];
  eligible: boolean;
}

export interface PeopleSourceTierAuditReport {
  peopleDirectory: string;
  countryDirectory: string;
  profiles: PeopleSourceProfileAudit[];
  countryDeviations: CountryFr28StrictDeviation[];
  countryParseFailures: CountryAuditParseFailure[];
  summary: {
    totalProfiles: number;
    eligibleProfiles: number;
    ineligibleProfiles: number;
    parseFailures: number;
    countryDeviations: number;
    tierCounts: SourceTierCounts;
  };
}

interface ParsedPeopleProfile {
  peopleId: string;
  currentCountries: string[];
  sources: unknown;
}

type PendingPeopleAudit = Omit<
  PeopleSourceProfileAudit,
  "countryDeviations" | "countryParseFailures" | "eligible"
>;

interface CountryAuditResult {
  deviation?: CountryFr28StrictDeviation;
  parseFailure?: CountryAuditParseFailure;
}

const SOURCE_TIERS: PeopleSourceTier[] = [
  "official",
  "referenced",
  "unverified",
];

function emptyTierCounts(): SourceTierCounts {
  return { official: 0, referenced: 0, unverified: 0 };
}

function isSourceTier(value: unknown): value is PeopleSourceTier {
  return SOURCE_TIERS.includes(value as PeopleSourceTier);
}

function comparePaths(left: string, right: string): number {
  return left.localeCompare(right, "en");
}

export async function discoverJsonFiles(
  rootDirectory: string
): Promise<string[]> {
  const files: string[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => comparePaths(left.name, right.name));

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(entryPath);
      }
    }
  }

  await visit(rootDirectory);
  return files.sort(comparePaths);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseJson(rawContent: string): unknown {
  return JSON.parse(rawContent);
}

function fileId(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

function parsePeopleProfile(rawContent: string): ParsedPeopleProfile {
  const data = parseJson(rawContent);
  if (!isRecord(data) || !isNonEmptyString(data.id)) {
    throw new Error("People profile must contain a non-empty string id");
  }

  const currentCountries = Array.isArray(data.currentCountries)
    ? data.currentCountries.filter(isNonEmptyString)
    : [];
  const content = isRecord(data.content) ? data.content : undefined;

  return {
    peopleId: data.id,
    currentCountries: [...currentCountries].sort(comparePaths),
    sources: content?.sources,
  };
}

function finding(
  code: PeopleSourceFindingCode,
  message: string,
  sourceIndex?: number
): PeopleSourceFinding {
  return sourceIndex === undefined
    ? { code, message }
    : { code, message, sourceIndex };
}

/**
 * A structured source is sound when it names a work and states its authority.
 * The URL may be null: modele-source.json allows offline works, and a printed
 * monograph is not less citable than a web page.
 */
function auditStructuredSource(
  source: Record<string, unknown>,
  sourceIndex: number
): PeopleSourceFinding[] {
  if (!isNonEmptyString(source.title)) {
    return [
      finding(
        "SOURCE_MALFORMED",
        "A structured source requires a non-empty title",
        sourceIndex
      ),
    ];
  }

  if (!isSourceTier(source.tier)) {
    return [
      finding(
        "SOURCE_UNTIERED",
        `The source carries no explicit tier (found ${JSON.stringify(source.tier)}); it must be ruled official, referenced or unverified`,
        sourceIndex
      ),
    ];
  }

  return [];
}

function auditSources(sources: unknown): {
  sourceCount: number;
  tierCounts: SourceTierCounts;
  findings: PeopleSourceFinding[];
} {
  const tierCounts = emptyTierCounts();

  if (
    sources === undefined ||
    (Array.isArray(sources) && sources.length === 0)
  ) {
    return {
      sourceCount: 0,
      tierCounts,
      findings: [
        finding(
          "SOURCE_MISSING",
          "The people profile must contain at least one source"
        ),
      ],
    };
  }

  if (!Array.isArray(sources)) {
    return {
      sourceCount: 0,
      tierCounts,
      findings: [
        finding("SOURCE_MALFORMED", "The sources field must be an array"),
      ],
    };
  }

  const findings: PeopleSourceFinding[] = [];

  sources.forEach((source, sourceIndex) => {
    if (typeof source === "string") {
      findings.push(
        finding(
          "SOURCE_LEGACY_STRING",
          "Legacy string sources carry no tier; run scripts/codemods/tierStringSources.ts",
          sourceIndex
        )
      );
      return;
    }

    if (!isRecord(source)) {
      findings.push(
        finding(
          "SOURCE_MALFORMED",
          "Each source must be a structured entry",
          sourceIndex
        )
      );
      return;
    }

    if (isSourceTier(source.tier)) tierCounts[source.tier] += 1;
    findings.push(...auditStructuredSource(source, sourceIndex));
  });

  return { sourceCount: sources.length, tierCounts, findings };
}

async function auditPeopleFile(filePath: string): Promise<PendingPeopleAudit> {
  try {
    const rawContent = await fs.readFile(filePath, "utf8");
    const parsed = parsePeopleProfile(rawContent);
    const sourceAudit = auditSources(parsed.sources);

    return {
      peopleId: parsed.peopleId,
      filePath,
      parseSuccess: true,
      currentCountries: parsed.currentCountries,
      sourceCount: sourceAudit.sourceCount,
      tierCounts: sourceAudit.tierCounts,
      findings: sourceAudit.findings,
    };
  } catch (error) {
    const parseError =
      error instanceof Error ? error.message : "Unknown JSON parse error";

    return {
      peopleId: fileId(filePath),
      filePath,
      parseSuccess: false,
      parseError,
      currentCountries: [],
      sourceCount: 0,
      tierCounts: emptyTierCounts(),
      findings: [
        finding(
          "PROFILE_PARSE_FAILURE",
          `Unable to parse people profile: ${parseError}`
        ),
      ],
    };
  }
}

function parseCountryPercentages(rawContent: string): {
  countryId: string;
  percentages?: number[];
} {
  const data = parseJson(rawContent);
  if (!isRecord(data) || !isNonEmptyString(data.id)) {
    throw new Error("Country profile must contain a non-empty string id");
  }

  const content = data.content;
  const demographics = isRecord(content) ? content.demographics : undefined;
  const peoples = isRecord(demographics) ? demographics.peoples : undefined;
  if (peoples === undefined || peoples === null) {
    return { countryId: data.id };
  }
  if (!Array.isArray(peoples)) {
    throw new Error("Country demographics.peoples must be an array");
  }
  if (peoples.length === 0) {
    return { countryId: data.id };
  }

  const percentages: number[] = [];
  for (const people of peoples) {
    if (
      !isRecord(people) ||
      typeof people.percentageInCountry !== "number" ||
      !Number.isFinite(people.percentageInCountry)
    ) {
      throw new Error(
        "Every country demographic entry must have a finite percentageInCountry"
      );
    }
    percentages.push(people.percentageInCountry);
  }

  return { countryId: data.id, percentages };
}

async function auditCountryFile(filePath: string): Promise<CountryAuditResult> {
  try {
    const rawContent = await fs.readFile(filePath, "utf8");
    const { countryId, percentages } = parseCountryPercentages(rawContent);
    if (!percentages) return {};

    const totalPercentage = percentages.reduce(
      (total, percentage) => total + percentage,
      0
    );

    if (totalPercentage < 99 || totalPercentage > 101) {
      return {
        deviation: {
          countryId,
          filePath,
          totalPercentage,
          deviationFrom100: totalPercentage - 100,
        },
      };
    }

    return {};
  } catch (error) {
    return {
      parseFailure: {
        countryId: fileId(filePath),
        filePath,
        error:
          error instanceof Error ? error.message : "Unknown JSON parse error",
      },
    };
  }
}

export async function auditPeopleSourceTiers(
  peopleDirectory: string,
  countryDirectory: string
): Promise<PeopleSourceTierAuditReport> {
  const peopleFiles = await discoverJsonFiles(peopleDirectory);
  const pendingProfiles: PendingPeopleAudit[] = [];
  for (const filePath of peopleFiles) {
    pendingProfiles.push(await auditPeopleFile(filePath));
  }

  const countryFiles = await discoverJsonFiles(countryDirectory);
  const countryDeviations: CountryFr28StrictDeviation[] = [];
  const countryParseFailures: CountryAuditParseFailure[] = [];
  for (const filePath of countryFiles) {
    const result = await auditCountryFile(filePath);
    if (result.deviation) countryDeviations.push(result.deviation);
    if (result.parseFailure) countryParseFailures.push(result.parseFailure);
  }

  countryDeviations.sort((left, right) =>
    comparePaths(left.filePath, right.filePath)
  );
  countryParseFailures.sort((left, right) =>
    comparePaths(left.filePath, right.filePath)
  );

  const deviationsByCountry = new Map(
    countryDeviations.map((deviation) => [deviation.countryId, deviation])
  );
  const parseFailuresByCountry = new Map<string, CountryAuditParseFailure[]>();
  for (const parseFailure of countryParseFailures) {
    const failures = parseFailuresByCountry.get(parseFailure.countryId) ?? [];
    failures.push(parseFailure);
    parseFailuresByCountry.set(parseFailure.countryId, failures);
  }

  const profiles: PeopleSourceProfileAudit[] = pendingProfiles.map(
    (pendingProfile) => {
      const profileCountryDeviations = pendingProfile.currentCountries
        .map((countryId) => deviationsByCountry.get(countryId))
        .filter(
          (deviation): deviation is CountryFr28StrictDeviation =>
            deviation !== undefined
        );
      const profileCountryParseFailures =
        pendingProfile.currentCountries.flatMap(
          (countryId) => parseFailuresByCountry.get(countryId) ?? []
        );

      return {
        ...pendingProfile,
        countryDeviations: profileCountryDeviations,
        countryParseFailures: profileCountryParseFailures,
        eligible:
          pendingProfile.parseSuccess &&
          pendingProfile.sourceCount > 0 &&
          pendingProfile.findings.length === 0 &&
          profileCountryDeviations.length === 0 &&
          profileCountryParseFailures.length === 0,
      };
    }
  );

  const eligibleProfiles = profiles.filter(
    (profile) => profile.eligible
  ).length;
  const parseFailures = profiles.filter(
    (profile) => !profile.parseSuccess
  ).length;

  return {
    peopleDirectory,
    countryDirectory,
    profiles,
    countryDeviations,
    countryParseFailures,
    summary: {
      totalProfiles: profiles.length,
      eligibleProfiles,
      ineligibleProfiles: profiles.length - eligibleProfiles,
      parseFailures,
      countryDeviations: countryDeviations.length,
      tierCounts: profiles.reduce((totals, profile) => {
        for (const tier of SOURCE_TIERS)
          totals[tier] += profile.tierCounts[tier];
        return totals;
      }, emptyTierCounts()),
    },
  };
}
