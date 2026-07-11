/**
 * Country Data Transformer
 *
 * Transforms raw CountryDetail data into structured props for each
 * UI component of the "Carte vivante" country page.
 */

import type { CountryDetail } from "@/types/afrik-frontend";
import type {
  Kingdom,
  MajorPeopleEntry,
  CultureSection,
  HistoricalNamesSection,
  HistoricalFactsSection,
  DemographicsSection,
} from "@/types/afrik";

// ==========================================
// OUTPUT TYPES
// ==========================================

export interface HeroData {
  countryName: string;
  nameOfficial?: string;
  iso: string;
  flag: string;
  year?: string;
  meaningQuote?: string;
  meaningHighlight?: string;
  meaningLangs?: string;
  isUncertain: boolean;
}

export type EtymologyVariant = "split" | "single" | "uncertain";

export interface EtymologyWord {
  word: string;
  lang: string;
  definition: string;
}

export interface EtymologyData {
  variant: EtymologyVariant;
  words: EtymologyWord[];
  hypotheses?: string[];
  rawText?: string;
}

export type OriginTonality = "revolution" | "colonial" | "neutral";

export interface OriginData {
  personName: string;
  initials: string;
  date?: string;
  description?: string;
  oldName?: string;
  tonality: OriginTonality;
}

export type TimelineItemType = "kingdom" | "colonial" | "sovereign";

export interface TimelineItem {
  type: TimelineItemType;
  era: string;
  name: string;
  note?: string;
}

export interface TimelineData {
  items: TimelineItem[];
  gradientStops: { goldEnd: number; colonialEnd: number };
}

export interface PeopleRow {
  name: string;
  endonym?: string;
  pejorativeTerm?: string;
  percentage: number;
  population: number;
  populationFormatted: string;
  region?: string;
  languageFamily?: string;
  colorIndex: number;
  isOther?: boolean;
  groupedNames?: string[];
  peopleId?: string;
}

export interface PeoplesData {
  totalPopulation: number;
  totalPopulationFormatted: string;
  peopleCount: number;
  rows: PeopleRow[];
}

export interface KingdomCard {
  name: string;
  period?: string;
  peoples?: string;
  tags: string[];
}

export interface KingdomsData {
  title: string;
  cards: KingdomCard[];
  layout: "scroll" | "stack";
}

export type LanguageBubbleSize = "big" | "regular" | "small";

export interface LanguageBubble {
  name: string;
  code?: string;
  isOfficial: boolean;
  size: LanguageBubbleSize;
}

export interface LanguagesData {
  bubbles: LanguageBubble[];
  totalCount: number;
  overflowCount: number;
}

export interface CultureGridItem {
  slot: "religion" | "economy" | "social" | "relations";
  icon: string;
  label: string;
  keywords: string[];
}

export interface CultureGridData {
  items: CultureGridItem[];
}

export interface HistoricalFactsData {
  periods: Array<{
    label: string;
    content: string;
  }>;
}

