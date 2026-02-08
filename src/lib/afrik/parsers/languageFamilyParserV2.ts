/**
 * Parser V2 for harmonized AFRIK language family files
 * Following KISS principle: simple, focused functions with single responsibilities
 *
 * Parses the harmonized format:
 * - Header décolonial (lines starting with "- Field :")
 * - Section 1: Informations générales
 * - Section 2: Peuples associés
 * - Section 3-6: Other content sections
 */

export interface LanguageFamilyV2 {
  // Identifiers
  name: string;
  familyId: string;
  nameEn?: string;

  // Basic data
  speakers: number | null;
  geographicArea: string[];
  numberOfLanguages?: number;

  // Relations
  peoples: Array<{ name: string; peopleId: string | null }>;
  sources: string[];

  // Decolonial header
  decolonialHeader: {
    whyProblematic?: string;
    selfAppellation?: string;
    contemporaryUsage?: string;
  };

  // Section 3: Linguistic characteristics
  linguisticCharacteristics: {
    typology?: string;
    phonologicalFeatures?: string;
    relationsWithNeighbors?: string;
    keyInnovations?: string;
  };

  // Section 4: History and origins
  historyAndOrigins: {
    probableOrigin?: string;
    emergencePeriod?: string;
    diffusion?: string;
    historicalBreaks?: string;
    contactZones?: string;
    majorEvents?: string;
  };

  // Section 5: Distribution (optional, rarely filled)
  distribution?: {
    totalSpeakers?: number;
    distributionByCountry?: string; // Raw format from .txt
  };
}

/**
 * Parse speaker count from French text format
 * Handles: "environ X millions", "plus de X millions", "moins de X millions"
 * @param text - French text describing number of speakers
 * @returns Number of speakers or null if cannot parse
 */
export function parseSpeakers(text: string): number | null {
  if (!text || !text.trim()) {
    return null;
  }

  // Match patterns like:
  // - "environ 500 millions"
  // - "plus de 30 millions"
  // - "500 millions"
  // - "1,5 millions" or "1.5 millions"
  const millionPattern =
    /(?:environ|plus de|moins de)?\s*([\d,\.\s]+)\s*millions?/i;
  const match = text.match(millionPattern);

  if (!match) {
    return null;
  }

  // Extract number and normalize (remove spaces, convert comma to dot)
  const numberStr = match[1].replace(/\s+/g, "").replace(",", ".");
  const millions = parseFloat(numberStr);

  if (isNaN(millions)) {
    return null;
  }

  return millions * 1000000;
}

/**
 * Parse geographic area from comma-separated list
 * @param text - Comma-separated list of regions/countries
 * @returns Array of trimmed area names
 */
export function parseGeographicArea(text: string): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  return text
    .split(",")
    .map((area) => area.trim())
    .filter((area) => area.length > 0);
}

/**
 * Parse peoples list from Section 2
 * Format: "- Peuple N : Name (PPL_ID)"
 * @param text - Multi-line peoples section
 * @returns Array of people objects
 */
export function parsePeoples(
  text: string
): Array<{ name: string; peopleId: string | null }> {
  if (!text || !text.trim()) {
    return [];
  }

  const peoples: Array<{ name: string; peopleId: string | null }> = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Match: "- Peuple N : Name (PPL_ID)" or "- Peuple N : Name ( PPL_ID )"
    const matchWithId = trimmed.match(
      /^-\s*Peuple\s+\d+\s*:\s*(.+?)\s*\(\s*([A-Z_]+)\s*\)$/i
    );
    if (matchWithId) {
      peoples.push({
        name: matchWithId[1].trim(),
        peopleId: matchWithId[2].trim(),
      });
      continue;
    }

    // Match: "- Peuple N : Name" (without ID)
    const matchWithoutId = trimmed.match(/^-\s*Peuple\s+\d+\s*:\s*(.+)$/i);
    if (matchWithoutId) {
      peoples.push({
        name: matchWithoutId[1].trim(),
        peopleId: null,
      });
    }
  }

  return peoples;
}

