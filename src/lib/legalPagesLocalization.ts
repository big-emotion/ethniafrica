import type { LegalDocumentContent } from "@/components/layout/LegalDocument";
import { legalPagesEn } from "@/lib/legal-pages.en";
import { legalPages } from "@/lib/legal-pages";
import type { Language } from "@/types/shared";

export type LegalPageKey = keyof typeof legalPages;

// @req REQ-145
export function getLegalPage(
  language: Language,
  page: LegalPageKey
): LegalDocumentContent {
  return language === "en" ? legalPagesEn[page] : legalPages[page];
}