export interface CountryPageData {
  hero: HeroData;
  etymology?: EtymologyData;
  origin?: OriginData;
  timeline: TimelineData;
  peoples: PeoplesData;
  kingdoms: KingdomsData;
  historicalFacts?: HistoricalFactsData;
  languages: LanguagesData;
  culture: CultureGridData;
  sources: string;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Generate flag emoji from ISO 3166-1 alpha-3 code.
 * Converts alpha-3 to alpha-2 first, then to regional indicator symbols.
 */
export function flagFromISO3(iso3: string): string {
  // Simple alpha-3 to alpha-2 mapping for common African countries
  const alpha3ToAlpha2: Record<string, string> = {
    BFA: "BF",
    NGA: "NG",
    TGO: "TG",
    DJI: "DJ",
    GHA: "GH",
    MLI: "ML",
    SEN: "SN",
    CIV: "CI",
    NER: "NE",
    CMR: "CM",
    TCD: "TD",
    COD: "CD",
    COG: "CG",
    GAB: "GA",
    GNQ: "GQ",
    CAF: "CF",
    AGO: "AO",
    MOZ: "MZ",
    ZWE: "ZW",
    ZAF: "ZA",
    KEN: "KE",
    TZA: "TZ",
    UGA: "UG",
    RWA: "RW",
    BDI: "BI",
    ETH: "ET",
    ERI: "ER",
    SOM: "SO",
    SDN: "SD",
    SSD: "SS",
    EGY: "EG",
    LBY: "LY",
    TUN: "TN",
    DZA: "DZ",
    MAR: "MA",
    MRT: "MR",
    GMB: "GM",
    GNB: "GW",
    GIN: "GN",
    SLE: "SL",
    LBR: "LR",
    BEN: "BJ",
    BWA: "BW",
    NAM: "NA",
    ZMB: "ZM",
    MWI: "MW",
    LSO: "LS",
    SWZ: "SZ",
    MDG: "MG",
    COM: "KM",
    MUS: "MU",
    SYC: "SC",
    CPV: "CV",
    STP: "ST",
  };

  const alpha2 = alpha3ToAlpha2[iso3.toUpperCase()];
  if (!alpha2) return "";

  return String.fromCodePoint(
    0x1f1e6 + alpha2.charCodeAt(0) - 65,
    0x1f1e6 + alpha2.charCodeAt(1) - 65
  );
}

/**
 * Format population number: 23000000 → "23M", 920000 → "920K"
 */
export function formatPopulation(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const formatted = m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
    return formatted.replace(".0M", "M");
  }
  if (n >= 1_000) {
    const k = Math.round(n / 1_000);
    return `${k}K`;
  }
  return String(n);
}

/**
 * Extract endonym from self-appellation text.
 * "Moaga (singulier), Moose (pluriel)" → "Moaga · Moose"
 */
export function extractEndonym(text: string): string {
  const parts = text.match(/(\S+)\s*\(/g);
  if (parts) {
    return parts.map((p) => p.replace(/\s*\($/, "").trim()).join(" · ");
  }
  return text.trim();
}

/**
 * Extract pejorative term from remarks text.
 * '"Fellata" peut avoir une connotation péjorative' → "Fellata"
 */
export function extractPejorative(text: string): string | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  if (lower.includes("péjorati") && !lower.includes("pas de")) {
    // Match any quote style before "péjoratif/péjorative"
    const match = text.match(/"([^"]+)".*péjorati/i);
    if (match) return match[1];
    // Also try curly quotes and guillemets
    const match2 = text.match(
      /[\u201C\u00AB]([^\u201D\u00BB]+)[\u201D\u00BB].*péjorati/i
    );
    if (match2) return match2[1];
  }
  return undefined;
}

/**
 * Shorten a region string.
 * "Plateau central du Burkina Faso (Ouagadougou, Yatenga)" → "Plateau central"
 */
export function shortenRegion(text: string): string {
  // Remove parenthetical content
  const clean = text.replace(/\([^)]*\)/g, "").trim();
  // Split at "du" or "de"
  const parts = clean.split(/ du | de | d'/i);
  return parts[0].trim();
}

/**
 * Shorten language family string.
 * "Niger-Congo – Gur (FLG_GUR)" → "Niger-Congo Gur"
 */
export function shortenFamily(text: string): string {
  return text
    .replace(/\s*\(FLG_\w+\)/g, "")
    .replace(/ – /g, " ")
    .trim();
}

/**
 * Extract keywords from a paragraph.
 */
export function extractKeywords(text: string, maxKeywords = 5): string[] {
  if (!text) return [];
  // Remove parenthetical content
  const clean = text.replace(/\([^)]*\)/g, "");
  const items = clean.split(",").map((i) => i.trim());
  const keywords: string[] = [];
  for (const item of items) {
    const words = item.split(/\s+/).slice(0, 3);
    const keyword = words
      .join(" ")
      .replace(/[.;:]+$/, "")
      .trim();
    if (keyword && !keywords.includes(keyword)) {
      keywords.push(keyword);
    }
    if (keywords.length >= maxKeywords) break;
  }
  return keywords;
}

