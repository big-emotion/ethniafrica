import { describe, expect, it } from "vitest";

import {
  getLocalizedSearchResultFamilyName,
  getLocalizedSearchResultName,
} from "../localizedResult";
import type { SearchResult } from "@/types/afrik-frontend";

const result: SearchResult = {
  type: "language",
  id: "ara",
  name: "Arabe standard",
  nameEn: "Standard Arabic",
  languageFamilyName: "Afro-asiatique",
  languageFamilyNameEn: "Afroasiatic",
};

describe("localized search result names", () => {
  // @req REQ-140
  it("uses French names in French and English names in English", () => {
    expect(getLocalizedSearchResultName(result, "fr")).toBe("Arabe standard");
    expect(getLocalizedSearchResultName(result, "en")).toBe("Standard Arabic");
    expect(getLocalizedSearchResultFamilyName(result, "fr")).toBe(
      "Afro-asiatique"
    );
    expect(getLocalizedSearchResultFamilyName(result, "en")).toBe(
      "Afroasiatic"
    );
  });

  // @req REQ-140
  it("falls back to French when an English name is missing or blank", () => {
    const frenchOnly: SearchResult = {
      ...result,
      nameEn: "  ",
      languageFamilyNameEn: undefined,
    };

    expect(getLocalizedSearchResultName(frenchOnly, "en")).toBe(
      "Arabe standard"
    );
    expect(getLocalizedSearchResultFamilyName(frenchOnly, "en")).toBe(
      "Afro-asiatique"
    );
  });
});
