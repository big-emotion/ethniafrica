import { countryCopy } from "@/lib/i18n/copy/country";
import { ALPHA3_TO_ALPHA2 } from "@/lib/isoCountryCodes";
import { displayCountryName } from "@/lib/languageTag";
import type { Language } from "@/types/shared";

/** The country's common name in the reader's locale, with corpus fallback. */
// @req REQ-140
export function getCountryCommonName(
  lang: Language,
  isoAlpha3: string,
  officialName: string
): string {
  const normalizedIsoAlpha3 = isoAlpha3.trim().toUpperCase();

  const editorialOverride =
    countryCopy[lang].editorialCommonNames[normalizedIsoAlpha3];
  if (editorialOverride) return editorialOverride;

  const isoAlpha2 = ALPHA3_TO_ALPHA2[normalizedIsoAlpha3];
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