// ==========================================
// TRANSFORM FUNCTIONS
// ==========================================

export function transformHero(country: CountryDetail): HeroData {
  const etymology = country.etymology || "";
  const iso = country.id;

  // Extract year: "adopté en XXXX" or just a 4-digit year in context
  const yearMatch = etymology.match(/adopt[ée]+ en (\d{4})/i);
  const year = yearMatch ? yearMatch[1] : undefined;

  // Extract meaning: phrase between guillemets
  const meaningMatch =
    etymology.match(/signifie\s*"([^"]+)"/i) ||
    etymology.match(/signifie\s*«\s*([^»]+)\s*»/i);
  const meaningRaw = meaningMatch ? meaningMatch[1].trim() : undefined;
  // Split: last word is highlighted, rest is the quote
  let meaningQuote: string | undefined;
  let meaningHighlight: string | undefined;
  if (meaningRaw) {
    const lastSpaceIdx = meaningRaw.lastIndexOf(" ");
    if (lastSpaceIdx > 0) {
      meaningQuote = meaningRaw.slice(0, lastSpaceIdx);
      meaningHighlight = meaningRaw.slice(lastSpaceIdx + 1);
    } else {
      meaningHighlight = meaningRaw;
    }
  }

  // Extract languages mentioned, capturing family name in parentheses if present
  // e.g. "du mooré (langue mossi)" → "Mooré (Mossi)"
  const langWithFamilyPattern =
    /(?:du|en)\s+([\wÀ-ÿ]+)\s*\((?:langue\s+)?([\wÀ-ÿ]+)\)/gi;
  const langs: string[] = [];
  let langFamMatch;
  while ((langFamMatch = langWithFamilyPattern.exec(etymology)) !== null) {
    const langName = langFamMatch[1];
    const familyName = capitalize(langFamMatch[2]);
    const entry = `${langName} (${familyName})`;
    if (!langs.includes(entry)) langs.push(entry);
  }
  // Fallback: "en mooré ... et en dioula" without family
  if (!langs.length) {
    const langMatches2 = etymology.match(/en\s+([\wÀ-ÿ]+)/g);
    if (langMatches2) {
      for (const m of langMatches2) {
        const lang = m.replace(/^en\s+/, "");
        if (!langs.includes(lang) && lang.length > 2) langs.push(lang);
      }
    }
  }
  const meaningLangs = langs.length > 0 ? langs.join(" + ") : undefined;

  // Check if uncertain
  const isUncertain = /débattu|incertain|hypothèse/i.test(etymology);

  // Clean "Foo (Foo)" → "Foo" when name and official are identical
  const rawName = country.nameFr || "";
  const nameMatch = rawName.match(/^(.+?)\s*\(([^)]+)\)$/);
  const countryName =
    nameMatch && nameMatch[1].trim() === nameMatch[2].trim()
      ? nameMatch[1].trim()
      : rawName.trim();

  return {
    countryName,
    nameOfficial: country.nameOfficial,
    iso,
    flag: flagFromISO3(iso),
    year,
    meaningQuote,
    meaningHighlight,
    meaningLangs,
    isUncertain,
  };
}

