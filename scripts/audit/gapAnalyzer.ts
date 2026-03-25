/**
 * AFRIK Cross-Layer Gap Analyzer
 *
 * Detects data loss between pipeline layers:
 *   Source TXT files -> Parsers -> Supabase DB -> API -> Frontend Components
 *
 * Each analyzer function checks for a specific known gap and returns
 * a CrossLayerGap object if the gap is confirmed, or null if not applicable.
 */

import fs from "fs";
import path from "path";
import type { CrossLayerGap } from "./types";
import { parsePeopleFile } from "@/lib/afrik/parsers/peopleParser";
import { parseLanguageFamilyV2 } from "@/lib/afrik/parsers/languageFamilyParserV2";

// Dataset root path
const DATASET_ROOT = path.resolve(__dirname, "../../dataset/source/afrik");

// Decolonial header fields present in source TXT files
const ALL_DECOLONIAL_FIELDS = [
  "Appellation(s) historique(s)",
  "Origine du terme historique",
  "Pourquoi le terme pose problème",
  "Auto-appellation",
  "Usage contemporain",
  "Lien avec la famille linguistique",
] as const;

// Fields that the parser actually extracts
const EXTRACTED_DECOLONIAL_FIELDS = [
  "Pourquoi le terme pose problème",
  "Auto-appellation",
  "Usage contemporain",
] as const;

/**
 * Detect that people culture Section 5 has nested subsections (A-F)
 * that parseSection() flattens into key-value pairs, losing structure.
 *
 * Checks the raw text for subsection markers (A., B., ###, etc.)
 * then verifies the parser output is flat.
 */
