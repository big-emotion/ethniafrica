import { displayCountryName } from "@/lib/languageTag";
import type { Language } from "@/types/shared";

const ISO_ALPHA_3_TO_ALPHA_2: Record<string, string> = {
  AGO: "AO", BDI: "BI", BEN: "BJ", BFA: "BF", BWA: "BW", CAF: "CF",
  CIV: "CI", CMR: "CM", COD: "CD", COG: "CG", COM: "KM", CPV: "CV",
  DJI: "DJ", DZA: "DZ", EGY: "EG", ERI: "ER", ETH: "ET", GAB: "GA",
  GHA: "GH", GIN: "GN", GMB: "GM", GNB: "GW", GNQ: "GQ", KEN: "KE",
  LBR: "LR", LBY: "LY", LSO: "LS", MAR: "MA", MDG: "MG", MLI: "ML",
  MOZ: "MZ", MRT: "MR", MUS: "MU", MWI: "MW", NAM: "NA", NER: "NE",
  NGA: "NG", RWA: "RW", SDN: "SD", SEN: "SN", SLE: "SL", SOM: "SO",
  SSD: "SS", STP: "ST", SWZ: "SZ", SYC: "SC", TCD: "TD", TGO: "TG",
  TUN: "TN", TZA: "TZ", UGA: "UG", ZAF: "ZA", ZMB: "ZM", ZWE: "ZW",
};

/** The country's common name in the reader's locale, with corpus fallback. */
// @req REQ-140
export function getCountryCommonName(
  lang: Language,
  isoAlpha3: string,
  officialName: string
): string {
  const isoAlpha2 = ISO_ALPHA_3_TO_ALPHA_2[isoAlpha3.trim().toUpperCase()];
  if (!isoAlpha2) return officialName;
  return displayCountryName(lang, isoAlpha2) ?? officialName;
}

/** French-only compatibility accessor for corpus-side callers. */
// @req REQ-001
export function getFrenchCountryCommonName(
  isoAlpha3: string,
  officialName: string
): string {
  return getCountryCommonName("fr", isoAlpha3, officialName);
}