export function transformEtymology(
  etymology?: string
): EtymologyData | undefined {
  if (!etymology) return undefined;

  // Check for uncertain
  if (/débattu|incertain|hypothèse/i.test(etymology)) {
    // Extract hypotheses
    const hypotheses: string[] = [];
    const hypoMatches = etymology.match(/[Hh]ypothèse\s*\d*\s*:?\s*([^.]+\.)/g);
    if (hypoMatches) {
      for (const h of hypoMatches) {
        hypotheses.push(h.trim());
      }
    }

    // Try to extract the word (country name before any explanation)
    const wordMatch = etymology.match(/^(?:Le nom\s+)?["«]?(\w+)["»]?/);
    const word = wordMatch ? wordMatch[1] : "";

    return {
      variant: "uncertain",
      words: [{ word, lang: "Origine débattue", definition: "" }],
      hypotheses: hypotheses.length > 0 ? hypotheses : undefined,
      rawText: etymology,
    };
  }

  // Build lang→family map from patterns like "en mooré (langue mossi)" or "du dioula (langue mandé)"
  const langFamilyMap = new Map<string, string>();
  const langFamPattern =
    /(?:en|du)\s+([\wÀ-ÿ]+)\s*\((?:langue\s+)?([\wÀ-ÿ]+)\)/gi;
  let lfMatch;
  while ((lfMatch = langFamPattern.exec(etymology)) !== null) {
    langFamilyMap.set(lfMatch[1].toLowerCase(), capitalize(lfMatch[2]));
  }

  // Helper to resolve lang name with optional family
  const resolveLang = (rawLang: string, inlineFamily?: string): string => {
    const langName = capitalize(rawLang);
    const family = inlineFamily
      ? capitalize(inlineFamily)
      : langFamilyMap.get(rawLang.toLowerCase());
    return family ? `${langName} (${family})` : langName;
  };

  // Check for split bilingue: 2+ patterns like '"Word" vient du LANGUAGE'
  // Also capture optional family in parentheses: "du mooré (Mossi)"
  // Supports straight quotes, curly quotes, and guillemets
  const Q = '["«\u201C]'; // opening quote
  const QC = '["»\u201D]'; // closing quote
  const splitPattern = new RegExp(
    `${Q}(\\w+)${QC}\\s+vient\\s+du\\s+([\\wÀ-ÿ]+)(?:\\s*\\((?:langue\\s+)?([\\wÀ-ÿ]+)\\))?\\s+et\\s+signifie\\s+${Q}([^"»\u201D]+)${QC}`,
    "gi"
  );
  const words: EtymologyWord[] = [];
  let match;

  while ((match = splitPattern.exec(etymology)) !== null) {
    const rawDef = match[4].split(/\s+ou\s+/)[0].trim();
    words.push({
      word: match[1],
      lang: resolveLang(match[2], match[3]),
      definition: capitalize(rawDef),
    });
  }

  if (words.length >= 2) {
    return { variant: "split", words };
  }

  // Single word pattern (supports straight, curly, guillemets)
  const singlePattern =
    /["«\u201C](\w+)["»\u201D]\s+(?:vient|est\s+d[ée]riv|signifie|est\s+un\s+mot)/i;
  const singleMatch = etymology.match(singlePattern);

  if (singleMatch || words.length === 1) {
    const word = words.length === 1 ? words[0] : undefined;
    if (word) {
      return { variant: "single", words: [word] };
    }

    // Try alternative extraction for single (supports curly quotes + guillemets)
    const nameMatch = etymology.match(/["«\u201C](\w+)["»\u201D]/);
    const langMatch = etymology.match(/(?:du|en)\s+([\wÀ-ÿ]+)/);
    const defMatch = etymology.match(
      /signifie\s+["«\u201C]([^"»\u201D]+)["»\u201D]/i
    );

    return {
      variant: "single",
      words: [
        {
          word: nameMatch ? nameMatch[1] : "",
          lang: langMatch ? capitalize(langMatch[1]) : "",
          definition: defMatch ? defMatch[1].split(/\s+ou\s+/)[0].trim() : "",
        },
      ],
      rawText: etymology,
    };
  }

  // Fallback: try the full pattern from BFA format (supports all quote styles)
  // "Burkina" vient du mooré (Mossi) et signifie "intègres"... "Faso" vient du dioula
  const fullPattern = new RegExp(
    `${Q}(\\w+)${QC}\\s+vient\\s+du\\s+(\\w+)(?:\\s*\\((?:langue\\s+)?(\\w+)\\))?\\s+et\\s+signifie\\s+${Q}([^"»\u201D]+)${QC}`,
    "gi"
  );
  while ((match = fullPattern.exec(etymology)) !== null) {
    const rawDef = match[4].split(/\s+ou\s+/)[0].trim();
    words.push({
      word: match[1],
      lang: resolveLang(match[2], match[3]),
      definition: capitalize(rawDef),
    });
  }

  if (words.length >= 2) {
    return { variant: "split", words };
  }
  if (words.length === 1) {
    return { variant: "single", words };
  }

  // Fallback: return raw text as single block when no structured pattern matches
  return {
    variant: "single",
    words: [{ word: "", lang: "", definition: "" }],
    rawText: etymology,
  };
}

