/**
 * Reads the free-text `period` of a `content.kingdoms[]` entry into machine
 * bounds, and tells a precolonial polity apart from a colonial administration
 * and a modern state.
 *
 * Two rules shape everything here.
 *
 * **Never invent a bound.** 281 entries carry 172 distinct label shapes, and a
 * large share of them name an era rather than a date — "Précolonial - présent",
 * "Depuis plusieurs siècles". Writing `startYear: -10000` for those would be the
 * same vagueness wearing the costume of data, and it would satisfy the symmetry
 * gate without saying anything true. Those labels return `null`, stay visible to
 * the gate, and wait for an editor with a source.
 *
 * **Never write half a date.** "Précolonial - XIXe siècle" carries a real end
 * and no start. A range with only its end filled in would pass a completeness
 * check while leaving unanswered the very question the reader asks — when did
 * this polity begin. It returns `null` too.
 *
 * The parsed bounds never replace the label: `period` remains what the reader
 * sees, because it carries editorial nuance ("apogée", "déclin progressif")
 * that no pair of integers can hold.
 */

import type {
  KingdomDatePrecision,
  KingdomEntryType,
  KingdomTimeRange,
} from "../../src/types/afrik";

export type { KingdomDatePrecision, KingdomEntryType, KingdomTimeRange };

const ROMAN_VALUES: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
};

/** A French ordinal century: `XIVe`, `Ier`, `Xe`, `IIIe`. */
const CENTURY_PATTERN = /\b([IVXL]{1,7})(?:e|er|ᵉ|ème)\b/g;
const YEAR_PATTERN = /\b(\d{1,4})\b/g;

/**
 * Era markers hide a hyphen inside "J.-C.", so they are replaced by tokens
 * before the range is split on its dash. Splitting first would cut
 * "146 av. J.-C." into "146 av. J." and "C.".
 */
const BC_MARKER = /av(?:ant)?\.?\s*J\.?\s*-?\s*C\.?/gi;
const AD_MARKER = /(?:apr|ap)(?:ès|es)?\.?\s*J\.?\s*-?\s*C\.?/gi;
const BC_TOKEN = "@BC@";
const AD_TOKEN = "@AD@";

/**
 * Labels that name an era rather than a date. They are not failures to parse —
 * they are the corpus saying it does not know, and the gate counts them.
 */
const VAGUE_ERA_PATTERN =
  /pr[ée]colonial|pr[ée]historique|moyen\s+[âa]ge|antiquit[ée]|premier\s+mill[ée]naire|depuis\s+plusieurs|colonial(?!e?\s*-)/i;

/**
 * A bound that gives an end and no beginning, or the reverse — "Avant 1598",
 * "Depuis plusieurs siècles". Anchored at the start of the segment on purpose:
 * "déclin progressif jusqu'au XIXe siècle" ends a range, it does not open one,
 * and an unanchored test threw that whole entry away.
 */
const OPEN_BOUND_PATTERN = /^(avant|apr[èe]s|depuis|jusqu)\b/i;

const PRESENT_PATTERN = /\b(pr[ée]sent|aujourd|actuel)/i;

/** Editorial nuance the integers cannot hold, and which forces `approximate`. */
const NUANCE_PATTERN =
  /apog[ée]e|d[ée]clin|maintien|progressi|d[ée]but|\bfin\b/i;

function romanToInt(numeral: string): number | null {
  let total = 0;
  let previous = 0;
  for (const char of numeral.toUpperCase().split("").reverse()) {
    const value = ROMAN_VALUES[char];
    if (value === undefined) return null;
    total += value < previous ? -value : value;
    if (value >= previous) previous = value;
  }
  return total > 0 && total <= 30 ? total : null;
}

interface Bound {
  /** Earliest year the token can mean. */
  from: number;
  /** Latest year the token can mean. */
  to: number;
  kind: "year" | "century";
}

/**
 * Reads one side of a range. Returns `null` for an era name, an open bound
 * ("Avant 1598"), or anything else that does not resolve to a position in time.
 */
function parseBound(segment: string, inheritedEra: -1 | 1): Bound | null {
  const text = segment.trim();
  if (!text) return null;
  if (OPEN_BOUND_PATTERN.test(text)) return null;

  const era: -1 | 1 = text.includes(BC_TOKEN)
    ? -1
    : text.includes(AD_TOKEN)
      ? 1
      : inheritedEra;

  // Every century named in the segment counts, not just the first: the closing
  // side of "XVIIe siècle (apogée), déclin progressif jusqu'au XIXe siècle"
  // reaches the nineteenth century, and stopping at the seventeenth would cut
  // two hundred years off the polity.
  const centuries = [...text.matchAll(CENTURY_PATTERN)]
    .map((m) => romanToInt(m[1]))
    .filter((c): c is number => c !== null)
    .map((century) =>
      era === 1
        ? { from: (century - 1) * 100 + 1, to: century * 100 }
        : { from: -century * 100, to: -((century - 1) * 100 + 1) }
    );

  if (centuries.length > 0) {
    return {
      from: Math.min(...centuries.map((c) => c.from)),
      to: Math.max(...centuries.map((c) => c.to)),
      kind: "century",
    };
  }

  // A bare era word with no numeral — "Précolonial", "Antiquité".
  if (VAGUE_ERA_PATTERN.test(text)) return null;

  const years = [...text.matchAll(YEAR_PATTERN)].map((m) => Number(m[1]) * era);
  if (years.length === 0) return null;
  return {
    from: Math.min(...years),
    to: Math.max(...years),
    kind: "year",
  };
}