/**
 * Parse languages list (stub - not used in current fiches)
 * @param text - Languages text
 * @returns Empty array (languages are not in current format)
 */
export function parseLanguages(
  text: string
): Array<{ name: string; code: string }> {
  // Languages are not in the harmonized format, return empty array
  return [];
}

/**
 * Parse sources list from Section 6
 * @param text - Multi-line sources section
 * @returns Array of source strings
 */
function parseSources(text: string): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.startsWith("-"))
    .map((line) => line.replace(/^-\s*/, ""));
}

/**
 * Parse decolonial header fields used in frontend
 * @param headerContent - Full header content
 * @returns Decolonial header object
 */
function parseDecolonialHeader(headerContent: string): {
  whyProblematic?: string;
  selfAppellation?: string;
  contemporaryUsage?: string;
} {
  const result: {
    whyProblematic?: string;
    selfAppellation?: string;
    contemporaryUsage?: string;
  } = {};

  const why = extractHeaderField(
    headerContent,
    "Pourquoi le terme pose problème"
  );
  if (why) result.whyProblematic = why;

  const self = extractHeaderField(headerContent, "Auto-appellation");
  if (self) result.selfAppellation = self;

  const usage = extractHeaderField(headerContent, "Usage contemporain");
  if (usage) result.contemporaryUsage = usage;

  return result;
}

/**
 * Parse Section 3: Caractéristiques linguistiques
 * Maps field names from .txt to expected TypeScript properties
 * @param sectionContent - Section 3 content
 * @returns Linguistic characteristics object
 */
function parseLinguisticCharacteristics(sectionContent: string): {
  typology?: string;
  phonologicalFeatures?: string;
  relationsWithNeighbors?: string;
  keyInnovations?: string;
} {
  const result: {
    typology?: string;
    phonologicalFeatures?: string;
    relationsWithNeighbors?: string;
    keyInnovations?: string;
  } = {};

  // Map: "Typologie linguistique" -> typology
  const typology = extractSectionField(
    sectionContent,
    "Typologie linguistique"
  );
  if (typology) result.typology = typology;

  // Map: "Particularités phonologiques" -> phonologicalFeatures
  const phono = extractSectionField(
    sectionContent,
    "Particularités phonologiques"
  );
  if (phono) result.phonologicalFeatures = phono;

  // Map: "Liens avec les familles voisines" -> relationsWithNeighbors
  const relations = extractSectionField(
    sectionContent,
    "Liens avec les familles voisines"
  );
  if (relations) result.relationsWithNeighbors = relations;

  // Map: "Innovations clés" -> keyInnovations
  const innovations = extractSectionField(sectionContent, "Innovations clés");
  if (innovations) result.keyInnovations = innovations;

  return result;
}

/**
 * Parse Section 4: Histoire et origines
 * Maps field names from .txt to expected TypeScript properties
 * @param sectionContent - Section 4 content
 * @returns History and origins object
 */
function parseHistoryAndOrigins(sectionContent: string): {
  probableOrigin?: string;
  emergencePeriod?: string;
  diffusion?: string;
  historicalBreaks?: string;
  contactZones?: string;
  majorEvents?: string;
} {
  const result: {
    probableOrigin?: string;
    emergencePeriod?: string;
    diffusion?: string;
    historicalBreaks?: string;
    contactZones?: string;
    majorEvents?: string;
  } = {};

  // Map fields
  const origin = extractSectionField(sectionContent, "Origine probable");
  if (origin) result.probableOrigin = origin;

  const emergence = extractSectionField(
    sectionContent,
    "Période d'émergence estimée"
  );
  if (emergence) result.emergencePeriod = emergence;

  const diffusion = extractSectionField(
    sectionContent,
    "Diffusion des langues"
  );
  if (diffusion) result.diffusion = diffusion;

  const breaks = extractSectionField(sectionContent, "Ruptures historiques");
  if (breaks) result.historicalBreaks = breaks;

  const zones = extractSectionField(
    sectionContent,
    "Zones de contact et métissages"
  );
  if (zones) result.contactZones = zones;

  const events = extractSectionField(
    sectionContent,
    "Événements historiques majeurs"
  );
  if (events) result.majorEvents = events;

  return result;
}

