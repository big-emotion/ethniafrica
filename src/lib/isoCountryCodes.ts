/**
 * ISO 3166-1 alpha-3 → alpha-2, for the countries the atlas can name or flag.
 *
 * One table, because there used to be two: the flag module and the
 * country-name module each held a copy, the flag's was extended with Western
 * Sahara, Mayotte and Réunion, and those three kept a flag and lost their
 * localized name. Both now read this one.
 *
 * Scope is Africa: every country in the committed admin-0 asset
 * (`AFRICA_ADMIN0`), plus the island states the corpus cites that the 110 m
 * asset does not draw. `countryFlag.test.ts` holds the coverage.
 */
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
  // French overseas departments, added to the admin-0 asset alongside the six
  // island states the corpus cites. Both hold real ISO codes, so both get a
  // flag and a name like every other country.
  MYT: "YT",
  NAM: "NA",
  REU: "RE",
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
