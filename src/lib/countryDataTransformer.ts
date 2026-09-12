/**
 * Country Data Transformer
 *
 * Transforms raw CountryDetail data into structured props for each
 * UI component of the "Carte vivante" country page.
 */

import {
  ficheSourceEntries,
  type FicheSourceEntry,
} from "@/lib/afrik/ficheSourceLabel";
import type { CountryDetail } from "@/types/afrik-frontend";
import type {
  Kingdom,
  KingdomEntryType,
  KingdomTimeRange,
  MajorPeopleEntry,
  CultureSection,
  HistoricalNamesSection,
  HistoricalFactsSection,
  DemographicsSection,
  FicheSource,
} from "@/types/afrik";
import { flagFromISO3 as countryFlag, NEUTRAL_FLAG } from "@/lib/countryFlag";
import { countryCopy } from "@/lib/i18n/copy/country";
import type { Language } from "@/types/shared";

// ==========================================
// OUTPUT TYPES
// ==========================================

export interface HeroData {
  countryName: string;
  nameOfficial?: string;
  iso: string;
  flag: string;
}

/**
 * The year the atlas reads a demographic figure against when the fiche does
 * not date it. It lived as a literal in two components and as `2025` spelled
 * into the section's eyebrow; a headcount now carries its own year, so the
 * default belongs next to the code that applies it.
 */
// @req REQ-001
export const DEMOGRAPHIC_REFERENCE_YEAR = 2025;

export interface PeopleRow {
  name: string;
  endonym?: string;
  /** ISO 639-3 code for the endonym's language, for the `lang` attribute. */
  endonymLang?: string;
  pejorativeTerm?: string;
  percentage: number;
  /** Undefined where the fiche states a share but no headcount. */
  population?: number;
  populationFormatted?: string;
  region?: string;
  languageFamily?: string;
  colorIndex: number;
  isOther?: boolean;
  groupedNames?: string[];
  peopleId?: string;
}

export interface PeoplesData {
  totalPopulation: number;
  /** Undefined where neither a national total nor a people headcount exists. */
  totalPopulationFormatted?: string;
  /** The total is the independently sourced country population. */
  totalPopulationIsNational?: boolean;
  /**
   * Whether `totalPopulation` sums over every people shown. Where it does
   * not, the figure is a floor rather than the country's population, and the
   * section must say so instead of labelling it "habitants".
   */
  everyPeopleDeclaresPopulation: boolean;
  /**
   * Year of the national total, or the shared year of the counted peoples when
   * no national total exists. Undefined where no figure is dated or the people
   * headcounts come from different years.
   */
  populationReferenceYear?: number;
  peopleCount: number;
  rows: PeopleRow[];
}