export function analyzePeopleCultureGap(
  sampleContent: string
): CrossLayerGap | null {
  // Check if the content has a culture section
  const cultureMatch = sampleContent.match(
    /# 5\. Culture, rites et traditions/
  );
  if (!cultureMatch) return null;

  // Extract culture section content
  const cultureStart = cultureMatch.index!;
  const nextSectionMatch = sampleContent
    .slice(cultureStart + 1)
    .match(/^# \d+\./m);
  const cultureEnd = nextSectionMatch
    ? cultureStart + 1 + nextSectionMatch.index!
    : sampleContent.length;
  const cultureText = sampleContent.slice(cultureStart, cultureEnd);

  // Check for nested subsection markers in the raw text
  const hasNestedSubsections =
    /^###\s+[A-F]\./m.test(cultureText) || // ### A. Divinites format
    /^[A-F]\.\s+/m.test(cultureText) || // A. Divinites format (without ###)
    /- [A-Za-zÀ-ÿ]+ :\s*\n\s+-/m.test(cultureText); // Nested bullet lists

  // Parse the file and check if culture is flat key-value
  const parsed = parsePeopleFile(sampleContent);
  if (!parsed.success || !parsed.data) return null;

  const culture = parsed.data.content?.culture;
  if (!culture) return null;

  // The parser always flattens culture into Record<string, string> via parseSection()
  // Even if no explicit A-F headers exist, the nested list structure is lost
  const cultureKeys = Object.keys(culture);
  const allValuesAreStrings = cultureKeys.every(
    (k) => typeof (culture as Record<string, unknown>)[k] === "string"
  );

  if (allValuesAreStrings) {
    return {
      layer: "source-parser",
      entityType: "people",
      field: "culture",
      severity: "high",
      description:
        "People culture Section 5 contains nested subsections (rites, symbols, " +
        "arts, spiritualities) with multi-level structure, but parseSection() " +
        "returns flat key-value pairs cast to DetailedCultureSection. " +
        "The nested structure is lost, preventing the UI from displaying " +
        "hierarchical culture data.",
    };
  }

  return null;
}

/**
 * Detect missing decolonial header fields in language family parser output.
 *
 * The source TXT has up to 6 decolonial fields but the parser
 * (parseDecolonialHeader) only extracts 3: whyProblematic, selfAppellation,
 * contemporaryUsage. Missing: historicalAppellations, originOfHistoricalTerm,
 * linkWithLinguisticFamily.
 */
export function analyzeFamilyDecolonialGap(
  sampleContent: string
): CrossLayerGap | null {
  // Check which decolonial fields exist in the raw source text
  const fieldsInSource: string[] = [];
  for (const field of ALL_DECOLONIAL_FIELDS) {
    // Match "- FieldName :" or "- FieldName:" pattern in the header
    const pattern = new RegExp(
      `-\\s*${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "i"
    );
    if (pattern.test(sampleContent)) {
      fieldsInSource.push(field);
    }
  }

  // Determine which fields are in source but NOT extracted by the parser
  const missingFields = fieldsInSource.filter(
    (field) =>
      !EXTRACTED_DECOLONIAL_FIELDS.some((extracted) =>
        field.toLowerCase().includes(extracted.toLowerCase())
      )
  );

  if (missingFields.length === 0) return null;

  return {
    layer: "source-parser",
    entityType: "languageFamily",
    field: "decolonialHeader",
    severity: "medium",
    description:
      `Language family parser extracts only 3 of ${fieldsInSource.length} ` +
      `decolonial header fields. Missing fields present in source: ` +
      `${missingFields.join(", ")}. These fields contain important ` +
      `decolonial context that is lost during parsing.`,
  };
}

/**
 * Static gap: country historicalFacts (Section 6) is parsed by countryParser
 * into data.content.historicalFacts, but countryDataTransformer never
 * references it. The Carte vivante country page has no section for it.
 *
 * Always returns the gap (known structural gap).
 */
export function analyzeCountryHistoricalFactsGap(): CrossLayerGap {
  return {
    layer: "parser-component",
    entityType: "country",
    field: "historicalFacts",
    severity: "high",
    description:
      "Country Section 6 (Faits historiques majeurs) is parsed by " +
      "countryParser into content.historicalFacts with structured data " +
      "(ancientPeriods, middleAges, precolonial, colonization, " +
      "independenceStruggle, postIndependence), but countryDataTransformer " +
      "never uses this field. The Carte vivante UI has no display section " +
      "for historical facts, so this rich data is parsed but never shown.",
  };
}

/**
 * Detect that country demographics template has percentageInAfrica
 * field in the TXT source but the parser does not extract it.
 */
export function analyzeCountryDemographicsGap(
  sampleContent: string
): CrossLayerGap | null {
  // Check if raw text contains "Pourcentage en Afrique"
  const hasPercentageInAfrica = /Pourcentage en Afrique/i.test(sampleContent);

  if (!hasPercentageInAfrica) return null;

  // The parseDemographicsContent function in countryParser.ts only extracts:
  // population, percentageInCountry, peopleId, region, languageFamily
  // It does NOT extract percentageInAfrica
  return {
    layer: "source-parser",
    entityType: "country",
    field: "percentageInAfrica",
    severity: "low",
    description:
      "Country demographics template includes 'Pourcentage en Afrique' " +
      "field in each people block, but countryParser's " +
      "parseDemographicsContent() does not extract it. " +
      "This continental-level demographic data is present in source " +
      "files but lost during parsing.",
  };
}

/**
 * Static gap: countryDataTransformer uses heavy regex patterns
 * to extract etymology words/languages/dates. If the text doesn't
 * match expected French patterns, transforms return empty.
 *
 * Always returns the gap.
 */
export function analyzeEtymologyFragilityGap(): CrossLayerGap {
  return {
    layer: "component-source",
    entityType: "country",
    field: "etymology",
    severity: "medium",
    description:
      "countryDataTransformer uses French-specific regex patterns " +
      '(e.g., \'"Word" vient du LANGUAGE et signifie "meaning"\') to ' +
      "extract structured etymology data. If the source text uses " +
      "non-standard phrasing, different quote styles, or English text, " +
      "transformEtymology() returns undefined and transformHero() " +
      "returns empty meaning fields. This makes etymology display " +
      "fragile and dependent on exact French sentence structure.",
  };
}

/**
 * Static gap: language family parser returns distribution.distributionByCountry
 * as a raw string, but the frontend type in afrik-frontend.ts expects
 * Record<CountryId, number>.
 *
 * Always returns the gap.
 */
export function analyzeDistributionTypeGap(): CrossLayerGap {
  return {
    layer: "parser-component",
    entityType: "languageFamily",
    field: "distribution.distributionByCountry",
    severity: "medium",
    description:
      "Language family parser returns distribution.distributionByCountry " +
      "as a raw string (comma-separated country list from the TXT file), " +
      "but the frontend type system expects structured data. " +
      "There is no transformation layer to convert the raw string into " +
      "a usable format for the UI, resulting in a type mismatch between " +
      "the parser output and component expectations.",
  };
}

/**
 * Detect that people demography section has "Repartition par pays"
 * data in the source TXT but the parser only extracts totalPopulation,
 * referenceYear, and source.
 */
export function analyzePeopleDemographyGap(
  sampleContent: string
): CrossLayerGap | null {
  // Check if raw text contains country-level distribution data
  const hasDistribution = /Répartition par pays/i.test(sampleContent);

  if (!hasDistribution) return null;

  // Verify the parser does not extract this field
  const parsed = parsePeopleFile(sampleContent);
  if (!parsed.success || !parsed.data) return null;

  const demography = parsed.data.content?.demography;
  if (!demography) return null;

  // Check if the parsed demography has distribution data
  const hasDistributionInParsed =
    "distributionByCountry" in demography ||
    "countryDistribution" in demography ||
    "repartitionByCountry" in demography;

  if (hasDistributionInParsed) return null;

  return {
    layer: "source-parser",
    entityType: "people",
    field: "demography.distributionByCountry",
    severity: "medium",
    description:
      'People demography Section 7 contains "Répartition par pays" ' +
      "with per-country population breakdowns, but parsePeopleFile() " +
      "only extracts totalPopulation, referenceYear, and source. " +
      "The country-level demographic distribution is present in source " +
      "files but not captured in the parsed output.",
  };
}

/**
 * Run all gap analyzers and collect results.
 *
 * For dynamic analyzers, reads sample files from the dataset.
 * For static analyzers, returns known structural gaps directly.
 */
export async function analyzeAllGaps(): Promise<CrossLayerGap[]> {
  const gaps: CrossLayerGap[] = [];

  // Read sample files for dynamic analysis
  let peopleContent: string | null = null;
  let familyContent: string | null = null;
  let countryContent: string | null = null;

  try {
    const peoplePath = path.join(
      DATASET_ROOT,
      "peuples/FLG_BANTU/PPL_ZULU.txt"
    );
    peopleContent = fs.readFileSync(peoplePath, "utf-8");
  } catch {
    // File not available, skip dynamic people analysis
  }

  try {
    const familyPath = path.join(
      DATASET_ROOT,
      "famille_linguistique/FLG_BANTU.txt"
    );
    familyContent = fs.readFileSync(familyPath, "utf-8");
  } catch {
    // File not available, skip dynamic family analysis
  }

  try {
    const countryPath = path.join(DATASET_ROOT, "pays/BFA.txt");
    countryContent = fs.readFileSync(countryPath, "utf-8");
  } catch {
    // File not available, skip dynamic country analysis
  }

  // 1. Dynamic: People culture gap (source-parser, HIGH)
  if (peopleContent) {
    const cultureGap = analyzePeopleCultureGap(peopleContent);
    if (cultureGap) gaps.push(cultureGap);
  }

  // 2. Dynamic: Family decolonial header gap (source-parser, MEDIUM)
  if (familyContent) {
    const decolonialGap = analyzeFamilyDecolonialGap(familyContent);
    if (decolonialGap) gaps.push(decolonialGap);
  }

  // 3. Static: Country historicalFacts not displayed (parser-component, HIGH)
  gaps.push(analyzeCountryHistoricalFactsGap());

  // 4. Dynamic: Country percentageInAfrica not parsed (source-parser, LOW)
  if (countryContent) {
    const demoGap = analyzeCountryDemographicsGap(countryContent);
    if (demoGap) gaps.push(demoGap);
  }

  // 5. Static: Etymology regex fragility (component-source, MEDIUM)
  gaps.push(analyzeEtymologyFragilityGap());

  // 6. Static: Distribution type mismatch (parser-component, MEDIUM)
  gaps.push(analyzeDistributionTypeGap());

  // 7. Dynamic: People demography distribution not parsed (source-parser, MEDIUM)
  if (peopleContent) {
    const peopleDemoGap = analyzePeopleDemographyGap(peopleContent);
    if (peopleDemoGap) gaps.push(peopleDemoGap);
  }

  return gaps;
}