function noteFor(label: string): string {
  if (/\d\s*\/\s*\d/.test(label)) {
    return "La fin est donnée à une année près dans les sources ; la borne retenue est la plus tardive.";
  }
  if (label.includes(",")) {
    return "Le libellé couvre plusieurs périodes distinctes ; les bornes retenues encadrent l'ensemble.";
  }
  return "Le libellé distingue des phases d'intensité inégale ; les bornes retenues encadrent l'ensemble de la période.";
}

export function parseKingdomPeriod(rawLabel: string): KingdomTimeRange | null {
  if (typeof rawLabel !== "string") return null;
  const label = rawLabel.trim();
  if (!label) return null;

  const tagged = label
    .replace(BC_MARKER, ` ${BC_TOKEN} `)
    .replace(AD_MARKER, ` ${AD_TOKEN} `)
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const segments = tagged
    .split(/\s*-\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return null;

  const closing = segments[segments.length - 1];
  const opening = segments[0];
  const endsOngoing = PRESENT_PATTERN.test(closing);

  // "202-148 av. J.-C." marks the era once, at the end, for both bounds.
  const trailingEra: -1 | 1 = closing.includes(BC_TOKEN) ? -1 : 1;
  const openingEra: -1 | 1 = opening.includes(BC_TOKEN)
    ? -1
    : opening.includes(AD_TOKEN)
      ? 1
      : trailingEra;

  const start = parseBound(opening, openingEra);
  if (!start) return null;

  const approximate =
    NUANCE_PATTERN.test(label) ||
    /\d\s*\/\s*\d/.test(label) ||
    label.includes(",");

  if (endsOngoing) {
    return {
      startYear: start.from,
      ongoing: true,
      precision: approximate ? "approximate" : start.kind,
      ...(approximate ? { datingNote: noteFor(label) } : {}),
    };
  }

  // A lone segment is complete only when it is a century — a century names both
  // of its own bounds, where a bare year names neither side of a reign.
  if (segments.length === 1) {
    if (start.kind !== "century") return null;
    return {
      startYear: start.from,
      endYear: start.to,
      precision: approximate ? "approximate" : "century",
      ...(approximate ? { datingNote: noteFor(label) } : {}),
    };
  }

  const closingBound = parseBound(closing, trailingEra);
  if (!closingBound) return null;

  // Three or more segments means the label chains ranges ("1919-1932,
  // 1947-1960"). The envelope is the only honest reading, and it is approximate
  // by construction because it swallows the gap.
  const interior = segments
    .slice(1, -1)
    .map((s) => parseBound(s, trailingEra))
    .filter((b): b is Bound => b !== null);
  const bounds = [start, ...interior, closingBound];

  const startYear = Math.min(...bounds.map((b) => b.from));
  const endYear = Math.max(...bounds.map((b) => b.to));
  if (startYear > endYear) return null;

  const spansCentury = bounds.some((b) => b.kind === "century");
  const precision: KingdomDatePrecision = approximate
    ? "approximate"
    : spansCentury
      ? "century"
      : "year";

  return {
    startYear,
    endYear,
    precision,
    ...(precision === "approximate" ? { datingNote: noteFor(label) } : {}),
  };
}

/**
 * Colonial administrations that never write "colonie" — this is why the entry
 * type is stored rather than derived at render time from the name. The old
 * display filter tested `/colonie/i` alone, so "Somaliland britannique" and
 * twenty-four of its kind reached the reader inside a section called "Royaumes
 * et formations politiques".
 */
const COLONIAL_NAME_PATTERN =
  /colonie|coloniale?\b|protectorat|condominium|\bmandat\b|britannique|fran[çc]ais|belge|italien|allemand|portugais|espagnol|n[ée]erlandais|rhod[ée]sie|somaliland|c[ôo]te-de-l|oubangui|kamerun|cameroons|anglo-|afrique[- ](?:orientale|occidentale|[ée]quatoriale)|[îi]le de france|haute-volta/i;

/**
 * A modern sovereign state. Anchored at the start so "Royaume du Bénin" — a
 * Nigerian polity — is not read as a modern monarchy.
 */
const MODERN_NAME_PATTERN =
  /^(?:r[ée]publique|union sud-africaine|[ée]tat (?:libre|d'israel)|f[ée]d[ée]ration)/i;

export function classifyKingdomEntry(name: string): KingdomEntryType {
  const text = (name ?? "").trim();
  if (COLONIAL_NAME_PATTERN.test(text)) return "colonial";
  if (MODERN_NAME_PATTERN.test(text)) return "modern";
  return "polity";
}
