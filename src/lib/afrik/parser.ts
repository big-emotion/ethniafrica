/**
 * AFRIK Parser - Main parser utilities
 *
 * Core functions for parsing AFRIK TXT files with evolutionary support
 * Principle: Extract stable identifiers + flexible section parsing
 */

import type { ParseError, ParseWarning, Kingdom } from "@/types/afrik";

/**
 * Extract AFRIK identifier from file content
 * Supports: PPL_, FLG_, ISO country codes, ISO 639-3 language codes
 */
export function extractIdentifier(
  content: string,
  type: "PPL" | "FLG" | "ISO_COUNTRY" | "ISO_LANGUAGE"
): string {
  let pattern: RegExp;
  let errorMsg: string;

  switch (type) {
    case "PPL":
      // Match PPL_XXXXX format
      pattern = /PPL_[A-Z_]+/;
      errorMsg = "Identifier PPL not found";
      break;
    case "FLG":
      // Match FLG_XXXXX format
      pattern = /FLG_[A-Z_]+/;
      errorMsg = "Identifier FLG not found";
      break;
    case "ISO_COUNTRY":
      // Match ISO 3166-1 alpha-3 (3 uppercase letters)
      pattern = /Identifiant pays[^:]*:\s*([A-Z]{3})/;
      errorMsg = "ISO country code not found";
      break;
    case "ISO_LANGUAGE":
      // Match ISO 639-3 (3 lowercase letters) in context
      pattern = /\(([a-z]{3})\)|\bISO 639-3\b[^(]*\(([a-z]{3})\)/;
      errorMsg = "ISO language code not found";
      break;
  }

  const match = content.match(pattern);

  if (!match) {
    throw new Error(errorMsg);
  }

  if (type === "ISO_COUNTRY") {
    return match[1];
  }

  if (type === "ISO_LANGUAGE") {
    return match[1] || match[2];
  }

  return match[0];
}

/**
 * Extract a single section from content
 * Returns undefined if section doesn't exist
 */
export function parseSection(
  content: string,
  sectionTitle: string
): Record<string, unknown> | unknown[] | undefined {
  // Escape special regex characters in section title
  const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Match section starting with # or ##
  const sectionPattern = new RegExp(`^#+\\s*${escapedTitle}\\s*$`, "mi");

  const sectionMatch = content.match(sectionPattern);
  if (!sectionMatch) {
    return undefined;
  }

  const sectionStartIndex = sectionMatch.index!;

  // Find next section or end of content
  const nextSectionPattern = /^#+\s+\d+\.|^#+\s+[A-Z]/m;
  const remainingContent = content.slice(
    sectionStartIndex + sectionMatch[0].length
  );
  const nextSectionMatch = remainingContent.match(nextSectionPattern);

  const sectionEndIndex = nextSectionMatch
    ? sectionStartIndex + sectionMatch[0].length + nextSectionMatch.index!
    : content.length;

  const sectionContent = content.slice(
    sectionStartIndex + sectionMatch[0].length,
    sectionEndIndex
  );

  return parseSectionContent(sectionContent, sectionTitle);
}

/**
 * Parse section content into structured data
 */
function parseSectionContent(
  content: string,
  sectionTitle: string
): Record<string, unknown> | unknown[] {
  // Check if this is a structured section with kingdoms/entities
  if (
    sectionTitle.includes("royaumes") ||
    sectionTitle.includes("politiques historiques")
  ) {
    return parseKingdomsSection(content);
  }

  // Check if this is a peoples section
  if (
    sectionTitle.includes("Peuples majeurs") ||
    sectionTitle.includes("Peuples associés")
  ) {
    return parsePeoplesSection(content);
  }

  const result: Record<string, unknown> = {};
  const lines = content.split("\n").filter((line) => line.trim());

  // Default: parse as key-value pairs
  let currentKey = "";
  let currentValue = "";

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and section markers
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    // Check if this is a key-value line (starts with -)
    if (trimmedLine.startsWith("-") && trimmedLine.includes(":")) {
      // Save previous key-value if exists
      if (currentKey) {
        result[currentKey] = currentValue.trim();
      }

      // Extract new key-value
      const colonIndex = trimmedLine.indexOf(":");
      currentKey = trimmedLine.slice(1, colonIndex).trim();
      currentValue = trimmedLine.slice(colonIndex + 1).trim();
    } else if (currentKey) {
      // Continuation of previous value (multiline)
      currentValue += " " + trimmedLine;
    }
  }

  // Save last key-value
  if (currentKey) {
    result[currentKey] = currentValue.trim();
  }

  return result;
}