export function transformOrigin(
  nameOriginActor?: string,
  etymology?: string,
  historicalNames?: HistoricalNamesSection
): OriginData | undefined {
  if (!nameOriginActor) return undefined;

  const text = nameOriginActor;

  // Detect tonality
  let tonality: OriginTonality = "neutral";
  if (/révolution|indépendance|émancipation/i.test(text)) {
    tonality = "revolution";
  } else if (
    /colonial|britannique|français|allemand|anglais/i.test(text) ||
    /Flora Shaw|Lord|Sir|Governor/i.test(text)
  ) {
    tonality = "colonial";
  }

  // Extract person name - try specific patterns first (no /i flag to preserve case-sensitivity on [A-Z])
  const presidentMatch = text.match(
    /(?:[Pp]résident|[Ll]eader|[Rr]oi|[Cc]hef|[Jj]ournaliste)\s+([A-ZÀ-Ÿ][\wÀ-ÿ]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ]+)+)/
  );
  const personMatch =
    presidentMatch ||
    text.match(/(?:par\s+)?([A-ZÀ-Ÿ][\wÀ-ÿ]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ]+)+)/);
  const personName = personMatch
    ? personMatch[1]
    : text.split(",")[0].split(".")[0].trim();

  // Extract initials
  const nameParts = personName.split(/\s+/);
  const initials =
    nameParts.length >= 2
      ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
      : personName.substring(0, 2).toUpperCase();

  // Extract date — prefer full date "4 août 1984" from historicalNames.contemporary or text
  // BFA example: "changement de nom le 4 août 1984 par Thomas Sankara"
  const fullDatePattern =
    /(\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})/i;
  const fullDateMatch =
    text.match(fullDatePattern) ||
    (historicalNames?.contemporary
      ? historicalNames.contemporary.match(fullDatePattern)
      : null);
  const yearOnlyMatch = text.match(/(\d{4})/);
  const date = fullDateMatch
    ? fullDateMatch[1]
    : yearOnlyMatch
      ? yearOnlyMatch[1]
      : undefined;

  // Extract old name from etymology
  let oldName: string | undefined;
  if (etymology) {
    const oldNameMatch =
      etymology.match(/remplacer?\s+["«]([^"»]+)["»]/i) ||
      etymology.match(/(?:anciennement|ancien\s+nom|ex-)\s*["«]?([^"»,.]+)/i);
    oldName = oldNameMatch ? oldNameMatch[1].trim() : undefined;
  }

  // Build description: clean prefix and truncate at ~120 chars at sentence boundary
  let description = text.replace(/^.*?lors de la\s+/i, "");
  // Capitalize first letter after cleaning
  description = description.charAt(0).toUpperCase() + description.slice(1);
  // Truncate at sentence boundary near 120 chars
  if (description.length > 120) {
    const sentenceEnd = description.indexOf(".", 60);
    if (sentenceEnd !== -1 && sentenceEnd <= 140) {
      description = description.substring(0, sentenceEnd + 1);
    } else {
      description = description.substring(0, 120).trim() + "...";
    }
  }

  return {
    personName,
    initials: initials.toUpperCase(),
    date,
    description,
    oldName,
    tonality,
  };
}

