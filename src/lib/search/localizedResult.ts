import type { SearchResult } from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";

function usableEnglishName(value: string | undefined): string | undefined {
  return value?.trim() ? value : undefined;
}

// @req REQ-140
export function getLocalizedSearchResultName(
  result: SearchResult,
  language: Language
): string {
  return language === "en"
    ? (usableEnglishName(result.nameEn) ?? result.name)
    : result.name;
}

// @req REQ-140
export function getLocalizedSearchResultFamilyName(
  result: SearchResult,
  language: Language
): string | undefined {
  return language === "en"
    ? (usableEnglishName(result.languageFamilyNameEn) ??
        result.languageFamilyName)
    : result.languageFamilyName;
}