/**
 * Parse kingdoms section with structured entries
 */
function parseKingdomsSection(content: string): { kingdoms: Kingdom[] } {
  const kingdoms: Kingdom[] = [];
  const kingdomPattern = /- \[([^\]]+)\]\s*:/g;

  let match;
  while ((match = kingdomPattern.exec(content)) !== null) {
    const kingdomName = match[1];
    const startIndex = match.index;

    // Find next kingdom or end of section
    kingdomPattern.lastIndex = startIndex + 1;
    const nextMatch = kingdomPattern.exec(content);
    kingdomPattern.lastIndex = startIndex + match[0].length;

    const endIndex = nextMatch ? nextMatch.index : content.length;
    const kingdomContent = content.slice(startIndex, endIndex);

    const kingdom: Partial<Kingdom> = { name: kingdomName };

    // Extract fields
    const periodMatch = kingdomContent.match(/Période\s*:\s*([^\n]+)/);
    if (periodMatch) kingdom.period = periodMatch[1].trim();

    const peoplesMatch = kingdomContent.match(
      /Peuples dominants\s*:\s*([^\n]+)/
    );
    if (peoplesMatch)
      kingdom.dominantPeoples = peoplesMatch[1].split(",").map((p) => p.trim());

    const centersMatch = kingdomContent.match(
      /Centres politiques\s*:\s*([^\n]+)/
    );
    if (centersMatch)
      kingdom.politicalCenters = centersMatch[1]
        .split(",")
        .map((c) => c.trim());

    const roleMatch = kingdomContent.match(/Rôle historique\s*:\s*([^\n]+)/);
    if (roleMatch) kingdom.historicalRole = roleMatch[1].trim();

    kingdoms.push(kingdom as Kingdom);
  }

  return { kingdoms };
}

/**
 * Parse peoples section (for countries or language families)
 */
interface PeopleEntry {
  name?: string;
  selfAppellation?: string;
  exonyms?: string[];
  peopleId?: string;
  mainRegion?: string;
  languages?: string[];
  languageFamily?: string;
  appellationRemarks?: string;
}

function parsePeoplesSection(content: string): PeopleEntry[] {
  const peoples: PeopleEntry[] = [];

  // Try pattern 1: "- Peuple X :" format
  const peoplePattern = /- Peuple \d+\s*:/g;
  let match;

  const matches: Array<{ startIndex: number; endIndex: number }> = [];

  while ((match = peoplePattern.exec(content)) !== null) {
    matches.push({ startIndex: match.index, endIndex: -1 });
  }

  // Set end indices
  for (let i = 0; i < matches.length; i++) {
    if (i < matches.length - 1) {
      matches[i].endIndex = matches[i + 1].startIndex;
    } else {
      matches[i].endIndex = content.length;
    }
  }

  // Parse each people entry
  for (const { startIndex, endIndex } of matches) {
    const peopleContent = content.slice(startIndex, endIndex);

    const people: PeopleEntry = {};

    // Extract fields
    const nameMatch = peopleContent.match(/Nom\s*:\s*([^\n]+)/);
    if (nameMatch) people.name = nameMatch[1].trim();

    const selfAppMatch = peopleContent.match(
      /Auto-appellation[^:]*:\s*([^\n]+)/
    );
    if (selfAppMatch) people.selfAppellation = selfAppMatch[1].trim();

    const exonymsMatch = peopleContent.match(/Exonymes[^:]*:\s*([^\n]+)/);
    if (exonymsMatch)
      people.exonyms = exonymsMatch[1].split(",").map((e) => e.trim());

    const idMatch = peopleContent.match(/PPL_[A-Z_]+/);
    if (idMatch) people.peopleId = idMatch[0];

    const regionMatch = peopleContent.match(/Région principale\s*:\s*([^\n]+)/);
    if (regionMatch) people.mainRegion = regionMatch[1].trim();

    const langMatch = peopleContent.match(/Langues parlées\s*:\s*([^\n]+)/);
    if (langMatch)
      people.languages = langMatch[1].split(",").map((l) => l.trim());

    const familyMatch = peopleContent.match(/FLG_[A-Z_]+/);
    if (familyMatch) people.languageFamily = familyMatch[0];

    // For simple format like "- Peuple 1 : Name (PPL_ID)"
    if (!people.name) {
      const simpleMatch = peopleContent.match(
        /- Peuple \d+\s*:\s*([^(\n]+)(?:\(([^)]+)\))?/
      );
      if (simpleMatch) {
        people.name = simpleMatch[1].trim();
        if (simpleMatch[2] && simpleMatch[2].startsWith("PPL_")) {
          people.peopleId = simpleMatch[2].trim();
        }
      }
    }

    peoples.push(people);
  }

  return peoples.length > 0 ? peoples : undefined;
}

