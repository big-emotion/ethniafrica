/**
 * Country flags, from ISO 3166-1 alpha-3 to the regional-indicator pair that
 * renders as an emoji flag.
 *
 * This table used to live inside `flagFromISO3` in countryDataTransformer.ts,
 * where only the country fiche could reach it. The family fiche's footprint
 * ranking needs the same mapping for every country the globe tinted, so the
 * table moved here rather than being regenerated — a second copy would drift
 * from the first the first time a country was added to only one of them.
 *
 * Scope is Africa: the mapping covers every country in the committed admin-0
 * asset (`AFRICA_ADMIN0`), which `countryFlag.test.ts` asserts, plus the few
 * island states the corpus cites that the 110 m asset does not draw.
 */

/** Shown when a code has no mapping — never an empty string, which would collapse a table cell. */
// @req REQ-116
export const NEUTRAL_FLAG = "🏳";

/**
 * Natural Earth's own codes for three African territories, mapped onto the
 * ISO codes the AFRIK corpus uses. The committed admin-0 asset is keyed by
 * Natural Earth's spelling, the corpus by ISO's, and the family footprint has
 * to join the two.
 */
// @req REQ-116
export const NATURAL_EARTH_ALIASES: Readonly<Record<string, string>> = {
  SAH: "ESH", // Western Sahara
  SDS: "SSD", // South Sudan
};

/**
 * Territories the admin-0 asset can draw that have no ISO 3166-1 code, and so
 * no regional-indicator flag. Somaliland is the only one: it is not
 * UN-recognised, ISO assigns it nothing, and no emoji flag exists for it.
 * Borrowing Somalia's flag would make the page assert a sovereignty claim it
 * has no business asserting; the neutral flag says "no code", which is the
 * true statement. Listed explicitly so the coverage test stays meaningful for
 * every other country instead of being weakened to accommodate this one.
 */
// @req REQ-116
export const COUNTRIES_WITHOUT_ISO_FLAG: readonly string[] = ["SOL"];

const REGIONAL_INDICATOR_A = 0x1f1e6;
const LATIN_A = 65;

// @req REQ-116
export const ALPHA3_TO_ALPHA2: Readonly<Record<string, string>> = {
  AGO: "AO",
  BDI: "BI",
  BEN: "BJ",
  BFA: "BF",
  BWA: "BW",
  CAF: "CF",
  CIV: "CI",
  CMR: "CM",
  COD: "CD",
  COG: "CG",
  COM: "KM",
  CPV: "CV",
  DJI: "DJ",
  DZA: "DZ",
  EGY: "EG",
  ERI: "ER",
  ESH: "EH",
  ETH: "ET",
  GAB: "GA",
  GHA: "GH",
  GIN: "GN",
  GMB: "GM",
  GNB: "GW",
  GNQ: "GQ",
  KEN: "KE",
  LBR: "LR",
  LBY: "LY",
  LSO: "LS",
  MAR: "MA",
  MDG: "MG",
  MLI: "ML",
  MOZ: "MZ",
  MRT: "MR",
  MUS: "MU",
  MWI: "MW",
  NAM: "NA",
  NER: "NE",
  NGA: "NG",
  RWA: "RW",
  SDN: "SD",
  SEN: "SN",
  SLE: "SL",
  SOM: "SO",
  SSD: "SS",
  STP: "ST",
  SWZ: "SZ",
  SYC: "SC",
  TCD: "TD",
  TGO: "TG",
  TUN: "TN",
  TZA: "TZ",
  UGA: "UG",
  ZAF: "ZA",
  ZMB: "ZM",
  ZWE: "ZW",
};

/** The emoji flag for a two-letter code, without consulting the alpha-3 table. */
// @req REQ-116
export function regionalIndicators(alpha2: string): string {
  if (!/^[A-Za-z]{2}$/.test(alpha2)) return NEUTRAL_FLAG;
  const upper = alpha2.toUpperCase();
  return String.fromCodePoint(
    REGIONAL_INDICATOR_A + upper.charCodeAt(0) - LATIN_A,
    REGIONAL_INDICATOR_A + upper.charCodeAt(1) - LATIN_A
  );
}

// @req REQ-116
export function flagFromISO3(iso3: string): string {
  const code = iso3?.toUpperCase() ?? "";
  const iso = NATURAL_EARTH_ALIASES[code] ?? code;
  const alpha2 = ALPHA3_TO_ALPHA2[iso];
  return alpha2 ? regionalIndicators(alpha2) : NEUTRAL_FLAG;
}