export function transformTimeline(
  historicalNames?: HistoricalNamesSection
): TimelineData {
  const items: TimelineItem[] = [];

  if (!historicalNames) {
    return { items, gradientStops: { goldEnd: 100, colonialEnd: 100 } };
  }

  // Parse each era
  if (historicalNames.middleAges) {
    parseEraItems(historicalNames.middleAges, "kingdom", "Moyen Âge").forEach(
      (i) => items.push(i)
    );
  }

  if (historicalNames.precolonial) {
    parseEraItems(
      historicalNames.precolonial,
      "kingdom",
      "Époque précoloniale"
    ).forEach((i) => items.push(i));
  }

  if (historicalNames.colonization) {
    parseEraItems(
      historicalNames.colonization,
      "colonial",
      "Colonisation"
    ).forEach((i) => items.push(i));
  }

  if (historicalNames.contemporary) {
    parseEraItems(
      historicalNames.contemporary,
      "sovereign",
      "Période contemporaine"
    ).forEach((i) => items.push(i));
  }

  // Remove duplicates (keep unique by name)
  const seen = new Set<string>();
  const uniqueItems = items.filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Calculate gradient stops
  const total = uniqueItems.length || 1;
  const kingdoms = uniqueItems.filter((i) => i.type === "kingdom").length;
  const colonials = uniqueItems.filter((i) => i.type === "colonial").length;
  const goldEnd = Math.round((kingdoms / total) * 100);
  const colonialEnd = Math.round(((kingdoms + colonials) / total) * 100);

  return {
    items: uniqueItems,
    gradientStops: { goldEnd, colonialEnd },
  };
}

function parseEraItems(
  text: string,
  defaultType: TimelineItemType,
  eraLabel: string
): TimelineItem[] {
  const items: TimelineItem[] = [];

  // Extract named entities from the text
  // Look for patterns like "XXXX-XXXX : Name" or "Name (dates)"
  const dateNamePattern = /(\d{4}(?:[–-]\d{4})?)\s*:\s*([^.,(]+)/g;
  let match;

  while ((match = dateNamePattern.exec(text)) !== null) {
    items.push({
      type: defaultType,
      era: match[1],
      name: match[2].trim(),
    });
  }

  // If no date-name patterns found, use the whole text as one item
  if (items.length === 0) {
    // Try to extract a date range
    const dateMatch = text.match(/(\d{4}(?:[–-]\d{4})?)/);
    const era = dateMatch ? dateMatch[1] : eraLabel;

    // Extract main entity name
    const entityNames = text.match(
      /(?:royaumes?\s+)?([\wÀ-ÿ]+(?:\s+[\wÀ-ÿ]+)*)/i
    );
    const name = entityNames ? truncateNote(text, 80) : text.substring(0, 80);

    items.push({
      type: defaultType,
      era,
      name: name,
      note:
        text.length > 80 ? text.substring(0, 120).trim() + "..." : undefined,
    });
  }

  return items;
}

function truncateNote(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen).trim() + "...";
}

