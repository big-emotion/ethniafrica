import { parse } from "csv-parse/sync";

export interface GlottologCountryInventoryOptions {
  countryId: string;
  glottologCountryCode: string;
  version: string;
  releaseTag: string;
  sourceCommit: string;
  sourceUrl: string;
  accessedAt: string;
}

interface GlottologCsvRow {
  ID: string;
  Name: string;
  Latitude: string;
  Longitude: string;
  Glottocode: string;
  ISO639P3code: string;
  Level: string;
  Countries: string;
  Family_ID: string;
  Language_ID: string;
}

export interface GlottologCountryEntry {
  glottocode: string;
  name: string;
  iso639P3Code: string | null;
  level: string;
  countries: string[];
  familyGlottocode: string | null;
  parentLanguageGlottocode: string | null;
  latitude: number | null;
  longitude: number | null;
}

const REQUIRED_COLUMNS = [
  "ID",
  "Name",
  "Latitude",
  "Longitude",
  "Glottocode",
  "ISO639P3code",
  "Level",
  "Countries",
  "Family_ID",
  "Language_ID",
] as const;

function nullable(value: string): string | null {
  return value || null;
}

function nullableNumber(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitCountries(value: string): string[] {
  return value
    .split(";")
    .map((country) => country.trim())
    .filter(Boolean);
}

export function buildGlottologCountryInventory(
  csv: string,
  options: GlottologCountryInventoryOptions
) {
  const header = parse(csv, { to_line: 1 })[0] as string[] | undefined;
  if (!header || REQUIRED_COLUMNS.some((column) => !header.includes(column))) {
    throw new Error("CSV does not expose the required Glottolog columns.");
  }

  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  }) as GlottologCsvRow[];
  const entries: GlottologCountryEntry[] = rows
    .filter((row) =>
      splitCountries(row.Countries).includes(options.glottologCountryCode)
    )
    .map((row) => ({
      glottocode: row.Glottocode || row.ID,
      name: row.Name,
      iso639P3Code: nullable(row.ISO639P3code),
      level: row.Level,
      countries: splitCountries(row.Countries),
      familyGlottocode: nullable(row.Family_ID),
      parentLanguageGlottocode: nullable(row.Language_ID),
      latitude: nullableNumber(row.Latitude),
      longitude: nullableNumber(row.Longitude),
    }))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, "en") ||
        left.glottocode.localeCompare(right.glottocode, "en")
    );

  return {
    schemaVersion: 1,
    countryId: options.countryId,
    glottologCountryCode: options.glottologCountryCode,
    updatedAt: options.accessedAt,
    source: {
      title: `Glottolog Database ${options.version} as CLDF`,
      authors:
        "Harald Hammarström, Robert Forkel, Martin Haspelmath, and Sebastian Bank",
      version: options.version,
      releaseTag: options.releaseTag,
      sourceCommit: options.sourceCommit,
      url: options.sourceUrl,
      accessedAt: options.accessedAt,
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
    methodology: {
      scope:
        "Glottolog language and dialect rows whose semicolon-delimited Countries field contains the exact requested country code.",
      caveats: [
        "This is a linguistic inventory, not an ethnic-group inventory or a speaker census.",
        "Language and dialect rows are counted separately and must not be summed without declaring the intended scope.",
        "An absent ISO 639-3 code does not invalidate a Glottocode-backed dialect or language record.",
        "Country association does not distinguish indigenous, immigrant, official, national, vehicular, or historical language roles.",
      ],
    },
    summary: {
      totalEntries: entries.length,
      languages: entries.filter((entry) => entry.level === "language").length,
      dialects: entries.filter((entry) => entry.level === "dialect").length,
      withIso639P3Code: entries.filter((entry) => entry.iso639P3Code).length,
      withoutIso639P3Code: entries.filter((entry) => !entry.iso639P3Code)
        .length,
    },
    entries,
  };
}