/**
 * Extract number of languages from header field
 * @param headerContent - Full header content
 * @returns Number of languages or undefined
 */
function extractNumberOfLanguages(headerContent: string): number | undefined {
  const field = extractHeaderField(headerContent, "Nombre de langues");
  if (!field) return undefined;

  // Extract number from text like "environ 500", "plus de 30", "500"
  const match = field.match(/(\d+)/);
  if (!match) return undefined;

  return parseInt(match[1]);
}

/**
 * Extract field from header section
 * Format: "- Field name : value"
 * @param content - Full header content
 * @param fieldName - Field to extract
 * @returns Field value or null if not found
 */
function extractHeaderField(content: string, fieldName: string): string | null {
  const lines = content.split("\n");
  const currentField = "";
  let inField = false;
  let fieldContent = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if this line starts a new field
    const fieldMatch = trimmed.match(/^-\s*(.+?)\s*:/);
    if (fieldMatch) {
      // If we were collecting the target field, we're done
      if (inField) {
        break;
      }

      // Check if this is our target field
      const foundField = fieldMatch[1].trim();
      if (foundField.toLowerCase().includes(fieldName.toLowerCase())) {
        inField = true;
        // Get content after the colon
        const colonIndex = trimmed.indexOf(":");
        fieldContent = trimmed.substring(colonIndex + 1).trim();
      }
    } else if (inField && trimmed.length > 0) {
      // Continue collecting multi-line field content
      fieldContent += " " + trimmed;
    }
  }

  return fieldContent || null;
}

/**
 * Extract a numbered section (# N. Section title)
 * @param content - Full file content
 * @param sectionNumber - Section number (1-6)
 * @returns Section content or null if not found
 */
function extractSection(content: string, sectionNumber: number): string | null {
  // Find section start: "# N. "
  const sectionPattern = new RegExp(`^#\\s+${sectionNumber}\\.\\s+.+$`, "gm");
  const matches = content.matchAll(sectionPattern);
  const matchesArray = Array.from(matches);

  if (matchesArray.length === 0) {
    return null;
  }

  const startIndex = matchesArray[0].index!;

  // Find next section or end of file
  const nextSectionPattern = /^#\s+\d+\.\s+/gm;
  nextSectionPattern.lastIndex = startIndex + matchesArray[0][0].length;
  const nextMatch = nextSectionPattern.exec(content);

  const endIndex = nextMatch ? nextMatch.index : content.length;

  return content.substring(startIndex, endIndex).trim();
}

/**
 * Extract value from section line
 * Format: "- Field : value"
 * @param sectionContent - Section content
 * @param fieldName - Field to extract
 * @returns Field value or null
 */
function extractSectionField(
  sectionContent: string,
  fieldName: string
): string | null {
  const lines = sectionContent.split("\n");
  let inField = false;
  let fieldContent = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if this line starts with "- FieldName :"
    if (
      trimmed.startsWith("-") &&
      trimmed.toLowerCase().includes(fieldName.toLowerCase())
    ) {
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex !== -1) {
        inField = true;
        fieldContent = trimmed.substring(colonIndex + 1).trim();
      }
    } else if (inField) {
      // Check if we hit another field
      if (trimmed.startsWith("-") && trimmed.includes(":")) {
        break;
      }
      // Continue multi-line content
      if (trimmed.length > 0 && !trimmed.startsWith("#")) {
        fieldContent += " " + trimmed;
      }
    }
  }

  return fieldContent || null;
}

/**
 * Parse complete language family file (harmonized format)
 * @param content - Full file content
 * @returns Parsed language family data
 * @throws Error if required fields are missing or invalid
 */