export function transformPeoples(
  demographics?: DemographicsSection,
  majorPeoples?: MajorPeopleEntry[]
): PeoplesData {
  if (!demographics?.peoples || demographics.peoples.length === 0) {
    return {
      totalPopulation: 0,
      totalPopulationFormatted: "0",
      peopleCount: 0,
      rows: [],
    };
  }

  // Build endonym, pejorative, and peopleId maps from majorPeoples
  const endonymMap = new Map<string, string>();
  const pejorativeMap = new Map<string, string>();
  const peopleIdMap = new Map<string, string>();

  if (majorPeoples) {
    for (const p of majorPeoples) {
      if (p.selfAppellation && p.selfAppellation !== p.name) {
        endonymMap.set(p.name.toLowerCase(), extractEndonym(p.selfAppellation));
      }
      if (p.appellationRemarks) {
        const pej = extractPejorative(p.appellationRemarks);
        if (pej) {
          pejorativeMap.set(p.name.toLowerCase(), pej);
        }
      }
      if (p.peopleId) {
        peopleIdMap.set(p.name.toLowerCase(), p.peopleId);
      }
    }
  }

  // Filter out catch-all groups like "Autres peuples"
  const filtered = demographics.peoples.filter(
    (p) => !/\bautres\b/i.test(p.name)
  );

  // Calculate total population (after filtering)
  const totalPopulation = filtered.reduce(
    (sum, p) => sum + (p.population || 0),
    0
  );

  // Sort by percentage descending
  const sorted = [...filtered].sort(
    (a, b) => (b.percentageInCountry || 0) - (a.percentageInCountry || 0)
  );

  const rows: PeopleRow[] = [];
  let colorIndex = 1;

  for (const p of sorted) {
    const nameKey = p.name.toLowerCase();

    rows.push({
      name: p.name,
      endonym: endonymMap.get(nameKey),
      pejorativeTerm: pejorativeMap.get(nameKey),
      percentage: p.percentageInCountry || 0,
      population: p.population || 0,
      populationFormatted: formatPopulation(p.population || 0),
      region: p.region ? shortenRegion(p.region) : undefined,
      languageFamily: p.languageFamily
        ? shortenFamily(p.languageFamily)
        : undefined,
      colorIndex: colorIndex,
      peopleId: p.peopleId ?? peopleIdMap.get(nameKey),
    });

    colorIndex++;
  }

  // Group peoples with same percentage (3+ consecutive)
  const groupedRows = groupSamePercentage(rows);

  return {
    totalPopulation,
    totalPopulationFormatted: formatPopulation(totalPopulation),
    peopleCount: sorted.length,
    rows: groupedRows,
  };
}

function groupSamePercentage(rows: PeopleRow[]): PeopleRow[] {
  const result: PeopleRow[] = [];
  let i = 0;

  while (i < rows.length) {
    if (rows[i].isOther) {
      result.push(rows[i]);
      i++;
      continue;
    }

    // Count consecutive rows with same percentage
    let j = i + 1;
    while (
      j < rows.length &&
      !rows[j].isOther &&
      rows[j].percentage === rows[i].percentage
    ) {
      j++;
    }

    const groupSize = j - i;

    if (groupSize >= 3) {
      // Group them
      const grouped = rows.slice(i, j);
      const names = grouped.map((r) => r.name);
      result.push({
        name: names.join(" · "),
        percentage: rows[i].percentage,
        population: rows[i].population,
        populationFormatted: `${formatPopulation(rows[i].population)} chacun`,
        colorIndex: rows[i].colorIndex,
        groupedNames: names,
      });
    } else {
      // Add individually
      for (let k = i; k < j; k++) {
        result.push(rows[k]);
      }
    }

    i = j;
  }

  return result;
}

export function transformKingdoms(kingdoms?: Kingdom[]): KingdomsData {
  if (!kingdoms || kingdoms.length === 0) {
    return {
      title: "Entités politiques historiques",
      cards: [],
      layout: "stack",
    };
  }

  // Filter out colonies
  const filtered = kingdoms.filter((k) => !/colonie/i.test(k.name));

  // Build cards
  const cards: KingdomCard[] = filtered.map((k) => {
    const tags: string[] = [];
    if (k.politicalCenters) {
      tags.push(
        ...k.politicalCenters
          .slice(0, 3)
          .map((t) => t.replace(/\s*\([^)]*\)/g, "").trim())
      );
    }
    return {
      name: k.name.replace(/^\[|\]$/g, ""),
      period: k.period,
      peoples: k.dominantPeoples?.join(", "),
      tags,
    };
  });

  // Determine adaptive title
  const names = filtered.map((k) => k.name.toLowerCase());
  let title: string;
  const royaumeCount = names.filter((n) => n.includes("royaume")).length;
  const sultanatCount = names.filter((n) => n.includes("sultanat")).length;
  const chefferieCount = names.filter((n) => n.includes("chefferie")).length;

  if (royaumeCount >= sultanatCount && royaumeCount >= chefferieCount) {
    title = "Royaumes & Civilisations";
  } else if (sultanatCount > royaumeCount) {
    title = "Sultanats & Chefferies";
  } else if (chefferieCount > royaumeCount) {
    title = "Chefferies & Entités";
  } else {
    title = "Entités politiques historiques";
  }

  const layout = cards.length >= 3 ? "scroll" : "stack";

  return { title, cards, layout };
}

