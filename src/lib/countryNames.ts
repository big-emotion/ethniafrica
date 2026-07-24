const ISO_ALPHA_3_TO_ALPHA_2: Record<string, string> = {
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

function createFrenchRegionNames(): Intl.DisplayNames | null {
  if (typeof Intl.DisplayNames !== "function") {
    return null;
  }

  try {
    return new Intl.DisplayNames(["fr"], { type: "region" });
  } catch {
    return null;
  }
}

const frenchRegionNames = createFrenchRegionNames();

// @req REQ-001
export function getFrenchCountryCommonName(
  isoAlpha3: string,
  officialName: string
): string {
  const isoAlpha2 = ISO_ALPHA_3_TO_ALPHA_2[isoAlpha3.trim().toUpperCase()];

  if (!isoAlpha2 || !frenchRegionNames) {
    return officialName;
  }

  try {
    return frenchRegionNames.of(isoAlpha2) ?? officialName;
  } catch {
    return officialName;
  }
}