export function parseLanguageFamilyV2(content: string): LanguageFamilyV2 {
  // Extract header section (everything before "## MODÈLE STRUCTURÉ AFRIK")
  const headerEndIndex = content.indexOf("## MODÈLE STRUCTURÉ AFRIK");
  if (headerEndIndex === -1) {
    throw new Error('Missing "MODÈLE STRUCTURÉ AFRIK" separator');
  }

  const headerContent = content.substring(0, headerEndIndex);

  // Extract family ID from header
  const familyId = extractHeaderField(
    headerContent,
    "Identifiant famille linguistique"
  );
  if (!familyId || !familyId.startsWith("FLG_")) {
    throw new Error("Missing or invalid family ID (must start with FLG_)");
  }

  // Extract French name from header
  const name = extractHeaderField(headerContent, "Nom français");
  if (!name) {
    throw new Error("Missing French name in header");
  }

  // Extract speakers from header
  const speakersHeaderText = extractHeaderField(
    headerContent,
    "Nombre total de locuteurs"
  );
  const speakersFromHeader = speakersHeaderText
    ? parseSpeakers(speakersHeaderText)
    : null;

  // Extract geographic area from header
  const geoAreaHeaderText = extractHeaderField(
    headerContent,
    "Aire / répartition géographique"
  );
  const geoAreaFromHeader = geoAreaHeaderText
    ? parseGeographicArea(geoAreaHeaderText)
    : [];

  // Extract Section 1: Informations générales
  const section1 = extractSection(content, 1);
  if (!section1) {
    throw new Error("Missing Section 1: Informations générales");
  }

  // Extract fields from Section 1
  const geoAreaSection1Text = extractSectionField(
    section1,
    "Aire géographique"
  );
  const geoAreaSection1 = geoAreaSection1Text
    ? parseGeographicArea(geoAreaSection1Text)
    : [];

  const speakersSection1Text = extractSectionField(
    section1,
    "Nombre total de locuteurs"
  );
  const speakersSection1 = speakersSection1Text
    ? parseSpeakers(speakersSection1Text)
    : null;

  // Prefer Section 1 data over header data
  const geographicArea =
    geoAreaSection1.length > 0 ? geoAreaSection1 : geoAreaFromHeader;
  const speakers =
    speakersSection1 !== null ? speakersSection1 : speakersFromHeader;

  // Extract Section 2: Peuples associés
  const section2 = extractSection(content, 2);
  const peoples = section2 ? parsePeoples(section2) : [];

  // Parse Section 3: Caractéristiques linguistiques
  const section3 = extractSection(content, 3);
  const linguisticCharacteristics = section3
    ? parseLinguisticCharacteristics(section3)
    : {};

  // Parse Section 4: Histoire et origines
  const section4 = extractSection(content, 4);
  const historyAndOrigins = section4 ? parseHistoryAndOrigins(section4) : {};

  // Parse Section 5: Distribution (optional, rarely filled)
  const section5 = extractSection(content, 5);
  const distribution = section5
    ? {
        totalSpeakers: speakers, // Reuse the total already parsed
        distributionByCountry: extractSectionField(
          section5,
          "Répartition par pays"
        ),
      }
    : undefined;

  // Extract Section 6: Sources
  const section6 = extractSection(content, 6);
  const sources = section6 ? parseSources(section6) : [];

  // Parse decolonial header
  const decolonialHeader = parseDecolonialHeader(headerContent);

  // Extract number of languages
  const numberOfLanguages = extractNumberOfLanguages(headerContent);

  // Extract English name
  const nameEn = extractHeaderField(headerContent, "Nom anglais");

  return {
    name,
    familyId,
    nameEn: nameEn || undefined,
    speakers,
    geographicArea,
    numberOfLanguages,
    peoples,
    sources,
    decolonialHeader,
    linguisticCharacteristics,
    historyAndOrigins,
    distribution,
  };
}