export function transformLanguages(culture?: CultureSection): LanguagesData {
  if (!culture?.mainLanguages || culture.mainLanguages.length === 0) {
    return { bubbles: [], totalCount: 0, overflowCount: 0 };
  }

  const langs = culture.mainLanguages;
  const totalCount = langs.length;
  const maxVisible = 12;
  const overflowCount = Math.max(0, totalCount - maxVisible);
  const visible = langs.slice(0, maxVisible);

  const bubbles: LanguageBubble[] = visible.map((lang, index) => {
    const isOfficial =
      lang.isPrimary === true || (lang.name && /officiel/i.test(lang.name));

    let size: LanguageBubbleSize;
    if (isOfficial || index < 3) {
      size = "big";
    } else if (index < 8) {
      size = "regular";
    } else {
      size = "small";
    }

    // Clean name: remove "(langue officielle, xxx)" part
    const cleanName = lang.name.replace(/\s*\(.*\)/, "").trim();

    return {
      name: cleanName,
      code: lang.isoCode,
      isOfficial,
      size,
    };
  });

  return { bubbles, totalCount, overflowCount };
}

export function transformCulture(culture?: CultureSection): CultureGridData {
  if (!culture) {
    return { items: [] };
  }

  const capKeywords = (text: string) =>
    extractKeywords(text, 3).map((k) => k.charAt(0).toUpperCase() + k.slice(1));

  const items: CultureGridItem[] = [
    {
      slot: "religion",
      icon: "☪️",
      label: "Religions",
      keywords: capKeywords(culture.dominantReligions || ""),
    },
    {
      slot: "economy",
      icon: "🌾",
      label: "Économie",
      keywords: capKeywords(culture.lifestyles || ""),
    },
    {
      slot: "social",
      icon: "👑",
      label: "Organisation",
      keywords: capKeywords(culture.socialOrganization || ""),
    },
    {
      slot: "relations",
      icon: "🌍",
      label: "Relations",
      keywords: capKeywords(culture.regionalRelations || ""),
    },
  ];

  return { items };
}

export function transformSources(sources?: string[]): string {
  if (!sources || sources.length === 0) return "";
  return sources.map((s) => s.replace(/^-\s*/, "").trim()).join(" · ");
}

export function transformHistoricalFacts(
  historicalFacts?: HistoricalFactsSection
): HistoricalFactsData | undefined {
  if (!historicalFacts) return undefined;

  const periods: Array<{ label: string; content: string }> = [];

  const mapping: Array<[keyof HistoricalFactsSection, string]> = [
    ["ancientPeriods", "Périodes anciennes"],
    ["middleAges", "Moyen Âge"],
    ["precolonial", "Époque précoloniale"],
    ["colonization", "Colonisation"],
    ["independenceStruggle", "Lutte pour l'indépendance"],
    ["postIndependence", "Période post-indépendance"],
  ];

  for (const [key, label] of mapping) {
    const value = historicalFacts[key];
    if (value) {
      periods.push({ label, content: value });
    }
  }

  return periods.length > 0 ? { periods } : undefined;
}

// ==========================================
// MAIN TRANSFORM
// ==========================================

export function transformCountryData(country: CountryDetail): CountryPageData {
  return {
    hero: transformHero(country),
    etymology: transformEtymology(country.etymology),
    origin: transformOrigin(
      country.nameOriginActor,
      country.etymology,
      country.historicalNames
    ),
    timeline: transformTimeline(country.historicalNames),
    peoples: transformPeoples(country.demographics, country.majorPeoples),
    kingdoms: transformKingdoms(country.kingdoms),
    historicalFacts: transformHistoricalFacts(country.historicalFacts),
    languages: transformLanguages(country.culture),
    culture: transformCulture(country.culture),
    sources: transformSources(country.sources),
  };
}

// ==========================================
// HELPERS
// ==========================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