export interface KingdomCard {
  name: string;
  period?: string;
  /**
   * Which of the three things sharing the corpus array this is. Carried onto
   * the card so the chronology can ink a period by its regime rather than
   * guessing the regime back out of the entry's name, which is the guess that
   * once let twenty-five colonial administrations pass for polities.
   */
  entryType?: KingdomEntryType;
  /**
   * The machine bounds, carried through so the timeline can order itself.
   * `period` remains what is rendered — the bounds are never printed.
   */
  timeRange?: KingdomTimeRange;
  peoples?: string;
  /** What the entity was, as the corpus states it. */
  historicalRole?: string;
  /**
   * The political centres, whole. `tags` is the same field truncated to three
   * and stripped of parentheses for the card layout; the timeline names them
   * as they were declared.
   */
  centers?: string[];
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
  peoples: PeoplesData;
  kingdoms: KingdomsData;
  historicalFacts?: HistoricalFactsData;
  languages: LanguagesData;
  culture: CultureGridData;
  sources: FicheSourceEntry[];
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * The country hero's flag. Shares `countryFlag.ts`'s table — the mapping lives
 * in one place — but keeps its own empty-string fallback: this flag is
 * rendered inline inside the fiche heading, where an unknown code should
 * contribute nothing at all. The atlas ranking wants the opposite (a
 * placeholder that holds its column), which is why `countryFlag.flagFromISO3`
 * returns NEUTRAL_FLAG instead.
 */
// @req REQ-001
export function flagFromISO3(iso3: string): string {
  const flag = countryFlag(iso3);
  return flag === NEUTRAL_FLAG ? "" : flag;
}

/**
 * Format population number: 23000000 → "23M", 920000 → "920K"
 */
// @req REQ-001
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
// @req REQ-001
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
// @req REQ-001
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
// @req REQ-001
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
// @req REQ-001
export function shortenFamily(text: string): string {
  return text
    .replace(/\s*\(FLG_\w+\)/g, "")
    .replace(/ – /g, " ")
    .trim();
}

/**
 * Extract keywords from a paragraph.
 */
// @req REQ-001
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

// @req REQ-001
export function transformHero(country: CountryDetail): HeroData {
  const iso = country.id;
  return {
    countryName: country.nameCommonFr.trim(),
    nameOfficial: country.nameOfficial,
    iso,
    flag: flagFromISO3(iso),
  };
}

// @req REQ-001
export function transformPeoples(
  demographics?: DemographicsSection,
  majorPeoples?: MajorPeopleEntry[],
  language: Language = "fr"
): PeoplesData {
  const totalPopulationIsNational =
    typeof demographics?.totalPopulation === "number" &&
    demographics.totalPopulation > 0;
  const nationalPopulation = totalPopulationIsNational
    ? demographics.totalPopulation
    : 0;

  if (!demographics?.peoples || demographics.peoples.length === 0) {
    return {
      totalPopulation: nationalPopulation,
      totalPopulationFormatted: totalPopulationIsNational
        ? formatPopulation(nationalPopulation)
        : undefined,
      totalPopulationIsNational,
      everyPeopleDeclaresPopulation: false,
      populationReferenceYear: totalPopulationIsNational
        ? demographics?.referenceYear
        : undefined,
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

  // The model asks each people for a `population`, and 25 of the 53 country
  // fiches leave it out on every entry. Summing those absences to zero is how
  // the section came to print "0 habitants" for South Africa: an undeclared
  // headcount is not a headcount of zero, and only the peoples that state one
  // may enter the total.
  const counted = filtered.filter((p) => p.population > 0);
  const documentedPopulation = counted.reduce(
    (sum, p) => sum + p.population,
    0
  );
  const totalPopulation = totalPopulationIsNational
    ? nationalPopulation
    : documentedPopulation;

  // The section prints one year over the whole block, so it may only name one
  // when every counted people carries it. A fiche mixing a census with a later
  // estimate has no single snapshot, and picking either would date the other
  // wrongly.
  const countedYears = new Set(
    counted.map((p) => p.referenceYear ?? DEMOGRAPHIC_REFERENCE_YEAR)
  );
  const populationReferenceYear = totalPopulationIsNational
    ? demographics.referenceYear
    : countedYears.size === 1
      ? [...countedYears][0]
      : undefined;

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
      endonymLang: p.mainLanguageCode,
      pejorativeTerm: pejorativeMap.get(nameKey),
      percentage: p.percentageInCountry || 0,
      population: p.population > 0 ? p.population : undefined,
      populationFormatted:
        p.population > 0 ? formatPopulation(p.population) : undefined,
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
  const groupedRows = groupSamePercentage(rows, language);

  return {
    totalPopulation,
    totalPopulationFormatted:
      totalPopulationIsNational || counted.length > 0
        ? formatPopulation(totalPopulation)
        : undefined,
    totalPopulationIsNational,
    everyPeopleDeclaresPopulation:
      filtered.length > 0 && counted.length === filtered.length,
    populationReferenceYear,
    peopleCount: sorted.length,
    rows: groupedRows,
  };
}

function groupSamePercentage(
  rows: PeopleRow[],
  language: Language
): PeopleRow[] {
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
        populationFormatted:
          rows[i].population > 0
            ? `${formatPopulation(rows[i].population)} ${countryCopy[language].generated.each}`
            : undefined,
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

/**
 * Orders the dated entries among themselves and puts them back at the indices
 * they occupied, leaving undated ones where the fiche placed them.
 *
 * A plain `sort` is wrong for the length of the burn-down: 95 polities carry no
 * bounds yet, and any comparator would have to invent a key for them, shuffling
 * entries an editor deliberately sequenced. This converges on a fully
 * chronological order as the dates arrive, and moves nothing else meanwhile.
 *
 * A still-standing entity sorts after a closed one that began the same year —
 * it is the one that has not finished.
 */
function inChronologicalOrder(kingdoms: Kingdom[]): Kingdom[] {
  const datedIndices: number[] = [];
  kingdoms.forEach((kingdom, index) => {
    if (kingdom.timeRange) datedIndices.push(index);
  });
  if (datedIndices.length < 2) return kingdoms;

  const closingYear = (range: KingdomTimeRange): number =>
    range.ongoing
      ? Number.POSITIVE_INFINITY
      : (range.endYear ?? range.startYear);

  const sorted = datedIndices
    .map((index) => kingdoms[index])
    .sort((a, b) => {
      const left = a.timeRange as KingdomTimeRange;
      const right = b.timeRange as KingdomTimeRange;
      return (
        left.startYear - right.startYear ||
        closingYear(left) - closingYear(right)
      );
    });

  const ordered = [...kingdoms];
  datedIndices.forEach((index, rank) => {
    ordered[index] = sorted[rank];
  });
  return ordered;
}

// @req REQ-001
export function transformKingdoms(
  kingdoms?: Kingdom[],
  language: Language = "fr"
): KingdomsData {
  const titles = countryCopy[language].generated.kingdomTitles;
  if (!kingdoms || kingdoms.length === 0) {
    return {
      title: titles.generic,
      cards: [],
      layout: "stack",
    };
  }

  // Every entry, whatever its regime. The list used to be cut to precolonial
  // polities on the promise that colonial administrations and modern states
  // were "shown by the history timeline further down the page" — and that
  // timeline was built and never wired, so for as long as the filter stood the
  // record simply dropped them. One chronology carries all three now, and inks
  // each period by its typed kind.
  //
  // The typed kind decides, because the name cannot: "Somaliland britannique",
  // "Rhodésie du Nord" and "Condominium anglo-égyptien" all passed the name
  // test that used to stand here. The name test survives only to type an entry
  // the backfill has not reached.
  const typed: (Kingdom & { entryType: KingdomEntryType })[] = kingdoms.map(
    (k) => ({
      ...k,
      entryType:
        k.entryType ?? (/colonie/i.test(k.name) ? "colonial" : "polity"),
    })
  );

  const ordered = inChronologicalOrder(typed);
  const filtered = typed.filter((k) => k.entryType === "polity");

  // Build cards
  const cards: KingdomCard[] = ordered.map((k) => {
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
      entryType: k.entryType,
      timeRange: k.timeRange,
      peoples: k.dominantPeoples?.join(", "),
      historicalRole: k.historicalRole,
      centers: k.politicalCenters,
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
    title = titles.kingdoms;
  } else if (sultanatCount > royaumeCount) {
    title = titles.sultanates;
  } else if (chefferieCount > royaumeCount) {
    title = titles.chiefdoms;
  } else {
    title = titles.generic;
  }

  const layout = cards.length >= 3 ? "scroll" : "stack";

  return { title, cards, layout };
}

// @req REQ-001
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

// @req REQ-001
export function transformCulture(
  culture?: CultureSection,
  language: Language = "fr"
): CultureGridData {
  if (!culture) {
    return { items: [] };
  }

  const capKeywords = (text: string) =>
    extractKeywords(text, 3).map((k) => k.charAt(0).toUpperCase() + k.slice(1));
  const labels = countryCopy[language].generated.culture;

  const items: CultureGridItem[] = [
    {
      slot: "religion",
      label: labels.religion,
      keywords: capKeywords(culture.dominantReligions || ""),
    },
    {
      slot: "economy",
      label: labels.economy,
      keywords: capKeywords(culture.lifestyles || ""),
    },
    {
      slot: "social",
      label: labels.social,
      keywords: capKeywords(culture.socialOrganization || ""),
    },
    {
      slot: "relations",
      label: labels.relations,
      keywords: capKeywords(culture.regionalRelations || ""),
    },
  ];

  return { items };
}

// @req REQ-001
export function transformSources(sources?: FicheSource[]): FicheSourceEntry[] {
  return ficheSourceEntries(sources);
}

// @req REQ-001
export function transformHistoricalFacts(
  historicalFacts?: HistoricalFactsSection,
  language: Language = "fr"
): HistoricalFactsData | undefined {
  if (!historicalFacts) return undefined;

  const periods: Array<{ label: string; content: string }> = [];

  const labels = countryCopy[language].generated.historicalPeriods;
  const mapping: Array<[keyof HistoricalFactsSection, string]> = [
    ["ancientPeriods", labels.ancientPeriods],
    ["middleAges", labels.middleAges],
    ["precolonial", labels.precolonial],
    ["colonization", labels.colonization],
    ["independenceStruggle", labels.independenceStruggle],
    ["postIndependence", labels.postIndependence],
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

// @req REQ-001
export function transformCountryData(
  country: CountryDetail,
  language: Language = "fr"
): CountryPageData {
  return {
    hero: transformHero(country),
    peoples: transformPeoples(
      country.demographics,
      country.majorPeoples,
      language
    ),
    kingdoms: transformKingdoms(country.kingdoms, language),
    historicalFacts: transformHistoricalFacts(
      country.historicalFacts,
      language
    ),
    languages: transformLanguages(country.culture),
    culture: transformCulture(country.culture, language),
    sources: transformSources(country.sources),
  };
}