/**
 * Parse all sections from content
 * Includes both known and unknown sections (for evolutivity)
 */
export function parseSections(content: string): Record<string, unknown> {
  const sections: Record<string, unknown> = {};

  // Match all section headers (# followed by title)
  const sectionPattern = /^(#+)\s+(.+?)$/gm;
  const matches: Array<{ level: number; title: string; index: number }> = [];

  let match;
  while ((match = sectionPattern.exec(content)) !== null) {
    const level = match[1].length;
    const title = match[2].trim();
    const index = match.index;

    matches.push({ level, title, index });
  }

  // Parse each section
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    // Only parse level 1 sections (single #)
    if (current.level !== 1) {
      continue;
    }

    const sectionContent = content.slice(
      current.index + content.slice(current.index).indexOf("\n"),
      next ? next.index : content.length
    );

    const parsed = parseSectionContent(sectionContent, current.title);
    sections[current.title] = parsed;
  }

  return sections;
}

/**
 * Extract relations from content
 * Supports: countries (ISO codes), peoples (PPL_), language families (FLG_), languages (ISO 639-3)
 */
export function extractRelations(
  content: string,
  type:
    | "countries"
    | "peoples"
    | "languageFamily"
    | "languages"
    | "majorPeoples"
): string[] | string {
  switch (type) {
    case "countries": {
      // Extract ISO 3166-1 alpha-3 codes
      const pattern = /\b([A-Z]{3})\b/g;
      const matches = Array.from(content.matchAll(pattern));
      const codes = matches
        .map((m) => m[1])
        .filter((code) => {
          // Filter out common false positives
          return ![
            "PPL",
            "FLG",
            "ISO",
            "XIe",
            "XVe",
            "XVIe",
            "XVIIe",
            "XIXe",
            "XXe",
          ].includes(code);
        });
      return [...new Set(codes)]; // Deduplicate
    }

    case "peoples": {
      // Extract PPL_ identifiers
      const pattern = /PPL_[A-Z_]+/g;
      const matches = Array.from(content.matchAll(pattern));
      return [...new Set(matches.map((m) => m[0]))];
    }

    case "majorPeoples": {
      // Same as peoples but specifically from major peoples section
      return extractRelations(content, "peoples");
    }

    case "languageFamily": {
      // Extract FLG_ identifier (single value)
      const pattern = /FLG_[A-Z_]+/;
      const match = content.match(pattern);
      return match ? match[0] : "";
    }

    case "languages": {
      // Extract ISO 639-3 codes (3 lowercase letters in parentheses)
      const pattern = /\(([a-z]{3})\)/g;
      const matches = Array.from(content.matchAll(pattern));
      return [...new Set(matches.map((m) => m[1]))];
    }

    default:
      return [];
  }
}
